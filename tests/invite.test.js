const test = require('node:test');
const assert = require('node:assert/strict');

test('sanitizeRoomCode mirrors the server sanitizer', async () => {
    const { sanitizeRoomCode } = await import('../client/invite.js');
    assert.equal(sanitizeRoomCode('KQZT'), 'kqzt');
    assert.equal(sanitizeRoomCode('../../x'), 'x');
    assert.equal(sanitizeRoomCode('a'.repeat(40)).length, 24);
    assert.equal(sanitizeRoomCode('  '), '');
    assert.equal(sanitizeRoomCode(undefined), '');
});

test('readInviteCode reads the room query parameter', async () => {
    const { readInviteCode } = await import('../client/invite.js');
    assert.equal(readInviteCode('?room=KqZt'), 'kqzt');
    assert.equal(readInviteCode(''), '');
});

test('buildInviteUrl builds an upper-case invite link', async () => {
    const { buildInviteUrl } = await import('../client/invite.js');
    assert.equal(buildInviteUrl('kqzt', 'https://a.b'), 'https://a.b/?room=KQZT');
});

test('entryModeFor: fresh visit shows the normal entry screen', async () => {
    const { entryModeFor } = await import('../client/invite.js');
    assert.deepEqual(entryModeFor({ reason: 'load' }), {
        mode: 'fresh', code: '', primaryLabel: 'Start a game', showCodePanel: true,
        showNewGameLink: false, showSignInHint: false
    });
});

test('entryModeFor: invite link joins the linked room', async () => {
    const { entryModeFor } = await import('../client/invite.js');
    assert.deepEqual(entryModeFor({ urlCode: 'kqzt', reason: 'load' }), {
        mode: 'invite', code: 'kqzt', primaryLabel: 'Join game KQZT', showCodePanel: false,
        showNewGameLink: true, showSignInHint: false
    });
});

test('entryModeFor: refresh with a held seat offers rejoin and the sign-in hint', async () => {
    const { entryModeFor } = await import('../client/invite.js');
    const view = entryModeFor({ urlCode: 'kqzt', reason: 'load', hasStoredToken: code => code === 'kqzt' });
    assert.equal(view.mode, 'rejoin');
    assert.equal(view.primaryLabel, 'Rejoin game KQZT');
    assert.equal(view.showSignInHint, true);
    assert.equal(view.showNewGameLink, true);
});

test('entryModeFor: unexpected disconnect from a created room offers rejoin', async () => {
    const { entryModeFor } = await import('../client/invite.js');
    assert.deepEqual(entryModeFor({ urlCode: '', currentRoom: 'abcd', reason: 'disconnected' }), {
        mode: 'rejoin', code: 'abcd', primaryLabel: 'Rejoin game ABCD', showCodePanel: false,
        showNewGameLink: true, showSignInHint: true
    });
});

test('entryModeFor: after a rematch the current room wins over the original invite', async () => {
    const { entryModeFor } = await import('../client/invite.js');
    const view = entryModeFor({ urlCode: 'old1', currentRoom: 'new2', reason: 'disconnected' });
    assert.equal(view.mode, 'rejoin');
    assert.equal(view.code, 'new2');
    assert.equal(view.primaryLabel, 'Rejoin game NEW2');
});

test('entryModeFor: deliberate leave or starting over returns to the normal entry screen', async () => {
    const { entryModeFor } = await import('../client/invite.js');
    for (const reason of ['left', 'reset']) {
        const view = entryModeFor({ urlCode: 'kqzt', currentRoom: 'kqzt', reason, hasStoredToken: () => true });
        assert.equal(view.mode, 'fresh');
        assert.equal(view.code, '');
        assert.equal(view.primaryLabel, 'Start a game');
        assert.equal(view.showCodePanel, true);
        assert.equal(view.showNewGameLink, false);
    }
});

test('shareInvite treats a dismissed share sheet as a silent no-op', async () => {
    const { shareInvite } = await import('../client/invite.js');
    const abort = new DOMException('Share canceled', 'AbortError');
    let copied = false;
    const nav = {
        share: async () => { throw abort; },
        clipboard: { writeText: async () => { copied = true; } }
    };
    assert.equal(await shareInvite('kqzt', 'https://a.b', nav), 'dismissed');
    assert.equal(copied, false);
});

test('shareInvite still reports other share failures', async () => {
    const { shareInvite } = await import('../client/invite.js');
    const nav = { share: async () => { throw new Error('boom'); } };
    assert.equal(await shareInvite('kqzt', 'https://a.b', nav), 'failed');
});

test('clearRoomFromUrl does not throw without a DOM', async () => {
    const { clearRoomFromUrl } = await import('../client/invite.js');
    assert.doesNotThrow(() => clearRoomFromUrl());
});

test('browser-global helpers do not throw without a DOM (storage and share)', async () => {
    const { loadSavedName, saveName, shareInvite } = await import('../client/invite.js');
    assert.equal(loadSavedName(), '');
    assert.doesNotThrow(() => saveName('Ann'));
    assert.equal(await shareInvite('kqzt', 'https://a.b', {}), 'failed');
});
