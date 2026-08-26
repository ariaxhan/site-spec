# site-spec MCP server, stdio transport, for the Docker MCP catalog.
#
# packages/mcp bundles itself and @site-spec/core into one dist/mcp.mjs with
# zero runtime dependencies, so the runtime stage carries a single file.

FROM node:20-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/mcp/package.json packages/mcp/
RUN npm ci --ignore-scripts --workspaces --include-workspace-root
COPY tsconfig.base.json tsconfig.json ./
COPY packages ./packages
RUN npm run build --workspace site-spec-mcp

FROM node:20-slim
COPY --from=build /src/packages/mcp/dist/mcp.mjs /usr/local/lib/site-spec-mcp.mjs

RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]

USER node
WORKDIR /data

ENTRYPOINT ["node", "/usr/local/lib/site-spec-mcp.mjs"]
