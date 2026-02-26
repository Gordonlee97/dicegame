const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const GameManager = require('./game/GameManager');

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
    '.json': 'application/json; charset=utf-8'
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

const gameManager = new GameManager({
    send,
    minPlayersToStart,
    maxPlayersPerRoom,
    startingDicePerPlayer,
    rollDice
});

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
});
