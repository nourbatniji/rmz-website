"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { WorkContent, WorkProject } from "@/content/work-types";
import { pointerOverCards } from "@/lib/use-pinned-skip";
import { mostlyVisible, useWheelSteps } from "@/lib/use-wheel-steps";
import { useMedia } from "@/lib/use-media";
import { artBackground } from "./art";
import "./work.css";

/**
 * Work archive — "The Spatial Collection" (canvas Direction B).
 * A 1440×900 (mobile 390×672) artboard is scaled uniformly to fit its stage. The active project is its own state (`pos`, continuous
 * 0…n-1, integer at rest) and is NOT derived from the page's scroll position: the section is ordinary page flow with no reserved scroll
 * distance. With the pointer over the cards the wheel steps one project per gesture (src/lib/use-wheel-steps.ts); anywhere else — and at the
 * first / last project — the page scrolls normally. Arrows, ← → keys, swipe and "Open project" act on the same state.
 * Reduced motion / no JS: static stage, controls step it directly. See docs/work-section.md.
 */

export type ArchiveProject = Pick<WorkProject, "slug" | "number" | "name" | "category" | "discipline" | "year" | "client" | "services" | "palette" | "image">;

type Props = {
  label: string;
  headingLead: string;
  headingEmphasis: string;
  intro: string;
  categories: WorkContent["categories"];
  emptyTitle: string;
  emptyBody: string;
  contact: { label: string; href: string };
  projects: ArchiveProject[];
};

const OPEN_MS = 520;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const two = (v: number) => String(v).padStart(2, "0");

