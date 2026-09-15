export type JournalEntry = {
  id: number;
  symbol: string;
  action: "Buy" | "Hold" | "Skip";
  timestamp: string;
  rationale: string;
  outcome: string;
  snapshot: {
    price: string;
    change: string;
    rsi: string;
    spread: string;
    confidence: string;
  };
};

const BADGE = {
  Buy: "bg-buy/15 text-buy",
  Hold: "bg-hold/15 text-hold",
  Skip: "bg-skip/15 text-skip",
} as const;

export function DecisionJournal({
  entries,
  onUpdateOutcome,
}: {
  entries: JournalEntry[];
  onUpdateOutcome: (id: number, outcome: string) => void;
}) {
  if (!entries.length) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-xs text-muted-foreground">
          Session journal · {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground/40">
          saved for this session
        </span>
      </div>
      <div className="mt-3 divide-y divide-border border border-border">
        {entries.map((entry) => (
          <article key={entry.id} className="bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground">{entry.symbol}</span>
                <span className={`px-2.5 py-0.5 font-mono text-xs ${BADGE[entry.action]}`}>
                  {entry.action}
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{entry.timestamp}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider">Rationale: </span>
              {entry.rationale || "No rationale recorded."}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-muted-foreground sm:grid-cols-5">
              <span>
                Quote <b className="font-normal text-foreground">${entry.snapshot.price}</b>
              </span>
              <span>
                24h <b className="font-normal text-foreground">{entry.snapshot.change}</b>
              </span>
              <span>
                RSI <b className="font-normal text-foreground">{entry.snapshot.rsi}</b>
              </span>
              <span>
                Spread <b className="font-normal text-foreground">{entry.snapshot.spread}</b>
              </span>
              <span>
                Data <b className="font-normal text-foreground">{entry.snapshot.confidence}</b>
              </span>
            </div>
            <label className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Later outcome / review
              <input
                value={entry.outcome}
                onChange={(event) => onUpdateOutcome(entry.id, event.target.value)}
                placeholder="Add what happened after this decision…"
                className="mt-1.5 w-full border border-border bg-background px-3 py-2 text-xs normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
