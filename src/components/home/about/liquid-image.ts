/**
 * LiquidImageFx — a subtle "liquid" displacement of the photograph inside the About cards.
 *
 * - ONE WebGL context for the whole section. Its <canvas> is moved into the `.fw-img` of the card image the pointer is over; because it lives
 *   inside the card, the card's own 3D transform / scale maps the pixels for free, and the pointer position comes from the browser's own
 *   hit-test (`offsetX/Y` relative to the <img>, which is transform-aware), so it stays correct while the card is rotated in 3D.
 * - Only while enabled (scroll at rest, desktop fine pointer, motion allowed) and only on faces that are showing their front.
 * - The canvas is only visible while the effect is alive. At rest the original <img> is shown, untouched and perfectly sharp.
 * - Pointer movement leaves a short trail of "blobs" (position + velocity + age). The fragment shader sums their localized, decaying
 *   displacement. Strength follows pointer speed, capped. No idle animation: the rAF loop runs only while blobs are alive.
 * - The canvas never takes pointer events; listeners are passive and on window, so scrolling, clicks, links and dragging are unaffected.
 * - Any failure (no WebGL, context lost, texture not ready) disables the effect and leaves the static image.
 */

const MAX_BLOBS = 14;
const LIFE = 1000; // ms a blob keeps influencing the image
const RADIUS = 0.18; // blob radius, in units of the image's shorter side
const MAX_STRENGTH = 0.03; // max uv displacement (≈ 3 % of the image) — restrained but clearly visible
const SPEED_FOR_MAX = 1.5; // image-widths per second that count as "fast"

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `precision mediump float;
varying vec2 v;
uniform sampler2D tex;
uniform vec2 scale;   // cover-fit: uv = (v - .5) * scale + off
uniform vec2 off;
uniform vec2 aspect;  // (w/h, 1) of the canvas so blobs are round
uniform vec4 blob[${MAX_BLOBS}]; // xy = position (0..1, y up), z = vx, w = vy (already scaled by strength * fade)
uniform float rad[${MAX_BLOBS}];
void main(){
  vec2 d = vec2(0.);
  for (int i = 0; i < ${MAX_BLOBS}; i++) {
    vec2 q = (v - blob[i].xy) * aspect;
    float w = exp(-dot(q, q) / (rad[i] * rad[i]));
    d += blob[i].zw * w;
  }
  // keep the border still: no exposed edges, no motion at the very rim
  vec2 e = smoothstep(0., .06, v) * smoothstep(0., .06, 1. - v);
  d *= e.x * e.y;
  vec2 u = vec2(v.x, 1. - v.y); // image space: y down (same orientation as the <img>), then cover-fit window
  vec2 uv = clamp((u - .5) * scale + off - vec2(d.x, -d.y) * scale, 0., 1.);
  gl_FragColor = vec4(texture2D(tex, uv).rgb, 1.);
}`;

type Blob = { x: number; y: number; vx: number; vy: number; t: number };

