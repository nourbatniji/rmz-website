"use client";

import "./corridor.css";
import { useEffect, useRef, useState } from "react";
import type { CorridorContent, CorridorProject, ServiceTaxonomyItem } from "@/content/types";
import { useMedia, useTabHidden } from "@/lib/use-media";

/**
 * ShowreelCorridor — "HOME - VIDEO SECTION" (desktop) / "MOBILE · 01 — VIDEO CORRIDOR" (mobile) from the approved canvas.
 *
 * A 3D corridor: the camera walks forward along a red ribbed wall until the showreel screen fills the view.
 *  • Progress is driven by NATIVE scroll: a tall track with a sticky pin below the fixed header. The canvas captured the
 *    wheel (1600 px per full walk); here the same 1600 px of ordinary scroll does it, so reverse scrolling, touch,
 *    keyboard, anchors and releasing into the next section all work without any wheel/touch listener.
 *  • One hidden <video> feeds every screen (frames are drawn to canvases), so all surfaces stay in sync.
 *  • No video configured → poster or a labelled placeholder; no player controls and no duration are shown.
 *  • Reduced motion → no pin, no walk: the final composition is shown.
 * Frame loop and observers run only while the section is near the viewport.
 */

const DESKTOP_RANGE = 1600; // scroll px for the full walk (canvas: wheel deltaY / 1600)
const MOBILE_RANGE = 2500; // canvas: RANGE_USE
const MOBILE_QUERY = "(max-width: 760px)";

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const mmss = (x: number) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(Math.floor(x % 60)).padStart(2, "0")}`;

type Props = { content: CorridorContent; services: ServiceTaxonomyItem[] };

export function ShowreelCorridor({ content, services }: Props) {
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
  const cpRef = useRef(reduced ? 1 : 0); // camera progress persists if the engine restarts (e.g. when the video becomes ready)
  const apiRef = useRef<{ seek: (f: number) => void } | null>(null);

  const catName = (p: CorridorProject) => services.find((s) => s.id === p.serviceId)?.name ?? "";

  // Visibility: near (start loading) and in view (run loops / playback).
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

  // Video element events → state. One shared source for every surface.
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

  // Playback policy: plays only while in view, not user-paused, tab visible; paused for reduced-motion until pressed.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !content.video) return;
    if (inView && !paused && !tabHidden) v.play().catch(() => {});
    else v.pause();
  }, [inView, paused, tabHidden, near, content.video]);

  const hasVideoRef = useRef(false);
  useEffect(() => {
    hasVideoRef.current = hasVideo;
    dirty.current = true;
  }, [hasVideo]);

  // Engine: scroll-linked camera + frame painting. Runs only while the section is in view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !inView) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s);
    const qa = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];
    const mq = window.matchMedia(MOBILE_QUERY);
    const sans = () => getComputedStyle(root).fontFamily;
    let raf = 0;
    let cp = reduced ? 1 : cpRef.current;
    let lastT = -1;
    let hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;

    // media sources for painting
    let poster: HTMLImageElement | null = null;
    if (content.poster) {
      poster = new Image();
      poster.onload = () => (dirty.current = true);
      poster.src = content.poster.src;
    }
    const projPoster = content.projects.map((p) => {
      if (!p.poster) return null;
      const im = new Image();
      im.onload = () => (dirty.current = true);
      im.src = p.poster.src;
      return im;
    });
    document.fonts?.ready.then(() => (dirty.current = true));

    const drawPlaceholder = (g: CanvasRenderingContext2D, W: number, H: number) => {
      const f = sans();
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, "#1d1b18");
      gr.addColorStop(1, "#0F0F0E");
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(243,232,204,.22)";
      g.lineWidth = 2;
      g.strokeRect(W * 0.022, H * 0.039, W * 0.956, H * 0.922);
      g.beginPath();
      g.moveTo(W * 0.022, H * 0.039);
      g.lineTo(W * 0.978, H * 0.961);
      g.moveTo(W * 0.978, H * 0.039);
      g.lineTo(W * 0.022, H * 0.961);
      g.stroke();
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#0F0F0E";
      g.fillRect(W / 2 - W * 0.258, H / 2 - H * 0.133, W * 0.516, H * 0.267);
      g.fillStyle = "#F3E8CC";
      g.font = `900 ${H * 0.117}px ${f}`;
      g.fillText("SHOWREEL", W / 2, H / 2 - H * 0.047);
      g.fillStyle = "#FFCA26";
      g.font = `600 ${H * 0.039}px ${f}`;
      g.fillText("16:9 VIDEO PLACEHOLDER", W / 2, H / 2 + H * 0.061);
    };
    const drawVideoSurface = (c: HTMLCanvasElement) => {
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
        const k = Math.min(W / sw, H / sh);
        g.fillStyle = "#0F0F0E";
        g.fillRect(0, 0, W, H);
        g.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k);
      } else drawPlaceholder(g, W, H);
    };
    const drawProjectPoster = (c: HTMLCanvasElement, i: number) => {
      const g = c.getContext("2d");
      if (!g) return;
      const W = c.width;
      const H = c.height;
      const im = projPoster[i];
      if (im && im.complete && im.naturalWidth > 0) {
        const k = Math.max(W / im.naturalWidth, H / im.naturalHeight);
        g.drawImage(im, (W - im.naturalWidth * k) / 2, (H - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
        return;
      }
      const p = content.projects[i];
      const f = sans();
      g.fillStyle = "#1d1b18";
      g.fillRect(0, 0, W, H);
      g.textAlign = "center";
      g.fillStyle = "#F3E8CC";
      g.font = `900 ${W * 0.5}px ${f}`;
      g.fillText(p?.number ?? "", W / 2, H * 0.55);
      g.textAlign = "left";
      g.fillStyle = "#FFCA26";
      g.font = `600 ${W * 0.034}px ${f}`;
      g.fillText(`${(p?.tag ?? "").toUpperCase()}`, W * 0.06, H * 0.07);
      g.fillStyle = "#F3E8CC";
      g.font = `900 ${W * 0.12}px ${f}`;
      g.fillText((p?.title ?? "").toUpperCase(), W * 0.06, H - H * 0.05);
    };
    const paint = () => {
      const surf = qa("canvas[data-vs]");
      for (const c of surf) if (c.getClientRects().length) drawVideoSurface(c as HTMLCanvasElement);
      for (const c of qa("canvas[data-pp]")) if (c.getClientRects().length) drawProjectPoster(c as HTMLCanvasElement, Number(c.dataset.pp));
    };

    // ── desktop camera ──
    const stageD = q("[data-d-fit]");
    const pinD = q("[data-d-pin]");
    const trackD = q("[data-d-track]");
    const sceneD = q("[data-d-scene]");
    const capD = q("[data-d-cap]");
    const cnD = q("[data-d-cn]");
    const ctD = q("[data-d-ct]");
    let capIdx = -1;
    const layoutD = () => {
      if (!pinD || !stageD) return;
      const w = pinD.clientWidth;
      const h = pinD.clientHeight;
      const s = Math.min(1, w / 1440, h / 1000);
      stageD.style.transform = `scale(${s})`;
      stageD.style.top = `${Math.max(0, (h - 1000 * s) / 2)}px`;
    };
    const applyD = (p: number) => {
      if (sceneD) sceneD.style.transform = `translateZ(${(p * 1250).toFixed(1)}px)`;
      if (capD) {
        const n = content.projects.length;
        const i = clamp(Math.floor(p * n), 0, n - 1);
        if (i !== capIdx) {
          capIdx = i;
          const pr = content.projects[i];
          if (pr && cnD && ctD) {
            cnD.textContent = `${pr.number} · ${catName(pr)} · ${pr.tag}`;
            ctD.textContent = pr.title;
          }
        }
        capD.style.opacity = String(clamp((p - 0.06) / 0.12));
      }
    };

    // ── mobile camera (canvas Mobile01) ──
    const fitM = q("[data-m-fit]");
    const pinM = q("[data-m-pin]");
    const trackM = q("[data-m-track]");
    let Hs = 844;
    const P = 560, D = 580, VW = 308, VH = 384, YOFF = 27;
    const m = {
      world: q("[data-m-world]"), stage: q("[data-m-stage]"), wl: q("[data-m-wl]"), wr: q("[data-m-wr]"),
      cf: qa("[data-m-cf]"), left: q("[data-m-left]"), right: q("[data-m-right]"),
      hl: q("[data-m-hl]"), kicker: q("[data-m-kicker]"), cue: q("[data-m-cue]"), pct: q("[data-m-pct]"), bar: q("[data-m-bar]"),
      pl: q("[data-m-pl]"), scrs: qa("[data-m-scr]"), tc: q("[data-m-tc]"), fill: q("[data-m-fill]"), thumb: q("[data-m-thumb]"), seek: q("[data-m-seek]"),
    };
    const layoutM = () => {
      if (!pinM || !fitM) return;
      const k = pinM.clientWidth / 390;
      Hs = pinM.clientHeight / k;
      fitM.style.height = `${Hs}px`;
      fitM.style.transform = `scale(${k})`;
    };
    const applyM = (p: number) => {
      if (!m.world || !m.stage || !m.wl || !m.wr) return;
      const s0 = P / (P + D);
      const s1 = Math.max(390 / VW, Hs / VH) * 1.03;
      const e = Math.pow(p, 1.4);
      const sc = s0 * Math.pow(s1 / s0, e);
      const d = P / sc;
      const travel = P + D - d;
      const dy = YOFF * smooth((p - 0.45) / 0.55);
      m.world.style.transform = `translate3d(0,${dy}px,${travel}px)`;
      const oy = 40 + 10 * smooth((p - 0.45) / 0.55);
      m.stage.style.perspectiveOrigin = `50% ${oy}%`;
      m.world.style.top = `${oy}%`;
      const zs = Math.min(600, P - travel - 250);
      const len = zs + 580;
      const off = -(600 - zs);
      m.wl.style.width = `${len}px`;
      m.wl.style.transform = `translate3d(-230px,0,${zs}px) rotateY(90deg)`;
      m.wl.style.backgroundPosition = `0 0,0 0,${off}px 0,${off}px 0`;
      m.wr.style.width = `${len}px`;
      m.wr.style.left = `${-len}px`;
      m.wr.style.transform = `translate3d(230px,0,${zs}px) rotateY(-90deg)`;
      m.cf[0].style.height = `${len}px`;
      m.cf[0].style.transform = `translate3d(0,-360px,${zs}px) rotateX(-90deg)`;
      m.cf[0].style.backgroundPosition = `0 0,0 ${off}px,0 0`;
      m.cf[1].style.height = `${len}px`;
      m.cf[1].style.transform = `translate3d(0,360px,${zs}px) rotateX(-90deg)`;
      m.cf[1].style.backgroundPosition = `0 0,0 ${off}px,0 0`;
      const gone = p >= 0.5;
      for (const el of [m.wl, m.wr, m.left, m.right, ...m.cf]) if (el) el.style.display = gone ? "none" : "";
      const fo = 1 - smooth(p / 0.22);
      if (m.hl) {
        m.hl.style.opacity = String(fo);
        m.hl.style.transform = `translateY(${(1 - fo) * 24}px)`;
      }
      if (m.kicker) m.kicker.style.opacity = String(1 - smooth(p / 0.28));
      if (m.cue) m.cue.style.opacity = String(1 - smooth(p / 0.5));
      if (m.pct) m.pct.textContent = `${String(Math.round(p * 100)).padStart(2, "0")}%`;
      if (m.bar) m.bar.style.width = `${p * 100}%`;
      const vis = hasVideoRef.current ? smooth((p - 0.8) / 0.2) : 0;
      for (const el of m.scrs) el.style.opacity = String(vis);
      if (m.pl) {
        m.pl.style.opacity = String(vis);
        m.pl.style.pointerEvents = vis > 0.5 ? "auto" : "none";
      }
    };
    const updatePlayer = () => {
      const v = videoRef.current;
      if (!v || !hasVideoRef.current || !m.tc || !isFinite(v.duration) || v.duration <= 0) return;
      const f = clamp(v.currentTime / v.duration);
      if (m.fill) m.fill.style.width = `${f * 100}%`;
      if (m.thumb) m.thumb.style.left = `${f * 100}%`;
      m.tc.innerHTML = `${mmss(v.currentTime)} <em>/ ${mmss(v.duration)}</em>`;
      m.seek?.setAttribute("aria-valuenow", String(Math.round(v.currentTime)));
      m.seek?.setAttribute("aria-valuemax", String(Math.round(v.duration)));
    };

    apiRef.current = {
      seek: (f: number) => {
        const v = videoRef.current;
        if (v && isFinite(v.duration)) v.currentTime = clamp(f) * v.duration * 0.9999;
      },
    };

    let lastP = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const mobile = mq.matches;
      let tp = 1;
      if (!reduced) {
        const track = mobile ? trackM : trackD;
        if (track) tp = clamp((hh - track.getBoundingClientRect().top) / (mobile ? MOBILE_RANGE : DESKTOP_RANGE));
      }
      if (reduced) cp = tp;
      else {
        cp += (tp - cp) * (mobile ? 0.2 : 0.1);
        if (Math.abs(tp - cp) < 0.0004) cp = tp;
      }
      if (cp !== lastP || dirty.current) {
        if (mobile) applyM(cp);
        else applyD(cp);
        lastP = cp;
      }
      const v = videoRef.current;
      const t = v ? v.currentTime : -1;
      if (t !== lastT || dirty.current) {
        lastT = t;
        paint();
        dirty.current = false;
        if (mobile) updatePlayer();
      }
    };

    const onResize = () => {
      hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 92;
      layoutD();
      layoutM();
      lastP = -1;
      dirty.current = true;
    };
    const ro = new ResizeObserver(onResize);
    if (pinD) ro.observe(pinD);
    if (pinM) ro.observe(pinM);
    onResize();
    raf = requestAnimationFrame(tick);
    return () => {
      cpRef.current = cp;
      cancelAnimationFrame(raf);
      ro.disconnect();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content is static per render; services used only for labels
  }, [inView, reduced, content, hasVideo]);

  const togglePlay = () => setUserPaused(!paused);
  const seekFromEvent = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    apiRef.current?.seek((e.clientX - r.left) / r.width);
  };

  const projects = content.projects;
  const card = (i: number, left: number) => {
    const p = projects[i];
    if (!p) return null;
    const inner = (
      <>
        <div className="cor-frame">
          <canvas data-vs="" width={640} height={360} aria-hidden="true" />
        </div>
        <div className="cor-cardinfo">
          <p className="cor-nk">
            {p.number} {p.title}
          </p>
          <p className="cor-nm">
            {catName(p)} · {p.tag}
          </p>
        </div>
      </>
    );
    return p.href ? (
      <a key={p.id} href={p.href} className="cor-card" style={{ left }}>
        {inner}
      </a>
    ) : (
      <div key={p.id} className="cor-card" style={{ left }}>
        {inner}
      </div>
    );
  };

  const archiveInner = (
    <>
      <p className="cor-nm">{content.archive.kicker}</p>
      <p className="cor-nk">{content.archive.title}</p>
    </>
  );

  const playIcon = paused || !playing ? (
    <path d="M2 1 L13 7 L2 13 Z" fill="currentColor" />
  ) : (
    <>
      <rect x="1" y="1" width="4" height="12" fill="currentColor" />
      <rect x="9" y="1" width="4" height="12" fill="currentColor" />
    </>
  );

  return (
    <section ref={rootRef} id="work" aria-label={`${content.headline.lead} ${content.headline.emphasis}`} className={`cor-root ${reduced ? "cor-static" : ""}`}>
      {near && content.video && (
        <video
          ref={videoRef}
          className="cor-vid"
          src={content.video.src}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      {/* ─────────── Desktop ─────────── */}
      <div className="cor-d">
        <div data-d-track="" className="cor-track" style={reduced ? undefined : { height: `calc(max(100svh - var(--header-h), 520px) + ${DESKTOP_RANGE}px)` }}>
          <div data-d-pin="" className="cor-pin">
            <div data-d-fit="" className="cor-fit" aria-hidden="true">
              <div className="cor-world">
                <div data-d-scene="" className="cor-scene">
                  <div className="cor-rib cor-back" />
                  <div className="cor-plate">
                    <div className="cor-frame">
                      <canvas data-vs="" width={1280} height={720} />
                    </div>
                    {content.archive.href ? (
                      <a href={content.archive.href} className="cor-plateinfo">
                        {archiveInner}
                      </a>
                    ) : (
                      <div className="cor-plateinfo">{archiveInner}</div>
                    )}
                  </div>
                  <div className="cor-rib cor-wall cor-wl">
                    <div className="cor-shade" />
                    {card(0, 200)}
                    {card(2, 700)}
                    {card(4, 1200)}
                  </div>
                  <div className="cor-rib cor-wall cor-wr">
                    <div className="cor-shade" />
                    {card(1, 860)}
                    {card(3, 440)}
                    {card(5, -60)}
                  </div>
                </div>
              </div>
            </div>
            <div className="cor-fade" aria-hidden="true" />
            <div className="cor-ui">
              <p className="cor-nm cor-kicker">{content.kicker}</p>
              <div className="cor-lead">
                <h2 className="cor-nk">
                  {content.headline.lead}
                  <span className="cor-iv">{content.headline.emphasis}</span>
                </h2>
                <p className="cor-nl">{content.intro}</p>
              </div>
              <div data-d-cap="" className="cor-cap" aria-hidden="true">
                <p data-d-cn="" className="cor-nm cor-cn" />
                <p data-d-ct="" className="cor-nk cor-ct" />
              </div>
              <div className="cor-ctl">
                {hasVideo && (
                  <button type="button" className="cor-btn" onClick={togglePlay} aria-pressed={playing && !paused} aria-label={paused || !playing ? "Play showreel video on all screens" : "Pause showreel video on all screens"}>
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      {playIcon}
                    </svg>
                    <span>{paused || !playing ? "Play" : "Pause"}</span>
                  </button>
                )}
                <div className="cor-sq" aria-hidden="true">
                  <span style={{ background: "#FFCA26" }} />
                  <span style={{ background: "#F86015" }} />
                  <span style={{ background: "#9ACC42" }} />
                </div>
              </div>
            </div>
            {/* Screen-reader description of the main screen (the 3D scene is decorative). */}
            <p className="sr-only">{content.accessibleDescription}</p>
          </div>
        </div>
      </div>

      {/* ─────────── Mobile (approved artboard "MOBILE · 01 — VIDEO CORRIDOR") ─────────── */}
      <div className="cor-m">
        <div data-m-track="" className="cor-track" style={reduced ? undefined : { height: `calc(max(100svh - var(--header-h), 520px) + ${MOBILE_RANGE}px)` }}>
          <div data-m-pin="" className="cm-pin">
            <div data-m-fit="" className="cm-fit">
              <div data-m-stage="" className="cm-stage" aria-hidden="true">
                <div data-m-world="" className="cm-world">
                  <div data-m-cf="" className="cm-cf cm-cf-c" />
                  <div data-m-cf="" className="cm-cf cm-cf-f" />
                  <div data-m-wl="" className="cm-wall cm-wl" />
                  <div data-m-wr="" className="cm-wall cm-wr" />
                  <div className="cm-back" />
                  <div className="cm-frame cm-fc">
                    <div className="cm-galin">
                      <div className="cm-galvid">
                        <canvas data-vs="" width={1280} height={720} />
                      </div>
                    </div>
                    {content.archive.href ? (
                      <a href={content.archive.href} className="cm-strip">
                        <span>{content.archive.kicker}</span>
                        <b>{content.archive.title}</b>
                      </a>
                    ) : (
                      <div className="cm-strip">
                        <span>{content.archive.kicker}</span>
                        <b>{content.archive.title}</b>
                      </div>
                    )}
                  </div>
                  <div data-m-left="" className="cm-frame cm-fl">
                    <canvas data-pp="0" width={660} height={880} />
                  </div>
                  <div data-m-right="" className="cm-frame cm-fr">
                    <canvas data-pp="1" width={660} height={880} />
                  </div>
                </div>
              </div>
              <div className="cm-ui">
                <div data-m-scr="" className="cm-scr cm-scr-t" />
                <div data-m-scr="" className="cm-scr cm-scr-b" />
                <p data-m-kicker="" className="cm-kicker">
                  {content.kicker}
                </p>
                <div data-m-hl="" className="cm-hl">
                  <h2>
                    {content.headline.lead}
                    <span className="cm-it">{content.headline.emphasis}</span>
                  </h2>
                  <p>{content.intro}</p>
                </div>
                <div data-m-cue="" className="cm-cue" aria-hidden="true">
                  <div className="cm-row">
                    <span>
                      <i className="cm-arr" />
                      Scroll to walk
                    </span>
                    <span data-m-pct="" className="cm-pct">
                      00%
                    </span>
                  </div>
                  <div className="cm-bar">
                    <i data-m-bar="" />
                  </div>
                </div>
                {hasVideo && (
                  <div data-m-pl="" className="cm-pl">
                    <div className="cm-pltop">
                      <div data-m-tc="" className="cm-tc" />
                      <button type="button" className="cor-play" onClick={togglePlay} aria-label={paused || !playing ? "Play showreel" : "Pause showreel"}>
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          {paused || !playing ? <polygon points="3,1 15,8 3,15" /> : <><rect x="2" y="1" width="4" height="14" /><rect x="10" y="1" width="4" height="14" /></>}
                        </svg>
                      </button>
                    </div>
                    <div
                      tabIndex={0}
                      data-m-seek=""
                      className="cor-seek"
                      role="slider"
                      aria-label="Playback position"
                      aria-valuemin={0}
                      aria-valuenow={0}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        seekFromEvent(e);
                      }}
                      onPointerMove={(e) => e.buttons && seekFromEvent(e)}
                      onKeyDown={(e) => {
                        const v = videoRef.current;
                        if (!v) return;
                        if (e.key === "ArrowRight") { v.currentTime = Math.min(v.duration, v.currentTime + 1); e.preventDefault(); }
                        if (e.key === "ArrowLeft") { v.currentTime = Math.max(0, v.currentTime - 1); e.preventDefault(); }
                      }}
                    >
                      <span className="cm-rail">
                        <i data-m-fill="" />
                      </span>
                      <span data-m-thumb="" className="cm-thumb" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="sr-only">{content.accessibleDescription}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
