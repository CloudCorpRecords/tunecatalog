/**
 * tunecatalog types.
 *
 * Five read-only catalog tools over the StarSinger API.
 * Every tool answers with the upstream JSON body verbatim
 * as a single text string.
 */

export interface SearchMusicArgs {
  query: string;
  mood?: string;
  limit?: number;
}

export interface GetTrackArgs {
  trackId: string;
}

export interface GetTrendingArgs {
  limit?: number;
}

export interface BrowseArtistsArgs {
  genre?: string;
  limit?: number;
}

export interface GetArtistArgs {
  artistId?: string;
  handle?: string;
}

/** The minimal slice of a fetch Response this client relies on. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

/** Injectable fetch, so tests never touch the live network. */
export type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<FetchResponseLike>;

/** Runtime dependencies for the core, all injectable in tests. */
export interface CatalogDeps {
  /** Fetch implementation. Defaults to the global fetch. */
  fetchFn?: FetchFn;
  /** StarSinger base URL. Defaults to env STARSINGER_API_URL or the documented default. */
  baseUrl?: string;
  /** API key. Defaults to env STARSINGER_API_KEY. */
  apiKey?: string;
  /** Environment source. Defaults to process.env. */
  env?: Record<string, string | undefined>;
}
