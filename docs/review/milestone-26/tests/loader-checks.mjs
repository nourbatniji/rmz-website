// usage: PW=/path/to/playwright CHROME=/usr/bin/google-chrome node loader-checks.mjs [scenario ...]
// Focused checks of the homepage loader on the ACTUAL homepage (production preview, port 3111): cold/cached, slow + failed hero media, handoff, repeat/internal/anchor/restored entry,
// desktop/mobile, reduced motion, JS-off, script-failure failsafe. Prints one JSON line per scenario; screenshots go to $SHOTS (default /tmp/shots).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright");
const BASE = process.env.BASE || "http://localhost:3111";
const SHOTS = process.env.SHOTS || "/tmp/shots";
const HERO_IMG = "**/media/hero/identity/frame-01.webp*";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Recorded inside every document before any page script runs.
const INIT = () => {
  window.__log = [];
  const T = () => Math.round(performance.now());
  const push = (k, v) => window.__log.push([T(), k, v]);
  const cover = () => document.getElementById("rmz-loader");
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (e.name === "first-paint") {
        const c = cover();
        const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        push("first-paint", { coverState: c && c.getAttribute("data-state"), coverOnTop: !!(c && top && (top === c || c.contains(top))), bg: c && getComputedStyle(c).backgroundColor });
      }
    }).observe({ type: "paint", buffered: true });
  } catch {}
  const mo = new MutationObserver((ms) => {
    for (const m of ms) {
      const t = m.target;
      if (t.id === "rmz-loader") push("cover", t.getAttribute("data-state") + "/hold" + t.getAttribute("data-hold"));
      else if (t.matches && t.matches("section.hw-root") && m.attributeName === "data-open") push("hero", t.getAttribute("data-open"));
      else if (t === document.documentElement && m.attributeName === "data-rmz-loading") push("lock", t.hasAttribute("data-rmz-loading"));
      else if (t.matches && t.matches(".rmz-loader__svg") && m.attributeName === "style") push("logo", t.style.visibility || "css");
    }
  });
  const go = () => mo.observe(document, { subtree: true, attributes: true, attributeFilter: ["data-state", "data-hold", "data-open", "data-rmz-loading", "style"] });
  go();
  let last = "";
  setInterval(() => {
    const b = document.querySelector('[role="group"][aria-label="Banners"] [aria-pressed="true"]');
    const s = b && b.textContent;
    if (s && s !== last) { if (last) push("banner", s); last = s; }
  }, 100);
};

const log = (page) => page.evaluate(() => window.__log || []).catch(() => []);
const has = (l, k, v) => l.find((e) => e[1] === k && (v === undefined || String(e[2]).startsWith(v)));
async function until(page, pred, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { const l = await log(page); if (pred(l)) return l; await sleep(50); }
  return log(page);
}
function watch(page, sink) {
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) sink.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => sink.push("pageerror: " + String(e).slice(0, 200)));
}
const t = (l, k, v) => { const e = has(l, k, v); return e ? e[0] : null; };
const count = (l, k, v) => l.filter((e) => e[1] === k && String(e[2]).startsWith(v)).length;
const summary = (l) => ({
  firstPaint: has(l, "first-paint")?.[2], logoShownAt: t(l, "logo", "visible"), coverExiting: t(l, "cover", "exiting"), coverOff: t(l, "cover", "off"),
  hero: l.filter((e) => e[1] === "hero").map((e) => `${e[2]}@${e[0]}`).join(" "), runningCount: count(l, "hero", "running"),
  lock: l.filter((e) => e[1] === "lock").map((e) => `${e[2]}@${e[0]}`).join(" "), banners: l.filter((e) => e[1] === "banner").map((e) => `${e[2]}@${e[0]}`).join(" "),
});
async function ctx(browser, o = {}) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...o });
  await c.addInitScript(INIT);
  return c;
}
const out = (name, o) => console.log(JSON.stringify({ scenario: name, ...o }));

