const diceContainer = document.getElementById('dice-container');
const bidButton = document.getElementById('bid-button');
const calzaButton = document.getElementById('calza-button');
const dudoButton = document.getElementById('dudo-button');
const joinButton = document.getElementById('join-button');
const leaveButton = document.getElementById('leave-button');
const sidebarRematchButton = document.getElementById('sidebar-rematch-button');
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
const lobbyCodeText = document.getElementById('lobby-code');
const actionLogList = document.getElementById('action-log');
const resolutionText = document.getElementById('resolution-text');
const resolutionModal = document.getElementById('resolution-modal');
const modalOverlay = document.getElementById('resolution-modal-overlay');
const modalCloseButton = document.getElementById('modal-close-button');
const modalTitle = document.getElementById('modal-title');
const modalCaller = document.getElementById('modal-caller');
const modalVerdict = document.getElementById('modal-verdict');
const modalSummary = document.getElementById('modal-summary');
const modalMatchCount = document.getElementById('modal-match-count');
const modalRevealList = document.getElementById('modal-reveal-list');
const modalLoser = document.getElementById('modal-loser');
const victoryModal = document.getElementById('victory-modal');
const victoryOverlay = document.getElementById('victory-modal-overlay');
const victoryCloseButton = document.getElementById('victory-close-button');
const victoryMessage = document.getElementById('victory-message');
const victoryBurst = document.getElementById('victory-burst');
const rematchButton = document.getElementById('rematch-button');
const rematchStatus = document.getElementById('rematch-status');
const settingsToggle = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const settingsOverlay = document.getElementById('settings-modal-overlay');
const settingsCloseButton = document.getElementById('settings-close-button');
const settingsPanel = document.getElementById('settings-panel');
const soundToggle = document.getElementById('sound-toggle');
const fontScaleSelect = document.getElementById('font-scale');
const advancedToggle = document.getElementById('advanced-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const rulesPanel = document.getElementById('rules-panel');
const actionHelper = document.getElementById('action-helper');
const loadingScreen = document.getElementById('app-loading');
const confirmModal = document.getElementById('confirm-modal');
const confirmOverlay = document.getElementById('confirm-modal-overlay');
const confirmMessage = document.getElementById('confirm-message');
const confirmCancelButton = document.getElementById('confirm-cancel-button');
const confirmAcceptButton = document.getElementById('confirm-accept-button');
const quantityOverflowModal = document.getElementById('quantity-overflow-modal');
const quantityOverflowOverlay = document.getElementById('quantity-overflow-overlay');
const quantityOverflowCloseButton = document.getElementById('quantity-overflow-close');
const quantityOverflowButtons = document.getElementById('quantity-overflow-buttons');
const resolutionPanel = document.querySelector('.resolution-panel');
const logSidebar = document.querySelector('.log-sidebar');

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
    selectedBidQuantity: null,
    selectedBidFace: null,
    lastSeenResolutionKey: null,
    previousDiceKey: '',
    previousBidKey: '',
    pendingConfirmAction: null,
    lastSeenWinnerPlayerId: null,
    pendingVictoryWinnerName: null,
    rematchRequested: false,
    playerColorByName: {},
    nextPlayerColorIndex: 0,
    ui: {
        soundEnabled: true,
        fontScale: 1,
        showAdvanced: false,
        darkMode: false
    }
};

const playerNameColorPalette = ['#2563eb', '#e11d48', '#16a34a', '#a855f7', '#ea580c', '#0f766e'];

const pipPositionsByValue = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
};

let audioContext;

function maybeHideLoadingScreen() {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 400);
}

function setFontScale(scaleValue) {
    const parsed = Number(scaleValue);
    if (!Number.isFinite(parsed)) {
        return;
    }

    state.ui.fontScale = parsed;
    document.documentElement.style.setProperty('--font-scale', String(parsed));
}

function setShowAdvanced(enabled) {
    state.ui.showAdvanced = Boolean(enabled);
    const showValue = state.ui.showAdvanced ? '' : 'none';

    resolutionPanel.style.display = showValue;
    logSidebar.style.display = '';
    rulesPanel.open = false;
}

function setDarkMode(enabled) {
    state.ui.darkMode = Boolean(enabled);
    document.body.classList.toggle('dark-mode', state.ui.darkMode);
}

function openSettingsModal() {
    settingsModal.classList.remove('hidden');
    settingsToggle.setAttribute('aria-expanded', 'true');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
    settingsToggle.setAttribute('aria-expanded', 'false');
    rulesPanel.open = false;
}

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

function playTone(frequency, durationMs, volume = 0.018, type = 'triangle') {
    if (!state.ui.soundEnabled) {
        return;
    }

    if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            return;
        }
        audioContext = new AudioCtx();
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000 + 0.02);
}

