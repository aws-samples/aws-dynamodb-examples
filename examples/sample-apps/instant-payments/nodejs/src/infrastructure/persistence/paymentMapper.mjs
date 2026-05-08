import {
  ATTR_MERCHANT_PAYMENTS_SK,
  ATTR_MERCHANT_STATE_PK,
  IDEMPOTENCY_SK,
  PAYMENT_HEAD_SK,
  idempotencyPk,
  merchantPaymentsSk,
  merchantStatePk,
  paymentEventSk,
  paymentPk,
} from "../../data/keys.mjs";

/**
 * Maps validated create-payment command and server-generated IDs to the three DynamoDB items
 * written atomically on payment creation: stream head, first domain event, idempotency record.
 *
 * Mirrors `PaymentMapper` in the Java reference implementation.
 */

/** Stream head row (PK=PAYMENT#{id}, SK=#HEAD). Carries optimistic-locking sequence and GSI keys. */
export function toInitialStreamHead(command, paymentId, correlationId, createdAtUtc) {
  return {
    PK: paymentPk(paymentId),
    SK: PAYMENT_HEAD_SK,
    entityType: "PAYMENT_STREAM_HEAD",
    lastSequence: 1,
    aggregateState: "RECEIVED",
    updatedAtUtc: createdAtUtc,
    paymentId,
    merchantId: command.merchantId,
    createdAtUtc,
    correlationId,
    amount: command.amount,
    currency: command.currency,
    reasonCode: null,
    debtorAccountId: command.debtorAccountId,
    creditorIban: command.creditorIban,
    creditorName: command.creditorName,
    idempotencyKey: command.idempotencyKey,
    [ATTR_MERCHANT_PAYMENTS_SK]: merchantPaymentsSk(createdAtUtc, paymentId),
    [ATTR_MERCHANT_STATE_PK]: merchantStatePk(command.merchantId, "RECEIVED"),
  };
}

/** First append-only event for a new payment stream (eventType=OUTBOUND_PAYMENT_CREATED, sequence=1). */
export function toOutboundPaymentCreatedEvent(command, paymentId, correlationId, createdAtUtc) {
  return {
    PK: paymentPk(paymentId),
    SK: paymentEventSk(1),
    entityType: "PAYMENT_EVENT",
    eventType: "OUTBOUND_PAYMENT_CREATED",
    sequenceNumber: 1,
    correlationId,
    reasonCode: null,
    occurredAt: createdAtUtc,
    paymentId,
    merchantId: command.merchantId,
    debtorAccountId: command.debtorAccountId,
    creditorIban: command.creditorIban,
    creditorName: command.creditorName,
    amount: command.amount,
    currency: command.currency,
    idempotencyKey: command.idempotencyKey,
  };
}

/**
 * Idempotency record (PK=IDEMPOTENCY#{key}, SK=IDEMPOTENCY).
 * Written with attribute_not_exists(PK) inside TransactWriteItems.
 *
 * @param {string} idempotencyKey - client-supplied key
 * @param {string} requestHash - SHA-256 of canonical request body
 * @param {object} responseSnapshot - HTTP response shape stored for replays
 * @param {string} createdAtUtc
 * @param {number} ttlEpochSeconds - Unix epoch seconds for TTL deletion
 */
export function toIdempotencyRecord(
  idempotencyKey,
  requestHash,
  responseSnapshot,
  createdAtUtc,
  ttlEpochSeconds,
) {
  return {
    PK: idempotencyPk(idempotencyKey),
    SK: IDEMPOTENCY_SK,
    entityType: "IDEMPOTENCY",
    requestHash,
    responseSnapshot,
    createdAtUtc,
    ttl: ttlEpochSeconds,
  };
}
