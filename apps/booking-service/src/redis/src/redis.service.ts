import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'redis';
    const port = Number(process.env.REDIS_PORT ?? 6379);

    if (!Number.isFinite(port)) {
      throw new Error(`Invalid REDIS_PORT: ${process.env.REDIS_PORT}`);
    }

    this.client = new Redis({
      host,
      port,
    });

    this.client.on('error', (err) => {
      console.log('[Redis Error]', err.message);
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const value = randomUUID();

    console.log(`[REDIS] Trying lock → ${key}`);

    const result = await this.client.set(
      key,
      value,
      'EX',
      ttlSeconds,
      'NX'
    );

    if (result === 'OK') {
      console.log(`[REDIS] Lock ACQUIRED → ${key} | value=${value}`);
      return value;
    } else {
      console.log(`[REDIS] Lock FAILED → ${key}`);
      return null;
    }
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    console.log(`[REDIS] Releasing lock → ${key}`);

    const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

    const result = await this.client.eval(script, 1, key, value);

    if (result === 1) {
      console.log(`[REDIS] Lock RELEASED → ${key}`);
      return true;
    } else {
      console.log(`[REDIS] Lock RELEASE FAILED (not owner) → ${key}`);
      return false;
    }
  }
}