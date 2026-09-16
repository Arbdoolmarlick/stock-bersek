import { describe, expect, test } from "bun:test";
import { computeDataConfidence } from "./confidence";
import { hasThinLiquidity, quoteFreshness } from "./market-quality";
import { toBitgetPair, type AnalysisBundle, type KlineBar } from "./stockbrief";

const bars: KlineBar[] = Array.from({ length: 20 }, (_, index) => ({
  ts: index,
  open: 10,
  high: 11,
  low: 9,
  close: 10,
  baseVolume: 10,
  quoteVolume: 100,
}));

function analysisBundle(overrides: Partial<AnalysisBundle> = {}): AnalysisBundle {
  return {
    market: {
      symbol: "RAAPLUSDT",
      lastPr: "10",
      changeUtc24h: "0",
      high24h: "11",
      low24h: "9",
      baseVolume: "100",
      turnover24h: "10000",
      bid1Price: "9.9",
      ask1Price: "10.1",
      ts: "100000",
    },
    klines: bars,
    book: { bids: [["9.9", "10"]], asks: [["10.1", "10"]], ts: "100000" },
    trades: Array.from({ length: 20 }, (_, index) => ({
      tradeId: String(index),
      symbol: "RAAPLUSDT",
      price: "10",
      size: "1",
      side: "buy" as const,
      ts: "100000",
    })),
    signal: null,
    sources: [
      { label: "Market Tickers", status: "available" },
      { label: "Price History", status: "available" },
      { label: "Order Book", status: "available" },
      { label: "Trade Flow", status: "available" },
      { label: "Bitget Signal", status: "available" },
    ],
    ...overrides,
  };
}

describe("market quality safeguards", () => {
  test("maps underlying tickers to Bitget Reality-token pairs", () => {
    expect(toBitgetPair("aapl")).toBe("RAAPLUSDT");
    expect(toBitgetPair("RAAPL")).toBe("RAAPLUSDT");
    expect(toBitgetPair("RAAPLUSDT")).toBe("RAAPLUSDT");
  });

  test("reports quote freshness in human-readable intervals", () => {
    expect(quoteFreshness(12)).toBe("updated 12s ago");
    expect(quoteFreshness(61)).toBe("updated 1m ago");
    expect(quoteFreshness(null)).toBe("freshness unknown");
  });

  test("warns when liquidity is missing, wide, or low-turnover", () => {
    expect(
      hasThinLiquidity({ hasOrderBook: false, spreadPct: undefined, turnover24h: "20000" }),
    ).toBe(true);
    expect(hasThinLiquidity({ hasOrderBook: true, spreadPct: 0.51, turnover24h: "20000" })).toBe(
      true,
    );
    expect(hasThinLiquidity({ hasOrderBook: true, spreadPct: 0.1, turnover24h: "9999" })).toBe(
      true,
    );
    expect(hasThinLiquidity({ hasOrderBook: true, spreadPct: 0.1, turnover24h: "10000" })).toBe(
      false,
    );
  });

  test("scores fresh, complete data higher than partial stale data", () => {
    const complete = computeDataConfidence(
      analysisBundle(),
      { book: { bestBid: 9.9 } } as never,
      100000,
    );
    const partial = computeDataConfidence(
      analysisBundle({
        klines: [],
        trades: [],
        sources: [
          { label: "Market Tickers", status: "available" },
          { label: "Bitget Signal", status: "unavailable" },
        ],
      }),
      null,
      300000,
    );
    expect(complete.label).toBe("High");
    expect(complete.score).toBeGreaterThan(partial.score);
    expect(partial.reasons).toContain("1 source is unavailable");
    expect(partial.reasons).toContain("quote is over one minute old");
  });
});
