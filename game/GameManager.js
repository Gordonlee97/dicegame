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

function createShortRoomCode(length = 4) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';

    for (let index = 0; index < length; index += 1) {
        const randomByte = crypto.randomBytes(1)[0];
        code += alphabet[randomByte % alphabet.length];
    }

    return code;
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

    createRematchRoomId(roomId) {
        let candidate;

        do {
            candidate = createShortRoomCode(4);
        } while (this.games.has(candidate));

        return candidate;
    }

    transferPlayerToRoom(ws, playerName, targetRoomId) {
        const game = this.getOrCreateGame(targetRoomId);
        const player = {
            id: crypto.randomUUID(),
            name: sanitizeName(playerName),
            ws
        };

        const result = game.addPlayer(player);
        if (!result.ok) {
            this.send(ws, { type: 'error', message: result.error });
            return false;
        }

        const joinedPlayer = game.findPlayerById(player.id);
        if (!joinedPlayer) {
            this.send(ws, { type: 'error', message: 'Failed to register player in room.' });
            return false;
        }

        this.clientToRoom.set(ws, targetRoomId);
        this.send(ws, {
            ...game.buildStateForPlayer(joinedPlayer),
            type: 'joined',
            playerId: player.id
        });
        this.broadcastState(game);
        return true;
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

    handleRematch(ws) {
        const context = this.getContext(ws);
        if (!context) {
            return;
        }

        if (context.game.round.phase !== 'game_over') {
            this.send(ws, { type: 'error', message: 'Rematch is only available after game over.' });
            return;
        }

        if (!context.game.rematchRoomId) {
            context.game.rematchRoomId = this.createRematchRoomId(context.game.roomId);
        }

        const targetRoomId = context.game.rematchRoomId;
        const sourceGame = context.game;
        const sourceRoomId = this.clientToRoom.get(ws);
        const playerName = context.player.name;

        this.clientToRoom.delete(ws);
        sourceGame.removePlayerBySocket(ws);

        if (sourceGame.players.length === 0) {
            this.games.delete(sourceRoomId);
        } else {
            this.broadcastState(sourceGame);
        }

        const joined = this.transferPlayerToRoom(ws, playerName, targetRoomId);
        if (!joined) {
            this.send(ws, { type: 'error', message: 'Failed to join rematch room.' });
        }
    }
}

module.exports = GameManager;
