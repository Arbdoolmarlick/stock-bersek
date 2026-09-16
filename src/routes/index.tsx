import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GridBackdrop } from "@/components/GridBackdrop";
import { TickerTape } from "@/components/TickerTape";
import { Spinner } from "@/components/Spinner";
import { MarketSkeleton, MarketStrip } from "@/components/MarketStrip";
import { BriefingPanel } from "@/components/BriefingPanel";
import { BitgetSignalPanel } from "@/components/BitgetSignalPanel";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import { DecisionJournal, type JournalEntry } from "@/components/DecisionJournal";
import { QuoteContext } from "@/components/QuoteContext";
import { MiniChart } from "@/components/MiniChart";
import { IndicatorCards } from "@/components/IndicatorCards";
import { DataSourceBadges } from "@/components/DataSourceBadges";
import { ChatPanel } from "@/components/ChatPanel";
import { Watchlist } from "@/components/Watchlist";
import { Toast, type ToastState } from "@/components/Toast";
import {
  fetchAnalysisBundle,
  fetchBriefing,
  fetchChatReply,
  type AnalysisBundle,
  type ChatMessage,
  type MarketData,
} from "@/lib/stockbrief";
import { computeIndicators, type IndicatorBundle } from "@/lib/indicators";
import { computeDataConfidence } from "@/lib/confidence";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stock Bersek — AI Trading Desk for Tokenized Stocks" },
      {
        name: "description",
        content:
          "Stock Bersek pulls live tokenized U.S. stock prices from Bitget, turns them into a plain-English AI briefing, and leaves the Buy / Hold / Skip call to you.",
      },
      { property: "og:title", content: "Stock Bersek — AI Trading Desk" },
      {
        property: "og:description",
        content:
          "Live tokenized stock data plus an AI briefing. AI analyzes, you decide. Built for Bitget Builder OS Hackathon Season 2.",
      },
    ],
  }),
  component: StockBrief,
});

type Theme = "dark" | "light";

const THEME_STORAGE = "stockbrief.theme";

const BADGE = {
  Buy: "bg-buy/15 text-buy",
  Hold: "bg-hold/15 text-hold",
  Skip: "bg-skip/15 text-skip",
} as const;

const PHASES = [
  "Fetching live market data…",
  "Scanning order book depth…",
  "Analyzing recent trade flow…",
  "Computing technical indicators…",
  "Running AI analysis…",
];

const POPULAR = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "AMZN"];

