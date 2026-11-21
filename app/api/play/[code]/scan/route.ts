import { checkIn, GameError, personalFrame } from "@/lib/game";
import { body, handler, json } from "@/lib/http";
import { sessionFor } from "@/lib/player-session";

export const POST = handler({}, async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { event, player } = await sessionFor((await ctx.params).code);
  if (!player) throw new GameError("Join the event first. It takes one name.", 401);
  const b = await body(req);
  const answer = typeof b.answer === "string" ? b.answer : undefined;
  const result = checkIn(event, player, String(b.token ?? ""), answer);
  return json({ result, frame: personalFrame(event, player) });
});
