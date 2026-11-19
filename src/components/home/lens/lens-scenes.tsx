import type { CSSProperties, ReactNode } from "react";
import type { ImageRef, LensImageKey, LensSceneKey } from "@/content/types";

/**
 * The seven "studies" drawn inside the lens glass, ported from the approved canvas ("HOME - SERVICES SECTION").
 * The glass is 722 px; SVG stroke widths are expressed in viewBox units (px / 7.22) so the lens scales as one object.
 * Images come from typed content slots a–i; a missing slot renders a labelled, restrained development placeholder.
 */
type Imgs = Partial<Record<LensImageKey, ImageRef | null>>;

const TONE: Record<LensImageKey, string> = {
  a: "#3b342b", b: "#4a3b30", c: "#2f3b37", d: "#433b49", e: "#3a4350", f: "#4a4335", g: "#2e3b49", h: "#4a3b3b", i: "#3a4a3b",
};
const u = (n: number) => +(n / 7.22).toFixed(3);
const CREAM = "#F3E8CC";
const DK: CSSProperties = { background: "#0F0F0E", color: CREAM };
const YL: CSSProperties = { background: "#FFCA26", color: "#0F0F0E" };

function Im({ k, imgs, style, pos }: { k: LensImageKey; imgs: Imgs; style: CSSProperties; pos?: string }) {
  const ref = imgs[k];
  if (ref)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fixed-crop lens imagery, positioned by percentage
      <img src={ref.src} alt="" loading="lazy" decoding="async" draggable={false} style={{ position: "absolute", display: "block", objectFit: "cover", objectPosition: pos ?? "50% 50%", ...style }} />
    );
  return (
    <div data-ph="" style={{ position: "absolute", background: TONE[k], overflow: "hidden", ...style }}>
      <span className="lens-ph">Image {k.toUpperCase()}</span>
    </div>
  );
}

function L({ fs, s, children, pad }: { fs: number; s: CSSProperties; children: ReactNode; pad?: boolean }) {
  return (
    <span className="lens-nm" style={{ position: "absolute", fontSize: `calc(${fs}px * var(--tf, 1))`, ...(pad ? { padding: "calc(3px * var(--tf, 1)) calc(6px * var(--tf, 1))" } : {}), ...s }}>
      {children}
    </span>
  );
}

const FILL: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
const SVG = { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: FILL } as const;

