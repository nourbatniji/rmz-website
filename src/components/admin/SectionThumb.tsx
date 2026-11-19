/** Finds the first real image in a section's content, so lists can show a true thumbnail (and nothing invented when there isn't one). */
type Json = unknown;


export function firstImage(v: Json, underVideo = false): string | null {
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = firstImage(x, underVideo);
      if (r) return r;
    }
    return null;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.src === "string" && !underVideo && /^(\/|https?:)/.test(o.src) && !/\.(mp4|webm)(\?|$)/i.test(o.src)) return o.src;
    if (Array.isArray(o.frames) && typeof o.frames[0] === "string" && !underVideo) return o.frames[0] as string;
    for (const [k, x] of Object.entries(o)) {
      const r = firstImage(x, underVideo || k === "video");
      if (r) return r;
    }
  }
  return null;
}

export function SectionThumb({ content }: { content: Json }) {
  const img = firstImage(content);
  return (
    <span aria-hidden className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-fg/10 bg-fg/6 text-fg/30">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
      )}
    </span>
  );
}
