"use client";

import { useEffect, useState } from "react";

/** The studio's place with its live local time (client only: the server renders the plain place name). */
export function FooterClock({ place, timeZone, className }: { place: string; timeZone: string; className?: string }) {
  const [text, setText] = useState(place);
  useEffect(() => {
    const tick = () => {
      try {
        const t = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
        setText(`${place} · ${t}`);
      } catch {
        setText(place);
      }
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [place, timeZone]);
  return <span className={className}>{text}</span>;
}
