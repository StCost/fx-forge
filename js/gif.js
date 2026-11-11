// Animated GIF89a encoder (own implementation): palette build, LZW, transparency, looping.
(function (G) {
  'use strict';
  function buildPalette(frames, bg) {
    const counts = new Map();
    for (const im of frames) {
      const d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        const c = px(d, i, bg);
        if (c < 0) continue;
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    const max = bg ? 256 : 255;
    let pal = [...counts.keys()];
    if (pal.length > max) {
      const buckets = new Map();
      for (const [c, n] of counts) {
        const k = ((c >> 19) & 31) << 10 | ((c >> 11) & 31) << 5 | ((c >> 3) & 31);
        const b = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
        b.n += n; b.r += ((c >> 16) & 255) * n; b.g += ((c >> 8) & 255) * n; b.b += (c & 255) * n;
        buckets.set(k, b);
      }
      pal = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, max)
        .map(b => (Math.round(b.r / b.n) << 16) | (Math.round(b.g / b.n) << 8) | Math.round(b.b / b.n));
    }
    return pal;
  }
  function px(d, i, bg) {
    let a = d[i + 3];
    if (!bg) { if (a < 128) return -1; return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; }
    a /= 255;
    const r = Math.round(d[i] * a + bg[0] * (1 - a)), g = Math.round(d[i + 1] * a + bg[1] * (1 - a)), b = Math.round(d[i + 2] * a + bg[2] * (1 - a));
    return (r << 16) | (g << 8) | b;
  }
  function lzw(idx, minCode, out) {
    const clear = 1 << minCode, eoi = clear + 1;
    let codeSize = minCode + 1, next = eoi + 1;
    let dict = new Map();
    let acc = 0, nbits = 0;
    const block = [];
    const flushByte = b => { block.push(b); if (block.length === 255) { out.push(255, ...block); block.length = 0; } };
    const emit = c => { acc |= c << nbits; nbits += codeSize; while (nbits >= 8) { flushByte(acc & 255); acc >>>= 8; nbits -= 8; } };
    emit(clear);
    let prefix = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = prefix * 256 + k;
      const v = dict.get(key);
      if (v !== undefined) { prefix = v; continue; }
      emit(prefix);
      if (next === 4096) { emit(clear); next = eoi + 1; codeSize = minCode + 1; dict = new Map(); }
      else { if (next >= (1 << codeSize)) codeSize++; dict.set(key, next++); }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (nbits > 0) flushByte(acc & 255);
    if (block.length) out.push(block.length, ...block);
    out.push(0);
  }
  function encode(frames, opts) {
    opts = opts || {};
    const scale = Math.max(1, opts.scale | 0 || 1);
    const bg = opts.background ? G.FXEngine.hexToRgb(opts.background) : null;
    const w0 = frames[0].width, h0 = frames[0].height, W = w0 * scale, H = h0 * scale;
    const pal = buildPalette(frames, bg);
    const off = bg ? 0 : 1;
    let bits = 1; while ((1 << bits) < pal.length + off) bits++;
    const lookup = new Map(); pal.forEach((c, i) => lookup.set(c, i + off));
    const palRgb = pal.map(c => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
    const near = c => {
      let v = lookup.get(c); if (v !== undefined) return v;
      const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; let best = 0, bd = Infinity;
      palRgb.forEach((p, i) => { const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = i; } });
      v = best + off; lookup.set(c, v); return v;
    };
    const out = [];
    const str = s => { for (const ch of s) out.push(ch.charCodeAt(0)); };
    const u16 = v => out.push(v & 255, (v >> 8) & 255);
    str('GIF89a'); u16(W); u16(H);
    out.push(0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0);
    for (let i = 0; i < (1 << bits); i++) {
      const p = i - off;
      if (p >= 0 && p < pal.length) out.push(palRgb[p][0], palRgb[p][1], palRgb[p][2]); else out.push(0, 0, 0);
    }
    if (opts.loop !== false) { out.push(0x21, 0xFF, 0x0B); str('NETSCAPE2.0'); out.push(3, 1, 0, 0, 0); }
    const delays = opts.delays || frames.map(() => opts.delay || 10);
    frames.forEach((im, fi) => {
      out.push(0x21, 0xF9, 4, (2 << 2) | (bg ? 0 : 1)); u16(delays[fi]); out.push(0, 0);
      out.push(0x2C); u16(0); u16(0); u16(W); u16(H); out.push(0);
      const idx = new Uint8Array(W * H), d = im.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = ((Math.floor(y / scale) * w0) + Math.floor(x / scale)) * 4;
        const c = px(d, i, bg);
        idx[y * W + x] = c < 0 ? 0 : near(c);
      }
      const minCode = Math.max(2, bits);
      out.push(minCode);
      lzw(idx, minCode, out);
    });
    out.push(0x3B);
    return new Uint8Array(out);
  }
  G.FXGif = { encode };
})(window);
