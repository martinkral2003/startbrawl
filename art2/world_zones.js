// Art2 world zones: nebula, jet stream, ion storm, closing storm. Cheap: few cached cloud sprites + gradients.
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.world = A.world || {};
  const TAU = Math.PI * 2;
  // cheap deterministic hash -> [0,1)
  const hf = n => { n = Math.imul((n | 0) ^ (n | 0) >>> 15, 0x2c1b3c6d); n = Math.imul(n ^ n >>> 12, 0x297a2d39); return ((n ^ n >>> 15) >>> 0) / 4294967296; };
  const seedOf = o => ((o.x || 0) * 7.13 + (o.y || 0) * 13.7) | 0;

  // ---- pre-rendered cloud sprites (lazy) ----
  const SPR = {};
  function sprite(key, rgb, a, seed) {
    if (SPR[key]) return SPR[key];
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), R = A.rng(seed);
    for (let i = 0; i < 9; i++) {
      const ang = R() * TAU, d = R() * 34, x = S / 2 + Math.cos(ang) * d, y = S / 2 + Math.sin(ang) * d, r = 22 + R() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, r), al = a * (0.5 + R() * 0.5);
      gr.addColorStop(0, `rgba(${rgb},${al})`); gr.addColorStop(0.55, `rgba(${rgb},${al * 0.45})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }
    return SPR[key] = c;
  }
  const sViolet = () => sprite('v', '170,110,255', 0.55, 11), sPale = () => sprite('p', '225,205,255', 0.6, 23),
    sDark = () => sprite('d', '60,6,10', 0.9, 37), sRed = () => sprite('r', '150,20,14', 0.7, 41), sHot = () => sprite('h', '255,120,40', 0.65, 53);

  function puff(ctx, spr, x, y, size, rot, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
    ctx.drawImage(spr, -size / 2, -size / 2, size, size); ctx.restore();
  }
  // jagged polyline x1,y1 -> x2,y2 (path only; caller strokes)
  function jag(ctx, x1, y1, x2, y2, n, amp, seed) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    ctx.moveTo(x1, y1);
    for (let i = 1; i < n; i++) {
      const f = i / n, o = (hf(seed + i * 17) - 0.5) * 2 * amp;
      ctx.lineTo(x1 + dx * f + nx * o, y1 + dy * f + ny * o);
    }
    ctx.lineTo(x2, y2);
  }
  function bolt(ctx, x1, y1, x2, y2, n, amp, seed, a, col) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); jag(ctx, x1, y1, x2, y2, n, amp, seed);
    ctx.strokeStyle = `rgba(${col},${0.25 * a})`; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = `rgba(255,250,255,${0.9 * a})`; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }

  // ---- ion nebula: slows ships, layered violet puffs, faint lightning ----
  A.world.nebula = function (ctx, n, t) {
    const r = n.r || 200, s = seedOf(n);
    ctx.save(); ctx.translate(n.x, n.y);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(110,50,190,0.26)'); g.addColorStop(0.7, 'rgba(90,40,170,0.15)'); g.addColorStop(1, 'rgba(70,30,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    const A0 = sViolet(), A1 = sPale();
    for (let i = 0; i < 11; i++) {
      const h1 = hf(s + i * 5 + 1), h2 = hf(s + i * 5 + 2), h3 = hf(s + i * 5 + 3), h4 = hf(s + i * 5 + 4);
      const ang = h1 * TAU + t * 0.03 * (h3 - 0.5), d = r * (0.08 + 0.55 * h2);
      const x = Math.cos(ang) * d + Math.cos(t * 0.11 + h3 * 6) * r * 0.06, y = Math.sin(ang) * d + Math.sin(t * 0.09 + h4 * 6) * r * 0.06;
      puff(ctx, i & 1 ? A1 : A0, x, y, r * (0.75 + h4 * 0.7), h3 * 6 + t * (h4 - 0.5) * 0.12, (i & 1 ? 0.17 : 0.3) * (0.85 + 0.15 * Math.sin(t * 0.7 + i)));
    }
    // faint lightning flickers
    const k = t * 4 + (s & 7), slot = Math.floor(k), f = k - slot;
    for (let j = 0; j < 2; j++) {
      const q = slot * 3 + j * 101 + s;
      if (hf(q) > 0.62) {
        const a1 = hf(q + 1) * TAU, d1 = r * 0.6 * hf(q + 2), a2 = a1 + (hf(q + 3) - 0.5) * 1.6, d2 = d1 + r * (0.15 + 0.2 * hf(q + 4));
        const x1 = Math.cos(a1) * d1, y1 = Math.sin(a1) * d1;
        A.glow && A.glow(ctx, x1, y1, r * 0.22, 'rgba(190,150,255,0.5)', (1 - f) * 0.7);
        bolt(ctx, x1, y1, Math.cos(a2) * d2, Math.sin(a2) * d2, 4, r * 0.05, q, (1 - f) * 0.7, '190,140,255');
      }
    }
    ctx.strokeStyle = 'rgba(180,140,255,0.14)'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -t * 6;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  };

  // ---- jet stream: cyan band along a segment with flowing chevrons ----
  A.world.stream = function (ctx, st, t) {
    const dx = st.x2 - st.x1, dy = st.y2 - st.y1, L = Math.hypot(dx, dy), w = st.w || 120, hw = w / 2;
    if (L < 1) return;
    const s = seedOf({ x: st.x1, y: st.y1 });
    ctx.save(); ctx.translate(st.x1, st.y1); ctx.rotate(Math.atan2(dy, dx));
    const g = ctx.createLinearGradient(0, -hw, 0, hw);
    g.addColorStop(0, 'rgba(60,200,255,0)'); g.addColorStop(0.3, 'rgba(70,210,255,0.13)'); g.addColorStop(0.5, 'rgba(120,235,255,0.2)');
    g.addColorStop(0.7, 'rgba(70,210,255,0.13)'); g.addColorStop(1, 'rgba(60,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, -hw, L, w);
    // soft rounded ends
    for (let e = 0; e < 2; e++) {
      const x = e ? L : 0, rg = ctx.createRadialGradient(x, 0, 0, x, 0, hw);
      rg.addColorStop(0, 'rgba(110,230,255,0.2)'); rg.addColorStop(1, 'rgba(60,200,255,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, 0, hw, e ? -Math.PI / 2 : Math.PI / 2, e ? Math.PI / 2 : Math.PI * 1.5); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // flowing streaks
    const ns = Math.min(24, Math.max(4, L / 90 | 0));
    ctx.strokeStyle = 'rgba(160,240,255,0.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < ns; i++) {
      const sp = 140 + hf(s + i) * 160, len = 30 + hf(s + i + 50) * 60, y = (hf(s + i + 90) - 0.5) * w * 0.8;
      const x = ((t * sp + hf(s + i + 7) * L) % (L + len)) - len, xa = Math.max(0, x), xb = Math.min(L, x + len);
      if (xb > xa) { ctx.moveTo(xa, y); ctx.lineTo(xb, y); }
    }
    ctx.stroke();
    // chevrons (two rows), fade near the ends
    const sp = Math.max(40, w * 0.8), off = (t * 90) % sp, cs = w * 0.13;
    for (let row = -1; row <= 1; row += 2) {
      const y0 = row * w * 0.2;
      for (let x = off - sp * (row > 0 ? 0.5 : 0); x < L; x += sp) {
        if (x < 0) continue;
        const a = Math.min(1, x / (w * 0.6), (L - x) / (w * 0.6));
        ctx.strokeStyle = `rgba(150,240,255,${0.55 * a})`; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x - cs, y0 - cs); ctx.lineTo(x, y0); ctx.lineTo(x - cs, y0 + cs); ctx.stroke();
      }
    }
    ctx.restore();
  };

  // ---- ion storm cell: violet-white clouds + jagged lightning ----
  A.world.ionStorm = function (ctx, io, t) {
    const r = io.r || 160, s = seedOf(io);
    ctx.save(); ctx.translate(io.x, io.y);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.05);
    g.addColorStop(0, 'rgba(40,20,80,0.55)'); g.addColorStop(0.6, 'rgba(90,50,160,0.28)'); g.addColorStop(1, 'rgba(120,80,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, TAU); ctx.fill();
    const A0 = sViolet(), A1 = sPale();
    for (let i = 0; i < 9; i++) {
      const h1 = hf(s + i * 3 + 1), h2 = hf(s + i * 3 + 2), h3 = hf(s + i * 3 + 3);
      const ang = h1 * TAU + t * (0.25 + h3 * 0.2) * (i & 1 ? 1 : -1), d = r * (0.15 + 0.5 * h2);
      puff(ctx, i % 3 ? A0 : A1, Math.cos(ang) * d, Math.sin(ang) * d, r * (0.7 + h3 * 0.6), ang * 1.3, 0.3 + 0.12 * Math.sin(t * 1.3 + i));
    }
    const step = Math.floor(t * 8), f = t * 8 - step;
    const flash = hf(step * 7 + s) > 0.7 ? 1 - f : 0;
    if (flash > 0) A.glow && A.glow(ctx, 0, 0, r, 'rgba(210,180,255,0.6)', flash * 0.6);
    const nb = 2 + (hf(step + s + 9) > 0.5 ? 1 : 0);
    for (let j = 0; j < nb; j++) {
      const q = step * 13 + j * 977 + s, a1 = hf(q) * TAU, d1 = r * 0.5 * hf(q + 1), a2 = a1 + (hf(q + 2) - 0.5) * 1.8, d2 = r * (0.65 + 0.35 * hf(q + 3));
      bolt(ctx, Math.cos(a1) * d1, Math.sin(a1) * d1, Math.cos(a2) * d2, Math.sin(a2) * d2, 7, r * 0.09, q, 0.55 + 0.45 * (1 - f * 0.6), '180,130,255');
    }
    ctx.restore();
  };

  // ---- closing storm outside circle radius z centred on (0,0), clipped to view rect ----
  A.world.storm = function (ctx, z, view, t) {
    const { x0, y0, x1, y1 } = view, w = x1 - x0, h = y1 - y0;
    if (!(z > 0)) z = 1;
    const nx = Math.min(Math.max(0, x0), x1) * (x0 > 0 ? 1 : 1), ny = y0 > 0 ? y0 : (y1 < 0 ? y1 : 0);
    const px = x0 > 0 ? x0 : (x1 < 0 ? x1 : 0), dmin = Math.hypot(px, ny);
    const dmax = Math.hypot(Math.max(Math.abs(x0), Math.abs(x1)), Math.max(Math.abs(y0), Math.abs(y1)));
    if (dmax <= z) return; // whole view inside the safe circle
    const D = 700, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hd = Math.hypot(w, h) / 2, dc = Math.hypot(cx, cy);
    let a0 = 0, half = Math.PI;
    if (dc > hd) { a0 = Math.atan2(cy, cx); half = Math.min(Math.PI, Math.asin(Math.min(1, hd / dc)) + 0.03); }
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h);
    if (dmin < z) ctx.arc(0, 0, z, 0, TAU); // evenodd: rect minus circle
    ctx.clip('evenodd');
    // dark red-black base wall, darker with distance
    const g = ctx.createRadialGradient(0, 0, z, 0, 0, z + D);
    g.addColorStop(0, 'rgba(110,14,10,0.62)'); g.addColorStop(0.25, 'rgba(60,8,10,0.74)'); g.addColorStop(1, 'rgba(14,2,5,0.88)');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    // swirling wisps along the visible part of the edge (angle-quantised so they stay put while the view moves)
    const step = Math.max(140 / z, TAU / 90), k0 = Math.floor((a0 - half) / step), k1 = Math.ceil((a0 + half) / step);
    const SD = sDark(), SR = sRed(), SH = sHot();
    for (let k = k0; k <= k1; k++) {
      const h1 = hf(k * 3 + 1), h2 = hf(k * 3 + 2), h3 = hf(k * 3 + 3);
      const a = k * step + Math.sin(t * 0.25 + h1 * 6) * step * 0.4, rr = z + 30 + h2 * 330 + Math.sin(t * 0.3 + h3 * 6) * 25;
      const px2 = Math.cos(a) * rr, py2 = Math.sin(a) * rr, sz = 260 + h3 * 220;
      if (px2 + sz < x0 || px2 - sz > x1 || py2 + sz < y0 || py2 - sz > y1) continue;
      puff(ctx, h1 > 0.5 ? SD : SR, px2, py2, sz, a + t * (h2 - 0.5) * 0.4 + h1 * 6, 0.5);
      if (h3 > 0.45) { // hot wisp hugging the edge
        const ra = z + 10 + h1 * 90 + Math.sin(t * 0.8 + h2 * 9) * 12;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        puff(ctx, SH, Math.cos(a) * ra, Math.sin(a) * ra, 120 + h2 * 110, -a + t * 0.3, 0.35 * (0.7 + 0.3 * Math.sin(t * 2 + k)));
        ctx.restore();
      }
    }
    ctx.restore();
    // glowing edge: soft heat gradient on both sides + arc strokes only near the view
    if (dmax > z - 120 && dmin < z + 150) {
      const r0 = Math.max(0, z - 110), r1 = z + 140, p = (z - r0) / (r1 - r0), fl = 0.85 + 0.15 * Math.sin(t * 3.1);
      const eg = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
      eg.addColorStop(0, 'rgba(255,70,20,0)'); eg.addColorStop(p, `rgba(255,110,30,${0.38 * fl})`); eg.addColorStop(1, 'rgba(160,20,10,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = eg; ctx.fillRect(x0, y0, w, h);
      ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
      const aa = a0 - half - 0.02, ab = a0 + half + 0.02;
      const ring = (lw, col) => { ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, 0, z, aa, ab); ctx.stroke(); };
      ctx.lineCap = 'butt';
      ring(46, `rgba(200,30,10,${0.16 * fl})`); ring(18, `rgba(255,90,20,${0.3 * fl})`);
      ring(6, `rgba(255,150,50,${0.7 * fl})`); ring(2, 'rgba(255,235,190,0.9)');
      ctx.restore();
    }
  };
})();
