import { describe, expect, it } from "vitest";
import { generateSlug } from "../app/lib/slug";
import { RESERVED_SLUGS } from "../app/lib/reserved-slugs";

const BASE62 = /^[0-9A-Za-z]{7}$/;

describe("generateSlug", () => {
  it("returns a 7-char base62 string", () => {
    for (let i = 0; i < 200; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(BASE62);
    }
  });

  it("never returns a reserved slug across many runs", () => {
    for (let i = 0; i < 2000; i++) {
      const slug = generateSlug();
      expect(RESERVED_SLUGS.has(slug)).toBe(false);
    }
  });

  it("regenerates when the candidate is reserved", () => {
    let i = 0;
    const sequence = ["api", "dashboard", "abcDEF1"];
    const slug = generateSlug(() => sequence[i++]);
    expect(slug).toBe("abcDEF1");
    expect(i).toBe(3);
  });
});
