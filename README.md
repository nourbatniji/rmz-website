This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## RMZ setup notes

```bash
pnpm install
DATABASE_URL="postgresql://u:p@localhost:5432/x" pnpm db:generate   # local codegen only; no DB connection, no migration
pnpm lint && pnpm typecheck && pnpm build
```
`pnpm typecheck`/`build` fail until the Prisma client is generated (it lives in the gitignored `src/generated`).
Homepage content is read only through `src/lib/content/homepage.ts` (development content in `src/content/dev/`).
Missing media -> labelled dev placeholders; see `docs/asset-checklist.md`, `docs/homepage-sections.md`, `TASKS.md`.

## Admin dashboard

The studio manager lives under `/admin` (full guide: `docs/admin-dashboard.md`). It has no public sign-in page and no public sign-up.

**Environment variables** (copy `.env.example` to `.env`; never commit `.env`):

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `SESSION_SECRET` | Long random string that signs admin sessions |
| `ADMIN_ENTRY` | Long random word: the private sign-in address is `/enter/<ADMIN_ENTRY>` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read-write token, needed for image and video uploads |

**Signing in:** `/admin` and `/admin/login` answer 404 to anyone who is not signed in. Open `http://localhost:3000/enter/<ADMIN_ENTRY>` (bookmark it).
In production, with `ADMIN_ENTRY` unset, nobody can reach the sign-in page. Locally, with it unset, `/admin/login` works.

**Adding an admin (there is no sign-up page):** run this in the project folder, then send the person the private address and their password through a safe channel.

```bash
pnpm admin:create new.person@example.com "a password of 12+ characters" "Their Name"
```

- It creates the account in whichever database `DATABASE_URL` points to. Check which one before you run it.
- Running it again for an existing email resets that person's password.
- Each person signs in with their own email and password.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
