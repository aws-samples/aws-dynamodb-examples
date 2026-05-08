import { sendQueryCommand } from "../infrastructure/persistence/ddbDocumentBridge.mjs";
import {
  internalError,
  invalidPaginationToken,
  invalidPaymentState,
} from "../util/errors.mjs";
import { decodeNextToken, encodeNextToken } from "../util/paginationToken.mjs";
import { ATTR_MERCHANT_STATE_PK, merchantStatePk } from "../data/keys.mjs";

const DEFAULT_LIMIT = 50;
const VALID_STATES = new Set(["RECEIVED", "FUNDS_RESERVED", "COMPLETED", "REJECTED"]);

export async function merchantsRoutes(app) {
  app.get("/:merchantId/payments", async (req) => {
    const tableName = app.config.dynamodb.tableName;
    const merchantId = String(req.params.merchantId ?? "").trim();
    const limit = normalizeLimit(req.query?.limit);
    const scanIndexForward = normalizeScanIndexForward(req.query?.scanIndexForward);

    const token = decodeNextToken({
      token: req.query?.nextToken,
      expectedIndexName: "GSI_MERCHANT_PAYMENTS",
    });
    if (token?.error === "WRONG_INDEX") throw internalError("Internal error");
    if (token?.error) throw invalidPaginationToken("Invalid pagination token");

    const res = await sendQueryCommand(app.ddbRuntime, {
      TableName: tableName,
      IndexName: "GSI_MERCHANT_PAYMENTS",
      KeyConditionExpression: "merchantId = :merchantId",
      ExpressionAttributeValues: { ":merchantId": merchantId },
      Limit: limit,
      ScanIndexForward: scanIndexForward,
      ExclusiveStartKey: token?.lastEvaluatedKey,
    });

    const items = (res?.Items ?? []).map((it) =>
      mapMerchantListItem(it, { merchantId }),
    );
    const nextToken = encodeNextToken({
      indexName: "GSI_MERCHANT_PAYMENTS",
      lastEvaluatedKey: res?.LastEvaluatedKey,
    });

    return nextToken ? { items, nextToken } : { items };
  });

  app.get("/:merchantId/payments/state/:state", async (req) => {
    const tableName = app.config.dynamodb.tableName;
    const merchantId = String(req.params.merchantId ?? "").trim();
    const stateRaw = String(req.params.state ?? "").trim();
    const state = stateRaw.toUpperCase();
    if (!VALID_STATES.has(state)) throw invalidPaymentState("Invalid payment state");

    const limit = normalizeLimit(req.query?.limit);
    const scanIndexForward = normalizeScanIndexForward(req.query?.scanIndexForward);

    const token = decodeNextToken({
      token: req.query?.nextToken,
      expectedIndexName: "GSI_MERCHANT_STATE_PAYMENTS",
    });
    if (token?.error === "WRONG_INDEX") throw internalError("Internal error");
    if (token?.error) throw invalidPaginationToken("Invalid pagination token");

    const pk = merchantStatePk(merchantId, state);

    const res = await sendQueryCommand(app.ddbRuntime, {
      TableName: tableName,
      IndexName: "GSI_MERCHANT_STATE_PAYMENTS",
      KeyConditionExpression: `${ATTR_MERCHANT_STATE_PK} = :pk`,
      ExpressionAttributeValues: { ":pk": pk },
      Limit: limit,
      ScanIndexForward: scanIndexForward,
      ExclusiveStartKey: token?.lastEvaluatedKey,
    });

    const items = (res?.Items ?? []).map((it) =>
      mapMerchantListItem(it, { merchantId, state }),
    );
    const nextToken = encodeNextToken({
      indexName: "GSI_MERCHANT_STATE_PAYMENTS",
      lastEvaluatedKey: res?.LastEvaluatedKey,
    });

    return nextToken ? { items, nextToken } : { items };
  });
}

function normalizeLimit(raw) {
  if (raw == null) return DEFAULT_LIMIT;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return n;
}

function normalizeScanIndexForward(raw) {
  if (raw == null) return false; // newest first
  const s = String(raw).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function mapMerchantListItem(item, ctx = {}) {
  const createdAtUtc = item.createdAtUtc;
  return {
    paymentId: item.paymentId,
    state: item.aggregateState ?? item.state ?? ctx.state,
    version: item.lastSequence,
    merchantId: item.merchantId ?? ctx.merchantId,
    correlationId: item.correlationId ?? null,
    amount: item.amount,
    currency: item.currency,
    createdAtUtc,
    updatedAtUtc: item.updatedAtUtc ?? createdAtUtc,
    reasonCode: item.reasonCode ?? null,
  };
}

