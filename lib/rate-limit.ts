
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error("Upstash rate limiting is not configured.");
}

const redis = new Redis({ url, token });

const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "formly:login",
});

export async function checkLoginRateLimit(ip: string) {
  return loginLimiter.limit(ip);
}
