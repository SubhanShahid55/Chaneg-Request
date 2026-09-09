import { createClient } from 'redis';
import { config } from '../config.js';
let client = null;
let connectionAttempt = null;
async function getClient() {
    if (!config.redisUrl)
        return null;
    if (client?.isReady)
        return client;
    if (!connectionAttempt) {
        client = createClient({ url: config.redisUrl });
        client.on('error', (error) => console.error('Redis error:', error.message));
        connectionAttempt = client.connect().then(() => undefined).catch((error) => {
            console.error('Redis unavailable; continuing without cache:', error.message);
            client = null;
        }).finally(() => {
            connectionAttempt = null;
        });
    }
    await connectionAttempt;
    return client?.isReady ? client : null;
}
export async function getCached(key) {
    const redis = await getClient();
    if (!redis)
        return null;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
}
export async function setCached(key, value, ttlSeconds = 30) {
    const redis = await getClient();
    if (redis)
        await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}
export async function invalidateCache(...keys) {
    const redis = await getClient();
    if (redis && keys.length)
        await redis.del(keys);
}
export async function invalidateCachePattern(pattern) {
    const redis = await getClient();
    if (!redis)
        return;
    const keys = [];
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(...key);
    }
    if (keys.length)
        await redis.del(keys);
}
//# sourceMappingURL=cache.js.map