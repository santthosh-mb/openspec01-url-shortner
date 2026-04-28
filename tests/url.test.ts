import { describe, expect, it } from "vitest";
import { InvalidUrlError, validateUrl } from "../app/lib/url";

describe("validateUrl", () => {
  it("accepts an http URL", () => {
    expect(validateUrl("http://example.com")).toBe("http://example.com");
  });

  it("accepts an https URL with path and query", () => {
    expect(validateUrl("https://example.com/a/b?q=1")).toBe(
      "https://example.com/a/b?q=1",
    );
  });

  it("rejects undefined", () => {
    expect(() => validateUrl(undefined)).toThrow(InvalidUrlError);
    try {
      validateUrl(undefined);
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidUrlError);
      expect((e as InvalidUrlError).failure.kind).toBe("missing");
    }
  });

  it("rejects a non-string", () => {
    try {
      validateUrl(123);
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidUrlError);
      expect((e as InvalidUrlError).failure.kind).toBe("not_string");
    }
  });

  it("rejects malformed input", () => {
    try {
      validateUrl("not a url");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidUrlError);
      expect((e as InvalidUrlError).failure.kind).toBe("malformed");
    }
  });

  it("rejects javascript: scheme", () => {
    try {
      validateUrl("javascript:alert(1)");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidUrlError);
      expect((e as InvalidUrlError).failure.kind).toBe("bad_scheme");
    }
  });

  it("rejects ftp: scheme", () => {
    try {
      validateUrl("ftp://example.com");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidUrlError);
      expect((e as InvalidUrlError).failure.kind).toBe("bad_scheme");
    }
  });
});
