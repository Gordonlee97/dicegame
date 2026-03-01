# Dicegame Project Handoff (Current Thread Continuity)

This document supersedes the legacy MVP handoff. It captures what was implemented from the current thread takeover through now, plus how to continue safely in the next chat.

---

## 1) Current state at handoff

Repository:
- `C:/Users/gordo/source/repos/dicegame`

Current branch:
- `feature/lobby-chat`

Current product state:
- Perudo gameplay is significantly evolved beyond MVP.
- Game has pre-game waiting room, manual start flow, randomized start order, enhanced reveal modals, event toasts/audio cues, and richer dice animations.

Validation status (latest run):
- `npm test` passing: **14/14**
- script/game/server syntax checks pass (`node --check ...`)

Local runtime preference (explicit user request):
- Automatically restart local server after backend-affecting changes and verify `/health`.

---

## 2) Major features implemented in this thread

### A) Pre-game lobby flow (manual start)

Previous behavior:
- Game auto-started once minimum players joined.

Current behavior:
- Room remains in waiting state until someone clicks **Start Game**.
- Any current room member can trigger start.
- Start button appears only in initial waiting phase and hides once game starts.

Files:
- `game/PerudoGame.js`
- `game/GameManager.js`
- `server.js`
- `index.html`
- `script.js`
- `styles.css`
- tests updated in `tests/*`

Key details:
- Added websocket message type `start_game`.
- Disabled auto-start on initial join by gating `beginGameIfReady()` when `roundNumber === 0`.

### B) Randomized turn order on game start

Current behavior:
- On `start_game`, server shuffles player array before starting round 1.
- Join order no longer dictates initial turn order.

File:
- `game/GameManager.js` (secure random Fisher-Yates via `crypto.randomInt`)

### C) Reveal sequencing and modal gating

Current behavior:
- **Both Dudo and Calza** reveals now gate next-round visuals.
- Next-round dice values + roll animation are deferred until reveal modal closes.
- Round-start and turn cues align with reveal-close flow.

File:
- `script.js` (state deferral in `applyStateUpdate`, deferred apply in `closeResolutionModal`)

### D) Reveal UX/visual clarity improvements

Changes:
- Dudo reveal now includes caller line (parallel to Calza reveal).
- Reworded lines for better readability (e.g., “Bid challenged...”, “Matching dice found...”).
- Styled reveal blocks with consistent spacing, hierarchy, and alignment.

Files:
- `script.js`
- `styles.css`

### E) Audio system enhancements

Changes:
- Separate Dudo success/fail cues:
  - success = achievement-like cue,
  - fail = descending fail cue.
- Calza now uses same success/fail sound mapping as Dudo.
- Dice roll animation uses provided WAV: `extras/Sound Effects/dice roll sound.wav`.
- Added `.wav` mime type and URL decode fix on static serving path.

Files:
- `script.js`
- `server.js`

### F) Waiting room UI clarity

Changes:
- Added persistent waiting notice in game screen for pre-game state.
- Removed redundant status messaging by simplifying top banner during waiting room.

Files:
- `index.html`
- `styles.css`
- `script.js`

### G) Dice animation iterations

Status:
- Dice throw animation has been repeatedly tuned for smoother, more physical look.
- Current path supports thrown-in motion and avoids clipping issues introduced earlier.

Files:
- `styles.css`
- `script.js`

Note:
- Animation feel was iterated many times based on user feedback; expect more tuning during chat feature work if desired.

---

## 3) Deployment/runtime notes

Azure endpoints:
- Frontend (Static Web App): `https://icy-hill-04922421e.6.azurestaticapps.net`
- Backend (Web App): `https://dicegame-backend-brgpdrdyh8b9fka2.westus3-01.azurewebsites.net`

Backend static path fix implemented:
- `decodeURIComponent(req.url)` now used in `server.js` before normalization.
- This was required to serve assets with spaces in path (e.g., WAV file).

When restart is needed:
- Backend edits (`server.js`, `game/*`) require restart/redeploy.
- Frontend-only edits (`index.html`, `styles.css`, `script.js`) require hard refresh locally/deploy refresh in prod.

User preference established:
- Agent should automatically restart local backend when backend-affecting changes are made.

---

## 4) File-level impact summary (high-signal)

Backend/game logic:
- `game/PerudoGame.js`
  - added manual start method
  - initial auto-start disabled
- `game/GameManager.js`
  - added `handleStartGame`
  - added start-time random order shuffle
- `server.js`
  - added `start_game` websocket route
  - added url decode + `.wav` mime support

Frontend behavior/UI:
- `script.js`
  - start-game button wiring and waiting room state logic
  - reveal deferral sequencing for both Dudo/Calza
  - popup timing/animation/audio tuning
  - Dudo + Calza success/fail audio mapping
  - reveal modal text hierarchy and caller line improvements
- `index.html`
  - added start-game button
  - added persistent waiting notice
  - room-code labels updated
- `styles.css`
  - reveal modal styling overhaul
  - waiting notice styling
  - toast/animation tuning
  - dice animation revisions

Tests:
- `tests/perudoGame.test.js`
- `tests/websocket.integration.test.js`
- `tests/gameManager.test.js`

All updated to reflect manual start and related behavior.

---

## 5) Testing and verification practice used

Common commands used in this thread:
- `node --check .\script.js`
- `node --check .\server.js`
- `node --check .\game\PerudoGame.js`
- `node --check .\game\GameManager.js`
- `npm test`

Current expected result:
- `npm test` => **14 passing, 0 failing**

---

## 6) Working style / engineering philosophy for next chat

Established preferences and approach:
- Implement end-to-end, not just propose.
- Keep changes focused and surgical to requested behavior.
- Validate immediately with syntax + tests after edits.
- Maintain server-authoritative gameplay state.
- For modal/reveal sequencing, preserve deterministic deferred application patterns.
- Auto-restart backend when backend files change and verify `/health`.

UI/UX direction inferred from user feedback:
- Prefer clear, non-redundant messaging.
- Favor strong event sequencing consistency (especially Dudo/Calza to next round).
- Prioritize readability/hierarchy over raw information density.
- Keep animation expressive but smooth/non-jarring.

---

## 7) Known context for immediate next feature

User intent:
- Start building **lobby chat** feature on branch `feature/lobby-chat`.

Implications for next implementation:
- Likely backend websocket message type(s) for chat send/broadcast.
- Add room-scoped chat state (in-memory initially, similar to action log model).
- Add frontend chat panel/input in waiting + gameplay views (depending on UX scope).
- Keep compatibility with existing event toasts and action log UI.
- Preserve test coverage style with websocket integration tests.

Suggested first increment:
1. Add `chat_message` inbound message type.
2. Broadcast `chat` event payloads to players in same room.
3. Render capped chat list client-side with player name colors.
4. Add basic input validation/length limit and test coverage.

---

## 8) Operational caveats

- In this environment, `npm start` sometimes reports non-zero in terminal metadata even when server appears to start; health check is authoritative.
- Always verify with:
  - `Invoke-WebRequest http://localhost:8080/health`

---

## 9) Quick continue checklist for next chat

1. Ensure branch is `feature/lobby-chat`.
2. Pull latest local state if needed.
3. Run `npm test` baseline.
4. Implement chat in small slices (backend route -> broadcast -> frontend render -> tests).
5. If backend changed, restart local server and verify `/health`.

