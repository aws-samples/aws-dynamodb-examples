/**
 * Application use case: load and project a single outbound payment.
 * Delegates to repository.loadPaymentPartition which replays the event stream into a Payment aggregate.
 *
 * @param {object} input
 * @param {string} input.paymentId
 * @param {{ loadPaymentPartition: (id: string) => Promise<{ head: object, aggregate: object, events: object[] }> }} input.repository
 */
export async function getOutboundPayment({ paymentId, repository }) {
  const { head, aggregate, events } = await repository.loadPaymentPartition(paymentId);

  return {
    paymentId,
    state: aggregate.state,
    correlationId: head.correlationId,
    createdAtUtc: head.createdAtUtc,
    updatedAtUtc: head.updatedAtUtc,
    debtorAccountId: head.debtorAccountId,
    creditorIban: head.creditorIban,
    creditorName: head.creditorName,
    amount: head.amount,
    currency: head.currency,
    idempotencyKey: head.idempotencyKey,
    reasonCode: head.reasonCode ?? null,
    version: aggregate.version,
    events: events.map((e) => ({
      eventKey: e.SK,
      eventType: e.eventType,
      reasonCode: e.reasonCode ?? null,
      correlationId: e.correlationId,
    })),
  };
}
