// Art2 weapons A: lasers, missiles, torpedo, drones (local ship frame, +x = nose).
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.mods = A.mods || {};
  const { litGrad, mix, rgba, rng, glow, STEEL, TAU } = A;
  const SEAM = 'rgba(8,12,20,0.75)';

  // metal gradient fill in the ship's lit frame
  const metal = (c, o, s, k) => litGrad(c, o.ang, s, mix(STEEL, 0.3 + (k || 0)), mix(STEEL, -0.15 + (k || 0)), mix(STEEL, -0.65));
  const dark = (c, o, s) => litGrad(c, o.ang, s, mix(STEEL, -0.35), mix(STEEL, -0.6), mix(STEEL, -0.85));
  const rrect = (c, x, y, w, h, rad) => {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, rad); else c.rect(x, y, w, h);
  };

  // additive star-shaped muzzle flash
  function flash(c, x, y, r, col, f, t) {
    glow(c, x, y, r * 2.2, rgba(col, 0.9), f * 0.8);
    glow(c, x, y, r * 0.9, '#ffffff', f);
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, y); c.rotate(t * 9);
    c.fillStyle = 'rgba(255,255,255,' + (0.85 * f).toFixed(2) + ')';
    c.beginPath();
    const n = 5, R = r * (0.9 + f * 0.9), q = r * 0.2;
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, d = i % 2 ? q : R; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
    c.closePath(); c.fill();
    c.fillStyle = rgba(col, 0.7 * f);
    c.beginPath(); c.moveTo(0, -r * 0.18); c.lineTo(r * 2.2 * f + r, 0); c.lineTo(0, r * 0.18); c.closePath(); c.fill();
    c.restore();
  }

  // ------------------------------------------------------------------ LASERS
  A.mods.lasers = function (c, o) {
    const r = o.r, l = o.l | 0, col = o.col || '#37c2ff', full = o.lod > 0, t = o.t || 0;
    const ys = l === 2 ? [-0.17, 0.17] : l === 3 ? [-0.27, 0, 0.27] : [0];
    const x0 = 0.8 * r, x1 = (l === 0 ? 1.08 : l === 1 ? 1.2 : 1.14) * r;   // short, stubby barrels that stay inside the nose (the beam does the reaching)
    const hw = (l === 0 ? 0.075 : l === 1 ? 0.09 : l === 2 ? 0.07 : 0.06) * r;
    // mounting block at the nose
    const mh = (ys.length > 1 ? Math.abs(ys[0]) : 0) + hw / r + 0.07;   // in units of r (was mixing px and r -> a huge bar at the nose)
    c.fillStyle = metal(c, o, r * 0.5, -0.05);
    rrect(c, x0 - 0.06 * r, -mh * r, 0.2 * r, mh * 2 * r, 0.04 * r); c.fill();
    if (full) { c.strokeStyle = SEAM; c.lineWidth = Math.max(0.6, r * 0.03); c.stroke(); }
    // cooling-fin block (level 3)
    if (l === 3) {
      c.fillStyle = dark(c, o, r * 0.5);
      rrect(c, x0 + 0.1 * r, -0.43 * r, 0.3 * r, 0.86 * r, 0.03 * r); c.fill();
      if (full) {
        c.strokeStyle = 'rgba(150,170,195,0.45)'; c.lineWidth = Math.max(0.5, r * 0.02); c.beginPath();
        for (let i = 0; i < 5; i++) { const x = x0 + (0.14 + i * 0.065) * r; c.moveTo(x, -0.41 * r); c.lineTo(x, 0.41 * r); }
        c.stroke();
      }
    }
    for (let i = 0; i < ys.length; i++) {
      const y = ys[i] * r, bx = x0 + (l === 3 ? 0.35 : 0.1) * r;
      // barrel
      c.fillStyle = metal(c, o, hw * 2.4);
      c.save(); c.translate(0, y);
      c.fillRect(bx, -hw, x1 - bx - 0.1 * r, hw * 2);
      // shroud / muzzle housing
      const hx = x1 - (l === 1 ? 0.3 : 0.2) * r, hh = hw * (l === 1 ? 1.7 : 1.35);
      c.fillStyle = dark(c, o, hh * 3);
      rrect(c, hx, -hh, x1 - hx, hh * 2, hw * 0.4); c.fill();
      if (full) {
        c.strokeStyle = SEAM; c.lineWidth = Math.max(0.5, r * 0.025);
        c.beginPath(); c.moveTo(hx, -hh); c.lineTo(hx, hh); c.moveTo(bx + 0.12 * r, -hw); c.lineTo(bx + 0.12 * r, hw); c.stroke();
        // rim light on upper edge
        c.strokeStyle = 'rgba(200,220,245,0.35)'; c.beginPath(); c.moveTo(bx, -hw + 0.3); c.lineTo(hx, -hw + 0.3); c.stroke();
      }
      // energy tip
      c.fillStyle = rgba(col, 0.95); c.fillRect(x1 - 0.05 * r, -hw * 0.7, 0.05 * r, hw * 1.4);
      glow(c, x1, 0, r * (0.28 + 0.05 * Math.sin(t * 6 + i)), col, 0.75);
      if (o.fire > 0) flash(c, x1 + 0.08 * r, 0, r * 0.32, col, Math.min(1, o.fire), t + i);
      c.restore();
    }
  };

  // ------------------------------------------------------------------ MISSILES
  A.mods.missiles = function (c, o) {
    const r = o.r, n = o.l | 0; if (n < 1) return;
    const full = o.lod > 0, t = o.t || 0, pw = 0.11 * r, pl = 0.5 * r, gap = 0.14 * r;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < n; i++) {
        const y = s * 0.8 * r + (i - (n - 1) / 2) * gap * s * -1, x = -0.75 * r;
        c.save(); c.translate(x, y);
        // body
        c.fillStyle = metal(c, o, pw * 3);
        rrect(c, 0, -pw / 2, pl, pw, pw * 0.45); c.fill();
        // warhead nose
        c.fillStyle = litGrad(c, o.ang, pw * 2, '#c9ccd2', '#6d3b34', '#2a1614');
        c.beginPath(); c.moveTo(pl - 0.02 * r, -pw / 2); c.quadraticCurveTo(pl + pw * 0.9, -pw * 0.25, pl + pw * 1.15, 0);
        c.quadraticCurveTo(pl + pw * 0.9, pw * 0.25, pl - 0.02 * r, pw / 2); c.closePath(); c.fill();
        if (full) {
          c.strokeStyle = SEAM; c.lineWidth = Math.max(0.5, r * 0.025);
          c.beginPath(); c.moveTo(pl * 0.35, -pw / 2); c.lineTo(pl * 0.35, pw / 2); c.moveTo(pl - 0.02 * r, -pw / 2); c.lineTo(pl - 0.02 * r, pw / 2); c.stroke();
          c.fillStyle = 'rgba(210,225,245,0.3)'; c.fillRect(pw * 0.4, -pw / 2 + 0.3, pl - pw, Math.max(0.6, pw * 0.1));
          // exhaust port
          c.fillStyle = '#0a0d12'; c.beginPath(); c.ellipse(0, 0, pw * 0.16, pw * 0.34, 0, 0, TAU); c.fill();
          c.fillStyle = 'rgba(255,150,60,0.45)'; c.beginPath(); c.ellipse(0, 0, pw * 0.08, pw * 0.2, 0, 0, TAU); c.fill();
        }
        c.restore();
      }
      // pylon connecting pods to the hull
      c.fillStyle = dark(c, o, r * 0.3);
      c.fillRect(-0.55 * r, s > 0 ? 0.6 * r : -0.8 * r, 0.12 * r, 0.2 * r);
    }
    // tiny amber status light
    if (full) {
      const a = 0.45 + 0.55 * (Math.sin(t * 3 + o.seed) > 0.4 ? 1 : 0.25);
      for (let s = -1; s <= 1; s += 2) {
        c.fillStyle = 'rgba(255,190,60,' + a.toFixed(2) + ')'; c.beginPath(); c.arc(-0.3 * r, s * 0.8 * r, Math.max(0.8, r * 0.025), 0, TAU); c.fill();
        glow(c, -0.3 * r, s * 0.8 * r, r * 0.14, 'rgba(255,170,40,0.9)', a * 0.5);
      }
    }
  };

  // ------------------------------------------------------------------ TORPEDO
  A.mods.torpedo = function (c, o) {
    const r = o.r, l = o.l | 0; if (l < 1) return;
    const full = o.lod > 0, t = o.t || 0, hw = 0.1 * r;
    const xr = -0.95 * r, xf = -0.02 * r + (l - 1) * 0.03 * r;
    // tube
    c.fillStyle = metal(c, o, hw * 3, -0.05);
    rrect(c, xr, -hw, xf - xr, hw * 2, hw * 0.5); c.fill();
    c.strokeStyle = SEAM; c.lineWidth = Math.max(0.6, r * 0.03); c.stroke();
    // heavy collar (grows with level)
    const cw = 0.17 * r + l * 0.01 * r, cx = xf - 0.3 * r;
    c.fillStyle = dark(c, o, cw * 2);
    rrect(c, cx, -cw, 0.17 * r, cw * 2, hw * 0.4); c.fill();
    c.stroke();
    if (full) {
      c.fillStyle = 'rgba(205,220,240,0.3)'; c.fillRect(cx + 0.01 * r, -cw + 0.4, 0.15 * r, Math.max(0.6, r * 0.02));
      // secondary bands per level
      c.strokeStyle = SEAM; c.beginPath();
      for (let i = 0; i < l; i++) { const x = xr + (0.12 + i * 0.12) * r; c.moveTo(x, -hw); c.lineTo(x, hw); }
      c.stroke();
      // rear cap vent
      c.fillStyle = '#0b0e13'; c.fillRect(xr - 0.02 * r, -hw * 0.6, 0.05 * r, hw * 1.2);
    }
    // glowing amber-orange tip, pulsing
    const p = 0.6 + 0.4 * Math.sin(t * 4 + o.seed);
    const tx = xf;
    c.fillStyle = 'rgb(255,' + (140 + 60 * p | 0) + ',40)';
    c.beginPath(); c.moveTo(tx - 0.05 * r, -hw * 0.75); c.quadraticCurveTo(tx + 0.1 * r, -hw * 0.5, tx + 0.15 * r, 0);
    c.quadraticCurveTo(tx + 0.1 * r, hw * 0.5, tx - 0.05 * r, hw * 0.75); c.closePath(); c.fill();
    glow(c, tx + 0.05 * r, 0, r * (0.22 + 0.1 * p), 'rgba(255,150,40,1)', 0.55 + 0.35 * p);
    if (full) glow(c, tx + 0.1 * r, 0, r * 0.07, '#fff3d0', 0.8 * p);
  };

  // ------------------------------------------------------------------ DRONES
  A.mods.drones = function (c, o) {
    const r = o.r, n = o.l | 0; if (n < 1) return;
    const full = o.lod > 0, t = o.t || 0, bl = 0.42 * r, bw = 0.2 * r, bx = -0.45 * r - bl / 2;
    const rnd = rng((o.seed | 0) + 77);
    for (let s = -1; s <= 1; s += 2) {
      const cy = s * 0.28 * r;
      // bay frame
      c.fillStyle = metal(c, o, r * 0.5, -0.1);
      rrect(c, bx - 0.03 * r, cy - bw / 2 - 0.03 * r, bl + 0.06 * r, bw + 0.06 * r, 0.04 * r); c.fill();
      // dark recess
      c.fillStyle = '#07090d';
      rrect(c, bx, cy - bw / 2, bl, bw, 0.03 * r); c.fill();
      // drone silhouettes
      const dl = bl / 3 * 0.92;
      for (let i = 0; i < n; i++) {
        const dx = bx + (i + 0.5) * bl / 3, dh = bw * 0.36;
        c.fillStyle = litGrad(c, o.ang, dh * 2, '#6b7686', '#3b4452', '#1a1f28');
        c.beginPath(); c.moveTo(dx + dl * 0.5, cy); c.lineTo(dx - dl * 0.35, cy - dh); c.lineTo(dx - dl * 0.15, cy); c.lineTo(dx - dl * 0.35, cy + dh); c.closePath(); c.fill();
        if (full) {
          const on = Math.sin(t * 5 + i * 2 + s + rnd() * 6) > 0.2;
          if (on) { c.fillStyle = (i + (s > 0 ? 1 : 0)) % 2 ? '#ff4040' : '#4dffa0'; c.fillRect(dx - 0.01 * r, cy - 0.01 * r, Math.max(1, r * 0.04), Math.max(1, r * 0.04)); }
        }
      }
      // hinged lid, opened outwards along the outer edge
      const ly = cy + s * (bw / 2 + 0.03 * r);
      c.fillStyle = metal(c, o, r * 0.3, 0.05);
      c.beginPath();
      c.moveTo(bx, ly); c.lineTo(bx + bl, ly); c.lineTo(bx + bl - 0.03 * r, ly + s * 0.1 * r); c.lineTo(bx + 0.03 * r, ly + s * 0.1 * r); c.closePath(); c.fill();
      if (full) {
        c.strokeStyle = SEAM; c.lineWidth = Math.max(0.5, r * 0.025); c.stroke();
        // hinge pins
        c.fillStyle = '#1c222c';
        c.fillRect(bx + 0.02 * r, ly - 0.015 * r, 0.04 * r, 0.03 * r); c.fillRect(bx + bl - 0.06 * r, ly - 0.015 * r, 0.04 * r, 0.03 * r);
        c.strokeStyle = 'rgba(190,215,245,0.4)'; c.beginPath(); c.moveTo(bx, cy - bw / 2); c.lineTo(bx + bl, cy - bw / 2); c.stroke();
      }
    }
  };
})();
