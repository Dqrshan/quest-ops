import { ORGANIZER_COOKIE } from "@/lib/auth";
import { handler, json } from "@/lib/http";

export const POST = handler({}, async () => {
  const res = json({ ok: true });
  res.cookies.delete(ORGANIZER_COOKIE);
  return res;
});
