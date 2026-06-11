import { describe, expect, test } from "vitest";
import { canonicalFormForCreateOutbound } from "../../src/util/idempotencyCanonicalizer.mjs";
import { sha256Hex } from "../../src/util/hash.mjs";

const baseCommand = {
  idempotencyKey: "idem-1",
  merchantId: "merchantA",
  debtorAccountId: "account1",
  creditorIban: "IBAN1",
  creditorName: "Alice",
  amount: 10,
  currency: "EUR",
};

describe("idempotencyCanonicalizer", () => {
  test("same command yields stable hash", () => {
    const a = sha256Hex(canonicalFormForCreateOutbound(baseCommand));
    const b = sha256Hex(canonicalFormForCreateOutbound({ ...baseCommand }));
    expect(a).toBe(b);
  });

  test("separator injection in creditorName does not collide", () => {
    const injected = {
      ...baseCommand,
      creditorName: `Alice\u001f${baseCommand.merchantId}\u001f${baseCommand.debtorAccountId}`,
    };
    const other = {
      ...baseCommand,
      creditorName: "Bob",
      merchantId: "x",
      debtorAccountId: "y",
    };
    expect(canonicalFormForCreateOutbound(injected)).not.toBe(canonicalFormForCreateOutbound(other));
  });

  test("amount 10 and 10.0 normalize to the same canonical amount field", () => {
    const a = canonicalFormForCreateOutbound({ ...baseCommand, amount: 10 });
    const b = canonicalFormForCreateOutbound({ ...baseCommand, amount: 10.0 });
    expect(a).toBe(b);
  });
});
