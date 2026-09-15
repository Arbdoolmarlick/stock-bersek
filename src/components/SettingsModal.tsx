import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="glass-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="w-full max-w-md border border-border bg-card p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-mono text-sm text-foreground">⚙ Settings</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              AI access is configured with{" "}
              <code className="font-mono text-foreground">GEMINI_API_KEY</code> on the server. The
              key is never saved or sent by this browser.
            </p>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Bitget market data is public and free. For local development, add the key to a
              non-committed <code className="font-mono text-foreground">.env.local</code> file and
              restart the app.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="focus-ring border border-border px-4 py-2 font-mono text-xs text-muted-foreground transition-colors duration-200 ease-in-out hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
