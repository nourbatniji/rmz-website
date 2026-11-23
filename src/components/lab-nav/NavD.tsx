"use client";

import { useEffect, useRef, useState } from "react";
import { Logo, splitNav, useOverlay, useToggleEvent, type NavProps } from "./shared";

/**
 * D — MENU AS A TYPOGRAPHIC STAGE. A restrained header: logo, a visible Contact shortcut and a clearly labelled Menu button. Opening it sweeps a red slab and then
 * an ink stage across the viewport left → right (the same direction as the hero's photo sweep through the word; no lens, no prism); closing sweeps it away in the
 * same direction. On the stage the destinations are set huge; on hover the uppercase word rises out of its mask and the red italic lowercase word rises in.
 */
export function NavD({ brand, nav, solid, active, reduced }: NavProps) {
  // phase: closed → open → closing (keeps sweeping to the right) → closed (snaps back to its start, unseen)
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const open = phase === "open";
  const setOpen = (fn: boolean | ((v: boolean) => boolean)) => setPhase((p) => ((typeof fn === "function" ? fn(p === "open") : fn) ? "open" : p === "open" ? "closing" : p));
  useEffect(() => {
    if (phase !== "closing") return;
    const t = window.setTimeout(() => setPhase("closed"), reduced ? 20 : 760);
    return () => window.clearTimeout(t);
  }, [phase, reduced]);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const followed = useRef(false);
  const close = () => setOpen(false);
  useOverlay(open, close, panel, trigger, followed);
  useToggleEvent(() => setOpen((v) => !v));
  const { contact } = splitNav(nav);

  return (
    <header className={`nv nv-d ${solid ? "is-solid" : ""} ${open ? "is-open" : ""} ${phase === "closing" ? "is-closing" : ""}`} data-reduced={reduced ? "1" : "0"}>
      <div className="nv-d-bg" aria-hidden="true" />
      <div className="nv-d-row">
        <a href="#top" className="nv-d-logo" aria-label={`${brand.name} — home`}>
          <Logo brand={brand} />
        </a>
        <div className="nv-d-right">
          <a href={contact.href} className="nv-d-contact">
            <span>{contact.label}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M5 3h8v8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          </a>
          <button ref={trigger} type="button" className="nv-d-menubtn" aria-expanded={open} aria-controls="nv-d-panel" onClick={() => setOpen((v) => !v)}>
            <span className="nv-d-mtxt">
              <span>{open ? "Close" : "Menu"}</span>
            </span>
            <i className="nv-ico" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="nv-d-slab" aria-hidden="true" />
      <div id="nv-d-panel" ref={panel} className="nv-d-panel" aria-hidden={!open} inert={!open} role="dialog" aria-label="Menu">
        <nav aria-label="Primary" className="nv-d-nav">
          {nav.map((item, i) => (
            <a key={item.href} href={item.href} className="nv-d-link" aria-current={active === item.href ? "location" : undefined} style={{ ["--d" as string]: `${260 + i * 70}ms` }} onClick={() => { followed.current = true; close(); }}>
              <span className="nv-d-idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className="nv-d-word">
                <span className="nv-d-up">{item.label}</span>
                <span className="nv-d-lo" aria-hidden="true">{item.label.toLowerCase()}.</span>
              </span>
              <span className="nv-d-go" aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
        <p className="nv-d-foot t-meta"><span>Rebel Mind Zone</span><span>Cairo, Egypt</span><span className="nv-d-esc">Esc to close</span></p>
      </div>
    </header>
  );
}
