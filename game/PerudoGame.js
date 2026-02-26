const RoundState = require('./RoundState');
const RuleValidator = require('./RuleValidator');

class PerudoGame {
    constructor(roomId, options = {}) {
        this.roomId = roomId;
        this.players = [];
        this.round = new RoundState();
        this.actionLog = ['Room created. Waiting for players.'];

        this.minPlayersToStart = options.minPlayersToStart ?? 2;
        this.maxPlayersPerRoom = options.maxPlayersPerRoom ?? 6;
        this.startingDicePerPlayer = options.startingDicePerPlayer ?? 5;
        this.rollDice = options.rollDice;
    }

    addLog(text) {
        this.actionLog.push(text);
        if (this.actionLog.length > 24) {
            this.actionLog.splice(0, this.actionLog.length - 24);
        }
    }

    findPlayerBySocket(ws) {
        return this.players.find(player => player.ws === ws) || null;
    }

    findPlayerIndexBySocket(ws) {
        return this.players.findIndex(player => player.ws === ws);
    }

    findPlayerById(playerId) {
        return this.players.find(player => player.id === playerId) || null;
    }

    getCurrentTurnPlayer() {
        if (this.players.length === 0 || this.round.phase !== 'bidding') {
            return null;
        }

        return this.players[this.round.turnIndex] || null;
    }

    nextIndex(index) {
        if (this.players.length === 0) {
            return 0;
        }

        return (index + 1) % this.players.length;
    }

    beginGameIfReady() {
        if (this.round.phase === 'bidding' || this.round.phase === 'game_over') {
            return;
        }

        if (this.players.length >= this.minPlayersToStart) {
            this.startRound(this.round.turnIndex, false);
        }
    }

    startRound(starterIndex, palificoRound) {
        if (this.players.length < this.minPlayersToStart) {
            this.round.setWaiting();
            this.addLog('Waiting for at least 2 players.');
            return;
        }

        this.round.startNewRound(starterIndex, this.players.length, palificoRound);

        for (const player of this.players) {
            player.currentDice = this.rollDice(player.diceCount);
        }

        const starter = this.players[this.round.turnIndex];
        const palificoText = this.round.palificoRound ? ' Palifico round: Pacos are not wild.' : '';
        this.addLog(`Round ${this.round.roundNumber} started. ${starter.name} opens.${palificoText}`);
    }

    addPlayer(player) {
        if (this.players.length >= this.maxPlayersPerRoom) {
            return { ok: false, error: `Room is full (max ${this.maxPlayersPerRoom} players).` };
        }

        if (this.round.phase === 'bidding') {
            return { ok: false, error: 'Round in progress. Join after this game.' };
        }

        this.players.push({
            ...player,
            diceCount: this.startingDicePerPlayer,
            currentDice: []
        });

        this.addLog(`${player.name} joined the room.`);
        this.beginGameIfReady();

        return { ok: true };
    }

    removePlayerBySocket(ws) {
        const leavingIndex = this.findPlayerIndexBySocket(ws);
        if (leavingIndex === -1) {
            return;
        }

        const leavingPlayer = this.players[leavingIndex];
        this.players.splice(leavingIndex, 1);
        this.addLog(`${leavingPlayer.name} left the room.`);

        if (this.players.length === 0) {
            return;
        }

        if (this.round.phase === 'bidding') {
            if (leavingIndex < this.round.turnIndex) {
                this.round.turnIndex -= 1;
            } else if (leavingIndex === this.round.turnIndex && this.round.turnIndex >= this.players.length) {
                this.round.turnIndex = 0;
            }
        }

        if (this.players.length < this.minPlayersToStart) {
            this.round.setWaiting();
            this.addLog('Round paused: waiting for at least 2 players.');
        }

        if (this.players.length === 1) {
            this.round.setGameOver(this.players[0].id);
            this.addLog(`${this.players[0].name} wins (last remaining player).`);
        }

        this.beginGameIfReady();
    }

