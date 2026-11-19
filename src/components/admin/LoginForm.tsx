"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/admin/auth-actions";
import { inputCls } from "./form/FormFields";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-1.5 text-[13px] font-semibold">
        Email
        <input name="email" type="email" autoComplete="username" required className={inputCls} />
      </label>
      <label className="grid gap-1.5 text-[13px] font-semibold">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-white hover:brightness-95 disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
