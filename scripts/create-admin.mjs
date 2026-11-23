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
const connectionString = process.env.DATABASE_URL.replace(/([?&])sslmode=(?:require|prefer|verify-ca)(?=&|$)/, "$1sslmode=verify-full");

// Connect with a bounded wait and a few retries. Without a timeout a blocked/flaky network path leaves `node` hanging until the OS gives up
// (minutes) and then reports a bare AggregateError [ETIMEDOUT]; Neon computes can also need a moment to wake. TLS stays strict (verify-full).
async function connect(attempts = 4, timeoutMs = 15000) {
  for (let i = 1; ; i++) {
    const c = new pg.Client({ connectionString, connectionTimeoutMillis: timeoutMs });
    try {
      await c.connect();
      return c;
    } catch (e) {
      await c.end().catch(() => {});
      const why = e?.errors?.length ? [...new Set(e.errors.map((x) => x.code))].join(", ") : (e?.code ?? e?.message ?? "unknown error");
      if (i >= attempts) {
        const host = (() => { try { return new URL(connectionString).host; } catch { return "the database host"; } })();
        console.error(`Could not connect to ${host} after ${attempts} attempts (${why}). Check the network/VPN/firewall for outbound TCP 5432 from Node, and that the Neon project is active.`);
        process.exit(1);
      }
      console.error(`Connection attempt ${i}/${attempts} failed (${why}); retrying…`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}
const client = await connect();
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
