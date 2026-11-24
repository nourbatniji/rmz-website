"use client";

import { useEffect, useRef } from "react";
import type { FooterContent } from "@/content/closing-types";
import { Field } from "./Field";
import { useContactDemo } from "./store";

/**
 * Lab only (/lab/contact). The restrained Contact section, in three visual directions that share one structure:
 * the introduction on one half (modest heading, one sentence, the real email) and the form on the other.
 *   A Ink · B Cream · C Quiet division (ink section, cream form half, no card).
 * Copy is provisional. The email is the real one from the footer content (never invented). Submission is a local demo (see store.tsx).
 */
export type Variant = "A" | "B" | "C";

function Intro({ email }: { email: string }) {
  return (
    <div className="lt-intro">
      <h2 id="lt-h" className="lt-h">
        Let’s <span className="lt-it">talk.</span>
      </h2>
      <p className="lt-lede">Tell us what you have in mind.</p>
      <a className="lt-mail" href={`mailto:${email}`}>
        {email}
      </a>
    </div>
  );
}

function ContactForm() {
  const { status, serverError, firstName, values, onSubmit, reset } = useContactDemo();
  const doneRef = useRef<HTMLDivElement>(null);
  const done = status === "success";
  const loading = status === "loading";

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  return (
    <div className="lt-swap">
      <form className="lt-form" noValidate onSubmit={onSubmit} aria-describedby="lt-demo" data-hidden={done || undefined} inert={done}>
        <div className="lt-row">
          <Field name="name" label="Name" autoComplete="name" />
          <Field name="email" label="Email" type="email" autoComplete="email" />
        </div>
        <Field name="company" label="Company" autoComplete="organization" />
        <Field name="message" label="Message" multiline rows={4} />
        <div className="lt-actions">
          <button type="submit" className="lt-send" data-state={status} aria-busy={loading || undefined} aria-disabled={loading || undefined}>
            {loading ? "Sending…" : status === "error" ? "Try again" : "Send enquiry"}
          </button>
          <p id="lt-demo" className="lt-demo">
            Demo only. Nothing is sent.
          </p>
        </div>
        <p className="lt-fail" role="alert">
          {status === "error" ? serverError : ""}
        </p>
      </form>

      <div ref={doneRef} tabIndex={-1} className="lt-done" data-hidden={!done || undefined} inert={!done}>
        <h3 className="lt-done-h">Thank you{firstName ? `, ${firstName}` : ""}.</h3>
        <p className="lt-done-p">We will write back to {values.email.trim()}.</p>
        <p className="lt-demo">Demo only. Nothing was sent.</p>
        <button type="button" className="lt-again" onClick={reset}>
          Send another
        </button>
      </div>
    </div>
  );
}

export function ContactSection({ variant, footer }: { variant: Variant; footer: FooterContent }) {
  if (variant === "C") {
    return (
      <section className="lt lt-c" aria-labelledby="lt-h">
        <div className="lt-c-grid">
          <div className="lt-c-intro">
            <Intro email={footer.email} />
          </div>
          <div className="lt-c-surface">
            <div className="lt-c-form">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={`lt ${variant === "A" ? "lt-a" : "lt-b"}`} aria-labelledby="lt-h">
      <div className="lt-wrap">
        <Intro email={footer.email} />
        <ContactForm />
      </div>
    </section>
  );
}
