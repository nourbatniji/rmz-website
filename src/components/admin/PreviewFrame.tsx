"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live preview of ONE section (draft content) in an iframe scaled to fit the column.
 * The preview area always keeps the same height, with the screen shown at true proportions (1440×900 laptop or 390×844 phone) and centred in it.
 * A section shorter than the screen is cropped to its own height and centred; a tall scroll-driven section scrolls inside the screen.
 */
export function PreviewFrame({ section, reloadKey, note, src, label = "Updates as you edit", fill = false, title = "Section preview" }: { section?: string; reloadKey: number; note?: string | null; src?: string; label?: string; fill?: boolean; title?: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);
  const [maxPx, setMaxPx] = useState(700);
  const [contentH, setContentH] = useState<number | null>(null);

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

  /** Once the page inside the frame has loaded, follow the height of the section it shows. */
  function onLoad() {
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
  const frameH = fill ? maxPx / scale : realH;
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
      <div className="flex w-full min-w-0 items-center justify-center overflow-hidden rounded-lg border border-fg/15 bg-fg/[0.06]" style={{ height: maxPx }}>
        {width > 0 && (
        <div className="relative overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/10" style={{ width: designWidth * scale, height: shownH * scale }}>
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
