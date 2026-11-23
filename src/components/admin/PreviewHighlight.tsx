"use client";

import { useEffect } from "react";

type Field = { path: string; label: string; text?: string; src?: string; image?: boolean };
type Msg = { type?: string; fields?: Field[]; path?: string | null };

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
/** Really on screen: sized, not hidden, and no ancestor faded out (the lens keeps every study in the page and fades the unused ones to opacity 0). */
const faded = (el: Element) => {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.1) return true;
  }
  return false;
};
const visible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2 && !faded(el);
};
const SKIP = /^(SCRIPT|STYLE|NOSCRIPT)$/;

/** Every visible picture / video whose file is `src` (also when served through /_next/image). */
function mediaCandidates(src: string): Element[] {
  const tail = decodeURIComponent(src).split("?")[0].split("/").pop() ?? "";
  if (!tail) return [];
  const out: Element[] = [];
  for (const el of Array.from(document.querySelectorAll("img, video, source"))) {
    const cand = [el.getAttribute("src"), (el as HTMLImageElement).currentSrc, el.getAttribute("poster")].filter(Boolean).map((u) => decodeURIComponent(String(u)));
    if (!cand.some((u) => u.includes(tail))) continue;
    const host = el.tagName === "SOURCE" ? el.parentElement : el;
    if (host && visible(host) && !out.includes(host)) out.push(host);
  }
  return out;
}

/** Every visible element whose own text is `text`: exact lines first, then lines that contain it. */
function textCandidates(text: string): Element[] {
  const needle = norm(text).slice(0, 80);
  if (needle.length < 2) return [];
  const exact: Element[] = [];
  const partial: Element[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || SKIP.test(el.tagName) || el.closest("[data-rmz-overlay]")) continue;
    const t = norm(n.textContent ?? "");
    if (!t) continue;
    const hit = t === needle ? exact : t.includes(needle) || (t.length >= 8 && needle.includes(t)) ? partial : null;
    if (hit && !hit.includes(el) && visible(el)) hit.push(el);
  }
  return [...exact, ...partial];
}

/**
 * Runs INSIDE the section preview frame (same idea as the project page preview).
 * The editor sends the list of its fields (data path, name, current text or file). Each one is found on the page and gets a dashed border;
 * hovering or focusing a field in the editor outlines it in yellow with its name, hovering it here does the same, and clicking it jumps to the field.
 * Everything is drawn in an overlay outside the page's own markup, so the layout never changes.
 */
