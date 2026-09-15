/**
 * Technical indicators calculated from Bitget market data.
 * Pure math — no external dependencies.
 */

import type { KlineBar, OrderBookData, RecentTrade } from "@/lib/stockbrief";

/* ── Simple Moving Average ────────────────────────────────────────────── */

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/* ── RSI (Relative Strength Index) ────────────────────────────────────── */

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  const slice = closes.slice(-(period + 1));
  for (let i = 1; i < slice.length; i++) {
    const delta = slice[i]! - slice[i - 1]!;
    if (delta > 0) gains += delta;
    else losses -= delta;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

/* ── VWAP (Volume-Weighted Average Price) ─────────────────────────────── */

export function vwap(bars: KlineBar[]): number | null {
  if (bars.length === 0) return null;
  let cumPV = 0;
  let cumVol = 0;
  for (const b of bars) {
    const typical = (b.high + b.low + b.close) / 3;
    cumPV += typical * b.baseVolume;
    cumVol += b.baseVolume;
  }
  return cumVol === 0 ? null : cumPV / cumVol;
}

/* ── Order Book Metrics ───────────────────────────────────────────────── */

export type BookMetrics = {
  bestBid: number;
  bestAsk: number;
  spreadPct: number;
  imbalance: number; // >1 = more buy pressure
  bidDepth: number;
  askDepth: number;
};

export function bookMetrics(book: OrderBookData): BookMetrics | null {
  if (!book.bids.length || !book.asks.length) return null;
  const bestBid = Number(book.bids[0]![0]);
  const bestAsk = Number(book.asks[0]![0]);
  const mid = (bestBid + bestAsk) / 2;
  const spreadPct = mid === 0 ? 0 : ((bestAsk - bestBid) / mid) * 100;

  let bidDepth = 0;
  let askDepth = 0;
  for (const [, qty] of book.bids) bidDepth += Number(qty);
  for (const [, qty] of book.asks) askDepth += Number(qty);

  const imbalance = askDepth === 0 ? 999 : bidDepth / askDepth;

  return { bestBid, bestAsk, spreadPct, imbalance, bidDepth, askDepth };
}

/* ── Trade Flow Pressure ──────────────────────────────────────────────── */

export type FlowMetrics = {
  buyVolume: number;
  sellVolume: number;
  pressureRatio: number; // >1 = more buys
  tradeCount: number;
};

export function flowMetrics(trades: RecentTrade[]): FlowMetrics {
  let buyVolume = 0;
  let sellVolume = 0;
  for (const t of trades) {
    const size = Number(t.size) * Number(t.price);
    if (t.side === "buy") buyVolume += size;
    else sellVolume += size;
  }
  return {
    buyVolume,
    sellVolume,
    pressureRatio: sellVolume === 0 ? 999 : buyVolume / sellVolume,
    tradeCount: trades.length,
  };
}

/* ── Support / Resistance from klines ─────────────────────────────────── */

export function supportResistance(
  bars: KlineBar[],
): { support: number; resistance: number } | null {
  if (bars.length < 2) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const b of bars) {
    if (b.low < lo) lo = b.low;
    if (b.high > hi) hi = b.high;
  }
  return { support: lo, resistance: hi };
}

/* ── Full indicator bundle for the AI prompt ──────────────────────────── */

export type IndicatorBundle = {
  sma10: number | null;
  sma20: number | null;
  rsi14: number | null;
  vwap: number | null;
  book: BookMetrics | null;
  flow: FlowMetrics;
  levels: { support: number; resistance: number } | null;
};

export function computeIndicators(
  bars: KlineBar[],
  book: OrderBookData,
  trades: RecentTrade[],
): IndicatorBundle {
  const closes = bars.map((b) => b.close);
  return {
    sma10: sma(closes, 10),
    sma20: sma(closes, 20),
    rsi14: rsi(closes, 14),
    vwap: vwap(bars),
    book: bookMetrics(book),
    flow: flowMetrics(trades),
    levels: supportResistance(bars),
  };
}
