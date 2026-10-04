// Art2.world.planet / Art2.world.star: seeded shaded planets and burning stars (cached per position).
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.world = A.world || {};
  const TAU = Math.PI * 2, LIGHT = () => (A.LIGHT === undefined ? -2.2 : A.LIGHT);
  const pc = new Map(), sc = new Map();
  const key = w => Math.round(w.x) + ',' + Math.round(w.y);
  const seedOf = w => ((Math.round(w.x) * 73856093) ^ (Math.round(w.y) * 19349663) ^ 0x5bd1e995) | 0;
  const PAL = [ // rocky red-brown, ocean blue-green, gas giant, ice grey-blue
    { base: '#7b4634', lo: '#4a2a22', hi: '#a8674a', atm: '#ff9a6a', cl: '#d9a58a' },
    { base: '#1d5a8c', lo: '#2f7a4c', hi: '#8a7a52', atm: '#6cc4ff', cl: '#eef6ff' },
    { base: '#b58a5a', lo: '#7a5236', hi: '#e6cf9c', atm: '#ffd9a0', cl: '#f0e2c4' },
    { base: '#8fa6bb', lo: '#5d7690', hi: '#d8e6f2', atm: '#a8dcff', cl: '#f4fbff' }
  ];
  const BAND = [['#c9a06a', '#8a5e3c', '#e8d3a2', '#a9744a', '#d9b98a'], ['#9fb6c8', '#6d8aa6', '#cfe0ec', '#7f9ab5', '#b6cfdf'], ['#c98a6a', '#8f5a4a', '#e8b896', '#a86a56', '#d9a080']];

  function mkPlanet(w) {
    const R = A.rng(seedOf(w)), type = (R() * 4) | 0, p = PAL[type], r = w.r || 85;
    const o = { type, p, feats: [], clouds: [], craters: [], bands: [], rot: 0.02 + R() * 0.03, tilt: (R() - 0.5) * 0.5 };
    if (type === 2) {
      const bc = BAND[(R() * 3) | 0];
      let y = -1;
      while (y < 1) { const h = 0.1 + R() * 0.22; o.bands.push({ y, h, c: bc[(R() * bc.length) | 0], a: 0.45 + R() * 0.4 }); y += h * 0.85; }
      o.feats.push({ lon: R() * TAU, lat: 0.3 + R() * 0.2, w: 0.2, h: 0.1, c: '#b04a32' }); // storm spot
    } else {
      const n = type === 1 ? 7 : 6;
      for (let i = 0; i < n; i++) o.feats.push({ lon: R() * TAU, lat: (R() - 0.5) * 1.5, w: 0.22 + R() * 0.3, h: 0.1 + R() * 0.22, c: R() < 0.5 ? p.lo : p.hi, a: 0.55 + R() * 0.35 });
      if (type !== 1) for (let i = 0; i < 6; i++) o.craters.push({ lon: R() * TAU, lat: (R() - 0.5) * 1.5, s: 0.05 + R() * 0.09 });
    }
    const nc = type === 2 ? 0 : 6;
    for (let i = 0; i < nc; i++) o.clouds.push({ lon: R() * TAU, lat: (R() - 0.5) * 1.6, w: 0.25 + R() * 0.35, h: 0.04 + R() * 0.06 });
    o.dash = [10, 14]; o.r = r;
    return o;
  }

  // project lon/lat on the sphere; returns visibility scale (0 if hidden) via out
  function proj(r, lon, lat, tilt, out) {
    const cl = Math.cos(lon), la = lat * 1.2, cy = Math.cos(la);
    if (cl < -0.05) return 0;
    out.x = r * cy * Math.sin(lon); out.y = r * Math.sin(la) + tilt * r * Math.sin(lon) * 0.3;
    return Math.max(0.12, cl) * cy;
  }
  const pt = { x: 0, y: 0 };

  A.world.planet = function (ctx, w, t) {
    const k = key(w); let o = pc.get(k); if (!o) { o = mkPlanet(w); pc.set(k, o); }
    const r = w.r || 85, p = o.p, L = LIGHT(), lx = Math.cos(L), ly = Math.sin(L);
    ctx.save(); ctx.translate(w.x, w.y);
    if (w.gr) { // gravity influence ring
      ctx.setLineDash(o.dash); ctx.lineDashOffset = -t * 4; ctx.strokeStyle = 'rgba(140,170,220,0.16)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, w.gr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    A.glow(ctx, 0, 0, r * 1.45, A.rgba(p.atm, 0.35), 0.5); // outer atmosphere haze
    // body
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    let g = ctx.createRadialGradient(lx * r * 0.4, ly * r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, A.mix(p.base, 0.25)); g.addColorStop(1, A.mix(p.base, -0.35)); ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    if (o.type === 2) { // gas bands
      for (const b of o.bands) { ctx.globalAlpha = b.a; ctx.fillStyle = b.c; const y = b.y * r; ctx.fillRect(-r, y, r * 2, b.h * r); }
      ctx.globalAlpha = 1;
    }
    const rot = t * o.rot * (o.type === 2 ? 2 : 1);
    for (const f of o.feats) {
      const s = proj(r, f.lon + rot, f.lat, o.tilt, pt); if (!s) continue;
      ctx.globalAlpha = (f.a || 0.8) * Math.min(1, s * 2); ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.ellipse(pt.x, pt.y, f.w * r * s, f.h * r, o.tilt * 0.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const c of o.craters) { // craters with lit rims
      const s = proj(r, c.lon + rot, c.lat, o.tilt, pt); if (!s) continue;
      const cr = c.s * r;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, cr * s, cr, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(pt.x, pt.y, cr * s, cr, 0, L + 2.4, L + 3.9 + 0); ctx.stroke();
    }
    ctx.fillStyle = p.cl; // clouds drifting a bit faster than the surface
    for (const c of o.clouds) {
      const s = proj(r, c.lon + rot * 1.8 + t * 0.01, c.lat, o.tilt, pt); if (!s) continue;
      ctx.globalAlpha = (o.type === 1 ? 0.5 : 0.3) * Math.min(1, s * 2);
      ctx.beginPath(); ctx.ellipse(pt.x, pt.y, c.w * r * s, c.h * r, o.tilt * 0.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // day/night terminator toward the bottom-right
    g = ctx.createRadialGradient(lx * r * 0.45, ly * r * 0.45, r * 0.5, lx * r * 0.45, ly * r * 0.45, r * 1.55);
    g.addColorStop(0, 'rgba(2,4,14,0)'); g.addColorStop(0.55, 'rgba(2,4,14,0.35)'); g.addColorStop(0.8, 'rgba(2,4,14,0.82)'); g.addColorStop(1, 'rgba(2,4,14,0.94)');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    // atmosphere rim glow (stronger on the lit side)
    g = ctx.createRadialGradient(0, 0, r * 0.88, 0, 0, r * 1.14);
    g.addColorStop(0, A.rgba(p.atm, 0)); g.addColorStop(0.5, A.rgba(p.atm, 0.4)); g.addColorStop(1, A.rgba(p.atm, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.14, 0, TAU); ctx.fill();
    ctx.strokeStyle = A.rgba(p.atm, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 1, L - 1.1, L + 1.1); ctx.stroke();
    ctx.restore();
  };

  const STAR = [{ core: '#fffbe8', mid: '#ffd24a', edge: '#e0661c', cor: '#ff9a30' }, { core: '#fff4e0', mid: '#ff9a3a', edge: '#b8300e', cor: '#ff6a28' }, { core: '#f4fbff', mid: '#bfe0ff', edge: '#5a8fe0', cor: '#7ab4ff' }];

  function mkStar(w) {
    const R = A.rng(seedOf(w) ^ 0x1234567), o = { p: STAR[(R() * 3) | 0], spots: [], prom: [], rays: 14 + ((R() * 6) | 0), ph: R() * 10, dash: [12, 12], dash2: [8, 8] };
    for (let i = 0; i < 6; i++) o.spots.push({ lon: R() * TAU, lat: (R() - 0.5) * 1.4, s: 0.06 + R() * 0.1 });
    for (let i = 0; i < 5; i++) o.prom.push({ a: R() * TAU, sp: (R() - 0.5) * 0.15, len: 0.35 + R() * 0.45, ph: R() * TAU, f: 0.4 + R() * 0.5 });
    return o;
  }

  A.world.star = function (ctx, w, t) {
    const k = key(w); let o = sc.get(k); if (!o) { o = mkStar(w); sc.set(k, o); }
    const r = w.r || 70, p = o.p, tt = t + o.ph, pulse = 1 + Math.sin(tt * 1.7) * 0.03 + Math.sin(tt * 3.1) * 0.015;
    ctx.save(); ctx.translate(w.x, w.y);
    if (w.gr) { ctx.setLineDash(o.dash); ctx.lineDashOffset = -t * 5; ctx.strokeStyle = 'rgba(255,190,120,0.13)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, w.gr, 0, TAU); ctx.stroke(); }
    // hazy heat zone + dashed warning ring
    const hz = r + 110;
    let g = ctx.createRadialGradient(0, 0, r, 0, 0, hz);
    g.addColorStop(0, A.rgba(p.cor, 0.3)); g.addColorStop(0.5, A.rgba(p.cor, 0.1)); g.addColorStop(1, A.rgba(p.edge, 0.03));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, hz, 0, TAU); ctx.fill();
    ctx.setLineDash(o.dash2); ctx.lineDashOffset = t * 6; ctx.strokeStyle = 'rgba(255,90,50,' + (0.35 + 0.15 * Math.sin(t * 3)) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, hz, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    A.glow(ctx, 0, 0, r * 2.6 * pulse, A.rgba(p.cor, 0.55), 0.6); // corona
    // animated corona rays (one additive path)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = A.rgba(p.cor, 0.18); ctx.beginPath();
    for (let i = 0; i < o.rays; i++) {
      const a = i / o.rays * TAU + t * 0.05, L = r * (1.45 + 0.35 * Math.sin(tt * 1.3 + i * 2.1) + 0.15 * Math.sin(tt * 2.7 + i)), hw = 0.09;
      ctx.moveTo(Math.cos(a - hw) * r * 0.95, Math.sin(a - hw) * r * 0.95); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(a + hw) * r * 0.95, Math.sin(a + hw) * r * 0.95);
    }
    ctx.fill(); ctx.restore();
    // prominences: looping arcs off the limb
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const m of o.prom) {
      const a = m.a + t * m.sp, h = m.len * r * (0.6 + 0.4 * Math.sin(tt * m.f + m.ph)), sp = 0.28 + 0.06 * Math.sin(tt * 0.8 + m.ph);
      const x0 = Math.cos(a - sp) * r * 0.97, y0 = Math.sin(a - sp) * r * 0.97, x1 = Math.cos(a + sp) * r * 0.97, y1 = Math.sin(a + sp) * r * 0.97;
      ctx.strokeStyle = A.rgba(p.mid, 0.5); ctx.lineWidth = 3 + h * 0.05;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(Math.cos(a) * (r + h * 2), Math.sin(a) * (r + h * 2), x1, y1); ctx.stroke();
    }
    ctx.restore();
    // photosphere
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * pulse);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, p.core); g.addColorStop(0.75, p.mid); g.addColorStop(1, p.edge);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, TAU); ctx.fill();
    // drifting dark granulation / sunspots
    ctx.fillStyle = A.rgba(p.edge, 0.4);
    for (const s of o.spots) {
      const lon = s.lon + t * 0.08, cl = Math.cos(lon); if (cl < 0.1) continue;
      const cy = Math.cos(s.lat);
      ctx.beginPath(); ctx.ellipse(r * 0.85 * cy * Math.sin(lon), r * 0.85 * Math.sin(s.lat), s.s * r * cl, s.s * r, 0, 0, TAU); ctx.fill();
    }
    A.glow(ctx, 0, 0, r * 0.7, 'rgba(255,255,255,0.9)', 0.7 + 0.15 * Math.sin(tt * 4)); // white-hot core
    ctx.restore();
  };
})();
