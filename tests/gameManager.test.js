const test = require('node:test');
const assert = require('node:assert/strict');

const GameManager = require('../game/GameManager');

function createManager(messageSink, overrides = {}) {
    return new GameManager({
        send: (ws, payload) => {
            messageSink.push({ ws, payload });
        },
        minPlayersToStart: 2,
        maxPlayersPerRoom: 6,
        startingDicePerPlayer: 5,
        rollDice: count => Array.from({ length: count }, () => 2),
        ...overrides
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

test('manual start_game begins bidding from waiting room', () => {
    const sent = [];
    const manager = createManager(sent);

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'manual-start' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'manual-start' });

    const game = manager.games.get('manual-start');
    assert.ok(game);
    assert.equal(game.round.phase, 'waiting');

    manager.handleStartGame(wsAlice);

    assert.equal(game.round.phase, 'bidding');
    assert.equal(game.round.roundNumber, 1);
});

test('start_game returns error when already started', () => {
    const sent = [];
    const manager = createManager(sent);

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'manual-start-error' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'manual-start-error' });

    manager.handleStartGame(wsAlice);
    manager.handleStartGame(wsBob);

    const latestError = sent.findLast(entry => entry.ws === wsBob && entry.payload.type === 'error');
    assert.ok(latestError);
    assert.match(latestError.payload.message, /already in progress|Cannot manually start/i);
});

test('end_game resets room to clean waiting state and restores starting dice', () => {
    const sent = [];
    const manager = createManager(sent);

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'reset-room' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'reset-room' });

    const game = manager.games.get('reset-room');
    assert.ok(game);

    manager.handleStartGame(wsAlice);
    game.players[0].diceCount = 2;
    game.players[1].diceCount = 1;

    manager.handleEndGame(wsAlice);

    assert.equal(game.round.phase, 'waiting');
    assert.equal(game.round.roundNumber, 0);
    assert.equal(game.round.lastBid, null);
    assert.equal(game.round.winnerPlayerId, null);

    assert.equal(game.players.every(player => player.diceCount === 5), true);
    assert.equal(game.players.every(player => Array.isArray(player.currentDice) && player.currentDice.length === 0), true);

    assert.deepEqual(game.actionLog, [
        'Room created. Waiting for players.',
        'Alice reset the game.'
    ]);

    const roomSettings = manager.getRoomUiSettings('reset-room');
    assert.equal(roomSettings.turnTimerEnabled, false);
});

test('join_game promotes mid-game spectator to active player', () => {
    const sent = [];
    const manager = createManager(sent);

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };
    const wsCara = { id: 'ws-cara' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'spectator-room' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'spectator-room' });
    manager.handleStartGame(wsAlice);

    manager.join(wsCara, { type: 'join', name: 'Cara', roomId: 'spectator-room' });

    const game = manager.games.get('spectator-room');
    const cara = game.players.find(player => player.name === 'Cara');
    assert.ok(cara);
    assert.equal(cara.isSpectator, true);
    assert.equal(cara.diceCount, 0);

    manager.handleJoinGame(wsCara);

    assert.equal(cara.isSpectator, false);
    assert.equal(cara.diceCount, 5);
    assert.equal(cara.currentDice.length, 5);
});

test('seventh joiner is rejected when room already has six players', () => {
    const sent = [];
    const manager = createManager(sent);

    const sockets = Array.from({ length: 7 }, (_, index) => ({ id: `ws-${index + 1}` }));
    for (let index = 0; index < 6; index += 1) {
        manager.join(sockets[index], { type: 'join', name: `Player${index + 1}`, roomId: 'cap-room' });
    }

    const game = manager.games.get('cap-room');
    assert.ok(game);
    assert.equal(game.players.length, 6);

    manager.join(sockets[6], { type: 'join', name: 'Player7', roomId: 'cap-room' });

    assert.equal(game.players.length, 6);
    assert.equal(manager.clientToRoom.has(sockets[6]), false);
    const latestError = sent.findLast(entry => entry.ws === sockets[6] && entry.payload.type === 'error');
    assert.ok(latestError);
    assert.match(latestError.payload.message, /room is full|max 6/i);
});

