"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Ago } from "../Ago";
import { Feed } from "../LiveBoard";
import {
  IconArrowDown,
  IconArrowUp,
  IconClock,
  IconDownload,
  IconMegaphone,
  IconPause,
  IconPhone,
  IconPlay,
  IconPrint,
  IconScreen,
  IconStop,
  KindIcon,
  kindLabel,
} from "../icons";
import { RoundClock } from "../live/useCountdown";
import { useSnapshot } from "../live/useSnapshot";
import { ErrorLine, post, useAction } from "./Forms";
import { blankQuest, QuestFields } from "./QuestFields";
import type { LiveView, QuestDraft, QuestRow, Snapshot } from "@/lib/game";

export type EventInfo = { id: number; code: string; name: string; venue: string; blurb: string; status: "draft" | "live" | "ended"; paused: boolean };

/* ------------------------------------------------------------------ header */

export function EventHeader({ event, stations }: { event: EventInfo; stations: number }) {
  const { busy, error, run } = useAction();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const patch = (b: object) => run(() => post(`/api/console/events/${event.id}`, b, "PATCH"));

  return (
    <header className="booth__head">
      <div className="booth__title">
        <h1 className="console__h1">{event.name}</h1>
        <p className="booth__meta">
          <StatusChip event={event} />
          <span>
            Join code <strong className="num">{event.code}</strong>
          </span>
          {event.venue ? <span>{event.venue}</span> : null}
        </p>
      </div>
      <div className="booth__controls">
        {event.status === "draft" ? (
          <button className="btn btn--primary" disabled={busy || stations === 0} onClick={() => patch({ status: "live" })} title={stations ? undefined : "Add at least one station first"}>
            <IconPlay size={16} /> Go live
          </button>
        ) : null}
        {event.status === "live" ? (
          <>
            {event.paused ? (
              <button className="btn btn--primary" disabled={busy} onClick={() => patch({ paused: false })}>
                <IconPlay size={16} /> Resume play
              </button>
            ) : (
              <button className="btn btn--ghost" disabled={busy} onClick={() => patch({ paused: true })}>
                <IconPause size={16} /> Pause play
              </button>
            )}
            {confirmEnd ? (
              <span className="confirm">
                <button className="btn btn--danger" disabled={busy} onClick={() => patch({ status: "ended" }).then(() => setConfirmEnd(false))}>
                  End it and roll credits
                </button>
                <button className="btn btn--ghost" onClick={() => setConfirmEnd(false)}>
                  Keep playing
                </button>
              </span>
            ) : (
              <button className="btn btn--ghost" disabled={busy} onClick={() => setConfirmEnd(true)}>
                <IconStop size={14} /> End the event
              </button>
            )}
          </>
        ) : null}
        {event.status === "ended" ? (
          <button className="btn btn--ghost" disabled={busy} onClick={() => patch({ status: "live" })}>
            <IconPlay size={16} /> Reopen
          </button>
        ) : null}
      </div>
      <nav className="booth__links" aria-label="Event outputs">
        <Link className="btn btn--ghost btn--sm" href={`/board/${event.code}`} target="_blank">
          <IconScreen size={16} /> Venue screen
        </Link>
        <Link className="btn btn--ghost btn--sm" href={`/play/${event.code}`} target="_blank">
          <IconPhone size={16} /> Phone view
        </Link>
        <Link className="btn btn--ghost btn--sm" href={`/console/${event.id}/print`}>
          <IconPrint size={16} /> Print tickets
        </Link>
        <a className="btn btn--ghost btn--sm" href={`/api/console/events/${event.id}/export`} download>
          <IconDownload size={16} /> Results CSV
        </a>
      </nav>
      <ErrorLine error={error} />
    </header>
  );
}

function StatusChip({ event }: { event: EventInfo }) {
  if (event.status === "draft") return <span className="chip">Draft</span>;
  if (event.status === "ended") return <span className="chip chip--blood">Ended</span>;
  return event.paused ? <span className="chip chip--blood">Paused</span> : <span className="chip chip--live">Live</span>;
}

/* ---------------------------------------------------------------- live tab */

