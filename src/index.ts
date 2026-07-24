/**
 * @inbin/mcp
 *
 * A minimal stdio MCP proxy for Inbin. Bridges stdio-only MCP clients
 * (Claude Desktop today, some older Cursor / Zed / Cline builds) to
 * Inbin's remote Streamable-HTTP MCP endpoint at
 * https://inbin.dev/api/mcp.
 *
 * Design:
 *   - We do not re-implement any MCP method. Every stdin message is
 *     forwarded verbatim as an HTTP POST to /api/mcp with the caller's
 *     Bearer key, and the JSON response is streamed back to stdout.
 *   - Notifications (JSON-RPC messages without an `id`) generate no
 *     response per spec; we accept the 202 from the server and stay
 *     silent to the client.
 *   - No dependencies beyond Node core (18+). Bundled to a single file
 *     with esbuild for a small, review-friendly artifact.
 *
 * Env:
 *   INBIN_API_KEY    (required)  the API key, `ink_live_...` format
 *   INBIN_MCP_URL    (optional)  override endpoint, defaults to prod
 *   INBIN_MCP_DEBUG  (optional)  set to "1" to log HTTP round trips
 *                                to stderr; MCP clients ignore stderr.
 */

import { createInterface } from "node:readline";

const API_KEY = process.env["INBIN_API_KEY"];
const ENDPOINT =
  process.env["INBIN_MCP_URL"] || "https://inbin.dev/api/mcp";
const DEBUG = process.env["INBIN_MCP_DEBUG"] === "1";

function debug(...args: unknown[]): void {
  if (DEBUG) console.error("[inbin-mcp]", ...args);
}

if (!API_KEY) {
  // Print an MCP-shaped fatal error so the client shows the reason.
  const err = {
    jsonrpc: "2.0",
    id: null,
    error: {
      code: -32001,
      message:
        "INBIN_API_KEY environment variable is not set. Get one from https://inbin.dev/dashboard.",
    },
  };
  process.stdout.write(JSON.stringify(err) + "\n");
  process.exit(1);
}

async function forward(line: string): Promise<void> {
  // Fast path for keep-alives / blank lines from some clients.
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed: { id?: unknown; method?: unknown };
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    debug("dropped non-JSON line from stdin");
    return;
  }
  const isNotification = parsed.id === undefined;

  try {
    debug("→ POST", parsed.method);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${API_KEY}`,
        // Some hosts strip unknown user-agents; ours is descriptive.
        "user-agent": "inbin-mcp-stdio/0.1.0",
      },
      body: trimmed,
    });
    debug("← status", res.status);

    // 202 = accepted-notification, no body per JSON-RPC.
    if (res.status === 202 || isNotification) return;

    // Non-200s that still return JSON (e.g. our 401) should be
    // surfaced to the client verbatim so the user sees the reason.
    const body = await res.text();
    if (body) {
      process.stdout.write(body);
      if (!body.endsWith("\n")) process.stdout.write("\n");
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "network error";
    debug("!", message);
    // Only respond if this was a request (not a notification), so we
    // don't invent traffic the client didn't ask for.
    if (!isNotification && typeof parsed.id !== "undefined") {
      const out = {
        jsonrpc: "2.0",
        id: parsed.id ?? null,
        error: {
          code: -32603,
          message: `inbin-mcp proxy error: ${message}`,
        },
      };
      process.stdout.write(JSON.stringify(out) + "\n");
    }
  }
}

// Readline gives us line-buffered stdin, which is exactly the MCP
// stdio framing: one JSON object per line.
const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  // Do not await; MCP allows concurrent in-flight requests keyed by id.
  // Each line spawns its own fetch; responses stream back as they land.
  forward(line);
});

rl.on("close", () => {
  // stdin closed: the client has hung up. Exit cleanly.
  process.exit(0);
});

// Never crash on uncaught async errors -- log to stderr, keep going.
process.on("uncaughtException", (err) => debug("uncaught:", err));
process.on("unhandledRejection", (err) => debug("unhandled:", err));
