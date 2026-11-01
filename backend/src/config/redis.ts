import Redis from 'ioredis';
import { logger } from '../logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redis: Redis | null = null;
let isRedisConnected = false;

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('[Redis] Max connection retries reached. Caching is disabled.');
        return null;
      }
      return Math.min(times * 1000, 5000);
    },
  });

  redis.on('connect', () => {
    isRedisConnected = true;
    logger.success('[Redis] Connected to Redis server successfully');
  });

  redis.on('error', (err) => {
    isRedisConnected = false;
    logger.error(`[Redis] Error: ${err.message}`);
  });

  redis.on('close', () => {
    isRedisConnected = false;
    logger.warn('[Redis] Connection closed');
  });
} catch (error) {
  logger.error('[Redis] Initialization failed:', error);
}

export const getCache = async (key: string): Promise<any | null> => {
  if (!redis || !isRedisConnected) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`[Redis] Get cache failed for key "${key}":`, error);
    return null;
  }
};

export const setCache = async (key: string, value: any, ttlSeconds: number = 86400): Promise<void> => {
  if (!redis || !isRedisConnected) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.error(`[Redis] Set cache failed for key "${key}":`, error);
  }
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  if (!redis || !isRedisConnected) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`[Redis] Invalidated ${keys.length} keys matching pattern: "${pattern}"`);
    }
  } catch (error) {
    logger.error(`[Redis] Invalidate cache failed for pattern "${pattern}":`, error);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    try {
      await redis.quit();
      logger.success('[Redis] Disconnected successfully');
    } catch (error) {
      logger.error('[Redis] Error during disconnection:', error);
    }
  }
};

export default redis;
