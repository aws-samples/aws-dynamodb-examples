/**
 * TransactWriteItems item order for outbound payment creation.
 * Shared by producer (repository) and consumer (idempotency conflict detection).
 */
export const CREATE_OUTBOUND_TRANSACT_ITEMS = Object.freeze({
  STREAM_HEAD: 0,
  EVENT: 1,
  IDEMPOTENCY: 2,
});
