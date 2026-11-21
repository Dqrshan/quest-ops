import crypto from "node:crypto";
import { db } from "./db";
import { levelFor, type Level } from "./levels";

export type QuestKind = "scan" | "answer" | "team";
export type EventStatus = "draft" | "live" | "ended";

export type EventRow = {
  id: number;
  code: string;
  name: string;
  venue: string;
  blurb: string;
  status: EventStatus;
  version: number;
  created_at: number;
  paused: number;
  ends_at: number | null;
  round_label: string;
};

export type QuestRow = {
  id: number;
  event_id: number;
  position: number;
  title: string;
  brief: string;
  kind: QuestKind;
  points: number;
  answer: string | null;
  hint: string | null;
  team_size: number;
  token: string;
};

export type QuestDraft = {
  title: string;
  brief: string;
  kind: QuestKind;
  points: number;
  answer?: string | null;
  hint?: string | null;
  team_size?: number;
};

export type PlayerRow = {
  id: number;
  event_id: number;
  team_id: number | null;
  name: string;
  token: string;
  joined_at: number;
};

/** What a participant may see about a quest. Never includes the answer or the QR token. */
export type PublicQuest = {
  id: number;
  position: number;
  title: string;
  brief: string;
  kind: QuestKind;
  points: number;
  hint: string | null;
  team_size: number;
};

export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function newToken(): string {
  return crypto.randomBytes(9).toString("base64url");
}

const now = () => Date.now();

