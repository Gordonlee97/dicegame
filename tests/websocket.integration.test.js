const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const net = require('net');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');

const projectRoot = path.resolve(__dirname, '..');

async function getOpenPort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();

        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : null;
            server.close(error => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!port) {
                    reject(new Error('Failed to acquire open port.'));
                    return;
                }

                resolve(port);
            });
        });
    });
}

async function waitForHealth(baseUrl, timeoutMs = 10000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) {
                return;
            }
        } catch {
            // retry
        }

        await new Promise(resolve => setTimeout(resolve, 150));
    }

    throw new Error('Server did not become healthy within timeout.');
}

async function startServer() {
    const port = await getOpenPort();
    const child = spawn('node', ['server.js'], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PORT: String(port),
            AUTH_PROVIDER: 'memory',
            AUTH_TOKEN_SECRET: 'test-secret-key',
            AUTH_MEMORY_USERS: JSON.stringify([
                { username: 'aliceacct', displayName: 'AliceAccount', password: 'Password123!' }
            ]),
            CHAT_BLOCKED_TERMS: 'badword',
            CHAT_MAX_MESSAGES_PER_WINDOW: '3',
            CHAT_RATE_WINDOW_MS: '2000',
            CHAT_MUTE_MS: '1500',
            CHAT_DUPLICATE_WINDOW_MS: '2000'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', chunk => {
        output += chunk.toString();
    });
    child.stderr.on('data', chunk => {
        output += chunk.toString();
    });

    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        await waitForHealth(baseUrl);
    } catch (error) {
        child.kill('SIGTERM');
        throw new Error(`${error.message}\nServer output:\n${output}`);
    }

    return {
        port,
        baseUrl,
        wsUrl: `ws://127.0.0.1:${port}/ws`,
        child
    };
}

async function stopServer(server) {
    if (!server || !server.child || server.child.killed) {
        return;
    }

    await new Promise(resolve => {
        const timer = setTimeout(() => {
            server.child.kill('SIGKILL');
            resolve();
        }, 3000);

        server.child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });

        server.child.kill('SIGTERM');
    });
}

function createClient(wsUrl) {
    const ws = new WebSocket(wsUrl);
    const messages = [];
    const waiters = [];

    ws.on('message', raw => {
        let parsed;
        try {
            parsed = JSON.parse(raw.toString());
        } catch {
            return;
        }

        messages.push(parsed);

        for (let index = waiters.length - 1; index >= 0; index -= 1) {
            const waiter = waiters[index];
            if (waiter.predicate(parsed)) {
                waiters.splice(index, 1);
                clearTimeout(waiter.timer);
                waiter.resolve(parsed);
            }
        }
    });

    function waitFor(predicate, timeoutMs = 5000) {
        for (const message of messages) {
            if (predicate(message)) {
                return Promise.resolve(message);
            }
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const pendingIndex = waiters.findIndex(item => item.timer === timer);
                if (pendingIndex !== -1) {
                    waiters.splice(pendingIndex, 1);
                }
                reject(new Error('Timed out waiting for websocket message.'));
            }, timeoutMs);

            waiters.push({ predicate, resolve, timer });
        });
    }

    return {
        ws,
        messages,
        waitFor,
        send(payload) {
            ws.send(JSON.stringify(payload));
        },
        close() {
            if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                return Promise.resolve();
            }

            return new Promise(resolve => {
                ws.once('close', resolve);
                ws.close();
            });
        }
    };
}

async function connectAndJoin(wsUrl, name, roomId) {
    const client = createClient(wsUrl);

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out opening websocket connection.')), 5000);
        client.ws.once('open', () => {
            clearTimeout(timer);
            resolve();
        });
        client.ws.once('error', error => {
            clearTimeout(timer);
            reject(error);
        });
    });

    client.send({ type: 'join', name, roomId });
    const joined = await client.waitFor(message => message.type === 'joined');

    return {
        client,
        playerId: joined.playerId
    };
}

async function loginAccount(baseUrl, username, password) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok || !payload.token) {
        throw new Error(payload.message || 'Login failed');
    }

    return payload;
}

