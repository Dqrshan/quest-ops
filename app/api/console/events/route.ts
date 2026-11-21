import { createEvent } from "@/lib/game";
import { body, handler, json } from "@/lib/http";

export const POST = handler({ organizer: true }, async (req) => {
  const b = await body(req);
  const event = createEvent({ name: String(b.name ?? ""), venue: String(b.venue ?? ""), blurb: String(b.blurb ?? "") });
  return json({ event }, 201);
});
