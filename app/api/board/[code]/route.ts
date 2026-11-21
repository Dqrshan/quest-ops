import { GameError, getEventByCode, snapshot } from "@/lib/game";
import { handler, json } from "@/lib/http";

export const GET = handler({}, async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const event = getEventByCode((await ctx.params).code);
  if (!event) throw new GameError("No event with that code.", 404);
  return json(snapshot(event));
});
