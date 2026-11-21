import { adjustPoints } from "@/lib/game";
import { body, handler, json } from "@/lib/http";
import { idParam } from "@/lib/route-ids";

export const POST = handler({ organizer: true }, async (req, ctx: { params: Promise<{ id: string }> }) => {
  const b = await body(req);
  adjustPoints(await idParam(ctx.params), Number(b.playerId), b.points, b.reason);
  return json({ ok: true }, 201);
});
