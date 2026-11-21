import { generateQuests, parseInput } from "@/lib/ai";
import { GameError, getEventById } from "@/lib/game";
import { body, handler, json } from "@/lib/http";

export const maxDuration = 60;

export const POST = handler({ organizer: true }, async (req, ctx: { params: Promise<{ id: string }> }) => {
  const id = Number((await ctx.params).id);
  const event = Number.isInteger(id) ? getEventById(id) : undefined;
  if (!event) throw new GameError("Event not found.", 404);
  const b = await body(req);
  const result = await generateQuests(parseInput({ eventName: event.name, venue: event.venue, ...b }));
  return json(result);
});
