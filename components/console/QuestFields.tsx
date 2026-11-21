"use client";
import type { QuestDraft, QuestKind } from "@/lib/game";

/** The editable fields of one station. Shared by the setup flow, the AI review and the station list. */
export function QuestFields({ q, set, idPrefix }: { q: QuestDraft; set: (p: Partial<QuestDraft>) => void; idPrefix: string }) {
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className="qfields">
      <div className="field qfields__title">
        <label className="field__label" htmlFor={id("title")}>Title</label>
        <input id={id("title")} value={q.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} />
      </div>
      <div className="field qfields__brief">
        <label className="field__label" htmlFor={id("brief")}>What the player sees at the station</label>
        <textarea id={id("brief")} value={q.brief} onChange={(e) => set({ brief: e.target.value })} rows={2} maxLength={400} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={id("hint")}>Where to find it</label>
        <input id={id("hint")} value={q.hint ?? ""} onChange={(e) => set({ hint: e.target.value })} maxLength={160} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={id("kind")}>Type</label>
        <select id={id("kind")} value={q.kind} onChange={(e) => set({ kind: e.target.value as QuestKind })}>
          <option value="scan">Scan: reach it</option>
          <option value="answer">Answer: enter a codeword</option>
          <option value="team">Team: crew scans together</option>
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor={id("points")}>Points</label>
        <input id={id("points")} type="number" inputMode="numeric" min={10} max={1000} step={10} value={q.points} onChange={(e) => set({ points: Number(e.target.value) })} />
      </div>
      {q.kind === "team" ? (
        <div className="field">
          <label className="field__label" htmlFor={id("size")}>Teammates needed</label>
          <input id={id("size")} type="number" inputMode="numeric" min={2} max={12} value={q.team_size ?? 3} onChange={(e) => set({ team_size: Number(e.target.value) })} />
        </div>
      ) : null}
      {q.kind === "answer" ? (
        <div className="field">
          <label className="field__label" htmlFor={id("answer")}>Correct answer</label>
          <input id={id("answer")} value={q.answer ?? ""} onChange={(e) => set({ answer: e.target.value })} maxLength={80} autoCapitalize="off" />
        </div>
      ) : null}
    </div>
  );
}

export const blankQuest: QuestDraft = { title: "", brief: "", kind: "scan", points: 100, hint: "", team_size: 3 };
