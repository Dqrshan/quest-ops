import crypto from "node:crypto";
import { db } from "./db";

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

/** What a participant may see about a quest before arriving at its station. */
export type PublicQuest = {
  id: number;
  position: number;
  title: string;
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

/* ------------------------------------------------------------------ events */

export function createEvent(input: { name: string; venue?: string; blurb?: string }): EventRow {
  const name = clean(input.name, 80);
  if (!name) throw new GameError("Give the event a name.");
  const d = db();
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    try {
      const info = d
        .prepare("INSERT INTO events (code, name, venue, blurb, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(code, name, clean(input.venue, 120), clean(input.blurb, 400), now());
      return getEventById(Number(info.lastInsertRowid))!;
    } catch (e) {
      if (!String(e).includes("UNIQUE")) throw e;
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
  const info = db().prepare("UPDATE events SET status = ? WHERE id = ?").run(status, id);
  if (!info.changes) throw new GameError("Event not found.", 404);
  bump(id);
}

export function updateEventDetails(id: number, input: { name?: string; venue?: string; blurb?: string }) {
  const e = getEventById(id);
  if (!e) throw new GameError("Event not found.", 404);
  const name = clean(input.name ?? e.name, 80) || e.name;
  db()
    .prepare("UPDATE events SET name = ?, venue = ?, blurb = ? WHERE id = ?")
    .run(name, clean(input.venue ?? e.venue, 120), clean(input.blurb ?? e.blurb, 400), id);
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
  return {
    id: q.id,
    position: q.position,
    title: q.title,
    kind: q.kind,
    points: q.points,
    hint: q.hint,
    team_size: q.team_size,
  };
}

function normaliseDraft(d: QuestDraft) {
  const title = clean(d.title, 80);
  if (!title) throw new GameError("Every quest needs a title.");
  const kind: QuestKind = d.kind === "answer" || d.kind === "team" ? d.kind : "scan";
  const answer = kind === "answer" ? clean(d.answer, 80) : "";
  if (kind === "answer" && !answer) throw new GameError(`"${title}" is an answer quest and needs an answer.`);
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
  if (!getEventById(eventId)) throw new GameError("Event not found.", 404);
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
  if (!info.changes) throw new GameError("Quest not found.", 404);
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
  if (!event) throw new GameError("No event with that code.", 404);
  if (event.status === "ended") throw new GameError("This event has ended.", 409);
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

export function listTeamNames(eventId: number): { id: number; name: string; members: number }[] {
  return db()
    .prepare(
      `SELECT t.id, t.name, (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) AS members
       FROM teams t WHERE t.event_id = ? ORDER BY members DESC, t.name`,
    )
    .all(eventId) as { id: number; name: string; members: number }[];
}

/* ------------------------------------------------------------- completions */

export type CompleteResult =
  | { status: "arrived"; quest: PublicQuest & { brief: string } }
  | {
      status: "done";
      quest: PublicQuest & { brief: string };
      awarded: number;
      teamBonus: number;
      repeat: boolean;
      teamProgress?: { have: number; need: number };
    };

const attempts = new Map<string, { n: number; reset: number }>();

function throttle(key: string, limit: number, windowMs: number) {
  const t = now();
  const cur = attempts.get(key);
  if (!cur || cur.reset < t) {
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
  if (event.status !== "live") {
    throw new GameError(event.status === "draft" ? "The organizer has not opened this event yet." : "This event has ended.", 409);
  }
  const d = db();
  const quest = d
    .prepare("SELECT * FROM quests WHERE event_id = ? AND token = ?")
    .get(event.id, clean(questToken, 64)) as QuestRow | undefined;
  if (!quest) throw new GameError("That code is not a station in this event.", 404);

  const pub = { ...toPublicQuest(quest), brief: quest.brief };
  const done = d
    .prepare("SELECT 1 FROM completions WHERE quest_id = ? AND player_id = ?")
    .get(quest.id, player.id);

  if (quest.kind === "answer") {
    if (done) return { status: "done", quest: pub, awarded: 0, teamBonus: 0, repeat: true };
    if (answer === undefined) return { status: "arrived", quest: pub };
    throttle(`${player.id}:${quest.id}`, 8, 60_000);
    if (normaliseAnswer(answer) !== normaliseAnswer(quest.answer ?? "")) {
      throw new GameError("Not quite. Check the station and try again.", 422);
    }
  } else if (quest.kind === "team" && !player.team_id) {
    throw new GameError("Join a team to take part in team quests.", 409);
  }

  if (done) {
    return { status: "done", quest: pub, awarded: 0, teamBonus: 0, repeat: true, teamProgress: teamProgress(quest, player) };
  }

  let teamBonus = 0;
  d.transaction(() => {
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

/* ---------------------------------------------------------------- the board */

export type PlayerScore = { id: number; name: string; team: string | null; score: number; done: number };
export type TeamScore = { id: number; name: string; members: number; score: number; done: number };
export type FeedItem = { id: number; at: number; player: string | null; team: string | null; quest: string; points: number; bonus: boolean };

export type Snapshot = {
  event: { code: string; name: string; venue: string; status: EventStatus };
  version: number;
  totals: { players: number; teams: number; quests: number; completions: number; points: number };
  players: PlayerScore[];
  teams: TeamScore[];
  feed: FeedItem[];
};

export function snapshot(event: EventRow, limit = 50): Snapshot {
  const d = db();
  const players = d
    .prepare(
      `SELECT p.id, p.name, t.name AS team,
              COALESCE(SUM(c.points), 0) AS score, COUNT(c.id) AS done, MAX(c.at) AS last
       FROM players p
       LEFT JOIN teams t ON t.id = p.team_id
       LEFT JOIN completions c ON c.player_id = p.id
       WHERE p.event_id = ?
       GROUP BY p.id
       ORDER BY score DESC, (last IS NULL), last ASC, p.id ASC
       LIMIT ?`,
    )
    .all(event.id, limit) as (PlayerScore & { last: number | null })[];

  const teams = d
    .prepare(
      `SELECT t.id, t.name,
              (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id) AS members,
              COALESCE(SUM(c.points), 0) AS score,
              COUNT(c.id) AS done, MAX(c.at) AS last
       FROM teams t
       LEFT JOIN completions c ON c.team_id = t.id
       WHERE t.event_id = ?
       GROUP BY t.id
       ORDER BY score DESC, (last IS NULL), last ASC, t.id ASC`,
    )
    .all(event.id) as (TeamScore & { last: number | null })[];

  const feed = d
    .prepare(
      `SELECT c.id, c.at, p.name AS player, t.name AS team, q.title AS quest, c.points, c.bonus
       FROM completions c
       JOIN quests q ON q.id = c.quest_id
       LEFT JOIN players p ON p.id = c.player_id
       LEFT JOIN teams t ON t.id = c.team_id
       WHERE c.event_id = ?
       ORDER BY c.at DESC, c.id DESC LIMIT 14`,
    )
    .all(event.id)
    .map((r) => {
      const row = r as Omit<FeedItem, "bonus"> & { bonus: number };
      return { ...row, bonus: row.bonus === 1 };
    }) as FeedItem[];

  const count = (sql: string) => (d.prepare(sql).get(event.id) as { n: number }).n;
  const fresh = getEventById(event.id)!;
  return {
    event: { code: event.code, name: event.name, venue: event.venue, status: fresh.status },
    version: fresh.version,
    totals: {
      players: count("SELECT COUNT(*) AS n FROM players WHERE event_id = ?"),
      teams: count("SELECT COUNT(*) AS n FROM teams WHERE event_id = ?"),
      quests: count("SELECT COUNT(*) AS n FROM quests WHERE event_id = ?"),
      completions: count("SELECT COUNT(*) AS n FROM completions WHERE event_id = ? AND player_id IS NOT NULL"),
      points: count("SELECT COALESCE(SUM(points), 0) AS n FROM completions WHERE event_id = ? AND player_id IS NOT NULL"),
    },
    players: players.map(({ last: _l, ...p }) => p),
    teams: teams.map(({ last: _l, ...t }) => t),
    feed,
  };
}

export type PlayerView = {
  me: { id: number; name: string; team: string | null; score: number; rank: number | null; of: number };
  team: { name: string; score: number; rank: number; of: number } | null;
  quests: (PublicQuest & { done: boolean; teamHave?: number })[];
};

export function playerView(event: EventRow, player: PlayerRow): PlayerView {
  const d = db();
  const snap = snapshot(event, 1000);
  const idx = snap.players.findIndex((p) => p.id === player.id);
  const mine = snap.players[idx];
  const teamRow = player.team_id ? snap.teams.findIndex((t) => t.id === player.team_id) : -1;
  const doneIds = new Set(
    (d.prepare("SELECT quest_id FROM completions WHERE player_id = ?").all(player.id) as { quest_id: number }[]).map((r) => r.quest_id),
  );
  const teamCounts = new Map<number, number>();
  if (player.team_id) {
    for (const r of d
      .prepare("SELECT quest_id, COUNT(*) AS n FROM completions WHERE team_id = ? AND player_id IS NOT NULL GROUP BY quest_id")
      .all(player.team_id) as { quest_id: number; n: number }[]) {
      teamCounts.set(r.quest_id, r.n);
    }
  }
  return {
    me: {
      id: player.id,
      name: player.name,
      team: teamRow >= 0 ? snap.teams[teamRow].name : null,
      score: mine?.score ?? 0,
      rank: idx >= 0 ? idx + 1 : null,
      of: snap.players.length,
    },
    team:
      teamRow >= 0
        ? { name: snap.teams[teamRow].name, score: snap.teams[teamRow].score, rank: teamRow + 1, of: snap.teams.length }
        : null,
    quests: listQuests(event.id).map((q) => ({
      ...toPublicQuest(q),
      done: doneIds.has(q.id),
      teamHave: q.kind === "team" ? Math.min(teamCounts.get(q.id) ?? 0, q.team_size) : undefined,
    })),
  };
}

/** How many players have reached each station. Used by the landing page's line map. */
export function questReach(eventId: number): Map<number, number> {
  const rows = db()
    .prepare("SELECT quest_id, COUNT(*) AS n FROM completions WHERE event_id = ? AND player_id IS NOT NULL GROUP BY quest_id")
    .all(eventId) as { quest_id: number; n: number }[];
  return new Map(rows.map((r) => [r.quest_id, r.n]));
}

export function findPlayerByName(eventId: number, name: string): PlayerRow | undefined {
  return db().prepare("SELECT * FROM players WHERE event_id = ? AND name = ? ORDER BY id LIMIT 1").get(eventId, name) as PlayerRow | undefined;
}
