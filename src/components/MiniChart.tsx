import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import type { KlineBar } from "@/lib/stockbrief";

type MiniChartProps = {
  data: KlineBar[];
};

export function MiniChart({ data }: MiniChartProps) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((b) => ({
    time: new Date(b.ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    price: b.close,
    ts: b.ts,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-8 border border-border bg-card p-4"
    >
      <h2 className="font-mono text-xs text-muted-foreground">48h price history</h2>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 12, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" strokeOpacity={0.3} />

          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(data.length / 6)}
          />

          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => v.toLocaleString()}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 12,
              borderRadius: 0,
            }}
            labelStyle={{ color: "var(--color-muted-foreground)" }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Price"]}
          />

          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            fill="url(#priceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
