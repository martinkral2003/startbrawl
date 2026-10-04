// Art2.world: asteroid, scrap (+repair crate), supplyDrop. Lit from the top-left, cheap per-object cost.
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.world = A.world || {};
  const W = A.world, TAU = A.TAU;

  // ---------- asteroid ----------
  const rocks = new Map();
  function rockData(a) {
    let d = rocks.get(a.id);
    if (d) return d;
    const R = A.rng((a.id * 2654435761 + 12345) | 0), n = 11 + (R() * 5 | 0), pts = [];
    const sx = 0.85 + R() * 0.3, sy = 0.85 + R() * 0.3; // overall elongation
    for (let i = 0; i < n; i++) { const an = i / n * TAU + (R() - 0.5) * 0.25, k = 0.78 + R() * 0.28; pts.push([Math.cos(an) * k * sx, Math.sin(an) * k * sy]); }
    const craters = [], cn = 3 + (R() * 3 | 0);
    for (let i = 0; i < cn; i++) { const an = R() * TAU, d0 = Math.sqrt(R()) * 0.62; craters.push({ x: Math.cos(an) * d0, y: Math.sin(an) * d0, r: 0.1 + R() * 0.15 }); }
    const ores = [];
    for (let i = 0; i < 2; i++) { const an = R() * TAU, d0 = 0.2 + R() * 0.4; ores.push({ x: Math.cos(an) * d0, y: Math.sin(an) * d0, s: 0.07 + R() * 0.04, ph: R() * TAU, c: R() < 0.5 ? '#ffd98a' : '#9fe8ff' }); }
    const cracks = [], kn = 6;
    for (let i = 0; i < kn; i++) {
      let an = R() * TAU, x = Math.cos(an) * 0.75, y = Math.sin(an) * 0.75; const seg = [[x, y]];
      an += Math.PI + (R() - 0.5) * 0.8;
      for (let j = 0; j < 4; j++) { an += (R() - 0.5) * 1.2; x += Math.cos(an) * 0.2; y += Math.sin(an) * 0.2; seg.push([x, y]); }
      cracks.push(seg);
    }
    d = { pts, craters, ores, cracks, spd: (R() < 0.5 ? -1 : 1) * (0.08 + R() * 0.14), rot0: R() * TAU };
    if (rocks.size > 300) rocks.delete(rocks.keys().next().value);
    rocks.set(a.id, d);
    return d;
  }
  W.asteroid = function (ctx, a, t) {
    const d = rockData(a), r = a.r, rot = d.rot0 + d.spd * t, pts = d.pts;
    const la = A.LIGHT - rot, lx = Math.cos(la), ly = Math.sin(la);
    ctx.save();
    ctx.translate(a.x, a.y); ctx.rotate(rot); ctx.scale(r, r);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) ctx.moveTo((pts[pts.length - 1][0] + p[0]) / 2, (pts[pts.length - 1][1] + p[1]) / 2);
      ctx.quadraticCurveTo(p[0], p[1], mx, my);
    }
    ctx.closePath();
    let g = ctx.createRadialGradient(lx * 0.4, ly * 0.4, 0.05, lx * 0.1, ly * 0.1, 1.25);
    g.addColorStop(0, '#b4aaa0'); g.addColorStop(0.45, '#7a706a'); g.addColorStop(0.8, '#3d3733'); g.addColorStop(1, '#1b1816');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    const lw = 1 / r; // one pixel in local units
    // craters
    for (const c of d.craters) {
      const cg = ctx.createRadialGradient(c.x - lx * c.r * 0.3, c.y - ly * c.r * 0.3, 0, c.x, c.y, c.r);
      cg.addColorStop(0, 'rgba(18,15,13,0.85)'); cg.addColorStop(0.75, 'rgba(30,26,23,0.65)'); cg.addColorStop(1, 'rgba(60,54,50,0.2)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
      // lit rim: far wall (away from light) is lit inside, near rim catches light outside
      ctx.lineWidth = Math.max(lw * 1.2, c.r * 0.22); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(205,195,182,0.55)'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, la - 1.1, la + 1.1); ctx.stroke();
      ctx.strokeStyle = 'rgba(10,8,7,0.5)'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, la + Math.PI - 1, la + Math.PI + 1); ctx.stroke();
    }
    // terminator shade on the dark side
    g = ctx.createLinearGradient(lx, ly, -lx, -ly);
    g.addColorStop(0, 'rgba(255,240,220,0.10)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.5)');
    ctx.fillStyle = g; ctx.fillRect(-1.4, -1.4, 2.8, 2.8);
    // hp cracks
    const f = a.hpMax > 0 ? Math.max(0, Math.min(1, a.hp / a.hpMax)) : 1;
    if (f < 0.92) {
      const n = Math.min(d.cracks.length, Math.ceil((1 - f) * d.cracks.length * 1.1)), grow = Math.min(1, 0.5 + (1 - f));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(210,200,185,0.28)' : 'rgba(8,6,5,0.9)';
        ctx.lineWidth = Math.max(lw * 1.4, 0.035) * (pass ? 0.6 : 1);
        ctx.beginPath();
        const off = pass ? lw * 1.1 : 0;
        for (let i = 0; i < n; i++) {
          const s = d.cracks[i], m = Math.max(2, Math.round(s.length * grow));
          ctx.moveTo(s[0][0] - lx * off, s[0][1] - ly * off);
          for (let j = 1; j < m; j++) ctx.lineTo(s[j][0] - lx * off, s[j][1] - ly * off);
        }
        ctx.stroke();
      }
      if (f < 0.35) { ctx.fillStyle = 'rgba(255,120,40,' + (0.05 + 0.04 * Math.sin(t * 5 + a.id)) + ')'; ctx.fillRect(-1.4, -1.4, 2.8, 2.8); }
    }
    ctx.restore();
    // ore glints
    ctx.globalCompositeOperation = 'lighter';
    for (const o of d.ores) {
      const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + o.ph), s = o.s;
      ctx.fillStyle = o.c; ctx.globalAlpha = 0.5 + 0.4 * tw;
      ctx.beginPath(); ctx.moveTo(o.x, o.y - s); ctx.lineTo(o.x + s * 0.7, o.y); ctx.lineTo(o.x, o.y + s); ctx.lineTo(o.x - s * 0.7, o.y); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.25 * tw; ctx.fillRect(o.x - s * 2.2, o.y - lw * 0.7, s * 4.4, lw * 1.4); ctx.fillRect(o.x - lw * 0.7, o.y - s * 2.2, lw * 1.4, s * 4.4);
    }
    ctx.restore();
  };

  // ---------- scrap / repair crate (pre-rendered sprites) ----------
  const SPR = [], SC = 2; // sprite pixels per world unit
  function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w * SC; c.height = h * SC; const x = c.getContext('2d'); x.scale(SC, SC); x.translate(w / 2, h / 2); fn(x); return c; }
  function shardSprite(v) {
    return mk(34, 34, x => {
      const R = A.rng(v * 977 + 5), g = x.createRadialGradient(0, 0, 0, 0, 0, 16);
      g.addColorStop(0, 'rgba(255,200,80,0.45)'); g.addColorStop(0.5, 'rgba(255,170,40,0.15)'); g.addColorStop(1, 'rgba(255,160,30,0)');
      x.fillStyle = g; x.fillRect(-17, -17, 34, 34);
      const n = 3 + v % 3;
      for (let i = 0; i < n; i++) {
        const an = i / n * TAU + R(), d = i ? 3 + R() * 4 : 0, cx = Math.cos(an) * d, cy = Math.sin(an) * d, s = i ? 3 + R() * 2.2 : 5, rot = R() * TAU;
        x.save(); x.translate(cx, cy); x.rotate(rot);
        x.beginPath(); x.moveTo(s, 0); x.lineTo(s * 0.2, -s * 0.7); x.lineTo(-s * 0.9, -s * 0.25); x.lineTo(-s * 0.6, s * 0.6); x.lineTo(s * 0.3, s * 0.55); x.closePath();
        const la = A.LIGHT - rot - 0, lg = x.createLinearGradient(Math.cos(la) * s, Math.sin(la) * s, -Math.cos(la) * s, -Math.sin(la) * s);
        lg.addColorStop(0, '#fff1b0'); lg.addColorStop(0.5, '#e0a028'); lg.addColorStop(1, '#6a4510');
        x.fillStyle = lg; x.fill(); x.lineWidth = 0.4; x.strokeStyle = 'rgba(40,24,5,0.7)'; x.stroke();
        x.restore();
      }
      x.fillStyle = 'rgba(255,250,220,0.9)'; x.fillRect(-0.5, -3, 1, 6); x.fillRect(-3, -0.5, 6, 1);
    });
  }
  function crateSprite() {
    return mk(44, 44, x => {
      const g = x.createRadialGradient(0, 0, 4, 0, 0, 22);
      g.addColorStop(0, 'rgba(80,255,140,0.4)'); g.addColorStop(0.6, 'rgba(60,230,120,0.12)'); g.addColorStop(1, 'rgba(60,230,120,0)');
      x.fillStyle = g; x.fillRect(-22, -22, 44, 44);
      const s = 9, b = x.createLinearGradient(-s, -s, s, s);
      b.addColorStop(0, '#9aa7b6'); b.addColorStop(0.5, '#5f6b7a'); b.addColorStop(1, '#2b323c');
      x.fillStyle = b; x.beginPath(); x.roundRect ? x.roundRect(-s, -s, s * 2, s * 2, 2) : x.rect(-s, -s, s * 2, s * 2); x.fill();
      x.strokeStyle = 'rgba(210,225,240,0.6)'; x.lineWidth = 0.7; x.beginPath(); x.moveTo(-s + 1, s - 1); x.lineTo(-s + 1, -s + 1); x.lineTo(s - 1, -s + 1); x.stroke();
      x.strokeStyle = 'rgba(8,12,18,0.7)'; x.beginPath(); x.moveTo(s - 0.5, -s + 1); x.lineTo(s - 0.5, s - 0.5); x.lineTo(-s + 1, s - 0.5); x.stroke();
      x.fillStyle = '#1b222b'; x.fillRect(-s + 1.5, -s + 1.5, 3, 3); x.fillRect(s - 4.5, -s + 1.5, 3, 3); x.fillRect(-s + 1.5, s - 4.5, 3, 3); x.fillRect(s - 4.5, s - 4.5, 3, 3);
      x.fillStyle = '#0f1a14'; x.fillRect(-s + 4, -s + 4, s * 2 - 8, s * 2 - 8);
      const cg = x.createLinearGradient(0, -5, 0, 5); cg.addColorStop(0, '#9dffbb'); cg.addColorStop(1, '#20c860');
      x.fillStyle = cg; x.fillRect(-1.8, -4.8, 3.6, 9.6); x.fillRect(-4.8, -1.8, 9.6, 3.6);
    });
  }
  W.scrap = function (ctx, c, t) {
    if (!SPR.length) { for (let v = 0; v < 4; v++) SPR.push(shardSprite(v)); SPR.push(crateSprite()); }
    const ph = (c.x * 0.013 + c.y * 0.021), bob = Math.sin(t * 2.1 + ph * 7) * 1.8;
    const ga = ctx.globalAlpha;
    ctx.save(); ctx.translate(c.x, c.y + bob);
    if (c.t === 1) {
      ctx.rotate(Math.sin(t * 1.3 + ph * 5) * 0.08);
      ctx.globalAlpha = ga * (0.85 + 0.15 * Math.sin(t * 3 + ph));
      ctx.drawImage(SPR[4], -22, -22, 44, 44);
    } else {
      ctx.rotate(t * 0.9 + ph * 20);
      ctx.globalAlpha = ga * (0.85 + 0.15 * Math.sin(t * 4 + ph * 9));
      ctx.drawImage(SPR[Math.abs((c.x * 7 + c.y * 13) | 0) % 4], -17, -17, 34, 34);
    }
    ctx.restore(); ctx.globalAlpha = ga;
  };

  // ---------- supply drop ----------
  W.supplyDrop = function (ctx, d, t) {
    const p = 0.5 + 0.5 * Math.sin(t * 3), R = 55, Y = '255,208,70';
    ctx.save(); ctx.translate(d.x, d.y); ctx.globalCompositeOperation = 'lighter';
    // ground disc
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, `rgba(${Y},${0.22 + 0.1 * p})`); g.addColorStop(0.7, `rgba(${Y},0.07)`); g.addColorStop(1, `rgba(${Y},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    // light pillar
    const H = 240, pw = 9 + 3 * p;
    g = ctx.createLinearGradient(0, 0, 0, -H);
    g.addColorStop(0, `rgba(255,236,150,${0.5 + 0.15 * p})`); g.addColorStop(0.6, `rgba(${Y},0.14)`); g.addColorStop(1, `rgba(${Y},0)`);
    ctx.fillStyle = g; ctx.fillRect(-pw, -H, pw * 2, H);
    g = ctx.createLinearGradient(0, 0, 0, -H * 0.8);
    g.addColorStop(0, 'rgba(255,255,230,0.7)'); g.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = g; ctx.fillRect(-2, -H * 0.8, 4, H * 0.8);
    // pulsing rings
    ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${Y},${0.55 + 0.35 * p})`; ctx.beginPath(); ctx.arc(0, 0, R * (0.82 + 0.06 * p), 0, TAU); ctx.stroke();
    const e = (t * 0.7) % 1; ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(${Y},${0.5 * (1 - e)})`; ctx.beginPath(); ctx.arc(0, 0, R * (0.3 + 0.75 * e), 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${Y},0.35)`; ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, TAU); ctx.stroke();
    // rotating chevrons (pointing inward)
    ctx.rotate(t * 0.8); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(255,225,110,${0.75 + 0.2 * p})`;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(i * TAU / 6); ctx.moveTo(R * 0.62 + 0, -6); ctx.lineTo(R * 0.62 - 7, 0); ctx.lineTo(R * 0.62, 6); ctx.restore(); }
    ctx.stroke();
    ctx.rotate(-t * 1.6); ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(${Y},0.5)`; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const an = i * TAU / 12; ctx.moveTo(Math.cos(an) * R * 0.9, Math.sin(an) * R * 0.9); ctx.lineTo(Math.cos(an) * R * 0.97, Math.sin(an) * R * 0.97); }
    ctx.stroke();
    ctx.restore();
    A.glow(ctx, d.x, d.y, 18 + 6 * p, 'rgba(255,240,170,0.9)', 0.8);
  };
})();
