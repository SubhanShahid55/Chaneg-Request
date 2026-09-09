import { createClient, type RedisClientType } from 'redis';
import { config } from '../config.js';

let client: RedisClientType | null = null;
let connectionAttempt: Promise<void> | null = null;

async function getClient(): Promise<RedisClientType | null> {
  if (!config.redisUrl) return null;
  if (client?.isReady) return client;
  if (!connectionAttempt) {
    client = createClient({ url: config.redisUrl });
    client.on('error', (error: Error) => console.error('Redis error:', error.message));
    connectionAttempt = client.connect().then(() => undefined).catch((error: Error) => {
      console.error('Redis unavailable; continuing without cache:', error.message);
      client = null;
    }).finally(() => {
      connectionAttempt = null;
    });
  }
  await connectionAttempt;
  return client?.isReady ? client : null;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const redis = await getClient();
  if (!redis) return null;
  const value = await redis.get(key);
  return value ? JSON.parse(value) as T : null;
}

export async function setCached(key: string, value: unknown, ttlSeconds = 30): Promise<void> {
  const redis = await getClient();
  if (redis) await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  const redis = await getClient();
  if (redis && keys.length) await redis.del(keys);
}