# Dicegame Project Handoff

## 1) Current objective and status

Goal reached so far:
- Multiplayer browser dice prototype is working locally with server-authoritative turn-based rolling.
- Local smoke tests passed for:
  - room join by multiple players,
  - roll start and roll end broadcast,
  - valid 5-dice payload values,
  - turn advancement after roll.

Current stage:
- Ready for deployment of backend and frontend to Azure.
- Game logic is intentionally minimal for now: players join room and take turns rolling 5 dice.

## 2) Local repository and folder status

Current working folder in this chat:
- C:/Users/gordo/source/repos/Copilot Testing

Target GitHub repo:
- https://github.com/Gordonlee97/dicegame

Git status actions already completed:
- Remote origin configured to dicegame repo.
- Initial project commit pushed to origin/main successfully.
- .gitignore added and updated to exclude node_modules and .NET build artifacts.

Additional local clone created for consistent naming:
- C:/Users/gordo/source/repos/dicegame
- This clone tracks origin/main and is clean.

Recommendation:
- Continue development in C:/Users/gordo/source/repos/dicegame.

## 3) Azure resources and endpoints in use

Frontend host:
- Static Web App URL: https://icy-hill-04922421e.6.azurestaticapps.net

Backend host:
- Web App URL: https://dicegame-backend-brgpdrdyh8b9fka2.westus3-01.azurewebsites.net

CORS requirement:
- Static Web App origin must be present in Allowed Origins for backend Web App CORS.
- User confirmed this was already done.

Region note:
- Static Web App and Web App are in different regions.
- This is acceptable for now and expected to add some latency.

## 4) Files that implement the current app

Core frontend:
- index.html
- styles.css
- script.js
- config.js

Core backend:
- server.js
- package.json
- package-lock.json

Other files present:
- .gitignore
- Existing C# sample project files (not part of dice gameplay runtime)

## 5) Runtime behavior implemented

### Join and screens
- Separate join screen and game screen implemented.
- Join screen collects name and room id.
- On successful join, join screen hides and game screen shows.
- Leave button disconnects and returns to join screen.

### Players and turn UI
- Player list shown in a left sidebar.
- Active turn indicated by a visible dot and highlighted player row.
- Self player annotated as (you).

### Dice and rolling
- Dice render as pips using DOM elements and CSS, no numeric text.
- 5 dice displayed.
- Server controls roll sequence and final values.
- Roll animation visible through server roll_tick updates.

### Turn enforcement
- Roll only enabled when:
  - connected,
  - not currently rolling,
  - at least 2 players in room,
  - it is local player turn.

### Connection routing logic
- Localhost behavior:
  - script.js forces same-origin websocket on localhost for local testing.
- Deployed behavior:
  - script.js uses API_BASE_URL from config.js to connect to backend ws endpoint.

## 6) Important configuration already set

config.js currently points to Azure backend:
- API_BASE_URL = https://dicegame-backend-brgpdrdyh8b9fka2.westus3-01.azurewebsites.net

This means:
- Local testing on localhost still works because script.js now auto-prefers localhost ws when hostname is localhost.
- Static Web App deployment uses Azure backend URL from config.js.

## 7) Local test commands that already passed

Environment checks:
- node -v
- npm -v

Install:
- npm install

Health endpoint:
- Invoke-WebRequest http://localhost:8080/health
- Returned: {"ok":true}

Automated websocket smoke test:
- Two simulated players joined same room.
- Roll sequence and turn advancement validated.

## 8) What must be deployed now

Deploy both applications:

1) Backend to Azure Web App
- Deploy server.js, package.json, package-lock.json and related backend runtime files.
- WebSocket endpoint path used by client: /ws

2) Frontend to Azure Static Web App
- Deploy index.html, styles.css, script.js, config.js

No additional service is required for current minimal version.

## 9) Post-deploy verification checklist

After deployment, verify in browser:
1. Open Static Web App URL in two tabs.
2. Join same room with two distinct names.
3. Confirm both players appear in sidebar.
4. Confirm turn indicator dot highlights active player.
5. Roll as active player only.
6. Confirm both tabs see live dice rolling updates.
7. Confirm turn advances to the other player after each roll.
8. Test Leave button returns player to join screen.

## 10) Known constraints and intentional simplifications

Current implementation is MVP-level and intentionally simple:
- No persistent storage yet.
- In-memory room/player state only (resets on backend restart).
- No authentication.
- No reconnect/session recovery.
- No advanced anti-cheat beyond server-authoritative roll flow.

## 11) Recommended next engineering steps

Priority order:
1. Deploy backend and frontend and run full online smoke test.
2. Add basic deploy automation from GitHub (both apps).
3. Add room lifecycle safeguards (timeouts, cleanup).
4. Add basic match state model and score tracking.
5. Add persistence for matches and player profiles.
6. Add auth and identity once gameplay loop is stable.

## 12) Quick troubleshooting notes

If Join hangs or disconnects immediately:
- Check backend Web App is running.
- Check backend CORS allows Static Web App origin.
- Check browser console websocket errors.
- Confirm config.js API_BASE_URL matches backend HTTPS URL.
- Confirm backend exposes websocket path /ws.

If local works but deployed fails:
- Reconfirm config.js is included in Static Web App deployment output.
- Verify deployed script.js has localhost override plus API_BASE_URL logic.
- Verify no stale browser cache (hard refresh).

## 13) Safe handoff summary

You can switch work to this folder now:
- C:/Users/gordo/source/repos/dicegame

You can continue from this exact state without losing technical context by using this handoff file.
