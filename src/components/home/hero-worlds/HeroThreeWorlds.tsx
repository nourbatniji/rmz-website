"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HeroContent } from "@/content/types";
import { pingPongProgress } from "../hero/config";
import { PrismEngine } from "../hero/prism-engine";
import "./hero-worlds.css";

/**
 * HeroThreeWorlds — PROTOTYPE of hero concept 04 "THREE WORLDS" (preview route /lab/hero-three-worlds only; the homepage hero is untouched).
 *
 * The picture engine is the live one: it reuses ../hero/prism-engine (offscreen cover-crop, per-banner FrameStore, ribs), ../hero/config
 * (scroll → ping-pong progress) and the same prism rotation constants and controls as ../hero/HeroWall (auto-change, chips, arrow keys,
 * swipe, click-to-turn, pause, reduced motion). What changes is the composition: full-bleed image, no copy strip, headline INSIDE the
 * picture, selectors bottom-left, counter bottom-right.
 *
 * Text ↔ banner synchronisation: there is NO text timer. Each phrase is a layer whose state (active / out / idle) is derived from the same
 * `face` state that rotates the prism; the exit and entrance are CSS animations offset to the prism's own duration (--hw-* in the css), so
 * a phrase only ever changes when the banner changes. Scrolling through image frames never touches it. Rapid selections: exactly one layer is
 * active; a layer that is still leaving finishes its exit (animationend) and cannot be seen alongside a second entrance for long because
 * entrances wait for the prism's midpoint.
 */

const FACES = 3;
const RADIUS_PER_RIB = 0.288675;
const ROTATE_MS = 1100;
const STAGGER = 0.6;
const TRANSITION_MS = Math.round(ROTATE_MS * (1 + STAGGER));
const AUTO_MS = 5000;

// Opening (once per tab session, on entry at the top). One coordinated timeline of live text and the REAL prism (see hero-worlds.css):
//   01 WORD      0–100 ms     the final red word "perspective." large and centred on the hero's near-black.
//   02 PHOTO     100–850      a sweep (left → right) fills the WHOLE word with the banner photograph — ONE image plane clipped by the complete text, never per letter — and it holds
//                             for ≈450 ms with a very subtle horizontal drift. The plane is cover-fitted into the word's own box (centred unless a focal point exists), so it works
//                             for any banner image.
//   03 RETURN    850–1150     the red sweeps back across the lettering while the prism begins turning (OPEN_HOLD_MS) — the word is solid red again before it travels.
//   04 WORLD     850–2610     the existing prism transition (geometry, shading, stagger, easing): faces start turned away (the front face is empty) and turn the UPRIGHT first banner in.
//   05 TRAVEL    1700–2300    the SAME word (FLIP from its measured final bounds) settles into the headline during the prism's final portion.
//   06 LIVE      2150–2780    "A DIFFERENT" rises, then description, CTA, controls → the exact normal hero.
// The text and header live outside the rotating scene; frame-on-scroll and the normal prism are untouched.
const READY_WAIT_MS = 900; // first image not painted by then → show the normal hero instead (no waiting)
const OPEN_DONE_MS = 2850;
const OPEN_HOLD_MS = 850; // the prism starts turning when the world begins to appear (after beats 01–02) // everything finished → hand over to the normal behaviour (countdown starts)
/** Preview-only review stages: the REAL animations are paused at these times (06 = finished). */
const STAGES = [
  { id: 1, label: "Word", t: 60 },
  { id: 2, label: "Photo", t: 650 },
  { id: 3, label: "Return", t: 1010 },
  { id: 4, label: "World", t: 1500 },
  { id: 5, label: "Travel", t: 2050 },
  { id: 6, label: "Live", t: null },
] as const;
const OPEN_KEY = "rmz-hero-three-worlds-opening";
type Phase = "pending" | "measure" | "armed" | "running" | "done"; // pending: server render / before the decision · measure: reading the headline's final bounds · armed: start pose, waiting for the first image · running · done
type Pose = { fx: number; fy: number; fs: number; ox: number; oy: number; gw: number; gh: number; gx: number; gy: number; gd: number };
type View = number | null;

