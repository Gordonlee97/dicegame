const diceContainer = document.getElementById('dice-container');
const bidButton = document.getElementById('bid-button');
const calzaButton = document.getElementById('calza-button');
const dudoButton = document.getElementById('dudo-button');
const joinButton = document.getElementById('join-button');
const leaveButton = document.getElementById('leave-button');
const endGameButton = document.getElementById('end-game-button');
const startGameButton = document.getElementById('start-game-button');
const authModeGuestButton = document.getElementById('auth-mode-guest');
const authModeAccountButton = document.getElementById('auth-mode-account');
const guestForm = document.getElementById('guest-form');
const accountForm = document.getElementById('account-form');
const accountActionLoginButton = document.getElementById('account-action-login');
const accountActionRegisterButton = document.getElementById('account-action-register');
const quantityButtons = document.getElementById('quantity-buttons');
const faceButtons = document.getElementById('face-buttons');
const playerNameInput = document.getElementById('player-name');
const guestNameLabel = document.getElementById('guest-name-label');
const accountUsernameLabel = document.getElementById('account-username-label');
const accountPasswordLabel = document.getElementById('account-password-label');
const accountDisplayNameLabel = document.getElementById('account-display-name-label');
const accountUsernameInput = document.getElementById('account-username');
const accountPasswordInput = document.getElementById('account-password');
const accountPasswordToggleButton = document.getElementById('account-password-toggle');
const accountDisplayNameInput = document.getElementById('account-display-name');
const roomIdInput = document.getElementById('room-id');
const roomIdAccountInput = document.getElementById('room-id-account');
const accountSubmitButton = document.getElementById('account-submit-button');
const playersList = document.getElementById('players-list');
const joinStatusText = document.getElementById('status');
const gameStatusText = document.getElementById('status-game');
const waitingStartNotice = document.getElementById('waiting-start-notice');
const joinScreen = document.getElementById('join-screen');
const gameScreen = document.getElementById('game-screen');
const lastBidText = document.getElementById('last-bid');
const roundNumberText = document.getElementById('round-number');
const palificoIndicatorText = document.getElementById('palifico-indicator');
const lobbyCodeText = document.getElementById('lobby-code');
const lobbyCodeMobileText = document.getElementById('lobby-code-mobile');
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
const roundCard = document.querySelector('.round-card');
const settingsToggle = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const settingsOverlay = document.getElementById('settings-modal-overlay');
const settingsCloseButton = document.getElementById('settings-close-button');
const settingsPanel = document.getElementById('settings-panel');
const soundToggle = document.getElementById('sound-toggle');
const advancedToggle = document.getElementById('advanced-toggle');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const profanityToggle = document.getElementById('profanity-toggle');
const turnTimerToggle = document.getElementById('turn-timer-toggle');
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
const actionConsolePanel = document.getElementById('mobile-action-console');
const gamePanel = document.querySelector('.game-panel');
const logSidebar = document.querySelector('.log-sidebar');
const eventToastLayer = document.getElementById('event-toast-layer');
const chatToggleButton = document.getElementById('chat-toggle-button');
const chatUnreadBadge = document.getElementById('chat-unread-badge');
const roomChat = document.getElementById('room-chat');
const chatPanel = document.getElementById('chat-panel');
const chatCloseButton = document.getElementById('chat-close-button');
const chatMessagesList = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const mobilePlay = document.getElementById('mobile-play');
const playToggleButton = document.getElementById('play-toggle-button');
const playConsoleOverlay = document.getElementById('play-console-overlay');

const state = {
    socket: null,
    playerId: null,
    roomId: null,
    authToken: null,
    reconnectToken: null,
    authMode: 'guest',
    accountAction: 'login',
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
    previousTurnPlayerId: null,
    pendingConfirmAction: null,
    lastSeenWinnerPlayerId: null,
    pendingVictoryWinner: null,
    pendingRoundToastMessage: null,
    pendingYourTurnToast: false,
    deferDiceRollUntilResolutionClose: false,
    pendingYourDice: null,
    rematchRequested: false,
    chatMessages: [],
    chatUnreadCount: 0,
    chatOpen: false,
    playerColorByKey: {},
    turnTimerKey: '',
    turnTimerStartedAt: 0,
    turnTimerHasAlerted: false,
    ui: {
        soundEnabled: true,
        showAdvanced: false,
        darkMode: false,
        filterProfanities: false,
        turnTimerEnabled: false
    }
};

const playerNameColorPalette = ['#4da3ff', '#e11d48', '#16a34a', '#a855f7', '#ea580c', '#a16207'];
const maxActionLogEntries = 120;
const maxChatMessages = 150;
const turnTimerDurationMs = 30000;
const turnTimerTickMs = 120;
const reconnectTokenStorageKeyPrefix = 'perudo.reconnect.';
const profanityTerms = [
    'ass',
    'asshole',
    'bastard',
    'bitch',
    'bullshit',
    'crap',
    'cunt',
    'damn',
    'dick',
    'douche',
    'freak',
    'fuck',
    'fucker',
    'fucking',
    'idiot',
    'imbecile',
    'jackass',
    'jerk',
    'loser',
    'moron',
    'motherfucker',
    'piss',
    'prick',
    'retard',
    'shit',
    'stupid',
    'suck',
    'twat',
    'wanker',
    'whore'
];
const profanityPattern = new RegExp(`\\b(${profanityTerms.map(escapeRegExp).join('|')})\\b`, 'gi');

const pipPositionsByValue = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
};

let audioContext;
let diceRollAudio;
let layoutSyncFrame = 0;
let mobileActionConsoleOpen = false;
let turnReminderPulseTimeout = 0;

function isMobileViewport() {
    return window.matchMedia('(max-width: 840px)').matches;
}

function setMobileActionConsoleOpen(open) {
    if (!actionConsolePanel || !playToggleButton || !playConsoleOverlay) {
        return;
    }

    const allowMobileConsole = isMobileViewport() && !gameScreen.classList.contains('hidden');
    mobileActionConsoleOpen = Boolean(open) && allowMobileConsole;

    actionConsolePanel.classList.toggle('mobile-console-active', mobileActionConsoleOpen);
    playConsoleOverlay.classList.toggle('hidden', !mobileActionConsoleOpen);
    playToggleButton.classList.toggle('hidden', mobileActionConsoleOpen);
    playToggleButton.setAttribute('aria-expanded', mobileActionConsoleOpen ? 'true' : 'false');
}

function updateMobilePlayVisibility() {
    if (!mobilePlay || !playToggleButton) {
        return;
    }

    const shouldShowToggle = state.isConnected && !gameScreen.classList.contains('hidden') && isMobileViewport() && !state.chatOpen;
    mobilePlay.classList.toggle('hidden', !shouldShowToggle);

    if (!shouldShowToggle) {
        setMobileActionConsoleOpen(false);
        return;
    }

    playToggleButton.disabled = false;
}

function syncDesktopSidebarHeight() {
    if (!gamePanel || !logSidebar) {
        return;
    }

    if (!window.matchMedia('(min-width: 1161px)').matches) {
        logSidebar.style.height = '';
        return;
    }

    const panelHeight = Math.ceil(gamePanel.getBoundingClientRect().height);
    if (panelHeight > 0) {
        logSidebar.style.height = `${panelHeight}px`;
    }
}

function scheduleDesktopSidebarHeightSync() {
    if (layoutSyncFrame) {
        cancelAnimationFrame(layoutSyncFrame);
    }

    layoutSyncFrame = requestAnimationFrame(() => {
        layoutSyncFrame = 0;
        syncDesktopSidebarHeight();
        updateMobilePlayVisibility();
    });
}

function maybeHideLoadingScreen() {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 400);
}

function setShowAdvanced(enabled) {
    state.ui.showAdvanced = Boolean(enabled);
    const showValue = state.ui.showAdvanced ? '' : 'none';

    resolutionPanel.style.display = showValue;
    logSidebar.style.display = '';
    rulesPanel.open = false;
    scheduleDesktopSidebarHeightSync();
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

function censorProfanities(message) {
    const normalized = String(message || '');
    if (!state.ui.filterProfanities || !normalized) {
        return normalized;
    }

    return normalized.replace(profanityPattern, (match) => {
        if (match.length <= 2) {
            return '*'.repeat(match.length);
        }
        return `${match[0]}${'*'.repeat(Math.max(1, match.length - 2))}${match[match.length - 1]}`;
    });
}

function setPasswordVisibility(visible) {
    const showPlainText = Boolean(visible);
    accountPasswordInput.type = showPlainText ? 'text' : 'password';

    if (!accountPasswordToggleButton) {
        return;
    }

    accountPasswordToggleButton.classList.toggle('is-visible', showPlainText);
    accountPasswordToggleButton.setAttribute('aria-pressed', showPlainText ? 'true' : 'false');
    accountPasswordToggleButton.setAttribute('aria-label', showPlainText ? 'Hide password' : 'Show password');
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
    playTone(180, 90, 0.22, 'square');
    setTimeout(() => playTone(235, 70, 0.21, 'square'), 24);
    setTimeout(() => playTone(290, 85, 0.19, 'square'), 50);
    setTimeout(() => playTone(360, 95, 0.17, 'triangle'), 88);
    setTimeout(() => playTone(430, 72, 0.14, 'triangle'), 126);
    setTimeout(() => playTone(250, 82, 0.15, 'sawtooth'), 162);
}

function playDiceRollCue() {
    if (!state.ui.soundEnabled) {
        return;
    }

    if (!diceRollAudio) {
        diceRollAudio = new Audio('extras/Sound Effects/dice roll sound.wav');
        diceRollAudio.preload = 'auto';
        diceRollAudio.volume = 0.28;
    }

    try {
        diceRollAudio.currentTime = 0;
        const playPromise = diceRollAudio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                playRattleCue();
            });
        }
    } catch {
        playRattleCue();
    }
}

