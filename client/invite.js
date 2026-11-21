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
