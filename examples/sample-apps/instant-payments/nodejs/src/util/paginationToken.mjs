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

export function decodeNextToken({ token, expectedIndexName }) {
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

  return { lastEvaluatedKey: parsed.lastEvaluatedKey };
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

