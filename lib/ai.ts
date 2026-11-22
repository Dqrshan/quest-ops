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

export type GenerateResult = {
  provider: "groq" | "anthropic" | "openai" | "builtin";
  story: string;
  quests: QuestDraft[];
  note?: string;
};

const SYSTEM = `You design real-world quests for live events. Players walk between physical stations, each marked with a QR code, and scan them on their phones.
Return ONLY a JSON object, no prose, no code fences:
{"story": string (2-3 sentences that set the scene for the whole night, second person, present tense),
 "quests": [{"title": string (max 5 words), "brief": string (1-2 sentences: what the player does at the station, in the story's voice),
   "kind": "scan" | "answer" | "team", "points": integer 50-300,
   "answer": string (only for "answer": one word or short phrase the organizer will print on a sign at the station),
   "hint": string (where to find the station, max 10 words, generic unless the venue was described),
   "team_size": integer 2-6 (only for "team": how many teammates must scan)}]}
Rules: "scan" = reach the station. "answer" = read a codeword at the station or answer a question about the event. "team" = several teammates must reach the station together.
When a field does not apply to a quest's kind, return "" for strings and 0 for numbers.
Order quests as a route with rising points; make the last one the climax. Never invent facts about the venue. Keep language plain enough to read on a phone in a dark room.`;

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
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  try {
    if (groqKey) return { provider: "groq", ...(await viaGroq(groqKey, input)) };
    if (anthropicKey) return { provider: "anthropic", ...(await viaAnthropic(anthropicKey, input)) };
    if (openaiKey) return { provider: "openai", ...(await viaOpenAI(openaiKey, input)) };
  } catch (e) {
    return {
      provider: "builtin",
      ...builtin(input),
      note: `The AI provider failed (${e instanceof Error ? e.message : "unknown error"}), so this draft came from the built-in packs.`,
    };
  }
  return {
    provider: "builtin",
    ...builtin(input),
    note: "No AI key is set, so this draft came from the built-in packs. Set GROQ_API_KEY (free at console.groq.com), ANTHROPIC_API_KEY or OPENAI_API_KEY for routes written for your venue.",
  };
}

/** The shape Groq's strict mode decodes against. Strict mode needs every field required, so unused ones come back empty. */
const QUEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["story", "quests"],
  properties: {
    story: { type: "string" },
    quests: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "brief", "kind", "points", "answer", "hint", "team_size"],
        properties: {
          title: { type: "string" },
          brief: { type: "string" },
          kind: { type: "string", enum: ["scan", "answer", "team"] },
          points: { type: "integer" },
          answer: { type: "string" },
          hint: { type: "string" },
          team_size: { type: "integer" },
        },
      },
    },
  },
} as const;

/** Groq exposes an OpenAI-compatible API. Strict JSON schema where the model supports it, JSON object mode otherwise. */
async function viaGroq(key: string, input: GenerateInput) {
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
  const strict = /^(openai\/gpt-oss|qwen\/)/.test(model);
  const call = (format: object) =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_completion_tokens: 4000,
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        response_format: format,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt(input) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  let res = await call(strict ? { type: "json_schema", json_schema: { name: "quest_route", strict: true, schema: QUEST_SCHEMA } } : { type: "json_object" });
  // A model or account that rejects the schema gets one retry in plain JSON mode.
  if (res.status === 400 && strict) res = await call({ type: "json_object" });
  if (!res.ok) throw new Error(groqError(res.status));
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return coerce(data.choices?.[0]?.message?.content ?? "", input);
}

function groqError(status: number) {
  if (status === 401) return "Groq rejected the key; check GROQ_API_KEY";
  if (status === 404) return "Groq does not know that model; check GROQ_MODEL";
  if (status === 429) return "Groq rate limit reached; wait a minute and draft again";
  return `Groq ${status}`;
}

async function viaAnthropic(key: string, input: GenerateInput) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(input) }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return coerce(data.content?.find((c) => c.type === "text")?.text ?? "", input);
}

async function viaOpenAI(key: string, input: GenerateInput) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
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

/** Turn model text into a validated story and drafts. Accepts the object form or a bare array. Throws if nothing usable came back. */
export function coerce(text: string, input: GenerateInput): { story: string; quests: QuestDraft[] } {
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  let parsed: unknown;
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    parsed = JSON.parse(text.slice(objStart, text.lastIndexOf("}") + 1));
  } else if (arrStart >= 0) {
    parsed = JSON.parse(text.slice(arrStart, text.lastIndexOf("]") + 1));
  } else throw new Error("no JSON in reply");

  const list = Array.isArray(parsed) ? parsed : (parsed as { quests?: unknown }).quests;
  const story = Array.isArray(parsed) ? "" : clean((parsed as { story?: unknown }).story, 600);
  if (!Array.isArray(list)) throw new Error("reply had no quest list");

  const out: QuestDraft[] = [];
  for (const item of list) {
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
  return { story, quests: out };
}

/* ---------------------------------------------------------- built-in packs */

type PackItem = { title: string; brief: string; hint: string; kind: QuestKind };

