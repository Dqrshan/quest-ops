"use client";
import { useEffect, useRef, useState } from "react";
import { Feed, PlayerTable, TeamTable } from "./LiveBoard";
import { feedLine } from "@/lib/feed";
import { IconExpand } from "./icons";
import { RoundClock } from "./live/useCountdown";
import { useSnapshot } from "./live/useSnapshot";
import type { Announcement, FeedItem, Snapshot } from "@/lib/game";

type Props = { code: string; initial: Snapshot; joinQr: string; joinUrl: string; simulated?: boolean };

/** The venue screen. Read from several metres away in a dim hall, so it is large, high-contrast and runs itself. */
export function BoardScreen({ code, initial, joinQr, joinUrl, simulated }: Props) {
  const { snap, changed, connected, offset } = useSnapshot(code, initial);
  const intermission = useIntermission(snap.announcements, offset);
  const leader = useLeader(snap.event.status);
  const spotlight = pickSpotlight(snap.feed);
  const idle = useIdleCursor();

  if (snap.event.status === "ended") return <Finale snap={snap} />;

  return (
    <main className={`screen${idle ? " screen--idle" : ""}`}>
      <header className="screen__head">
        <div className="screen__title">
          <h1>{snap.event.name}</h1>
          <p className="screen__meta">
            <Status snap={snap} connected={connected} />
            {snap.event.venue ? <span>{snap.event.venue}</span> : null}
            {simulated ? <span>Simulated players</span> : null}
          </p>
        </div>
        <RoundClock endsAt={snap.clock.endsAt} label={snap.clock.label} offset={offset} className="screen__clock" />
        <div className="screen__join">
          <div className="screen__qr" dangerouslySetInnerHTML={{ __html: joinQr }} role="img" aria-label={`QR code to join at ${joinUrl}`} />
          <p>
            <span className="screen__joinlabel">Join on your phone</span>
            <span className="screen__code num">{code}</span>
          </p>
        </div>
      </header>

      {snap.event.paused ? (
        <p className="screen__paused" role="status">
          Intermission. Play is paused and scans will count again shortly.
        </p>
      ) : null}

      <div className="screen__grid">
        <section aria-labelledby="teams-h" className="screen__teams">
          <h2 id="teams-h">Teams</h2>
          <TeamTable snap={snap} changed={changed} limit={6} />
        </section>
        <section aria-labelledby="players-h">
          <h2 id="players-h">Players</h2>
          <PlayerTable snap={snap} changed={changed} limit={7} />
        </section>
        <section aria-labelledby="feed-h" className="screen__feed">
          <h2 id="feed-h">Just now</h2>
          <Feed snap={snap} limit={7} />
        </section>
      </div>

      {spotlight ? <Spotlight key={spotlight.id} item={spotlight} /> : null}

      <footer className="screen__foot">
        <span>
          <span className="num">{snap.totals.players}</span> playing
        </span>
        <span>
          <span className="num">{snap.totals.completions}</span> stations reached
        </span>
        <span>
          <span className="num">{snap.totals.points}</span> points scored
        </span>
        <FullscreenButton />
      </footer>

      {intermission ? <Intermission key={intermission.id} a={intermission} /> : null}
      {leader !== null ? <Leader n={leader} /> : null}
    </main>
  );
}

function Status({ snap, connected }: { snap: Snapshot; connected: boolean }) {
  if (snap.event.status === "draft") return <span className="chip">Doors not open yet</span>;
  if (snap.event.paused) return <span className="chip chip--blood">Paused</span>;
  return <span className={`chip ${connected ? "chip--live" : ""}`}>{connected ? "Live" : "Reconnecting"}</span>;
}

function pickSpotlight(feed: FeedItem[]) {
  return feed.find((f) => f.first || f.kind === "bonus") ?? null;
}

function Spotlight({ item }: { item: FeedItem }) {
  const l = feedLine(item);
  return (
    <aside className="spotlight" aria-live="polite">
      <p className="spotlight__line">
        <strong>{l.who}</strong> {l.what}
      </p>
      <p className="spotlight__pts num">+{item.points}</p>
    </aside>
  );
}

/** Show a new announcement full-size for twelve seconds. Ignores ones older than 30 seconds on first load. */
function useIntermission(list: Announcement[], offset: number) {
  const [shown, setShown] = useState<Announcement | null>(null);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    const newest = list[0];
    if (!newest) return;
    if (seen.current === null) {
      seen.current = newest.id;
      if (Date.now() + offset - newest.at > 30_000) return;
    } else if (newest.id === seen.current) return;
    seen.current = newest.id;
    setShown(newest);
    const t = setTimeout(() => setShown(null), 12_000);
    return () => clearTimeout(t);
  }, [list, offset]);
  useEffect(() => {
    if (shown && !list.some((a) => a.id === shown.id)) setShown(null);
  }, [list, shown]);
  return shown;
}

function Intermission({ a }: { a: Announcement }) {
  return (
    <div className={`intermission intermission--${a.tone}`} role="alert">
      <h2 className="intermission__label">{a.tone === "alert" ? "Attention" : "Intermission"}</h2>
      <p className="intermission__body">{a.body}</p>
    </div>
  );
}

/** A 3, 2, 1 film leader when the event goes live while the screen is open. */
function useLeader(status: Snapshot["event"]["status"]) {
  const [n, setN] = useState<number | null>(null);
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current !== "live" && status === "live") {
      setN(3);
      const timers = [setTimeout(() => setN(2), 1000), setTimeout(() => setN(1), 2000), setTimeout(() => setN(null), 3000)];
      prev.current = status;
      return () => timers.forEach(clearTimeout);
    }
    prev.current = status;
  }, [status]);
  return n;
}

function Leader({ n }: { n: number }) {
  return (
    <div className="leader" role="status" aria-label={`Starting in ${n}`}>
      <span className="leader__sweep" key={n} aria-hidden="true" />
      <span className="leader__ring" aria-hidden="true" />
      <span className="leader__n num">{n}</span>
    </div>
  );
}

function Finale({ snap }: { snap: Snapshot }) {
  const top = snap.teams.slice(0, 3);
  return (
    <main className="finale">
      <div className="finale__bill">
        <h1>The end</h1>
        <p className="finale__event">{snap.event.name}</p>
        {top.length ? (
          <ol className="finale__starring" aria-label="Top teams">
            {top.map((t, i) => (
              <li key={t.id} className={`finale__star finale__star--${i + 1}`}>
                <span className="finale__place num">{i + 1}</span>
                <span className="finale__name">{t.name}</span>
                <span className="finale__pts num">{t.score}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <div className="credits" aria-label="Final player standings">
        <ol className="credits__roll">
          {snap.players.map((p, i) => (
            <li key={p.id}>
              <span className="credits__role">{i === 0 ? "Top player" : p.team ?? "Solo"}</span>
              <span className="credits__name">{p.name}</span>
              <span className="credits__pts num">{p.score}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="finale__foot">
        <span className="num">{snap.totals.players}</span> players, <span className="num">{snap.totals.completions}</span> stations reached
      </p>
    </main>
  );
}

function useIdleCursor() {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 3000);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);
  return idle;
}

function FullscreenButton() {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(Boolean(document.documentElement.requestFullscreen)), []);
  if (!supported) return null;
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm screen__fs"
      onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
    >
      <IconExpand size={16} /> Full screen
    </button>
  );
}
