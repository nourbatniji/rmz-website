import { Suspense } from "react";
import { AdminSidebar, type SectionDot } from "@/components/admin/AdminSidebar";
import { getSectionStates } from "@/lib/admin/section-status";
import { requireAdmin } from "@/lib/admin/session";
import { db } from "@/lib/db";

/** Every page under /admin (except login and preview) renders inside this shell. The session check happens HERE, on the server. */
export default function AdminAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="admin-ui min-h-screen p-8 text-sm text-fg/60">Loading…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  // The sidebar's status dots and unread badge are nice-to-have: a database hiccup must not take the whole shell down.
  const [states, unread] = await Promise.all([getSectionStates().catch(() => []), db.contactMessage.count({ where: { read: false } }).catch(() => 0)]);
  const sections: SectionDot[] = states.map((s) => ({ key: s.key, tone: s.invalid ? "bad" : s.fromDefault ? "neutral" : s.draftChanges ? "warn" : "ok" }));
  return (
    <div className="admin-ui min-h-screen lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <AdminSidebar email={session.email} sections={sections} unread={unread} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
    </div>
  );
}
