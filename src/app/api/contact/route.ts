import { db } from "@/lib/db";

/**
 * Public contact form endpoint (homepage "Contact" section). Stores one ContactMessage that shows up in the admin inbox.
 * Validation is deliberately small; `website` is a honeypot (real visitors never see or fill it).
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (clip(body.website, 200)) return Response.json({ ok: true }); // honeypot: pretend success
  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const company = clip(body.company, 160);
  const project = clip(body.project, 4000);
  const services = Array.isArray(body.services) ? body.services.map((s) => clip(s, 60)).filter(Boolean).slice(0, 12) : [];
  if (!name || !EMAIL.test(email)) return Response.json({ error: "Please add your name and a valid email." }, { status: 400 });
  const message = [company && `Brand / company: ${company}`, services.length && `Services: ${services.join(", ")}`, project].filter(Boolean).join("\n\n") || "(no message)";
  try {
    await db.contactMessage.create({ data: { name, email, message } });
  } catch {
    return Response.json({ error: "Could not send right now. Please email us instead." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
