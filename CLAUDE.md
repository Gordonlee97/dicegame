# CLAUDE.md — Perudo (Liar's Dice) Project Guide

## Project overview

Browser-based Perudo (Liar's Dice) for 2–6 players. Node.js/WebSocket backend, vanilla JS frontend, deployed on Azure (Static Web App + App Service). Cosmos DB for persistence.

- Frontend (Static Web App): `https://icy-hill-04922421e.6.azurestaticapps.net`
- Backend (App Service): `https://dicegame-backend-brgpdrdyh8b9fka2.westus3-01.azurewebsites.net`

## Key files

| File | Purpose |
|---|---|
| `server.js` | HTTP + WebSocket server, static file serving, auth routes |
| `script.js` | All frontend logic (state, rendering, audio, animations) |
| `index.html` | Single-page app shell |
| `styles.css` | All styles including dark mode, mobile, animations |
| `config.js` | Shared config (Cosmos DB, Key Vault, env) |
| `game/PerudoGame.js` | Core game rules and round state |
| `game/GameManager.js` | Room/player management, WebSocket message routing |
| `game/RuleValidator.js` | Bid validation logic |
| `game/RoundState.js` | Per-round state model |
| `tests/perudoGame.test.js` | Unit tests for game logic |
| `tests/gameManager.test.js` | Unit tests for room/player management |
| `tests/websocket.integration.test.js` | Integration tests over live WebSocket |

## Architecture principles

- **Server-authoritative**: All game state lives on the server. The client only renders what the server sends.
- **WebSocket-first**: All gameplay events are WebSocket messages. REST is only used for auth.
- **Room-scoped**: All state (game, chat, players) is scoped to a room code.
- **In-memory rooms**: Room state is held in memory on the backend; Cosmos DB is for persistence (match history, user accounts, chat logs, win/loss stats).

## WebSocket message types (inbound)

| Type | Description |
|---|---|
| `join` | Join a room (with optional reconnect token or account JWT) |
| `start_game` | Start the game from the waiting room |
| `bid` | Place a bid |
| `dudo` | Challenge the current bid |
| `calza` | Exact-count call |
| `chat_message` | Send a chat message to the room |
| `join_as_player` | Spectator explicitly joins as a player |

## Engineering practices

- **Implement end-to-end** — backend route + broadcast + frontend render + tests, all in one pass.
- **Surgical changes** — touch only what is needed for the requested behavior.
- **Validate immediately** after every edit:
  - `node --check server.js`
  - `node --check script.js`
  - `node --check game/PerudoGame.js`
  - `node --check game/GameManager.js`
  - `npm test` → expect **31 passing, 0 failing**
- **Restart backend** after any change to `server.js` or `game/*`, then verify: `Invoke-WebRequest http://localhost:8080/health`
- **Preserve reveal sequencing** — Dudo/Calza next-round visuals are deferred until the reveal modal closes. Do not break this pattern.
- **Preserve reconnect/spectator logic** — reconnect tokens, grace window, and spectator-to-player promotion must remain intact.

## UI/UX conventions

- Clear, non-redundant messaging — no duplicate status text.
- Strong event sequencing consistency (toast → modal → next round).
- Readability/hierarchy over information density.
- Animations: expressive but smooth, no jarring transitions.
- Dark mode supported — always check both themes when touching styles.
- Mobile-first responsive layout — test narrow-phone breakpoints.

## Mobile & responsive

- Viewport meta uses `viewport-fit=cover` — required for `env(safe-area-inset-*)` on iOS.
- Floating buttons (`.room-chat`, `.mobile-play`) use `max(Xpx, calc(Xpx + env(safe-area-inset-*)))` for safe area offsets on all sides.
- Bottom sheet action console padding-bottom accounts for home indicator via `env(safe-area-inset-bottom)`.
- CSS breakpoints: `1160px` (single-column), `840px` (mobile bottom-sheet), `430px` (narrow phone), plus `(max-width: 900px) and (orientation: landscape) and (max-height: 500px)` for landscape.
- Haptic feedback via `haptic(type)` in `script.js` — types: `'selection'` (8ms), `'action'` (20ms), `'critical'` (35-25-35ms), `'open'` (6ms). Uses `navigator.vibrate()` — works on Android, silently ignored on iOS.

## Sound system

- All tones use `playTone(frequency, durationMs, volume, waveType)` via Web Audio API.
- Keep interaction volumes at 0.015–0.025; event cues (dudo, victory) at 0.09–0.22.
- **Square and sawtooth waves are perceptually much louder than triangle/sine at the same gain** — use `triangle` or `sine` for most cues to avoid jarring sounds.

## Testing conventions

- Integration tests use a real in-process WebSocket server (no mocks for the server).
- Unit tests use direct class instantiation.
- New WebSocket message types get an integration test.
- Chat features get moderation/validation test coverage.

## Deployment

- Backend changes deploy via GitHub Actions to Azure App Service.
- Frontend changes deploy via GitHub Actions to Azure Static Web App.
- Do not push to `main` without passing tests.
- `HANDOFF.md` in the repo root is stale and can be deleted — its content is superseded by this file.
