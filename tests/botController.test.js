const test = require('node:test');
const assert = require('node:assert/strict');

const GameManager = require('../game/GameManager');
const Bid = require('../game/Bid');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function createManager(sent, overrides = {}) {
    return new GameManager({
        send: (ws, payload) => {
            sent.push({ ws, payload });
        },
        minPlayersToStart: 2,
        maxPlayersPerRoom: 6,
        startingDicePerPlayer: 5,
        rollDice: count => Array.from({ length: count }, () => 2),
        bot: { delayMinMs: 5, delayMaxMs: 10, fastForwardDelayMs: 1, revealWaitCapMs: 200 },
        ...overrides
    });
}

// Ann plus `botCount` bots in a started game. Rooms are torn down after the test
// so no timers (bot or reconnect) outlive it.
function setup(t, { botCount = 1, roomId = 'bots', random } = {}) {
    const sent = [];
    const manager = createManager(sent, random
        ? { bot: { delayMinMs: 5, delayMaxMs: 10, fastForwardDelayMs: 1, revealWaitCapMs: 200, random } }
        : {});
    const wsAnn = { id: 'ws-ann' };
    manager.join(wsAnn, { type: 'join', name: 'Ann', roomId });
    for (let index = 0; index < botCount; index += 1) {
        manager.handleAddBot(wsAnn);
    }
    manager.handleStartGame(wsAnn);

    t.after(() => {
        for (const id of [...manager.games.keys()]) {
            manager.deleteRoom(id);
        }
    });

    const game = manager.games.get(roomId);
    const ann = game.players.find(player => !player.isBot);
    const bots = game.players.filter(player => player.isBot);
    return { sent, manager, wsAnn, game, ann, bots, roomId };
}

function giveTurnTo(manager, game, player) {
    game.round.turnIndex = game.players.indexOf(player);
    manager.broadcastState(game);
}

function botActions(manager, roomId, bot) {
    const session = manager.matchSessions.get(roomId);
    if (!session) {
        return [];
    }
    return session.actions.filter(action => action.actor
        && action.actor.playerId === bot.id
        && ['bid', 'dudo', 'calza'].includes(action.type));
}

// Ann dudos a bid by the bot that is wrong (11 x 2 with 10 dice), so the bot loses
// a die and opens the next round. Returns the resolution eventId.
function annDudosBotsBadBid(ctx) {
    const { manager, game, ann, bots, wsAnn } = ctx;
    game.round.lastBid = new Bid(11, 2, bots[0].id);
    game.round.turnIndex = game.players.indexOf(ann);
    manager.handleDudo(wsAnn);
    assert.equal(game.round.lastResolution.loserPlayerId, bots[0].id);
    assert.equal(game.getCurrentTurnPlayer().id, bots[0].id);
    assert.equal(game.round.lastBid, null);
    return game.round.lastResolution.eventId;
}

test('bot takes its turn after a delay', async t => {
    const { manager, game, ann, bots } = setup(t);
    giveTurnTo(manager, game, bots[0]);

    await sleep(50);

    assert.equal(game.round.lastBid.playerId, bots[0].id);
    assert.equal(game.getCurrentTurnPlayer().id, ann.id);
});

test('one action per turn despite repeated broadcasts', async t => {
    const { manager, game, bots, roomId } = setup(t);
    giveTurnTo(manager, game, bots[0]);
    for (let index = 0; index < 5; index += 1) {
        manager.broadcastState(game);
    }

    await sleep(50);

    assert.equal(botActions(manager, roomId, bots[0]).filter(action => action.type === 'bid').length, 1);
});

test('bot waits for reveal_done', async t => {
    const ctx = setup(t);
    const { manager, game, bots, wsAnn } = ctx;
    const eventId = annDudosBotsBadBid(ctx);

    await sleep(50);
    assert.equal(game.round.lastBid, null);

    manager.handleRevealDone(wsAnn, { eventId });
    await sleep(50);

    assert.equal(game.round.lastBid.playerId, bots[0].id);
});

test('reveal wait is capped', async t => {
    const ctx = setup(t);
    const { game, bots } = ctx;
    annDudosBotsBadBid(ctx);

    await sleep(120);
    assert.equal(game.round.lastBid, null);

    await sleep(230);
    assert.equal(game.round.lastBid.playerId, bots[0].id);
});

test('stale reveal_done is ignored', async t => {
    const ctx = setup(t);
    const { manager, game, wsAnn, sent } = ctx;
    annDudosBotsBadBid(ctx);
    sent.length = 0;

    manager.handleRevealDone(wsAnn, { eventId: 999 });
    await sleep(50);

    assert.equal(game.round.lastBid, null);
    assert.equal(sent.some(entry => entry.ws === wsAnn && entry.payload.type === 'error'), false);
});

