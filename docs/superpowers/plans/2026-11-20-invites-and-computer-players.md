# Invites, Guest-First Entry, and Computer Players Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One person can start a game instantly (with computer players), and friends join from an invite link by typing only their name.

**Architecture:** Server-authoritative as today. Computer players ("bots") are ordinary entries in `game.players` with `isBot: true, ws: null`, driven by a new `BotController` (scheduling) that calls a pure `BotStrategy` (decisions) and acts through new player-based action cores in `GameManager` that the existing `ws` handlers also use. Frontend stays vanilla JS with no build step; `script.js` becomes an ES module and new UI code lives in `client/*.js` modules.

**Tech Stack:** Node.js ≥20 (local is 24), CommonJS backend, `ws`, `node:test`; vanilla browser JS (ES modules), CSS.

**Spec:** `docs/superpowers/specs/2026-11-20-invites-and-computer-players-design.md`

## Global Constraints

- Backend stays CommonJS (`require`/`module.exports`), including new modules.
- Frontend: no build step, no new dependencies. New frontend files are ES modules under `client/`.
- No emoji icons in any new or touched UI. Text labels or simple line SVG only. Bots are labelled with the text "computer".
- Bot think delay: random 1200–3000 ms. Fast-forward delay: 500 ms. Reveal-wait cap: 15000 ms. All configurable via `GameManager` options (tests use small values).
- Max 6 seats per room (existing `maxPlayersPerRoom`).
- Bot names: Pedro, Lucía, Mateo, Valentina, Diego, Camila — unique within a room.
- Room codes stored lowercase, displayed uppercase. Invite link format: `<frontend origin>/?room=CODE`.
- No `LOBBY` room default and no `Player` name default, client or server.
- Preserve: reconnect tokens + grace window, spectator promotion, reveal sequencing (toast → modal → next round), rematch, dark mode, existing mobile breakpoints.
- After each task: `npm test` all green, and `node --check` on every touched `.js` file (Node ≥22 auto-detects ES module syntax).
- Commit messages: what and why; no tool attribution lines.

## Review Focus

1. **Stale timers after the room changes under them** — a bot timer fires after the human left (room deleted), after `end_game` reset, or after the round moved on. Expect: no action, no crash. Test in Task 5.
2. **Duplicate scheduling** — several broadcasts in a row while it's a bot's turn. Expect: exactly one bot action per turn. Test in Task 5.
3. **Stale or bogus `reveal_done`** — an old `eventId`, a spectator's, or a bot-less room's. Expect: ignored, no early release, no error spam. Test in Task 5.
4. **Garbage invite codes** — `?room=../../x`, 40 characters, mixed case. Expect: sanitized exactly like a typed code (`[a-z0-9_-]`, max 24) and shown uppercase; empty after sanitizing → normal entry screen. Test in Task 6.
5. **Rematch with bots** — the first human to rematch brings the bots along, the second human lands in the same room, and bot names stay unique. Test in Task 4.

---

### Task 1: Null-socket lookups never match

Disconnected humans already have `ws: null`, and bots will too. `findPlayerBySocket(null)` currently matches them.

**Files:**
- Modify: `game/PerudoGame.js:25-31`
- Test: `tests/perudoGame.test.js`

**Interfaces:**
- Produces: `findPlayerBySocket(ws)` → `null` and `findPlayerIndexBySocket(ws)` → `-1` whenever `ws` is falsy.

- [ ] **Step 1: Write the failing test** `findPlayerBySocket ignores null sockets`: add two players `{ id:'a', name:'A', ws:null }` and `{ id:'b', name:'B', ws:{} }`. Assert `game.findPlayerBySocket(null) === null` and `game.findPlayerIndexBySocket(null) === -1`.
- [ ] **Step 2: Run** `node --test tests/perudoGame.test.js`. Expected: FAIL (returns player A).
- [ ] **Step 3: Guard both methods** so they return `null` / `-1` when `!ws`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass (32).
- [ ] **Step 5: Commit** `Never match a player by a null socket`

