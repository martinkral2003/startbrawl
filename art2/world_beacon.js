// Capture-point relay station (world coords). Art2.world.beacon(ctx, b, t, cols)
(function () {
  const A = window.Art2 = window.Art2 || {}; A.world = A.world || {};
  const TAU = Math.PI * 2;
  A.world.beacon = function (ctx, b, t, cols) {
    cols = cols || {};
    const oc = cols.owner || '#8ea0b8', cc = cols.cap || oc, r = b.r || 150, p = b.p || 0, pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.save(); ctx.translate(b.x, b.y);
    // holographic floor disc
    const fg = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r); fg.addColorStop(0, A.rgba ? A.rgba(oc.startsWith('#') ? oc : '#8ea0b8', 0.16) : 'rgba(140,160,190,.16)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    // rotating tick ring at the boundary
    ctx.rotate(t * 0.08); ctx.strokeStyle = oc; ctx.globalAlpha = cols.owner ? 0.75 : 0.4; ctx.lineWidth = 3; ctx.setLineDash([18, 12]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.rotate(-t * 0.08);
    // capture progress arc (clockwise from the top)
    if (b.cap >= 0 && p > 0 && p < 1) { ctx.strokeStyle = cc; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, r - 9, -Math.PI / 2, -Math.PI / 2 + p * TAU); ctx.stroke(); ctx.lineCap = 'butt'; }
    if (b.cont) { ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 22); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r - 4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    // relay structure: three struts, hex hub, antenna ring
    ctx.strokeStyle = '#3a4258'; ctx.lineWidth = 5; for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.stroke(); ctx.fillStyle = '#6a748c'; ctx.beginPath(); ctx.arc(Math.cos(a) * 32, Math.sin(a) * 32, 5, 0, TAU); ctx.fill(); }
    const hub = ctx.createLinearGradient(-14, -14, 14, 14); hub.addColorStop(0, '#c9d2e6'); hub.addColorStop(0.5, '#6a748c'); hub.addColorStop(1, '#1c2030');
    ctx.fillStyle = hub; ctx.beginPath(); for (let k = 0; k < 6; k++) ctx.lineTo(Math.cos(k * TAU / 6) * 15, Math.sin(k * TAU / 6) * 15); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); ctx.rotate(t * 0.9); ctx.strokeStyle = 'rgba(200,215,240,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 26, 9, 0, 0, TAU); ctx.stroke(); ctx.restore();
    // status core
    A.glow ? A.glow(ctx, 0, 0, 34 + 6 * pulse, oc, 0.55 + 0.3 * pulse) : 0;
    ctx.fillStyle = oc; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1.5, -1.5, 1.8, 0, TAU); ctx.fill();
    ctx.restore();
  };
})();
