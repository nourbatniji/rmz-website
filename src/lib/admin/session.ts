import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loginPath } from "./entry";
import { SESSION_COOKIE, SESSION_MAX_AGE, signToken, verifyToken } from "./token";

export type AdminSession = { userId: string; email: string; name: string | null };

export async function createSession(userId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await signToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in admin, or null. Verifies the cookie AND that the user still exists. Checked once per page render. */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  try {
    const user = await db.adminUser.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
    return user ? { userId: user.id, email: user.email, name: user.name } : null;
  } catch {
    return null;
  }
});

/**
 * For pages: redirects to the login page when signed out.
 * Call it at the TOP OF EVERY ADMIN PAGE. A layout check is not enough (Next.js renders pages and layouts separately).
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect(loginPath());
  return session;
}

/** For server actions and route handlers: throws instead of redirecting. Call it first in EVERY admin write. */
export async function requireAdminAction(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new Error("Your session expired. Sign in again.");
  return session;
}
