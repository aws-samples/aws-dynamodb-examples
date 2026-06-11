import {
  sendGetCommand,
  sendQueryCommand,
  sendTransactWriteCommand,
} from "./ddbDocumentBridge.mjs";
import {
  ATTR_MERCHANT_STATE_PK,
  IDEMPOTENCY_SK,
  PAYMENT_HEAD_SK,
  accountPk,
  idempotencyPk,
  merchantStatePk,
  paymentEventSk,
  paymentPk,
  reservationSk,
} from "../../data/keys.mjs";
import { Payment } from "../../domain/payments/entities/Payment.mjs";
import { CREATE_OUTBOUND_TRANSACT_ITEMS } from "./transactItemOrder.mjs";
import { internalError, paymentNotFound } from "../../util/errors.mjs";
import {
  hasTransactionConflict,
  MAX_TRANSACTION_CONFLICT_RETRIES,
} from "../../util/transactionConflict.mjs";
import { nowUtcIso } from "../../util/time.mjs";

/**
 * DynamoDB adapter implementing the full payment repository contract.
 * Document Client vs low-level API is selected by `ddbRuntime` (see `ddbDocumentBridge.mjs`).
 * Mirrors `HighLevelDynamoDbPaymentRepository` / `LowLevelDynamoDbPaymentRepository` in the Java sample.
 *
 * @param {object} deps
 * @param {object} deps.ddbRuntime
 * @param {string} deps.tableName
 */
export function createDynamoPaymentRepository({ ddbRuntime, tableName }) {
  return {
    /**
     * Atomically writes stream head, first domain event, and idempotency record.
     * The idempotency put carries attribute_not_exists(PK) — duplicate keys cancel the transaction.
     */
    async transactCreateOutbound({ streamHead, event, idempotencyRecord }) {
      const items = [];
      items[CREATE_OUTBOUND_TRANSACT_ITEMS.STREAM_HEAD] = {
        Put: { TableName: tableName, Item: streamHead },
      };
      items[CREATE_OUTBOUND_TRANSACT_ITEMS.EVENT] = {
        Put: { TableName: tableName, Item: event },
      };
      items[CREATE_OUTBOUND_TRANSACT_ITEMS.IDEMPOTENCY] = {
        Put: {
          TableName: tableName,
          Item: idempotencyRecord,
          ConditionExpression: "attribute_not_exists(PK)",
        },
      };
      await sendTransactWriteCommand(ddbRuntime, { TransactItems: items });
    },

    /** Reads the committed idempotency row for a given client key. Returns undefined when absent. */
    async getIdempotencyRecord(idempotencyKey) {
      const res = await sendGetCommand(ddbRuntime, {
        TableName: tableName,
        Key: { PK: idempotencyPk(idempotencyKey), SK: IDEMPOTENCY_SK },
      });
      return res?.Item;
    },

    /**
     * Loads stream head + all EVENT# items, replays lifecycle state into a `Payment` aggregate.
     * Throws `paymentNotFound` when the head row is absent; throws `internalError` on replay failure.
     *
     * @returns {{ head: object, aggregate: Payment, events: object[] }}
     */
    async loadPaymentPartition(paymentId) {
      const headRes = await sendGetCommand(ddbRuntime, {
        TableName: tableName,
        Key: { PK: paymentPk(paymentId), SK: PAYMENT_HEAD_SK },
      });
      const head = headRes?.Item;
      if (!head) throw paymentNotFound();

      const eventsRes = await sendQueryCommand(ddbRuntime, {
        TableName: tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": paymentPk(paymentId), ":prefix": "EVENT#" },
      });
      const events = (eventsRes?.Items ?? []).sort((a, b) => (a.SK < b.SK ? -1 : 1));

      let aggregate;
      try {
        aggregate = Payment.fromHeadAndEvents(head, events);
      } catch {
        throw internalError("Inconsistent payment partition");
      }
      return { head, aggregate, events };
    },

    /** Reads an account item by accountId. Returns undefined when absent. */
    async getAccount(accountId) {
      const pk = accountPk(accountId);
      const res = await sendGetCommand(ddbRuntime, { TableName: tableName, Key: { PK: pk, SK: pk } });
      return res?.Item;
    },

    /**
     * Atomically: advance head to FUNDS_RESERVED, debit available balance, create ACTIVE reservation,
     * append FUNDS_RESERVED event. Optimistic-locking on head sequence and account version.
     *
     * @returns {boolean} false when the transaction was cancelled (concurrent update); true on success.
     */
    async reserveFundsTransaction({ loaded, account }) {
      for (let attempt = 0; attempt < MAX_TRANSACTION_CONFLICT_RETRIES; attempt += 1) {
        const result = await reserveFundsTransactionOnce({
          ddbRuntime,
          tableName,
          loaded,
          account,
        });
        if (result.ok) return true;
        if (result.transactionConflict && attempt < MAX_TRANSACTION_CONFLICT_RETRIES - 1) {
          loaded = await reloadPaymentPartition(ddbRuntime, tableName, loaded.aggregate.paymentId);
          account =
            (await getAccountOnce(ddbRuntime, tableName, loaded.aggregate.debtorAccountId)) ?? account;
          continue;
        }
        return false;
      }
      return false;
    },

    /**
     * Atomically: advance head to COMPLETED, debit current balance, mark reservation CONSUMED,
     * append LEDGER_ENTRY, append COMPLETED event. Silently absorbs concurrent-update cancellations.
     */
    async completePaymentTransaction({ loaded, account }) {
      for (let attempt = 0; attempt < MAX_TRANSACTION_CONFLICT_RETRIES; attempt += 1) {
        const result = await completePaymentTransactionOnce({
          ddbRuntime,
          tableName,
          loaded,
          account,
        });
        if (result.ok) return;
        if (result.transactionConflict && attempt < MAX_TRANSACTION_CONFLICT_RETRIES - 1) {
          loaded = await reloadPaymentPartition(ddbRuntime, tableName, loaded.aggregate.paymentId);
          account =
            (await getAccountOnce(ddbRuntime, tableName, loaded.aggregate.debtorAccountId)) ?? account;
          continue;
        }
        return;
      }
    },

    /**
     * Atomically: advance head to REJECTED with given reasonCode, append REJECTED event.
     * Silently absorbs concurrent-update cancellations (idempotent).
     */
    async rejectPaymentTransaction({ loaded, reasonCode }) {
      const { head, aggregate } = loaded;
      const now = nowUtcIso();
      const nextSeq = head.lastSequence + 1;
      const newState = "REJECTED";

      try {
        await sendTransactWriteCommand(ddbRuntime, {
          TransactItems: [
            {
              Update: {
                TableName: tableName,
                Key: { PK: paymentPk(aggregate.paymentId), SK: PAYMENT_HEAD_SK },
                UpdateExpression:
                  "SET lastSequence = :nextSeq, aggregateState = :newState, updatedAtUtc = :now, reasonCode = :reasonCode, #mspk = :mspk",
                ConditionExpression: "lastSequence = :expectedSeq AND aggregateState = :expectedState",
                ExpressionAttributeNames: { "#mspk": ATTR_MERCHANT_STATE_PK },
                ExpressionAttributeValues: {
                  ":nextSeq": nextSeq,
                  ":newState": newState,
                  ":now": now,
                  ":reasonCode": reasonCode,
                  ":mspk": merchantStatePk(head.merchantId, newState),
                  ":expectedSeq": head.lastSequence,
                  ":expectedState": head.aggregateState,
                },
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: paymentPk(aggregate.paymentId),
                  SK: paymentEventSk(nextSeq),
                  entityType: "PAYMENT_EVENT",
                  eventType: "REJECTED",
                  sequenceNumber: nextSeq,
                  correlationId: aggregate.correlationId,
                  reasonCode,
                  occurredAt: now,
                  paymentId: aggregate.paymentId,
                },
              },
            },
          ],
        });
      } catch (err) {
        if (err?.name === "TransactionCanceledException") return;
        throw err;
      }
    },
  };
}

