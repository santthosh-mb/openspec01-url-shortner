export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api",
  "dashboard",
  "admin",
  "_next",
]);

export function isReserved(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
