# tunecatalog

Browse an AI music catalog without leaving your agent.
tunecatalog searches tracks by natural-language description,
mood, or genre, pulls full track details with streaming
links, surfaces what is trending, and lets you wander the
artist roster and read a full artist profile with its
discography.

> **Labelled subset — 5 of 9 tools.** This rebuild builds
> only the five read-only catalog tools documented below.
> Four documented upstream tools are **omitted**:
> `make_song`, `song_status`, `my_songs`, and `wallet`.
> `make_song` spends a purchased song credit and, with none
> left, hands back a checkout link and price — a payment
> funnel — and the four also lack published argument schemas
> beyond prose, so they are left out and named here rather
> than silently dropped.

The five tools:

- `search_music` — search the catalog by a natural-language
  query such as "upbeat jazz piano" or "sad violin ballad",
  optionally filtered by mood (`purple` chill, `red`
  energetic, `blue` emotional, `gold` uplifting, `green`
  nature, `pink` romantic, `dark` intense, `rainbow`
  eclectic) and capped with `limit` (default 10, max 50).
- `get_track` — full details and a streaming URL for one
  track, by the track ID a search returned.
- `get_trending` — the currently popular tracks, optionally
  capped with `limit`.
- `browse_artists` — the catalog's artists, optionally
  filtered by genre (for example "jazz", "classical", or
  "pop") and capped with `limit`.
- `get_artist` — an artist's full profile and discography,
  by artist ID or by handle (for example "miles_rivers").
  Both arguments are optional; no at-least-one rule is
  invented locally.

A successful call returns the upstream JSON body verbatim:
track responses carry title, artist, genre, mood, play
count, likes, lyrics, cover art, and a streaming URL in the
upstream's own shape.

## Configuration

- `STARSINGER_API_KEY` — required. Sent as
  `Authorization: Bearer <key>`. If it is unset, every tool
  fails with `STARSINGER_API_KEY is not set` and no request
  is made (the server still starts and lists tools).
- `STARSINGER_API_URL` — optional. Defaults to
  `https://mcp-api.starsinger.ai`.

Upstream failures surface as `starsinger error: HTTP
<status>` for a non-2xx reply, or `starsinger unreachable`
when the request itself fails.

> **Wire paths are documented reconstructions.** The
> upstream README pins the API host and the Bearer auth but
> not the REST paths, so the paths below are reconstructions
> and are labelled as such: `GET /search`, `GET
> /tracks/<trackId>`, `GET /trending`, `GET /artists`, and
> `GET /artists/<artistId or handle>`. The tool schemas
> themselves are pinned by the README's parameter tables.

## CLI

Each tool is a subcommand taking one JSON argument string:

```bash
export STARSINGER_API_KEY="<your key>"
npx @reneturcios/tunecatalog search_music '{"query":"upbeat jazz piano","mood":"gold","limit":5}'
npx @reneturcios/tunecatalog get_track '{"trackId":"<track id>"}'
npx @reneturcios/tunecatalog get_trending '{"limit":10}'
npx @reneturcios/tunecatalog browse_artists '{"genre":"jazz"}'
npx @reneturcios/tunecatalog get_artist '{"handle":"miles_rivers"}'
npx @reneturcios/tunecatalog --version
```

Output is the tool's result text. Exit codes: `0` on
success, `1` on a runtime error (including a validation or
upstream failure), `2` on a usage error.

## MCP server

```bash
npx -y @reneturcios/tunecatalog mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "tunecatalog": {
      "command": "npx",
      "args": ["-y", "@reneturcios/tunecatalog", "mcp"],
      "env": {
        "STARSINGER_API_KEY": "<your key>"
      }
    }
  }
}
```

## Docker

```bash
docker run -i -e STARSINGER_API_KEY="<your key>" ghcr.io/cloudcorprecords/tunecatalog
docker run --rm -e STARSINGER_API_KEY="<your key>" ghcr.io/cloudcorprecords/tunecatalog get_trending '{"limit":5}'
```

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # tsx --test test/*.test.ts (fake fetch only, no network)
npm run dev     # run the CLI from source
```

## License

MIT — Copyright (c) 2026 Rene Turcios
