import type { ResearchSignal } from "@/lib/stockbrief";

function tone(signal: ResearchSignal) {
  const label = signal.classification.toLowerCase();
  if (label.includes("fear")) return "text-skip";
  if (label.includes("greed")) return "text-hold";
  return "text-primary";
}

export function BitgetSignalPanel({ signal }: { signal: ResearchSignal }) {
  return (
    <section className="mt-4 border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            Bitget Signal · crypto market mood
          </p>
          <p className={`mt-1 font-mono text-sm ${tone(signal)}`}>
            {signal.classification}
            {signal.value === null ? "" : ` · ${signal.value}/100`}
          </p>
        </div>
        <span className="border border-primary/30 px-2 py-1 font-mono text-[10px] text-primary">
          public, no-key research source
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Crypto market context from Bitget Signal. It is not a signal for this rToken or its
        underlying share price.
        {signal.summary ? ` Updated: ${signal.summary}.` : ""}
      </p>
    </section>
  );
}