const HAUNTED: PackItem[] = [
  { title: "The gatehouse", brief: "Sign in with the dead. Scan the lantern by the door to enter.", hint: "Main entrance", kind: "scan" },
  { title: "Read the epitaph", brief: "A headstone carries one word. Enter it to pass.", hint: "Look for the stone sign", kind: "answer" },
  { title: "Seance circle", brief: "Gather your crew at the table. The spirit wakes when enough of you scan.", hint: "A quiet room with candles", kind: "team" },
  { title: "The laboratory", brief: "Find the bench of jars and scan the card beneath them.", hint: "A workshop or side room", kind: "scan" },
  { title: "Feed the cauldron", brief: "Bring something from the food table and scan the pot.", hint: "Food and drink area", kind: "scan" },
  { title: "Whisper the word", brief: "A word is written in the mirror's fog. Bring it back.", hint: "A mirror or a dark corridor", kind: "answer" },
  { title: "The organ loft", brief: "Follow the music and scan the sheet on the stand.", hint: "Near the stage", kind: "scan" },
  { title: "Raise the crew", brief: "Every hand on the coffin lid. Your team scans together.", hint: "Photo wall", kind: "team" },
  { title: "The hidden crypt", brief: "Off the main path, behind something. Find it and scan.", hint: "Off the main route", kind: "scan" },
  { title: "Name the creature", brief: "The tag on the creature's toe has a name. Enter it.", hint: "Wherever the creature lies", kind: "answer" },
  { title: "Meet a stranger", brief: "Find someone outside your crew and scan this together.", hint: "Lounge or bar", kind: "scan" },
  { title: "Pull the switch", brief: "Bring the creature to life. The final station.", hint: "Near the exit", kind: "scan" },
];

const CLASSIC: PackItem[] = [
  { title: "Opening gate", brief: "Start the run. Scan the gate station to get on the board.", hint: "Main entrance", kind: "scan" },
  { title: "Read the sign", brief: "Find the codeword on the station sign and type it in.", hint: "The first hub", kind: "answer" },
  { title: "Squad up", brief: "Get your teammates to this station together. Everyone scans.", hint: "Somewhere with space to gather", kind: "team" },
  { title: "Sponsor stop", brief: "Visit a sponsor table and scan the station card.", hint: "Sponsor area", kind: "scan" },
  { title: "Fuel up", brief: "Grab a drink or a snack, then scan the station at the table.", hint: "Food and drink area", kind: "scan" },
  { title: "Codeword relay", brief: "The station sign holds a codeword. Bring it back.", hint: "A quieter corner", kind: "answer" },
  { title: "Stage watch", brief: "Catch part of a session and scan at the stage door.", hint: "Main stage entrance", kind: "scan" },
  { title: "Team photo", brief: "Gather your team at the marked spot. The bonus unlocks when enough of you scan.", hint: "Photo wall", kind: "team" },
  { title: "Hidden station", brief: "This one is not on the main route. Look around and scan it.", hint: "Off the main path", kind: "scan" },
  { title: "Sign check", brief: "Read the codeword printed on this station and enter it.", hint: "Upper level or far wall", kind: "answer" },
  { title: "Meet someone new", brief: "Introduce yourself to a stranger, then scan this station together.", hint: "Lounge or networking area", kind: "scan" },
  { title: "Final stretch", brief: "Reach the closing station before the doors shut.", hint: "Near the exit", kind: "scan" },
];

const HAUNTED_WORDS = ["nevermore", "lazarus", "hollow", "lantern", "raven", "ember", "crypt", "moth", "wither", "candle"];
const CLASSIC_WORDS = ["falcon", "cobalt", "harbor", "juniper", "meteor", "nimbus", "orbit", "quartz", "relay", "summit"];

const SPOOKY = /hallow|haunt|spook|ghost|horror|zombie|vampire|witch|monster|frankenst|creep|dark|night|kiroween|dead|grave|crypt|seance/i;

export function builtin(input: GenerateInput): { story: string; quests: QuestDraft[] } {
  const haunted = !input.vibe || SPOOKY.test(`${input.vibe} ${input.eventName}`);
  const pool = (haunted ? HAUNTED : CLASSIC).filter((q) => input.includeTeam || q.kind !== "team");
  const words = [...(haunted ? HAUNTED_WORDS : CLASSIC_WORDS)].sort(() => crypto.randomInt(3) - 1);
  const base = input.difficulty === "easy" ? 75 : input.difficulty === "hard" ? 150 : 100;
  const chosen = [...pool.slice(0, input.count - 1), pool[pool.length - 1]].filter((q, i, a) => a.indexOf(q) === i).slice(0, input.count);
  let w = 0;
  const quests = chosen.map((q, i) => ({
    title: q.title,
    brief: q.brief,
    kind: q.kind,
    points: base + (q.kind === "team" ? 100 : q.kind === "answer" ? 50 : 0) + (i === chosen.length - 1 ? 100 : 0),
    answer: q.kind === "answer" ? words[w++ % words.length] : null,
    hint: q.hint,
    team_size: q.kind === "team" ? 3 : 1,
  }));
  const story = haunted
    ? `The doors of ${input.eventName} creak open at dusk. Something on the slab is waiting to be brought back to life, and only the stations you reach tonight will wake it.`
    : `Welcome to ${input.eventName}. ${input.vibe ? `Tonight's theme is ${input.vibe}. ` : ""}Walk the route, scan each station and climb the board before the doors close.`;
  return { story, quests };
}
