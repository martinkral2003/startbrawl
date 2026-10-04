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
  // litGrad(ctx, shipAng, size, c0, c1, c2): linear gradient in the ship's LOCAL (rotated) frame whose bright end faces the world light.
  A.litGrad = (c, ang, s, c0, c1, c2) => {
    const la = A.LIGHT - ang, dx = Math.cos(la) * s, dy = Math.sin(la) * s, g = c.createLinearGradient(dx, dy, -dx, -dy);
    g.addColorStop(0, c0); g.addColorStop(0.5, c1); g.addColorStop(1, c2); return g;
  };
  // additive radial glow; col is any CSS colour (it fades to transparent)
  A.glow = (c, x, y, r, col, a = 1) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, A.TAU); c.fill(); c.restore();
  };
  A.MOD = { ARM: 0, LAS: 1, SHD: 2, ENG: 3, REP: 4, MIS: 5, TOR: 6, DRN: 7, MIN: 8, DSH: 9, RAIL: 10, GRV: 11, PUL: 12 };
})();
