const Bid = require('./Bid');
const { decideBotAction } = require('./BotStrategy');

const DEFAULTS = {
    delayMinMs: 1200,
    delayMaxMs: 3000,
    fastForwardDelayMs: 500,
    revealWaitCapMs: 15000
};

function nonNegative(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function isConnectedHuman(player) {
    return !player.isBot && !player.isDisconnected;
}

// Schedules computer-player turns. At most one action timer per room; every
// fire re-checks that the turn it was scheduled for is still the current one.
//
// Per-room entry:
//   actionTimer / actionSnapshot - the pending bot action and the state it was scheduled for
//   lastResolution               - the last resolution object seen, to detect new reveals
//   reveal                       - { eventId, pending:Set<playerId>, capTimer } while humans watch a reveal
class BotController {
    constructor({ manager, delayMinMs, delayMaxMs, fastForwardDelayMs, revealWaitCapMs, random } = {}) {
        this.manager = manager;
        this.delayMinMs = nonNegative(delayMinMs, DEFAULTS.delayMinMs);
        this.delayMaxMs = Math.max(this.delayMinMs, nonNegative(delayMaxMs, DEFAULTS.delayMaxMs));
        this.fastForwardDelayMs = nonNegative(fastForwardDelayMs, DEFAULTS.fastForwardDelayMs);
        this.revealWaitCapMs = nonNegative(revealWaitCapMs, DEFAULTS.revealWaitCapMs);
        this.random = typeof random === 'function' ? random : Math.random;
        this.rooms = new Map();
    }

    onStateChanged(game) {
        if (!this.isLiveGame(game)) {
            return;
        }

        if (!game.players.some(player => player.isBot)) {
            this.cancelRoom(game.roomId);
            return;
        }

        const entry = this.getEntry(game.roomId);
        this.trackResolution(game, entry);
        this.evaluate(game, entry);
    }

    onRevealDone(game, playerId, eventId) {
        if (!this.isLiveGame(game)) {
            return;
        }

        const entry = this.rooms.get(game.roomId);
        if (!entry || !entry.reveal || Number(eventId) !== entry.reveal.eventId) {
            return;
        }

        entry.reveal.pending.delete(playerId);
        if (entry.reveal.pending.size === 0) {
            this.releaseReveal(game.roomId);
        }
    }

    cancelRoom(roomId) {
        const entry = this.rooms.get(roomId);
        if (!entry) {
            return;
        }

        this.clearAction(entry);
        this.clearReveal(entry);
        this.rooms.delete(roomId);
    }

    // --- internals ---

    isLiveGame(game) {
        return Boolean(game) && this.manager.games.get(game.roomId) === game;
    }

    getEntry(roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                actionTimer: null,
                actionSnapshot: null,
                lastResolution: null,
                reveal: null
            });
        }

        return this.rooms.get(roomId);
    }

    isFastForward(game) {
        const active = game.getActivePlayers();
        const activeHumans = active.filter(player => !player.isBot).length;
        const activeBots = active.filter(player => player.isBot).length;
        return activeHumans === 0 && activeBots >= 2;
    }

    trackResolution(game, entry) {
        const resolution = game.round.lastResolution || null;

        if (resolution !== entry.lastResolution) {
            entry.lastResolution = resolution;
            this.clearReveal(entry);

            if (resolution && !this.isFastForward(game)) {
                const pending = new Set(game.players
                    .filter(player => isConnectedHuman(player) && !player.isSpectator)
                    .map(player => player.id));

                if (pending.size > 0) {
                    const roomId = game.roomId;
                    const capTimer = setTimeout(() => this.releaseReveal(roomId), this.revealWaitCapMs);
                    capTimer.unref?.();
                    entry.reveal = { eventId: resolution.eventId, pending, capTimer };
                }
            }
            return;
        }

        // Same reveal still showing: stop waiting on humans who are no longer connected.
        if (entry.reveal) {
            for (const playerId of entry.reveal.pending) {
                const player = game.findPlayerById(playerId);
                if (!player || !isConnectedHuman(player)) {
                    entry.reveal.pending.delete(playerId);
                }
            }

            if (entry.reveal.pending.size === 0) {
                this.clearReveal(entry);
            }
        }
    }

    releaseReveal(roomId) {
        const entry = this.rooms.get(roomId);
        if (!entry || !entry.reveal) {
            return;
        }

        this.clearReveal(entry);
        const game = this.manager.games.get(roomId);
        if (game) {
            this.evaluate(game, entry);
        }
    }

    // The bot whose turn it is, if a bot should act now; otherwise null.
    botToAct(game, entry) {
        if (game.round.phase !== 'bidding') {
            return null;
        }

        const turnPlayer = game.getCurrentTurnPlayer();
        if (!turnPlayer || !turnPlayer.isBot) {
            return null;
        }

        if (this.isFastForward(game)) {
            return turnPlayer;
        }

        if (entry.reveal || !game.players.some(isConnectedHuman)) {
            return null;
        }

        return turnPlayer;
    }

    evaluate(game, entry) {
        const bot = this.botToAct(game, entry);
        if (!bot) {
            this.clearAction(entry);
            return;
        }

        const snapshot = {
            game,
            botId: bot.id,
            roundNumber: game.round.roundNumber,
            lastBid: game.round.lastBid
        };

        if (entry.actionTimer && this.snapshotMatches(entry.actionSnapshot, game)) {
            return;
        }

        this.clearAction(entry);
        const delay = this.isFastForward(game)
            ? this.fastForwardDelayMs
            : this.delayMinMs + this.random() * (this.delayMaxMs - this.delayMinMs);

        entry.actionSnapshot = snapshot;
        entry.actionTimer = setTimeout(() => this.fire(game.roomId, snapshot), delay);
        entry.actionTimer.unref?.();
    }

    snapshotMatches(snapshot, game) {
        if (!snapshot || snapshot.game !== game) {
            return false;
        }

        const turnPlayer = game.getCurrentTurnPlayer();
        return Boolean(turnPlayer)
            && turnPlayer.id === snapshot.botId
            && game.round.roundNumber === snapshot.roundNumber
            && game.round.lastBid === snapshot.lastBid;
    }

    fire(roomId, snapshot) {
        const entry = this.rooms.get(roomId);
        if (!entry || entry.actionSnapshot !== snapshot) {
            return;
        }

        entry.actionTimer = null;
        entry.actionSnapshot = null;

        const game = snapshot.game;
        if (!this.isLiveGame(game) || !this.snapshotMatches(snapshot, game)) {
            return;
        }

        const bot = this.botToAct(game, entry);
        if (!bot || bot.id !== snapshot.botId) {
            return;
        }

        try {
            this.act(game, bot);
        } catch (error) {
            console.error(`Computer player failed to act in room ${roomId}:`, error);
        }
    }

    act(game, bot) {
        const round = game.round;
        const decision = decideBotAction({
            ownDice: [...bot.currentDice],
            totalDice: game.players.reduce((sum, player) => sum + (Number(player.diceCount) || 0), 0),
            lastBid: round.lastBid,
            palificoRound: round.palificoRound,
            palificoFace: round.palificoFace,
            activePlayerCount: game.getActivePlayerCount()
        }, this.random);

        let result;
        if (decision.action === 'bid') {
            result = this.manager.applyBid(game, bot, new Bid(decision.quantity, decision.face, bot.id));
        } else if (decision.action === 'calza') {
            result = this.manager.applyCalza(game, bot);
        } else {
            result = this.manager.applyDudo(game, bot);
        }

        if (result.ok) {
            return;
        }

        // Never stall the game: dudo is always legal on our turn once there is a bid,
        // and 1 x 2 is a legal opening bid in every round type.
        const fallback = round.lastBid
            ? this.manager.applyDudo(game, bot)
            : this.manager.applyBid(game, bot, new Bid(1, 2, bot.id));

        if (!fallback.ok) {
            console.error(`Computer player ${bot.id} could not act in room ${game.roomId}: ${fallback.error}`);
        }
    }

    clearAction(entry) {
        if (entry.actionTimer) {
            clearTimeout(entry.actionTimer);
        }
        entry.actionTimer = null;
        entry.actionSnapshot = null;
    }

    clearReveal(entry) {
        if (entry.reveal) {
            clearTimeout(entry.reveal.capTimer);
        }
        entry.reveal = null;
    }
}

module.exports = BotController;