function Frame({ l, t, w, h, k, imgs, b = 3, sh = "0 10px 22px rgba(0,0,0,.45)" }: { l: number; t: number; w: number; h: number; k: LensImageKey; imgs: Imgs; b?: number; sh?: string }) {
  return (
    <div style={{ position: "absolute", left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, border: `${b}px solid ${CREAM}`, boxShadow: sh, overflow: "hidden" }}>
      <Im k={k} imgs={imgs} style={{ inset: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

const SPROCKET = "repeating-linear-gradient(90deg,#11100E 0 12px,transparent 12px 26px)";

export function LensScene({ kind, imgs }: { kind: LensSceneKey; imgs: Imgs }) {
  switch (kind) {
    case "triptych":
      return (
        <>
          <Im k="a" imgs={imgs} style={{ left: "0%", top: 0, width: "33%", height: "100%" }} />
          <Im k="b" imgs={imgs} style={{ left: "33.5%", top: 0, width: "33%", height: "100%" }} />
          <Im k="c" imgs={imgs} style={{ left: "67%", top: 0, width: "33%", height: "100%" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%,rgba(15,15,14,0) 52%,rgba(15,15,14,.38) 100%)" }} />
          <svg {...SVG}>
            <path d="M 17 38 C 34 22 62 58 83 36" fill="none" stroke="#D52518" strokeWidth={u(3)} strokeLinecap="round" strokeDasharray={`${u(1)} ${u(8)}`} />
            <circle cx="17" cy="38" r="1.1" fill="#D52518" />
            <circle cx="50" cy="42" r="1.1" fill="#D52518" />
            <circle cx="83" cy="36" r="1.1" fill="#D52518" />
          </svg>
          <L fs={9} pad s={{ left: "17%", top: "80%", transform: "translateX(-50%)", whiteSpace: "nowrap", ...DK }}>01 Identity</L>
          <L fs={9} pad s={{ left: "50%", top: "80%", transform: "translateX(-50%)", whiteSpace: "nowrap", ...DK }}>02 Campaign</L>
          <L fs={9} pad s={{ left: "83%", top: "80%", transform: "translateX(-50%)", whiteSpace: "nowrap", ...DK }}>03 Digital</L>
        </>
      );
    case "detail":
      return (
        <>
          <Im k="a" imgs={imgs} style={{ left: "-55%", top: "-55%", width: "210%", height: "210%" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%,rgba(15,15,14,0) 50%,rgba(15,15,14,.3) 100%)" }} />
          <svg viewBox="0 0 100 100" style={FILL}>
            <g fill="none" stroke={CREAM} strokeWidth={u(3)}>
              <path d="M 30 38 V 30 H 38" />
              <path d="M 62 30 H 70 V 38" />
              <path d="M 70 62 V 70 H 62" />
              <path d="M 38 70 H 30 V 62" />
            </g>
            <g stroke="#FFCA26" strokeWidth={u(2.5)}>
              <path d="M 47 50 H 53" />
              <path d="M 50 47 V 53" />
            </g>
          </svg>
          <L fs={9} pad s={{ left: "30%", top: "23.5%", ...YL }}>Detail ×2</L>
        </>
      );
    case "fullframe":
      return (
        <>
          <Im k="d" imgs={imgs} pos="50% 30%" style={{ left: 0, top: 0, width: "100%", height: "100%" }} />
          <svg {...SVG}>
            <g stroke="rgba(255,255,255,.4)" strokeWidth={u(1)}>
              <path d="M 33.3 0 V 100" />
              <path d="M 66.6 0 V 100" />
              <path d="M 0 33.3 H 100" />
              <path d="M 0 66.6 H 100" />
            </g>
            <g fill="none" stroke={CREAM} strokeWidth={u(2)}>
              <path d="M 12 20 V 12 H 20" />
              <path d="M 80 12 H 88 V 20" />
              <path d="M 88 80 V 88 H 80" />
              <path d="M 20 88 H 12 V 80" />
            </g>
          </svg>
          <L fs={9} pad s={{ left: "50%", top: "12.5%", transform: "translateX(-50%)", whiteSpace: "nowrap", ...DK }}>Full frame</L>
        </>
      );
    case "collage":
      return (
        <>
          <div style={{ position: "absolute", inset: 0, background: "#14130F" }} />
          <Frame l={17} t={22} w={24} h={52} k="b" imgs={imgs} />
          <Frame l={45} t={20} w={20} h={20} k="e" imgs={imgs} />
          <Frame l={67} t={20} w={14} h={20} k="f" imgs={imgs} />
          <Frame l={45} t={44} w={36} h={26} k="a" imgs={imgs} />
          <svg {...SVG}>
            <path d="M 41 48 C 43 40 43 36 45 30 M 41 54 C 43 56 43 56 45 57 M 65 30 L 67 30" fill="none" stroke="#D52518" strokeWidth={u(3)} strokeLinecap="round" />
          </svg>
          <L fs={9} s={{ left: "17%", top: "76%", whiteSpace: "nowrap", color: CREAM }}>Poster</L>
          <L fs={9} s={{ left: "45%", top: "41.5%", whiteSpace: "nowrap", color: CREAM }}>Social</L>
          <L fs={9} s={{ left: "45%", top: "72%", whiteSpace: "nowrap", color: CREAM }}>Out of home</L>
        </>
      );
    case "devices":
      return (
        <>
          <Im k="c" imgs={imgs} style={{ inset: 0, width: "100%", height: "100%" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,15,14,.34)" }} />
          <div style={{ position: "absolute", left: "13%", top: "24%", width: "56%", height: "46%", background: "#1b1a17", borderRadius: 8, overflow: "hidden", boxShadow: "0 18px 36px rgba(0,0,0,.5)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: "9%", background: "#2a2926" }} />
            <span style={{ position: "absolute", left: "3%", top: "3%", width: "2.4%", aspectRatio: "1", borderRadius: "50%", background: "#D52518" }} />
            <span style={{ position: "absolute", left: "7%", top: "3%", width: "2.4%", aspectRatio: "1", borderRadius: "50%", background: "#FFCA26" }} />
            <span style={{ position: "absolute", left: "11%", top: "3%", width: "2.4%", aspectRatio: "1", borderRadius: "50%", background: "#9ACC42" }} />
            <span style={{ position: "absolute", left: "24%", top: "2%", width: "44%", height: "5%", borderRadius: 6, background: "#3d3b37" }} />
            <Im k="g" imgs={imgs} style={{ left: 0, top: "9%", width: "100%", height: "91%" }} />
          </div>
          <div style={{ position: "absolute", left: "60%", top: "32%", width: "20%", height: "44%", background: "#0F0F0E", borderRadius: 22, padding: "2.4%", boxShadow: "0 18px 36px rgba(0,0,0,.55)" }}>
            <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 16, overflow: "hidden" }}>
              <Im k="a" imgs={imgs} style={{ inset: 0, width: "100%", height: "100%" }} />
            </div>
            <span style={{ position: "absolute", left: "50%", top: "1.6%", transform: "translateX(-50%)", width: "28%", height: "2.4%", borderRadius: 6, background: "#0F0F0E" }} />
          </div>
          <svg viewBox="0 0 100 100" style={{ position: "absolute", left: "64%", top: "58%", width: "6%", height: "6%", overflow: "visible" }}>
            <path d="M 0 0 L 0 62 L 18 46 L 30 74 L 42 68 L 30 42 L 54 42 Z" fill={CREAM} stroke="#0F0F0E" strokeWidth={5} />
          </svg>
        </>
      );
    case "contactsheet":
      return (
        <>
          <div style={{ position: "absolute", inset: 0, background: "#11100E" }} />
          <div style={{ position: "absolute", left: "-5%", top: "28%", width: "110%", height: "46%", background: "#1c1b18", boxShadow: "0 0 0 1px rgba(243,232,204,.12) inset" }} />
          <div style={{ position: "absolute", left: "-5%", top: "29.6%", width: "110%", height: "2.6%", backgroundImage: SPROCKET }} />
          <div style={{ position: "absolute", left: "-5%", top: "67.8%", width: "110%", height: "2.6%", backgroundImage: SPROCKET }} />
          <div style={{ position: "absolute", left: "5%", top: "35%", width: "30%", height: "30%", overflow: "hidden", background: "#222" }}>
            <Im k="h" imgs={imgs} pos="50% 20%" style={{ inset: 0, width: "100%", height: "100%" }} />
          </div>
          <L fs={8} s={{ left: "6%", top: "66%", color: "#FFCA26", letterSpacing: ".14em" }}>11</L>
          <div style={{ position: "absolute", left: "39%", top: "35%", width: "30%", height: "30%", overflow: "hidden", background: "#222" }}>
            <Im k="d" imgs={imgs} pos="50% 36%" style={{ inset: 0, width: "100%", height: "100%" }} />
          </div>
          <L fs={8} s={{ left: "40%", top: "66%", color: "#FFCA26", letterSpacing: ".14em" }}>12A</L>
          <div style={{ position: "absolute", left: "73%", top: "35%", width: "30%", height: "30%", overflow: "hidden", background: "#222" }}>
            <Im k="b" imgs={imgs} style={{ inset: 0, width: "100%", height: "100%" }} />
          </div>
          <L fs={8} s={{ left: "74%", top: "66%", color: "#FFCA26", letterSpacing: ".14em" }}>13</L>
          <svg {...SVG}>
            <path d="M 36 50 C 36 31 58 30 74 36 C 78 52 70 68 52 70 C 38 70 33 60 38 44" fill="none" stroke="#D52518" strokeWidth={u(4)} strokeLinecap="round" />
          </svg>
          <L fs={8} s={{ left: "8%", top: "22%", color: CREAM, opacity: 0.7 }}>RMZ 400 · Contact sheet</L>
        </>
      );
    case "reach":
      return (
        <>
          <div style={{ position: "absolute", inset: 0, background: "#1a1914" }} />
          <div style={{ position: "absolute", left: "14%", top: "20%", width: "58%", height: "30%", border: `4px solid ${CREAM}`, overflow: "hidden", boxShadow: "0 14px 28px rgba(0,0,0,.5)" }}>
            <Im k="e" imgs={imgs} style={{ inset: 0, width: "100%", height: "100%" }} />
          </div>
          <div style={{ position: "absolute", left: "24%", top: "50%", width: "1.6%", height: "11%", background: "#4a4842" }} />
          <div style={{ position: "absolute", left: "60%", top: "50%", width: "1.6%", height: "11%", background: "#4a4842" }} />
          {([[14, "g"], [32, "f"], [50, "i"], [68, "c"]] as [number, LensImageKey][]).map(([l, k]) => (
            <div key={k} style={{ position: "absolute", left: `${l}%`, top: "64%", width: "16%", height: "15%", border: `2px solid ${CREAM}`, overflow: "hidden" }}>
              <Im k={k} imgs={imgs} style={{ inset: 0, width: "100%", height: "100%" }} />
            </div>
          ))}
          <svg {...SVG}>
            <path d="M 20 82 C 36 80 46 70 56 58 C 66 46 74 36 86 28" fill="none" stroke="#FFCA26" strokeWidth={u(4)} strokeLinecap="round" />
            <circle cx="86" cy="28" r="1.6" fill="#FFCA26" />
          </svg>
          <L fs={9} pad s={{ left: "76%", top: "20%", ...YL }}>Reach</L>
          <L fs={8} s={{ left: "14%", top: "14.5%", color: CREAM, opacity: 0.7 }}>Placement</L>
        </>
      );
  }
}
