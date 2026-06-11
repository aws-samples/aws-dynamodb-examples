/**
 * Length-prefixed canonical form for outbound create idempotency hashing.
 * Each field is encoded as {@code length + ":" + value} so separator injection
 * (e.g. U+001F embedded in creditorName) cannot collide with another request.
 */
function lengthPrefixField(value) {
  const s = String(value);
  return `${s.length}:${s}`;
}

function amountToPlainString(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return String(amount);
  }
  const s = amount.toString();
  if (s.includes("e") || s.includes("E")) {
    return amount.toFixed(20).replace(/\.?0+$/, "") || "0";
  }
  if (s.includes(".")) {
    return s.replace(/\.?0+$/, "") || "0";
  }
  return s;
}

/**
 * @param {object} command validated create-outbound body
 * @returns {string} canonical string for SHA-256 (not JSON)
 */
export function canonicalFormForCreateOutbound(command) {
  const fields = [
    command.idempotencyKey,
    command.merchantId,
    command.debtorAccountId,
    command.creditorIban,
    command.creditorName,
    amountToPlainString(command.amount),
    command.currency,
  ];
  return fields.map(lengthPrefixField).join("");
}
