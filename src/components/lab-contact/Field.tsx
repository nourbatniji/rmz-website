"use client";

import type { ChangeEvent } from "react";
import { useContactDemo, type FieldKey } from "./store";

/**
 * One persistent-label writing line, shared by all three directions (each restyles it through CSS variables on its root).
 * The label is always visible and tied to the control; the error is always in the DOM (aria-describedby) with reserved height so nothing jumps.
 */
const REQUIRED: Record<FieldKey, boolean> = { name: true, email: true, company: false, message: true };

export function Field({
  name,
  label,
  type = "text",
  autoComplete,
  multiline = false,
  rows = 5,
  className = "",
}: {
  name: FieldKey;
  label: string;
  type?: "text" | "email";
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
}) {
  const { values, errors, status, onChange, onBlur } = useContactDemo();
  const id = `lt-${name}`;
  const errId = `${id}-err`;
  const error = errors[name];
  const locked = status === "success" || status === "loading";
  const shared = {
    id,
    name,
    value: values[name],
    onBlur: () => onBlur(name),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, e.target.value),
    readOnly: locked,
    "aria-readonly": locked || undefined,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": errId,
    "aria-required": REQUIRED[name] || undefined,
    autoComplete,
  };
  return (
    <div className={`lt-field ${className}`} data-invalid={error ? "true" : undefined} data-name={name}>
      <label htmlFor={id} className="lt-label">
        {label}
        {!REQUIRED[name] && <span className="lt-opt">optional</span>}
      </label>
      <div className="lt-ctl">
        {multiline ? (
          <textarea {...shared} rows={rows} />
        ) : (
          <input {...shared} type={type} inputMode={type === "email" ? "email" : undefined} autoCapitalize={type === "email" ? "off" : name === "name" ? "words" : undefined} spellCheck={type === "email" ? false : undefined} />
        )}
      </div>
      <p id={errId} className="lt-err" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
