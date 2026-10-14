// Art2 extra modules (new skills): scatter cannon (flared muzzles), siphon beam (dorsal dish), sentry turret (deck hatches), chrono shift (temporal ring).
// Same contract as the other mods: drawn in the ship's local frame (+x forward), o = {r, l, lod, t, seed, ang, thr, fire}.
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.mods = A.mods || {};
  const { glow, rgba, TAU } = A;

  A.mods.scatter = function (c, o) {
    if (!o.l) return;
    const r = o.r, lod = o.lod, f = o.fire || 0;
    for (const sg of [1, -1]) {
      c.fillStyle = '#0d1016'; c.beginPath();
      c.moveTo(0.58 * r, sg * 0.2 * r); c.lineTo(1.02 * r, sg * 0.13 * r); c.lineTo(1.04 * r, sg * 0.4 * r); c.lineTo(0.58 * r, sg * 0.31 * r); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(190,205,225,0.5)'; c.lineWidth = Math.max(0.5, r * 0.03); c.stroke();
      c.fillStyle = 'rgba(255,170,70,' + (0.5 + 0.15 * o.l) + ')'; c.beginPath(); c.ellipse(1.03 * r, sg * 0.265 * r, 0.035 * r, 0.12 * r, 0, 0, TAU); c.fill();
      if (lod) glow(c, 1.03 * r, sg * 0.265 * r, 0.22 * r, 'rgba(255,170,70,0.8)', 0.35 + 0.25 * o.l);
    }
  };

  A.mods.siphon = function (c, o) {
    if (!o.l) return;
    const r = o.r, lod = o.lod, p = 0.5 + 0.5 * Math.sin(o.t * 3 + (o.seed || 0));
    c.save(); c.translate(-0.5 * r, 0); c.rotate(Math.sin(o.t * 0.8) * 0.25);
    c.fillStyle = '#0c1410'; c.beginPath(); c.ellipse(0, 0, 0.17 * r, 0.26 * r, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(170,230,170,0.7)'; c.lineWidth = Math.max(0.5, r * 0.035); c.stroke();
    c.fillStyle = 'rgba(120,255,140,' + (0.45 + 0.4 * p) + ')'; c.beginPath(); c.arc(0.04 * r, 0, 0.06 * r, 0, TAU); c.fill();
    if (lod) glow(c, 0.04 * r, 0, 0.34 * r, 'rgba(120,255,140,0.9)', 0.25 + 0.1 * o.l + 0.2 * p);
    c.restore();
  };

  A.mods.turretbay = function (c, o) {
    if (!o.l) return;
    const r = o.r, lod = o.lod;
    for (const sg of [1, -1]) {
      c.save(); c.translate(-0.15 * r, sg * 0.55 * r);
      c.fillStyle = '#10151d'; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; i ? c.lineTo(Math.cos(a) * 0.17 * r, Math.sin(a) * 0.17 * r) : c.moveTo(0.17 * r, 0); } c.closePath(); c.fill();
      c.strokeStyle = 'rgba(160,230,255,0.75)'; c.lineWidth = Math.max(0.5, r * 0.03); c.stroke();
      c.fillStyle = 'rgba(159,232,255,0.9)'; c.fillRect(-0.02 * r, -0.02 * r, 0.1 * r, 0.04 * r);
      if (lod && o.l >= 2) glow(c, 0, 0, 0.22 * r, 'rgba(159,232,255,0.8)', 0.3);
      c.restore();
    }
  };

  A.mods.chrono = function (c, o) {
    if (!o.l) return;
    const r = o.r, lod = o.lod;
    c.save(); c.translate(-0.95 * r, 0); c.rotate(o.t * 1.4);
    c.strokeStyle = 'rgba(122,255,200,' + (0.45 + 0.12 * o.l) + ')'; c.lineWidth = Math.max(0.6, r * 0.04); c.setLineDash([r * 0.12, r * 0.09]);
    c.beginPath(); c.arc(0, 0, 0.3 * r, 0, TAU); c.stroke(); c.setLineDash([]);
    if (lod) { c.rotate(-o.t * 2.6); c.beginPath(); c.arc(0, 0, 0.2 * r, 0, TAU * 0.6); c.stroke(); glow(c, 0, 0, 0.45 * r, 'rgba(122,255,200,0.7)', 0.18 + 0.05 * o.l); }
    c.restore();
  };
})();
