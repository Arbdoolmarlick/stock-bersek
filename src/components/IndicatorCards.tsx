import { motion } from "framer-motion";
import type { IndicatorBundle } from "@/lib/indicators";

const cardMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } },
};

function rsiLabel(v: number): { text: string; color: string } {
  if (v >= 70) return { text: "Overbought", color: "text-skip" };
  if (v <= 30) return { text: "Oversold", color: "text-buy" };
  return { text: "Neutral", color: "text-muted-foreground" };
}

function Card({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  color?: string | undefined;
}) {
  return (
    <motion.div variants={cardMotion} className="bg-card px-4 py-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1.5 font-mono text-base ${color ?? "text-foreground"}`}>{value}</div>
      {sub && <div className="mt-1 font-mono text-[11px] text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}

export function IndicatorCards({ data }: { data: IndicatorBundle }) {
  const { sma10, sma20, rsi14, book, flow } = data;

  const smaCross =
    sma10 !== null && sma20 !== null
      ? sma10 > sma20
        ? { text: "Bullish", icon: "↑", color: "text-buy" }
        : { text: "Bearish", icon: "↓", color: "text-skip" }
      : { text: "—", icon: "", color: "text-muted-foreground" };

  const rsiInfo = rsi14 !== null ? rsiLabel(rsi14) : { text: "—", color: "text-muted-foreground" };

  const bookSignal = book
    ? book.imbalance > 1.2
      ? { text: `${book.imbalance.toFixed(1)}×`, label: "Buy pressure", color: "text-buy" }
      : book.imbalance < 0.8
        ? { text: `${book.imbalance.toFixed(1)}×`, label: "Sell pressure", color: "text-skip" }
        : { text: `${book.imbalance.toFixed(1)}×`, label: "Balanced", color: "text-hold" }
    : { text: "—", label: "N/A", color: "text-muted-foreground" };

  const pressureColor =
    flow.pressureRatio > 1.2 ? "text-buy" : flow.pressureRatio < 0.8 ? "text-skip" : "text-hold";

  return (
    <motion.div
      className="data-grid mt-4 grid-cols-2 sm:grid-cols-4"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      <Card
        label="SMA Cross"
        value={`${smaCross.icon} ${smaCross.text}`}
        sub={sma10 !== null ? `10: ${sma10.toFixed(2)} · 20: ${sma20?.toFixed(2)}` : undefined}
        color={smaCross.color}
      />
      <Card
        label="RSI (14)"
        value={rsi14 !== null ? rsi14.toFixed(1) : "—"}
        sub={rsiInfo.text}
        color={rsiInfo.color}
      />
      <Card
        label="Book Imbalance"
        value={bookSignal.text}
        sub={`${bookSignal.label}${book ? ` · ${book.spreadPct.toFixed(3)}% spread` : ""}`}
        color={bookSignal.color}
      />
      <Card
        label="Trade Flow"
        value={flow.pressureRatio.toFixed(2) + "×"}
        sub={`${flow.tradeCount} trades`}
        color={pressureColor}
      />
    </motion.div>
  );
}
