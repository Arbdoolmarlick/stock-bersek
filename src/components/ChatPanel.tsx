import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/Spinner";

type Message = { id: number; role: "user" | "assistant"; text: string };

type ChatPanelProps = {
  onSend: (message: string) => Promise<string>;
  disabled?: boolean;
};

const STARTER_QUESTIONS = [
  "What's the biggest risk here?",
  "Give me a bear case and a bull case.",
  "What would invalidate this setup?",
];

export function ChatPanel({ onSend, disabled }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(message = input) {
    const text = message.trim();
    if (!text || loading || disabled) return;

    const userId = ++seq.current;
    setMessages((prev) => [...prev, { id: userId, role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await onSend(text);
      const assistantId = ++seq.current;
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", text: response }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const isDisabled = loading || !!disabled;

  return (
    <section className="mt-6 border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="font-mono text-xs text-muted-foreground">
          Continue your research · AI Trading Desk
        </span>
      </div>

      {/* Messages area */}
      {messages.length > 0 ? (
        <div className="max-h-[300px] space-y-3 overflow-y-auto px-5 py-3">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    msg.role === "user"
                      ? "max-w-[80%] bg-primary/10 px-3 py-2 text-sm text-foreground"
                      : "max-w-[80%] px-3 py-2 font-mono text-sm text-foreground"
                  }
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-start">
              <Spinner size={16} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="px-5 py-3">
          <p className="font-mono text-xs text-muted-foreground">
            This is a continuing conversation: Gemini keeps the original market data and each
            earlier message in context.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
        {STARTER_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => handleSend(question)}
            disabled={isDisabled}
            className="focus-ring border border-border px-2.5 py-1.5 text-left font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-40"
          >
            {question}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-2 border-t border-border px-5 py-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder="Ask about this stock..."
          className="input-hero flex-1 border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isDisabled || !input.trim()}
          className="shimmer-btn press-3d focus-ring bg-primary px-4 py-2 font-mono text-xs text-primary-foreground disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </section>
  );
}
