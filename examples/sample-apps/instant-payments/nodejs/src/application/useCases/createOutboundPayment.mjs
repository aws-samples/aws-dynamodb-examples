import {
  toIdempotencyRecord,
  toInitialStreamHead,
  toOutboundPaymentCreatedEvent,
} from "../../infrastructure/persistence/paymentMapper.mjs";
import { sha256HexOfCanonicalJson } from "../../util/hash.mjs";
import { idempotencyConflict } from "../../util/errors.mjs";
import { newCorrelationId, newPaymentId } from "../../util/ids.mjs";
import { nowUtcIso, toEpochSeconds } from "../../util/time.mjs";

/**
 * Application use case: create outbound payment with idempotency guarantees.
 * Mirrors `OutboundPaymentService.createOutboundPayment` in the Java reference implementation.
 *
 * @param {object} input
 * @param {object} input.command - validated HTTP body
 * @param {number} input.idempotencyTtlSeconds
 * @param {{ transactCreateOutbound: Function, getIdempotencyRecord: Function }} input.repository
 * @param {{ paymentId?: () => string, correlationId?: () => string }} [input.ids]
 */
export async function createOutboundPayment({ command, idempotencyTtlSeconds, repository, ids = {} }) {
  const createdAtUtc = nowUtcIso();
  const requestHash = sha256HexOfCanonicalJson(command);
  const paymentId = ids.paymentId?.() ?? newPaymentId();
  const correlationId = ids.correlationId?.() ?? newCorrelationId();
  const ttlEpochSeconds = toEpochSeconds(createdAtUtc) + idempotencyTtlSeconds;

  const responseSnapshot = { paymentId, state: "RECEIVED", correlationId, createdAtUtc };
  const streamHead = toInitialStreamHead(command, paymentId, correlationId, createdAtUtc);
  const event = toOutboundPaymentCreatedEvent(command, paymentId, correlationId, createdAtUtc);
  const idempotencyRecord = toIdempotencyRecord(
    command.idempotencyKey,
    requestHash,
    responseSnapshot,
    createdAtUtc,
    ttlEpochSeconds,
  );

  try {
    await repository.transactCreateOutbound({ streamHead, event, idempotencyRecord });
    return { statusCode: 201, body: responseSnapshot };
  } catch (err) {
    if (err?.name !== "TransactionCanceledException") throw err;

    const existing = await repository.getIdempotencyRecord(command.idempotencyKey);
    if (!existing) throw err;

    if (existing.requestHash === requestHash && existing.responseSnapshot) {
      return { statusCode: 200, body: existing.responseSnapshot };
    }
    throw idempotencyConflict("Idempotency key reused with different payload");
  }
}