---

### Task 2: Room creation and no silent defaults (server)

**Files:**
- Modify: `game/GameManager.js` (`sanitizeName`, `sanitizeRoomId`, `createRematchRoomId`, `join`)
- Modify: `server.js` (message routing)
- Test: `tests/gameManager.test.js`, `tests/websocket.integration.test.js`

**Interfaces:**
- Produces: `sanitizeName(name) -> string` (`''` when empty) and `sanitizeRoomId(roomId) -> string` (`''` when empty after cleaning).
- Produces: `GameManager#createUniqueRoomCode() -> string`, a 4-character code not in `this.games`. `createRematchRoomId` delegates to it.
- Produces: `GameManager#createRoom(ws, incoming)`, the inbound `{ type:'create_room', name, authToken }`. It is `join` with a server-generated room id. The reply is the same `joined` payload, so the client handles both identically.
- `join` errors: empty guest name → `'Enter a name to join.'`; empty room id → `'Enter a room code.'`.

- [ ] **Step 1: Write failing unit tests**
  - `join without a name is rejected`: `join(ws,{name:'  ',roomId:'abcd'})` → the last sent payload is `{type:'error', message:'Enter a name to join.'}` and no game `'abcd'` exists.
  - `join without a room code is rejected`: `roomId:''` → `'Enter a room code.'`, and no `'lobby'` game.
  - `create_room puts the player in a fresh 4-char room`: `createRoom(ws,{name:'Ann'})` → `clientToRoom.get(ws)` matches `/^[a-z0-9]{4}$/`, and that game has 1 player named Ann. Two calls give different codes.
- [ ] **Step 2: Run** `node --test tests/gameManager.test.js`. Expected: 3 FAIL.
- [ ] **Step 3: Implement** the interfaces above. Account joins take their name from the token, so the empty-name check applies only to guests.
- [ ] **Step 4: Route `create_room`** in `server.js` next to `join`. Add the integration test `create_room over WebSocket returns joined with a new room`.
- [ ] **Step 5: Run** `npm test`. Expected: all pass. If existing tests relied on the defaults, give them explicit names/rooms. Do not loosen the new checks.
- [ ] **Step 6: Commit** `Add create_room and drop the LOBBY/Player defaults`

---

### Task 3: BotStrategy (pure decisions)

**Files:**
- Create: `game/BotStrategy.js`
- Test: `tests/botStrategy.test.js` (includes a 10-line seeded `mulberry32(seed) -> () => number` helper)

**Interfaces:**
- Produces: `expectedCount(face, ownDice, totalDice, palificoRound) -> number`. That is own matching dice plus `(totalDice - ownDice.length) * p`. `p = 1/3` for faces 2–6 outside palifico (the face or a wild 1), and `1/6` for face 1 or any face in palifico. Own matching dice count 1s as wild under the same rule as `RuleValidator.countMatchingDice`.
- Produces: `decideBotAction({ ownDice, totalDice, lastBid, palificoRound, palificoFace, activePlayerCount }, random) -> { action:'bid', quantity, face } | { action:'dudo' } | { action:'calza' }`. `lastBid` is `{quantity, face} | null`. `random` is a `() => number` in [0,1).
- Legality goes through `RuleValidator.isValidFirstBid` / `isValidRaisedBid`, with `players = [{ diceCount: totalDice }]`.

Behavior (the spec's rules; constants are the builder's to tune):
- Opening (`lastBid === null`): always bid.
- Dudo when `lastBid.quantity - expectedCount(lastBid.face, …)` exceeds a noisy threshold.
- Calza only when legal (not palifico, `activePlayerCount > 2`) and `|lastBid.quantity - expected| < 0.5`, and rarely then.
- Otherwise bid: enumerate legal raises, score them by plausibility given own dice (prefer held faces), and bluff about 15% of the time by picking a less-supported face. If no legal raise exists, dudo.

