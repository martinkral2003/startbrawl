// Art2 effects: preallocated particle pool (explosions, sparks, death, shockwave, dash trail, emp, repair)
// plus stateless area visuals (mine field, gravity well). Additive light for fire/energy, shaded debris.
(function () {
  const A = window.Art2 = window.Art2 || {};
  const TAU = Math.PI * 2, CAP = 400;
  const K = { FIRE: 0, SMOKE: 1, SPARK: 2, RING: 3, DEB: 4, GLOW: 5, GHOST: 6, LINE: 7, ARC: 8, PLUS: 9, FLASH: 10 };
  const pool = []; let live = 0, hint = 0;
  for (let i = 0; i < CAP; i++) pool.push({ on: false, k: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, s: 1, s2: 1, rot: 0, vr: 0, drag: 0, grow: 0, n: 0, hz: 0, r: 255, g: 255, b: 255, a: 1, seed: 0, c0: '', c1: '', c2: '', v: new Float32Array(6) });
  const R = Math.random, rr = (a, b) => a + (b - a) * R();
  const hash = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let FR = 255, FG = 255, FB = 255;
  function fcol(u) { // fire colour by age: white-yellow -> orange -> dark red
    if (u < 0.3) { const t = u / 0.3; FR = 255; FG = lerp(245, 170, t); FB = lerp(190, 60, t); }
    else if (u < 0.7) { const t = (u - 0.3) / 0.4; FR = lerp(255, 210, t); FG = lerp(170, 70, t); FB = lerp(60, 20, t); }
    else { const t = (u - 0.7) / 0.3; FR = lerp(210, 100, t); FG = lerp(70, 28, t); FB = lerp(20, 14, t); }
  }
  function alloc(k, x, y, vx, vy, life, s, delay) {
    if (live >= CAP) return null;
    for (let i = 0; i < CAP; i++) {
      const j = (hint + i) % CAP, p = pool[j];
      if (p.on) continue;
      hint = (j + 1) % CAP; live++;
      p.on = true; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.age = -(delay || 0); p.life = life; p.s = s; p.s2 = s;
      p.rot = 0; p.vr = 0; p.drag = 0; p.grow = 0; p.n = 0; p.hz = 0; p.r = 255; p.g = 255; p.b = 255; p.a = 1; p.seed = R() * 1000;
      return p;
    }
    return null;
  }
  function col(p, hex, dr, dg, db) { if (typeof hex === 'string' && hex.length === 7) { const c = A.hex(hex); p.r = c[0]; p.g = c[1]; p.b = c[2]; } else { p.r = dr; p.g = dg; p.b = db; } }
  function fire(x, y, s, life, delay, vx, vy, a) { const p = alloc(K.FIRE, x, y, vx || 0, vy || 0, life, s, delay); if (p) { p.a = a || 0.9; p.drag = 2; } }
  function flash(x, y, s, life, delay) { alloc(K.FLASH, x, y, 0, 0, life, s, delay); }
  function smoke(x, y, s, life, delay) { const p = alloc(K.SMOKE, x, y, rr(-14, 14), rr(-14, 14), life, s, delay); if (p) { p.a = 0.55; p.drag = 1.2; p.grow = s * 0.25; } }
  function sparks(x, y, n, sp, delay, hex, ang, spread) {
    for (let i = 0; i < n; i++) {
      const a = ang === undefined ? R() * TAU : ang + (R() - 0.5) * spread, v = sp * rr(0.35, 1);
      const p = alloc(K.SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v, rr(0.25, 0.7) * (sp > 150 ? 1 : 0.6), rr(1, 2), delay);
      if (p) { p.drag = 2.2; if (hex) { p.n = 1; col(p, hex, 255, 240, 200); } }
    }
  }
  function ring(x, y, rad, life, delay, hex, a, amp, lobes, hz) {
    const p = alloc(K.RING, x, y, 0, 0, life, 3, delay); if (!p) return;
    p.s2 = rad; p.a = a; p.grow = amp || 0; p.n = lobes || 5; p.hz = hz || 0; col(p, hex, 255, 190, 110);
  }
  const SIZES = { small: [22, 3, 2, 7, 0.7], medium: [40, 6, 4, 12, 1], large: [68, 10, 7, 20, 1.3] };

  function explosion(x, y, o) {
    const z = SIZES[o.size] || SIZES.medium, S = z[0];
    flash(x, y, S * 1.3, 0.3, 0);
    for (let i = 0; i < z[1]; i++) { const a = R() * TAU, d = R() * S * 0.5; fire(x + Math.cos(a) * d, y + Math.sin(a) * d, S * rr(0.5, 0.95), rr(0.45, 0.85) * z[4], i * 0.025, Math.cos(a) * 18, Math.sin(a) * 18); }
    for (let i = 0; i < z[2]; i++) { const a = R() * TAU, d = R() * S * 0.5; smoke(x + Math.cos(a) * d, y + Math.sin(a) * d, S * rr(0.5, 0.9), rr(1.2, 2.2), 0.12 + i * 0.05); }
    sparks(x, y, z[3], S * 5, 0);
    ring(x, y, S * 2.2, 0.5 * z[4] + 0.2, 0, '#ffb070', 0.7, 0.04, 5, 0);
  }
  function death(x, y, o) {
    const c = o.col || '#ffa050', S = 34;
    flash(x, y, 60, 0.4, 0);
    for (let i = 0; i < 6; i++) { const a = R() * TAU, d = R() * 14; fire(x + Math.cos(a) * d, y + Math.sin(a) * d, S * rr(0.6, 1), rr(0.5, 0.9), i * 0.02, Math.cos(a) * 30, Math.sin(a) * 30); }
    sparks(x, y, 16, 260, 0);
    for (let st = 1; st <= 2; st++) {
      const ox = x + rr(-22, 22), oy = y + rr(-22, 22), d = 0.1 + st * 0.13;
      flash(ox, oy, 44, 0.3, d);
      for (let i = 0; i < 4; i++) fire(ox + rr(-10, 10), oy + rr(-10, 10), rr(22, 34), rr(0.45, 0.8), d + i * 0.03, rr(-25, 25), rr(-25, 25));
      sparks(ox, oy, 6, 200, d);
    }
    flash(x, y, 90, 0.5, 0.42);
    for (let i = 0; i < 6; i++) { const a = R() * TAU, d = R() * 22; fire(x + Math.cos(a) * d, y + Math.sin(a) * d, rr(40, 62), rr(0.7, 1.2), 0.42 + i * 0.03, Math.cos(a) * 25, Math.sin(a) * 25); }
    for (let i = 0; i < 7; i++) smoke(x + rr(-25, 25), y + rr(-25, 25), rr(34, 55), rr(1.6, 2.6), 0.5 + i * 0.05);
    ring(x, y, 150, 1.4, 0.05, '#ffe0b0', 0.8, 0.05, 7, 1);
    ring(x, y, 105, 1, 0.15, c, 0.55, 0.06, 4, 0);
    const g = alloc(K.GLOW, x, y, 0, 0, 1.9, 95, 0.15); if (g) { g.a = 0.55; col(g, c, 255, 150, 70); g.r = lerp(g.r, 255, 0.4); g.g = lerp(g.g, 160, 0.5); g.b = lerp(g.b, 90, 0.3); }
    const sc = A.hex(A.STEEL), cc = typeof c === 'string' && c.length === 7 ? A.hex(c) : sc;
    const tr = lerp(sc[0], cc[0], 0.2) | 0, tg = lerp(sc[1], cc[1], 0.2) | 0, tb = lerp(sc[2], cc[2], 0.2) | 0;
    const hx = '#' + [tr, tg, tb].map(v => (v < 16 ? '0' : '') + v.toString(16)).join('');
    for (let i = 0; i < 12; i++) {
      const a = R() * TAU, v = rr(40, 170), p = alloc(K.DEB, x, y, Math.cos(a) * v, Math.sin(a) * v, rr(1.4, 2.4), rr(3, 8), 0.02);
      if (!p) continue;
      p.drag = 1.1; p.rot = R() * TAU; p.vr = rr(-9, 9); p.r = tr; p.g = tg; p.b = tb;
      for (let k = 0; k < 5; k++) p.v[k] = rr(0.5, 1.1);
      p.c0 = A.mix(hx, 0.3); p.c1 = A.mix(hx, -0.2); p.c2 = A.mix(hx, -0.6);
    }
  }
  function dashTrail(x, y, o) {
    const a = o.ang || 0, cx = Math.cos(a), cy = Math.sin(a), hex = o.col || '#4da3ff';
    for (let i = 0; i < 3; i++) {
      const p = alloc(K.GHOST, x - cx * i * 9, y - cy * i * 9, 0, 0, 0.28 + i * 0.04, 13 - i * 1.5, 0); if (!p) break;
      p.rot = a; p.a = 0.55 - i * 0.1; col(p, hex, 120, 190, 255); p.r = lerp(p.r, 255, 0.3); p.g = lerp(p.g, 255, 0.3); p.b = lerp(p.b, 255, 0.3);
    }
    for (let i = 0; i < 3; i++) {
      const off = rr(-10, 10), p = alloc(K.LINE, x - cx * rr(4, 20) - cy * off, y - cy * rr(4, 20) + cx * off, -cx * 40, -cy * 40, rr(0.18, 0.32), 1.2, 0); if (!p) break;
      p.rot = a; p.s2 = rr(22, 46); p.a = 0.8; col(p, hex, 150, 200, 255); p.r = lerp(p.r, 255, 0.5); p.g = lerp(p.g, 255, 0.5); p.b = lerp(p.b, 255, 0.5);
    }
  }
  function emp(x, y, o) {
    const rad = o.r || 80;
    ring(x, y, rad, 0.6, 0, '#9fd0ff', 0.35, 0.02, 9, 0);
    const g = alloc(K.GLOW, x, y, 0, 0, 0.6, rad * 0.9, 0); if (g) { g.a = 0.3; g.r = 90; g.g = 150; g.b = 255; }
    for (let i = 0; i < 14; i++) {
      const p = alloc(K.ARC, x, y, 0, 0, rr(0.16, 0.3), rr(0.5, 1.3), rr(0, 0.42)); if (!p) break;
      p.s2 = rad; p.rot = R() * TAU; p.a = 1;
    }
  }
  function repair(x, y, o) {
    const rad = o.r || 18;
    for (let i = 0; i < 8; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * rad, p = alloc(K.PLUS, x + Math.cos(a) * d, y + Math.sin(a) * d, 0, rr(-48, -24), rr(0.8, 1.4), rr(2.5, 5), R() * 0.35); if (!p) break;
      p.r = 120; p.g = 255; p.b = 170;
    }
  }
  function spark(x, y, o) {
    flash(x, y, 9, 0.1, 0);
    sparks(x, y, 5, 260, 0, o.col, o.ang, o.ang === undefined ? 0 : 1.6);
  }
  function shockwave(x, y, o) {
    ring(x, y, o.r || 120, 0.7, 0, '#bff4ff', 0.9, 0.05, 6, 1);
    ring(x, y, (o.r || 120) * 0.7, 0.5, 0.05, '#5fd8ff', 0.4, 0.04, 4, 0);
  }
  const KINDS = { explosion, spark, death, shockwave, dashTrail, emp, repair };

  function ringPath(c, x, y, rad, amp, lobes, ph) {
    c.beginPath();
    for (let i = 0; i <= 36; i++) { const a = i / 36 * TAU, q = rad * (1 + amp * Math.sin(a * lobes + ph)); if (i) c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else c.moveTo(x + q, y); }
  }
  function puff(c, x, y, r, cr, cg, cb, a, mid) {
    const g = c.createRadialGradient(x, y, 0, x, y, r), b = `${cr | 0},${cg | 0},${cb | 0}`;
    g.addColorStop(0, `rgba(${b},${a})`); g.addColorStop(0.5, `rgba(${b},${a * mid})`); g.addColorStop(1, `rgba(${b},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  const fx = A.fx = {
    spawn(kind, x, y, opts) { const f = KINDS[kind]; if (f) f(x, y, opts || {}); },
    update(dt) {
      if (dt > 0.1) dt = 0.1;
      for (let i = 0; i < CAP; i++) {
        const p = pool[i]; if (!p.on) continue;
        p.age += dt;
        if (p.age >= p.life) { p.on = false; live--; continue; }
        if (p.age < 0) continue;
        if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.grow) p.s += p.grow * dt;
      }
    },
    clear() { for (let i = 0; i < CAP; i++) pool[i].on = false; live = 0; hint = 0; },
    count() { return live; },
    draw(c) {
      if (!live) return;
      c.save();
      for (let i = 0; i < CAP; i++) { // pass 1: normal composite (smoke, shaded debris)
        const p = pool[i]; if (!p.on || p.age < 0) continue;
        const u = p.age / p.life;
        if (p.k === K.SMOKE) {
          const w = 1 - Math.min(1, u * 3);
          puff(c, p.x, p.y, p.s * (0.6 + 0.6 * u), 28 + w * 45, 26 + w * 22, 30 + w * 8, p.a * Math.min(1, u * 8) * (1 - u), 0.6);
        } else if (p.k === K.DEB) {
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, (1 - u) * 3);
          c.fillStyle = A.litGrad(c, p.rot, p.s, p.c0, p.c1, p.c2);
          c.beginPath();
          for (let k = 0; k < 5; k++) { const a = k / 5 * TAU, q = p.s * p.v[k]; if (k) c.lineTo(Math.cos(a) * q, Math.sin(a) * q); else c.moveTo(q, 0); }
          c.closePath(); c.fill(); c.strokeStyle = 'rgba(10,12,16,0.7)'; c.lineWidth = 0.7; c.stroke(); c.restore();
        }
      }
      c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 0; i < CAP; i++) { // pass 2: additive light
        const p = pool[i]; if (!p.on || p.age < 0) continue;
        const u = p.age / p.life, iu = 1 - u;
        switch (p.k) {
          case K.FIRE: fcol(u); puff(c, p.x, p.y, p.s * (0.5 + 0.9 * Math.sqrt(u)), FR, FG, FB, p.a * iu, 0.55); break;
          case K.FLASH: puff(c, p.x, p.y, p.s * (0.6 + 0.6 * u), 255, 240, 180, iu * iu, 0.55); break;
          case K.GLOW: puff(c, p.x, p.y, p.s * (1 + 0.3 * u), p.r, p.g, p.b, p.a * Math.pow(iu, 1.5), 0.4); break;
          case K.SPARK: {
            if (p.n) { FR = p.r; FG = p.g; FB = p.b; } else fcol(u * 0.9 + 0.05);
            c.strokeStyle = `rgba(${FR | 0},${FG | 0},${FB | 0},${iu})`; c.lineWidth = p.s * (1.2 - 0.5 * u);
            c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); c.stroke(); break;
          }
          case K.DEB: if (u < 0.35) puff(c, p.x, p.y, p.s * 2.2, 255, 150, 60, (0.35 - u) * 1.2, 0.4); break;
          case K.RING: {
            const e = 1 - Math.pow(iu, 3), rad = p.s2 * e, ph = p.seed + u * 2, amp = p.grow * (0.4 + e);
            if (p.hz) { // faint inner haze
              const g = c.createRadialGradient(p.x, p.y, rad * 0.4, p.x, p.y, rad);
              g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(1, `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${0.12 * p.a * iu})`);
              c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rad, 0, TAU); c.fill();
            }
            const cs = `${p.r | 0},${p.g | 0},${p.b | 0}`;
            ringPath(c, p.x, p.y, rad * 0.94, amp, p.n, ph); c.strokeStyle = `rgba(${cs},${0.3 * p.a * iu})`; c.lineWidth = 2 + 8 * iu; c.stroke();
            ringPath(c, p.x, p.y, rad, amp, p.n, ph); c.strokeStyle = `rgba(255,255,255,${p.a * iu})`; c.lineWidth = 0.8 + 2.4 * iu; c.stroke();
            break;
          }
          case K.GHOST:
            c.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${p.a * iu * 0.6})`;
            c.beginPath(); c.ellipse(p.x, p.y, p.s * (1 + 0.3 * u), p.s * 0.5 * iu, p.rot, 0, TAU); c.fill(); break;
          case K.LINE: {
            const l = p.s2 * (1 - 0.4 * u), cx = Math.cos(p.rot), cy = Math.sin(p.rot);
            c.strokeStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${p.a * iu})`; c.lineWidth = p.s;
            c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - cx * l, p.y - cy * l); c.stroke(); break;
          }
          case K.ARC: {
            const step = Math.floor(p.age * 40), fl = 0.6 + 0.4 * hash(p.seed + step), sd = p.seed + step * 7.7;
            c.beginPath();
            for (let k = 0; k <= 7; k++) {
              const a = p.rot + p.s * k / 7, q = p.s2 * (1 + (k && k < 7 ? (hash(sd + k * 3.1) - 0.5) * 0.24 : 0));
              if (k) c.lineTo(p.x + Math.cos(a) * q, p.y + Math.sin(a) * q); else c.moveTo(p.x + Math.cos(a) * q, p.y + Math.sin(a) * q);
            }
            c.strokeStyle = `rgba(80,150,255,${0.35 * fl * iu})`; c.lineWidth = 4; c.stroke();
            c.strokeStyle = `rgba(225,242,255,${fl * iu})`; c.lineWidth = 1.2; c.stroke(); break;
          }
          case K.PLUS: {
            const a = Math.sin(Math.PI * u), x = p.x + Math.sin(p.age * 5 + p.seed) * 3, y = p.y, s = p.s;
            puff(c, x, y, s * 2.4, 90, 255, 140, 0.35 * a, 0.4);
            c.strokeStyle = `rgba(190,255,205,${a})`; c.lineWidth = 1.2;
            c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); break;
          }
        }
      }
      c.restore();
    },
    mineField(c, m, t) {
      const f = Math.min(1, (10 - m.life) / 0.4, m.life / 2); if (f <= 0) return;
      const x = m.x, y = m.y, r = m.r, sd = (x * 7.3 + y * 13.1) | 0;
      c.save();
      const g = c.createRadialGradient(x, y, r * 0.3, x, y, r);
      g.addColorStop(0, 'rgba(120,20,20,0)'); g.addColorStop(0.8, `rgba(150,30,30,${0.06 * f})`); g.addColorStop(1, `rgba(220,60,50,${0.2 * f})`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.strokeStyle = `rgba(255,90,80,${0.35 * f})`; c.lineWidth = 1.2; c.stroke();
      c.setLineDash(DASH); c.lineDashOffset = -t * 14; c.strokeStyle = `rgba(255,140,120,${0.3 * f})`; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, r * 0.97, 0, TAU); c.stroke(); c.setLineDash(NODASH);
      const n = Math.max(10, Math.min(26, Math.round(r / 8)));
      for (let i = 0; i < n; i++) {
        const a = hash(sd + i * 2) * TAU, d = Math.sqrt(hash(sd + i * 2 + 1)) * r * 0.88;
        const mx = x + Math.cos(a) * d + Math.sin(t * 0.8 + i) * 1.5, my = y + Math.sin(a) * d + Math.cos(t * 0.7 + i * 1.3) * 1.5;
        c.globalAlpha = f;
        c.strokeStyle = '#1a1f27'; c.lineWidth = 1.2; c.beginPath();
        for (let k = 0; k < 4; k++) { const q = k * TAU / 4 + 0.4; c.moveTo(mx + Math.cos(q) * 3.5, my + Math.sin(q) * 3.5); c.lineTo(mx + Math.cos(q) * 6, my + Math.sin(q) * 6); }
        c.stroke();
        c.fillStyle = '#2a313b'; c.beginPath(); c.arc(mx, my, 4, 0, TAU); c.fill();
        c.fillStyle = '#69758a'; c.beginPath(); c.arc(mx - 1.2, my - 1.4, 2, 0, TAU); c.fill();
        c.fillStyle = '#15191f'; c.beginPath(); c.arc(mx + 1.3, my + 1.5, 1.7, 0, TAU); c.fill();
        if (Math.sin(t * 3.2 + i * 1.7) > 0.45) {
          c.globalAlpha = 1; c.fillStyle = `rgba(255,70,55,${f})`; c.beginPath(); c.arc(mx, my, 1.6, 0, TAU); c.fill();
          A.glow(c, mx, my, 8, 'rgba(255,50,40,0.8)', 0.6 * f);
        }
      }
      c.restore();
    },
    gravityWell(c, w, t) {
      const f = Math.min(1, (4 - w.life) / 0.5, w.life / 0.8); if (f <= 0) return;
      const x = w.x, y = w.y, r = w.r, gr = w.gr, span = gr - r;
      c.save(); c.lineCap = 'round';
      A.glow(c, x, y, gr, 'rgba(140,90,255,0.35)', 0.5 * f);
      A.glow(c, x, y, gr * 0.4, 'rgba(230,215,255,0.3)', 0.4 * f);
      c.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 3; arm++) { // spiral arms
        c.beginPath();
        for (let k = 0; k <= 26; k++) { const q = k / 26, d = r + span * Math.pow(1 - q, 1.6), a = arm * TAU / 3 + t * 0.9 + q * 5; if (k) c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); else c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
        c.strokeStyle = `rgba(190,160,255,${0.2 * f})`; c.lineWidth = 1.5; c.stroke();
      }
      for (let i = 0; i < 4; i++) { // contracting lensing rings
        const p = (t * 0.35 + i / 4) % 1, d = r + span * (1 - p) * (1 - p * 0.3), al = Math.sin(Math.PI * p) * 0.4 * f, a0 = t * 1.6 + i * 1.9;
        c.strokeStyle = `rgba(210,190,255,${al})`; c.lineWidth = 1 + 2 * (1 - p);
        c.beginPath(); c.arc(x, y, d, a0, a0 + 3.4 - p * 1.5); c.stroke();
        c.strokeStyle = `rgba(150,110,255,${al * 0.5})`; c.lineWidth = 1;
        c.beginPath(); c.arc(x, y, d * 1.04, a0 + 0.3, a0 + 5); c.stroke();
      }
      for (let i = 0; i < 24; i++) { // in-falling dust motes as short arcs
        const h1 = hash(i * 3.7 + 1), h2 = hash(i * 5.3 + 2), p = (t * 0.22 * (0.6 + h1) + h2) % 1;
        const d = r + span * Math.pow(1 - p, 1.4), a = h1 * TAU + p * p * 4 + t * 0.3, len = (0.12 + 0.5 * p) * (r + 20) / d;
        c.strokeStyle = `rgba(235,225,255,${Math.sin(Math.PI * p) * 0.7 * f})`; c.lineWidth = 0.8 + p;
        c.beginPath(); c.arc(x, y, d, a, a + len); c.stroke();
      }
      c.globalCompositeOperation = 'source-over';
      const g = c.createRadialGradient(x, y, 0, x, y, r * 1.1);
      g.addColorStop(0, `rgba(0,0,0,${0.97 * f})`); g.addColorStop(0.75, `rgba(8,2,18,${0.95 * f})`); g.addColorStop(1, `rgba(40,15,80,${0.5 * f})`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.1, 0, TAU); c.fill();
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(190,150,255,${0.25 * f})`; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r * 1.05, 0, TAU); c.stroke();
      c.strokeStyle = `rgba(240,230,255,${0.8 * f})`; c.lineWidth = 1.4; c.stroke();
      const a0 = t * 2.2; c.strokeStyle = `rgba(255,255,255,${0.9 * f})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * 1.05, a0, a0 + 1.1); c.stroke();
      c.restore();
    }
  };
  const DASH = [8, 10], NODASH = [];
})();