    buildStateForPlayer(player) {
        const currentTurnPlayer = this.getCurrentTurnPlayer();
        const lastBidPlayer = this.round.lastBid ? this.findPlayerById(this.round.lastBid.playerId) : null;

        return {
            type: 'state',
            roomId: this.roomId,
            phase: this.round.phase,
            roundNumber: this.round.roundNumber,
            palificoRound: this.round.palificoRound,
            palificoFace: this.round.palificoFace,
            players: this.players.map(item => ({
                id: item.id,
                name: item.name,
                diceCount: item.diceCount
            })),
            currentTurnPlayerId: currentTurnPlayer ? currentTurnPlayer.id : null,
            lastBid: this.round.lastBid
                ? {
                      quantity: this.round.lastBid.quantity,
                      face: this.round.lastBid.face,
                      playerId: this.round.lastBid.playerId,
                      playerName: lastBidPlayer ? lastBidPlayer.name : 'Unknown'
                  }
                : null,
            yourDice: [...player.currentDice],
            actionLog: this.actionLog.slice(-12),
            lastResolution: this.round.lastResolution,
            winnerPlayerId: this.round.winnerPlayerId
        };
    }

    handleBid(player, bid) {
        const playerIndex = this.players.findIndex(item => item.id === player.id);

        if (this.round.phase !== 'bidding') {
            return { ok: false, error: 'Round is not in bidding phase.' };
        }

        if (this.players.length < this.minPlayersToStart) {
            return { ok: false, error: 'At least 2 players are required.' };
        }

        if (this.round.turnIndex !== playerIndex) {
            return { ok: false, error: 'Not your turn.' };
        }

        if (!this.round.lastBid) {
            if (!RuleValidator.isValidFirstBid(this.players, bid, this.round.palificoRound)) {
                return {
                    ok: false,
                    error: this.round.palificoRound
                        ? 'Invalid opening bid for Palifico round.'
                        : 'Invalid opening bid. First bid cannot be Pacos outside Palifico.'
                };
            }

            this.round.lastBid = bid;
            if (this.round.palificoRound) {
                this.round.palificoFace = bid.face;
            }
        } else if (!RuleValidator.isValidRaisedBid(this.players, this.round.lastBid, bid, this.round.palificoRound, this.round.palificoFace)) {
            return { ok: false, error: 'Bid must legally outbid the previous bid.' };
        } else {
            this.round.lastBid = bid;
        }

        this.addLog(`${player.name} bids ${bid.quantity} x ${bid.face}.`);
        this.round.turnIndex = this.nextIndex(this.round.turnIndex);

        return { ok: true };
    }

    resolveAfterDudo(doubterIndex) {
        const doubter = this.players[doubterIndex];
        const bidder = this.findPlayerById(this.round.lastBid.playerId);

        if (!bidder) {
            this.addLog('Round reset due to missing bidder.');
            this.startRound(0, false);
            return;
        }

        const actualCount = RuleValidator.countMatchingDice(this.players, this.round.lastBid, this.round.palificoRound);
        const bidWasCorrect = actualCount >= this.round.lastBid.quantity;
        const loserId = bidWasCorrect ? doubter.id : bidder.id;
        const loserIndexBeforePenalty = this.players.findIndex(player => player.id === loserId);
        const loser = this.players[loserIndexBeforePenalty];

        loser.diceCount -= 1;

        this.round.lastResolution = {
            doubterPlayerId: doubter.id,
            doubterName: doubter.name,
            bidderPlayerId: bidder.id,
            bidderName: bidder.name,
            bid: {
                quantity: this.round.lastBid.quantity,
                face: this.round.lastBid.face
            },
            actualCount,
            bidWasCorrect,
            loserPlayerId: loser.id,
            loserName: loser.name,
            loserRemainingDice: Math.max(loser.diceCount, 0),
            revealedDice: this.players.map(player => ({
                playerId: player.id,
                playerName: player.name,
                dice: [...player.currentDice]
            }))
        };

        this.addLog(`${doubter.name} calls Dudo on ${bidder.name}'s bid ${this.round.lastBid.quantity} x ${this.round.lastBid.face}.`);

        if (bidWasCorrect) {
            this.addLog(`Bid stands (${actualCount} matching). ${doubter.name} loses a die.`);
        } else {
            this.addLog(`Bid fails (${actualCount} matching). ${bidder.name} loses a die.`);
        }

        let nextStarterIndex;
        let palificoNextRound = false;

        if (loser.diceCount <= 0) {
            this.players.splice(loserIndexBeforePenalty, 1);
            this.addLog(`${loser.name} is eliminated.`);

            if (this.players.length === 1) {
                this.round.setGameOver(this.players[0].id);
                this.addLog(`${this.players[0].name} wins the game.`);
                return;
            }

            nextStarterIndex = loserIndexBeforePenalty % this.players.length;
        } else {
            nextStarterIndex = this.players.findIndex(player => player.id === loser.id);
            palificoNextRound = loser.diceCount === 1;
        }

        this.startRound(nextStarterIndex, palificoNextRound);
    }