async function registerPublicAccount(baseUrl, username, password, displayName) {
    const response = await fetch(`${baseUrl}/api/auth/register-public`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, displayName })
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok || !payload.token) {
        throw new Error(payload.message || 'Public registration failed');
    }

    return payload;
}

async function connectAndJoinWithToken(wsUrl, token, roomId, fallbackName = 'Player') {
    const client = createClient(wsUrl);

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out opening websocket connection.')), 5000);
        client.ws.once('open', () => {
            clearTimeout(timer);
            resolve();
        });
        client.ws.once('error', error => {
            clearTimeout(timer);
            reject(error);
        });
    });

    client.send({ type: 'join', name: fallbackName, roomId, authToken: token });
    const joined = await client.waitFor(message => message.type === 'joined');

    return {
        client,
        playerId: joined.playerId,
        authType: joined.authType
    };
}

let server;

test.before(async () => {
    server = await startServer();
});

test.after(async () => {
    await stopServer(server);
});

test('websocket join waits until start_game then enters bidding', async () => {
    const roomId = `ws-join-${Date.now()}`;
    const alice = await connectAndJoin(server.wsUrl, 'Alice', roomId);
    const bob = await connectAndJoin(server.wsUrl, 'Bob', roomId);

    try {
        await alice.client.waitFor(
            message => message.type === 'state' && message.phase === 'waiting' && Array.isArray(message.players) && message.players.length === 2
        );

        alice.client.send({ type: 'start_game' });

        const state = await alice.client.waitFor(
            message => message.type === 'state' && message.phase === 'bidding' && Array.isArray(message.players) && message.players.length === 2
        );

        assert.equal(state.phase, 'bidding');
        assert.equal(state.players.length, 2);
        assert.equal(typeof state.currentTurnPlayerId, 'string');
    } finally {
        await Promise.all([alice.client.close(), bob.client.close()]);
    }
});

test('websocket enforces turn and emits error for invalid bidder', async () => {
    const roomId = `ws-turn-${Date.now()}`;
    const alice = await connectAndJoin(server.wsUrl, 'Alice', roomId);
    const bob = await connectAndJoin(server.wsUrl, 'Bob', roomId);

    try {
        await alice.client.waitFor(
            message => message.type === 'state' && message.phase === 'waiting' && message.players.length === 2
        );

        alice.client.send({ type: 'start_game' });

        const state = await alice.client.waitFor(
            message => message.type === 'state' && message.phase === 'bidding' && message.players.length === 2
        );

        const isAliceTurn = state.currentTurnPlayerId === alice.playerId;
        const nonTurnClient = isAliceTurn ? bob.client : alice.client;

        nonTurnClient.send({ type: 'bid', quantity: 2, face: 2 });
        const error = await nonTurnClient.waitFor(message => message.type === 'error' && /Not your turn/.test(message.message));

        assert.match(error.message, /Not your turn/);
    } finally {
        await Promise.all([alice.client.close(), bob.client.close()]);
    }
});

test('websocket bid then dudo resolves and advances round', async () => {
    const roomId = `ws-dudo-${Date.now()}`;
    const alice = await connectAndJoin(server.wsUrl, 'Alice', roomId);
    const bob = await connectAndJoin(server.wsUrl, 'Bob', roomId);

    try {
        await alice.client.waitFor(
            message => message.type === 'state' && message.phase === 'waiting' && message.players.length === 2
        );

        alice.client.send({ type: 'start_game' });

        const state = await alice.client.waitFor(
            message => message.type === 'state' && message.phase === 'bidding' && message.players.length === 2
        );

        const bidder = state.currentTurnPlayerId === alice.playerId ? alice : bob;
        const doubter = bidder === alice ? bob : alice;

        bidder.client.send({ type: 'bid', quantity: 2, face: 2 });

        await doubter.client.waitFor(
            message => message.type === 'state' && message.lastBid && message.lastBid.quantity === 2 && message.lastBid.face === 2
        );

        doubter.client.send({ type: 'dudo' });

        const nextRoundState = await bidder.client.waitFor(
            message => message.type === 'state' && message.roundNumber >= 2 && message.lastResolution !== null
        );

        assert.ok(nextRoundState.roundNumber >= 2);
        assert.ok(nextRoundState.lastResolution);
        assert.equal(typeof nextRoundState.lastResolution.actualCount, 'number');
    } finally {
        await Promise.all([alice.client.close(), bob.client.close()]);
    }
});

