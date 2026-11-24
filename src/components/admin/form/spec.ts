/** Declarative description of an editor form. Pure data + helpers, safe for client and server. */
export type Obj = Record<string, unknown>;
export type Errors = Record<string, string>;

type Base = { label: string; help?: string };
export type Option = { value: string; label: string };

export type Field =
  | (Base & { kind: "text"; name: string; multiline?: boolean; rows?: number; nullable?: boolean; readOnly?: boolean; placeholder?: string })
  | (Base & { kind: "color"; name: string })
  | (Base & { kind: "select"; name: string; options: Option[] })
  | (Base & { kind: "image"; name: string; /** The image has no alt box of its own (the entry has a separate alt-text field). */ noAlt?: boolean })
  | (Base & { kind: "toggle"; name: string; onLabel?: string; offLabel?: string })
  | (Base & { kind: "range"; name: string; min: number; max: number; step?: number; unit?: string; /** Shows a live preview beside the slider. */ preview?: "partner" | "magnet"; def?: number })
  | (Base & { kind: "video"; name: string })
  | (Base & { kind: "sequence"; name: string })
  | (Base & { kind: "strings"; name: string; min?: number; max?: number; fixed?: boolean; placeholder?: string; color?: boolean })
  | (Base & { kind: "group"; name?: string; fields: Field[] })
  | (Base & {
      kind: "list";
      name: string;
      item: Field[];
      title: (item: Obj, index: number) => string;
      min?: number;
      max?: number;
      /** No add / remove (the design fixes the count). Reordering stays available unless `fixedOrder`. */
      fixed?: boolean;
      fixedOrder?: boolean;
      /** Small picture shown in the row header (e.g. the entry's logo). */
      thumb?: (item: Obj) => string | null;
      /** Name of a boolean field: when false the row is shown dimmed with a "Hidden" tag and gets a quick Hide/Show button. */
      hideKey?: string;
      blank?: () => Obj;
    });

export const COPY_STATUS_FULL: Option[] = [
  { value: "approved", label: "Approved" },
  { value: "provisional", label: "Provisional" },
  { value: "placeholder", label: "Placeholder" },
];

/** Stable JSON text (sorted keys) for comparing two content values. */
export function stableStringify(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Obj).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );
}
