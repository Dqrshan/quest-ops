import type { FeedItem } from "./game";

/** One feed item as a sentence: who did what. Shared by server and client components. */
export function feedLine(f: FeedItem) {
  if (f.kind === "bonus") return { who: f.team ?? "A team", what: `unlocked the team bonus at ${f.quest}` };
  if (f.kind === "adjust") return { who: f.player ?? "A player", what: f.reason || (f.points > 0 ? "got points from the organizer" : "lost points") };
  return { who: f.player ?? "A player", what: f.first ? `was first to reach ${f.quest}` : `reached ${f.quest}` };
}
