"use client";
import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/game";

/** Live snapshot over Server-Sent Events. Falls back to polling if the stream drops for good. */
export function useSnapshot(code: string, initial: Snapshot) {
  const [snap, setSnap] = useState(initial);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const prev = useRef(initial);

  useEffect(() => {
    let es: EventSource | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let clear: ReturnType<typeof setTimeout> | undefined;
    let dead = false;

    const apply = (next: Snapshot) => {
      const ch = new Set<string>();
      const before = new Map<string, number>();
      prev.current.teams.forEach((t) => before.set(`t${t.id}`, t.score));
      prev.current.players.forEach((p) => before.set(`p${p.id}`, p.score));
      next.teams.forEach((t) => before.get(`t${t.id}`) !== t.score && ch.add(`t${t.id}`));
      next.players.forEach((p) => before.get(`p${p.id}`) !== p.score && ch.add(`p${p.id}`));
      prev.current = next;
      setSnap(next);
      if (ch.size) {
        setChanged(ch);
        clearTimeout(clear);
        clear = setTimeout(() => setChanged(new Set()), 2400);
      }
    };

    const startPolling = () => {
      if (poll || dead) return;
      poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/board/${code}`, { cache: "no-store" });
          if (r.ok) apply(await r.json());
        } catch {}
      }, 4000);
    };

    if (typeof EventSource === "undefined") startPolling();
    else {
      es = new EventSource(`/api/board/${code}/stream`);
      es.onopen = () => setConnected(true);
      es.onmessage = (m) => {
        try {
          apply(JSON.parse(m.data));
        } catch {}
      };
      es.onerror = () => setConnected(false);
    }
    return () => {
      dead = true;
      es?.close();
      clearInterval(poll);
      clearTimeout(clear);
    };
  }, [code]);

  return { snap, changed, connected };
}
