## Context

The repo is a freshly scaffolded Next.js 16 app with Prisma 7 + SQLite already wired up (see `prisma/schema.prisma`, `package.json`). There are no domain models, route handlers, or persistence yet — just the default landing page and a Prisma client output target at `app/generated/prisma`. `AGENTS.md` warns that this Next.js version may diverge from training-data conventions, so route handlers and config must be checked against `node_modules/next/dist/docs/` before coding.

This is the first feature being added on top of the scaffold, so design choices set patterns later capabilities (analytics, custom slugs, expirations) will inherit.

## Goals / Non-Goals

**Goals:**
- A working `POST /api/shorten` → returns slug + short URL.
- A working `GET /:slug` → 308/307 redirect to the original URL, 404 if missing.
- 7-character base62 slugs with collision handling against the DB.
- A reserved-slug list (`api`, `dashboard`, `admin`, `_next`) enforced at generation time so the dynamic `[slug]` route never shadows real routes.
- Persistence via Prisma + SQLite, with a single `Link` model.
- URL validation (only well-formed `http`/`https` URLs accepted).

**Non-Goals:**
- Authentication, accounts, or per-user quotas.
- Custom/vanity slugs, slug editing, or slug deletion.
- Click analytics, expiration, or rate limiting (beyond what trivially falls out).
- Admin UI, dashboard, or non-API frontend changes.
- Production deployment concerns (caching layers, CDN, multi-region).

## Decisions

### Decision: Slug format = 7-char base62 generated client-side, collision-checked on insert
Base62 (`0-9A-Za-z`) gives 62^7 ≈ 3.5 × 10^12 slugs — collisions stay rare even at millions of rows. We generate using `crypto.randomBytes` and reject + retry on unique-constraint violation rather than pre-querying, which avoids a TOCTOU race and is one round-trip in the happy path.

**Alternatives considered:**
- Sequential ID + base62 encode (Hashids-style): predictable, leaks volume, complicates reserved-slug enforcement.
- UUID v7 truncation: not uniform, harder to reason about collision odds.

### Decision: Reserved slugs enforced in the generator, not just the route
The list (`api`, `dashboard`, `admin`, `_next`) is checked when generating a slug; if a candidate matches, regenerate. The dynamic `[slug]` segment in Next.js will not match these prefixes anyway (real routes win), but enforcing in the generator means we never persist a row that could be silently unreachable, and the list stays a single source of truth as new reserved routes are added.

**Alternatives considered:**
- Rely solely on Next.js route precedence: persisted rows would become dead weight if `/admin` was added later.
- Block at the redirect handler only: rows persist that can never resolve.

### Decision: Single `Link` Prisma model with a unique slug
Schema:
```
model Link {
  id        Int      @id @default(autoincrement())
  slug      String   @unique
  url       String
  createdAt DateTime @default(now())
}
```
`slug` carries the unique index that powers both lookup and collision detection. `id` is kept for ordering/debugging — not exposed.

**Alternatives considered:**
- Use slug as the primary key: simpler, but harder to add foreign keys to later (analytics/clicks).
- Store normalized URL: out of scope; we persist exactly what the user submitted after validation.

### Decision: URL validation via the WHATWG `URL` constructor, scheme-restricted to http/https
Use `new URL(input)` (throws on malformed) and then check `protocol === 'http:' || 'https:'`. No regex.

**Alternatives considered:**
- Regex validators: notoriously buggy for URLs.
- Allow any scheme: opens phishing/`javascript:` redirect risk.

### Decision: Prisma client singleton in `app/lib/db.ts`
Next.js dev hot-reload will create many Prisma clients without a singleton guard. Use the standard `globalThis` cached pattern. Imported by both route handlers.

### Decision: Prisma 7 driver adapter — `@prisma/adapter-better-sqlite3`
Prisma 7's `prisma-client` provider does not ship an embedded engine for SQLite — `new PrismaClient()` throws unless given an `adapter` or `accelerateUrl`. We use `@prisma/adapter-better-sqlite3` with `better-sqlite3`: native, in-process, simplest match for a local SQLite file.

This contradicts the proposal's "no new runtime dependencies expected" line — that assumption was based on pre-7 Prisma. Two new runtime deps are added: `@prisma/adapter-better-sqlite3` and `better-sqlite3`.

**Alternatives considered:**
- `@prisma/adapter-libsql` + `@libsql/client`: WASM-friendly, edge-runtime compatible, but unnecessary complexity for a local dev SQLite file.
- Switching to Postgres via `@prisma/adapter-pg`: out of scope; SQLite is what the proposal specifies.

### Decision: Use 308 redirects for `GET /:slug`
308 (Permanent) is cacheable and preserves method. Short links are stable by design. Use 307 only if we later need to opt out of caching.

## Risks / Trade-offs

- **[Risk]** Collision retry loop could spin if RNG is broken or table is enormous → **Mitigation**: cap retries (e.g., 5) and surface a 500 with a clear error if all attempts collide; fail loud rather than loop.
- **[Risk]** SQLite `UNIQUE` violation surfaces as a Prisma error code `P2002`; not catching it specifically would mask real DB errors → **Mitigation**: catch exactly `P2002` on `slug` and retry; rethrow everything else.
- **[Risk]** Reserved-slug list and Next.js route map can drift as new routes are added → **Mitigation**: keep list in `app/lib/reserved-slugs.ts`, comment that it must be updated when adding top-level routes; add a unit test that asserts each entry corresponds to an existing route folder.
- **[Risk]** `BASE_URL` env var missing → returned short URL is broken → **Mitigation**: read once at module load with a clear error if unset in non-test environments; default to `http://localhost:3000` in development.
- **[Trade-off]** No rate limiting means a script can fill the slug space — acceptable at this scope, flagged for a follow-up capability.
- **[Trade-off]** Storing the raw user-submitted URL (post-validation) means duplicate submissions create duplicate rows. Acceptable: deduplication can be added later without a schema change.

## Migration Plan

1. Add `Link` model to `prisma/schema.prisma`.
2. Run `prisma migrate dev --name add_link_model` to create the SQLite migration and regenerate the client.
3. Deploy: `prisma migrate deploy` in any non-dev environment.
4. No data backfill — table starts empty.
5. **Rollback**: revert the migration (`prisma migrate resolve --rolled-back ...`) and revert the route handlers; SQLite file can be discarded in dev.

## Open Questions

- Should `POST /api/shorten` deduplicate (return the existing slug for an identical URL) or always create new? **Default:** always create new; revisit if storage or UX demands otherwise.
- Should the response include the full short URL or just the slug? **Default:** both — `{ slug, shortUrl }` — so the client doesn't need to know `BASE_URL`.
