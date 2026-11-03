# Changelog

## 0.1.0 (2026-10-27)

- Initial release: five MCP tools and matching CLI subcommands
  for searching and browsing an AI music catalog —
  `search_music`, `get_track`, `get_trending`,
  `browse_artists`, and `get_artist`.
- Labelled subset: 5 of the 9 documented upstream tools are
  built; `make_song`, `song_status`, `my_songs`, and `wallet`
  are omitted.
- Upstream access uses `STARSINGER_API_KEY` as a Bearer token
  against `STARSINGER_API_URL` (default
  `https://mcp-api.starsinger.ai`); successful responses are
  returned verbatim.
