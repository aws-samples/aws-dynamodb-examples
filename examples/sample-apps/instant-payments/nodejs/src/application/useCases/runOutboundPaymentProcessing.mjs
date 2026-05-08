import { processOutboundPayment } from "../services/outboundPaymentProcessor.mjs";

/**
 * @param {object} input
 * @param {string} input.paymentId
 * @param {object} input.repository
 */
export async function runOutboundPaymentProcessing({ paymentId, repository }) {
  return processOutboundPayment({ repository, paymentId });
}
