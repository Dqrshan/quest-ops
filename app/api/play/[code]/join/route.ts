import { joinEvent, personalFrame } from "@/lib/game";
import { body, handler, json } from "@/lib/http";
import { playerCookie } from "@/lib/player-session";

export const POST = handler({}, async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params;
  const b = await body(req);
  const { player, event } = joinEvent(code, String(b.name ?? ""), String(b.team ?? ""));
  const res = json(personalFrame(event, player), 201);
  res.cookies.set(playerCookie(event.code), player.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});
