import { config } from "dotenv";

// .env.local (if present) wins over .env, same as Next.js. Put a TEST database URL there to keep tests away from the real database.
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Not required just to generate the client (install/build); migrations still need a real DATABASE_URL and fail clearly without one.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
