"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HeroContent } from "@/content/types";
import { PrismEngine } from "./prism-engine";

/**
 * HeroWall — a ribbed wall that is a 3-sided prism. Each rib turns 120° so the whole wall shows
 * the next banner. Banner 1 is an image sequence scrubbed by the page scroll (reversible);
 * the others are stills. Native scrolling only: no wheel capture, so page navigation is never trapped.
 *
 * Desktop behaviour follows the approved canvas. The narrower layouts (<1024px) are a first-pass
 * MOBILE ADAPTATION, NOT design-approved: fewer/wider ribs, swipe + buttons instead of hover/click.
 */

const FACES = 3;
const RADIUS_PER_RIB = 0.288675; // 1 / (2·tan 60°): apothem of a triangular prism per unit rib width
const ROTATE_MS = 1100;
const STAGGER = 0.6; // fraction of ROTATE_MS spread across the ribs

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

export function HeroWall({ hero }: { hero: HeroContent }) {
  const { banners } = hero;
  const wide = useMedia("(min-width: 1024px)", true);
  const mid = useMedia("(min-width: 640px)", true);
  const reduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const ribCount = wide ? 30 : mid ? 20 : 12;

  const [turns, setTurns] = useState(0);
  const [ready, setReady] = useState(false);
  const face = ((turns % FACES) + FACES) % FACES;

  const trackRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement[][]>([]);
  const engineRef = useRef<PrismEngine | null>(null);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);

  // Engine: create once per banner set, wire scroll + resize.
  useEffect(() => {
    const engine = new PrismEngine(banners, () => setReady(true));
    engineRef.current = engine;
    const wall = wallRef.current!;
    const onResize = () => engine.resize(wall.clientWidth, wall.clientHeight, window.devicePixelRatio || 1);
    const ro = new ResizeObserver(onResize);
    ro.observe(wall);
    onResize();

    const onScroll = () => {
      const t = trackRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      engine.setFrame(Math.round(p * (engine.frameCount - 1)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, [banners]);

  // Hand the (re)rendered rib canvases to the engine whenever the rib count changes.
  useEffect(() => {
    const grid = gridRef.current.map((row) => row.slice(0, ribCount));
    engineRef.current?.setCanvases(grid);
  }, [ribCount]);

  const go = (target: number) => {
    const cur = ((turns % FACES) + FACES) % FACES;
    let d = (target - cur + FACES) % FACES;
    if (d === 2) d = -1;
    setTurns(turns + d);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setTurns((t) => t + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setTurns((t) => t - 1); }
  };

  const usesPlaceholder = banners.some((b) => b.media === null);
  const rib = `calc(100cqw / ${ribCount})`;
  const radius = `calc(${rib} * ${RADIUS_PER_RIB})`;
  const current = banners[face];

  return (
    <section
      ref={trackRef}
      aria-label="Introduction"
      className="relative"
      style={{ height: "calc(100svh + 220svh)" /* scroll distance that scrubs the sequence */ }}
    >
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden bg-ink">
        {/* ── Wall ─────────────────────────────────────────────── */}
        <div ref={wallRef} className="relative min-h-0 flex-1 [container-type:inline-size]">
          {/* Immediate poster: server-rendered, shown until the first canvas paint */}
          <div
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              opacity: ready ? 0 : 1,
              background: `linear-gradient(135deg, ${banners[0].accent} -20%, #1a1a18 60%)`,
            }}
          />

          <button
            type="button"
            className="absolute inset-0 block cursor-pointer touch-pan-y [perspective:1900px] [perspective-origin:50%_50%]"
            aria-label={`Rib wall, banner ${face + 1} of ${FACES}: ${current.label}. Press to turn to the next banner, or use the left and right arrow keys.`}
            onClick={() => {
              if (swipe.current?.moved) return;
              setTurns((t) => t + 1);
            }}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => { swipe.current = { x: e.clientX, moved: false }; }}
            onPointerUp={(e) => {
              const s = swipe.current;
              if (!s) return;
              const dx = e.clientX - s.x;
              if (Math.abs(dx) > 40) {
                s.moved = true;
                setTurns((t) => t + (dx < 0 ? 1 : -1));
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

          {usesPlaceholder && (
            <p className="t-meta pointer-events-none absolute bottom-4 left-(--gutter) bg-ink/80 px-2 py-1 text-[10px] text-yellow md:bottom-5">
              Dev placeholder media
            </p>
          )}
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

            <p className="t-meta hidden text-[10px] text-cream/80 lg:block">
              {hero.scrollHint}
              <span aria-hidden="true"> ↓</span>
            </p>

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

        <p className="sr-only" aria-live="polite">
          {current.description}
        </p>
      </div>
    </section>
  );
}
