"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HeroContent } from "@/content/types";
import { pingPongProgress } from "./config";
import { PrismEngine } from "./prism-engine";

/**
 * HeroWall — a ribbed wall that is a 3-sided prism. Two INDEPENDENT systems:
 *
 *  A. Frame playback — driven only by the absolute page scroll position (anywhere on the page).
 *     progress = pingPongProgress(scrollY) — one full sequence per `sequenceScrollDistancePx`
 *     (see ./config.ts), then back again, continuously (first → last → first …).
 *     Every banner has its own image sequence and shows frame round(progress × (count − 1)).
 *     Same position → same frame; scrolling stops → frame holds; scrolling up → exact reverse.
 *     No wheel capture, no autoplay.
 *
 *  B. Banner changes — a five-second timer (after the prism has settled) turns the prism to the next
 *     banner. Manual controls (chips, arrow keys, swipe, click) also turn it and reset the timer.
 *     Turning the prism never changes scroll position or progress.
 *
 * Desktop follows the approved canvas. Narrower layouts are a first-pass MOBILE ADAPTATION,
 * NOT design-approved: fewer/wider ribs, swipe + buttons.
 */

const FACES = 3;
const RADIUS_PER_RIB = 0.288675; // 1 / (2·tan 60°): apothem of a triangular prism per unit rib width
const ROTATE_MS = 1100;
const STAGGER = 0.6; // fraction of ROTATE_MS spread across the ribs
const TRANSITION_MS = Math.round(ROTATE_MS * (1 + STAGGER)); // last rib finishes turning
const AUTO_MS = 5000; // settled display time before an automatic change

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

export function HeroWall({ hero }: { hero: HeroContent }) {
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
  const paused = userPaused ?? reduced; // reduced-motion visitors start paused
  const face = ((turns % FACES) + FACES) % FACES;

  const sectionRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement[][]>([]);
  const engineRef = useRef<PrismEngine | null>(null);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const settle = useRef(0); // extra wait after a prism turn so the 5 s is *settled* display time

  const turn = (delta: number, manual: boolean) => {
    settle.current = TRANSITION_MS;
    setTurns((t) => t + delta);
    if (manual) setAnnounce(`Banner ${(((turns + delta) % FACES) + FACES) % FACES + 1} of ${FACES}: ${banners[(((turns + delta) % FACES) + FACES) % FACES].label}`);
  };

  // Engine + global scroll progress + visibility.
  useEffect(() => {
    const engine = new PrismEngine(banners, () => setReady(true));
    engineRef.current = engine;
    const wall = wallRef.current!;
    const onResize = () => engine.resize(wall.clientWidth, wall.clientHeight, window.devicePixelRatio || 1);
    const ro = new ResizeObserver(onResize);
    ro.observe(wall);
    onResize();

    // One shared normalised progress for the whole document (not tied to the hero's own box).
    const progress = () => engine.setProgress(pingPongProgress(window.scrollY));
    window.addEventListener("scroll", progress, { passive: true });

    const io = new IntersectionObserver(([e]) => {
      progress(); // make sure progress is current before drawing on re-entry
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

  // Hand the (re)rendered rib canvases to the engine whenever the rib count changes.
  useEffect(() => {
    const grid = gridRef.current.map((row) => row.slice(0, ribCount));
    engineRef.current?.setCanvases(grid);
  }, [ribCount]);

  // Which face is on stage (progress is untouched).
  useEffect(() => {
    engineRef.current?.setActive(face);
  }, [face]);

  // B: automatic banner change. Restarts after every turn (manual or automatic) → no overlap, and a
  // manual change always resets the interval. Stops while paused or while the tab is hidden.
  useEffect(() => {
    if (paused || tabHidden) return;
    const id = window.setTimeout(() => turn(1, false), AUTO_MS + settle.current);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `turn` only touches refs/setState
  }, [turns, paused, tabHidden]);

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

  return (
    <section
      ref={sectionRef}
      aria-label="Introduction"
      onKeyDown={onKeyDown}
      className="relative flex h-svh min-h-[560px] flex-col overflow-hidden bg-ink"
    >
      {/* ── Wall ─────────────────────────────────────────────── */}
      <div ref={wallRef} className="relative min-h-0 flex-1 [container-type:inline-size]">
        {/* Immediate poster: server-rendered, shown until the first canvas paint */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{
            opacity: ready ? 0 : 1,
            backgroundColor: "#1a1a18",
            backgroundImage: poster ? `url(${poster.src})` : `linear-gradient(135deg, ${banners[0].accent} -20%, #1a1a18 60%)`,
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
          <div
            className="absolute inset-0 [transform-style:preserve-3d]"
            style={{ transform: `translateZ(calc(${radius} * -1))` }}
          >
            {Array.from({ length: ribCount }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full [transform-style:preserve-3d]"
                style={{
                  left: `calc(${rib} * ${i})`,
                  width: rib,
                  transform: `rotateY(${-120 * turns}deg)`,
                  transition: reduced
                    ? "none"
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

        {/* legibility gradient under the counter */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink/70" />

        <div className="t-meta pointer-events-none absolute bottom-4 right-(--gutter) flex items-center gap-3 text-[11px] md:bottom-5" aria-hidden="true">
          <span className="block h-px w-7 bg-yellow" />
          <span>
            0{face + 1} / 0{FACES}
          </span>
        </div>
      </div>

      {/* ── Band ─────────────────────────────────────────────── */}
      <div className="border-t border-cream/15 bg-ink px-(--gutter) py-5 lg:h-[120px] lg:py-0">
        <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <h1 className="t-display whitespace-nowrap text-[clamp(30px,8vw,44px)]">
            {hero.headline.lead}
            <br />
            <span className="t-italic text-yellow" style={{ fontSize: "1.06em" }}>
              {hero.headline.emphasis}
            </span>
          </h1>

          <p className="t-body max-w-[430px] text-sm text-cream md:text-base">{hero.intro}</p>

          <div className="flex flex-row items-center gap-5 lg:flex-col lg:items-start lg:gap-1">
            <p className="t-meta hidden text-[10px] text-cream/80 lg:block">
              {hero.scrollHint}
              <span aria-hidden="true"> ↓</span>
            </p>
            <button
              type="button"
              onClick={() => setUserPaused(!paused)}
              aria-label={paused ? "Resume automatic banner changes" : "Pause automatic banner changes"}
              className="t-meta flex min-h-11 items-center gap-2 text-[11px] text-cream/80 transition-colors hover:text-yellow lg:min-h-6"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
                {paused ? <path d="M1 0 L10 5 L1 10 Z" /> : <><rect x="0.5" y="0" width="3" height="10" /><rect x="6.5" y="0" width="3" height="10" /></>}
              </svg>
              {paused ? "Resume" : "Pause"} auto-change
            </button>
          </div>

          <div className="flex flex-row flex-wrap gap-x-5 gap-y-1 lg:min-w-[170px] lg:flex-col lg:gap-1.5" role="group" aria-label="Faces of the wall">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={i === face}
                onClick={() => go(i)}
                className={`t-meta flex min-h-11 items-center gap-2.5 whitespace-nowrap text-[11px] transition-opacity lg:min-h-6 ${i === face ? "opacity-100" : "opacity-55 hover:opacity-100"}`}
              >
                <i className="block h-3.5 w-3.5" style={{ background: b.accent }} />
                {b.number} {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Announced only for manual changes — automatic rotation stays silent. */}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <p className="sr-only">{current.description}</p>
    </section>
  );
}
