---
inclusion: fileMatch
fileMatchPattern: ["app/**/*.css", "components/**/*.tsx", "app/**/*.tsx"]
---

# Design: The Midnight Picture Show

Every surface treats the event as tonight's feature at a 1950s midnight monster-movie double bill. The venue screen is the cinema screen, the phone is the player's ticket, the console is the projection booth, and printed station cards are admit-one tickets.

## Tokens (all in `app/tokens.css`; no literal colour or font elsewhere)

- Ground: warm red-black `--color-paper` family. Type: bone `--color-ink` family.
- Two print passes: radium green `--color-accent` for what is live (scores, the clock, the primary action, the next station); blood red `--color-blood` for alarms, endings, the scan celebration and the score-change flash.
- Ticket stock: `--color-ticket` / `--color-ticket-ink`. QR codes always sit on `--color-qr-ground` so cameras read them in the dark.
- Faces: Antonio (display, uppercase, poster billing), Hanken Grotesk (body), Azeret Mono (every number, via `.num`). Two weights only: 400 and 700.

## Rules

- Square corners. Depth comes from rules (`--rule-hair`, `--rule-bar`, `--rule-heavy`), never soft card shadows.
- One filled primary button per screen. Red-filled buttons only inside a destructive confirm.
- Uppercase display heads need line-height 1 or more.
- No eyebrow labels above headings; the heading carries itself.
- Never colour alone to carry meaning: live states also say "Live", red states also say "Paused", "Ended" or the error.
- Motion: one authored moment per surface (the scan slam on the phone, the 3-2-1 leader and intermission card on the venue screen, the credits roll at the end). Everything has a `prefers-reduced-motion` fallback and content is visible without it.
- Controls name their action in plain words even when the copy around them is in character ("Pause play", not "Cut the reel").
- Run the Hallmark linter (`sloplint.mjs app/globals.css --render`) after style changes; the hook does it on save.