async function getAccountOnce(ddbRuntime, tableName, accountId) {
  const pk = accountPk(accountId);
  const res = await sendGetCommand(ddbRuntime, { TableName: tableName, Key: { PK: pk, SK: pk } });
  return res?.Item;
}

async function reloadPaymentPartition(ddbRuntime, tableName, paymentId) {
  const headRes = await sendGetCommand(ddbRuntime, {
    TableName: tableName,
    Key: { PK: paymentPk(paymentId), SK: PAYMENT_HEAD_SK },
  });
  const head = headRes?.Item;
  if (!head) throw paymentNotFound();
  const eventsRes = await sendQueryCommand(ddbRuntime, {
    TableName: tableName,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: { ":pk": paymentPk(paymentId), ":prefix": "EVENT#" },
  });
  const events = (eventsRes?.Items ?? []).sort((a, b) => (a.SK < b.SK ? -1 : 1));
  const aggregate = Payment.fromHeadAndEvents(head, events);
  return { head, aggregate, events };
}

function transactCancelResult(err) {
  if (err?.name !== "TransactionCanceledException") throw err;
  return { ok: false, transactionConflict: hasTransactionConflict(err) };
}

async function reserveFundsTransactionOnce({ ddbRuntime, tableName, loaded, account }) {
  const { head, aggregate } = loaded;
  const now = nowUtcIso();
  const nextSeq = head.lastSequence + 1;
  const newState = "FUNDS_RESERVED";
  const reservationId = `res_${aggregate.paymentId}`;

  try {
    await sendTransactWriteCommand(ddbRuntime, {
      TransactItems: [
        {
          Update: {
            TableName: tableName,
            Key: { PK: paymentPk(aggregate.paymentId), SK: PAYMENT_HEAD_SK },
            UpdateExpression:
              "SET lastSequence = :nextSeq, aggregateState = :newState, updatedAtUtc = :now, reasonCode = :reasonCode, #mspk = :mspk",
            ConditionExpression: "lastSequence = :expectedSeq AND aggregateState = :expectedState",
            ExpressionAttributeNames: { "#mspk": ATTR_MERCHANT_STATE_PK },
            ExpressionAttributeValues: {
              ":nextSeq": nextSeq,
              ":newState": newState,
              ":now": now,
              ":reasonCode": null,
              ":mspk": merchantStatePk(head.merchantId, newState),
              ":expectedSeq": head.lastSequence,
              ":expectedState": head.aggregateState,
            },
          },
        },
        {
          Update: {
            TableName: tableName,
            Key: { PK: accountPk(aggregate.debtorAccountId), SK: accountPk(aggregate.debtorAccountId) },
            UpdateExpression: "SET availableBalance = availableBalance - :amt, version = version + :one",
            ConditionExpression: "version = :v AND availableBalance >= :amt",
            ExpressionAttributeValues: {
              ":amt": aggregate.amount,
              ":one": 1,
              ":v": account.version,
            },
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: accountPk(aggregate.debtorAccountId),
              SK: reservationSk(reservationId),
              entityType: "RESERVATION",
              reservationId,
              paymentId: aggregate.paymentId,
              amount: aggregate.amount,
              status: "ACTIVE",
              createdAtUtc: now,
            },
            ConditionExpression: "attribute_not_exists(SK)",
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: paymentPk(aggregate.paymentId),
              SK: paymentEventSk(nextSeq),
              entityType: "PAYMENT_EVENT",
              eventType: "FUNDS_RESERVED",
              sequenceNumber: nextSeq,
              correlationId: aggregate.correlationId,
              reasonCode: null,
              occurredAt: now,
              paymentId: aggregate.paymentId,
            },
          },
        },
      ],
    });
    return { ok: true, transactionConflict: false };
  } catch (err) {
    return transactCancelResult(err);
  }
}

