import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import type { WorkContent, WorkProject } from "@/content/work-types";
import { blockIsEmpty, hiddenSet, resolveLayout, textOf, type BlockId } from "@/lib/work-layout";
import { luminance } from "./art";
import { ProjectMotion } from "./ProjectMotion";
import "./work.css";

/**
 * Work project page — canvas "A · Project page, Alpha (brand case study)" (WorkA), desktop 1440 + mobile 390.
 * Editorial case study: head + meta, hero, 01 Brief, 02 Idea, 03 Execution (+ a module per category), 04 Outcome,
 * 05 Credits, then "Next project". All copy/images are demo placeholders until real content is supplied.
 */

type Props = { project: WorkProject; prev: WorkProject; next: WorkProject; contact: WorkContent["contact"]; seed: number; /** Dashboard preview only: tag every picture slot (data-slot) so the editor can label it and link it to its uploader. */ editing?: boolean };

const col = (v: string): CSSProperties => ({ gridColumn: v });
const rv = "wk-rv";

/** An empty picture slot: a plain flat frame (no generated art) until a real image is added in the dashboard. */
function Ph({ style, slot }: { style?: CSSProperties; slot?: string }) {
  return <div className="wk-ph flat" style={style} data-slot={slot} />;
}

function Play({ label }: { label: string }) {
  return (
    <>
      <span className="wk-play" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 14 14"><path d="M2 1 L13 7 L2 13 Z" fill="#0F0F0E" /></svg>
      </span>
      <span className="t-meta wk-nm s">{label}</span>
    </>
  );
}

