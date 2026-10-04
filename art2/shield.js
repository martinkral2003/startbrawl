// Art2.shield: energy bubble (fresnel rim, hex cells, sweep), impact ripples, shatter + recharge animations.
(function () {
  const A = window.Art2 = window.Art2 || {};
  const TAU = Math.PI * 2, S3 = Math.sqrt(3);
  const RIP_T = 0.5, SHATTER_T = 0.6, RECH_T = 0.5, NSH = 12;
  const st = new Map();
  const HX = [], HY = [];
  for (let i = 0; i < 6; i++) { HX.push(Math.cos(i * TAU / 6)); HY.push(Math.sin(i * TAU / 6)); }

  const hex2 = n => ('0' + Math.max(0, Math.min(255, n | 0)).toString(16)).slice(-2);
  function blend(col, to, k) {
    const a = A.hex(col), b = A.hex(to);
    return '#' + hex2(a[0] + (b[0] - a[0]) * k) + hex2(a[1] + (b[1] - a[1]) * k) + hex2(a[2] + (b[2] - a[2]) * k);
  }
  function get(id) {
    let e = st.get(id);
    if (!e) {
      e = { pv: -1, rip: [], ri: 0, shT: -1, rcT: -1, age: 0, col: '', c: '#3a8cff', shA: new Float32Array(NSH), shS: new Float32Array(NSH), shR: new Float32Array(NSH) };
      for (let i = 0; i < 4; i++) e.rip.push({ a: 0, m: 0, t: -1 });
      st.set(id, e);
    }
    return e;
  }

  function hit(id, ang, mag) {
    const e = get(id), r = e.rip[e.ri]; e.ri = (e.ri + 1) & 3;
    r.a = ang; r.m = Math.max(0.3, Math.min(1.5, mag == null ? 1 : mag)); r.t = 0;
  }

  function update(dt) {
    for (const [id, e] of st) {
      let busy = false;
      for (let i = 0; i < 4; i++) { const r = e.rip[i]; if (r.t >= 0) { r.t += dt; if (r.t > RIP_T) r.t = -1; else busy = true; } }
      if (e.shT >= 0) { e.shT += dt; if (e.shT > SHATTER_T) e.shT = -1; else busy = true; }
      if (e.rcT >= 0) { e.rcT += dt; if (e.rcT > RECH_T) e.rcT = -1; else busy = true; }
      e.age += dt;
      if (!busy && e.age > 4) st.delete(id);
    }
  }

  function draw(ctx, s, t) {
    const e = get(s.id), L = s.lv ? s.lv[2] | 0 : 0;
    e.age = 0;
    const sh = L > 0 ? Math.max(0, Math.min(1, s.shf || 0)) : 0;
    if (e.pv > 0 && sh <= 0) {            // shield just broke
      e.shT = 0; e.rcT = -1;
      const r = A.rng((s.seed | 0) + (t * 1000 | 0));
      for (let i = 0; i < NSH; i++) { e.shA[i] = (i + r() * 0.8) / NSH * TAU; e.shS[i] = 0.5 + r() * 0.9; e.shR[i] = r() * TAU; }
    } else if (e.pv === 0 && sh > 0) { e.rcT = 0; e.shT = -1; }   // recharged
    e.pv = sh;
    if (sh <= 0 && e.shT < 0 && e.rcT < 0) return;

    if (e.col !== s.col) { e.col = s.col; e.c = blend(s.col || '#37c2ff', '#3a8cff', 0.6); }
    const R = (A.ship && A.ship.radius ? A.ship.radius(s.lv) : 18.75) * 1.6, sd = (s.seed | 0) % 97;
    const low = sh > 0 && sh < 0.3, c = e.c, hot = '#ff6a28';
    ctx.save();
    ctx.translate(s.x, s.y);

    if (sh > 0) {
      let f = 1;
      if (low) { f = 0.6 + 0.4 * Math.sin(t * 53 + sd) * Math.sin(t * 37); if (Math.sin(t * 23 + sd * 3) > 0.65) f *= 0.3; }
      const I = (0.5 + 0.17 * L) * (0.4 + 0.6 * sh) * f, rimW = 0.1 + 0.04 * L;
      // fresnel body: clear centre, rising alpha to the edge
      let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, A.rgba(c, 0)); g.addColorStop(0.55, A.rgba(c, 0.03 * I));
      g.addColorStop(1 - rimW, A.rgba(c, 0.2 * I)); g.addColorStop(1, A.rgba(low ? blend(c, hot, 0.5) : c, 0.6 * I));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      // thin bright rim line
      ctx.lineWidth = 0.8 + 0.4 * L; ctx.strokeStyle = A.rgba(blend(c, '#ffffff', 0.35), 0.55 * I);
      ctx.beginPath(); ctx.arc(0, 0, R - 0.5, 0, TAU); ctx.stroke();
      // hex cells, clipped, stronger near the rim
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
      const hc = low ? hot : blend(c, '#ffffff', 0.4);
      g = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R);
      g.addColorStop(0, A.rgba(hc, 0)); g.addColorStop(1, A.rgba(hc, 0.55 * I));
      ctx.strokeStyle = g; ctx.lineWidth = 0.8;
      ctx.rotate(t * 0.08 + sd);
      const h = R * 0.3, H = S3 * h, hr = h * 0.92;
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        const x = i * 1.5 * h, y = j * H + (i & 1 ? H / 2 : 0);
        if (Math.hypot(x, y) < R * 0.5) continue;
        ctx.moveTo(x + HX[0] * hr, y + HY[0] * hr);
        for (let k = 1; k < 6; k++) ctx.lineTo(x + HX[k] * hr, y + HY[k] * hr);
        ctx.closePath();
      }
      ctx.stroke(); ctx.restore();
      // sweeping highlight
      const sa = t * 1.1 + sd;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.5 + L; ctx.lineCap = 'round'; ctx.strokeStyle = A.rgba('#cfeaff', 0.35 * I);
      ctx.beginPath(); ctx.arc(0, 0, R - 1, sa, sa + 0.6); ctx.stroke(); ctx.restore();
      // impact ripples
      for (let i = 0; i < 4; i++) {
        const r = e.rip[i]; if (r.t < 0) continue;
        const u = r.t / RIP_T, fa = (1 - u) * (1 - u), span = 0.15 + u * 2.6;
        A.glow(ctx, Math.cos(r.a) * R, Math.sin(r.a) * R, R * (0.35 + 0.2 * r.m), A.rgba('#d8f0ff', 0.9), Math.min(1, fa * r.m));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.lineWidth = 2 + 2 * (1 - u); ctx.strokeStyle = A.rgba('#e8f6ff', Math.min(1, fa * 0.9 * r.m));
        ctx.beginPath(); ctx.arc(0, 0, R - 1, r.a + span - 0.35, r.a + span); ctx.moveTo(Math.cos(r.a - span) * (R - 1), Math.sin(r.a - span) * (R - 1)); ctx.arc(0, 0, R - 1, r.a - span, r.a - span + 0.35); ctx.stroke(); ctx.restore();
      }
    }

    // recharge pulse: ring contracting inward onto the rim
    if (e.rcT >= 0) {
      const u = e.rcT / RECH_T;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.5 * (1 - u) + 1;
      ctx.strokeStyle = A.rgba(blend(c, '#ffffff', 0.5), Math.sin(u * Math.PI) * 0.8);
      ctx.beginPath(); ctx.arc(0, 0, R * (1.6 - 0.6 * u), 0, TAU); ctx.stroke(); ctx.restore();
      if (u > 0.6) A.glow(ctx, 0, 0, R * 1.2, A.rgba(c, 0.5), (u - 0.6) * 1.5 * (1 - u) * 2);
    }
    // shatter: flash + expanding ring + hex shards
    if (e.shT >= 0) {
      const u = e.shT / SHATTER_T, fa = 1 - u;
      if (u < 0.4) A.glow(ctx, 0, 0, R * 1.5, A.rgba('#e8f6ff', 0.9), (1 - u / 0.4) * 0.9);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 3 * fa + 0.5; ctx.strokeStyle = A.rgba(c, fa * 0.7);
      ctx.beginPath(); ctx.arc(0, 0, R * (1 + u * 0.6), 0, TAU); ctx.stroke();
      ctx.fillStyle = A.rgba(blend(c, '#ffffff', 0.5), fa * fa);
      ctx.beginPath();
      for (let i = 0; i < NSH; i++) {
        const d = R * (0.9 + u * 1.1 * e.shS[i]), x = Math.cos(e.shA[i]) * d, y = Math.sin(e.shA[i]) * d, sz = R * 0.11 * (1 - u * 0.5), rot = e.shR[i] + u * 4 * e.shS[i];
        for (let k = 0; k < 6; k++) { const px = x + Math.cos(rot + k * TAU / 6) * sz, py = y + Math.sin(rot + k * TAU / 6) * sz; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.closePath();
      }
      ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }

  A.shield = { draw, hit, update };
})();
