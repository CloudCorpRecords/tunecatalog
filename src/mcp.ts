/**
 * tunecatalog MCP server. Tools: search_music, get_track,
 * get_trending, browse_artists, get_artist.
 *
 * Why the low-level Server instead of McpServer: the
 * high-level helper converts zod schemas to JSON Schema and
 * injects keys that are not in this tool set's documented
 * spec ("$schema" and "additionalProperties"), which breaks
 * exact tool-list/schema parity with the spec. This file
 * serves tools/list with the spec's exact input schemas as
 * explicit literals, and the core validates every tools/call
 * argument set itself.
 *
 * Every tool returns a single text item; validation and
 * upstream failures come back as isError results carrying
 * the documented error strings.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  browseArtists,
  getArtist,
  getTrack,
  getTrending,
  searchMusic,
  VERSION,
} from "./catalog.js";

const TOOLS = [
  {
    name: "search_music",
    description: "Search the catalog by natural language query, mood, or genre.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          description: "Results to return (default 10, max 50)",
          type: "number",
        },
        mood: {
          description:
            "Filter by mood: purple (chill), red (energetic), blue (emotional), gold (uplifting), green (nature), pink (romantic), dark (intense), rainbow (eclectic)",
          enum: ["purple", "red", "blue", "gold", "green", "pink", "dark", "rainbow"],
          type: "string",
        },
        query: {
          description: "Natural language search — \"upbeat jazz piano\", \"sad violin ballad\"",
          type: "string",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_track",
    description: "Get full details and streaming URL for a specific track.",
    inputSchema: {
      type: "object" as const,
      properties: {
        trackId: {
          description: "Track ID from search results",
          type: "string",
        },
      },
      required: ["trackId"],
    },
  },
  {
    name: "get_trending",
    description: "Get currently popular tracks from the catalog.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          description: "Number of tracks (default 10, max 50)",
          type: "number",
        },
      },
    },
  },
  {
    name: "browse_artists",
    description: "Browse AI catalog artists, optionally filtered by genre.",
    inputSchema: {
      type: "object" as const,
      properties: {
        genre: {
          description: "Filter by genre (e.g. \"jazz\", \"classical\", \"pop\")",
          type: "string",
        },
        limit: {
          description: "Number of artists (default 10, max 50)",
          type: "number",
        },
      },
    },
  },
  {
    name: "get_artist",
    description: "Get an artist's full profile and discography.",
    inputSchema: {
      type: "object" as const,
      properties: {
        artistId: {
          description: "Artist ID from browse results",
          type: "string",
        },
        handle: {
          description: "Artist handle (e.g. \"miles_rivers\")",
          type: "string",
        },
      },
    },
  },
];

function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

function errorResult(err: unknown) {
  return {
    content: [
      { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
    ],
    isError: true,
  };
}

const server = new Server(
  { name: "tunecatalog", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;
  try {
    let out: string;
    switch (name) {
      case "search_music":
        out = await searchMusic(a as never);
        break;
      case "get_track":
        out = await getTrack(a as never);
        break;
      case "get_trending":
        out = await getTrending(a as never);
        break;
      case "browse_artists":
        out = await browseArtists(a as never);
        break;
      case "get_artist":
        out = await getArtist(a as never);
        break;
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return textResult(out);
  } catch (err) {
    if (err instanceof McpError) throw err;
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
