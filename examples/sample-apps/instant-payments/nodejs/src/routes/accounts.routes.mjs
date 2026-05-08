import { BatchGetItemCommand, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, GetCommand, QueryCommand as DocQueryCommand } from "@aws-sdk/lib-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { MARSHALL_OPTS } from "../infrastructure/persistence/ddbMarshalling.mjs";
import {
  accountNotFound,
  invalidBatchGetReservationsRequest,
  validationError,
} from "../util/errors.mjs";
import { accountPk, reservationSk } from "../data/keys.mjs";

const ACCOUNT_ID_PARAM_SCHEMA = {
  params: {
    type: "object",
    required: ["accountId"],
    properties: {
      accountId: { type: "string", minLength: 1 },
    },
  },
};

export async function accountsRoutes(app) {
  app.get("/:accountId", { schema: ACCOUNT_ID_PARAM_SCHEMA }, async (req) => {
    const tableName = app.config.dynamodb.tableName;
    const accountId = req.params.accountId;
    const pk = accountPk(accountId);

    const accountRes = await sendGet(app, {
      TableName: tableName,
      Key: { PK: pk, SK: pk },
    });
    const account = accountRes?.Item;
    if (!account) throw accountNotFound();

    const resRes = await sendQuery(app, {
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": pk, ":prefix": "RESERVATION#" },
    });

    return {
      accountId: account.accountId,
      status: account.status,
      currency: account.currency,
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      reservations: (resRes?.Items ?? []).map((r) => ({
        reservationId: r.reservationId,
        paymentId: r.paymentId,
        amount: r.amount,
        status: r.status,
        createdAtUtc: r.createdAtUtc,
      })),
    };
  });

  app.post(
    "/:accountId/batch-get-reservations",
    {
      schema: {
        ...ACCOUNT_ID_PARAM_SCHEMA,
        description:
          "Batch fetch reservations. 400 may return INVALID_BATCH_GET_RESERVATIONS_REQUEST.",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["reservationIds"],
          properties: {
            reservationIds: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: { type: "string", minLength: 1 },
            },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["reservations", "missingReservationIds"],
            properties: {
              reservations: { type: "array" },
              missingReservationIds: { type: "array" },
            },
          },
          400: {
            description:
              "Bad request. May return INVALID_BATCH_GET_RESERVATIONS_REQUEST.",
            type: "object",
            required: ["error", "message", "timestamp"],
            properties: {
              error: { type: "string" },
              message: { type: "string" },
              timestamp: { type: "string" },
            },
          },
        },
      },
    },
    async (req) => {
      const tableName = app.config.dynamodb.tableName;
      const accountId = req.params.accountId;
      const pk = accountPk(accountId);

      app.log.info({ accountId }, "batch-get-reservations:start");
      const rawIds = req.body?.reservationIds;
      if (!Array.isArray(rawIds)) throw validationError("Validation error");
      const normalized = rawIds.map((s) => {
        if (typeof s !== "string") throw validationError("Validation error");
        const trimmed = s.trim();
        if (!trimmed) throw validationError("Validation error");
        return trimmed;
      });
      const deduped = [];
      const seen = new Set();
      for (const id of normalized) {
        if (seen.has(id)) continue;
        seen.add(id);
        deduped.push(id);
      }

      if (deduped.length === 0) {
        throw invalidBatchGetReservationsRequest("No distinct reservation ids");
      }

      const keys = deduped.map((reservationId) => ({
        PK: pk,
        SK: reservationSk(reservationId),
      }));

      const foundById = new Map();
      let unprocessedKeys = keys;
      let attempts = 0;
      while (unprocessedKeys.length > 0 && attempts < 10) {
        attempts += 1;
        app.log.info({ attempts, keys: unprocessedKeys.length }, "batch-get-reservations:ddb");
        const res = await sendBatchGet(app, {
          RequestItems: {
            [tableName]: { Keys: unprocessedKeys },
          },
        });

        for (const item of res?.Responses?.[tableName] ?? []) {
          foundById.set(item.reservationId, item);
        }

        const next = res?.UnprocessedKeys?.[tableName]?.Keys ?? [];
        unprocessedKeys = next;
        if (unprocessedKeys.length > 0) await backoff(attempts);
      }

      const reservations = [];
      const missingReservationIds = [];
      for (const reservationId of deduped) {
        const item = foundById.get(reservationId);
        if (!item) {
          missingReservationIds.push(reservationId);
          continue;
        }
        reservations.push({
          reservationId: item.reservationId,
          paymentId: item.paymentId,
          amount: item.amount,
          status: item.status,
          createdAtUtc: item.createdAtUtc,
        });
      }

      app.log.info({ found: reservations.length, missing: missingReservationIds.length }, "batch-get-reservations:done");
      return { reservations, missingReservationIds };
    },
  );
}

