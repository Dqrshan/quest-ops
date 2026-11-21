import { addAnnouncement, deleteAnnouncement } from "@/lib/game";
import { body, handler, json } from "@/lib/http";
import { idParam } from "@/lib/route-ids";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler({ organizer: true }, async (req, ctx: Ctx) => {
  const b = await body(req);
  return json({ announcement: addAnnouncement(await idParam(ctx.params), b.body, b.tone) }, 201);
});

export const DELETE = handler({ organizer: true }, async (req, ctx: Ctx) => {
  const id = await idParam(ctx.params);
  const aid = Number(new URL(req.url).searchParams.get("aid"));
  if (Number.isInteger(aid)) deleteAnnouncement(id, aid);
  return json({ ok: true });
});
