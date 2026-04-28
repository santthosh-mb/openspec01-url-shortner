# link-shortening Specification

## Purpose
TBD - created by archiving change add-link-shortening. Update Purpose after archive.
## Requirements
### Requirement: Create short link
The system SHALL accept long URLs at `POST /api/shorten` and return a short slug that resolves to that URL.

The request body MUST be JSON of the form `{ "url": "<string>" }`. The response on success MUST be JSON of the form `{ "slug": "<7-char>", "shortUrl": "<base>/<slug>" }` with HTTP status 201.

#### Scenario: Successful shortening of a valid http URL
- **WHEN** a client sends `POST /api/shorten` with body `{ "url": "https://example.com/some/path?q=1" }`
- **THEN** the system persists a new link, generates a 7-character base62 slug, and responds 201 with `{ "slug": "<slug>", "shortUrl": "<BASE_URL>/<slug>" }`

#### Scenario: Rejecting a malformed URL
- **WHEN** a client sends `POST /api/shorten` with body `{ "url": "not a url" }`
- **THEN** the system responds 400 with an error body indicating the URL is invalid, and no link is persisted

#### Scenario: Rejecting a non-http(s) scheme
- **WHEN** a client sends `POST /api/shorten` with body `{ "url": "javascript:alert(1)" }` or `{ "url": "ftp://example.com" }`
- **THEN** the system responds 400 with an error body indicating only http and https schemes are allowed, and no link is persisted

#### Scenario: Rejecting a missing or non-string url field
- **WHEN** a client sends `POST /api/shorten` with body `{}` or `{ "url": 123 }`
- **THEN** the system responds 400 with an error body indicating `url` is required and must be a string

#### Scenario: Rejecting a non-JSON body
- **WHEN** a client sends `POST /api/shorten` with a body that is not valid JSON
- **THEN** the system responds 400 with an error body indicating the body must be JSON

### Requirement: Resolve short link
The system SHALL resolve `GET /:slug` requests by issuing an HTTP redirect to the original URL stored for that slug.

#### Scenario: Redirecting an existing slug
- **WHEN** a client sends `GET /<slug>` for a slug that exists in the database
- **THEN** the system responds with HTTP 308 and a `Location` header equal to the stored original URL

#### Scenario: Unknown slug returns 404
- **WHEN** a client sends `GET /<slug>` for a slug that does not exist
- **THEN** the system responds 404

#### Scenario: Reserved-prefix routes are not handled by the slug resolver
- **WHEN** a client sends `GET /api/...`, `GET /dashboard`, `GET /admin`, or `GET /_next/...`
- **THEN** the request is handled by the matching real route (or 404 if none) and is not interpreted as a slug lookup

### Requirement: Slug format and uniqueness
The system SHALL generate slugs that are exactly 7 characters from the base62 alphabet (`0-9`, `A-Z`, `a-z`) and SHALL ensure each persisted slug is unique.

#### Scenario: Slug shape
- **WHEN** the system generates a slug for any new link
- **THEN** the slug is exactly 7 characters and every character is in `[0-9A-Za-z]`

#### Scenario: Collision causes regeneration
- **WHEN** a generated slug already exists in the database
- **THEN** the system generates a new slug and retries the insert, until it succeeds or a bounded retry limit is reached

#### Scenario: Exhausted retries surface as a server error
- **WHEN** the system fails to find a free slug within its retry limit
- **THEN** the system responds 500 with an error body indicating slug generation failed, and no partial link is persisted

### Requirement: Reserved slugs are never issued
The system SHALL NOT issue any slug equal to a reserved value. The reserved set MUST include at least: `api`, `dashboard`, `admin`, `_next`.

#### Scenario: Reserved candidate is rejected at generation time
- **WHEN** the slug generator produces a candidate equal to a reserved value
- **THEN** the candidate is discarded and a new slug is generated before any database insert

#### Scenario: Reserved values cannot collide with persisted rows
- **WHEN** the system finishes generating a slug for a new link
- **THEN** the persisted slug is not equal to any reserved value

### Requirement: Persisted link record
The system SHALL persist each shortened link in the database with at minimum: a unique slug, the original URL, and a creation timestamp.

#### Scenario: Persisted fields after successful shortening
- **WHEN** a client successfully shortens `https://example.com`
- **THEN** the database contains a row with `slug` equal to the returned slug, `url` equal to `https://example.com`, and `createdAt` set to the time of creation

