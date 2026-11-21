"use client";
import { useRef, useState } from "react";
import { IconCheck, KindIcon } from "../icons";
import type { PlayerView, Snapshot } from "@/lib/game";

const TABS = [
  { id: "booth", label: "The booth", line: "Run the clock, announce, see where the crowd is." },
  { id: "ticket", label: "The ticket", line: "Next stop, level and rank, live on every phone." },
  { id: "screen", label: "The screen", line: "Bills the teams, spotlights first arrivals, rolls the credits." },
] as const;

/** A switcher between the three surfaces, each built from the demo's real data. */
export function ThreeScreens({ snap, view }: { snap: Snapshot; view: PlayerView | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("booth");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = TABS.find((t) => t.id === tab)!;
  const players = Math.max(1, snap.totals.players);

  return (
    <div className="screens">
      <div
        className="screens__tabs"
        role="tablist"
        aria-label="The three screens"
        onKeyDown={(e) => {
          const i = TABS.findIndex((t) => t.id === tab);
          const j = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : -1;
          if (j < 0) return;
          e.preventDefault();
          setTab(TABS[j].id);
          refs.current[j]?.focus();
        }}
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="screens__tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="screens__panel" role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`}>
        <p className="screens__line">{current.line}</p>

        {tab === "booth" ? (
          <div className="mini-booth" aria-hidden="true">
            <div className="mini-booth__row">
              <span className="chip chip--live">Live</span>
              <span className="mini-booth__clock num">{snap.clock.label || "Round"}</span>
              <span className="btn btn--ghost btn--sm">Pause play</span>
            </div>
            <div className="mini-booth__ann">
              <span>{snap.announcements[0]?.body ?? "The organ loft is open. Follow the music upstairs."}</span>
              <span className="btn btn--primary btn--sm">Send</span>
            </div>
            <ol className="reach">
              {snap.stations.map((s) => (
                <li key={s.id} className="reach__row">
                  <span className="reach__n num">{s.position}</span>
                  <span className="reach__title">{s.title}</span>
                  <span className="reach__bar">
                    <span style={{ transform: `scaleX(${Math.min(1, s.reached / players)})` }} />
                  </span>
                  <span className="reach__count num">{s.reached}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {tab === "ticket" && view ? (
          <div className="mini-phone" aria-hidden="true">
            <div className="ticket ticket--mini">
              <div className="ticket__main">
                <p className="ticket__event">{snap.event.name}</p>
                <p className="ticket__name">{view.me.name}</p>
                <p className="ticket__team">{view.me.team}</p>
              </div>
              <div className="ticket__stub">
                <p className="ticket__score num">{view.me.score}</p>
                <p className="ticket__rank num">
                  {view.me.rank} of {view.me.of}
                </p>
              </div>
              <div className="ticket__level">
                <p>
                  <span className="ticket__lvl">{view.me.level.name}</span>
                </p>
                <span className="meter">
                  <span className="meter__fill" style={{ transform: `scaleX(${view.me.level.progress})` }} />
                </span>
              </div>
            </div>
            <ol className="route route--mini">
              {view.quests.slice(0, 5).map((q) => (
                <li key={q.id} className={`route__stop route__stop--${q.done ? "done" : q.id === view.next ? "next" : "todo"}`}>
                  <span className="route__btn">
                    <span className="route__mark">{q.done ? <IconCheck size={14} /> : <KindIcon kind={q.kind} size={14} />}</span>
                    <span className="route__body">
                      <span className="route__title">{q.title}</span>
                    </span>
                    <span className="route__pts num">{q.points}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {tab === "screen" ? (
          <div className="mini-screen" aria-hidden="true">
            <p className="mini-screen__title">{snap.event.name}</p>
            <ol className="mini-screen__bill">
              {snap.teams.slice(0, 4).map((t, i) => (
                <li key={t.id}>
                  <span className="num">{i + 1}</span>
                  <span>{t.name}</span>
                  <span className="num">{t.score}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