function playRattleCue() {
    playTone(240, 90, 0.018, 'square');
    setTimeout(() => playTone(290, 80, 0.016, 'square'), 48);
    setTimeout(() => playTone(350, 95, 0.015, 'triangle'), 92);
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

function setStatusNodes(builder) {
    joinStatusText.replaceChildren(builder());
    gameStatusText.replaceChildren(builder());
}

function renderLobbyCode() {
    lobbyCodeText.textContent = state.roomId || '-';
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

function getActivePlayers() {
    return state.players.filter(player => Number(player.diceCount || 0) > 0);
}

function isSelfEliminated() {
    const self = state.players.find(player => player.id === state.playerId);
    return Boolean(self) && Number(self.diceCount || 0) <= 0;
}

function getCanAct() {
    const isMyTurn = state.currentTurnPlayerId === state.playerId;
    return state.isConnected && state.phase === 'bidding' && getActivePlayers().length >= 2 && isMyTurn && !isSelfEliminated();
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

function addTouchFeedback(element) {
    element.addEventListener('touchstart', () => {
        element.classList.add('touch-active');
    }, { passive: true });

    const clear = () => element.classList.remove('touch-active');
    element.addEventListener('touchend', clear, { passive: true });
    element.addEventListener('touchcancel', clear, { passive: true });
}

function renderPlayers() {
    playersList.replaceChildren();
    refreshPlayerColorAssignments();

    for (const player of state.players) {
        const item = document.createElement('li');
        const isSelf = player.id === state.playerId;
        const isTurn = player.id === state.currentTurnPlayerId;
        const isEliminated = Number(player.diceCount || 0) <= 0;

        if (isTurn) {
            item.classList.add('turn');
        }

        if (isEliminated) {
            item.classList.add('eliminated');
        }

        const dot = document.createElement('span');
        dot.className = 'turn-dot';

        const name = document.createElement('span');
        name.className = 'player-main';
        name.append(createColoredPlayerNameNode(player.name));
        if (isSelf) {
            const selfTag = document.createElement('span');
            selfTag.className = 'player-self-tag';
            selfTag.textContent = '(you)';
            name.appendChild(selfTag);
        }

        if (isEliminated) {
            const eliminatedTag = document.createElement('span');
            eliminatedTag.className = 'player-eliminated-tag';
            eliminatedTag.textContent = '(out)';
            name.appendChild(eliminatedTag);
        }

        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';

        const diceIcons = document.createElement('span');
        diceIcons.className = 'player-dice-icons';
        const iconCount = Math.max(0, Math.min(5, Number(player.diceCount) || 0));
        diceIcons.textContent = '🎲'.repeat(iconCount);

        playerInfo.append(name, diceIcons);
        item.append(dot, playerInfo);
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

        addTouchFeedback(die);
        diceContainer.appendChild(die);
    }

    const nextDiceKey = JSON.stringify(state.yourDice);
    if (state.previousDiceKey && state.previousDiceKey !== nextDiceKey) {
        for (const die of diceContainer.querySelectorAll('.die')) {
            die.classList.add('flash');
            setTimeout(() => die.classList.remove('flash'), 320);
        }
        playRattleCue();
    }
    state.previousDiceKey = nextDiceKey;
}

function renderLastBid() {
    if (!state.lastBid) {
        lastBidText.textContent = 'No active bid';
        return;
    }

    lastBidText.replaceChildren(
        createColoredPlayerNameNode(state.lastBid.playerName),
        document.createTextNode(': '),
        createInlineBidValue(state.lastBid.quantity, state.lastBid.face, true)
    );
}

function createInlineBidValue(quantity, face, includePacosLabel = false) {
    const wrap = document.createElement('span');
    wrap.className = 'inline-bid';

    const quantityText = document.createElement('span');
    quantityText.textContent = String(quantity);

    const timesText = document.createElement('span');
    timesText.textContent = '×';

    const faceDie = document.createElement('span');
    faceDie.className = 'inline-bid-die';
    faceDie.setAttribute('aria-label', `Value ${face}`);
    renderDie(faceDie, face);

    wrap.append(quantityText, timesText, faceDie);

    if (includePacosLabel && face === 1) {
        const pacosTag = document.createElement('span');
        pacosTag.textContent = 'Pacos';
        wrap.append(pacosTag);
    }

    return wrap;
}

function appendLineWithBidIcons(container, line) {
    const bidPattern = /(\d+)\s*x\s*([1-6])/gi;
    let cursor = 0;
    let match;

    while ((match = bidPattern.exec(line)) !== null) {
        const fullMatch = match[0];
        const matchStart = match.index;
        const matchEnd = matchStart + fullMatch.length;

        if (matchStart > cursor) {
            container.append(document.createTextNode(line.slice(cursor, matchStart)));
        }

        const quantity = Number(match[1]);
        const face = Number(match[2]);
        container.append(createInlineBidValue(quantity, face));
        cursor = matchEnd;
    }

    if (cursor < line.length) {
        container.append(document.createTextNode(line.slice(cursor)));
    }

    if (cursor === 0) {
        container.textContent = line;
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensurePlayerColor(name) {
    if (!name) {
        return;
    }

    if (state.playerColorByName[name]) {
        return;
    }

    const color = playerNameColorPalette[state.nextPlayerColorIndex % playerNameColorPalette.length];
    state.playerColorByName[name] = color;
    state.nextPlayerColorIndex += 1;
}

function refreshPlayerColorAssignments() {
    for (const player of state.players) {
        ensurePlayerColor(player.name);
    }
}

function createColoredPlayerNameNode(name) {
    ensurePlayerColor(name);
    const nameSpan = document.createElement('span');
    nameSpan.className = 'log-player-name';
    nameSpan.style.color = state.playerColorByName[name] || 'inherit';
    nameSpan.textContent = name;
    return nameSpan;
}

function highlightPlayerNames(container) {
    const names = Object.keys(state.playerColorByName);
    if (names.length === 0) {
        return;
    }

    const sortedNames = names.sort((left, right) => right.length - left.length).map(escapeRegExp);
    const namePattern = new RegExp(`(^|[^A-Za-z0-9])(${sortedNames.join('|')})(?=$|[^A-Za-z0-9]|'s)`, 'g');
    const textNodes = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    for (const textNode of textNodes) {
        const sourceText = textNode.nodeValue || '';
        if (!sourceText.trim()) {
            continue;
        }

        let cursor = 0;
        let match;
        const fragment = document.createDocumentFragment();
        namePattern.lastIndex = 0;

        while ((match = namePattern.exec(sourceText)) !== null) {
            const leadingText = match[1] || '';
            const matchedName = match[2];
            const start = match.index;
            const nameStart = start + leadingText.length;
            const end = nameStart + matchedName.length;

            if (nameStart > cursor) {
                fragment.append(document.createTextNode(sourceText.slice(cursor, nameStart)));
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'log-player-name';
            nameSpan.style.color = state.playerColorByName[matchedName] || 'inherit';
            nameSpan.textContent = matchedName;
            fragment.append(nameSpan);

            cursor = end;
        }

        if (cursor === 0) {
            continue;
        }

        if (cursor < sourceText.length) {
            fragment.append(document.createTextNode(sourceText.slice(cursor)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    }
}

function mergeActionLog(existingLog, incomingLog) {
    if (!Array.isArray(incomingLog) || incomingLog.length === 0) {
        return existingLog;
    }

    if (!Array.isArray(existingLog) || existingLog.length === 0) {
        return incomingLog.slice();
    }

    if (incomingLog[0] === 'Room created. Waiting for players.' && existingLog.length > 0 && incomingLog.length < existingLog.length) {
        return incomingLog.slice();
    }

    const maxOverlap = Math.min(existingLog.length, incomingLog.length);

    for (let overlap = maxOverlap; overlap >= 0; overlap -= 1) {
        let matches = true;

        for (let index = 0; index < overlap; index += 1) {
            if (existingLog[existingLog.length - overlap + index] !== incomingLog[index]) {
                matches = false;
                break;
            }
        }

        if (matches) {
            return existingLog.concat(incomingLog.slice(overlap));
        }
    }

    return existingLog.concat(incomingLog);
}

function renderActionLog() {
    refreshPlayerColorAssignments();
    actionLogList.replaceChildren();

    for (const line of state.actionLog) {
        const item = document.createElement('li');
        const normalizedLine = String(line).toLowerCase();

        if (line.includes('joined the room mid-round')) {
            item.classList.add('log-highlight-join');
        } else if (normalizedLine.includes('failed')) {
            item.classList.add('log-outcome-fail');
        } else if (normalizedLine.includes('successful')) {
            item.classList.add('log-outcome-success');
        }

        appendLineWithBidIcons(item, line);
        highlightPlayerNames(item);
        actionLogList.appendChild(item);
    }

    actionLogList.scrollTop = actionLogList.scrollHeight;
}

function renderResolution() {
    if (!state.lastResolution) {
        resolutionText.textContent = 'No Dudo/Calza resolution yet.';
        return;
    }

    if (state.lastResolution.type === 'calza') {
        const outcomeText = state.lastResolution.bidIsExact
            ? ' was correct and gained a die.'
            : ' was wrong and lost a die.';
        resolutionText.replaceChildren(
            createColoredPlayerNameNode(state.lastResolution.callerName),
            document.createTextNode(' called Calza on '),
            createColoredPlayerNameNode(state.lastResolution.bidderName),
            document.createTextNode(' ('),
            createInlineBidValue(state.lastResolution.bid.quantity, state.lastResolution.bid.face, true),
            document.createTextNode(`). Actual count: ${state.lastResolution.actualCount}. `),
            createColoredPlayerNameNode(state.lastResolution.callerName),
            document.createTextNode(outcomeText)
        );
        return;
    }

    const verdict = state.lastResolution.bidWasCorrect ? 'Bid was correct' : 'Bid was wrong';
    resolutionText.replaceChildren(
        createColoredPlayerNameNode(state.lastResolution.doubterName),
        document.createTextNode(' called Dudo on '),
        createColoredPlayerNameNode(state.lastResolution.bidderName),
        document.createTextNode(' ('),
        createInlineBidValue(state.lastResolution.bid.quantity, state.lastResolution.bid.face, true),
        document.createTextNode(`). ${verdict}; `),
        createColoredPlayerNameNode(state.lastResolution.loserName),
        document.createTextNode(' lost a die.')
    );
}

function createOptionButton(label, classes = []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['option-btn', ...classes].join(' ');
    button.textContent = label;
    addTouchFeedback(button);
    return button;
}

function renderQuantityButtons(canAct) {
    quantityButtons.replaceChildren();
    quantityOverflowButtons.replaceChildren();

    const totalDice = getTotalDiceInRoom();
    if (totalDice < 1) {
        closeQuantityOverflowModal();
        return;
    }

    const inlineMaxQuantity = totalDice >= 10 ? 9 : totalDice;

    for (let quantity = 1; quantity <= inlineMaxQuantity; quantity += 1) {
        const button = createOptionButton(String(quantity), ['quantity-option']);

        const hasSelectedFace = Number.isInteger(state.selectedBidFace);
        const isLegalWithCurrentFace = !hasSelectedFace || isLegalBid(quantity, state.selectedBidFace);
        button.disabled = !canAct || !isLegalWithCurrentFace;

        if (state.selectedBidQuantity === quantity) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            if (button.disabled) {
                return;
            }

            state.selectedBidQuantity = quantity;
            playTone(420, 70, 0.014);
            updateActionAvailability();
        });

        quantityButtons.appendChild(button);
    }

    if (totalDice < 10) {
        closeQuantityOverflowModal();
        return;
    }

    const overflowTrigger = createOptionButton('10+', ['quantity-overflow-trigger']);
    overflowTrigger.disabled = !canAct;
    if (Number.isInteger(state.selectedBidQuantity) && state.selectedBidQuantity >= 10) {
        overflowTrigger.classList.add('selected');
    }

    overflowTrigger.addEventListener('click', () => {
        if (overflowTrigger.disabled) {
            return;
        }

        openQuantityOverflowModal();
    });
    quantityButtons.appendChild(overflowTrigger);

    for (let quantity = 10; quantity <= totalDice; quantity += 1) {
        const button = createOptionButton(String(quantity), ['quantity-option']);

        const hasSelectedFace = Number.isInteger(state.selectedBidFace);
        const isLegalWithCurrentFace = !hasSelectedFace || isLegalBid(quantity, state.selectedBidFace);
        button.disabled = !canAct || !isLegalWithCurrentFace;

        if (state.selectedBidQuantity === quantity) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            if (button.disabled) {
                return;
            }

            state.selectedBidQuantity = quantity;
            closeQuantityOverflowModal();
            playTone(420, 70, 0.014);
            updateActionAvailability();
        });

        quantityOverflowButtons.appendChild(button);
    }
}

function findFirstLegalQuantityForFace(face) {
    const totalDice = getTotalDiceInRoom();

    for (let quantity = 1; quantity <= totalDice; quantity += 1) {
        if (isLegalBid(quantity, face)) {
            return quantity;
        }
    }

    return null;
}

function renderFaceButtons(canAct) {
    faceButtons.replaceChildren();

    const palificoLocked = state.palificoRound && Boolean(state.lastBid);
    const lockedFace = state.palificoFace || state.lastBid?.face || null;
    const openingBidBlocksPacos = !state.lastBid && !state.palificoRound;

    for (let face = 1; face <= 6; face += 1) {
        const button = createOptionButton('', ['face-option']);
        button.setAttribute('aria-label', `Value ${face}`);

        const faceDie = document.createElement('div');
        faceDie.className = 'face-option-die';
        renderDie(faceDie, face);
        button.appendChild(faceDie);

        const blockedByPalifico = palificoLocked && face !== lockedFace;
        const blockedByOpeningBid = openingBidBlocksPacos && face === 1;
        button.disabled = !canAct || blockedByPalifico || blockedByOpeningBid;

        if (state.selectedBidFace === face) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            if (button.disabled) {
                return;
            }

            state.selectedBidFace = face;
            const hasSelectedQuantity = Number.isInteger(state.selectedBidQuantity);
            if (hasSelectedQuantity && !isLegalBid(state.selectedBidQuantity, face)) {
                const minimumLegalQuantity = findFirstLegalQuantityForFace(face);
                if (minimumLegalQuantity !== null) {
                    state.selectedBidQuantity = minimumLegalQuantity;
                }
            }
            playTone(460 + face * 18, 70, 0.013);
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

    if (state.pendingVictoryWinnerName) {
        const winnerName = state.pendingVictoryWinnerName;
        state.pendingVictoryWinnerName = null;
        openVictoryModal(winnerName);
    }
}

function closeVictoryModal() {
    victoryModal.classList.add('hidden');
    victoryBurst.replaceChildren();
}

function playVictoryCue() {
    playTone(520, 120, 0.018, 'triangle');
    setTimeout(() => playTone(700, 150, 0.018, 'triangle'), 70);
    setTimeout(() => playTone(920, 210, 0.016, 'triangle'), 155);
    setTimeout(() => playTone(1140, 180, 0.012, 'sine'), 280);
}

function spawnVictoryBurst() {
    victoryBurst.replaceChildren();

    const symbols = ['✨', '⭐', '🎉'];
    const pieces = 30;

    for (let index = 0; index < pieces; index += 1) {
        const piece = document.createElement('span');
        piece.className = 'victory-piece';
        piece.textContent = symbols[index % symbols.length];
        const angle = (Math.PI * 2 * index) / pieces + Math.random() * 0.45;
        const distance = 40 + Math.random() * 140;
        const drift = (Math.random() - 0.5) * 36;
        const dx = Math.cos(angle) * distance + drift;
        const dy = Math.sin(angle) * distance - 35;
        piece.style.setProperty('--spark-x', `${dx.toFixed(0)}px`);
        piece.style.setProperty('--spark-y', `${dy.toFixed(0)}px`);
        piece.style.animationDelay = `${Math.random() * 0.16}s`;
        piece.style.animationDuration = `${1.25 + Math.random() * 0.55}s`;
        victoryBurst.appendChild(piece);
    }
}

function openVictoryModal(winnerName) {
    victoryMessage.replaceChildren(
        createColoredPlayerNameNode(winnerName),
        document.createTextNode(' wins the game!')
    );
    spawnVictoryBurst();
    rematchStatus.textContent = '';
    rematchButton.disabled = state.rematchRequested;
    victoryModal.classList.remove('hidden');
    playVictoryCue();
}

function openQuantityOverflowModal() {
    quantityOverflowModal.classList.remove('hidden');
}

function closeQuantityOverflowModal() {
    quantityOverflowModal.classList.add('hidden');
}

function openDudoRevealModal(resolution) {
    if (!resolution || !Array.isArray(resolution.revealedDice) || !resolution.bid) {
        return;
    }

    for (const playerDice of resolution.revealedDice) {
        ensurePlayerColor(playerDice.playerName);
    }
    ensurePlayerColor(resolution.callerName || '');
    ensurePlayerColor(resolution.loserName || '');
    ensurePlayerColor(resolution.doubterName || '');
    ensurePlayerColor(resolution.bidderName || '');

    modalRevealList.replaceChildren();
    modalSummary.replaceChildren();
    modalCaller.textContent = '';

    let highlightedCount = 0;

    for (const playerDice of resolution.revealedDice) {
        const row = document.createElement('div');
        row.className = 'reveal-row';

        const playerTitle = document.createElement('p');
        playerTitle.className = 'reveal-player-name';
        playerTitle.append(createColoredPlayerNameNode(playerDice.playerName));

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

    if (resolution.type === 'calza') {
        const calzaSuccessful = Boolean(resolution.bidIsExact);
        const difference = Math.abs(Number(resolution.actualCount || 0) - Number(resolution.bid.quantity || 0));

        modalTitle.textContent = 'Calza Reveal';
        modalCaller.replaceChildren(
            createColoredPlayerNameNode(resolution.callerName),
            document.createTextNode(' called Calza.')
        );

        modalVerdict.textContent = calzaSuccessful ? 'Calza is SUCCESSFUL' : 'Calza FAILED';
        modalVerdict.classList.toggle('success', calzaSuccessful);
        modalVerdict.classList.toggle('fail', !calzaSuccessful);

        modalSummary.append(
            document.createTextNode('Bid was '),
            createInlineBidValue(resolution.bid.quantity, resolution.bid.face, true),
            document.createTextNode('.')
        );

        modalMatchCount.textContent = `Highlighted matches found: ${highlightedCount}. Off by: ${difference}.`;
        modalMatchCount.classList.toggle('success', calzaSuccessful);
        modalMatchCount.classList.toggle('fail', !calzaSuccessful);

        modalLoser.replaceChildren(
            createColoredPlayerNameNode(resolution.callerName),
            document.createTextNode(calzaSuccessful ? ' gains a die.' : ' loses a die.')
        );

        resolutionModal.classList.remove('hidden');
        return;
    }

    modalTitle.textContent = 'Dudo Reveal';

    const dudoSuccessful = !resolution.bidWasCorrect;
    modalVerdict.textContent = dudoSuccessful ? 'Dudo is SUCCESSFUL' : 'Dudo FAILED';
    modalVerdict.classList.toggle('success', dudoSuccessful);
    modalVerdict.classList.toggle('fail', !dudoSuccessful);

    modalSummary.append(
        document.createTextNode('Bid was '),
        createInlineBidValue(resolution.bid.quantity, resolution.bid.face, true),
        document.createTextNode('.')
    );

    modalMatchCount.textContent = `Highlighted matches found: ${highlightedCount}.`;
    modalMatchCount.classList.toggle('success', dudoSuccessful);
    modalMatchCount.classList.toggle('fail', !dudoSuccessful);

    modalLoser.replaceChildren(
        createColoredPlayerNameNode(resolution.loserName),
        document.createTextNode(' loses a die.')
    );

    resolutionModal.classList.remove('hidden');
}

function openConfirmModal(message, onAccept) {
    state.pendingConfirmAction = onAccept;
    confirmMessage.textContent = message;
    confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    confirmModal.classList.add('hidden');
    state.pendingConfirmAction = null;
}

function updateActionAvailability() {
    const canAct = getCanAct();
    const showSidebarRematch = state.phase === 'game_over';

    sidebarRematchButton.classList.toggle('hidden', !showSidebarRematch);
    sidebarRematchButton.disabled = !showSidebarRematch || state.rematchRequested;

    if (!canAct) {
        closeQuantityOverflowModal();
    }

    const canCalza =
        state.isConnected &&
        state.phase === 'bidding' &&
        getActivePlayers().length >= 3 &&
        Boolean(state.lastBid) &&
        !state.palificoRound &&
        !isSelfEliminated() &&
        state.playerId !== state.lastBid.playerId;

    renderQuantityButtons(canAct);
    renderFaceButtons(canAct);

    const hasSelection = Number.isInteger(state.selectedBidQuantity) && Number.isInteger(state.selectedBidFace);
    const bidIsLegal = hasSelection && isLegalBid(state.selectedBidQuantity, state.selectedBidFace);

    bidButton.disabled = !canAct || !hasSelection || !bidIsLegal;
    calzaButton.disabled = !canCalza;
    dudoButton.disabled = !canAct || !state.lastBid;

    if (!canAct) {
        actionHelper.textContent = state.phase === 'waiting'
            ? 'Waiting for enough players to start bidding.'
            : canCalza
                ? 'Wait for your turn. You can still call Calza.'
                : 'Wait for your turn.';
        return;
    }

    if (!state.lastBid) {
        actionHelper.textContent = hasSelection
            ? 'Opening bid ready. Press Bid to submit.'
            : 'Opening bid: choose both quantity and value (value 1 blocked outside Palifico).';
        return;
    }

    if (!hasSelection) {
        actionHelper.textContent = 'Choose both quantity and value to bid.';
        return;
    }

    actionHelper.textContent = bidIsLegal
        ? `Ready to bid: ${state.selectedBidQuantity} × ${state.selectedBidFace}.`
        : 'Current selection is illegal. Choose highlighted options.';
}

function updateStatusFromState() {
    if (!state.isConnected) {
        return;
    }

    gameStatusText.classList.remove('my-turn');

    if (state.phase === 'game_over') {
        const winnerName = getPlayerNameById(state.winnerPlayerId);
        setStatusNodes(() => {
            const fragment = document.createDocumentFragment();
            fragment.append(
                document.createTextNode('🏁 Game over. '),
                createColoredPlayerNameNode(winnerName),
                document.createTextNode(' wins.')
            );
            return fragment;
        });
        return;
    }

    if (state.phase === 'waiting') {
        setStatus('⌛ Waiting for at least 2 players to start.');
        return;
    }

    if (state.currentTurnPlayerId === state.playerId) {
        gameStatusText.classList.add('my-turn');
        if (state.palificoRound) {
            setStatus(state.lastBid
                ? 'Your turn (Palifico round): bid or call Dudo.'
                : 'Your turn (Palifico round): place the opening bid.');
            return;
        }

        setStatus(state.lastBid ? 'Your turn: bid, call Calza, or call Dudo.' : 'Your turn: place the opening bid.');
        return;
    }

    if (isSelfEliminated() && state.phase === 'bidding') {
        setStatus('👀 You are out this game and now spectating.');
        return;
    }

    const turnName = getPlayerNameById(state.currentTurnPlayerId);
    setStatusNodes(() => {
        const fragment = document.createDocumentFragment();
        fragment.append(
            document.createTextNode('🕒 '),
            createColoredPlayerNameNode(turnName),
            document.createTextNode("'s turn.")
        );
        return fragment;
    });
}

function maybeShowVictoryCelebration() {
    if (state.phase !== 'game_over' || !state.winnerPlayerId) {
        return;
    }

    if (state.winnerPlayerId === state.lastSeenWinnerPlayerId) {
        return;
    }

    state.lastSeenWinnerPlayerId = state.winnerPlayerId;
    const winnerName = getPlayerNameById(state.winnerPlayerId);

    if (!resolutionModal.classList.contains('hidden')) {
        state.pendingVictoryWinnerName = winnerName;
        return;
    }

    openVictoryModal(winnerName);
}

function maybePlayBidAcceptedCue() {
    const currentBidKey = state.lastBid
        ? `${state.lastBid.playerName}:${state.lastBid.quantity}:${state.lastBid.face}`
        : '';

    if (state.previousBidKey && state.previousBidKey !== currentBidKey) {
        playTone(520, 85, 0.016);
        setTimeout(() => playTone(680, 90, 0.012), 72);
    }

    state.previousBidKey = currentBidKey;
}

function applyStateUpdate(payload) {
    const previousRoundNumber = state.roundNumber;

    state.roomId = payload.roomId || state.roomId;
    state.phase = payload.phase || 'waiting';
    state.players = Array.isArray(payload.players) ? payload.players : [];
    state.currentTurnPlayerId = payload.currentTurnPlayerId || null;
    state.roundNumber = Number(payload.roundNumber) || 0;
    state.palificoRound = Boolean(payload.palificoRound);
    state.palificoFace = payload.palificoFace || null;
    state.lastBid = payload.lastBid || null;
    state.yourDice = Array.isArray(payload.yourDice) ? payload.yourDice : [];
    state.actionLog = mergeActionLog(state.actionLog, Array.isArray(payload.actionLog) ? payload.actionLog : []);
    state.lastResolution = payload.lastResolution || null;
    state.winnerPlayerId = payload.winnerPlayerId || null;

    if (state.phase !== 'game_over') {
        state.lastSeenWinnerPlayerId = null;
        state.pendingVictoryWinnerName = null;
        state.rematchRequested = false;
        closeVictoryModal();
    }

    if (state.roundNumber > 0 && state.roundNumber !== previousRoundNumber) {
        state.selectedBidQuantity = null;
        state.selectedBidFace = null;
    }

    roundNumberText.textContent = state.roundNumber > 0 ? String(state.roundNumber) : '-';
    palificoIndicatorText.textContent = state.palificoRound
        ? `Yes${state.palificoFace ? ` (face ${state.palificoFace})` : ''}`
        : 'No';
    renderLobbyCode();

    renderPlayers();
    renderDice();
    renderLastBid();
    renderActionLog();
    renderResolution();
    maybePlayBidAcceptedCue();

    const resolutionKey = getResolutionKey(state.lastResolution);
    if (resolutionKey && resolutionKey !== state.lastSeenResolutionKey) {
        state.lastSeenResolutionKey = resolutionKey;
        if (state.lastResolution.type === 'dudo') {
            playTone(205, 130, 0.02, 'sawtooth');
        }
        openDudoRevealModal(state.lastResolution);
    }

    updateActionAvailability();
    updateStatusFromState();
    maybeShowVictoryCelebration();
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
            state.rematchRequested = false;
            state.pendingVictoryWinnerName = null;
            showGameScreen();
            setLeaveState(true);
            applyStateUpdate(payload);
            maybeHideLoadingScreen();
            playTone(780, 90, 0.018);
            return;
        }

        if (payload.type === 'state') {
            applyStateUpdate(payload);
            return;
        }

        if (payload.type === 'error') {
            if (state.rematchRequested) {
                state.rematchRequested = false;
                rematchButton.disabled = false;
                rematchStatus.textContent = payload.message || 'Rematch request failed.';
            }
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
        state.selectedBidQuantity = null;
        state.selectedBidFace = null;
        state.lastSeenResolutionKey = null;
        state.lastSeenWinnerPlayerId = null;
        state.pendingVictoryWinnerName = null;
        state.rematchRequested = false;
        state.previousDiceKey = '';
        state.previousBidKey = '';
        state.playerColorByName = {};
        state.nextPlayerColorIndex = 0;
        state.socket = null;

        renderPlayers();
        renderDice();
        renderLastBid();
        renderActionLog();
        renderResolution();
        updateActionAvailability();
        renderLobbyCode();

        setJoinState(true);
        setLeaveState(false);
        showJoinScreen();
        setStatus('Disconnected. Join again.');
        closeResolutionModal();
        closeVictoryModal();
        closeConfirmModal();
    });

    socket.addEventListener('error', () => {
        setStatus('Connection failed.');
        setJoinState(true);
    });
}

function leaveMatch() {
    if (!state.socket) {
        showJoinScreen();
        setJoinState(true);
        setLeaveState(false);
        setStatus('Not connected.');
        return;
    }

    openConfirmModal('Leave this table? You can rejoin from the lobby screen.', () => {
        state.socket.close();
    });
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

    playTone(545, 80, 0.015);
}

function callDudo() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || dudoButton.disabled) {
        return;
    }

    state.socket.send(JSON.stringify({ type: 'dudo' }));
    playTone(260, 125, 0.02, 'sawtooth');
}

function callCalza() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || calzaButton.disabled) {
        return;
    }

    openConfirmModal('Call Calza? This is high-risk and resolves immediately.', () => {
        state.socket.send(JSON.stringify({ type: 'calza' }));
        playTone(410, 100, 0.017);
    });
}

function requestRematch() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || state.phase !== 'game_over') {
        return;
    }

    state.rematchRequested = true;
    rematchButton.disabled = true;
    sidebarRematchButton.disabled = true;
    rematchStatus.textContent = 'Rematch requested. Joining fresh table...';
    state.socket.send(JSON.stringify({ type: 'rematch' }));
    playTone(760, 90, 0.014, 'triangle');
}