function animateDieRollPhysics(die, options = {}) {
    const durationMs = Number(options.durationMs) || 860;
    const delayMs = Number(options.delayMs) || 0;
    const clusterX = Number(options.clusterX) || 0;
    const clusterY = Number(options.clusterY) || 0;
    const lift = Number(options.lift) || 10;
    const spinStartDeg = Number(options.spinStartDeg) || -220;
    const throwDistancePx = Number(options.throwDistancePx) || 170;
    const bounceStart = Number(options.bounceStart) || 0.68;
    const bounceAmplitude = Number(options.bounceAmplitude) || 7.4;
    const bounceDamping = Number(options.bounceDamping) || 6.4;
    const bounceFrequency = Number(options.bounceFrequency) || 4.1;
    const settleStart = Number(options.settleStart) || 0.71;
    const wobbleAmplitudeX = Number(options.wobbleAmplitudeX) || 2.2;
    const wobbleAmplitudeRot = Number(options.wobbleAmplitudeRot) || 6.3;
    const wobbleCycles = Number(options.wobbleCycles) || 7.5;
    const wobbleDecayRate = Number(options.wobbleDecayRate) || 6.1;
    const rollBiasDeg = Number(options.rollBiasDeg) || 0;
    const arcSkew = Number(options.arcSkew) || 0;

    const startX = -throwDistancePx + clusterX;
    const startY = -8 + clusterY;

    const existingAnimationId = Number(die.dataset.rollRafId || 0);
    if (existingAnimationId) {
        cancelAnimationFrame(existingAnimationId);
    }

    const startAt = performance.now() + delayMs;
    die.classList.add('rolling');

    const animate = now => {
        if (now < startAt) {
            const waitId = requestAnimationFrame(animate);
            die.dataset.rollRafId = String(waitId);
            return;
        }

        const elapsed = now - startAt;
        const t = Math.min(1, elapsed / durationMs);
        const travelProgress = 1 - Math.pow(1 - t, 3.35);

        let x = startX * (1 - travelProgress) + arcSkew * (travelProgress * (1 - travelProgress));
        const arcY = -4 * lift * travelProgress * (1 - travelProgress);
        const yBase = startY * (1 - travelProgress) + arcY;

        let bounceY = 0;
        if (t >= bounceStart) {
            const u = (t - bounceStart) / (1 - bounceStart);
            const impactLift = 1 + 0.26 * Math.sin(Math.min(1, u) * Math.PI);
            bounceY = bounceAmplitude * impactLift * Math.exp(-bounceDamping * u) * Math.sin(u * bounceFrequency * Math.PI);
        }

        let wobbleX = 0;
        let wobbleRot = 0;
        if (t >= settleStart) {
            const settleProgress = (t - settleStart) / (1 - settleStart);
            const wobbleDecay = Math.exp(-wobbleDecayRate * settleProgress);
            const wobbleWave = Math.sin(settleProgress * Math.PI * wobbleCycles);
            wobbleX = wobbleAmplitudeX * wobbleDecay * wobbleWave;
            wobbleRot = wobbleAmplitudeRot * wobbleDecay * Math.sin(settleProgress * Math.PI * (wobbleCycles - 0.4) + Math.PI / 5);
        }

        x += wobbleX;

        const y = yBase + bounceY;
        const rotation = (spinStartDeg * Math.pow(1 - travelProgress, 1.08)) + wobbleRot + (rollBiasDeg * travelProgress);
        const scale = 0.9 + (0.1 * t) + (0.012 * Math.exp(-8 * t) * Math.sin(t * Math.PI * 6));

        die.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;

        if (t < 1) {
            const frameId = requestAnimationFrame(animate);
            die.dataset.rollRafId = String(frameId);
            return;
        }

        die.classList.remove('rolling');
        die.style.transform = '';
        delete die.dataset.rollRafId;
    };

    const initialId = requestAnimationFrame(animate);
    die.dataset.rollRafId = String(initialId);
}

function triggerDiceRollAnimation() {
    const dice = diceContainer
        ? Array.from(diceContainer.querySelectorAll('.die'))
        : Array.from(playersList.querySelectorAll('.player-self-card .player-card-die'));
    if (dice.length === 0) {
        return;
    }

    for (let index = 0; index < dice.length; index += 1) {
        const die = dice[index];
        const centeredIndex = index - (dice.length - 1) / 2;
        const variation = Math.random();
        const variationAlt = Math.random();
        const throwDelayMs = index * 18;
        const throwLiftPx = 8.2 + Math.max(0, 2 - Math.abs(centeredIndex)) * 4 + variation * 1.4;
        const throwClusterXPx = centeredIndex * 5.3;
        const throwClusterYPx = -Math.abs(centeredIndex) * 0.65;
        const throwSpinStartDeg = -260 - index * 20 - variation * 90;
        const throwDistancePx = 228 + variationAlt * 20;
        const throwDurationMs = 805 + variationAlt * 115;
        const throwBounceAmplitude = 7.2 + variation * 2.3;
        const throwBounceFrequency = 4 + variationAlt * 0.95;
        const throwWobbleX = 1.95 + variationAlt * 1.05;
        const throwWobbleRot = 5.9 + variation * 2.7;
        const throwWobbleCycles = 7.2 + variationAlt * 1.8;
        const throwRollBias = (variation - 0.5) * 16;
        const throwArcSkew = (variationAlt - 0.5) * 9;

        animateDieRollPhysics(die, {
            durationMs: throwDurationMs,
            delayMs: throwDelayMs,
            lift: throwLiftPx,
            clusterX: throwClusterXPx,
            clusterY: throwClusterYPx,
            spinStartDeg: throwSpinStartDeg,
            throwDistancePx,
            bounceStart: 0.67 + variationAlt * 0.05,
            bounceAmplitude: throwBounceAmplitude,
            bounceDamping: 5.8 + variationAlt * 1.2,
            bounceFrequency: throwBounceFrequency,
            settleStart: 0.69 + variation * 0.05,
            wobbleAmplitudeX: throwWobbleX,
            wobbleAmplitudeRot: throwWobbleRot,
            wobbleCycles: throwWobbleCycles,
            wobbleDecayRate: 5.4 + variation * 1.3,
            rollBiasDeg: throwRollBias,
            arcSkew: throwArcSkew
        });
    }
    playDiceRollCue();

    for (const die of dice) {
        if (die.dataset.value === '1') {
            die.classList.add('paco-glow');
            setTimeout(() => die.classList.remove('paco-glow'), 2300);
        }
    }
}

function playTurnAlertCue() {
    playTone(620, 110, 0.14, 'triangle');
    setTimeout(() => playTone(880, 130, 0.12, 'triangle'), 72);
    setTimeout(() => playTone(1040, 160, 0.10, 'sine'), 150);
}

function playTurnTimeoutCue() {
    playTone(360, 140, 0.21, 'square');
    setTimeout(() => playTone(300, 160, 0.21, 'square'), 140);
    setTimeout(() => playTone(420, 180, 0.18, 'triangle'), 300);
}

function getCurrentTurnTimerKey() {
    if (state.phase !== 'bidding' || !state.currentTurnPlayerId) {
        return '';
    }

    return `${state.roundNumber}:${state.currentTurnPlayerId}`;
}

function syncTurnTimerState() {
    const nextKey = getCurrentTurnTimerKey();
    if (nextKey === state.turnTimerKey) {
        return;
    }

    state.turnTimerKey = nextKey;
    state.turnTimerStartedAt = nextKey ? Date.now() : 0;
    state.turnTimerHasAlerted = false;
}

function updatePlayerTurnTimer() {
    if (!state.ui.turnTimerEnabled) {
        return;
    }

    const activeTimer = playersList ? playersList.querySelector('.player-turn-timer.active') : null;
    if (!activeTimer || !state.turnTimerStartedAt) {
        return;
    }

    const elapsedMs = Math.max(0, Date.now() - state.turnTimerStartedAt);
    const clampedElapsedMs = Math.min(turnTimerDurationMs, elapsedMs);
    const angle = (clampedElapsedMs / turnTimerDurationMs) * 360;
    activeTimer.style.setProperty('--timer-angle', `${angle}deg`);

    if (elapsedMs >= turnTimerDurationMs && !state.turnTimerHasAlerted) {
        state.turnTimerHasAlerted = true;
        playTurnTimeoutCue();
    }
}

function playDudoSuccessCue() {
    playTone(640, 90, 0.13, 'triangle');
    setTimeout(() => playTone(860, 100, 0.12, 'triangle'), 68);
    setTimeout(() => playTone(1080, 130, 0.11, 'sine'), 138);
    setTimeout(() => playTone(1320, 160, 0.09, 'sine'), 220);
}

function playDudoFailCue() {
    playTone(250, 120, 0.13, 'triangle');
    setTimeout(() => playTone(210, 140, 0.11, 'triangle'), 88);
    setTimeout(() => playTone(175, 160, 0.09, 'triangle'), 170);
}

function playChatUnreadCue() {
    playTone(930, 55, 0.14, 'triangle');
    setTimeout(() => playTone(1140, 75, 0.11, 'sine'), 62);
}

const toastQueue = [];
const maxVisibleToasts = 3;
const toastIcons = { round: '🎲', turn: '▶', timer: '⏱', dudo: '⚡', chat: '💬' };

function flushToastQueue() {
    if (!eventToastLayer) { return; }
    while (toastQueue.length > 0 && eventToastLayer.childElementCount < maxVisibleToasts) {
        const { message, variant, holdMs, exitMs, exitAsAside } = toastQueue.shift();
        renderToast(message, variant, holdMs, exitMs, exitAsAside);
    }
}

