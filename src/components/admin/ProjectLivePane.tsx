"use client";

import { useEffect, useRef } from "react";
import type { WorkProject } from "@/content/work-types";
import { PreviewFrame } from "./PreviewFrame";

/**
 * The project page as it will look, updating the moment you change anything (saved or not).
 * The editor sends its current values into a same-origin preview frame; nothing is written anywhere.
 * Every picture in the frame carries a number; `highlight` outlines one (and scrolls to it), and clicking a picture calls `onSlotClick`.
 */
export function ProjectLivePane({ project, highlight, onSlotClick }: { project: WorkProject; highlight?: string | null; onSlotClick?: (id: string) => void }) {
  const frameWindow = useRef<Window | null>(null);
  const latest = useRef(project);
  const lit = useRef<string | null>(highlight ?? null);
  const onClick = useRef(onSlotClick);

  useEffect(() => {
    onClick.current = onSlotClick;
  });

  useEffect(() => {
    latest.current = project;
    frameWindow.current?.postMessage({ type: "rmz-project-preview", project }, window.location.origin);
  }, [project]);

  useEffect(() => {
    lit.current = highlight ?? null;
    frameWindow.current?.postMessage({ type: "rmz-slot-highlight", id: lit.current }, window.location.origin);
  }, [highlight]);

  useEffect(() => {
    // The frame announces itself once it is ready (and again if it reloads, e.g. after switching Desktop/Mobile).
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; id?: unknown } | null;
      if (d?.type === "rmz-preview-ready") {
        frameWindow.current = e.source as Window;
        frameWindow.current.postMessage({ type: "rmz-project-preview", project: latest.current }, window.location.origin);
        frameWindow.current.postMessage({ type: "rmz-slot-highlight", id: lit.current }, window.location.origin);
      } else if (d?.type === "rmz-slot-click" && e.source === frameWindow.current && typeof d.id === "string") {
        onClick.current?.(d.id);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <PreviewFrame src="/admin/preview/project" reloadKey={0} fill title="Project page preview" label="Updates as you type · hover or edit a picture or text to outline it here · click a picture to jump to its uploader" />;
}
