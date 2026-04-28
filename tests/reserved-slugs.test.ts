import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "../app/lib/reserved-slugs";

const APP_DIR = join(process.cwd(), "app");

// `_next` is a Next.js framework-internal prefix (no app-dir folder).
// Other entries in the reserved set are real or pre-reserved top-level routes.
const FRAMEWORK_RESERVED = new Set(["_next"]);
// Pre-reserved against future routes that don't yet exist as folders.
const PRE_RESERVED = new Set(["dashboard", "admin"]);

describe("reserved slugs", () => {
  it("contains the slugs required by the spec", () => {
    for (const required of ["api", "dashboard", "admin", "_next"]) {
      expect(RESERVED_SLUGS.has(required)).toBe(true);
    }
  });

  it.each([...RESERVED_SLUGS])(
    "%s is either a top-level route folder, framework-reserved, or pre-reserved",
    (slug) => {
      if (FRAMEWORK_RESERVED.has(slug) || PRE_RESERVED.has(slug)) return;
      expect(existsSync(join(APP_DIR, slug))).toBe(true);
    },
  );
});