- [ ] **Step 1: Write the failing tests**
  - `expectedCount counts wild ones`: `expectedCount(5,[1,5,2],10,false) ≈ 2 + 7/3` (to 1e-9). `expectedCount(5,[1,5,2],10,true) ≈ 1 + 7/6`. `expectedCount(1,[1,5,2],10,false) ≈ 1 + 7/6`.
  - `never makes an illegal bid`: for seeds 1..500, generate random `ownDice` (1–5 dice), `totalDice` (own length..30), `lastBid` (null, or a random bid legal by `isValidFirstBid`), and random palifico (with `palificoFace = lastBid.face`). Every `bid` result passes the matching RuleValidator check.
  - `opening is always a bid`: 200 seeds with `lastBid:null` → the action is always `'bid'`, and never face 1 outside palifico.
  - `doubts an impossible bid`: `ownDice:[2,3]`, `totalDice:4`, `lastBid:{quantity:4, face:6}` → `'dudo'` for 200 seeds.
  - `does not doubt a bid its own dice already meet`: `ownDice:[5,5,5,1,2]`, `totalDice:10`, `lastBid:{quantity:3, face:5}` → never `'dudo'` across 200 seeds.
  - `never calzas when illegal`: with palifico, or with `activePlayerCount:2`, across 200 seeds → never `'calza'`.
- [ ] **Step 2: Run** `node --test tests/botStrategy.test.js`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `game/BotStrategy.js`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `Add computer-player decision strategy`

---

### Task 4: Bots as room members (add/remove, state, room lifecycle, rematch)

**Files:**
- Modify: `game/GameManager.js`, `game/PerudoGame.js` (`buildStateForPlayer`), `server.js` (routing)
- Test: `tests/gameManager.test.js`

**Interfaces:**
- Consumes: Task 1 (null-socket safety), Task 2 (`createUniqueRoomCode`).
- Produces: a player object `{ id: crypto.randomUUID(), name, isBot:true, ws:null, authType:'bot', accountUserId:null, accountUsername:null }`.
- Produces: `GameManager#handleAddBot(ws)` and `GameManager#handleRemoveBot(ws, { playerId })` for the inbound `add_bot` and `remove_bot`. Validation errors:
  - sender is a spectator → `'Spectators cannot add computer players.'`
  - not waiting / game started → `'Computer players can only be changed before the game starts.'`
  - full → existing `addPlayer` error
  - target isn't a bot → `'That player is not a computer player.'`
- Produces: `GameManager#hasHumans(game) -> boolean`. True if any player has `!isBot`, including disconnected humans in the grace window. Every "room is empty" check (`removeBySocket`, `expireDisconnectedPlayer`, `handleRematch`) uses `!hasHumans(game)` instead of `players.length === 0`.
- Produces: `GameManager#deleteRoom(roomId)`, the existing cleanup block extracted (chat, settings, game, session, completed flag, reconnect tokens) plus `this.botController?.cancelRoom(roomId)`.
- State: each player in `buildStateForPlayer` gains `isBot: Boolean(item.isBot)`.
- Match history: bots appear as participants with `authType:'bot'`. `getParticipantKey` gives `bot:<id>`.
- Rematch: in `handleRematch`, when the target rematch room is created (first human), copy the source room's bots in with fresh ids and the same names.

- [ ] **Step 1: Write the failing tests**
  - `add_bot seats a named computer player`: Ann joins room `r1`, then `handleAddBot` twice → 3 players. The two bots have `isBot`, distinct names from the list, and the state payload sent to Ann has `isBot:true` on them.
  - `add_bot is rejected once the game started` (after `handleStartGame`) and `when 6 seats are full`.
  - `remove_bot removes only bots`: removing Ann's own id → error `'That player is not a computer player.'`.
  - `room with only bots is deleted when the last human leaves`: Ann + 2 bots, then `handleLeave(wsAnn)` → `games.has('r1') === false`.
  - `disconnected human still counts as human`: Ann + bot, Ann disconnects (not intentional) → the room still exists.
  - `rematch carries bots`: Ann, Bob and 1 bot reach game over. Ann rematches → the new room has Ann plus 1 bot with the same name and a new id. Bob rematches → he lands in the same room with 3 players.
