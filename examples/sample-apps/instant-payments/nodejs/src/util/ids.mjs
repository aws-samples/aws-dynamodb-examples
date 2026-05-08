import { randomUUID } from "node:crypto";

export function newPaymentId() {
  return `pay_${randomUUID()}`;
}

export function newCorrelationId() {
  return `corr_${randomUUID()}`;
}