test('websocket room chat broadcasts only within same room', async () => {
    const roomA = `ws-chat-a-${Date.now()}`;
    const roomB = `ws-chat-b-${Date.now()}`;

    const alice = await connectAndJoin(server.wsUrl, 'Alice', roomA);
    const bob = await connectAndJoin(server.wsUrl, 'Bob', roomA);
    const clara = await connectAndJoin(server.wsUrl, 'Clara', roomB);

    try {
        const messageText = 'hello room only';
        alice.client.send({ type: 'chat_message', message: messageText });

        const aliceChat = await alice.client.waitFor(
            message => message.type === 'chat' && message.message === messageText
        );
        const bobChat = await bob.client.waitFor(
            message => message.type === 'chat' && message.message === messageText
        );

        assert.equal(aliceChat.roomId, roomA);
        assert.equal(bobChat.roomId, roomA);
        assert.equal(bobChat.playerName, 'Alice');

        const claraSawRoomAChat = clara.client.messages.some(
            message => message.type === 'chat' && message.message === messageText
        );
        assert.equal(claraSawRoomAChat, false);
    } finally {
        await Promise.all([alice.client.close(), bob.client.close(), clara.client.close()]);
    }
});

test('websocket room chat rejects empty messages', async () => {
    const roomId = `ws-chat-empty-${Date.now()}`;
    const alice = await connectAndJoin(server.wsUrl, 'Alice', roomId);

    try {
        alice.client.send({ type: 'chat_message', message: '     ' });

        const error = await alice.client.waitFor(
            message => message.type === 'error' && /chat message cannot be empty/i.test(message.message)
        );

        assert.match(error.message, /chat message cannot be empty/i);
    } finally {
        await alice.client.close();
    }
});

test('account login returns token and websocket join uses account identity', async () => {
    const roomId = `ws-auth-${Date.now()}`;
    const login = await loginAccount(server.baseUrl, 'aliceacct', 'Password123!');
    const user = await connectAndJoinWithToken(server.wsUrl, login.token, roomId, 'IgnoredName');

    try {
        assert.equal(user.authType, 'account');

        const state = await user.client.waitFor(
            message => message.type === 'state' && Array.isArray(message.players) && message.players.length === 1
        );
        assert.equal(state.players[0].name, 'AliceAccount');
    } finally {
        await user.client.close();
    }
});

test('chat moderation blocks blocked terms and rate spam', async () => {
    const roomId = `ws-chat-mod-${Date.now()}`;
    const alice = await connectAndJoin(server.wsUrl, 'Alice', roomId);
    const bob = await connectAndJoin(server.wsUrl, 'Bob', roomId);

    try {
        alice.client.send({ type: 'chat_message', message: 'this has badword inside' });
        const blocked = await alice.client.waitFor(
            message => message.type === 'error' && /chat safety policy/i.test(message.message)
        );
        assert.match(blocked.message, /chat safety policy/i);

        bob.client.send({ type: 'chat_message', message: 'a1' });
        bob.client.send({ type: 'chat_message', message: 'a2' });
        bob.client.send({ type: 'chat_message', message: 'a3' });
        bob.client.send({ type: 'chat_message', message: 'a4' });

        const spamError = await bob.client.waitFor(
            message => message.type === 'error' && /sending messages too quickly|temporarily muted/i.test(message.message)
        );
        assert.match(spamError.message, /sending messages too quickly|temporarily muted/i);
    } finally {
        await Promise.all([alice.client.close(), bob.client.close()]);
    }
});

test('public registration creates account and can join room immediately', async () => {
    const roomId = `ws-register-${Date.now()}`;
    const username = `newuser${Date.now()}`;
    const register = await registerPublicAccount(server.baseUrl, username, 'Password123!', 'New User');
    const user = await connectAndJoinWithToken(server.wsUrl, register.token, roomId, 'IgnoredName');

    try {
        assert.equal(user.authType, 'account');

        const state = await user.client.waitFor(
            message => message.type === 'state' && Array.isArray(message.players) && message.players.length === 1
        );
        assert.equal(state.players[0].name, 'New User');
    } finally {
        await user.client.close();
    }
});
