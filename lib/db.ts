import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const globalForDb = globalThis as unknown as { __questopsDb?: Database.Database };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  blurb TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','ended')),
  version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('scan','answer','team')),
  points INTEGER NOT NULL DEFAULT 100,
  answer TEXT,
  hint TEXT,
  team_size INTEGER NOT NULL DEFAULT 1,
  token TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS quests_event ON quests(event_id, position);
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (event_id, name)
);
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  joined_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS players_event ON players(event_id);
CREATE TABLE IF NOT EXISTS completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  bonus INTEGER NOT NULL DEFAULT 0,
  at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS completions_player ON completions(quest_id, player_id) WHERE player_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS completions_team_bonus ON completions(quest_id, team_id) WHERE player_id IS NULL;
CREATE INDEX IF NOT EXISTS completions_event ON completions(event_id, at);
`;

export function db(): Database.Database {
  if (!globalForDb.__questopsDb) {
    const file = process.env.QUESTOPS_DB ?? path.join(process.cwd(), "data", "questops.db");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const d = new Database(file);
    d.pragma("journal_mode = WAL");
    d.pragma("foreign_keys = ON");
    d.pragma("busy_timeout = 3000");
    d.exec(SCHEMA);
    globalForDb.__questopsDb = d;
  }
  return globalForDb.__questopsDb;
}
