import type { CSSProperties } from "react";
import type { Media, Project } from "@/content/work-v3/types";
import { Plate } from "./art";

/** The one quiet-image vocabulary: a masked frame (clip-path reveal on entry) with a plate that drifts slowly inside it. */
export function Frame({ project, media, dir = "up", className = "", style, bare = false }: { project: Project; media: Media; dir?: "up" | "left" | "right"; className?: string; style?: CSSProperties; bare?: boolean }) {
  return (
    <figure className={`v3-fr ${className}`} style={style}>
      <div className="v3-fr-mask" data-reveal data-dir={dir} style={{ aspectRatio: String(media.ratio) }}>
        <div className="v3-fr-pl" data-par>
          {media.video ? <video className="v3-plate" src={media.video} poster={media.src} autoPlay muted loop playsInline aria-label={media.alt} style={media.pos ? { objectPosition: media.pos } : undefined} /> : <Plate media={media} project={project} />}
        </div>
      </div>
      {!bare && <Cap media={media} />}
    </figure>
  );
}

export function Cap({ media }: { media: Media }) {
  return (
    <figcaption className="v3-cap">
      <b>{media.tag}</b>
      <span>{media.title}</span>
    </figcaption>
  );
}
