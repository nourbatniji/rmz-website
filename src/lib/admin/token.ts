import { jwtVerify, SignJWT } from "jose";

/** Signing and checking the admin session token. Shared by the session helpers and by proxy.ts. No database, no cookies here. */
export const SESSION_COOKIE = "rmz_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  return new TextEncoder().encode(s);
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

/** The user id inside a valid, unexpired token, or null for anything else (forged, expired, missing secret). */
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
