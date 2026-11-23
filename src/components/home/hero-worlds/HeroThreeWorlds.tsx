"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

// Opening (plays once per tab session, on entry at the top). The ribs start narrowly turned and rotate into place with a left→right stagger;
// the copy and controls reveal as the picture settles. Durations here must match the --hw-* / hw-rise timings in hero-worlds.css.
const OPEN_ANGLE = 64; // deg the ribs start turned away from the viewer
const OPEN_ROTATE_MS = 950;
const OPEN_STAGGER_MS = 450; // → every rib has settled after 1.4 s
const OPEN_DONE_MS = 2000; // last reveal (bottom controls) has finished → hand over to the normal behaviour
const OPEN_KEY = "rmz-hero-three-worlds-opening";
type Phase = "pending" | "armed" | "running" | "done"; // pending: server render / before the decision · armed: start pose, waiting for the first image · running · done

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

export function HeroThreeWorlds({ hero }: { hero: HeroContent }) {
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
  useEffect(() => {
    let skip = false;
    try {
      skip = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav && nav.type !== "navigate") skip = true;
      if (window.location.hash) skip = true;
      if (window.scrollY > 8) skip = true;
      if (sessionStorage.getItem(OPEN_KEY)) skip = true;
    } catch { /* storage blocked etc.: play (still harmless) */ }
    const id = window.setTimeout(() => {
      if (phaseRef.current !== "pending") return;
      if (skip) { setPhase("done"); return; }
      try { sessionStorage.setItem(OPEN_KEY, "1"); } catch { /* ignore */ }
      setIntro(true);
      setPhase("armed");
    }, 0);
    // Static fallback: if anything stalls before the decision, show the normal hero.
    const wd = window.setTimeout(() => { if (phaseRef.current === "pending") setPhase("done"); }, 2500);
    return () => { window.clearTimeout(id); window.clearTimeout(wd); };
  }, []);

  // Armed → running as soon as the first image has painted (the engine's existing readiness); no page-wide gate: after 1.5 s without it, skip the opening.
  useEffect(() => {
    if (phase !== "armed") return;
    let r1 = 0, r2 = 0, to = 0;
    if (ready) {
      r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setPhase("running")); }); // two frames: the start pose is committed first
    } else {
      to = window.setTimeout(() => { if (phaseRef.current === "armed") setPhase("done"); }, 1500);
    }
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); window.clearTimeout(to); };
  }, [phase, ready]);

  useEffect(() => {
    if (phase !== "running") return;
    const t = window.setTimeout(() => { if (phaseRef.current === "running") setPhase("done"); }, OPEN_DONE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Any scroll / wheel / touch / key / pointer input finishes the opening immediately. Nothing is prevented, scroll is never locked or reset.
  useEffect(() => {
    if (phase !== "armed" && phase !== "running") return;
    const fin = () => finishOpening();
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

  // Prototype-only: replay the opening for review.
  const replay = () => {
    finishOpening();
    window.scrollTo({ top: 0, behavior: "instant" });
    lastFace.current = 0;
    settle.current = 0;
    setLeaving([]);
    setBoot(true);
    setTurns(0);
    setIntro(true);
    setPhase("armed");
  };

  useEffect(() => {
    const engine = new PrismEngine(banners, () => setReady(true));
    engineRef.current = engine;
    const wall = wallRef.current!;
    const ro = new ResizeObserver(() => engine.resize(wall.clientWidth, wall.clientHeight, window.devicePixelRatio || 1));
    ro.observe(wall);
    engine.resize(wall.clientWidth, wall.clientHeight, window.devicePixelRatio || 1);
    const progress = () => engine.setProgress(pingPongProgress(window.scrollY));
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
  useEffect(() => {
    engineRef.current?.setActive(face);
  }, [face]);

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
      data-intro={intro ? "1" : "0"}
      className="hw-root relative flex h-svh min-h-[560px] flex-col overflow-hidden bg-ink"
    >
      {poster && <link rel="preload" as="image" href={poster.src} fetchPriority="high" />}

      <div ref={wallRef} className="relative min-h-0 flex-1 [container-type:inline-size]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{
            opacity: phase === "armed" || phase === "running" ? 0 : ready ? 0 : 1,
            transition: phase === "armed" ? "none" : undefined,
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
                  transform: `rotateY(${-120 * turns + (phase === "armed" ? OPEN_ANGLE : 0)}deg)`,
                  transition: reduced || phase === "armed"
                    ? "none"
                    : phase === "running"
                      ? `transform ${OPEN_ROTATE_MS}ms cubic-bezier(.16,.84,.3,1) ${Math.round((i / (ribCount - 1)) * OPEN_STAGGER_MS)}ms`
                      : `transform ${ROTATE_MS}ms cubic-bezier(.65,0,.35,1) ${Math.round((i / (ribCount - 1)) * STAGGER * ROTATE_MS)}ms`,
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

        {/* opening curtain: covers the start pose until the first image has painted, then fades (no flash) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: phase === "armed" ? 1 : 0, transition: phase === "running" ? "opacity 320ms ease-out" : "none" }} />

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

      {/* prototype-only review control (not part of the hero composition) */}
      <button
        type="button"
        onClick={replay}
        className="t-meta absolute right-(--gutter) top-[100px] z-10 min-h-9 border border-cream/25 bg-ink/40 px-3 text-[10px] text-cream/70 backdrop-blur-sm transition-colors hover:text-cream md:top-[116px]"
      >
        ↻ Replay opening <span className="opacity-60">· preview only</span>
      </button>
      <noscript>
        <style>{`.hw-root .hw-rise{animation:none!important;opacity:1!important}.hw-root .hw-phrase[data-state="active"] .hw-line>span{animation:none!important;transform:none!important}`}</style>
      </noscript>

      <p className="sr-only" aria-live="polite">{announce}</p>
      <p className="sr-only">{current.description}</p>
    </section>
  );
}
