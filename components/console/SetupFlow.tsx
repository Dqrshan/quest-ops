"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorLine, post, useAction } from "./Forms";
import { blankQuest, QuestFields } from "./QuestFields";
import type { QuestDraft } from "@/lib/game";

const PROVIDER: Record<string, string> = { groq: "Groq", anthropic: "Claude", openai: "OpenAI", builtin: "the built-in packs" };
type Draft = QuestDraft & { keep: boolean };
const STEPS = ["The event", "The brief", "The route"] as const;

/** Guided setup: details, an AI brief, review of the drafted route, then create. */
export function SetupFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ name: "", venue: "", audience: "" });
  const [brief, setBrief] = useState({ vibe: "", count: 7, difficulty: "medium", includeTeam: true });
  const [story, setStory] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [source, setSource] = useState<{ provider: string; note?: string } | null>(null);
  const { busy, error, setError, run } = useAction();

  const draft = () =>
    run(async () => {
      const d = await post<{ provider: string; story: string; quests: QuestDraft[]; note?: string }>("/api/console/generate", {
        eventName: details.name,
        venue: details.venue,
        audience: details.audience,
        ...brief,
      });
      setStory(d.story);
      setDrafts(d.quests.map((q) => ({ ...q, keep: true })));
      setSource({ provider: d.provider, note: d.note });
      setStep(2);
    }, false);

  const create = (withRoute: boolean) =>
    run(async () => {
      const { event } = await post<{ event: { id: number } }>("/api/console/events", { name: details.name, venue: details.venue, blurb: story });
      const kept = drafts.filter((d) => d.keep).map(({ keep: _k, ...q }) => q);
      if (withRoute && kept.length) await post(`/api/console/events/${event.id}/quests`, { quests: kept });
      router.push(`/console/${event.id}?tab=${withRoute ? "live" : "stations"}`);
    }, false);

  const kept = drafts.filter((d) => d.keep).length;

  return (
    <div className="setup">
      <ol className="setup__steps" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={i < step ? "is-done" : undefined}>
            <span className="num">{i + 1}</span> {s}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <form
          className="setup__panel stack stack--lg"
          onSubmit={(e) => {
            e.preventDefault();
            if (!details.name.trim()) return setError("Give the event a name.");
            setError(null);
            setStep(1);
          }}
        >
          <h2 className="console__h2">What is the event?</h2>
          <label className="field">
            <span className="field__label">Event name</span>
            <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} required maxLength={80} autoFocus placeholder="The Haunted Hackathon" />
          </label>
          <label className="field">
            <span className="field__label">Venue, optional</span>
            <input value={details.venue} onChange={(e) => setDetails({ ...details, venue: e.target.value })} maxLength={120} placeholder="Old library, three floors" />
          </label>
          <label className="field">
            <span className="field__label">Who is coming, optional</span>
            <input value={details.audience} onChange={(e) => setDetails({ ...details, audience: e.target.value })} maxLength={120} placeholder="120 students in teams of four" />
          </label>
          <ErrorLine error={error} />
          <div className="row-actions">
            <button className="btn btn--primary" type="submit">
              Next: the brief
            </button>
          </div>
        </form>
      ) : null}

      {step === 1 ? (
        <form
          className="setup__panel stack stack--lg"
          onSubmit={(e) => {
            e.preventDefault();
            void draft();
          }}
        >
          <h2 className="console__h2">Brief the writer</h2>
          <p className="muted">The AI drafts a storyline and a route of stations. You review every one before anything is saved.</p>
          <label className="field">
            <span className="field__label">Theme or vibe</span>
            <input value={brief.vibe} onChange={(e) => setBrief({ ...brief, vibe: e.target.value })} maxLength={160} placeholder="Haunted house, mad scientist, cursed museum" />
          </label>
          <div className="grid-2">
            <label className="field">
              <span className="field__label">Stations</span>
              <input type="number" inputMode="numeric" min={3} max={12} value={brief.count} onChange={(e) => setBrief({ ...brief, count: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span className="field__label">Difficulty</span>
              <select value={brief.difficulty} onChange={(e) => setBrief({ ...brief, difficulty: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={brief.includeTeam} onChange={(e) => setBrief({ ...brief, includeTeam: e.target.checked })} />
            <span>Include team stations</span>
          </label>
          <ErrorLine error={error} />
          <div className="row-actions">
            <button className="btn btn--primary" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? "Writing the route" : "Draft the route"}
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="linklike" type="button" disabled={busy} onClick={() => void create(false)}>
              Skip, I will add stations myself
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="setup__panel stack stack--lg">
          <h2 className="console__h2">Review the route</h2>
          {source ? (
            <p className={source.provider === "builtin" ? "note" : "muted"}>
              {source.note ?? `Drafted by ${PROVIDER[source.provider] ?? source.provider}.`} Check every codeword: you print it on the station sign.
            </p>
          ) : null}
          <label className="field">
            <span className="field__label">Storyline, shown on the join screen</span>
            <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={3} maxLength={600} />
          </label>
          <ol className="drafts">
            {drafts.map((d, i) => (
              <li key={i} className={d.keep ? "" : "is-off"}>
                <div className="drafts__head">
                  <span className="drafts__n num">{i + 1}</span>
                  <label className="check">
                    <input type="checkbox" checked={d.keep} onChange={(e) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))} />
                    <span>Keep this station</span>
                  </label>
                </div>
                <QuestFields idPrefix={`d${i}`} q={d} set={(p) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, ...p } : x)))} />
              </li>
            ))}
          </ol>
          <button className="linklike" type="button" onClick={() => setDrafts([...drafts, { ...blankQuest, keep: true }])}>
            Add a station by hand
          </button>
          <ErrorLine error={error} />
          <div className="row-actions setup__go">
            <button className="btn btn--primary" type="button" disabled={busy || !kept} aria-busy={busy} onClick={() => void create(true)}>
              Create the event with {kept} {kept === 1 ? "station" : "stations"}
            </button>
            <button className="btn btn--ghost" type="button" disabled={busy} onClick={() => void draft()}>
              Draft again
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
