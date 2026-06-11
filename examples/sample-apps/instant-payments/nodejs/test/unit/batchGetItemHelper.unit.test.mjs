import { describe, expect, test, vi } from "vitest";
import {
  SDK_ATTEMPT_OFFSET,
  computeUnprocessedKeysDelayMs,
  unprocessedKeysDelayMs,
} from "../../src/util/batchGetItemHelper.mjs";

describe("batchGetItemHelper", () => {
  test("SDK_ATTEMPT_OFFSET maps loop attempt 0 to SDK attempt 2", () => {
    expect(SDK_ATTEMPT_OFFSET).toBe(2);
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(unprocessedKeysDelayMs(0)).toBe(computeUnprocessedKeysDelayMs(2));
    random.mockRestore();
  });

  test("SDK attempt 1 yields zero delay", () => {
    expect(computeUnprocessedKeysDelayMs(1)).toBe(0);
  });
});