joinButton.addEventListener('click', connectToMatch);
leaveButton.addEventListener('click', leaveMatch);
bidButton.addEventListener('click', placeBid);
calzaButton.addEventListener('click', callCalza);
dudoButton.addEventListener('click', callDudo);
rematchButton.addEventListener('click', requestRematch);
sidebarRematchButton.addEventListener('click', requestRematch);
modalCloseButton.addEventListener('click', closeResolutionModal);
modalOverlay.addEventListener('click', closeResolutionModal);
victoryCloseButton.addEventListener('click', closeVictoryModal);
victoryOverlay.addEventListener('click', closeVictoryModal);

settingsToggle.addEventListener('click', () => {
    const isOpen = settingsToggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
        closeSettingsModal();
    } else {
        openSettingsModal();
    }
    playTone(390, 70, 0.012);
});

settingsOverlay.addEventListener('click', closeSettingsModal);
settingsCloseButton.addEventListener('click', closeSettingsModal);
quantityOverflowOverlay.addEventListener('click', closeQuantityOverflowModal);
quantityOverflowCloseButton.addEventListener('click', closeQuantityOverflowModal);

soundToggle.addEventListener('change', () => {
    state.ui.soundEnabled = soundToggle.checked;
    if (state.ui.soundEnabled) {
        playTone(740, 90, 0.012);
    }
});