export function ProjectCase({ project: p, prev, next, contact, editing }: Props) {
  const film = p.video?.src ? <video className="wk-vid" src={p.video.src} controls playsInline preload="metadata" /> : null;
  const pal = p.palette;
  const heading = (n: string, t: string) => <p className="t-meta wk-nm wk-y" style={col("1 / span 3")}>{n} — {t}</p>;
  const swatches = pal.map((c, i) => ({ c, name: ["Ground", "Deep", "Signal", "Ink"][i], t: luminance(c) > 0.55 ? "#0F0F0E" : "#F3E8CC" }));
  const idx = (n: number) => String(n).padStart(2, "0");
  // Headline pattern used across the site: heavy Figtree caps, with the last word in the Playfair italic accent.
  const ideaWords = p.idea.trim().split(/\s+/);
  const ideaEnd = ideaWords.pop() ?? "";
  const ideaLead = ideaWords.join(" ");
  const hidden = hiddenSet(p.hidden);
  const on = (id: string) => !hidden.has(id);
  const T = (id: string, def: string) => textOf(p.texts, id, def);
  /** In the dashboard preview every text part is tagged so it can be outlined and matched to its field. */
  const dp = (id: string) => (editing ? ({ "data-part": id } as const) : {});
  /** An empty frame, the real picture, or nothing when it was deleted in the dashboard. */
  const pic = (id: string, style: CSSProperties) => {
    if (!on(id)) return null;
    const im = p.images?.[id];
    if (!im?.src) return <Ph style={style} slot={editing ? id : undefined} />;
    return (
      <div className="wk-ph real" style={style} data-slot={editing ? id : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-ratio frame, sized by its container */}
        <img src={im.src} alt={im.alt} />
      </div>
    );
  };
  // A block whose every part was deleted, or that was hidden, is left off the page.
  const layout = resolveLayout(p.layout).filter((b) => b.show && !blockIsEmpty(b.id, p.category, hidden));
  // Numbered headings count only the blocks that are shown, so hiding one never leaves a gap (01, 02, 04…).
  const numbered: BlockId[] = ["brief", "idea", "execution", "outcome", "credits"];
  const order = layout.filter((b) => numbered.includes(b.id)).map((b) => b.id);
  const num = (id: BlockId) => String(order.indexOf(id) + 1).padStart(2, "0");

  const blocks: Record<BlockId, React.ReactNode> = {
    meta: (
      <section className="wk-px">
          <div className="wk-g12" style={{ marginTop: 40, rowGap: 20 }}>
              {on("meta.client") && <div {...dp("meta.client")} className="wk-meta" style={col("1 / span 3")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Client</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{p.client ?? "[Client name pending]"}</p></div>}
              {on("meta.services") && <div {...dp("meta.services")} className="wk-meta" style={col("4 / span 4")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Services</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{p.services}</p></div>}
              {on("meta.year") && <div {...dp("meta.year")} className="wk-meta" style={col("8 / span 2")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Year</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{p.year}</p></div>}
              {on("meta.status") && <div {...dp("meta.status")} className="wk-meta" style={col("10 / span 3")}><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>Status</p><p className="t-body wk-nl" style={{ marginTop: 6, color: "var(--color-orange)" }}>{T("meta.statusText", p.copyStatus === "placeholder" ? "Demo project · placeholder copy" : "Published")}</p></div>}
            </div>
      </section>
    ),
    hero: (
      <section className="wk-px">
          <div className={`wk-ph wk-hero ${p.image ? "real" : "flat"}`} style={{ marginTop: 40, aspectRatio: "21 / 9" }} data-slot={editing ? "hero.image" : undefined}>
              {p.image && (
                // eslint-disable-next-line @next/next/no-img-element -- fixed-ratio hero, sized by its frame
                <img src={p.image.src} alt={p.image.alt} />
              )}
            </div>
      </section>
    ),
    brief: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`}>
          {heading(num("brief"), T("brief.heading", "The brief"))}
          {on("brief.text") && <p {...dp("brief.text")} className="wk-stmt" style={col("5 / span 8")}>{p.brief}</p>}
        </section>
    ),
    idea: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`} style={{ alignItems: "start" }}>
          {pic("idea.image", { ...col("1 / span 5"), aspectRatio: "4 / 5" })}
          <div style={col("7 / span 6")}>
            <p className="t-meta wk-nm wk-y">{num("idea")} — {T("idea.heading", "The idea")}</p>
            {on("idea.text") && <p {...dp("idea.text")} className="t-display wk-nk" style={{ fontSize: "clamp(34px,4.8cqw,72px)", marginTop: 24, lineHeight: 0.95 }}>
              {ideaLead}{ideaLead && " "}<span className="t-italic wk-y" style={{ fontSize: "1.05em" }}>{ideaEnd}</span>
            </p>}
            {on("idea.keys") && (
              <div {...dp("idea.keys")} className="wk-list" style={{ marginTop: 48 }}>
                {p.keys.map((k, i) => (<div key={k}><span className="t-meta wk-nm">{idx(i + 1)}</span><span>{k}</span></div>))}
              </div>
            )}
            {on("idea.caption") && <p {...dp("idea.caption")} className="t-meta wk-nm s" style={{ marginTop: 12, opacity: 0.7 }}>{T("idea.caption", "Fig. 02 — Concept frame. Demo copy.")}</p>}
          </div>
        </section>
    ),
    execution: (
      <>
        <section className="wk-px wk-sec"><p className="t-meta wk-nm wk-y">{num("execution")} — {T("execution.heading", "The execution")}</p></section>
        {on("execution.image1") && <div className={rv} style={{ marginTop: 32 }}>{pic("execution.image1", { aspectRatio: "16 / 9" })}</div>}
        {(on("execution.image2") || on("execution.image3")) && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 24, alignItems: "start", rowGap: 24 }}>
            {pic("execution.image2", { ...col("1 / span 7"), aspectRatio: "4 / 3" })}
            {pic("execution.image3", { ...col("9 / span 4"), aspectRatio: "3 / 4", marginTop: 120 })}
          </section>
        )}
      </>
    ),
    showcase: (
      <>
        {p.category === "brand" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "stretch", rowGap: 24 }}>
            {on("showcase.logo") && (
              <div style={{ ...col("1 / span 7"), background: "var(--color-cream)", color: "var(--color-ink)", padding: 48, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 460 }}>
                <p className="t-meta wk-nm s">{T("showcase.logoTop", "Logo system · placeholder wordmark")}</p>
                <p className="t-display wk-nk" style={{ fontSize: "clamp(60px,10cqw,160px)" }}>{p.name}</p>
                <p className="t-meta wk-nm s">{T("showcase.logoBottom", "Temporary type: Figtree · Playfair Display")}</p>
              </div>
            )}
            {on("showcase.swatches") && (
              <div style={{ ...col("8 / span 5"), display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, alignContent: "stretch" }}>
                {swatches.map((s) => (<div key={s.name} className="wk-sw" style={{ background: s.c, color: s.t }}>{s.name}<br />{s.c}</div>))}
              </div>
            )}
          </section>
        )}
        {p.category === "camp" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "start", rowGap: 24 }}>
            {on("showcase.film") && <div className="wk-film" style={col("1 / span 8")}>{film ?? <Play label="Key film · video placeholder · 16:9" />}</div>}
            {(on("showcase.image1") || on("showcase.image2")) && (
              <div style={{ ...col("9 / span 4"), display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                {pic("showcase.image1", { aspectRatio: "9 / 16" })}
                {pic("showcase.image2", { aspectRatio: "9 / 16" })}
                {on("showcase.caption") && <p {...dp("showcase.caption")} className="t-meta wk-nm s" style={{ gridColumn: "1 / -1", opacity: 0.7 }}>{T("showcase.caption", "Reels · 9:16 placeholders")}</p>}
              </div>
            )}
          </section>
        )}
        {p.category === "dig" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "end", rowGap: 24 }}>
            {on("showcase.image1") && (
              <div style={{ ...col("1 / span 8"), border: "1px solid rgb(243 232 204 / 0.45)" }}>
                <div style={{ height: 32, borderBottom: "1px solid rgb(243 232 204 / 0.45)", display: "flex", alignItems: "center", padding: "0 12px" }}>
                  <span className="t-meta wk-nm s" style={{ fontSize: 9, opacity: 0.7 }}>{T("showcase.frameLabel", "Website overview · desktop 1440 · placeholder")}</span>
                </div>
                {pic("showcase.image1", { aspectRatio: "16 / 10" })}
              </div>
            )}
            {on("showcase.image2") && (
              <div style={{ ...col("9 / span 4"), display: "flex", justifyContent: "center" }}>
                <div style={{ width: "62%", border: "2px solid var(--color-cream)", borderRadius: 26, padding: 8 }}>
                  {pic("showcase.image2", { aspectRatio: "9 / 19", borderRadius: 18 })}
                </div>
              </div>
            )}
            {(on("showcase.image1") || on("showcase.image2")) && on("showcase.caption") && (
              <p {...dp("showcase.caption")} className="t-meta wk-nm s" style={{ gridColumn: "1 / -1", opacity: 0.7 }}>{T("showcase.caption", "Selected screens and responsive view. Interaction demo to be linked when the live site is verified.")}</p>
            )}
          </section>
        )}
        {p.category === "cont" && (
          <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 120, alignItems: "start", rowGap: 24 }}>
            {(on("showcase.image1") || on("showcase.image2")) && (
              <div style={col("1 / span 4")}>
                {pic("showcase.image1", { aspectRatio: "1 / 1" })}
                {pic("showcase.image2", { aspectRatio: "3 / 2", marginTop: on("showcase.image1") ? 24 : 0 })}
              </div>
            )}
            {on("showcase.film") && <div className="wk-film" style={col("5 / span 8")}>{film ?? <Play label="Production film · video placeholder" />}</div>}
          </section>
        )}
      </>
    ),
    strip: (
        <section className={`wk-px wk-g12 ${rv}`} style={{ marginTop: 24, rowGap: 24 }}>
          {pic("strip.image1", { ...col("2 / span 3"), aspectRatio: "1 / 1" })}
          {pic("strip.image2", { ...col("5 / span 3"), aspectRatio: "1 / 1" })}
          {pic("strip.image3", { ...col("8 / span 4"), aspectRatio: "1 / 1" })}
        </section>
    ),
    outcome: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`}>
          {heading(num("outcome"), T("outcome.heading", "The outcome"))}
          <div style={col("5 / span 8")}>
            {on("outcome.statement") && <p {...dp("outcome.statement")} className="wk-stmt">{T("outcome.statement", "What was delivered.")}</p>}
            {on("outcome.list") && (
              <div {...dp("outcome.list")} className="wk-list" style={{ marginTop: 32 }}>
                {p.deliverables.map((d, i) => (<div key={d}><span className="t-meta wk-nm">{idx(i + 1)}</span><span>{d}</span></div>))}
              </div>
            )}
            {on("outcome.note") && <p {...dp("outcome.note")} className="t-meta wk-nm s" style={{ marginTop: 16, opacity: 0.7 }}>{T("outcome.note", "No performance results have been supplied, so none are shown.")}</p>}
          </div>
        </section>
    ),
    credits: (
        <section className={`wk-px wk-sec wk-g12 ${rv}`} style={{ rowGap: 20 }}>
          {heading(num("credits"), T("credits.heading", "Credits"))}
          {on("credits.list") && (
            <div {...dp("credits.list")} style={{ ...col("5 / span 8"), display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "20px 24px" }}>
              {p.credits.map((c) => (
                <div key={c.role} className="wk-meta"><p className="t-meta wk-nm s" style={{ opacity: 0.7 }}>{c.role}</p><p className="t-body wk-nl" style={{ marginTop: 6 }}>{c.name ?? "[Name pending]"}</p></div>
              ))}
            </div>
          )}
        </section>
    ),
  };

  return (
    <div className="wk">
      {/* The dashboard preview shows the final layout: scroll-triggered motion measures the page once and would leave later parts hidden while the editor changes it. */}
      {!editing && <ProjectMotion />}
      <main className="wk-in">
        <section className="wk-top wk-px">
          <Link href="/#work-archive" className="t-meta wk-nm wk-back">← All work</Link>
          <div className="wk-g12" style={{ marginTop: 24, alignItems: "end" }}>
            <div style={col("1 / span 8")}>
              <p className="t-meta wk-nm wk-y">{[p.number, p.discipline, T("top.tag", "Demo project")].join(" · ")}</p>
              <h1 className="t-display wk-nk" style={{ fontSize: "clamp(64px,14cqw,220px)", marginTop: 16 }}>{p.name}</h1>
            </div>
            {on("top.about") && <div {...dp("top.about")} style={{ ...col("9 / span 4"), paddingBottom: 10 }}><p className="t-body wk-nl">{p.about}</p></div>}
          </div>
        </section>

        {layout.map((b) => <Fragment key={b.id}>{blocks[b.id]}</Fragment>)}

        <section className="wk-px" style={{ marginTop: 160, paddingBottom: 96 }}>
          <div className="wk-rule" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingTop: 20 }}>
            <Link href={`/work/${prev.slug}`} className="wk-chip">← Previous · {prev.name}</Link>
            <Link href="/#work-archive" className="wk-chip">Back to all work</Link>
            <a className="wk-cta" href={contact.href}>{contact.label}</a>
          </div>
          <Link href={`/work/${next.slug}`} className="wk-g12 wk-next" style={{ marginTop: 32 }} aria-label={`Next project ${next.number} ${next.name}`}>
            <div style={col("1 / span 6")}>
              <p className="t-meta wk-nm" style={{ color: "var(--color-red)" }}>Next project · {next.number}</p>
              <p className="t-display wk-nk" style={{ fontSize: "clamp(48px,7.5cqw,112px)", marginTop: 16 }}>{next.name}</p>
              <p className="t-meta wk-nm" style={{ marginTop: 16, fontSize: 11 }}>{next.discipline} · Demo project →</p>
            </div>
            {next.image ? (
              <div className="wk-ph real" style={{ ...col("7 / span 6"), aspectRatio: "16 / 10" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed-ratio frame */}
                <img src={next.image.src} alt="" />
              </div>
            ) : (
              <Ph style={{ ...col("7 / span 6"), aspectRatio: "16 / 10" }} />
            )}
          </Link>
        </section>
      </main>
    </div>
  );
}
