import { AnimatePresence, motion } from "framer-motion";

export type ToastState = { id: number; message: string; tone: "buy" | "hold" | "skip" } | null;

const TONE = { buy: "text-buy", hold: "text-hold", skip: "text-skip" } as const;

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="border border-border bg-card px-4 py-3 font-mono text-xs shadow-2xl"
          >
            <span className={TONE[toast.tone]}>✓ </span>
            <span className="text-foreground">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
