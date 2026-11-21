import { cookies } from "next/headers";
import { getEventByCode, getPlayerByToken, personalFrame } from "@/lib/game";
import { playerCookie } from "@/lib/player-session";
import { sseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

/** One phone's live view: its rank, score, level, stations, the clock and announcements. */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const event = getEventByCode((await ctx.params).code);
  if (!event) return Response.json({ error: "No event with that code." }, { status: 404 });
  const jar = await cookies();
  const player = getPlayerByToken(event.id, jar.get(playerCookie(event.code))?.value);
  return sseResponse(req, event.id, () => personalFrame(event, player));
}
