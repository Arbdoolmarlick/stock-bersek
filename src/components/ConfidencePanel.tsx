import type { DataConfidence } from "@/lib/confidence";

const COLOR = { High: "text-buy", Medium: "text-hold", Low: "text-skip" } as const;

export function ConfidencePanel({ confidence }: { confidence: DataConfidence }) {
  return (
    <section className="mt-4 border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">Data confidence</p>
          <p className={`mt-1 font-mono text-sm ${COLOR[confidence.label]}`}>
            {confidence.label} · {confidence.score}/100
          </p>
        </div>
        <div className="h-1.5 w-28 overflow-hidden bg-border sm:w-40">
          <div
            className={`h-full ${confidence.label === "High" ? "bg-buy" : confidence.label === "Medium" ? "bg-hold" : "bg-skip"}`}
            style={{ width: `${confidence.score}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{confidence.reasons.join(" · ")}</p>
    </section>
  );
}
