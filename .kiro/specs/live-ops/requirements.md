# Requirements: Live event operations

## Introduction

QuestOps already lets an organizer set up stations and lets players scan them. This phase makes the product usable while an event is running: the organizer steers the night from one console, players always know where to go next, the venue screen carries the room, and the system holds up with hundreds of phones connected. It also adds a Halloween demo event that plays itself, so anyone can see the product working without organising anything.

## Glossary

- **Organizer**: the person running the event from the console.
- **Player**: a participant on their phone. Joins with a name and an optional team.
- **Station**: a quest placed at a physical location and marked with a QR code.
- **Venue screen**: the leaderboard shown on a projector or TV at the event.
- **Round clock**: a countdown the organizer sets for the current round.
- **Snapshot**: the computed standings, feed and event state at one version.

## Requirements

### Requirement 1: Scale the live connections

**User story:** As an organizer, I want the board and phones to stay live when hundreds of people are playing, so that the event does not stall at its busiest moment.

#### Acceptance criteria

1. WHEN any number of clients are connected to one event THEN the system SHALL run at most one change-detection loop for that event.
2. WHEN the event version changes THEN the system SHALL compute the snapshot once and reuse it for every connected client.
3. WHEN a player's standing changes THEN the system SHALL push the player's rank and score over their stream without the phone issuing further requests.
4. WHEN no client is connected to an event THEN the system SHALL stop that event's loop.
5. WHEN several changes happen within 400 ms THEN the system SHALL coalesce them into one broadcast.

### Requirement 2: Broadcast announcements

**User story:** As an organizer, I want to send a message to every phone and the venue screen, so that I can redirect the crowd without a microphone.

#### Acceptance criteria

1. WHEN the organizer sends an announcement THEN every connected phone SHALL show it as a banner within two seconds.
2. WHEN a new announcement arrives THEN the venue screen SHALL show it full-size for at least ten seconds.
3. WHEN the organizer deletes an announcement THEN it SHALL disappear from phones and the venue screen.
4. IF an announcement is empty or longer than 200 characters THEN the system SHALL reject it with a message saying so.

### Requirement 3: Run the clock

**User story:** As an organizer, I want to start a timed round and pause play, so that I control the pace of the night.

#### Acceptance criteria

1. WHEN the organizer starts a round of N minutes THEN phones and the venue screen SHALL show the same countdown, corrected for clock skew between server and device.
2. WHEN the organizer pauses the event THEN the system SHALL refuse new check-ins with a message that the event is paused.
3. WHEN the organizer resumes THEN check-ins SHALL work again without players rejoining.
4. WHEN the round clock reaches zero THEN clients SHALL show that time is up; check-ins SHALL continue until the organizer ends the event.

### Requirement 4: See who is where

**User story:** As an organizer, I want to see which stations are busy, which are cold and who has stalled, so that I can send help where it is needed.

#### Acceptance criteria

1. The console SHALL show, for each station, how many players have reached it.
2. The console SHALL list players with no activity in the last 15 minutes who have stations left.
3. The console SHALL show the live feed of check-ins, team bonuses and point adjustments.

### Requirement 5: Correct the scores

**User story:** As an organizer, I want to award or remove points and remove a player, so that I can reward a costume, fix a mistake or deal with an abusive name.

#### Acceptance criteria

1. WHEN the organizer adjusts a player's points with a reason THEN the player's score and their team's score SHALL change by that amount, and the feed SHALL show it.
2. IF the adjustment is zero or outside -1000 to 1000 THEN the system SHALL reject it.
3. WHEN the organizer removes a player THEN the player's points SHALL leave the standings and their session SHALL stop working.

### Requirement 6: Export the results

**User story:** As an organizer, I want the final standings as a spreadsheet, so that I can hand out prizes and report on the event.

#### Acceptance criteria

1. WHEN the organizer exports THEN the system SHALL return a CSV with rank, name, team, score, stations reached and join time.
2. The export SHALL neutralise cells that begin with `=`, `+`, `-` or `@` so a spreadsheet does not run them as formulas.

### Requirement 7: Guide the player

**User story:** As a player, I want to know what each station asks, where it is and how I am doing, so that I keep playing instead of wandering.

#### Acceptance criteria

1. WHEN a player taps a station THEN the phone SHALL show its brief, hint, type and points, with a way to scan it.
2. The phone SHALL show the player's level, the points to the next level and the next unfinished station.
3. WHEN a check-in succeeds THEN the phone SHALL play a short celebration and vibrate where the device supports it, and SHALL skip the motion under reduced-motion settings.
4. A team station SHALL show the player's own state separately from the team's progress.
5. WHEN the event ends THEN the phone SHALL show a recap with final rank, score and stations reached, and let the player share it.

### Requirement 8: Carry the room

**User story:** As an organizer, I want the venue screen to tell the story of the night by itself, so that I never have to touch it.

#### Acceptance criteria

1. The venue screen SHALL show the round clock, the join code and QR, team and player standings, and the feed.
2. WHEN a player is first to reach a station, or a team unlocks a bonus THEN the venue screen SHALL spotlight it.
3. WHEN the event ends THEN the venue screen SHALL switch to a finale showing the top three teams and players.

### Requirement 9: Set up an event in one pass

**User story:** As an organizer, I want a guided setup that goes from a description to a printed route, so that I can prepare an event in minutes.

#### Acceptance criteria

1. The setup SHALL walk through details, an AI brief, a review of the drafted stations, and creation.
2. The AI SHALL return a short storyline along with the stations, and the storyline SHALL be saved as the event description.
3. IF no AI key is configured or the provider fails THEN the built-in generator SHALL produce the draft and the console SHALL say so.

### Requirement 10: A demo that plays itself

**User story:** As a visitor or judge, I want to see a live event without organising one, so that I understand the product in a minute.

#### Acceptance criteria

1. The system SHALL provide a Halloween demo event with generated players.
2. WHILE someone is watching the demo THEN simulated players SHALL check in every few seconds and the organizer's side SHALL post occasional announcements.
3. WHEN the simulated players have finished THEN the demo SHALL reset and play again.
4. The demo SHALL be labelled as simulated wherever its figures appear.
