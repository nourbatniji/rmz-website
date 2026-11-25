import Link from "next/link";
import type { FooterContent } from "@/content/closing-types";
import "./footer-compact.css";

/**
 * Compact footer — the flat state the home page's unfolding footer opens into (canvas "FOOTER OPTION B"): one continuous cream band,
 * four plain columns (brand + email · Explore · What we do · Elsewhere) and a thin bar underneath. Fully fluid, no artboard:
 * 4 columns ≥ 1024 px, 2 columns on tablets, single column with two-up link lists on phones.
 * Used on the project pages, and as the stacked version of FooterUnfold below 1024 px. Anchor: #contact (id prop).
 */
const external = (href: string) => /^https?:/.test(href);
const ext = (href: string) => (external(href) ? { target: "_blank", rel: "noopener noreferrer" } : {});

export function FooterCompact({ content, id = "contact" }: { content: FooterContent; id?: string }) {
  return (
    <footer id={id} className="fc-root" aria-label={content.label}>
      <div className="fc-grid">
        <div className="fc-brand">
          <Link href="/#top" className="fc-lg" aria-label="RMZ — home">RMZ<span>.</span></Link>
          <p className="fc-lead">{content.studio.body}</p>
          <a className="fc-mail" href={`mailto:${content.email}`}>{content.email} <span aria-hidden="true">↗</span></a>
        </div>
        <nav className="fc-col" aria-label={content.explore.heading}>
          <p className="fc-k">{content.explore.heading}</p>
          {content.explore.links.map((l) => <a key={l.label} className="fc-lk" href={l.href}>{l.label}</a>)}
        </nav>
        <div className="fc-col">
          <p className="fc-k">{content.services.heading}</p>
          {content.services.items.map((s) => <span key={s} className="fc-sv">{s}</span>)}
        </div>
        <div className="fc-col fc-els">
          <p className="fc-k">{content.elsewhere.heading}</p>
          {content.elsewhere.links.map((l) => <a key={l.label} className="fc-lk" href={l.href} {...ext(l.href)}>{l.label} <span aria-hidden="true">↗</span></a>)}
        </div>
      </div>
      <div className="fc-bar">
        <p>{content.copyright}</p>
        <p>{content.placeholderNote}</p>
        <Link href="/#top" className="fc-up">{content.toTop}</Link>
      </div>
    </footer>
  );
}