/** Live standings plus organizer-only data, refreshed whenever the event changes. */
function useLive(eventId: number, code: string, initialSnap: Snapshot, initialLive: LiveView) {
  const { snap, offset, connected } = useSnapshot(code, initialSnap);
  const [live, setLive] = useState(initialLive);
  useEffect(() => {
    if (snap.version === live.snap.version) return;
    const t = setTimeout(() => {
      fetch(`/api/console/events/${eventId}/live`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setLive(d))
        .catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [snap.version, live.snap.version, eventId]);
  return { snap, offset, connected, live };
}

export function LiveTab({ event, initialSnap, initialLive }: { event: EventInfo; initialSnap: Snapshot; initialLive: LiveView }) {
  const { snap, offset, live } = useLive(event.id, event.code, initialSnap, initialLive);
  const players = Math.max(1, snap.totals.players);

  return (
    <div className="booth">
      <section className="panel panel--clock" aria-labelledby="clock-h">
        <h2 id="clock-h" className="panel__h">
          <IconClock /> Round clock
        </h2>
        <RoundClock endsAt={snap.clock.endsAt} label={snap.clock.label} offset={offset} className="booth__clock" />
        {!snap.clock.endsAt ? <p className="muted">No round running. Start one and every phone and the venue screen count down together.</p> : null}
        <ClockControls eventId={event.id} running={Boolean(snap.clock.endsAt)} label={snap.clock.label} />
      </section>

      <section className="panel panel--announce" aria-labelledby="ann-h">
        <h2 id="ann-h" className="panel__h">
          <IconMegaphone /> Announce
        </h2>
        <Announcer eventId={event.id} />
        {snap.announcements.length ? (
          <ul className="announcements">
            {snap.announcements.map((a) => (
              <AnnouncementRow key={a.id} eventId={event.id} a={a} />
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel panel--totals" aria-label="Totals">
        <dl className="stats">
          <div>
            <dt>Players</dt>
            <dd className="num">{snap.totals.players}</dd>
          </div>
          <div>
            <dt>Teams</dt>
            <dd className="num">{snap.totals.teams}</dd>
          </div>
          <div>
            <dt>Stations reached</dt>
            <dd className="num">{snap.totals.completions}</dd>
          </div>
          <div>
            <dt>Stalled</dt>
            <dd className="num">{live.stalled.length}</dd>
          </div>
        </dl>
      </section>

      <section className="panel panel--reach" aria-labelledby="reach-h">
        <h2 id="reach-h" className="panel__h">Where the crowd is</h2>
        {snap.stations.length ? (
          <ol className="reach">
            {snap.stations.map((s) => {
              const share = s.reached / players;
              return (
                <li key={s.id} className={share === 0 && snap.totals.players > 0 ? "reach__row reach__row--cold" : "reach__row"}>
                  <span className="reach__n num">{s.position}</span>
                  <span className="reach__title">
                    {s.title}
                    <span className="reach__kind">
                      <KindIcon kind={s.kind} size={13} /> {kindLabel[s.kind]}
                    </span>
                  </span>
                  <span className="reach__bar" aria-hidden="true">
                    <span style={{ transform: `scaleX(${Math.min(1, share)})` }} />
                  </span>
                  <span className="reach__count num">
                    {s.reached}
                    <span className="visually-hidden"> of {snap.totals.players} players</span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="empty">No stations yet. Add them on the Stations tab.</p>
        )}
      </section>

      <section className="panel panel--stalled" aria-labelledby="stall-h">
        <h2 id="stall-h" className="panel__h">Stalled for 15 minutes</h2>
        {live.stalled.length ? (
          <ul className="stalled">
            {live.stalled.map((p) => (
              <li key={p.id}>
                <span className="stalled__name">{p.name}</span>
                <span className="muted">{p.team ?? "No team"}</span>
                <span className="num">{p.done} reached</span>
                <span className="num stalled__idle">{p.idleMinutes} min</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{snap.event.status === "live" ? "Nobody is stuck. Everyone has scanned in the last 15 minutes." : "Shows players who stop scanning once the event is live."}</p>
        )}
      </section>

      <section className="panel panel--feed" aria-labelledby="feed-h">
        <h2 id="feed-h" className="panel__h">Just now</h2>
        <Feed snap={snap} limit={10} />
      </section>
    </div>
  );
}

function ClockControls({ eventId, running, label }: { eventId: number; running: boolean; label: string }) {
  const [name, setName] = useState(label || "");
  const [custom, setCustom] = useState("");
  const { busy, error, run } = useAction();
  const start = (m: number | null) => run(() => post(`/api/console/events/${eventId}`, { roundMinutes: m, roundLabel: name }, "PATCH"), false);
  return (
    <div className="stack">
      <label className="field">
        <span className="field__label">Round name, optional</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="The witching hour" />
      </label>
      <div className="cells" role="group" aria-label="Start a round">
        {[10, 20, 30, 60].map((m) => (
          <button key={m} type="button" className="cells__btn" disabled={busy} onClick={() => void start(m)}>
            <span className="num">{m}</span> min
          </button>
        ))}
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(custom) > 0) void start(Number(custom));
        }}
      >
        <label className="visually-hidden" htmlFor="custom-min">Custom minutes</label>
        <input id="custom-min" type="number" inputMode="numeric" min={1} max={600} placeholder="Minutes" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn btn--ghost btn--sm" type="submit" disabled={busy || !(Number(custom) > 0)}>
          Start
        </button>
        {running ? (
          <button className="btn btn--ghost btn--sm" type="button" disabled={busy} onClick={() => void start(null)}>
            Stop the clock
          </button>
        ) : null}
      </form>
      <ErrorLine error={error} />
    </div>
  );
}

function Announcer({ eventId }: { eventId: number }) {
  const [body, setBody] = useState("");
  const [tone, setTone] = useState<"info" | "alert">("info");
  const { busy, error, run } = useAction();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => post(`/api/console/events/${eventId}/announcements`, { body, tone }), false)) setBody("");
      }}
    >
      <label className="field">
        <span className="field__label">
          Message to every phone and the venue screen <span className="num muted">{body.length}/200</span>
        </span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={200} placeholder="The organ loft is open. Follow the music upstairs." />
      </label>
      <div className="inline-form">
        <fieldset className="seg">
          <legend className="visually-hidden">Tone</legend>
          <input type="radio" id="tone-info" name="tone" checked={tone === "info"} onChange={() => setTone("info")} />
          <label htmlFor="tone-info">Notice</label>
          <input type="radio" id="tone-alert" name="tone" checked={tone === "alert"} onChange={() => setTone("alert")} />
          <label htmlFor="tone-alert">Alert</label>
        </fieldset>
        <button className="btn btn--primary btn--sm" type="submit" disabled={busy || !body.trim()} aria-busy={busy}>
          Send
        </button>
      </div>
      <ErrorLine error={error} />
    </form>
  );
}

function AnnouncementRow({ eventId, a }: { eventId: number; a: Snapshot["announcements"][number] }) {
  const { busy, run } = useAction();
  return (
    <li className={`announcements__item announcements__item--${a.tone}`}>
      <p>{a.body}</p>
      <Ago at={a.at} />
      <button className="linklike" disabled={busy} onClick={() => void run(() => post(`/api/console/events/${eventId}/announcements?aid=${a.id}`, {}, "DELETE"), false)}>
        Retract
      </button>
    </li>
  );
}

/* ------------------------------------------------------------- players tab */

export function PlayersTab({ event, initialSnap, initialLive }: { event: EventInfo; initialSnap: Snapshot; initialLive: LiveView }) {
  const { live } = useLive(event.id, event.code, initialSnap, initialLive);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? live.players.filter((p) => p.name.toLowerCase().includes(s) || (p.team ?? "").toLowerCase().includes(s)) : live.players;
  }, [live.players, q]);

  return (
    <section className="stack stack--lg" aria-labelledby="pl-h">
      <div className="between">
        <h2 id="pl-h" className="console__h2">
          Players <span className="muted num">{live.players.length}</span>
        </h2>
        <label className="field field--inline">
          <span className="visually-hidden">Find a player or team</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a player or team" />
        </label>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table className="roster">
            <thead>
              <tr>
                <th scope="col" className="num">Place</th>
                <th scope="col">Player</th>
                <th scope="col">Team</th>
                <th scope="col" className="roster__r">Points</th>
                <th scope="col" className="roster__r">Stations</th>
                <th scope="col">Last scan</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <PlayerRow key={p.id} eventId={event.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{live.players.length ? "No player or team matches that search." : "Nobody has joined yet. Share the join code or put the venue screen up."}</p>
      )}
    </section>
  );
}

function PlayerRow({ eventId, p, open, onToggle }: { eventId: number; p: LiveView["players"][number]; open: boolean; onToggle: () => void }) {
  const [points, setPoints] = useState("50");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const { busy, error, run } = useAction();
  const adjust = (sign: 1 | -1) =>
    run(() => post(`/api/console/events/${eventId}/adjust`, { playerId: p.id, points: sign * Math.abs(Number(points)), reason }), false).then((ok) => ok && setReason(""));
  return (
    <>
      <tr>
        <td className="num">{p.rank}</td>
        <th scope="row">{p.name}</th>
        <td className="muted">{p.team ?? "None"}</td>
        <td className="roster__r num">{p.score}</td>
        <td className="roster__r num">{p.done}</td>
        <td>{p.last ? <Ago at={p.last} /> : <span className="muted">Not yet</span>}</td>
        <td className="roster__act">
          <button className="linklike" aria-expanded={open} onClick={onToggle}>
            {open ? "Close" : "Adjust"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="roster__edit">
          <td colSpan={7}>
            <div className="inline-form">
              <label className="field">
                <span className="field__label">Points</span>
                <input type="number" inputMode="numeric" min={1} max={1000} value={points} onChange={(e) => setPoints(e.target.value)} />
              </label>
              <label className="field field--grow">
                <span className="field__label">Reason, shown in the feed</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={80} placeholder="Best costume" />
              </label>
              <button className="btn btn--primary btn--sm" disabled={busy || !(Number(points) > 0)} onClick={() => void adjust(1)}>
                Give points
              </button>
              <button className="btn btn--ghost btn--sm" disabled={busy || !(Number(points) > 0)} onClick={() => void adjust(-1)}>
                Take points
              </button>
              {confirm ? (
                <>
                  <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => void run(() => post(`/api/console/events/${eventId}/players/${p.id}`, {}, "DELETE"), false)}>
                    Remove {p.name}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className="linklike linklike--danger" onClick={() => setConfirm(true)}>
                  Remove player
                </button>
              )}
            </div>
            <ErrorLine error={error} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------ stations tab */

export function QuestList({ eventId, quests }: { eventId: number; quests: QuestRow[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<QuestDraft | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { busy, error, run } = useAction();

  if (!quests.length) return <p className="empty">No stations yet. Draft a route with AI on the right, or add one by hand.</p>;

  return (
    <div className="stack">
      <ErrorLine error={error} />
      <ol className="qlist">
        {quests.map((q, i) => (
          <li key={q.id} className="qlist__item">
            {editing === q.id && draft ? (
              <form
                className="stack qlist__form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, draft, "PATCH"))) setEditing(null);
                }}
              >
                <QuestFields idPrefix={`q${q.id}`} q={draft} set={(p) => setDraft({ ...draft, ...p })} />
                <div className="row-actions">
                  <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>
                    Save station
                  </button>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <span className="qlist__n num">{q.position}</span>
                <div className="qlist__main">
                  <p className="qlist__title">{q.title}</p>
                  <p className="qlist__meta">
                    <span className="kind">
                      <KindIcon kind={q.kind} size={14} /> {kindLabel[q.kind]}
                    </span>
                    <span className="num">{q.points} points</span>
                    {q.kind === "team" ? <span className="num">{q.team_size} teammates</span> : null}
                    {q.kind === "answer" ? (
                      <span>
                        Answer <strong>{q.answer}</strong>
                      </span>
                    ) : null}
                    {q.hint ? <span>{q.hint}</span> : null}
                  </p>
                  {q.brief ? <p className="qlist__brief">{q.brief}</p> : null}
                </div>
                <div className="qlist__acts">
                  <button className="iconbtn" aria-label={`Move ${q.title} earlier`} disabled={busy || i === 0} onClick={() => void run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, { move: -1 }, "PATCH"))}>
                    <IconArrowUp />
                  </button>
                  <button className="iconbtn" aria-label={`Move ${q.title} later`} disabled={busy || i === quests.length - 1} onClick={() => void run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, { move: 1 }, "PATCH"))}>
                    <IconArrowDown />
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setEditing(q.id);
                      setDraft({ title: q.title, brief: q.brief, kind: q.kind, points: q.points, answer: q.answer, hint: q.hint, team_size: q.team_size });
                    }}
                  >
                    Edit
                  </button>
                  {deleting === q.id ? (
                    <>
                      <button className="btn btn--danger btn--sm" disabled={busy} onClick={() => void run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, {}, "DELETE"))}>
                        Delete for good
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setDeleting(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button className="btn btn--ghost btn--sm" onClick={() => setDeleting(q.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

type Draft = QuestDraft & { keep: boolean };

export function GeneratorPanel({ eventId, venue, hasStory }: { eventId: number; venue: string; hasStory: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ audience: "", vibe: "", count: 6, difficulty: "medium", includeTeam: true });
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [story, setStory] = useState("");
  const [useStory, setUseStory] = useState(!hasStory);
  const [note, setNote] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  const generate = () =>
    run(async () => {
      const d = await post<{ provider: string; story: string; quests: QuestDraft[]; note?: string }>(`/api/console/events/${eventId}/generate`, { ...f, venue });
      setDrafts(d.quests.map((q) => ({ ...q, keep: true })));
      setStory(d.story);
      setNote(d.note ?? `Drafted by ${d.provider}.`);
    }, false);

  const save = (list: QuestDraft[]) =>
    run(async () => {
      await post(`/api/console/events/${eventId}/quests`, { quests: list });
      if (useStory && story) await post(`/api/console/events/${eventId}`, { blurb: story }, "PATCH");
      setDrafts(null);
      router.refresh();
    }, false);

  if (drafts) {
    const kept = drafts.filter((d) => d.keep);
    return (
      <div className="stack stack--lg">
        {note ? <p className="note">{note} Check every codeword before you print.</p> : null}
        {story ? (
          <label className="check">
            <input type="checkbox" checked={useStory} onChange={(e) => setUseStory(e.target.checked)} />
            <span>Use the new storyline on the join screen: {story}</span>
          </label>
        ) : null}
        <ol className="drafts">
          {drafts.map((d, i) => (
            <li key={i} className={d.keep ? "" : "is-off"}>
              <div className="drafts__head">
                <span className="drafts__n num">{i + 1}</span>
                <label className="check">
                  <input type="checkbox" checked={d.keep} onChange={(e) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} />
                  <span>Keep</span>
                </label>
              </div>
              <QuestFields idPrefix={`g${i}`} q={d} set={(p) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, ...p } : x)))} />
            </li>
          ))}
        </ol>
        <ErrorLine error={error} />
        <div className="row-actions">
          <button className="btn btn--primary" disabled={busy || !kept.length} aria-busy={busy} onClick={() => void save(kept.map(({ keep: _k, ...q }) => q))}>
            Add {kept.length} {kept.length === 1 ? "station" : "stations"}
          </button>
          <button className="btn btn--ghost" disabled={busy} onClick={() => setDrafts(null)}>
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        <label className="field">
          <span className="field__label">Who is coming</span>
          <input value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} placeholder="Students in teams of four" maxLength={120} />
        </label>
        <label className="field">
          <span className="field__label">Theme or vibe</span>
          <input value={f.vibe} onChange={(e) => setF({ ...f, vibe: e.target.value })} placeholder="Cursed museum" maxLength={160} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span className="field__label">Stations</span>
            <input type="number" inputMode="numeric" min={3} max={12} value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })} />
          </label>
          <label className="field">
            <span className="field__label">Difficulty</span>
            <select value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.includeTeam} onChange={(e) => setF({ ...f, includeTeam: e.target.checked })} />
          <span>Include team stations</span>
        </label>
        <ErrorLine error={error} />
        <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Writing the route" : "Draft stations"}
        </button>
      </form>
      <button className="linklike" onClick={() => setDrafts([{ ...blankQuest, keep: true }])}>
        Or add one station by hand
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ settings tab */

export function SettingsTab({ event }: { event: EventInfo }) {
  const router = useRouter();
  const [f, setF] = useState({ name: event.name, venue: event.venue, blurb: event.blurb });
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");
  const { busy, error, run } = useAction();
  return (
    <div className="settings">
      <form
        className="stack stack--lg"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(false);
          if (await run(() => post(`/api/console/events/${event.id}`, f, "PATCH"))) setSaved(true);
        }}
      >
        <h2 className="console__h2">Event details</h2>
        <label className="field">
          <span className="field__label">Name</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} />
        </label>
        <label className="field">
          <span className="field__label">Venue</span>
          <input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} maxLength={120} />
        </label>
        <label className="field">
          <span className="field__label">Storyline, shown on the join screen</span>
          <textarea value={f.blurb} onChange={(e) => setF({ ...f, blurb: e.target.value })} rows={4} maxLength={600} />
        </label>
        <ErrorLine error={error} />
        <div className="row-actions">
          <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>
            Save details
          </button>
          {saved ? (
            <span className="muted" role="status">
              Saved
            </span>
          ) : null}
        </div>
      </form>
      <section className="danger-zone stack" aria-labelledby="dz-h">
        <h2 id="dz-h" className="console__h2">Delete the event</h2>
        <p className="muted">Deletes the stations, players and scores. This cannot be undone. Type the join code to confirm.</p>
        <div className="inline-form">
          <label className="visually-hidden" htmlFor="dz">Join code</label>
          <input id="dz" value={confirm} onChange={(e) => setConfirm(e.target.value.toUpperCase())} placeholder={event.code} autoCapitalize="characters" />
          <button
            className="btn btn--danger"
            disabled={busy || confirm !== event.code}
            onClick={() =>
              void run(async () => {
                await post(`/api/console/events/${event.id}`, {}, "DELETE");
                router.push("/console");
              }, false)
            }
          >
            Delete for good
          </button>
        </div>
      </section>
    </div>
  );
}
