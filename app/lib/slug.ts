import { randomBytes } from "node:crypto";
import { isReserved } from "./reserved-slugs";

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SLUG_LENGTH = 7;

export type CandidateFn = () => string;

export function generateSlug(candidate: CandidateFn = makeCandidate): string {
  while (true) {
    const c = candidate();
    if (!isReserved(c)) {
      return c;
    }
  }
}

function makeCandidate(): string {
  // Reject bytes ≥ 248 to keep base62 unbiased (248 = 4 * 62).
  const out: string[] = [];
  while (out.length < SLUG_LENGTH) {
    const buf = randomBytes(SLUG_LENGTH * 2);
    for (const byte of buf) {
      if (byte >= 248) continue;
      out.push(ALPHABET[byte % 62]);
      if (out.length === SLUG_LENGTH) break;
    }
  }
  return out.join("");
}
