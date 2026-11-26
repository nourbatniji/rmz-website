"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ContactContent } from "@/content/closing-types";
import { devContactContent } from "@/content/dev/closing";
import "./contact.css";

/**
 * Contact form: a plain section on the dark background (the aperture circles were removed). It is the "cover" (curtain) of the closing sequence in
 * FooterUnfold: Collaborations → this form → the unfolding footer. Anchor: #contact. Submits to /api/contact.
 */
type Status = "idle" | "sending" | "sent" | "error";

/** `anchorId`: the section's DOM id; `null` when an anchor that does not move stands in for it (the closing cover, see FooterUnfold). */
export function ContactReveal({ content = devContactContent, anchorId = "contact" }: { content?: ContactContent; anchorId?: string | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [bad, setBad] = useState({ name: false, email: false });
  const [error, setError] = useState("");

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (status === "sending" || status === "sent") return;
    const form = ev.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const badName = !name;
    const badEmail = !/.+@.+\..+/.test(email);
    setBad({ name: badName, email: badEmail });
    if (badName || badEmail) {
      setError("");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: data.get("company"),
          project: data.get("message"),
          website: data.get("website"),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Could not send right now. Please email us instead.");
      }
      setStatus("sent");
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send right now. Please email us instead.");
      setStatus("error");
    }
  }

  const formEl = (
    <form className="ct-form" noValidate onSubmit={onSubmit} aria-label="Contact form">
      <p className="ct-kk ct-orange">{content.kicker}</p>
      <h2 className="ct-h">
        {content.headingLead} <span className="ct-ital">{content.headingEmphasis}</span>
      </h2>
      <div className="ct-row">
        <label className="ct-f" data-bad={bad.name ? "1" : "0"}>
          <span className="ct-fl">{content.nameLabel}</span>
          <input className="ct-in" name="name" type="text" autoComplete="name" aria-invalid={bad.name} onChange={() => bad.name && setBad((b) => ({ ...b, name: false }))} />
          <span className="ct-hint">{content.nameHint}</span>
        </label>
        <label className="ct-f" data-bad={bad.email ? "1" : "0"}>
          <span className="ct-fl">{content.emailLabel}</span>
          <input className="ct-in" name="email" type="email" autoComplete="email" aria-invalid={bad.email} onChange={() => bad.email && setBad((b) => ({ ...b, email: false }))} />
          <span className="ct-hint">{bad.email ? content.emailError : content.emailHint}</span>
        </label>
      </div>
      <label className="ct-f"><span className="ct-fl">{content.companyLabel} <em>{content.companyOptional}</em></span><input className="ct-in" name="company" type="text" autoComplete="organization" /></label>
      <label className="ct-f"><span className="ct-fl">{content.messageLabel}</span><textarea className="ct-in" name="message" rows={3} /><span className="ct-hint">{content.messageHint}</span></label>
      <input className="ct-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="ct-act">
        <button type="submit" className="ct-cta" disabled={status === "sending"}>
          {status === "sent" ? content.sentLabel : status === "sending" ? content.sendingLabel : <>{content.buttonLabel}<i aria-hidden="true">→</i></>}
        </button>
        <a className="ct-ln" href={`mailto:${content.email}`}>{content.mailPrefix} {content.email}</a>
      </div>
      <p className="ct-err" role="status">{status === "error" ? error : ""}</p>
    </form>
  );

  return (
    <section id={anchorId ?? undefined} className="ct-root" aria-label="Contact">
      <div className="ct-inner">{formEl}</div>
    </section>
  );
}
