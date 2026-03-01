const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const GameManager = require('./game/GameManager');
const AuthService = require('./auth/authService');
const { createAccountStoreFromEnv } = require('./auth/accountStore');

const port = Number(process.env.PORT) || 8080;
const host = '0.0.0.0';
const rootDir = __dirname;

const minPlayersToStart = 2;
const maxPlayersPerRoom = 6;
const startingDicePerPlayer = 5;

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wav': 'audio/wav'
};

function randomDieValue() {
    return Math.floor(Math.random() * 6) + 1;
}

function rollDice(count) {
    return Array.from({ length: count }, randomDieValue);
}

function send(ws, payload) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function parseBlockedTerms(raw) {
    const source = String(raw || '').trim();
    if (!source) {
        return [];
    }

    return source
        .split(',')
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);
}

function writeJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function writeCorsHeaders(req, res) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key');
}

function getClientAddress(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        const first = forwardedFor.split(',')[0];
        if (first) {
            return first.trim();
        }
    }

    return req.socket?.remoteAddress || 'unknown';
}

async function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1024 * 1024) {
                reject(new Error('Payload too large.'));
                req.destroy();
            }
        });

        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error('Invalid JSON payload.'));
            }
        });

        req.on('error', reject);
    });
}

function serveFile(req, res) {
    const requestPath = req.url === '/' ? '/index.html' : req.url;
    let decodedPath;

    try {
        decodedPath = decodeURIComponent(requestPath);
    } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad request');
        return;
    }

    const safePath = path.normalize(decodedPath).replace(/^([.][.][/\\])+/, '');
    const filePath = path.join(rootDir, safePath);

    if (!filePath.startsWith(rootDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[extension] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

async function startServer() {
    const accountStoreResult = await createAccountStoreFromEnv();
    const authTokenSecret = String(process.env.AUTH_TOKEN_SECRET || 'dev-only-change-me').trim();
    const authService = new AuthService({
        accountStore: accountStoreResult.store,
        tokenSecret: authTokenSecret,
        tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS) || undefined
    });

    const gameManager = new GameManager({
        send,
        minPlayersToStart,
        maxPlayersPerRoom,
        startingDicePerPlayer,
        rollDice,
        authService,
        chatSafety: {
            maxMessagesPerWindow: Number(process.env.CHAT_MAX_MESSAGES_PER_WINDOW) || undefined,
            windowMs: Number(process.env.CHAT_RATE_WINDOW_MS) || undefined,
            muteMs: Number(process.env.CHAT_MUTE_MS) || undefined,
            duplicateWindowMs: Number(process.env.CHAT_DUPLICATE_WINDOW_MS) || undefined,
            blockedTerms: parseBlockedTerms(process.env.CHAT_BLOCKED_TERMS)
        }
    });

    const registerAdminKey = String(process.env.AUTH_ADMIN_KEY || '').trim();
    const publicRegisterEnabled = String(process.env.AUTH_PUBLIC_REGISTER_ENABLED || 'true').trim().toLowerCase() !== 'false';
    const registerRateWindowMs = Number(process.env.AUTH_REGISTER_RATE_WINDOW_MS) > 0
        ? Number(process.env.AUTH_REGISTER_RATE_WINDOW_MS)
        : 10 * 60 * 1000;
    const registerMaxAttemptsPerWindow = Number(process.env.AUTH_REGISTER_MAX_ATTEMPTS_PER_WINDOW) > 0
        ? Number(process.env.AUTH_REGISTER_MAX_ATTEMPTS_PER_WINDOW)
        : 5;
    const registerAttemptsByIp = new Map();

    function canAttemptPublicRegister(clientAddress) {
        const now = Date.now();
        const current = registerAttemptsByIp.get(clientAddress) || {
            windowStartAt: now,
            attempts: 0
        };

        if (now - current.windowStartAt > registerRateWindowMs) {
            current.windowStartAt = now;
            current.attempts = 0;
        }

        current.attempts += 1;
        registerAttemptsByIp.set(clientAddress, current);
        return current.attempts <= registerMaxAttemptsPerWindow;
    }

    const server = http.createServer(async (req, res) => {
        writeCorsHeaders(req, res);

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.url === '/health') {
            writeJson(res, 200, {
                ok: true,
                authProvider: accountStoreResult.provider
            });
            return;
        }

        if (req.url === '/api/auth/login' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const result = await authService.login(body.username, body.password);
                if (!result.ok) {
                    writeJson(res, 401, { ok: false, message: result.error });
                    return;
                }

                writeJson(res, 200, {
                    ok: true,
                    token: result.token,
                    userId: result.account.userId,
                    username: result.account.username,
                    displayName: result.account.displayName
                });
                return;
            } catch (error) {
                writeJson(res, 400, { ok: false, message: error.message || 'Invalid request.' });
                return;
            }
        }

        if (req.url === '/api/auth/register' && req.method === 'POST') {
            if (!registerAdminKey || req.headers['x-admin-key'] !== registerAdminKey) {
                writeJson(res, 403, { ok: false, message: 'Registration not allowed.' });
                return;
            }

            try {
                const body = await readJsonBody(req);
                const result = await authService.registerUser(body.username, body.displayName, body.password);
                if (!result.ok) {
                    writeJson(res, 400, { ok: false, message: result.error });
                    return;
                }

                writeJson(res, 201, { ok: true, username: result.user.username, displayName: result.user.displayName });
                return;
            } catch (error) {
                writeJson(res, 400, { ok: false, message: error.message || 'Invalid request.' });
                return;
            }
        }

        if (req.url === '/api/auth/register-public' && req.method === 'POST') {
            if (!publicRegisterEnabled) {
                writeJson(res, 403, { ok: false, message: 'Public registration is disabled.' });
                return;
            }

            const clientAddress = getClientAddress(req);
            if (!canAttemptPublicRegister(clientAddress)) {
                writeJson(res, 429, { ok: false, message: 'Too many account attempts. Please try again later.' });
                return;
            }

            try {
                const body = await readJsonBody(req);
                const registerResult = await authService.registerUser(body.username, body.displayName, body.password);
                if (!registerResult.ok) {
                    writeJson(res, 400, { ok: false, message: registerResult.error });
                    return;
                }

                const loginResult = await authService.login(body.username, body.password);
                if (!loginResult.ok) {
                    writeJson(res, 500, { ok: false, message: 'Account created but auto-login failed.' });
                    return;
                }

                writeJson(res, 201, {
                    ok: true,
                    token: loginResult.token,
                    userId: loginResult.account.userId,
                    username: loginResult.account.username,
                    displayName: loginResult.account.displayName
                });
                return;
            } catch (error) {
                writeJson(res, 400, { ok: false, message: error.message || 'Invalid request.' });
                return;
            }
        }

        serveFile(req, res);
    });

    const webSocketServer = new WebSocketServer({ server, path: '/ws' });

    webSocketServer.on('connection', ws => {
        ws.on('message', rawData => {
            try {
                const data = JSON.parse(String(rawData));

                if (data.type === 'join') {
                    gameManager.join(ws, data);
                    return;
                }

                if (data.type === 'bid') {
                    gameManager.handleBid(ws, data);
                    return;
                }

                if (data.type === 'dudo') {
                    gameManager.handleDudo(ws);
                    return;
                }

                if (data.type === 'calza') {
                    gameManager.handleCalza(ws);
                    return;
                }

                if (data.type === 'start_game') {
                    gameManager.handleStartGame(ws);
                    return;
                }

                if (data.type === 'chat_message') {
                    gameManager.handleChatMessage(ws, data);
                    return;
                }

                if (data.type === 'rematch') {
                    gameManager.handleRematch(ws);
                    return;
                }

                send(ws, { type: 'error', message: 'Unsupported message type.' });
            } catch {
                send(ws, { type: 'error', message: 'Invalid message payload.' });
            }
        });

        ws.on('close', () => {
            gameManager.removeBySocket(ws);
        });
    });

    server.listen(port, host, () => {
        console.log(`Server running on http://localhost:${port}`);
        console.log(`Auth provider: ${accountStoreResult.provider}`);
    });
}

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
