const crypto = require('crypto');

function base64UrlEncode(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(input) {
    const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    const withPad = pad ? normalized + '='.repeat(4 - pad) : normalized;
    return Buffer.from(withPad, 'base64').toString('utf8');
}

function createTokenService(secret) {
    const normalizedSecret = String(secret || '').trim();

    function sign(payload) {
        if (!normalizedSecret) {
            throw new Error('Token secret is missing.');
        }

        const header = { alg: 'HS256', typ: 'JWT' };
        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        const encodedPayload = base64UrlEncode(JSON.stringify(payload));
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        const signature = crypto
            .createHmac('sha256', normalizedSecret)
            .update(signingInput)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        return `${signingInput}.${signature}`;
    }

    function verify(token) {
        if (!normalizedSecret) {
            return null;
        }

        const parts = String(token || '').split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [encodedHeader, encodedPayload, signature] = parts;
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        const expectedSignature = crypto
            .createHmac('sha256', normalizedSecret)
            .update(signingInput)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        if (signature !== expectedSignature) {
            return null;
        }

        try {
            const payloadText = base64UrlDecode(encodedPayload);
            return JSON.parse(payloadText);
        } catch {
            return null;
        }
    }

    return {
        sign,
        verify
    };
}

module.exports = {
    createTokenService
};
