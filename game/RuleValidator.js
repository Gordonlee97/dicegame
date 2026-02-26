class RuleValidator {
    static totalDice(players) {
        return players.reduce((sum, player) => sum + player.diceCount, 0);
    }

    static countMatchingDice(players, bid, palificoRound) {
        let total = 0;

        for (const player of players) {
            for (const die of player.currentDice) {
                if (palificoRound) {
                    if (die === bid.face) {
                        total += 1;
                    }
                    continue;
                }

                if (bid.face === 1) {
                    if (die === 1) {
                        total += 1;
                    }
                    continue;
                }

                if (die === bid.face || die === 1) {
                    total += 1;
                }
            }
        }

        return total;
    }

    static isValidFirstBid(players, bid, palificoRound) {
        if (bid.quantity < 1) {
            return false;
        }

        if (bid.quantity > this.totalDice(players)) {
            return false;
        }

        if (!palificoRound && bid.face === 1) {
            return false;
        }

        return true;
    }

    static isValidRaisedBid(players, previousBid, nextBid, palificoRound, palificoFace) {
        if (nextBid.quantity < 1 || nextBid.quantity > this.totalDice(players)) {
            return false;
        }

        if (palificoRound) {
            return nextBid.face === palificoFace && nextBid.quantity > previousBid.quantity;
        }

        const previousFaceIsPaco = previousBid.face === 1;
        const nextFaceIsPaco = nextBid.face === 1;

        if (!previousFaceIsPaco && !nextFaceIsPaco) {
            if (nextBid.quantity > previousBid.quantity) {
                return true;
            }

            return nextBid.quantity === previousBid.quantity && nextBid.face > previousBid.face;
        }

        if (!previousFaceIsPaco && nextFaceIsPaco) {
            const minPacos = Math.ceil(previousBid.quantity / 2);
            return nextBid.quantity >= minPacos;
        }

        if (previousFaceIsPaco && nextFaceIsPaco) {
            return nextBid.quantity > previousBid.quantity;
        }

        const minNormal = previousBid.quantity * 2 + 1;
        return nextBid.quantity >= minNormal;
    }
}

module.exports = RuleValidator;
