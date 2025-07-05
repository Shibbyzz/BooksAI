import Redis from 'ioredis';

// Redis client singleton
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    // Use local Redis for development
    // For production, use your Redis provider (Upstash, Railway, etc.)
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,  // Increased retries
      lazyConnect: true,
      keyPrefix: 'booksai:',
      connectTimeout: 10000,  // Increased timeout
      commandTimeout: 5000,   // Increased timeout
      enableOfflineQueue: true,  // Fixed: Enable offline queue for better reliability
      reconnectOnError: (err) => {
        console.log('Redis reconnect on error:', err.message);
        return err.message.includes('READONLY');
      },
    });

    redis.on('error', (error) => {
      console.warn('Redis connection error (non-critical):', error.message);
      // Don't throw - just log and continue
    });

    redis.on('connect', () => {
      console.log('📡 Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('🚀 Redis ready for operations');
    });

    redis.on('close', () => {
      console.log('📡 Redis connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      console.warn('Error closing Redis connection:', error);
    }
    redis = null;
  }
}

// Helper function to handle Redis errors gracefully
export async function redisOperation<T>(
  operation: () => Promise<T>,
  fallback?: T,
  context?: string
): Promise<T> {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const fullContext = context ? `${context}: ${errorMessage}` : errorMessage;
    
    // Log error with full context
    console.error('❌ Redis operation failed:', fullContext);
    
    // If it's a connection error, try to reconnect
    if (errorMessage.includes('Connection is closed') || 
        errorMessage.includes('Stream isn\'t writeable') ||
        errorMessage.includes('Redis connection unavailable')) {
      console.log('🔄 Attempting to reconnect Redis...');
      
      // Force reconnection by getting a new client
      try {
        const redis = getRedisClient();
        await redis.ping();
        console.log('✅ Redis reconnected successfully');
        
        // Retry the operation once
        console.log('🔄 Retrying Redis operation...');
        return await operation();
      } catch (reconnectError) {
        console.error('❌ Redis reconnection failed:', reconnectError);
      }
    }
    
    // If we have a fallback, use it
    if (fallback !== undefined) {
      console.log('📦 Using fallback value for Redis operation');
      return fallback;
    }
    
    // Otherwise, throw the error with context
    throw new Error(fullContext);
  }
} 