function renderToast(message, variant, holdMs, exitMs, exitAsAside) {
    const icon = toastIcons[variant] || '';
    const toast = document.createElement('div');
    toast.className = `event-toast ${variant}`;
    toast.textContent = icon ? `${icon} ${message}` : message;
    eventToastLayer.appendChild(toast);

    const removeClass = exitAsAside ? 'slide-aside' : 'fade-out';
    setTimeout(() => {
        toast.classList.add(removeClass);
        setTimeout(() => {
            toast.parentNode?.removeChild(toast);
            flushToastQueue();
        }, exitMs);
    }, holdMs);
}

function showEventToast(message, variant = 'round', options = {}) {
    if (!eventToastLayer) { return; }
    const holdMs = Number.isFinite(options.holdMs) ? options.holdMs : 1700;
    const exitMs = Number.isFinite(options.exitMs) ? options.exitMs : 620;
    const exitAsAside = Boolean(options.exitAsAside);

    if (eventToastLayer.childElementCount < maxVisibleToasts) {
        renderToast(message, variant, holdMs, exitMs, exitAsAside);
    } else {
        toastQueue.push({ message, variant, holdMs, exitMs, exitAsAside });
    }
}

function getCurrentTurnPlayerName() {
    return getPlayerNameById(state.currentTurnPlayerId);
}

function maybeAnimateRoundStart(previousRoundNumber) {
    const roundStarted = state.phase === 'bidding' && state.roundNumber > 0 && state.roundNumber !== previousRoundNumber;
    if (!roundStarted) {
        return;
    }

    const starterName = getCurrentTurnPlayerName();
    const toastMessage = `Round ${state.roundNumber} starts - ${starterName} opens!`;

    if (!resolutionModal.classList.contains('hidden')) {
        state.pendingRoundToastMessage = toastMessage;
        return;
    }

    showEventToast(toastMessage, 'round', { holdMs: 2600, exitMs: 700 });
}

function maybeAnimateYourTurn(previousTurnPlayerId, previousRoundNumber) {
    const becameMyTurn =
        state.phase === 'bidding'
        && state.currentTurnPlayerId === state.playerId
        && previousTurnPlayerId !== state.playerId
        && !isSelfEliminated();

    if (!becameMyTurn) {
        if (state.currentTurnPlayerId !== state.playerId) {
            state.pendingYourTurnToast = false;
        }
        return;
    }

    const roundTransitionTurnChange = state.roundNumber !== previousRoundNumber;

    if (roundTransitionTurnChange) {
        state.pendingYourTurnToast = true;
        return;
    }

    if (!resolutionModal.classList.contains('hidden') || state.deferDiceRollUntilResolutionClose) {
        state.pendingYourTurnToast = true;
        return;
    }

    showEventToast('Your turn!', 'turn', { holdMs: 2400, exitMs: 700 });
    playTurnAlertCue();
    triggerTurnReminderPulse();
}

function triggerTurnReminderPulse() {
    const targets = [actionConsolePanel, playToggleButton];

    for (const target of targets) {
        if (!target) {
            continue;
        }

        target.classList.remove('turn-reminder-pulse');
        void target.offsetWidth;
        target.classList.add('turn-reminder-pulse');
    }

    if (turnReminderPulseTimeout) {
        clearTimeout(turnReminderPulseTimeout);
    }

    turnReminderPulseTimeout = setTimeout(() => {
        for (const target of targets) {
            if (target) {
                target.classList.remove('turn-reminder-pulse');
            }
        }
        turnReminderPulseTimeout = 0;
    }, 2500);
}

function maybeAnimateDudoCall(resolution) {
    if (!resolution || resolution.type === 'calza') {
        return false;
    }

    const doubterName = resolution.doubterName || 'A player';
    showEventToast(`${doubterName} calls Dudo!`, 'dudo', { holdMs: 2500, exitAsAside: true, exitMs: 760 });
    openDudoRevealModal(resolution);
    return true;
}

function setJoinState(enabled) {
    joinButton.disabled = !enabled;
    playerNameInput.disabled = !enabled;
    authModeGuestButton.disabled = !enabled;
    authModeAccountButton.disabled = !enabled;
    accountActionLoginButton.disabled = !enabled;
    accountActionRegisterButton.disabled = !enabled;
    accountUsernameInput.disabled = !enabled;
    accountPasswordInput.disabled = !enabled;
    if (accountPasswordToggleButton) {
        accountPasswordToggleButton.disabled = !enabled;
    }
    accountDisplayNameInput.disabled = !enabled;
    accountSubmitButton.disabled = !enabled;
    roomIdInput.disabled = !enabled;
    roomIdAccountInput.disabled = !enabled;
}

function getApiBaseUrl() {
    const appConfig = window.APP_CONFIG || {};
    const configuredApiBaseUrl = typeof appConfig.API_BASE_URL === 'string' ? appConfig.API_BASE_URL.trim() : '';
    if (configuredApiBaseUrl) {
        return configuredApiBaseUrl.replace(/\/$/, '');
    }

    return `${window.location.protocol}//${window.location.host}`;
}

function getReconnectStorageKey(roomId) {
    const normalizedRoomId = String(roomId || '').trim().toLowerCase();
    return `${reconnectTokenStorageKeyPrefix}${normalizedRoomId}`;
}

function getStoredReconnectToken(roomId) {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) {
        return '';
    }

    try {
        return String(window.localStorage.getItem(getReconnectStorageKey(normalizedRoomId)) || '').trim();
    } catch {
        return '';
    }
}

function storeReconnectToken(roomId, token) {
    const normalizedRoomId = String(roomId || '').trim();
    const normalizedToken = String(token || '').trim();
    if (!normalizedRoomId || !normalizedToken) {
        return;
    }

    try {
        window.localStorage.setItem(getReconnectStorageKey(normalizedRoomId), normalizedToken);
    } catch {
        // ignore storage failures
    }
}

function clearStoredReconnectToken(roomId) {
    const normalizedRoomId = String(roomId || '').trim();
    if (!normalizedRoomId) {
        return;
    }

    try {
        window.localStorage.removeItem(getReconnectStorageKey(normalizedRoomId));
    } catch {
        // ignore storage failures
    }
}

function setAuthMode(nextMode) {
    state.authMode = nextMode === 'account' ? 'account' : 'guest';
    const isAccountMode = state.authMode === 'account';

    authModeGuestButton.classList.toggle('selected', !isAccountMode);
    authModeAccountButton.classList.toggle('selected', isAccountMode);
    guestForm.classList.toggle('hidden', isAccountMode);
    accountForm.classList.toggle('hidden', !isAccountMode);
}

function setAccountAction(nextAction) {
    state.accountAction = nextAction === 'register' ? 'register' : 'login';
    const isRegister = state.accountAction === 'register';

    accountActionLoginButton.classList.toggle('selected', !isRegister);
    accountActionRegisterButton.classList.toggle('selected', isRegister);
    accountDisplayNameInput.classList.toggle('hidden', !isRegister);
    accountDisplayNameLabel.classList.toggle('hidden', !isRegister);
    accountPasswordInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
    accountSubmitButton.textContent = isRegister ? 'Create Account & Join' : 'Sign In & Join';
}

async function loginWithAccountCredentials() {
    const username = accountUsernameInput.value.trim();
    const password = accountPasswordInput.value;

    if (!username || !password) {
        throw new Error('Username and password are required for account sign-in.');
    }

    const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new Error('Unable to sign in right now.');
    }

    if (!response.ok || !payload.ok || !payload.token) {
        throw new Error(payload.message || 'Sign-in failed.');
    }

    return payload;
}

async function registerWithAccountCredentials() {
    const username = accountUsernameInput.value.trim();
    const password = accountPasswordInput.value;
    const displayName = accountDisplayNameInput.value.trim();

    if (!username || !password) {
        throw new Error('Username and password are required for account creation.');
    }

    const response = await fetch(`${getApiBaseUrl()}/api/auth/register-public`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, displayName })
    });

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new Error('Unable to create account right now.');
    }

    if (!response.ok || !payload.ok || !payload.token) {
        throw new Error(payload.message || 'Account creation failed.');
    }

    return payload;
}

function setLeaveState(enabled) {
    leaveButton.disabled = !enabled;
}

function showJoinScreen() {
    joinScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    setMobileActionConsoleOpen(false);
    updateMobilePlayVisibility();
}

function showGameScreen() {
    joinScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    updateMobilePlayVisibility();
}

function setStatus(message) {
    joinStatusText.textContent = message;
    gameStatusText.textContent = message;
}

function setStatusNodes(builder) {
    joinStatusText.replaceChildren(builder());
    gameStatusText.replaceChildren(builder());
}

function updateWaitingStartNotice() {
    if (!waitingStartNotice) {
        return;
    }

    waitingStartNotice.classList.add('hidden');
}

function attachCopyButton(spanEl, getCode) {
    const parent = spanEl.parentElement;
    if (!parent || parent.querySelector('.room-code-copy-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'room-code-copy-btn';
    btn.setAttribute('aria-label', 'Copy room code');
    btn.textContent = '⎘';
    btn.addEventListener('click', () => {
        const code = getCode();
        if (!code || code === '-') return;
        navigator.clipboard.writeText(code).then(() => {
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = '⎘'; }, 1500);
        }).catch(() => {});
    });
    parent.appendChild(btn);
}