export class LiquidImageFx {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private prog: WebGLProgram | null = null;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private tex = new Map<HTMLImageElement, WebGLTexture>();
  private host: HTMLElement | null = null;
  private img: HTMLImageElement | null = null;
  private blobs: Blob[] = [];
  private raf = 0;
  private dead = false;
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private hasLast = false;
  private visible = false;
  private enabled = false;
  private px = 1; // device pixel ratio actually used
  private ro: ResizeObserver | null = null;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.className = "ab-liquid";
    this.canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.disable(); });
    window.addEventListener("pointermove", this.onMove, { passive: true });
  }

  /** Enabled = the page is at rest on a desktop with a fine pointer and motion allowed. Turning it off (or scrolling) resets everything. */
  setEnabled(on: boolean) {
    if (this.dead || on === this.enabled) return;
    this.enabled = on;
    if (!on) this.release();
  }

  private release() {
    this.reset();
    this.ro?.disconnect();
    this.host = null;
    this.img = null;
  }

  private attach(img: HTMLImageElement, host: HTMLElement) {
    this.reset();
    this.host = host;
    this.img = img;
    this.ro?.disconnect();
    this.ro = new ResizeObserver(() => this.size());
    this.ro.observe(host);
  }

  private onMove = (e: PointerEvent) => {
    if (this.dead || !this.enabled || e.pointerType === "touch" || e.buttons) { this.hasLast = false; return; }
    const t = e.target;
    // the browser's hit-test says which image is under the pointer (3D-correct); anything else (text, controls, other sections) is ignored
    // opt-in: only images whose parent carries data-liquid (the About scrubber's current image)
    const img = t instanceof HTMLImageElement && t.parentElement?.hasAttribute("data-liquid") ? t : null;
    const host = img?.parentElement;
    if (!img || !host || getComputedStyle(host).visibility === "hidden" || parseFloat(getComputedStyle(host).opacity) < 0.6) { this.hasLast = false; return; }
    if (img !== this.img) this.attach(img, host);
    const w = img.clientWidth, h = img.clientHeight;
    if (!w || !h) return;
    const now = performance.now();
    if (this.hasLast && now > this.lastT) {
      const dt = Math.max(8, now - this.lastT) / 1000;
      const vx = (e.clientX - this.lastX) / w / dt; // image-widths per second (screen motion over local width — fine for a restrained effect)
      const vy = (e.clientY - this.lastY) / w / dt;
      const sp = Math.hypot(vx, vy);
      if (sp > 0.02) {
        const k = Math.min(1, sp / SPEED_FOR_MAX);
        const mag = MAX_STRENGTH * k * (2 - k); // eases in, saturates: restrained maximum
        const n = sp || 1;
        this.blobs.push({ x: e.offsetX / w, y: 1 - e.offsetY / h, vx: (vx / n) * mag, vy: (-vy / n) * mag, t: now });
        if (this.blobs.length > MAX_BLOBS) this.blobs.shift();
        this.start();
      }
    }
    this.lastX = e.clientX; this.lastY = e.clientY; this.lastT = now; this.hasLast = true;
  };

  private start() {
    if (this.raf || this.dead) return;
    if (!this.ensure()) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.dead || !this.gl || !this.host || !this.img) return;
    this.blobs = this.blobs.filter((b) => now - b.t < LIFE);
    if (!this.blobs.length) { this.hide(); return; }
    if (!this.show()) return;
    this.draw(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private ensure(): boolean {
    if (this.gl) return true;
    try {
      const gl = this.canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
      if (!gl) throw new Error("no webgl");
      const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader"); return s; };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      for (const n of ["tex", "scale", "off", "aspect", "blob", "rad"]) this.loc[n] = gl.getUniformLocation(prog, n);
      this.gl = gl; this.prog = prog;
      return true;
    } catch {
      this.disable();
      return false;
    }
  }

  private texture(): WebGLTexture | null {
    const gl = this.gl, img = this.img;
    if (!gl || !img || !img.complete || !img.naturalWidth) return null; // not loaded yet: keep the static image
    let t = this.tex.get(img);
    if (!t) {
      t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); } catch { this.disable(); return null; }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.tex.set(img, t);
    }
    return t;
  }

  /** Canvas backing size = CSS size × DPR (capped), re-applied on resize. */
  private size() {
    if (!this.host) return;
    this.px = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.host.clientWidth * this.px));
    const h = Math.max(1, Math.round(this.host.clientHeight * this.px));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  private show(): boolean {
    if (!this.host || !this.img) return false;
    if (this.canvas.parentElement !== this.host) this.host.appendChild(this.canvas);
    this.size();
    if (!this.texture()) { this.hide(); return false; }
    if (!this.visible) { this.canvas.style.visibility = "visible"; this.visible = true; }
    return true;
  }

  private hide() {
    this.canvas.style.visibility = "hidden";
    this.visible = false;
  }

  private draw(now: number) {
    const gl = this.gl!, img = this.img!;
    const tex = this.texture();
    if (!tex) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.loc.tex, 0);
    // cover fit with the same object-position as the <img>, so the first displaced frame lines up with the static image
    const ca = this.canvas.width / this.canvas.height, ia = img.naturalWidth / img.naturalHeight;
    const pos = getComputedStyle(img).objectPosition.split(" ").map((s) => parseFloat(s) / 100);
    const px = Number.isFinite(pos[0]) ? pos[0] : 0.5, py = Number.isFinite(pos[1]) ? pos[1] : 0.5;
    const sx = ca > ia ? 1 : ca / ia, sy = ca > ia ? ia / ca : 1;
    gl.uniform2f(this.loc.scale, sx, sy);
    gl.uniform2f(this.loc.off, 0.5 + (px - 0.5) * (1 - sx), 0.5 + (py - 0.5) * (1 - sy));
    gl.uniform2f(this.loc.aspect, ca, 1);
    const blob = new Float32Array(MAX_BLOBS * 4), rad = new Float32Array(MAX_BLOBS).fill(1);
    this.blobs.forEach((b, i) => {
      const a = 1 - (now - b.t) / LIFE, f = a * a * (3 - 2 * a); // soft trailing fade
      blob.set([b.x, b.y, b.vx * f, b.vy * f], i * 4);
      rad[i] = RADIUS * (1.15 - 0.35 * a); // the ripple spreads very slightly as it fades
    });
    gl.uniform4fv(this.loc.blob, blob);
    gl.uniform1fv(this.loc.rad, rad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Back to the untouched <img>: no blobs, no loop, canvas hidden. */
  reset() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.blobs = [];
    this.hasLast = false;
    this.hide();
  }

  private disable() {
    this.dead = true;
    this.reset();
    this.canvas.remove();
  }

  destroy() {
    window.removeEventListener("pointermove", this.onMove);
    this.ro?.disconnect();
    this.reset();
    const gl = this.gl;
    if (gl) {
      this.tex.forEach((t) => gl.deleteTexture(t));
      if (this.prog) gl.deleteProgram(this.prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    this.tex.clear();
    this.canvas.remove();
    this.dead = true;
  }
}
