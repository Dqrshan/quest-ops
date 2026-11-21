"use client";
import { Feed, PlayerTable, TeamTable } from "./LiveBoard";
import { useSnapshot } from "./useSnapshot";
import type { Snapshot } from "@/lib/game";

/** The venue screen. Read from several metres away, so type is large and the joining QR is always visible. */
export function BoardScreen({ code, initial, joinQr, joinUrl }: { code: string; initial: Snapshot; joinQr: string; joinUrl: string }) {
  const { snap, changed, connected } = useSnapshot(code, initial);
  const status = snap.event.status === "live" ? (connected ? "Live" : "Reconnecting") : snap.event.status === "ended" ? "Ended" : "Not open yet";
  return (
    <main className="screen">
      <header className="screen__head">
        <div>
          <h1>{snap.event.name}</h1>
          <p className="screen__meta">
            <span className={`live ${snap.event.status === "live" && connected ? "live--on" : ""}`}>{status}</span>
            {snap.event.venue ? <span>{snap.event.venue}</span> : null}
          </p>
        </div>
        <div className="screen__join">
          <div className="screen__qr" dangerouslySetInnerHTML={{ __html: joinQr }} role="img" aria-label={`QR code to join at ${joinUrl}`} />
          <p>
            <span className="screen__joinlabel">Join on your phone</span>
            <span className="screen__code num">{code}</span>
          </p>
        </div>
      </header>

      <div className="screen__grid">
        <section aria-labelledby="teams-h">
          <h2 id="teams-h">Teams</h2>
          <TeamTable snap={snap} changed={changed} limit={8} />
        </section>
        <section aria-labelledby="players-h">
          <h2 id="players-h">Players</h2>
          <PlayerTable snap={snap} changed={changed} limit={8} />
        </section>
        <section aria-labelledby="feed-h" className="screen__feed">
          <h2 id="feed-h">Just now</h2>
          <Feed snap={snap} />
        </section>
      </div>

      <footer className="screen__foot">
        <span className="num">{snap.totals.players}</span> playing
        <span className="num">{snap.totals.completions}</span> stations reached
        <span className="num">{snap.totals.points}</span> points scored
      </footer>
    </main>
  );
}
