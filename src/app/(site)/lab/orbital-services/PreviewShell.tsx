"use client";

import { useState } from "react";
import type { LensContent, ServiceTaxonomyItem } from "@/content/types";
import { OrbitServices, type OrbitVariant } from "@/components/lens-orbit/OrbitServices";

const OPTIONS: { id: OrbitVariant; label: string; hint: string }[] = [
  { id: "A", label: "A · Scroll-linked", hint: "sticky scene, native scroll" },
  { id: "B", label: "B · Interactive", hint: "click · prev/next · drag" },
  { id: "M", label: "Mobile", hint: "390 px frame" },
];

/** Preview-only: switches the SAME composition between the two desktop behaviours and the mobile adaptation. Not part of the site. */
export function PreviewShell({ content, services, initial }: { content: LensContent; services: ServiceTaxonomyItem[]; initial: OrbitVariant }) {
  const [v, setV] = useState<OrbitVariant>(initial);
  const pick = (id: OrbitVariant) => {
    setV(id);
    const u = new URL(window.location.href);
    u.searchParams.set("v", id);
    window.history.replaceState(null, "", u);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <main id="top" style={{ background: "#0f0f0e" }}>
      <div className="orb-switch" role="group" aria-label="Preview variant (preview only)">
        <span>Preview</span>
        {OPTIONS.map((o) => (
          <button key={o.id} type="button" aria-pressed={v === o.id} onClick={() => pick(o.id)} title={o.hint}>
            {o.label}
          </button>
        ))}
      </div>
      <section className="orb-stub" aria-label="Previous section (stub)">
        <p>Previous section · stub</p>
      </section>
      {v === "M" ? (
        <div className="orb-frame">
          <OrbitServices key="M" content={content} services={services} variant="M" />
        </div>
      ) : (
        <OrbitServices key={v} content={content} services={services} variant={v} />
      )}
      <section className="orb-stub orb-next" aria-label="Next section (stub)">
        <p>Next section · stub — the services scene releases here</p>
      </section>
      <style>{`
        .orb-switch{position:fixed;z-index:60;left:14px;bottom:14px;display:flex;gap:6px;align-items:center;background:#0f0f0e;border:1px solid #f3e8cc;padding:6px;font:700 11px var(--font-sans);letter-spacing:.12em;text-transform:uppercase;color:#f3e8cc}
        .orb-switch span{padding:0 10px;opacity:.7}
        .orb-switch button{border:1px solid transparent;background:transparent;color:#f3e8cc;font:inherit;letter-spacing:inherit;text-transform:inherit;padding:9px 12px;cursor:pointer}
        .orb-switch button[aria-pressed="true"]{background:#f3e8cc;color:#0f0f0e}
        .orb-stub{display:grid;place-items:center;min-height:58svh;padding:calc(var(--header-h) + 24px) var(--gutter) 24px;background:#0f0f0e;color:rgba(243,232,204,.6);font:700 12px var(--font-sans);letter-spacing:.16em;text-transform:uppercase}
        .orb-next{min-height:90svh;align-items:start}
        .orb-frame{width:390px;max-width:100%;margin:0 auto;border-left:1px solid #f3e8cc;border-right:1px solid #f3e8cc}
        @media (max-width:899px){.orb-switch{display:none}}
      `}</style>
    </main>
  );
}
