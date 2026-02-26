const diceContainer = document.getElementById('dice-container');
const bidButton = document.getElementById('bid-button');
const calzaButton = document.getElementById('calza-button');
const dudoButton = document.getElementById('dudo-button');
const joinButton = document.getElementById('join-button');
const leaveButton = document.getElementById('leave-button');
const quantityButtons = document.getElementById('quantity-buttons');
const faceButtons = document.getElementById('face-buttons');
const playerNameInput = document.getElementById('player-name');
const roomIdInput = document.getElementById('room-id');
const playersList = document.getElementById('players-list');
const joinStatusText = document.getElementById('status');
const gameStatusText = document.getElementById('status-game');
const joinScreen = document.getElementById('join-screen');
const gameScreen = document.getElementById('game-screen');
const lastBidText = document.getElementById('last-bid');
const roundNumberText = document.getElementById('round-number');
const palificoIndicatorText = document.getElementById('palifico-indicator');
const actionLogList = document.getElementById('action-log');
const resolutionText = document.getElementById('resolution-text');
const resolutionModal = document.getElementById('resolution-modal');
const modalOverlay = document.getElementById('resolution-modal-overlay');
const modalCloseButton = document.getElementById('modal-close-button');
const modalSummary = document.getElementById('modal-summary');
const modalRevealList = document.getElementById('modal-reveal-list');

