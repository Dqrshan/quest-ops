import crypto from "node:crypto";
import { db } from "./db";
import {
  addAnnouncement,
  addQuests,
  checkIn,
  createEvent,
  getEventByCode,
  getEventById,
  joinEvent,
  listQuests,
  setClock,
  type EventRow,
  type PlayerRow,
  type QuestRow,
} from "./game";

export const DEMO_CODE = "HAUNTS";
const BOT = "bot-";

/**
 * The Haunted Hall: a Halloween demo event whose players are simulated.
 * Everything here is labelled as simulated wherever it is shown.
 */
const STATIONS = [
  { title: "The gatehouse", brief: "Sign the visitors' book. Scan the lantern by the door to enter the hall.", kind: "scan", points: 50, hint: "Main entrance" },
  { title: "Read the epitaph", brief: "One headstone in the yard carries a single word. Enter it.", kind: "answer", points: 100, answer: "nevermore", hint: "Courtyard, third stone from the gate" },
  { title: "The laboratory", brief: "Find the bench of glowing jars and scan the card beneath the brain.", kind: "scan", points: 100, hint: "Workshop room" },
  { title: "Seance circle", brief: "Three of your crew must sit at the table. Each of you scans to wake the spirit.", kind: "team", points: 150, team_size: 3, hint: "Back room, follow the candles" },
  { title: "The organ loft", brief: "Someone is playing. Climb up, listen, then scan the sheet music.", kind: "scan", points: 100, hint: "Above the main stage" },
  { title: "Whisper the word", brief: "Look into the corridor mirror. The word written in the fog is the answer.", kind: "answer", points: 150, answer: "lazarus", hint: "Long corridor, east wing" },
  { title: "Pull the switch", brief: "The creature waits on the slab. Scan the lever to bring it to life.", kind: "scan", points: 200, hint: "Near the exit" },
] as const;

const CREWS: Record<string, string[]> = {
  "Crypt Keepers": ["Mira", "Joon", "Ade", "Pia"],
  "Hex Appeal": ["Tomas", "Lena", "Ravi"],
  "Grave Danger": ["Noor", "Kofi", "Sasha", "Bea"],
  "Boo Crew": ["Ines", "Gus", "Yuki"],
};

/** How many stations each simulated player has reached when the demo starts or resets. */
const OPENING = [5, 4, 3, 3, 4, 2, 2, 3, 3, 2, 1, 2, 2, 1];

const LINES = [
  "The organ loft is open. Follow the music upstairs.",
  "Seance circle needs three of a crew at the table. Bring your team.",
  "Someone has reached the laboratory. Don't touch the jars.",
  "Ten minutes until the lights go out. Head for the switch.",
  "The epitaph is hard to read in the dark. Use your phone light.",
];

/** After this long without a scan the demo looks abandoned, so the next visitor gets a fresh night. */
const STALE_MS = 10 * 60_000;

export function ensureDemo(): EventRow {
  const existing = getEventByCode(DEMO_CODE);
  if (existing) {
    refreshIfStale(existing);
    return getEventByCode(DEMO_CODE)!;
  }
  const d = db();
  const e = d.transaction(() => {
    const ev = createEvent(
      {
        name: "The Haunted Hall",
        venue: "A simulated venue",
        blurb: "A Halloween night with simulated players, so you can watch QuestOps run: scans land, teams unlock bonuses, the organizer makes announcements.",
      },
      DEMO_CODE,
    );
    d.prepare("UPDATE events SET status = 'live' WHERE id = ?").run(ev.id);
    addQuests(ev.id, STATIONS.map((s) => ({ ...s })));
    for (const [team, names] of Object.entries(CREWS)) {
      for (const name of names) {
        const { player } = joinEvent(DEMO_CODE, name, team);
        d.prepare("UPDATE players SET token = ? WHERE id = ?").run(BOT + player.token, player.id);
      }
    }
    return getEventById(ev.id)!;
  })();
  replayOpening(e);
  setClock(e.id, 30, "Midnight round");
  return getEventByCode(DEMO_CODE)!;
}

