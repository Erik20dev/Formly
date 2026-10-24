
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redis: Redis | undefined;
let loginLimiter: Ratelimit | undefined;
let publicLimiter: Ratelimit | undefined;

function getRedis(): Redis {
  if (redis) return redis;

  const rawUrl = process.env.UPSTASH_REDIS_REST_URL
    ?.trim()
    .replace(/^["']+|["']+$/g, "");

  const token = process.env.UPSTASH_REDIS_REST_TOKEN
    ?.trim()
    .replace(/^["']+|["']+$/g, "");

  if (!rawUrl || !token) {
    throw new Error("Upstash rate limiting is not configured.");
  }

  const markdownMatch = rawUrl.match(
    /^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/
  );

  const url = markdownMatch ? markdownMatch[2] : rawUrl;
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Upstash Redis REST URL is invalid.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Upstash Redis REST URL must use HTTPS.");
  }

  redis = new Redis({ url: parsedUrl.toString(), token });
  return redis;
}

export function checkLoginRateLimit(ip: string) {
  if (!loginLimiter) {
    loginLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "formly:login",
    });
  }

  return loginLimiter.limit(ip);
}
let uploadLimiter: Ratelimit | undefined;

export function checkUploadRateLimit(ip: string) {
  if (!uploadLimiter) {
    uploadLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "formly:uploads",
    });
  }

  return uploadLimiter.limit(ip);
}
export function checkPublicRateLimit(key: string) {
  if (!publicLimiter) {
    publicLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "formly:public",
    });
  }

  return publicLimiter.limit(key);
}
