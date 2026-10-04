// Art2 projectiles: sprite-cached, cheap per-frame (drawImage + a few animated ops). Local frame: +x = direction of travel.
(function () {
  const A = window.Art2 = window.Art2 || {};
  const TAU = Math.PI * 2, SC = 2, cache = new Map();
  const HX = /^#[0-9a-fA-F]{6}$/;

  // spr(key, w, h, ox, oy, fn): offscreen sprite (logical w x h, origin at ox,oy), built once.
  function spr(key, w, h, ox, oy, fn) {
    let s = cache.get(key);
    if (!s) {
      const c = document.createElement('canvas'); c.width = w * SC; c.height = h * SC;
      const g = c.getContext('2d'); g.scale(SC, SC); g.translate(ox, oy); fn(g);
      s = { c, w, h, ox, oy }; cache.set(key, s);
    }
    return s;
  }
  // put(ctx, sprite, sx, sy, alpha, dx, dy)
  function put(g, s, sx, sy, a, dx, dy) {
    g.globalAlpha = a; g.drawImage(s.c, dx - s.ox * sx, dy - s.oy * sy, s.w * sx, s.h * sy);
  }
  const rgba = (h, a) => A.rgba(h, a);
  const col = c => HX.test(c || '') ? c : '#37c2ff';
  const lg = (g, x0, y0, x1, y1, stops) => { const r = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < stops.length; i += 2) r.addColorStop(stops[i], stops[i + 1]); return r; };

  const glowS = c => spr('g' + c, 32, 32, 16, 16, g => {
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    r.addColorStop(0, c); r.addColorStop(0.35, rgba(c, 0.45)); r.addColorStop(1, rgba(c, 0));
    g.fillStyle = r; g.fillRect(-16, -16, 32, 32);
  });
  const puffS = () => spr('puff', 16, 16, 8, 8, g => {
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 8);
    r.addColorStop(0, 'rgba(120,122,132,0.6)'); r.addColorStop(1, 'rgba(60,62,70,0)');
    g.fillStyle = r; g.fillRect(-8, -8, 16, 16);
  });
  // flame extending towards -x from the origin
  const flameS = () => spr('flame', 26, 10, 26, 5, g => {
    g.fillStyle = lg(g, -26, 0, 0, 0, [0, 'rgba(255,90,20,0)', 0.55, 'rgba(255,150,40,0.85)', 1, '#fff4cc']);
    g.beginPath(); g.moveTo(0, -3); g.quadraticCurveTo(-12, -3, -26, 0); g.quadraticCurveTo(-12, 3, 0, 3); g.fill();
  });

  // ---- k1 laser bolt
  const laserS = c => spr('1' + c, 54, 20, 34, 10, g => {
    g.lineCap = 'round';
    g.strokeStyle = lg(g, -32, 0, -8, 0, [0, rgba(c, 0), 1, rgba(c, 0.6)]); g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(-32, 0); g.lineTo(-8, 0); g.stroke();
    [[10, 0.16, c], [6.5, 0.4, c], [4, 0.9, A.mix(c, 0.5)]].forEach(o => {
      g.strokeStyle = o[2] === c ? rgba(c, o[1]) : o[2]; g.lineWidth = o[0];
      g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.stroke();
    });
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.stroke();
  });

  // ---- k2 missile body
  const missileS = c => spr('2' + c, 30, 18, 18, 9, g => {
    g.fillStyle = '#6b788c'; g.beginPath(); g.moveTo(-3, -2.4); g.lineTo(-9, -7); g.lineTo(-10, -2.4); g.fill();
    g.fillStyle = '#272d39'; g.beginPath(); g.moveTo(-3, 2.4); g.lineTo(-9, 7); g.lineTo(-10, 2.4); g.fill();
    g.fillStyle = lg(g, 0, -2.4, 0, 2.4, [0, '#d4dce8', 0.5, '#7d8aa0', 1, '#2f3745']);
    g.beginPath(); g.moveTo(-8, -2.4); g.lineTo(3, -2.4); g.quadraticCurveTo(8, -2, 11, 0); g.quadraticCurveTo(8, 2, 3, 2.4); g.lineTo(-8, 2.4); g.fill();
    g.fillStyle = c; g.fillRect(-1.5, -2.4, 2, 4.8);
    g.fillStyle = '#15181d'; g.fillRect(-9.5, -1.8, 2, 3.6);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(3.5, -2.3); g.lineTo(3.5, 2.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.moveTo(-6, -1.5); g.lineTo(3, -1.5); g.stroke();
  });

  // ---- k3 kamikaze drone
  const droneS = c => spr('3' + c, 24, 24, 12, 12, g => {
    [[-1, '#566175'], [1, '#2b323f']].forEach(o => {
      const s = o[0]; g.fillStyle = o[1]; g.beginPath(); g.moveTo(3, s * 2); g.lineTo(-3, s * 10); g.lineTo(-6.5, s * 10); g.lineTo(-4, s * 2); g.fill();
      g.strokeStyle = rgba(c, 0.85); g.lineWidth = 0.8; g.beginPath(); g.moveTo(3, s * 2); g.lineTo(-3, s * 10); g.stroke();
    });
    g.fillStyle = lg(g, 0, -3, 0, 3, [0, '#aeb9ca', 0.5, '#5a6679', 1, '#222831']);
    g.beginPath(); g.ellipse(0, 0, 5.8, 3.1, 0, 0, TAU); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(4.2, 0, 1.2, 0, TAU); g.fill();
    g.fillStyle = '#12151a'; g.fillRect(-6.5, -1.8, 2, 3.6);
  });

  // ---- k4 torpedo warhead
  const torpS = c => spr('4' + c, 42, 26, 26, 13, g => {
    g.fillStyle = '#6b788c'; g.beginPath(); g.moveTo(-4, -5); g.lineTo(-12, -10.5); g.lineTo(-13, -4.5); g.fill();
    g.fillStyle = '#272d39'; g.beginPath(); g.moveTo(-4, 5); g.lineTo(-12, 10.5); g.lineTo(-13, 4.5); g.fill();
    g.fillStyle = lg(g, 0, -5, 0, 5, [0, '#cbd4e2', 0.5, '#6c7890', 1, '#242a36']);
    g.beginPath(); g.moveTo(-10, -4.5); g.lineTo(0, -5); g.quadraticCurveTo(8, -4, 12, 0); g.quadraticCurveTo(8, 4, 0, 5); g.lineTo(-10, 4.5); g.fill();
    g.fillStyle = c; g.fillRect(-3.5, -4.9, 2, 9.8);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(-7, -4.7, 0.8, 9.4);
    g.fillStyle = '#12151a'; g.fillRect(-13, -3, 3, 6);
  });

  // ---- k5 plasma
  const plasmaS = () => spr('5', 42, 22, 32, 11, g => {
    g.fillStyle = lg(g, -30, 0, 0, 0, [0, 'rgba(255,70,20,0)', 1, 'rgba(255,120,30,0.65)']);
    g.beginPath(); g.moveTo(0, -4.5); g.lineTo(-30, 0); g.lineTo(0, 4.5); g.fill();
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 10);
    r.addColorStop(0, '#fff4c0'); r.addColorStop(0.3, '#ffb040'); r.addColorStop(0.65, 'rgba(255,70,20,0.7)'); r.addColorStop(1, 'rgba(255,40,10,0)');
    g.fillStyle = r; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
  });

  // ---- k6 meteor (6 pre-shaded variants, lit from the top-left in world space)
  const rockS = v => spr('r' + v, 32, 32, 16, 16, g => {
    const rnd = A.rng(v * 977 + 13), n = 9, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + (rnd() - 0.5) * 0.4, r = 7.5 + rnd() * 4; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    g.fillStyle = A.litGrad(g, 0, 11, '#9a8a78', '#54483e', '#1d1815'); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 3; i++) {
      const x = (rnd() - 0.5) * 9, y = (rnd() - 0.5) * 9, r = 1.5 + rnd() * 2;
      g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,230,200,0.14)'; g.lineWidth = 0.6; g.beginPath(); g.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.7); g.stroke();
    }
    g.strokeStyle = 'rgba(255,120,30,0.8)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(-5 + rnd() * 3, -3); g.lineTo(0, rnd() * 4); g.lineTo(5, 3 + rnd() * 2); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; g.stroke();
  });
  const fireS = () => spr('fire', 52, 26, 52, 13, g => {
    g.fillStyle = lg(g, -52, 0, 0, 0, [0, 'rgba(160,30,10,0)', 0.5, 'rgba(255,90,20,0.55)', 1, 'rgba(255,200,90,0.95)']);
    g.beginPath(); g.moveTo(0, -9); g.quadraticCurveTo(-24, -8, -52, 0); g.quadraticCurveTo(-24, 8, 0, 9); g.fill();
  });

  // ---- k7 railgun beam (head at x=0, tail 92 units behind)
  const railS = c => spr('7' + c, 108, 28, 96, 14, g => {
    g.fillStyle = lg(g, -92, 0, 0, 0, [0, rgba(c, 0), 1, rgba(c, 0.16)]); g.fillRect(-92, -6, 92, 12);
    g.fillStyle = lg(g, -92, 0, 0, 0, [0, 'rgba(120,184,255,0)', 1, 'rgba(120,184,255,0.3)']); g.fillRect(-92, -3, 92, 6);
    g.fillStyle = lg(g, -92, 0, 0, 0, [0, 'rgba(223,240,255,0)', 0.7, 'rgba(223,240,255,0.9)', 1, '#fff']); g.fillRect(-92, -1.1, 94, 2.2);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 11);
    r.addColorStop(0, '#fff'); r.addColorStop(0.3, 'rgba(190,225,255,0.7)'); r.addColorStop(1, 'rgba(120,184,255,0)');
    g.fillStyle = r; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
    g.fillStyle = 'rgba(220,240,255,0.7)'; g.fillRect(-4, -0.5, 14, 1); g.fillRect(-0.5, -7, 1, 14);
  });

  const SIZE = { 1: 14, 2: 12, 3: 9, 4: 16, 5: 8, 6: 12, 7: 92 };
  const W = A.weapons = A.weapons || {};
  W.size = k => SIZE[k] || 10;

  W.draw = function (ctx, p, t) {
    const k = p.k, c = col(p.col), ang = (p.vx || p.vy) ? Math.atan2(p.vy, p.vx) : 0;
    const fl = 0.8 + 0.2 * Math.sin(t * 38 + p.x * 0.3 + p.y * 0.17);
    ctx.save(); ctx.translate(p.x, p.y);
    if (k === 6) {
      const v = Math.abs(Math.round((p.vx || 0) * 13.7 + (p.vy || 0) * 7.3)) % 6, pu = puffS(), gl = glowS('#ff7a20');
      ctx.rotate(ang);
      for (let i = 0; i < 3; i++) put(ctx, pu, 0.9 + i * 0.5, 0.9 + i * 0.5, 0.5 - i * 0.12, -16 - i * 9, Math.sin(t * 7 + i * 2) * 2);
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, fireS(), 0.7 + 0.3 * fl, 1, 0.9, 0, 0);
      put(ctx, gl, 0.9, 0.9, 0.5 * fl, 5, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(-ang); put(ctx, rockS(v), 1, 1, 1, 0, 0); ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, gl, 0.6, 0.6, 0.55 * fl, 7, 0);
    } else if (k === 7) {
      ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
      put(ctx, railS(c), 1, 1, 0.82 + 0.18 * Math.sin(t * 45 + p.x), 0, 0);
    } else if (k === 1) {
      ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
      put(ctx, laserS(c), 1, 1, 1, 0, 0);
    } else if (k === 5) {
      ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
      const s = 1 + 0.1 * Math.sin(t * 22 + p.x * 0.2);
      put(ctx, plasmaS(), s, s, 1, 0, 0);
    } else if (k === 2) {
      ctx.rotate(ang);
      const pu = puffS();
      for (let i = 0; i < 5; i++) put(ctx, pu, 0.5 + i * 0.25, 0.5 + i * 0.25, 0.7 - i * 0.12, -12 - i * 7, Math.sin(t * 9 + i * 1.7) * i * 0.6);
      put(ctx, missileS(c), 1, 1, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, flameS(), 0.55 + 0.45 * fl, 0.9, 1, -9, 0);
      put(ctx, glowS('#ff8a30'), 0.8, 0.8, 0.7 * fl, -10, 0);
    } else if (k === 3) {
      ctx.rotate(ang);
      put(ctx, droneS(c), 1, 1, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, glowS('#ff9a40'), 0.45, 0.45, 0.5 + 0.4 * fl, -7, 0);
      if (((t * 5 + p.x * 0.01) % 1 + 1) % 1 < 0.3) {
        put(ctx, glowS('#ff2a2a'), 0.55, 0.55, 1, 1, -0.5);
        ctx.globalAlpha = 1; ctx.fillStyle = '#ff6060'; ctx.fillRect(0.4, -1.1, 1.2, 1.2);
      }
    } else if (k === 4) {
      ctx.rotate(ang);
      put(ctx, torpS(c), 1, 1, 1, 0, 0);
      const pu = 0.5 + 0.5 * Math.sin(t * 10 + p.x * 0.05);
      ctx.globalCompositeOperation = 'lighter';
      put(ctx, glowS('#ff7a20'), 1.1, 1.1, 0.65, -12, 0);
      put(ctx, flameS(), 0.9 + 0.5 * fl, 1.5, 1, -13, 0);
      ctx.globalAlpha = 0.85 - pu * 0.4; ctx.strokeStyle = c; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(3, 0, 3.5, 9 + pu * 2.5, 0, 0, TAU); ctx.stroke();
      put(ctx, glowS(c), 1, 1, 0.55 + 0.3 * pu, 6, 0);
      put(ctx, glowS('#ffffff'), 0.5, 0.5, 0.9, 6, 0);
    } else {
      ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
      put(ctx, glowS(c), 0.7, 0.7, 1, 0, 0);
    }
    ctx.restore();
  };
})();
