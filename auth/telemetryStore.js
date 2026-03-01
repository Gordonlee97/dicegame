const { CosmosClient } = require('@azure/cosmos');

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

function sanitizeRoomId(roomId) {
    const normalized = String(roomId || '').trim().toLowerCase();
    if (!normalized) {
        return 'lobby';
    }

    return normalized.replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'lobby';
}

class InMemoryTelemetryStore {
    constructor() {
        this.chatLogs = [];
        this.matchHistory = new Map();
        this.userStats = new Map();
    }

    async initialize() {
        return;
    }

    async recordChatMessage(entry) {
        this.chatLogs.push({
            id: String(entry.id || ''),
            roomId: sanitizeRoomId(entry.roomId),
            playerId: String(entry.playerId || ''),
            playerName: sanitizeDisplayName(entry.playerName),
            accountUsername: normalizeUsername(entry.accountUsername),
            message: String(entry.message || ''),
            sentAt: Number(entry.sentAt) || Date.now()
        });
    }

    async upsertMatchHistory(match) {
        const id = String(match.id || '').trim();
        if (!id) {
            return;
        }

        this.matchHistory.set(id, JSON.parse(JSON.stringify(match)));
    }

    async incrementUserRecord(record) {
        const normalizedUsername = normalizeUsername(record.username);
        if (!normalizedUsername) {
            return;
        }

        const existing = this.userStats.get(normalizedUsername) || {
            id: normalizedUsername,
            username: normalizedUsername,
            displayName: sanitizeDisplayName(record.displayName || normalizedUsername),
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            updatedAt: new Date().toISOString()
        };

        if (record.isWin) {
            existing.wins += 1;
        } else {
            existing.losses += 1;
        }
        existing.gamesPlayed = existing.wins + existing.losses;
        existing.updatedAt = new Date().toISOString();

        this.userStats.set(normalizedUsername, existing);
    }
}

class CosmosTelemetryStore {
    constructor(options) {
        this.client = new CosmosClient({ endpoint: options.endpoint, key: options.key });
        this.databaseName = options.databaseName;
        this.chatContainerName = options.chatContainerName;
        this.matchContainerName = options.matchContainerName;
        this.userContainerName = options.userContainerName;
        this.chatContainer = null;
        this.matchContainer = null;
        this.userContainer = null;
    }

    async initialize() {
        const { database } = await this.client.databases.createIfNotExists({ id: this.databaseName });

        const chatResult = await database.containers.createIfNotExists({
            id: this.chatContainerName,
            partitionKey: '/roomId'
        });

        const matchResult = await database.containers.createIfNotExists({
            id: this.matchContainerName,
            partitionKey: '/roomId'
        });

        const userResult = await database.containers.createIfNotExists({
            id: this.userContainerName,
            partitionKey: '/id'
        });

        this.chatContainer = chatResult.container;
        this.matchContainer = matchResult.container;
        this.userContainer = userResult.container;
    }

    async recordChatMessage(entry) {
        if (!this.chatContainer) {
            return;
        }

        const roomId = sanitizeRoomId(entry.roomId);
        const document = {
            id: String(entry.id || '').trim() || `${roomId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
            type: 'chat_message',
            roomId,
            playerId: String(entry.playerId || ''),
            playerName: sanitizeDisplayName(entry.playerName),
            accountUsername: normalizeUsername(entry.accountUsername),
            message: String(entry.message || ''),
            sentAt: Number(entry.sentAt) || Date.now(),
            createdAt: new Date().toISOString()
        };

        await this.chatContainer.items.create(document);
    }

    async upsertMatchHistory(match) {
        if (!this.matchContainer) {
            return;
        }

        const roomId = sanitizeRoomId(match.roomId);
        const id = String(match.id || '').trim();
        if (!id) {
            return;
        }

        const document = {
            ...match,
            id,
            roomId,
            updatedAt: new Date().toISOString()
        };

        await this.matchContainer.items.upsert(document);
    }

    async incrementUserRecord(record) {
        if (!this.userContainer) {
            return;
        }

        const normalizedUsername = normalizeUsername(record.username);
        if (!normalizedUsername) {
            return;
        }

        const id = normalizedUsername;
        let current;

        try {
            const { resource } = await this.userContainer.item(id, id).read();
            current = resource || null;
        } catch (error) {
            if (!error || Number(error.code) !== 404) {
                throw error;
            }
            current = null;
        }

        const wins = Number(current?.wins) || 0;
        const losses = Number(current?.losses) || 0;
        const nextWins = record.isWin ? wins + 1 : wins;
        const nextLosses = record.isWin ? losses : losses + 1;

        const document = {
            ...(current || {}),
            id,
            username: normalizedUsername,
            displayName: sanitizeDisplayName(record.displayName || current?.displayName || normalizedUsername),
            userId: String(record.userId || current?.userId || ''),
            wins: nextWins,
            losses: nextLosses,
            gamesPlayed: nextWins + nextLosses,
            updatedAt: new Date().toISOString(),
            createdAt: current?.createdAt || new Date().toISOString()
        };

        await this.userContainer.items.upsert(document);
    }
}

async function createTelemetryStoreFromEnv() {
    const provider = String(process.env.TELEMETRY_PROVIDER || '').trim().toLowerCase();

    if (provider === 'memory') {
        const store = new InMemoryTelemetryStore();
        await store.initialize();
        return { store, provider: 'memory' };
    }

    const endpoint = String(process.env.COSMOS_DB_ENDPOINT || '').trim();
    const key = String(process.env.COSMOS_DB_KEY || '').trim();
    const databaseName = String(process.env.COSMOS_DB_NAME || 'dicegame').trim();
    const chatContainerName = String(process.env.COSMOS_CHAT_LOGS_CONTAINER || 'chatLogs').trim();
    const matchContainerName = String(process.env.COSMOS_MATCH_HISTORY_CONTAINER || 'matchHistory').trim();
    const userContainerName = String(process.env.COSMOS_USERS_CONTAINER || 'users').trim();

    if (!endpoint || !key) {
        const store = new InMemoryTelemetryStore();
        await store.initialize();
        return { store, provider: 'memory' };
    }

    const store = new CosmosTelemetryStore({
        endpoint,
        key,
        databaseName,
        chatContainerName,
        matchContainerName,
        userContainerName
    });

    await store.initialize();
    return { store, provider: 'cosmos' };
}

module.exports = {
    createTelemetryStoreFromEnv
};
