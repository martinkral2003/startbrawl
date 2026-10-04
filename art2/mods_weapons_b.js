// Art2 weapons B: mines (rack), railgun (rail + coils), gravity (emitter ring), shockwave (rim emitters).
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.mods = A.mods || {};
  const { litGrad, mix, rgba, glow, TAU } = A;
  const S = A.STEEL || '#8c9bb0';

  // lit metal rounded block centred at (x,y), half-size hw,hh, local rotation rot
  function block(c, o, x, y, hw, hh, rot, k) {
    k = k || 0;
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.fillStyle = litGrad(c, o.ang + (rot || 0), Math.max(hw, hh), mix(S, 0.2 + k), mix(S, -0.3 + k), mix(S, -0.72));
    c.beginPath();
    if (c.roundRect) c.roundRect(-hw, -hh, hw * 2, hh * 2, Math.min(hw, hh) * 0.35); else c.rect(-hw, -hh, hw * 2, hh * 2);
    c.fill();
    c.strokeStyle = 'rgba(8,10,16,0.75)'; c.lineWidth = Math.max(0.5, o.r * 0.025); c.stroke();
    c.restore();
  }

  A.mods.mines = function (c, o) {
    if (!o.l) return;
    const r = o.r, n = Math.min(3, o.l), lod = o.lod;
    const hx = -1.05 * r, hw = 0.2 * r, hh = 0.3 * r;
    c.save();
    // hatch frame + dark recess
    block(c, o, hx, 0, hw + r * 0.05, hh + r * 0.05, 0, 0.02);
    c.fillStyle = '#05070b';
    c.fillRect(hx - hw, -hh, hw * 2, hh * 2);
    c.fillStyle = litGrad(c, o.ang, hh, 'rgba(60,70,88,0.55)', 'rgba(20,24,32,0.35)', 'rgba(0,0,0,0)');
    c.fillRect(hx - hw, -hh, hw * 2, hh * 2);
    // mine rack: n mines stacked along y
    const mr = r * (n === 1 ? 0.15 : n === 2 ? 0.13 : 0.11), gap = mr * 2.15;
    for (let i = 0; i < n; i++) {
      const y = (i - (n - 1) / 2) * gap;
      c.fillStyle = litGrad(c, o.ang, mr, mix(S, 0.3), mix(S, -0.35), mix(S, -0.8));
      c.beginPath(); c.arc(hx, y, mr, 0, TAU); c.fill();
      if (lod) {
        c.strokeStyle = 'rgba(6,8,12,0.8)'; c.lineWidth = Math.max(0.5, r * 0.02);
        c.beginPath(); c.arc(hx, y, mr, 0, TAU); c.moveTo(hx - mr, y); c.lineTo(hx + mr, y); c.stroke();
        const on = (Math.sin(o.t * 3.2 + i * 1.9 + (o.seed || 0)) > 0.35) ? 1 : 0.3;
        c.fillStyle = 'rgba(255,60,50,' + on + ')';
        c.beginPath(); c.arc(hx + mr * 0.15, y - mr * 0.15, Math.max(0.7, mr * 0.28), 0, TAU); c.fill();
        // rack rails
        c.fillStyle = 'rgba(90,100,118,0.6)';
        c.fillRect(hx - hw, y - mr * 0.12, hw * 0.35, mr * 0.24);
      }
    }
    // hatch seam lines + status lights on frame
    if (lod) {
      c.strokeStyle = 'rgba(6,8,12,0.7)'; c.lineWidth = Math.max(0.5, r * 0.02);
      c.beginPath(); c.moveTo(hx + hw, -hh); c.lineTo(hx + hw, hh); c.stroke();
      c.fillStyle = 'rgba(255,50,40,0.9)';
      for (const sy of [-1, 1]) { c.beginPath(); c.arc(hx + hw + r * 0.07, sy * hh * 0.8, Math.max(0.6, r * 0.03), 0, TAU); c.fill(); }
    }
    c.restore();
  };

  A.mods.railgun = function (c, o) {
    if (!o.l) return;
    const r = o.r, l = o.l, lod = o.lod, fire = o.fire || 0;
    const x0 = 0.1 * r, x1 = 1.9 * r, ry = 0.075 * r, rw = 0.05 * r;
    const nc = 2 + l;                           // coil pairs
    const en = 0.3 + 0.25 * l;                  // coil energy
    const pulse = 0.85 + 0.15 * Math.sin(o.t * 5);
    c.save();
    // dark base channel
    c.fillStyle = '#080b11';
    c.fillRect(x0 + 0.1 * r, -ry - rw, x1 - x0 - 0.1 * r, (ry + rw) * 2);
    // twin rails
    for (const sy of [-1, 1]) {
      c.fillStyle = litGrad(c, o.ang, rw * 2, mix(S, 0.4), mix(S, -0.15), mix(S, -0.7));
      c.fillRect(x0 + 0.1 * r, sy * ry - rw / 2, x1 - x0 - 0.1 * r, rw);
    }
    // inner energy line
    if (lod) {
      c.fillStyle = 'rgba(120,190,255,' + (0.15 + 0.12 * l) * pulse + ')';
      c.fillRect(x0 + 0.3 * r, -ry * 0.35, x1 - x0 - 0.3 * r, ry * 0.7);
    }
    // coils
    const span = x1 - x0 - 0.45 * r;
    for (let i = 0; i < nc; i++) {
      const x = x0 + 0.5 * r + (nc === 1 ? 0 : i / (nc - 1)) * (span - 0.05 * r);
      const hw = 0.06 * r, hh = 0.075 * r;
      for (const sy of [-1, 1]) {
        const y = sy * (ry + rw + hh * 0.7);
        block(c, o, x, y, hw, hh, 0, 0);
        if (lod) {
          c.fillStyle = 'rgba(150,215,255,' + Math.min(1, en * pulse * (0.7 + 0.3 * Math.sin(o.t * 6 - i * 0.9))) + ')';
          c.fillRect(x - hw * 0.55, y - hh * 0.2, hw * 1.1, hh * 0.4);
        }
      }
      if (lod && l >= 2) glow(c, x, 0, r * 0.22, 'rgba(110,180,255,' + (0.18 * en) + ')', 1);
    }
    // heavy breech block at the rear
    block(c, o, x0 + 0.12 * r, 0, 0.17 * r, 0.2 * r, 0, 0.05);
    if (lod) {
      c.strokeStyle = 'rgba(6,8,12,0.75)'; c.lineWidth = Math.max(0.5, r * 0.02);
      c.beginPath(); c.moveTo(x0 + 0.02 * r, -0.2 * r); c.lineTo(x0 + 0.02 * r, 0.2 * r);
      c.moveTo(x0 + 0.22 * r, -0.2 * r); c.lineTo(x0 + 0.22 * r, 0.2 * r); c.stroke();
      c.fillStyle = 'rgba(90,170,255,' + 0.35 * pulse + ')';
      c.fillRect(x0 + 0.05 * r, -0.03 * r, 0.14 * r, 0.06 * r);
    }
    // muzzle ring
    block(c, o, x1, 0, 0.06 * r, 0.14 * r, 0, 0);
    // discharge flash along the rail
    if (fire > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(x0, 0, x1 + 0.4 * r, 0);
      g.addColorStop(0, 'rgba(120,180,255,' + 0.5 * fire + ')');
      g.addColorStop(1, 'rgba(230,245,255,' + fire + ')');
      c.fillStyle = g; c.fillRect(x0, -ry * 1.2, x1 - x0 + 0.4 * r, ry * 2.4);
      c.fillStyle = 'rgba(255,255,255,' + fire + ')';
      c.fillRect(x0, -ry * 0.3, x1 - x0 + 0.3 * r, ry * 0.6);
      c.restore();
      glow(c, x1, 0, r * (0.5 + 0.4 * fire), 'rgba(190,225,255,0.9)', fire);
      if (lod) for (let i = 0; i < nc; i++) glow(c, x0 + 0.5 * r + i / Math.max(1, nc - 1) * (span - 0.05 * r), 0, r * 0.25, 'rgba(160,210,255,0.8)', fire * 0.7);
    }
    c.restore();
  };

  A.mods.gravity = function (c, o) {
    if (!o.l) return;
    const r = o.r, l = o.l, lod = o.lod, cx = 0.7 * r;
    const R = r * (0.16 + 0.05 * l);
    c.save();
    // base plate + ring housing
    c.fillStyle = litGrad(c, o.ang, R, mix(S, 0.2), mix(S, -0.35), mix(S, -0.78));
    c.beginPath(); c.arc(cx, 0, R * 1.18, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(6,8,12,0.8)'; c.lineWidth = Math.max(0.5, r * 0.025); c.stroke();
    // dark core
    const g = c.createRadialGradient(cx, 0, 0, cx, 0, R * 0.9);
    g.addColorStop(0, '#000'); g.addColorStop(0.7, '#07040e'); g.addColorStop(1, '#1a1030');
    c.fillStyle = g; c.beginPath(); c.arc(cx, 0, R * 0.9, 0, TAU); c.fill();
    if (lod) {
      // rim light on housing (top-left arc)
      const la = A.LIGHT - o.ang;
      c.strokeStyle = 'rgba(210,225,245,0.35)'; c.lineWidth = Math.max(0.5, r * 0.02);
      c.beginPath(); c.arc(cx, 0, R * 1.15, la - 0.8, la + 0.8); c.stroke();
      // rotating purple lensing arcs
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      const arcs = 2 + l;
      for (let i = 0; i < arcs; i++) {
        const a0 = o.t * (1.4 + 0.3 * l) + i * TAU / arcs, rr = R * (0.6 + 0.2 * (i % 2));
        c.strokeStyle = 'rgba(160,90,255,' + (0.28 + 0.06 * l) + ')'; c.lineWidth = Math.max(0.8, R * 0.18);
        c.beginPath(); c.arc(cx, 0, rr, a0, a0 + 0.9); c.stroke();
      }
      c.restore();
      glow(c, cx, 0, R * (2.1 + 0.3 * l), 'rgba(140,70,230,0.5)', 0.35 + 0.1 * Math.sin(o.t * 2.5));
    }
    // bright ring edge
    c.strokeStyle = 'rgba(170,110,255,' + (0.35 + 0.1 * l) + ')'; c.lineWidth = Math.max(0.6, r * 0.025);
    c.beginPath(); c.arc(cx, 0, R * 0.92, 0, TAU); c.stroke();
    c.restore();
  };

  A.mods.shockwave = function (c, o) {
    if (!o.l) return;
    const r = o.r, l = o.l, lod = o.lod, n = 2 + 2 * l;   // 4 / 6 / 8 segments
    const pulse = 0.5 + 0.5 * Math.sin(o.t * 3.4);
    const ex = 0.25 * r, rx = 1.18 * r, ry = 0.88 * r;
    c.save();
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * TAU + 0.3;
      const x = ex + Math.cos(a) * rx, y = Math.sin(a) * ry;
      const rot = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);   // tangent
      block(c, o, x, y, 0.13 * r, 0.05 * r, rot, 0);
      if (lod) {
        const p = 0.35 + 0.4 * Math.sin(o.t * 3.4 - i * 0.7) * 0.5 + 0.2 * pulse;
        c.save(); c.translate(x, y); c.rotate(rot);
        c.fillStyle = 'rgba(80,230,255,' + Math.max(0.15, p) + ')';
        c.fillRect(-0.07 * r, -0.012 * r, 0.14 * r, 0.024 * r);
        c.restore();
        glow(c, x, y, r * 0.2, 'rgba(60,210,255,0.5)', 0.18 + 0.2 * pulse);
      }
    }
    c.restore();
  };
})();
