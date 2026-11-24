"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkProject } from "@/content/work-types";
import { ProjectCase } from "@/components/work/ProjectCase";
import { imageSlots } from "@/lib/work-layout";

/** Draws a numbered red tag on every picture slot, so editors can match a picture to its uploader. Only exists inside this dashboard preview. */
const SLOT_CSS = `
html,body{background:#0f0f0e}
.wk-rv,.wk-hero,.wk-in{animation:none!important}
[data-slot]{cursor:pointer}
[data-slot]::after{content:""!important;display:block!important;position:absolute;inset:0;left:0!important;bottom:0!important;width:auto!important;height:auto!important;padding:0!important;z-index:25;pointer-events:none;border:3px dashed rgba(255,202,38,.8);background:transparent!important;box-sizing:border-box}
[data-part]{outline:1px dashed rgba(243,232,204,.32);outline-offset:8px;border-radius:2px;transition:outline-color .15s}
[data-slot]::before{content:attr(data-n) " · " attr(data-name);position:absolute;left:24px;top:24px;z-index:30;padding:14px 20px;border-radius:12px;background:#d93a2f;color:#fff;font:700 34px/1 system-ui,sans-serif;letter-spacing:.01em;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.4)}
[data-slot]:hover::after{border:6px solid rgba(255,202,38,.9)}
[data-part]:hover{outline:3px solid rgba(255,202,38,.85)}
[data-slot].rmz-on::after{border:10px solid #ffca26;box-shadow:inset 0 0 0 4px rgba(15,15,14,.6)}
[data-part].rmz-on{outline:5px solid #ffca26;background:rgba(255,202,38,.07)}
@media (max-width:900px){[data-slot]::before{left:10px;top:10px;padding:7px 10px;border-radius:7px;font-size:15px}[data-slot]:hover::after{border-width:3px}[data-slot].rmz-on::after{border-width:5px}[data-part].rmz-on{outline-width:3px}}
`;

/** Runs INSIDE the preview iframe: draws the real project page from whatever the editor last sent. Links are inert; pictures are tagged and clickable. */
export function ProjectLivePreview() {
  const [project, setProject] = useState<WorkProject | null>(null);
  const active = useRef<string | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const paint = (scroll: boolean) => {
      let target: HTMLElement | null = null;
      document.querySelectorAll<HTMLElement>("[data-slot],[data-part]").forEach((n) => {
        const on = (n.getAttribute("data-slot") ?? n.getAttribute("data-part")) === active.current;
        n.classList.toggle("rmz-on", on);
        if (on) target = n;
      });
      if (!scroll || !target) return;
      // The frame is as tall as the page and the editor's preview box scrolls it, so ask the box to bring this part into view (only when it is out of view).
      const r = (target as HTMLElement).getBoundingClientRect();
      window.parent.postMessage({ type: "rmz-scroll-to", top: r.top + window.scrollY, height: r.height }, window.location.origin);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as { type?: string; project?: WorkProject; id?: string | null } | null;
      if (d?.type === "rmz-project-preview" && d.project) setProject(d.project);
      if (d?.type === "rmz-slot-highlight") {
        active.current = typeof d.id === "string" ? d.id : null;
        paint(false); // the outline follows the pointer at once…
        if (settle.current) clearTimeout(settle.current);
        if (active.current) settle.current = setTimeout(() => paint(true), 250); // …but the page only moves once the pointer rests, so sweeping across cards doesn't whip it around
      }
    };
    const onClick = (e: MouseEvent) => {
      const slot = (e.target as Element | null)?.closest?.("[data-slot]");
      if (!slot) return;
      e.preventDefault();
      window.parent.postMessage({ type: "rmz-slot-click", id: slot.getAttribute("data-slot") }, window.location.origin);
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    window.parent.postMessage({ type: "rmz-preview-ready" }, window.location.origin);
    (window as unknown as { __rmzPaint?: (s: boolean) => void }).__rmzPaint = paint;
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
      if (settle.current) clearTimeout(settle.current);
    };
  }, []);

  // Tell the preview box how tall the page is, so it can scroll the whole page itself.
  const root = useRef<HTMLDivElement>(null);
  const ready = project !== null;
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const send = () => window.parent.postMessage({ type: "rmz-preview-height", height: Math.ceil(el.getBoundingClientRect().height) }, window.location.origin);
    send();
    const ro = new ResizeObserver(send);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  // After every update: number and name each picture slot, and keep the highlighted one highlighted.
  useEffect(() => {
    if (!project) return;
    const slots = new Map(imageSlots(project.layout, project.category).map((s) => [s.el.id, s]));
    document.querySelectorAll<HTMLElement>("[data-slot]").forEach((node) => {
      const s = slots.get(node.dataset.slot ?? "");
      if (!s) return;
      node.dataset.n = String(s.n);
      node.dataset.name = s.el.label;
    });
    (window as unknown as { __rmzPaint?: (s: boolean) => void }).__rmzPaint?.(false);
  }, [project]);

  if (!project) return <div className="min-h-screen" style={{ background: "#0f0f0e" }} />;
  return (
    <div ref={root} onClickCapture={(e) => (e.target as Element).closest("a") && e.preventDefault()}>
      <style>{SLOT_CSS}</style>
      <ProjectCase project={project} prev={project} next={project} contact={{ label: "Contact", href: "#" }} seed={0} editing />
    </div>
  );
}
