// One-time, careful initialisation of a REMOTE (production) database with the committed migrations, then the first admin account.
//   pnpm db:init-prod        (run it in your own terminal; it is interactive)
//
// - The connection string is typed HIDDEN, lives only in this process and the child processes it starts, and is never printed (only the host name is shown) or written to a file.
//   Your .env / .env.local (the local Neon database) are not read or changed: the variable is passed to the children explicitly and dotenv never overrides it.
// - It first INSPECTS the database (tables, migration history, row counts) and stops on anything unexpected (schema drift, unknown migrations, a failed migration, data in the old starter tables
//   that migration 20261119160000_admin_cms drops). Only `prisma migrate deploy` is used: never migrate dev, db push or reset.
// - Then it asks for your admin email and password (hidden) and runs the existing admin:create workflow against the same database.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import pg from "pg";
import { ask, askHidden, requireTty } from "./prompt.mjs";

requireTty();
const KNOWN = readdirSync("prisma/migrations", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const LEGACY = ["Project", "ProjectImage", "Category"]; // starter tables dropped by migration 2 (their content was scaffolding)

const raw = await askHidden("Production DATABASE_URL (direct connection string, hidden): ");
if (!/^postgres(ql)?:\/\//i.test(raw)) {
  console.error("That does not look like a postgres:// connection string. Nothing was done.");
  process.exit(1);
}
const url = raw.replace(/([?&])sslmode=(?:require|prefer|verify-ca)(?=&|$)/, "$1sslmode=verify-full");
const host = (() => { try { return new URL(raw).host; } catch { return "(unreadable host)"; } })();
console.log(`\nTarget host: ${host}`);
console.log("Compare it with the Prisma Postgres store connected to the Vercel project 'rmz' (store 'prisma-postgres-cerise-ridge') before continuing.");
if ((await ask("Is this the production rmz database? Type 'yes' to continue: ")) !== "yes") {
  console.log("Stopped. Nothing was done.");
  process.exit(0);
}

async function inspect() {
  const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 });
  await c.connect();
  try {
    const tables = (await c.query(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`)).rows.map((r) => r.table_name);
    const counts = {};
    for (const t of tables) counts[t] = Number((await c.query(`select count(*)::int as n from "${t.replace(/"/g, '""')}"`)).rows[0].n);
    let history = null;
    if (tables.includes("_prisma_migrations")) {
      history = (await c.query(`select migration_name, finished_at is not null as finished, rolled_back_at is not null as rolled_back from _prisma_migrations order by started_at`)).rows;
    }
    return { tables, counts, history };
  } finally {
    await c.end();
  }
}

let before;
try {
  before = await inspect();
} catch (e) {
  console.error(`Could not connect/inspect (${e?.code ?? e?.message ?? "unknown error"}). Nothing was changed.`);
  process.exit(1);
}
console.log("\nTables in schema public:", before.tables.length ? before.tables.map((t) => `${t} (${before.counts[t]} rows)`).join(", ") : "(none)");
console.log("Migration history:", before.history ? (before.history.length ? before.history.map((h) => `${h.migration_name}${h.finished && !h.rolled_back ? "" : " [NOT FINISHED]"}`).join(", ") : "(table exists, empty)") : "(no _prisma_migrations table)");

const stop = (why) => {
  console.error(`\nSTOPPED: ${why}\nNothing was changed. Send me this summary (it contains no secrets) and we will decide the next step.`);
  process.exit(1);
};
const userTables = before.tables.filter((t) => t !== "_prisma_migrations");
if (!before.history && userTables.length) stop("the database has tables but no migration history (schema drift / not created by these migrations).");
if (before.history) {
  const unknown = before.history.filter((h) => !KNOWN.includes(h.migration_name));
  if (unknown.length) stop(`the database has migrations this project does not know: ${unknown.map((h) => h.migration_name).join(", ")}.`);
  if (before.history.some((h) => !h.finished || h.rolled_back)) stop("a previous migration did not finish or was rolled back; it needs a manual look.");
}
const applied = new Set((before.history ?? []).map((h) => h.migration_name));
const pending = KNOWN.filter((m) => !applied.has(m));
if (pending.includes("20261119160000_admin_cms")) {
  const full = LEGACY.filter((t) => before.counts[t] > 0);
  if (full.length) stop(`the old starter tables ${full.join(", ")} contain rows and migration 20261119160000_admin_cms would DROP them.`);
}
if (!pending.length) console.log("\nAll migrations are already applied; nothing to deploy.");
else {
  console.log(`\nPending migrations (reviewed: create tables/indexes; the only drops are the empty/non-existent starter tables): ${pending.join(", ")}`);
  if ((await ask("Type 'apply' to run `prisma migrate deploy` on this database: ")) !== "apply") {
    console.log("Stopped. Nothing was changed.");
    process.exit(0);
  }
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  if (r.status !== 0) stop("prisma migrate deploy failed (see its message above).");
}

const after = await inspect();
const done = KNOWN.every((m) => after.history?.some((h) => h.migration_name === m && h.finished && !h.rolled_back));
const need = ["AdminUser", "SiteSection", "Project", "Media", "ContactMessage"].filter((t) => !after.tables.includes(t));
console.log(`\nVerified: all ${KNOWN.length} migrations applied = ${done}; missing tables = ${need.length ? need.join(", ") : "none"}.`);
if (!done || need.length) stop("verification failed.");

if (after.counts.AdminUser > 0) console.log(`AdminUser already has ${after.counts.AdminUser} account(s).`);
if ((await ask("Create (or reset the password of) an admin account now? Type 'yes': ")) === "yes") {
  const r = spawnSync("node", ["scripts/create-admin.mjs"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  if (r.status !== 0) stop("admin creation failed.");
  const fin = await inspect();
  console.log(`Verified: AdminUser rows = ${fin.counts.AdminUser}.`);
}
console.log("\nDone. No redeploy is needed. Open the production entry page and sign in.");