function renderLobbyCode() {
    const code = state.roomId || '-';
    if (lobbyCodeText) {
        lobbyCodeText.textContent = code;
        attachCopyButton(lobbyCodeText, () => state.roomId || '');
    }
    if (lobbyCodeMobileText) {
        lobbyCodeMobileText.textContent = code;
        attachCopyButton(lobbyCodeMobileText, () => state.roomId || '');
    }
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

function isPlayerSpectator(player) {
    return Boolean(player && player.isSpectator);
}

function getSelfPlayer() {
    return state.players.find(player => player.id === state.playerId) || null;
}

function getActivePlayers() {
    return state.players.filter(player => !isPlayerSpectator(player) && Number(player.diceCount || 0) > 0);
}

function isSelfEliminated() {
    const self = getSelfPlayer();
    return Boolean(self) && !isPlayerSpectator(self) && Number(self.diceCount || 0) <= 0;
}

function isSelfSpectator() {
    return isPlayerSpectator(getSelfPlayer());
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

function haptic(type) {
    if (!navigator.vibrate) return;
    switch (type) {
        case 'selection': navigator.vibrate(8); break;
        case 'action':    navigator.vibrate(20); break;
        case 'critical':  navigator.vibrate([35, 25, 35]); break;
        case 'open':      navigator.vibrate(6); break;
    }
}

function createSelfCardDieNode(value, index, tintColor = '') {
    const die = document.createElement('div');
    die.className = 'die player-card-die';
    die.setAttribute('aria-label', `Your die ${index + 1}`);
    if (tintColor) {
        const tintAlpha = state.ui.darkMode ? 0.52 : 0.2;
        const borderAlpha = state.ui.darkMode ? 0.72 : 0.42;
        die.style.setProperty('--player-die-tint', toTranslucentColor(tintColor, tintAlpha));
        die.style.setProperty('--player-die-border', toTranslucentColor(tintColor, borderAlpha));
    }
    renderDie(die, value);
    return die;
}

function toTranslucentColor(colorValue, alpha = 0.18) {
    const normalized = String(colorValue || '').trim();
    const clampedAlpha = Math.max(0, Math.min(1, Number(alpha) || 0.18));

    if (/^#([a-f0-9]{3}){1,2}$/i.test(normalized)) {
        const hex = normalized.slice(1);
        const expanded = hex.length === 3 ? hex.split('').map(char => char + char).join('') : hex;
        const red = parseInt(expanded.slice(0, 2), 16);
        const green = parseInt(expanded.slice(2, 4), 16);
        const blue = parseInt(expanded.slice(4, 6), 16);
        return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
    }

    const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgbMatch) {
        const red = Number(rgbMatch[1]);
        const green = Number(rgbMatch[2]);
        const blue = Number(rgbMatch[3]);
        return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
    }

    return `rgba(142, 168, 202, ${clampedAlpha})`;
}

function createOpponentDiePlaceholder(borderColor) {
    const placeholder = document.createElement('span');
    placeholder.className = 'player-die-placeholder';
    if (borderColor) {
        const borderAlpha = state.ui.darkMode ? 0.62 : 0.5;
        const tintAlpha = state.ui.darkMode ? 0.44 : 0.26;
        placeholder.style.setProperty('--opponent-die-border', toTranslucentColor(borderColor, borderAlpha));
        placeholder.style.setProperty('--opponent-die-tint', toTranslucentColor(borderColor, tintAlpha));
    }
    return placeholder;
}

function renderPlayers() {
    playersList.replaceChildren();
    refreshPlayerColorAssignments();
    playersList.style.gridTemplateRows = isMobileViewport() ? '' : 'repeat(6, minmax(0, 1fr))';
    const shouldShowDiceInCards = !(state.phase === 'waiting' && state.roundNumber === 0);

    for (const player of state.players) {
        const item = document.createElement('li');
        const isSelf = player.id === state.playerId;
        const isTurn = player.id === state.currentTurnPlayerId;
        const isSpectator = isPlayerSpectator(player);
        const isEliminated = !isSpectator && Number(player.diceCount || 0) <= 0;
        const playerColor = getPlayerColor(player.name, player.id);

        if (isTurn) {
            item.classList.add('turn');
            if (playerColor) {
                item.style.setProperty('--turn-accent', playerColor);
                item.style.setProperty('--turn-bg', toTranslucentColor(playerColor, 0.05));
            }
        }

        if (isSelf) {
            item.classList.add('player-self-card');
        } else {
            item.classList.add('player-opponent-card');
        }

        if (isEliminated) {
            item.classList.add('eliminated');
        }

        const name = document.createElement('span');
        name.className = 'player-main';
        name.append(createColoredPlayerNameNode(player.name, player.id));
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
        } else if (isSpectator) {
            const spectatorTag = document.createElement('span');
            spectatorTag.className = 'player-eliminated-tag';
            spectatorTag.textContent = '(spectating)';
            name.appendChild(spectatorTag);
        }

        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';

        playerInfo.append(name);

        if (shouldShowDiceInCards) {
            let diceDisplay;
            if (isSelf) {
                diceDisplay = document.createElement('div');
                diceDisplay.className = 'player-dice-live';
                const selfColor = playerColor;
                const visibleSelfDice = Array.isArray(state.pendingYourDice)
                    ? state.pendingYourDice
                    : state.yourDice;

                if (Array.isArray(visibleSelfDice) && visibleSelfDice.length > 0) {
                    for (let index = 0; index < visibleSelfDice.length; index += 1) {
                        diceDisplay.appendChild(createSelfCardDieNode(visibleSelfDice[index], index, selfColor));
                    }
                }
            } else {
                diceDisplay = document.createElement('div');
                diceDisplay.className = 'player-dice-placeholders';
                const iconCount = Math.max(0, Math.min(5, Number(player.diceCount) || 0));
                const nameColor = playerColor;

                if (iconCount > 0) {
                    for (let index = 0; index < iconCount; index += 1) {
                        diceDisplay.appendChild(createOpponentDiePlaceholder(nameColor));
                    }
                }
            }

            if (diceDisplay && diceDisplay.childElementCount > 0) {
                const diceRow = document.createElement('div');
                diceRow.className = 'player-dice-row';

                diceRow.appendChild(diceDisplay);

                const timer = document.createElement('span');
                timer.className = 'player-turn-timer';
                const isTurnTimerActive = state.ui.turnTimerEnabled && isTurn && state.phase === 'bidding' && !isEliminated && !isSpectator;
                timer.classList.toggle('active', isTurnTimerActive);
                if (playerColor) {
                    timer.style.setProperty('--timer-elapsed', toTranslucentColor(playerColor, 0.9));
                    timer.style.setProperty('--timer-remaining', toTranslucentColor(playerColor, 0.45));
                    timer.style.setProperty('--timer-border', toTranslucentColor(playerColor, 0.6));
                }

                diceRow.appendChild(timer);
                playerInfo.appendChild(diceRow);
            }
        }

        item.append(playerInfo);
        playersList.appendChild(item);
    }
}

function renderDice() {
    if (diceContainer) {
        diceContainer.replaceChildren();

        for (let index = 0; index < state.yourDice.length; index += 1) {
            const die = document.createElement('div');
            die.className = 'die die-enter';
            die.setAttribute('aria-label', `Die ${index + 1}`);
            renderDie(die, state.yourDice[index]);

            addTouchFeedback(die);
            diceContainer.appendChild(die);
            setTimeout(() => {
                die.classList.remove('die-enter');
            }, 260);
        }
    }

    const nextDiceKey = JSON.stringify(state.yourDice);
    const didRollChange = state.previousDiceKey && state.previousDiceKey !== nextDiceKey;
    if (didRollChange) {
        const shouldDeferRollAnimation = state.deferDiceRollUntilResolutionClose || !resolutionModal.classList.contains('hidden');
        if (!shouldDeferRollAnimation) {
            triggerDiceRollAnimation();
        }
    }
    state.previousDiceKey = nextDiceKey;
}

function renderLastBid() {
    if (!state.lastBid) {
        lastBidText.textContent = 'No active bid';
        return;
    }

    lastBidText.replaceChildren(
        createColoredPlayerNameNode(state.lastBid.playerName, state.lastBid.playerId || ''),
        document.createTextNode(' : '),
        createInlineBidValue(state.lastBid.quantity, state.lastBid.face, true)
    );
}

function createInlineBidValue(quantity, face, includePacosLabel = false) {
    const wrap = document.createElement('span');
    wrap.className = 'inline-bid';

    const quantityText = document.createElement('span');
    quantityText.className = 'inline-bid-qty';
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

function createNumericEmphasisNode(value) {
    const strong = document.createElement('strong');
    strong.className = 'numeric-emphasis';
    strong.textContent = String(value);
    return strong;
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

function normalizePlayerName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim() || 'Unknown';
}

function getPlayerColorKey(name, playerId = '') {
    const normalizedId = String(playerId || '').trim();
    if (normalizedId) {
        return `id:${normalizedId}`;
    }

    const normalizedName = normalizePlayerName(name);
    return `name:${normalizedName}`;
}

function getFallbackPaletteColor(seed) {
    const normalizedSeed = String(seed || '').trim().toLowerCase();
    if (!normalizedSeed) {
        return '';
    }

    let hash = 5381;
    for (let index = 0; index < normalizedSeed.length; index += 1) {
        hash = ((hash << 5) + hash) + normalizedSeed.charCodeAt(index);
        hash |= 0;
    }

    const paletteIndex = Math.abs(hash) % playerNameColorPalette.length;
    return playerNameColorPalette[paletteIndex];
}

function ensurePlayerColor(name, playerId = '') {
    const colorKey = getPlayerColorKey(name, playerId);

    if (state.playerColorByKey[colorKey]) {
        return;
    }

    const color = getFallbackPaletteColor(colorKey) || playerNameColorPalette[0];
    state.playerColorByKey[colorKey] = color;
}

function getPlayerColor(name, playerId = '') {
    const byIdKey = getPlayerColorKey(name, playerId);
    if (state.playerColorByKey[byIdKey]) {
        return state.playerColorByKey[byIdKey];
    }

    const byNameKey = getPlayerColorKey(name);
    return state.playerColorByKey[byNameKey] || '';
}

function refreshPlayerColorAssignments() {
    const nextAssignments = {};

    for (let index = 0; index < state.players.length; index += 1) {
        const player = state.players[index];
        const color = playerNameColorPalette[index % playerNameColorPalette.length];
        const idKey = getPlayerColorKey(player.name, player.id);
        const nameKey = getPlayerColorKey(player.name);
        nextAssignments[idKey] = color;
        if (!nextAssignments[nameKey]) {
            nextAssignments[nameKey] = color;
        }
    }

    state.playerColorByKey = {
        ...state.playerColorByKey,
        ...nextAssignments
    };
}

function createColoredPlayerNameNode(name, playerId = '') {
    const normalizedName = normalizePlayerName(name);
    ensurePlayerColor(normalizedName, playerId);
    const nameSpan = document.createElement('span');
    nameSpan.className = 'log-player-name';
    nameSpan.style.color = getPlayerColor(normalizedName, playerId) || 'inherit';
    nameSpan.textContent = normalizedName;
    return nameSpan;
}

function highlightPlayerNames(container, seenCountByName = null) {
    const nameColorMap = new Map();
    for (const player of state.players) {
        const normalizedName = normalizePlayerName(player.name);
        const colors = nameColorMap.get(normalizedName) || [];
        const color = getPlayerColor(player.name, player.id);
        if (color && !colors.includes(color)) {
            colors.push(color);
        }
        nameColorMap.set(normalizedName, colors);
    }

    const names = Array.from(nameColorMap.keys());
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

    const sharedSeenCounts = seenCountByName instanceof Map ? seenCountByName : new Map();

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
            const palette = nameColorMap.get(matchedName) || [];
            const seenCount = sharedSeenCounts.get(matchedName) || 0;
            const nextColor = palette.length > 0 ? palette[seenCount % palette.length] : 'inherit';
            sharedSeenCounts.set(matchedName, seenCount + 1);
            nameSpan.style.color = nextColor;
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
        return Array.isArray(existingLog) ? existingLog.slice(-maxActionLogEntries) : [];
    }

    if (!Array.isArray(existingLog) || existingLog.length === 0) {
        return incomingLog.slice(-maxActionLogEntries);
    }

    if (incomingLog[0] === 'Room created. Waiting for players.' && existingLog.length > 0 && incomingLog.length < existingLog.length) {
        return incomingLog.slice(-maxActionLogEntries);
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
            return existingLog.concat(incomingLog.slice(overlap)).slice(-maxActionLogEntries);
        }
    }

    return existingLog.concat(incomingLog).slice(-maxActionLogEntries);
}

