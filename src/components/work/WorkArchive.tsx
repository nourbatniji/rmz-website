"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { WorkContent, WorkProject } from "@/content/work-types";
import { pointerOverCards } from "@/lib/use-pinned-skip";
import { useWheelSteps } from "@/lib/use-wheel-steps";
import { useMedia } from "@/lib/use-media";
import { attachStepScroll, type StepScroll } from "@/lib/step-scroll";
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
const ALIGN_TOL = 6; // px of slack when judging alignment (sub-pixel scroll positions, rounding)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const two = (v: number) => String(v).padStart(2, "0");

export function WorkArchive({ label, headingLead, headingEmphasis, intro, categories, emptyTitle, emptyBody, contact, projects: all }: Props) {
  const router = useRouter();
  const pathname = usePathname();
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
  const narrow = useMedia("(max-width: 1023px)", false);
  const scrollMode = live && narrow; // phone / tablet: the section pins and the scroll position moves the cards. Desktop: the cards step only while the pointer is over them
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null); // the stage
  const boxRef = useRef<HTMLDivElement>(null); // the scaled artboard
  const stepsRef = useRef<StepScroll | null>(null); // phone / tablet: one swipe or wheel gesture = one project

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Coming back to the home page (browser Back, router cache / bfcache restore) must show the whole collection again:
  // the "opening a project" state (focused card pushed forward, the others faded out) never outlives the navigation.
  useEffect(() => {
    const reset = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } setOpening(false); };
    reset();
    const onShow = () => reset();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [pathname]);

  // The cards take the wheel only while (a) the pointer is on them and (b) the stage is ALIGNED: its top sits on the bottom edge of the fixed header,
  // and the heading, filters, focused card with its caption and the controls are all fully inside the usable viewport (measured live, every time).
  // Before that — approaching from above or below — the wheel is never touched and the page simply scrolls.
  const hhRef = useRef(92); // measured bottom edge of the fixed header
  const aligned = useCallback(() => {
    const tr = trackRef.current, pin = pinRef.current;
    if (!tr || !pin) return false;
    const hh = hhRef.current;
    const vh = window.innerHeight;
    const r = pin.getBoundingClientRect();
    // seated = the stage sits on the header edge (a little slack) and ends inside the viewport; the cards are never judged piece by piece,
    // so a short laptop screen or a taller header can never leave the wheel dead while the pointer is on the cards
    return Math.abs(r.top - hh) <= ALIGN_TOL * 3 && r.bottom <= vh + ALIGN_TOL * 6;
  }, []);
  const overCards = useCallback(
    (e: WheelEvent) => {
      const tr = trackRef.current;
      if (!tr || !aligned()) return false;
      return pointerOverCards(e, tr.querySelectorAll<HTMLElement>(".wk-bs"), tr.querySelector<HTMLElement>(".wk-ctl"), 24, tr.querySelector<HTMLElement>(".wk-stage"));
    },
    [aligned],
  );

  // Fit the artboard to the stage (uniform scale, never stretched) and keep the stage's seat in step with the real header height.
  // Re-measured on resize, when the header changes size and when web fonts finish loading.
  useEffect(() => {
    const pin = pinRef.current, box = boxRef.current, root = rootRef.current;
    if (!pin || !box || !root) return;
    const header = document.querySelector("header");
    const fit = () => {
      const css = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
      const hh = Math.max(css, header ? header.getBoundingClientRect().bottom : 0); // never let the stage sit under a taller-than-expected header
      hhRef.current = hh;
      root.style.setProperty("--wk-hh", `${hh}px`);
      if (window.matchMedia("(max-width: 1023px)").matches) {
        // Phone / tablet: the artboard is 672 high and as wide as the screen needs (never a narrow strip centred on a wide screen), so everything starts at the page gutter.
        const sc = clamp(Math.min(pin.clientHeight / 672, pin.clientWidth / 390), 0.75, 1.4); // never narrower than the 390 px artboard the controls were drawn for
        const bw = pin.clientWidth / sc;
        box.style.width = `${bw.toFixed(2)}px`;
        root.style.setProperty("--wk-sc", sc.toFixed(5));
        root.style.setProperty("--wk-bw", `${bw.toFixed(2)}px`);
        box.style.transform = `translate(0px, ${((pin.clientHeight - 672 * sc) / 2).toFixed(2)}px) scale(${sc.toFixed(5)})`;
        return;
      }
      box.style.width = "";
      const sc = Math.min(pin.clientWidth / box.offsetWidth, pin.clientHeight / box.offsetHeight, 1.25);
      const x = (pin.clientWidth - box.offsetWidth * sc) / 2;
      const y = (pin.clientHeight - box.offsetHeight * sc) / 2;
      box.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(5)})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(pin);
    if (header) ro.observe(header);
    window.addEventListener("resize", fit);
    const fonts = document.fonts;
    fonts?.ready.then(fit);
    fonts?.addEventListener?.("loadingdone", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); fonts?.removeEventListener?.("loadingdone", fit); };
  }, [n, narrow]);

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
    if (scrollMode && stepsRef.current) { stepsRef.current.goTo(to); return; }
    animateTo(to);
  };
  const step = (k: number) => goTo(targetRef.current + k);

  // Phone / tablet: scroll position → card position (continuous, like a swipe that follows the page).
  useEffect(() => {
    if (!scrollMode || opening) return;
    const tr = trackRef.current, pin = pinRef.current;
    if (!tr || !pin) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const ex = Math.max(1, tr.offsetHeight - pin.offsetHeight);
      const p = clamp((hhRef.current - tr.getBoundingClientRect().top) / ex, 0, 1);
      const v = p * (n - 1);
      window.cancelAnimationFrame(animRef.current);
      targetRef.current = Math.round(v);
      apply(v);
    };
    const kick = () => { if (!raf) raf = window.requestAnimationFrame(paint); };
    const exOf = () => Math.max(1, tr.offsetHeight - pin.offsetHeight);
    const steps = attachStepScroll({
      count: n,
      seated: () => { const r = tr.getBoundingClientRect(); return r.top <= hhRef.current + 2 && r.bottom - hhRef.current >= pin.offsetHeight - 2; },
      index: () => Math.round(clamp((hhRef.current - tr.getBoundingClientRect().top) / exOf(), 0, 1) * (n - 1)),
      target: (i) => window.scrollY + tr.getBoundingClientRect().top - hhRef.current + (i / Math.max(1, n - 1)) * exOf(),
    });
    stepsRef.current = steps;
    paint();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => { steps.destroy(); if (stepsRef.current === steps) stepsRef.current = null; window.removeEventListener("scroll", kick); window.removeEventListener("resize", kick); window.cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollMode, opening, n]);

  // Desktop: with the pointer over the cards, a scroll that arrives at the section (from above or below) must not carry the section past before the cards can be used.
  // While the stage is still approaching its seat (or has just been scrolled a little past the end of the dwell going back up), the wheel is taken and the page glides the
  // last bit into place; the momentum of that gesture is swallowed, and the next gesture steps the cards.
  useEffect(() => {
    if (!live || scrollMode || opening) return;
    let until = 0;
    let raf = 0;
    const glide = (to: number) => {
      window.cancelAnimationFrame(raf);
      const from = window.scrollY, t0 = performance.now(), dur = 420;
      const f = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, from + (to - from) * ease(t));
        if (t < 1) raf = window.requestAnimationFrame(f);
      };
      raf = window.requestAnimationFrame(f);
    };
    const onWheel = (e: WheelEvent) => {
      const tr = trackRef.current, pin = pinRef.current;
      if (!tr || !pin || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (!pointerOverCards(e, tr.querySelectorAll<HTMLElement>(".wk-bs"), tr.querySelector<HTMLElement>(".wk-ctl"), 24, tr.querySelector<HTMLElement>(".wk-stage"))) return;
      const now = performance.now();
      if (now < until) { e.preventDefault(); until = now + 200; return; } // the rest of the gesture that was just caught
      const hh = hhRef.current, vh = window.innerHeight, top = pin.getBoundingClientRect().top;
      const down = e.deltaY > 0;
      let to: number | null = null;
      if (down && top > hh + 4 && top < hh + vh * 0.6) to = window.scrollY + tr.getBoundingClientRect().top - hh;
      else if (!down && top < hh - 4 && top > hh - vh * 0.7 && tr.getBoundingClientRect().bottom > hh + 4) to = window.scrollY + tr.getBoundingClientRect().top - hh + Math.max(0, tr.offsetHeight - pin.offsetHeight);
      if (to === null) return;
      e.preventDefault();
      until = now + 650;
      glide(to);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("wheel", onWheel); window.cancelAnimationFrame(raf); };
  }, [live, scrollMode, opening]);

  useWheelSteps({
    active: live && !opening,
    over: (e) => (scrollMode ? !!stepsRef.current?.seated() : overCards(e)),
    settle: true,
    canStep: (dir) => (scrollMode ? !!stepsRef.current?.canStep(dir) : dir > 0 ? targetRef.current < n - 1 : targetRef.current > 0),
    step: (dir) => (scrollMode ? stepsRef.current?.step(dir) : goTo(targetRef.current + dir)),
  });

  const setCat = (id: "all" | WorkProject["category"]) => {
    if (opening) return;
    setFilter(id);
    targetRef.current = 0;
    window.cancelAnimationFrame(animRef.current);
    apply(0);
    const tr = trackRef.current;
    if (scrollMode && tr && tr.getBoundingClientRect().top < hhRef.current) window.scrollTo({ top: window.scrollY + tr.getBoundingClientRect().top - hhRef.current });
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
  const onDown = (e: PointerEvent) => { if (scrollMode) return; downX.current = e.clientX; swiped.current = false; };
  const onUp = (e: PointerEvent) => {
    if (downX.current == null) return;
    const dx = e.clientX - downX.current;
    downX.current = null;
    if (Math.abs(dx) > 50) { swiped.current = true; step(dx < 0 ? 1 : -1); }
  };

  const fo = projects[focus];

  return (
    <div ref={rootRef} className="wk">
      <section id="work" className="wk-in" aria-label="Selected work">
        <div ref={trackRef} className="wk-track" style={{ "--wk-n": n } as CSSProperties}>
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
                      {p.image ? (
                        <div className="bimg wk-ph real">
                          {/* eslint-disable-next-line @next/next/no-img-element -- fixed-ratio card frame */}
                          <img src={p.image.src} alt="" loading="lazy" decoding="async" />
                        </div>
                      ) : (
                        <div className="bimg wk-ph flat" />
                      )}
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
