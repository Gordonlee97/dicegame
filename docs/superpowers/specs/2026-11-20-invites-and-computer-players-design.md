# Invites, guest-first entry, and computer players — design

Date: 2026-11-20
Status: approved by owner 2026-11-20

## Why

Nobody plays the game. The owner wants friends — usually playing apart, each at home on their own device — to be able to play. Today a visitor can't play at all unless another human is already in the same room at the same time: there are no computer opponents, no invite links, and everyone defaults to a shared room named `LOBBY` with the name `Player`.

This is project 1 of 4 in an overhaul (owner-approved order):
1. **Invites, guest-first entry, computer players** ← this doc
2. Remote-play reliability: server-enforced turn timer, AFK handling, reconnects
3. Visual/feel overhaul (animations, reactions, look)
4. Code cleanup throughout

Approach (owner picked "A"): modernize in place. Keep vanilla JS with no build step and the existing deploy pipelines; split code into native ES modules as it's touched; keep the existing server-authoritative game engine.

## Goals

- A friend tapping an invite link is in the room after typing only their name.
- One person can start a full game immediately by adding computer players.
- Computer players are good enough to be fun: they bid plausibly, bluff sometimes, and call Dudo when a bid looks unlikely. Not trivially exploitable, not perfect.

## Non-goals (this project)

- Public matchmaking / playing strangers.
- Server-enforced turn timer and AFK takeover (project 2).
- Visual redesign beyond the two screens touched here (project 3) — but new UI here must not use emoji icons (owner: "tacky"); use text labels or simple line-drawn SVG.
- Difficulty levels for computer players.

## Anti-goals

- Making sign-in required or more prominent. Guest play is the default.
- Breaking reconnect, spectator promotion, reveal sequencing, or rematch.
- Computer players acting instantly (feels robotic) or so slowly the game drags.

## Design

### Entry screen (replaces current join screen)

```
           PERUDO

  Your name  [ Gordon     ]

  [   Start a game   ]

  Have a code? [____] Join
  Sign in (optional)
```

- Name is remembered in `localStorage` (wrapped in try/catch; works without it).
- **Start a game**: client asks server to create a room; server generates a fresh 4-character code with the existing `createShortRoomCode` plus the uniqueness loop already in `createRematchRoomId` (reuse/extract it), and joins the player to it. Codes are stored lowercase and displayed uppercase, as today.
- **Join**: existing join-by-code path.
- **Sign in (optional)**: reveals the existing account form (sign-in / create account). Account behavior unchanged.
- The default room `LOBBY` and default name `Player` are removed: in `index.html` (both the guest room field and the separate account-form room field `room-id-account`, which merge into the one code field above) and on the server (`sanitizeName` falls back to `'Player'`, `sanitizeRoomId` to `'lobby'`; these become join errors instead). Empty name → inline validation, not a silent default.

### Invite links

- Format: `<frontend origin>/?room=KQZT`.
- Opening it shows the entry screen with the code pre-filled and the primary button reading **Join KQZT's game** (or "Join game KQZT"); "Start a game" is hidden in this state. If a name is remembered, the name field is pre-filled; joining still takes one tap (no auto-join — avoids accidental joins on link previews).
- If the room no longer exists, joining creates it (current server behavior) — acceptable; the waiting room makes it obvious nobody's there.
- After joining any room, the URL is updated with `history.replaceState` to `?room=CODE` so refresh/reconnect and copying the address bar both work.

### Waiting room

```
  Room KQZT                waiting…

  Gordon (you)
  Maria
  Pedro        computer     [remove]

  [ Invite friends ]
  [ Add computer player ]
  [ Start game ]
```

- **Invite friends**: `navigator.share({ url })` when available (phones), else copy link to clipboard with a "Link copied" confirmation.
- **Add computer player** / **remove**: any seated human in the waiting phase can do this (there is no host concept today; `start_game` is already anyone-can). Disabled when 6 seats are full. Only in `waiting` phase.
- Computer players are marked with a text label ("computer"), no emoji.

### Computer players — server