function renderActionLog() {
    refreshPlayerColorAssignments();
    actionLogList.replaceChildren();
    const seenCountByName = new Map();

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
        highlightPlayerNames(item, seenCountByName);
        actionLogList.appendChild(item);
    }

    actionLogList.scrollTop = actionLogList.scrollHeight;
}

function updateChatVisibility() {
    roomChat.classList.toggle('hidden', !state.isConnected);
    updateMobilePlayVisibility();
}

function renderChatUnreadBadge() {
    const count = Math.max(0, Number(state.chatUnreadCount) || 0);
    chatUnreadBadge.textContent = String(count);
    chatUnreadBadge.classList.toggle('hidden', count < 1);
}

function scrollChatToBottom() {
    chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
}

function renderChatMessages() {
    chatMessagesList.replaceChildren();

    if (!Array.isArray(state.chatMessages) || state.chatMessages.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'chat-message-empty';
        emptyState.textContent = 'No messages yet.';
        chatMessagesList.appendChild(emptyState);
        return;
    }

    for (const chatMessage of state.chatMessages) {
        ensurePlayerColor(chatMessage.playerName || 'Player', chatMessage.playerId || '');

        const isSelf = chatMessage.playerId === state.playerId
            || (!chatMessage.playerId && chatMessage.playerName === state.players.find(p => p.id === state.playerId)?.name);

        const item = document.createElement('li');
        item.className = `chat-message-item ${isSelf ? 'chat-self' : 'chat-other'}`;

        const bubble = document.createElement('div');
        bubble.className = 'chat-message-bubble';
        bubble.textContent = censorProfanities(chatMessage.message || '');

        const meta = document.createElement('p');
        meta.className = 'chat-message-meta';
        if (!isSelf) {
            const sender = createColoredPlayerNameNode(chatMessage.playerName || 'Player', chatMessage.playerId || '');
            meta.appendChild(sender);
            meta.appendChild(document.createTextNode(' · '));
        }
        const sentAt = Number(chatMessage.sentAt);
        const hasTimestamp = Number.isFinite(sentAt) && sentAt > 0;
        const timeText = hasTimestamp ? new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        meta.appendChild(document.createTextNode(timeText));

        item.append(bubble, meta);
        chatMessagesList.appendChild(item);
    }

    scrollChatToBottom();
}

function setChatOpen(open) {
    state.chatOpen = Boolean(open);
    chatPanel.classList.toggle('hidden', !state.chatOpen);
    chatToggleButton.classList.toggle('hidden', state.chatOpen);
    chatToggleButton.setAttribute('aria-expanded', state.chatOpen ? 'true' : 'false');
    updateMobilePlayVisibility();

    if (state.chatOpen) {
        state.chatUnreadCount = 0;
        renderChatUnreadBadge();
        renderChatMessages();
        setTimeout(() => chatInput.focus(), 0);
    }
}

function normalizeChatMessagePayload(payload) {
    return {
        roomId: payload.roomId || state.roomId,
        playerId: payload.playerId || '',
        playerName: String(payload.playerName || 'Player'),
        message: String(payload.message || '').trim(),
        sentAt: Number(payload.sentAt) || Date.now()
    };
}

function appendChatMessage(payload, options = {}) {
    const normalized = normalizeChatMessagePayload(payload);
    if (!normalized.message || normalized.roomId !== state.roomId) {
        return;
    }

    state.chatMessages.push(normalized);
    if (state.chatMessages.length > maxChatMessages) {
        state.chatMessages.splice(0, state.chatMessages.length - maxChatMessages);
    }

    if (!state.chatOpen && normalized.playerId !== state.playerId && options.countUnread !== false) {
        state.chatUnreadCount += 1;
        playChatUnreadCue();
    }

    renderChatUnreadBadge();
    if (state.chatOpen) {
        renderChatMessages();
    }
}

function applyChatHistory(payload) {
    if (!payload || payload.roomId !== state.roomId) {
        return;
    }

    state.chatMessages = [];
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    for (const message of messages) {
        appendChatMessage(message, { countUnread: false });
    }

    if (state.chatOpen) {
        renderChatMessages();
    }
}

function sendChatMessage() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
        return;
    }

    const message = chatInput.value.trim();
    if (!message) {
        return;
    }

    state.socket.send(JSON.stringify({ type: 'chat_message', message }));
    chatInput.value = '';
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
            createColoredPlayerNameNode(state.lastResolution.callerName, state.lastResolution.callerPlayerId || ''),
            document.createTextNode(' called Calza on '),
            createColoredPlayerNameNode(state.lastResolution.bidderName, state.lastResolution.bidderPlayerId || ''),
            document.createTextNode(' ('),
            createInlineBidValue(state.lastResolution.bid.quantity, state.lastResolution.bid.face, true),
            document.createTextNode(`). Actual count: ${state.lastResolution.actualCount}. `),
            createColoredPlayerNameNode(state.lastResolution.callerName, state.lastResolution.callerPlayerId || ''),
            document.createTextNode(outcomeText)
        );
        return;
    }

    const verdict = state.lastResolution.bidWasCorrect ? 'Bid was correct' : 'Bid was wrong';
    resolutionText.replaceChildren(
        createColoredPlayerNameNode(state.lastResolution.doubterName, state.lastResolution.doubterPlayerId || ''),
        document.createTextNode(' called Dudo on '),
        createColoredPlayerNameNode(state.lastResolution.bidderName, state.lastResolution.bidderPlayerId || ''),
        document.createTextNode(' ('),
        createInlineBidValue(state.lastResolution.bid.quantity, state.lastResolution.bid.face, true),
        document.createTextNode(`). ${verdict}; `),
        createColoredPlayerNameNode(state.lastResolution.loserName, state.lastResolution.loserPlayerId || ''),
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
            haptic('selection');
            playTone(420, 70, 0.022);
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
            haptic('selection');
            playTone(420, 70, 0.022);
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
            haptic('selection');
            playTone(460 + face * 18, 70, 0.022);
            updateActionAvailability();
        });

        faceButtons.appendChild(button);
    }
}

function isMatchingDieForBidFace(dieValue, bidFace, palificoRound = false) {
    if (palificoRound) {
        return dieValue === bidFace;
    }

    if (bidFace === 1) {
        return dieValue === 1;
    }

    return dieValue === bidFace || dieValue === 1;
}

function createRevealDie(value, highlight, tintColor = '') {
    const die = document.createElement('div');
    die.className = `die reveal${highlight ? ' match' : ''}`;
    if (tintColor) {
        const tintAlpha = state.ui.darkMode ? 0.52 : 0.25;
        const borderAlpha = state.ui.darkMode ? 0.66 : 0.5;
        die.style.setProperty('--reveal-die-tint', toTranslucentColor(tintColor, tintAlpha));
        die.style.setProperty('--reveal-die-border', toTranslucentColor(tintColor, borderAlpha));
    }
    renderDie(die, value);
    return die;
}

function getResolutionKey(resolution, roundNumber = 0) {
    if (!resolution) {
        return null;
    }

    if (Number.isInteger(resolution.eventId)) {
        return `event:${resolution.eventId}`;
    }

    const normalizedRound = Number(roundNumber) || 0;

    if (resolution.type === 'calza') {
        return `calza:${normalizedRound}:${resolution.callerPlayerId}:${resolution.bid?.quantity}:${resolution.bid?.face}:${resolution.actualCount}`;
    }

    return `dudo:${normalizedRound}:${resolution.doubterPlayerId}:${resolution.bid?.quantity}:${resolution.bid?.face}:${resolution.actualCount}`;
}

