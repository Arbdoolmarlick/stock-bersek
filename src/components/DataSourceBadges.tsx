import { motion } from "framer-motion";

type Source = {
  label: string;
  status: "available" | "unavailable";
  detail?: string;
};

export function DataSourceBadges({ sources }: { sources: Source[] }) {
  return (
    <motion.div
      className="mt-6 flex flex-wrap items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Data sources
      </span>
      {sources.map((s) => (
        <span
          key={s.label}
          title={s.detail}
          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] ${
            s.status === "available"
              ? "border-primary/40 bg-primary/8 text-primary"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: s.status === "available" ? "var(--color-buy)" : "var(--color-skip)",
              boxShadow: s.status === "available" ? "0 0 6px var(--color-buy)" : "none",
            }}
          />
          {s.label} {s.status === "unavailable" ? "unavailable" : "live"}
        </span>
      ))}
    </motion.div>
  );
}
