import type { Project } from "@/content/work-v3/types";
import { mediaOf } from "@/content/work-v3/projects";
import { Frame } from "./Frame";

/**
 * PART 04 — THE CREATIVE DETAIL (optional). One idea, one short piece of writing, two supporting frames.
 * It lives inside the Work section so it reads as the gallery continuing; motion is the shared quiet vocabulary only
 * (masked reveal + slow drift on the frames, a single rise on the copy). Omit `project.detail` and nothing else changes.
 */
export function Detail({ project }: { project: Project }) {
  const d = project.detail!;
  return (
    <div className="v3-detail">
      <Frame project={project} media={mediaOf(project, d.a)} className="v3-dt-a" dir="left" />
      <div className="v3-dt-copy">
        <p className="v3-kicker" data-rise="0">{d.kicker}</p>
        <h2 data-rise="1">{d.title}</h2>
        {d.body.map((t, i) => (
          <p key={i} data-rise={String(2 + i)}>{t}</p>
        ))}
      </div>
      <Frame project={project} media={mediaOf(project, d.b)} className="v3-dt-b" dir="right" bare />
    </div>
  );
}