    handleDudo(player) {
        const playerIndex = this.players.findIndex(item => item.id === player.id);

        if (this.round.phase !== 'bidding') {
            return { ok: false, error: 'Dudo is only available during bidding.' };
        }

        if (!this.round.lastBid) {
            return { ok: false, error: 'Cannot call Dudo before any bid.' };
        }

        if (this.round.turnIndex !== playerIndex) {
            return { ok: false, error: 'Not your turn.' };
        }

        this.resolveAfterDudo(playerIndex);
        return { ok: true };
    }

    resolveAfterCalza(callerIndex) {
        const caller = this.players[callerIndex];
        const bidder = this.findPlayerById(this.round.lastBid.playerId);

        if (!bidder) {
            this.addLog('Round reset due to missing bidder.');
            this.startRound(0, false);
            return;
        }

        const actualCount = RuleValidator.countMatchingDice(this.players, this.round.lastBid, this.round.palificoRound);
        const bidIsExact = actualCount === this.round.lastBid.quantity;

        const callerDiceBefore = caller.diceCount;
        if (bidIsExact) {
            caller.diceCount = Math.min(this.startingDicePerPlayer, caller.diceCount + 1);
        } else {
            caller.diceCount -= 1;
        }

        this.round.lastResolution = {
            type: 'calza',
            callerPlayerId: caller.id,
            callerName: caller.name,
            bidderPlayerId: bidder.id,
            bidderName: bidder.name,
            bid: {
                quantity: this.round.lastBid.quantity,
                face: this.round.lastBid.face
            },
            actualCount,
            bidIsExact,
            callerDiceBefore,
            callerDiceAfter: Math.max(caller.diceCount, 0),
            revealedDice: this.players.map(player => ({
                playerId: player.id,
                playerName: player.name,
                dice: [...player.currentDice]
            }))
        };

        this.addLog(`${caller.name} calls Calza on ${bidder.name}'s bid ${this.round.lastBid.quantity} x ${this.round.lastBid.face}.`);

        if (bidIsExact) {
            this.addLog(`Calza successful: exact count (${actualCount}). ${caller.name} gains a die.`);
        } else {
            this.addLog(`Calza failed: count is ${actualCount}. ${caller.name} loses a die.`);
        }

        let nextStarterIndex;
        let palificoNextRound = false;

        if (caller.diceCount <= 0) {
            const removalIndex = this.players.findIndex(player => player.id === caller.id);
            this.players.splice(removalIndex, 1);
            this.addLog(`${caller.name} is eliminated.`);

            if (this.players.length === 1) {
                this.round.setGameOver(this.players[0].id);
                this.addLog(`${this.players[0].name} wins the game.`);
                return;
            }

            nextStarterIndex = removalIndex % this.players.length;
        } else {
            nextStarterIndex = this.players.findIndex(player => player.id === caller.id);
            palificoNextRound = !bidIsExact && callerDiceBefore === 2 && caller.diceCount === 1;
        }

        this.startRound(nextStarterIndex, palificoNextRound);
    }

    handleCalza(player) {
        const playerIndex = this.players.findIndex(item => item.id === player.id);

        if (this.round.phase !== 'bidding') {
            return { ok: false, error: 'Calza is only available during bidding.' };
        }

        if (!this.round.lastBid) {
            return { ok: false, error: 'Cannot call Calza before any bid.' };
        }

        if (this.round.turnIndex !== playerIndex) {
            return { ok: false, error: 'Not your turn.' };
        }

        if (this.round.palificoRound) {
            return { ok: false, error: 'Calza is not allowed in Palifico round.' };
        }

        if (this.players.length <= 2) {
            return { ok: false, error: 'Calza is not allowed with only two players left.' };
        }

        this.resolveAfterCalza(playerIndex);
        return { ok: true };
    }
}

module.exports = PerudoGame;
