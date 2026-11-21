# QuestOps

Gamified event management: AI-drafted quests, QR stations, teams, and a live leaderboard.

## Run it

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:3000
```

A demo event (`DEMO26`, generated players) is created on first visit.

| Surface | URL |
| --- | --- |
| Landing | `/` |
| Organizer console | `/console` |
| Participant phone view | `/play/<code>` (station QR links add `?q=<token>`) |
| Venue screen | `/board/<code>` |
| Printable station cards | `/console/<id>/print` |

## How it works

- **Stack:** Next.js (App Router), TypeScript, plain CSS tokens (Hallmark "Wayfind" theme), SQLite via better-sqlite3 (`data/questops.db`).
- **Quest types:** `scan` (reach the station), `answer` (read a codeword or answer a question; answers stay server-side), `team` (N teammates scan, then the team gets a bonus).
- **Live updates:** `/api/board/<code>/stream` is a Server-Sent Events stream that pushes a snapshot whenever the event changes.
- **AI:** `lib/ai.ts` calls Anthropic or OpenAI when `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set. Otherwise a built-in generator is used. Drafts are always reviewed before they are saved.
- **Organizer access:** set `CONSOLE_PASSCODE`. Unset, the console is open in development and disabled in production.
- **Participants:** no accounts. A name (and optional team) sets an httpOnly cookie.

## Not built yet

Accounts and roles, payments or ticketing, photo-proof quests, offline mode, rate limiting beyond answer attempts, and multi-instance deployment (SQLite and in-memory throttling assume one server).
