const crypto = require('crypto');
const Bid = require('./Bid');
const PerudoGame = require('./PerudoGame');

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

class GameManager {
    constructor(options) {
        this.games = new Map();
        this.clientToRoom = new Map();
        this.send = options.send;
        this.gameOptions = {
            minPlayersToStart: options.minPlayersToStart,
            maxPlayersPerRoom: options.maxPlayersPerRoom,
            startingDicePerPlayer: options.startingDicePerPlayer,
            rollDice: options.rollDice
        };
    }

    getOrCreateGame(roomId) {
        if (!this.games.has(roomId)) {
            this.games.set(roomId, new PerudoGame(roomId, this.gameOptions));
        }

        return this.games.get(roomId);
    }

    broadcastState(game) {
        for (const player of game.players) {
            this.send(player.ws, game.buildStateForPlayer(player));
        }
    }

    join(ws, incoming) {
        if (this.clientToRoom.has(ws)) {
            this.send(ws, { type: 'error', message: 'Already joined a room.' });
            return;
        }

        const roomId = sanitizeRoomId(incoming.roomId);
        const name = sanitizeName(incoming.name);
        const game = this.getOrCreateGame(roomId);

        const player = {
            id: crypto.randomUUID(),
            name,
            ws
        };

        const result = game.addPlayer(player);
        if (!result.ok) {
            this.send(ws, { type: 'error', message: result.error });
            return;
        }

        const joinedPlayer = game.findPlayerById(player.id);
        if (!joinedPlayer) {
            this.send(ws, { type: 'error', message: 'Failed to register player in room.' });
            return;
        }

        this.clientToRoom.set(ws, roomId);

        this.send(ws, {
            ...game.buildStateForPlayer(joinedPlayer),
            type: 'joined',
            playerId: player.id
        });

        this.broadcastState(game);
    }

    removeBySocket(ws) {
        const roomId = this.clientToRoom.get(ws);
        if (!roomId) {
            return;
        }

        this.clientToRoom.delete(ws);
        const game = this.games.get(roomId);
        if (!game) {
            return;
        }

        game.removePlayerBySocket(ws);

        if (game.players.length === 0) {
            this.games.delete(roomId);
            return;
        }

        this.broadcastState(game);
    }

    getContext(ws) {
        const roomId = this.clientToRoom.get(ws);
        if (!roomId) {
            this.send(ws, { type: 'error', message: 'Join a room first.' });
            return null;
        }

        const game = this.games.get(roomId);
        if (!game) {
            this.send(ws, { type: 'error', message: 'Room unavailable.' });
            return null;
        }

        const player = game.findPlayerBySocket(ws);
        if (!player) {
            this.send(ws, { type: 'error', message: 'Player not found in room.' });
            return null;
        }

        return { game, player };
    }

    handleBid(ws, payload) {
        const context = this.getContext(ws);
        if (!context) {
            return;
        }

        const bid = Bid.fromPayload(payload, context.player.id);
        if (!bid) {
            this.send(ws, { type: 'error', message: 'Invalid bid format.' });
            return;
        }

        const result = context.game.handleBid(context.player, bid);
        if (!result.ok) {
            this.send(ws, { type: 'error', message: result.error });
            return;
        }

        this.broadcastState(context.game);
    }

    handleDudo(ws) {
        const context = this.getContext(ws);
        if (!context) {
            return;
        }

        const result = context.game.handleDudo(context.player);
        if (!result.ok) {
            this.send(ws, { type: 'error', message: result.error });
            return;
        }

        this.broadcastState(context.game);
    }

    handleCalza(ws) {
        const context = this.getContext(ws);
        if (!context) {
            return;
        }

        const result = context.game.handleCalza(context.player);
        if (!result.ok) {
            this.send(ws, { type: 'error', message: result.error });
            return;
        }

        this.broadcastState(context.game);
    }
}

module.exports = GameManager;
