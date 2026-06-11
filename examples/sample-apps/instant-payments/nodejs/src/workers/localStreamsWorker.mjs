import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import {
  DescribeStreamCommand,
  ExpiredIteratorException,
  GetRecordsCommand,
  GetShardIteratorCommand,
  ShardIteratorType,
  TrimmedDataAccessException,
} from "@aws-sdk/client-dynamodb-streams";
import { loadConfig } from "../config/env.mjs";
import { createDdbClients, createStreamsClient } from "../data/ddbClient.mjs";
import { createDdbRuntime } from "../infrastructure/persistence/ddbDocumentBridge.mjs";
import { createDynamoPaymentRepository } from "../infrastructure/persistence/dynamoPaymentRepository.mjs";
import { processOutboundPayment } from "../application/services/outboundPaymentProcessor.mjs";

/**
 * Local DynamoDB Streams poller (mirrors Java DynamoDbStreamsPaymentEventListener).
 *
 * Checkpoints (C3): shard iterators live in memory only. With LATEST, events during restart are skipped.
 */

const config = loadConfig(process.env);

const ddbClients = createDdbClients(config.dynamodb);
const ddb = ddbClients.lowLevel;
const ddbRuntime = createDdbRuntime({
  doc: ddbClients.doc,
  lowLevel: ddbClients.lowLevel,
  clientType: config.dynamodb.clientType,
});
const paymentRepository = createDynamoPaymentRepository({
  ddbRuntime,
  tableName: config.dynamodb.tableName,
});
const streams = createStreamsClient(config.dynamodb);

const tableName = config.dynamodb.tableName;

/** Poll interval between full shard discovery rounds. */
const POLL_INTERVAL_MS = 1000;
/** GetRecords page size; DynamoDB allows up to 1000 — 100 keeps sample volume low. */
const POLL_LIMIT = 100;
/** Poison-pill cap before a payment id is dropped from the retry map. */
const MAX_PROCESS_RETRIES = 3;
/** Cap in-memory retry map size so poison-pill candidates do not grow without bound (M4). */
const MAX_RETRY_COUNT_ENTRIES = 10_000;
/** Safety cap on GetRecords rounds per shard per poll cycle (prevents infinite hot-shard loops). */
const MAX_ROUNDS_PER_SHARD = 512;

const checkpoints = new Map(); // shardId -> { nextIterator, lastSequenceNumber }
const retryCounts = new Map(); // paymentId -> number

/** Rate-limit log when the table does not exist at the configured endpoint. */
let loggedMissingTableHint = false;

const iteratorType = parseIteratorType(config.dynamodb.streams.iteratorType);

let running = true;
function requestStop() {
  running = false;
}
process.on("SIGINT", requestStop);
process.on("SIGTERM", requestStop);

// eslint-disable-next-line no-constant-condition
while (running) {
  try {
    const streamArn = await discoverStreamArn();
    if (!streamArn) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const shards = await discoverShards(streamArn);
    pruneStaleCheckpoints(shards);
    pruneStaleRetryCounts();
    for (const shard of shards) {
      if (!running) break;
      await pollShard(streamArn, shard.ShardId);
    }
  } catch (err) {
    console.error("streams worker error:", err?.message ?? err);
  }

  await sleep(POLL_INTERVAL_MS);
}

function isTableMissingError(err) {
  if (err?.name === "ResourceNotFoundException") return true;
  const msg = String(err?.message ?? "");
  return /non-existent table|ResourceNotFoundException/i.test(msg);
}

async function discoverStreamArn() {
  try {
    const res = await ddb.send(new DescribeTableCommand({ TableName: tableName }));
    return res?.Table?.LatestStreamArn ?? null;
  } catch (err) {
    if (isTableMissingError(err)) {
      if (!loggedMissingTableHint) {
        loggedMissingTableHint = true;
        console.error(
          `[streams worker] No table "${tableName}" at ${config.dynamodb.endpoint}. ` +
            `Create it first: start the API (initializeDdb) or \`node scripts/create-table.mjs\` with the same env. ` +
            `If DynamoDB Local uses -inMemory, restarting the container wipes data — run the app again to recreate the table.`,
        );
      }
      return null;
    }
    throw err;
  }
}

/**
 * Paginate DescribeStream until LastEvaluatedShardId is absent (C2).
 * A single page returns at most 100 shards; closed shards remain visible for ~24h.
 */
async function discoverShards(streamArn) {
  const shards = [];
  let exclusiveStartShardId;
  do {
    const res = await streams.send(
      new DescribeStreamCommand({
        StreamArn: streamArn,
        ExclusiveStartShardId: exclusiveStartShardId,
      }),
    );
    shards.push(...(res?.StreamDescription?.Shards ?? []));
    exclusiveStartShardId = res?.StreamDescription?.LastEvaluatedShardId ?? undefined;
  } while (exclusiveStartShardId);
  return shards;
}

