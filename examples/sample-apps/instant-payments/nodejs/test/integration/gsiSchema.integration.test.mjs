import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { describe, expect, test } from "vitest";
import { createTestApp } from "../helpers/testApp.mjs";

const ATTR_MERCHANT_PAYMENTS_SK = "merchantPaymentsSk";
const ATTR_MERCHANT_STATE_PK = "merchantStatePk";

describe("merchant GSI schema", () => {
  test("live table GSIs match code contract (L5)", async () => {
    const ctx = await createTestApp();
    try {
      const res = await ctx.app.ddb.lowLevel.send(
        new DescribeTableCommand({ TableName: ctx.tableName }),
      );
      const gsis = Object.fromEntries(
        (res.Table?.GlobalSecondaryIndexes ?? []).map((g) => [g.IndexName, g]),
      );

      const allPayments = gsis.GSI_MERCHANT_PAYMENTS;
      expect(allPayments).toBeDefined();
      expect(allPayments.Projection?.ProjectionType).toBe("ALL");
      expect(allPayments.KeySchema).toEqual([
        { AttributeName: "merchantId", KeyType: "HASH" },
        { AttributeName: ATTR_MERCHANT_PAYMENTS_SK, KeyType: "RANGE" },
      ]);

      const byState = gsis.GSI_MERCHANT_STATE_PAYMENTS;
      expect(byState).toBeDefined();
      expect(byState.Projection?.ProjectionType).toBe("INCLUDE");
      expect(byState.Projection?.NonKeyAttributes?.sort()).toEqual(
        [
          "amount",
          "correlationId",
          "currency",
          "lastSequence",
          "paymentId",
          "reasonCode",
          "updatedAtUtc",
        ].sort(),
      );
      expect(byState.KeySchema).toEqual([
        { AttributeName: ATTR_MERCHANT_STATE_PK, KeyType: "HASH" },
        { AttributeName: "createdAtUtc", KeyType: "RANGE" },
      ]);
    } finally {
      await ctx.close();
    }
  });
});
