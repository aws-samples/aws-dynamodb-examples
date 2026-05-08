export function paymentPk(paymentId) {
  return `PAYMENT#${paymentId}`;
}

export const PAYMENT_HEAD_SK = "#HEAD";

export function paymentEventSk(sequenceNumber) {
  return `EVENT#${String(sequenceNumber).padStart(19, "0")}`;
}

export function accountPk(accountId) {
  return `ACCOUNT#${accountId}`;
}

export function reservationSk(reservationId) {
  return `RESERVATION#${reservationId}`;
}

export function idempotencyPk(idempotencyKey) {
  return `IDEMPOTENCY#${idempotencyKey}`;
}

export const IDEMPOTENCY_SK = "IDEMPOTENCY";

// Derived attributes to model "multi-attribute" index keys in DynamoDB (1 hash + 1 range).
export const ATTR_MERCHANT_PAYMENTS_SK = "merchantPaymentsSk"; // createdAtUtc + '#' + paymentId
export const ATTR_MERCHANT_STATE_PK = "merchantStatePk"; // merchantId + '#' + aggregateState

export function merchantPaymentsSk(createdAtUtc, paymentId) {
  return `${createdAtUtc}#${paymentId}`;
}

export function merchantStatePk(merchantId, aggregateState) {
  return `${merchantId}#${aggregateState}`;
}

