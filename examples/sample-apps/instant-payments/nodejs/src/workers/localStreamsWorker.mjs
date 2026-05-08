import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import {
  DescribeStreamCommand,
  DynamoDBStreamsClient,
  ExpiredIteratorException,
  GetRecordsCommand,
  GetShardIteratorCommand,
  ShardIteratorType,
  TrimmedDataAccessException,
} from "@aws-sdk/client-dynamodb-streams";
import { loadConfig } from "../config/env.mjs";
import { createDdbClients } from "../data/ddbClient.mjs";
import { createDdbRuntime } from "../infrastructure/persistence/ddbDocumentBridge.mjs";
import { createDynamoPaymentRepository } from "../infrastructure/persistence/dynamoPaymentRepository.mjs";
import { processOutboundPayment } from "../application/services/outboundPaymentProcessor.mjs";

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
const streams = new DynamoDBStreamsClient({
  region: config.dynamodb.region,
  endpoint: config.dynamodb.endpoint,
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

const tableName = config.dynamodb.tableName;

const POLL_INTERVAL_MS = 1000;
const POLL_LIMIT = 100;
const MAX_PROCESS_RETRIES = 3;
const MAX_ROUNDS_PER_SHARD = 512;

const checkpoints = new Map(); // shardId -> { nextIterator, lastSequenceNumber }
const retryCounts = new Map(); // paymentId -> number

/** Rate-limit log when the table does not exist at the configured endpoint. */
let loggedMissingTableHint = false;

const iteratorType = parseIteratorType(config.dynamodb.streams.iteratorType);

console.log(
  `Starting local streams worker for table=${tableName} iteratorType=${iteratorType}`,
);

let running = true;
function requestShutdown() {
  running = false;
}
process.on("SIGINT", requestShutdown);
process.on("SIGTERM", requestShutdown);

// eslint-disable-next-line no-constant-condition
while (running) {
  try {
    const streamArn = await discoverStreamArn();
    if (!streamArn) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const shards = await discoverShards(streamArn);
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

async function discoverShards(streamArn) {
  const res = await streams.send(new DescribeStreamCommand({ StreamArn: streamArn }));
  return res?.StreamDescription?.Shards ?? [];
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

