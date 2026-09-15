import { motion } from "framer-motion";
import { useState } from "react";
import { useTypewriter } from "@/hooks/use-count-up";
import { DecisionButton } from "@/components/DecisionButton";

const SECTION_META: Record<string, { icon: string; color: string }> = {
  TREND: { icon: "◈", color: "text-primary" },
  SIGNALS: { icon: "◉", color: "text-hold" },
  LEVELS: { icon: "◆", color: "text-primary" },
  RISK: { icon: "⚠", color: "text-skip" },
  OUTLOOK: { icon: "▶", color: "" }, // outlook color is dynamic
};

function verdictClass(line: string) {
  const l = line.toLowerCase();
  if (l.includes("buy")) return "text-buy";
  if (l.includes("hold")) return "text-hold";
  if (l.includes("skip")) return "text-skip";
  return "text-foreground";
}

function getLineStyle(line: string): { className: string; icon?: string } {
  const trimmed = line.trim().toUpperCase();
  for (const [prefix, meta] of Object.entries(SECTION_META)) {
    if (trimmed.startsWith(prefix)) {
      if (prefix === "OUTLOOK") {
        return {
          className: `font-medium ${verdictClass(line)}`,
          icon: meta.icon,
        };
      }
      return {
        className: meta.color,
        icon: meta.icon,
      };
    }
  }
  return { className: "whitespace-pre-wrap text-foreground/85" };
}

export function BriefingPanel({
  symbol,
  text,
  onDecide,
}: {
  symbol: string;
  text: string;
  onDecide: (action: "Buy" | "Hold" | "Skip", rationale: string) => void;
}) {
  const { shown, done } = useTypewriter(text, 30);
  const [rationale, setRationale] = useState("");

  const recordDecision = (action: "Buy" | "Hold" | "Skip") => {
    onDecide(action, rationale.trim());
    setRationale("");
  };

  const openBitget = () => {
    recordDecision("Buy");
    window.open(`https://www.bitget.com/spot/${symbol}`, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.section
      className="briefing-accent mt-8 border border-border bg-card"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <span
          className="pulse-dot"
          style={done ? { backgroundColor: "var(--color-buy)" } : undefined}
        />
        <h2 className="font-mono text-xs text-muted-foreground">AI market briefing · {symbol}</h2>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">
          {done ? "complete" : "streaming…"}
        </span>
      </div>

      {/* Briefing body */}
      <div className="px-5 py-4 font-mono text-sm leading-[1.75] text-foreground">
        {shown.split("\n").map((line, i) => {
          const style = getLineStyle(line);
          const isSection = Boolean(style.icon);
          return (
            <p key={i} className={`${style.className} ${isSection ? "mt-3 first:mt-0" : "mt-0.5"}`}>
              {style.icon && <span className="mr-2 text-xs opacity-50">{style.icon}</span>}
              {line.trim()}
              {!done && i === shown.split("\n").length - 1 && (
                <span className="caret-blink text-primary">|</span>
              )}
            </p>
          );
        })}
      </div>

      <div className="border-t border-border px-5 py-3">
        <label
          htmlFor="decision-rationale"
          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          Your rationale (optional)
        </label>
        <textarea
          id="decision-rationale"
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
          placeholder="What are you seeing in this setup?"
          rows={2}
          className="mt-2 w-full resize-y border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Decision buttons */}
      <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row">
        <DecisionButton tone="buy" label="Log Buy intent & Open Bitget" onClick={openBitget} />
        <DecisionButton
          tone="hold"
          label="Log Hold intent"
          onClick={() => recordDecision("Hold")}
        />
        <DecisionButton
          tone="skip"
          label="Log Skip intent"
          onClick={() => recordDecision("Skip")}
        />
      </div>
      <p className="border-t border-border px-5 py-3 text-xs leading-5 text-muted-foreground">
        Educational market commentary only — not investment advice or a recommendation to trade. You
        make every trading decision.
      </p>
    </motion.section>
  );
}
