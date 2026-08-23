# @inbin/mcp

A minimal stdio-to-HTTP proxy for [Inbin](https://inbin.dev)'s Model
Context Protocol surface. Lets stdio-only MCP clients (Claude Desktop,
some Cursor builds, Zed, Cline) talk to Inbin's remote endpoint at
`https://api.inbin.dev/mcp`.

## Install & run

Nothing to install globally. Your MCP client invokes it via `npx`:

```json
{
  "mcpServers": {
    "inbin": {
      "command": "npx",
      "args": ["-y", "@inbin/mcp"],
      "env": {
        "INBIN_API_KEY": "ink_live_..."
      }
    }
  }
}
```

Get an API key from https://inbin.dev/dashboard.

## What it does

- Forwards each stdin JSON-RPC message to `https://api.inbin.dev/mcp`
  as an HTTPS POST with your Bearer key.
- Streams the response back to stdout.
- Notifications (messages with no `id`) get no reply, per JSON-RPC.
- Concurrent in-flight requests are supported.

## Tools exposed

Every Inbin application is an MCP server. Available tools:

- `list_inboxes` — enumerate inboxes in your app
- `list_events` — filter by inbox / status / since; paginated
- `search_events` — substring search over id / subject / from / to
- `get_event` — a single event's parsed JSON + delivery history
- `query_events` — filter, sort, group and aggregate over extracted
  records (your inbox as a table)
- `describe_schema` — the current extraction schema

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `INBIN_API_KEY` | yes | your Inbin API key |
| `INBIN_MCP_URL` | no | override the endpoint (defaults to production) |
| `INBIN_MCP_DEBUG` | no | set to `1` for stderr logs |

## Remote (recommended)

If your MCP client supports Streamable HTTP transport, skip this
wrapper entirely and connect directly:

```json
{
  "mcpServers": {
    "inbin": {
      "url": "https://api.inbin.dev/mcp",
      "headers": {
        "Authorization": "Bearer ink_live_..."
      }
    }
  }
}
```

## License

MIT.