const SCENARIOS = {
  async cold(b) { // fresh visitor, desktop: cover at first paint, logo → resolved → exit, handoff to the hero opening exactly once, countdown only after
    const c = await ctx(b); const p = await c.newPage(); const errs = []; watch(p, errs);
    const t0 = Date.now(); await p.goto(BASE + "/", { waitUntil: "commit" });
    await sleep(1200); await p.screenshot({ path: `${SHOTS}/cold-1-logo.png` });
    await sleep(2900 - (Date.now() - t0) + 1200 > 0 ? 2900 - (Date.now() - t0) + 1200 : 0); await p.screenshot({ path: `${SHOTS}/cold-2-resolved.png` });
    let l = await until(p, (x) => has(x, "cover", "exiting"));
    await sleep(200); await p.screenshot({ path: `${SHOTS}/cold-3-fade.png` });
    l = await until(p, (x) => has(x, "cover", "off"));
    const heroAtOff = await p.evaluate(() => { const s = document.querySelector("section.hw-root"); const w = s.querySelector(".hw-phrase[data-state=active] .hw-line.t-italic"); const d = s.querySelector(".hw-phrase[data-state=active] .hw-line.t-display > span"); return { open: s.dataset.open, wordTransform: getComputedStyle(w).transform, headlineTransform: getComputedStyle(d).transform, lock: document.documentElement.hasAttribute("data-rmz-loading") }; });
    await sleep(150); await p.screenshot({ path: `${SHOTS}/cold-4-armed.png` });
    l = await until(p, (x) => has(x, "hero", "done") && t(x, "hero", "done") > (t(x, "cover", "off") ?? 1e9));
    await sleep(300); await p.screenshot({ path: `${SHOTS}/cold-5-done.png` });
    l = await until(p, (x) => has(x, "banner"), 7000);
    const s = summary(l);
    const post = await p.evaluate(() => ({ lock: document.documentElement.hasAttribute("data-rmz-loading"), session: sessionStorage.getItem("rmz-loader-v1"), seen: !!localStorage.getItem("rmz-loader-seen-v1"), status: document.querySelector('[role=status]')?.textContent, active: document.activeElement?.tagName, scrollY: scrollY }));
    out("cold", { ...s, heroAtOff, post, loaderMs: s.coverOff, openingStartsAfterOff: t(l, "hero", "running") - s.coverOff, firstBannerTurnAfterDone: s.banners ? (t(l, "banner") ?? 0) - t(l, "hero", "done") : null, errs });
    await c.close();
  },
  async video(b) { // cold visit recorded (for a frame-by-frame look: no white flash, no hero before the logo, hero only after the cover)
    const c = await ctx(b, { recordVideo: { dir: `${SHOTS}/video`, size: { width: 720, height: 450 } } }); const p = await c.newPage();
    await p.goto(BASE + "/", { waitUntil: "commit" }); const l = await until(p, (x) => has(x, "hero", "done") && has(x, "cover", "off"), 20000); await sleep(800);
    const v = p.video(); await c.close(); out("video", { path: await v.path(), ...summary(l) });
  },
  async cached(b) { // returning visitor in a NEW tab with warm cache: no loader at all, hero opening still plays once
    const c = await ctx(b); const p0 = await c.newPage(); await p0.goto(BASE + "/", { waitUntil: "load" }); await until(p0, (x) => has(x, "hero", "done") && has(x, "cover", "off"), 15000); await p0.close();
    const p = await c.newPage(); const errs = []; watch(p, errs); await p.goto(BASE + "/", { waitUntil: "commit" });
    const l = await until(p, (x) => has(x, "hero", "done"), 10000);
    const logoEverShown = (await p.evaluate(() => window.__log.some((e) => e[1] === "logo" && e[2] === "visible")));
    const s = summary(l); out("cached", { ...s, logoEverShown, coverOffMs: s.coverOff, errs }); await c.close();
  },
  async slowHero(b) { // hero image arrives 5.5 s late: logo resolves, holds with the indicator, then exits when the image is decoded
    const c = await ctx(b); await c.route(HERO_IMG, async (r) => { await sleep(5500); r.continue(); });
    const p = await c.newPage(); const errs = []; watch(p, errs); await p.goto(BASE + "/", { waitUntil: "commit" });
    await sleep(5000); const hold = await p.evaluate(() => { const c = document.getElementById("rmz-loader"); return { state: c.dataset.state, hold: c.dataset.hold, indicatorOpacity: getComputedStyle(c.querySelector(".rmz-loader__activity")).opacity, lock: document.documentElement.hasAttribute("data-rmz-loading") }; });
    await p.screenshot({ path: `${SHOTS}/slow-hold.png` });
    const l = await until(p, (x) => has(x, "hero", "done") && has(x, "cover", "off"), 20000); out("slowHero", { hold, ...summary(l), errs }); await c.close();
  },
  async timeout(b) { // hero image never arrives: bounded timeout → static hero (no opening), page usable, nothing locked
    const c = await ctx(b); await c.route(HERO_IMG, async () => { await sleep(30000).catch(() => {}); });
    const p = await c.newPage(); const errs = []; watch(p, errs); await p.goto(BASE + "/", { waitUntil: "commit" });
    const l = await until(p, (x) => has(x, "cover", "off"), 15000); await sleep(400); await p.screenshot({ path: `${SHOTS}/timeout-static.png` });
    const st = await p.evaluate(() => ({ open: document.querySelector("section.hw-root").dataset.open, lock: document.documentElement.hasAttribute("data-rmz-loading"), h1: document.querySelector("h1")?.innerText.replace(/\n/g, " ") })); await p.evaluate(() => scrollTo(0, 600)); await sleep(200);
    out("timeout", { ...summary(l), state: st, scrolledTo: await p.evaluate(() => scrollY), errs }); await c.close();
  },
  async failedMedia(b) { // hero media 404/abort: loader must not hang; hero shows its existing placeholder/poster behaviour
    const c = await ctx(b); await c.route("**/media/hero/**", (r) => r.abort()); await c.route("**/media/dev/hero/**", (r) => r.abort());
    const p = await c.newPage(); const errs = []; watch(p, errs); await p.goto(BASE + "/", { waitUntil: "commit" });
    const l = await until(p, (x) => has(x, "cover", "off") && has(x, "hero", "done"), 15000); await sleep(300); await p.screenshot({ path: `${SHOTS}/failed-media.png` });
    out("failedMedia", { ...summary(l), errs: errs.filter((e) => !/ERR_FAILED|Failed to load resource/.test(e)), resourceErrors: errs.length - errs.filter((e) => !/ERR_FAILED|Failed to load resource/.test(e)).length }); await c.close();
  },
  async throttled(b) { // real network throttling (≈ fast 3G) on a cold visit: usable within the bound
    const c = await ctx(b); const p = await c.newPage(); const errs = []; watch(p, errs); const cdp = await c.newCDPSession(p);
    await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await p.goto(BASE + "/", { waitUntil: "commit" });
    const l = await until(p, (x) => has(x, "cover", "off") && has(x, "hero", "done"), 30000);
    out("throttled", { ...summary(l), errs }); await c.close();
  },
  async entries(b) { // anchor, reload, back/forward, restored scroll, internal navigation, interaction
    const res = {};
    { const c = await ctx(b); const p = await c.newPage(); await p.goto(BASE + "/#work", { waitUntil: "commit" }); await sleep(900); const l = await log(p); res.anchor = { coverOff: t(l, "cover", "off"), logoShown: !!has(l, "logo", "visible"), running: count(l, "hero", "running") }; await c.close(); }
    { const c = await ctx(b); const p = await c.newPage(); await p.goto(BASE + "/", { waitUntil: "commit" }); await until(p, (x) => has(x, "hero", "done") && has(x, "cover", "off"), 15000);
      await p.evaluate(() => scrollTo(0, 1500)); await sleep(300); const y1 = await p.evaluate(() => scrollY);
      await p.reload({ waitUntil: "commit" }); await sleep(1000); let l = await log(p); res.reloadWithScroll = { yBefore: y1, yAfter: await p.evaluate(() => scrollY), coverOff: t(l, "cover", "off"), logoShown: !!has(l, "logo", "visible"), running: count(l, "hero", "running"), lock: await p.evaluate(() => document.documentElement.hasAttribute("data-rmz-loading")) };
      await p.goto(BASE + "/work", { waitUntil: "load" }); await p.goBack({ waitUntil: "commit" }); await sleep(1000); l = await log(p); res.backForward = { coverOff: t(l, "cover", "off"), logoShown: !!has(l, "logo", "visible"), running: count(l, "hero", "running"), yAfter: await p.evaluate(() => scrollY) }; await c.close(); }
    { const c = await ctx(b); const p = await c.newPage(); await p.goto(BASE + "/work", { waitUntil: "load" }); await p.evaluate(() => (document.querySelector('a[href="/"]') || {}).click?.()); await sleep(1500);
      const info = await p.evaluate(() => ({ path: location.pathname, cover: document.getElementById("rmz-loader")?.dataset.state, lock: document.documentElement.hasAttribute("data-rmz-loading") })); const l = await log(p); res.internalClientNav = { ...info, logoShown: !!has(l, "logo", "visible") }; await c.close(); }
    { const c = await ctx(b); const p = await c.newPage(); await p.goto(BASE + "/work", { waitUntil: "load" }); await p.goto(BASE + "/", { waitUntil: "commit", referer: BASE + "/work" }); await sleep(900); const l = await log(p); res.internalReferrer = { coverOff: t(l, "cover", "off"), logoShown: !!has(l, "logo", "visible") }; await c.close(); }
    { const c = await ctx(b); const p = await c.newPage(); await p.goto(BASE + "/", { waitUntil: "commit" }); await sleep(1500); await p.focus("body").catch(() => {}); const before = await p.evaluate(() => document.activeElement?.tagName); await p.keyboard.press("Tab"); await sleep(200);
      const l = await until(p, (x) => has(x, "cover", "off"), 3000); const after = await p.evaluate(() => ({ active: document.activeElement?.tagName + ":" + (document.activeElement?.textContent || "").slice(0, 20), lock: document.documentElement.hasAttribute("data-rmz-loading") }));
      res.interactionSkip = { coverOffMs: t(l, "cover", "off"), before, after, hero: summary(l).hero }; await c.close(); }
    out("entries", res);
  },
  async mobile(b) { // 390 × 844 touch device
    const c = await ctx(b, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); const p = await c.newPage(); const errs = []; watch(p, errs);
    await p.goto(BASE + "/", { waitUntil: "commit" }); await sleep(2000); await p.screenshot({ path: `${SHOTS}/mobile-1-logo.png` });
    const geo = await p.evaluate(() => { const r = document.querySelector(".rmz-loader__svg").getBoundingClientRect(); return { svgW: Math.round(r.width), vw: innerWidth, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    await until(p, (x) => has(x, "cover", "off"), 15000); await sleep(1200); await p.screenshot({ path: `${SHOTS}/mobile-2-opening.png` });
    const l = await until(p, (x) => has(x, "hero", "done") && t(x, "hero", "done") > (t(x, "cover", "off") ?? 1e9), 15000);
    await p.evaluate(() => scrollTo(0, 500)); await sleep(200);
    out("mobile", { geo, ...summary(l), scrolledTo: await p.evaluate(() => scrollY), lock: await p.evaluate(() => document.documentElement.hasAttribute("data-rmz-loading")), errs }); await c.close();
  },
  async reduced(b) { // prefers-reduced-motion: static correct logo, no animated entrances, normal hero
    const c = await ctx(b, { reducedMotion: "reduce" }); const p = await c.newPage(); const errs = []; watch(p, errs);
    await p.goto(BASE + "/", { waitUntil: "commit" }); await sleep(450); await p.screenshot({ path: `${SHOTS}/reduced-1-static.png` });
    const l = await until(p, (x) => has(x, "cover", "off"), 10000); await sleep(300); await p.screenshot({ path: `${SHOTS}/reduced-2-hero.png` });
    const hero = await p.evaluate(() => ({ open: document.querySelector("section.hw-root").dataset.open, introRise: getComputedStyle(document.querySelector(".hw-rise")).opacity })); out("reduced", { ...summary(l), hero, errs }); await c.close();
  },
  async noJs(b) { // JavaScript off: no cover, normal static page
    const c = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); const p = await c.newPage(); await p.goto(BASE + "/", { waitUntil: "load" }); await sleep(500); await p.screenshot({ path: `${SHOTS}/nojs.png` });
    out("noJs", { coverVisible: await p.locator("#rmz-loader").isVisible(), h1Visible: await p.locator("h1").first().isVisible(), ctaVisible: await p.locator('a[href="#work"]').first().isVisible() }); await c.close();
  },
  async scriptFailure(b) { // JS enabled but the bundles never load: the CSS-only failsafe must uncover the page
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); await c.route("**/_next/static/**/*.js", (r) => r.abort()); const p = await c.newPage(); await p.goto(BASE + "/", { waitUntil: "commit" });
    const vis = async () => p.locator("#rmz-loader").isVisible(); const early = await (await sleep(3000), vis()); await sleep(10000); const late = await vis();
    out("scriptFailure", { coverVisibleAt3s: early, coverVisibleAt13s: late }); await c.close();
  },
  async lab(b) { // the review route still works with the shared implementation
    const c = await b.newContext({ viewport: { width: 1200, height: 800 } }); const p = await c.newPage(); const errs = []; watch(p, errs); await p.goto(BASE + "/lab/logo-animation", { waitUntil: "load" }); await sleep(1500);
    const info = await p.evaluate(() => ({ replay: !![...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Replay"), scrubber: !!document.querySelector('input[type=range]'), svgVisible: getComputedStyle(document.querySelector("svg")).visibility, cover: !!document.getElementById("rmz-loader") }));
    out("lab", { ...info, errs }); await c.close();
  },
};

const want = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
for (const [name, fn] of Object.entries(SCENARIOS)) {
  if (want.length && !want.includes(name)) continue;
  try { await fn(browser); } catch (e) { out(name, { FAILED: String(e).slice(0, 300) }); }
}
await browser.close();
