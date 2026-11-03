import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  browseArtists,
  getArtist,
  getTrack,
  getTrending,
  searchMusic,
} from "../src/catalog.js";
import type { CatalogDeps, FetchFn } from "../src/types.js";

/**
 * Every test runs against an injected fake fetch: no live
 * network, no live call is made.
 */

type Reply = { status?: number; body: unknown };
type Handler = (url: string) => Reply;
type Captured = { url: string; init?: { method?: string; headers?: Record<string, string> } };

function makeFetch(handler: Handler, captured: Captured[] = []): FetchFn {
  return async (url, init) => {
    captured.push({ url, init });
    const r = handler(url);
    const status = r.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (typeof r.body === "string" ? r.body : JSON.stringify(r.body)),
    };
  };
}

const throwingFetch: FetchFn = async () => {
  throw new Error("connection refused");
};

function deps(fetchFn: FetchFn, extra: Partial<CatalogDeps> = {}): CatalogDeps {
  return { fetchFn, env: { STARSINGER_API_KEY: "test-key" }, ...extra };
}

function okFetch(body: unknown = { ok: true }, captured: Captured[] = []): FetchFn {
  return makeFetch(() => ({ body }), captured);
}

async function expectError(promise: Promise<unknown>, message: string): Promise<void> {
  await assert.rejects(promise, (err: unknown) => {
    assert.equal(err instanceof Error ? err.message : String(err), message);
    return true;
  });
}

describe("search_music", () => {
  it("returns the upstream JSON verbatim", async () => {
    const body = '{"tracks":[{"title":"Blue","artist":"A"}]}';
    const out = await searchMusic({ query: "sad violin" }, deps(okFetch(body)));
    assert.equal(out, body);
  });

  it("wires GET /search with the query param and Bearer auth", async () => {
    const captured: Captured[] = [];
    await searchMusic({ query: "upbeat jazz piano" }, deps(okFetch({}, captured)));
    assert.equal(captured.length, 1);
    assert.equal(
      captured[0].url,
      "https://mcp-api.starsinger.ai/search?query=upbeat+jazz+piano",
    );
    assert.equal(captured[0].init?.method, "GET");
    assert.equal(captured[0].init?.headers?.Authorization, "Bearer test-key");
  });

  it("includes mood and limit when present", async () => {
    const captured: Captured[] = [];
    await searchMusic(
      { query: "chill", mood: "purple", limit: 5 },
      deps(okFetch({}, captured)),
    );
    assert.equal(
      captured[0].url,
      "https://mcp-api.starsinger.ai/search?query=chill&mood=purple&limit=5",
    );
  });

  it("accepts every documented mood", async () => {
    for (const mood of ["purple", "red", "blue", "gold", "green", "pink", "dark", "rainbow"]) {
      const out = await searchMusic({ query: "x", mood }, deps(okFetch("[]")));
      assert.equal(out, "[]");
    }
  });

  it("rejects an undocumented mood with the pinned message", async () => {
    await expectError(
      searchMusic({ query: "x", mood: "orange" }, deps(okFetch())),
      "mood must be one of: purple, red, blue, gold, green, pink, dark, rainbow",
    );
  });

  it("rejects a missing query", async () => {
    await expectError(
      searchMusic({} as never, deps(okFetch())),
      "query must be a non-empty string",
    );
  });

  it("rejects an empty query", async () => {
    await expectError(
      searchMusic({ query: "" }, deps(okFetch())),
      "query must be a non-empty string",
    );
  });

  it("rejects a non-string query", async () => {
    await expectError(
      searchMusic({ query: 7 } as never, deps(okFetch())),
      "query must be a non-empty string",
    );
  });
});

describe("get_track", () => {
  it("wires GET /tracks/<trackId> and returns the body verbatim", async () => {
    const captured: Captured[] = [];
    const out = await getTrack({ trackId: "trk-42" }, deps(okFetch('{"id":"trk-42"}', captured)));
    assert.equal(out, '{"id":"trk-42"}');
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/tracks/trk-42");
  });

  it("rejects a missing trackId", async () => {
    await expectError(
      getTrack({} as never, deps(okFetch())),
      "trackId must be a non-empty string",
    );
  });

  it("rejects an empty trackId", async () => {
    await expectError(
      getTrack({ trackId: "" }, deps(okFetch())),
      "trackId must be a non-empty string",
    );
  });
});

