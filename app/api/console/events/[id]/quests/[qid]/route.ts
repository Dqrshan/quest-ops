import { deleteQuest, GameError, moveQuest, updateQuest, type QuestDraft } from "@/lib/game";
import { body, handler, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; qid: string }> };

async function ids(ctx: Ctx) {
  const p = await ctx.params;
  const id = Number(p.id);
  const qid = Number(p.qid);
  if (!Number.isInteger(id) || !Number.isInteger(qid)) throw new GameError("Bad id.");
  return { id, qid };
}

export const PATCH = handler({ organizer: true }, async (req, ctx: Ctx) => {
  const { id, qid } = await ids(ctx);
  const b = await body(req);
  if (b.move === -1 || b.move === 1) moveQuest(id, qid, b.move);
  else updateQuest(id, qid, b as unknown as QuestDraft);
  return json({ ok: true });
});

export const DELETE = handler({ organizer: true }, async (_req, ctx: Ctx) => {
  const { id, qid } = await ids(ctx);
  deleteQuest(id, qid);
  return json({ ok: true });
});
