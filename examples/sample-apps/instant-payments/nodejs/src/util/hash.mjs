import { createHash } from "node:crypto";

export function sha256Hex(canonical) {
  return createHash("sha256").update(canonical).digest("hex");
}