function StockBrief() {
  const [ticker, setTicker] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(PHASES[0]);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [bundle, setBundle] = useState<AnalysisBundle | null>(null);
  const [indicators, setIndicators] = useState<IndicatorBundle | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [log, setLog] = useState<JournalEntry[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const seq = useRef(0);

  useEffect(() => {
    fetch("/api/ai")
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => setAiConfigured(Boolean(data.configured)))
      .catch(() => setAiConfigured(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE);
    const initialTheme: Theme = saved === "light" || saved === "dark" ? saved : "dark";
    setTheme(initialTheme);
    document.documentElement.dataset["theme"] = initialTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE, nextTheme);
    document.documentElement.dataset["theme"] = nextTheme;
  };

  // Animated loading phases
  useEffect(() => {
    if (!loading) return;
    setPhase(PHASES[0]);
    const timers = PHASES.slice(1).map((p, i) => setTimeout(() => setPhase(p), (i + 1) * 500));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const analyze = async (symbol?: string) => {
    const sym = (symbol ?? ticker).trim().toUpperCase();
    if (!sym) return;
    if (symbol) setTicker(sym);
    setError(null);
    setBriefing(null);
    setChatHistory([]);
    setIndicators(null);
    setBundle(null);
    setLoading(true);
    try {
      // Fetch all data sources in parallel
      const data = await fetchAnalysisBundle(sym);
      setMarket(data.market);
      setBundle(data);

      // Compute technical indicators
      const ind = computeIndicators(data.klines, data.book, data.trades);
      setIndicators(ind);

      if (!aiConfigured) {
        setError("AI briefing is not configured on this deployment.");
        return;
      }

      // Generate enriched AI briefing
      setBriefing(await fetchBriefing(sym, data.market, ind, data.signal));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async (message: string): Promise<string> => {
    if (!market || !bundle) return "Analyze a stock first.";
    if (!aiConfigured) return "AI briefing is not configured on this deployment.";
    try {
      const reply = await fetchChatReply(
        market.symbol,
        market,
        indicators ?? undefined,
        bundle.signal,
        chatHistory,
        message,
      );
      setChatHistory((prev) => [
        ...prev,
        { role: "user", text: message },
        { role: "model", text: reply },
      ]);
      return reply;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong.";
    }
  };

  const dataSources = bundle?.sources ?? [];
  const confidence = bundle ? computeDataConfidence(bundle, indicators) : null;

  const decide = (action: JournalEntry["action"], rationale: string) => {
    if (!market) return;
    const id = ++seq.current;
    const spread = indicators?.book?.spreadPct;
    setLog((prev) => [
      {
        id,
        symbol: market.symbol,
        action,
        rationale,
        outcome: "",
        timestamp: new Date().toLocaleTimeString(),
        snapshot: {
          price: market.lastPr,
          change: `${Number(market.changeUtc24h).toFixed(2)}%`,
          rsi:
            indicators?.rsi14 === null || indicators?.rsi14 === undefined
              ? "N/A"
              : indicators.rsi14.toFixed(1),
          spread: spread === undefined ? "N/A" : `${spread.toFixed(3)}%`,
          confidence: confidence ? `${confidence.label} ${confidence.score}/100` : "Unknown",
        },
      },
      ...prev,
    ]);
    const tone = action.toLowerCase() as "buy" | "hold" | "skip";
    setToast({ id, message: `${action} logged for ${market.symbol}`, tone });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2500);
  };

  const updateOutcome = (id: number, outcome: string) => {
    setLog((prev) => prev.map((entry) => (entry.id === id ? { ...entry, outcome } : entry)));
  };

  return (
    <div className="min-h-screen bg-background">
      <GridBackdrop />

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="glass-header sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <span className="flex items-center gap-2 font-mono text-base text-foreground">
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-sm bg-black">
            <img
              src="/stock-bersek-logo.jpg"
              alt="Stock Bersek"
              className="h-full w-full scale-[2.4] object-cover"
            />
          </span>
          Stock Bersek
        </span>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            AI analyzes · You decide
          </span>
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="live-dot" /> Live
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === "light"}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="focus-ring border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors duration-200 ease-in-out hover:border-primary hover:text-foreground"
          >
            {theme === "dark" ? "☀ Light" : "◐ Dark"}
          </button>
        </div>
      </header>

      <TickerTape
        onSelect={(symbol) => {
          setTicker(symbol);
          analyze(symbol);
        }}
      />

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-12">
        {/* API key notice */}
        {aiConfigured === false && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-3 border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <span className="text-primary">◈</span>
            <span className="flex-1 text-sm text-foreground">
              AI briefings are unavailable until this deployment has a server-side Gemini key.
            </span>
          </motion.div>
        )}

        {/* Hero search area */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") analyze();
            }}
            placeholder="Enter ticker symbol…"
            aria-label="Ticker symbol"
            className="input-hero flex-1 border border-border bg-card px-5 py-4 font-mono text-[22px] tracking-wide text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => analyze()}
            disabled={loading || !ticker.trim()}
            className="shimmer-btn press-3d focus-ring bg-primary px-8 py-4 font-mono text-sm text-primary-foreground disabled:opacity-40"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {/* Quick-pick popular tickers */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Popular
          </span>
          {POPULAR.map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setTicker(sym);
                analyze(sym);
              }}
              disabled={loading}
              className="border border-border/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-30"
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 border border-skip/40 bg-skip/5 px-4 py-3 font-mono text-xs text-skip"
          >
            ⚠ {error}
          </motion.p>
        )}

        {/* ── Loading state ──────────────────────────────────── */}
        {loading && (
          <>
            <MarketSkeleton />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 flex flex-col items-center gap-4"
            >
              <Spinner />
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-xs text-foreground">{phase}</span>
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  Pulling from 5 Bitget data sources
                </span>
              </div>
            </motion.div>
          </>
        )}

        {/* ── Results ────────────────────────────────────────── */}
        {!loading && market && (
          <>
            <MarketStrip data={market} />

            <QuoteContext
              market={market}
              indicators={indicators}
              ageSeconds={confidence?.ageSeconds ?? null}
            />

            {confidence && <ConfidencePanel confidence={confidence} />}

            {bundle?.signal && <BitgetSignalPanel signal={bundle.signal} />}

            {/* Data source badges */}
            {dataSources.length > 0 && <DataSourceBadges sources={dataSources} />}

            {/* Mini chart */}
            {bundle && bundle.klines.length > 0 && <MiniChart data={bundle.klines} />}

            {/* Indicator cards */}
            {indicators && <IndicatorCards data={indicators} />}
          </>
        )}

        {/* ── AI Briefing + Chat ──────────────────────────────── */}
        {briefing && !loading && market && (
          <>
            <BriefingPanel symbol={market.symbol} text={briefing} onDecide={decide} />
            <ChatPanel onSend={handleChatSend} disabled={loading} />
          </>
        )}

        {/* ── Decision log ────────────────────────────────────── */}
        {false && log.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-xs text-muted-foreground">
                Your decision log · {log.length} {log.length === 1 ? "entry" : "entries"}
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground/40">this session</span>
            </div>
            <div className="mt-3 border border-border">
              <div className="grid grid-cols-3 border-b border-border bg-foreground/[0.02] px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Symbol</span>
                <span>Action</span>
                <span className="text-right">Time</span>
              </div>
              <AnimatePresence initial={false}>
                {log.map((row, i) => (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className={`grid grid-cols-3 items-center border-b border-border px-4 py-2.5 last:border-0 ${
                      i % 2 === 1 ? "bg-foreground/[0.02]" : ""
                    }`}
                  >
                    <span className="font-mono text-sm text-foreground">{row.symbol}</span>
                    <span>
                      <span
                        className={`inline-block px-2.5 py-0.5 font-mono text-xs ${BADGE[row.action]}`}
                      >
                        {row.action}
                      </span>
                    </span>
                    <span className="text-right font-mono text-xs text-muted-foreground">
                      {row.timestamp}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        <DecisionJournal entries={log} onUpdateOutcome={updateOutcome} />

        {/* ── Watchlist ───────────────────────────────────────── */}
        <Watchlist
          currentSymbol={market?.symbol}
          onAnalyze={(sym) => {
            setTicker(sym);
            analyze(sym);
          }}
        />
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border px-5 py-6 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2">
          <span className="flex items-center gap-2 font-mono text-xs text-foreground/70">
            <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-sm bg-black">
              <img
                src="/stock-bersek-logo.jpg"
                alt=""
                className="h-full w-full scale-[2.4] object-cover"
              />
            </span>
            Stock Bersek — AI Trading Desk
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/50">
            Bitget Builder OS · Hackathon Season 2 · 5 data sources · Gemini AI · Not investment
            advice
          </span>
        </div>
      </footer>

      <Toast toast={toast} />
    </div>
  );
}
