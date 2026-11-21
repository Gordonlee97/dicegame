// Invite-link and saved-name helpers. Browser globals are only touched when a
// function is called, so this module can be imported in Node without a DOM.

const NAME_STORAGE_KEY = 'perudo.name';

// Mirrors sanitizeRoomId in the server.
export function sanitizeRoomCode(raw) {
    return String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 24);
}

export function readInviteCode(search = globalThis.location?.search ?? '') {
    return sanitizeRoomCode(new URLSearchParams(search).get('room'));
}

export function buildInviteUrl(code, origin = globalThis.location?.origin ?? '') {
    return `${origin}/?room=${sanitizeRoomCode(code).toUpperCase()}`;
}

export function setRoomInUrl(code) {
    try {
        const url = new URL(globalThis.location.href);
        url.searchParams.set('room', sanitizeRoomCode(code).toUpperCase());
        globalThis.history.replaceState(null, '', url);
    } catch {
        // ignore: URL update is cosmetic
    }
}

export function clearRoomFromUrl() {
    try {
        const url = new URL(globalThis.location.href);
        url.searchParams.delete('room');
        globalThis.history.replaceState(null, '', url);
    } catch {
        // ignore: URL update is cosmetic
    }
}

// Decides what the entry screen offers.
//   urlCode:        room code from ?room= (invite link, or set after joining)
//   currentRoom:    room this tab was last seated in (updated on every 'joined', incl. rematch)
//   reason:         'load' | 'disconnected' | 'left' | 'reset'
//   hasStoredToken: (code) => whether a reconnect token is stored for that room
// Modes: 'fresh' (Start a game + code field), 'invite' (Join game CODE),
// 'rejoin' (Rejoin game CODE, sends the stored reconnect token).
export function entryModeFor({ urlCode = '', currentRoom = '', reason = 'load', hasStoredToken = () => false } = {}) {
    const fresh = {
        mode: 'fresh', code: '', primaryLabel: 'Start a game', showCodePanel: true,
        showNewGameLink: false, showSignInHint: false
    };
    if (reason === 'left' || reason === 'reset') {
        return fresh;
    }

    const room = sanitizeRoomCode(currentRoom);
    const code = room || sanitizeRoomCode(urlCode);
    if (!code) {
        return fresh;
    }

    const isRejoin = Boolean(room) || Boolean(hasStoredToken(code));
    return {
        mode: isRejoin ? 'rejoin' : 'invite',
        code,
        primaryLabel: `${isRejoin ? 'Rejoin' : 'Join'} game ${code.toUpperCase()}`,
        showCodePanel: false,
        showNewGameLink: true,
        // An account seat can only be restored by signing in again.
        showSignInHint: isRejoin
    };
}

// Returns 'shared' | 'copied' | 'dismissed' (user closed the share sheet) | 'failed'.
export async function shareInvite(code, origin, nav) {
    const url = buildInviteUrl(code, origin);
    try {
        const nv = nav ?? globalThis.navigator;
        if (nv && typeof nv.share === 'function') {
            await nv.share({ title: 'Perudo', text: 'Join my Perudo game', url });
            return 'shared';
        }
        if (nv?.clipboard && typeof nv.clipboard.writeText === 'function') {
            await nv.clipboard.writeText(url);
            return 'copied';
        }
    } catch (error) {
        if (error?.name === 'AbortError') {
            return 'dismissed';
        }
    }
    return 'failed';
}

export function loadSavedName() {
    try {
        return String(globalThis.localStorage.getItem(NAME_STORAGE_KEY) || '').trim();
    } catch {
        return '';
    }
}

export function saveName(name) {
    try {
        globalThis.localStorage.setItem(NAME_STORAGE_KEY, String(name ?? '').trim());
    } catch {
        // ignore storage failures
    }
}
