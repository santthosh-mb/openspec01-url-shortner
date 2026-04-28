import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/lib/db", () => ({
  prisma: { link: { create: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock("../app/lib/slug", () => ({
  generateSlug: vi.fn(() => "abcDEF1"),
}));
vi.mock("../app/lib/config", () => ({
  getBaseUrl: () => "http://test.local",
}));

import { prisma } from "../app/lib/db";
import { POST } from "../app/api/shorten/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function jsonReq(body: unknown): Request {
  return new Request("http://test.local/api/shorten", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/shorten", () => {
  it("201 happy path", async () => {
    (prisma.link.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      slug: "abcDEF1",
      url: "https://example.com/x",
    });
    const res = await POST(jsonReq({ url: "https://example.com/x" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      slug: "abcDEF1",
      shortUrl: "http://test.local/abcDEF1",
    });
  });

  it("400 on non-JSON body", async () => {
    const req = new Request("http://test.local/api/shorten", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/JSON/i);
  });

  it("400 on missing url", async () => {
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
  });

  it("400 on non-string url", async () => {
    const res = await POST(jsonReq({ url: 123 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/string/i);
  });

  it("400 on malformed url", async () => {
    const res = await POST(jsonReq({ url: "not a url" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid URL/i);
  });

  it("400 on javascript: scheme", async () => {
    const res = await POST(jsonReq({ url: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/http/i);
  });

  it("400 on ftp: scheme", async () => {
    const res = await POST(jsonReq({ url: "ftp://example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/http/i);
  });
});