async function sendGet(app, input) {
  if (app.config.dynamodb.clientType === "low-level") {
    const out = await app.ddb.lowLevel.send(
      new GetItemCommand({
        TableName: input.TableName,
        Key: marshall(input.Key, MARSHALL_OPTS),
        ConsistentRead: input.ConsistentRead,
      }),
    );
    return { Item: out.Item ? unmarshall(out.Item) : undefined };
  }

  return app.ddb.doc.send(new GetCommand(input));
}

async function sendQuery(app, input) {
  if (app.config.dynamodb.clientType === "low-level") {
    const out = await app.ddb.lowLevel.send(
      new QueryCommand({
        TableName: input.TableName,
        IndexName: input.IndexName,
        KeyConditionExpression: input.KeyConditionExpression,
        FilterExpression: input.FilterExpression,
        ExpressionAttributeNames: input.ExpressionAttributeNames,
        ExpressionAttributeValues: input.ExpressionAttributeValues
          ? marshall(input.ExpressionAttributeValues, MARSHALL_OPTS)
          : undefined,
        Limit: input.Limit,
        ScanIndexForward: input.ScanIndexForward,
        ExclusiveStartKey: input.ExclusiveStartKey
          ? marshall(input.ExclusiveStartKey, MARSHALL_OPTS)
          : undefined,
        Select: input.Select,
      }),
    );
    return {
      Items: (out.Items ?? []).map((it) => unmarshall(it)),
      LastEvaluatedKey: out.LastEvaluatedKey ? unmarshall(out.LastEvaluatedKey) : undefined,
    };
  }

  const out = await app.ddb.doc.send(new DocQueryCommand(input));
  return { Items: out.Items, LastEvaluatedKey: out.LastEvaluatedKey };
}

async function sendBatchGet(app, input) {
  if (app.config.dynamodb.clientType === "low-level") {
    const requestItems = {};
    for (const [tableName, spec] of Object.entries(input.RequestItems ?? {})) {
      requestItems[tableName] = {
        Keys: (spec.Keys ?? []).map((k) => marshall(k, MARSHALL_OPTS)),
        ConsistentRead: spec.ConsistentRead,
        ProjectionExpression: spec.ProjectionExpression,
        ExpressionAttributeNames: spec.ExpressionAttributeNames,
      };
    }

    const out = await app.ddb.lowLevel.send(
      new BatchGetItemCommand({ RequestItems: requestItems }),
    );

    const Responses = {};
    for (const [tableName, items] of Object.entries(out.Responses ?? {})) {
      Responses[tableName] = items.map((it) => unmarshall(it));
    }

    let UnprocessedKeys;
    if (out.UnprocessedKeys && Object.keys(out.UnprocessedKeys).length > 0) {
      UnprocessedKeys = {};
      for (const [tableName, spec] of Object.entries(out.UnprocessedKeys)) {
        UnprocessedKeys[tableName] = {
          Keys: (spec.Keys ?? []).map((k) => unmarshall(k)),
          ConsistentRead: spec.ConsistentRead,
          ProjectionExpression: spec.ProjectionExpression,
          ExpressionAttributeNames: spec.ExpressionAttributeNames,
        };
      }
    }

    return { Responses, UnprocessedKeys };
  }

  return app.ddb.doc.send(new BatchGetCommand(input));
}

async function backoff(attempt) {
  const ms = Math.min(20_000, 25 * 2 ** attempt);
  await new Promise((r) => setTimeout(r, ms));
}

