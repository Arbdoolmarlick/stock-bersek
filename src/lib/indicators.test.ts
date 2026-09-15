import { describe, expect, test } from "bun:test";
import { bookMetrics, flowMetrics, rsi, sma, supportResistance, vwap } from "./indicators";
import type { KlineBar } from "./stockbrief";

const bars: KlineBar[] = [
  { ts: 1, open: 10, high: 12, low: 9, close: 11, baseVolume: 2, quoteVolume: 22 },
  { ts: 2, open: 11, high: 14, low: 10, close: 13, baseVolume: 4, quoteVolume: 52 },
];

describe("technical indicators", () => {
  test("calculates SMA, VWAP, and range levels", () => {
    expect(sma([1, 2, 3], 2)).toBe(2.5);
    expect(vwap(bars)).toBeCloseTo(11.7778, 4);
    expect(supportResistance(bars)).toEqual({ support: 9, resistance: 14 });
  });

  test("calculates RSI for rising prices", () => {
    expect(rsi([1, 2, 3, 4], 3)).toBe(100);
    expect(rsi([1, 2], 14)).toBeNull();
  });

  test("calculates book and trade-flow metrics", () => {
    expect(bookMetrics({ bids: [["100", "4"]], asks: [["102", "2"]], ts: "1" })).toMatchObject({
      bestBid: 100,
      bestAsk: 102,
      spreadPct: expect.closeTo(1.9802, 4),
      imbalance: 2,
    });
    expect(
      flowMetrics([
        { tradeId: "1", symbol: "ABCUSDT", price: "10", size: "3", side: "buy", ts: "1" },
        { tradeId: "2", symbol: "ABCUSDT", price: "10", size: "1", side: "sell", ts: "2" },
      ]),
    ).toMatchObject({ buyVolume: 30, sellVolume: 10, pressureRatio: 3, tradeCount: 2 });
  });
});