export function clean(input: unknown, max: number): string {
  return String(input ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function bump(eventId: number) {
  db().prepare("UPDATE events SET version = version + 1 WHERE id = ?").run(eventId);
}

function requireEvent(id: number): EventRow {
  const e = getEventById(id);
  if (!e) throw new GameError("Event not found. It may have been deleted.", 404);
  return e;
}

/* ------------------------------------------------------------------ events */

export function createEvent(input: { name: string; venue?: string; blurb?: string }, code?: string): EventRow {
  const name = clean(input.name, 80);
  if (!name) throw new GameError("Give the event a name.");
  const d = db();
  for (let i = 0; i < 5; i++) {
    try {
      const info = d
        .prepare("INSERT INTO events (code, name, venue, blurb, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(code ?? newCode(), name, clean(input.venue, 120), clean(input.blurb, 600), now());
      return getEventById(Number(info.lastInsertRowid))!;
    } catch (e) {
      if (!String(e).includes("UNIQUE") || code) throw e;
    }
  }
  throw new GameError("Could not allocate an event code. Try again.", 500);
}

export function getEventById(id: number): EventRow | undefined {
  return db().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
}

export function getEventByCode(code: string): EventRow | undefined {
  return db()
    .prepare("SELECT * FROM events WHERE code = ?")
    .get(clean(code, 12).toUpperCase()) as EventRow | undefined;
}

export function eventVersion(id: number): number | undefined {
  return (db().prepare("SELECT version FROM events WHERE id = ?").get(id) as { version: number } | undefined)?.version;
}

export type EventSummary = EventRow & { quests: number; players: number; completions: number };

export function listEvents(): EventSummary[] {
  return db()
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM quests q WHERE q.event_id = e.id) AS quests,
        (SELECT COUNT(*) FROM players p WHERE p.event_id = e.id) AS players,
        (SELECT COUNT(*) FROM completions c WHERE c.event_id = e.id AND c.player_id IS NOT NULL) AS completions
       FROM events e ORDER BY e.created_at DESC`,
    )
    .all() as EventSummary[];
}

export function setEventStatus(id: number, status: EventStatus) {
  if (!["draft", "live", "ended"].includes(status)) throw new GameError("Unknown status.");
  const e = requireEvent(id);
  if (status === "live" && !listQuests(id).length) throw new GameError("Add at least one station before going live.", 409);
  db()
    .prepare("UPDATE events SET status = ?, paused = CASE WHEN ? = 'live' THEN paused ELSE 0 END WHERE id = ?")
    .run(status, status, e.id);
  bump(id);
}

export function setPaused(id: number, paused: boolean) {
  const e = requireEvent(id);
  if (e.status !== "live") throw new GameError("Only a live event can be paused.", 409);
  db().prepare("UPDATE events SET paused = ? WHERE id = ?").run(paused ? 1 : 0, id);
  bump(id);
}

/** Start a round of `minutes`, or clear the clock with null. */
export function setClock(id: number, minutes: number | null, label?: string) {
  requireEvent(id);
  const endsAt = minutes === null ? null : now() + clampInt(minutes, 1, 600, 30) * 60_000;
  db()
    .prepare("UPDATE events SET ends_at = ?, round_label = ? WHERE id = ?")
    .run(endsAt, clean(label, 40), id);
  bump(id);
}

export function updateEventDetails(id: number, input: { name?: string; venue?: string; blurb?: string }) {
  const e = requireEvent(id);
  const name = clean(input.name ?? e.name, 80) || e.name;
  db()
    .prepare("UPDATE events SET name = ?, venue = ?, blurb = ? WHERE id = ?")
    .run(name, clean(input.venue ?? e.venue, 120), clean(input.blurb ?? e.blurb, 600), id);
  bump(id);
}

export function deleteEvent(id: number) {
  db().prepare("DELETE FROM events WHERE id = ?").run(id);
}

/* ------------------------------------------------------------------ quests */

export function listQuests(eventId: number): QuestRow[] {
  return db()
    .prepare("SELECT * FROM quests WHERE event_id = ? ORDER BY position, id")
    .all(eventId) as QuestRow[];
}

export function toPublicQuest(q: QuestRow): PublicQuest {
  return { id: q.id, position: q.position, title: q.title, brief: q.brief, kind: q.kind, points: q.points, hint: q.hint, team_size: q.team_size };
}

function normaliseDraft(d: QuestDraft) {
  const title = clean(d.title, 80);
  if (!title) throw new GameError("Every station needs a title.");
  const kind: QuestKind = d.kind === "answer" || d.kind === "team" ? d.kind : "scan";
  const answer = kind === "answer" ? clean(d.answer, 80) : "";
  if (kind === "answer" && !answer) throw new GameError(`"${title}" is an answer station and needs an answer.`);
  return {
    title,
    brief: clean(d.brief, 400),
    kind,
    points: clampInt(d.points, 10, 1000, 100),
    answer: kind === "answer" ? answer : null,
    hint: clean(d.hint, 160) || null,
    team_size: kind === "team" ? clampInt(d.team_size, 2, 12, 3) : 1,
  };
}

export function addQuests(eventId: number, drafts: QuestDraft[]): QuestRow[] {
  const d = db();
  requireEvent(eventId);
  const rows = drafts.map(normaliseDraft);
  const insert = d.prepare(
    `INSERT INTO quests (event_id, position, title, brief, kind, points, answer, hint, team_size, token)
     VALUES (@event_id, @position, @title, @brief, @kind, @points, @answer, @hint, @team_size, @token)`,
  );
  d.transaction(() => {
    let pos = (d.prepare("SELECT COALESCE(MAX(position), 0) AS p FROM quests WHERE event_id = ?").get(eventId) as { p: number }).p;
    for (const r of rows) insert.run({ ...r, event_id: eventId, position: ++pos, token: newToken() });
    bump(eventId);
  })();
  return listQuests(eventId);
}

export function updateQuest(eventId: number, questId: number, draft: QuestDraft) {
  const r = normaliseDraft(draft);
  const info = db()
    .prepare(
      `UPDATE quests SET title=@title, brief=@brief, kind=@kind, points=@points, answer=@answer, hint=@hint, team_size=@team_size
       WHERE id=@id AND event_id=@event_id`,
    )
    .run({ ...r, id: questId, event_id: eventId });
  if (!info.changes) throw new GameError("Station not found.", 404);
  bump(eventId);
}

export function deleteQuest(eventId: number, questId: number) {
  const d = db();
  d.transaction(() => {
    d.prepare("DELETE FROM quests WHERE id = ? AND event_id = ?").run(questId, eventId);
    const rest = d.prepare("SELECT id FROM quests WHERE event_id = ? ORDER BY position, id").all(eventId) as { id: number }[];
    const up = d.prepare("UPDATE quests SET position = ? WHERE id = ?");
    rest.forEach((q, i) => up.run(i + 1, q.id));
    bump(eventId);
  })();
}

export function moveQuest(eventId: number, questId: number, dir: -1 | 1) {
  const d = db();
  d.transaction(() => {
    const qs = d.prepare("SELECT id FROM quests WHERE event_id = ? ORDER BY position, id").all(eventId) as { id: number }[];
    const i = qs.findIndex((q) => q.id === questId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    const up = d.prepare("UPDATE quests SET position = ? WHERE id = ?");
    qs.forEach((q, k) => up.run(k + 1, q.id));
    bump(eventId);
  })();
}

/* ----------------------------------------------------------------- players */

export function joinEvent(code: string, nameIn: string, teamIn?: string): { player: PlayerRow; event: EventRow } {
  const event = getEventByCode(code);
  if (!event) throw new GameError("No event with that code. Check the poster; codes are six characters.", 404);
  if (event.status === "ended") throw new GameError("This event has ended. Ask the organizer about the next one.", 409);
  const name = clean(nameIn, 32);
  if (!name) throw new GameError("Enter a name to join.");
  const teamName = clean(teamIn, 32);
  const d = db();
  const player = d.transaction(() => {
    let teamId: number | null = null;
    if (teamName) {
      const existing = d
        .prepare("SELECT id FROM teams WHERE event_id = ? AND name = ? COLLATE NOCASE")
        .get(event.id, teamName) as { id: number } | undefined;
      teamId = existing
        ? existing.id
        : Number(d.prepare("INSERT INTO teams (event_id, name) VALUES (?, ?)").run(event.id, teamName).lastInsertRowid);
    }
    const token = newToken() + newToken();
    const id = Number(
      d
        .prepare("INSERT INTO players (event_id, team_id, name, token, joined_at) VALUES (?, ?, ?, ?, ?)")
        .run(event.id, teamId, name, token, now()).lastInsertRowid,
    );
    bump(event.id);
    return d.prepare("SELECT * FROM players WHERE id = ?").get(id) as PlayerRow;
  })();
  return { player, event };
}

export function getPlayerByToken(eventId: number, token: string | undefined): PlayerRow | undefined {
  if (!token) return undefined;
  return db().prepare("SELECT * FROM players WHERE event_id = ? AND token = ?").get(eventId, token) as PlayerRow | undefined;
}

export function findPlayerByName(eventId: number, name: string): PlayerRow | undefined {
  return db().prepare("SELECT * FROM players WHERE event_id = ? AND name = ? ORDER BY id LIMIT 1").get(eventId, name) as PlayerRow | undefined;
}

export function listTeamNames(eventId: number): { id: number; name: string; members: number }[] {
  return db()
    .prepare(
      `SELECT t.id, t.name, (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) AS members
       FROM teams t WHERE t.event_id = ? AND members > 0 ORDER BY members DESC, t.name`,
    )
    .all(eventId) as { id: number; name: string; members: number }[];
}

export function removePlayer(eventId: number, playerId: number) {
  const info = db().prepare("DELETE FROM players WHERE id = ? AND event_id = ?").run(playerId, eventId);
  if (!info.changes) throw new GameError("Player not found.", 404);
  bump(eventId);
}

export function adjustPoints(eventId: number, playerId: number, pointsIn: unknown, reasonIn: unknown) {
  const points = Math.round(Number(pointsIn));
  if (!Number.isFinite(points) || points === 0 || points < -1000 || points > 1000) {
    throw new GameError("Adjust by a whole number between -1000 and 1000, and not zero.");
  }
  const d = db();
  const p = d.prepare("SELECT id FROM players WHERE id = ? AND event_id = ?").get(playerId, eventId);
  if (!p) throw new GameError("Player not found.", 404);
  d.transaction(() => {
    d.prepare("INSERT INTO adjustments (event_id, player_id, points, reason, at) VALUES (?, ?, ?, ?, ?)").run(
      eventId,
      playerId,
      points,
      clean(reasonIn, 80) || (points > 0 ? "Bonus from the organizer" : "Correction from the organizer"),
      now(),
    );
    bump(eventId);
  })();
}

/* ----------------------------------------------------------- announcements */

export type Announcement = { id: number; body: string; tone: "info" | "alert"; at: number };

export function addAnnouncement(eventId: number, bodyIn: unknown, toneIn: unknown): Announcement {
  requireEvent(eventId);
  const raw = String(bodyIn ?? "").trim();
  if (!raw) throw new GameError("Write something to announce.");
  if (raw.length > 200) throw new GameError("Keep announcements to 200 characters so they fit on a phone.");
  const body = clean(raw, 200);
  const tone = toneIn === "alert" ? "alert" : "info";
  const d = db();
  const id = d.transaction(() => {
    const r = d.prepare("INSERT INTO announcements (event_id, body, tone, at) VALUES (?, ?, ?, ?)").run(eventId, body, tone, now());
    bump(eventId);
    return Number(r.lastInsertRowid);
  })();
  return d.prepare("SELECT id, body, tone, at FROM announcements WHERE id = ?").get(id) as Announcement;
}

export function deleteAnnouncement(eventId: number, id: number) {
  db().prepare("DELETE FROM announcements WHERE id = ? AND event_id = ?").run(id, eventId);
  bump(eventId);
}

/* ------------------------------------------------------------- completions */

export type CompleteResult =
  | { status: "arrived"; quest: PublicQuest }
  | {
      status: "done";
      quest: PublicQuest;
      awarded: number;
      teamBonus: number;
      repeat: boolean;
      first: boolean;
      teamProgress?: { have: number; need: number };
    };

const attempts = new Map<string, { n: number; reset: number }>();

function throttle(key: string, limit: number, windowMs: number) {
  const t = now();
  const cur = attempts.get(key);
  if (!cur || cur.reset < t) {
    if (attempts.size > 5000) attempts.clear();
    attempts.set(key, { n: 1, reset: t + windowMs });
    return;
  }
  cur.n += 1;
  if (cur.n > limit) throw new GameError("Too many tries. Wait a minute and try again.", 429);
}

function normaliseAnswer(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function checkIn(event: EventRow, player: PlayerRow, questToken: string, answer?: string): CompleteResult {
  const fresh = getEventById(event.id) ?? event;
  if (fresh.status !== "live") {
    throw new GameError(
      fresh.status === "draft" ? "The organizer has not opened this event yet. Hang on, you are on the list." : "This event has ended. Check the Rank tab for final scores.",
      409,
    );
  }
  if (fresh.paused) throw new GameError("The organizer has paused play. Scans count again as soon as it resumes.", 409);
  const d = db();
  const quest = d
    .prepare("SELECT * FROM quests WHERE event_id = ? AND token = ?")
    .get(event.id, clean(questToken, 64)) as QuestRow | undefined;
  if (!quest) throw new GameError("That code is not a station in this event. Scan the QR on the station card.", 404);

  const pub = toPublicQuest(quest);
  const done = d.prepare("SELECT 1 FROM completions WHERE quest_id = ? AND player_id = ?").get(quest.id, player.id);

  if (quest.kind === "answer") {
    if (done) return { status: "done", quest: pub, awarded: 0, teamBonus: 0, repeat: true, first: false };
    if (answer === undefined) return { status: "arrived", quest: pub };
    throttle(`${player.id}:${quest.id}`, 8, 60_000);
    if (normaliseAnswer(answer) !== normaliseAnswer(quest.answer ?? "")) {
      throw new GameError("Not quite. Read the station again and try once more.", 422);
    }
  } else if (quest.kind === "team" && !player.team_id) {
    throw new GameError("This is a team station. Join a team to take part.", 409);
  }

  if (done) {
    return { status: "done", quest: pub, awarded: 0, teamBonus: 0, repeat: true, first: false, teamProgress: teamProgress(quest, player) };
  }

  let teamBonus = 0;
  let first = false;
  d.transaction(() => {
    first = !d.prepare("SELECT 1 FROM completions WHERE quest_id = ? AND player_id IS NOT NULL").get(quest.id);
    d.prepare(
      "INSERT INTO completions (event_id, quest_id, player_id, team_id, points, at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(event.id, quest.id, player.id, player.team_id, quest.points, now());
    if (quest.kind === "team" && player.team_id) {
      const have = (
        d
          .prepare("SELECT COUNT(*) AS n FROM completions WHERE quest_id = ? AND team_id = ? AND player_id IS NOT NULL")
          .get(quest.id, player.team_id) as { n: number }
      ).n;
      if (have >= quest.team_size) {
        const info = d
          .prepare(
            `INSERT OR IGNORE INTO completions (event_id, quest_id, player_id, team_id, points, bonus, at)
             VALUES (?, ?, NULL, ?, ?, 1, ?)`,
          )
          .run(event.id, quest.id, player.team_id, quest.points, now());
        if (info.changes) teamBonus = quest.points;
      }
    }
    bump(event.id);
  })();

  return {
    status: "done",
    quest: pub,
    awarded: quest.points,
    teamBonus,
    repeat: false,
    first,
    teamProgress: quest.kind === "team" ? teamProgress(quest, player) : undefined,
  };
}

function teamProgress(quest: QuestRow, player: PlayerRow) {
  if (quest.kind !== "team" || !player.team_id) return undefined;
  const have = (
    db()
      .prepare("SELECT COUNT(*) AS n FROM completions WHERE quest_id = ? AND team_id = ? AND player_id IS NOT NULL")
      .get(quest.id, player.team_id) as { n: number }
  ).n;
  return { have: Math.min(have, quest.team_size), need: quest.team_size };
}

/* ------------------------------------------------------------ the frame */

export type PlayerScore = { id: number; name: string; team: string | null; score: number; done: number };
export type TeamScore = { id: number; name: string; members: number; score: number; done: number };
export type FeedItem = {
  id: string;
  at: number;
  kind: "scan" | "bonus" | "adjust";
  player: string | null;
  team: string | null;
  quest: string | null;
  points: number;
  first: boolean;
  reason: string | null;
};
export type StationReach = { id: number; position: number; title: string; kind: QuestKind; points: number; reached: number };

export type Snapshot = {
  event: { code: string; name: string; venue: string; blurb: string; status: EventStatus; paused: boolean };
  version: number;
  now: number;
  clock: { endsAt: number | null; label: string };
  totals: { players: number; teams: number; quests: number; completions: number; points: number };
  players: PlayerScore[];
  teams: TeamScore[];
  feed: FeedItem[];
  stations: StationReach[];
  announcements: Announcement[];
};

type FullPlayer = PlayerScore & { teamId: number | null; joinedAt: number; last: number | null; rank: number };

export type Frame = {
  version: number;
  eventId: number;
  snap: Snapshot;
  players: FullPlayer[];
  byPlayer: Map<number, FullPlayer>;
  teamRank: Map<number, { rank: number; score: number; name: string }>;
  /** Lazily built per-player progress, shared by every personal stream at this version. */
  progress?: { doneByPlayer: Map<number, Set<number>>; teamCounts: Map<string, number>; quests: QuestRow[] };
};

const globalFrames = globalThis as unknown as { __questopsFrames?: Map<number, Frame> };
const frames = (globalFrames.__questopsFrames ??= new Map());

export function frame(event: EventRow | number): Frame {
  const id = typeof event === "number" ? event : event.id;
  const version = eventVersion(id);
  if (version === undefined) throw new GameError("Event not found.", 404);
  const cached = frames.get(id);
  if (cached && cached.version === version) return cached;
  const f = buildFrame(id);
  frames.set(id, f);
  return f;
}

function buildFrame(eventId: number): Frame {
  const d = db();
  const read = d.transaction(() => {
    const ev = d.prepare("SELECT * FROM events WHERE id = ?").get(eventId) as EventRow;
    const players = d
      .prepare(
        `SELECT p.id, p.name, p.team_id AS teamId, t.name AS team, p.joined_at AS joinedAt,
                COALESCE(c.pts, 0) + COALESCE(a.pts, 0) AS score, COALESCE(c.n, 0) AS done,
                MAX(COALESCE(c.last, 0), COALESCE(a.last, 0)) AS lastAny, c.last AS last
         FROM players p
         LEFT JOIN teams t ON t.id = p.team_id
         LEFT JOIN (SELECT player_id, SUM(points) AS pts, COUNT(*) AS n, MAX(at) AS last
                    FROM completions WHERE event_id = ? AND player_id IS NOT NULL GROUP BY player_id) c ON c.player_id = p.id
         LEFT JOIN (SELECT player_id, SUM(points) AS pts, MAX(at) AS last
                    FROM adjustments WHERE event_id = ? GROUP BY player_id) a ON a.player_id = p.id
         WHERE p.event_id = ?
         ORDER BY score DESC, (c.last IS NULL), c.last ASC, p.id ASC`,
      )
      .all(eventId, eventId, eventId) as (Omit<FullPlayer, "rank"> & { lastAny: number })[];

    const teams = d
      .prepare(
        `SELECT t.id, t.name, (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) AS members,
                COALESCE(c.pts, 0) + COALESCE(a.pts, 0) AS score, COALESCE(c.n, 0) AS done, c.last AS last
         FROM teams t
         LEFT JOIN (SELECT team_id, SUM(points) AS pts, COUNT(*) AS n, MAX(at) AS last
                    FROM completions WHERE event_id = ? AND team_id IS NOT NULL GROUP BY team_id) c ON c.team_id = t.id
         LEFT JOIN (SELECT p.team_id AS team_id, SUM(a.points) AS pts FROM adjustments a JOIN players p ON p.id = a.player_id
                    WHERE a.event_id = ? AND p.team_id IS NOT NULL GROUP BY p.team_id) a ON a.team_id = t.id
         WHERE t.event_id = ? AND members > 0
         ORDER BY score DESC, (c.last IS NULL), c.last ASC, t.id ASC`,
      )
      .all(eventId, eventId, eventId) as (TeamScore & { last: number | null })[];

    const feed = (
      d
        .prepare(
          `SELECT * FROM (
             SELECT 'c' || c.id AS id, c.at, CASE WHEN c.bonus = 1 THEN 'bonus' ELSE 'scan' END AS kind,
                    p.name AS player, t.name AS team, q.title AS quest, c.points, NULL AS reason,
                    CASE WHEN c.player_id IS NOT NULL AND c.id = (SELECT MIN(c2.id) FROM completions c2
                         WHERE c2.quest_id = c.quest_id AND c2.player_id IS NOT NULL) THEN 1 ELSE 0 END AS first
             FROM completions c JOIN quests q ON q.id = c.quest_id
             LEFT JOIN players p ON p.id = c.player_id LEFT JOIN teams t ON t.id = c.team_id
             WHERE c.event_id = ?
             UNION ALL
             SELECT 'a' || a.id, a.at, 'adjust', p.name, t.name, NULL, a.points, a.reason, 0
             FROM adjustments a JOIN players p ON p.id = a.player_id LEFT JOIN teams t ON t.id = p.team_id
             WHERE a.event_id = ?
           ) ORDER BY at DESC, id DESC LIMIT 16`,
        )
        .all(eventId, eventId) as (Omit<FeedItem, "first"> & { first: number })[]
    ).map((r) => ({ ...r, first: r.first === 1 }));

    const stations = d
      .prepare(
        `SELECT q.id, q.position, q.title, q.kind, q.points,
                (SELECT COUNT(*) FROM completions c WHERE c.quest_id = q.id AND c.player_id IS NOT NULL) AS reached
         FROM quests q WHERE q.event_id = ? ORDER BY q.position, q.id`,
      )
      .all(eventId) as StationReach[];

    const announcements = d
      .prepare("SELECT id, body, tone, at FROM announcements WHERE event_id = ? ORDER BY at DESC, id DESC LIMIT 5")
      .all(eventId) as Announcement[];

    return { ev, players, teams, feed, stations, announcements };
  });
  const { ev, players, teams, feed, stations, announcements } = read();

  const full: FullPlayer[] = players.map(({ lastAny, ...p }, i) => ({ ...p, last: p.last ?? (lastAny || null), rank: i + 1 }));
  const byPlayer = new Map(full.map((p) => [p.id, p]));
  const teamRank = new Map(teams.map((t, i) => [t.id, { rank: i + 1, score: t.score, name: t.name }]));
  const completions = stations.reduce((n, s) => n + s.reached, 0);

  const snap: Snapshot = {
    event: { code: ev.code, name: ev.name, venue: ev.venue, blurb: ev.blurb, status: ev.status, paused: ev.paused === 1 },
    version: ev.version,
    now: now(),
    clock: { endsAt: ev.ends_at, label: ev.round_label },
    totals: {
      players: full.length,
      teams: teams.length,
      quests: stations.length,
      completions,
      points: full.reduce((n, p) => n + p.score, 0),
    },
    players: full.slice(0, 50).map(({ id, name, team, score, done }) => ({ id, name, team, score, done })),
    teams: teams.map(({ last: _l, ...t }) => t),
    feed,
    stations,
    announcements,
  };
  return { version: ev.version, eventId, snap, players: full, byPlayer, teamRank };
}

/** The public snapshot. `now` is refreshed so clients can correct for clock skew. */
export function snapshot(event: EventRow | number): Snapshot {
  const f = frame(event);
  return { ...f.snap, now: now() };
}

function progressOf(f: Frame) {
  if (f.progress) return f.progress;
  const d = db();
  const doneByPlayer = new Map<number, Set<number>>();
  for (const r of d
    .prepare("SELECT player_id, quest_id FROM completions WHERE event_id = ? AND player_id IS NOT NULL")
    .all(f.eventId) as { player_id: number; quest_id: number }[]) {
    let s = doneByPlayer.get(r.player_id);
    if (!s) doneByPlayer.set(r.player_id, (s = new Set()));
    s.add(r.quest_id);
  }
  const teamCounts = new Map<string, number>();
  for (const r of d
    .prepare(
      "SELECT team_id, quest_id, COUNT(*) AS n FROM completions WHERE event_id = ? AND team_id IS NOT NULL AND player_id IS NOT NULL GROUP BY team_id, quest_id",
    )
    .all(f.eventId) as { team_id: number; quest_id: number; n: number }[]) {
    teamCounts.set(`${r.team_id}:${r.quest_id}`, r.n);
  }
  f.progress = { doneByPlayer, teamCounts, quests: listQuests(f.eventId) };
  return f.progress;
}

export type PlayerQuest = PublicQuest & { done: boolean; teamHave?: number };

export type PlayerView = {
  me: { id: number; name: string; team: string | null; score: number; rank: number | null; of: number; done: number; level: Level };
  team: { name: string; score: number; rank: number; of: number } | null;
  quests: PlayerQuest[];
  next: number | null;
};

export function playerView(event: EventRow | number, player: PlayerRow): PlayerView {
  const f = frame(event);
  const p = f.byPlayer.get(player.id);
  const prog = progressOf(f);
  const done = prog.doneByPlayer.get(player.id) ?? new Set<number>();
  const team = player.team_id ? f.teamRank.get(player.team_id) : undefined;
  const quests: PlayerQuest[] = prog.quests.map((q) => ({
    ...toPublicQuest(q),
    done: done.has(q.id),
    teamHave: q.kind === "team" && player.team_id ? Math.min(prog.teamCounts.get(`${player.team_id}:${q.id}`) ?? 0, q.team_size) : undefined,
  }));
  const score = p?.score ?? 0;
  return {
    me: {
      id: player.id,
      name: player.name,
      team: p?.team ?? null,
      score,
      rank: p?.rank ?? null,
      of: f.players.length,
      done: done.size,
      level: levelFor(score),
    },
    team: team ? { name: team.name, score: team.score, rank: team.rank, of: f.teamRank.size } : null,
    quests,
    next: quests.find((q) => !q.done)?.id ?? null,
  };
}

/** What a phone needs on every change: its own view plus the shared event state. */
export type PersonalFrame = {
  version: number;
  now: number;
  event: Snapshot["event"];
  clock: Snapshot["clock"];
  announcements: Announcement[];
  view: PlayerView | null;
  top: { teams: TeamScore[]; players: PlayerScore[] };
};

export function personalFrame(event: EventRow, player: PlayerRow | undefined): PersonalFrame {
  const f = frame(event);
  return {
    version: f.version,
    now: now(),
    event: f.snap.event,
    clock: f.snap.clock,
    announcements: f.snap.announcements,
    view: player && f.byPlayer.has(player.id) ? playerView(f.eventId, player) : null,
    top: { teams: f.snap.teams.slice(0, 5), players: f.snap.players.slice(0, 8) },
  };
}

/* ----------------------------------------------------------- organizer views */

export type LiveView = {
  snap: Snapshot;
  players: (PlayerScore & { rank: number; joinedAt: number; last: number | null })[];
  stalled: { id: number; name: string; team: string | null; idleMinutes: number; done: number }[];
};

const STALL_MS = 15 * 60_000;

export function liveView(eventId: number): LiveView {
  const f = frame(eventId);
  const t = now();
  const total = f.snap.stations.length;
  const stalled =
    f.snap.event.status === "live"
      ? f.players
          .filter((p) => p.done < total && t - (p.last ?? p.joinedAt) > STALL_MS)
          .map((p) => ({ id: p.id, name: p.name, team: p.team, done: p.done, idleMinutes: Math.floor((t - (p.last ?? p.joinedAt)) / 60_000) }))
          .sort((a, b) => b.idleMinutes - a.idleMinutes)
          .slice(0, 20)
      : [];
  return {
    snap: { ...f.snap, now: t },
    players: f.players.map(({ id, name, team, score, done, rank, joinedAt, last }) => ({ id, name, team, score, done, rank, joinedAt, last })),
    stalled,
  };
}

function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(eventId: number): { filename: string; body: string } {
  const e = requireEvent(eventId);
  const f = frame(eventId);
  const rows = [["rank", "name", "team", "score", "stations_reached", "joined_at"]];
  for (const p of f.players) rows.push([String(p.rank), p.name, p.team ?? "", String(p.score), String(p.done), new Date(p.joinedAt).toISOString()]);
  const slug = e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
  return { filename: `${slug}-results.csv`, body: rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n" };
}
