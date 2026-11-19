import "server-only";

/**
 * Small guard against password guessing: after too many wrong passwords from the same IP address,
 * that address must wait a minute. It never locks the account itself, so nobody can lock the team out by guessing.
 *
 * Honest limit: the counter lives in each server's memory, so on Vercel it slows guessing down but is not airtight.
 * For stronger protection also add a rate-limit rule for /admin/login in the Vercel dashboard (Firewall).
 */
const MAX_FAILURES = 10;
const WINDOW_MS = 60_000;
const MAX_TRACKED = 5_000;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  return (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
}

export function isBlocked(key: string, now = Date.now()): boolean {
  return recent(key, now).length >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()): void {
  if (failures.size >= MAX_TRACKED) failures.clear(); // keeps memory bounded under attack
  failures.set(key, [...recent(key, now), now]);
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