const state = {
    socket: null,
    playerId: null,
    roomId: null,
    isConnected: false,
    phase: 'waiting',
    players: [],
    currentTurnPlayerId: null,
    roundNumber: 0,
    palificoRound: false,
    palificoFace: null,
    lastBid: null,
    yourDice: [],
    actionLog: [],
    lastResolution: null,
    winnerPlayerId: null,
    selectedBidQuantity: 1,
    selectedBidFace: 2,
    lastSeenResolutionKey: null
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

    const positions = pipPositionsByValue[value] || [];
    for (const position of positions) {
        const pip = document.createElement('span');
        pip.className = 'pip';
        pip.style.gridArea = `p${position}`;
        die.appendChild(pip);
    }
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

function getPlayerNameById(playerId) {
    const player = state.players.find(item => item.id === playerId);
    return player ? player.name : 'Unknown';
}

function getTotalDiceInRoom() {
    return state.players.reduce((sum, player) => sum + Number(player.diceCount || 0), 0);
}

function getCanAct() {
    const isMyTurn = state.currentTurnPlayerId === state.playerId;
    return state.isConnected && state.phase === 'bidding' && state.players.length >= 2 && isMyTurn;
}

function isLegalBid(quantity, face) {
    const totalDice = getTotalDiceInRoom();

    if (!Number.isInteger(quantity) || !Number.isInteger(face) || face < 1 || face > 6) {
        return false;
    }

    if (quantity < 1 || quantity > totalDice) {
        return false;
    }

    const previousBid = state.lastBid;

    if (!previousBid) {
        if (!state.palificoRound && face === 1) {
            return false;
        }
        return true;
    }

    if (state.palificoRound) {
        const lockedFace = state.palificoFace || previousBid.face;
        return face === lockedFace && quantity > previousBid.quantity;
    }

    const previousFaceIsPaco = previousBid.face === 1;
    const nextFaceIsPaco = face === 1;

    if (!previousFaceIsPaco && !nextFaceIsPaco) {
        if (quantity > previousBid.quantity) {
            return true;
        }

        return quantity === previousBid.quantity && face > previousBid.face;
    }

    if (!previousFaceIsPaco && nextFaceIsPaco) {
        const minPacos = Math.ceil(previousBid.quantity / 2);
        return quantity >= minPacos;
    }

    if (previousFaceIsPaco && nextFaceIsPaco) {
        return quantity > previousBid.quantity;
    }

    const minNormal = previousBid.quantity * 2 + 1;
    return quantity >= minNormal;
}

function findFirstLegalBid() {
    const totalDice = getTotalDiceInRoom();

    for (let quantity = 1; quantity <= totalDice; quantity += 1) {
        for (let face = 1; face <= 6; face += 1) {
            if (isLegalBid(quantity, face)) {
                return { quantity, face };
            }
        }
    }

    return null;
}

function renderPlayers() {
    playersList.replaceChildren();

    for (const player of state.players) {
        const item = document.createElement('li');
        const isSelf = player.id === state.playerId;
        const isTurn = player.id === state.currentTurnPlayerId;

        if (isTurn) {
            item.classList.add('turn');
        }

        const dot = document.createElement('span');
        dot.className = 'turn-dot';

        const name = document.createElement('span');
        name.className = 'player-main';
        const selfSuffix = isSelf ? ' (you)' : '';
        name.textContent = `${player.name}${selfSuffix}`;

        const diceIcons = document.createElement('span');
        diceIcons.className = 'player-dice-icons';
        const iconCount = Math.max(0, Math.min(5, Number(player.diceCount) || 0));
        diceIcons.textContent = '🎲'.repeat(iconCount);

        item.append(dot, name, diceIcons);
        playersList.appendChild(item);
    }
}

function renderDice() {
    diceContainer.replaceChildren();

    for (let index = 0; index < state.yourDice.length; index += 1) {
        const die = document.createElement('div');
        die.className = 'die';
        die.setAttribute('aria-label', `Die ${index + 1}`);
        renderDie(die, state.yourDice[index]);
        diceContainer.appendChild(die);
    }
}

function renderLastBid() {
    if (!state.lastBid) {
        lastBidText.textContent = 'None';
        return;
    }

    const faceLabel = state.lastBid.face === 1 ? 'Pacos' : `Face ${state.lastBid.face}`;
    lastBidText.textContent = `${state.lastBid.playerName}: ${state.lastBid.quantity} × ${faceLabel}`;
}

function renderActionLog() {
    actionLogList.replaceChildren();

    for (const line of state.actionLog) {
        const item = document.createElement('li');
        item.textContent = line;
        actionLogList.appendChild(item);
    }
}

function renderResolution() {
    if (!state.lastResolution) {
        resolutionText.textContent = 'No Dudo/Calza resolution yet.';
        return;
    }

    if (state.lastResolution.type === 'calza') {
        const bidFaceLabel = state.lastResolution.bid.face === 1 ? 'Pacos' : `Face ${state.lastResolution.bid.face}`;
        const outcome = state.lastResolution.bidIsExact
            ? `${state.lastResolution.callerName} was correct and gained a die.`
            : `${state.lastResolution.callerName} was wrong and lost a die.`;
        resolutionText.textContent = `${state.lastResolution.callerName} called Calza on ${state.lastResolution.bidderName} (${state.lastResolution.bid.quantity} × ${bidFaceLabel}). Actual count: ${state.lastResolution.actualCount}. ${outcome}`;
        return;
    }

    const bidFaceLabel = state.lastResolution.bid.face === 1 ? 'Pacos' : `Face ${state.lastResolution.bid.face}`;
    const verdict = state.lastResolution.bidWasCorrect ? 'Bid was correct' : 'Bid was wrong';
    resolutionText.textContent = `${state.lastResolution.doubterName} called Dudo on ${state.lastResolution.bidderName} (${state.lastResolution.bid.quantity} × ${bidFaceLabel}). ${verdict}; ${state.lastResolution.loserName} lost a die.`;
}

function renderQuantityButtons(canAct) {
    quantityButtons.replaceChildren();

    const totalDice = getTotalDiceInRoom();
    if (totalDice < 1) {
        return;
    }

    for (let quantity = 1; quantity <= totalDice; quantity += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option-btn quantity-option';
        button.textContent = String(quantity);

        const isLegalWithCurrentFace = isLegalBid(quantity, state.selectedBidFace);
        button.disabled = !canAct || !isLegalWithCurrentFace;

        if (state.selectedBidQuantity === quantity) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            if (button.disabled) {
                return;
            }

            state.selectedBidQuantity = quantity;
            updateActionAvailability();
        });

        quantityButtons.appendChild(button);
    }
}

