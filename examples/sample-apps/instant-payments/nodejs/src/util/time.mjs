export function nowUtcIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function toEpochSeconds(isoInstant) {
  const ms = Date.parse(isoInstant);
  if (!Number.isFinite(ms)) throw new Error(`Invalid instant: ${isoInstant}`);
  return Math.floor(ms / 1000);
}

