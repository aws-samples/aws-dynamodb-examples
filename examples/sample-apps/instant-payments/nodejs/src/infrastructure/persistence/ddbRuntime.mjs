/**
 * Shared DynamoDB access mode: Document Client (marshalled JS items) vs low-level AttributeValue API.
 * Command branching lives in `ddbBridgeCommands.mjs` so callers use one JS-shaped contract.
 *
 * @param {object} deps
 * @param {import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient} deps.doc
 * @param {import("@aws-sdk/client-dynamodb").DynamoDBClient} deps.lowLevel
 * @param {string} deps.clientType - `high-level` \| `low-level`
 */
export function createDdbRuntime({ doc, lowLevel, clientType }) {
  const normalized =
    clientType === "low-level" ? "low-level" : clientType === "high-level" ? "high-level" : null;
  if (!normalized) {
    throw new Error(`Invalid dynamodb.client-type: ${clientType}; expected high-level or low-level`);
  }
  return {
    doc,
    lowLevel,
    clientType: normalized,
    isLowLevel: normalized === "low-level",
  };
}
