const test = require('node:test');
const assert = require('node:assert/strict');

const PerudoGame = require('../game/PerudoGame');
const Bid = require('../game/Bid');

function createRoller(sequence) {
    let index = 0;

    return count => {
        if (index >= sequence.length) {
            throw new Error('Roll sequence exhausted.');
        }

        const dice = sequence[index];
        index += 1;

        if (!Array.isArray(dice) || dice.length !== count) {
            throw new Error(`Roll length mismatch. Expected ${count}, got ${Array.isArray(dice) ? dice.length : 'invalid'}.`);
        }

        return [...dice];
    };
}

function createGame(sequence, options = {}) {
    return new PerudoGame('test-room', {
        minPlayersToStart: options.minPlayersToStart ?? 2,
        maxPlayersPerRoom: 6,
        startingDicePerPlayer: 5,
        rollDice: createRoller(sequence)
    });
}

function addPlayers(game, names) {
    for (const name of names) {
        const result = game.addPlayer({
            id: `id-${name}`,
            name,
            ws: { id: `ws-${name}` }
        });
        assert.equal(result.ok, true);
    }
}

function player(game, name) {
    return game.players.find(item => item.name === name);
}

function startGame(game, starterName = null) {
    const starter = starterName ? player(game, starterName) : game.players[0];
    assert.ok(starter);
    const result = game.handleStartGame(starter);
    assert.equal(result.ok, true);
}

test('opening bid cannot be pacos outside palifico', () => {
    const game = createGame([
        [2, 2, 3, 4, 5],
        [1, 1, 6, 6, 6]
    ]);

    addPlayers(game, ['Alice', 'Bob']);
    startGame(game, 'Alice');

    const alice = player(game, 'Alice');
    const result = game.handleBid(alice, new Bid(2, 1, alice.id));

    assert.equal(result.ok, false);
    assert.match(result.error, /First bid cannot be Pacos/);
});

test('bid raising rules enforce normal/paco transitions', () => {
    const game = createGame(
        [
            [2, 2, 2, 3, 4],
            [1, 4, 4, 5, 6],
            [1, 2, 3, 4, 6]
        ],
        { minPlayersToStart: 3 }
    );

    addPlayers(game, ['Alice', 'Bob', 'Cara']);
    startGame(game, 'Alice');

    const alice = player(game, 'Alice');
    const bob = player(game, 'Bob');
    const cara = player(game, 'Cara');

    let result = game.handleBid(alice, new Bid(9, 4, alice.id));
    assert.equal(result.ok, true);

    result = game.handleBid(bob, new Bid(4, 1, bob.id));
    assert.equal(result.ok, false);

    result = game.handleBid(bob, new Bid(5, 1, bob.id));
    assert.equal(result.ok, true);

    result = game.handleBid(cara, new Bid(10, 3, cara.id));
    assert.equal(result.ok, false);

    result = game.handleBid(cara, new Bid(11, 3, cara.id));
    assert.equal(result.ok, true);
});

test('dudo resolves correctly and starts next round from loser', () => {
    const game = createGame([
        [2, 2, 2, 3, 4],
        [1, 5, 6, 6, 6],
        [2, 2, 2, 2, 2],
        [3, 3, 3, 3]
    ]);

    addPlayers(game, ['Alice', 'Bob']);
    startGame(game, 'Alice');

    const alice = player(game, 'Alice');
    const bob = player(game, 'Bob');

    let result = game.handleBid(alice, new Bid(4, 2, alice.id));
    assert.equal(result.ok, true);

    result = game.handleDudo(bob);
    assert.equal(result.ok, true);

    assert.equal(player(game, 'Bob').diceCount, 4);
    assert.equal(game.round.roundNumber, 2);
    assert.equal(game.players[game.round.turnIndex].name, 'Bob');
    assert.equal(game.round.lastResolution.bidWasCorrect, true);
});

