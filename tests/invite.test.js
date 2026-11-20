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

test('browser-global helpers do not throw without a DOM', async () => {
    const { loadSavedName, saveName, shareInvite } = await import('../client/invite.js');
    assert.equal(loadSavedName(), '');
    assert.doesNotThrow(() => saveName('Ann'));
    assert.equal(await shareInvite('kqzt', 'https://a.b', {}), 'failed');
});
