"use client";

import "./corridor.css";
import { useEffect, useRef, useState } from "react";
import type { CorridorContent } from "@/content/types";
import { useMedia, useTabHidden } from "@/lib/use-media";

/**
 * ShowreelCorridor — a three-wall video corridor. The SAME video is the surface of the front wall and of both side walls.
 *
 *  • Geometry: three 2.4 : 1 planes (1680 × 700 scene units) in real CSS 3D — see corridor.css. A 2.4 : 1 master fills every
 *    wall exactly; any other ratio is centre-cropped (never stretched, never letterboxed).
 *  • One hidden <video> is the single playback source; every wall's <canvas> is painted from it in the same animation frame,
 *    so all three always show the same frame (play / pause / buffering / loop / tab visibility act on that one element).
 *    Muted → no audio source and no sound control. Playback is independent of scroll and never rewinds with it.
 *  • Timeline (NATIVE scroll — tall track + sticky pin, no wheel/touch listeners, no scroll lock):
 *      approach → stationary scroll-linked text reveal → readable hold → release. Fully reversible.
 *  • The final arrival composition (headline above, borderless front video, paragraph below) is solved in layout FIRST; the
 *    camera's end translation is derived from it, so the front video grows smoothly and is never resized to make room.
 *  • Reduced motion: no pin, no camera movement, no autoplay — the completed composition is shown directly.
 *  • No video: poster (or a labelled placeholder) on all three walls, no controls, no duration.
 * The frame loop and observers run only while the section is near the viewport.
 */

const WALL_W = 1680; // front/side wall width in scene units (2.4 : 1 with WALL_H)
const WALL_H = 700;
const WALL_RATIO = WALL_W / WALL_H; // 2.4
const WALL_Z = -1500; // front wall depth
const WALL_YC = 110 + WALL_H / 2; // front wall centre (scene y)
const ORIGIN_Y = 480; // perspective origin (48 % of the 1000-high stage)
const PERSPECTIVE = 1000;
const MOBILE_QUERY = "(max-width: 1023px)"; // phones and tablets use the stacked arrival layout
// Scroll timeline in px: approach, then the stationary text reveal, then a readable hold (then release).
const DESKTOP = { approach: 1600, reveal: 450 };
const MOBILE = { approach: 2500, reveal: 400 };

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};