export function PreviewHighlight() {
  useEffect(() => {
    let fields: Field[] = [];
    let matches = new Map<string, Element[]>();
    let active: string | null = null;
    let hover: string | null = null;
    let layer: HTMLDivElement | null = null;
    const boxes = new Map<string, HTMLDivElement>();
    let raf = 0;
    let rematchTimer = 0;
    let settle = 0;

    const ensureLayer = () => {
      if (layer?.isConnected) return layer;
      layer = document.createElement("div");
      layer.setAttribute("data-rmz-overlay", "");
      Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "2147483000", pointerEvents: "none" });
      document.body.appendChild(layer);
      return layer;
    };

    const rematch = () => {
      const claimed = new Set<Element>();
      const next = new Map<string, Element[]>();
      for (const f of fields) {
        // A part of the page can name itself with data-rmz-path (works even for empty pictures); otherwise find it by its text or file.
        const tagged = Array.from(document.querySelectorAll(`[data-rmz-path="${f.path}"]`)).filter((e) => e.getBoundingClientRect().width > 2);
        if (tagged.length) {
          next.set(f.path, tagged);
          continue;
        }
        const list = f.src ? mediaCandidates(f.src) : f.text ? textCandidates(f.text) : [];
        const el = list.find((c) => !claimed.has(c));
        if (el) {
          claimed.add(el);
          next.set(f.path, [el]);
        }
      }
      matches = next;
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const rematchSoon = (ms = 350) => {
      window.clearTimeout(rematchTimer);
      rematchTimer = window.setTimeout(rematch, ms);
    };

    const draw = () => {
      raf = 0;
      if (!matches.size) {
        for (const box of boxes.values()) box.remove();
        boxes.clear();
        return;
      }
      const host = ensureLayer();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const seen = new Set<string>();
      for (const f of fields) {
        const els = matches.get(f.path);
        if (!els) continue;
        const on = f.path === active || f.path === hover;
        els.forEach((el, n) => {
          if (!el.isConnected || faded(el)) return;
          const key = `${f.path}#${n}`;
          const r = el.getBoundingClientRect();
          const inView = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && r.width > 2 && r.height > 2;
          if (!inView) return;
          seen.add(key);
          let box = boxes.get(key);
          if (!box) {
            box = document.createElement("div");
            const chip = document.createElement("span");
            Object.assign(chip.style, { position: "absolute", left: "-3px", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", font: "700 12px/1.2 system-ui, sans-serif", padding: "3px 8px", borderRadius: "5px" });
            chip.textContent = f.label;
            box.appendChild(chip);
            Object.assign(box.style, { position: "absolute", boxSizing: "border-box", borderRadius: "4px" });
            host.appendChild(box);
            boxes.set(key, box);
          }
          const pad = 4;
          Object.assign(box.style, {
            display: "block",
            left: `${r.left - pad}px`,
            top: `${r.top - pad}px`,
            width: `${r.width + pad * 2}px`,
            height: `${r.height + pad * 2}px`,
            border: on ? "3px solid #ffca26" : "3px solid transparent",
            boxShadow: on ? "0 0 0 2px rgba(15,15,14,.55), 0 0 18px rgba(255,202,38,.5)" : "none",
            background: on ? "rgba(255,202,38,.08)" : "transparent",
          });
          // Pictures always carry their name (a red tag inside the corner); other parts only show it while hovered or being edited.
          const chip = box.firstChild as HTMLElement;
          const tag = !!f.image;
          chip.style.display = on || tag ? "block" : "none";
          chip.style.background = tag && !on ? "#d93a2f" : "#ffca26";
          chip.style.color = tag && !on ? "#fff" : "#0f0f0e";
          if (tag) Object.assign(chip.style, { top: "6px", bottom: "auto", marginBottom: "0", left: "6px", fontSize: "13px" });
          else Object.assign(chip.style, { top: "auto", bottom: "100%", marginBottom: "3px" });
        });
      }
      for (const [key, box] of boxes) {
        if (seen.has(key)) continue;
        box.remove();
        boxes.delete(key);
      }
      raf = requestAnimationFrame(draw);
    };

    const scrollTo = (el: Element) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top >= 70 && r.bottom <= vh - 20) return;
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - Math.max(90, (vh - r.height) / 2)), behavior: "auto" });
    };

    /** The innermost found element under the pointer. */
    const under = (target: EventTarget | null): string | null => {
      let best: { path: string; area: number } | null = null;
      if (!(target instanceof Node)) return null;
      for (const [path, els] of matches) {
        for (const el of els) {
          if (!el.contains(target)) continue;
          const r = el.getBoundingClientRect();
          const area = r.width * r.height;
          if (!best || area < best.area) best = { path, area };
        }
      }
      return best?.path ?? null;
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as Msg | null;
      if (d?.type === "rmz-fields" && Array.isArray(d.fields)) {
        fields = d.fields;
        rematch();
        rematchSoon(700);
        rematchSoon(1800);
      } else if (d?.type === "rmz-active") {
        active = typeof d.path === "string" ? d.path : null;
        window.clearTimeout(settle);
        if (!raf) raf = requestAnimationFrame(draw);
        if (active) {
          if (!matches.has(active)) rematch();
          settle = window.setTimeout(() => {
            const els = active ? matches.get(active) : null;
            if (els?.length && !els.some((e) => { const r = e.getBoundingClientRect(); return r.top >= 70 && r.bottom <= window.innerHeight - 20; })) scrollTo(els[0]);
          }, 350);
        }
      }
    };
    const onMove = (e: MouseEvent) => {
      const h = under(e.target);
      if (h !== hover) {
        hover = h;
        if (!raf) raf = requestAnimationFrame(draw);
      }
    };
    const onClick = (e: MouseEvent) => {
      const path = under(e.target);
      if (!path) return;
      if ((e.target as Element | null)?.closest?.("a")) e.preventDefault();
      window.parent.postMessage({ type: "rmz-field-click", path }, window.location.origin);
    };
    const onResize = () => rematchSoon(200);

    window.addEventListener("message", onMessage);
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    window.parent.postMessage({ type: "rmz-preview-ready" }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      cancelAnimationFrame(raf);
      window.clearTimeout(rematchTimer);
      window.clearTimeout(settle);
      layer?.remove();
    };
  }, []);
  return null;
}
