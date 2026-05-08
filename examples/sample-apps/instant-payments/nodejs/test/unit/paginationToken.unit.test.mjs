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
});

