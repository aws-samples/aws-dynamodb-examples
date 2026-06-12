import { ATTR_MERCHANT_STATE_PK } from "../data/keys.mjs";

export function encodeNextToken({ indexName, lastEvaluatedKey }) {
  if (!lastEvaluatedKey) return undefined;
  if (
    typeof lastEvaluatedKey === "object" &&
    lastEvaluatedKey != null &&
    Object.keys(lastEvaluatedKey).length === 0
  ) {
    return undefined;
  }
  const payload = { v: 1, indexName, lastEvaluatedKey };
  return base64UrlEncodeUtf8(JSON.stringify(payload));
}

export function decodeNextToken({ token, expectedIndexName, expectedMerchantId }) {
  const trimmed = String(token ?? "").trim();
  if (!trimmed) return undefined;
  let parsed;
  try {
    const json = base64UrlDecodeUtf8(trimmed);
    parsed = JSON.parse(json);
  } catch {
    return { error: "INVALID" };
  }

  if (!parsed || parsed.v !== 1 || typeof parsed.indexName !== "string" || !parsed.lastEvaluatedKey) {
    return { error: "INVALID" };
  }
  if (parsed.indexName !== expectedIndexName) {
    // Treat cross-endpoint token reuse as invalid token (explicitly allowed by spec).
    return { error: "WRONG_INDEX" };
  }

  if (expectedMerchantId != null) {
    const tokenMerchantId = merchantIdFromLastEvaluatedKey(parsed.indexName, parsed.lastEvaluatedKey);
    if (tokenMerchantId !== expectedMerchantId) {
      return { error: "WRONG_MERCHANT" };
    }
  }

  return { lastEvaluatedKey: parsed.lastEvaluatedKey };
}

function merchantIdFromLastEvaluatedKey(indexName, lastEvaluatedKey) {
  if (indexName === "GSI_MERCHANT_PAYMENTS") {
    return typeof lastEvaluatedKey.merchantId === "string" ? lastEvaluatedKey.merchantId : null;
  }
  if (indexName === "GSI_MERCHANT_STATE_PAYMENTS") {
    const merchantStatePk = lastEvaluatedKey[ATTR_MERCHANT_STATE_PK];
    if (typeof merchantStatePk !== "string") return null;
    const sep = merchantStatePk.indexOf("#");
    return sep > 0 ? merchantStatePk.slice(0, sep) : null;
  }
  return null;
}

function base64UrlEncodeUtf8(str) {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecodeUtf8(b64url) {
  const padded = b64url.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((b64url.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