describe("get_trending", () => {
  it("wires GET /trending without params by default", async () => {
    const captured: Captured[] = [];
    await getTrending({}, deps(okFetch("[]", captured)));
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/trending");
  });

  it("wires GET /trending with limit when present", async () => {
    const captured: Captured[] = [];
    await getTrending({ limit: 20 }, deps(okFetch("[]", captured)));
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/trending?limit=20");
  });
});

describe("browse_artists", () => {
  it("wires GET /artists without params by default", async () => {
    const captured: Captured[] = [];
    await browseArtists({}, deps(okFetch("[]", captured)));
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/artists");
  });

  it("wires genre and limit when present", async () => {
    const captured: Captured[] = [];
    await browseArtists({ genre: "jazz", limit: 3 }, deps(okFetch("[]", captured)));
    assert.equal(
      captured[0].url,
      "https://mcp-api.starsinger.ai/artists?genre=jazz&limit=3",
    );
  });
});

describe("get_artist", () => {
  it("wires GET /artists/<artistId>", async () => {
    const captured: Captured[] = [];
    await getArtist({ artistId: "art-9" }, deps(okFetch("{}", captured)));
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/artists/art-9");
  });

  it("wires GET /artists/<handle> when only a handle is given", async () => {
    const captured: Captured[] = [];
    await getArtist({ handle: "miles_rivers" }, deps(okFetch("{}", captured)));
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/artists/miles_rivers");
  });

  it("prefers artistId over handle when both are present", async () => {
    const captured: Captured[] = [];
    await getArtist(
      { artistId: "art-9", handle: "miles_rivers" },
      deps(okFetch("{}", captured)),
    );
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/artists/art-9");
  });

  it("with neither arg, wires GET /artists/ exactly (no at-least-one rule)", async () => {
    const captured: Captured[] = [];
    await getArtist({}, deps(okFetch("{}", captured)));
    assert.equal(captured[0].url, "https://mcp-api.starsinger.ai/artists/");
  });
});

describe("limit validation", () => {
  it("rejects limit below 1", async () => {
    await expectError(getTrending({ limit: 0 }, deps(okFetch())), "limit must be between 1 and 50");
  });

  it("rejects limit above 50", async () => {
    await expectError(getTrending({ limit: 51 }, deps(okFetch())), "limit must be between 1 and 50");
  });

  it("rejects a non-number limit", async () => {
    await expectError(
      getTrending({ limit: "10" } as never, deps(okFetch())),
      "limit must be between 1 and 50",
    );
  });

  it("accepts the limit boundaries 1 and 50", async () => {
    assert.equal(await getTrending({ limit: 1 }, deps(okFetch("[]"))), "[]");
    assert.equal(await getTrending({ limit: 50 }, deps(okFetch("[]"))), "[]");
  });

  it("validates before any request is made", async () => {
    const captured: Captured[] = [];
    await expectError(
      getTrending({ limit: 99 }, deps(okFetch("[]", captured))),
      "limit must be between 1 and 50",
    );
    assert.deepEqual(captured, []);
  });
});

describe("auth and upstream errors", () => {
  it("rejects with STARSINGER_API_KEY is not set and makes no request when unset", async () => {
    const captured: Captured[] = [];
    await expectError(
      searchMusic({ query: "x" }, { fetchFn: okFetch({}, captured), env: {} }),
      "STARSINGER_API_KEY is not set",
    );
    assert.deepEqual(captured, []);
  });

  it("honours STARSINGER_API_URL from the environment", async () => {
    const captured: Captured[] = [];
    await getTrending(
      {},
      deps(okFetch("[]", captured), {
        env: { STARSINGER_API_KEY: "k", STARSINGER_API_URL: "https://example.test/api/" },
      }),
    );
    assert.equal(captured[0].url, "https://example.test/api/trending");
  });

  it("maps a non-2xx reply to starsinger error: HTTP <status>", async () => {
    const fetchFn = makeFetch(() => ({ status: 404, body: "missing" }));
    await expectError(getTrack({ trackId: "nope" }, deps(fetchFn)), "starsinger error: HTTP 404");
  });

  it("maps a 500 reply to starsinger error: HTTP 500", async () => {
    const fetchFn = makeFetch(() => ({ status: 500, body: "boom" }));
    await expectError(getTrending({}, deps(fetchFn)), "starsinger error: HTTP 500");
  });

  it("maps a throwing fetch to starsinger unreachable", async () => {
    await expectError(getTrending({}, deps(throwingFetch)), "starsinger unreachable");
  });
});