export function WorkArchive({ label, headingLead, headingEmphasis, intro, categories, emptyTitle, emptyBody, contact, projects: all }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | WorkProject["category"]>("all");
  const projects = filter === "all" ? all : all.filter((p) => p.category === filter);
  const n = projects.length;
  const [pos, setPos] = useState(0); // continuous position 0…n-1 (integer at rest) — the single source of truth
  const posRef = useRef(0);
  const focus = clamp(Math.round(pos), 0, Math.max(n - 1, 0));
  const apply = (v: number) => { posRef.current = v; setPos(v); };
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downX = useRef<number | null>(null);
  const swiped = useRef(false);
  const reduced = useMedia("(prefers-reduced-motion: reduce)", true); // server / no-JS = unpinned
  const live = !reduced && n > 1;
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null); // the stage
  const boxRef = useRef<HTMLDivElement>(null); // the scaled artboard

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // The cards take the wheel only while the pointer is on them (and the section is on screen); everywhere else the page scrolls normally.
  const overCards = useCallback(
    (e: WheelEvent) => {
      const tr = trackRef.current;
      if (!tr) return false;
      return mostlyVisible(pinRef.current) && pointerOverCards(e, tr.querySelectorAll<HTMLElement>(".wk-bs"), tr.querySelector<HTMLElement>(".wk-ctl"), 24, tr.querySelector<HTMLElement>(".wk-stage"));
    },
    [],
  );

  // Fit the artboard to the stage (uniform scale, never stretched).
  useEffect(() => {
    const pin = pinRef.current, box = boxRef.current;
    if (!pin || !box) return;
    const fit = () => {
      const sc = Math.min(pin.clientWidth / box.offsetWidth, pin.clientHeight / box.offsetHeight, 1.25);
      const x = (pin.clientWidth - box.offsetWidth * sc) / 2;
      const y = (pin.clientHeight - box.offsetHeight * sc) / 2;
      box.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(5)})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(pin);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [n]);

  // Position animation: one eased glide (≈0.65 s per project) from the current position to the target project.
  const targetRef = useRef(0);
  const animRef = useRef(0);
  const animateTo = useCallback((to: number) => {
    window.cancelAnimationFrame(animRef.current);
    const from = posRef.current;
    const dist = to - from;
    if (Math.abs(dist) < 0.001) { apply(to); return; }
    const dur = Math.min(1000, 650 + 120 * (Math.abs(dist) - 1));
    const t0 = performance.now();
    const f = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      apply(t < 1 ? from + dist * ease(t) : to);
      if (t < 1) animRef.current = window.requestAnimationFrame(f);
    };
    animRef.current = window.requestAnimationFrame(f);
  }, []);
  useEffect(() => () => window.cancelAnimationFrame(animRef.current), []);

  const goTo = (j: number) => {
    if (!n || opening) return;
    const to = clamp(j, 0, n - 1);
    targetRef.current = to;
    if (!live) { apply(to); return; }
    animateTo(to);
  };
  const step = (k: number) => goTo(targetRef.current + k);

  useWheelSteps({
    active: live && !opening,
    over: overCards,
    canStep: (dir) => (dir > 0 ? targetRef.current < n - 1 : targetRef.current > 0),
    step: (dir) => goTo(targetRef.current + dir),
  });

  const setCat = (id: "all" | WorkProject["category"]) => {
    if (opening) return;
    setFilter(id);
    targetRef.current = 0;
    window.cancelAnimationFrame(animRef.current);
    apply(0);
  };
  const count = (id: "all" | WorkProject["category"]) => (id === "all" ? all.length : all.filter((p) => p.category === id).length);
  const filterLabel = categories.find((c) => c.id === filter)?.label ?? "";

  const open = (slug: string) => {
    if (opening) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(`/work/${slug}`);
      return;
    }
    setOpening(true);
    timer.current = setTimeout(() => router.push(`/work/${slug}`), OPEN_MS);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  };
  const onDown = (e: PointerEvent) => { downX.current = e.clientX; swiped.current = false; };
  const onUp = (e: PointerEvent) => {
    if (downX.current == null) return;
    const dx = e.clientX - downX.current;
    downX.current = null;
    if (Math.abs(dx) > 50) { swiped.current = true; step(dx < 0 ? 1 : -1); }
  };

  const fo = projects[focus];

  return (
    <div className="wk">
      <section id="work-archive" className="wk-in" aria-label="Selected work">
        <div ref={trackRef} className="wk-track">
          <div ref={pinRef} className="wk-pin">
            <div ref={boxRef} className="wk-box">
            <div className="wk-head">
              <div className="wk-headrow">
                <div>
                  <p className="t-meta wk-nm wk-y">{label}</p>
                  <h2 className="t-display wk-nk wk-h2">
                    {headingLead} <span className="t-italic wk-y" style={{ fontSize: "1.05em" }}>{headingEmphasis}</span>
                  </h2>
                </div>
                <p className="t-body wk-nl wk-intro">{intro}</p>
              </div>
              <div role="group" aria-label="Filter by category" className="wk-chips">
                {categories.map((c) => (
                  <button key={c.id} className="wk-chip" type="button" aria-pressed={filter === c.id} onClick={() => setCat(c.id)}>
                    {c.label} <i>{count(c.id)}</i>
                  </button>
                ))}
              </div>
            </div>

            {n === 0 ? (
              <div className="wk-empty">
                <div style={{ border: "1px solid rgb(243 232 204 / 0.35)", padding: "72px 28px", textAlign: "center" }}>
                  <p className="t-meta wk-nm wk-y">An empty room</p>
                  <h3 className="t-display wk-nk" style={{ fontSize: "clamp(36px,5cqw,64px)", marginTop: 18 }}>
                    {filter === "all" ? emptyTitle : <>Nothing in <span className="t-italic wk-y">{filterLabel}</span> yet.</>}
                  </h3>
                  <p className="t-body wk-nl" style={{ margin: "18px auto 0", maxWidth: 440 }}>{emptyBody}</p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
                    {filter !== "all" && <button className="wk-chip" type="button" onClick={() => setCat("all")}>Clear filter</button>}
                    <a className="wk-cta" href={contact.href}>{contact.label}</a>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`wk-stage ${live && !opening ? "live" : ""}`}
                role="group"
                aria-roledescription="carousel"
                aria-label="Selected work. Scroll over the cards, or use the left and right arrow keys, to move between projects."
                tabIndex={0}
                onKeyDown={onKey}
                onPointerDown={onDown}
                onPointerUp={onUp}
              >
                {projects.map((p, j) => {
                  const d = j - (opening ? focus : pos);
                  const ad = Math.abs(d);
                  const isF = j === focus;
                  const op = ad <= 1 ? 1 : clamp(2 - ad, 0, 1); // 3 cards: centred + one neighbour each side, the rest fade out on arrival
                  const cls = opening ? (isF ? "op" : "fade") : "";
                  const style = {
                    "--d": d.toFixed(3),
                    "--ad": ad.toFixed(3),
                    "--op": op.toFixed(3),
                    "--br": (1 - 0.34 * Math.min(ad, 2)).toFixed(2),
                    "--z": Math.round(10 - ad),
                    pointerEvents: op > 0.5 ? "auto" : "none",
                  } as CSSProperties;
                  const onClick = (e: MouseEvent) => {
                    e.preventDefault();
                    if (swiped.current) { swiped.current = false; return; }
                    if (isF) open(p.slug);
                    else goTo(j);
                  };
                  return (
                    <Link
                      key={p.slug}
                      href={`/work/${p.slug}`}
                      className={`wk-bs ${cls}`}
                      style={style}
                      onClick={onClick}
                      tabIndex={isF ? 0 : -1}
                      aria-hidden={isF ? undefined : true}
                      aria-label={`Open project ${p.number} ${p.name}`}
                    >
                      <div className="bimg wk-ph" style={{ background: artBackground(p.palette, j, 0) }} />
                      <div className="bcap">
                        <span className="t-display" style={{ fontSize: 18 }}>
                          <span className="wk-y" style={{ fontSize: 11, letterSpacing: "0.1em", marginRight: 8 }}>{p.number}</span>
                          {p.name}
                        </span>
                        <span className="t-meta" style={{ fontSize: 10, opacity: 0.85 }}>{p.discipline}</span>
                      </div>
                    </Link>
                  );
                })}
                <div className="wk-floor" />
                <div className="wk-ctl">
                  <button className="wk-arr" type="button" aria-label="Previous project" onClick={() => step(-1)} disabled={focus === 0}>←</button>
                  <span className="t-meta wk-nm" style={{ minWidth: 64, textAlign: "center" }}>{two(focus + 1)} / {two(n)}</span>
                  <button className="wk-arr" type="button" aria-label="Next project" onClick={() => step(1)} disabled={focus === n - 1}>→</button>
                  <Link className="wk-cta" href={`/work/${fo.slug}`} onClick={(e) => { e.preventDefault(); open(fo.slug); }}>Open project →</Link>
                </div>
                <p className="wk-vh" aria-live="polite">{fo.number} {fo.name}, {fo.discipline}, project {focus + 1} of {n}</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
