import { useEffect, useState } from "react";

type TickerItem = { symbol: string; price: string; change: string };

const SYMBOLS = ["AAPL", "TSLA", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "COIN"];

function Row({ items, onSelect }: { items: TickerItem[]; onSelect: (symbol: string) => void }) {
  return (
    <span className="inline-flex shrink-0">
      {items.map((t) => (
        <button
          key={t.symbol}
          type="button"
          onClick={() => onSelect(t.symbol)}
          aria-label={`Analyze ${t.symbol}`}
          className="inline-flex items-center gap-2 px-5 transition-colors hover:bg-primary/10 hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <span className="text-muted-foreground">{t.symbol}</span>
          <span className="text-foreground/80">${t.price}</span>
          <span className={t.change.startsWith("-") ? "text-skip" : "text-buy"}>{t.change}</span>
          <span className="pl-5 text-border">·</span>
        </button>
      ))}
    </span>
  );
}

async function fetchLiveTape(): Promise<TickerItem[]> {
  const [instrumentsResponse, tickersResponse] = await Promise.all([
    fetch("/api/market?resource=instruments"),
    fetch("/api/market?resource=tickers"),
  ]);
  if (!instrumentsResponse.ok || !tickersResponse.ok) {
    throw new Error("Bitget market data is unavailable.");
  }

  const instruments = (await instrumentsResponse.json()) as {
    data?: Array<{ symbol?: string; baseCoin?: string; quoteCoin?: string; isReality?: string }>;
  };
  const tickers = (await tickersResponse.json()) as {
    data?: Array<{ symbol?: string; lastPrice?: string; price24hPcnt?: string }>;
  };
  const symbolByStock = new Map<string, string>();
  for (const instrument of instruments.data ?? []) {
    const stockTicker = instrument.baseCoin?.replace(/^r/i, "").toUpperCase();
    if (
      instrument.isReality?.toLowerCase() === "yes" &&
      stockTicker &&
      SYMBOLS.includes(stockTicker) &&
      instrument.quoteCoin === "USDT" &&
      instrument.symbol
    ) {
      symbolByStock.set(stockTicker, instrument.symbol);
    }
  }
  const tickerBySymbol = new Map(
    (tickers.data ?? []).flatMap((ticker) => (ticker.symbol ? [[ticker.symbol, ticker]] : [])),
  );

  return SYMBOLS.flatMap((stock) => {
    const ticker = tickerBySymbol.get(symbolByStock.get(stock) ?? "");
    const price = Number(ticker?.lastPrice);
    const change = Number(ticker?.price24hPcnt);
    if (!ticker || !Number.isFinite(price) || !Number.isFinite(change)) return [];
    return [
      {
        symbol: stock,
        price: price >= 1000 ? price.toFixed(0) : price.toFixed(2),
        change: `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}%`,
      },
    ];
  });
}

const FALLBACK: TickerItem[] = SYMBOLS.map((s) => ({ symbol: s, price: "—", change: "—" }));

export function TickerTape({ onSelect }: { onSelect: (symbol: string) => void }) {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const live = await fetchLiveTape();
        if (!cancelled && live.length > 0) {
          setItems(live);
          setUnavailable(false);
        }
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      aria-label="Live tokenized stock prices. Select a ticker to analyze it."
      className="relative overflow-hidden border-y border-border bg-card py-2 font-mono text-[12px] text-muted-foreground"
    >
      <div className="ticker-track">
        <Row items={items} onSelect={onSelect} />
        <Row items={items} onSelect={onSelect} />
      </div>
      {unavailable && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-card px-2 font-mono text-[10px] text-skip">
          Bitget data unavailable — retrying
        </span>
      )}
    </div>
  );
}
