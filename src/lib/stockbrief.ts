import type { IndicatorBundle } from "@/lib/indicators";

/* ── Types ────────────────────────────────────────────────────────────── */

export type MarketData = {
  symbol: string;
  lastPr: string;
  changeUtc24h: string;
  high24h: string;
  low24h: string;
  baseVolume: string;
  turnover24h: string;
  bid1Price: string;
  ask1Price: string;
  ts: string;
};

export type KlineBar = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  baseVolume: number;
  quoteVolume: number;
};

export type OrderBookData = {
  asks: Array<[string, string]>;
  bids: Array<[string, string]>;
  ts: string;
};

export type RecentTrade = {
  tradeId: string;
  symbol: string;
  price: string;
  size: string;
  side: "buy" | "sell";
  ts: string;
};

export type ResearchSignal = {
  provider: "Bitget Signal";
  value: number | null;
  classification: string;
  summary?: string;
};

export type AnalysisBundle = {
  market: MarketData;
  klines: KlineBar[];
  book: OrderBookData;
  trades: RecentTrade[];
  signal: ResearchSignal | null;
  sources: DataSourceStatus[];
};

export type DataSourceStatus = {
  label: "Market Tickers" | "Price History" | "Order Book" | "Trade Flow" | "Bitget Signal";
  status: "available" | "unavailable";
  detail?: string;
};

/* ── Storage keys ─────────────────────────────────────────────────────── */

export const WATCHLIST_STORAGE = "stockbrief.watchlist";

/* ── Bitget API helpers ───────────────────────────────────────────────── */

function ensurePair(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (normalized.startsWith("R") && normalized.endsWith("USDT")) return normalized;
  if (normalized.startsWith("R")) return `${normalized}USDT`;
  return `R${normalized}USDT`;
}

