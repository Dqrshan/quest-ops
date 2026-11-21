import { getEventByCode } from "@/lib/game";
import { sseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

/** Live snapshot for the venue screen, the console and the landing demo. Shares one loop per event. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const event = getEventByCode((await ctx.params).code);
  if (!event) return Response.json({ error: "No event with that code." }, { status: 404 });
  return sseResponse(req, event.id, (f) => ({ ...f.snap, now: Date.now() }));
}
