/**
 * BatchGetItem unprocessed-keys retry helpers (mirrors Java {@code BatchGetItemHelper}).
 */

/** Maximum retries after the first BatchGetItem when unprocessed keys remain. */
export const MAX_UNPROCESSED_RETRIES = 8;

/**
 * SDK BackoffStrategy.computeDelay uses a 1-based attempt index where attempt 1 is zero delay.
 * Repository loops are 0-based for the call that returned unprocessed keys; +2 maps loop index
 * to the SDK attempt so the first retry after attempt 0 gets a non-zero delay.
 */
export const SDK_ATTEMPT_OFFSET = 2;

const BACKOFF_BASE_MS = 50;
const BACKOFF_CAP_MS = 1_000;

/**
 * Full-jitter exponential backoff matching Smithy exponentialDelay(50ms, 1s).
 *
 * @param {number} sdkAttempt 1-based SDK attempt index
 */
export function computeUnprocessedKeysDelayMs(sdkAttempt) {
  if (sdkAttempt <= 1) return 0;
  const exp = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (sdkAttempt - 2));
  return Math.floor(Math.random() * exp);
}

/**
 * @param {number} loopAttempt zero-based index of the attempt that produced unprocessed keys
 */
export function unprocessedKeysDelayMs(loopAttempt) {
  return computeUnprocessedKeysDelayMs(loopAttempt + SDK_ATTEMPT_OFFSET);
}

export function sleepMs(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
