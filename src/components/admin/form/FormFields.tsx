"use client";

import { useId } from "react";
import type { Errors, Field, Obj } from "./spec";
import { ImageField } from "./ImageField";
import { SequenceField } from "./SequenceField";
import { VideoField } from "./VideoField";
import { arrayMove, SortableItem, SortableList } from "../SortableList";

export const inputCls =
  "w-full rounded-lg border border-fg/20 bg-white px-3 py-2 text-sm text-fg placeholder:text-fg/35 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60";
export const btnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-fg/25 px-3 py-1.5 text-sm font-medium text-fg hover:border-fg/60 hover:bg-fg/5 disabled:opacity-40 disabled:hover:bg-transparent";
export const iconBtnCls =
  "inline-flex h-7 w-7 items-center justify-center rounded border border-fg/20 text-xs text-fg/80 hover:border-fg/60 hover:bg-fg/10 disabled:opacity-30 disabled:hover:bg-transparent";

export function FieldShell({ label, help, error, htmlFor, children }: { label: string; help?: string; error?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-fg">
        {label}
      </label>
      {children}
      {help && <p className="text-xs text-fg/55">{help}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

const CHIP: Record<string, string> = {
  approved: "bg-ok/20 text-ok",
  provisional: "bg-warn/15 text-warn",
  placeholder: "bg-bad/25 text-bad",
};

export function Fields({ fields, value, onChange, path, errors }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void; path: string; errors: Errors }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {fields.filter((f) => !(f.kind === "text" && f.readOnly)).map((f, i) => (
        <FieldView key={`${f.kind}-${"name" in f ? f.name : ""}-${i}`} field={f} value={value} onChange={onChange} path={path} errors={errors} />
      ))}
    </div>
  );
}

/** Every named field carries its data path, so the live preview can point at it (hover/focus a field → outlined in the preview; click in the preview → jumps here). */
function FieldView(props: { field: Field; value: Obj; onChange: (v: Obj) => void; path: string; errors: Errors }) {
  const name = "name" in props.field ? props.field.name : undefined;
  const p = name ? (props.path ? `${props.path}.${name}` : name) : undefined;
  return (
    <div data-path={p} className="min-w-0 rounded-xl transition-shadow">
      <FieldBody {...props} />
    </div>
  );
}

function FieldBody({ field, value, onChange, path, errors }: { field: Field; value: Obj; onChange: (v: Obj) => void; path: string; errors: Errors }) {
  const id = useId();
  const name = "name" in field ? field.name : undefined;
  const p = name ? (path ? `${path}.${name}` : name) : path;
  const v = name ? value[name] : undefined;
  const set = (nv: unknown) => onChange({ ...value, [name as string]: nv });
  const error = errors[p];

  switch (field.kind) {
    case "text": {
      const str = typeof v === "string" ? v : "";
      const common = {
        id,
        value: str,
        readOnly: field.readOnly,
        placeholder: field.placeholder,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const t = e.target.value;
          set(field.nullable && t === "" ? null : t);
        },
        className: `${inputCls} ${field.readOnly ? "cursor-not-allowed text-fg/60" : ""}`,
        "aria-invalid": error ? true : undefined,
      };
      return (
        <FieldShell label={field.label} help={field.help} error={error} htmlFor={id}>
          {field.multiline ? <textarea rows={field.rows ?? 4} {...common} /> : <input type="text" {...common} />}
        </FieldShell>
      );
    }
    case "color": {
      const str = typeof v === "string" ? v : "#000000";
      return (
        <FieldShell label={field.label} help={field.help} error={error} htmlFor={id}>
          <div className="flex items-center gap-2">
            <input type="color" aria-label={`${field.label} picker`} value={/^#[0-9a-f]{6}$/i.test(str) ? str : "#000000"} onChange={(e) => set(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-fg/20 bg-white p-0.5" />
            <input id={id} type="text" value={str} onChange={(e) => set(e.target.value)} className={`${inputCls} max-w-32 font-mono`} />
          </div>
        </FieldShell>
      );
    }
    case "select":
      return (
        <FieldShell label={field.label} help={field.help} error={error} htmlFor={id}>
          <select id={id} value={typeof v === "string" ? v : ""} onChange={(e) => set(e.target.value)} className={inputCls}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldShell>
      );
    case "image":
      return <ImageField label={field.label} help={field.help} error={error} value={(v as Obj | null | undefined) ?? null} onChange={set} noAlt={field.noAlt} />;
    case "toggle": {
      const on = v === true;
      return (
        <FieldShell label={field.label} help={field.help} error={error} htmlFor={id}>
          <button
            id={id}
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => set(!on)}
            className={`inline-flex h-8 w-fit items-center gap-2 rounded-full border px-3 text-xs font-semibold ${on ? "border-ok/40 bg-ok/10 text-ok" : "border-fg/25 text-fg/60 hover:bg-fg/5"}`}
          >
            <span aria-hidden className={`h-2 w-2 rounded-full ${on ? "bg-ok" : "bg-fg/30"}`} />
            {on ? (field.onLabel ?? "On") : (field.offLabel ?? "Off")}
          </button>
        </FieldShell>
      );
    }
    case "range": {
      const num = typeof v === "number" && Number.isFinite(v) ? v : (field.def ?? field.min);
      return (
        <FieldShell label={`${field.label}: ${num}${field.unit ?? ""}`} help={field.help} error={error} htmlFor={id}>
          <div className={`grid items-center gap-3 ${field.preview ? "sm:grid-cols-[minmax(0,1fr)_150px]" : ""}`}>
            <div className="flex items-center gap-2">
              <input id={id} type="range" min={field.min} max={field.max} step={field.step ?? 1} value={num} onChange={(e) => set(Number(e.target.value))} className="w-full accent-accent" />
              <button type="button" className={iconBtnCls} aria-label={`Reset ${field.label}`} title="Reset to default" disabled={num === (field.def ?? field.min)} onClick={() => set(field.def ?? field.min)}>
                ↺
              </button>
            </div>
            {field.preview && <SizePreview kind={field.preview} value={value} scale={num} />}
          </div>
        </FieldShell>
      );
    }
    case "video":
      return <VideoField label={field.label} help={field.help} error={error} value={(v as Obj | null | undefined) ?? null} onChange={set} />;
    case "sequence":
      return <SequenceField label={field.label} help={field.help} error={error} value={(v as Obj | null | undefined) ?? null} onChange={set} />;
    case "strings": {
      const items = Array.isArray(v) ? (v as string[]) : [];
      const canAdd = !field.fixed && items.length < (field.max ?? 99);
      const canRemove = !field.fixed && items.length > (field.min ?? 0);
      const update = (i: number, t: string) => set(items.map((x, j) => (j === i ? t : x)));
      const nested = Object.keys(errors).filter((k) => k.startsWith(`${p}.`));
      return (
        <FieldShell label={field.label} help={field.help} error={error ?? (nested.length ? errors[nested[0]] : undefined)}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <SortableList ids={items.map((_, i) => String(i))} disabled={field.fixed} onReorder={(f, t) => set(arrayMove(items, f, t))}>
              {items.map((t, i) => (
                <SortableItem key={i} id={String(i)} label={`${field.label} ${i + 1}`}>
                  {({ setNodeRef, style, handle }) => (
                    <div ref={setNodeRef as React.Ref<HTMLDivElement>} style={style} data-path={`${p}.${i}`} className="flex items-center gap-1.5 rounded-md bg-white">
                      {!field.fixed && handle}
                      {field.color && <span aria-hidden className="h-6 w-6 shrink-0 rounded border border-fg/30" style={{ background: t }} />}
                      <input type="text" aria-label={`${field.label} ${i + 1}`} value={t} placeholder={field.placeholder} onChange={(e) => update(i, e.target.value)} className={inputCls} />
                      {!field.fixed && (
                        <>
                          <button type="button" className={iconBtnCls} aria-label="Remove" disabled={!canRemove} onClick={() => set(items.filter((_, j) => j !== i))}>
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </SortableItem>
              ))}
            </SortableList>
            {canAdd && (
              <button type="button" className={`${btnCls} justify-self-start`} onClick={() => set([...items, ""])}>
                + Add
              </button>
            )}
          </div>
        </FieldShell>
      );
    }
    case "group": {
      const inner = name ? ((v as Obj | undefined) ?? {}) : value;
      const setInner = (nv: Obj) => (name ? set(nv) : onChange(nv));
      return (
        <fieldset className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-lg border border-fg/12 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg/70">{field.label}</legend>
          {field.help && <p className="-mt-2 text-xs text-fg/55">{field.help}</p>}
          <Fields fields={field.fields} value={inner} onChange={setInner} path={p} errors={errors} />
        </fieldset>
      );
    }
    case "list": {
      const items = Array.isArray(v) ? (v as Obj[]) : [];
      const canAdd = !field.fixed && !!field.blank && items.length < (field.max ?? 99);
      const canRemove = !field.fixed && items.length > (field.min ?? 0);
      return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-fg">{field.label}</span>
            <span className="text-xs text-fg/50">
              {items.length}
              {field.fixed ? ` (fixed by the design)` : ""}
            </span>
          </div>
          {field.help && <p className="text-xs text-fg/55">{field.help}</p>}
          {error && (
            <p role="alert" className="text-xs font-medium text-bad">
              {error}
            </p>
          )}
          <SortableList ids={items.map((_, i) => String(i))} disabled={field.fixedOrder} onReorder={(f, t) => set(arrayMove(items, f, t))}>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {items.map((it, i) => {
                const hasErr = Object.keys(errors).some((k) => k.startsWith(`${p}.${i}.`) || k === `${p}.${i}`);
                const status = typeof it.copyStatus === "string" ? it.copyStatus : null;
                const hidden = !!field.hideKey && it[field.hideKey] === false;
                const thumb = field.thumb?.(it) ?? null;
                return (
                  <SortableItem key={i} id={String(i)} label={field.title(it, i)}>
                    {({ setNodeRef, style, handle }) => (
                      <details ref={setNodeRef as React.Ref<HTMLDetailsElement>} style={style} open={hasErr || undefined} data-item={typeof it.serviceId === "string" ? it.serviceId : typeof it.id === "string" ? it.id : undefined} className={`rounded-lg border ${hasErr ? "border-bad/70" : "border-fg/15"} bg-white ${hidden ? "opacity-70" : ""}`}>
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-sm">
                          {!field.fixedOrder && handle}
                          <span aria-hidden className="text-fg/40">
                            ▸
                          </span>
                          {field.thumb && (
                            <span aria-hidden className="flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-fg/10 bg-ink/90">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {thumb ? <img src={thumb} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[9px] text-cream/50">none</span>}
                            </span>
                          )}
                          <span className="font-semibold">{field.title(it, i)}</span>
                          {hidden && <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[11px] font-semibold text-fg/60">Hidden</span>}
                          {status && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHIP[status] ?? ""}`}>{status}</span>}
                          <span className="ml-auto flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {field.hideKey && (
                              <button type="button" className={`${iconBtnCls} w-auto px-2`} aria-label={hidden ? "Show on the website" : "Hide from the website"} onClick={(e) => { e.preventDefault(); set(items.map((x, j) => (j === i ? { ...x, [field.hideKey as string]: hidden } : x))); }}>
                                {hidden ? "Show" : "Hide"}
                              </button>
                            )}
                            {!field.fixed && (
                              <button type="button" className={iconBtnCls} aria-label="Remove" disabled={!canRemove} onClick={(e) => { e.preventDefault(); set(items.filter((_, j) => j !== i)); }}>
                                ✕
                              </button>
                            )}
                          </span>
                        </summary>
                        <div className="border-t border-fg/10 p-3">
                          <Fields fields={field.item} value={it} onChange={(n) => set(items.map((x, j) => (j === i ? n : x)))} path={`${p}.${i}`} errors={errors} />
                        </div>
                      </details>
                    )}
                  </SortableItem>
                );
              })}
            </div>
          </SortableList>
          {canAdd && (
            <button type="button" className={`${btnCls} justify-self-start`} onClick={() => set([...items, field.blank!()])}>
              + Add {field.label.toLowerCase().replace(/s$/, "")}
            </button>
          )}
        </div>
      );
    }
  }
}

/** Live preview next to a size slider: a partner logo at its relative size (dark ground, as on the site) or the RMZ square with its artwork. Reflects the unsaved value. */
function SizePreview({ kind, value, scale }: { kind: "partner" | "magnet"; value: Obj; scale: number }) {
  if (kind === "partner") {
    const logo = value.logo as Obj | null | undefined;
    const src = typeof logo?.src === "string" ? logo.src : "";
    return (
      <div aria-hidden className="flex h-20 items-center justify-center overflow-hidden rounded-md border border-fg/15 bg-ink">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" style={{ width: `${Math.round(scale * 0.7)}px`, maxWidth: "92%", maxHeight: "92%" }} className="object-contain" />
        ) : (
          <span className="px-2 text-center text-[10px] text-cream/50">Upload artwork to preview</span>
        )}
      </div>
    );
  }
  const art = value.artwork as Obj | null | undefined;
  const src = typeof art?.src === "string" ? art.src : "";
  const bg = typeof value.background === "string" ? value.background : "#D52518";
  const ink = typeof value.artworkColor === "string" ? value.artworkColor : "#F3E8CC";
  const tint = value.tint === true;
  return (
    <div aria-hidden className="flex h-20 items-center justify-center rounded-md border border-fg/15 bg-ink">
      <div className="box-border grid h-14 w-14 place-items-center p-1.5" style={{ background: bg }}>
        {src ? (
          tint ? (
            <span style={{ width: `${scale}%`, height: `${scale}%`, background: ink, WebkitMask: `url(${src}) center / contain no-repeat`, mask: `url(${src}) center / contain no-repeat` }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" style={{ width: `${scale}%`, height: `${scale}%` }} className="object-contain" />
          )
        ) : (
          <span style={{ color: ink, fontSize: `${Math.round(15 * (scale / 100))}px` }} className="font-black leading-none tracking-tight">
            RMZ
          </span>
        )}
      </div>
    </div>
  );
}
