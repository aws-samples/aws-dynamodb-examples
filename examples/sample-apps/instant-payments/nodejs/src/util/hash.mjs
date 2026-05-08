import { createHash } from "node:crypto";
import { canonicalJsonStringify } from "./canonicalJson.mjs";

export function sha256HexOfCanonicalJson(obj) {
  const canonical = canonicalJsonStringify(obj);
  return createHash("sha256").update(canonical).digest("hex");
}

