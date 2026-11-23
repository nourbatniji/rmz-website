"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live preview of ONE section (draft content) in an iframe scaled to fit the column.
 * The preview area always keeps the same height, with the screen shown at true proportions (1440×900 laptop or 390×844 phone) and centred in it.
 * A section shorter than the screen is cropped to its own height and centred; a tall scroll-driven section scrolls inside the screen.
 */
export function PreviewFrame({ section, reloadKey, note, src, label = "Updates as you edit", fill = false, title = "Section preview", focusItem = null, fields = null, activePath = null, onFieldClick }: { section?: string; reloadKey: number; note?: string | null; src?: string; label?: string; fill?: boolean; title?: string; focusItem?: string | null; fields?: unknown[] | null; activePath?: string | null; onFieldClick?: (path: string) => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);
  const [maxPx, setMaxPx] = useState(700);
  const [contentH, setContentH] = useState<number | null>(null);
  /** `fill` mode: the full height of the page inside the frame. The frame is made that tall and THIS box scrolls it, so scrolling never depends on the page inside the frame. */
  const [docH, setDocH] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      setMaxPx(Math.max(420, window.innerHeight - 230)); // the sticky editor bar and this header sit above the screen
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  useEffect(() => {
    if (!fill) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: string; height?: number; top?: number } | null;
      if (d?.type === "rmz-preview-height" && typeof d.height === "number") setDocH(d.height);
      if (d?.type === "rmz-scroll-to" && typeof d.top === "number" && scroller.current) {
        const box = scroller.current;
        const k = box.dataset.scale ? Number(box.dataset.scale) : 1;
        const top = d.top * k;
        const bottom = top + (d.height ?? 0) * k;
        if (top >= box.scrollTop + 60 && bottom <= box.scrollTop + box.clientHeight - 20) return; // already in view
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        box.scrollTo({ top: Math.max(0, top - Math.max(60, (box.clientHeight - (bottom - top)) / 2)), behavior: reduced ? "auto" : "smooth" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [fill]);

  /** Tell the page in the frame which item (e.g. a service) the editor just opened, so the preview opens it too. Sent again shortly after load, once the page has hydrated. */
  const timers = useRef<number[]>([]);
  const sendFocus = (id: string | null) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (!id) return;
    const post = () => frame.current?.contentWindow?.postMessage({ type: "rmz-open-service", id }, window.location.origin);
    post();
    timers.current = [400, 1200, 2500].map((ms) => window.setTimeout(post, ms));
  };
  useEffect(() => {
    sendFocus(focusItem);
  }, [focusItem]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /** The editor's fields (data path, name, current text or file) → the page in the frame finds each one and outlines it; the active one is outlined strongly. */
  const sendFields = () => frame.current?.contentWindow?.postMessage({ type: "rmz-fields", fields: fields ?? [] }, window.location.origin);
  const sendActive = () => frame.current?.contentWindow?.postMessage({ type: "rmz-active", path: activePath }, window.location.origin);
  const fieldsKey = JSON.stringify(fields ?? []);
  useEffect(() => {
    if (fields) sendFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsKey]);
  useEffect(() => {
    sendActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);
  const clickRef = useRef(onFieldClick);
  useEffect(() => {
    clickRef.current = onFieldClick;
  });
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: string; path?: unknown } | null;
      if (d?.type === "rmz-field-click" && typeof d.path === "string") clickRef.current?.(d.path);
      if (d?.type === "rmz-preview-ready" && fields) {
        sendFields();
        sendActive();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsKey, activePath]);

  /** Once the page inside the frame has loaded, follow the height of the section it shows. */
  function onLoad() {
    sendFocus(focusItem);
    [400, 1500].forEach((ms) => window.setTimeout(() => (sendFields(), sendActive()), ms));
    observer.current?.disconnect();
    const main = frame.current?.contentDocument?.querySelector("main");
    if (!main) return;
    const read = () => setContentH(Math.ceil(main.getBoundingClientRect().height));
    read();
    observer.current = new ResizeObserver(read);
    observer.current.observe(main);
  }

  // The page inside the frame is a real laptop / phone sized screen (not as tall as the column), so layouts sized in vh look as on the site.
  const designWidth = device === "desktop" ? 1440 : 390;
  // `fill` (whole project page): the screen is as tall as the pane, so the page fills it from top to bottom and scrolls inside.
  const realH = device === "desktop" ? 900 : 844;
  const scale = width ? (fill ? Math.min(1, width / designWidth) : Math.min(1, width / designWidth, maxPx / realH)) : 1;
  const frameH = fill ? Math.max(docH, maxPx / scale) : realH;
  const shownH = fill ? frameH : Math.min(contentH ?? frameH, frameH);

  return (
    <div ref={wrap} className="grid w-full min-w-0 gap-2">
      <div className="flex items-center gap-2 text-xs text-fg/70">
        <span className="font-semibold uppercase tracking-[0.14em]">Preview</span>
        {(["desktop", "mobile"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={device === d}
            onClick={() => setDevice(d)}
            className={`rounded-full border px-3 py-1 ${device === d ? "border-accent bg-accent text-white" : "border-fg/25 hover:border-fg/60"}`}
          >
            {d === "desktop" ? "Desktop 1440" : "Mobile 390"}
          </button>
        ))}
        <span className="ml-auto text-fg/45">{label}</span>
      </div>
      {note && <p className="rounded-md border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-xs text-warn">{note}</p>}
      <div ref={scroller} data-scale={scale} className={`flex w-full min-w-0 justify-center rounded-lg border-2 transition-colors bg-fg/[0.06] ${activePath ? "border-[#ffca26] shadow-[0_0_0_3px_rgba(255,202,38,0.25)]" : "border-fg/15"} ${fill ? "items-start overflow-y-auto overflow-x-hidden overscroll-contain" : "items-center overflow-hidden"}`} style={{ height: maxPx }}>
        {width > 0 && (
        <div className="relative shrink-0 overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/10" style={{ width: designWidth * scale, height: shownH * scale }}>
          <iframe
            ref={frame}
            key={`${reloadKey}-${device}`}
            title={title}
            src={src ?? `/admin/preview?section=${section}`}
            onLoad={onLoad}
            style={{ width: designWidth, height: frameH, transform: `scale(${scale})`, transformOrigin: "top left", border: 0, display: "block" }}
          />
        </div>
        )}
      </div>
    </div>
  );
}
