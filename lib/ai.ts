import crypto from "node:crypto";
import { clean, type QuestDraft, type QuestKind } from "./game";

export type GenerateInput = {
  eventName: string;
  venue: string;
  audience: string;
  vibe: string;
  count: number;
  difficulty: "easy" | "medium" | "hard";
  includeTeam: boolean;
};

export type GenerateResult = { provider: "anthropic" | "openai" | "builtin"; quests: QuestDraft[]; note?: string };

const SYSTEM = `You design real-world quests for live events. Participants walk between physical stations, each marked with a QR code.
Return ONLY a JSON array, no prose, no code fences. Each item:
{"title": string (max 6 words), "brief": string (1-2 sentences, what the participant does or is asked at the station),
 "kind": "scan" | "answer" | "team", "points": integer 50-300,
 "answer": string (required for "answer": a short word or phrase the participant reads from a sign or already knows, never trivia the organizer cannot verify),
 "hint": string (where to find the station, max 12 words, no invented room names unless given),
 "team_size": integer 2-6 (only for "team": how many teammates must scan)}
Rules: "scan" = reach the station. "answer" = read a codeword or answer a question about the event. "team" = several teammates must reach the station.
Order quests as a route. Do not invent facts about the venue. Keep tone playful, short, concrete.`;

function userPrompt(i: GenerateInput) {
  return [
    `Event: ${i.eventName}`,
    i.venue && `Venue: ${i.venue}`,
    i.audience && `Audience: ${i.audience}`,
    i.vibe && `Theme or vibe: ${i.vibe}`,
    `Difficulty: ${i.difficulty}`,
    `Number of quests: ${i.count}`,
    i.includeTeam ? "Include at least one team quest." : "No team quests.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseInput(raw: Record<string, unknown>): GenerateInput {
  const count = Math.min(12, Math.max(3, Math.round(Number(raw.count) || 6)));
  const diff = raw.difficulty === "easy" || raw.difficulty === "hard" ? raw.difficulty : "medium";
  return {
    eventName: clean(raw.eventName, 80) || "Untitled event",
    venue: clean(raw.venue, 120),
    audience: clean(raw.audience, 120),
    vibe: clean(raw.vibe, 160),
    count,
    difficulty: diff,
    includeTeam: raw.includeTeam !== false,
  };
}

export async function generateQuests(input: GenerateInput): Promise<GenerateResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  try {
    if (anthropicKey) return { provider: "anthropic", quests: await viaAnthropic(anthropicKey, input) };
    if (openaiKey) return { provider: "openai", quests: await viaOpenAI(openaiKey, input) };
  } catch (e) {
    const fallback = builtin(input);
    return {
      provider: "builtin",
      quests: fallback,
      note: `The AI provider failed (${e instanceof Error ? e.message : "unknown error"}). Showing the built-in generator instead.`,
    };
  }
  return {
    provider: "builtin",
    quests: builtin(input),
    note: "No AI key is set, so this draft came from the built-in generator. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for custom quests.",
  };
}

async function viaAnthropic(key: string, input: GenerateInput): Promise<QuestDraft[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(input) }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return coerce(text, input);
}

async function viaOpenAI(key: string, input: GenerateInput): Promise<QuestDraft[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt(input) },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return coerce(data.choices?.[0]?.message?.content ?? "", input);
}

/** Turn model text into validated drafts. Throws if nothing usable came back. */
export function coerce(text: string, input: GenerateInput): QuestDraft[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("no JSON array in reply");
  const arr = JSON.parse(text.slice(start, end + 1)) as unknown;
  if (!Array.isArray(arr)) throw new Error("reply was not an array");
  const out: QuestDraft[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    let kind: QuestKind = o.kind === "answer" || o.kind === "team" ? o.kind : "scan";
    if (kind === "team" && !input.includeTeam) kind = "scan";
    const answer = clean(o.answer, 80);
    if (kind === "answer" && !answer) kind = "scan";
    const title = clean(o.title, 80);
    if (!title) continue;
    out.push({
      title,
      brief: clean(o.brief, 400),
      kind,
      points: Math.min(300, Math.max(50, Math.round(Number(o.points)) || 100)),
      answer: kind === "answer" ? answer : null,
      hint: clean(o.hint, 160) || null,
      team_size: kind === "team" ? Math.min(6, Math.max(2, Math.round(Number(o.team_size)) || 3)) : 1,
    });
    if (out.length >= input.count) break;
  }
  if (!out.length) throw new Error("no usable quests");
  return out;
}

/* ---------------------------------------------------------- built-in generator */

const CODEWORDS = ["falcon", "lantern", "cobalt", "ember", "harbor", "juniper", "meteor", "nimbus", "orbit", "pixel", "quartz", "relay", "summit", "tundra", "velvet", "willow"];

const POOL: { title: string; brief: string; hint: string; kind: QuestKind }[] = [
  { title: "Opening gate", brief: "Start the run. Scan the gate station to get on the board.", hint: "Main entrance, near registration", kind: "scan" },
  { title: "Read the sign", brief: "Find the codeword on the station sign and type it in.", hint: "Look for the sign at the first hub", kind: "answer" },
  { title: "Squad up", brief: "Get your teammates to this station together. Everyone scans.", hint: "Somewhere with space to gather", kind: "team" },
  { title: "Sponsor stop", brief: "Visit a sponsor table and scan the station card.", hint: "Sponsor area", kind: "scan" },
  { title: "Fuel up", brief: "Grab a drink or a snack, then scan the station at the table.", hint: "Food and drink area", kind: "scan" },
  { title: "Codeword relay", brief: "The station sign holds a codeword. Bring it back.", hint: "Quieter corner away from the stage", kind: "answer" },
  { title: "Stage watch", brief: "Catch part of a session and scan at the stage door.", hint: "Main stage entrance", kind: "scan" },
  { title: "Team photo spot", brief: "Gather your team at the marked spot. The bonus unlocks when enough of you scan.", hint: "Photo wall", kind: "team" },
  { title: "Hidden station", brief: "This one is not on the main route. Look around and scan it.", hint: "Off the main path", kind: "scan" },
  { title: "Sign check", brief: "Read the codeword printed on this station and enter it.", hint: "Upper level or far wall", kind: "answer" },
  { title: "Meet someone new", brief: "Introduce yourself to a stranger, then scan this station together.", hint: "Lounge or networking area", kind: "scan" },
  { title: "Final stretch", brief: "Reach the closing station before the doors shut.", hint: "Near the exit", kind: "scan" },
];

export function builtin(input: GenerateInput): QuestDraft[] {
  const base = input.difficulty === "easy" ? 75 : input.difficulty === "hard" ? 150 : 100;
  const words = [...CODEWORDS].sort(() => crypto.randomInt(3) - 1);
  const picks: typeof POOL = [];
  for (const q of POOL) {
    if (!input.includeTeam && q.kind === "team") continue;
    picks.push(q);
  }
  const chosen = picks.slice(0, input.count);
  let w = 0;
  return chosen.map((q, i) => ({
    title: q.title,
    brief: input.vibe ? `${q.brief} (Theme: ${input.vibe}.)` : q.brief,
    kind: q.kind,
    points: base + (q.kind === "team" ? 100 : q.kind === "answer" ? 50 : 0) + (i === chosen.length - 1 ? 50 : 0),
    answer: q.kind === "answer" ? words[w++ % words.length] : null,
    hint: q.hint,
    team_size: q.kind === "team" ? 3 : 1,
  }));
}
