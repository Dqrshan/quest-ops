import { ORGANIZER_COOKIE, organizerToken, passcodeMatches } from "@/lib/auth";
import { body, handler, json } from "@/lib/http";

export const POST = handler({}, async (req) => {
  const token = organizerToken();
  if (!token) return json({ error: "No passcode is configured on this server." }, 400);
  const { passcode } = await body(req);
  if (typeof passcode !== "string" || !passcodeMatches(passcode)) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "That passcode is not right." }, 401);
  }
  const res = json({ ok: true });
  res.cookies.set(ORGANIZER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
});
