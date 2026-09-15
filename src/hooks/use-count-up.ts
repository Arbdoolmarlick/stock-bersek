import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Counts from 0 up to `target` over `duration` ms with requestAnimationFrame. */
export function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setValue(target);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(target * easeOutCubic(t));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}

/** Reveals `text` character by character at `cps` characters per second. */
export function useTypewriter(text: string, cps = 30) {
  const [shown, setShown] = useState("");
  const done = shown.length >= text.length;

  useEffect(() => {
    setShown("");
    if (!text) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(text);
      return;
    }
    let i = 0;
    const step = Math.max(1, Math.round(text.length / 900));
    const id = setInterval(() => {
      i = Math.min(text.length, i + step);
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 1000 / cps);
    return () => clearInterval(id);
  }, [text, cps]);

  return { shown, done };
}
