"use client";
import { TeamTable } from "../LiveBoard";
import { feedLine } from "@/lib/feed";
import { RoundClock } from "../live/useCountdown";
import { useSnapshot } from "../live/useSnapshot";
import type { Snapshot } from "@/lib/game";

/** The hero's signature: the demo's venue screen, live, at landing-page scale. */
export function NowShowing({ code, initial }: { code: string; initial: Snapshot }) {
  const { snap, changed, connected, offset } = useSnapshot(code, initial);
  const moments = snap.feed.slice(0, 4);
  const latest = snap.announcements[0];
  return (
    <div className="cinema" aria-label={`Live venue screen for ${snap.event.name}`}>
      <div className="cinema__head">
        <p className="cinema__title">{snap.event.name}</p>
        <span className={`chip ${connected ? "chip--live" : ""}`}>{connected ? "Live" : "Connecting"}</span>
        <RoundClock endsAt={snap.clock.endsAt} label={snap.clock.label} offset={offset} className="cinema__clock" />
      </div>
      <div className="cinema__body">
        <TeamTable snap={snap} changed={changed} limit={4} caption="Demo team standings" />
        <div className="cinema__side">
          {latest ? (
            <p className={`cinema__ann cinema__ann--${latest.tone}`}>
              <span className="visually-hidden">Latest announcement: </span>
              {latest.body}
            </p>
          ) : null}
          <ul className="cinema__feed" aria-label="Latest scans">
            {moments.map((f) => {
              const l = feedLine(f);
              return (
                <li key={f.id} className={f.first || f.kind === "bonus" ? "is-moment" : undefined}>
                  <span>
                    <strong>{l.who}</strong> {l.what}
                  </span>
                  <span className="num">+{f.points}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
