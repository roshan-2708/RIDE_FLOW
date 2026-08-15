const Redis = require('ioredis');
const { spawnSync } = require('child_process');

function resolveRedisHost() {
    if (process.env.REDIS_HOST) {
        return process.env.REDIS_HOST;
    }
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    // If on Windows and WSL is used for Redis
    if (process.platform === 'win32') {
        try {
            const res = spawnSync('wsl.exe', ['-d', 'Ubuntu', '--exec', 'hostname', '-I'], {
                stdio: 'pipe',
                timeout: 2000
            });
            if (res.stdout) {
                const ip = res.stdout.toString().trim().split(' ')[0];
                if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
                    return ip;
                }
            }
        } catch (err) {
            // fallback
        }
    }
    return '127.0.0.1';
}

const host = resolveRedisHost();
const isUrl = typeof host === 'string' && (host.startsWith('redis://') || host.startsWith('rediss://'));

const baseOptions = {
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy(times) {
        const delay = Math.min(times * 200, 3000);
        return delay;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
};

const redisOptions = isUrl ? host : { host, ...baseOptions };

// Main Redis client for general caching & geospatial operations
const redisClient = new Redis(redisOptions);

// Dedicated clients for Socket.IO Redis adapter (Pub/Sub)
const pubClient = new Redis(redisOptions);
const subClient = pubClient.duplicate();

// Setup event listeners for logging and error resilience
const registerListeners = (client, name) => {
    client.on('connect', () => console.log(`[Redis] ${name} connected to ${isUrl ? host : host + ':' + (process.env.REDIS_PORT || 6379)}`));
    client.on('ready', () => console.log(`[Redis] ${name} is ready`));
    client.on('error', (err) => console.error(`[Redis] ${name} error:`, err.message));
    client.on('close', () => console.warn(`[Redis] ${name} connection closed`));
    client.on('reconnecting', (time) => console.log(`[Redis] ${name} reconnecting in ${time}ms...`));
};

registerListeners(redisClient, 'redisClient');
registerListeners(pubClient, 'pubClient');
registerListeners(subClient, 'subClient');

module.exports = {
    redisClient,
    pubClient,
    subClient,
    subCilent: subClient // Alias for backwards compatibility
};