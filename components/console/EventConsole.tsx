"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KindIcon, kindLabel } from "../icons";
import { post } from "./Forms";
import type { QuestDraft, QuestKind, QuestRow } from "@/lib/game";

type EventInfo = { id: number; code: string; name: string; venue: string; blurb: string; status: "draft" | "live" | "ended" };

export function EventControls({
  event,
  totals,
  joinUrl,
}: {
  event: EventInfo;
  totals: { players: number; teams: number; quests: number; completions: number; points: number };
  joinUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setStatus = async (status: EventInfo["status"]) => {
    setBusy(true);
    setError(null);
    try {
      await post(`/api/console/events/${event.id}`, { status }, "PATCH");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="stack stack--lg">
      <div className="between between--top">
        <div className="stack">
          <h1 className="console__h1">{event.name}</h1>
          <p className="muted">{event.venue || "No venue set"}</p>
        </div>
        <div className="row-actions">
          {event.status === "draft" ? (
            <button className="btn btn--primary" disabled={busy || totals.quests === 0} onClick={() => setStatus("live")} title={totals.quests === 0 ? "Add at least one station first" : undefined}>
              Open the doors
            </button>
          ) : null}
          {event.status === "live" ? (
            <button className="btn btn--ghost" disabled={busy} onClick={() => setStatus("ended")}>
              End the event
            </button>
          ) : null}
          {event.status === "ended" ? (
            <button className="btn btn--ghost" disabled={busy} onClick={() => setStatus("live")}>
              Reopen
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="alert" role="alert">{error}</p> : null}

      <dl className="stats">
        <div>
          <dt>Status</dt>
          <dd><span className={`status status--${event.status}`}>{event.status === "draft" ? "Draft" : event.status === "live" ? "Live" : "Ended"}</span></dd>
        </div>
        <div>
          <dt>Join code</dt>
          <dd className="num">{event.code}</dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd className="num">{totals.players}</dd>
        </div>
        <div>
          <dt>Teams</dt>
          <dd className="num">{totals.teams}</dd>
        </div>
        <div>
          <dt>Stations reached</dt>
          <dd className="num">{totals.completions}</dd>
        </div>
      </dl>

      <div className="row-actions">
        <Link className="btn btn--ghost btn--sm" href={`/board/${event.code}`} target="_blank">Venue screen</Link>
        <Link className="btn btn--ghost btn--sm" href={`/play/${event.code}`} target="_blank">Phone view</Link>
        <button
          className="btn btn--ghost btn--sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(joinUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              window.prompt("Copy the join link", joinUrl);
            }
          }}
        >
          {copied ? "Copied" : "Copy join link"}
        </button>
        {confirmDelete ? (
          <>
            <button
              className="btn btn--danger btn--sm"
              onClick={async () => {
                await post(`/api/console/events/${event.id}`, {}, "DELETE");
                router.push("/console");
                router.refresh();
              }}
            >
              Delete for good
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(false)}>Keep it</button>
          </>
        ) : (
          <button className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(true)}>Delete event</button>
        )}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- quest list */

