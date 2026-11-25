// TEMPORARY CALIBRATION ARTWORK for the Services lens. Not client work and not final art.
// Draws one "world" (1000 × 1000 units) with seven identifiable regions, then exports:
//   overview.webp            the whole world, coarse detail
//   service-1…7.webp         the window of the world around each service target at its zoom, with extra fine detail (so the hand-over is visible)
//   handoff-overview.webp    the overview with the seven target windows and numbers drawn on it (for the design handoff)
// Run (needs `sharp`, e.g. the copy that ships with Next):  NODE_PATH=<path to a node_modules containing sharp> node scripts/gen-services-world-assets.mjs
// The target/zoom numbers below MUST match src/components/lens-orbit/world/world-config.ts.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp"); // CommonJS lookup honours NODE_PATH

const OUT = "public/media/services-world";
mkdirSync(OUT, { recursive: true });
const W = 1000;
const S = [
  { n: "Branding", x: 0.5, y: 0.2, z: 4.0, c: "#F86015" },
  { n: "Creative Strategy", x: 0.76, y: 0.35, z: 4.4, c: "#FFCA26" },
  { n: "Content Production", x: 0.76, y: 0.65, z: 3.8, c: "#9ACC42" },
  { n: "Social Media", x: 0.5, y: 0.8, z: 4.2, c: "#D52518" },
  { n: "Design", x: 0.24, y: 0.65, z: 4.0, c: "#F3E8CC" },
  { n: "Paid Media", x: 0.24, y: 0.35, z: 4.6, c: "#6f8fb5" },
  { n: "Web Experiences", x: 0.5, y: 0.5, z: 3.6, c: "#b08ad0" },
];

const world = (detail, marks) => {
  let g = `<rect width="${W}" height="${W}" fill="#151412"/>`;
  g += `<defs><pattern id="gr" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#F3E8CC" stroke-opacity=".07" stroke-width="1"/></pattern><radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>`;
  g += `<rect width="${W}" height="${W}" fill="url(#gr)"/>`;
  for (let i = -10; i < 20; i++) g += `<path d="M${i * 90} 0L${i * 90 + 1000} 1000" stroke="#F3E8CC" stroke-opacity=".035" stroke-width="30"/>`;
  g += `<circle cx="500" cy="500" r="480" fill="none" stroke="#F3E8CC" stroke-opacity=".25" stroke-dasharray="4 10"/>`;
  g += `<text x="500" y="46" fill="#F3E8CC" fill-opacity=".55" font-family="Helvetica,Arial,sans-serif" font-size="15" letter-spacing="3" text-anchor="middle">TEMPORARY CALIBRATION ARTWORK · NOT CLIENT WORK</text>`;
  // faint links between the regions (the "shared world")
  g += `<polyline points="${S.map((s) => `${s.x * W},${s.y * W}`).join(" ")}" fill="none" stroke="#F3E8CC" stroke-opacity=".18" stroke-width="2" stroke-dasharray="2 8"/>`;
  S.forEach((s, i) => {
    const cx = s.x * W, cy = s.y * W;
    g += `<g transform="translate(${cx} ${cy})">`;
    g += `<circle r="112" fill="none" stroke="${s.c}" stroke-opacity=".5" stroke-dasharray="3 7"/>`;
    g += `<circle r="86" fill="${s.c}"/>`;
    g += `<circle r="86" fill="url(#vg)"/>`;
    g += `<text y="26" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="900" font-size="86" fill="#0F0F0E">${i + 1}</text>`;
    g += `<text y="130" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="15" letter-spacing="2.4" fill="#F3E8CC">${s.n.toUpperCase()}</text>`;
    g += `<path d="M-8 0H8M0 -8V8" stroke="#0F0F0E" stroke-width="2" transform="translate(0 -52)"/>`;
    if (detail) {
      for (let a = 0; a < 360; a += 5) g += `<line x1="0" y1="-92" x2="0" y2="${a % 15 === 0 ? -102 : -97}" stroke="${s.c}" stroke-width="1.2" transform="rotate(${a})"/>`;
      for (const r of [30, 46, 62]) g += `<circle r="${r}" fill="none" stroke="#0F0F0E" stroke-opacity=".3" stroke-width="1.5"/>`;
      for (let k = -4; k <= 4; k++) g += `<line x1="-80" y1="${k * 18 + 60}" x2="80" y2="${k * 18 + 60}" stroke="#0F0F0E" stroke-opacity=".18"/>`;
      g += `<text y="-110" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="11" letter-spacing="2" fill="${s.c}">DETAIL ${i + 1} · SERVICE IMAGE · ${s.z}×</text>`;
    }
    g += `</g>`;
  });
  if (marks) {
    S.forEach((s, i) => {
      const half = W / s.z / 2;
      const x = s.x * W, y = s.y * W;
      g += `<rect x="${x - half}" y="${y - half}" width="${half * 2}" height="${half * 2}" fill="none" stroke="#FFCA26" stroke-width="3" stroke-dasharray="14 8"/>`;
      g += `<circle cx="${x}" cy="${y}" r="7" fill="#FFCA26"/>`;
      g += `<text x="${x + 12}" y="${y - 12}" font-family="Helvetica,Arial,sans-serif" font-weight="900" font-size="30" fill="#FFCA26">${i + 1}</text>`;
    });
    g += `<circle cx="500" cy="500" r="500" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`;
    g += `<text x="500" y="986" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="16" fill="#fff" fill-opacity=".8">Yellow squares = the window each service image must match (target ± 1/zoom of the overview). White circle = what the lens shows at zoom 1.</text>`;
  }
  return g;
};
const svg = (inner, vb) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1000" height="1000">${inner}</svg>`);
const render = (inner, vb, px, file, q = 82) => sharp(svg(inner, vb), { density: 72 * (px / (vb.split(" ")[2] > 0 ? 1000 : 1000)) }).resize(px, px).webp({ quality: q }).toFile(`${OUT}/${file}`);

await render(world(false, false), `0 0 ${W} ${W}`, 2400, "overview.webp", 80);
await render(world(false, true), `0 0 ${W} ${W}`, 1600, "handoff-overview.webp", 84);
for (let i = 0; i < S.length; i++) {
  const s = S[i];
  const half = W / s.z / 2;
  await render(world(true, false), `${s.x * W - half} ${s.y * W - half} ${half * 2} ${half * 2}`, 1200, `service-${i + 1}.webp`, 82);
}
writeFileSync(`${OUT}/README.txt`, "TEMPORARY CALIBRATION ARTWORK for /lab/services-world. Generated by scripts/gen-services-world-assets.mjs. Not client work, not final art.\n");
console.log("done");