- [ ] **Step 2: Run** `node --test tests/gameManager.test.js`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** the interfaces above and route `add_bot` / `remove_bot` in `server.js`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `Let players add computer players to a room`

---

### Task 5: Player-based action cores and BotController

**Files:**
- Modify: `game/GameManager.js`
- Create: `game/BotController.js`
- Modify: `server.js` (route `reveal_done`, pass bot options from env)
- Test: `tests/botController.test.js`, `tests/websocket.integration.test.js`

**Interfaces:**
- Produces, in `GameManager`: `applyBid(game, player, bid) -> {ok, error?}`, `applyDudo(game, player) -> {ok, error?}`, `applyCalza(game, player) -> {ok, error?}`. Each runs the `PerudoGame` call and, on success, `appendMatchAction` + `broadcastState` (+ `finalizeMatchIfNeeded` for dudo/calza), exactly as the current handlers do. `handleBid` / `handleDudo` / `handleCalza` become `getContext` + core + error send. Behavior stays the same.
- Produces: `class BotController { constructor({ manager, delayMinMs, delayMaxMs, fastForwardDelayMs, revealWaitCapMs, random }) ; onStateChanged(game) ; onRevealDone(game, playerId, eventId) ; cancelRoom(roomId) }`, exported via `module.exports = BotController`.
- `GameManager` options gain `bot: { delayMinMs=1200, delayMaxMs=3000, fastForwardDelayMs=500, revealWaitCapMs=15000, random=Math.random }`. The constructor creates `this.botController`. `broadcastState(game)` calls `this.botController.onStateChanged(game)` at the end.
- Produces: `GameManager#handleRevealDone(ws, { eventId })` for the inbound `{ type:'reveal_done', eventId }`. It calls `onRevealDone` and sends no error on stale input.
- `server.js` reads `BOT_DELAY_MIN_MS`, `BOT_DELAY_MAX_MS`, `BOT_FAST_FORWARD_MS`, `BOT_REVEAL_WAIT_CAP_MS` (each optional, numeric).

Scheduler rules (one pending timer per room at most):
- **Act when** phase is `bidding`, the current turn player is a bot, at least one human is connected (`!isBot && !isDisconnected`) unless fast-forwarding, and no reveal wait is pending.
- **Reveal wait:** when `game.round.lastResolution.eventId` differs from the last eventId the controller saw for that room, record the pending set (ids of connected, non-spectator humans) and a cap timer. `onRevealDone` with a matching eventId removes that id. The wait releases when the set is empty or the cap fires. Stale or unknown eventIds are ignored.
- **Fast-forward:** no active human (`!isBot`, not a spectator, `diceCount > 0`) and ≥2 active bots → skip the reveal wait, use `fastForwardDelayMs`, and ignore the connected-human requirement.
- **On fire:** re-check that the room still exists, the phase is `bidding`, the turn player is the same bot, and `roundNumber` and `lastBid` are unchanged since scheduling. Otherwise do nothing. Then call `decideBotAction` and the matching `apply*`. If a bot `bid` is somehow rejected, fall back to `applyDudo`, or a minimum legal bid if there's no lastBid. A bot must never stall the game.