test('palifico round enforces locked face and allows paco opening bid', () => {
    const game = createGame(
        [
            [6, 6],
            [2, 3],
            [1],
            [2, 2]
        ],
        { minPlayersToStart: 2 }
    );

    addPlayers(game, ['Alice', 'Bob']);

    const alice = player(game, 'Alice');
    const bob = player(game, 'Bob');

    alice.diceCount = 2;
    bob.diceCount = 2;
    game.startRound(0, false);

    let result = game.handleBid(alice, new Bid(3, 6, alice.id));
    assert.equal(result.ok, true);

    result = game.handleDudo(bob);
    assert.equal(result.ok, true);

    assert.equal(alice.diceCount, 1);
    assert.equal(game.round.palificoRound, true);
    assert.equal(game.players[game.round.turnIndex].name, 'Alice');

    result = game.handleBid(alice, new Bid(1, 1, alice.id));
    assert.equal(result.ok, true);

    result = game.handleBid(bob, new Bid(2, 2, bob.id));
    assert.equal(result.ok, false);

    result = game.handleBid(bob, new Bid(2, 1, bob.id));
    assert.equal(result.ok, true);

    result = game.handleCalza(alice);
    assert.equal(result.ok, false);
    assert.match(result.error, /not allowed in Palifico/);
});

test('calza exact gains die and caller starts next round', () => {
    const game = createGame(
        [
            [2, 2, 3, 4, 5],
            [1, 6, 6, 6],
            [2, 3, 4, 5, 6],
            [1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2],
            [3, 3, 3, 3, 3]
        ],
        { minPlayersToStart: 3 }
    );

    let result = game.addPlayer({ id: 'id-Alice', name: 'Alice', ws: { id: 'ws-Alice' } });
    assert.equal(result.ok, true);

    result = game.addPlayer({ id: 'id-Bob', name: 'Bob', ws: { id: 'ws-Bob' } });
    assert.equal(result.ok, true);

    const alice = player(game, 'Alice');
    const bob = player(game, 'Bob');

    bob.diceCount = 4;

    result = game.addPlayer({ id: 'id-Cara', name: 'Cara', ws: { id: 'ws-Cara' } });
    assert.equal(result.ok, true);

    startGame(game, 'Alice');

    result = game.handleBid(alice, new Bid(4, 2, alice.id));
    assert.equal(result.ok, true);

    result = game.handleCalza(bob);
    assert.equal(result.ok, true);

    assert.equal(bob.diceCount, 5);
    assert.equal(game.round.roundNumber, 2);
    assert.equal(game.players[game.round.turnIndex].name, 'Bob');
    assert.equal(game.round.lastResolution.type, 'calza');
    assert.equal(game.round.lastResolution.bidIsExact, true);
});

test('calza can be called by non-bidder and is blocked for bidder', () => {
    const game = createGame(
        [
            [2, 2, 3, 4, 5],
            [1, 6, 6, 6, 6],
            [2, 3, 4, 5, 6],
            [1, 1, 1, 1, 1],
            [2, 2, 2, 2, 2],
            [3, 3, 3, 3, 3]
        ],
        { minPlayersToStart: 3 }
    );

    addPlayers(game, ['Alice', 'Bob', 'Cara']);
    startGame(game, 'Alice');

    const alice = player(game, 'Alice');
    const bob = player(game, 'Bob');

    let result = game.handleBid(alice, new Bid(4, 2, alice.id));
    assert.equal(result.ok, true);

    result = game.handleCalza(alice);
    assert.equal(result.ok, false);
    assert.match(result.error, /cannot call Calza on your own bid/i);

    result = game.handleCalza(bob);
    assert.equal(result.ok, true);
    assert.equal(game.round.lastResolution.type, 'calza');
});

test('eliminated players stay in room as spectators and still appear in reveal', () => {
    const game = createGame([
        [2],
        [3, 3]
    ]);

    addPlayers(game, ['Alice', 'Bob']);

    const alice = player(game, 'Alice');
    const bob = player(game, 'Bob');

    alice.diceCount = 1;
    bob.diceCount = 2;
    game.startRound(0, false);

    let result = game.handleBid(alice, new Bid(2, 6, alice.id));
    assert.equal(result.ok, true);

    result = game.handleDudo(bob);
    assert.equal(result.ok, true);

    assert.equal(player(game, 'Alice').diceCount, 0);
    assert.ok(player(game, 'Alice'));
    assert.equal(game.round.phase, 'game_over');
    assert.equal(game.round.winnerPlayerId, bob.id);
    assert.ok(game.round.lastResolution.revealedDice.some(item => item.playerId === alice.id));
});