fontScaleSelect.addEventListener('change', () => {
    setFontScale(fontScaleSelect.value);
});

advancedToggle.addEventListener('change', () => {
    setShowAdvanced(advancedToggle.checked);
});

darkModeToggle.addEventListener('change', () => {
    setDarkMode(darkModeToggle.checked);
});

confirmCancelButton.addEventListener('click', closeConfirmModal);
confirmOverlay.addEventListener('click', closeConfirmModal);
confirmAcceptButton.addEventListener('click', () => {
    const action = state.pendingConfirmAction;
    closeConfirmModal();
    if (typeof action === 'function') {
        action();
    }
});

addTouchFeedback(joinButton);
addTouchFeedback(leaveButton);
addTouchFeedback(sidebarRematchButton);
addTouchFeedback(bidButton);
addTouchFeedback(calzaButton);
addTouchFeedback(dudoButton);
addTouchFeedback(rematchButton);
addTouchFeedback(settingsToggle);
addTouchFeedback(confirmAcceptButton);

window.addEventListener('load', maybeHideLoadingScreen);

setFontScale(fontScaleSelect.value);
setShowAdvanced(advancedToggle.checked);
setDarkMode(darkModeToggle.checked);
setLeaveState(false);
updateActionAvailability();
renderLobbyCode();
showJoinScreen();
setStatus('Not connected.');
