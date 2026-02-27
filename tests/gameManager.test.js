const test = require('node:test');
const assert = require('node:assert/strict');

const GameManager = require('../game/GameManager');

function createManager(messageSink) {
    return new GameManager({
        send: (ws, payload) => {
            messageSink.push({ ws, payload });
        },
        minPlayersToStart: 2,
        maxPlayersPerRoom: 6,
        startingDicePerPlayer: 5,
        rollDice: count => Array.from({ length: count }, () => 2)
    });
}

test('rematch moves players into same fresh room when they click', () => {
    const sent = [];
    const manager = createManager(sent);

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'lobby' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'lobby' });

    const oldGame = manager.games.get('lobby');
    assert.ok(oldGame);
    assert.equal(oldGame.players.length, 2);

    oldGame.round.setGameOver(oldGame.players[0].id);

    manager.handleRematch(wsAlice);

    const rematchRoomId = manager.clientToRoom.get(wsAlice);
    assert.ok(rematchRoomId);
    assert.notEqual(rematchRoomId, 'lobby');

    manager.handleRematch(wsBob);

    assert.equal(manager.clientToRoom.get(wsBob), rematchRoomId);

    const rematchGame = manager.games.get(rematchRoomId);
    assert.ok(rematchGame);
    assert.equal(rematchGame.players.length, 2);
});

test('winner can rematch first without removing rematch path for remaining player', () => {
    const sent = [];
    const manager = createManager(sent);

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'lobby2' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'lobby2' });

    const oldGame = manager.games.get('lobby2');
    assert.ok(oldGame);
    oldGame.round.setGameOver(oldGame.players.find(player => player.name === 'Bob').id);

    manager.handleRematch(wsBob);

    const rematchRoomId = manager.clientToRoom.get(wsBob);
    assert.ok(rematchRoomId);
    assert.notEqual(rematchRoomId, 'lobby2');

    const oldRoomAfterWinnerRematch = manager.games.get('lobby2');
    assert.ok(oldRoomAfterWinnerRematch);
    assert.equal(oldRoomAfterWinnerRematch.round.phase, 'game_over');
    assert.equal(oldRoomAfterWinnerRematch.players.length, 1);

    manager.handleRematch(wsAlice);

    assert.equal(manager.clientToRoom.get(wsAlice), rematchRoomId);
    const rematchGame = manager.games.get(rematchRoomId);
    assert.ok(rematchGame);
    assert.equal(rematchGame.players.length, 2);
});
