/** Detects serializable transaction conflicts (M2). */
export function hasTransactionConflict(err) {
  if (err?.name !== "TransactionCanceledException") return false;
  return (err.CancellationReasons ?? []).some((r) => r?.Code === "TransactionConflict");
}

/** Max in-process retries after TransactionConflict on transact paths. */
export const MAX_TRANSACTION_CONFLICT_RETRIES = 3;
