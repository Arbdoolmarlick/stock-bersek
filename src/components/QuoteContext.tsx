import type { IndicatorBundle } from "@/lib/indicators";
import { formatNumber, type MarketData } from "@/lib/stockbrief";

function freshness(ageSeconds: number | null) {
  if (ageSeconds === null) return "freshness unknown";
  if (ageSeconds < 60) return `updated ${ageSeconds}s ago`;
  return `updated ${Math.floor(ageSeconds / 60)}m ago`;
}

export function QuoteContext({
  market,
  indicators,
  ageSeconds,
}: {
  market: MarketData;
  indicators: IndicatorBundle | null;
  ageSeconds: number | null;
}) {
  const spread = indicators?.book?.spreadPct;
  const turnover = Number(market.turnover24h);
  const thinLiquidity =
    !indicators?.book ||
    (spread !== undefined && spread > 0.5) ||
    (Number.isFinite(turnover) && turnover < 10_000);
  return (
    <section className="mt-4 border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-foreground">
            {market.symbol.replace(/USDT$/, "")} / USDT
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bitget Reality token market quote — not the underlying exchange share price.
          </p>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{freshness(ageSeconds)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 font-mono text-xs sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Best bid </span>
          <span className="text-foreground">${formatNumber(market.bid1Price, 4)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Best ask </span>
          <span className="text-foreground">${formatNumber(market.ask1Price, 4)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Spread </span>
          <span className="text-foreground">
            {spread === undefined ? "N/A" : `${spread.toFixed(3)}%`}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">24h turnover </span>
          <span className="text-foreground">${formatNumber(market.turnover24h)}</span>
        </div>
      </div>
      {thinLiquidity && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-skip">
          Liquidity warning: the available book or turnover is thin. Price may move materially
          between quote and execution.
        </p>
      )}
    </section>
  );
}
