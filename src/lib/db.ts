import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * `pg` already treats sslmode=require/prefer/verify-ca as verify-full and warns that this will change in the next major version.
 * Saying "verify-full" ourselves keeps today's (strict) behaviour and silences the warning, without touching the .env value
 * (the Prisma CLI reads the same variable).
 */
function strictSsl(url: string | undefined): string | undefined {
  return url?.replace(/([?&])sslmode=(?:require|prefer|verify-ca)(?=&|$)/, "$1sslmode=verify-full");
}

function createClient() {
  // Small pool + timeouts suit serverless (Vercel) with Neon: few connections per server, fail fast instead of hanging.
  const adapter = new PrismaPg({ connectionString: strictSsl(process.env.DATABASE_URL), max: 5, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
