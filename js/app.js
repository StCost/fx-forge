// FX Forge UI
(function () {
  'use strict';
  const E = window.FXEngine, PAL = window.FXPalettes, PR = window.FXPresets;
  const $ = s => document.querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LS_LIB = 'fxforge.library', LS_CUR = 'fxforge.current', LS_TOUR = 'fxforge.tourDone';

  let fx, renderer, frame = 0, playing = true, selLayer = 0, history = [], future = [], dirtyT = 0;
  let selPreset = null, libTab = 'presets', setTab = 'layer', category = 'All';
  let bg = 'checker', zoom = 0, onion = false;

  // ---------- model ----------
  function normalize(o) {
    const d = PR.newEffect();
    const f = Object.assign(d, o || {});
    f.w = clamp(Math.round(f.w), 16, 256); f.h = clamp(Math.round(f.h), 16, 256);
    f.frames = clamp(Math.round(f.frames), 2, 64); f.fps = clamp(Math.round(f.fps), 4, 30);
    if (f.paletteName && f.paletteName !== 'Custom' && PAL[f.paletteName]) f.palette = PAL[f.paletteName].slice();
    if (!Array.isArray(f.layers)) f.layers = [];
    f.layers = f.layers.map(l => {
      const b = PR.newLayer();
      for (const k of ['emission', 'spawn', 'motion', 'forces', 'particle']) b[k] = Object.assign(b[k], l[k] || {});
      b.name = l.name || 'Layer'; b.visible = l.visible !== false; b.hue = l.hue || 0;
      return b;
    });
    return f;
  }
  function setFx(o, keepHistory) {
    fx = normalize(clone(o));
    if (!keepHistory) { history = []; future = []; }
    selLayer = clamp(selLayer, 0, Math.max(0, fx.layers.length - 1));
    frame = 0; rebuild(); buildAll();
  }
  function snapshot() { return JSON.stringify(fx); }
  function commit() {
    history.push(lastSnap); if (history.length > 200) history.shift();
    future = []; lastSnap = snapshot(); updateUndo(); autosave();
  }
  let lastSnap = '';
  function undo() { if (!history.length) return; future.push(snapshot()); fx = JSON.parse(history.pop()); lastSnap = snapshot(); afterHistory(); }
  function redo() { if (!future.length) return; history.push(snapshot()); fx = JSON.parse(future.pop()); lastSnap = snapshot(); afterHistory(); }
  function afterHistory() { selLayer = clamp(selLayer, 0, Math.max(0, fx.layers.length - 1)); rebuild(); buildAll(); updateUndo(); autosave(); }
  function updateUndo() { $('#undo').disabled = !history.length; $('#redo').disabled = !future.length; }
  function autosave() { try { localStorage.setItem(LS_CUR, snapshot()); } catch (e) { } }
  function change(structural) { // call after mutation that should be undoable
    rebuild(); if (structural) buildAll(); else { buildLayers(); updateInfo(); }
    commit();
  }

  // ---------- render ----------
  const off = document.createElement('canvas'), offc = off.getContext('2d');
  function rebuild() {
    renderer = new E.Renderer(fx);
    renderer.prepare();
    if (frame >= fx.frames) frame = 0;
    draw();
    clearTimeout(dirtyT); dirtyT = setTimeout(buildStrip, 180);
  }
  let pending = false;
  function liveRebuild() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; rebuild(); }); }

  function bgFill(ctx, w, h, s) {
    if (bg === 'checker') {
      const c = Math.max(4, s * 4);
      for (let y = 0; y < h; y += c) for (let x = 0; x < w; x += c) { ctx.fillStyle = ((x / c + y / c) & 1) ? '#24242b' : '#1c1c22'; ctx.fillRect(x, y, c, c); }
    } else { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  }
  function draw() {
    const view = $('#view'), stage = $('#stage');
    const W = fx.w, H = fx.h;
    const mg = stage.clientWidth < 600 || stage.clientHeight < 400 ? 12 : 40;
    let s = zoom || Math.max(1, Math.floor(Math.min((stage.clientWidth - mg) / W, (stage.clientHeight - mg) / H)));
    view.width = W * s; view.height = H * s;
    const ctx = view.getContext('2d'); ctx.imageSmoothingEnabled = false;
    bgFill(ctx, view.width, view.height, s);
    off.width = W; off.height = H;
    const put = (f, alpha) => { offc.putImageData(renderer.frame(f), 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(off, 0, 0, W * s, H * s); ctx.globalAlpha = 1; };
    if (onion && !playing) { put((frame - 1 + fx.frames) % fx.frames, 0.25); }
    put(frame, 1);
    for (const [id, k] of [['#mini1', 1], ['#mini2', 2]]) {
      const c = $(id); c.width = W * k; c.height = H * k; const m = c.getContext('2d'); m.imageSmoothingEnabled = false; m.drawImage(off, 0, 0, W * k, H * k);
    }
    $('#fcount').textContent = (frame + 1) + ' / ' + fx.frames;
    document.querySelectorAll('#strip canvas').forEach((c, i) => c.classList.toggle('on', i === frame));
  }
  function buildStrip() {
    const st = $('#strip'); st.innerHTML = '';
    for (let f = 0; f < fx.frames; f++) {
      const c = document.createElement('canvas'); c.width = fx.w; c.height = fx.h;
      c.getContext('2d').putImageData(renderer.frame(f), 0, 0);
      c.title = 'Frame ' + (f + 1); c.onclick = () => { frame = f; setPlaying(false); draw(); };
      if (f === frame) c.classList.add('on');
      st.appendChild(c);
    }
  }
  let lastT = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    if (!playing || !fx) return;
    if (t - lastT >= 1000 / fx.fps) { lastT = t; frame = (frame + 1) % fx.frames; draw(); }
  }
  function setPlaying(p) { playing = p; $('#play').textContent = p ? '❚❚' : '▶'; draw(); }

  // ---------- left panel ----------
  function buildChips() {
    const ch = $('#chips'); ch.innerHTML = '';
    for (const c of ['All', ...PR.CATEGORIES]) {
      const b = document.createElement('button'); b.textContent = c; if (c === category) b.className = 'on';
      b.onclick = () => { category = c; buildChips(); buildCards(); }; ch.appendChild(b);
    }
    ch.style.display = libTab === 'presets' ? '' : 'none';
  }
  const thumbQ = [];
  function thumb(canvas, effect) {
    thumbQ.push([canvas, effect]);
    if (thumbQ.length === 1) setTimeout(drainThumbs, 0);
  }
  function drainThumbs() {
    const t0 = performance.now();
    while (thumbQ.length && performance.now() - t0 < 30) {
      const [c, e] = thumbQ.shift();
      if (!c.isConnected) continue;
      const f = normalize(clone(e)); const r = new E.Renderer(f); r.prepare();
      c.width = f.w; c.height = f.h; c._r = r; c._f = f;
      c.getContext('2d').putImageData(r.frame(Math.floor(f.frames * 0.4)), 0, 0);
      if (c.parentNode && c.parentNode.classList.contains('sel')) animateCard(c, true);
    }
    if (thumbQ.length) setTimeout(drainThumbs, 0);
  }
  function animateCard(c, on) {
    clearInterval(c._iv);
    if (!c._r) return;
    const ctx = c.getContext('2d');
    if (!on) { ctx.clearRect(0, 0, c.width, c.height); ctx.putImageData(c._r.frame(Math.floor(c._f.frames * 0.4)), 0, 0); return; }
    let i = 0; c._iv = setInterval(() => { ctx.clearRect(0, 0, c.width, c.height); ctx.putImageData(c._r.frame(i), 0, 0); i = (i + 1) % c._f.frames; }, 1000 / c._f.fps);
  }
  function libLoad() { try { return JSON.parse(localStorage.getItem(LS_LIB) || '[]'); } catch (e) { return []; } }
  function libSave(l) { try { localStorage.setItem(LS_LIB, JSON.stringify(l)); return true; } catch (e) { toast('Could not save: browser storage is full'); return false; } }
  function buildCards() {
    const box = $('#cards'); box.innerHTML = '';
    const q = $('#search').value.trim().toLowerCase();
    let items;
    if (libTab === 'presets') items = PR.list.map((p, i) => ({ e: p, key: 'p' + i })).filter(x => (category === 'All' || x.e.category === category));
    else items = libLoad().map((p, i) => ({ e: p, key: 'l' + i, idx: i }));
    items = items.filter(x => !q || x.e.name.toLowerCase().includes(q) || (x.e.category || '').toLowerCase().includes(q));
    if (!items.length) { box.innerHTML = '<div class="empty">' + (libTab === 'library' ? 'Nothing saved yet. Use File → Save to library (Ctrl+S).' : 'No effects match.') + '</div>'; return; }
    for (const it of items) {
      const d = document.createElement('div'); d.className = 'card' + (selPreset === it.key ? ' sel' : '');
      const c = document.createElement('canvas'); const s = document.createElement('span'); s.textContent = it.e.name;
      d.append(c, s);
      if (it.idx !== undefined) {
        const del = document.createElement('button'); del.className = 'del sm'; del.textContent = '✕'; del.title = 'Delete from library';
        del.onclick = ev => { ev.stopPropagation(); if (!confirm('Delete "' + it.e.name + '" from your library?')) return; const l = libLoad(); l.splice(it.idx, 1); libSave(l); buildCards(); };
        d.appendChild(del);
      }
      d.onclick = () => { selPreset = it.key; setFx(it.e); lastSnap = snapshot(); autosave(); buildCards(); toast('Loaded ' + it.e.name); };
      d.onmouseenter = () => animateCard(c, true); d.onmouseleave = () => { if (!d.classList.contains('sel')) animateCard(c, false); };
      box.appendChild(d); thumb(c, it.e);
    }
  }

  // ---------- layers ----------
  function buildLayers() {
    const box = $('#layers'); box.innerHTML = '';
    fx.layers.forEach((L, i) => {
      const d = document.createElement('div'); d.className = 'layer' + (i === selLayer ? ' sel' : '') + (L.visible ? '' : ' off');
      const eye = document.createElement('button'); eye.className = 'eye'; eye.textContent = L.visible ? '👁' : '◌'; eye.title = 'Show / hide (H)';
      eye.onclick = ev => { ev.stopPropagation(); L.visible = !L.visible; change(false); };
      const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = 'linear-gradient(90deg,' + L.particle.colors.join(',') + ')';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = L.name; nm.title = 'Double-click to rename';
      nm.ondblclick = () => {
        const inp = document.createElement('input'); inp.value = L.name; nm.replaceWith(inp); inp.focus(); inp.select();
        const done = () => { L.name = inp.value.trim() || L.name; change(false); };
        inp.onblur = done; inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = L.name; inp.blur(); } };
      };
      const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = (L.emission.burst + Math.round(L.emission.rate * L.emission.emitFor / 100 * fx.frames / fx.fps)) + '×';
      const ren = document.createElement('button'); ren.className = 'ren'; ren.textContent = '✎'; ren.title = 'Rename';
      ren.onclick = ev => { ev.stopPropagation(); nm.ondblclick(); };
      d.append(eye, sw, nm, ct, ren);
      d.onclick = () => { if (selLayer !== i) { selLayer = i; buildLayers(); buildSettings(); } };
      box.appendChild(d);
    });
    const ml = $('#mlayers'); ml.innerHTML = '';
    fx.layers.forEach((L, i) => {
      const b = document.createElement('button'); b.textContent = (L.visible ? '' : '◌ ') + L.name; if (i === selLayer) b.className = 'on';
      b.onclick = () => { selLayer = i; buildLayers(); buildSettings(); }; ml.appendChild(b);
    });
    const none = !fx.layers.length;
    ['#lUp', '#lDown', '#lDup', '#lDel'].forEach(s => $(s).disabled = none);
  }
  function addLayer() { const l = PR.newLayer(); l.name = 'Layer ' + (fx.layers.length + 1); fx.layers.unshift(l); selLayer = 0; change(true); }
  function dupLayer() { if (!fx.layers.length) return; const l = clone(fx.layers[selLayer]); l.name += ' copy'; fx.layers.splice(selLayer, 0, l); change(true); }
  function delLayer() { if (!fx.layers.length) return; fx.layers.splice(selLayer, 1); selLayer = clamp(selLayer, 0, fx.layers.length - 1); change(true); }
  function moveLayer(d) { const j = selLayer + d; if (j < 0 || j >= fx.layers.length) return; const a = fx.layers; [a[selLayer], a[j]] = [a[j], a[selLayer]]; selLayer = j; change(true); }

  // ---------- settings ----------
  const SHAPES = [['circle', '●'], ['square', '■'], ['diamond', '◆'], ['plus', '✚'], ['star', '✦'], ['ring', '○'], ['heart', '♥'], ['pixel', '·'], ['streak', '⟋']];
  const LAYER_UI = [
    ['Emission', [['Burst', 'emission.burst', 0, 200, 1], ['Rate / sec', 'emission.rate', 0, 200, 1], ['Start at %', 'emission.start', 0, 100, 1], ['Emit for %', 'emission.emitFor', 0, 100, 1], ['Lifetime s', 'emission.lifetime', 0.05, 5, 0.05], ['Life variety %', 'emission.lifeVar', 0, 100, 1]]],
    ['Spawn area', [{ t: 'seg', label: 'Area', path: 'spawn.area', opts: ['point', 'disc', 'ring', 'line', 'box'] }, ['Width', 'spawn.w', 0, 256, 1], ['Height', 'spawn.h', 0, 256, 1], ['Line angle °', 'spawn.angle', -180, 180, 1], ['Position X %', 'spawn.x', -50, 150, 1], ['Position Y %', 'spawn.y', -50, 150, 1]]],
    ['Motion', [['Speed', 'motion.speed', 0, 400, 1], ['Speed variety %', 'motion.speedVar', 0, 100, 1], { t: 'toggle', label: 'Fly outward', path: 'motion.outward' }, ['Direction °', 'motion.dir', -180, 360, 1], ['Spread °', 'motion.spread', 0, 360, 1], ['Gravity', 'motion.gravity', -400, 400, 1], ['Wind', 'motion.wind', -400, 400, 1], ['Drag', 'motion.drag', 0, 10, 0.1]]],
    ['Forces', [['Turbulence', 'forces.turb', 0, 100, 1], ['Turb. detail', 'forces.turbDetail', 1, 200, 1], ['Swirl', 'forces.swirl', -100, 100, 1], ['Attract', 'forces.attract', -100, 100, 1]]],
    ['Particle', [{ t: 'shapes', label: 'Shape', path: 'particle.shape' }, ['Start size', 'particle.startSize', 0, 64, 0.5], ['End size', 'particle.endSize', 0, 64, 0.5], ['Size variety %', 'particle.sizeVar', 0, 100, 1], { t: 'seg', label: 'Size curve', path: 'particle.sizeCurve', opts: ['even', 'fast', 'slow', 'pulse'] }, ['Streak length', 'particle.streak', 0, 20, 0.1], { t: 'seg', label: 'Blending', path: 'particle.blend', opts: ['normal', 'glow'] }]],
    ['Colour', [{ t: 'grad', label: 'Colours', path: 'particle.colors' }, { t: 'seg', label: 'Colour mode', path: 'particle.colorMode', opts: ['life', 'random'], names: ['Over life', 'Random each'] }, ['Colour variety %', 'particle.colorVar', 0, 100, 1], ['Layer hue °', 'hue', -180, 180, 1]]],
    ['Opacity', [['Opacity %', 'particle.opacity', 0, 100, 1], ['Fade in %', 'particle.fadeIn', 0, 100, 1], ['Fade out %', 'particle.fadeOut', 0, 100, 1]]]
  ];
  const CANVAS_UI = [
    ['Canvas', [['Width px', 'w', 16, 256, 1], ['Height px', 'h', 16, 256, 1], ['Frames', 'frames', 2, 64, 1], ['FPS', 'fps', 4, 30, 1], { t: 'toggle', label: 'Seamless loop', path: 'loop' }, ['Seed', 'seed', 0, 99999, 1]]],
    ['Palette', [{ t: 'palette' }]],
    ['Pixel style', [{ t: 'toggle', label: 'Hard alpha', path: 'hardAlpha' }, ['Alpha cut %', 'alphaCut', 1, 99, 1], { t: 'toggle', label: 'Dithered fades', path: 'dither' }, { t: 'seg', label: 'Outline', path: 'outline', opts: [0, 1, 2], names: ['None', '1px', '1px + corners'] }, { t: 'color', label: 'Outline colour', path: 'outlineColor' }, ['Hue shift °', 'hue', -180, 180, 1]]]
  ];
  const closed = new Set(['Forces']);
  const get = (o, p) => p.split('.').reduce((a, k) => a[k], o);
  const set = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

  function buildSettings() {
    const box = $('#settings'); const keep = box.scrollTop; box.innerHTML = '';
    let target, ui;
    if (setTab === 'layer') {
      if (!fx.layers.length) { box.innerHTML = '<p class="empty">No layers. Click + Add.</p>'; return; }
      target = fx.layers[selLayer]; ui = LAYER_UI;
    } else { target = fx; ui = CANVAS_UI; }
    const structural = setTab === 'canvas';
    for (const [title, rows] of ui) {
      const sec = document.createElement('div'); sec.className = 'sec' + (closed.has(title) ? ' closed' : '');
      const h = document.createElement('h4'); h.textContent = title; h.onclick = () => { sec.classList.toggle('closed'); closed[sec.classList.contains('closed') ? 'add' : 'delete'](title); };
      const rs = document.createElement('div'); rs.className = 'rows';
      for (const r of rows) rs.appendChild(Array.isArray(r) ? slider(target, r, structural) : special(target, r));
      sec.append(h, rs); box.appendChild(sec);
    }
    box.scrollTop = keep;
  }
  const LIM = { w: [16, 256], h: [16, 256], frames: [2, 64], fps: [4, 30], seed: [0, 99999] };
  function slider(target, [label, path, min, max, step], structural) {
    const d = document.createElement('div'); d.className = 'row';
    const l = document.createElement('label'); l.textContent = label;
    const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = step;
    const nu = document.createElement('input'); nu.type = 'number'; nu.min = min; nu.max = max; nu.step = step;
    rg.value = nu.value = get(target, path);
    const apply = (v, fin) => {
      v = parseFloat(v); if (isNaN(v)) return;
      if (rg !== document.activeElement) v = clamp(v, min * (path === 'motion.speed' ? 1 : 1), max * 4);
      set(target, path, v); rg.value = v; if (document.activeElement !== nu) nu.value = v;
      if (structural && LIM[path]) set(target, path, clamp(Math.round(v), LIM[path][0], LIM[path][1]));
      if (fin) { rebuild(); if (structural) { updateInfo(); } buildLayers(); commit(); } else liveRebuild();
    };
    rg.oninput = () => { nu.value = rg.value; apply(rg.value, false); };
    rg.onchange = () => apply(rg.value, true);
    nu.onchange = () => apply(nu.value, true);
    d.append(l, rg, nu); return d;
  }
  function special(target, r) {
    const d = document.createElement('div'); d.className = 'row wide';
    const l = document.createElement('label'); l.textContent = r.label || '';
    const v = r.path ? get(target, r.path) : null;
    const box = document.createElement('div');
    if (r.t === 'seg' || r.t === 'shapes') {
      box.className = 'seg' + (r.t === 'shapes' ? ' shapes' : '');
      const opts = r.t === 'shapes' ? SHAPES : r.opts.map((o, i) => [o, r.names ? r.names[i] : o]);
      for (const [val, txt] of opts) {
        const b = document.createElement('button'); b.textContent = txt; b.title = String(val); if (val === v) b.className = 'on';
        b.onclick = () => { set(target, r.path, val); change(false); buildSettings(); };
        box.appendChild(b);
      }
    } else if (r.t === 'toggle') {
      const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!v;
      c.onchange = () => { set(target, r.path, c.checked); change(false); }; box.appendChild(c);
    } else if (r.t === 'color') {
      const c = document.createElement('input'); c.type = 'color'; c.value = v;
      c.oninput = () => { set(target, r.path, c.value); liveRebuild(); }; c.onchange = () => change(false); box.appendChild(c);
    } else if (r.t === 'grad') {
      const cols = get(target, r.path);
      const bar = document.createElement('div'); bar.className = 'gbar'; bar.style.background = 'linear-gradient(90deg,' + cols.join(',') + ')';
      const g = document.createElement('div'); g.className = 'grad';
      cols.forEach((c, i) => {
        const st = document.createElement('span'); st.className = 'st';
        const inp = document.createElement('input'); inp.type = 'color'; inp.value = c;
        inp.oninput = () => { cols[i] = inp.value; bar.style.background = 'linear-gradient(90deg,' + cols.join(',') + ')'; liveRebuild(); };
        inp.onchange = () => change(false);
        const rm = document.createElement('button'); rm.className = 'rm'; rm.textContent = 'x'; rm.title = 'Remove colour';
        rm.onclick = () => { if (cols.length > 1) { cols.splice(i, 1); change(false); buildSettings(); } };
        st.append(inp, rm); g.appendChild(st);
      });
      const add = document.createElement('button'); add.className = 'sm'; add.textContent = '+'; add.title = 'Add colour';
      add.onclick = () => { cols.push(cols[cols.length - 1] || '#ffffff'); change(false); buildSettings(); };
      const flip = document.createElement('button'); flip.className = 'sm'; flip.textContent = 'Flip'; flip.onclick = () => { cols.reverse(); change(false); buildSettings(); };
      g.append(add, flip); box.append(g, bar);
    } else if (r.t === 'palette') {
      d.className = 'row wide'; l.textContent = 'Palette';
      const sel = document.createElement('select');
      for (const n of [...Object.keys(PAL), 'Custom']) { const o = document.createElement('option'); o.textContent = n; if (n === fx.paletteName) o.selected = true; sel.appendChild(o); }
      sel.onchange = () => { fx.paletteName = sel.value; if (sel.value !== 'Custom') fx.palette = PAL[sel.value].slice(); else if (!fx.palette.length) fx.palette = PAL['PICO-8'].slice(); change(false); buildSettings(); };
      const sw = document.createElement('div'); sw.className = 'pal';
      fx.palette.forEach(c => { const i = document.createElement('i'); i.style.background = c; i.title = c; sw.appendChild(i); });
      box.append(sel, sw);
      if (fx.paletteName === 'Custom') {
        const ta = document.createElement('textarea'); ta.value = fx.palette.join(' '); ta.placeholder = 'Hex colours, e.g. #000000 #ff7a1f #ffffff';
        ta.onchange = () => { fx.palette = (ta.value.match(/#?[0-9a-fA-F]{6}\b/g) || []).map(h => '#' + h.replace('#', '').toLowerCase()); change(false); buildSettings(); };
        const imp = document.createElement('button'); imp.className = 'sm'; imp.textContent = 'Import from image / .hex / .gpl';
        imp.onclick = () => $('#palIn').click();
        box.append(ta, imp);
      }
    }
    d.append(l, box); return d;
  }

  // ---------- info / toolbar ----------
  function updateInfo() {
    $('#info').textContent = fx.w + '×' + fx.h + ' px · ' + fx.frames + ' frames · ' + (fx.frames / fx.fps).toFixed(2) + ' s @ ' + fx.fps + ' fps' + (fx.loop ? ' · loop' : '');
    if (document.activeElement !== $('#fxName')) $('#fxName').value = fx.name;
  }
  function buildAll() { buildLayers(); buildSettings(); updateInfo(); }

  function mutate() {
    const r = E.mulberry((Math.random() * 1e9) | 0);
    const j = (v, amt) => v * (1 + (r() * 2 - 1) * amt);
    fx.seed = Math.floor(r() * 99999);
    for (const L of fx.layers) {
      const e = L.emission, m = L.motion, f = L.forces, p = L.particle;
      e.burst = Math.round(j(e.burst, 0.3)); e.rate = Math.round(j(e.rate, 0.3)); e.lifetime = +j(e.lifetime, 0.25).toFixed(2);
      m.speed = Math.round(j(m.speed, 0.35)); m.spread = clamp(Math.round(j(m.spread, 0.2)), 0, 360); m.gravity = Math.round(j(m.gravity, 0.4)); m.drag = +j(m.drag, 0.3).toFixed(1);
      m.dir = Math.round(m.dir + (r() - 0.5) * 20 * (m.spread < 180 ? 1 : 0));
      f.turb = Math.round(j(f.turb, 0.5)); f.swirl = Math.round(j(f.swirl, 0.4));
      p.startSize = Math.max(0.5, Math.round(j(p.startSize, 0.3) * 2) / 2); p.endSize = Math.max(0, Math.round(j(p.endSize, 0.3) * 2) / 2);
      const hs = (r() - 0.5) * 30;
      p.colors = p.colors.map(c => { const rgb = E.hueShift(E.hexToRgb(c), hs); return E.rgbToHex(rgb[0], rgb[1], rgb[2]); });
    }
    change(true); toast('Mutated');
  }
  function reseed() { fx.seed = Math.floor(Math.random() * 99999); change(true); }

  // ---------- files ----------
  const slug = s => (s || 'effect').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'effect';
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function saveToLibrary() {
    const l = libLoad(); const i = l.findIndex(e => e.name === fx.name);
    const e = clone(fx); e.category = 'My library';
    if (i >= 0) l[i] = e; else l.unshift(e);
    if (libSave(l)) { toast('Saved "' + fx.name + '" to your library'); if (libTab === 'library') buildCards(); }
  }
  function fileAct(a) {
    $('#fileMenu').classList.remove('open');
    if (a === 'help') { $('#helpModal').classList.remove('hidden'); return; }
    if (a === 'new') { const n = PR.newEffect(); n.name = 'New effect'; n.layers = [PR.newLayer()]; n.layers[0].name = 'Particles'; setFx(n); lastSnap = snapshot(); autosave(); }
    if (a === 'dup') { fx.name += ' copy'; change(true); toast('Duplicated — save to keep it'); }
    if (a === 'save') saveToLibrary();
    if (a === 'saveFile') download(new Blob([JSON.stringify({ format: 'fxforge', version: 1, effect: fx }, null, 1)], { type: 'application/json' }), slug(fx.name) + '.fxforge');
    if (a === 'openFile') $('#fileIn').click();
    if (a === 'copyJson') { navigator.clipboard.writeText(JSON.stringify(fx)).then(() => toast('Copied settings JSON'), () => toast('Clipboard blocked')); }
    if (a === 'pasteJson') { const t = prompt('Paste effect JSON'); if (t) loadText(t); }
  }
  function loadText(t) {
    try { let o = JSON.parse(t); if (o.effect) o = o.effect; if (!o.layers) throw 0; setFx(o, true); commit(); toast('Loaded ' + fx.name); }
    catch (e) { toast('Not a valid FX Forge project'); }
  }
  $('#fileIn').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(loadText); e.target.value = ''; };
  $('#palIn').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let cols = [];
    if (/^image\//.test(f.type)) {
      const img = await createImageBitmap(f); const c = document.createElement('canvas'); c.width = Math.min(img.width, 512); c.height = Math.min(img.height, 512);
      const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const s = new Set();
      for (let i = 0; i < d.length && s.size < 64; i += 4) if (d[i + 3] > 127) s.add(E.rgbToHex(d[i], d[i + 1], d[i + 2]));
      cols = [...s];
    } else {
      const t = await f.text();
      if (/GIMP Palette/.test(t)) cols = t.split('\n').map(l => l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)/)).filter(Boolean).map(m => E.rgbToHex(+m[1], +m[2], +m[3]));
      else cols = (t.match(/[0-9a-fA-F]{6}\b/g) || []).map(h => '#' + h.toLowerCase());
    }
    if (!cols.length) return toast('No colours found');
    fx.paletteName = 'Custom'; fx.palette = cols.slice(0, 256); change(false); buildSettings(); toast(cols.length + ' colours imported');
  };

  // ---------- export ----------
  function sheetGeom(o) {
    const n = fx.frames, s = o.scale, fw = fx.w * s, fh = fx.h * s, pad = o.pad;
    let cols = o.layout === 'row' ? n : o.layout === 'column' ? 1 : (o.cols > 0 ? Math.min(o.cols, n) : Math.ceil(Math.sqrt(n)));
    const rows = Math.ceil(n / cols);
    return { n, fw, fh, pad, cols, rows, W: cols * fw + (cols + 1) * pad, H: rows * fh + (rows + 1) * pad };
  }
  function exOpts() {
    return { format: $('#exFormat').value, layout: $('#exLayout').value, cols: +$('#exCols').value || 0, pad: clamp(+$('#exPad').value || 0, 0, 16), scale: +$('#exScale').value || 1, bg: $('#exBg').value ? $('#exBgColor').value : '', json: $('#exJson').checked };
  }
  function renderSheet(o) {
    const g = sheetGeom(o); const c = document.createElement('canvas'); c.width = g.W; c.height = g.H;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, g.W, g.H); }
    const t = document.createElement('canvas'); t.width = fx.w; t.height = fx.h; const tx = t.getContext('2d');
    for (let i = 0; i < g.n; i++) {
      tx.putImageData(renderer.frame(i), 0, 0);
      const cx = i % g.cols, cy = Math.floor(i / g.cols);
      x.drawImage(t, g.pad + cx * (g.fw + g.pad), g.pad + cy * (g.fh + g.pad), g.fw, g.fh);
    }
    return { canvas: c, g };
  }
  function metaJson(o, image) {
    const g = sheetGeom(o), frames = {}, list = [];
    const ms = Math.round(1000 / fx.fps);
    for (let i = 0; i < g.n; i++) {
      const cx = i % g.cols, cy = Math.floor(i / g.cols);
      const r = { x: g.pad + cx * (g.fw + g.pad), y: g.pad + cy * (g.fh + g.pad), w: g.fw, h: g.fh };
      const name = slug(fx.name) + '_' + String(i).padStart(2, '0');
      frames[name] = { frame: r, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: g.fw, h: g.fh }, sourceSize: { w: g.fw, h: g.fh }, duration: ms };
      list.push(name);
    }
    return {
      frames, animations: { [slug(fx.name)]: list },
      meta: { app: 'FX Forge', version: '1', image, format: 'RGBA8888', size: { w: g.W, h: g.H }, scale: String(o.scale), frameWidth: g.fw, frameHeight: g.fh, frameCount: g.n, columns: g.cols, rows: g.rows, padding: g.pad, layout: o.layout, fps: fx.fps, loop: fx.loop, frameTags: [{ name: slug(fx.name), from: 0, to: g.n - 1, direction: 'forward' }] }
    };
  }
  let guideTab = 'unity';
  function guideText(o) {
    const g = sheetGeom(o), n = slug(fx.name);
    const sheet = o.format === 'sheet' || o.format === 'json';
    const ppu = g.fw;
    if (!sheet) {
      if (o.format === 'gif') return 'Animated GIF, ' + g.n + ' frames at ' + fx.fps + ' fps (' + Math.round(100 / fx.fps) + ' cs per frame), looping, ' + g.fw + '×' + g.fh + ' px.\nGIF delays are in 1/100 s, so some players round the timing.\nFor game engines use the sprite sheet or PNG frames instead.';
      return 'ZIP with ' + g.n + ' PNG files ' + n + '_00.png … ' + n + '_' + String(g.n - 1).padStart(2, '0') + '.png (' + g.fw + '×' + g.fh + ' px each) plus ' + n + '.json.\n\nUnity: select all PNGs, Texture Type: Sprite, Filter Mode: Point, Compression: None, then drag them into the Scene to create an animation at ' + fx.fps + ' samples.\nGodot 4: AnimatedSprite2D → SpriteFrames → Add frames from files, speed ' + fx.fps + ' FPS, Loop ' + (fx.loop ? 'on' : 'off') + '.\nGameMaker: Create Sprite → Import, select all frames, set the sprite speed to ' + fx.fps + ' frames per second.';
    }
    if (guideTab === 'unity') return 'Unity (2D Sprite package)\n1. Import ' + n + '.png. Texture Type: Sprite (2D and UI). Sprite Mode: Multiple.\n2. Pixels Per Unit: ' + ppu + '. Filter Mode: Point (no filter). Compression: None.\n3. Sprite Editor → Slice → Type: Grid By Cell Size\n   Pixel Size: X ' + g.fw + '  Y ' + g.fh + '\n   Offset: X ' + g.pad + '  Y ' + g.pad + '\n   Padding: X ' + g.pad + '  Y ' + g.pad + '\n   Pivot: Center → Slice → Apply.\n4. Select the ' + g.n + ' sprites and drag them into the Scene. Set the clip Samples to ' + fx.fps + (fx.loop ? ' and keep Loop Time on.' : ' and turn Loop Time off.');
    if (guideTab === 'godot') return 'Godot 4\n1. Import ' + n + '.png. In the Import dock set Filter to Nearest (or Project Settings → Rendering → Textures → Default Texture Filter: Nearest).\n2. AnimatedSprite2D → Sprite Frames → New SpriteFrames → open it.\n3. Click "Add frames from sprite sheet", choose ' + n + '.png.\n   Horizontal: ' + g.cols + '   Vertical: ' + g.rows + '\n   Separation: ' + g.pad + ' × ' + g.pad + '   Offset: ' + g.pad + ' × ' + g.pad + '   Size: ' + g.fw + ' × ' + g.fh + '\n   Select frames 1–' + g.n + ' → Add.\n4. Animation speed: ' + fx.fps + ' FPS. Loop: ' + (fx.loop ? 'on' : 'off') + '.';
    if (guideTab === 'gm') return 'GameMaker\n1. Create a Sprite → Edit Image → Image → Import Strip Image… → choose ' + n + '.png.\n2. Number of frames: ' + g.n + '   Frames per row: ' + g.cols + '\n   Frame width: ' + g.fw + '   Frame height: ' + g.fh + '\n   Horizontal cell offset: 0   Vertical cell offset: 0\n   Horizontal pixel offset: ' + g.pad + '   Vertical pixel offset: ' + g.pad + '\n   Horizontal separation: ' + g.pad + '   Vertical separation: ' + g.pad + '\n3. Set Origin: Middle Centre. Speed: ' + fx.fps + ' frames per second.\n4. In Texture Groups keep interpolation off for crisp pixels.';
    return 'Any engine\nFrame size ' + g.fw + '×' + g.fh + ' px, ' + g.cols + ' columns × ' + g.rows + ' rows, ' + g.n + ' frames, padding ' + g.pad + ' px around and between frames.\nFrame i is at x = ' + g.pad + ' + (i mod ' + g.cols + ') × ' + (g.fw + g.pad) + ', y = ' + g.pad + ' + floor(i / ' + g.cols + ') × ' + (g.fh + g.pad) + '.\nPlay at ' + fx.fps + ' fps (' + Math.round(1000 / fx.fps) + ' ms per frame), ' + (fx.loop ? 'looping.' : 'once.') + '\nThe JSON uses the common "frames" hash layout (TexturePacker / Phaser / Aseprite style) with frameTags.\nUse nearest-neighbour filtering.';
  }
  function updateExport() {
    const o = exOpts();
    document.querySelectorAll('.ifsheet').forEach(e => e.style.display = o.format === 'sheet' || o.format === 'json' ? '' : 'none');
    document.querySelectorAll('.ifgrid').forEach(e => e.style.display = (o.format === 'sheet' || o.format === 'json') && o.layout === 'grid' ? '' : 'none');
    $('#exBgColor').style.display = o.bg ? '' : 'none';
    const pc = $('#exCanvas'); const { canvas, g } = renderSheet(o.format === 'sheet' || o.format === 'json' ? o : Object.assign({}, o, { layout: 'row', pad: 2 }));
    pc.width = canvas.width; pc.height = canvas.height; pc.getContext('2d').drawImage(canvas, 0, 0);
    const z = Math.max(1, Math.floor(Math.min(600 / canvas.width, 320 / canvas.height)));
    pc.style.width = canvas.width * z + 'px'; pc.style.height = canvas.height * z + 'px';
    let sum = '';
    if (o.format === 'sheet') sum = 'Sheet ' + g.W + '×' + g.H + ' px, ' + g.cols + '×' + g.rows + ' cells of ' + g.fw + '×' + g.fh + '.';
    if (o.format === 'gif') sum = 'GIF ' + fx.w * o.scale + '×' + fx.h * o.scale + ' px, ' + fx.frames + ' frames, ' + fx.fps + ' fps, ' + (fx.loop ? 'loops' : 'loops (GIF players loop by default)') + '.';
    if (o.format === 'frames') sum = fx.frames + ' PNGs of ' + fx.w * o.scale + '×' + fx.h * o.scale + ' px in a ZIP, plus JSON.';
    if (o.format === 'json') sum = 'JSON frame data for a ' + g.W + '×' + g.H + ' sheet.';
    $('#exSummary').textContent = sum;
    $('#guide').textContent = guideText(o);
    $('#guideTabs').style.display = o.format === 'sheet' || o.format === 'json' ? '' : 'none';
  }
  const toBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
  async function buildExport() {
    const o = exOpts(), n = slug(fx.name), out = [];
    const json = () => ({ blob: new Blob([JSON.stringify(metaJson(o, n + '.png'), null, 1)], { type: 'application/json' }), name: n + '.json' });
    if (o.format === 'sheet') {
      const { canvas } = renderSheet(o); out.push({ blob: await toBlob(canvas), name: n + '.png' });
      if (o.json) out.push(json());
    } else if (o.format === 'json') {
      out.push(json());
    } else if (o.format === 'gif') {
      const bytes = window.FXGif.encode(renderer.all(), { scale: o.scale, background: o.bg || null, delay: Math.max(2, Math.round(100 / fx.fps)), loop: true });
      out.push({ blob: new Blob([bytes], { type: 'image/gif' }), name: n + '.gif' });
    } else {
      const files = [], t = document.createElement('canvas'); t.width = fx.w * o.scale; t.height = fx.h * o.scale;
      const tx = t.getContext('2d'); tx.imageSmoothingEnabled = false;
      const s = document.createElement('canvas'); s.width = fx.w; s.height = fx.h;
      for (let i = 0; i < fx.frames; i++) {
        s.getContext('2d').putImageData(renderer.frame(i), 0, 0);
        tx.clearRect(0, 0, t.width, t.height); if (o.bg) { tx.fillStyle = o.bg; tx.fillRect(0, 0, t.width, t.height); }
        tx.drawImage(s, 0, 0, t.width, t.height);
        files.push({ name: n + '_' + String(i).padStart(2, '0') + '.png', data: new Uint8Array(await (await toBlob(t)).arrayBuffer()) });
      }
      const meta = { name: fx.name, frameWidth: t.width, frameHeight: t.height, frameCount: fx.frames, fps: fx.fps, loop: fx.loop, frames: files.map(f => ({ file: f.name, duration: Math.round(1000 / fx.fps) })) };
      files.push({ name: n + '.json', data: JSON.stringify(meta, null, 1) });
      out.push({ blob: window.FXZip.zip(files), name: n + '_frames.zip' });
    }
    return out;
  }
  async function doExport() {
    const out = await buildExport();
    out.forEach((f, i) => setTimeout(() => download(f.blob, f.name), i * 300));
    toast('Exported');
  }
  const canShareFiles = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(1)], 'a.png', { type: 'image/png' })] })); } catch (e) { return false; } };
  async function doShare() {
    const out = await buildExport();
    const files = out.map(f => new File([f.blob], f.name, { type: f.blob.type || 'application/octet-stream' }));
    try { await navigator.share({ files, title: fx.name }); } catch (e) { if (e && e.name !== 'AbortError') { toast('Sharing failed, downloading instead'); doExport(); } }
  }
  function openExport() { $('#exportModal').classList.remove('hidden'); $('#exShare').classList.toggle('hidden', !canShareFiles()); updateExport(); }

  // ---------- tour ----------
  const TOUR = [
    ['#cards', 'Start with an effect', 'Pick any preset. Each one is a fully editable starting point. Hover (or tap) a card to preview it.', 'effects'],
    ['#layers', 'Layers', 'Effects are stacks of particle layers. Toggle, rename (double-click or ✎), reorder, duplicate or add layers.', 'layers'],
    ['#settings', 'Tweak live', 'Every slider updates the preview instantly. Canvas & style holds size, frames, FPS, loop, palette, dithering and outline.', 'edit'],
    ['#mutate', 'Mutate', 'One click (or M) makes a new variation. Reseed (R) keeps the settings but reshuffles the particles.'],
    ['#exportBtn', 'Export', 'Sprite sheets (grid, row or column, padding, scale), GIF, PNG frames and JSON, with slicing settings for Unity, Godot 4 and GameMaker.']
  ];
  let tourI = 0;
  function tourShow() {
    document.querySelectorAll('.tour-hi').forEach(e => e.classList.remove('tour-hi'));
    if (tourI >= TOUR.length) { $('#tour').classList.add('hidden'); try { localStorage.setItem(LS_TOUR, '1'); } catch (e) { } return; }
    const [sel, t, p, pane] = TOUR[tourI];
    if (isMobile() && pane) setPane(pane);
    const el = $(isMobile() && sel === '#mutate' ? '#mMutate' : sel); el.classList.add('tour-hi');
    $('#tour').classList.remove('hidden'); $('#tourTitle').textContent = t; $('#tourText').textContent = p;
    $('#tourDots').textContent = TOUR.map((_, i) => i === tourI ? '●' : '·').join('');
    $('#tourNext').textContent = tourI === TOUR.length - 1 ? 'Done' : 'Next';
    const r = el.getBoundingClientRect(), tb = $('#tour .tb');
    let x = r.right + 12, y = r.top + 10;
    if (x + 290 > innerWidth) x = Math.max(10, r.left - 292);
    if (r.width > innerWidth / 3) { x = r.left + 20; y = r.top + 20; }
    tb.style.left = clamp(x, 10, innerWidth - 290) + 'px'; tb.style.top = clamp(y, 10, innerHeight - 160) + 'px';
  }
  $('#tourNext').onclick = () => { tourI++; tourShow(); };
  $('#tourSkip').onclick = () => { tourI = TOUR.length; tourShow(); };
  $('#startTour').onclick = () => { $('#helpModal').classList.add('hidden'); tourI = 0; tourShow(); };

  // ---------- misc UI ----------
  let toastT;
  function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1600); }
  function buildBgs() {
    const box = $('#bgs'); box.innerHTML = '';
    for (const c of ['checker', '#000000', '#16161c', '#5a5a66', '#2f6f3a', '#24407f', '#ffffff', '#c4a57a']) {
      const b = document.createElement('button'); b.title = c === 'checker' ? 'Transparent' : c;
      b.style.background = c === 'checker' ? 'repeating-conic-gradient(#555 0 25%,#222 0 50%) 0 0/8px 8px' : c;
      if (c === bg) b.className = 'on'; b.onclick = () => { bg = c; buildBgs(); draw(); }; box.appendChild(b);
    }
  }

  // ---------- mobile panes ----------
  const isMobile = () => getComputedStyle($('#mnav')).display !== 'none';
  function setPane(p) {
    $('main').dataset.pane = p;
    document.querySelectorAll('#mnav button').forEach(b => b.classList.toggle('on', b.dataset.pane === p));
    if (p === 'edit' || p === 'style') {
      const t = p === 'edit' ? 'layer' : 'canvas';
      if (setTab !== t) { setTab = t; document.querySelectorAll('#setTabs button').forEach(x => x.classList.toggle('on', x.dataset.tab === t)); buildSettings(); }
    }
    draw();
  }
  document.querySelectorAll('#mnav button').forEach(b => b.onclick = () => setPane(b.dataset.pane));
  $('main').dataset.pane = 'edit';
  if (window.ResizeObserver) new ResizeObserver(() => fx && draw()).observe($('#stage'));

  // ---------- wiring ----------
  $('#mMutate').onclick = () => mutate(); $('#mReseed').onclick = reseed;
  $('#undo').onclick = undo; $('#redo').onclick = redo; $('#mutate').onclick = mutate; $('#reseed').onclick = reseed;
  $('#fileBtn').onclick = e => { e.stopPropagation(); $('#fileMenu').classList.toggle('open'); };
  document.addEventListener('click', () => $('#fileMenu').classList.remove('open'));
  document.querySelectorAll('#fileMenu .drop button').forEach(b => b.onclick = () => fileAct(b.dataset.act));
  $('#newFx').onclick = () => fileAct('new');
  $('#help').onclick = () => $('#helpModal').classList.remove('hidden');
  $('#exportBtn').onclick = openExport;
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.modal').classList.add('hidden'));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) m.classList.add('hidden'); }));
  ['#exFormat', '#exLayout', '#exCols', '#exPad', '#exScale', '#exBg', '#exBgColor', '#exJson'].forEach(s => $(s).addEventListener('input', updateExport));
  document.querySelectorAll('#guideTabs button').forEach(b => b.onclick = () => { guideTab = b.dataset.g; document.querySelectorAll('#guideTabs button').forEach(x => x.classList.toggle('on', x === b)); updateExport(); });
  $('#exGo').onclick = doExport; $('#exShare').onclick = doShare;
  $('#fxName').onchange = () => { fx.name = $('#fxName').value.trim() || 'Untitled'; commit(); };
  $('#search').oninput = buildCards;
  document.querySelectorAll('#libTabs button').forEach(b => b.onclick = () => { libTab = b.dataset.tab; document.querySelectorAll('#libTabs button').forEach(x => x.classList.toggle('on', x === b)); buildChips(); buildCards(); });
  document.querySelectorAll('#setTabs button').forEach(b => b.onclick = () => { setTab = b.dataset.tab; document.querySelectorAll('#setTabs button').forEach(x => x.classList.toggle('on', x === b)); buildSettings(); });
  $('#lAdd').onclick = addLayer; $('#lDup').onclick = dupLayer; $('#lDel').onclick = delLayer; $('#lUp').onclick = () => moveLayer(-1); $('#lDown').onclick = () => moveLayer(1);
  $('#play').onclick = () => setPlaying(!playing);
  $('#prev').onclick = () => { setPlaying(false); frame = (frame - 1 + fx.frames) % fx.frames; draw(); };
  $('#next').onclick = () => { setPlaying(false); frame = (frame + 1) % fx.frames; draw(); };
  $('#zoom').onchange = () => { zoom = +$('#zoom').value; draw(); };
  $('#onion').onchange = () => { onion = $('#onion').checked; draw(); };
  addEventListener('resize', () => draw());
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = (tag === 'input' && !['range', 'checkbox', 'color'].includes(e.target.type)) || tag === 'textarea' || tag === 'select';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveToLibrary(); return; }
    if (typing || mod || e.altKey) return;
    if (e.key === 'Escape') { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); return; }
    if (!$('#exportModal').classList.contains('hidden')) return;
    const k = e.key.toLowerCase();
    if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowLeft') $('#prev').click();
    else if (e.key === 'ArrowRight') $('#next').click();
    else if (k === 'm') mutate();
    else if (k === 'r') reseed();
    else if (k === 'e') openExport();
    else if (k === 'd') dupLayer();
    else if (k === 'h' && fx.layers[selLayer]) { fx.layers[selLayer].visible = !fx.layers[selLayer].visible; change(false); }
    else if (e.key === 'Delete') delLayer();
    else if (e.key === '?') $('#helpModal').classList.remove('hidden');
  });

  // ---------- boot ----------
  let start = PR.list[0];
  try { const s = localStorage.getItem(LS_CUR); if (s) start = JSON.parse(s); } catch (e) { }
  buildBgs(); buildChips();
  setFx(start); lastSnap = snapshot(); updateUndo();
  buildCards();
  requestAnimationFrame(tick);
  try { if (!localStorage.getItem(LS_TOUR) && !/notour/.test(location.search)) setTimeout(() => { tourI = 0; tourShow(); }, 600); } catch (e) { }
  window.FXApp = { get fx() { return fx; }, renderer: () => renderer, renderSheet, metaJson, setFx, mutate };
})();
