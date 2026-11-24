"use client";

import { useCallback, useRef, useState } from "react";
import type gsap from "gsap";
import { LogoStage } from "@/components/brand/logo-animation/LogoStage";
import { LOGO_DURATION, PHASES } from "@/components/brand/logo-animation/logo-timeline";
import { useLogoTimeline } from "@/components/brand/logo-animation/useLogoTimeline";
import "./logo-lab.css";

/**
 * Lab only (/lab/logo-animation). The RMZ logo animation as a standalone prototype: Replay, play/pause, a timeline scrubber, speed.
 * Review route only: the animation itself is the shared implementation (components/brand/logo-animation) that the homepage loader also uses; this file only adds the prototype controls.
 */

const SPEEDS = [0.25, 0.5, 1, 2] as const;

export function LogoAnimationLab() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useLogoTimeline(svgRef, (tl) => {
    tlRef.current = tl;
    const sync = () => {
      setTime(tl.time());
      setPlaying(tl.isActive());
    };
    tl.eventCallback("onUpdate", sync);
    tl.eventCallback("onComplete", sync);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1);
    else tl.play(0);
  });

  const seek = useCallback((t: number) => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.pause();
    tl.time(t);
    setPlaying(false);
  }, []);

  const replay = useCallback(() => {
    tlRef.current?.restart();
  }, []);

  const toggle = useCallback(() => {
    const tl = tlRef.current;
    if (!tl) return;
    if (tl.isActive()) {
      tl.pause();
      setPlaying(false);
    } else {
      if (tl.progress() >= 1) tl.restart();
      else tl.play();
    }
  }, []);

  const changeSpeed = useCallback((s: (typeof SPEEDS)[number]) => {
    tlRef.current?.timeScale(s);
    setSpeed(s);
  }, []);

  return (
    <main className="ll">
      <header className="ll-head">
        <h1 className="ll-title">Logo animation lab</h1>
        <p className="ll-sub">Prototype. Not linked, not indexed. Motion measured from the reference video; artwork is the supplied PDF.</p>
      </header>

      <div className="ll-stage">
        <LogoStage ref={svgRef} className="ll-svg" />
      </div>

      <div className="ll-controls">
        <button type="button" className="ll-btn ll-btn-primary" onClick={replay}>
          Replay
        </button>
        <button type="button" className="ll-btn" onClick={toggle} aria-pressed={playing}>
          {playing ? "Pause" : "Play"}
        </button>

        <div className="ll-scrub">
          <input
            type="range"
            min={0}
            max={LOGO_DURATION}
            step={0.001}
            value={time}
            onChange={(ev) => seek(Number(ev.target.value))}
            aria-label="Timeline scrubber"
            aria-valuetext={`${time.toFixed(2)} of ${LOGO_DURATION.toFixed(2)} seconds`}
          />
          <div className="ll-ticks" aria-hidden="true">
            {PHASES.map((p) => (
              <span key={p.id} className="ll-tick" style={{ left: `${(p.at / LOGO_DURATION) * 100}%` }} />
            ))}
          </div>
        </div>

        <output className="ll-time">
          {time.toFixed(2)} / {LOGO_DURATION.toFixed(2)} s
        </output>

        <div className="ll-speed" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button key={s} type="button" className="ll-btn ll-btn-sm" aria-pressed={speed === s} onClick={() => changeSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      <ol className="ll-phases">
        {PHASES.map((p) => (
          <li key={p.id}>
            <button type="button" className="ll-phase" onClick={() => seek(p.at + 0.02)}>
              <span className="ll-phase-t">{p.at.toFixed(2)} s</span>
              <span className="ll-phase-l">{p.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}