export function ShowreelCorridor({ content }: { content: CorridorContent }) {
  const reduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const tabHidden = useTabHidden();
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false); // load the video only once the section is close
  const [inView, setInView] = useState(false);
  const [videoOk, setVideoOk] = useState(false); // true once the configured video has real frames
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? reduced;
  const hasVideo = !!content.video && videoOk;
  const dirty = useRef(true);
  const hasVideoRef = useRef(false);
  const cpRef = useRef(reduced ? 1 : 0); // camera progress persists if the engine restarts
  const rrRef = useRef(reduced ? 1 : 0);
  const onResizeRef = useRef<(() => void) | null>(null);

  // Visibility: near (start loading) and in view (run the frame loop and playback).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const far = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "20% 0px" });
    far.observe(el);
    io.observe(el);
    return () => {
      far.disconnect();
      io.disconnect();
    };
  }, []);

  // The single video element → state. Buffering/seeking just leave the last frame on every wall until the next frame.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => {
      if (v.videoWidth > 0) setVideoOk(true);
      dirty.current = true;
    };
    const onPlay = () => setPlaying(!v.paused);
    const onErr = () => {
      setVideoOk(false);
      setPlaying(false);
      dirty.current = true;
    };
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("seeked", onReady);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPlay);
    v.addEventListener("error", onErr);
    onReady();
    return () => {
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("seeked", onReady);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPlay);
      v.removeEventListener("error", onErr);
    };
  }, [near, content.video]);

  // Playback policy: plays only while in view, not user-paused, tab visible; reduced-motion visitors start paused.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !content.video) return;
    if (inView && !paused && !tabHidden) v.play().catch(() => {});
    else v.pause();
  }, [inView, paused, tabHidden, near, content.video]);

  useEffect(() => {
    hasVideoRef.current = hasVideo;
    dirty.current = true;
  }, [hasVideo]);

  // Engine: scroll-linked camera + one painting pass for all walls. Runs only while the section is in view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !inView) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s);
    const qa = (s: string) => [...root.querySelectorAll<HTMLCanvasElement>(s)];
    const mq = window.matchMedia(MOBILE_QUERY);
    let raf = 0;
    let cp = reduced ? 1 : cpRef.current;
    let lastT = -1;
    let hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;

    // ── painting: one source, every wall, same tick ──
    let poster: HTMLImageElement | null = null;
    if (content.poster) {
      poster = new Image();
      poster.onload = () => (dirty.current = true);
      poster.src = content.poster.src;
    }
    document.fonts?.ready.then(() => {
      dirty.current = true;
      onResizeRef.current?.();
    });
    const family = () => getComputedStyle(root).fontFamily;
    const drawPlaceholder = (g: CanvasRenderingContext2D, W: number, H: number) => {
      const f = family();
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, "#1d1b18");
      gr.addColorStop(1, "#0F0F0E");
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(243,232,204,.2)";
      g.lineWidth = Math.max(2, H * 0.004);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(W, H);
      g.moveTo(W, 0);
      g.lineTo(0, H);
      g.stroke();
      g.strokeStyle = "rgba(243,232,204,.34)"; // placeholder only: makes the wall edges and junctions readable
      g.lineWidth = Math.max(3, H * 0.008);
      g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, H - g.lineWidth);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#0F0F0E";
      g.fillRect(W / 2 - H * 0.62, H / 2 - H * 0.2, H * 1.24, H * 0.4);
      g.fillStyle = "#F3E8CC";
      g.font = `900 ${H * 0.17}px ${f}`;
      g.fillText("SHOWREEL", W / 2, H / 2 - H * 0.045);
      g.fillStyle = "#FFCA26";
      g.font = `600 ${H * 0.055}px ${f}`;
      g.fillText("2.4:1 VIDEO PLACEHOLDER", W / 2, H / 2 + H * 0.09);
    };
    const drawSurface = (c: HTMLCanvasElement) => {
      const g = c.getContext("2d");
      if (!g) return;
      const v = videoRef.current;
      const W = c.width;
      const H = c.height;
      const vr = !!v && v.readyState >= 2 && v.videoWidth > 0;
      const pr = !!poster && poster.complete && poster.naturalWidth > 0;
      if (vr || pr) {
        const src = (vr ? v : poster) as CanvasImageSource;
        const sw = vr ? v!.videoWidth : poster!.naturalWidth;
        const sh = vr ? v!.videoHeight : poster!.naturalHeight;
        const k = Math.max(W / sw, H / sh); // cover: fills the wall exactly at 2.4 : 1, never stretches, never letterboxes
        g.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k);
      } else drawPlaceholder(g, W, H);
    };
    const paint = () => {
      // Read the video ONCE per tick (front wall); the side walls copy that exact bitmap. drawImage(video) can pick up a newer
      // decoded frame between calls, so painting each wall from the video separately could leave one wall a frame ahead.
      const front = q("canvas[data-vs='front']") as HTMLCanvasElement | null;
      if (!front) return;
      drawSurface(front);
      for (const c of qa("canvas[data-vs='left'], canvas[data-vs='right']")) c.getContext("2d")?.drawImage(front, 0, 0, c.width, c.height);
    };

    // ── final composition, solved in layout BEFORE any approach ──
    const pinEl = q("[data-pin]");
    const trackEl = q("[data-track]");
    const fitEl = q("[data-fit]");
    const sceneEl = q("[data-scene]");
    const leadEl = q("[data-lead]");
    const kickEl = q("[data-kicker]");
    const fadeEl = q("[data-fade]");
    const ahEl = q("[data-ah]");
    const apEl = q("[data-ap]");
    let endT = 1250;
    let endDy = 0;
    const layout = () => {
      if (!pinEl || !fitEl || !ahEl || !apEl || !pinEl.clientWidth) return;
      const w = pinEl.clientWidth;
      const h = pinEl.clientHeight;
      const mobile = mq.matches;
      // Stage scale: desktop fits the 1440 × 1000 stage; mobile starts with the far wall ≈ 62 % of the screen width.
      const s = mobile ? Math.min(1, h / 1000, (0.62 * w) / (WALL_W * 0.4)) : Math.min(1, w / 1440, h / 1000);
      const top = Math.max(0, (h - 1000 * s) / 2);
      fitEl.style.transform = `scale(${s})`;
      fitEl.style.top = `${top}px`;
      // Arrival stack: headline · front video (2.4 : 1, borderless, as wide as fits) · paragraph.
      const pad = clamp(w * 0.05, 16, 64);
      const padT = Math.round(clamp(h * 0.03, 12, 28));
      const padB = Math.round(clamp(h * 0.07, 56, 76)); // clear of the controls row
      const gap = Math.round(clamp(h * 0.03, 12, 30));
      ahEl.style.fontSize = `${Math.round(Math.min(clamp(h * 0.085, 28, 76), w * 0.1))}px`;
      ahEl.style.width = `${Math.min(1100, w - 2 * pad)}px`;
      apEl.style.fontSize = `${Math.round(clamp(h * 0.02, 14, 18))}px`;
      apEl.style.width = `${Math.min(640, w - 2 * pad)}px`;
      const hH = ahEl.offsetHeight;
      const hP = apEl.offsetHeight;
      const availH = h - padT - padB - hH - hP - 2 * gap;
      const Wt = Math.max(240, Math.min(w, availH * WALL_RATIO));
      const Ht = Wt / WALL_RATIO;
      const top0 = padT + Math.max(0, (h - padT - padB - (hH + gap + Ht + gap + hP)) / 2);
      const yt = top0 + hH + gap + Ht / 2; // where the front wall's centre must end up
      ahEl.style.top = `${top0}px`;
      apEl.style.top = `${yt + Ht / 2 + gap}px`;
      // Camera end state: perspective scale of the front wall = PERSPECTIVE / (PERSPECTIVE − WALL_Z − … T)
      const sc = Wt / (WALL_W * s);
      endT = PERSPECTIVE - WALL_Z - PERSPECTIVE / sc;
      endDy = ((yt - top) / s - ORIGIN_Y) / sc + ORIGIN_Y - WALL_YC;
    };
    const reveal = (el: HTMLElement | null, u: number, dist: number) => {
      if (!el) return;
      const e = 1 - Math.pow(1 - clamp(u), 3);
      el.style.opacity = String(e);
      el.style.transform = `translateY(${((1 - e) * dist).toFixed(1)}px)`;
    };
    const apply = (p: number, r: number) => {
      if (sceneEl) sceneEl.style.transform = `translate3d(0,${(endDy * p).toFixed(2)}px,${(endT * p).toFixed(1)}px)`;
      const out = 1 - smooth((p - 0.55) / 0.3); // approach copy leaves before arrival → never two headlines
      if (leadEl) leadEl.style.opacity = String(out);
      if (kickEl) kickEl.style.opacity = String(out);
      if (fadeEl) fadeEl.style.opacity = String(1 - smooth((p - 0.15) / 0.35));
      const dist = mq.matches ? 30 : 34;
      reveal(ahEl, r / 0.6, dist);
      reveal(apEl, (r - 0.25) / 0.6, dist * 0.65);
    };

    // Timeline (native scroll): approach → stationary reveal → hold → release. Video playback is independent of it.
    let lastP = -1;
    let lastR = -1;
    let rr = reduced ? 1 : rrRef.current;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const T = mq.matches ? MOBILE : DESKTOP;
      let tp = 1;
      let tr = 1;
      if (!reduced && trackEl) {
        const off = Math.max(0, hh - trackEl.getBoundingClientRect().top);
        tp = clamp(off / T.approach);
        tr = clamp((off - T.approach) / T.reveal);
      }
      if (reduced) {
        cp = tp;
        rr = tr;
      } else {
        cp += (tp - cp) * (mq.matches ? 0.2 : 0.1);
        if (Math.abs(tp - cp) < 0.0004) cp = tp;
        rr += (tr - rr) * 0.12;
        if (Math.abs(tr - rr) < 0.0004) rr = tr;
      }
      if (cp !== lastP || rr !== lastR || dirty.current) {
        apply(cp, rr * smooth((cp - 0.96) / 0.04)); // text never starts before the camera has arrived
        lastP = cp;
        lastR = rr;
      }
      const v = videoRef.current;
      const t = v ? v.currentTime : -1;
      if (t !== lastT || dirty.current) {
        lastT = t;
        paint();
        dirty.current = false;
      }
    };

    const onResize = () => {
      hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
      layout();
      lastP = -1;
      dirty.current = true;
    };
    onResizeRef.current = onResize;
    const ro = new ResizeObserver(onResize);
    if (pinEl) ro.observe(pinEl);
    // The composition depends on the arrival text's measured height: re-solve when fonts/wrapping change it.
    for (const el of [ahEl, apEl]) if (el) ro.observe(el);
    mq.addEventListener("change", onResize);
    onResize();
    raf = requestAnimationFrame(tick);
    return () => {
      cpRef.current = cp;
      rrRef.current = rr;
      onResizeRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener("change", onResize);
    };
  }, [inView, reduced, content]);

  const togglePlay = () => setUserPaused(!paused);
  const isPlaying = playing && !paused;

  return (
    <section ref={rootRef} id="work" aria-label={`${content.headline.lead} ${content.headline.emphasis}`} className={`cor-root ${reduced ? "cor-static" : ""}`}>
      {near && content.video && (
        <video ref={videoRef} className="cor-vid" src={content.video.src} muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} />
      )}
      <div data-track="" className="cor-track">
        <div data-pin="" className="cor-pin">
          <div data-fit="" className="cor-fit" aria-hidden="true">
            <div className="cor-world">
              <div data-scene="" className="cor-scene">
                {/* Front wall, left wall, right wall: the SAME video on each, un-mirrored. */}
                <div className="cor-wall cor-front">
                  <canvas data-vs="front" width={2400} height={1000} />
                </div>
                <div className="cor-wall cor-wl">
                  <canvas data-vs="left" width={1200} height={500} />
                  <div className="cor-shade" />
                </div>
                <div className="cor-wall cor-wr">
                  <canvas data-vs="right" width={1200} height={500} />
                  <div className="cor-shade" />
                </div>
              </div>
            </div>
          </div>
          <div data-fade="" className="cor-fade" aria-hidden="true" />
          <div className="cor-ui">
            <p data-kicker="" className="cor-nm cor-kicker">
              {content.kicker}
            </p>
            <div data-lead="" className="cor-lead">
              <h2 className="cor-nk">
                {content.headline.lead}
                <span className="cor-iv">{content.headline.emphasis}</span>
              </h2>
              <p className="cor-nl">{content.intro}</p>
            </div>
            <h3 data-ah="" className="cor-nk cor-ah">
              {content.arrivalHeadline}
            </h3>
            <p data-ap="" className="cor-nl cor-ap">
              {content.arrivalDescription}
            </p>
            <div className="cor-ctl">
              {hasVideo && (
                <button type="button" className="cor-btn" onClick={togglePlay} aria-pressed={isPlaying} aria-label={isPlaying ? "Pause showreel video" : "Play showreel video"}>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    {isPlaying ? (
                      <>
                        <rect x="1" y="1" width="4" height="12" fill="currentColor" />
                        <rect x="9" y="1" width="4" height="12" fill="currentColor" />
                      </>
                    ) : (
                      <path d="M2 1 L13 7 L2 13 Z" fill="currentColor" />
                    )}
                  </svg>
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>
              )}
              <div className="cor-sq" aria-hidden="true">
                <span style={{ background: "#FFCA26" }} />
                <span style={{ background: "#F86015" }} />
                <span style={{ background: "#9ACC42" }} />
              </div>
            </div>
          </div>
          <p className="sr-only">{content.accessibleDescription}</p>
        </div>
      </div>
    </section>
  );
}
