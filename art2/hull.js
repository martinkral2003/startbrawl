// Art2 hull: "raptor" fighter - beaked fuselage, forward canards, swept notched wings, exposed engine block. 3 tiers, damage/hit/EMP.
(function () {
  const A = window.Art2 = window.Art2 || {};
  const S = A.ship = A.ship || {};
  S.radius = lv => { let n = 0; for (let i = 0; lv && i < lv.length; i++) n += lv[i] | 0; return 15 + Math.min(14, n * 0.5); };
  S.labelColor = s => (s && s.col) || '#37c2ff';

  const poly = (c, p, sg) => { c.moveTo(p[0][0], p[0][1] * sg); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1] * sg); c.closePath(); };
  const both = (c, p) => { poly(c, p, 1); poly(c, p, -1); };
  const sym = (c, p, bw) => { c.moveTo(p[0][0], 0); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1] * bw); for (let i = p.length - 1; i > 0; i--) c.lineTo(p[i][0], -p[i][1] * bw); c.closePath(); };
  const BODY = [[1.5, 0], [1.38, .045], [1.2, .08], [1.02, .15], [.92, .2], [.6, .22], [.2, .28], [-.3, .31], [-.75, .29], [-1.0, .23], [-1.02, 0]];
  const DECK = [[1.22, 0], [1.0, .07], [.82, .13], [.55, .16], [.2, .21], [-.3, .24], [-.7, .22], [-.78, 0]];
  const WING = [[.28, .26], [.02, .6], [-.3, .92], [-.55, .97], [-.98, .88], [-.72, .64], [-.9, .5], [-.85, .28]];
  const WPL1 = [[.18, .3], [-.02, .58], [-.3, .82], [-.5, .62], [-.55, .33]];
  const WPL2 = [[-.5, .64], [-.3, .85], [-.58, .93], [-.8, .86], [-.68, .66]];
  const CANARD = [[.5, .21], [.98, .47], [.9, .5], [.84, .2]];
  const BLADE = [[-.7, .95], [-1.0, .99], [-.98, .88]];
  const STRAKE = [[.46, .27], [.3, .5], [.05, .72], [-.06, .6], [.15, .3]];
  const FIN = [[-.3, .3], [-.78, .45], [-.88, .3]];
  const SHROUD = [[-.6, .19], [-.98, .22], [-1.0, .35], [-.72, .31]];
  const PRONG = [[1.0, .2], [1.32, .27], [1.0, .3]];

  const cache = new Map();
  function build(tier, v) {
    const key = tier * 8 + v, hit = cache.get(key); if (hit) return hit;
    const bw = .95 + v * .04, G = { tier, bw };
    const mk = f => { const p = new Path2D(); f(p); return p; };
    G.body = mk(p => sym(p, BODY, bw)); G.deck = mk(p => sym(p, DECK, bw));
    G.wing = mk(p => both(p, WING)); G.wpl = mk(p => { both(p, WPL1); both(p, WPL2); });
    G.canard = mk(p => both(p, CANARD));
    G.eng = mk(p => { const h = .17 + .035 * tier; p.rect(-1.06, -h, .46, h * 2); });
    G.extra = mk(p => {
      if (tier >= 1) { both(p, BLADE); both(p, SHROUD); both(p, FIN.map(q => [q[0], q[1] * (.8 + .1 * tier)])); }
      if (tier >= 2) { both(p, STRAKE); both(p, PRONG); }
    });
    G.all = mk(p => { p.addPath(G.wing); p.addPath(G.body); p.addPath(G.eng); p.addPath(G.canard); p.addPath(G.extra); });
    cache.set(key, G); return G;
  }

  function call(c, name, o) {
    const f = A.mods && A.mods[name]; if (!f) return;
    c.save(); try { f(c, o); } catch (e) { } c.restore();
  }

  function drawHull(c, s, o, P) {
    const { mix, litGrad, rgba, STEEL } = A, r = o.r, ang = o.ang, lw = 1 / r, lod = o.lod, col = o.col, tier = P.tier, bw = P.bw;
    c.save(); c.scale(r, r); c.lineJoin = 'round';
    const gW = litGrad(c, ang, .9, mix(STEEL, -.05), mix(STEEL, -.38), mix(STEEL, -.7));
    const gB = litGrad(c, ang, .6, mix(STEEL, .14), mix(STEEL, -.22), mix(STEEL, -.66));
    const gP = litGrad(c, ang, .5, mix(STEEL, .32), mix(STEEL, 0), mix(STEEL, -.5));
    const gD = litGrad(c, ang, .4, '#2b3340', '#151a22', '#07090d');
    const rim = litGrad(c, ang, .9, 'rgba(235,245,255,.75)', 'rgba(210,225,245,.12)', 'rgba(0,0,0,0)');
    const seam = 'rgba(4,7,12,.65)';
    // darker underlayer: wings drawn offset first, then canards
    c.save(); c.translate(-.04, 0); c.fillStyle = gD; c.fill(P.wing); c.restore();
    c.fillStyle = gD; c.fill(P.canard); c.fillStyle = gW; c.globalAlpha = .9; c.fill(P.canard); c.globalAlpha = 1;
    c.strokeStyle = rim; c.lineWidth = lw; c.stroke(P.canard);
    // exposed engine block with ribbing
    const hy = .17 + .035 * tier;
    c.fillStyle = gD; c.fill(P.eng);
    c.fillStyle = gB; c.fillRect(-1.06, -hy, .46, hy * .35); c.fillRect(-1.06, hy * .65, .46, hy * .35);
    c.strokeStyle = seam; c.lineWidth = lw; c.beginPath();
    for (let i = 0; i < 4; i++) { const x = -1.0 + i * .1; c.moveTo(x, -hy); c.lineTo(x, hy); }
    c.stroke();
    // tier extras: shrouds, blades, dorsal fins, strakes, prongs
    if (tier >= 1) { c.fillStyle = gW; c.fill(P.extra); c.strokeStyle = rim; c.lineWidth = lw * 1.1; c.stroke(P.extra); }
    // main wings with overlapping plates
    c.fillStyle = gW; c.fill(P.wing);
    c.fillStyle = gP; c.globalAlpha = .85; c.fill(P.wpl); c.globalAlpha = 1;
    c.strokeStyle = seam; c.lineWidth = lw * .9; c.stroke(P.wpl);
    c.strokeStyle = rim; c.lineWidth = lw * 1.3; c.stroke(P.wing);
    // team chevron + emblem
    c.strokeStyle = rgba(col, .9); c.lineCap = 'round'; c.lineWidth = lw * 2.2; c.beginPath();
    for (const sg of [1, -1]) { c.moveTo(-.02, .6 * sg); c.lineTo(-.34, .84 * sg); c.lineTo(-.62, .8 * sg); c.moveTo(-.26, .5 * sg); c.lineTo(-.46, .66 * sg); }
    c.stroke();
    c.fillStyle = rgba(col, .85); c.beginPath();
    for (const sg of [1, -1]) { c.moveTo(-.12, .52 * sg); c.lineTo(-.2, .45 * sg); c.lineTo(-.12, .38 * sg); c.lineTo(-.04, .45 * sg); c.closePath(); }
    c.fill();
    // fuselage
    c.fillStyle = gB; c.fill(P.body);
    c.fillStyle = gP; c.fill(P.deck); c.strokeStyle = seam; c.lineWidth = lw * .9; c.stroke(P.deck);
    c.fillStyle = gD; c.beginPath(); // overlapping dark armour bands
    for (const x of [.5, -.1, -.55]) c.rect(x - .05, -.3 * bw, .05, .6 * bw);
    c.globalAlpha = .55; c.fill(); c.globalAlpha = 1;
    // raised dorsal spine with cast shadow
    const la = A.LIGHT - ang, ox = -Math.cos(la) * .03, oy = -Math.sin(la) * .03, sw = .03 + .012 * tier;
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-.9 + ox, -sw + oy, .85, sw * 2);
    c.fillStyle = gP; c.fillRect(-.9, -sw, .85, sw * 2);
    c.fillStyle = rgba(col, .75); c.fillRect(-.8, -.007, .6, .014);
    c.strokeStyle = rim; c.lineWidth = lw * 1.3; c.stroke(P.body);
    // beak + body trim
    c.strokeStyle = rgba(col, .85); c.lineWidth = lw * 1.8; c.beginPath();
    c.moveTo(1.12, .08 * bw); c.lineTo(.96, .17 * bw); c.moveTo(1.12, -.08 * bw); c.lineTo(.96, -.17 * bw);
    c.moveTo(.55, .21 * bw); c.lineTo(-.3, .29 * bw); c.moveTo(.55, -.21 * bw); c.lineTo(-.3, -.29 * bw); c.stroke();
    if (lod) {
      c.beginPath(); c.strokeStyle = seam; c.lineWidth = lw * .8;
      for (const sg of [1, -1]) { c.moveTo(.9, .07 * sg * bw); c.lineTo(-.7, .15 * sg * bw); c.moveTo(.02, .6 * sg); c.lineTo(-.72, .64 * sg); c.moveTo(.28, .26 * sg); c.lineTo(-.55, .97 * sg); }
      c.stroke();
      c.fillStyle = '#05080d'; c.beginPath(); // vents, sensor slit
      for (const sg of [1, -1]) { for (let i = 0; i < 3; i++) c.rect(-.5 - i * .1, .12 * sg * bw - .016, .06, .032); c.rect(-.4, .66 * sg - .02, .2, .04); }
      c.rect(1.0, -.02, .2, .04);
      c.fill();
      c.strokeStyle = 'rgba(200,215,235,.55)'; c.lineWidth = lw; c.beginPath(); // antenna
      c.moveTo(-.2, -.3 * bw); c.lineTo(-.5, -.52);
      if (tier >= 2) { c.moveTo(-.55, .3 * bw); c.lineTo(-.8, .56); }
      c.stroke();
      c.fillStyle = 'rgba(255,150,70,' + (.25 + o.thr * .5) + ')'; c.fillRect(-1.075, -hy * .6, .03, hy * 1.2);
    }
    c.restore();
  }

  function drawTop(c, s, o, P, t) {
    const { litGrad, rgba, glow, TAU } = A, r = o.r, ang = o.ang, lw = 1 / r, col = o.col, lod = o.lod;
    c.save(); c.scale(r, r);
    c.save(); c.translate(.35, 0); // recessed cockpit, bright interior
    const la = A.LIGHT - ang, ox = -Math.cos(la) * .025, oy = -Math.sin(la) * .025;
    c.fillStyle = 'rgba(3,5,8,.9)'; c.beginPath(); c.ellipse(ox, oy, .34, .16, 0, 0, TAU); c.fill();
    c.fillStyle = litGrad(c, ang, .16, '#4f86c8', '#12263f', '#04070c'); c.beginPath(); c.ellipse(0, 0, .29, .115, 0, 0, TAU); c.fill();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(90,190,255,.32)'; c.beginPath(); c.ellipse(.03, 0, .2, .06, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(210,240,255,.35)'; c.beginPath(); c.moveTo(-.2, -.04); c.lineTo(-.02, -.09); c.lineTo(.08, -.09); c.lineTo(-.14, -.03); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over'; c.strokeStyle = 'rgba(160,185,215,.45)'; c.lineWidth = lw * 1.1; c.beginPath(); c.ellipse(0, 0, .33, .15, 0, Math.PI * 1.05, Math.PI * 1.75); c.stroke();
    c.restore();
    const sd = o.seed, ph = (t * 1.1 + sd * .37) % 1, on = ph < .16, st = (t * .8 + sd * .13) % 1 < .07, pl = .75 + .25 * Math.sin(t * 3 + sd);
    for (const sg of [1, -1]) {
      const tp = WING[3], tr = WING[4], px = tp[0] + .04, py = (tp[1] - .03) * sg;
      c.fillStyle = rgba(col, pl); c.beginPath(); c.arc(px, py, .035, 0, TAU); c.fill();
      if (lod) glow(c, px, py, .2, rgba(col, .6), .7 * pl);
      if (on) { const nc = sg > 0 ? '#40ff70' : '#ff3a3a', nx = tr[0] + .04, ny = (tr[1] - .03) * sg; c.fillStyle = nc; c.beginPath(); c.arc(nx, ny, .03, 0, TAU); c.fill(); if (lod) glow(c, nx, ny, .16, nc, .8); }
    }
    if (st) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-.6, 0, .03, 0, TAU); c.fill(); if (lod) glow(c, -.6, 0, .22, 'rgba(255,255,255,.8)', .8); }
    c.restore();
  }

  function drawDamage(c, s, o, P, t) {
    const { glow, TAU, rng } = A, r = o.r, lw = 1 / r, hpf = s.hpf == null ? 1 : s.hpf, lod = o.lod, sd = o.seed;
    c.save(); c.scale(r, r);
    if (hpf < .6) {
      const k = (.6 - hpf) / .6, rn = rng(sd * 7 + 3);
      c.save(); c.clip(P.all);
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
    if (s.hit > 0) { const h = Math.min(1, s.hit); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,238,210,' + h * .75 + ')'; c.fill(P.all); }
    if (s.emp) {
      c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(90,150,255,' + (.12 + .08 * Math.sin(t * 25)) + ')'; c.fill(P.all);
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
    const tier = sum >= 9 ? 2 : sum >= 4 ? 1 : 0, seed = s.seed | 0;
    const P = build(tier, ((seed % 4) + 4) % 4);
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
