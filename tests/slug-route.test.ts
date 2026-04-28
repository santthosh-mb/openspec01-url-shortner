import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/db", () => ({
  prisma: { link: { findUnique: vi.fn() } },
}));

import { prisma } from "../app/lib/db";
import { GET } from "../app/[slug]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function call(slug: string) {
  return GET(new Request(`http://test.local/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

describe("GET /:slug", () => {
  it("308 redirects with Location for an existing slug", async () => {
    (prisma.link.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      url: "https://example.com/destination",
    });
    const res = await call("abcDEF1");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://example.com/destination");
  });

  it("404 for an unknown slug", async () => {
    (prisma.link.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      null,
    );
    const res = await call("missing");
    expect(res.status).toBe(404);
  });
});
