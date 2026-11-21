import { db } from "./db";
import { addQuests, checkIn, createEvent, getEventByCode, joinEvent, listQuests, type EventRow } from "./game";

export const DEMO_CODE = "DEMO26";

/**
 * A sample event so the app has something real to show on first run.
 * Idempotent. The people in it are fictional and the scores are generated, not measured.
 */
export function ensureDemo(): EventRow {
  const existing = getEventByCode(DEMO_CODE);
  if (existing) return existing;

  const e = createEvent({
    name: "Demo Night",
    venue: "Sample venue",
    blurb: "A sample event with generated players, so you can see the console, the phone view and the board working.",
  });
  const d = db();
  d.prepare("UPDATE events SET code = ?, status = 'live' WHERE id = ?").run(DEMO_CODE, e.id);
  const event = getEventByCode(DEMO_CODE)!;

  addQuests(event.id, [
    { title: "Opening gate", brief: "Scan the gate to get on the board.", kind: "scan", points: 50, hint: "Main entrance" },
    { title: "Read the sign", brief: "The station sign holds a codeword.", kind: "answer", points: 100, answer: "falcon", hint: "First hub" },
    { title: "Sponsor stop", brief: "Visit a table and scan the card.", kind: "scan", points: 100, hint: "Sponsor area" },
    { title: "Squad up", brief: "Three teammates scan together.", kind: "team", points: 150, team_size: 3, hint: "Photo wall" },
    { title: "Stage watch", brief: "Catch a session, scan at the stage door.", kind: "scan", points: 100, hint: "Main stage" },
    { title: "Codeword relay", brief: "Another codeword, another sign.", kind: "answer", points: 150, answer: "lantern", hint: "Far wall" },
    { title: "Final stretch", brief: "Reach the closing station.", kind: "scan", points: 200, hint: "Near the exit" },
  ]);
  const quests = listQuests(event.id);

  const crews: Record<string, string[]> = {
    "Night Owls": ["Mira", "Joon", "Ade", "Pia"],
    "Cold Brew": ["Tomas", "Lena", "Ravi"],
    "Paper Planes": ["Noor", "Kofi", "Sasha", "Bea"],
    "Low Battery": ["Ines", "Gus", "Yuki"],
  };
  // How far along the line each player got (fixed numbers, so the demo is stable).
  const reach = [7, 6, 5, 5, 6, 4, 3, 5, 5, 3, 2, 4, 3, 2, 1, 2];
  let i = 0;
  for (const [team, names] of Object.entries(crews)) {
    for (const name of names) {
      const { player } = joinEvent(DEMO_CODE, name, team);
      const upto = reach[i++ % reach.length];
      for (const q of quests.slice(0, upto)) {
        checkIn(event, player, q.token, q.kind === "answer" ? q.answer ?? "" : undefined);
      }
    }
  }
  return getEventByCode(DEMO_CODE)!;
}
