// Art2.world anomalies: gravityHole (lensing gravity well) and portal (wormhole gate). Cheap, no shadowBlur.
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.world = A.world || {};
  const TAU = Math.PI * 2;

  // Spiral arm polyline in local (pre-squash) space: radius grows with angle.
  function arm(ctx, a0, r0, r1, turns, n) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const k = i / n, a = a0 + k * turns * TAU, rr = r0 + (r1 - r0) * k;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  }

  A.world.gravityHole = function (ctx, w, t, surge) {
    const r = w.r || 45, gr = w.gr || 480, s = surge > 0 ? 1 : 0;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    ctx.save();
    ctx.translate(w.x, w.y);

    // faint dashed influence ring
    ctx.strokeStyle = s ? 'rgba(170,140,255,0.34)' : 'rgba(150,130,230,0.17)';
    ctx.lineWidth = 2; ctx.setLineDash([14, 18]); ctx.lineDashOffset = -t * 6;
    ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);

    // wide ambient glow (stronger on surge)
    A.glow(ctx, 0, 0, r * (3.6 + s * 1.4), 'rgba(110,80,230,0.55)', 0.4 + s * 0.4 + pulse * 0.08);

    // lensing halo: bright ring just outside the core, with soft falloff
    const hg = ctx.createRadialGradient(0, 0, r * 0.95, 0, 0, r * 2.3);
    hg.addColorStop(0, 'rgba(190,200,255,0.0)');
    hg.addColorStop(0.18, 'rgba(170,185,255,' + (0.32 + s * 0.2) + ')');
    hg.addColorStop(0.5, 'rgba(110,90,220,0.12)');
    hg.addColorStop(1, 'rgba(60,40,140,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, TAU); ctx.fill();

    // tilted swirl disk: arms drawn squashed on a tilted plane
    ctx.save();
    ctx.rotate(-0.45); ctx.scale(1, 0.42);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const rot = t * 0.9;
    for (let i = 0; i < 3; i++) {
      const a0 = rot + i * TAU / 3;
      arm(ctx, a0, r * 1.05, r * 2.7, 0.8, 16);
      ctx.strokeStyle = 'rgba(120,90,255,' + (0.2 + s * 0.15) + ')'; ctx.lineWidth = r * 0.34; ctx.stroke();
      arm(ctx, a0, r * 1.05, r * 2.5, 0.8, 16);
      ctx.strokeStyle = 'rgba(190,210,255,' + (0.5 + s * 0.3) + ')'; ctx.lineWidth = r * 0.07; ctx.stroke();
    }
    ctx.restore();

    // dark core with thin photon ring
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.05);
    cg.addColorStop(0, '#000'); cg.addColorStop(0.7, 'rgba(2,0,10,0.97)'); cg.addColorStop(1, 'rgba(10,6,30,0.8)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,215,255,' + (0.45 + pulse * 0.2 + s * 0.25) + ')'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, TAU); ctx.stroke();

    // dust spiralling inward (one path)
    ctx.fillStyle = 'rgba(200,205,255,0.75)';
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const ph = (t * 0.11 + i * 0.6180339) % 1, k = 1 - ph;
      const rr = r * 1.2 + (gr * 0.45) * k * k;
      const a = i * 2.399 + (1 - k) * 5.5 + t * 0.2;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr, sz = 1 + (1 - k) * 1.8;
      ctx.rect(x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.fill();

    // surge: bright rings contracting inward
    if (s) {
      ctx.globalCompositeOperation = 'lighter';
      const fade = Math.min(1, surge);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i / 3) % 1, rr = r * 1.3 + (gr * 0.7) * (1 - ph) * (1 - ph);
        ctx.strokeStyle = 'rgba(180,160,255,' + (0.7 * ph * fade) + ')'; ctx.lineWidth = 1.5 + ph * 3;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  };

  A.world.portal = function (ctx, p, t) {
    const R = 38, pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
    ctx.save();
    ctx.translate(p.x, p.y);
    A.glow(ctx, 0, 0, R * 2.3, 'rgba(90,200,255,0.5)', 0.35 + pulse * 0.25);
    A.glow(ctx, 0, 0, R * 1.5, 'rgba(160,90,255,0.45)', 0.3 + (1 - pulse) * 0.2);

    // inner vortex
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, TAU); ctx.clip();
    const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.78);
    vg.addColorStop(0, '#d8f6ff'); vg.addColorStop(0.18, '#5fd6ff'); vg.addColorStop(0.55, '#5a3ad0'); vg.addColorStop(1, '#0b0620');
    ctx.fillStyle = vg; ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      arm(ctx, -t * 2.2 + i * TAU / 4, R * 0.08, R * 0.8, 0.9, 10);
      ctx.strokeStyle = i & 1 ? 'rgba(190,130,255,0.6)' : 'rgba(110,230,255,0.65)'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();

    // metal ring (annulus, lit top-left)
    ctx.fillStyle = A.litGrad(ctx, 0, R, '#c3cfdf', '#6d7a90', '#222a38');
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.arc(0, 0, R * 0.78, 0, TAU, true); ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(10,14,24,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,225,255,' + (0.5 + pulse * 0.4) + ')'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, TAU); ctx.stroke();

    // docking clamps (6 chunky blocks)
    ctx.fillStyle = A.litGrad(ctx, 0, R * 0.4, '#a7b4c8', '#566176', '#1d2432');
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + 0.26;
      ctx.save(); ctx.rotate(a); ctx.fillRect(R * 0.72, -4.5, R * 0.42, 9);
      ctx.restore();
    }
    // tiny status lights, alternating blink
    const on = (t * 3 | 0) & 1;
    ctx.fillStyle = 'rgba(120,235,255,0.95)'; ctx.beginPath();
    for (let i = on; i < 12; i += 2) { const a = i * TAU / 12; ctx.rect(Math.cos(a) * R * 0.89 - 1.2, Math.sin(a) * R * 0.89 - 1.2, 2.4, 2.4); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,170,80,0.85)'; ctx.beginPath();
    for (let i = 1 - on; i < 12; i += 2) { const a = i * TAU / 12; ctx.rect(Math.cos(a) * R * 0.89 - 1, Math.sin(a) * R * 0.89 - 1, 2, 2); }
    ctx.fill();
    ctx.restore();
  };
})();
