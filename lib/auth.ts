
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "formly_admin_session";
const SESSION_DURATION = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest("hex");
}

export async function createAdminSession() {
  const expiresAt = Date.now() + SESSION_DURATION * 1000;
  const value = String(expiresAt);
  const signature = sign(value);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, `${value}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return false;

  const [value, signature, extra] = token.split(".");
  if (!value || !signature || extra !== undefined) return false;

  const expiresAt = Number(value);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  try {
    const expected = sign(value);
    const actualBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
