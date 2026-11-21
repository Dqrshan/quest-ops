import { removePlayer } from "@/lib/game";
import { handler, json } from "@/lib/http";
import { idParam } from "@/lib/route-ids";

export const DELETE = handler({ organizer: true }, async (_req, ctx: { params: Promise<{ id: string; pid: string }> }) => {
  removePlayer(await idParam(ctx.params), await idParam(ctx.params, "pid"));
  return json({ ok: true });
});
