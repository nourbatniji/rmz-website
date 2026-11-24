"use client";

import { useEffect, useState } from "react";
import type { WorkProject } from "@/content/work-types";
import { ProjectCase } from "@/components/work/ProjectCase";

/** Runs INSIDE the preview iframe: draws the real project page from whatever the editor last sent. Links are inert. */
export function ProjectLivePreview() {
  const [project, setProject] = useState<WorkProject | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as { type?: string; project?: WorkProject } | null;
      if (d?.type === "rmz-project-preview" && d.project) setProject(d.project);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "rmz-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!project) return <div className="min-h-screen" />;
  return (
    <div onClickCapture={(e) => (e.target as Element).closest("a") && e.preventDefault()}>
      <ProjectCase project={project} prev={project} next={project} contact={{ label: "Contact", href: "#" }} seed={0} />
    </div>
  );
}