function renderFaceButtons(canAct) {
    faceButtons.replaceChildren();

    for (let face = 1; face <= 6; face += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option-btn face-option';
        button.setAttribute('aria-label', `Face ${face}`);

        const faceDie = document.createElement('div');
        faceDie.className = 'face-option-die';
        renderDie(faceDie, face);
        button.appendChild(faceDie);

        const isLegalWithCurrentQuantity = isLegalBid(state.selectedBidQuantity, face);
        button.disabled = !canAct || !isLegalWithCurrentQuantity;

        if (state.selectedBidFace === face) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            if (button.disabled) {
                return;
            }

            state.selectedBidFace = face;
            updateActionAvailability();
        });

        faceButtons.appendChild(button);
    }
}

function isMatchingDieForBidFace(dieValue, bidFace) {
    if (bidFace === 1) {
        return dieValue === 1;
    }

    return dieValue === bidFace || dieValue === 1;
}

function createRevealDie(value, highlight) {
    const die = document.createElement('div');
    die.className = `die reveal${highlight ? ' match' : ''}`;
    renderDie(die, value);
    return die;
}

function getResolutionKey(resolution) {
    if (!resolution) {
        return null;
    }

    if (resolution.type === 'calza') {
        return `calza:${resolution.callerPlayerId}:${resolution.bid?.quantity}:${resolution.bid?.face}:${resolution.actualCount}`;
    }

    return `dudo:${resolution.doubterPlayerId}:${resolution.bid?.quantity}:${resolution.bid?.face}:${resolution.actualCount}`;
}

function closeResolutionModal() {
    resolutionModal.classList.add('hidden');
}

function openDudoRevealModal(resolution) {
    if (!resolution || resolution.type === 'calza' || !Array.isArray(resolution.revealedDice) || !resolution.bid) {
        return;
    }

    modalRevealList.replaceChildren();

    let highlightedCount = 0;

    for (const playerDice of resolution.revealedDice) {
        const row = document.createElement('div');
        row.className = 'reveal-row';

        const playerTitle = document.createElement('p');
        playerTitle.className = 'reveal-player-name';
        playerTitle.textContent = playerDice.playerName;

        const diceWrap = document.createElement('div');
        diceWrap.className = 'reveal-dice';

        for (const value of playerDice.dice) {
            const isMatch = isMatchingDieForBidFace(value, resolution.bid.face);
            if (isMatch) {
                highlightedCount += 1;
            }

            diceWrap.appendChild(createRevealDie(value, isMatch));
        }

        row.append(playerTitle, diceWrap);
        modalRevealList.appendChild(row);
    }

    const faceLabel = resolution.bid.face === 1 ? 'Pacos (1s)' : `${resolution.bid.face}s (+ Pacos)`;
    modalSummary.textContent = `Bid was ${resolution.bid.quantity} × ${faceLabel}. Highlighted matches found: ${highlightedCount}.`;

    resolutionModal.classList.remove('hidden');
}

function updateActionAvailability() {
    const canAct = getCanAct();

    if (canAct && !isLegalBid(state.selectedBidQuantity, state.selectedBidFace)) {
        const firstLegal = findFirstLegalBid();
        if (firstLegal) {
            state.selectedBidQuantity = firstLegal.quantity;
            state.selectedBidFace = firstLegal.face;
        }
    }

    const canCalza =
        canAct &&
        Boolean(state.lastBid) &&
        !state.palificoRound &&
        state.players.length > 2;

    renderQuantityButtons(canAct);
    renderFaceButtons(canAct);

    bidButton.disabled = !canAct || !isLegalBid(state.selectedBidQuantity, state.selectedBidFace);
    calzaButton.disabled = !canCalza;
    dudoButton.disabled = !canAct || !state.lastBid;
}

