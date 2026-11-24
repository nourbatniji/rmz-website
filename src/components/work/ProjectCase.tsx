import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import type { WorkContent, WorkProject } from "@/content/work-types";
import { resolveLayout, type BlockId } from "@/lib/work-layout";
import { artBackground, luminance } from "./art";
import "./work.css";

/**
 * Work project page — canvas "A · Project page, Alpha (brand case study)" (WorkA), desktop 1440 + mobile 390.
 * Editorial case study: head + meta, hero, 01 Brief, 02 Idea, 03 Execution (+ a module per category), 04 Outcome,
 * 05 Credits, then "Next project". All copy/images are demo placeholders until real content is supplied.
 */

type Props = { project: WorkProject; prev: WorkProject; next: WorkProject; contact: WorkContent["contact"]; seed: number };

const col = (v: string): CSSProperties => ({ gridColumn: v });
const rv = "wk-rv";

function Ph({ palette, seed, v, style, nolab, className = "" }: { palette: WorkProject["palette"]; seed: number; v: number; style?: CSSProperties; nolab?: boolean; className?: string }) {
  return <div className={`wk-ph ${nolab ? "nolab" : ""} ${className}`} style={{ background: artBackground(palette, seed, v), ...style }} />;
}

function Play({ label }: { label: string }) {
  return (
    <>
      <span className="wk-play" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 14 14"><path d="M2 1 L13 7 L2 13 Z" fill="#F3E8CC" /></svg>
      </span>
      <span className="t-meta wk-nm s">{label}</span>
    </>
  );
}

