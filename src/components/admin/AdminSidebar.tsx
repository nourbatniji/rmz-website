"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/admin/auth-actions";
import { PAGE_ORDER, SECTION_META, type SectionKey } from "@/lib/admin/section-meta";

export type SectionDot = { key: SectionKey; tone: "ok" | "warn" | "bad" | "neutral" };

const ITEMS = [
  { href: "/admin", label: "Overview", exact: true, icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/admin/website", label: "Website", icon: "M3 5h18v14H3zM3 9h18" },
  { href: "/admin/work", label: "Projects", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { href: "/admin/messages", label: "Messages", icon: "M4 6h16v12H4zM4 7l8 6 8-6" },
] as const;

const DOT = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", neutral: "bg-fg/25" } as const;
const DOT_LABEL = { ok: "Published", warn: "Has unpublished changes", bad: "Needs fixing", neutral: "Original content" } as const;

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function AdminSidebar({ email, sections, unread }: { email: string; sections: SectionDot[]; unread: number }) {
  const pathname = usePathname();
  // The mobile menu is "open for" one page; navigating elsewhere closes it without any effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const toneOf = new Map(sections.map((s) => [s.key, s.tone]));
  const onWebsite = pathname.startsWith("/admin/website") || pathname.startsWith("/admin/homepage");
  const order: SectionKey[] = ["site", ...PAGE_ORDER];

  const links = (
    <ul className="grid gap-0.5">
      {ITEMS.map((it) => {
        const active = "exact" in it && it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`) || (it.href === "/admin/website" && pathname.startsWith("/admin/homepage"));
        const sectionPage = it.href === "/admin/website" && pathname.startsWith("/admin/website/");
        return (
          <li key={it.href}>
            <Link href={it.href} aria-current={active && !sectionPage ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active && !sectionPage ? "bg-accent/10 text-accent" : active ? "text-fg" : "text-fg/75 hover:bg-fg/6"}`}>
              <Icon d={it.icon} />
              <span className="flex-1">{it.label}</span>
              {it.href === "/admin/messages" && unread > 0 && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{unread}</span>}
            </Link>
            {it.href === "/admin/website" && onWebsite && (
              <ul aria-label="Website sections" className="mb-1 ml-5 mt-0.5 grid gap-0.5 border-l border-fg/10 pl-2">
                {order.map((k) => {
                  const here = pathname === `/admin/website/${k}` || pathname === `/admin/homepage/${k}`;
                  const tone = toneOf.get(k) ?? "neutral";
                  return (
                    <li key={k}>
                      <Link href={`/admin/website/${k}`} aria-current={here ? "page" : undefined} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${here ? "bg-accent/10 font-semibold text-accent" : "text-fg/70 hover:bg-fg/6"}`}>
                        <span title={DOT_LABEL[tone]} className={`h-2 w-2 shrink-0 rounded-full ${DOT[tone]}`} />
                        <span className="sr-only">{DOT_LABEL[tone]}: </span>
                        {SECTION_META[k].label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );

  const account = (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-fg/6 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-fg/10 text-xs font-bold uppercase">
          {email.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1 truncate text-left" title={email}>
          {email}
        </span>
        <span aria-hidden className="text-fg/40">⋯</span>
      </summary>
      <div className="absolute bottom-full left-0 right-0 mb-1 grid gap-0.5 rounded-lg border border-fg/12 bg-white p-1 shadow-lg">
        <a href="/" target="_blank" rel="noreferrer" className="rounded-md px-3 py-2 text-sm hover:bg-fg/6">
          View live site ↗
        </a>
        <form action={logout}>
          <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-fg/6">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );

  return (
    <>
      <nav aria-label="Dashboard" className="hidden border-r border-fg/10 bg-white/60 p-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        <p className="px-3 pb-4 pt-2 text-base font-black tracking-tight">
          RMZ <span className="font-medium text-fg/50">studio</span>
        </p>
        {links}
        <div className="mt-auto pt-4">{account}</div>
      </nav>

      <header className="sticky top-0 z-40 border-b border-fg/10 bg-paper/95 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <p className="text-base font-black tracking-tight">
            RMZ <span className="font-medium text-fg/50">studio</span>
          </p>
          <button type="button" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpenFor(open ? null : pathname)} className="ml-auto rounded-md border border-fg/20 bg-white px-3 py-1.5 text-sm font-medium">
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Dashboard" className="grid max-h-[80vh] gap-3 overflow-y-auto border-t border-fg/10 bg-white p-3">
            {links}
            <div className="border-t border-fg/10 pt-2">{account}</div>
          </nav>
        )}
      </header>
    </>
  );
}
