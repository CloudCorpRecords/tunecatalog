/**
 * tunecatalog core: five read-only catalog tools over the
 * StarSinger API.
 *
 * Shared rules, as documented in the spec:
 * - Base URL: env STARSINGER_API_URL, default
 *   https://mcp-api.starsinger.ai
 * - Auth: env STARSINGER_API_KEY, sent as
 *   `Authorization: Bearer <key>`. If unset, every tool
 *   returns an error `STARSINGER_API_KEY is not set` and no
 *   request is made.
 * - All upstream access goes through an injectable fetch;
 *   tests use fake fetch only.
 * - A successful call returns the upstream JSON body
 *   verbatim as the result text.
 * - Upstream non-2xx -> `starsinger error: HTTP <status>`.
 *   Fetch throwing -> `starsinger unreachable`.
 * - Argument validation happens before any request: a
 *   required argument missing or not a non-empty string ->
 *   `<name> must be a non-empty string`; `limit`, when
 *   present, must be a number with 1 <= limit <= 50, else
 *   `limit must be between 1 and 50`; `mood`, when present,
 *   must be one of the documented mood values, else
 *   `mood must be one of: purple, red, blue, gold, green, pink, dark, rainbow`.
 *
 * Wire shapes (documented reconstructions — the README pins
 * the API host and the Bearer auth but not the REST paths):
 *   search_music   -> GET /search with query, mood?, limit?
 *   get_track      -> GET /tracks/<trackId>
 *   get_trending   -> GET /trending with limit?
 *   browse_artists -> GET /artists with genre?, limit?
 *   get_artist     -> GET /artists/<artistId or handle>
 */
import type {
  BrowseArtistsArgs,
  CatalogDeps,
  FetchFn,
  FetchResponseLike,
  GetArtistArgs,
  GetTrackArgs,
  GetTrendingArgs,
  SearchMusicArgs,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_BASE_URL = "https://mcp-api.starsinger.ai";

export const MOODS = [
  "purple",
  "red",
  "blue",
  "gold",
  "green",
  "pink",
  "dark",
  "rainbow",
] as const;

function envOf(deps: CatalogDeps): Record<string, string | undefined> {
  return deps.env ?? process.env;
}

function baseUrl(deps: CatalogDeps): string {
  const raw = deps.baseUrl ?? envOf(deps).STARSINGER_API_URL;
  const base = raw && raw.trim() !== "" ? raw.trim() : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

function requireKey(deps: CatalogDeps): string {
  const key = deps.apiKey ?? envOf(deps).STARSINGER_API_KEY;
  if (!key) throw new Error("STARSINGER_API_KEY is not set");
  return key;
}

const defaultFetch: FetchFn = async (url, init) => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, text: () => res.text() };
};

async function request(deps: CatalogDeps, path: string): Promise<string> {
  const key = requireKey(deps);
  const fetchFn = deps.fetchFn ?? defaultFetch;
  let res: FetchResponseLike;
  try {
    res = await fetchFn(`${baseUrl(deps)}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch {
    throw new Error("starsinger unreachable");
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`starsinger error: HTTP ${res.status}`);
  }
  return res.text();
}

/* Validation helpers ------------------------------------------------ */

function reqNonEmptyString(args: Record<string, unknown>, name: string): string {
  const v = args[name];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return v;
}

function optNonEmptyString(
  args: Record<string, unknown>,
  name: string,
): string | undefined {
  const v = args[name];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return v;
}

function optLimit(args: Record<string, unknown>): number | undefined {
  const v = args.limit;
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || Number.isNaN(v) || v < 1 || v > 50) {
    throw new Error("limit must be between 1 and 50");
  }
  return v;
}

function optMood(args: Record<string, unknown>): string | undefined {
  const v = args.mood;
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string" || !(MOODS as readonly string[]).includes(v)) {
    throw new Error(
      "mood must be one of: purple, red, blue, gold, green, pink, dark, rainbow",
    );
  }
  return v;
}

/* Tools ------------------------------------------------------------- */

/** Search the catalog by natural language query, mood, or genre. */
export async function searchMusic(
  args: SearchMusicArgs,
  deps: CatalogDeps = {},
): Promise<string> {
  const a = (args ?? {}) as unknown as Record<string, unknown>;
  const query = reqNonEmptyString(a, "query");
  const mood = optMood(a);
  const limit = optLimit(a);
  const params = new URLSearchParams();
  params.set("query", query);
  if (mood !== undefined) params.set("mood", mood);
  if (limit !== undefined) params.set("limit", String(limit));
  return request(deps, `/search?${params.toString()}`);
}

/** Get full details and streaming URL for a specific track. */
export async function getTrack(
  args: GetTrackArgs,
  deps: CatalogDeps = {},
): Promise<string> {
  const a = (args ?? {}) as unknown as Record<string, unknown>;
  const trackId = reqNonEmptyString(a, "trackId");
  return request(deps, `/tracks/${encodeURIComponent(trackId)}`);
}

/** Get currently popular tracks from the catalog. */
export async function getTrending(
  args: GetTrendingArgs,
  deps: CatalogDeps = {},
): Promise<string> {
  const a = (args ?? {}) as unknown as Record<string, unknown>;
  const limit = optLimit(a);
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString();
  return request(deps, qs ? `/trending?${qs}` : "/trending");
}

/** Browse AI catalog artists, optionally filtered by genre. */
export async function browseArtists(
  args: BrowseArtistsArgs,
  deps: CatalogDeps = {},
): Promise<string> {
  const a = (args ?? {}) as unknown as Record<string, unknown>;
  const genre = optNonEmptyString(a, "genre");
  const limit = optLimit(a);
  const params = new URLSearchParams();
  if (genre !== undefined) params.set("genre", genre);
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString();
  return request(deps, qs ? `/artists?${qs}` : "/artists");
}

/** Get an artist's full profile and discography. */
export async function getArtist(
  args: GetArtistArgs,
  deps: CatalogDeps = {},
): Promise<string> {
  const a = (args ?? {}) as unknown as Record<string, unknown>;
  const artistId = optNonEmptyString(a, "artistId");
  const handle = optNonEmptyString(a, "handle");
  const segment = artistId ?? handle ?? "";
  return request(deps, `/artists/${encodeURIComponent(segment)}`);
}
