import { deleteEvent, GameError, setEventStatus, updateEventDetails, type EventStatus } from "@/lib/game";
import { body, handler, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

async function eventId(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new GameError("Bad event id.", 400);
  return id;
}

export const PATCH = handler({ organizer: true }, async (req, ctx: Ctx) => {
  const id = await eventId(ctx);
  const b = await body(req);
  if (typeof b.status === "string") setEventStatus(id, b.status as EventStatus);
  if (b.name !== undefined || b.venue !== undefined || b.blurb !== undefined) {
    updateEventDetails(id, { name: b.name as string, venue: b.venue as string, blurb: b.blurb as string });
  }
  return json({ ok: true });
});

export const DELETE = handler({ organizer: true }, async (_req, ctx: Ctx) => {
  deleteEvent(await eventId(ctx));
  return json({ ok: true });
});
