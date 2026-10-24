import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isBlockedIpv4(hostname: string): boolean {
  if (isIP(hostname) !== 4) return false;

  const [a, b, c] = hostname.split(".").map(Number);

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isBlockedIpv6(hostname: string): boolean {
  const address = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (isIP(address) !== 6) return false;

  // Block loopback, unspecified, unique-local, and link-local ranges.
  return (
    address === "::" ||
    address === "::1" ||
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    /^fe[89ab]/.test(address) ||
    address.startsWith("ff") ||
    address.startsWith("::ffff:")
  );
}

export function validateWebhookUrl(destination: string): URL {
  let url: URL;

  try {
    url = new URL(destination);
  } catch {
    throw new Error("Webhook destination is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Webhook destination must use HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error(
      "Webhook URLs must not contain embedded credentials."
    );
  }

  const hostname = url.hostname.toLowerCase();
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isBlockedIpv4(normalizedHostname) ||
    isBlockedIpv6(normalizedHostname)
  ) {
       throw new Error(
      isBlockedIpv4(normalizedHostname)
        ? "Webhook destination cannot use a private or reserved IPv4 address."
        : "Webhook destination cannot use a local or internal hostname."
    );
  }

  return url;
}