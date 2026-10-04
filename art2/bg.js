// Art2.bg — deep-space backdrop (screen space). Cached offscreen tiles + canvas patterns => ~8 fills/frame.
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.bg = A.bg || {};
  const TAU = Math.PI * 2;
  // per-layout look: sky gradient top/bottom, nebula colour sets, star tints, planet colours
  const LOOK = [
    { sky: ['#03060d', '#04101a'], neb: [['60,150,255', '30,200,200', '40,70,190'], ['20,170,170', '70,90,220', '90,60,180']], pl: ['#142a44', '#6fb4e0'], gal: '110,170,255' },
    { sky: ['#0a0705', '#140d08'], neb: [['190,120,50', '130,80,40', '90,60,45'], ['150,95,45', '200,150,80', '80,55,40']], pl: ['#2b1c12', '#d9a064'], gal: '255,190,120' },
    { sky: ['#0d0408', '#150609'], neb: [['255,110,30', '230,50,90', '170,40,140'], ['255,150,40', '200,40,120', '120,30,150']], pl: ['#2a0c10', '#ff8a4a'], gal: '255,120,170' }
  ];
  const STAR_COL = ['255,255,255', '255,255,255', '215,230,255', '170,200,255', '255,235,200', '255,200,150'];
  const cache = [];
  const mk = s => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };
  const mod = (a, n) => ((a % n) + n) % n;

  function nebTile(L, idx, S) {
    const c = mk(S), g = c.getContext('2d'), R = A.rng(777 + idx * 131 + L * 17), pal = LOOK[L].neb[idx];
    const n = 11 + idx * 3;
    for (let i = 0; i < n; i++) {
      const x = R() * S, y = R() * S, r = (idx ? 70 : 110) + R() * (idx ? 130 : 190), col = pal[i % pal.length], a = 0.10 + R() * 0.16;
      for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
        const px = x + ox, py = y + oy;
        if (px + r < 0 || px - r > S || py + r < 0 || py - r > S) continue;
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.5, `rgba(${col},${a * 0.4})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2);
      }
    }
    return c;
  }

  function starTile(L, idx, S, n, big) {
    const c = mk(S), g = c.getContext('2d'), R = A.rng(4242 + idx * 977 + L * 31);
    for (let i = 0; i < n; i++) {
      const x = 6 + R() * (S - 12), y = 6 + R() * (S - 12), k = R();
      // warm stars are rare; most are cool white / pale blue
      const col = k > 0.94 ? STAR_COL[4 + (R() > 0.5 ? 1 : 0)] : STAR_COL[(R() * 4) | 0];
      const sz = (R() < big ? 1.1 + R() * 1.1 : 0.45 + R() * 0.55) * (0.8 + idx * 0.25), al = 0.35 + R() * 0.65;
      if (sz > 1.4) {
        const h = g.createRadialGradient(x, y, 0, x, y, sz * 4);
        h.addColorStop(0, `rgba(${col},${al * 0.35})`); h.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = h; g.fillRect(x - sz * 4, y - sz * 4, sz * 8, sz * 8);
      }
      g.fillStyle = `rgba(${col},${al})`; g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill();
    }
    return c;
  }

  function build(L) {
    const o = { neb: [nebTile(L, 0, 1024), nebTile(L, 1, 768)], stars: [starTile(L, 0, 512, 90, 0.04), starTile(L, 1, 512, 55, 0.10), starTile(L, 2, 512, 30, 0.22)], pats: null, ctx: null, gh: 0, grad: null };
    return o;
  }

  // one patterned fill covering the screen, scrolled by (px,py) (tile-sized wrap)
  function layer(ctx, pat, S, px, py, w, h, alpha) {
    const ox = -mod(px, S), oy = -mod(py, S);
    ctx.globalAlpha = alpha; ctx.fillStyle = pat;
    ctx.save(); ctx.translate(ox, oy); ctx.fillRect(-ox, -oy, w, h); ctx.restore();
  }

  A.bg.draw = function (ctx, cam, t, layout) {
    const L = layout === 1 || layout === 2 ? layout : 0, look = LOOK[L], w = cam.w, h = cam.h, z = cam.zoom || 1;
    const cx = (cam.x || 0) * z, cy = (cam.y || 0) * z;
    const B = cache[L] || (cache[L] = build(L));
    if (B.ctx !== ctx) { // canvas patterns are bound per context; (re)create lazily
      B.ctx = ctx;
      B.pats = { neb: B.neb.map(c => ctx.createPattern(c, 'repeat')), stars: B.stars.map(c => ctx.createPattern(c, 'repeat')) };
    }
    ctx.save();
    // 1. base gradient (cached per height)
    if (B.gh !== h) { B.gh = h; B.grad = ctx.createLinearGradient(0, 0, 0, h); B.grad.addColorStop(0, look.sky[0]); B.grad.addColorStop(1, look.sky[1]); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = B.grad; ctx.fillRect(0, 0, w, h);
    // 2. nebula layers (screen blend, low alpha), parallax 0.03 / 0.07
    ctx.globalCompositeOperation = 'screen';
    layer(ctx, B.pats.neb[0], 1024, cx * 0.03, cy * 0.03, w, h, 0.55 + 0.05 * Math.sin(t * 0.07));
    layer(ctx, B.pats.neb[1], 768, cx * 0.07 + 300, cy * 0.07 + 120, w, h, 0.4 + 0.05 * Math.sin(t * 0.09 + 2));
    // 3. distant galaxy (layout 0) / planet silhouette, very slow parallax (0.02)
    ctx.globalCompositeOperation = 'source-over';
    const R = Math.min(w, h) * 0.16 + 30, span = w + R * 4;
    const px = mod(w * 0.74 - cx * 0.02 + R * 2, span) - R * 2, py = h * 0.27 - cy * 0.02 * 0.5;
    if (L === 0) {
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.5); ctx.scale(1, 0.32);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
      g.addColorStop(0, `rgba(${look.gal},0.22)`); g.addColorStop(0.25, `rgba(${look.gal},0.09)`); g.addColorStop(1, `rgba(${look.gal},0)`);
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.globalCompositeOperation = 'screen'; ctx.fillRect(-R * 1.5, -R * 1.5, R * 3, R * 3);
      ctx.restore();
    } else {
      const r = R * 0.8, lx = px - r * 0.45, ly = py - r * 0.45;
      const g = ctx.createRadialGradient(lx, ly, r * 0.1, px, py, r);
      g.addColorStop(0, look.pl[1]); g.addColorStop(0.45, look.pl[0]); g.addColorStop(1, '#010103');
      ctx.globalAlpha = 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
    }
    // 4. star layers (additive), parallax 0.1 / 0.25 / 0.5 with small twinkle
    ctx.globalCompositeOperation = 'lighter';
    layer(ctx, B.pats.stars[0], 512, cx * 0.1, cy * 0.1, w, h, 0.8);
    layer(ctx, B.pats.stars[1], 512, cx * 0.25 + 170, cy * 0.25 + 90, w, h, 0.8 + 0.2 * Math.sin(t * 1.3));
    layer(ctx, B.pats.stars[2], 512, cx * 0.5 + 60, cy * 0.5 + 250, w, h, 0.85 + 0.15 * Math.sin(t * 2.1 + 1.7));
    ctx.restore();
  };
})();
