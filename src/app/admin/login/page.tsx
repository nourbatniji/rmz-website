import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="admin-ui min-h-screen"><main className="mx-auto grid min-h-screen max-w-sm content-center gap-6 px-6">
      <div>
        <p className="t-meta text-[11px] text-accent">Rebel Mind Zone</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Sign in to the dashboard</h1>
      </div>
      <LoginForm />
    </main></div>
  );
}