test('reveal_done in a room without bots is ignored silently', () => {
    const sent = [];
    const manager = createManager(sent);
    const wsAnn = { id: 'ws-ann' };
    const wsBob = { id: 'ws-bob' };
    const wsStranger = { id: 'ws-stranger' };
    manager.join(wsAnn, { type: 'join', name: 'Ann', roomId: 'humans' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'humans' });
    manager.handleStartGame(wsAnn);
    sent.length = 0;

    manager.handleRevealDone(wsAnn, { eventId: 1 });
    manager.handleRevealDone(wsStranger, { eventId: 1 });

    assert.equal(sent.some(entry => entry.payload.type === 'error'), false);
    manager.deleteRoom('humans');
});

test('no action after the room is deleted', async t => {
    const { manager, wsAnn, game, bots } = setup(t);
    giveTurnTo(manager, game, bots[0]);

    manager.handleLeave(wsAnn);
    await sleep(50);

    assert.equal(manager.games.size, 0);
    assert.equal(game.round.lastBid, null);
});

test('no action after end_game reset', async t => {
    const { manager, wsAnn, game, bots, roomId } = setup(t);
    giveTurnTo(manager, game, bots[0]);

    manager.handleEndGame(wsAnn);
    await sleep(50);

    assert.equal(game.round.phase, 'waiting');
    assert.equal(game.round.lastBid, null);
    assert.equal(botActions(manager, roomId, bots[0]).length, 0);
});

test('a timer that fires after the round moved on does nothing', async t => {
    const { manager, game, bots, roomId } = setup(t);
    giveTurnTo(manager, game, bots[0]);

    // Change the round under the pending timer without a broadcast.
    game.round.roundNumber += 1;
    await sleep(50);

    assert.equal(game.round.lastBid, null);
    assert.equal(botActions(manager, roomId, bots[0]).length, 0);
});

test('bots pause while no human is connected and resume on reconnect', async t => {
    const { manager, sent, wsAnn, game, bots, roomId } = setup(t);
    const reconnectToken = sent.find(entry => entry.ws === wsAnn && entry.payload.type === 'joined').payload.reconnectToken;
    giveTurnTo(manager, game, bots[0]);

    manager.removeBySocket(wsAnn);
    await sleep(50);
    assert.equal(game.round.lastBid, null);

    const wsAnnAgain = { id: 'ws-ann-again' };
    manager.join(wsAnnAgain, { type: 'join', name: 'Ann', roomId, reconnectToken });
    await sleep(50);

    assert.equal(game.round.lastBid.playerId, bots[0].id);
});

test('fast-forward when the human is out', async t => {
    const { manager, wsAnn, game, ann, bots } = setup(t, { botCount: 2 });
    ann.diceCount = 1;
    ann.currentDice = [2];
    game.round.lastBid = new Bid(1, 2, bots[0].id);
    game.round.turnIndex = game.players.indexOf(ann);

    manager.handleDudo(wsAnn);
    assert.equal(ann.diceCount, 0);
    assert.equal(game.round.phase, 'bidding');

    const deadline = Date.now() + 2000;
    while (game.round.phase !== 'game_over' && Date.now() < deadline) {
        await sleep(20);
    }

    assert.equal(game.round.phase, 'game_over');
    assert.ok(bots.some(bot => bot.id === game.round.winnerPlayerId));
});

test('a throwing strategy still passes the bot turn', async t => {
    const errors = t.mock.method(console, 'error', () => {});
    let armed = false;
    const random = () => {
        if (armed) {
            throw new Error('strategy exploded');
        }
        return 0.5;
    };
    const { manager, game, ann, bots } = setup(t, { random });
    giveTurnTo(manager, game, bots[0]);
    armed = true;

    await sleep(50);

    assert.equal(game.round.lastBid.playerId, bots[0].id);
    assert.deepEqual([game.round.lastBid.quantity, game.round.lastBid.face], [1, 2]);
    assert.equal(game.getCurrentTurnPlayer().id, ann.id);
    assert.ok(errors.mock.callCount() >= 1);
});

test('a failing fallback is retried once and the bot turn then passes', async t => {
    t.mock.method(console, 'error', () => {});
    const { manager, game, ann, bots } = setup(t);
    const realApplyBid = manager.applyBid.bind(manager);
    let calls = 0;
    manager.applyBid = (...args) => {
        calls += 1;
        if (calls <= 2) {
            throw new Error('apply exploded');
        }
        return realApplyBid(...args);
    };
    giveTurnTo(manager, game, bots[0]);

    await sleep(80);

    assert.equal(calls, 3);
    assert.equal(game.round.lastBid.playerId, bots[0].id);
    assert.equal(game.getCurrentTurnPlayer().id, ann.id);
});

test('a bot that can never act gives up after one retry instead of looping', async t => {
    const errors = t.mock.method(console, 'error', () => {});
    const { manager, game, bots } = setup(t);
    let calls = 0;
    manager.applyBid = () => {
        calls += 1;
        throw new Error('apply exploded');
    };
    giveTurnTo(manager, game, bots[0]);

    await sleep(100);

    assert.equal(calls, 4);
    assert.equal(game.round.lastBid, null);
    assert.ok(errors.mock.calls.some(call => /waiting for the next state change/.test(String(call.arguments[0]))));
});
