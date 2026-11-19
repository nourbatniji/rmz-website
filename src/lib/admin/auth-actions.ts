"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginPath } from "./entry";
import { clearFailures, isBlocked, recordFailure } from "./rate-limit";
import { createSession, destroySession } from "./session";

export type LoginState = { error?: string };

// A real bcrypt hash of a random string: compared when the email is unknown so timing does not reveal valid emails.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomUUID(), 12));

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  if (email.length > 254 || password.length > 200) return { error: "That email and password don't match." };

  const key = await clientKey();
  if (isBlocked(key)) return { error: "Too many wrong attempts. Wait a minute and try again." };

  let user;
  try {
    user = await db.adminUser.findUnique({ where: { email } });
  } catch (e) {
    // Log the real cause server-side (terminal / Vercel logs) so this message is diagnosable. Never shown to the visitor.
    console.error("[admin login] database error:", e instanceof Error ? `${e.name}: ${e.message}` : e);
    return { error: "Can't reach the database right now. Try again in a moment." };
  }

  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) {
    recordFailure(key);
    return { error: "That email and password don't match." };
  }

  clearFailures(key);
  await createSession(user.id);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect(loginPath());
}
