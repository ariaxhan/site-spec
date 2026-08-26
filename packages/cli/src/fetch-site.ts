/**
 * The live-URL crawler moved into the engine package (`@site-spec/core/io`) so
 * the CLI, the MCP server, and any future consumer share ONE implementation
 * instead of forking it. Kept as a re-export so this module path stays stable
 * for the commands and tests that already import it.
 */
export { fetchSite, pathToKey, selectCrawlSet, synthesizeHeaders } from "@site-spec/core/io";
