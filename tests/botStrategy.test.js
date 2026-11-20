const test = require('node:test');
const assert = require('node:assert/strict');
const RuleValidator = require('../game/RuleValidator');
const { expectedCount, decideBotAction } = require('../game/BotStrategy');

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const randInt = (rand, min, max) => min + Math.floor(rand() * (max - min + 1));

test('expectedCount counts wild ones', () => {
    assert.ok(Math.abs(expectedCount(5, [1, 5, 2], 10, false) - (2 + 7 / 3)) < 1e-9);
    assert.ok(Math.abs(expectedCount(5, [1, 5, 2], 10, true) - (1 + 7 / 6)) < 1e-9);
    assert.ok(Math.abs(expectedCount(1, [1, 5, 2], 10, false) - (1 + 7 / 6)) < 1e-9);
});

test('never makes an illegal bid', () => {
    for (let seed = 1; seed <= 500; seed++) {
        const rand = mulberry32(seed);
        const ownDice = Array.from({ length: randInt(rand, 1, 5) }, () => randInt(rand, 1, 6));
        const totalDice = randInt(rand, ownDice.length, 30);
        const players = [{ diceCount: totalDice }];
        const palificoRound = rand() < 0.3;
        let lastBid = null;
        if (rand() < 0.8) {
            const candidate = { quantity: randInt(rand, 1, totalDice), face: randInt(rand, 1, 6) };
            if (RuleValidator.isValidFirstBid(players, candidate, palificoRound)) {
                lastBid = candidate;
            }
        }
        const palificoFace = palificoRound && lastBid ? lastBid.face : null;
        const result = decideBotAction(
            { ownDice, totalDice, lastBid, palificoRound, palificoFace, activePlayerCount: randInt(rand, 2, 6) },
            rand
        );
        if (result.action === 'bid') {
            const bid = { quantity: result.quantity, face: result.face };
            const ok = lastBid
                ? RuleValidator.isValidRaisedBid(players, lastBid, bid, palificoRound, palificoFace)
                : RuleValidator.isValidFirstBid(players, bid, palificoRound);
            assert.ok(ok, `seed ${seed}: illegal bid ${JSON.stringify(bid)} over ${JSON.stringify(lastBid)}`);
        }
    }
});

test('opening is always a bid', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const rand = mulberry32(seed);
        const result = decideBotAction(
            { ownDice: [1, 3, 3, 6, 2], totalDice: 15, lastBid: null, palificoRound: false, palificoFace: null, activePlayerCount: 3 },
            rand
        );
        assert.equal(result.action, 'bid');
        assert.notEqual(result.face, 1);
    }
});

test('doubts an impossible bid', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const result = decideBotAction(
            { ownDice: [2, 3], totalDice: 4, lastBid: { quantity: 4, face: 6 }, palificoRound: false, palificoFace: null, activePlayerCount: 2 },
            mulberry32(seed)
        );
        assert.equal(result.action, 'dudo');
    }
});

test('does not doubt a bid its own dice already meet', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const result = decideBotAction(
            { ownDice: [5, 5, 5, 1, 2], totalDice: 10, lastBid: { quantity: 3, face: 5 }, palificoRound: false, palificoFace: null, activePlayerCount: 3 },
            mulberry32(seed)
        );
        assert.notEqual(result.action, 'dudo');
    }
});

test('never calzas when illegal', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const base = { ownDice: [4, 4, 1], totalDice: 9, lastBid: { quantity: 4, face: 4 }, palificoFace: 4 };
        const pal = decideBotAction({ ...base, palificoRound: true, activePlayerCount: 4 }, mulberry32(seed));
        const two = decideBotAction({ ...base, palificoRound: false, palificoFace: null, activePlayerCount: 2 }, mulberry32(seed));
        assert.notEqual(pal.action, 'calza');
        assert.notEqual(two.action, 'calza');
    }
});
