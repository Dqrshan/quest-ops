"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck, IconClose, IconShare, KindIcon, kindLabel, kindVerb } from "../icons";
import { Empty } from "../Empty";
import { RoundClock } from "../live/useCountdown";
import { Scanner } from "./Scanner";
import { Bat, Cobweb, Ghost, Pumpkin, Tombstone, WitchHat } from "../spooky";
import type { CompleteResult, PersonalFrame, PlayerQuest } from "@/lib/game";

type Tab = "route" | "scan" | "standings";
type Done = Extract<CompleteResult, { status: "done" }>;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong. Try again.");
  return data as T;
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export function PlayClient({ code, initial, initialToken }: { code: string; initial: PersonalFrame; initialToken?: string }) {
  const [frame, setFrame] = useState(initial);
  const [offset, setOffset] = useState(initial.now - Date.now());
  const [tab, setTab] = useState<Tab>("route");
  const [sheet, setSheet] = useState<PlayerQuest | null>(null);
  const [asking, setAsking] = useState<{ token: string; quest: PlayerQuest | CompleteResult["quest"] } | null>(null);
  const [jolt, setJolt] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);
  const pending = useRef(initialToken);
  const hadView = useRef(Boolean(initial.view));

  const apply = useCallback((f: PersonalFrame) => {
    setOffset(f.now - Date.now());
    if (hadView.current && !f.view) setRemoved(true);
    if (f.view) hadView.current = true;
    setFrame(f);
  }, []);

  // Personal live stream: rank, score, clock and announcements arrive here, no polling.
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(`/api/play/${code}/stream`);
    es.onmessage = (m) => {
      try {
        apply(JSON.parse(m.data));
      } catch {}
    };
    return () => es.close();
  }, [code, apply, frame.view?.me.id]); // reconnect once after joining so the stream carries the new cookie

  const scan = useCallback(
    async (token: string, answer?: string) => {
      setBusy(true);
      setError(null);
      try {
        const d = await api<{ result: CompleteResult; frame: PersonalFrame }>(`/api/play/${code}/scan`, {
          method: "POST",
          body: JSON.stringify({ token, answer }),
        });
        apply(d.frame);
        setSheet(null);
        if (d.result.status === "arrived") {
          setAsking({ token, quest: d.result.quest });
        } else {
          setAsking(null);
          setJolt(d.result);
          setTab("route");
          if (!d.result.repeat && "vibrate" in navigator) navigator.vibrate?.([30, 50, 90]);
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not check in. Try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, apply],
  );

  // A station link opened the app: count it as soon as the player is in.
  useEffect(() => {
    if (frame.view && pending.current) {
      const t = pending.current;
      pending.current = undefined;
      window.history.replaceState(null, "", `/play/${code}`);
      void scan(t);
    }
  }, [frame.view, scan, code]);

  const view = frame.view;
  if (!view) {
    return (
      <main className="play play--join">
        <JoinForm code={code} frame={frame} hasQuest={Boolean(initialToken)} removed={removed} onJoined={apply} />
      </main>
    );
  }

  const ev = frame.event;
  const next = view.quests.find((q) => q.id === view.next) ?? null;
  const lvl = view.me.level;

  return (
    <main className="play">
      <header className="ticket" aria-label="Your ticket">
        <div className="ticket__main">
          <p className="ticket__event">{ev.name}</p>
          <p className="ticket__name">{view.me.name}</p>
          <p className="ticket__team">{view.me.team ?? "No team"}</p>
        </div>
        <div className="ticket__stub">
          <p className="ticket__score num" aria-label={`${view.me.score} points`}>
            {view.me.score}
          </p>
          <p className="ticket__rank">{view.me.rank ? `${ordinal(view.me.rank)} of ${view.me.of}` : "Unranked"}</p>
        </div>
        <div className="ticket__level">
          <p className="ticket__lvlrow">
            <WitchHat size={20} />
            <span className="ticket__lvl">{lvl.name}</span>
            {lvl.next !== null ? <span className="ticket__to"> {lvl.next - view.me.score} points to {lvl.nextName}</span> : <span className="ticket__to"> Top level</span>}
          </p>
          <span className="meter" aria-hidden="true">
            <span className="meter__fill" style={{ transform: `scaleX(${lvl.progress})` }} />
          </span>
        </div>
      </header>

      <RoundClock endsAt={frame.clock.endsAt} label={frame.clock.label} offset={offset} className="play__clock" />
      <AnnouncementBanner frame={frame} offset={offset} />

      {ev.status === "draft" ? <p className="note" role="status">The organizer has not opened the doors yet. You are on the list; stay on this page.</p> : null}
      {ev.status === "live" && ev.paused ? <p className="note note--blood" role="status">Intermission. Play is paused; scans count again as soon as it resumes.</p> : null}

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <div className="play__body">
        {ev.status === "ended" ? <Recap frame={frame} /> : null}

        {tab === "route" && ev.status !== "ended" ? (
          <section aria-labelledby="route-h" className="stack stack--lg">
            {next ? (
              <article className="next" aria-labelledby="next-h">
                <Cobweb corner="tr" size={64} />
                <h2 id="next-h" className="next__title">{next.title}</h2>
                <p className="next__hint">Your next stop{next.hint ? `: ${next.hint}` : ""}</p>
                <div className="next__row">
                  <span className="kind">
                    <KindIcon kind={next.kind} size={16} /> {kindLabel[next.kind]}
                  </span>
                  <span className="next__pts num">{next.points} points</span>
                </div>
                <button type="button" className="btn btn--primary btn--block" onClick={() => setTab("scan")}>
                  Scan this station
                </button>
              </article>
            ) : view.quests.length ? (
              <p className="note note--live">Every station reached. Watch the board for your final place.</p>
            ) : null}
            <div className="stack">
              <h2 id="route-h" className="play__h">
                Your route <span className="play__count num">{view.me.done} of {view.quests.length}</span>
              </h2>
              {view.quests.length ? (
                <Route quests={view.quests} next={view.next} onOpen={setSheet} />
              ) : (
                <Empty>No stations yet. The organizer is still setting the stage.</Empty>
              )}
            </div>
          </section>
        ) : null}

        {tab === "scan" ? (
          <section aria-labelledby="scan-h" className="stack">
            <h2 id="scan-h" className="play__h">Scan a station</h2>
            <Scanner active onToken={(t) => void scan(t)} />
          </section>
        ) : null}

        {tab === "standings" ? <Standings frame={frame} /> : null}
      </div>

      <nav className="tabs" aria-label="Sections">
        {(
          [
            ["route", "Route"],
            ["scan", "Scan"],
            ["standings", "Standings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="tabs__btn"
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              setError(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {sheet ? <StationSheet quest={sheet} hasTeam={Boolean(view.me.team)} onClose={() => setSheet(null)} onScan={() => { setSheet(null); setTab("scan"); }} /> : null}
      {asking ? <AnswerSheet quest={asking.quest} busy={busy} onClose={() => setAsking(null)} onAnswer={(a) => scan(asking.token, a)} /> : null}
      {jolt ? <Jolt result={jolt} onClose={() => setJolt(null)} /> : null}
    </main>
  );
}

function Route({ quests, next, onOpen }: { quests: PlayerQuest[]; next: number | null; onOpen: (q: PlayerQuest) => void }) {
  return (
    <ol className="route">
      {quests.map((q) => {
        const state = q.done ? "done" : q.id === next ? "next" : "todo";
        return (
          <li key={q.id} className={`route__stop route__stop--${state}`}>
            <button type="button" className="route__btn" onClick={() => onOpen(q)}>
              <span className="route__mark" aria-hidden="true">
                {q.done ? <IconCheck size={16} /> : <KindIcon kind={q.kind} size={16} />}
              </span>
              <span className="route__body">
                <span className="route__title">{q.title}</span>
                <span className="route__sub">{subline(q)}</span>
              </span>
              <span className="route__pts num">
                {q.points}
                <span className="visually-hidden"> points{q.done ? ", reached" : ""}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function subline(q: PlayerQuest) {
  if (q.kind === "team") {
    const crew = `crew ${q.teamHave ?? 0} of ${q.team_size}`;
    return q.done ? `You scanned, ${crew}` : `Team station, ${crew}`;
  }
  if (q.done) return "Reached";
  return q.hint ?? kindLabel[q.kind];
}

function Sheet({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet__inner">
        <button type="button" className="sheet__close iconbtn" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
        {children}
      </div>
    </dialog>
  );
}

function StationSheet({ quest, hasTeam, onClose, onScan }: { quest: PlayerQuest; hasTeam: boolean; onClose: () => void; onScan: () => void }) {
  return (
    <Sheet labelledBy="sheet-h" onClose={onClose}>
      <h2 id="sheet-h" className="sheet__title">
        <span className="sheet__n num">{quest.position}</span> {quest.title}
      </h2>
      {quest.brief ? <p className="sheet__brief">{quest.brief}</p> : null}
      <dl className="facts">
        <div>
          <dt>How</dt>
          <dd>{kindVerb[quest.kind]}</dd>
        </div>
        {quest.hint ? (
          <div>
            <dt>Where</dt>
            <dd>{quest.hint}</dd>
          </div>
        ) : null}
        <div>
          <dt>Worth</dt>
          <dd className="num">
            {quest.points} points{quest.kind === "team" ? `, plus ${quest.points} for the team` : ""}
          </dd>
        </div>
        {quest.kind === "team" ? (
          <div>
            <dt>Your crew</dt>
            <dd className="num">
              {quest.teamHave ?? 0} of {quest.team_size} scanned
            </dd>
          </div>
        ) : null}
      </dl>
      {quest.done ? (
        <p className="note note--live">You have reached this station.</p>
      ) : quest.kind === "team" && !hasTeam ? (
        <p className="note">This is a team station. Join with a team name to take part.</p>
      ) : (
        <button type="button" className="btn btn--primary btn--block" onClick={onScan}>
          Scan this station
        </button>
      )}
    </Sheet>
  );
}

function AnswerSheet({ quest, busy, onAnswer, onClose }: { quest: CompleteResult["quest"]; busy: boolean; onAnswer: (a: string) => Promise<boolean>; onClose: () => void }) {
  const [answer, setAnswer] = useState("");
  return (
    <Sheet labelledBy="ans-h" onClose={onClose}>
      <h2 id="ans-h" className="sheet__title">
        <span className="sheet__n num">{quest.position}</span> {quest.title}
      </h2>
      {quest.brief ? <p className="sheet__brief">{quest.brief}</p> : null}
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onAnswer(answer)) setAnswer("");
        }}
      >
        <label className="field">
          <span className="field__label">Your answer</span>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" />
        </label>
        <button className="btn btn--primary btn--block" type="submit" disabled={busy || !answer.trim()} aria-busy={busy}>
          {busy ? "Checking" : "Check answer"}
        </button>
      </form>
    </Sheet>
  );
}

/** The one authored moment: a title card that slams in on a successful check-in. */
function Jolt({ result, onClose }: { result: Done; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, result.repeat ? 1800 : 3200);
    return () => clearTimeout(t);
  }, [onClose, result.repeat]);
  return (
    <div className={`jolt${result.first ? " jolt--first" : ""}${result.repeat ? " jolt--repeat" : ""}`} role="status" onClick={onClose}>
      <div className="jolt__card">
        {result.repeat ? <Ghost size={56} className="jolt__glyph" /> : result.first ? <Bat size={64} className="jolt__glyph" /> : <Pumpkin size={56} className="jolt__glyph" />}
        {result.repeat ? (
          <>
            <p className="jolt__fig">Already counted</p>
            <p className="jolt__line">{result.quest.title}</p>
          </>
        ) : (
          <>
            <p className="jolt__fig num">+{result.awarded}</p>
            <p className="jolt__line">You reached {result.quest.title}</p>
            {result.first ? <p className="jolt__tag">First to arrive</p> : null}
            {result.teamBonus ? <p className="jolt__tag">Team bonus unlocked, +{result.teamBonus}</p> : null}
            {result.teamProgress && !result.teamBonus ? (
              <p className="jolt__sub">
                {result.teamProgress.have >= result.teamProgress.need
                  ? "Your whole crew made it."
                  : `${result.teamProgress.have} of ${result.teamProgress.need} of your crew have scanned. Bring the rest.`}
              </p>
            ) : null}
          </>
        )}
        <p className="jolt__dismiss">Tap to continue</p>
      </div>
    </div>
  );
}

function AnnouncementBanner({ frame, offset }: { frame: PersonalFrame; offset: number }) {
  const [hidden, setHidden] = useState<number | null>(null);
  useEffect(() => {
    try {
      setHidden(Number(localStorage.getItem(`qo-ann-${frame.event.code}`)) || null);
    } catch {}
  }, [frame.event.code]);
  const a = frame.announcements[0];
  if (!a || a.id === hidden || Date.now() + offset - a.at > 10 * 60_000) return null;
  return (
    <aside className={`banner banner--${a.tone}`} role="status" aria-live="polite">
      <p>{a.body}</p>
      <button
        type="button"
        className="iconbtn iconbtn--plain"
        aria-label="Dismiss announcement"
        onClick={() => {
          setHidden(a.id);
          try {
            localStorage.setItem(`qo-ann-${frame.event.code}`, String(a.id));
          } catch {}
        }}
      >
        <IconClose size={16} />
      </button>
    </aside>
  );
}

function Standings({ frame }: { frame: PersonalFrame }) {
  const view = frame.view!;
  return (
    <section aria-labelledby="st-h" className="stack stack--lg">
      <h2 id="st-h" className="play__h">Standings</h2>
      <dl className="facts">
        <div>
          <dt>You</dt>
          <dd className="num">{view.me.rank ? `${ordinal(view.me.rank)} of ${view.me.of}, ${view.me.score} points` : "Not ranked yet"}</dd>
        </div>
        {view.team ? (
          <div>
            <dt>{view.team.name}</dt>
            <dd className="num">{`${ordinal(view.team.rank)} of ${view.team.of}, ${view.team.score} points`}</dd>
          </div>
        ) : null}
      </dl>
      {frame.top.teams.length ? (
        <div className="stack">
          <h3 className="play__h3">Teams</h3>
          <ol className="mini">
            {frame.top.teams.map((t, i) => (
              <li key={t.id} aria-current={t.name === view.me.team ? "true" : undefined}>
                <span className="num">{i + 1}</span>
                <span>{t.name}</span>
                <span className="num">{t.score}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="stack">
        <h3 className="play__h3">Players</h3>
        <ol className="mini">
          {frame.top.players.map((p, i) => (
            <li key={p.id} aria-current={p.id === view.me.id ? "true" : undefined}>
              <span className="num">{i + 1}</span>
              <span>{p.name}</span>
              <span className="num">{p.score}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Recap({ frame }: { frame: PersonalFrame }) {
  const v = frame.view!;
  const [copied, setCopied] = useState(false);
  const text = `I finished ${v.me.rank ? ordinal(v.me.rank) : "unranked"} of ${v.me.of} at ${frame.event.name} with ${v.me.score} points, reaching ${v.me.done} of ${v.quests.length} stations.`;
  return (
    <section className="recap" aria-labelledby="recap-h">
      <h2 id="recap-h" className="recap__title">
        <Tombstone size={44} /> The end
      </h2>
      <p className="recap__place num">{v.me.rank ? ordinal(v.me.rank) : "Unranked"}</p>
      <p className="recap__line">
        of {v.me.of} players, <span className="num">{v.me.score}</span> points, <span className="num">{v.me.done}</span> of{" "}
        <span className="num">{v.quests.length}</span> stations
      </p>
      <p className="recap__lvl">{v.me.level.name}</p>
      {v.team ? (
        <p className="recap__team">
          {v.team.name} finished {ordinal(v.team.rank)} of {v.team.of}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn--primary"
        onClick={async () => {
          try {
            if (navigator.share) await navigator.share({ text });
            else {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }
          } catch {}
        }}
      >
        <IconShare size={16} /> {copied ? "Copied" : "Share my result"}
      </button>
    </section>
  );
}

function JoinForm({
  code,
  frame,
  hasQuest,
  removed,
  onJoined,
}: {
  code: string;
  frame: PersonalFrame;
  hasQuest: boolean;
  removed: boolean;
  onJoined: (f: PersonalFrame) => void;
}) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [teams, setTeams] = useState<{ id: number; name: string; members: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ teams: typeof teams }>(`/api/play/${code}/teams`)
      .then((d) => setTeams(d.teams))
      .catch(() => {});
  }, [code]);

  const ended = frame.event.status === "ended";
  return (
    <form
      className="poster"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          onJoined(await api<PersonalFrame>(`/api/play/${code}/join`, { method: "POST", body: JSON.stringify({ name, team }) }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not join. Try again.");
          setBusy(false);
        }
      }}
    >
      <div className="poster__bill">
        <Cobweb corner="tr" size={88} />
        <h1 className="poster__title">{frame.event.name}</h1>
        {frame.event.venue ? <p className="poster__venue">{frame.event.venue}</p> : null}
        {frame.event.blurb ? <p className="poster__story">{frame.event.blurb}</p> : null}
      </div>
      {removed ? <p className="alert">The organizer removed your ticket. You can join again with a new name.</p> : null}
      {hasQuest && !removed ? <p className="note note--live">Join first and this station counts straight away.</p> : null}
      <div className="poster__form stack stack--lg">
        <label className="field">
          <span className="field__label">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={32} autoComplete="nickname" enterKeyHint="next" disabled={ended} />
        </label>
        <div className="field">
          <label className="field__label" htmlFor="team">
            Team, optional
          </label>
          <input id="team" value={team} onChange={(e) => setTeam(e.target.value)} maxLength={32} placeholder="Pick one or name a new one" enterKeyHint="go" disabled={ended} />
          {teams.length ? (
            <div className="cells" role="group" aria-label="Teams already playing">
              {teams.slice(0, 8).map((t) => (
                <button key={t.id} type="button" className="cells__btn" aria-pressed={team.toLowerCase() === t.name.toLowerCase()} onClick={() => setTeam(t.name)}>
                  {t.name}
                  <span className="cells__n num">{t.members}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={busy || !name.trim() || ended} aria-busy={busy}>
          {ended ? "This event has ended" : busy ? "Joining" : "Join the event"}
        </button>
        <p className="poster__fine">No account and no app. Your name shows on the venue screen.</p>
      </div>
    </form>
  );
}
