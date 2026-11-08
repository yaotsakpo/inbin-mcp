# @inbin/mcp

[![mcptry](https://mcptry.com/badge/io.github.yaotsakpo/inbin)](https://mcptry.com/servers/io.github.yaotsakpo/inbin)

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

## No account yet?

Over the remote endpoint (below) five tools need no key at all. An agent can
create an inbox, use its address, and wait for a verification code:

1. `create_trial_inbox` returns an `inbox_address` at once (it expires after 14 days).
2. Use that address wherever a confirmation must be sent.
3. `await_trial_inbox` with that exact `inbox_address` waits up to 60 seconds for the code or link. Call it again if it returns `expired`.
4. `claim_trial_inbox` returns a link for a person to keep the address, and `await_trial_inbox_claim` and `claim_connection_status` follow that claim.

This stdio wrapper always sends a key, so it is for the key tools. For the
no-account tools connect straight to `https://api.inbin.dev/mcp` with no
header. A runnable walkthrough:
https://inbin.dev/guides/ai-agent-email-address-verification-codes

## What it does

- Forwards each stdin JSON-RPC message to `https://api.inbin.dev/mcp`
  as an HTTPS POST with your Bearer key.
- Streams the response back to stdout.
- Notifications (messages with no `id`) get no reply, per JSON-RPC.
- Concurrent in-flight requests are supported.

## Tools exposed

Every Inbin application is an MCP server. With a key, the tools include (ask `tools/list` for the full set):

- `list_inboxes`: enumerate inboxes in your app
- `list_events`: filter by inbox / status / since; paginated
- `search_events`: substring search over id / subject / from / to
- `get_event`: a single event's parsed JSON + delivery history
- `query_events`: filter, sort, group and aggregate over extracted
  records (your inbox as a table)
- `describe_schema`: the current extraction schema

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `INBIN_API_KEY` | yes | your Inbin API key |
| `INBIN_MCP_URL` | no | override the endpoint (defaults to production) |
| `INBIN_MCP_DEBUG` | no | set to `1` for stderr logs |

## Remote (recommended)

If your MCP client supports Streamable HTTP transport, skip this
wrapper entirely and connect directly. Without a header you get the five
no-account tools; with a key you get everything:

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
