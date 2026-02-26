# dicegame

## CI/CD Status

[![Frontend Deploy](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-static-web-apps-icy-hill-04922421e.yml/badge.svg)](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-static-web-apps-icy-hill-04922421e.yml)
[![Backend Deploy](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-webapp-backend.yml/badge.svg)](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-webapp-backend.yml)
[![CI Tests](https://github.com/Gordonlee97/dicegame/actions/workflows/ci-tests.yml/badge.svg)](https://github.com/Gordonlee97/dicegame/actions/workflows/ci-tests.yml)

Turn-based multiplayer browser dice prototype (Perudo-style foundation) with a Node.js WebSocket backend and static frontend.

## Current status

- Local multiplayer flow is working (join room, roll animation, turn advancement).
- Frontend is deployed via Azure Static Web Apps GitHub Action.
- Backend target is Azure Web App (`dicegame-backend-brgpdrdyh8b9fka2`).

## Tech stack

- Backend: Node.js + `ws` (`server.js`)
- Frontend: `index.html`, `styles.css`, `script.js`, `config.js`
- WebSocket path: `/ws`

## Local run

From repo root:

```powershell
npm install
npm start
```

Health check:

```powershell
Invoke-WebRequest http://localhost:8080/health
```

Expected response body:

```json
{"ok":true}
```

## Automated tests

Run locally:

```powershell
npm test
```

CI coverage:

- `.github/workflows/ci-tests.yml`
- Runs on push and pull requests to `main`
- Executes tests on Node `20` and `22`

## Deployment runbook

### 1) Frontend (Azure Static Web App)

Frontend deploy is already wired through:

- `.github/workflows/azure-static-web-apps-icy-hill-04922421e.yml`

Push to `main` to trigger deployment.

### 2) Backend (Azure Web App)

Backend can be deployed automatically via:

- `.github/workflows/azure-webapp-backend.yml`

Deployment gate:

- Backend deploy runs automatically only after `.github/workflows/ci-tests.yml` completes successfully on `main`.
- You can still run backend deploy manually with workflow dispatch.

One-time setup required in GitHub repository secrets:

- `AZURE_WEBAPP_PUBLISH_PROFILE_DICEGAME_BACKEND`

How to get it:

1. Azure Portal → Web App `dicegame-backend-brgpdrdyh8b9fka2`
2. Download publish profile
3. GitHub repo → Settings → Secrets and variables → Actions → New repository secret
4. Name it exactly `AZURE_WEBAPP_PUBLISH_PROFILE_DICEGAME_BACKEND`
5. Paste full publish profile XML as value

One-time app setting in Azure Web App:

- `WEBSITES_PORT=8080`

After secret setup, pushes to `main` trigger backend deployment automatically.

Manual deployment option (CLI) remains below.

Run in PowerShell from repo root:

```powershell
az login
az webapp list --query "[?name=='dicegame-backend-brgpdrdyh8b9fka2'].{name:name,resourceGroup:resourceGroup,location:location}" -o table
```

Set your resource group name from the command output:

```powershell
$RG = "<your-resource-group>"
```

Ensure Node app settings are correct:

```powershell
az webapp config appsettings set --name dicegame-backend-brgpdrdyh8b9fka2 --resource-group $RG --settings WEBSITES_PORT=8080 SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Create a backend deployment zip (only runtime files):

```powershell
if (Test-Path .\backend-deploy.zip) { Remove-Item .\backend-deploy.zip -Force }
Compress-Archive -Path .\server.js, .\package.json, .\package-lock.json -DestinationPath .\backend-deploy.zip
```

Deploy backend zip:

```powershell
az webapp deploy --name dicegame-backend-brgpdrdyh8b9fka2 --resource-group $RG --src-path .\backend-deploy.zip --type zip
```

Quick backend verification:

```powershell
Invoke-WebRequest https://dicegame-backend-brgpdrdyh8b9fka2.westus3-01.azurewebsites.net/health
```

### 3) CORS

In Azure Web App CORS settings, allow:

- `https://icy-hill-04922421e.6.azurestaticapps.net`

## Post-deploy smoke test

### 1) Backend health

PowerShell:

```powershell
(Invoke-WebRequest https://dicegame-backend-brgpdrdyh8b9fka2.westus3-01.azurewebsites.net/health).Content
```

Expected:

```json
{"ok":true}
```

If the first request times out, wait 30-90 seconds (cold start) and retry.

### 2) Frontend load check

Open:

- `https://icy-hill-04922421e.6.azurestaticapps.net`

Confirm the Join screen appears.

### 3) Two-tab multiplayer check

1. Open the frontend URL in two tabs.
2. In each tab, use different player names and the same room id.
3. Click Join in both tabs.
4. Confirm both players appear in sidebar in both tabs.
5. Confirm only active player can click Roll.
6. Roll once and confirm both tabs show live dice updates.
7. Confirm turn advances to the other player.
8. Click Leave and confirm return to join screen.

### 4) Quick failure triage

- If join hangs: check backend health endpoint again.
- If websocket fails: verify frontend `config.js` backend URL is correct.
- If deployed app is stale: hard refresh browser cache and retry.

## Known MVP constraints

- In-memory room state only (resets on backend restart)
- No auth/session recovery
- Minimal gameplay loop (turn-based 5-dice roll)