async function bitgetFetch(resource: string, params: Record<string, string | number> = {}) {
  const search = new URLSearchParams({ resource });
  for (const [key, value] of Object.entries(params)) search.set(key, String(value));
  const res = await fetch(`/api/market?${search}`);
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Bitget request failed (${res.status}).`);
  }
  return res;
}

export async function fetchTicker(symbol: string): Promise<MarketData> {
  const pair = ensurePair(symbol);
  const res = await bitgetFetch("tickers", { symbol: pair });
  const json = (await res.json()) as {
    code?: string;
    msg?: string;
    data?: Array<{
      lastPrice?: string;
      price24hPcnt?: string;
      highPrice24h?: string;
      lowPrice24h?: string;
      volume24h?: string;
      turnover24h?: string;
      bid1Price?: string;
      ask1Price?: string;
      ts?: string;
    }>;
  };
  if (json.code !== "00000") {
    throw new Error(json.msg ?? `Bitget error for ${pair}.`);
  }
  const row = json.data?.[0];
  if (!row) {
    throw new Error(`No market data found for ${pair}. That tokenized stock may not be listed.`);
  }
  return {
    symbol: pair,
    lastPr: row.lastPrice ?? "-",
    changeUtc24h: row.price24hPcnt ?? "0",
    high24h: row.highPrice24h ?? "-",
    low24h: row.lowPrice24h ?? "-",
    baseVolume: row.volume24h ?? "-",
    turnover24h: row.turnover24h ?? "-",
    bid1Price: row.bid1Price ?? "-",
    ask1Price: row.ask1Price ?? "-",
    ts: row.ts ?? String(Date.now()),
  };
}

export async function fetchKlines(
  symbol: string,
  interval = "1H",
  limit = 48,
): Promise<KlineBar[]> {
  const pair = ensurePair(symbol);
  const res = await bitgetFetch("candles", { symbol: pair, interval, limit });
  const json = (await res.json()) as { code?: string; msg?: string; data?: string[][] };
  if (json.code !== "00000" || !json.data) {
    throw new Error(json.msg ?? "Failed to fetch price history.");
  }
  return json.data
    .map((c) => ({
      ts: Number(c[0]),
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      baseVolume: Number(c[5]),
      quoteVolume: Number(c[6]),
    }))
    .sort((a, b) => a.ts - b.ts);
}

export async function fetchOrderBook(symbol: string, limit = 20): Promise<OrderBookData> {
  const pair = ensurePair(symbol);
  const res = await bitgetFetch("orderbook", { symbol: pair, limit });
  const json = (await res.json()) as {
    code?: string;
    msg?: string;
    data?: {
      a?: Array<[string | number, string | number]>;
      b?: Array<[string | number, string | number]>;
      ts?: string;
    };
  };
  if (json.code !== "00000" || !json.data) {
    throw new Error(json.msg ?? "Failed to fetch order book.");
  }
  return {
    asks: (json.data.a ?? []).map(([price, quantity]) => [String(price), String(quantity)]),
    bids: (json.data.b ?? []).map(([price, quantity]) => [String(price), String(quantity)]),
    ts: json.data.ts ?? String(Date.now()),
  };
}

export async function fetchRecentTrades(symbol: string, limit = 100): Promise<RecentTrade[]> {
  const pair = ensurePair(symbol);
  const res = await bitgetFetch("fills", { symbol: pair, limit });
  const json = (await res.json()) as {
    code?: string;
    msg?: string;
    data?: Array<{
      execId?: string;
      price?: string;
      size?: string;
      side?: "buy" | "sell";
      ts?: string;
    }>;
  };
  if (json.code !== "00000" || !json.data) {
    throw new Error(json.msg ?? "Failed to fetch recent trades.");
  }
  return json.data.flatMap((trade) =>
    trade.price && trade.size && trade.side
      ? [
          {
            tradeId: trade.execId ?? `${trade.ts ?? "unknown"}-${trade.price}`,
            symbol: pair,
            price: trade.price,
            size: trade.size,
            side: trade.side,
            ts: trade.ts ?? String(Date.now()),
          },
        ]
      : [],
  );
}

async function fetchResearchSignal(): Promise<ResearchSignal> {
  const res = await fetch("/api/signal?resource=sentiment");
  const json = (await res.json().catch(() => null)) as {
    provider?: "Bitget Signal";
    value?: unknown;
    classification?: unknown;
    summary?: unknown;
    error?: string;
  } | null;
  if (!res.ok || json?.provider !== "Bitget Signal" || typeof json.classification !== "string") {
    throw new Error(json?.error ?? "Bitget Signal sentiment data is unavailable.");
  }
  const value = Number(json.value);
  const summary = typeof json.summary === "string" ? json.summary : undefined;
  return {
    provider: "Bitget Signal",
    value: Number.isFinite(value) ? value : null,
    classification: json.classification,
    ...(summary === undefined ? {} : { summary }),
  };
}

/** Fetch all data sources in parallel for a full analysis. */
export async function fetchAnalysisBundle(symbol: string): Promise<AnalysisBundle> {
  const [market, klinesResult, bookResult, tradesResult, signalResult] = await Promise.all([
    fetchTicker(symbol),
    fetchKlines(symbol).then(
      (value) => ({ value, error: null as string | null }),
      (error: unknown) => ({ value: [] as KlineBar[], error: errorMessage(error) }),
    ),
    fetchOrderBook(symbol).then(
      (value) => ({ value, error: null as string | null }),
      (error: unknown) => ({
        value: { asks: [], bids: [], ts: String(Date.now()) } as OrderBookData,
        error: errorMessage(error),
      }),
    ),
    fetchRecentTrades(symbol).then(
      (value) => ({ value, error: null as string | null }),
      (error: unknown) => ({ value: [] as RecentTrade[], error: errorMessage(error) }),
    ),
    fetchResearchSignal().then(
      (value) => ({ value, error: null as string | null }),
      (error: unknown) => ({ value: null as ResearchSignal | null, error: errorMessage(error) }),
    ),
  ]);
  return {
    market,
    klines: klinesResult.value,
    book: bookResult.value,
    trades: tradesResult.value,
    signal: signalResult.value,
    sources: [
      { label: "Market Tickers", status: "available" },
      sourceStatus("Price History", klinesResult.error),
      sourceStatus("Order Book", bookResult.error),
      sourceStatus("Trade Flow", tradesResult.error),
      sourceStatus("Bitget Signal", signalResult.error),
    ],
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

function sourceStatus(label: DataSourceStatus["label"], error: string | null): DataSourceStatus {
  return error ? { label, status: "unavailable", detail: error } : { label, status: "available" };
}

/* ── Enriched AI Prompt ───────────────────────────────────────────────── */

function fmtNum(n: number | null, digits = 2): string {
  if (n === null || !Number.isFinite(n)) return "N/A";
  return n.toFixed(digits);
}

export function buildPrompt(
  symbol: string,
  data: MarketData,
  indicators?: IndicatorBundle,
  signal?: ResearchSignal | null,
) {
  const base = `You are a concise AI trading analyst on an AI Trading Desk.
A human trader is looking at ${symbol} and wants a quick briefing before deciding to act.

MARKET SNAPSHOT:
${JSON.stringify(data, null, 2)}`;

  if (!indicators) {
    return `${base}

Give a structured briefing in exactly this format — keep each section to 1–2 sentences:
TREND: [what the price is doing right now]
SIGNALS: [one key thing worth noting — volume, spread, momentum]
RISK: [one thing to watch out for]
OUTLOOK: [Bullish / Neutral / Cautious — describe the evidence, not a trade recommendation]

Be direct. No padding. A trader is reading this in real time.`;
  }

  const { sma10, sma20, rsi14, vwap: vwapVal, book, flow, levels } = indicators;

  const smaCross =
    sma10 !== null && sma20 !== null
      ? sma10 > sma20
        ? "SMA10 > SMA20 (bullish cross)"
        : "SMA10 < SMA20 (bearish cross)"
      : "insufficient data";

  return `${base}

TECHNICAL INDICATORS:
- SMA(10): ${fmtNum(sma10, 4)} | SMA(20): ${fmtNum(sma20, 4)} → ${smaCross}
- RSI(14): ${fmtNum(rsi14, 1)}${rsi14 !== null ? (rsi14 > 70 ? " (overbought)" : rsi14 < 30 ? " (oversold)" : " (neutral)") : ""}
- VWAP: ${fmtNum(vwapVal, 4)}

ORDER BOOK (top 20 levels):
- Best bid: ${book ? fmtNum(book.bestBid, 4) : "N/A"} | Best ask: ${book ? fmtNum(book.bestAsk, 4) : "N/A"} | Spread: ${book ? fmtNum(book.spreadPct, 3) : "N/A"}%
- Book imbalance: ${book ? fmtNum(book.imbalance, 2) : "N/A"} (>1 = more buy pressure)
- Bid depth: ${book ? fmtNum(book.bidDepth, 2) : "N/A"} | Ask depth: ${book ? fmtNum(book.askDepth, 2) : "N/A"}

RECENT TRADE FLOW (last 100 trades):
- Buy volume: $${fmtNum(flow.buyVolume, 0)} | Sell volume: $${fmtNum(flow.sellVolume, 0)}
- Pressure ratio: ${fmtNum(flow.pressureRatio, 2)} (>1 = buy-dominated)

PRICE LEVELS (48h range):
- Support: ${levels ? fmtNum(levels.support, 4) : "N/A"} | Resistance: ${levels ? fmtNum(levels.resistance, 4) : "N/A"}

BITGET SIGNAL MARKET CONTEXT:
- Crypto market mood: ${signal ? `${signal.classification}${signal.value === null ? "" : ` (${signal.value}/100)`}` : "unavailable"}
- This is broad crypto context only. Do not treat it as a signal for the rToken or its underlying share price.

Give a structured briefing in exactly this format — keep each section to 1–2 sentences:
TREND: [price action + SMA/momentum context]
SIGNALS: [key signals from indicators, order flow, volume]
LEVELS: [support/resistance and where price sits relative to them]
RISK: [key risks — liquidity, spread, volatility, RSI extremes]
OUTLOOK: [Bullish / Neutral / Cautious — describe the evidence, not a trade recommendation]

Be direct. No padding. A trader is reading this in real time.`;
}

/* ── Gemini API ───────────────────────────────────────────────────────── */

export type ChatMessage = { role: "user" | "model"; text: string };

export async function fetchBriefing(
  symbol: string,
  data: MarketData,
  indicators?: IndicatorBundle,
  signal?: ResearchSignal | null,
): Promise<string> {
  return requestAi({
    prompt: buildPrompt(symbol, data, indicators, signal),
    maxOutputTokens: 600,
    temperature: 0.3,
  });
}

/** Send a follow-up chat message with conversation history + market context. */
export async function fetchChatReply(
  symbol: string,
  data: MarketData,
  indicators: IndicatorBundle | undefined,
  signal: ResearchSignal | null,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const systemContext = buildPrompt(symbol, data, indicators, signal);

  const contents = [
    { role: "user", parts: [{ text: systemContext }] },
    {
      role: "model",
      parts: [{ text: "Understood. I have all the market data. Ask me anything." }],
    },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  return requestAi({ contents, maxOutputTokens: 400, temperature: 0.4 });
}

type AiRequest = {
  prompt?: string;
  contents?: Array<{ role: string; parts: Array<{ text: string }> }>;
  maxOutputTokens: number;
  temperature: number;
};

async function requestAi(payload: AiRequest): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
  if (!res.ok || !json?.text) {
    throw new Error(json?.error ?? `AI service request failed (${res.status}).`);
  }
  return json.text;
}

/* ── Formatting helpers ───────────────────────────────────────────────── */

export function formatNumber(value: string, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(digits);
}

export function formatPercent(changeUtc24h: string) {
  const n = Number(changeUtc24h) * 100;
  if (!Number.isFinite(n)) return { text: "-", positive: true };
  return { text: `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`, positive: n >= 0 };
}
