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

function sanitizeChatMessage(message) {
    const normalized = String(message || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '';
    }

    return normalized.slice(0, 280);
}

function sanitizeBlockedTerms(terms) {
    if (!Array.isArray(terms)) {
        return [];
    }

    const normalized = [];
    for (const term of terms) {
        const value = String(term || '').trim().toLowerCase();
        if (!value || value.length < 3) {
            continue;
        }

        normalized.push(value);
    }

    return Array.from(new Set(normalized));
}

function containsBlockedTerm(message, blockedTerms) {
    const normalizedMessage = String(message || '').toLowerCase();
    return blockedTerms.some(term => normalizedMessage.includes(term));
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
        this.roomChatHistory = new Map();
        this.clientToRoom = new Map();
        this.chatSafetyByPlayerId = new Map();
        this.send = options.send;
        this.authService = options.authService || null;
        this.chatSafety = {
            maxMessagesPerWindow: Number(options.chatSafety?.maxMessagesPerWindow) > 0 ? Number(options.chatSafety.maxMessagesPerWindow) : 5,
            windowMs: Number(options.chatSafety?.windowMs) > 0 ? Number(options.chatSafety.windowMs) : 10000,
            muteMs: Number(options.chatSafety?.muteMs) > 0 ? Number(options.chatSafety.muteMs) : 30000,
            duplicateWindowMs: Number(options.chatSafety?.duplicateWindowMs) > 0 ? Number(options.chatSafety.duplicateWindowMs) : 6000,
            blockedTerms: sanitizeBlockedTerms(options.chatSafety?.blockedTerms)
        };
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

    shufflePlayerOrder(game) {
        const players = game.players;
        for (let index = players.length - 1; index > 0; index -= 1) {
            const swapIndex = crypto.randomInt(index + 1);
            if (swapIndex === index) {
                continue;
            }

            const temp = players[index];
            players[index] = players[swapIndex];
            players[swapIndex] = temp;
        }
    }

    transferPlayerToRoom(ws, playerProfile, targetRoomId) {
        const game = this.getOrCreateGame(targetRoomId);
        const player = {
            id: crypto.randomUUID(),
            name: sanitizeName(playerProfile.name),
            authType: playerProfile.authType || 'guest',
            accountUserId: playerProfile.accountUserId || null,
            accountUsername: playerProfile.accountUsername || null,
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
        this.send(ws, {
            type: 'chat_history',
            roomId: targetRoomId,
            messages: this.getRoomChatHistory(targetRoomId)
        });
        this.broadcastState(game);
        return true;
    }

    broadcastState(game) {
        for (const player of game.players) {
            this.send(player.ws, game.buildStateForPlayer(player));
        }
    }

    getRoomChatHistory(roomId) {
        if (!this.roomChatHistory.has(roomId)) {
            this.roomChatHistory.set(roomId, []);
        }

        return this.roomChatHistory.get(roomId);
    }

    appendRoomChatMessage(roomId, message) {
        const history = this.getRoomChatHistory(roomId);
        history.push(message);

        if (history.length > 150) {
            history.splice(0, history.length - 150);
        }
    }

    broadcastToRoom(game, payload) {
        for (const player of game.players) {
            this.send(player.ws, payload);
        }
    }

    resolveJoinIdentity(incoming) {
        const token = String(incoming.authToken || '').trim();
        if (token && this.authService) {
            const account = this.authService.verifyAuthToken(token);
            if (!account) {
                return { ok: false, error: 'Sign-in session is invalid or expired.' };
            }

            return {
                ok: true,
                identity: {
                    name: sanitizeName(account.displayName),
                    authType: 'account',
                    accountUserId: account.userId,
                    accountUsername: account.username
                }
            };
        }

        return {
            ok: true,
            identity: {
                name: sanitizeName(incoming.name),
                authType: 'guest',
                accountUserId: null,
                accountUsername: null
            }
        };
    }

    checkChatSafety(player, message) {
        const now = Date.now();
        const playerId = player.id;
        const existing = this.chatSafetyByPlayerId.get(playerId) || {
            windowStartAt: now,
            messageCount: 0,
            mutedUntilMs: 0,
            lastMessage: '',
            lastMessageAtMs: 0
        };

        if (existing.mutedUntilMs > now) {
            const secondsLeft = Math.ceil((existing.mutedUntilMs - now) / 1000);
            this.chatSafetyByPlayerId.set(playerId, existing);
            return { ok: false, error: `Chat temporarily muted for ${secondsLeft}s due to spam.` };
        }

        if (now - existing.windowStartAt > this.chatSafety.windowMs) {
            existing.windowStartAt = now;
            existing.messageCount = 0;
        }

        existing.messageCount += 1;
        if (existing.messageCount > this.chatSafety.maxMessagesPerWindow) {
            existing.mutedUntilMs = now + this.chatSafety.muteMs;
            this.chatSafetyByPlayerId.set(playerId, existing);
            return { ok: false, error: 'You are sending messages too quickly. Please wait and try again.' };
        }

        if (existing.lastMessage === message && now - existing.lastMessageAtMs < this.chatSafety.duplicateWindowMs) {
            this.chatSafetyByPlayerId.set(playerId, existing);
            return { ok: false, error: 'Repeated messages are blocked. Please vary your message.' };
        }

        if (/(.)\1{10,}/.test(message)) {
            this.chatSafetyByPlayerId.set(playerId, existing);
            return { ok: false, error: 'Message looks like spam.' };
        }

        if (containsBlockedTerm(message, this.chatSafety.blockedTerms)) {
            this.chatSafetyByPlayerId.set(playerId, existing);
            return { ok: false, error: 'Message blocked by chat safety policy.' };
        }

        existing.lastMessage = message;
        existing.lastMessageAtMs = now;
        this.chatSafetyByPlayerId.set(playerId, existing);
        return { ok: true };
    }

    join(ws, incoming) {
        if (this.clientToRoom.has(ws)) {
            this.send(ws, { type: 'error', message: 'Already joined a room.' });
            return;
        }

        const roomId = sanitizeRoomId(incoming.roomId);
        const identityResult = this.resolveJoinIdentity(incoming);
        if (!identityResult.ok) {
            this.send(ws, { type: 'error', message: identityResult.error });
            return;
        }

        const identity = identityResult.identity;
        const game = this.getOrCreateGame(roomId);

        const player = {
            id: crypto.randomUUID(),
            name: identity.name,
            authType: identity.authType,
            accountUserId: identity.accountUserId,
            accountUsername: identity.accountUsername,
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
            playerId: player.id,
            authType: player.authType
        });

        this.send(ws, {
            type: 'chat_history',
            roomId,
            messages: this.getRoomChatHistory(roomId)
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

        const leavingPlayer = game.findPlayerBySocket(ws);
        if (leavingPlayer) {
            this.chatSafetyByPlayerId.delete(leavingPlayer.id);
        }

        game.removePlayerBySocket(ws);

        if (game.players.length === 0) {
            this.roomChatHistory.delete(roomId);
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

    handleStartGame(ws) {
        const context = this.getContext(ws);
        if (!context) {
            return;
        }

        if (context.game.round.phase === 'waiting' && context.game.round.roundNumber === 0) {
            this.shufflePlayerOrder(context.game);
        }

        const result = context.game.handleStartGame(context.player);
        if (!result.ok) {
            this.send(ws, { type: 'error', message: result.error });
            return;
        }

        this.broadcastState(context.game);
    }

    handleChatMessage(ws, payload) {
        const context = this.getContext(ws);
        if (!context) {
            return;
        }

        const text = sanitizeChatMessage(payload.message);
        if (!text) {
            this.send(ws, { type: 'error', message: 'Chat message cannot be empty.' });
            return;
        }

        const safetyResult = this.checkChatSafety(context.player, text);
        if (!safetyResult.ok) {
            this.send(ws, { type: 'error', message: safetyResult.error });
            return;
        }

        const chatEvent = {
            type: 'chat',
            roomId: context.game.roomId,
            message: text,
            playerId: context.player.id,
            playerName: context.player.name,
            sentAt: Date.now()
        };

        this.appendRoomChatMessage(context.game.roomId, chatEvent);
        this.broadcastToRoom(context.game, chatEvent);
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
        const playerProfile = {
            name: context.player.name,
            authType: context.player.authType || 'guest',
            accountUserId: context.player.accountUserId || null,
            accountUsername: context.player.accountUsername || null
        };

        this.chatSafetyByPlayerId.delete(context.player.id);

        this.clientToRoom.delete(ws);
        sourceGame.removePlayerBySocket(ws);

        if (sourceGame.players.length === 0) {
            this.games.delete(sourceRoomId);
        } else {
            this.broadcastState(sourceGame);
        }

        const joined = this.transferPlayerToRoom(ws, playerProfile, targetRoomId);
        if (!joined) {
            this.send(ws, { type: 'error', message: 'Failed to join rematch room.' });
        }
    }
}

module.exports = GameManager;
