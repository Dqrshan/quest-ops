# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (mobile-first PWA for participants; desktop console for organizers; big-screen board for venues)

## Stack

Delegated (user answered "continue" to the defaults offer). Chosen: Next.js App Router, TypeScript, plain CSS tokens, SQLite (better-sqlite3) for zero-setup local runs, Server-Sent Events for live updates, a provider-agnostic AI interface with a mock fallback.

## Product

QuestOps turns an event into a game. Organizers describe an event, an AI drafts the quests, and the console prints one QR code per station. Participants join on their phones, scan stations, answer questions, work as teams, and climb a live leaderboard that also runs on the venue screen.

## Users

- **Organizers** (hackathons, college fests, conferences, company offsites): set up the event, review AI-drafted quests, print QR codes, watch check-ins and scores live. Working at a desk before the event, on a laptop or phone during it.
- **Participants**: on a phone, standing in a crowd, one-handed, possibly bad signal. Need to join in seconds without an account.
- **Venue screen**: read from several metres away.

## Constraints

- Participants join without accounts (name + team only).
- Answers to quizzes never leave the server.
- Organizer console is gated by a passcode in production.

## Assumptions (labelled, not confirmed by the user)

- Audience, primary action ("Run your event" for organizers; join flow as the demo) and tone (playful with a technical edge) were inferred from the brief.
- No logo, photographs, metrics, testimonials, or customer names were provided. None are invented.
- Auth beyond the passcode, payments, and ticketing are out of scope for this slice.