test('chat message is broadcast only to players in same room and included in history for new joiner', () => {
    const sent = [];
    const manager = createManager(sent);

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };
    const wsClara = { id: 'ws-clara' };
    const wsDerek = { id: 'ws-derek' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'chat-room-a' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'chat-room-a' });
    manager.join(wsClara, { type: 'join', name: 'Clara', roomId: 'chat-room-b' });

    sent.length = 0;
    manager.handleChatMessage(wsAlice, { type: 'chat_message', message: 'hello room a' });

    const roomChatEvents = sent.filter(entry => entry.payload.type === 'chat');
    assert.equal(roomChatEvents.length, 2);
    assert.equal(roomChatEvents.every(entry => entry.payload.roomId === 'chat-room-a'), true);
    assert.equal(roomChatEvents.some(entry => entry.ws === wsClara), false);

    manager.join(wsDerek, { type: 'join', name: 'Derek', roomId: 'chat-room-a' });

    const historyMessage = sent.findLast(
        entry => entry.ws === wsDerek && entry.payload.type === 'chat_history'
    );
    assert.ok(historyMessage);
    assert.equal(Array.isArray(historyMessage.payload.messages), true);
    assert.equal(historyMessage.payload.messages.some(item => item.message === 'hello room a'), true);
});

test('telemetry store records chat, match history, and account win/loss', async () => {
    const sent = [];
    const telemetryCalls = {
        chats: [],
        matches: [],
        stats: []
    };

    const telemetryStore = {
        async recordChatMessage(entry) {
            telemetryCalls.chats.push(entry);
        },
        async upsertMatchHistory(match) {
            telemetryCalls.matches.push(match);
        },
        async incrementUserRecord(record) {
            telemetryCalls.stats.push(record);
        }
    };

    const manager = createManager(sent, { telemetryStore });

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };

    manager.join(wsAlice, {
        type: 'join',
        roomId: 'telemetry-room',
        name: 'Alice',
        authToken: '',
        authType: 'account'
    });
    manager.join(wsBob, {
        type: 'join',
        roomId: 'telemetry-room',
        name: 'Bob',
        authToken: '',
        authType: 'account'
    });

    const game = manager.games.get('telemetry-room');
    game.players[0].authType = 'account';
    game.players[0].accountUsername = 'alice';
    game.players[0].accountUserId = 'alice';
    game.players[1].authType = 'account';
    game.players[1].accountUsername = 'bob';
    game.players[1].accountUserId = 'bob';

    manager.handleChatMessage(wsAlice, { type: 'chat_message', message: 'hello telemetry' });
    manager.handleStartGame(wsAlice);
    game.round.setGameOver(game.players[0].id);
    manager.handleRematch(wsAlice);

    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(telemetryCalls.chats.length >= 1, true);
    assert.equal(telemetryCalls.chats.some(item => item.message === 'hello telemetry'), true);

    assert.equal(telemetryCalls.matches.length >= 1, true);
    const latestMatch = telemetryCalls.matches[telemetryCalls.matches.length - 1];
    assert.equal(latestMatch.status, 'completed');
    assert.equal(Array.isArray(latestMatch.actions), true);
    assert.equal(latestMatch.actions.some(action => action.type === 'chat_message'), true);

    assert.equal(telemetryCalls.stats.length >= 2, true);
    const accountStats = telemetryCalls.stats.filter(item => item.username === 'alice' || item.username === 'bob');
    assert.equal(accountStats.length >= 2, true);
    assert.equal(accountStats.some(item => item.isWin === true), true);
    assert.equal(accountStats.some(item => item.isWin === false), true);
});

test('disconnect holds seat during grace window and reconnect restores same player id', () => {
    const sent = [];
    const manager = createManager(sent, { reconnectGraceMs: 120 });

    const wsAlice = { id: 'ws-alice' };
    const wsBob = { id: 'ws-bob' };

    manager.join(wsAlice, { type: 'join', name: 'Alice', roomId: 'reconnect-room' });
    manager.join(wsBob, { type: 'join', name: 'Bob', roomId: 'reconnect-room' });

    const firstJoin = sent.find(entry => entry.ws === wsAlice && entry.payload.type === 'joined');
    assert.ok(firstJoin);
    const reconnectToken = firstJoin.payload.reconnectToken;
    const originalPlayerId = firstJoin.payload.playerId;
    assert.ok(reconnectToken);

    sent.length = 0;
    manager.removeBySocket(wsAlice);

    const game = manager.games.get('reconnect-room');
    const disconnectedAlice = game.players.find(player => player.id === originalPlayerId);
    assert.ok(disconnectedAlice);
    assert.equal(disconnectedAlice.isDisconnected, true);

    const wsAliceReconnect = { id: 'ws-alice-reconnect' };
    manager.join(wsAliceReconnect, {
        type: 'join',
        name: 'Alice',
        roomId: 'reconnect-room',
        reconnectToken
    });

    const rejoined = sent.find(entry => entry.ws === wsAliceReconnect && entry.payload.type === 'joined');
    assert.ok(rejoined);
    assert.equal(rejoined.payload.playerId, originalPlayerId);

    const restoredAlice = game.players.find(player => player.id === originalPlayerId);
    assert.ok(restoredAlice);
    assert.equal(restoredAlice.isDisconnected, false);
});
