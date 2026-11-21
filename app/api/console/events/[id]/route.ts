import { deleteEvent, setClock, setEventStatus, setPaused, updateEventDetails, type EventStatus } from "@/lib/game";
import { body, handler, json } from "@/lib/http";
import { idParam } from "@/lib/route-ids";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler({ organizer: true }, async (req, ctx: Ctx) => {
  const id = await idParam(ctx.params);
  const b = await body(req);
  if (typeof b.status === "string") setEventStatus(id, b.status as EventStatus);
  if (typeof b.paused === "boolean") setPaused(id, b.paused);
  if (b.roundMinutes !== undefined) setClock(id, b.roundMinutes === null ? null : Number(b.roundMinutes), String(b.roundLabel ?? ""));
  if (b.name !== undefined || b.venue !== undefined || b.blurb !== undefined) {
    updateEventDetails(id, { name: b.name as string, venue: b.venue as string, blurb: b.blurb as string });
  }
  return json({ ok: true });
});

export const DELETE = handler({ organizer: true }, async (_req, ctx: Ctx) => {
  deleteEvent(await idParam(ctx.params));
  return json({ ok: true });
});
