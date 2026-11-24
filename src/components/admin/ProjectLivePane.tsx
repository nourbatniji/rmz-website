"use client";

import { useEffect, useRef } from "react";
import type { WorkProject } from "@/content/work-types";
import { PreviewFrame } from "./PreviewFrame";

/**
 * The project page as it will look, updating the moment you change anything (saved or not).
 * The editor sends its current values into a same-origin preview frame; nothing is written anywhere.
 */
export function ProjectLivePane({ project }: { project: WorkProject }) {
  const frameWindow = useRef<Window | null>(null);
  const latest = useRef(project);

  useEffect(() => {
    latest.current = project;
    frameWindow.current?.postMessage({ type: "rmz-project-preview", project }, window.location.origin);
  }, [project]);

  useEffect(() => {
    // The frame announces itself once it is ready (and again if it reloads, e.g. after switching Desktop/Mobile).
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || (e.data as { type?: string } | null)?.type !== "rmz-preview-ready") return;
      frameWindow.current = e.source as Window;
      frameWindow.current.postMessage({ type: "rmz-project-preview", project: latest.current }, window.location.origin);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <PreviewFrame src="/admin/preview/project" reloadKey={0} fill title="Project page preview" label="Updates as you type · nothing is saved" />;
}
