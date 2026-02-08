import { redis } from "@/app/lib/redis";

interface RateLimitConfig {
 maxRequests: number;
 windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
 maxRequests: 10,
 windowSeconds: 60,
};

export class RateLimiter {
 static async check(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
 ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  // Remove old requests outside the window
  await redis.zremrangebyscore(key, 0, windowStart);

  // Get current count
  const currentCount = await redis.zcard(key);

  if (currentCount >= config.maxRequests) {
   // Calculate reset time based on window
   const resetAt = now + config.windowSeconds;

   return {
    allowed: false,
    remaining: 0,
    resetAt,
   };
  }

  // Add current request
  await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
  await redis.expire(key, config.windowSeconds);

  return {
   allowed: true,
   remaining: config.maxRequests - currentCount - 1,
   resetAt: now + config.windowSeconds,
  };
 }

 static async checkIP(
  ip: string,
  config: RateLimitConfig = { maxRequests: 30, windowSeconds: 60 },
 ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  return this.check(`ip:${ip}`, config);
 }

 static async checkRoom(
  roomId: string,
  config: RateLimitConfig = { maxRequests: 20, windowSeconds: 60 },
 ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  return this.check(`room:${roomId}`, config);
 }

 static async checkUser(
  token: string,
  config: RateLimitConfig = { maxRequests: 15, windowSeconds: 60 },
 ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  return this.check(`user:${token}`, config);
 }
}
