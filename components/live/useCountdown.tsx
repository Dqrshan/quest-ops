"use client";
import { useEffect, useState } from "react";

/** Milliseconds left until `endsAt` on the server clock, ticking once a second. Null when no round is running. */
export function useCountdown(endsAt: number | null, offset: number) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(Math.max(0, endsAt - (Date.now() + offset)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt, offset]);
  return left;
}

export function formatClock(ms: number) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function RoundClock({ endsAt, label, offset, className = "" }: { endsAt: number | null; label: string; offset: number; className?: string }) {
  const left = useCountdown(endsAt, offset);
  if (left === null) return null;
  const done = left <= 0;
  return (
    <p className={`clock ${done ? "clock--done" : left < 60_000 ? "clock--last" : ""} ${className}`} role="timer" aria-live="off">
      <span className="clock__label">{done ? "Time is up" : label || "Round ends in"}</span>
      <span className="clock__time num">{done ? "0:00" : formatClock(left)}</span>
    </p>
  );
}
