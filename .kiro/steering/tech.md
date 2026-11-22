# Tech: how QuestOps is built

- **Framework:** Next.js App Router, TypeScript strict, React 19. Server components for pages; client components only where state or live data needs them.
- **Data:** SQLite through `better-sqlite3` in `lib/db.ts`. Every write that changes what clients see bumps `events.version` in the same transaction. New columns go through `ensureColumn` so existing databases upgrade in place.
- **Live data:** `lib/bus.ts` runs one loop per event while it has subscribers and shares a memoised frame. Never add a per-connection database poll.
- **Domain logic:** `lib/game.ts`. Throw `GameError(message, status)` for anything a user can cause; route handlers wrap with `handler()` from `lib/http.ts`, which adds the organizer gate and the same-origin check.
- **AI:** `lib/ai.ts` behind one `generateQuests` call. Groq, Anthropic or OpenAI by env key (first set wins, in that order), built-in packs as the fallback. Model output is validated with `coerce` before anyone sees it.
- **Styling:** plain CSS with tokens in `app/tokens.css`. No colour or font literal outside the token block. No Tailwind.
- **Checks:** `npm run typecheck` and `npm run build` must pass. The Hallmark linter runs on `app/globals.css`.
- **Security:** inputs are cleaned with `clean()` at the boundary, SQL is always parameterised, cookies are httpOnly and SameSite=Lax, CSV exports neutralise formula cells.
