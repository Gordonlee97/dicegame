const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const port = Number(process.env.PORT) || 8080;
const host = '0.0.0.0';
const rootDir = __dirname;
const maxPlayersPerRoom = 7;
const rollDurationMs = 800;
const tickEveryMs = 100;

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

const rooms = new Map();
const clientToRoom = new Map();

function randomDieValue() {
    return Math.floor(Math.random() * 6) + 1;
}

function randomRoll() {
    return Array.from({ length: 5 }, randomDieValue);
}

function sanitizeName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
        return 'Player';
    }

    return trimmed.slice(0, 20);
}

function sanitizeRoomId(roomId) {
    const normalized = String(roomId || '').trim().toLowerCase();
    if (!normalized) {
        return 'lobby';
    }

    return normalized.replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'lobby';
}

function createRoom(roomId) {
    const room = {
        roomId,
        players: [],
        turnIndex: 0,
        currentDice: randomRoll(),
        isRolling: false,
        rollingInterval: null,
        rollingTimeout: null
    };

    rooms.set(roomId, room);
    return room;
}

function getOrCreateRoom(roomId) {
    return rooms.get(roomId) || createRoom(roomId);
}

function send(ws, payload) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

function roomSnapshot(room) {
    const currentTurnPlayer = room.players[room.turnIndex] || null;

    return {
        roomId: room.roomId,
        players: room.players.map(player => ({
            id: player.id,
            name: player.name
        })),
        currentTurnPlayerId: currentTurnPlayer ? currentTurnPlayer.id : null,
        dice: room.currentDice,
        isRolling: room.isRolling
    };
}

function broadcastRoomState(room) {
    const payload = {
        type: 'state',
        ...roomSnapshot(room)
    };

    for (const player of room.players) {
        send(player.ws, payload);
    }
}

function removePlayerFromRoom(ws) {
    const roomId = clientToRoom.get(ws);
    if (!roomId) {
        return;
    }

    const room = rooms.get(roomId);
    clientToRoom.delete(ws);

    if (!room) {
        return;
    }

    const playerIndex = room.players.findIndex(player => player.ws === ws);
    if (playerIndex === -1) {
        return;
    }

    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
        if (room.rollingInterval) {
            clearInterval(room.rollingInterval);
            room.rollingInterval = null;
        }

        if (room.rollingTimeout) {
            clearTimeout(room.rollingTimeout);
            room.rollingTimeout = null;
        }

        rooms.delete(roomId);
        return;
    }

    if (playerIndex < room.turnIndex) {
        room.turnIndex -= 1;
    }

    if (room.turnIndex >= room.players.length) {
        room.turnIndex = 0;
    }

    broadcastRoomState(room);
}

function joinRoom(ws, incoming) {
    if (clientToRoom.has(ws)) {
        send(ws, { type: 'error', message: 'Already joined a room.' });
        return;
    }

    const roomId = sanitizeRoomId(incoming.roomId);
    const playerName = sanitizeName(incoming.name);
    const room = getOrCreateRoom(roomId);

    if (room.players.length >= maxPlayersPerRoom) {
        send(ws, { type: 'error', message: 'Room is full (max 7 players).' });
        return;
    }

    const player = {
        id: crypto.randomUUID(),
        name: playerName,
        ws
    };

    room.players.push(player);
    clientToRoom.set(ws, roomId);

    send(ws, {
        type: 'joined',
        playerId: player.id,
        ...roomSnapshot(room)
    });

    broadcastRoomState(room);
}

function handleRoll(ws) {
    const roomId = clientToRoom.get(ws);
    if (!roomId) {
        send(ws, { type: 'error', message: 'Join a room first.' });
        return;
    }

    const room = rooms.get(roomId);
    if (!room || room.players.length === 0) {
        send(ws, { type: 'error', message: 'Room unavailable.' });
        return;
    }

    const rollerIndex = room.players.findIndex(player => player.ws === ws);
    if (rollerIndex === -1) {
        return;
    }

    if (room.players.length < 2) {
        send(ws, { type: 'error', message: 'At least 2 players are required.' });
        return;
    }

    if (room.isRolling) {
        return;
    }

    if (rollerIndex !== room.turnIndex) {
        send(ws, { type: 'error', message: 'Not your turn.' });
        return;
    }

    room.isRolling = true;

    const roller = room.players[rollerIndex];
    const startPayload = {
        type: 'roll_start',
        rollerId: roller.id,
        roomId: room.roomId
    };

    for (const player of room.players) {
        send(player.ws, startPayload);
    }

    room.rollingInterval = setInterval(() => {
        room.currentDice = randomRoll();

        const tickPayload = {
            type: 'roll_tick',
            roomId: room.roomId,
            dice: room.currentDice
        };

        for (const player of room.players) {
            send(player.ws, tickPayload);
        }
    }, tickEveryMs);

    room.rollingTimeout = setTimeout(() => {
        if (room.rollingInterval) {
            clearInterval(room.rollingInterval);
            room.rollingInterval = null;
        }

        room.currentDice = randomRoll();
        room.isRolling = false;
        room.turnIndex = (room.turnIndex + 1) % room.players.length;

        const nextTurnPlayer = room.players[room.turnIndex] || null;
        const endPayload = {
            type: 'roll_end',
            roomId: room.roomId,
            dice: room.currentDice,
            nextTurnPlayerId: nextTurnPlayer ? nextTurnPlayer.id : null
        };

        for (const player of room.players) {
            send(player.ws, endPayload);
        }

        broadcastRoomState(room);
        room.rollingTimeout = null;
    }, rollDurationMs);
}

function serveFile(req, res) {
    const requestPath = req.url === '/' ? '/index.html' : req.url;
    const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
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

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    serveFile(req, res);
});

const webSocketServer = new WebSocketServer({ server, path: '/ws' });

webSocketServer.on('connection', ws => {
    ws.on('message', rawData => {
        try {
            const data = JSON.parse(String(rawData));

            if (data.type === 'join') {
                joinRoom(ws, data);
                return;
            }

            if (data.type === 'roll') {
                handleRoll(ws);
                return;
            }

            send(ws, { type: 'error', message: 'Unsupported message type.' });
        } catch {
            send(ws, { type: 'error', message: 'Invalid message payload.' });
        }
    });

    ws.on('close', () => {
        removePlayerFromRoom(ws);
    });
});

server.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}`);
});
