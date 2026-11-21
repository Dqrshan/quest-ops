# Design: Live event operations

## Overview

The phase adds four things on top of the existing Next.js + SQLite app: a shared broadcaster per event, new event-day state (announcements, round clock, pause, adjustments), richer clients (console mission control, guided phone, self-running venue screen) and a self-playing demo.

## Architecture

```
            ┌────────────── SQLite (WAL) ──────────────┐
            │ events  quests  teams  players            │
            │ completions  adjustments  announcements   │
            └──────────────────┬───────────────────────┘
                               │ version bump on every write
                 ┌─────────────▼─────────────┐
                 │ lib/bus.ts  (one per event)│  polls events.version every 400 ms
                 │  - cached Frame (version)  │  only while it has subscribers
                 │  - board payload string    │
                 │  - demo simulator          │
                 └──────┬──────────────┬──────┘
        board stream    │              │   player stream
  /api/board/[code]/stream            /api/play/[code]/stream
     venue screen, console,              each phone: rank, score, level,
     landing demo                        team, clock, announcements
```

### Why a version column instead of a pub/sub library

Every write already runs in one process with SQLite. Bumping `events.version` inside the same transaction as the write keeps change detection exact and survives a hot reload. The bus reads one integer per event per tick, which costs microseconds. Moving to several servers would mean swapping the bus for Postgres `LISTEN/NOTIFY` or Redis; the bus interface (`subscribe(eventId, fn)`) stays the same.

### Frame cache

`frame(event)` returns `{ version, snap, ranks }`:

- `snap` is the public snapshot: top 50 players, all teams, feed, stations reached, clock, announcements.
- `ranks` maps player id to `{ rank, score, done }` over every player, for personal streams.

It is memoised by `(eventId, version)`, so a burst of 300 phones costs one computation per change.

## Data model changes

| Table | Change | Why |
| --- | --- | --- |
| `events` | `paused INTEGER`, `ends_at INTEGER`, `round_label TEXT` | pause and round clock (Req 3) |
| `adjustments` | new: `player_id`, `points`, `reason`, `at` | organizer corrections (Req 5) |
| `announcements` | new: `body`, `tone`, `at` | broadcasts (Req 2) |

Columns are added with an idempotent `ensureColumn` so existing databases upgrade in place. Scores are `SUM(completions) + SUM(adjustments)`; a team's score adds its members' adjustments.

## Interfaces

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/play/[code]/stream` | GET (SSE) | personal frame for the cookie's player |
| `/api/console/events/[id]/live` | GET | stalled players, station reach, full standings |
| `/api/console/events/[id]/announcements` | POST, DELETE | broadcast and retract |
| `/api/console/events/[id]` | PATCH | `status`, `paused`, `endsAt`, `roundLabel`, details |
| `/api/console/events/[id]/adjust` | POST | award or remove points |
| `/api/console/events/[id]/players/[pid]` | DELETE | remove a player |
| `/api/console/events/[id]/export` | GET | CSV results |
| `/api/console/generate` | POST | AI draft before an event exists (setup flow) |

All console endpoints keep the existing organizer gate and same-origin check.

## Client behaviour

- **Clock skew:** every frame carries the server's `now`. Clients store `offset = serverNow - Date.now()` and count down against `Date.now() + offset`.
- **Announcements:** phones show the newest one younger than 10 minutes until dismissed; the venue screen takes over for 12 seconds when a newer id arrives.
- **Spotlight:** the venue screen picks the newest feed item that is a first arrival or a team bonus.
- **Celebration:** a single authored moment on a successful check-in, built from `transform` and `opacity`, removed under `prefers-reduced-motion`. `navigator.vibrate` where available.

## Demo simulator

The demo event is ordinary data. While the bus has subscribers for it, a timer every 4 to 8 seconds picks a simulated player with stations left and checks them in through the same `checkIn` path players use. About every two minutes it posts a line from a fixed list of announcements. When nobody has stations left, it clears the demo's completions and adjustments and replays the opening state. The clock is renewed to 30 minutes whenever it runs out.

## Error handling

Domain errors stay `GameError(message, status)` and reach clients as `{ error }` with the status code. Streams send `retry: 2000` and the client falls back to polling if `EventSource` is missing.

## Testing

The API flow is exercised end to end with a script that creates an event, drafts and saves stations, joins two players, scans, answers, triggers a team bonus, adjusts points, pauses, exports and reads both streams.
