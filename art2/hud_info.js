// Art2 HUD info widgets: top bar, status bars, fullscreen button, log, edge arrow, banner, ship tag. Screen space unless noted.
(function () {
  const A = window.Art2 = window.Art2 || {};
  const H = A.hud = A.hud || {};
  const ACC = '#5fd0ff', FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  const clamp01 = v => Math.max(0, Math.min(1, num(v, 0)));
  const col = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) ? c : d;
  const rgba = (c, a) => A.rgba ? A.rgba(c, a) : c;
  const fmt = s => { s = Math.max(0, Math.floor(num(s, 0))); return ((s / 60) | 0) + ':' + ('0' + (s % 60)).slice(-2); };
  const NAMES = ['RED', 'BLUE', 'GREEN', 'GOLD', 'VIOLET', 'ORANGE', 'TEAL', 'PINK'];
  const FCOL = ['#ff5a5a', '#4da3ff', '#5ee07a', '#ffd34d', '#c779ff', '#ff9a3d', '#38e0d0', '#ff7ad1'];
  const nowS = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // glass panel: dark translucent gradient, thin lit edge, corner brackets
  function panel(c, x, y, w, h, r, edge, br) {
    edge = edge || ACC;
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(24,36,54,0.82)'); g.addColorStop(1, 'rgba(6,10,18,0.78)');
    rr(c, x, y, w, h, r); c.fillStyle = g; c.fill();
    c.lineWidth = 1; c.strokeStyle = rgba(edge, 0.38); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.beginPath(); c.moveTo(x + r, y + 1.5); c.lineTo(x + w - r, y + 1.5); c.stroke();
    if (br !== false) {
      const k = Math.min(6, h * 0.3); c.strokeStyle = rgba(edge, 0.85); c.lineWidth = 1.2; c.beginPath();
      c.moveTo(x - 1, y + k); c.lineTo(x - 1, y - 1); c.lineTo(x + k, y - 1);
      c.moveTo(x + w + 1 - k, y + h + 1); c.lineTo(x + w + 1, y + h + 1); c.lineTo(x + w + 1, y + h + 1 - k); c.stroke();
    }
  }
  function text(c, s, x, y, size, fill, align, weight) {
    c.font = (weight || 600) + ' ' + size + 'px ' + FONT; c.textAlign = align || 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(s, x, y + 1); c.fillStyle = fill; c.fillText(s, x, y);
  }
  // segmented gradient bar with dark track
  function segBar(c, x, y, w, h, f, c0, c1, n) {
    f = clamp01(f); const gap = 1.5, sw = (w - gap * (n - 1)) / n, fill = f * n;
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    c.fillStyle = 'rgba(120,150,190,0.14)'; c.beginPath();
    for (let i = 0; i < n; i++) c.rect(x + i * (sw + gap), y, sw, h);
    c.fill();
    if (f <= 0) return;
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c0); g.addColorStop(1, c1);
    c.fillStyle = g; c.beginPath();
    for (let i = 0; i < n && i < fill; i++) c.rect(x + i * (sw + gap), y, sw * Math.min(1, fill - i), h);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x, y, Math.min(w, f * w), 1);
  }

  H.top = function (c, st, t) {
    st = st || {}; t = num(t, 0);
    const w = num(st.w, 800), sa = st.sa || {}, cx = w / 2, y0 = num(sa.t, 0) + 8;
    const fc = Array.isArray(st.fcol) ? st.fcol : FCOL, alive = st.alive || [];
    const f = i => col(fc[i], FCOL[i % 8]);
    c.save();
    let bottom = y0;
    if (st.cond === 'capture') {
      const bw = Math.min(320, w - 40 - num(sa.l, 0) - num(sa.r, 0)), bh = 12, x = cx - bw / 2, y = y0 + 4;
      panel(c, x - 8, y0 - 3, bw + 16, 44, 8);
      const sh = Array.isArray(st.shares) ? st.shares : [];
      let tot = 0; for (let i = 0; i < sh.length; i++) tot += Math.max(0, num(sh[i], 0));
      c.save(); rr(c, x, y, bw, bh, bh / 2); c.clip();
      c.fillStyle = 'rgba(10,16,26,0.95)'; c.fillRect(x, y, bw, bh);
      const xs = []; let px = x;
      for (let i = 0; i < sh.length; i++) {
        const s = Math.max(0, num(sh[i], 0)); if (s <= 0) continue;
        const sw = bw * Math.min(1, s), cc = f(i), g = c.createLinearGradient(0, y, 0, y + bh);
        g.addColorStop(0, A.mix ? A.mix(cc, 0.35) : cc); g.addColorStop(0.55, cc); g.addColorStop(1, A.mix ? A.mix(cc, -0.45) : cc);
        c.fillStyle = g; c.fillRect(px, y, sw, bh); px += sw; xs.push(px);
      }
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y + 1, bw, 2);
      c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < xs.length; i++) {
        if (xs[i] >= x + bw - 1) continue;
        c.fillStyle = 'rgba(160,225,255,0.18)'; c.fillRect(xs[i] - 3, y - 2, 6, bh + 4);
        c.fillStyle = 'rgba(255,255,255,0.95)'; c.fillRect(xs[i] - 0.75, y - 2, 1.5, bh + 4);
      }
      c.restore();
      rr(c, x, y, bw, bh, bh / 2); c.lineWidth = 1; c.strokeStyle = 'rgba(190,225,255,0.45)'; c.stroke();
      text(c, fmt(st.time), cx, y + bh + 14, 14, '#e8f4ff', 'center', 700);
      bottom = y0 + 41;
    } else if (st.mode === 'ffa') {
      panel(c, cx - 78, y0, 156, 28, 8);
      text(c, num(st.aliveTotal, 0) + ' alive', cx - 32, y0 + 14, 13, '#e8f4ff', 'center', 700);
      text(c, '·', cx, y0 + 14, 13, ACC); text(c, fmt(st.time), cx + 34, y0 + 14, 13, ACC, 'center', 700);
      bottom = y0 + 28;
    } else {
      panel(c, cx - 112, y0, 224, 28, 8);
      text(c, NAMES[0] + ' ' + num(alive[0], 0), cx - 106, y0 + 14, 13, f(0), 'left', 800);
      text(c, num(alive[1], 0) + ' ' + NAMES[1], cx + 106, y0 + 14, 13, f(1), 'right', 800);
      text(c, fmt(st.time), cx, y0 + 14, 14, '#e8f4ff', 'center', 700);
      bottom = y0 + 28;
    }
    if (st.lost) {
      const p = 0.7 + 0.3 * Math.sin(t * 5);
      panel(c, cx - 118, bottom + 6, 236, 24, 8, '#ff5a5a');
      text(c, 'Connection to host lost…', cx, bottom + 18, 12, 'rgba(255,120,120,' + p + ')', 'center', 700); bottom += 30;
    }
    if (st.stormOn) {
      const p = 0.65 + 0.35 * Math.sin(t * 6);
      text(c, 'STORM CLOSING IN', cx, bottom + 14, 12, 'rgba(255,90,70,' + p + ')', 'center', 800);
    } else if (num(st.stormIn, 0) > 0) {
      text(c, 'Storm in ' + fmt(st.stormIn), cx, bottom + 14, 11, st.stormIn < 15 ? '#ffb45a' : 'rgba(190,210,235,0.8)', 'center', 600);
    }
    c.restore();
  };

  H.bars = function (c, st, t) {
    st = st || {}; t = num(t, 0);
    const x = num(st.x, 12), y = num(st.y, 12), W = 208, lv = st.lv || [], cc = col(st.col, ACC);
    const hp = clamp01(st.hpf), hasSh = !!st.hasShield;
    const hh = 8 + (hasSh ? 14 : 0) + 18 + 12 + 24;
    c.save();
    panel(c, x - 8, y - 8, W + 16, hh + 8, 8, cc);
    let yy = y;
    const low = hp < 0.3, pulse = low ? 0.7 + 0.3 * Math.sin(t * 8) : 1;
    c.globalAlpha = pulse;
    segBar(c, x, yy, W, 8, hp, low ? '#ff7a6a' : hp < 0.6 ? '#ffd070' : '#8cf0a0', low ? '#c02a2a' : hp < 0.6 ? '#d08a1a' : '#26b866', 14);
    c.globalAlpha = 1; yy += 14;
    if (hasSh) { segBar(c, x, yy, W, 6, st.shf, '#bff0ff', '#2a8fe0', 14); yy += 12; }
    segBar(c, x, yy, W, 4, st.xpf, '#d6b8ff', '#7a5ae0', 20); yy += 11;
    const mx = Math.max(1, Math.min(30, num(st.maxLevel, 0) | 0)), lvl = num(st.level, 0);
    if (st.maxLevel > 0) {
      const pw = Math.min(8, (W - (mx - 1) * 2) / mx);
      for (let i = 0; i < mx; i++) {
        c.fillStyle = i < lvl ? ACC : 'rgba(120,150,190,0.22)'; c.fillRect(x + i * (pw + 2), yy, pw, 4);
      }
    }
    yy += 10;
    const sl = (W - 12 * 2) / 13;
    for (let i = 0; i < 13; i++) {
      const sx = x + i * (sl + 2), l = num(lv[i], 0), on = l > 0, mc = (A.COL8 && A.COL8[i % 8]) || ACC;
      rr(c, sx, yy, sl, sl, 2); c.fillStyle = on ? rgba(col(mc, ACC), 0.20) : 'rgba(0,0,0,0.4)'; c.fill();
      c.lineWidth = 1; c.strokeStyle = on ? rgba(col(mc, ACC), 0.8) : 'rgba(120,150,190,0.2)'; c.stroke();
      if (typeof H.icon === 'function') { try { H.icon(c, i, sx + sl / 2, yy + sl / 2, sl * 0.78, on ? '#eaf6ff' : 'rgba(150,170,200,0.3)'); } catch (e) { } }
      else if (on) { c.fillStyle = '#eaf6ff'; c.fillRect(sx + sl / 2 - 2, yy + sl / 2 - 2, 4, 4); }
      for (let k = 0; k < l; k++) { c.fillStyle = '#fff'; c.fillRect(sx + 1.5 + k * 3, yy + sl - 3, 2, 1.5); }
    }
    c.restore();
  };

  H.fsButton = function (c, r, t) {
    r = r || {}; const x = num(r.x, 0), y = num(r.y, 0), w = num(r.w, 36), h = num(r.h, 36);
    c.save(); panel(c, x, y, w, h, 8, ACC, false);
    const cx = x + w / 2, cy = y + h / 2, s = Math.min(w, h) * 0.26, k = s * 0.55, p = 0.6 + 0.2 * Math.sin(num(t, 0) * 2);
    c.strokeStyle = 'rgba(190,235,255,' + p + ')'; c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(d => {
      c.moveTo(cx + d[0] * s, cy + d[1] * (s - k)); c.lineTo(cx + d[0] * s, cy + d[1] * s); c.lineTo(cx + d[0] * (s - k), cy + d[1] * s);
    });
    c.stroke(); c.restore();
  };

  H.log = function (c, lines, x, y, now) {
    if (!lines || !lines.length) return;
    now = num(now, Date.now()); x = num(x, 0); y = num(y, 0);
    c.save(); let yy = y;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i]; if (!L) continue;
      const age = (now - num(L.at, now)) / 1000; if (age > 7) continue;
      const a = age < 5.5 ? 1 : Math.max(0, (7 - age) / 1.5); if (a <= 0) continue;
      c.globalAlpha = a; c.font = '600 12px ' + FONT; c.textAlign = 'right'; c.textBaseline = 'middle';
      const s = String(L.t || ''), tw = c.measureText(s).width;
      c.fillStyle = 'rgba(8,14,24,0.6)'; rr(c, x - tw - 10, yy - 8, tw + 14, 17, 4); c.fill();
      c.fillStyle = ACC; c.fillRect(x + 3, yy - 8, 1.5, 17);
      c.fillStyle = '#e4f1ff'; c.fillText(s, x - 3, yy + 1); yy += 20;
    }
    c.restore();
  };

  H.arrow = function (c, x, y, ang, cc) {
    cc = col(cc, ACC); c.save(); c.translate(num(x, 0), num(y, 0)); c.rotate(num(ang, 0));
    A.glow && A.glow(c, 0, 0, 22, rgba(cc, 0.55), 0.7);
    c.beginPath(); c.moveTo(11, 0); c.lineTo(-7, -9); c.lineTo(-2, 0); c.lineTo(-7, 9); c.closePath();
    c.fillStyle = cc; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(5,10,18,0.85)'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(11, 0); c.lineTo(-7, -9); c.lineTo(-2, 0); c.closePath(); c.fill();
    c.restore();
  };

  H.banner = function (c, s, x, y, cc) {
    s = String(s == null ? '' : s); cc = col(cc, ACC); const p = 0.5 + 0.5 * Math.sin(nowS() * 4);
    c.save(); c.font = '800 20px ' + FONT; const tw = c.measureText(s).width, w = tw + 48, h = 38;
    c.translate(num(x, 0), num(y, 0)); c.globalAlpha = 0.88 + 0.12 * p;
    panel(c, -w / 2, -h / 2, w, h, 10, cc);
    c.globalAlpha = 1; c.fillStyle = rgba(cc, 0.5 + 0.5 * p); c.fillRect(-w / 2 + 8, h / 2 - 3, w - 16, 1.5);
    text(c, s, 0, 0, 20, '#fff', 'center', 800); c.restore();
  };

  // WORLD coords; cheap: no gradients, ~10 ops
  H.shipTag = function (c, o) {
    if (!o) return;
    const x = num(o.x, 0), r = num(o.r, 18), y = num(o.y, 0) - r * 1.9 - 10, hp = clamp01(o.hpf), me = !!o.isMe;
    c.save(); c.fillStyle = 'rgba(4,8,14,0.7)'; c.fillRect(x - 21, y - 2, 42, o.hasShield ? 9 : 6);
    c.fillStyle = hp < 0.3 ? '#ff5a4a' : hp < 0.6 ? '#ffc04a' : '#5ee08a'; c.fillRect(x - 20, y - 1, 40 * hp, 3);
    if (o.hasShield) { c.fillStyle = '#5fd0ff'; c.fillRect(x - 20, y + 3, 40 * clamp01(o.shf), 3); }
    if (o.name) {
      c.font = (me ? '700 ' : '600 ') + '10px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillText(o.name, x + 0.5, y - 3.5);
      c.fillStyle = me ? '#fff' : col(o.col, '#dce8f5'); c.fillText(o.name, x, y - 4);
    }
    c.restore();
  };
})();