function QuestFields({ q, set }: { q: QuestDraft; set: (p: Partial<QuestDraft>) => void }) {
  return (
    <div className="stack">
      <label className="field">
        <span className="field__label">Title</span>
        <input value={q.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} />
      </label>
      <label className="field">
        <span className="field__label">What the player sees at the station</span>
        <textarea value={q.brief} onChange={(e) => set({ brief: e.target.value })} rows={2} maxLength={400} />
      </label>
      <label className="field">
        <span className="field__label">Where to find it</span>
        <input value={q.hint ?? ""} onChange={(e) => set({ hint: e.target.value })} maxLength={160} />
      </label>
      <div className="grid-3">
        <label className="field">
          <span className="field__label">Type</span>
          <select value={q.kind} onChange={(e) => set({ kind: e.target.value as QuestKind })}>
            <option value="scan">Scan</option>
            <option value="answer">Answer</option>
            <option value="team">Team</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Points</span>
          <input type="number" min={10} max={1000} step={10} value={q.points} onChange={(e) => set({ points: Number(e.target.value) })} />
        </label>
        {q.kind === "team" ? (
          <label className="field">
            <span className="field__label">Teammates needed</span>
            <input type="number" min={2} max={12} value={q.team_size ?? 3} onChange={(e) => set({ team_size: Number(e.target.value) })} />
          </label>
        ) : null}
        {q.kind === "answer" ? (
          <label className="field">
            <span className="field__label">Correct answer</span>
            <input value={q.answer ?? ""} onChange={(e) => set({ answer: e.target.value })} maxLength={80} />
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function QuestList({ eventId, quests }: { eventId: number; quests: QuestRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<QuestDraft | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!quests.length) {
    return <p className="empty">No stations yet. Draft a route with AI, or add stations yourself from the generator panel.</p>;
  }

  return (
    <div className="stack">
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <ol className="qlist">
        {quests.map((q, i) => (
          <li key={q.id} className="qlist__item">
            {editing === q.id && draft ? (
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, draft, "PATCH"))) setEditing(null);
                }}
              >
                <QuestFields q={draft} set={(p) => setDraft({ ...draft, ...p })} />
                <div className="row-actions">
                  <button className="btn btn--primary btn--sm" type="submit" disabled={busy}>Save station</button>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <span className="qlist__n num">{q.position}</span>
                <div className="qlist__main">
                  <p className="qlist__title">{q.title}</p>
                  <p className="qlist__meta">
                    <span className="kind"><KindIcon kind={q.kind} size={14} /> {kindLabel[q.kind]}</span>
                    <span className="num">{q.points} points</span>
                    {q.kind === "team" ? <span className="num">{q.team_size} teammates</span> : null}
                    {q.kind === "answer" ? <span>Answer: <strong>{q.answer}</strong></span> : null}
                  </p>
                  {q.brief ? <p className="qlist__brief">{q.brief}</p> : null}
                </div>
                <div className="qlist__acts">
                  <button className="iconbtn" aria-label={`Move ${q.title} up`} disabled={busy || i === 0} onClick={() => run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, { move: -1 }, "PATCH"))}>
                    <Chevron up />
                  </button>
                  <button className="iconbtn" aria-label={`Move ${q.title} down`} disabled={busy || i === quests.length - 1} onClick={() => run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, { move: 1 }, "PATCH"))}>
                    <Chevron />
                  </button>
                  <button
                    className="linklike"
                    onClick={() => {
                      setEditing(q.id);
                      setDraft({ title: q.title, brief: q.brief, kind: q.kind, points: q.points, answer: q.answer, hint: q.hint, team_size: q.team_size });
                    }}
                  >
                    Edit
                  </button>
                  {deleting === q.id ? (
                    <button className="linklike linklike--danger" onClick={() => run(() => post(`/api/console/events/${eventId}/quests/${q.id}`, {}, "DELETE"))}>
                      Confirm delete
                    </button>
                  ) : (
                    <button className="linklike" onClick={() => setDeleting(q.id)} onBlur={() => setDeleting(null)}>
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

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true" style={up ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M5 9l7 7 7-7" />
    </svg>
  );
}

/* ----------------------------------------------------------------- generator */

type Draft = QuestDraft & { keep: boolean };

export function GeneratorPanel({ eventId, defaults }: { eventId: number; defaults: { venue: string } }) {
  const router = useRouter();
  const [f, setF] = useState({ audience: "", vibe: "", count: 6, difficulty: "medium", includeTeam: true });
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const d = await post<{ provider: string; quests: QuestDraft[]; note?: string }>(`/api/console/events/${eventId}/generate`, { ...f, venue: defaults.venue });
      setDrafts(d.quests.map((q) => ({ ...q, keep: true })));
      setProvider(d.provider);
      setNote(d.note ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate quests.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (list: QuestDraft[]) => {
    setBusy(true);
    setError(null);
    try {
      await post(`/api/console/events/${eventId}/quests`, { quests: list });
      setDrafts(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the stations.");
    } finally {
      setBusy(false);
    }
  };

  const blank: QuestDraft = { title: "", brief: "", kind: "scan", points: 100, hint: "", team_size: 3 };

  if (drafts) {
    const kept = drafts.filter((d) => d.keep);
    return (
      <div className="stack stack--lg">
        <p className="muted">
          {provider === "builtin" ? "Built-in draft." : `Drafted by ${provider}.`} Review before you add. Codewords and answers are yours to check.
        </p>
        {note ? <p className="note">{note}</p> : null}
        {error ? <p className="alert" role="alert">{error}</p> : null}
        <ol className="drafts">
          {drafts.map((d, i) => (
            <li key={i} className={d.keep ? "" : "is-off"}>
              <label className="check">
                <input type="checkbox" checked={d.keep} onChange={(e) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} />
                <span>Add this station</span>
              </label>
              <QuestFields q={d} set={(p) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, ...p } : x)))} />
            </li>
          ))}
        </ol>
        <div className="row-actions">
          <button className="btn btn--primary" disabled={busy || !kept.length} aria-busy={busy} onClick={() => save(kept.map(({ keep: _k, ...q }) => q))}>
            Add {kept.length} {kept.length === 1 ? "station" : "stations"}
          </button>
          <button className="btn btn--ghost" disabled={busy} onClick={() => setDrafts(null)}>Discard</button>
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
          <span className="field__label">Who is coming?</span>
          <input value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} placeholder="Second-year students, hackathon teams" maxLength={120} />
        </label>
        <label className="field">
          <span className="field__label">Theme or vibe</span>
          <input value={f.vibe} onChange={(e) => setF({ ...f, vibe: e.target.value })} placeholder="Heist night, space mission, local food" maxLength={160} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span className="field__label">Stations</span>
            <input type="number" min={3} max={12} value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })} />
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
        {error ? <p className="alert" role="alert">{error}</p> : null}
        <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Drafting the route" : "Draft the route"}
        </button>
      </form>
      <button className="linklike" onClick={() => setDrafts([{ ...blank, keep: true }])}>
        Or add one station by hand
      </button>
    </div>
  );
}