function closeResolutionModal() {
    resolutionModal.classList.add('hidden');
    state.deferDiceRollUntilResolutionClose = false;

    if (Array.isArray(state.pendingYourDice)) {
        state.yourDice = [...state.pendingYourDice];
        state.pendingYourDice = null;
        renderDice();
    }

    if (state.pendingRoundToastMessage) {
        showEventToast(state.pendingRoundToastMessage, 'round', { holdMs: 2600, exitMs: 700 });
        state.pendingRoundToastMessage = null;
    }

    if (state.pendingYourTurnToast) {
        const isNowMyTurn =
            state.phase === 'bidding'
            && state.currentTurnPlayerId === state.playerId
            && !isSelfEliminated();
        if (isNowMyTurn) {
            showEventToast('Your turn!', 'turn', { holdMs: 2400, exitMs: 700 });
            playTurnAlertCue();
        }
        state.pendingYourTurnToast = false;
    }

    if (state.pendingVictoryWinner) {
        const pendingWinner = state.pendingVictoryWinner;
        state.pendingVictoryWinner = null;
        openVictoryModal(pendingWinner.name, pendingWinner.id);
    }
}

function closeVictoryModal() {
    victoryModal.classList.add('hidden');
    victoryBurst.replaceChildren();
}

function playVictoryCue() {
    playTone(520, 120, 0.24, 'triangle');
    setTimeout(() => playTone(700, 150, 0.22, 'triangle'), 70);
    setTimeout(() => playTone(920, 210, 0.20, 'triangle'), 155);
    setTimeout(() => playTone(1140, 180, 0.17, 'sine'), 280);
}

function spawnVictoryBurst() {
    victoryBurst.replaceChildren();

    if (typeof confetti === 'function') {
        const origin = { x: 0.5, y: 0.6 };
        confetti({ particleCount: 90, spread: 80, origin, startVelocity: 38, gravity: 0.9, ticks: 220, colors: ['#f5d060', '#e84d6f', '#4da8ff', '#72e0a0', '#c76cf5'] });
        setTimeout(() => confetti({ particleCount: 40, spread: 60, origin: { x: 0.3, y: 0.65 }, startVelocity: 28, gravity: 0.9, ticks: 180 }), 180);
        setTimeout(() => confetti({ particleCount: 40, spread: 60, origin: { x: 0.7, y: 0.65 }, startVelocity: 28, gravity: 0.9, ticks: 180 }), 280);
    } else {
        // fallback: simple emoji burst
        const symbols = ['✨', '⭐', '🎉'];
        const pieces = 20;
        for (let index = 0; index < pieces; index += 1) {
            const piece = document.createElement('span');
            piece.className = 'victory-piece';
            piece.textContent = symbols[index % symbols.length];
            const angle = (Math.PI * 2 * index) / pieces + Math.random() * 0.45;
            const distance = 60 + Math.random() * 60;
            piece.style.setProperty('--spark-x', `${(Math.cos(angle) * distance).toFixed(0)}px`);
            piece.style.setProperty('--spark-y', `${(Math.sin(angle) * distance).toFixed(0)}px`);
            piece.style.animationDelay = `${Math.random() * 0.16}s`;
            piece.style.animationDuration = `${1.2 + Math.random() * 0.5}s`;
            victoryBurst.appendChild(piece);
        }
    }
}

