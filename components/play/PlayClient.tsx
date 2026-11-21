"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuestLine, type LineQuest } from "../QuestLine";
import { IconCheck } from "../icons";
import { Scanner } from "./Scanner";
import type { CompleteResult, PlayerView } from "@/lib/game";

type EventInfo = { code: string; name: string; venue: string; status: "draft" | "live" | "ended" };
type Tab = "line" | "scan" | "rank";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

export function PlayClient({ code, initialToken }: { code: string; initialToken?: string }) {
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [view, setView] = useState<PlayerView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("line");
  const [station, setStation] = useState<{ token: string; result: CompleteResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<string | undefined>(initialToken);

  const refresh = useCallback(async () => {
    try {
      const d = await api<{ event: EventInfo; view: PlayerView | null }>(`/api/play/${code}/me`);
      setEvent(d.event);
      setView(d.view);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the event.");
    } finally {
      setLoaded(true);
    }
  }, [code]);

  const scan = useCallback(
    async (token: string, answer?: string) => {
      setBusy(true);
      setError(null);
      try {
        const d = await api<{ result: CompleteResult; view: PlayerView }>(`/api/play/${code}/scan`, {
          method: "POST",
          body: JSON.stringify({ token, answer }),
        });
        setView(d.view);
        setStation({ token, result: d.result });
        setTab("line");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not check in.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Open the quest link that brought the player here, once they are in.
  useEffect(() => {
    if (view && pending.current) {
      const t = pending.current;
      pending.current = undefined;
      window.history.replaceState(null, "", `/play/${code}`);
      scan(t);
    }
  }, [view, scan, code]);

  // Re-pull rank when anything on the board changes.
  useEffect(() => {
    if (!view || typeof EventSource === "undefined") return;
    const es = new EventSource(`/api/board/${code}/stream`);
    let first = true;
    es.onmessage = () => {
      if (first) {
        first = false;
        return;
      }
      refresh();
    };
    return () => es.close();
  }, [code, view?.me.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <main className="play"><p className="note" role="status">Loading the event</p></main>;
  if (!event) return <main className="play"><Failure message={error ?? "No event with that code."} /></main>;

  if (!view) {
    return (
      <main className="play">
        <JoinForm code={code} event={event} hasQuest={Boolean(initialToken)} onJoined={(v) => setView(v)} />
      </main>
    );
  }

  const onOpen = (_q: LineQuest) => {
    setError(null);
    setStation(null);
    setTab("scan");
  };

  return (
    <main className="play">
      <header className="play__head">
        <div>
          <h1 className="play__event">{event.name}</h1>
          <p className="play__who">
            {view.me.name}
            {view.me.team ? `, ${view.me.team}` : ""}
          </p>
        </div>
        <p className="play__score num" aria-label={`${view.me.score} points`}>
          {view.me.score}
        </p>
      </header>

      {event.status !== "live" ? (
        <p className="note" role="status">
          {event.status === "draft" ? "The organizer has not opened the doors yet. You are on the list." : "This event has ended. Final scores are on the Rank tab."}
        </p>
      ) : null}

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      {station ? (
        <StationPanel
          key={station.token}
          result={station.result}
          busy={busy}
          onAnswer={(a) => scan(station.token, a)}
          onClose={() => {
            setStation(null);
            setError(null);
          }}
        />
      ) : null}

      <div className="play__body">
        {tab === "line" ? (
          <section aria-labelledby="line-h">
            <h2 id="line-h" className="play__h">Your line</h2>
            {view.quests.length ? (
              <QuestLine quests={view.quests} onOpen={onOpen} />
            ) : (
              <p className="empty">No stations yet. The organizer is still setting up.</p>
            )}
          </section>
        ) : null}
        {tab === "scan" ? (
          <section aria-labelledby="scan-h">
            <h2 id="scan-h" className="play__h">Scan a station</h2>
            <Scanner
              active={tab === "scan"}
              onToken={async (t) => {
                const ok = await scan(t);
                if (!ok) setTab("scan");
              }}
            />
          </section>
        ) : null}
        {tab === "rank" ? <RankTab code={code} view={view} /> : null}
      </div>

      <nav className="tabs" aria-label="Sections">
        {(
          [
            ["line", "Line"],
            ["scan", "Scan"],
            ["rank", "Rank"],
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
    </main>
  );
}

function Failure({ message }: { message: string }) {
  return (
    <div className="stack">
      <h1 className="play__event">Event not found</h1>
      <p className="alert" role="alert">{message}</p>
      <p>Check the code on the poster. It is six characters.</p>
    </div>
  );
}

function JoinForm({ code, event, hasQuest, onJoined }: { code: string; event: EventInfo; hasQuest: boolean; onJoined: (v: PlayerView) => void }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [teams, setTeams] = useState<{ id: number; name: string; members: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ teams: typeof teams }>(`/api/play/${code}/teams`).then((d) => setTeams(d.teams)).catch(() => {});
  }, [code]);

  const ended = event.status === "ended";
  return (
    <form
      className="stack stack--lg"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const d = await api<{ view: PlayerView }>(`/api/play/${code}/join`, { method: "POST", body: JSON.stringify({ name, team }) });
          onJoined(d.view);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not join.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="stack">
        <h1 className="play__event play__event--big">{event.name}</h1>
        {event.venue ? <p className="play__who">{event.venue}</p> : null}
        <p>{hasQuest ? "Join to count this station. It takes one name." : "Walk the line, scan the stations, climb the board."}</p>
      </div>
      <label className="field">
        <span className="field__label">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={32} autoComplete="nickname" enterKeyHint="next" disabled={ended} />
      </label>
      <div className="field">
        <label className="field__label" htmlFor="team">Team (optional)</label>
        <input id="team" value={team} onChange={(e) => setTeam(e.target.value)} maxLength={32} placeholder="Pick one or name a new one" enterKeyHint="go" disabled={ended} />
        {teams.length ? (
          <div className="cells" role="group" aria-label="Existing teams">
            {teams.slice(0, 8).map((t) => (
              <button key={t.id} type="button" className="cells__btn" aria-pressed={team.toLowerCase() === t.name.toLowerCase()} onClick={() => setTeam(t.name)}>
                {t.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button className="btn btn--primary btn--block" type="submit" disabled={busy || !name.trim() || ended} aria-busy={busy}>
        {ended ? "This event has ended" : busy ? "Joining" : "Join the event"}
      </button>
    </form>
  );
}

function StationPanel({ result, busy, onAnswer, onClose }: { result: CompleteResult; busy: boolean; onAnswer: (a: string) => Promise<boolean>; onClose: () => void }) {
  const [answer, setAnswer] = useState("");
  const q = result.quest;
  if (result.status === "arrived") {
    return (
      <section className="plate plate--paper" aria-labelledby="st-h">
        <h2 id="st-h" className="plate__title">{q.title}</h2>
        <p>{q.brief}</p>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await onAnswer(answer)) setAnswer("");
          }}
        >
          <label className="field">
            <span className="field__label">Your answer</span>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </label>
          <div className="row-actions">
            <button className="btn btn--primary" type="submit" disabled={busy || !answer.trim()} aria-busy={busy}>
              Check answer
            </button>
            <button className="btn btn--ghost" type="button" onClick={onClose}>
              Not now
            </button>
          </div>
        </form>
      </section>
    );
  }
  return (
    <section className="plate" aria-labelledby="st-h" role="status">
      <h2 id="st-h" className="plate__title">
        {result.repeat ? "Already counted" : "Station reached"}
      </h2>
      <p className="plate__station">{q.title}</p>
      {!result.repeat ? (
        <p className="plate__fig num">
          +{result.awarded}
          {result.teamBonus ? <span className="plate__bonus"> and +{result.teamBonus} for your team</span> : null}
        </p>
      ) : null}
      {result.teamProgress ? (
        <p>
          {result.teamProgress.have >= result.teamProgress.need
            ? "Your whole crew made it."
            : `${result.teamProgress.have} of ${result.teamProgress.need} teammates have scanned. Bring the rest.`}
        </p>
      ) : null}
      {q.brief ? <p className="plate__brief">{q.brief}</p> : null}
      <button className="btn btn--accent" type="button" onClick={onClose}>
        <IconCheck size={16} /> Back to the line
      </button>
    </section>
  );
}

function RankTab({ code, view }: { code: string; view: PlayerView }) {
  const [top, setTop] = useState<{ players: { id: number; name: string; team: string | null; score: number }[]; teams: { id: number; name: string; score: number }[] } | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/board/${code}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => alive && setTop(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [code, view.me.score]);

  return (
    <section aria-labelledby="rank-h" className="stack stack--lg">
      <h2 id="rank-h" className="play__h">Rank</h2>
      <dl className="facts">
        <div>
          <dt>You</dt>
          <dd className="num">{view.me.rank ? `${view.me.rank} of ${view.me.of}` : "Not ranked yet"}</dd>
        </div>
        {view.team ? (
          <div>
            <dt>{view.team.name}</dt>
            <dd className="num">{`${view.team.rank} of ${view.team.of}, ${view.team.score} points`}</dd>
          </div>
        ) : null}
      </dl>
      {top ? (
        <>
          {top.teams.length ? (
            <div className="stack">
              <h3>Teams</h3>
              <ol className="mini">
                {top.teams.slice(0, 5).map((t, i) => (
                  <li key={t.id}>
                    <span className="num">{i + 1}</span>
                    <span>{t.name}</span>
                    <span className="num">{t.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="stack">
            <h3>Players</h3>
            <ol className="mini">
              {top.players.slice(0, 8).map((p, i) => (
                <li key={p.id} aria-current={p.id === view.me.id ? "true" : undefined}>
                  <span className="num">{i + 1}</span>
                  <span>{p.name}</span>
                  <span className="num">{p.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : null}
    </section>
  );
}
