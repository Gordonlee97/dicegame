const bcrypt = require('bcryptjs');
const { createTokenService } = require('./tokenService');
const { normalizeUsername, sanitizeDisplayName } = require('./accountStore');

class AuthService {
    constructor(options) {
        this.accountStore = options.accountStore;
        this.tokenService = createTokenService(options.tokenSecret);
        this.tokenTtlSeconds = Number(options.tokenTtlSeconds) > 0 ? Number(options.tokenTtlSeconds) : 60 * 60 * 24 * 14;
    }

    async login(username, password) {
        const normalizedUsername = normalizeUsername(username);
        const plainPassword = String(password || '');

        if (!normalizedUsername || plainPassword.length < 1) {
            return { ok: false, error: 'Username and password are required.' };
        }

        const account = await this.accountStore.getByUsername(normalizedUsername);
        if (!account || !account.passwordHash || account.disabled) {
            return { ok: false, error: 'Invalid username or password.' };
        }

        const passwordMatches = await bcrypt.compare(plainPassword, account.passwordHash);
        if (!passwordMatches) {
            return { ok: false, error: 'Invalid username or password.' };
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        const payload = {
            sub: account.id,
            username: account.username,
            displayName: sanitizeDisplayName(account.displayName || account.username),
            typ: 'account',
            iat: nowSeconds,
            exp: nowSeconds + this.tokenTtlSeconds
        };

        const token = this.tokenService.sign(payload);
        return {
            ok: true,
            token,
            account: {
                userId: payload.sub,
                username: payload.username,
                displayName: payload.displayName
            }
        };
    }

    verifyAuthToken(token) {
        const payload = this.tokenService.verify(token);
        if (!payload) {
            return null;
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        if (!payload.exp || nowSeconds >= Number(payload.exp)) {
            return null;
        }

        const username = normalizeUsername(payload.username);
        if (!username) {
            return null;
        }

        return {
            userId: String(payload.sub || username),
            username,
            displayName: sanitizeDisplayName(payload.displayName || username)
        };
    }

    async registerUser(username, displayName, password) {
        const normalizedUsername = normalizeUsername(username);
        const safeDisplayName = sanitizeDisplayName(displayName || username);
        const plainPassword = String(password || '');

        if (!normalizedUsername) {
            return { ok: false, error: 'Username is invalid.' };
        }

        if (plainPassword.length < 8) {
            return { ok: false, error: 'Password must be at least 8 characters.' };
        }

        const passwordHash = await bcrypt.hash(plainPassword, 10);
        return this.accountStore.createUser({
            username: normalizedUsername,
            displayName: safeDisplayName,
            passwordHash
        });
    }
}

module.exports = AuthService;