export function ProjectCase({ project: p, prev, next, contact, seed }: Props) {
  const pal = p.palette;
  const heading = (n: string, t: string) => <p className="t-meta wk-nm wk-y" style={col("1 / span 3")}>{n} — {t}</p>;
  const swatches = pal.map((c, i) => ({ c, name: ["Ground", "Deep", "Signal", "Ink"][i], t: luminance(c) > 0.55 ? "#0F0F0E" : "#F3E8CC" }));
  const idx = (n: number) => String(n).padStart(2, "0");
  const layout = resolveLayout(p.layout);
  // Numbered headings count only the blocks that are shown, so hiding one never leaves a gap (01, 02, 04…).
  const numbered: BlockId[] = ["brief", "idea", "execution", "outcome", "credits"];
  const order = layout.filter((b) => b.show && numbered.includes(b.id)).map((b) => b.id);
  const num = (id: BlockId) => String(order.indexOf(id) + 1).padStart(2, "0");

  const blocks: Record<BlockId, React.ReactNode> = {
    meta: (
      <section className="wk-px">
          <div className="wk-g12" style={{ marginTop: 40, rowGap: 20 }}>
              <div className="wk-meta" style={col("1 / span 3")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Client</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{p.client ?? "[Client name pending]"}</p></div>
              <div className="wk-meta" style={col("4 / span 4")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Services</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{p.services}</p></div>
              <div className="wk-meta" style={col("8 / span 2")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Year</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{p.year}</p></div>
              <div className="wk-meta" style={col("10 / span 3")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Status</p><p className="t-body wk-nl" style={{ marginTop: 6, color: "var(--color-orange)" }}>{p.copyStatus === "placeholder" ? "Demo project · placeholder copy" : "Published"}</p></div>
            </div>
      </section>
    ),
    hero: (
      <section className="wk-px">
          <div className={`wk-ph wk-hero ${p.image ? "real" : ""}`} style={{ marginTop: 40, aspectRatio: "21 / 9", background: p.image ? undefined : artBackground(pal, seed, 0) }}>
              {p.image && (
                // eslint-disable-next-line @next/next/no-img-element -- fixed-ratio hero, sized by its frame
                <img src={p.image.src} alt={p.image.alt} />
              )}
            </div>
      </section>
    ),
    brief: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`}>
          {heading(num("brief"), "The brief")}
          <p className="wk-stmt" style={col("5 / span 8")}>{p.brief}</p>
        </section>
    ),
    idea: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`} style={{ alignItems: "start" }}>
          <Ph palette={pal} seed={seed} v={1} style={{ ...col("1 / span 5"), aspectRatio: "4 / 5" }} />
          <div style={col("7 / span 6")}>
            <p className="t-meta wk-nm wk-y">{num("idea")} — The idea</p>
            <p className="t-display t-italic wk-nk" style={{ fontSize: "clamp(44px,6.4cqw,96px)", marginTop: 24, lineHeight: 0.95 }}>{p.idea}</p>
            <div className="wk-list" style={{ marginTop: 48 }}>
              {p.keys.map((k, i) => (<div key={k}><span className="t-meta wk-nm">{idx(i + 1)}</span><span>{k}</span></div>))}
            </div>
            <p className="t-meta wk-nm s" style={{ marginTop: 12, opacity: 0.7 }}>Fig. 02 — Concept frame. Demo copy.</p>
          </div>
        </section>
    ),
    execution: (
      <>
        <section className="wk-px wk-sec"><p className="t-meta wk-nm wk-y">{num("execution")} — The execution</p></section>
        <div className={rv} style={{ marginTop: 32 }}><Ph palette={pal} seed={seed} v={2} style={{ aspectRatio: "16 / 9" }} /></div>
        <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 24, alignItems: "start", rowGap: 24 }}>
          <Ph palette={pal} seed={seed} v={3} style={{ ...col("1 / span 7"), aspectRatio: "4 / 3" }} />
          <Ph palette={pal} seed={seed} v={4} style={{ ...col("9 / span 4"), aspectRatio: "3 / 4", marginTop: 120 }} />
        </section>
      </>
    ),
    showcase: (
      <>
        {p.category === "brand" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "stretch", rowGap: 24 }}>
            <div style={{ ...col("1 / span 7"), background: "var(--color-cream)", color: "var(--color-ink)", padding: 48, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 460 }}>
              <p className="t-meta wk-nm s">Logo system · placeholder wordmark</p>
              <p className="t-display wk-nk" style={{ fontSize: "clamp(80px,13cqw,210px)" }}>{p.name}</p>
              <p className="t-meta wk-nm s">Temporary type: Figtree · Playfair Display</p>
            </div>
            <div style={{ ...col("8 / span 5"), display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, alignContent: "stretch" }}>
              {swatches.map((s) => (<div key={s.name} className="wk-sw" style={{ background: s.c, color: s.t }}>{s.name}<br />{s.c}</div>))}
            </div>
          </section>
        )}
        {p.category === "camp" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "start", rowGap: 24 }}>
            <div className="wk-film" style={col("1 / span 8")}><Play label="Key film · video placeholder · 16:9" /></div>
            <div style={{ ...col("9 / span 4"), display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
              <Ph nolab palette={pal} seed={seed} v={6} style={{ aspectRatio: "9 / 16" }} />
              <Ph nolab palette={pal} seed={seed} v={1} style={{ aspectRatio: "9 / 16" }} />
              <p className="t-meta wk-nm s" style={{ gridColumn: "1 / -1", opacity: 0.7 }}>Reels · 9:16 placeholders</p>
            </div>
          </section>
        )}
        {p.category === "dig" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "end", rowGap: 24 }}>
            <div style={{ ...col("1 / span 8"), border: "1px solid rgb(243 232 204 / 0.45)" }}>
              <div style={{ height: 32, borderBottom: "1px solid rgb(243 232 204 / 0.45)", display: "flex", alignItems: "center", padding: "0 12px" }}>
                <span className="t-meta wk-nm s" style={{ fontSize: 9, opacity: 0.7 }}>Website overview · desktop 1440 · placeholder</span>
              </div>
              <Ph palette={pal} seed={seed} v={2} style={{ aspectRatio: "16 / 10" }} />
            </div>
            <div style={{ ...col("9 / span 4"), display: "flex", justifyContent: "center" }}>
              <div style={{ width: "62%", border: "2px solid var(--color-cream)", borderRadius: 26, padding: 8 }}>
                <Ph nolab palette={pal} seed={seed} v={6} style={{ aspectRatio: "9 / 19", borderRadius: 18 }} />
              </div>
            </div>
            <p className="t-meta wk-nm s" style={{ gridColumn: "1 / -1", opacity: 0.7 }}>Selected screens and responsive view. Interaction demo to be linked when the live site is verified.</p>
          </section>
        )}
        {p.category === "cont" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "start", rowGap: 24 }}>
            <div style={col("1 / span 4")}>
              <Ph palette={pal} seed={seed} v={1} style={{ aspectRatio: "1 / 1" }} />
              <Ph palette={pal} seed={seed} v={6} style={{ aspectRatio: "3 / 2", marginTop: 24 }} />
            </div>
            <div className="wk-film" style={col("5 / span 8")}><Play label="Production film · video placeholder" /></div>
          </section>
        )}
      </>
    ),
    strip: (
        <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 24, rowGap: 24 }}>
          <Ph nolab palette={pal} seed={seed} v={0} style={{ ...col("2 / span 3"), aspectRatio: "1 / 1" }} />
          <Ph nolab palette={pal} seed={seed} v={4} style={{ ...col("5 / span 3"), aspectRatio: "1 / 1" }} />
          <Ph palette={pal} seed={seed} v={3} style={{ ...col("8 / span 4"), aspectRatio: "1 / 1" }} />
        </section>
    ),
    outcome: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`}>
          {heading(num("outcome"), "The outcome")}
          <div style={col("5 / span 8")}>
            <p className="wk-stmt">What was delivered.</p>
            <div className="wk-list" style={{ marginTop: 32 }}>
              {p.deliverables.map((d, i) => (<div key={d}><span className="t-meta wk-nm">{idx(i + 1)}</span><span>{d}</span></div>))}
            </div>
            <p className="t-meta wk-nm s" style={{ marginTop: 16, opacity: 0.7 }}>No performance results have been supplied, so none are shown.</p>
          </div>
        </section>
    ),
    credits: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`} style={{ rowGap: 20 }}>
          {heading(num("credits"), "Credits")}
          <div style={{ ...col("5 / span 8"), display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "20px 24px" }}>
            {p.credits.map((c) => (
              <div key={c.role} className="wk-meta"><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>{c.role}</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{c.name ?? "[Name pending]"}</p></div>
            ))}
          </div>
        </section>
    ),
  };

  return (
    <div className="wk">
      <main className="wk-in">
        <section className="wk-top wk-px">
          <Link href="/#work-archive" className="t-meta wk-nm wk-back">← All work</Link>
          <div className="wk-g12" style={{ marginTop: 24, alignItems: "end" }}>
            <div style={col("1 / span 8")}>
              <p className="t-meta wk-nm wk-y">{p.number} · {p.discipline} · Demo project</p>
              <h1 className="t-display wk-nk" style={{ fontSize: "clamp(88px,19cqw,290px)", marginTop: 16 }}>{p.name}</h1>
            </div>
            <div style={{ ...col("9 / span 4"), paddingBottom: 10 }}><p className="t-body wk-nl">{p.about}</p></div>
          </div>
        </section>

        {layout.map((b) => (b.show ? <Fragment key={b.id}>{blocks[b.id]}</Fragment> : null))}

        <section className="wk-px" style={{ marginTop: 160, paddingBottom: 96 }}>
          <div className="wk-rule" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingTop: 20 }}>
            <Link href={`/work/${prev.slug}`} className="wk-chip">← Previous · {prev.name}</Link>
            <Link href="/#work-archive" className="wk-chip">Back to all work</Link>
            <a className="wk-cta" href={contact.href}>{contact.label}</a>
          </div>
          <Link href={`/work/${next.slug}`} className="wk-g12 wk-next" style={{ marginTop: 32 }} aria-label={`Next project ${next.number} ${next.name}`}>
            <div style={col("1 / span 6")}>
              <p className="t-meta wk-nm" style={{ color: "var(--color-red)" }}>Next project · {next.number}</p>
              <p className="t-display wk-nk" style={{ fontSize: "clamp(64px,10cqw,150px)", marginTop: 16 }}>{next.name}</p>
              <p className="t-meta wk-nm" style={{ marginTop: 16, fontSize: 11 }}>{next.discipline} · Demo project →</p>
            </div>
            <Ph palette={next.palette} seed={(seed + 1) % 10} v={0} style={{ ...col("7 / span 6"), aspectRatio: "16 / 10" }} />
          </Link>
        </section>
      </main>
    </div>
  );
}
