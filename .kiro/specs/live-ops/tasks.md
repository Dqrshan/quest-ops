# Implementation plan: Live event operations

- [x] 1. Shared broadcaster and frame cache
  - [x] 1.1 Add `lib/bus.ts`: one loop per event, coalesced broadcasts, stops with no subscribers
  - [x] 1.2 Memoise the snapshot and full ranks per `(eventId, version)`
  - [x] 1.3 Rewrite the board stream on the bus; add the personal player stream
  - _Requirements: 1.1–1.5_

- [x] 2. Event-day state
  - [x] 2.1 Migrate `events` (`paused`, `ends_at`, `round_label`); add `adjustments` and `announcements`
  - [x] 2.2 Include adjustments in player and team scores and in the feed
  - [x] 2.3 Refuse check-ins while paused
  - [x] 2.4 Endpoints: announcements, clock and pause, adjust, remove player, export CSV, live view
  - _Requirements: 2, 3, 4, 5, 6_

- [ ] 3. AI setup flow
  - [x] 3.1 Storyline in AI output; built-in haunted and classic packs
  - [ ] 3.2 `/api/console/generate` (done, verified) and the guided setup at `/console/new`
  - _Requirements: 9_

- [x] 4. Haunted Hall demo
  - [x] 4.1 Seed the Halloween demo event
  - [x] 4.2 Simulator in the bus: check-ins, announcements, reset, clock renewal
  - _Requirements: 10_

- [ ] 5. Console mission control
  - [ ] 5.1 Live tab: status, pause, round clock, announcements, station reach, stalled players, feed
  - [ ] 5.2 Players tab: search, adjust, remove; export
  - [ ] 5.3 Stations tab: existing list and AI drafting
  - _Requirements: 2, 3, 4, 5, 6_

- [ ] 6. Player phone
  - [ ] 6.1 Personal stream; level and progress; next station
  - [ ] 6.2 Station sheet; correct team progress copy
  - [ ] 6.3 Celebration and haptics; announcement banner; round clock
  - [ ] 6.4 Recap on event end with share
  - _Requirements: 7_

- [ ] 7. Venue screen
  - [ ] 7.1 Round clock, announcement takeover, spotlight
  - [ ] 7.2 Finale with top three
  - _Requirements: 8_

- [ ] 8. Verify
  - [ ] 8.1 End-to-end API script covering every requirement above
  - [ ] 8.2 Headless browser pass on phone and desktop for each surface
