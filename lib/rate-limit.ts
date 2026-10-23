
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let loginLimiter: Ratelimit | undefined;

function getLoginLimiter(): Ratelimit {
  if (loginLimiter) {
    return loginLimiter;
  }

  const rawUrl = process.env.UPSTASH_REDIS_REST_URL
    ?.trim()
    .replace(/^["']+|["']+$/g, "");

  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!rawUrl || !token) {
    throw new Error("Upstash rate limiting is not configured.");
  }

  // Handle an accidentally saved Markdown link.
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

  const redis = new Redis({ url: parsedUrl.toString(), token });

  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "formly:login",
  });

  return loginLimiter;
}

export async function checkLoginRateLimit(ip: string) {
  return getLoginLimiter().limit(ip);
}
