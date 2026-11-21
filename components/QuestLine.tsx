import { IconCheck, KindIcon, kindLabel } from "./icons";
import type { PublicQuest } from "@/lib/game";

export type LineQuest = PublicQuest & { done?: boolean; teamHave?: number };

/** The route a participant walks: one station per quest. Used on phones, in the demo frame and on the venue screen. */
export function QuestLine({ quests, onOpen }: { quests: LineQuest[]; onOpen?: (q: LineQuest) => void }) {
  const next = quests.find((q) => !q.done)?.id;
  return (
    <ol className="line" aria-label="Quest line">
      {quests.map((q) => {
        const state = q.done ? "done" : q.id === next ? "next" : "todo";
        const inner = (
          <>
            <span className="line__mark" aria-hidden="true">
              {q.done ? <IconCheck size={16} /> : <KindIcon kind={q.kind} size={16} />}
            </span>
            <span className="line__body">
              <span className="line__title">{q.title}</span>
              <span className="line__sub">
                {q.done
                  ? "Reached"
                  : q.kind === "team"
                    ? `${kindLabel.team}: ${q.teamHave ?? 0} of ${q.team_size} teammates`
                    : (q.hint ?? kindLabel[q.kind])}
              </span>
            </span>
            <span className="line__pts num">
              {q.points}
              <span className="visually-hidden"> points</span>
            </span>
          </>
        );
        return (
          <li key={q.id} className={`line__stop line__stop--${state}`}>
            {onOpen && !q.done ? (
              <button type="button" className="line__btn" onClick={() => onOpen(q)} aria-label={`${q.title}, ${q.points} points. Scan or enter code`}>
                {inner}
              </button>
            ) : (
              <div className="line__btn line__btn--static">{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