function updateStatusFromState() {
    if (!state.isConnected) {
        return;
    }

    if (state.phase === 'game_over') {
        const winnerName = getPlayerNameById(state.winnerPlayerId);
        setStatus(`🏁 Game over. ${winnerName} wins.`);
        return;
    }

    if (state.phase === 'waiting') {
        setStatus('⌛ Waiting for at least 2 players to start.');
        return;
    }

    if (state.currentTurnPlayerId === state.playerId) {
        setStatus(state.lastBid ? '👉 Your turn: raise the bid, call Calza, or call Dudo.' : '👉 Your turn: place the opening bid.');
        return;
    }

    const turnName = getPlayerNameById(state.currentTurnPlayerId);
    setStatus(`🕒 ${turnName}'s turn.`);
}

function applyStateUpdate(payload) {
    state.phase = payload.phase || 'waiting';
    state.players = Array.isArray(payload.players) ? payload.players : [];
    state.currentTurnPlayerId = payload.currentTurnPlayerId || null;
    state.roundNumber = Number(payload.roundNumber) || 0;
    state.palificoRound = Boolean(payload.palificoRound);
    state.palificoFace = payload.palificoFace || null;
    state.lastBid = payload.lastBid || null;
    state.yourDice = Array.isArray(payload.yourDice) ? payload.yourDice : [];
    state.actionLog = Array.isArray(payload.actionLog) ? payload.actionLog : [];
    state.lastResolution = payload.lastResolution || null;
    state.winnerPlayerId = payload.winnerPlayerId || null;

    roundNumberText.textContent = state.roundNumber > 0 ? String(state.roundNumber) : '-';
    palificoIndicatorText.textContent = state.palificoRound
        ? `Yes${state.palificoFace ? ` (face ${state.palificoFace})` : ''}`
        : 'No';

    renderPlayers();
    renderDice();
    renderLastBid();
    renderActionLog();
    renderResolution();
    const resolutionKey = getResolutionKey(state.lastResolution);
    if (resolutionKey && resolutionKey !== state.lastSeenResolutionKey) {
        state.lastSeenResolutionKey = resolutionKey;
        openDudoRevealModal(state.lastResolution);
    }
    updateActionAvailability();
    updateStatusFromState();
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

        if (payload.type === 'error') {
            setStatus(payload.message || 'Server error.');
            setJoinState(true);
        }
    });

    socket.addEventListener('close', () => {
        state.isConnected = false;
        state.phase = 'waiting';
        state.players = [];
        state.currentTurnPlayerId = null;
        state.playerId = null;
        state.roomId = null;
        state.lastBid = null;
        state.yourDice = [];
        state.actionLog = [];
        state.lastResolution = null;
        state.winnerPlayerId = null;
        state.selectedBidQuantity = 1;
        state.selectedBidFace = 2;
        state.lastSeenResolutionKey = null;
        state.socket = null;

        renderPlayers();
        renderDice();
        renderLastBid();
        renderActionLog();
        renderResolution();
        updateActionAvailability();

        setJoinState(true);
        setLeaveState(false);
        showJoinScreen();
        setStatus('Disconnected. Join again.');
        closeResolutionModal();
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

function placeBid() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || bidButton.disabled) {
        return;
    }

    state.socket.send(
        JSON.stringify({
            type: 'bid',
            quantity: state.selectedBidQuantity,
            face: state.selectedBidFace
        })
    );
}

function callDudo() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || dudoButton.disabled) {
        return;
    }

    state.socket.send(JSON.stringify({ type: 'dudo' }));
}

function callCalza() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || calzaButton.disabled) {
        return;
    }

    state.socket.send(JSON.stringify({ type: 'calza' }));
}

joinButton.addEventListener('click', connectToMatch);
leaveButton.addEventListener('click', leaveMatch);
bidButton.addEventListener('click', placeBid);
calzaButton.addEventListener('click', callCalza);
dudoButton.addEventListener('click', callDudo);
modalCloseButton.addEventListener('click', closeResolutionModal);
modalOverlay.addEventListener('click', closeResolutionModal);

setLeaveState(false);
updateActionAvailability();
showJoinScreen();
setStatus('Not connected.');
