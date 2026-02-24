const dice = document.querySelectorAll('.die');
const rollButton = document.getElementById('roll-button');
const joinButton = document.getElementById('join-button');
const leaveButton = document.getElementById('leave-button');
const playerNameInput = document.getElementById('player-name');
const roomIdInput = document.getElementById('room-id');
const playersList = document.getElementById('players-list');
const joinStatusText = document.getElementById('status');
const gameStatusText = document.getElementById('status-game');
const joinScreen = document.getElementById('join-screen');
const gameScreen = document.getElementById('game-screen');

const state = {
    socket: null,
    playerId: null,
    roomId: null,
    players: [],
    currentTurnPlayerId: null,
    isRolling: false,
    isConnected: false
};

const pipPositionsByValue = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
};

function renderDie(die, value) {
    die.dataset.value = String(value);
    die.replaceChildren();

    const positions = pipPositionsByValue[value];
    for (const position of positions) {
        const pip = document.createElement('span');
        pip.className = 'pip';
        pip.style.gridArea = `p${position}`;
        die.appendChild(pip);
    }
}

function randomDieValue() {
    return Math.floor(Math.random() * 6) + 1;
}

function setButtonState(enabled) {
    rollButton.disabled = !enabled;
}

function setJoinState(enabled) {
    joinButton.disabled = !enabled;
    playerNameInput.disabled = !enabled;
    roomIdInput.disabled = !enabled;
}

function setLeaveState(enabled) {
    leaveButton.disabled = !enabled;
}

function showJoinScreen() {
    joinScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
}

function showGameScreen() {
    joinScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

function setStatus(message) {
    joinStatusText.textContent = message;
    gameStatusText.textContent = message;
}

function getWsUrl() {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalHost) {
        const localProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${localProtocol}//${window.location.host}/ws`;
    }

    const appConfig = window.APP_CONFIG || {};
    const configuredApiBaseUrl = typeof appConfig.API_BASE_URL === 'string' ? appConfig.API_BASE_URL.trim() : '';

    if (configuredApiBaseUrl) {
        const normalizedBase = configuredApiBaseUrl.replace(/\/$/, '');
        const wsBase = normalizedBase.replace(/^http/i, 'ws');
        return `${wsBase}/ws`;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
}

function updateRollAvailability() {
    const hasEnoughPlayers = state.players.length >= 2;
    const isMyTurn = state.currentTurnPlayerId === state.playerId;
    const canRoll = state.isConnected && !state.isRolling && hasEnoughPlayers && isMyTurn;
    setButtonState(canRoll);
}

function renderPlayers() {
    playersList.replaceChildren();

    for (const player of state.players) {
        const item = document.createElement('li');
        const isSelf = player.id === state.playerId;
        const isTurn = player.id === state.currentTurnPlayerId;
        const dot = document.createElement('span');
        dot.className = 'turn-dot';

        const name = document.createElement('span');
        name.textContent = isSelf ? `${player.name} (you)` : player.name;

        if (isTurn) {
            item.classList.add('turn');
        }

        item.append(dot, name);
        playersList.appendChild(item);
    }
}

function renderDice(values) {
    dice.forEach((die, index) => {
        renderDie(die, values[index]);
    });
}

function applyStateUpdate(payload) {
    state.players = Array.isArray(payload.players) ? payload.players : [];
    state.currentTurnPlayerId = payload.currentTurnPlayerId || null;
    state.isRolling = Boolean(payload.isRolling);

    if (Array.isArray(payload.dice) && payload.dice.length === 5) {
        renderDice(payload.dice);
    }

    renderPlayers();
    updateRollAvailability();

    if (!state.isConnected) {
        return;
    }

    if (state.isRolling) {
        setStatus('Rolling...');
        return;
    }

    if (state.players.length < 2) {
        setStatus('Waiting for at least 2 players.');
        return;
    }

    if (state.currentTurnPlayerId === state.playerId) {
        setStatus('Your turn to roll.');
        return;
    }

    const turnPlayer = state.players.find(player => player.id === state.currentTurnPlayerId);
    const turnName = turnPlayer ? turnPlayer.name : 'Another player';
    setStatus(`${turnName}'s turn.`);
}

function connectToMatch() {
    const name = playerNameInput.value.trim() || 'Player';
    const roomId = roomIdInput.value.trim() || 'lobby';

    if (state.socket) {
        state.socket.close();
        state.socket = null;
    }

    setJoinState(false);
    setStatus('Connecting...');

    const socket = new WebSocket(getWsUrl());
    state.socket = socket;

    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'join', name, roomId }));
    });

    socket.addEventListener('message', event => {
        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch {
            setStatus('Received invalid server payload.');
            return;
        }

        if (payload.type === 'joined') {
            state.isConnected = true;
            state.playerId = payload.playerId;
            state.roomId = payload.roomId;
            showGameScreen();
            setLeaveState(true);
            applyStateUpdate(payload);
            return;
        }

        if (payload.type === 'state') {
            applyStateUpdate(payload);
            return;
        }

        if (payload.type === 'roll_start') {
            state.isRolling = true;
            updateRollAvailability();
            setStatus('Rolling...');
            return;
        }

        if (payload.type === 'roll_tick') {
            if (Array.isArray(payload.dice) && payload.dice.length === 5) {
                renderDice(payload.dice);
            }
            return;
        }

        if (payload.type === 'roll_end') {
            state.isRolling = false;
            if (Array.isArray(payload.dice) && payload.dice.length === 5) {
                renderDice(payload.dice);
            }
            updateRollAvailability();
            return;
        }

        if (payload.type === 'error') {
            setStatus(payload.message || 'Server error.');
            setJoinState(true);
            return;
        }
    });

    socket.addEventListener('close', () => {
        state.isConnected = false;
        state.isRolling = false;
        state.players = [];
        state.currentTurnPlayerId = null;
        state.playerId = null;
        state.roomId = null;
        state.socket = null;
        updateRollAvailability();
        renderPlayers();
        setJoinState(true);
        setLeaveState(false);
        showJoinScreen();
        setStatus('Disconnected. Join again.');
    });

    socket.addEventListener('error', () => {
        setStatus('Connection failed.');
        setJoinState(true);
    });
}

function leaveMatch() {
    if (state.socket) {
        state.socket.close();
        return;
    }

    showJoinScreen();
    setJoinState(true);
    setLeaveState(false);
    setStatus('Not connected.');
}

function rollDice() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
        return;
    }

    if (rollButton.disabled) {
        return;
    }

    state.socket.send(JSON.stringify({ type: 'roll' }));
}

joinButton.addEventListener('click', connectToMatch);
leaveButton.addEventListener('click', leaveMatch);
rollButton.addEventListener('click', rollDice);

dice.forEach(die => {
    renderDie(die, randomDieValue());
});

setButtonState(false);
setLeaveState(false);
showJoinScreen();