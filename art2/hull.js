// Art2 hull: dark shaded sci-fi fighter hull, 3 visual tiers, damage/hit/EMP states. Calls Art2.mods.* in contract order.
(function () {
  const A = window.Art2 = window.Art2 || {};
  const S = A.ship = A.ship || {};
  S.radius = lv => { let n = 0; for (let i = 0; lv && i < lv.length; i++) n += lv[i] | 0; return 15 + Math.min(14, n * 0.5); };
  S.labelColor = s => (s && s.col) || '#37c2ff';

  const poly = (c, p) => { c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); };
  const sym = (c, p, bw) => { c.moveTo(p[0][0], 0); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1] * bw); for (let i = p.length - 1; i > 0; i--) c.lineTo(p[i][0], -p[i][1] * bw); c.closePath(); };
  const inset = (p, k) => { let cx = 0, cy = 0; for (const q of p) { cx += q[0]; cy += q[1]; } cx /= p.length; cy /= p.length; return p.map(q => [q[0] + (cx - q[0]) * k, q[1] + (cy - q[1]) * k]); };
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const BODY = [[1.5, 0], [1.28, .07], [1.0, .14], [.62, .25], [.2, .33], [-.35, .38], [-.8, .36], [-1.0, .28], [-1.02, 0]];
  const DECK = [[1.25, 0], [.95, .1], [.6, .17], [.2, .22], [-.35, .25], [-.75, .23], [-.8, 0]];

  function wingPts(P, sg) {
    const a = P.wl, x = P.sw, t = P.tier;
    return [[.62, .3 * sg], [.25 + x * .5, (.3 + (a - .3) * .5) * sg], [x, a * sg], [x - .4 - .05 * t, (a - .02) * sg], [-.82, .42 * sg], [-.85, .3 * sg]];
  }
  function hullPath(c, P) { c.beginPath(); poly(c, P.W[0]); poly(c, P.W[1]); sym(c, BODY, P.bw); }

  function call(c, name, o) {
    const f = A.mods && A.mods[name]; if (!f) return;
    c.save(); try { f(c, o); } catch (e) { } c.restore();
  }

  function drawHull(c, s, o, P) {
    const { mix, litGrad, rgba, STEEL, TAU } = A, r = o.r, ang = o.ang, lw = 1 / r, lod = o.lod, col = o.col, tier = P.tier, bw = P.bw;
    c.save(); c.scale(r, r); c.lineJoin = 'round';
    const gW = litGrad(c, ang, .9, mix(STEEL, -.08), mix(STEEL, -.4), mix(STEEL, -.72));
    const gB = litGrad(c, ang, .6, mix(STEEL, .12), mix(STEEL, -.25), mix(STEEL, -.66));
    const gP = litGrad(c, ang, .5, mix(STEEL, .3), mix(STEEL, -.02), mix(STEEL, -.5));
    const gD = litGrad(c, ang, .4, '#2b3340', '#171c25', '#080a0f');
    const rim = litGrad(c, ang, .9, 'rgba(235,245,255,.75)', 'rgba(210,225,245,.12)', 'rgba(0,0,0,0)');
    const sh = '#05080d', seam = 'rgba(4,7,12,.65)';
    // canards (tier>=1)
    if (tier >= 1) {
      c.beginPath(); for (const sg of [1, -1]) poly(c, [[.85, .2 * sg], [.58, (.42 + .08 * tier) * sg], [.4, .38 * sg], [.5, .2 * sg]]);
      c.fillStyle = gW; c.fill(); c.strokeStyle = rim; c.lineWidth = lw * 1; c.stroke();
    }
    // wings
    c.beginPath(); poly(c, P.W[0]); poly(c, P.W[1]); c.fillStyle = gW; c.fill();
    c.beginPath(); for (let i = 0; i < 2; i++) poly(c, inset(P.W[i], .3)); c.globalAlpha = .85; c.fillStyle = gP; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = seam; c.lineWidth = lw * .9; c.stroke();
    c.beginPath(); poly(c, P.W[0]); poly(c, P.W[1]); c.strokeStyle = rim; c.lineWidth = lw * 1.3; c.stroke();
    // team trim on wings
    c.strokeStyle = rgba(col, .9); c.lineCap = 'round'; c.lineWidth = lw * 2; c.beginPath();
    for (let i = 0; i < 2; i++) { const w = P.W[i], c0 = inset(w, .1), a = lerp(c0[1], c0[0], .35), b = lerp(c0[2], c0[3], .15); c.moveTo(a[0], a[1]); c.lineTo(c0[1][0], c0[1][1]); c.lineTo(b[0], b[1]); }
    c.stroke();
    // rear engine housing
    const hy = .2 + .03 * tier;
    c.fillStyle = gD; c.fillRect(-1.08, -hy, .4, hy * 2);
    c.fillStyle = gB; c.fillRect(-1.08, -hy, .4, hy * 2 * .22);
    // body
    c.beginPath(); sym(c, BODY, bw); c.fillStyle = gB; c.fill();
    c.beginPath(); sym(c, DECK, bw); c.fillStyle = gP; c.fill(); c.strokeStyle = seam; c.lineWidth = lw * .9; c.stroke();
    if (tier >= 1) { // extra aft segment band
      c.fillStyle = gD; c.fillRect(-.76, -.2 * bw, .4, .4 * bw); c.fillStyle = gW; c.fillRect(-.74, -.17 * bw, .36, .34 * bw);
    }
    if (tier >= 2) { // dorsal spine with cast shadow
      const la = A.LIGHT - ang, ox = -Math.cos(la) * .035, oy = -Math.sin(la) * .035;
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-.7 + ox, -.07 + oy, 1.55, .14);
      c.fillStyle = litGrad(c, ang, .12, mix(STEEL, .4), mix(STEEL, .05), mix(STEEL, -.5)); c.fillRect(-.7, -.07, 1.55, .14);
      c.fillStyle = rgba(col, .8); c.fillRect(-.5, -.012, 1.1, .024);
    }
    c.beginPath(); sym(c, BODY, bw); c.strokeStyle = rim; c.lineWidth = lw * 1.3; c.stroke();
    // nose + body trim stripes
    c.strokeStyle = rgba(col, .85); c.lineWidth = lw * 1.8; c.beginPath();
    c.moveTo(.98, .1 * bw); c.lineTo(.75, .19 * bw); c.moveTo(.98, -.1 * bw); c.lineTo(.75, -.19 * bw);
    c.moveTo(.62, .26 * bw); c.lineTo(-.3, .31 * bw); c.moveTo(.62, -.26 * bw); c.lineTo(-.3, -.31 * bw); c.stroke();
    if (lod) { // panel seams + greebles
      c.beginPath(); c.strokeStyle = seam; c.lineWidth = lw * .8;
      for (const x of [.62, .2, -.35]) { const y = (x > .5 ? .25 : x > 0 ? .33 : .38) * bw; c.moveTo(x, -y); c.lineTo(x, y); }
      c.moveTo(.9, .08 * bw); c.lineTo(-.7, .17 * bw); c.moveTo(.9, -.08 * bw); c.lineTo(-.7, -.17 * bw);
      for (let i = 0; i < 2; i++) { const w = P.W[i]; c.moveTo(w[0][0], w[0][1]); c.lineTo(w[3][0] * .6 + w[2][0] * .4, w[3][1] * .6 + w[2][1] * .4); c.moveTo(w[1][0], w[1][1]); c.lineTo(w[4][0], w[4][1]); }
      c.stroke();
      c.fillStyle = sh; c.beginPath();
      for (const sg of [1, -1]) {
        for (let i = 0; i < 3; i++) c.rect(-.56 - i * .1, (.1 + .04) * sg - .018, .06, .036); // vent slits
        const w = P.W[sg > 0 ? 0 : 1], vx = (w[1][0] + w[4][0]) / 2, vy = (w[1][1] + w[4][1]) / 2;
        c.rect(vx - .1, vy - .02, .2, .04); c.rect(vx - .07, vy - .02 + .06 * sg, .14, .025);
      }
      c.fill();
      c.fillStyle = 'rgba(200,215,235,.35)'; c.beginPath();
      for (let i = 0; i < 6; i++) { c.moveTo(.5 - i * .17 + .012, .295 * bw); c.arc(.5 - i * .17, .295 * bw, .012, 0, TAU); c.moveTo(.5 - i * .17 + .012, -.295 * bw); c.arc(.5 - i * .17, -.295 * bw, .012, 0, TAU); }
      c.fill();
      // engine slot glow
      c.fillStyle = 'rgba(255,150,70,' + (.25 + o.thr * .5) + ')'; c.fillRect(-1.075, -hy * .6, .03, hy * 1.2);
      if (tier >= 1) { c.fillStyle = sh; c.fillRect(.95, -.025, .22, .05); } // nose sensor slit
    }
    c.restore();
  }

  function drawTop(c, s, o, P, t) {
    const { litGrad, rgba, glow, TAU } = A, r = o.r, ang = o.ang, lw = 1 / r, col = o.col, lod = o.lod;
    c.save(); c.scale(r, r);
    // cockpit
    c.save(); c.translate(.35, 0);
    const la = A.LIGHT - ang, ox = -Math.cos(la) * .02, oy = -Math.sin(la) * .02;
    c.fillStyle = 'rgba(4,6,10,.85)'; c.beginPath(); c.ellipse(ox, oy, .33, .165, 0, 0, TAU); c.fill();
    c.fillStyle = litGrad(c, ang, .16, '#2b4a74', '#0b1626', '#03060b'); c.beginPath(); c.ellipse(0, 0, .29, .125, 0, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(70,150,255,.2)'; c.beginPath(); c.ellipse(-.05, 0, .17, .06, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(190,225,255,.3)'; c.beginPath(); c.moveTo(-.2, -.045); c.lineTo(-.02, -.1); c.lineTo(.07, -.1); c.lineTo(-.14, -.03); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over'; c.strokeStyle = 'rgba(160,185,215,.35)'; c.lineWidth = lw; c.beginPath(); c.ellipse(0, 0, .33, .165, 0, Math.PI * 1.05, Math.PI * 1.75); c.stroke();
    c.restore();
    // lights
    const sd = o.seed, ph = (t * 1.1 + sd * .37) % 1, on = ph < .16, st = (t * .8 + sd * .13) % 1 < .07, pl = .75 + .25 * Math.sin(t * 3 + sd);
    for (let i = 0; i < 2; i++) {
      const w = P.W[i], sg = i ? -1 : 1, tp = w[2], tr = w[3];
      c.fillStyle = rgba(col, pl); c.beginPath(); c.arc(tp[0] - .04, tp[1] - .05 * sg, .035, 0, TAU); c.fill();
      if (lod) glow(c, tp[0] - .04, tp[1] - .05 * sg, .2, rgba(col, .6), .7 * pl);
      if (on) { const nc = sg > 0 ? '#40ff70' : '#ff3a3a'; c.fillStyle = nc; c.beginPath(); c.arc(tr[0] + .03, tr[1] - .02 * sg, .03, 0, TAU); c.fill(); if (lod) glow(c, tr[0] + .03, tr[1], .16, nc, .8); }
    }
    if (st) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-.6, 0, .03, 0, TAU); c.fill(); if (lod) glow(c, -.6, 0, .22, 'rgba(255,255,255,.8)', .8); }
    c.restore();
  }

  function drawDamage(c, s, o, P, t) {
    const { rgba, glow, TAU, rng } = A, r = o.r, lw = 1 / r, hpf = s.hpf == null ? 1 : s.hpf, lod = o.lod, sd = o.seed;
    c.save(); c.scale(r, r);
    if (hpf < .6) {
      const k = (.6 - hpf) / .6, rn = rng(sd * 7 + 3);
      c.save(); hullPath(c, P); c.clip();
      const n = 3 + (k * 5 | 0);
      for (let i = 0; i < n; i++) {
        const x = -.8 + rn() * 1.9, y = (rn() - .5) * 1.1, rx = .1 + rn() * .16, ry = rx * (.4 + rn() * .5), a = rn() * 3;
        c.fillStyle = 'rgba(0,0,0,' + (.18 + .25 * k) + ')'; c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, TAU); c.fill();
        c.fillStyle = 'rgba(0,0,0,' + (.25 + .3 * k) + ')'; c.beginPath(); c.ellipse(x, y, rx * .5, ry * .5, a, 0, TAU); c.fill();
      }
      if (lod) {
        const cn = 2 + (k * 4 | 0); c.lineCap = 'round'; c.beginPath();
        for (let i = 0; i < cn; i++) { let x = -.7 + rn() * 1.6, y = (rn() - .5) * .9; c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rn() - .35) * .18; y += (rn() - .5) * .16; c.lineTo(x, y); } }
        c.strokeStyle = 'rgba(2,3,6,.85)'; c.lineWidth = lw * 1.1; c.stroke();
        if (hpf < .3) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,120,40,' + (.25 + .2 * Math.sin(t * 9 + sd)) + ')'; c.lineWidth = lw * .8; c.stroke(); }
      }
      c.restore();
    }
    if (hpf < .3) {
      const k = (.3 - hpf) / .3, n = lod ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const p = (t * 1.1 + i / n + sd * .1) % 1, y = Math.sin(i * 12.9 + sd) * .25 + Math.sin(t * 2 + i) * .06 * p;
        c.fillStyle = 'rgba(30,32,38,' + (1 - p) * .45 * (.5 + k * .5) + ')'; c.beginPath(); c.arc(-1.1 - p * 1.5, y, .1 + p * .3, 0, TAU); c.fill();
      }
      if (lod) {
        const st = t * 14 | 0; c.globalCompositeOperation = 'lighter'; c.lineWidth = lw * 1.2; c.beginPath();
        for (let i = 0; i < 3; i++) { const rr = rng(st * 13 + i * 5 + sd); if (rr() < .55) { const x = -.6 + rr() * 1.4, y = (rr() - .5) * .8, a = rr() * TAU; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * .1, y + Math.sin(a) * .1); } }
        c.strokeStyle = 'rgba(255,190,90,.9)'; c.stroke(); c.globalCompositeOperation = 'source-over';
      }
    }
    if (s.hit > 0) { const h = Math.min(1, s.hit); c.globalCompositeOperation = 'lighter'; hullPath(c, P); c.fillStyle = 'rgba(255,238,210,' + h * .75 + ')'; c.fill(); }
    if (s.emp) {
      c.globalCompositeOperation = 'lighter'; hullPath(c, P); c.fillStyle = 'rgba(90,150,255,' + (.12 + .08 * Math.sin(t * 25)) + ')'; c.fill();
      if (lod) {
        const st = t * 18 | 0; c.lineCap = 'round'; c.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          c.beginPath();
          for (let k = 0; k < 3; k++) {
            const rr = rng(st * 31 + k * 7 + sd); let x = -.8 + rr() * 2, y = (rr() - .5) * 1.2; c.moveTo(x, y);
            for (let j = 0; j < 5; j++) { x += (rr() - .5) * .35; y += (rr() - .5) * .3; c.lineTo(x, y); }
          }
          c.strokeStyle = pass ? 'rgba(225,240,255,.95)' : 'rgba(80,140,255,.35)'; c.lineWidth = lw * (pass ? 1.1 : 4); c.stroke();
        }
      }
    }
    c.restore();
  }

  S.draw = function (c, s, t) {
    const lv = s.lv || [], r = S.radius(lv), zoom = s.zoom || 1, lod = r * zoom < 14 ? 0 : 1;
    let sum = 0; for (let i = 0; i < lv.length; i++) sum += lv[i] | 0;
    const tier = sum >= 9 ? 2 : sum >= 4 ? 1 : 0, seed = s.seed | 0, rn = A.rng(seed + 1);
    const P = { tier, bw: .94 + rn() * .12, wl: Math.min(.9, .68 + tier * .07 + rn() * .06), sw: .1 - tier * .1 - rn() * .1 };
    P.W = [wingPts(P, 1), wingPts(P, -1)];
    const ang = s.ang || 0;
    const o = { r, l: 0, lv, col: s.col || '#37c2ff', seed, t, thr: s.thr || 0, boost: s.boost || 0, fire: s.fire || 0, ang, lod };
    c.save(); c.translate(s.x, s.y); c.rotate(ang);
    const m = (name, i, always) => { o.l = lv[i] | 0; if (o.l > 0 || always) call(c, name, o); };
    m('engines', 3, 1); m('armor', 0);
    try { drawHull(c, s, o, P); } catch (e) { c.restore(); }
    m('afterburner', 9); m('repair', 4); m('shield', 2); m('mines', 8); m('drones', 7); m('torpedo', 6);
    m('missiles', 5); m('gravity', 11); m('shockwave', 12); m('railgun', 10); m('lasers', 1, 1);
    try { drawTop(c, s, o, P, t || 0); } catch (e) { c.restore(); }
    try { drawDamage(c, s, o, P, t || 0); } catch (e) { c.restore(); }
    c.restore();
  };
})();