- [ ] **Step 1: Write the failing unit tests** (`tests/botController.test.js`, manager with `bot:{delayMinMs:5, delayMaxMs:10, fastForwardDelayMs:1, revealWaitCapMs:200}`, fixed `rollDice`, and an `await sleep(ms)` helper):
  - `bot takes its turn after a delay`: Ann + 1 bot, start, force the turn to the bot. After 50 ms, `lastBid.playerId` is the bot's id and the turn has passed to Ann.
  - `one action per turn despite repeated broadcasts`: call `broadcastState` 5× during the bot's turn. After 50 ms, the match actions show exactly 1 bot bid.
  - `bot waits for reveal_done`: after Ann's dudo resolves and a bot opens the next round, the bot hasn't acted at 50 ms. Send `handleRevealDone(wsAnn,{eventId})` → it acts within 50 ms.
  - `reveal wait is capped`: no `reveal_done` → the bot acts after about 200 ms.
  - `stale reveal_done is ignored`: `eventId: 999` → the bot has still not acted at 50 ms, and nothing is sent to Ann's socket with `type:'error'`.
  - `no action after the room is deleted`: the bot's timer is pending, Ann leaves, and after 50 ms there's no throw and `games.size === 0`.
  - `no action after end_game reset`: the timer is pending, Ann sends `end_game`, and after 50 ms the phase is `waiting` with no new bids.
  - `bots pause while no human is connected and resume on reconnect`.
  - `fast-forward when the human is out`: Ann is eliminated (set her `diceCount` to 0 through a forced dudo loss), with 2 bots left. The game reaches `game_over` within 2 s.
- [ ] **Step 2: Run** `node --test tests/botController.test.js`. Expected: FAIL.
- [ ] **Step 3: Refactor the action cores** in `GameManager`. Run `npm test`: the existing tests pass with no edits.
- [ ] **Step 4: Implement** `BotController`, the `broadcastState` hook, `handleRevealDone`, and the `server.js` routing and env options.
- [ ] **Step 5: Add the integration test** `one human vs two bots plays to game over`. Start the server with `BOT_DELAY_MIN_MS=5`, `BOT_DELAY_MAX_MS=10`, `BOT_REVEAL_WAIT_CAP_MS=50`, and `BOT_FAST_FORWARD_MS=1` added to the env in `startServer`. Ann `create_room`s, `add_bot` ×2, `start_game`. On each state where it's her turn she sends `dudo` if there's a lastBid, else `bid {quantity:1, face:2}`. She sends `reveal_done` for each new resolution. Expect `phase:'game_over'` within 15 s.
- [ ] **Step 6: Run** `npm test`. Expected: all pass.
- [ ] **Step 7: Commit** `Drive computer players with a server-side scheduler`

---

### Task 6: Entry screen and invite links (frontend)

**Files:**
- Modify: `index.html` (join screen markup; `script.js` tag → `type="module"`)
- Modify: `script.js` (`connectToMatch`, join-screen wiring; the old two-room-field sync at lines ~2887-2894 is removed)
- Create: `client/invite.js`
- Modify: `styles.css` (entry screen only)
- Test: `tests/invite.test.js` (Node can import the pure functions; it has no DOM)

**Interfaces:**
- Produces, in `client/invite.js` (ES module):
  - `sanitizeRoomCode(raw) -> string` mirrors the server's `sanitizeRoomId` (lowercase, `[a-z0-9_-]`, max 24, `''` if empty)
  - `readInviteCode(search = location.search) -> string`
  - `buildInviteUrl(code, origin = location.origin) -> string` gives `${origin}/?room=${CODE.toUpperCase()}`
  - `setRoomInUrl(code)`, which uses `history.replaceState`
  - `shareInvite(code) -> Promise<'shared'|'copied'|'failed'>`, which uses `navigator.share` if present, else `navigator.clipboard.writeText`
  - `loadSavedName() -> string` and `saveName(name)`, in `localStorage` key `perudo.name` with every access in try/catch
- Consumes: the Task 2 `create_room` message and its errors.

Screen (spec sketch):
- name field (pre-filled from `loadSavedName`)
- primary **Start a game** (sends `create_room`)
- "Have a code?" field + **Join**
- a **Sign in (optional)** text link that reveals the existing account form, unchanged except that its separate room field is removed. Account sign-in uses the one code field and starts a game if it's empty.

With `?room=` present:
- the code is pre-filled
- the primary button reads **Join game KQZT**
- "Start a game" is hidden
- there's no auto-join

