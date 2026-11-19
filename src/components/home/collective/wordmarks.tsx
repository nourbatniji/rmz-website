import type { ReactNode } from "react";
import type { WordmarkId } from "@/content/closing-types";

/** Placeholder wordmarks from the canvas board — single-colour (currentColor) so hover/selected states can tint them. Replaced by approved artwork via `logo`. */
const FS = { fontFamily: "var(--font-sans)" };
const PS = { fontFamily: "var(--font-serif)" };

export const WORDMARKS: Record<WordmarkId, { w: number; h: number; node: ReactNode }> = {
  northwind: { w: 342, h: 56, node: <><text x="0" y="45" fontSize="46" fontWeight="900" textLength="300.5" lengthAdjust="spacing" style={FS}>NORTHWIND</text><path d="M316 45L342 45L330 8Z" /></> },
  halo: { w: 147, h: 90, node: <><ellipse cx="73.5" cy="13" rx="36" ry="9" fill="none" stroke="currentColor" strokeWidth="5" /><text x="5" y="82" fontSize="70" fontWeight="700" textLength="137" lengthAdjust="spacing" style={PS} fontStyle="italic">halo</text></> },
  orbital: { w: 122, h: 120, node: <><circle cx="61" cy="36" r="28" fill="none" stroke="currentColor" strokeWidth="6" /><circle cx="89" cy="36" r="7" /><text x="0" y="97" fontSize="24" fontWeight="900" textLength="121.8" lengthAdjust="spacing" style={FS}>ORBITAL</text><text x="0" y="118" fontSize="20" fontWeight="300" textLength="121.8" lengthAdjust="spacing" style={FS}>PRESS</text></> },
  kiln: { w: 181, h: 80, node: <text x="0" y="62" fontSize="86" fontWeight="700" textLength="177.4" lengthAdjust="spacing" style={PS} fontStyle="italic">kiln.</text> },
  tideworks: { w: 278, h: 40, node: <text x="0" y="32" fontSize="34" fontWeight="600" textLength="278.4" lengthAdjust="spacing" style={FS}>TIDEWORKS</text> },
  mango: { w: 205, h: 70, node: <><circle cx="30" cy="38" r="28" /><path d="M36 8q16-6 24 6q-14 8-24-6z" /><text x="70" y="36" fontSize="32" fontWeight="900" textLength="135.4" lengthAdjust="spacing" style={FS}>MANGO</text><text x="70" y="63" fontSize="24" fontWeight="300" textLength="135.4" lengthAdjust="spacing" style={FS}>LAB</text></> },
  papermoon: { w: 149, h: 110, node: <><path d="M82.5 4A30 30 0 0 0 82.5 64A44 44 0 0 1 82.5 4Z" /><text x="0" y="100" fontSize="27" fontWeight="700" textLength="149" lengthAdjust="spacing" style={PS} fontStyle="italic">Paper Moon</text></> },
  atlas: { w: 222, h: 50, node: <><text x="0" y="40" fontSize="50" fontWeight="900" textLength="118.9" lengthAdjust="spacing" style={PS} fontStyle="italic">Atlas</text><text x="130.9" y="40" fontSize="40" fontWeight="700" textLength="25.6" lengthAdjust="spacing" style={PS} fontStyle="italic">&amp;</text><text x="168.5" y="40" fontSize="32" fontWeight="900" textLength="51.4" lengthAdjust="spacing" style={FS}>CO</text></> },
  fable: { w: 190, h: 90, node: <><text x="0" y="66" fontSize="76" fontWeight="700" textLength="188" lengthAdjust="spacing" style={PS}>Fable</text><path d="M4 82Q95 70 186 82" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></> },
  solstice: { w: 294, h: 60, node: <><path d="M2 52a28 28 0 0 1 56 0Z" /><path d="M30 6v9M7 20l6 6M53 20l-6 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /><text x="74" y="51" fontSize="34" fontWeight="300" textLength="219.5" lengthAdjust="spacing" style={FS}>SOLSTICE</text></> },
  brick: { w: 160, h: 70, node: <><rect x="2.5" y="2.5" width="155" height="65" fill="none" stroke="currentColor" strokeWidth="5" /><text x="26" y="33" fontSize="26" fontWeight="900" textLength="107.9" lengthAdjust="spacing" style={FS}>BRICK</text><text x="26" y="58" fontSize="26" fontWeight="900" textLength="107.9" lengthAdjust="spacing" style={FS}>HOUSE</text></> },
  ninelines: { w: 202, h: 70, node: <><text x="0" y="62" fontSize="80" fontWeight="900" textLength="46.6" lengthAdjust="spacing" style={PS} fontStyle="italic">9</text><rect x="61" y="16" width="30" height="5" /><rect x="61" y="31" width="30" height="5" /><rect x="61" y="46" width="30" height="5" /><text x="102.6" y="36" fontSize="30" fontWeight="900" textLength="98.9" lengthAdjust="spacing" style={FS}>NINE</text><text x="102.6" y="64" fontSize="30" fontWeight="300" textLength="98.9" lengthAdjust="spacing" style={FS}>LINES</text></> },
};

export function Wordmark({ id, width, label }: { id: WordmarkId; width: number; label: string }) {
  const m = WORDMARKS[id];
  return (
    <svg viewBox={`0 0 ${m.w} ${m.h}`} width={width} height={(width * m.h) / m.w} role="img" aria-label={`${label} (placeholder wordmark)`} fill="currentColor">
      {m.node}
    </svg>
  );
}
