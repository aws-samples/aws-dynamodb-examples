import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
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
import { internalError, paymentNotFound } from "../../util/errors.mjs";
import { nowUtcIso } from "../../util/time.mjs";

export class HighLevelDynamoPaymentRepository {
  /**
   * @param {object} deps
   * @param {import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient} deps.doc
   * @param {string} deps.tableName
   */
  constructor({ doc, tableName }) {
    this._tableName = tableName;
    this._doc = doc;
  }

  async _sendGetCommand(input) {
    return this._doc.send(new GetCommand(input));
  }

  async _sendQueryCommand(input) {
    return this._doc.send(new QueryCommand(input));
  }

  async _sendTransactWriteCommand(input) {
    return this._doc.send(new TransactWriteCommand(input));
  }

  async _sendBatchGetCommand(input) {
    return this._doc.send(new BatchGetCommand(input));
  }

  async _sendPutCommand(input) {
    return this._doc.send(new PutCommand(input));
  }

  async transactCreateOutbound({ streamHead, event, idempotencyRecord }) {
    await this._sendTransactWriteCommand({
      TransactItems: [
        { Put: { TableName: this._tableName, Item: streamHead } },
        { Put: { TableName: this._tableName, Item: event } },
        {
          Put: {
            TableName: this._tableName,
            Item: idempotencyRecord,
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
      ],
    });
  }

  async getIdempotencyRecord(idempotencyKey) {
    const res = await this._sendGetCommand({
      TableName: this._tableName,
      Key: { PK: idempotencyPk(idempotencyKey), SK: IDEMPOTENCY_SK },
    });
    return res?.Item;
  }

  async loadPaymentPartition(paymentId) {
    const headRes = await this._sendGetCommand({
      TableName: this._tableName,
      Key: { PK: paymentPk(paymentId), SK: PAYMENT_HEAD_SK },
    });
    const head = headRes?.Item;
    if (!head) throw paymentNotFound();

    const eventsRes = await this._sendQueryCommand({
      TableName: this._tableName,
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
  }

  async getAccount(accountId) {
    const pk = accountPk(accountId);
    const res = await this._sendGetCommand({
      TableName: this._tableName,
      Key: { PK: pk, SK: pk },
    });
    return res?.Item;
  }

  async reserveFundsTransaction({ loaded, account }) {
    const { head, aggregate } = loaded;
    const now = nowUtcIso();
    const nextSeq = head.lastSequence + 1;
    const newState = "FUNDS_RESERVED";
    const reservationId = `res_${aggregate.paymentId}`;

    try {
      await this._sendTransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: this._tableName,
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
              TableName: this._tableName,
              Key: {
                PK: accountPk(aggregate.debtorAccountId),
                SK: accountPk(aggregate.debtorAccountId),
              },
              UpdateExpression:
                "SET availableBalance = availableBalance - :amt, version = version + :one",
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
              TableName: this._tableName,
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
              TableName: this._tableName,
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
      return true;
    } catch (err) {
      if (err?.name === "TransactionCanceledException") return false;
      throw err;
    }
  }

  async completePaymentTransaction({ loaded, account }) {
    const { head, aggregate } = loaded;
    const now = nowUtcIso();
    const nextSeq = head.lastSequence + 1;
    const newState = "COMPLETED";
    const reservationId = `res_${aggregate.paymentId}`;
    const ledgerEntryId = `led_${aggregate.paymentId}`;

    try {
      await this._sendTransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: this._tableName,
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
              TableName: this._tableName,
              Key: {
                PK: accountPk(aggregate.debtorAccountId),
                SK: accountPk(aggregate.debtorAccountId),
              },
              UpdateExpression:
                "SET currentBalance = currentBalance - :amt, version = version + :one",
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
              TableName: this._tableName,
              Key: {
                PK: accountPk(aggregate.debtorAccountId),
                SK: reservationSk(reservationId),
              },
              UpdateExpression: "SET #status = :consumed",
              ConditionExpression: "#status = :active",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":active": "ACTIVE", ":consumed": "CONSUMED" },
            },
          },
          {
            Put: {
              TableName: this._tableName,
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
              TableName: this._tableName,
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
    } catch (err) {
      if (err?.name === "TransactionCanceledException") return;
      throw err;
    }
  }

  async rejectPaymentTransaction({ loaded, reasonCode }) {
    const { head, aggregate } = loaded;
    const now = nowUtcIso();
    const nextSeq = head.lastSequence + 1;
    const newState = "REJECTED";

    try {
      await this._sendTransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: this._tableName,
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
              TableName: this._tableName,
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
  }
}