function bots(eventId: number): PlayerRow[] {
  return db().prepare("SELECT * FROM players WHERE event_id = ? AND token LIKE 'bot-%' ORDER BY id").all(eventId) as PlayerRow[];
}

function answerFor(q: QuestRow) {
  return q.kind === "answer" ? (q.answer ?? "") : undefined;
}

function replayOpening(e: EventRow) {
  const quests = listQuests(e.id);
  const live = getEventById(e.id)!;
  bots(e.id).forEach((b, i) => {
    for (const q of quests.slice(0, OPENING[i % OPENING.length])) {
      try {
        checkIn(live, b, q.token, answerFor(q));
      } catch {}
    }
  });
}

function resetDemo(e: EventRow) {
  const d = db();
  d.transaction(() => {
    d.prepare("DELETE FROM completions WHERE event_id = ?").run(e.id);
    d.prepare("DELETE FROM adjustments WHERE event_id = ?").run(e.id);
    d.prepare("DELETE FROM announcements WHERE event_id = ?").run(e.id);
    d.prepare("UPDATE events SET version = version + 1 WHERE id = ?").run(e.id);
  })();
  replayOpening(e);
  addAnnouncement(e.id, "The hall resets at midnight. Everyone back to the gatehouse.", "info");
}

/** Replays the opening, renews the clock and clears visitors who left long ago, when nobody has scanned for a while. */
function refreshIfStale(e: EventRow) {
  if (e.status !== "live") return;
  const last = (db().prepare("SELECT MAX(at) AS at FROM completions WHERE event_id = ?").get(e.id) as { at: number | null }).at ?? 0;
  const clockDone = !e.ends_at || e.ends_at < Date.now();
  if (Date.now() - last < STALE_MS && !clockDone) return;
  if (Date.now() - last >= STALE_MS) {
    db()
      .prepare("DELETE FROM players WHERE event_id = ? AND token NOT LIKE 'bot-%' AND joined_at < ?")
      .run(e.id, Date.now() - STALE_MS);
    resetDemo(e);
  }
  setClock(e.id, 30, "Midnight round");
}

const sim = globalThis as unknown as { __questopsSim?: { lastLine: number; line: number } };

/** One tick of the simulation. Called by the bus while someone is watching the demo. */
export function simulateStep(eventId: number) {
  const e = getEventById(eventId);
  if (!e || e.code !== DEMO_CODE || e.status !== "live" || e.paused) return;
  const state = (sim.__questopsSim ??= { lastLine: Date.now(), line: 0 });

  if (!e.ends_at || e.ends_at < Date.now()) setClock(e.id, 30, "Midnight round");

  const quests = listQuests(e.id);
  const d = db();
  const doneRows = d
    .prepare("SELECT player_id, quest_id FROM completions WHERE event_id = ? AND player_id IS NOT NULL")
    .all(e.id) as { player_id: number; quest_id: number }[];
  const done = new Map<number, Set<number>>();
  for (const r of doneRows) (done.get(r.player_id) ?? done.set(r.player_id, new Set()).get(r.player_id)!).add(r.quest_id);

  const movable = bots(e.id)
    .map((b) => ({ b, next: quests.find((q) => !done.get(b.id)?.has(q.id)) }))
    .filter((x): x is { b: PlayerRow; next: QuestRow } => Boolean(x.next));

  if (!movable.length) return resetDemo(e);

  const pick = movable[crypto.randomInt(movable.length)];
  try {
    checkIn(e, pick.b, pick.next.token, answerFor(pick.next));
  } catch {}

  if (Date.now() - state.lastLine > 110_000) {
    state.lastLine = Date.now();
    addAnnouncement(e.id, LINES[state.line++ % LINES.length], state.line % 4 === 0 ? "alert" : "info");
  }
}
