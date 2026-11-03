# BUILD REPORT — tunecatalog

- **New name:** tunecatalog
- **npm:** `@reneturcios/tunecatalog` (version 0.1.0)
- **MCP name:** `io.github.CloudCorpRecords/tunecatalog`
- **Core module:** `src/catalog.ts`, exporting `VERSION = "0.1.0"`
- **Date:** 2026-10-27

## Tools built (5)

Labelled subset — 5 of the 9 documented upstream tools, the
read-only catalog surface:

1. `search_music` — `GET /search` with query params `query`, `mood?`, `limit?`
2. `get_track` — `GET /tracks/<trackId>`
3. `get_trending` — `GET /trending` with query param `limit?`
4. `browse_artists` — `GET /artists` with query params `genre?`, `limit?`
5. `get_artist` — `GET /artists/<artistId or handle>` (the present one of the two args; both optional, no at-least-one rule invented — with neither present the wire is `GET /artists/`)

Behaviour per spec:

- Env `STARSINGER_API_KEY` sent as `Authorization: Bearer <key>`; unset → every tool isError `STARSINGER_API_KEY is not set`, no request made.
- Env `STARSINGER_API_URL` defaults to `https://mcp-api.starsinger.ai`.
- All upstream access through an injectable fetch; tests use fake fetch only — no live network call anywhere.
- Validation before any request: required args `<name> must be a non-empty string`; `limit must be between 1 and 50`; mood enum error `mood must be one of: purple, red, blue, gold, green, pink, dark, rainbow`.
- Upstream non-2xx → `starsinger error: HTTP <status>`; fetch throwing → `starsinger unreachable`.
- Success returns the upstream JSON body verbatim.
- CLI subcommands mirror the tools with a JSON argument string; `mcp` starts the stdio server; `--version` prints `0.1.0`; unknown subcommand → usage, exit 2; isError results exit 1.
- `src/mcp.ts` uses the low-level `Server` API with explicit JSON-schema literals copied verbatim from the parity fixture.

## Tests

- `npm test`: **29 pass, 0 fail** (7 suites in `test/catalog.test.ts`).
- Coverage: wire paths and query params for all 5 tools, Bearer auth header, verbatim success bodies, mood enum (all 8 valid values plus an invalid one), required-argument validation, `limit` range/boundaries/type, validation-before-request, missing-key with no request, `STARSINGER_API_URL` override, HTTP error mapping, and unreachable mapping. Fake fetch only.

## Verification

- `npm run build`: exit 0.
- `npx tsc --noEmit`: exit 0.
- `node dist/cli.js --version`: prints `0.1.0`.
- Unknown subcommand: usage, exit 2 (verified).
- Tool error via CLI (`get_trending` with no key): exit 1 (verified).

## Parity

- Command: `python3 harness/parity.py --original harness/fixtures/starsinger-mcp-tools-original.json --rebuild "stdio:node builds/tunecatalog/dist/cli.js mcp" --out builds/tunecatalog/parity-out`
- Result: **PASS, parity 100.0, identical_tools 5 / total 5**, no missing, extra, or schema-differing tools. Output in `parity-out/parity.json`.

## Lockfile verification

- Route 3, clean from birth: generated in a temp dir containing only `package.json` via `npm install --package-lock-only --ignore-scripts --offline`, then copied in.
- Verified: parses as JSON, `name` == `@reneturcios/tunecatalog`, **128 package entries** in `packages`.
- `npm install --offline --ignore-scripts` in the build dir succeeded for `node_modules`.

## Version consistency

`0.1.0` in: `package.json`, `server.json` (top-level, npm entry `version`, OCI identifier tag `ghcr.io/cloudcorprecords/tunecatalog:0.1.0` — OCI entry carries no `version` field), core `VERSION`, and `CHANGELOG.md` heading `## 0.1.0 (2026-10-27)`. `server.json` description is exactly 90 characters: "Search and browse an AI music catalog by mood or genre; track details and streaming links."

## Omissions + reconstruction labels

- **Omitted (4 documented tools):** `make_song`, `song_status`, `my_songs`, `wallet` — `make_song` spends a purchased song credit and, with none left, returns a checkout link and price (a payment funnel), and the four lack published argument schemas beyond prose. The omission is labelled in the README and CHANGELOG.
- **Documented reconstructions:** all REST wire paths (`/search`, `/tracks/<id>`, `/trending`, `/artists`, `/artists/<id-or-handle>`) are documented reconstructions — the upstream README pins the API host and Bearer auth but not the REST paths. Labelled in the spec, the README, and the core module header.
- No live StarSinger call was made; behaviour is proven against fake fetch only.
