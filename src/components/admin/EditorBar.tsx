"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill, timeAgo, type Tone } from "./ui";

/** The one action area shared by every editor: title, status, last saved time, buttons, and a message line. */
export function EditorBar({
  backHref,
  backLabel,
  title,
  about,
  pill,
  savedAt,
  message,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  about?: string;
  pill: { tone: Tone; text: string };
  savedAt: string | null;
  message: { tone: "ok" | "error"; text: string } | null;
  children: React.ReactNode;
}) {
  // Rendered after mount so the server and the browser never disagree about "now".
  const [now, setNow] = useState(0);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return (
    <div className="sticky top-[49px] z-20 -mx-4 mb-5 border-b border-fg/10 bg-paper/95 px-4 pb-3 pt-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8 lg:pt-0">
      <Link href={backHref} className="text-sm text-fg/60 hover:text-fg">
        ← {backLabel}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
        <span aria-live="polite">
          <StatusPill tone={pill.tone}>{pill.text}</StatusPill>
        </span>
        {now > 0 && <span className="text-xs text-fg/55">{timeAgo(savedAt, now)}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      </div>
      {about && <p className="mt-1 text-sm text-fg/60">{about}</p>}
      <div aria-live="polite" className="min-h-5 pt-1 text-sm">
        {message && <span className={message.tone === "ok" ? "text-ok" : "text-bad"}>{message.text}</span>}
      </div>
    </div>
  );
}
