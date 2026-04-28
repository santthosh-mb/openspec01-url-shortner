## Why

The repository is scaffolded as a URL shortener but has no shortening capability — there is no way to submit a long URL or resolve a short slug. We need a minimal end-to-end shortening flow so the product has its core function and so subsequent capabilities (analytics, custom slugs, expiration) have something to build on.

## What Changes

- Add `POST /api/shorten` accepting a JSON body with a long URL and returning a short slug plus the full short URL.
- Add `GET /:slug` that issues an HTTP redirect to the original URL when the slug exists, and a 404 response when it does not.
- Generate slugs as 7-character base62 strings, with a collision check against existing rows before persisting.
- Reserve the slugs `api`, `dashboard`, `admin`, and `_next` so they can never be issued and route conflicts are avoided.
- Persist links in SQLite via Prisma with a new `Link` model.
- Validate input URLs (must be a syntactically valid `http`/`https` URL).

## Capabilities

### New Capabilities
- `link-shortening`: Create short slugs for long URLs and resolve those slugs back to the original destination.

### Modified Capabilities
<!-- None — there are no existing specs in openspec/specs/. -->

## Impact

- **Code**: New route handlers under `app/api/shorten/route.ts` and `app/[slug]/route.ts`; new server-side modules for slug generation, URL validation, and the Link repository.
- **Database**: New `Link` table in SQLite via a Prisma migration; `prisma/schema.prisma` updated; Prisma client regenerated to `app/generated/prisma`.
- **Configuration**: `DATABASE_URL` (SQLite file) must be set in `.env`; `BASE_URL` (or equivalent) needed to construct the returned short URL.
- **Routing**: Adds a top-level dynamic `[slug]` route; reserved-slug list keeps it from shadowing `/api`, `/dashboard`, `/admin`, and `/_next`.
- **Dependencies**: Uses Prisma + `@prisma/client` already in `package.json`; no new runtime dependencies expected.
