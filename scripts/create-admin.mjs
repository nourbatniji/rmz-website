// Create (or reset the password of) an admin user.
//   pnpm admin:create you@example.com "a long password" "Your Name"
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

// .env.local (if present) wins over .env, same as Next.js, so a test database URL there is used instead of the real one.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const [, , emailArg, password, name] = process.argv;
const email = emailArg?.trim().toLowerCase();
if (!email || !password) {
  console.error('Usage: pnpm admin:create <email> "<password>" ["Name"]');
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (see .env.example).");
  process.exit(1);
}

// pg already treats sslmode=require as verify-full and warns about a future change; say verify-full to keep the behaviour and silence it.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL.replace(/([?&])sslmode=(?:require|prefer|verify-ca)(?=&|$)/, "$1sslmode=verify-full") });
await client.connect();
try {
  const hash = await bcrypt.hash(password, 12);
  const { rowCount } = await client.query(
    `INSERT INTO "AdminUser" ("id","email","passwordHash","name","failedLogins","createdAt")
     VALUES ($1,$2,$3,$4,0,NOW())
     ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "failedLogins" = 0, "lockedUntil" = NULL,
       "name" = COALESCE(EXCLUDED."name", "AdminUser"."name")`,
    [randomUUID(), email, hash, name ?? null],
  );
  console.log(rowCount ? `Admin ready: ${email}` : "Nothing changed.");
} finally {
  await client.end();
}