After `joined`, call `setRoomInUrl(roomId)` and `saveName(name)`. Empty name → inline message "Enter a name to join." with no request sent. Drop the `|| 'Player'` / `|| 'lobby'` fallbacks. Remove the emoji in the game header title. The right-pane screenshot image stays for project 3.

- [ ] **Step 1: Write the failing tests** (`tests/invite.test.js`, using `await import('../client/invite.js')`):
  - `sanitizeRoomCode` maps `'KQZT'→'kqzt'`, `'../../x'→'x'`, a 40-character input → length 24, `'  '→''`.
  - `readInviteCode('?room=KqZt') === 'kqzt'` and `readInviteCode('') === ''`.
  - `buildInviteUrl('kqzt','https://a.b') === 'https://a.b/?room=KQZT'`.
- [ ] **Step 2: Run** `node --test tests/invite.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `client/invite.js`, then the markup, `script.js` and CSS changes. If switching to `type="module"` surfaces strict-mode errors, fix them in place.
- [ ] **Step 4: Verify.** `npm test` all pass. `node --check script.js` and `node --check client/invite.js` exit 0. Run `npm start`, open `http://localhost:8080`, and confirm in the browser:
  - Start a game lands in a new room with `?room=` in the URL
  - opening that URL in a second browser profile shows "Join game CODE" and joins with one tap
  - an empty name shows the inline message
  - the console has no errors
  - dark mode and a 375 px width look right
- [ ] **Step 5: Commit** `Guest-first entry screen with invite links`

---

### Task 7: Waiting-room controls, bot labels, reveal_done (frontend)

**Files:**
- Modify: `index.html`, `script.js` (`renderPlayers`, waiting-phase UI, `closeResolutionModal`), `styles.css`
- Modify: `CLAUDE.md` (inbound message table + test count)

**Interfaces:**
- Consumes: `shareInvite` (Task 6); `add_bot`, `remove_bot`, `reveal_done` messages, and per-player `isBot` in state (Tasks 4–5).

Behavior:
- In `waiting` phase with `roundNumber === 0`, a panel near the start button shows **Invite friends** (`shareInvite` → "Link copied" / nothing on `'shared'`), **Add computer player** (disabled at 6 seats), and the existing **Start game**.
- `renderPlayers`: bots get a text tag "computer" (same style family as `(you)`). In the waiting phase each bot card has a **remove** text button that sends `remove_bot`.
- `closeResolutionModal()` sends `{ type:'reveal_done', eventId }` for the resolution it closed (once per eventId, only if the socket is open).
- CLAUDE.md: add `create_room`, `add_bot`, `remove_bot`, `reveal_done` to the inbound table, `game/BotStrategy.js`, `game/BotController.js`, `client/invite.js` to key files, and update the expected test count to the actual number.

- [ ] **Step 1: Implement** the behavior above.
- [ ] **Step 2: Verify.** `npm test` all pass, and `node --check script.js` exits 0. Manually, against the local server:
  - add 2 bots → "computer" labels, then remove one
  - start → the bots bid at a human pace
  - on your dudo, the bots wait while the reveal modal is open and play on after you close it
  - get eliminated → the bots fast-forward to game over
  - Rematch keeps the bots
  - Invite friends copies the link (desktop)
  - the console has no errors, and dark mode and 375 px look right
- [ ] **Step 3: Commit** `Waiting-room invite and computer-player controls`

---

## Noticed, out of scope

- `index.html:323` loads `/node_modules/canvas-confetti/dist/confetti.browser.js`, but `canvas-confetti` isn't in `package.json`/`package-lock.json`, and the static site has no `node_modules`. The victory confetti is probably a 404 everywhere. Fold it into project 3 (visual overhaul).
- Repo junk (`ConsoleAppTest1/`, `Copilot Testing.sln`) belongs to project 4 (cleanup).
- The turn timer is client-side only and gets fixed in project 2.
