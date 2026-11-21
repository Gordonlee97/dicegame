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

test('browser-global helpers do not throw without a DOM', async () => {
    const { loadSavedName, saveName, shareInvite } = await import('../client/invite.js');
    assert.equal(loadSavedName(), '');
    assert.doesNotThrow(() => saveName('Ann'));
    assert.equal(await shareInvite('kqzt', 'https://a.b', {}), 'failed');
});
