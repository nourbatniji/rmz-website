/** Pure helper for "Replace this file everywhere": rewrites every reference to one URL inside a content value. No server imports, so it is unit-testable. */
export type SwapTarget = { url: string; kind: string; width: number | null; height: number | null };

export function swapMediaRefs(value: unknown, oldUrl: string, fresh: SwapTarget): { value: unknown; hits: number } {
  let hits = 0;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v === oldUrl ? (hits++, fresh.url) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const isRef = o.src === oldUrl;
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(o)) out[k] = walk(x);
      // An image reference carries its size; keep it truthful for the new file.
      if (isRef && fresh.kind === "image") {
        if (fresh.width && fresh.height) {
          if ("width" in out || "height" in out) {
            out.width = fresh.width;
            out.height = fresh.height;
          }
        } else {
          delete out.width;
          delete out.height;
        }
      }
      return out;
    }
    return v;
  };
  return { value: walk(value), hits };
}
