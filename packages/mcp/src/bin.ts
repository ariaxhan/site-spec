/**
 * `site-spec-mcp` — the stdio entry point.
 *
 * MCP stdio uses stdout as the transport, so nothing else may ever write
 * there: a stray console.log corrupts the JSON-RPC stream. Diagnostics go to
 * stderr only.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  process.stderr.write(`site-spec-mcp failed to start: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
