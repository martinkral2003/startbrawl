// Art2 world creatures: hostile neutrals (scout, hauler, leviathan). Dark shaded sci-fi, lit from the top-left.
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.world = A.world || {};
  const W = A.world;
  // closed polygon from flat [x,y,...] scaled by k
  const P = (c, p, k) => { c.beginPath(); c.moveTo(p[0] * k, p[1] * k); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i] * k, p[i + 1] * k); c.closePath(); };
  const seedOf = n => { const s = +n.id; return isNaN(s) ? 7 : s; };

  // ---------- scout: small angular pirate drone ----------
  W.scout = function (ctx, n, t) {
    const r = n.rad || 13, s = seedOf(n), fl = 0.7 + 0.3 * Math.sin(t * 40 + s);
    ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.ang || 0);
    // thruster flames (behind)
    ctx.fillStyle = 'rgba(255,110,60,0.85)';
    for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(-1.0 * r, i * 0.45 * r - 0.14 * r); ctx.lineTo(-(1.0 + 0.9 * fl) * r, i * 0.45 * r); ctx.lineTo(-1.0 * r, i * 0.45 * r + 0.14 * r); ctx.fill(); }
    A.glow(ctx, -1.05 * r, 0, r * 1.1, 'rgba(255,90,50,0.8)', 0.35 * fl);
    // thruster housings
    ctx.fillStyle = '#2a2024'; ctx.fillRect(-1.12 * r, -0.62 * r, 0.3 * r, 0.34 * r); ctx.fillRect(-1.12 * r, 0.28 * r, 0.3 * r, 0.34 * r);
    // hull
    P(ctx, [1.4, 0, 0.3, -0.75, -0.8, -0.95, -1.0, -0.3, -1.0, 0.3, -0.8, 0.95, 0.3, 0.75], r);
    ctx.fillStyle = A.litGrad(ctx, n.ang || 0, r, '#7a5a60', '#40292f', '#1a1115'); ctx.fill();
    // panel lines + plate
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(0.3 * r, -0.75 * r); ctx.lineTo(-0.2 * r, 0); ctx.lineTo(0.3 * r, 0.75 * r); ctx.moveTo(-0.2 * r, 0); ctx.lineTo(-1.0 * r, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(210,150,150,0.25)'; ctx.beginPath(); ctx.moveTo(-0.8 * r, -0.95 * r); ctx.lineTo(0.3 * r, -0.75 * r); ctx.lineTo(1.4 * r, 0); ctx.stroke();
    // sensor eye
    const p = 0.75 + 0.25 * Math.sin(t * 5 + s);
    A.glow(ctx, 0.65 * r, 0, r * 1.0, 'rgba(255,40,40,0.9)', 0.55 * p);
    ctx.fillStyle = '#ff3a2a'; ctx.beginPath(); ctx.arc(0.65 * r, 0, 0.2 * r, 0, A.TAU); ctx.fill();
    ctx.fillStyle = '#ffd0c0'; ctx.fillRect(0.6 * r, -0.05 * r, 0.1 * r, 0.1 * r);
    ctx.restore();
  };

  // ---------- hauler: bulky cargo barge ----------
  const CONT = ['#6b6a3c', '#7a4a2c', '#59603a', '#8a5a30', '#4f5636', '#6e3f2a'];
  W.hauler = function (ctx, n, t) {
    const r = n.rad || 26, s = seedOf(n), a = n.ang || 0, fl = 0.75 + 0.25 * Math.sin(t * 30 + s);
    ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(a);
    // engine glow + housings
    A.glow(ctx, -1.5 * r, 0, r * 1.5, 'rgba(255,160,60,0.9)', 0.4 * fl);
    for (let i = -1; i <= 1; i += 2) { ctx.fillStyle = A.litGrad(ctx, a, r * 0.4, '#585048', '#2c2824', '#14110f'); ctx.fillRect(-1.55 * r, (i * 0.42 - 0.22) * r, 0.5 * r, 0.44 * r); ctx.fillStyle = `rgba(255,${170 + 50 * fl | 0},90,0.9)`; ctx.fillRect(-1.6 * r, (i * 0.42 - 0.14) * r, 0.1 * r, 0.28 * r); }
    // spine / hull
    P(ctx, [1.5, 0, 1.2, -0.45, -1.1, -0.5, -1.1, 0.5, 1.2, 0.45], r);
    ctx.fillStyle = A.litGrad(ctx, a, r, '#5c5c58', '#313330', '#151615'); ctx.fill();
    // container blocks: 3 columns x 2 rows
    for (let i = 0; i < 6; i++) {
      const cx = (-1.05 + (i >> 1) * 0.72) * r, cy = (i & 1 ? 0.04 : -0.8) * r;
      ctx.fillStyle = CONT[Math.abs((i + s) | 0) % 6]; ctx.fillRect(cx, cy, 0.66 * r, 0.76 * r);
    }
    // shading overlay + container seams
    ctx.fillStyle = A.litGrad(ctx, a, r * 1.2, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)'); ctx.fillRect(-1.05 * r, -0.8 * r, 2.15 * r, 1.6 * r);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 4; i++) { const x = (-1.05 + i * 0.72) * r; ctx.moveTo(x, -0.8 * r); ctx.lineTo(x, 0.8 * r); }
    ctx.moveTo(-1.05 * r, 0); ctx.lineTo(1.1 * r, 0); ctx.stroke();
    // bridge
    P(ctx, [1.5, 0, 1.2, -0.3, 1.0, -0.3, 1.0, 0.3, 1.2, 0.3], r);
    ctx.fillStyle = A.litGrad(ctx, a, r * 0.5, '#7a6e5a', '#3c362c', '#1a1814'); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,70,0.85)'; ctx.fillRect(1.22 * r, -0.12 * r, 0.12 * r, 0.24 * r);
    // amber lights
    const on = (Math.sin(t * 3 + s) > 0) ? 1 : 0.35;
    ctx.fillStyle = `rgba(255,180,50,${on})`; ctx.fillRect(1.05 * r, -0.46 * r, 0.08 * r, 0.08 * r); ctx.fillRect(1.05 * r, 0.38 * r, 0.08 * r, 0.08 * r);
    ctx.fillStyle = `rgba(255,180,50,${1.35 - on})`; ctx.fillRect(-1.1 * r, -0.5 * r, 0.08 * r, 0.08 * r); ctx.fillRect(-1.1 * r, 0.42 * r, 0.08 * r, 0.08 * r);
    ctx.restore();
  };

  // ---------- leviathan: armoured alien dreadnought ----------
  const wf = u => { u = Math.max(-1, Math.min(1, u)); return 0.6 * Math.pow(1 - u * u, 0.6) + 0.04; }; // half-width (in r) at u=(x-0.1)/1.1
  W.leviathan = function (ctx, n, t) {
    const r = n.rad || 70, s = seedOf(n), a = n.ang || 0;
    const hpf = Math.max(0, Math.min(1, n.hpMax > 0 ? n.hp / n.hpMax : 1)), dmg = 1 - hpf;
    ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(a);
    // menace aura
    A.glow(ctx, 0.1 * r, 0, r * 2.0, 'rgba(190,20,80,0.6)', 0.1 + 0.05 * Math.sin(t * 1.7) + dmg * 0.05);
    // engine glow
    const ef = 0.8 + 0.2 * Math.sin(t * 9 + s) * Math.sin(t * 5.3);
    for (let i = -1; i <= 1; i++) A.glow(ctx, -1.05 * r, i * 0.3 * r, r * (i ? 0.55 : 0.75), 'rgba(255,70,50,0.9)', 0.5 * ef);
    ctx.fillStyle = 'rgba(255,120,90,0.75)';
    for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(-1.0 * r, i * 0.3 * r - 0.1 * r); ctx.lineTo(-(1.0 + 0.45 * ef) * r, i * 0.3 * r); ctx.lineTo(-1.0 * r, i * 0.3 * r + 0.1 * r); ctx.fill(); }
    // side weapon pods + horns (mirrored)
    for (let i = -1; i <= 1; i += 2) {
      for (let k = 0; k < 2; k++) {
        const px = (k ? -0.55 : 0.2) * r, py = i * 0.66 * r;
        P(ctx, [px - 0.3 * r, 0, px - 0.2 * r, -0.14 * r, px + 0.25 * r, -0.14 * r, px + 0.35 * r, 0, px + 0.25 * r, 0.14 * r, px - 0.2 * r, 0.14 * r].map((v, j) => j & 1 ? v + py : v), 1);
        ctx.fillStyle = A.litGrad(ctx, a, r * 0.2, '#4a3a48', '#241b24', '#0e0a0e'); ctx.fill();
        ctx.fillStyle = '#17101a'; ctx.fillRect(px + 0.3 * r, py - 0.04 * r, 0.3 * r, 0.08 * r);
        A.glow(ctx, px + 0.62 * r, py, r * 0.14, 'rgba(255,50,80,0.9)', 0.5 + 0.4 * Math.sin(t * 3 + k + i * 2));
      }
      P(ctx, [1.05, i * 0.1, 1.6, i * 0.42, 1.35, i * 0.12, 1.25, i * 0.0], r);
      ctx.fillStyle = A.litGrad(ctx, a, r * 0.5, '#5c4a5a', '#2c212c', '#100b10'); ctx.fill();
    }
    // segmented overlapping plates, rear to front
    const N = 6, L = 0.37;
    for (let i = 0; i < N; i++) {
      const x0 = -1.0 + i * L, x1 = Math.min(1.2, x0 + L + 0.1), w0 = wf((x0 - 0.1) / 1.1), w1 = wf((x1 - 0.1) / 1.1);
      P(ctx, [x0, -w0, x1 - 0.03, -w1, x1, -w1 * 0.7, x1, w1 * 0.7, x1 - 0.03, w1, x0, w0], r);
      ctx.fillStyle = A.litGrad(ctx, a, r * 0.7, i & 1 ? '#5e4c5e' : '#54445a', '#2b222f', '#0f0b12'); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // top-left rim highlight along upper edge
    ctx.strokeStyle = 'rgba(230,170,210,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -1.0; x <= 1.21; x += 0.1) { const y = -wf((x - 0.1) / 1.1) * r; x < -0.99 ? ctx.moveTo(x * r, y) : ctx.lineTo(x * r, y); } ctx.stroke();
    // bio-mechanical ribs
    const core = Math.min(1.3, 0.4 + 0.9 * dmg), unst = 1 + dmg * 0.45 * Math.sin(t * 37 + s) * Math.sin(t * 23), b = Math.max(0.2, core * unst);
    ctx.strokeStyle = `rgba(${150 + 80 * b | 0},40,80,${0.35 + 0.3 * b})`; ctx.lineWidth = Math.max(1, r * 0.03); ctx.beginPath();
    for (let i = 1; i < N; i++) { const x = -1.0 + i * L, w = wf((x - 0.1) / 1.1) * r; for (let m = -1; m <= 1; m += 2) { ctx.moveTo(x * r, m * 0.12 * r); ctx.quadraticCurveTo((x - 0.05) * r, m * w * 0.45, (x - 0.14) * r, m * w * 0.88); } }
    ctx.stroke();
    // core slit with glow
    A.glow(ctx, 0.1 * r, 0, r * (0.7 + 0.3 * b), 'rgba(255,40,100,0.9)', Math.min(1, 0.25 + 0.5 * b));
    P(ctx, [-0.55, 0, -0.35, -0.09, 0.5, -0.09, 0.75, 0, 0.5, 0.09, -0.35, 0.09], r);
    ctx.fillStyle = `rgb(255,${40 + 70 * b | 0},${70 + 50 * b | 0})`; ctx.fill();
    if (b > 0.7) { ctx.fillStyle = `rgba(255,230,235,${Math.min(0.9, b - 0.55)})`; ctx.fillRect(-0.3 * r, -0.025 * r, 0.7 * r, 0.05 * r); }
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-0.55 * r, 0); ctx.lineTo(-0.35 * r, -0.09 * r); ctx.lineTo(0.5 * r, -0.09 * r); ctx.lineTo(0.75 * r, 0); ctx.lineTo(0.5 * r, 0.09 * r); ctx.lineTo(-0.35 * r, 0.09 * r); ctx.closePath(); ctx.stroke();
    // damage: scorch marks and cracks
    if (dmg > 0.2) {
      const rnd = A.rng(s * 131 + 17), ns = Math.ceil(dmg * 6), nc = Math.ceil(dmg * 8);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      for (let i = 0; i < ns; i++) { const x = (-0.9 + rnd() * 1.9) * r, y = (rnd() - 0.5) * 0.9 * r; ctx.beginPath(); ctx.ellipse(x, y, r * (0.08 + rnd() * 0.12), r * (0.05 + rnd() * 0.08), rnd() * 3, 0, A.TAU); ctx.fill(); }
      ctx.strokeStyle = `rgba(255,${70 + 60 * b | 0},90,${0.4 + 0.4 * dmg})`; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < nc; i++) {
        let x = (-0.8 + rnd() * 1.6) * r, y = (rnd() - 0.5) * 0.8 * r; ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 0.22 * r; y += (rnd() - 0.5) * 0.22 * r; ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }
    ctx.restore();
  };
})();
