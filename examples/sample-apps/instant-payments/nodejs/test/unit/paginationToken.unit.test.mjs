import { describe, expect, test } from "vitest";
import { decodeNextToken, encodeNextToken } from "../../src/util/paginationToken.mjs";

describe("paginationToken", () => {
  test("round-trips token for expected index", () => {
    const tok = encodeNextToken({
      indexName: "IDX",
      lastEvaluatedKey: { PK: "a", SK: "b" },
    });
    expect(typeof tok).toBe("string");

    const decoded = decodeNextToken({ token: tok, expectedIndexName: "IDX" });
    expect(decoded.error).toBeUndefined();
    expect(decoded.lastEvaluatedKey).toEqual({ PK: "a", SK: "b" });
  });

  test("rejects malformed and wrong-index tokens", () => {
    expect(decodeNextToken({ token: "nope", expectedIndexName: "IDX" }).error).toBeTruthy();

    const tok = encodeNextToken({
      indexName: "IDX_A",
      lastEvaluatedKey: { PK: "a", SK: "b" },
    });
    expect(decodeNextToken({ token: tok, expectedIndexName: "IDX_B" }).error).toBeTruthy();
  });

  test("rejects cross-merchant token replay", () => {
    const tok = encodeNextToken({
      indexName: "GSI_MERCHANT_PAYMENTS",
      lastEvaluatedKey: {
        PK: "PAYMENT#pay_a",
        SK: "#HEAD",
        merchantId: "merch_a",
        merchantPaymentsSk: "2026-01-01T00:00:00Z#pay_a",
      },
    });
    const ok = decodeNextToken({
      token: tok,
      expectedIndexName: "GSI_MERCHANT_PAYMENTS",
      expectedMerchantId: "merch_a",
    });
    expect(ok.error).toBeUndefined();

    const bad = decodeNextToken({
      token: tok,
      expectedIndexName: "GSI_MERCHANT_PAYMENTS",
      expectedMerchantId: "merch_b",
    });
    expect(bad.error).toBe("WRONG_MERCHANT");
  });
});

