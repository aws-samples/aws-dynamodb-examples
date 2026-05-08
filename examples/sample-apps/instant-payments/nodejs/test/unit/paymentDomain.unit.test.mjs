import { describe, expect, test } from "vitest";
import {
  toIdempotencyRecord,
  toInitialStreamHead,
  toOutboundPaymentCreatedEvent,
} from "../../src/infrastructure/persistence/paymentMapper.mjs";
import { Payment } from "../../src/domain/payments/entities/Payment.mjs";

const COMMAND = {
  idempotencyKey: "idem-1",
  merchantId: "merch_a",
  debtorAccountId: "acc_usd_1",
  creditorIban: "IBAN",
  creditorName: "Alice",
  amount: 100,
  currency: "USD",
};
const PAYMENT_ID = "pay_test";
const CORRELATION_ID = "corr_test";
const CREATED_AT = "2026-05-06T12:00:00.000Z";

describe("paymentMapper", () => {
  test("toInitialStreamHead builds correct head row", () => {
    const head = toInitialStreamHead(COMMAND, PAYMENT_ID, CORRELATION_ID, CREATED_AT);

    expect(head.PK).toBe("PAYMENT#pay_test");
    expect(head.SK).toBe("#HEAD");
    expect(head.entityType).toBe("PAYMENT_STREAM_HEAD");
    expect(head.lastSequence).toBe(1);
    expect(head.aggregateState).toBe("RECEIVED");
    expect(head.merchantPaymentsSk).toBe("2026-05-06T12:00:00.000Z#pay_test");
    expect(head.merchantStatePk).toBe("merch_a#RECEIVED");
    expect(head.debtorAccountId).toBe("acc_usd_1");
  });

  test("toOutboundPaymentCreatedEvent builds correct event row", () => {
    const event = toOutboundPaymentCreatedEvent(COMMAND, PAYMENT_ID, CORRELATION_ID, CREATED_AT);

    expect(event.PK).toBe("PAYMENT#pay_test");
    expect(event.SK).toBe("EVENT#0000000000000000001");
    expect(event.entityType).toBe("PAYMENT_EVENT");
    expect(event.eventType).toBe("OUTBOUND_PAYMENT_CREATED");
    expect(event.sequenceNumber).toBe(1);
    expect(event.correlationId).toBe(CORRELATION_ID);
  });

  test("toIdempotencyRecord builds correct idempotency row", () => {
    const snapshot = { paymentId: PAYMENT_ID, state: "RECEIVED", correlationId: CORRELATION_ID, createdAtUtc: CREATED_AT };
    const record = toIdempotencyRecord("idem-1", "abc123hash", snapshot, CREATED_AT, 2000000000);

    expect(record.PK).toBe("IDEMPOTENCY#idem-1");
    expect(record.SK).toBe("IDEMPOTENCY");
    expect(record.entityType).toBe("IDEMPOTENCY");
    expect(record.requestHash).toBe("abc123hash");
    expect(record.ttl).toBe(2000000000);
    expect(record.responseSnapshot).toEqual(snapshot);
  });
});

describe("Payment.replayLifecycleState", () => {
  test("folds event sequence to final lifecycle state", () => {
    expect(
      Payment.replayLifecycleState([
        { eventType: "OUTBOUND_PAYMENT_CREATED" },
        { eventType: "FUNDS_RESERVED" },
        { eventType: "COMPLETED" },
      ]),
    ).toBe("COMPLETED");

    expect(
      Payment.replayLifecycleState([
        { eventType: "OUTBOUND_PAYMENT_CREATED" },
        { eventType: "REJECTED" },
      ]),
    ).toBe("REJECTED");

    expect(Payment.replayLifecycleState([])).toBe("RECEIVED");
  });
});
