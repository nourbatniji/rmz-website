"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from "react";
import type { FormEvent, ReactNode } from "react";

/**
 * Lab only (/lab/contact). Shared state for the three Contact prototypes, kept ABOVE the directions so typed values, validation and the
 * submit state survive switching A/B/C.
 *
 * There is no public contact contract yet (TASKS.md: "Contact form — fields + delivery requirements not confirmed"; the admin inbox model
 * `ContactMessage` has name / email / message). So the fields are: Name, Email, Company (optional), What do you have in mind?
 *
 * SUBMISSION IS A LOCAL DEMO: submit() only waits a moment and flips a flag. Nothing is sent, no lead is created, nothing is written.
 */

export type FieldKey = "name" | "email" | "company" | "message";
export type Values = Record<FieldKey, string>;
export type Errors = Partial<Record<FieldKey, string>>;
export type Status = "idle" | "loading" | "success" | "error";
export type Outcome = "ok" | "fail";

const FIELD_ORDER: FieldKey[] = ["name", "email", "message"]; // required fields, in reading order (company is optional)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateField(key: FieldKey, raw: string): string | undefined {
  const v = raw.trim();
  if (key === "name") {
    if (!v) return "Tell us your name.";
    if (v.length < 2) return "Add at least two letters.";
  }
  if (key === "email") {
    if (!v) return "We need an email to reply to.";
    if (!EMAIL.test(v)) return "That email doesn't look right.";
  }
  if (key === "message") {
    if (!v) return "Tell us a little about what you have in mind.";
    if (v.length < 10) return "Add a sentence or two.";
  }
  return undefined;
}

export function validate(values: Values): Errors {
  const out: Errors = {};
  for (const k of FIELD_ORDER) {
    const e = validateField(k, values[k]);
    if (e) out[k] = e;
  }
  return out;
}

type State = {
  values: Values;
  touched: Partial<Record<FieldKey, boolean>>;
  status: Status;
  serverError: string | null;
  outcome: Outcome;
};

const EMPTY: Values = { name: "", email: "", company: "", message: "" };
const INITIAL: State = { values: EMPTY, touched: {}, status: "idle", serverError: null, outcome: "ok" };

type Action =
  | { t: "change"; key: FieldKey; value: string }
  | { t: "touch"; key: FieldKey }
  | { t: "touchAll" }
  | { t: "start" }
  | { t: "ok" }
  | { t: "fail"; message: string }
  | { t: "reset" }
  | { t: "outcome"; value: Outcome };

function reducer(s: State, a: Action): State {
  switch (a.t) {
    case "change":
      return { ...s, values: { ...s.values, [a.key]: a.value }, status: s.status === "error" ? "idle" : s.status, serverError: null };
    case "touch":
      return s.touched[a.key] ? s : { ...s, touched: { ...s.touched, [a.key]: true } };
    case "touchAll":
      return { ...s, touched: { name: true, email: true, company: true, message: true } };
    case "start":
      return { ...s, status: "loading", serverError: null };
    case "ok":
      return { ...s, status: "success" };
    case "fail":
      return { ...s, status: "error", serverError: a.message };
    case "reset":
      return { ...INITIAL, outcome: s.outcome };
    case "outcome":
      return { ...s, outcome: a.value };
  }
}

type Ctx = {
  values: Values;
  /** only the errors the visitor should see now (the field was left, or a submit was attempted) */
  errors: Errors;
  status: Status;
  serverError: string | null;
  outcome: Outcome;
  firstName: string;
  onChange: (key: FieldKey, value: string) => void;
  onBlur: (key: FieldKey) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  reset: () => void;
  setOutcome: (o: Outcome) => void;
};

const Context = createContext<Ctx | null>(null);

export function useContactDemo(): Ctx {
  const c = useContext(Context);
  if (!c) throw new Error("useContactDemo must be used inside <ContactDemoProvider>");
  return c;
}

export const DEMO_DELAY_MS = 1100;

export function ContactDemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const outcomeRef = useRef<Outcome>("ok"); // read when the demo timer fires (set only from the lab control, never during render)

  const onChange = useCallback((key: FieldKey, value: string) => dispatch({ t: "change", key, value }), []);
  const onBlur = useCallback((key: FieldKey) => dispatch({ t: "touch", key }), []);
  const reset = useCallback(() => dispatch({ t: "reset" }), []);
  const setOutcome = useCallback((value: Outcome) => {
    outcomeRef.current = value;
    dispatch({ t: "outcome", value });
  }, []);

  const onSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.status === "loading" || state.status === "success") return;
    const errs = validate(state.values);
    dispatch({ t: "touchAll" });
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) {
      (e.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    dispatch({ t: "start" });
    // DEMO ONLY — no request is made anywhere.
    window.setTimeout(() => {
      if (outcomeRef.current === "fail") dispatch({ t: "fail", message: "Demo error: nothing was lost. Check the connection and try again." });
      else dispatch({ t: "ok" });
    }, DEMO_DELAY_MS);
  }, [state.status, state.values]);

  const value = useMemo<Ctx>(() => {
    const errors: Errors = {};
    const all = validate(state.values);
    for (const k of FIELD_ORDER) if (state.touched[k] && all[k]) errors[k] = all[k];
    return {
      values: state.values,
      errors,
      status: state.status,
      serverError: state.serverError,
      outcome: state.outcome,
      firstName: state.values.name.trim().split(/\s+/)[0] ?? "",
      onChange,
      onBlur,
      onSubmit,
      reset,
      setOutcome,
    };
  }, [state, onChange, onBlur, onSubmit, reset, setOutcome]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
