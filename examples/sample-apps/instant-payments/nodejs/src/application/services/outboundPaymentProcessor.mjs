import { accountNotFound } from "../../util/errors.mjs";

/**
 * Application service: orchestrates outbound payment state transitions.
 *
 * Accepts a `repository` port that provides all DynamoDB operations (no infrastructure imports here).
 * Mirrors `OutboundPaymentProcessor` in the Java reference implementation.
 *
 * @param {object} input
 * @param {string} input.paymentId
 * @param {object} input.repository
 */
export async function processOutboundPayment({ repository, paymentId }) {
  const loaded = await repository.loadPaymentPartition(paymentId);
  const { aggregate } = loaded;

  if (aggregate.terminal) return toResult(aggregate);

  if (aggregate.state === "RECEIVED") return processFromReceived({ repository, loaded });
  if (aggregate.state === "FUNDS_RESERVED") return completeFromFundsReserved({ repository, loaded });

  return toResult(aggregate);
}

async function processFromReceived({ repository, loaded }) {
  const { aggregate } = loaded;

  const account = await repository.getAccount(aggregate.debtorAccountId);
  if (!account) {
    await repository.rejectPaymentTransaction({ loaded, reasonCode: "ACCOUNT_NOT_FOUND" });
    return { paymentId: aggregate.paymentId, state: "REJECTED", reasonCode: "ACCOUNT_NOT_FOUND" };
  }

  if (Number(account.availableBalance) < Number(aggregate.amount)) {
    await repository.rejectPaymentTransaction({ loaded, reasonCode: "INSUFFICIENT_FUNDS" });
    return { paymentId: aggregate.paymentId, state: "REJECTED", reasonCode: "INSUFFICIENT_FUNDS" };
  }

  const reserved = await repository.reserveFundsTransaction({ loaded, account });
  if (!reserved) {
    const fresh = await repository.loadPaymentPartition(aggregate.paymentId);
    return toResult(fresh.aggregate);
  }

  const freshAccount = await repository.getAccount(aggregate.debtorAccountId);
  if (!freshAccount) throw accountNotFound();

  const freshLoaded = await repository.loadPaymentPartition(aggregate.paymentId);
  if (!freshLoaded.aggregate.terminal) {
    await repository.completePaymentTransaction({ loaded: freshLoaded, account: freshAccount });
  }

  return { paymentId: aggregate.paymentId, state: "COMPLETED", reasonCode: null };
}

async function completeFromFundsReserved({ repository, loaded }) {
  const { aggregate } = loaded;

  const account = await repository.getAccount(aggregate.debtorAccountId);
  if (!account) throw accountNotFound();

  await repository.completePaymentTransaction({ loaded, account });
  return { paymentId: aggregate.paymentId, state: "COMPLETED", reasonCode: null };
}

function toResult(aggregate) {
  return {
    paymentId: aggregate.paymentId,
    state: aggregate.state,
    reasonCode: aggregate.reasonCode ?? null,
  };
}
