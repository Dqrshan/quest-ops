import { personalFrame } from "@/lib/game";
import { handler, json } from "@/lib/http";
import { sessionFor } from "@/lib/player-session";

export const GET = handler({}, async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const { event, player } = await sessionFor((await ctx.params).code);
  return json(personalFrame(event, player));
});
