/**
 * The I/O boundary. Everything else in @site-spec/core is pure — file map in,
 * findings/files out — and the main entry point (`@site-spec/core`) exports
 * only that pure surface. These two modules are the deliberate exception: they
 * are how a caller turns a real site (a live URL, or a directory on disk) into
 * the file map the pure engine consumes.
 *
 * They live here rather than in each consumer so the CLI, the MCP server, and
 * anything after them share ONE crawler instead of forking it.
 *
 * Imported as `@site-spec/core/io`, never from the main barrel.
 */
export { fetchSite, pathToKey, selectCrawlSet, synthesizeHeaders } from "./fetch-site";
export { readSiteDir } from "./site-dir";
