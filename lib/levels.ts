/** Player levels. Purely derived from score, so they need no storage and never disagree with the board. */
export const LEVELS = [
  { name: "Fresh corpse", floor: 0 },
  { name: "Restless", floor: 150 },
  { name: "Grave walker", floor: 350 },
  { name: "Night stalker", floor: 600 },
  { name: "Ghoul", floor: 900 },
  { name: "Wraith", floor: 1300 },
  { name: "Lich", floor: 1800 },
] as const;

export type Level = { index: number; name: string; floor: number; next: number | null; nextName: string | null; progress: number };

export function levelFor(score: number): Level {
  let i = 0;
  while (i + 1 < LEVELS.length && score >= LEVELS[i + 1].floor) i++;
  const cur = LEVELS[i];
  const nxt = LEVELS[i + 1];
  const progress = nxt ? Math.max(0, Math.min(1, (score - cur.floor) / (nxt.floor - cur.floor))) : 1;
  return { index: i, name: cur.name, floor: cur.floor, next: nxt?.floor ?? null, nextName: nxt?.name ?? null, progress };
}