/** Drop in-memory iterators for shards no longer reported by DescribeStream (M4). */
function pruneStaleCheckpoints(shards) {
  const activeShardIds = new Set(shards.map((s) => s.ShardId));
  for (const shardId of checkpoints.keys()) {
    if (!activeShardIds.has(shardId)) checkpoints.delete(shardId);
  }
}

/** Drop oldest retry-count entries when the map exceeds MAX_RETRY_COUNT_ENTRIES. */
function pruneStaleRetryCounts() {
  if (retryCounts.size <= MAX_RETRY_COUNT_ENTRIES) return;
  const excess = retryCounts.size - MAX_RETRY_COUNT_ENTRIES;
  let removed = 0;
  for (const key of retryCounts.keys()) {
    retryCounts.delete(key);
    removed += 1;
    if (removed >= excess) break;
  }
}

async function pollShard(streamArn, shardId) {
  const cp = checkpoints.get(shardId) ?? { nextIterator: null, lastSequenceNumber: null };
  checkpoints.set(shardId, cp);

  let iterator = cp.nextIterator;
  if (!iterator) {
    iterator = await openShardIterator(streamArn, shardId, cp);
    if (!iterator) return;
  }

  let rounds = 0;
  while (iterator && running && rounds < MAX_ROUNDS_PER_SHARD) {
    rounds += 1;
    const res = await getRecordsWithRenewal(streamArn, shardId, cp, iterator);
    for (const record of res.Records ?? []) {
      await processRecord(record);
      const seq = record?.dynamodb?.SequenceNumber;
      if (seq) cp.lastSequenceNumber = seq;
    }
    iterator = res.NextShardIterator ?? null;
    cp.nextIterator = iterator;
  }
}

async function getRecordsWithRenewal(streamArn, shardId, cp, iterator) {
  try {
    return await streams.send(new GetRecordsCommand({ ShardIterator: iterator, Limit: POLL_LIMIT }));
  } catch (err) {
    if (err instanceof ExpiredIteratorException || err?.name === "ExpiredIteratorException") {
      cp.nextIterator = null;
      const fresh = await openShardIterator(streamArn, shardId, cp);
      return await streams.send(new GetRecordsCommand({ ShardIterator: fresh, Limit: POLL_LIMIT }));
    }
    throw err;
  }
}

async function openShardIterator(streamArn, shardId, cp) {
  const useAfter =
    cp.lastSequenceNumber != null && String(cp.lastSequenceNumber).trim().length > 0;

  const req = {
    StreamArn: streamArn,
    ShardId: shardId,
    ShardIteratorType: useAfter ? ShardIteratorType.AFTER_SEQUENCE_NUMBER : iteratorType,
    SequenceNumber: useAfter ? cp.lastSequenceNumber : undefined,
  };

  try {
    const res = await streams.send(new GetShardIteratorCommand(req));
    cp.nextIterator = res.ShardIterator ?? null;
    return cp.nextIterator;
  } catch (err) {
    if (
      useAfter &&
      (err instanceof TrimmedDataAccessException || err?.name === "TrimmedDataAccessException")
    ) {
      cp.lastSequenceNumber = null;
      const res = await streams.send(
        new GetShardIteratorCommand({
          StreamArn: streamArn,
          ShardId: shardId,
          ShardIteratorType: iteratorType,
        }),
      );
      cp.nextIterator = res.ShardIterator ?? null;
      return cp.nextIterator;
    }
    throw err;
  }
}

async function processRecord(record) {
  if (record?.eventName !== "INSERT") return;
  const newImage = record?.dynamodb?.NewImage;
  if (!newImage) return;

  const entityType = newImage.entityType?.S;
  const eventType = newImage.eventType?.S;
  const paymentId = newImage.paymentId?.S;

  if (entityType !== "PAYMENT_EVENT") return;
  if (eventType !== "OUTBOUND_PAYMENT_CREATED") return;
  if (!paymentId) return;

  try {
    await processOutboundPayment({ repository: paymentRepository, paymentId });
    retryCounts.delete(paymentId);
  } catch (err) {
    const attempt = (retryCounts.get(paymentId) ?? 0) + 1;
    retryCounts.set(paymentId, attempt);
    if (attempt >= MAX_PROCESS_RETRIES) {
      console.error(`poison pill: paymentId=${paymentId} attempts=${attempt}`, err?.message ?? err);
      retryCounts.delete(paymentId);
      return;
    }
    throw err;
  }
}

function parseIteratorType(raw) {
  const r = String(raw ?? "").trim().toUpperCase();
  if (r === "TRIM_HORIZON") return ShardIteratorType.TRIM_HORIZON;
  return ShardIteratorType.LATEST;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
