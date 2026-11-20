const RuleValidator = require('./RuleValidator');

// Tunable constants.
const DUDO_THRESHOLD_BASE = 1.0;   // bid this many dice above expectation is "suspicious"
const DUDO_THRESHOLD_NOISE = 1.0;  // threshold varies by +/- half of this, so bots aren't predictable
const CALZA_WINDOW = 0.5;          // only consider calza when the bid is this close to expectation
const CALZA_CHANCE = 0.1;          // ...and then only rarely
const BLUFF_CHANCE = 0.15;         // chance to pick a less-supported raise
const BLUFF_MAX_OVERSHOOT = 2;     // bluffs never exceed expectation by more than this many dice
const HONEST_POOL = 3;             // honest bids choose among the best N candidates

function matchingOwn(face, ownDice, palificoRound) {
    const wild = !palificoRound && face !== 1;
    return ownDice.filter((d) => d === face || (wild && d === 1)).length;
}

function expectedCount(face, ownDice, totalDice, palificoRound) {
    const p = palificoRound || face === 1 ? 1 / 6 : 1 / 3;
    return matchingOwn(face, ownDice, palificoRound) + (totalDice - ownDice.length) * p;
}

function legalBids({ ownDice, totalDice, lastBid, palificoRound, palificoFace }) {
    const players = [{ diceCount: totalDice }];
    const faces = palificoRound && lastBid ? [palificoFace] : [1, 2, 3, 4, 5, 6];
    const bids = [];
    for (let quantity = 1; quantity <= totalDice; quantity++) {
        for (const face of faces) {
            const bid = { quantity, face };
            const legal = lastBid
                ? RuleValidator.isValidRaisedBid(players, lastBid, bid, palificoRound, palificoFace)
                : RuleValidator.isValidFirstBid(players, bid, palificoRound);
            if (legal) {
                bids.push({ ...bid, expected: expectedCount(face, ownDice, totalDice, palificoRound) });
            }
        }
    }
    return bids;
}

function decideBotAction(state, random) {
    const { ownDice, totalDice, lastBid, palificoRound, activePlayerCount } = state;

    if (lastBid) {
        const expected = expectedCount(lastBid.face, ownDice, totalDice, state.palificoRound);
        const gap = lastBid.quantity - expected;
        const threshold = DUDO_THRESHOLD_BASE + (random() - 0.5) * DUDO_THRESHOLD_NOISE;
        if (gap > threshold) {
            return { action: 'dudo' };
        }
        const calzaLegal = !palificoRound && activePlayerCount > 2;
        if (calzaLegal && Math.abs(gap) < CALZA_WINDOW && random() < CALZA_CHANCE) {
            return { action: 'calza' };
        }
    }

    const candidates = legalBids(state);
    if (candidates.length === 0) {
        return { action: 'dudo' };
    }

    // Most plausible first: quantity closest to what we expect to exist.
    candidates.sort((a, b) => Math.abs(a.quantity - a.expected) - Math.abs(b.quantity - b.expected)
        || a.quantity - b.quantity);

    let pick;
    if (random() < BLUFF_CHANCE) {
        const bluffs = candidates.filter((c) => c.quantity - c.expected <= BLUFF_MAX_OVERSHOOT
            && c.quantity > c.expected);
        const pool = bluffs.length ? bluffs : candidates;
        pick = pool[Math.floor(random() * pool.length)];
    } else {
        const pool = candidates.slice(0, HONEST_POOL);
        pick = pool[Math.floor(random() * random() * pool.length)];
    }
    return { action: 'bid', quantity: pick.quantity, face: pick.face };
}

module.exports = { expectedCount, decideBotAction };