function openVictoryModal(winnerName, winnerPlayerId = '') {
    victoryMessage.replaceChildren(
        createColoredPlayerNameNode(winnerName, winnerPlayerId),
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
        ensurePlayerColor(playerDice.playerName, playerDice.playerId || '');
    }
    ensurePlayerColor(resolution.callerName || '', resolution.callerPlayerId || '');
    ensurePlayerColor(resolution.loserName || '', resolution.loserPlayerId || '');
    ensurePlayerColor(resolution.doubterName || '', resolution.doubterPlayerId || '');
    ensurePlayerColor(resolution.bidderName || '', resolution.bidderPlayerId || '');

    modalRevealList.replaceChildren();
    modalSummary.replaceChildren();
    modalCaller.textContent = '';
    modalSummary.classList.add('hidden');
    modalMatchCount.classList.add('hidden');
    const resolutionPalificoRound = typeof resolution.palificoRound === 'boolean'
        ? resolution.palificoRound
        : Boolean(state.palificoRound);

    let highlightedCount = 0;

    for (const playerDice of resolution.revealedDice) {
        const row = document.createElement('div');
        row.className = 'reveal-row';
        const revealTintColor = getPlayerColor(playerDice.playerName, playerDice.playerId || '');

        const playerTitle = document.createElement('p');
        playerTitle.className = 'reveal-player-name';
        playerTitle.append(createColoredPlayerNameNode(playerDice.playerName, playerDice.playerId || ''));

        const diceWrap = document.createElement('div');
        diceWrap.className = 'reveal-dice';

        const hasMatchingMask = Array.isArray(playerDice.matchingMask)
            && playerDice.matchingMask.length === playerDice.dice.length;

        for (let index = 0; index < playerDice.dice.length; index += 1) {
            const value = playerDice.dice[index];
            const isMatch = hasMatchingMask
                ? Boolean(playerDice.matchingMask[index])
                : isMatchingDieForBidFace(value, resolution.bid.face, resolutionPalificoRound);
            if (isMatch) {
                highlightedCount += 1;
            }

            diceWrap.appendChild(createRevealDie(value, isMatch, revealTintColor));
        }

        row.append(playerTitle, diceWrap);
        modalRevealList.appendChild(row);
    }

    if (resolution.type === 'calza') {
        const calzaSuccessful = Boolean(resolution.bidIsExact);
        const difference = Math.abs(Number(resolution.actualCount || 0) - Number(resolution.bid.quantity || 0));
        const callerDiceBefore = Number(resolution.callerDiceBefore || 0);
        const callerDiceAfter = Number(resolution.callerDiceAfter || 0);
        const wasAlreadyAtMaxDice = calzaSuccessful && callerDiceBefore >= 5 && callerDiceAfter >= 5;

        modalTitle.textContent = 'Calza Reveal';
        modalCaller.replaceChildren(
            createColoredPlayerNameNode(resolution.callerName, resolution.callerPlayerId || ''),
            document.createTextNode(' called Calza on '),
            createColoredPlayerNameNode(resolution.bidderName || 'the bidder', resolution.bidderPlayerId || ''),
            document.createTextNode("'s bid of "),
            createInlineBidValue(resolution.bid.quantity, resolution.bid.face, true)
        );

        const effectiveMatchCount = Number.isFinite(Number(resolution.actualCount))
            ? Number(resolution.actualCount)
            : highlightedCount;
        modalVerdict.textContent = `${calzaSuccessful ? 'Calza SUCCESSFUL' : 'Calza FAILED'}. Matching dice found: ${effectiveMatchCount}.`;
        modalVerdict.classList.toggle('success', calzaSuccessful);
        modalVerdict.classList.toggle('fail', !calzaSuccessful);

        modalLoser.replaceChildren(
            createColoredPlayerNameNode(resolution.callerName, resolution.callerPlayerId || ''),
            ...(calzaSuccessful
                ? [document.createTextNode(wasAlreadyAtMaxDice
                    ? ' called an exact Calza and stays at max dice.'
                    : ' gains a die.')]
                : [
                    document.createTextNode(' loses a die (off by '),
                    createNumericEmphasisNode(difference),
                    document.createTextNode(').')
                ])
        );

        resolutionModal.classList.remove('hidden');
        return;
    }

    modalTitle.textContent = 'Dudo Reveal';
    modalCaller.replaceChildren(
        createColoredPlayerNameNode(resolution.doubterName || 'A player', resolution.doubterPlayerId || ''),
        document.createTextNode(' called Dudo on '),
        createColoredPlayerNameNode(resolution.bidderName || 'the bidder', resolution.bidderPlayerId || ''),
        document.createTextNode("'s bid of "),
        createInlineBidValue(resolution.bid.quantity, resolution.bid.face, true)
    );

    const dudoSuccessful = !resolution.bidWasCorrect;
    const effectiveMatchCount = Number.isFinite(Number(resolution.actualCount))
        ? Number(resolution.actualCount)
        : highlightedCount;
    modalVerdict.textContent = `${dudoSuccessful ? 'Dudo SUCCESSFUL' : 'Dudo FAILED'}. Matching dice found: ${effectiveMatchCount}.`;
    modalVerdict.classList.toggle('success', dudoSuccessful);
    modalVerdict.classList.toggle('fail', !dudoSuccessful);

    modalLoser.replaceChildren(
        createColoredPlayerNameNode(resolution.loserName, resolution.loserPlayerId || ''),
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
    const showStartGame = state.isConnected && state.phase === 'waiting' && state.roundNumber === 0;
    const showJoinGame = state.isConnected && isSelfSpectator() && state.roundNumber > 0 && state.phase !== 'game_over';
    const showHeaderRematch = state.isConnected && state.phase === 'game_over';
    const canEndGame = state.isConnected && (state.phase === 'bidding' || state.phase === 'game_over' || state.roundNumber > 0);
    const canStartGame = showStartGame && getActivePlayers().length >= 2;
    const canJoinGame = showJoinGame;
    const canHeaderRematch = showHeaderRematch && !state.rematchRequested;
    const canChat = state.isConnected && Boolean(state.roomId);

    startGameButton.classList.toggle('hidden', !(showStartGame || showHeaderRematch || showJoinGame));
    startGameButton.textContent = showHeaderRematch ? 'Rematch' : (showJoinGame ? 'Join Game' : 'Start Game');
    startGameButton.disabled = showHeaderRematch ? !canHeaderRematch : (showJoinGame ? !canJoinGame : !canStartGame);
    endGameButton.classList.remove('hidden');
    endGameButton.disabled = !canEndGame;
    chatToggleButton.disabled = !canChat;
    chatSendButton.disabled = !canChat;
    updateWaitingStartNotice();

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

    actionHelper.classList.remove('helper-error');

    if (!canAct) {
        actionHelper.textContent = state.phase === 'waiting'
            ? (state.roundNumber === 0
                ? (canStartGame
                    ? 'Everyone is in? Any player can press Start Game.'
                    : 'Waiting for at least 2 players to enable Start Game.')
                : (showJoinGame
                    ? 'You are spectating this match. Press Join Game to enter.'
                    : 'Waiting for enough players to resume bidding.'))
            : (showJoinGame
                ? 'You are spectating this match. Press Join Game to enter.'
                : (canCalza
                    ? 'Wait for your turn. You can still call Calza.'
                    : 'Wait for your turn.'));
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
    actionHelper.classList.toggle('helper-error', hasSelection && !bidIsLegal);
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
                createColoredPlayerNameNode(winnerName, state.winnerPlayerId || ''),
                document.createTextNode(' wins.')
            );
            return fragment;
        });
        return;
    }

    if (state.phase === 'waiting') {
        if (state.roundNumber === 0) {
            setStatus('Waiting for players... click Start Game when everyone is in.');
        } else {
            setStatus('⌛ Waiting for at least 2 players to continue.');
        }
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

    if (isSelfSpectator() && state.phase !== 'game_over') {
        setStatus('👀 You are spectating. Press Join Game to enter this match.');
        return;
    }

    if (isSelfEliminated() && state.phase === 'bidding') {
        setStatus('👀 You are out this game and now spectating.');
        return;
    }

    const turnName = getPlayerNameById(state.currentTurnPlayerId);
    setStatusNodes(() => {
        const fragment = document.createDocumentFragment();
        const turnNameNode = createColoredPlayerNameNode(turnName, state.currentTurnPlayerId || '');
        turnNameNode.textContent = `${turnNameNode.textContent}’s`;
        fragment.append(
            document.createTextNode('🕒 '),
            turnNameNode,
            document.createTextNode(' turn.')
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
        state.pendingVictoryWinner = { name: winnerName, id: state.winnerPlayerId || '' };
        return;
    }

    openVictoryModal(winnerName, state.winnerPlayerId || '');
}

function maybePlayBidAcceptedCue() {
    const currentBidKey = state.lastBid
        ? `${state.lastBid.playerName}:${state.lastBid.quantity}:${state.lastBid.face}`
        : '';

    if (state.previousBidKey && state.previousBidKey !== currentBidKey) {
        playTone(520, 85, 0.022);
        setTimeout(() => playTone(680, 90, 0.018), 72);
    }

    state.previousBidKey = currentBidKey;
}

function applyStateUpdate(payload) {
    const previousPhase = state.phase;
    const previousRoundNumber = state.roundNumber;
    const previousTurnPlayerId = state.currentTurnPlayerId;
    const previousTurnTimerEnabled = state.ui.turnTimerEnabled;
    const timerChangedByName = String(payload.turnTimerChangedByName || '').trim();
    const incomingResolutionKey = getResolutionKey(payload.lastResolution || null, payload.roundNumber);
    const incomingIsNewResolution = Boolean(
        incomingResolutionKey
        && incomingResolutionKey !== state.lastSeenResolutionKey
        && payload.lastResolution
    );

    state.roomId = payload.roomId || state.roomId;
    state.phase = payload.phase || 'waiting';
    state.players = Array.isArray(payload.players) ? payload.players : [];
    state.currentTurnPlayerId = payload.currentTurnPlayerId || null;
    state.roundNumber = Number(payload.roundNumber) || 0;
    state.palificoRound = Boolean(payload.palificoRound);
    state.palificoFace = payload.palificoFace || null;
    state.lastBid = payload.lastBid || null;
    const incomingYourDice = Array.isArray(payload.yourDice) ? payload.yourDice : [];
    const shouldHoldDiceUpdate = incomingIsNewResolution
        || state.deferDiceRollUntilResolutionClose
        || (!resolutionModal.classList.contains('hidden') && Boolean(payload.lastResolution));

    if (shouldHoldDiceUpdate) {
        state.pendingYourDice = [...incomingYourDice];
    } else {
        state.yourDice = incomingYourDice;
        state.pendingYourDice = null;
    }
    state.actionLog = mergeActionLog(state.actionLog, Array.isArray(payload.actionLog) ? payload.actionLog : []);
    state.lastResolution = payload.lastResolution || null;
    state.deferDiceRollUntilResolutionClose = state.deferDiceRollUntilResolutionClose || incomingIsNewResolution;
    state.winnerPlayerId = payload.winnerPlayerId || null;
    state.ui.turnTimerEnabled = Boolean(payload.turnTimerEnabled);
    if (turnTimerToggle) {
        turnTimerToggle.checked = state.ui.turnTimerEnabled;
    }

    if (state.ui.turnTimerEnabled !== previousTurnTimerEnabled) {
        const actorPrefix = timerChangedByName ? `${timerChangedByName} turned ` : '';
        if (state.ui.turnTimerEnabled) {
            state.turnTimerKey = getCurrentTurnTimerKey();
            state.turnTimerStartedAt = state.turnTimerKey ? Date.now() : 0;
            state.turnTimerHasAlerted = false;
            showEventToast(`${actorPrefix}turn timer is ON!`, 'round', { holdMs: 1800, exitMs: 620 });
        } else {
            state.turnTimerKey = '';
            state.turnTimerStartedAt = 0;
            state.turnTimerHasAlerted = false;
            showEventToast(`${actorPrefix}turn timer is OFF.`, 'round', { holdMs: 1500, exitMs: 560 });
        }
    }

    syncTurnTimerState();

    if (previousPhase === 'game_over' && state.phase !== 'game_over') {
        state.lastSeenResolutionKey = null;
        state.lastResolution = null;
        state.lastSeenWinnerPlayerId = null;
        state.pendingVictoryWinner = null;
        state.pendingRoundToastMessage = null;
        state.pendingYourTurnToast = false;
        state.pendingYourDice = null;
        state.deferDiceRollUntilResolutionClose = false;
        state.rematchRequested = false;
        state.turnTimerKey = '';
        state.turnTimerStartedAt = 0;
        state.turnTimerHasAlerted = false;
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
    if (roundCard) {
        roundCard.classList.toggle('palifico-round', state.palificoRound);
    }
    renderLobbyCode();

    renderPlayers();
    updatePlayerTurnTimer();
    renderDice();
    renderLastBid();
    renderActionLog();
    renderResolution();
    maybePlayBidAcceptedCue();

    const resolutionKey = getResolutionKey(state.lastResolution, state.roundNumber);
    if (resolutionKey && resolutionKey !== state.lastSeenResolutionKey) {
        state.lastSeenResolutionKey = resolutionKey;
        if (state.lastResolution.type === 'dudo') {
            if (state.lastResolution.bidWasCorrect) {
                playDudoFailCue();
            } else {
                playDudoSuccessCue();
            }
        } else if (state.lastResolution.type === 'calza') {
            if (state.lastResolution.bidIsExact) {
                playDudoSuccessCue();
            } else {
                playDudoFailCue();
            }
        }
        const handledByDudoAnnouncement = maybeAnimateDudoCall(state.lastResolution);
        if (!handledByDudoAnnouncement) {
            openDudoRevealModal(state.lastResolution);
        }
    }

    maybeAnimateRoundStart(previousRoundNumber);
    maybeAnimateYourTurn(previousTurnPlayerId, previousRoundNumber);

    const becameFreshWaitingRoom =
        state.phase === 'waiting'
        && state.roundNumber === 0
        && (previousPhase !== 'waiting' || previousRoundNumber > 0);

    if (becameFreshWaitingRoom) {
        const latestLogEntry = Array.isArray(state.actionLog) && state.actionLog.length > 0
            ? String(state.actionLog[state.actionLog.length - 1])
            : '';
        const resetByMatch = latestLogEntry.match(/^(.+?) reset the game\.$/);
        const resetByName = resetByMatch ? resetByMatch[1] : '';
        const toastMessage = resetByName
            ? `${resetByName} reset the game. Waiting for players.`
            : 'Game reset. Waiting for players.';
        showEventToast(toastMessage, 'round', { holdMs: 2100, exitMs: 640 });
    }

    const isSafeToFlushDeferredYourTurn =
        state.pendingYourTurnToast
        && state.phase === 'bidding'
        && state.currentTurnPlayerId === state.playerId
        && previousRoundNumber === state.roundNumber
        && resolutionModal.classList.contains('hidden')
        && !state.deferDiceRollUntilResolutionClose
        && !state.pendingRoundToastMessage
        && !isSelfEliminated();

    if (isSafeToFlushDeferredYourTurn) {
        showEventToast('Your turn!', 'turn', { holdMs: 2400, exitMs: 700 });
        playTurnAlertCue();
        triggerTurnReminderPulse();
        state.pendingYourTurnToast = false;
    }

    updateActionAvailability();
    updateStatusFromState();
    maybeShowVictoryCelebration();
    scheduleDesktopSidebarHeightSync();

    state.previousTurnPlayerId = state.currentTurnPlayerId;
}

async function connectToMatch() {
    const guestName = playerNameInput.value.trim() || 'Player';
    const isAccountMode = state.authMode === 'account';
    const roomId = isAccountMode
        ? (roomIdAccountInput.value.trim() || 'lobby')
        : (roomIdInput.value.trim() || 'lobby');
    const reconnectToken = getStoredReconnectToken(roomId);
    let joinName = guestName;
    let authToken = null;

    if (state.socket) {
        state.socket.close();
        state.socket = null;
    }

    setJoinState(false);
    setStatus(isAccountMode
        ? (state.accountAction === 'register' ? 'Creating account...' : 'Signing in...')
        : 'Connecting...');

    if (isAccountMode) {
        try {
            const authResult = state.accountAction === 'register'
                ? await registerWithAccountCredentials()
                : await loginWithAccountCredentials();
            authToken = authResult.token;
            joinName = authResult.displayName || authResult.username || 'Player';
            state.authToken = authToken;
        } catch (error) {
            setStatus(error.message || (state.accountAction === 'register' ? 'Account creation failed.' : 'Sign-in failed.'));
            setJoinState(true);
            return;
        }
    }

    setStatus('Connecting...');

    const socket = new WebSocket(getWsUrl());
    state.socket = socket;

    socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'join', name: joinName, roomId, authToken, reconnectToken }));
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
            state.authToken = authToken;
            state.reconnectToken = payload.reconnectToken || reconnectToken || null;
            if (state.reconnectToken && state.roomId) {
                storeReconnectToken(state.roomId, state.reconnectToken);
            }
            state.rematchRequested = false;
            state.chatMessages = [];
            state.chatUnreadCount = 0;
            setChatOpen(false);
            state.pendingVictoryWinner = null;
            showGameScreen();
            setLeaveState(true);
            updateChatVisibility();
            renderChatUnreadBadge();
            renderChatMessages();
            applyStateUpdate(payload);
            maybeHideLoadingScreen();
            playTone(780, 90, 0.022);
            return;
        }

        if (payload.type === 'chat_history') {
            applyChatHistory(payload);
            return;
        }

        if (payload.type === 'chat') {
            appendChatMessage(payload);
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
        if (state.isConnected) {
            showEventToast('Connection lost – attempting to reconnect…', 'dudo', { holdMs: 3500, exitMs: 700 });
        }
        state.isConnected = false;
        state.phase = 'waiting';
        state.players = [];
        state.currentTurnPlayerId = null;
        state.playerId = null;
        state.roomId = null;
        state.authToken = null;
        state.reconnectToken = null;
        state.lastBid = null;
        state.yourDice = [];
        state.actionLog = [];
        state.lastResolution = null;
        state.winnerPlayerId = null;
        state.selectedBidQuantity = null;
        state.selectedBidFace = null;
        state.lastSeenResolutionKey = null;
        state.lastSeenWinnerPlayerId = null;
        state.pendingVictoryWinner = null;
        state.pendingRoundToastMessage = null;
        state.pendingYourTurnToast = false;
        state.deferDiceRollUntilResolutionClose = false;
        state.pendingYourDice = null;
        state.rematchRequested = false;
        state.turnTimerKey = '';
        state.turnTimerStartedAt = 0;
        state.turnTimerHasAlerted = false;
        state.chatMessages = [];
        state.chatUnreadCount = 0;
        state.chatOpen = false;
        state.previousDiceKey = '';
        state.previousBidKey = '';
        state.playerColorByKey = {};
        state.socket = null;

        updateWaitingStartNotice();

        renderPlayers();
        renderDice();
        renderLastBid();
        renderActionLog();
        renderResolution();
        updateActionAvailability();
        renderLobbyCode();
        setChatOpen(false);
        renderChatUnreadBadge();
        renderChatMessages();
        updateChatVisibility();

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
        clearStoredReconnectToken(state.roomId);
        if (state.socket && state.socket.readyState === WebSocket.OPEN) {
            state.socket.send(JSON.stringify({ type: 'leave' }));
        }
        state.socket.close();
    });
}

