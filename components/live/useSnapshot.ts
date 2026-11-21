"use client";
import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/game";

/**
 * Live snapshot over Server-Sent Events, with the server-minus-device clock offset
 * so countdowns agree across phones. Falls back to polling without EventSource.
 */
export function useSnapshot(code: string, initial: Snapshot) {
  const [snap, setSnap] = useState(initial);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [offset, setOffset] = useState(0);
  const prev = useRef(initial);

  useEffect(() => {
    let es: EventSource | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let clear: ReturnType<typeof setTimeout> | undefined;

    const apply = (next: Snapshot) => {
      setOffset(next.now - Date.now());
      const before = new Map<string, number>();
      prev.current.teams.forEach((t) => before.set(`t${t.id}`, t.score));
      prev.current.players.forEach((p) => before.set(`p${p.id}`, p.score));
      const ch = new Set<string>();
      next.teams.forEach((t) => before.has(`t${t.id}`) && before.get(`t${t.id}`) !== t.score && ch.add(`t${t.id}`));
      next.players.forEach((p) => before.has(`p${p.id}`) && before.get(`p${p.id}`) !== p.score && ch.add(`p${p.id}`));
      prev.current = next;
      setSnap(next);
      if (ch.size) {
        setChanged(ch);
        clearTimeout(clear);
        clear = setTimeout(() => setChanged(new Set()), 2400);
      }
    };

    if (typeof EventSource === "undefined") {
      poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/board/${code}`, { cache: "no-store" });
          if (r.ok) apply(await r.json());
        } catch {}
      }, 4000);
    } else {
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
      es?.close();
      clearInterval(poll);
      clearTimeout(clear);
    };
  }, [code]);

  return { snap, changed, connected, offset };
}