- Represented as normal entries in `game.players` with `isBot: true`, `ws: null`, `authType: 'bot'`, a generated `id`, and a name from a fixed list of Spanish-flavored names (e.g. Pedro, Lucía, Mateo, Valentina, Diego, Camila), unique within the room.
- `send()` to a null socket is already a no-op (`server.js` `send` checks `ws && ws.readyState === ws.OPEN`). Code that looks players up by socket (`findPlayerBySocket`, `clientToRoom`) must never match a bot via `null`.
- `buildStateForPlayer` exposes `isBot` per player.
- New inbound WS messages: `add_bot`, `remove_bot { playerId }`. Validation: sender seated and non-spectator, phase `waiting` and `roundNumber === 0`, seat available / target is a bot.
- **Scheduler** (new module, e.g. `game/BotController.js`): after every state broadcast for a room, if the current turn player is a bot and no action is already scheduled for that room, schedule one after a random 1.2–3.0 s delay. On fire, re-check it's still that bot's turn in the same round (state may have changed), compute the decision, and apply it, then broadcast. Cancel pending timers when a room is deleted.
- **Shared action path**: the `GameManager` handlers (`handleBid` etc.) resolve the player from `ws` via `getContext(ws)`, which a bot can't use. Refactor each into a player-based core (`applyBid(game, player, bid)` etc.) that does the game call plus the bookkeeping (`appendMatchAction`, `broadcastState`, `finalizeMatchIfNeeded`), with the existing `ws` handlers as thin wrappers. Bots call the core. No duplicated bookkeeping.
- Bots only act on their own turn, so they only call Calza on their own turn (humans can call it out of turn). *Builder's call: simpler; revisit if bots feel weak.*
- **Waiting for the reveal**: in the client, the resolution modal stays open until the player clicks close, after a ~2.5 s Dudo announcement. A fixed pause would let bots bid behind the modal. Instead add an inbound WS message `reveal_done { eventId }` sent when a client closes the resolution modal. After a resolution, bots wait until every *connected* human has sent `reveal_done` for that `eventId`, or 15 s pass, whichever comes first. Gets an integration test. *Builder's call.*
- **Fast-forward when no human is still in** (owner decision): once every human is eliminated or a spectator but 2+ bots remain, bots skip the reveal wait and act after ~0.5 s per move, so the game finishes quickly. Humans still watch it and get the normal game-over screen and Rematch.
- **While no human is connected** (all humans in the reconnect grace window), bots pause; they resume when a human reconnects. *Builder's call.*
- Bots never chat, never call `end_game`, `set_turn_timer`, or `rematch` themselves.

### Computer players — strategy (`game/BotStrategy.js`, pure functions, unit-tested)

Input: own dice, total dice in play, last bid, palifico flags, active player count. Output: `{ action: 'bid', quantity, face } | { action: 'dudo' } | { action: 'calza' }`.

- Expected count of face F = (own matching dice) + (unknown dice × p), where p = 1/3 for faces 2–6 outside palifico (face or wild 1), 1/6 for 1s or in palifico.
- **Dudo** when last bid quantity exceeds expected by a threshold, with noise so the threshold varies per decision.
- **Calza** rarely: only when the bid is within ~0.5 of expected and calza is legal (not palifico, >2 active players, not own bid).
- **Bid** otherwise: enumerate legal raises (via `RuleValidator`), score each by how plausible it is given own dice, prefer faces the bot holds, occasionally (≈15%) pick a less-supported face as a bluff. Opening bid in non-palifico is never 1s (already a rule).
- Randomness is injectable (seeded RNG in tests).

### Rooms, leaving, rematch

- A room with only bots left is deleted (treat "no humans" as empty wherever `players.length === 0` currently means empty), and its bot timers cancelled. Humans in the reconnect grace window still count as humans.
- Socket lookups (`findPlayerBySocket`, `findPlayerIndexBySocket`) must never match on a `null` socket. This bug already exists for disconnected humans (`ws: null` during grace); the fix covers both.
- Bots don't hold seats for reconnect (they never disconnect).
- **Rematch**: when the first human transfers to the rematch room, the source room's bots are copied into it (fresh ids, same names). Later humans join as today.

### Accounts, stats, match history

- Bots appear in match-history participants with `authType: 'bot'`.
- Human account win/loss stats still count in games with bots (owner-approved proposal).
- If a bot wins, no account is credited (existing logic already only credits account participants).

## Testing

- `BotStrategy` unit tests with seeded RNG: never produces an illegal bid; calls Dudo on an impossible bid (quantity > total dice); doesn't Dudo an opening bid it can see is already met by its own dice; respects palifico and calza legality.
- Integration tests (existing in-process WS server style): create room returns a fresh code; `add_bot` / `remove_bot` validation; a 1-human + 2-bot game where the human always calls Dudo runs to game over without hanging; bot timers stop when the human leaves and the room is deleted; rematch carries bots.
- Use short bot delays in tests (make delays configurable via `GameManager` options).
- Existing 31 tests stay green.
- Manual check on a phone: share sheet opens; invite link opens pre-filled; full game vs bots plays smoothly with reveal modals.

## Module scope (builder's call)

Backend stays CommonJS (new modules included); converting it to ESM is out of scope. Frontend: `script.js` loads as `type="module"`, new frontend code (entry screen, invite/share, URL handling) goes in new module files, and only the parts of `script.js` this project rewrites move out. The full split of `script.js` is project 4.

## Left to the builder

- Module boundaries and file names beyond those suggested.
- Exact strategy constants (thresholds, bluff rate, delays), tuned by play.
- Whether "Start a game" uses a new `create_room` message or reuses `join` with an empty room id that the server fills in.
- Styling of the two touched screens, within the no-emoji rule; keep dark mode and the existing mobile breakpoints working.

## Approaches considered

- **A. Modernize in place (picked):** no build step, existing deploys, server-side bots next to the tested engine. Fastest to visible results, lowest risk.
- **B. New frontend toolchain (Vite + TypeScript):** cleaner long-term structure, but a frontend rewrite and deploy-pipeline change before anything visible improves.
- **Full rewrite of both halves:** rejected — the backend rules engine is solid and tested.
