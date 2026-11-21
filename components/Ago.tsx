"use client";
import { useEffect, useState } from "react";

export function Ago({ at }: { at: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <span className="num">&nbsp;</span>;
  const s = Math.max(0, Math.round((now - at) / 1000));
  const text = s < 10 ? "now" : s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
  return <time className="num" dateTime={new Date(at).toISOString()}>{text}</time>;
}