async function completePaymentTransactionOnce({ ddbRuntime, tableName, loaded, account }) {
  const { head, aggregate } = loaded;
  const now = nowUtcIso();
  const nextSeq = head.lastSequence + 1;
  const newState = "COMPLETED";
  const reservationId = `res_${aggregate.paymentId}`;
  const ledgerEntryId = `led_${aggregate.paymentId}`;

  try {
    await sendTransactWriteCommand(ddbRuntime, {
      TransactItems: [
        {
          Update: {
            TableName: tableName,
            Key: { PK: paymentPk(aggregate.paymentId), SK: PAYMENT_HEAD_SK },
            UpdateExpression:
              "SET lastSequence = :nextSeq, aggregateState = :newState, updatedAtUtc = :now, reasonCode = :reasonCode, #mspk = :mspk",
            ConditionExpression: "lastSequence = :expectedSeq AND aggregateState = :expectedState",
            ExpressionAttributeNames: { "#mspk": ATTR_MERCHANT_STATE_PK },
            ExpressionAttributeValues: {
              ":nextSeq": nextSeq,
              ":newState": newState,
              ":now": now,
              ":reasonCode": null,
              ":mspk": merchantStatePk(head.merchantId, newState),
              ":expectedSeq": head.lastSequence,
              ":expectedState": head.aggregateState,
            },
          },
        },
        {
          Update: {
            TableName: tableName,
            Key: { PK: accountPk(aggregate.debtorAccountId), SK: accountPk(aggregate.debtorAccountId) },
            UpdateExpression: "SET currentBalance = currentBalance - :amt, version = version + :one",
            ConditionExpression: "version = :v AND currentBalance >= :amt",
            ExpressionAttributeValues: {
              ":amt": aggregate.amount,
              ":one": 1,
              ":v": account.version,
            },
          },
        },
        {
          Update: {
            TableName: tableName,
            Key: { PK: accountPk(aggregate.debtorAccountId), SK: reservationSk(reservationId) },
            UpdateExpression: "SET #status = :consumed",
            ConditionExpression: "#status = :active",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":active": "ACTIVE", ":consumed": "CONSUMED" },
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: accountPk(aggregate.debtorAccountId),
              SK: `LEDGER#${aggregate.createdAtUtc}#${ledgerEntryId}`,
              entityType: "LEDGER_ENTRY",
              ledgerEntryId,
              paymentId: aggregate.paymentId,
              entryType: "DEBIT",
              amount: aggregate.amount,
              balanceAfter: Number(account.currentBalance) - Number(aggregate.amount),
              createdAtUtc: now,
            },
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              PK: paymentPk(aggregate.paymentId),
              SK: paymentEventSk(nextSeq),
              entityType: "PAYMENT_EVENT",
              eventType: "COMPLETED",
              sequenceNumber: nextSeq,
              correlationId: aggregate.correlationId,
              reasonCode: null,
              occurredAt: now,
              paymentId: aggregate.paymentId,
            },
          },
        },
      ],
    });
    return { ok: true, transactionConflict: false };
  } catch (err) {
    return transactCancelResult(err);
  }
}
