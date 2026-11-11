// FX Forge particle engine: deterministic, pixel-exact rendering.
(function (G) {
  'use strict';
  const DT = 1 / 120;

  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(a, b, c) {
    let h = 2166136261 ^ a;
    h = Math.imul(h ^ b, 16777619); h = Math.imul(h ^ c, 16777619);
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return h >>> 0;
  }

  // 2D value noise with smooth interpolation
  function makeNoise(seed) {
    const p = new Float32Array(512);
    const r = mulberry(seed ^ 0x9e3779b9);
    for (let i = 0; i < 512; i++) p[i] = r() * 2 - 1;
    const at = (x, y) => p[((x & 255) + ((y & 255) * 31)) & 511];
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }

  function hexToRgb(h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 1) + 1) % 1;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = ((t % 1) + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 0.5) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function hueShift(rgb, deg) {
    if (!deg) return rgb;
    const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    return hslToRgb(h + deg / 360, s, l);
  }

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

  function curve(kind, t) {
    switch (kind) {
      case 'fast': return 1 - Math.pow(1 - t, 3);
      case 'slow': return t * t * t;
      case 'pulse': return Math.sin(Math.PI * t);
      default: return t;
    }
  }

  function gradientAt(stops, t) {
    if (!stops.length) return [255, 255, 255];
    if (stops.length === 1) return stops[0];
    const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
    const a = stops[i], b = stops[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  // ---------- simulation ----------
  function spawnOffset(sp, r) {
    const w = sp.w || 0, h = sp.h || 0;
    switch (sp.area) {
      case 'disc': { const a = r() * Math.PI * 2, d = Math.sqrt(r()); return [Math.cos(a) * d * w / 2, Math.sin(a) * d * (h || w) / 2]; }
      case 'ring': { const a = r() * Math.PI * 2; return [Math.cos(a) * w / 2, Math.sin(a) * (h || w) / 2]; }
      case 'line': { const t = r() - 0.5, a = (sp.angle || 0) * Math.PI / 180; return [Math.cos(a) * t * w, Math.sin(a) * t * w]; }
      case 'box': return [(r() - 0.5) * w, (r() - 0.5) * (h || w)];
      default: return [0, 0];
    }
  }

  function simulateLayer(L, li, fx) {
    const D = fx.frames / fx.fps;
    const E = L.emission, M = L.motion, F = L.forces, P = L.particle, S = L.spawn;
    const times = [];
    const start = (E.start / 100) * D;
    for (let i = 0; i < Math.round(E.burst); i++) times.push(start);
    const emitDur = (E.emitFor / 100) * D;
    const count = Math.round(E.rate * emitDur);
    const tr = mulberry(hash(fx.seed, li, 0xabc));
    for (let i = 0; i < count; i++) times.push(start + ((i + tr()) / count) * emitDur);
    const cx = (S.x / 100) * fx.w, cy = (S.y / 100) * fx.h;
    const noise = makeNoise(hash(fx.seed, li, 77));
    const detail = Math.max(0.001, F.turbDetail / 400);
    const parts = [];
    const maxP = 1500;
    for (let i = 0; i < times.length && i < maxP; i++) {
      const r = mulberry(hash(fx.seed, li, i + 1));
      const life = Math.max(0.02, E.lifetime * (1 - (E.lifeVar / 100) * r()));
      const [ox, oy] = spawnOffset(S, r);
      let dir;
      const len = Math.hypot(ox, oy);
      if (M.outward && len > 0.001) dir = Math.atan2(oy, ox) + ((r() - 0.5) * M.spread * Math.PI / 180) * 0.25;
      else dir = (M.dir - 90 + (r() - 0.5) * M.spread) * Math.PI / 180;
      const spd = Math.max(0, M.speed * (1 + (r() * 2 - 1) * M.speedVar / 100));
      let x = cx + ox, y = cy + oy, vx = Math.cos(dir) * spd, vy = Math.sin(dir) * spd;
      const sizeMul = 1 + (r() * 2 - 1) * P.sizeVar / 100;
      const colorJit = r();
      const noff = r() * 100;
      const n = Math.ceil(life / DT) + 1;
      const tx = new Float32Array(n), ty = new Float32Array(n), tvx = new Float32Array(n), tvy = new Float32Array(n);
      const dragK = Math.exp(-M.drag * DT);
      for (let k = 0; k < n; k++) {
        tx[k] = x; ty[k] = y; tvx[k] = vx; tvy[k] = vy;
        let ax = M.wind, ay = M.gravity;
        if (F.turb) {
          const age = k * DT;
          ax += noise(x * detail + noff, y * detail + age * 0.8) * F.turb * 4;
          ay += noise(x * detail + 31.7 + noff, y * detail - age * 0.8) * F.turb * 4;
        }
        if (F.swirl || F.attract) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
          ax += (-dy / d) * F.swirl * 2 - (dx / d) * F.attract * 2;
          ay += (dx / d) * F.swirl * 2 - (dy / d) * F.attract * 2;
        }
        vx = (vx + ax * DT) * dragK; vy = (vy + ay * DT) * dragK;
        x += vx * DT; y += vy * DT;
      }
      parts.push({ t0: times[i], life, tx, ty, tvx, tvy, sizeMul, colorJit });
    }
    return parts;
  }

  // ---------- rasterisation ----------
  function inShape(shape, dx, dy, r) {
    switch (shape) {
      case 'square': return Math.abs(dx) <= r && Math.abs(dy) <= r;
      case 'diamond': return Math.abs(dx) + Math.abs(dy) <= r + 0.25;
      case 'plus': { const t = Math.max(0.5, r / 3); return (Math.abs(dx) <= t && Math.abs(dy) <= r) || (Math.abs(dy) <= t && Math.abs(dx) <= r); }
      case 'star': { const t = 0.5 + r * 0.1; return (Math.abs(dx) < t && Math.abs(dy) <= r) || (Math.abs(dy) < t && Math.abs(dx) <= r) || (Math.abs(dx) + Math.abs(dy) <= r * 0.45); }
      case 'ring': { const d = Math.hypot(dx, dy), w = Math.max(1, r * 0.3); return d <= r + 0.2 && d >= r - w; }
      case 'heart': { const x = dx / r * 1.25, y = -dy / r * 1.25 + 0.3; const a = x * x + y * y - 1; return a * a * a - x * x * y * y * y <= 0; }
      default: return dx * dx + dy * dy <= r * r + 0.3;
    }
  }

  function stamp(buf, W, H, x0, y0, rgb, a, blend, dither, test, bx0, by0, bx1, by1) {
    bx0 = Math.max(0, Math.floor(bx0)); by0 = Math.max(0, Math.floor(by0));
    bx1 = Math.min(W - 1, Math.ceil(bx1)); by1 = Math.min(H - 1, Math.ceil(by1));
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!test(x + 0.5 - x0, y + 0.5 - y0)) continue;
      let aa = a;
      if (dither) { aa = aa > bayer(x, y) ? 1 : 0; if (!aa) continue; }
      const o = (y * W + x) * 4;
      if (blend === 'glow') {
        buf[o] += rgb[0] * aa; buf[o + 1] += rgb[1] * aa; buf[o + 2] += rgb[2] * aa;
        buf[o + 3] = buf[o + 3] + aa * (1 - buf[o + 3]);
      } else {
        const k = 1 - aa;
        buf[o] = rgb[0] * aa + buf[o] * k; buf[o + 1] = rgb[1] * aa + buf[o + 1] * k; buf[o + 2] = rgb[2] * aa + buf[o + 2] * k;
        buf[o + 3] = aa + buf[o + 3] * k;
      }
    }
  }

  function drawParticle(buf, fx, L, p, age, stops) {
    const P = L.particle;
    const lt = age / p.life;
    const k = Math.min(p.tx.length - 1, Math.round(age / DT));
    const x = p.tx[k], y = p.ty[k], vx = p.tvx[k], vy = p.tvy[k];
    const size = Math.max(0, (P.startSize + (P.endSize - P.startSize) * curve(P.sizeCurve, lt)) * p.sizeMul);
    let a = P.opacity / 100;
    if (P.fadeIn > 0 && lt < P.fadeIn / 100) a *= lt / (P.fadeIn / 100);
    if (P.fadeOut > 0 && lt > 1 - P.fadeOut / 100) a *= (1 - lt) / (P.fadeOut / 100);
    if (a <= 0.01 || size <= 0.05) return;
    let ct = P.colorMode === 'random' ? p.colorJit : lt;
    if (P.colorVar && P.colorMode !== 'random') ct = Math.max(0, Math.min(1, lt + (p.colorJit - 0.5) * P.colorVar / 100));
    let rgb = gradientAt(stops, ct);
    if (L.hue) rgb = hueShift(rgb, L.hue);
    const W = fx.w, H = fx.h, dither = fx.dither;
    if (P.shape === 'streak') {
      const sp = Math.hypot(vx, vy);
      const len = Math.max(1, P.streak * sp / 60);
      const ux = sp > 0.001 ? vx / sp : 0, uy = sp > 0.001 ? vy / sp : 1;
      const x1 = x - ux * len, y1 = y - uy * len, r = Math.max(0.5, size / 2);
      const test = (dx, dy) => {
        const qx = dx + x, qy = dy + y;
        const ex = x - x1, ey = y - y1, l2 = ex * ex + ey * ey || 1;
        let t = ((qx - x1) * ex + (qy - y1) * ey) / l2; t = Math.max(0, Math.min(1, t));
        const px = x1 + ex * t - qx, py = y1 + ey * t - qy;
        return px * px + py * py <= r * r;
      };
      stamp(buf, W, H, x, y, rgb, a, P.blend, dither, test, Math.min(x, x1) - r - 1, Math.min(y, y1) - r - 1, Math.max(x, x1) + r + 1, Math.max(y, y1) + r + 1);
      return;
    }
    if (P.shape === 'pixel' || size < 1.25) {
      const px = Math.floor(x), py = Math.floor(y);
      const s = P.shape === 'pixel' ? Math.max(1, Math.round(size)) : 1;
      const h = Math.floor((s - 1) / 2);
      stamp(buf, W, H, 0, 0, rgb, a, P.blend, dither, () => true, px - h, py - h, px - h + s - 1, py - h + s - 1);
      return;
    }
    const r = size / 2, shape = P.shape;
    stamp(buf, W, H, x, y, rgb, a, P.blend, dither, (dx, dy) => inShape(shape, dx, dy, r), x - r - 1, y - r - 1, x + r + 1, y + r + 1);
  }

  function nearest(pal, r, g, b) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) {
      const c = pal[i];
      const dr = r - c[0], dg = g - c[1], db = b - c[2];
      const d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (d < bd) { bd = d; best = i; }
    }
    return pal[best];
  }

  class Renderer {
    constructor(fx) { this.fx = fx; this.sims = null; }
    prepare() {
      const fx = this.fx;
      this.sims = fx.layers.map((L, i) => L.visible === false ? null : simulateLayer(L, i, fx));
      this.cache = new Map();
    }
    frame(f) {
      if (!this.sims) this.prepare();
      if (this.cache.has(f)) return this.cache.get(f);
      const fx = this.fx, W = fx.w, H = fx.h;
      const D = fx.frames / fx.fps;
      const t = (f / fx.frames) * D;
      const buf = new Float32Array(W * H * 4);
      // layers listed top-first: draw from last to first
      for (let li = fx.layers.length - 1; li >= 0; li--) {
        const L = fx.layers[li], parts = this.sims[li];
        if (!parts) continue;
        const stops = (L.particle.colors || ['#ffffff']).map(hexToRgb);
        for (const p of parts) {
          if (fx.loop) {
            let a = t - p.t0;
            while (a < 0) a += D;
            for (; a < p.life; a += D) drawParticle(buf, fx, L, p, a, stops);
          } else {
            const a = t - p.t0;
            if (a >= 0 && a < p.life) drawParticle(buf, fx, L, p, a, stops);
          }
        }
      }
      const out = new Uint8ClampedArray(W * H * 4);
      const pal = fx.palette && fx.palette.length ? fx.palette.map(hexToRgb) : null;
      const thr = fx.alphaCut / 100;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        let A = buf[o + 3];
        if (A <= 0.0001) continue;
        let rgb = [buf[o] / A, buf[o + 1] / A, buf[o + 2] / A];
        if (fx.hue) rgb = hueShift(rgb, fx.hue);
        if (fx.hardAlpha) {
          const cut = fx.dither ? Math.max(thr * 0.5, bayer(x + 1, y + 2) * thr * 2) : thr;
          A = A >= Math.min(0.999, cut) ? 1 : 0;
          if (!A) continue;
        }
        if (pal) rgb = nearest(pal, rgb[0], rgb[1], rgb[2]);
        out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = Math.round(Math.min(1, A) * 255);
      }
      if (fx.outline) {
        const oc = hexToRgb(fx.outlineColor);
        const src = out.slice();
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4;
          if (src[o + 3] > 0) continue;
          const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && src[(yy * W + xx) * 4 + 3] > 127;
          if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1) || (fx.outline === 2 && (n(x - 1, y - 1) || n(x + 1, y - 1) || n(x - 1, y + 1) || n(x + 1, y + 1)))) {
            out[o] = oc[0]; out[o + 1] = oc[1]; out[o + 2] = oc[2]; out[o + 3] = 255;
          }
        }
      }
      const img = new ImageData(out, W, H);
      this.cache.set(f, img);
      return img;
    }
    all() { const a = []; for (let f = 0; f < this.fx.frames; f++) a.push(this.frame(f)); return a; }
  }

  G.FXEngine = { Renderer, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hueShift, mulberry, hash };
})(window);
