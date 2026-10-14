// Art2 core helpers shared by every art2/*.js module (dark serious sci-fi, shaded, lit from the top-left).
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.mods = A.mods || {};
  A.TAU = Math.PI * 2;
  A.LIGHT = -2.2;                       // world-space direction TOWARDS the light (up-left)
  A.STEEL = '#8c9bb0';                  // base hull metal
  A.COL8 = ['#ff5a5a', '#4da3ff', '#5ee07a', '#ffd34d', '#c779ff', '#ff9a3d', '#38e0d0', '#ff7ad1'];
  A.hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  // mix(hex, t): t<0 darkens toward black, t>0 lightens toward white; returns 'rgb(...)'
  A.mix = (h, t) => { const [r, g, b] = A.hex(h), k = t < 0 ? 0 : 255, a = Math.abs(t); return `rgb(${r + (k - r) * a | 0},${g + (k - g) * a | 0},${b + (k - b) * a | 0})`; };
  A.rgba = (h, a) => { const [r, g, b] = A.hex(h); return `rgba(${r},${g},${b},${a})`; };
  A.rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // Gradient caching: a radial gradient costs far more than blitting a prebaked sprite, and glows are used everywhere (lights, engines, shields, particles).
  const GS = 96, glowSprites = new Map(), puffSprites = new Map();
  const mkc = () => { const s = document.createElement('canvas'); s.width = s.height = GS; return s; };
  function glowSprite(col) {
    let s = glowSprites.get(col);
    if (!s) {
      if (glowSprites.size > 400) glowSprites.clear();
      s = mkc(); const g = s.getContext('2d'), gr = g.createRadialGradient(GS / 2, GS / 2, 0, GS / 2, GS / 2, GS / 2);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, GS, GS); glowSprites.set(col, s);
    }
    return s;
  }
  // additive radial glow; col is any CSS colour (it fades to transparent)
  A.glow = (c, x, y, r, col, a = 1) => {
    const pa = c.globalAlpha, po = c.globalCompositeOperation;
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
    c.globalAlpha = pa; c.globalCompositeOperation = po;
  };
  // soft particle: centre alpha a, `mid` of it at half radius, 0 at the rim (colour quantised to 4 bits per channel so the sprite set stays small)
  A.puff = (c, x, y, r, cr, cg, cb, a, mid) => {
    const qr = cr >> 4, qg = cg >> 4, qb = cb >> 4, mi = Math.round(mid * 20), key = (qr << 12) | (qg << 8) | (qb << 4) | (mi << 16);
    let s = puffSprites.get(key);
    if (!s) {
      if (puffSprites.size > 600) puffSprites.clear();
      s = mkc(); const g = s.getContext('2d'), gr = g.createRadialGradient(GS / 2, GS / 2, 0, GS / 2, GS / 2, GS / 2), b = `${qr * 17},${qg * 17},${qb * 17}`;
      gr.addColorStop(0, `rgba(${b},1)`); gr.addColorStop(0.5, `rgba(${b},${mi / 20})`); gr.addColorStop(1, `rgba(${b},0)`); g.fillStyle = gr; g.fillRect(0, 0, GS, GS); puffSprites.set(key, s);
    }
    const aa = a > 1 ? 1 : a > 0 ? a : 0; if (aa === 0) return;
    const pa = c.globalAlpha; c.globalAlpha = pa * aa; c.drawImage(s, x - r, y - r, r * 2, r * 2); c.globalAlpha = pa;
  };
  // litGrad(ctx, shipAng, size, c0, c1, c2): linear gradient in the ship's LOCAL (rotated) frame whose bright end faces the world light.
  // Cached: it only depends on the light angle relative to the ship (quantised to 64 steps), the size and the colours,
  // so ships/buttons reuse a handful of gradient objects instead of creating several per ship per frame.
  const lgCache = new Map();
  A.litGrad = (c, ang, s, c0, c1, c2) => {
    const q = Math.round((((A.LIGHT - ang) % A.TAU) + A.TAU) % A.TAU / A.TAU * 64) & 63, key = s + '|' + c0 + '|' + c1 + '|' + c2;
    let arr = lgCache.get(key);
    if (!arr) { if (lgCache.size > 500) lgCache.clear(); arr = new Array(64); lgCache.set(key, arr); }
    let g = arr[q];
    if (!g) { const la = q / 64 * A.TAU, dx = Math.cos(la) * s, dy = Math.sin(la) * s; g = arr[q] = c.createLinearGradient(dx, dy, -dx, -dy); g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2); }
    return g;
  };
  A.MOD = { ARM: 0, LAS: 1, SHD: 2, ENG: 3, REP: 4, MIS: 5, TOR: 6, DRN: 7, MIN: 8, DSH: 9, RAIL: 10, GRV: 11, PUL: 12 };
})();
