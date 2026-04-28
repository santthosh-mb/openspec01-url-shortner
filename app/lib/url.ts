export type UrlValidationFailure =
  | { kind: "missing" }
  | { kind: "not_string" }
  | { kind: "malformed" }
  | { kind: "bad_scheme"; scheme: string };

export class InvalidUrlError extends Error {
  readonly failure: UrlValidationFailure;
  constructor(failure: UrlValidationFailure, message: string) {
    super(message);
    this.name = "InvalidUrlError";
    this.failure = failure;
  }
}

export function validateUrl(input: unknown): string {
  if (input === undefined || input === null) {
    throw new InvalidUrlError({ kind: "missing" }, "url is required");
  }
  if (typeof input !== "string") {
    throw new InvalidUrlError({ kind: "not_string" }, "url must be a string");
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new InvalidUrlError({ kind: "malformed" }, "url is not a valid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidUrlError(
      { kind: "bad_scheme", scheme: parsed.protocol.replace(":", "") },
      "only http and https URLs are allowed",
    );
  }

  return input;
}
