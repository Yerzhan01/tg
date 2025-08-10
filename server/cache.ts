import Redis from 'ioredis';

// Simple in-memory fallback if Redis not available
class MemoryCache {
  private cache = new Map<string, { value: any; expires: number }>();

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async flushall(): Promise<void> {
    this.cache.clear();
  }
}

// Redis client with fallback
let redis: Redis | MemoryCache | null = null;

try {
  // Try Redis first (for production)
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
    console.log('✅ Redis cache connected');
  } else {
    // Fallback to memory cache (for development)
    redis = new MemoryCache();
    console.log('💾 Using in-memory cache (development mode)');
  }
} catch (error) {
  console.warn('⚠️ Redis connection failed, using memory cache:', error);
  redis = new MemoryCache();
}

export class CacheService {
  private client = redis!;

  // Cache user data
  async getUserCache(userId: string) {
    return await this.client.get(`user:${userId}`);
  }

  async setUserCache(userId: string, userData: any, ttl = 600) {
    if (this.client instanceof MemoryCache) {
      await this.client.set(`user:${userId}`, JSON.stringify(userData), ttl);
    } else {
      await this.client.set(`user:${userId}`, JSON.stringify(userData), 'EX', ttl);
    }
  }

  // Cache invoice lists
  async getInvoiceListCache(userId: string) {
    const cached = await this.client.get(`invoices:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setInvoiceListCache(userId: string, invoices: any[], ttl = 300) {
    if (this.client instanceof MemoryCache) {
      await this.client.set(`invoices:${userId}`, JSON.stringify(invoices), ttl);
    } else {
      await this.client.set(`invoices:${userId}`, JSON.stringify(invoices), 'EX', ttl);
    }
  }

  async invalidateInvoiceListCache(userId: string) {
    await this.client.del(`invoices:${userId}`);
  }

  // Cache individual invoices
  async getInvoiceCache(invoiceId: string) {
    const cached = await this.client.get(`invoice:${invoiceId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setInvoiceCache(invoiceId: string, invoice: any, ttl = 600) {
    if (this.client instanceof MemoryCache) {
      await this.client.set(`invoice:${invoiceId}`, JSON.stringify(invoice), ttl);
    } else {
      await this.client.set(`invoice:${invoiceId}`, JSON.stringify(invoice), 'EX', ttl);
    }
  }

  async invalidateInvoiceCache(invoiceId: string) {
    await this.client.del(`invoice:${invoiceId}`);
  }

  // Cache suppliers/buyers
  async getSuppliersCache(userId: string) {
    const cached = await this.client.get(`suppliers:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setSuppliersCache(userId: string, suppliers: any[], ttl = 900) {
    if (this.client instanceof MemoryCache) {
      await this.client.set(`suppliers:${userId}`, JSON.stringify(suppliers), ttl);
    } else {
      await this.client.set(`suppliers:${userId}`, JSON.stringify(suppliers), 'EX', ttl);
    }
  }

  async getBuyersCache(userId: string) {
    const cached = await this.client.get(`buyers:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setBuyersCache(userId: string, buyers: any[], ttl = 900) {
    if (this.client instanceof MemoryCache) {
      await this.client.set(`buyers:${userId}`, JSON.stringify(buyers), ttl);
    } else {
      await this.client.set(`buyers:${userId}`, JSON.stringify(buyers), 'EX', ttl);
    }
  }

  // Invalidate user-related caches
  async invalidateUserCaches(userId: string) {
    const patterns = [
      `user:${userId}`,
      `invoices:${userId}`, 
      `suppliers:${userId}`,
      `buyers:${userId}`
    ];
    
    for (const pattern of patterns) {
      await this.client.del(pattern);
    }
  }

  // Clear all cache
  async clearAll() {
    await this.client.flushall();
  }
}

export const cacheService = new CacheService();