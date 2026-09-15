import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/use-count-up";
import { formatNumber, formatPercent, type MarketData } from "@/lib/stockbrief";

const cellMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

function Cell({
  label,
  target,
  digits,
  compact,
}: {
  label: string;
  target: number;
  digits: number;
  compact: boolean;
}) {
  const value = useCountUp(target);
  return (
    <motion.div variants={cellMotion} className="bg-card px-4 py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-lg text-foreground">
        {compact ? formatNumber(String(value)) : value.toFixed(digits)}
      </div>
    </motion.div>
  );
}

export function MarketStrip({ data }: { data: MarketData }) {
  const change = formatPercent(data.changeUtc24h);

  return (
    <motion.section
      key={data.symbol + data.ts}
      className="data-grid mt-8 grid-cols-2 sm:grid-cols-5"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <Cell label="Last price" target={Number(data.lastPr)} digits={4} compact={false} />
      <motion.div variants={cellMotion} className="bg-card px-4 py-4">
        <div className="text-xs text-muted-foreground">24h change</div>
        <div
          className={`mt-2 font-mono text-lg ${
            change.positive ? "flash-up text-buy" : "flash-down text-skip"
          }`}
        >
          {change.positive ? "↑" : "↓"} {change.text.replace("+", "")}
        </div>
      </motion.div>
      <Cell label="24h high" target={Number(data.high24h)} digits={4} compact={false} />
      <Cell label="24h low" target={Number(data.low24h)} digits={4} compact={false} />
      <Cell label="Volume" target={Number(data.baseVolume)} digits={2} compact />
    </motion.section>
  );
}

export function MarketSkeleton() {
  return (
    <section className="data-grid mt-8 grid-cols-2 sm:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card px-4 py-4">
          <div className="skeleton-bar h-3 w-16" />
          <div className="skeleton-bar mt-3 h-5 w-24" />
        </div>
      ))}
    </section>
  );
}
