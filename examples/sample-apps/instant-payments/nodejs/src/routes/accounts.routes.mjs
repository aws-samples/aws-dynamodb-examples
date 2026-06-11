import {
  sendBatchGetCommand,
  sendGetCommand,
  sendQueryCommand,
} from "../infrastructure/persistence/ddbDocumentBridge.mjs";
import {
  MAX_UNPROCESSED_RETRIES,
  sleepMs,
  unprocessedKeysDelayMs,
} from "../util/batchGetItemHelper.mjs";
import {
  accountNotFound,
  invalidBatchGetReservationsRequest,
  validationError,
} from "../util/errors.mjs";
import { accountPk, reservationSk } from "../data/keys.mjs";
import { ACCOUNT_ID_PARAMS } from "./paramSchemas.mjs";

const ACCOUNT_ID_PARAM_SCHEMA = { params: ACCOUNT_ID_PARAMS };

export async function accountsRoutes(app) {
  app.get("/:accountId", { schema: ACCOUNT_ID_PARAM_SCHEMA }, async (req) => {
    const tableName = app.config.dynamodb.tableName;
    const accountId = req.params.accountId;
    const pk = accountPk(accountId);

    const accountRes = await sendGetCommand(app.ddbRuntime, {
      TableName: tableName,
      Key: { PK: pk, SK: pk },
    });
    const account = accountRes?.Item;
    if (!account) throw accountNotFound();

    const resRes = await sendQueryCommand(app.ddbRuntime, {
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
      },
    },
    async (req) => {
      const tableName = app.config.dynamodb.tableName;
      const accountId = req.params.accountId;
      const pk = accountPk(accountId);

      app.log.debug({ accountId }, "batch-get-reservations:start");
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
      let attempt = 0;
      while (unprocessedKeys.length > 0) {
        app.log.debug({ attempt, keys: unprocessedKeys.length }, "batch-get-reservations:ddb");
        const res = await sendBatchGetCommand(app.ddbRuntime, {
          RequestItems: {
            [tableName]: { Keys: unprocessedKeys },
          },
        });

        for (const item of res?.Responses?.[tableName] ?? []) {
          foundById.set(item.reservationId, item);
        }

        unprocessedKeys = res?.UnprocessedKeys?.[tableName]?.Keys ?? [];
        if (unprocessedKeys.length === 0) break;
        if (attempt >= MAX_UNPROCESSED_RETRIES) {
          app.log.warn(
            { unprocessed: unprocessedKeys.length, attempt },
            "batch-get-reservations:unprocessed-keys-exhausted",
          );
          break;
        }
        await sleepMs(unprocessedKeysDelayMs(attempt));
        attempt += 1;
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

      app.log.debug({ found: reservations.length, missing: missingReservationIds.length }, "batch-get-reservations:done");
      return { reservations, missingReservationIds };
    },
  );
}

