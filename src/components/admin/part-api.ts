import { hiddenSet } from "@/lib/work-layout";
import type { Obj } from "./form/spec";

/** Reads and writes the "which parts are deleted / which pictures were replaced" state of a project body. */
export type PartApi = {
  hidden: Set<string>;
  /** The picture the editor set for an image part, or null (= none yet: the site shows its placeholder). */
  imageOf: (id: string) => Obj | null;
  setHidden: (id: string, deleted: boolean) => void;
  setImage: (id: string, image: Obj | null) => void;
};

/** The main image is the project's own `image` field; every other picture lives in `images` by part id. */
export const HERO_IMAGE = "hero.image";

export function makePartApi(body: Obj, onBody: (next: Obj) => void): PartApi {
  const hidden = hiddenSet(body.hidden);
  const images = body.images && typeof body.images === "object" ? (body.images as Obj) : {};
  return {
    hidden,
    imageOf: (id) => {
      const v = id === HERO_IMAGE ? body.image : images[id];
      return v && typeof v === "object" && typeof (v as Obj).src === "string" && (v as Obj).src ? (v as Obj) : null;
    },
    setHidden: (id, deleted) => {
      const next = new Set(hidden);
      if (deleted) next.add(id);
      else next.delete(id);
      const out = { ...body };
      if (next.size) out.hidden = [...next];
      else delete out.hidden;
      onBody(out);
    },
    setImage: (id, image) => {
      if (id === HERO_IMAGE) return onBody({ ...body, image });
      const next = { ...images };
      if (image) next[id] = image;
      else delete next[id];
      const out = { ...body };
      if (Object.keys(next).length) out.images = next;
      else delete out.images;
      onBody(out);
    },
  };
}
