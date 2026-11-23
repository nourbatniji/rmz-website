import type { Field, Obj } from "./spec";

/** One editable thing on the page, as the preview needs it: where the field lives (its data path), what to call it, and the text or file to find on the page. */
export type FieldDescriptor = { path: string; label: string; text?: string; src?: string; /** A picture or video field: tagged with its name in the preview, even while empty. */ image?: boolean };

/** Walks a form spec with its current values and lists every text and picture the preview can point at. Pure. */
export function describeFields(fields: Field[], value: Obj, path = "", prefix = ""): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];
  for (const f of fields) {
    const name = "name" in f && f.name ? f.name : undefined;
    const p = name ? (path ? `${path}.${name}` : name) : path;
    const v = name ? value?.[name] : value;
    const label = `${prefix}${f.label}`;
    switch (f.kind) {
      case "text":
        if (!f.readOnly && typeof v === "string" && v.trim()) out.push({ path: p, label, text: v });
        break;
      case "image":
      case "video":
        out.push({ path: p, label, image: true, ...(v && typeof v === "object" && typeof (v as Obj).src === "string" && (v as Obj).src ? { src: (v as Obj).src as string } : {}) });
        break;
      case "strings":
        if (Array.isArray(v)) v.forEach((s, i) => typeof s === "string" && s.trim() && out.push({ path: `${p}.${i}`, label: `${label} ${i + 1}`, text: s }));
        break;
      case "group":
        out.push(...describeFields(f.fields, (name ? v : value) as Obj, p, prefix));
        break;
      case "list":
        if (Array.isArray(v)) (v as Obj[]).forEach((it, i) => out.push(...describeFields(f.item, it, `${p}.${i}`, `${f.title(it, i)} · `)));
        break;
    }
  }
  return out;
}
