import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RuntimeEnv = { GEMINI_API_KEY?: string };

type AiPayload = {
  prompt?: unknown;
  contents?: unknown;
  maxOutputTokens?: unknown;
  temperature?: unknown;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (new URL(request.url).pathname === "/api/ai") {
        return await handleAiRequest(request, env);
      }
      if (new URL(request.url).pathname === "/api/market") {
        return await handleMarketRequest(request);
      }
      if (new URL(request.url).pathname === "/api/signal") {
        return await handleSignalRequest(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

async function handleAiRequest(request: Request, env: unknown): Promise<Response> {
  if (request.method === "GET") return json({ configured: Boolean(getGeminiKey(env)) });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const key = getGeminiKey(env);
  if (!key) {
    return json({ error: "AI briefing is not configured. Set GEMINI_API_KEY on the server." }, 503);
  }

  const payload = (await request.json().catch(() => null)) as AiPayload | null;
  const body = toGeminiBody(payload);
  if (!body) return json({ error: "Invalid AI request." }, 400);

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const result = (await upstream.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  } | null;
  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!upstream.ok || !text) {
    return json(
      { error: result?.error?.message ?? "The AI service did not return a briefing." },
      upstream.ok ? 502 : upstream.status,
    );
  }
  return json({ text });
}

const MARKET_RESOURCES = new Set(["instruments", "tickers", "candles", "orderbook", "fills"]);
const MARKET_INTERVALS = new Set(["1m", "5m", "15m", "1H", "4H", "1D"]);

async function handleMarketRequest(request: Request): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") ?? "";
  if (!MARKET_RESOURCES.has(resource)) return json({ error: "Unknown market resource." }, 400);

  const params = new URLSearchParams({ category: "SPOT" });
  const symbol = url.searchParams.get("symbol");
  if (symbol) {
    if (!/^[A-Z0-9]{2,30}$/.test(symbol)) return json({ error: "Invalid market symbol." }, 400);
    params.set("symbol", symbol);
  }
  if (["candles", "orderbook", "fills"].includes(resource) && !symbol) {
    return json({ error: "A market symbol is required." }, 400);
  }
  if (resource === "candles") {
    const interval = url.searchParams.get("interval") ?? "1H";
    if (!MARKET_INTERVALS.has(interval)) return json({ error: "Invalid candle interval." }, 400);
    params.set("interval", interval);
  }
  const limit = url.searchParams.get("limit");
  if (limit) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      return json({ error: "Invalid market-data limit." }, 400);
    }
    params.set("limit", String(parsedLimit));
  }

  try {
    const upstream = await fetch(`https://api.bitget.com/api/v3/market/${resource}?${params}`);
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return json({ error: "Unable to reach Bitget market data. Please try again shortly." }, 502);
  }
}

const BITGET_SIGNAL_MCP_URL = "https://datahub.noxiaohao.com/mcp";

async function handleSignalRequest(request: Request): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (new URL(request.url).searchParams.get("resource") !== "sentiment") {
    return json({ error: "Unknown Signal resource." }, 400);
  }

  try {
    const initialized = await mcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "stock-bersek", version: "1.0.0" },
      },
    });
    const sessionId = initialized.headers.get("mcp-session-id");
    if (!sessionId) throw new Error("Bitget Signal did not provide a session.");

    await mcpRequest({ jsonrpc: "2.0", method: "notifications/initialized" }, sessionId, 4_000);
    const response = await mcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "sentiment_index", arguments: { action: "current" } },
      },
      sessionId,
      4_000,
    );
    const result = parseMcpEvent(await response.text());
    const content = result?.result?.content?.find(
      (item: { type?: unknown }) => item.type === "text",
    ) as { text?: unknown } | undefined;
    if (result?.result?.isError || typeof content?.text !== "string") {
      throw new Error("Bitget Signal sentiment data is unavailable.");
    }

    return json({ provider: "Bitget Signal", ...extractSentiment(content.text) });
  } catch {
    return json({ error: "Bitget Signal sentiment data is temporarily unavailable." }, 502);
  }
}

async function mcpRequest(
  payload: unknown,
  sessionId?: string,
  timeout = 6_000,
): Promise<Response> {
  const headers: Record<string, string> = {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  return fetch(BITGET_SIGNAL_MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeout),
  });
}

function parseMcpEvent(
  body: string,
): { result?: { content?: Array<{ type?: string; text?: string }>; isError?: boolean } } | null {
  const data = body
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice(6);
  if (!data) return null;
  try {
    return JSON.parse(data) as {
      result?: { content?: Array<{ type?: string; text?: string }>; isError?: boolean };
    };
  } catch {
    return null;
  }
}

function extractSentiment(text: string) {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const value = firstNumber(parsed, ["value", "score", "data.value"]);
    const classification = firstString(parsed, [
      "classification",
      "value_classification",
      "label",
      "status",
    ]);
    return {
      value,
      classification: classification ?? "Market mood available",
      summary: typeof parsed["timestamp"] === "string" ? parsed["timestamp"] : undefined,
    };
  } catch {
    return { value: null, classification: "Market mood available", summary: text.slice(0, 160) };
  }
}

function firstNumber(source: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce<unknown>(
        (current, key) =>
          current && typeof current === "object"
            ? (current as Record<string, unknown>)[key]
            : undefined,
        source,
      );
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function firstString(source: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce<unknown>(
        (current, key) =>
          current && typeof current === "object"
            ? (current as Record<string, unknown>)[key]
            : undefined,
        source,
      );
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function getGeminiKey(env: unknown): string | undefined {
  const runtimeKey = (env as RuntimeEnv | undefined)?.GEMINI_API_KEY;
  const localKey = typeof process !== "undefined" ? process.env["GEMINI_API_KEY"] : undefined;
  return runtimeKey || localKey;
}

function toGeminiBody(payload: AiPayload | null) {
  if (!payload) return null;
  const maxOutputTokens = Number(payload.maxOutputTokens);
  const temperature = Number(payload.temperature);
  if (!Number.isFinite(maxOutputTokens) || !Number.isFinite(temperature)) return null;
  if (
    typeof payload.prompt === "string" &&
    payload.prompt.length > 0 &&
    payload.prompt.length <= 20_000
  ) {
    return {
      contents: [{ parts: [{ text: payload.prompt }] }],
      generationConfig: {
        maxOutputTokens: Math.min(maxOutputTokens, 600),
        temperature: Math.min(Math.max(temperature, 0), 1),
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    };
  }
  if (
    Array.isArray(payload.contents) &&
    payload.contents.length > 0 &&
    JSON.stringify(payload.contents).length <= 30_000
  ) {
    return {
      contents: payload.contents,
      generationConfig: {
        maxOutputTokens: Math.min(maxOutputTokens, 600),
        temperature: Math.min(Math.max(temperature, 0), 1),
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    };
  }
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
