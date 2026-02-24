# dicegame

## CI/CD Status

[![Frontend Deploy](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-static-web-apps-icy-hill-04922421e.yml/badge.svg)](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-static-web-apps-icy-hill-04922421e.yml)
[![Backend Deploy](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-webapp-backend.yml/badge.svg)](https://github.com/Gordonlee97/dicegame/actions/workflows/azure-webapp-backend.yml)

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

## Deployment runbook

### 1) Frontend (Azure Static Web App)

Frontend deploy is already wired through:

- `.github/workflows/azure-static-web-apps-icy-hill-04922421e.yml`

Push to `main` to trigger deployment.

### 2) Backend (Azure Web App)

Backend can be deployed automatically via:

- `.github/workflows/azure-webapp-backend.yml`

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

1. Open the static app URL in two browser tabs.
2. Join the same room with different player names.
3. Confirm both players are visible in sidebar.
4. Confirm only active player can roll.
5. Confirm both tabs receive live roll updates.
6. Confirm turn advances after each roll.
7. Confirm `Leave` returns to join screen.

## Known MVP constraints

- In-memory room state only (resets on backend restart)
- No auth/session recovery
- Minimal gameplay loop (turn-based 5-dice roll)