/** PROVISIONAL copy. Keyed by banner id; falls back to the content headline. */
const PHRASES: Record<string, { lead: string; emphasis: string }> = {
  identity: { lead: "A DIFFERENT", emphasis: "perspective." },
  campaign: { lead: "IMPOSSIBLE", emphasis: "to ignore." },
  digital: { lead: "BEYOND THE", emphasis: "expected." },
};
const DESCRIPTION = "Strategy, identity, campaigns & digital experiences.";

function useMedia(query: string, server: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => server,
  );
}
function useTabHidden() {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    () => document.hidden,
    () => false,
  );
}

/** `ghostBanner` is a preview-only review aid: it picks which existing banner's image fills the word (default: the first banner, i.e. the current banner image). */
export function HeroThreeWorlds({ hero, ghostBanner = 0 }: { hero: HeroContent; ghostBanner?: number }) {
  const { banners } = hero;
  const wide = useMedia("(min-width: 1024px)", true);
  const mid = useMedia("(min-width: 640px)", true);
  const reduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const tabHidden = useTabHidden();
  const ribCount = wide ? 30 : mid ? 20 : 12;

  const [turns, setTurns] = useState(0);
  const [ready, setReady] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [announce, setAnnounce] = useState("");
  const [leaving, setLeaving] = useState<number[]>([]);
  const [boot, setBoot] = useState(true);
  const [phase, setPhaseState] = useState<Phase>("pending");
  const [intro, setIntro] = useState(false);
  const [pose, setPose] = useState<Pose | null>(null);
  const [view, setView] = useState<View>(null); // preview-only: which review pose is held
  const heldRef = useRef<number | null>(null); // preview-only: animation time being held (null = play normally)
  const phaseRef = useRef<Phase>("pending");
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const paused = userPaused ?? reduced;
  const face = ((turns % FACES) + FACES) % FACES;

  const sectionRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement[][]>([]);
  const engineRef = useRef<PrismEngine | null>(null);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const settle = useRef(0);
  const lastFace = useRef(0);
  /** Finish the opening NOW (every running transition/animation jumps to its end state). Never touches scroll. */
  const finishOpening = () => {
    if (phaseRef.current === "done") return;
    try {
      sectionRef.current?.getAnimations({ subtree: true }).forEach((a) => {
        try { a.finish(); } catch { /* ignore */ }
      });
    } catch { /* ignore */ }
    setPhase("done");
  };

  const turn = (delta: number, manual: boolean) => {
    finishOpening(); // a selection during the opening finishes it first, then is honoured
    settle.current = TRANSITION_MS;
    setBoot(false);
    setTurns((t) => t + delta);
    const nf = (((turns + delta) % FACES) + FACES) % FACES;
    if (manual) setAnnounce(`Banner ${nf + 1} of ${FACES}: ${banners[nf].label}`);
  };

  // Phrase layers follow `face` (the only input): the old face starts leaving, the new one is no longer leaving.
  useEffect(() => {
    const prev = lastFace.current;
    lastFace.current = face;
    if (prev === face) return;
    window.setTimeout(() => setLeaving((l) => [...l.filter((x) => x !== face && x !== prev), prev]), 0);
  }, [face]);

  // Decide whether to play: once per tab session, only on entry at the top (not reload/back-forward, not restored scroll, not an anchor entry, not reduced motion).
  // Layout effect = before the first paint of the hydrated hero, so the completed headline never flashes before the opening state is in place.
  useLayoutEffect(() => {
    let skip = false;
    try {
      skip = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav && nav.type !== "navigate") skip = true;
      if (window.location.hash) skip = true;
      if (window.scrollY > 8) skip = true;
      if (sessionStorage.getItem(OPEN_KEY)) skip = true;
    } catch { /* storage blocked etc.: play (still harmless) */ }
    const fontsOk = () => !document.fonts || document.fonts.status === "loaded";
    if (phaseRef.current === "pending") {
      if (skip) {
        setPhase("done"); // eslint-disable-line react-hooks/set-state-in-effect
      } else {
        try { sessionStorage.setItem(OPEN_KEY, "1"); } catch { /* ignore */ }
        setIntro(true);
        if (fontsOk()) setPhase("measure");
        else {
          // fonts not ready yet: give them a moment, otherwise show the normal hero (the measurement needs the real glyphs)
          Promise.race([document.fonts.ready, new Promise((r) => window.setTimeout(r, 700))]).then(() => {
            if (phaseRef.current !== "pending") return;
            setPhase(fontsOk() ? "measure" : "done");
          });
        }
      }
    }
    // Static fallback: if anything stalls before the decision, show the normal hero (poster).
    const wd = window.setTimeout(() => { if (phaseRef.current === "pending" || phaseRef.current === "measure") setPhase("done"); }, 2500);
    return () => { window.clearTimeout(wd); };
  }, []);

  // Measure the REAL final bounds of "perspective." (fonts are ready) and derive the start pose of the very same element: large and centred in the hero.
  /* eslint-disable react-hooks/set-state-in-effect -- reading layout then arming must happen before paint */
  useLayoutEffect(() => {
    if (phase !== "measure") return;
    const sec = sectionRef.current;
    const sp = sec?.querySelector(".hw-phrase[data-state=active] .hw-line.t-italic > span");
    const wr = sp?.parentElement;
    if (!sec || !sp || !wr) { setPhase("done"); return; }
    const range = document.createRange();
    range.selectNodeContents(sp);
    const tr = range.getBoundingClientRect(); // the text's own box (the span is block-level: its rect is the column width)
    const wb = wr.getBoundingClientRect();
    const sb = sec.getBoundingClientRect();
    if (!tr.width || !tr.height) { setPhase("done"); return; }
    const usable = sb.width - 2 * tr.left; // tr.left is the page gutter: the headline's left edge
    const fs = Math.min((usable * (sb.width < 640 ? 0.92 : 0.85)) / tr.width, (sb.height * 0.5) / tr.height, 4); // ~85 % of the usable width, whole word inside the viewport
    const cx = sb.left + sb.width / 2, cy = sb.top + sb.height / 2;
    const fx = cx - (fs * tr.width) / 2 - tr.left, fy = cy - (fs * tr.height) / 2 - tr.top;
    // One image plane for the whole word: the banner's image cover-fitted into the word's own box (+6 % width of room for a subtle drift). Content-independent: only the
    // image's size is used; the crop is centred (no focal-point field exists on a banner today — add one here if it ever does).
    const poster = banners[Math.min(ghostBanner, banners.length - 1)]?.poster;
    let g = { gw: 0, gh: 0, gx: 0, gy: 0, gd: 0 };
    if (poster && poster.width && poster.height) {
      const k = Math.max((tr.width * 1.06) / poster.width, tr.height / poster.height);
      const gw = poster.width * k, gh = poster.height * k;
      const spare = gw - tr.width;
      g = { gw, gh, gx: -spare * 0.2, gy: (tr.height - gh) * 0.5, gd: -spare * 0.6 };
    }
    setPose({ fs, fx, fy, ox: tr.left - wb.left, oy: tr.top - wb.top, ...g });
    setPhase("armed");
  }, [phase, banners, ghostBanner]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Armed → running once the first image has painted (the engine's existing readiness). Two frames are allowed to paint the start pose first. If the image is not
  // ready within READY_WAIT_MS the normal hero is shown instead — no loader, no gate.
  useEffect(() => {
    if (phase !== "armed") return;
    let r1 = 0, r2 = 0, to = 0;
    if (ready) {
      r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setPhase("running")); });
    } else {
      to = window.setTimeout(() => { if (phaseRef.current === "armed") setPhase("done"); }, READY_WAIT_MS);
    }
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); window.clearTimeout(to); };
  }, [phase, ready]);

  useEffect(() => {
    if (phase !== "running") return;
    if (heldRef.current !== null) {
      // preview-only review pose: pause the REAL animations at the chosen time (no auto-completion while held)
      const t = heldRef.current;
      const id = requestAnimationFrame(() => sectionRef.current?.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t; }));
      return () => cancelAnimationFrame(id);
    }
    const t = window.setTimeout(() => { if (phaseRef.current === "running") setPhase("done"); }, OPEN_DONE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Any scroll / wheel / touch / key / pointer input finishes the opening immediately. Nothing is prevented, scroll is never locked or reset.
  useEffect(() => {
    if (phase !== "armed" && phase !== "running") return;
    const fin = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-hw-preview]")) return; // the preview-only controls are not user input to the page
      finishOpening();
    };
    const onScroll = () => { if (window.scrollY > 2) finishOpening(); };
    const evs = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    evs.forEach((e) => window.addEventListener(e, fin, { passive: true }));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      evs.forEach((e) => window.removeEventListener(e, fin));
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finishOpening only touches refs/setState
  }, [phase]);

  // Prototype-only review controls. Replay: back to the top + first banner, then measure → arm → run. WORD / WORLD: the same run, with the real animations held at
  // 250 ms / 940 ms. FINAL: the finished normal hero.
  const restart = () => {
    finishOpening();
    window.scrollTo({ top: 0, behavior: "instant" });
    lastFace.current = 0;
    settle.current = 0;
    setLeaving([]);
    setBoot(true);
    setTurns(0);
    setIntro(true);
    setPhase("measure");
  };
  const replay = () => {
    heldRef.current = null;
    setView(null);
    restart();
  };
  const review = (id: number) => {
    setView(id);
    const t = STAGES.find((x) => x.id === id)?.t ?? null;
    if (t === null) {
      heldRef.current = null;
      finishOpening();
      return;
    }
    heldRef.current = t;
    if (phaseRef.current === "running") sectionRef.current?.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t; });
    else if (phaseRef.current === "done" || phaseRef.current === "pending") restart();
  };

  useEffect(() => {
    const engine = new PrismEngine(banners, () => setReady(true));
    engineRef.current = engine;
    const wall = wallRef.current!;
    const ro = new ResizeObserver(() => engine.resize(wall.clientWidth, wall.clientHeight, window.devicePixelRatio || 1));
    ro.observe(wall);
    engine.resize(wall.clientWidth, wall.clientHeight, window.devicePixelRatio || 1);
    const progress = () => engine.setProgress(pingPongProgress(window.scrollY)); // the normal scroll mapping — the opening never touches it
    window.addEventListener("scroll", progress, { passive: true });
    const io = new IntersectionObserver(([e]) => {
      progress();
      engine.setVisible(e.isIntersecting);
    });
    io.observe(sectionRef.current!);
    progress();
    return () => {
      window.removeEventListener("scroll", progress);
      ro.disconnect();
      io.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [banners]);

  useEffect(() => {
    const grid = gridRef.current.map((row) => row.slice(0, ribCount));
    engineRef.current?.setCanvases(grid);
  }, [ribCount]);
  // While the opening is armed the prism is held one face "before" the first banner (turns − 1): the face in front is left empty (the wall shows only the near-black hero)
  // and the first banner's faces are turned away. The opening's single prism transition (turns − 1 → turns) then turns the UPRIGHT first banner into view: the turning
  // faces ARE the reveal. Text/selectors keep using `face` (the first banner) throughout.
  const shift = phase === "armed" ? -1 : 0;
  const prismFace = (((turns + shift) % FACES) + FACES) % FACES;
  useEffect(() => {
    engineRef.current?.setBlankFace(phase === "armed" || phase === "running" ? 2 : null);
  }, [phase]);
  useEffect(() => {
    engineRef.current?.setActive(prismFace);
  }, [prismFace]);

  useEffect(() => {
    if (paused || tabHidden || phase !== "done") return; // the countdown starts once the opening has completed
    const id = window.setTimeout(() => turn(1, false), AUTO_MS + settle.current);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `turn` only touches refs/setState
  }, [turns, paused, tabHidden, phase]);

  const go = (target: number) => {
    let d = (target - face + FACES) % FACES;
    if (d === 2) d = -1;
    if (d !== 0) turn(d, true);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); turn(1, true); }
    if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1, true); }
  };

  const rib = `calc(100cqw / ${ribCount})`;
  const radius = `calc(${rib} * ${RADIUS_PER_RIB})`;
  const current = banners[face];
  const poster = banners[0].poster;
  const phraseOf = (id: string) => PHRASES[id] ?? hero.headline;

  return (
    <section
      ref={sectionRef}
      aria-label="Introduction"
      onKeyDown={onKeyDown}
      data-boot={boot ? "1" : "0"}
      data-open={phase}
      style={pose ? ({ "--fx": `${pose.fx}px`, "--fy": `${pose.fy}px`, "--fs": pose.fs, "--ox": `${pose.ox}px`, "--oy": `${pose.oy}px`, "--gsize": `${pose.gw}px ${pose.gh}px`, "--gx": `${pose.gx}px`, "--gy": `${pose.gy}px`, "--gdrift": `${pose.gd}px`, "--gimg": `url("${banners[Math.min(ghostBanner, banners.length - 1)]?.poster?.src ?? ""}")` } as React.CSSProperties) : undefined}
      data-intro={intro ? "1" : "0"}
      className="hw-root relative flex h-svh min-h-[560px] flex-col overflow-hidden bg-ink"
    >
      {poster && <link rel="preload" as="image" href={poster.src} fetchPriority="high" />}

      <div ref={wallRef} className="relative min-h-0 flex-1 [container-type:inline-size]">
        {/* the picture (poster + prism): masked only while the opening reveals it; unmasked, untouched otherwise */}
        <div className="hw-image absolute inset-0">
        <div
          aria-hidden="true"
          data-hw-poster=""
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{
            opacity: phase === "armed" || phase === "running" ? 0 : ready ? 0 : 1, // the poster (frame 1) covers the wait; during the opening the prism itself is the reveal
            backgroundColor: "#1a1a18",
            backgroundImage: poster ? `url(${poster.src})` : undefined,
          }}
        />

        <button
          type="button"
          className="absolute inset-0 block cursor-pointer touch-pan-y [perspective:1900px] [perspective-origin:50%_50%]"
          aria-label={`Rib wall, banner ${face + 1} of ${FACES}: ${current.label}. Press to turn to the next banner, or use the left and right arrow keys.`}
          onClick={() => {
            if (swipe.current?.moved) return;
            turn(1, true);
          }}
          onPointerDown={(e) => { swipe.current = { x: e.clientX, moved: false }; }}
          onPointerUp={(e) => {
            const s = swipe.current;
            if (!s) return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 40) {
              s.moved = true;
              turn(dx < 0 ? 1 : -1, true);
            }
          }}
        >
          <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `translateZ(calc(${radius} * -1))` }}>
            {Array.from({ length: ribCount }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full [transform-style:preserve-3d]"
                style={{
                  left: `calc(${rib} * ${i})`,
                  width: rib,
                  transform: `rotateY(${-120 * (turns + shift)}deg)`,
                  transition: reduced || phase === "armed"
                    ? "none"
                    : `transform ${ROTATE_MS}ms cubic-bezier(.65,0,.35,1) ${(phase === "running" ? OPEN_HOLD_MS : 0) + Math.round((i / (ribCount - 1)) * STAGGER * ROTATE_MS)}ms`,
                }}
              >
                {banners.map((b, bi) => (
                  <canvas
                    key={b.id}
                    aria-hidden="true"
                    ref={(el) => {
                      if (!el) return;
                      (gridRef.current[bi] ??= [])[i] = el;
                    }}
                    className="absolute left-0 top-0 h-full w-full [backface-visibility:hidden]"
                    style={{ transform: `rotateY(${120 * bi}deg) translateZ(${radius})` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </button>
        </div>

        {/* restrained local contrast (copy side + bottom controls only) */}
        <div aria-hidden="true" className="hw-shade pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="hw-shade-b pointer-events-none absolute inset-x-0 bottom-0 h-40" />

        {/* ── Copy: inside the picture ─────────────────────────────── */}
        <div className="pointer-events-none absolute inset-x-(--gutter) bottom-[148px] md:bottom-auto md:top-1/2 md:-translate-y-[46%]">
          <div className="max-w-[min(92vw,640px)]">
            <div className="relative">
            {/* copy-attached scrim: lives in the text layout (not in the prism/image layer), centred behind the red word, fades to nothing */}
            <div aria-hidden="true" className="hw-scrim pointer-events-none absolute" />
            <h1 className="hw-phrases relative">
              {banners.map((b, i) => {
                const p = phraseOf(b.id);
                const state = i === face ? "active" : leaving.includes(i) ? "out" : "idle";
                return (
                  <span
                    key={b.id}
                    className="hw-phrase"
                    data-state={state}
                    aria-hidden={i === face ? undefined : true}
                    onAnimationEnd={(e) => {
                      if (state === "out" && e.animationName === "hw-out") setLeaving((l) => (l.includes(i) ? l.filter((x) => x !== i) : l));
                    }}
                  >
                    <span className="hw-line t-display text-[clamp(38px,11.4vw,50px)] text-cream md:text-[clamp(46px,5.3vw,84px)]" style={{ ["--l" as string]: 0 }}>
                      <span>{p.lead}</span>
                    </span>
                    <span className="hw-line t-italic mt-1.5 text-[clamp(46px,13.6vw,60px)] text-red md:mt-2 md:text-[clamp(58px,6.7vw,104px)]" style={{ ["--l" as string]: 1 }}>
                      <span>{p.emphasis}</span>
                      <span className="hw-ghost" aria-hidden="true">{p.emphasis}</span>
                    </span>
                  </span>
                );
              })}
            </h1>
            </div>
            <p style={{ ["--rd" as string]: 0 }} className="t-body hw-rise mt-5 max-w-[420px] text-[15px] text-cream md:mt-7 md:text-[18px]">{DESCRIPTION}</p>
            <a
              href="#work"
              style={{ ["--rd" as string]: 1 }}
              className="hw-link hw-rise pointer-events-auto t-meta mt-4 inline-flex min-h-11 items-center gap-1.5 text-[11px] text-cream md:mt-5 md:min-h-8 md:text-[12px]"
            >
              <span className="hw-link-t">Explore our work <span aria-hidden="true">↗</span></span>
            </a>
          </div>
        </div>

        {/* ── Selectors bottom-left; pause + counter bottom-right ───── */}
        <div style={{ ["--rd" as string]: 2 }} className="hw-rise absolute inset-x-(--gutter) bottom-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 md:bottom-7">
          <div className="flex flex-wrap gap-x-5 gap-y-0 md:gap-x-8" role="group" aria-label="Banners">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={i === face}
                onClick={() => go(i)}
                className={`t-meta relative flex min-h-11 items-center whitespace-nowrap text-[11px] transition-opacity md:min-h-9 ${i === face ? "text-cream opacity-100" : "text-cream opacity-55 hover:opacity-100"}`}
              >
                <span aria-hidden="true" className={`absolute inset-x-0 top-1.5 h-[2px] origin-left transition-transform duration-500 md:top-1 ${i === face ? "scale-x-100" : "scale-x-0"}`} style={{ background: b.accent }} />
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-5 md:gap-7">
            <button
              type="button"
              onClick={() => setUserPaused(!paused)}
              aria-label={paused ? "Resume automatic banner changes" : "Pause automatic banner changes"}
              className="t-meta flex min-h-11 items-center gap-2 text-[11px] text-cream/80 transition-colors hover:text-yellow md:min-h-9"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
                {paused ? <path d="M1 0 L10 5 L1 10 Z" /> : <><rect x="0.5" y="0" width="3" height="10" /><rect x="6.5" y="0" width="3" height="10" /></>}
              </svg>
              <span className="hidden sm:inline">{paused ? "Resume" : "Pause"} auto-change</span>
            </button>
            <div className="t-meta pointer-events-none flex items-center gap-3 text-[11px]" aria-hidden="true">
              <span className="block h-px w-7 bg-yellow" />
              <span>0{face + 1} / 0{FACES}</span>
            </div>
          </div>
        </div>
      </div>

      {/* prototype-only review controls (not part of the hero composition) */}
      <div data-hw-preview="" className="t-meta absolute right-(--gutter) top-[84px] z-10 flex items-center gap-px text-[10px] md:top-[116px]" role="group" aria-label="Opening stages 01–06 (preview only)">
        {STAGES.map((st) => (
          <button key={st.id} type="button" aria-pressed={view === st.id} title={st.label} onClick={() => review(st.id)} className={`min-h-9 border border-cream/25 bg-ink/50 px-2 backdrop-blur-sm transition-colors md:px-2.5 ${view === st.id ? "text-cream" : "text-cream/60 hover:text-cream"}`}>
            0{st.id}<span className="hidden lg:inline"> {st.label}</span>
          </button>
        ))}
        <button type="button" onClick={replay} className="min-h-9 border border-cream/25 bg-ink/50 px-2.5 text-cream/70 backdrop-blur-sm transition-colors hover:text-cream md:px-3">
          ↻ Replay<span className="hidden opacity-60 md:inline"> · preview only</span>
        </button>
      </div>
      <noscript>
        <style>{`.hw-root [data-hw-poster]{opacity:1!important}.hw-root .hw-image{opacity:1!important}.hw-root .hw-rise{animation:none!important;opacity:1!important}.hw-root .hw-line.t-italic{visibility:visible!important}.hw-root .hw-phrase[data-state="active"] .hw-line>span{animation:none!important;transform:none!important}`}</style>
      </noscript>

      <p className="sr-only" aria-live="polite">{announce}</p>
      <p className="sr-only">{current.description}</p>
    </section>
  );
}
