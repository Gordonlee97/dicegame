const { CosmosClient } = require('@azure/cosmos');
const bcrypt = require('bcryptjs');

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32);
}

function sanitizeDisplayName(displayName) {
    const normalized = String(displayName || '').trim();
    if (!normalized) {
        return 'Player';
    }

    return normalized.slice(0, 20);
}

class InMemoryAccountStore {
    constructor(seedUsers = []) {
        this.users = new Map();

        for (const user of seedUsers) {
            const username = normalizeUsername(user.username);
            if (!username) {
                continue;
            }

            const displayName = sanitizeDisplayName(user.displayName || user.username);
            const passwordHash = String(user.passwordHash || '').trim();
            if (!passwordHash) {
                continue;
            }

            this.users.set(username, {
                id: username,
                username,
                displayName,
                passwordHash,
                disabled: Boolean(user.disabled),
                wins: Number(user.wins) || 0,
                losses: Number(user.losses) || 0,
                gamesPlayed: Number(user.gamesPlayed) || ((Number(user.wins) || 0) + (Number(user.losses) || 0)),
                updatedAt: user.updatedAt || new Date().toISOString(),
                createdAt: user.createdAt || new Date().toISOString()
            });
        }
    }

    async initialize() {
        return;
    }

    async getByUsername(username) {
        const normalized = normalizeUsername(username);
        if (!normalized) {
            return null;
        }

        return this.users.get(normalized) || null;
    }

    async createUser({ username, displayName, passwordHash }) {
        const normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername) {
            return { ok: false, error: 'Username is invalid.' };
        }

        if (this.users.has(normalizedUsername)) {
            return { ok: false, error: 'Username already exists.' };
        }

        const user = {
            id: normalizedUsername,
            username: normalizedUsername,
            displayName: sanitizeDisplayName(displayName || normalizedUsername),
            passwordHash,
            disabled: false,
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        this.users.set(normalizedUsername, user);
        return { ok: true, user };
    }
}

class CosmosAccountStore {
    constructor(options) {
        this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
        this.databaseName = options.databaseName;
        this.containerName = options.containerName;
        this.container = null;
    }

    async initialize() {
        const { database } = await this.client.databases.createIfNotExists({ id: this.databaseName });
        const { container } = await database.containers.createIfNotExists({
            id: this.containerName,
            partitionKey: '/id'
        });

        this.container = container;
    }

    async getByUsername(username) {
        const normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername || !this.container) {
            return null;
        }

        try {
            const { resource } = await this.container.item(normalizedUsername, normalizedUsername).read();
            if (!resource) {
                return null;
            }

            return {
                id: resource.id,
                username: resource.username,
                displayName: resource.displayName,
                passwordHash: resource.passwordHash,
                disabled: Boolean(resource.disabled),
                wins: Number(resource.wins) || 0,
                losses: Number(resource.losses) || 0,
                gamesPlayed: Number(resource.gamesPlayed) || ((Number(resource.wins) || 0) + (Number(resource.losses) || 0)),
                updatedAt: resource.updatedAt,
                createdAt: resource.createdAt
            };
        } catch (error) {
            if (error && Number(error.code) === 404) {
                return null;
            }
            throw error;
        }
    }

    async createUser({ username, displayName, passwordHash }) {
        const normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername || !this.container) {
            return { ok: false, error: 'Username is invalid.' };
        }

        const existingUser = await this.getByUsername(normalizedUsername);
        if (existingUser) {
            return { ok: false, error: 'Username already exists.' };
        }

        const document = {
            id: normalizedUsername,
            username: normalizedUsername,
            displayName: sanitizeDisplayName(displayName || normalizedUsername),
            passwordHash,
            disabled: false,
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        await this.container.items.create(document);
        return { ok: true, user: document };
    }
}

function parseSeedUsers(rawValue) {
    if (!rawValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            return [];
        }

        const users = [];
        for (const item of parsed) {
            const username = normalizeUsername(item.username);
            const displayName = sanitizeDisplayName(item.displayName || item.username);
            if (!username || !item.password) {
                continue;
            }

            users.push({
                username,
                displayName,
                passwordHash: bcrypt.hashSync(String(item.password), 10),
                disabled: Boolean(item.disabled),
                createdAt: new Date().toISOString()
            });
        }

        return users;
    } catch {
        return [];
    }
}

async function createAccountStoreFromEnv() {
    const provider = String(process.env.AUTH_PROVIDER || '').trim().toLowerCase();

    if (provider === 'memory') {
        const seedUsers = parseSeedUsers(process.env.AUTH_MEMORY_USERS);
        const memoryStore = new InMemoryAccountStore(seedUsers);
        await memoryStore.initialize();
        return { store: memoryStore, provider: 'memory' };
    }

    const endpoint = String(process.env.COSMOS_DB_ENDPOINT || '').trim();
    const key = String(process.env.COSMOS_DB_KEY || '').trim();
    const databaseName = String(process.env.COSMOS_DB_NAME || 'dicegame').trim();
    const containerName = String(process.env.COSMOS_USERS_CONTAINER || 'users').trim();

    if (!endpoint || !key) {
        const seedUsers = parseSeedUsers(process.env.AUTH_MEMORY_USERS);
        const memoryStore = new InMemoryAccountStore(seedUsers);
        await memoryStore.initialize();
        return { store: memoryStore, provider: 'memory' };
    }

    const cosmosStore = new CosmosAccountStore({ endpoint, key, databaseName, containerName });
    await cosmosStore.initialize();
    return { store: cosmosStore, provider: 'cosmos' };
}

module.exports = {
    createAccountStoreFromEnv,
    normalizeUsername,
    sanitizeDisplayName
};
