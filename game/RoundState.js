class RoundState {
    constructor() {
        this.phase = 'waiting';
        this.turnIndex = 0;
        this.roundNumber = 0;
        this.palificoRound = false;
        this.palificoFace = null;
        this.lastBid = null;
        this.lastResolution = null;
        this.winnerPlayerId = null;
    }

    startNewRound(starterIndex, playerCount, palificoRound) {
        this.roundNumber += 1;
        this.phase = 'bidding';
        this.turnIndex = ((starterIndex % playerCount) + playerCount) % playerCount;
        this.lastBid = null;
        this.palificoRound = Boolean(palificoRound);
        this.palificoFace = null;
        this.winnerPlayerId = null;
    }

    setWaiting() {
        this.phase = 'waiting';
        this.turnIndex = 0;
        this.lastBid = null;
        this.palificoRound = false;
        this.palificoFace = null;
    }

    setGameOver(winnerPlayerId) {
        this.phase = 'game_over';
        this.winnerPlayerId = winnerPlayerId;
    }
}

module.exports = RoundState;