function placeBid() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || bidButton.disabled) {
        return;
    }

    setMobileActionConsoleOpen(false);

    haptic('action');
    state.socket.send(
        JSON.stringify({
            type: 'bid',
            quantity: state.selectedBidQuantity,
            face: state.selectedBidFace
        })
    );

    playTone(545, 80, 0.022);
}

function callDudo() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || dudoButton.disabled) {
        return;
    }

    setMobileActionConsoleOpen(false);

    haptic('critical');
    state.socket.send(JSON.stringify({ type: 'dudo' }));
    playTone(260, 125, 0.02, 'sawtooth');
}

function callCalza() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || calzaButton.disabled) {
        return;
    }

    setMobileActionConsoleOpen(false);

    openConfirmModal('Call Calza? This is high-risk and resolves immediately.', () => {
        haptic('critical');
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
    rematchStatus.textContent = 'Rematch requested. Joining fresh table...';
    state.socket.send(JSON.stringify({ type: 'rematch' }));
    playTone(760, 90, 0.014, 'triangle');
}

function requestStartGame() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || startGameButton.disabled) {
        return;
    }

    state.socket.send(JSON.stringify({ type: 'start_game' }));
    playTone(680, 95, 0.015, 'triangle');
}

function requestJoinGame() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || startGameButton.disabled) {
        return;
    }

    state.socket.send(JSON.stringify({ type: 'join_game' }));
    playTone(620, 90, 0.014, 'triangle');
}

function handlePrimaryHeaderButtonClick() {
    if (state.phase === 'game_over') {
        requestRematch();
        return;
    }

    if (isSelfSpectator() && state.roundNumber > 0) {
        requestJoinGame();
        return;
    }

    requestStartGame();
}

function requestEndGame() {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN || endGameButton.disabled) {
        return;
    }

    openConfirmModal('End this game and reset room to waiting state?', () => {
        state.socket.send(JSON.stringify({ type: 'end_game' }));
        playTone(420, 105, 0.013, 'triangle');
    });
}

function toggleChatPanel() {
    setChatOpen(!state.chatOpen);
}

function toggleMobileActionConsole() {
    haptic('open');
    setMobileActionConsoleOpen(!mobileActionConsoleOpen);
}

joinButton.addEventListener('click', connectToMatch);
authModeGuestButton.addEventListener('click', () => {
    setAuthMode('guest');
});
authModeAccountButton.addEventListener('click', () => {
    setAuthMode('account');
});
accountActionLoginButton.addEventListener('click', () => {
    setAccountAction('login');
});
accountActionRegisterButton.addEventListener('click', () => {
    setAccountAction('register');
});
accountSubmitButton.addEventListener('click', connectToMatch);
playerNameInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    connectToMatch();
});
roomIdInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    connectToMatch();
});
accountUsernameInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    connectToMatch();
});
accountPasswordInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    connectToMatch();
});
accountDisplayNameInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    connectToMatch();
});
roomIdAccountInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    connectToMatch();
});
roomIdInput.addEventListener('input', () => {
    roomIdInput.value = roomIdInput.value.toUpperCase();
    roomIdAccountInput.value = roomIdInput.value;
});
roomIdAccountInput.addEventListener('input', () => {
    roomIdAccountInput.value = roomIdAccountInput.value.toUpperCase();
    roomIdInput.value = roomIdAccountInput.value;
});
leaveButton.addEventListener('click', leaveMatch);
endGameButton.addEventListener('click', requestEndGame);
startGameButton.addEventListener('click', handlePrimaryHeaderButtonClick);
bidButton.addEventListener('click', placeBid);
calzaButton.addEventListener('click', callCalza);
dudoButton.addEventListener('click', callDudo);
rematchButton.addEventListener('click', requestRematch);
chatToggleButton.addEventListener('click', toggleChatPanel);
chatCloseButton.addEventListener('click', () => setChatOpen(false));
chatSendButton.addEventListener('click', sendChatMessage);
if (playToggleButton) {
    playToggleButton.addEventListener('click', toggleMobileActionConsole);
}
if (playConsoleOverlay) {
    playConsoleOverlay.addEventListener('click', () => setMobileActionConsoleOpen(false));
}
chatInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    sendChatMessage();
});
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

advancedToggle.addEventListener('change', () => {
    setShowAdvanced(advancedToggle.checked);
});

darkModeToggle.addEventListener('change', () => {
    setDarkMode(darkModeToggle.checked);
});

profanityToggle.addEventListener('change', () => {
    state.ui.filterProfanities = profanityToggle.checked;
    if (state.chatOpen) {
        renderChatMessages();
    }
});

turnTimerToggle.addEventListener('change', () => {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
        turnTimerToggle.checked = state.ui.turnTimerEnabled;
        return;
    }

    state.socket.send(JSON.stringify({
        type: 'set_turn_timer',
        enabled: turnTimerToggle.checked
    }));
});

if (accountPasswordToggleButton) {
    accountPasswordToggleButton.addEventListener('click', () => {
        const shouldShow = accountPasswordInput.type === 'password';
        setPasswordVisibility(shouldShow);
    });
    addTouchFeedback(accountPasswordToggleButton);
}

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
addTouchFeedback(accountSubmitButton);
addTouchFeedback(authModeGuestButton);
addTouchFeedback(authModeAccountButton);
addTouchFeedback(accountActionLoginButton);
addTouchFeedback(accountActionRegisterButton);
addTouchFeedback(leaveButton);
addTouchFeedback(endGameButton);
addTouchFeedback(startGameButton);
addTouchFeedback(bidButton);
addTouchFeedback(calzaButton);
addTouchFeedback(dudoButton);
addTouchFeedback(rematchButton);
addTouchFeedback(settingsToggle);
addTouchFeedback(confirmAcceptButton);
addTouchFeedback(chatToggleButton);
addTouchFeedback(chatSendButton);
if (playToggleButton) {
    addTouchFeedback(playToggleButton);
}

window.addEventListener('load', maybeHideLoadingScreen);
window.addEventListener('resize', scheduleDesktopSidebarHeightSync);
setInterval(updatePlayerTurnTimer, turnTimerTickMs);

setShowAdvanced(advancedToggle.checked);
setDarkMode(darkModeToggle.checked);
state.ui.filterProfanities = profanityToggle.checked;
turnTimerToggle.checked = state.ui.turnTimerEnabled;
setPasswordVisibility(false);
setAuthMode('guest');
setAccountAction('login');
setLeaveState(false);
updateActionAvailability();
renderLobbyCode();
updateChatVisibility();
renderChatUnreadBadge();
renderChatMessages();
scheduleDesktopSidebarHeightSync();
showJoinScreen();
setStatus('Not connected.');
