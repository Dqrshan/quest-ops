import { addQuests, GameError, type QuestDraft } from "@/lib/game";
import { body, handler, json } from "@/lib/http";

export const POST = handler({ organizer: true }, async (req, ctx: { params: Promise<{ id: string }> }) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new GameError("Bad event id.");
  const b = await body(req);
  if (!Array.isArray(b.quests) || b.quests.length === 0) throw new GameError("Send at least one quest.");
  if (b.quests.length > 40) throw new GameError("That is too many quests at once.");
  addQuests(id, b.quests as QuestDraft[]);
  return json({ ok: true }, 201);
});
