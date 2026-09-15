import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WATCHLIST_STORAGE } from "@/lib/stockbrief";

export function Watchlist({
  currentSymbol,
  onAnalyze,
}: {
  currentSymbol?: string | undefined;
  onAnalyze: (symbol: string) => void;
}) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE);
      if (stored) setTickers(JSON.parse(stored));
    } catch {
      /* ignore corrupt data */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE, JSON.stringify(tickers));
  }, [tickers]);

  function addTicker() {
    const symbol = input.trim().toUpperCase();
    if (!symbol) return;
    if (tickers.includes(symbol)) {
      setInput("");
      return;
    }
    setTickers((prev) => [...prev, symbol]);
    setInput("");
  }

  function removeTicker(symbol: string) {
    setTickers((prev) => prev.filter((t) => t !== symbol));
  }

  return (
    <section className="mt-12">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed((c) => !c)}
      >
        <h2 className="font-mono text-xs text-muted-foreground">
          Watchlist · {tickers.length} symbols
        </h2>
        <span className="font-mono text-xs text-muted-foreground select-none">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>

      {!collapsed && (
        <>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTicker();
              }}
              placeholder="AAPL"
              className="flex-1 border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <button
              onClick={addTicker}
              className="border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:border-primary hover:text-foreground"
            >
              + Add
            </button>
          </div>

          {tickers.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground py-4 text-center">
              Add symbols to your watchlist for quick access.
            </p>
          ) : (
            <div className="mt-3 border border-border">
              <AnimatePresence initial={false}>
                {tickers.map((ticker, i) => (
                  <motion.div
                    key={ticker}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <div
                      className={`flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 ${
                        i % 2 === 1 ? "bg-foreground/[0.02]" : ""
                      }`}
                    >
                      <span
                        className={`font-mono text-sm ${
                          ticker === currentSymbol ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {ticker}
                      </span>
                      <div>
                        <button
                          onClick={() => onAnalyze(ticker)}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          Analyze
                        </button>
                        <button
                          onClick={() => removeTicker(ticker)}
                          className="font-mono text-xs text-muted-foreground hover:text-skip ml-3"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </section>
  );
}
