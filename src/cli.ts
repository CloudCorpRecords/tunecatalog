#!/usr/bin/env node
/**
 * tunecatalog CLI.
 *
 *   tunecatalog search_music '<json>'
 *   tunecatalog get_track '<json>'
 *   tunecatalog get_trending '<json>'
 *   tunecatalog browse_artists '<json>'
 *   tunecatalog get_artist '<json>'
 *   tunecatalog mcp
 *   tunecatalog --version
 *
 * Each tool subcommand takes one JSON argument string with the
 * tool's arguments and prints the tool's result text. Exit
 * codes: 0 success, 1 runtime error, 2 usage error.
 */
import {
  browseArtists,
  getArtist,
  getTrack,
  getTrending,
  searchMusic,
  VERSION,
} from "./catalog.js";

const TOOL_NAMES = [
  "search_music",
  "get_track",
  "get_trending",
  "browse_artists",
  "get_artist",
] as const;

function usage(): never {
  console.error(`Usage:
  tunecatalog <tool> '<json-args>'     one of: ${TOOL_NAMES.join(", ")}
  tunecatalog mcp
  tunecatalog --version`);
  process.exit(2);
}

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_music":
      return searchMusic(args as never);
    case "get_track":
      return getTrack(args as never);
    case "get_trending":
      return getTrending(args as never);
    case "browse_artists":
      return browseArtists(args as never);
    case "get_artist":
      return getArtist(args as never);
    default:
      usage();
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") {
    console.log(VERSION);
    return;
  }
  if (cmd === "mcp") {
    if (rest.length !== 0) usage();
    await import("./mcp.js");
    return;
  }
  if (!(TOOL_NAMES as readonly string[]).includes(cmd ?? "")) usage();
  if (rest.length > 1) usage();
  let args: Record<string, unknown> = {};
  if (rest.length === 1) {
    try {
      const parsed: unknown = JSON.parse(rest[0]);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) usage();
      args = parsed as Record<string, unknown>;
    } catch {
      console.error("error: argument must be a JSON object string");
      process.exit(2);
    }
  }
  try {
    const out = await runTool(cmd, args);
    console.log(out);
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

void main();
