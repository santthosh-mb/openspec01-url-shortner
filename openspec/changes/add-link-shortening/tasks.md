## 1. Database & Prisma

- [ ] 1.1 Add `Link` model to `prisma/schema.prisma` (`id`, unique `slug`, `url`, `createdAt`)
- [ ] 1.2 Ensure `DATABASE_URL` is set in `.env` for SQLite (e.g., `file:./dev.db`)
- [ ] 1.3 Run `prisma migrate dev --name add_link_model` to create migration and regenerate client
- [ ] 1.4 Verify generated client output at `app/generated/prisma` is reachable from server code

## 2. Shared library modules

- [ ] 2.1 Create `app/lib/db.ts` exporting a Prisma client singleton (with `globalThis` cache for dev)
- [ ] 2.2 Create `app/lib/reserved-slugs.ts` exporting the reserved set: `api`, `dashboard`, `admin`, `_next`
- [ ] 2.3 Create `app/lib/url.ts` with `validateUrl(input: unknown): string` — rejects non-strings, malformed URLs, and non-http(s) schemes via the WHATWG `URL` constructor
- [ ] 2.4 Create `app/lib/slug.ts` with `generateSlug(): string` — 7-char base62 from `crypto.randomBytes`, skipping reserved values
- [ ] 2.5 Create `app/lib/links.ts` with `createLink(url: string)` — generates slug, inserts, retries on Prisma `P2002` up to N attempts; throws a typed error if exhausted
- [ ] 2.6 Create `app/lib/config.ts` exposing `BASE_URL` (env-driven, falls back to `http://localhost:3000` in dev)

## 3. Route: POST /api/shorten

- [ ] 3.1 Read Next.js route handler docs from `node_modules/next/dist/docs/` to confirm current API for this version
- [ ] 3.2 Create `app/api/shorten/route.ts` exporting `POST`
- [ ] 3.3 Parse JSON body; on invalid JSON return 400 with `{ error: "..." }`
- [ ] 3.4 Validate `url` field via `validateUrl`; on failure return 400 with a message that names the failure (missing/non-string/malformed/scheme)
- [ ] 3.5 Call `createLink`; on retry exhaustion return 500 with a clear message
- [ ] 3.6 Return 201 with `{ slug, shortUrl: <BASE_URL>/<slug> }`

## 4. Route: GET /:slug

- [ ] 4.1 Create `app/[slug]/route.ts` exporting `GET`
- [ ] 4.2 Look up the slug via Prisma (`findUnique`)
- [ ] 4.3 If found, return a 308 redirect to the stored URL (`Response.redirect(url, 308)` or framework equivalent)
- [ ] 4.4 If not found, return 404
- [ ] 4.5 Confirm real top-level routes (`/api`, `/dashboard`, `/admin`, `/_next`) take precedence over `[slug]` (Next.js routing default; verify by hitting `/api/shorten` and ensuring it is NOT handled by the slug route)

## 5. Tests

- [ ] 5.1 Unit test `validateUrl`: accepts http/https, rejects malformed, non-string, javascript:, ftp:
- [ ] 5.2 Unit test `generateSlug`: shape (7 chars, base62), and that reserved values never escape the generator (mock RNG to force a reserved hit)
- [ ] 5.3 Unit test `createLink`: simulates a `P2002` on first insert and asserts a retry succeeds; asserts retry exhaustion throws the typed error
- [ ] 5.4 Integration test `POST /api/shorten`: 201 happy path, 400 on each invalid-input scenario from the spec
- [ ] 5.5 Integration test `GET /:slug`: 308 with correct `Location` for an existing slug, 404 for an unknown slug
- [ ] 5.6 Test asserting every entry in `reserved-slugs.ts` corresponds to an actual top-level route folder under `app/`

## 6. Verification

- [ ] 6.1 `npm run lint` passes
- [ ] 6.2 `npm run build` passes
- [ ] 6.3 Manual smoke test via `npm run dev`: `curl -X POST localhost:3000/api/shorten -d '{"url":"https://example.com"}'`, then `curl -I localhost:3000/<slug>` returns 308 with the expected `Location`
- [ ] 6.4 Confirm `/api/shorten` is still reachable (not shadowed by the dynamic slug route)
