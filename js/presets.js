// Preset library. Every preset is an editable starting point.
(function (G) {
  'use strict';
  const C = {
    fire: ['#fff7c2', '#ffd23f', '#ff8c1a', '#d43d1a', '#5a1e1e'],
    smoke: ['#cfc6bd', '#8f8580', '#4e4747', '#2b2626'],
    darksmoke: ['#6e6460', '#45403e', '#2b2626', '#1a1616'],
    spark: ['#ffffff', '#ffe066', '#ff9a1f'],
    blue: ['#ffffff', '#9ff3ff', '#3fa9ff', '#3a3fbf'],
    heal: ['#f2ffe0', '#8cf06e', '#2fa84f'],
    poison: ['#d8ff8a', '#7bd641', '#3f8f3a', '#2a4a2a'],
    void: ['#f0c8ff', '#a24bff', '#52208f', '#1c0b2e'],
    holy: ['#ffffff', '#fff3b0', '#ffd34d', '#e0a020'],
    ice: ['#ffffff', '#c8f4ff', '#6cc6ff', '#3a6fbf'],
    blood: ['#ff5a5a', '#c0182a', '#6e0c1a'],
    dust: ['#efdcb6', '#c4a57a', '#8e7458', '#5e4a3a'],
    water: ['#ffffff', '#a8e6ff', '#4aa8ff', '#2a5fbf'],
    elec: ['#ffffff', '#bff4ff', '#5fd0ff', '#2f6fff'],
    gold: ['#ffffff', '#ffe680', '#ffb81f', '#b86b12'],
    gem: ['#ffffff', '#ff9cf0', '#c43fff', '#5a1f9f'],
    heart: ['#ffd0dc', '#ff5c8a', '#c21f4f'],
    rainbow: ['#ff4d6d', '#ffd23f', '#4dff88', '#4dc3ff', '#b44dff'],
    leaf: ['#f2c14e', '#e07a1f', '#a8461a', '#6b8f2a'],
    acid: ['#f4ffb0', '#b6ff3a', '#5fbf1f', '#2f5f12'],
    green: ['#ffffff', '#b0ffb8', '#3fe07a', '#1f7f4a']
  };
  const base = () => ({
    name: 'Layer', visible: true, hue: 0,
    emission: { burst: 10, rate: 0, start: 0, emitFor: 100, lifetime: 0.6, lifeVar: 30 },
    spawn: { area: 'point', w: 8, h: 8, x: 50, y: 50, angle: 0 },
    motion: { speed: 60, speedVar: 40, outward: false, dir: 0, spread: 360, gravity: 0, wind: 0, drag: 1 },
    forces: { turb: 0, turbDetail: 50, swirl: 0, attract: 0 },
    particle: { shape: 'circle', startSize: 3, endSize: 1, sizeVar: 30, sizeCurve: 'even', streak: 3, blend: 'normal', colors: ['#ffffff', '#ffcc33'], colorMode: 'life', colorVar: 0, opacity: 100, fadeIn: 0, fadeOut: 30 }
  });
  function L(name, o) {
    const l = base(); l.name = name;
    const map = { e: 'emission', s: 'spawn', m: 'motion', f: 'forces', p: 'particle' };
    for (const k in o) { if (map[k]) Object.assign(l[map[k]], o[k]); else l[k] = o[k]; }
    return l;
  }
  const fxBase = () => ({ name: 'Untitled', category: 'Custom', w: 64, h: 64, frames: 16, fps: 12, loop: false, seed: 1234, palette: [], paletteName: 'None (full colour)', dither: true, hardAlpha: true, alphaCut: 50, outline: 0, outlineColor: '#1a1020', hue: 0, layers: [] });
  function P(name, category, o, layers) { return Object.assign(fxBase(), { name, category }, o, { layers }); }

  const list = [
    // ---------- Explosions ----------
    P('Explosion', 'Explosions', { frames: 20, fps: 15 }, [
      L('Sparks', { e: { burst: 16, lifetime: 0.6 }, m: { speed: 120, speedVar: 50, drag: 2, gravity: 90 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 3, colors: C.spark } }),
      L('Flash', { e: { burst: 1, lifetime: 0.15, lifeVar: 0 }, m: { speed: 0 }, p: { startSize: 26, endSize: 34, sizeVar: 0, colors: ['#ffffff', '#fff3b0'], blend: 'glow', fadeOut: 60 } }),
      L('Core', { e: { burst: 12, lifetime: 0.55 }, s: { area: 'disc', w: 10 }, m: { speed: 30, drag: 3 }, p: { startSize: 12, endSize: 4, sizeCurve: 'slow', colors: C.fire } }),
      L('Smoke', { e: { burst: 12, lifetime: 1.2, start: 10 }, s: { area: 'disc', w: 16 }, m: { speed: 22, drag: 2, gravity: -20 }, f: { turb: 10 }, p: { startSize: 10, endSize: 3, colors: C.smoke, fadeOut: 40 } })
    ]),
    P('Big Blast', 'Explosions', { w: 96, h: 96, frames: 24, fps: 15 }, [
      L('Debris', { e: { burst: 24, lifetime: 1 }, m: { speed: 150, gravity: 160, drag: 0.8 }, p: { shape: 'square', startSize: 2, endSize: 1, colors: ['#ffd23f', '#6b4a32', '#3b2a20'] } }),
      L('Shock ring', { e: { burst: 1, lifetime: 0.35, lifeVar: 0 }, m: { speed: 0 }, p: { shape: 'ring', startSize: 10, endSize: 80, sizeVar: 0, sizeCurve: 'fast', colors: ['#ffffff', '#ffe9a8'], fadeOut: 50 } }),
      L('Fireball', { e: { burst: 22, lifetime: 0.8 }, s: { area: 'disc', w: 18 }, m: { speed: 45, drag: 2.5, gravity: -15 }, p: { startSize: 18, endSize: 5, sizeCurve: 'slow', colors: C.fire } }),
      L('Smoke', { e: { burst: 18, lifetime: 1.6, start: 12 }, s: { area: 'disc', w: 28 }, m: { speed: 25, drag: 1.5, gravity: -25 }, f: { turb: 14 }, p: { startSize: 16, endSize: 6, colors: C.darksmoke } })
    ]),
    P('Pixel Pop', 'Explosions', { w: 32, h: 32, frames: 10, fps: 15 }, [
      L('Bits', { e: { burst: 10, lifetime: 0.5 }, m: { speed: 70, drag: 3 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: ['#ffffff', '#ffd23f', '#ff5a3a'] } }),
      L('Pop', { e: { burst: 1, lifetime: 0.3, lifeVar: 0 }, m: { speed: 0 }, p: { shape: 'ring', startSize: 4, endSize: 22, sizeVar: 0, sizeCurve: 'fast', colors: ['#ffffff'] } })
    ]),
    P('Shockwave', 'Explosions', { frames: 12, fps: 15 }, [
      L('Ring', { e: { burst: 1, lifetime: 0.7, lifeVar: 0 }, m: { speed: 0 }, p: { shape: 'ring', startSize: 4, endSize: 60, sizeVar: 0, sizeCurve: 'fast', colors: ['#ffffff', '#a8e6ff', '#4aa8ff'], fadeOut: 50 } }),
      L('Dust', { e: { burst: 24, lifetime: 0.6 }, s: { area: 'ring', w: 8 }, m: { speed: 70, outward: true, drag: 2 }, p: { startSize: 3, endSize: 1, colors: ['#ffffff', '#8fb8d8'] } })
    ]),
    P('Fireworks', 'Explosions', { frames: 24, fps: 15 }, [
      L('Trails', { e: { burst: 36, lifetime: 1.2 }, s: { y: 40 }, m: { speed: 60, speedVar: 10, gravity: 40, drag: 1.4 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 2, colors: C.rainbow, colorMode: 'random', fadeOut: 50 } }),
      L('Twinkle', { e: { burst: 20, lifetime: 1.2, start: 20 }, s: { y: 40, area: 'disc', w: 40 }, m: { speed: 5, gravity: 20 }, p: { shape: 'star', startSize: 3, endSize: 1, colors: ['#ffffff', '#ffe066'], sizeCurve: 'pulse' } })
    ]),
    P('Smoke Bomb', 'Explosions', { frames: 20, fps: 12 }, [
      L('Cloud', { e: { burst: 26, lifetime: 1.4 }, s: { area: 'disc', w: 12 }, m: { speed: 40, drag: 2.5, gravity: -6 }, f: { turb: 12 }, p: { startSize: 6, endSize: 14, sizeCurve: 'fast', colors: ['#d8d0e8', '#9f94b8', '#5f5878'], fadeOut: 40 } })
    ]),
    // ---------- Fire ----------
    P('Campfire', 'Fire', { frames: 16, fps: 12, loop: true }, [
      L('Embers', { e: { burst: 0, rate: 8, lifetime: 1.1 }, s: { y: 72, area: 'line', w: 14 }, m: { speed: 30, dir: 0, spread: 40, gravity: -10 }, f: { turb: 18 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: ['#fff7c2', '#ff8c1a'] } }),
      L('Flame', { e: { burst: 0, rate: 30, lifetime: 0.7 }, s: { y: 78, area: 'line', w: 16 }, m: { speed: 28, dir: 0, spread: 20, gravity: -30, drag: 1 }, f: { turb: 8 }, p: { startSize: 9, endSize: 1, sizeCurve: 'even', colors: C.fire } }),
      L('Logs', { e: { burst: 0, rate: 6, lifetime: 2.67, lifeVar: 0 }, s: { y: 84, area: 'line', w: 18 }, m: { speed: 0 }, p: { shape: 'square', startSize: 3, endSize: 3, colors: ['#4a2a1a'], fadeOut: 0 } })
    ]),
    P('Torch Flame', 'Fire', { w: 32, h: 48, frames: 12, fps: 12, loop: true }, [
      L('Flame', { e: { burst: 0, rate: 26, lifetime: 0.55 }, s: { y: 72, area: 'disc', w: 5 }, m: { speed: 24, spread: 14, gravity: -26 }, f: { turb: 10 }, p: { startSize: 7, endSize: 1, colors: C.fire } }),
      L('Glow', { e: { burst: 0, rate: 4, lifetime: 1, lifeVar: 0 }, s: { y: 64 }, m: { speed: 0 }, p: { startSize: 12, endSize: 12, colors: ['#ffb84a'], opacity: 30, blend: 'glow', fadeIn: 40, fadeOut: 40 } })
    ]),
    P('Soul Fire', 'Fire', { w: 32, h: 48, frames: 12, fps: 12, loop: true }, [
      L('Flame', { e: { burst: 0, rate: 26, lifetime: 0.65 }, s: { y: 74, area: 'disc', w: 6 }, m: { speed: 22, spread: 16, gravity: -24 }, f: { turb: 12, swirl: 4 }, p: { startSize: 7, endSize: 1, colors: ['#ffffff', '#a8f4ff', '#3fa9ff', '#24307f'] } })
    ]),
    P('Fireball', 'Fire', { w: 64, h: 32, frames: 12, fps: 15, loop: true }, [
      L('Trail', { e: { burst: 0, rate: 40, lifetime: 0.4 }, s: { x: 72, area: 'disc', w: 6 }, m: { speed: 70, dir: 270, spread: 20, drag: 1 }, f: { turb: 6 }, p: { startSize: 8, endSize: 1, colors: C.fire } }),
      L('Head', { e: { burst: 0, rate: 12, lifetime: 0.25 }, s: { x: 74, area: 'disc', w: 3 }, m: { speed: 4 }, p: { startSize: 10, endSize: 8, colors: ['#ffffff', '#fff3b0'], blend: 'glow' } })
    ]),
    P('Ember Drift', 'Fire', { frames: 24, fps: 12, loop: true }, [
      L('Embers', { e: { burst: 0, rate: 10, lifetime: 2 }, s: { y: 100, area: 'line', w: 64 }, m: { speed: 18, dir: 0, spread: 30, gravity: -6 }, f: { turb: 16, turbDetail: 30 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: ['#fff7c2', '#ff8c1a', '#a3301a'], fadeIn: 10 } })
    ]),
    P('Flame Burst', 'Fire', { frames: 16, fps: 15 }, [
      L('Burst', { e: { burst: 30, lifetime: 0.6 }, s: { y: 70 }, m: { speed: 70, dir: 0, spread: 70, gravity: -40, drag: 2 }, f: { turb: 10 }, p: { startSize: 8, endSize: 1, colors: C.fire } })
    ]),
    // ---------- Smoke ----------
    P('Smoke Puff', 'Smoke', { w: 32, h: 32, frames: 12, fps: 12 }, [
      L('Puff', { e: { burst: 8, lifetime: 0.8 }, s: { area: 'disc', w: 4 }, m: { speed: 18, drag: 2 }, p: { startSize: 5, endSize: 9, sizeCurve: 'fast', colors: ['#ffffff', '#c8c0b8', '#8f8580'], fadeOut: 50 } })
    ]),
    P('Chimney Smoke', 'Smoke', { w: 48, h: 64, frames: 24, fps: 12, loop: true }, [
      L('Smoke', { e: { burst: 0, rate: 6, lifetime: 2 }, s: { y: 88, x: 40 }, m: { speed: 16, spread: 20, wind: 6, gravity: -4 }, f: { turb: 8 }, p: { startSize: 4, endSize: 12, sizeCurve: 'fast', colors: C.smoke, fadeOut: 50 } })
    ]),
    P('Steam Vent', 'Smoke', { w: 32, h: 64, frames: 16, fps: 15, loop: true }, [
      L('Steam', { e: { burst: 0, rate: 20, lifetime: 0.9 }, s: { y: 92, area: 'line', w: 4 }, m: { speed: 60, spread: 12, drag: 1.5 }, f: { turb: 12 }, p: { startSize: 3, endSize: 10, sizeCurve: 'fast', colors: ['#ffffff', '#dfe8ef', '#a8b8c4'], opacity: 80, fadeOut: 60 } })
    ]),
    P('Poison Cloud', 'Smoke', { frames: 24, fps: 12, loop: true }, [
      L('Gas', { e: { burst: 0, rate: 12, lifetime: 2 }, s: { area: 'disc', w: 30 }, m: { speed: 6, gravity: -3 }, f: { turb: 10, swirl: 3 }, p: { startSize: 5, endSize: 11, sizeCurve: 'pulse', colors: C.poison, fadeIn: 30, fadeOut: 40 } }),
      L('Bubbles', { e: { burst: 0, rate: 4, lifetime: 1.2 }, s: { area: 'disc', w: 36 }, m: { speed: 8, dir: 0, spread: 30 }, p: { shape: 'ring', startSize: 3, endSize: 4, colors: ['#d8ff8a'] } })
    ]),
    // ---------- Magic ----------
    P('Magic Sparkle', 'Magic', { w: 48, h: 48, frames: 16, fps: 12, loop: true }, [
      L('Stars', { e: { burst: 0, rate: 10, lifetime: 0.8 }, s: { area: 'disc', w: 34 }, m: { speed: 4 }, p: { shape: 'star', startSize: 5, endSize: 1, sizeCurve: 'pulse', colors: ['#ffffff', '#fff3b0', '#ffd34d'], fadeOut: 0 } }),
      L('Dust', { e: { burst: 0, rate: 14, lifetime: 0.8 }, s: { area: 'disc', w: 36 }, m: { speed: 6, gravity: 10 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: ['#ffffff', '#ffe066'] } })
    ]),
    P('Heal Aura', 'Magic', { frames: 20, fps: 12, loop: true }, [
      L('Crosses', { e: { burst: 0, rate: 5, lifetime: 1.4 }, s: { y: 70, area: 'line', w: 36 }, m: { speed: 20, dir: 0, spread: 0 }, p: { shape: 'plus', startSize: 5, endSize: 3, sizeVar: 20, colors: C.heal, fadeIn: 20, fadeOut: 40 } }),
      L('Motes', { e: { burst: 0, rate: 16, lifetime: 1.2 }, s: { y: 72, area: 'ring', w: 36, h: 12 }, m: { speed: 16, dir: 0, spread: 10 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: ['#ffffff', '#8cf06e'] } })
    ]),
    P('Portal', 'Magic', { frames: 24, fps: 12, loop: true }, [
      L('Swirl', { e: { burst: 0, rate: 40, lifetime: 1 }, s: { area: 'ring', w: 44, h: 52 }, m: { speed: 0 }, f: { swirl: 40, attract: 18 }, p: { startSize: 3, endSize: 1, colors: C.void } }),
      L('Core', { e: { burst: 0, rate: 6, lifetime: 1, lifeVar: 0 }, m: { speed: 0 }, p: { startSize: 18, endSize: 22, sizeCurve: 'pulse', colors: ['#1c0b2e'], fadeIn: 30, fadeOut: 30, opacity: 70 } })
    ]),
    P('Level Up', 'Magic', { frames: 20, fps: 15 }, [
      L('Pillar', { e: { burst: 0, rate: 40, lifetime: 0.7, emitFor: 50 }, s: { y: 86, area: 'line', w: 24 }, m: { speed: 90, dir: 0, spread: 0, drag: 0.5 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 2, colors: C.holy } }),
      L('Ring', { e: { burst: 1, lifetime: 0.5, lifeVar: 0 }, s: { y: 86 }, m: { speed: 0 }, p: { shape: 'ring', startSize: 6, endSize: 50, sizeVar: 0, sizeCurve: 'fast', colors: ['#ffffff', '#ffd34d'] } })
    ]),
    P('Ice Shards', 'Magic', { frames: 16, fps: 15 }, [
      L('Shards', { e: { burst: 14, lifetime: 0.7 }, m: { speed: 100, drag: 3, gravity: 40 }, p: { shape: 'diamond', startSize: 5, endSize: 2, colors: C.ice } }),
      L('Frost', { e: { burst: 20, lifetime: 0.9 }, s: { area: 'disc', w: 20 }, m: { speed: 12 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: ['#ffffff', '#a8e6ff'] } })
    ]),
    P('Dark Void', 'Magic', { frames: 24, fps: 12, loop: true }, [
      L('Pull', { e: { burst: 0, rate: 30, lifetime: 1 }, s: { area: 'ring', w: 60 }, m: { speed: 0 }, f: { attract: 30, swirl: 10 }, p: { startSize: 2, endSize: 1, colors: ['#a24bff', '#52208f'] } }),
      L('Orb', { e: { burst: 0, rate: 8, lifetime: 0.75, lifeVar: 0 }, m: { speed: 0 }, p: { startSize: 14, endSize: 16, sizeCurve: 'pulse', colors: ['#000000', '#1c0b2e'], fadeIn: 30, fadeOut: 30 } })
    ]),
    P('Holy Light', 'Magic', { w: 48, h: 64, frames: 20, fps: 12, loop: true }, [
      L('Beam', { e: { burst: 0, rate: 30, lifetime: 0.8 }, s: { y: 100, area: 'line', w: 20 }, m: { speed: 70, dir: 0, spread: 0 }, p: { shape: 'streak', startSize: 2, endSize: 1, streak: 4, colors: C.holy, opacity: 80, blend: 'glow' } }),
      L('Sparkles', { e: { burst: 0, rate: 8, lifetime: 0.6 }, s: { area: 'box', w: 30, h: 60 }, m: { speed: 4 }, p: { shape: 'star', startSize: 4, endSize: 1, sizeCurve: 'pulse', colors: ['#ffffff'] } })
    ]),
    P('Charge Up', 'Magic', { frames: 24, fps: 15 }, [
      L('Gather', { e: { burst: 0, rate: 40, lifetime: 0.6, emitFor: 80 }, s: { area: 'ring', w: 56 }, m: { speed: 0 }, f: { attract: 60 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 2, colors: C.blue, fadeIn: 30 } }),
      L('Orb', { e: { burst: 1, lifetime: 1.6, lifeVar: 0 }, m: { speed: 0 }, p: { startSize: 2, endSize: 14, sizeVar: 0, sizeCurve: 'slow', colors: ['#ffffff', '#9ff3ff'], blend: 'glow', fadeOut: 5 } })
    ]),
    P('Teleport', 'Magic', { w: 48, h: 64, frames: 16, fps: 15 }, [
      L('Column', { e: { burst: 40, lifetime: 0.8 }, s: { area: 'box', w: 20, h: 50 }, m: { speed: 40, dir: 0, spread: 10 }, p: { shape: 'pixel', startSize: 2, endSize: 1, colors: C.blue } }),
      L('Flash', { e: { burst: 1, lifetime: 0.3, lifeVar: 0 }, m: { speed: 0 }, p: { shape: 'square', startSize: 20, endSize: 2, sizeVar: 0, colors: ['#ffffff'], blend: 'glow' } })
    ]),
    P('Arcane Vortex', 'Magic', { frames: 24, fps: 12, loop: true }, [
      L('Spiral', { e: { burst: 0, rate: 36, lifetime: 1.2 }, m: { speed: 30, spread: 360 }, f: { swirl: 50 }, p: { startSize: 3, endSize: 1, colors: ['#ffffff', '#ff9cf0', '#7f3fff'] } })
    ]),
    // ---------- Impacts ----------
    P('Hit Spark', 'Impacts', { w: 32, h: 32, frames: 8, fps: 20 }, [
      L('Sparks', { e: { burst: 8, lifetime: 0.3 }, m: { speed: 110, drag: 4 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 2, colors: C.spark } }),
      L('Star', { e: { burst: 1, lifetime: 0.15, lifeVar: 0 }, m: { speed: 0 }, p: { shape: 'star', startSize: 14, endSize: 4, sizeVar: 0, colors: ['#ffffff'] } })
    ]),
    P('Blood Splat', 'Impacts', { w: 48, h: 48, frames: 12, fps: 15 }, [
      L('Drops', { e: { burst: 18, lifetime: 0.6 }, m: { speed: 70, dir: 90, spread: 120, gravity: 120, drag: 1.5 }, p: { startSize: 3, endSize: 2, colors: C.blood, fadeOut: 20 } })
    ]),
    P('Dust Landing', 'Impacts', { w: 64, h: 32, frames: 12, fps: 15 }, [
      L('Dust', { e: { burst: 16, lifetime: 0.7 }, s: { y: 85, area: 'line', w: 10 }, m: { speed: 50, dir: 0, spread: 160, drag: 3, gravity: 20 }, p: { startSize: 4, endSize: 7, sizeCurve: 'fast', colors: C.dust, fadeOut: 50 } })
    ]),
    P('Ground Slam', 'Impacts', { w: 96, h: 48, frames: 16, fps: 15 }, [
      L('Rocks', { e: { burst: 16, lifetime: 0.8 }, s: { y: 85 }, m: { speed: 100, dir: 0, spread: 120, gravity: 220 }, p: { shape: 'square', startSize: 3, endSize: 2, colors: ['#8e7458', '#5e4a3a'], fadeOut: 10 } }),
      L('Dust', { e: { burst: 24, lifetime: 0.9 }, s: { y: 88, area: 'line', w: 20 }, m: { speed: 60, dir: 0, spread: 170, drag: 3 }, p: { startSize: 6, endSize: 10, sizeCurve: 'fast', colors: C.dust, fadeOut: 50 } })
    ]),
    P('Bullet Impact', 'Impacts', { w: 32, h: 32, frames: 8, fps: 20 }, [
      L('Chips', { e: { burst: 7, lifetime: 0.35 }, m: { speed: 90, dir: 270, spread: 100, gravity: 150, drag: 2 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: ['#efdcb6', '#8e7458'] } }),
      L('Spark', { e: { burst: 4, lifetime: 0.15 }, m: { speed: 120, dir: 270, spread: 80, drag: 4 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 2, colors: C.spark } }),
      L('Puff', { e: { burst: 3, lifetime: 0.45 }, m: { speed: 14, dir: 270, spread: 90 }, p: { startSize: 3, endSize: 6, colors: C.dust, fadeOut: 50 } })
    ]),
    P('Muzzle Flash', 'Impacts', { w: 32, h: 32, frames: 4, fps: 20 }, [
      L('Flash', { e: { burst: 1, lifetime: 0.12, lifeVar: 0 }, s: { x: 20 }, m: { speed: 0 }, p: { shape: 'diamond', startSize: 12, endSize: 4, sizeVar: 0, colors: ['#ffffff', '#ffe066'] } }),
      L('Jet', { e: { burst: 6, lifetime: 0.15 }, s: { x: 25 }, m: { speed: 140, dir: 90, spread: 30, drag: 6 }, p: { startSize: 4, endSize: 1, colors: C.fire } })
    ]),
    P('Water Splash', 'Impacts', { w: 48, h: 48, frames: 14, fps: 15 }, [
      L('Drops', { e: { burst: 20, lifetime: 0.7 }, s: { y: 80 }, m: { speed: 90, dir: 0, spread: 70, gravity: 220 }, p: { startSize: 3, endSize: 1, colors: C.water, fadeOut: 20 } }),
      L('Ring', { e: { burst: 1, lifetime: 0.5, lifeVar: 0 }, s: { y: 82, area: 'point' }, m: { speed: 0 }, p: { shape: 'ring', startSize: 4, endSize: 30, sizeVar: 0, colors: ['#a8e6ff'], fadeOut: 60 } })
    ]),
    // ---------- Energy ----------
    P('Electric Sparks', 'Energy', { w: 48, h: 48, frames: 12, fps: 15, loop: true }, [
      L('Arcs', { e: { burst: 0, rate: 30, lifetime: 0.25 }, m: { speed: 140, drag: 2 }, f: { turb: 80, turbDetail: 120 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 2, colors: C.elec } }),
      L('Core', { e: { burst: 0, rate: 12, lifetime: 0.2 }, s: { area: 'disc', w: 4 }, m: { speed: 0 }, p: { startSize: 6, endSize: 2, colors: ['#ffffff', '#bff4ff'], blend: 'glow' } })
    ]),
    P('Energy Orb', 'Energy', { w: 32, h: 32, frames: 12, fps: 12, loop: true }, [
      L('Orb', { e: { burst: 0, rate: 12, lifetime: 1, lifeVar: 0 }, m: { speed: 0 }, p: { startSize: 12, endSize: 14, sizeCurve: 'pulse', colors: ['#ffffff', '#9ff3ff'], fadeIn: 30, fadeOut: 30 } }),
      L('Orbit', { e: { burst: 0, rate: 16, lifetime: 0.8 }, s: { area: 'ring', w: 18 }, m: { speed: 0 }, f: { swirl: 40 }, p: { shape: 'pixel', startSize: 1, endSize: 1, colors: C.blue } })
    ]),
    P('Shield Hit', 'Energy', { w: 48, h: 48, frames: 10, fps: 15 }, [
      L('Bubble', { e: { burst: 1, lifetime: 0.6, lifeVar: 0 }, m: { speed: 0 }, p: { shape: 'ring', startSize: 38, endSize: 40, sizeVar: 0, colors: ['#ffffff', '#5fd0ff'], fadeOut: 70 } }),
      L('Hex', { e: { burst: 12, lifetime: 0.4 }, s: { area: 'ring', w: 38 }, m: { speed: 10, outward: true }, p: { shape: 'diamond', startSize: 3, endSize: 1, colors: C.elec } })
    ]),
    // ---------- Pickups ----------
    P('Coin Pickup', 'Pickups', { w: 32, h: 32, frames: 12, fps: 15 }, [
      L('Glints', { e: { burst: 10, lifetime: 0.5 }, m: { speed: 60, dir: 0, spread: 120, gravity: 60, drag: 2 }, p: { shape: 'star', startSize: 4, endSize: 1, colors: C.gold } }),
      L('Ring', { e: { burst: 1, lifetime: 0.35, lifeVar: 0 }, m: { speed: 0 }, p: { shape: 'ring', startSize: 4, endSize: 24, sizeVar: 0, sizeCurve: 'fast', colors: ['#ffe680'] } })
    ]),
    P('Gem Shine', 'Pickups', { w: 32, h: 32, frames: 16, fps: 12, loop: true }, [
      L('Shine', { e: { burst: 0, rate: 3, lifetime: 0.6 }, s: { area: 'disc', w: 16 }, m: { speed: 0 }, p: { shape: 'star', startSize: 7, endSize: 1, sizeCurve: 'pulse', colors: C.gem, fadeOut: 0 } })
    ]),
    P('Heart Burst', 'Pickups', { w: 48, h: 48, frames: 16, fps: 15 }, [
      L('Hearts', { e: { burst: 8, lifetime: 0.9 }, m: { speed: 50, dir: 0, spread: 120, gravity: -10, drag: 2 }, p: { shape: 'heart', startSize: 6, endSize: 4, colors: C.heart } })
    ]),
    P('Confetti', 'Pickups', { frames: 24, fps: 15 }, [
      L('Paper', { e: { burst: 40, lifetime: 1.6 }, s: { y: 80 }, m: { speed: 120, dir: 0, spread: 60, gravity: 90, drag: 2 }, f: { turb: 14 }, p: { shape: 'square', startSize: 2, endSize: 2, colors: C.rainbow, colorMode: 'random', fadeOut: 20 } })
    ]),
    // ---------- Nature ----------
    P('Rain', 'Nature', { frames: 12, fps: 15, loop: true }, [
      L('Drops', { e: { burst: 0, rate: 60, lifetime: 0.5, lifeVar: 0 }, s: { y: -5, area: 'line', w: 90 }, m: { speed: 160, dir: 170, spread: 0, speedVar: 10 }, p: { shape: 'streak', startSize: 1, endSize: 1, streak: 1.5, colors: ['#a8c8ff'], fadeOut: 0, opacity: 80 } })
    ]),
    P('Snowfall', 'Nature', { frames: 32, fps: 12, loop: true }, [
      L('Flakes', { e: { burst: 0, rate: 12, lifetime: 2.67, lifeVar: 0 }, s: { y: -5, area: 'line', w: 80 }, m: { speed: 26, dir: 180, spread: 20 }, f: { turb: 6, turbDetail: 30 }, p: { shape: 'pixel', startSize: 1, endSize: 1, sizeVar: 60, colors: ['#ffffff', '#dfe8ff'], fadeOut: 0, colorMode: 'random' } })
    ]),
    P('Falling Leaves', 'Nature', { frames: 32, fps: 12, loop: true }, [
      L('Leaves', { e: { burst: 0, rate: 3, lifetime: 2.67, lifeVar: 0 }, s: { y: -5, area: 'line', w: 70 }, m: { speed: 22, dir: 180, spread: 20 }, f: { turb: 14, turbDetail: 25 }, p: { shape: 'diamond', startSize: 3, endSize: 3, sizeVar: 20, colors: C.leaf, colorMode: 'random', fadeOut: 0 } })
    ]),
    P('Bubbles', 'Nature', { w: 32, h: 64, frames: 24, fps: 12, loop: true }, [
      L('Bubbles', { e: { burst: 0, rate: 4, lifetime: 2, lifeVar: 0 }, s: { y: 100, area: 'line', w: 20 }, m: { speed: 30, dir: 0, spread: 10 }, f: { turb: 8 }, p: { shape: 'ring', startSize: 3, endSize: 5, sizeVar: 40, colors: ['#e6fbff', '#a8e6ff'], fadeOut: 10 } })
    ]),
    P('Fireflies', 'Nature', { frames: 32, fps: 12, loop: true }, [
      L('Flies', { e: { burst: 0, rate: 4, lifetime: 2.67, lifeVar: 0 }, s: { area: 'box', w: 56, h: 56 }, m: { speed: 6 }, f: { turb: 10, turbDetail: 20 }, p: { shape: 'pixel', startSize: 1, endSize: 1, sizeCurve: 'pulse', colors: ['#f4ffb0', '#b6ff3a'], fadeIn: 30, fadeOut: 30 } })
    ])
  ];
  const CATEGORIES = ['Explosions', 'Fire', 'Smoke', 'Magic', 'Impacts', 'Energy', 'Pickups', 'Nature'];
  G.FXPresets = { list, CATEGORIES, newLayer: base, newEffect: fxBase };
})(window);
