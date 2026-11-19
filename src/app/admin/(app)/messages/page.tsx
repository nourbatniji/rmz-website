import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/session";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireAdmin();
  const rows = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black tracking-tight">Messages</h1>
      <p className="mb-5 mt-1 text-sm text-fg/60">Enquiries sent through the site&apos;s contact form.</p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-fg/12 p-5 text-sm text-fg/70">No messages yet. The public contact form isn&apos;t built, so nothing arrives here until it is.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((m) => (
            <li key={m.id} className="rounded-lg border border-fg/12 p-4">
              <p className="text-sm font-semibold">
                {m.name} <a href={`mailto:${m.email}`} className="font-normal text-fg/60 underline underline-offset-2">{m.email}</a>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-fg/80">{m.message}</p>
              <p className="mt-2 text-xs text-fg/45">{m.createdAt.toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
