import { generateQuests, parseInput } from "@/lib/ai";
import { body, handler, json } from "@/lib/http";

export const maxDuration = 60;

/** Draft a route before the event exists, for the guided setup. */
export const POST = handler({ organizer: true }, async (req) => json(await generateQuests(parseInput(await body(req)))));
