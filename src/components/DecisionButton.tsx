import { useRef, useState, type MouseEvent } from "react";

type Tone = "buy" | "hold" | "skip";

const TONE: Record<Tone, string> = {
  buy: "border-buy text-buy hover:bg-buy/10 hover:shadow-[0_0_18px_color-mix(in_oklab,var(--color-buy)_45%,transparent)]",
  hold: "border-hold text-hold hover:bg-hold/10 hover:shadow-[0_0_18px_color-mix(in_oklab,var(--color-hold)_45%,transparent)]",
  skip: "border-skip text-skip hover:bg-skip/10 hover:shadow-[0_0_18px_color-mix(in_oklab,var(--color-skip)_45%,transparent)]",
};

export function DecisionButton({
  tone,
  label,
  onClick,
}: {
  tone: Tone;
  label: string;
  onClick: () => void;
}) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const seq = useRef(0);

  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++seq.current;
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 600);
    onClick();
  };

  return (
    <button
      onClick={handle}
      className={`press-3d focus-ring relative flex-1 overflow-hidden border px-6 py-2.5 font-mono text-sm sm:flex-none ${TONE[tone]}`}
    >
      {label}
      {ripples.map((r) => (
        <span key={r.id} className="ripple-ink" style={{ left: r.x, top: r.y }} />
      ))}
    </button>
  );
}
