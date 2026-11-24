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
  // Local-only escape hatch for networks that block Postgres port 5432: connect over WebSocket on port 443 instead.
  // Enable with DB_OVER_WS=1 in .env.local. Production leaves it unset and keeps the normal pg connection.
  if (process.env.DB_OVER_WS === "1") {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const { neonConfig } = require("@neondatabase/serverless");
    neonConfig.webSocketConstructor = require("ws");
    /* eslint-enable @typescript-eslint/no-require-imports */
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
  }
  const adapter = new PrismaPg({ connectionString: strictSsl(process.env.DATABASE_URL), max: 5, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
