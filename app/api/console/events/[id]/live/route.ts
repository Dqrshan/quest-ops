import { liveView } from "@/lib/game";
import { handler, json } from "@/lib/http";
import { idParam } from "@/lib/route-ids";

export const GET = handler({ organizer: true }, async (_req, ctx: { params: Promise<{ id: string }> }) => {
  return json(liveView(await idParam(ctx.params)));
});
