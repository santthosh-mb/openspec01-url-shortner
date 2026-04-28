import { afterEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../app/generated/prisma/client";

vi.mock("../app/lib/db", () => ({
  prisma: { link: { create: vi.fn() } },
}));
vi.mock("../app/lib/slug", () => ({
  generateSlug: vi.fn(),
}));

import { prisma } from "../app/lib/db";
import { generateSlug } from "../app/lib/slug";
import { createLink, SlugGenerationError } from "../app/lib/links";

afterEach(() => {
  vi.clearAllMocks();
});

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError("unique violation", {
    code: "P2002",
    clientVersion: "test",
  });

describe("createLink", () => {
  it("returns the slug on first-attempt success", async () => {
    (generateSlug as ReturnType<typeof vi.fn>).mockReturnValueOnce("aaaaaaa");
    (prisma.link.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      slug: "aaaaaaa",
      url: "https://x.test",
    });

    const result = await createLink("https://x.test");
    expect(result).toEqual({ slug: "aaaaaaa", url: "https://x.test" });
    expect(prisma.link.create).toHaveBeenCalledTimes(1);
  });

  it("retries on P2002 and succeeds on second attempt", async () => {
    (generateSlug as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce("aaaaaaa")
      .mockReturnValueOnce("bbbbbbb");
    (prisma.link.create as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(p2002())
      .mockResolvedValueOnce({ slug: "bbbbbbb", url: "https://y.test" });

    const result = await createLink("https://y.test");
    expect(result.slug).toBe("bbbbbbb");
    expect(prisma.link.create).toHaveBeenCalledTimes(2);
  });

  it("throws SlugGenerationError after exhausting retries", async () => {
    (generateSlug as ReturnType<typeof vi.fn>).mockReturnValue("zzzzzzz");
    (prisma.link.create as ReturnType<typeof vi.fn>).mockRejectedValue(p2002());

    await expect(createLink("https://z.test")).rejects.toBeInstanceOf(
      SlugGenerationError,
    );
    expect(prisma.link.create).toHaveBeenCalledTimes(5);
  });

  it("rethrows non-P2002 errors immediately", async () => {
    (generateSlug as ReturnType<typeof vi.fn>).mockReturnValue("aaaaaaa");
    const boom = new Error("boom");
    (prisma.link.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(boom);

    await expect(createLink("https://q.test")).rejects.toBe(boom);
    expect(prisma.link.create).toHaveBeenCalledTimes(1);
  });
});
