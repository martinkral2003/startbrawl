// Art2 HUD controls: module icons, skill buttons, joystick, upgrade cards, lock-on reticle (screen space, except reticle = world).
(function () {
  const A = window.Art2 = window.Art2 || {};
  const H = A.hud = A.hud || {};
  const TAU = Math.PI * 2;
  const MODCOL = H.MODCOL = ['#c8d0e0', '#ff6b6b', '#66ccff', '#99eeff', '#69db7c', '#ffa94d', '#ffd43b', '#b197fc', '#ff8787', '#74c0fc', '#99ffff', '#ffb870', '#e599f7'];
  const FONT = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---- icons: drawn in a unit box (radius 1), scaled to size/2 ----
  const ICON = [
    // 0 ARM: shield plate
    (c, col) => {
      c.beginPath(); c.moveTo(-0.7, -0.8); c.lineTo(0.7, -0.8); c.lineTo(0.7, 0.1); c.quadraticCurveTo(0.7, 0.6, 0, 0.95);
      c.quadraticCurveTo(-0.7, 0.6, -0.7, 0.1); c.closePath(); c.globalAlpha *= 0.35; c.fill(); c.globalAlpha /= 0.35; c.stroke();
      c.beginPath(); c.moveTo(0, -0.7); c.lineTo(0, 0.75); c.moveTo(-0.45, -0.2); c.lineTo(0.45, -0.2); c.stroke();
    },
    // 1 LAS: twin beams
    (c) => {
      for (const y of [-0.38, 0.38]) { c.beginPath(); c.moveTo(-0.85, y); c.lineTo(0.55, y); c.stroke(); c.beginPath(); c.arc(0.78, y, 0.14, 0, TAU); c.fill(); }
    },
    // 2 SHD: bubble
    (c) => {
      c.beginPath(); c.arc(0, 0, 0.8, 0, TAU); c.globalAlpha *= 0.25; c.fill(); c.globalAlpha /= 0.25; c.stroke();
      c.beginPath(); c.arc(0, 0, 0.5, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
    },
    // 3 ENG: flame
    (c) => {
      c.beginPath(); c.moveTo(0, -0.95); c.bezierCurveTo(0.9, -0.2, 0.7, 0.9, 0, 0.9); c.bezierCurveTo(-0.7, 0.9, -0.9, -0.1, 0, -0.95); c.globalAlpha *= 0.4; c.fill(); c.globalAlpha /= 0.4; c.stroke();
      c.beginPath(); c.moveTo(0, 0.1); c.bezierCurveTo(0.3, 0.4, 0.2, 0.75, 0, 0.75); c.bezierCurveTo(-0.25, 0.75, -0.3, 0.4, 0, 0.1); c.fill();
    },
    // 4 REP: plus + dots
    (c) => {
      c.beginPath(); c.moveTo(0, -0.65); c.lineTo(0, 0.65); c.moveTo(-0.65, 0); c.lineTo(0.65, 0); c.stroke();
      for (const [x, y] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) { c.beginPath(); c.arc(x, y, 0.13, 0, TAU); c.fill(); }
    },
    // 5 MIS: missile diagonal
    (c) => {
      c.rotate(-Math.PI / 4); c.beginPath(); c.moveTo(0.95, 0); c.lineTo(0.5, -0.27); c.lineTo(-0.6, -0.27); c.lineTo(-0.6, 0.27); c.lineTo(0.5, 0.27); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-0.15, -0.27); c.lineTo(-0.6, -0.75); c.lineTo(-0.7, -0.27); c.moveTo(-0.15, 0.27); c.lineTo(-0.6, 0.75); c.lineTo(-0.7, 0.27); c.fill();
      c.beginPath(); c.moveTo(-0.75, -0.12); c.lineTo(-1.05, 0); c.lineTo(-0.75, 0.12); c.stroke();
    },
    // 6 TOR: torpedo with ring
    (c) => {
      c.beginPath(); c.moveTo(-0.85, -0.25); c.lineTo(0.35, -0.25); c.quadraticCurveTo(0.95, 0, 0.35, 0.25); c.lineTo(-0.85, 0.25); c.closePath(); c.globalAlpha *= 0.5; c.fill(); c.globalAlpha /= 0.5; c.stroke();
      c.beginPath(); c.ellipse(0.1, 0, 0.18, 0.6, 0, 0, TAU); c.stroke();
    },
    // 7 DRN: small drone
    (c) => {
      c.beginPath(); c.arc(0, 0, 0.3, 0, TAU); c.fill();
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 0.7, y = Math.sin(a) * 0.7;
        c.beginPath(); c.moveTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3); c.lineTo(x, y); c.stroke(); c.beginPath(); c.arc(x, y, 0.2, 0, TAU); c.fill(); }
    },
    // 8 MIN: spiked mine
    (c) => {
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * 0.45, Math.sin(a) * 0.45); c.lineTo(Math.cos(a) * 0.9, Math.sin(a) * 0.9); c.stroke(); }
      c.beginPath(); c.arc(0, 0, 0.5, 0, TAU); c.fill();
    },
    // 9 DSH: chevrons
    (c) => {
      for (const x of [-0.5, 0.1]) { c.beginPath(); c.moveTo(x, -0.7); c.lineTo(x + 0.6, 0); c.lineTo(x, 0.7); c.stroke(); }
    },
    // 10 RAIL: long bolt
    (c) => {
      c.beginPath(); c.moveTo(-0.95, 0); c.lineTo(0.5, 0); c.stroke();
      c.beginPath(); c.moveTo(0.98, 0); c.lineTo(0.35, -0.38); c.lineTo(0.35, 0.38); c.closePath(); c.fill();
      for (const x of [-0.7, -0.25]) { c.beginPath(); c.moveTo(x, -0.45); c.lineTo(x, 0.45); c.stroke(); }
    },
    // 11 GRV: spiral
    (c) => {
      c.beginPath(); for (let i = 0; i <= 40; i++) { const a = i * 0.2, r = 0.1 + i * 0.021; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke();
      c.beginPath(); c.arc(0, 0, 0.12, 0, TAU); c.fill();
    },
    // 12 PUL: concentric waves
    (c) => {
      c.beginPath(); c.arc(0, 0, 0.17, 0, TAU); c.fill();
      for (const r of [0.45, 0.8]) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    }
  ];

  H.icon = (ctx, mod, x, y, size, col) => {
    const f = ICON[mod | 0]; if (!f) return;
    col = col || MODCOL[mod | 0];
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 2, size / 2);
    ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = size < 24 ? 0.24 : 0.16; ctx.lineCap = ctx.lineJoin = 'round';
    f(ctx, col); ctx.restore();
  };

  // ---- skill button ----
  H.skillButton = (ctx, b, info, t) => {
    const r = b.r, m = info.mod, col = info.col || (m >= 0 ? MODCOL[m] : '#8c9bb0');
    ctx.save(); ctx.translate(b.x, b.y);
    if (m < 0) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = 'rgba(10,14,22,0.35)'; ctx.fill();
      ctx.setLineDash([r * 0.2, r * 0.16]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(140,155,176,0.4)';
      ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, TAU); ctx.stroke(); ctx.restore(); return;
    }
    const cd = info.cd || 0, cooling = !info.ready && cd > 0, frac = cooling ? clamp(cd / (info.cdMax || cd), 0, 1) : 0;
    if (info.ready) { // pulsing outer ring
      const p = 0.5 + 0.5 * Math.sin(t * 5);
      A.glow(ctx, 0, 0, r * (1.5 + 0.15 * p), A.rgba(col, 0.45), 0.5 + 0.4 * p);
      ctx.beginPath(); ctx.arc(0, 0, r + 3 + p * 3, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = A.rgba(col, 0.35 + 0.5 * p); ctx.stroke();
    }
    // bezel
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = A.litGrad(ctx, 0, r, '#d5deea', '#69768a', '#1d2430'); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fillStyle = A.litGrad(ctx, 0, r, '#1a212c', '#3a465a', '#aab6c8'); ctx.fill();
    // glass face
    const fr = r * 0.82, g = ctx.createRadialGradient(-fr * 0.3, -fr * 0.35, 0, 0, 0, fr);
    g.addColorStop(0, A.mix(col, -0.55)); g.addColorStop(1, 'rgb(8,11,17)');
    ctx.beginPath(); ctx.arc(0, 0, fr, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.globalAlpha = cooling ? 0.4 : 1;
    H.icon(ctx, m, 0, 0, r * 1.05, cooling ? A.mix(col, -0.2) : A.mix(col, 0.25));
    ctx.globalAlpha = 1;
    if (cooling) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, fr, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.closePath();
      ctx.fillStyle = 'rgba(2,4,8,0.62)'; ctx.fill();
      ctx.font = `700 ${r * 0.8 | 0}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(Math.ceil(cd), 1, 2);
      ctx.fillStyle = '#f2f6fb'; ctx.fillText(Math.ceil(cd), 0, 1);
    }
    // glass highlight + thin colour rim
    ctx.beginPath(); ctx.arc(0, 0, fr, Math.PI * 1.05, Math.PI * 1.6); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, fr, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = A.rgba(col, info.ready ? 0.8 : 0.35); ctx.stroke();
    ctx.restore();
  };

  // ---- joystick ----
  H.joystick = (ctx, j) => {
    const R = 56;
    let dx = j.x - j.bx, dy = j.y - j.by; const d = Math.hypot(dx, dy), k = d > R ? R / d : 1; dx *= k; dy *= k;
    const mag = Math.min(1, d / R);
    ctx.save(); ctx.translate(j.bx, j.by);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
    const g = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R); g.addColorStop(0, 'rgba(20,30,45,0.12)'); g.addColorStop(1, 'rgba(95,208,255,0.16)');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(160,200,230,0.35)'; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(190,225,250,0.4)'; ctx.beginPath();
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24, l = i % 6 === 0 ? 10 : 5; ctx.moveTo(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3)); ctx.lineTo(Math.cos(a) * (R - 3 - l), Math.sin(a) * (R - 3 - l)); }
    ctx.stroke();
    A.glow(ctx, dx, dy, 34, 'rgba(95,208,255,0.9)', 0.25 + 0.35 * mag);
    ctx.beginPath(); ctx.arc(dx, dy, 20, 0, TAU);
    const kg = ctx.createRadialGradient(dx - 6, dy - 7, 1, dx, dy, 20); kg.addColorStop(0, 'rgba(235,250,255,0.85)'); kg.addColorStop(0.6, 'rgba(95,208,255,0.55)'); kg.addColorStop(1, 'rgba(30,70,100,0.6)');
    ctx.fillStyle = kg; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(200,240,255,0.7)'; ctx.stroke();
    ctx.restore();
  };

  // ---- upgrade card ----
  H.upgradeCard = (ctx, c, info, t) => {
    const col = MODCOL[info.mod] || '#5fd0ff', { x, y, w, h } = c, pad = Math.max(6, h * 0.1);
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(34,44,60,0.78)'); g.addColorStop(1, 'rgba(10,14,22,0.8)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = A.rgba(col, 0.1); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col; ctx.fillRect(x, y, 4, h);                                   // accent bar
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + 4, y, w - 4, 1);       // lit top edge
    ctx.strokeStyle = 'rgba(150,180,210,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const isz = Math.min(h - pad * 2, w * 0.28), ix = x + 4 + pad + isz / 2, iy = y + h / 2;
    ctx.beginPath(); ctx.arc(ix, iy, isz / 2 + 2, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    H.icon(ctx, info.mod, ix, iy, isz * 0.8, col);
    const tx = ix + isz / 2 + pad + 2, fs = Math.max(11, Math.min(16, h * 0.2));
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = `700 ${fs}px ${FONT}`; ctx.fillStyle = '#eef4fb';
    ctx.fillText(info.name || '', tx, y + pad + fs, w - (tx - x) - pad - 22);
    // pips
    const py = y + pad + fs + 9, lf = info.lvFrom | 0, lt = info.lvTo | 0;
    for (let i = 0; i < 3; i++) {   // level bars: filled = owned, pulsing = the one you are about to gain
      const px = tx + i * 13, ph = 4;
      if (i < lf) { ctx.fillStyle = col; ctx.fillRect(px, py - 2, 11, ph); }
      else if (i < lt) { ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 6); ctx.fillStyle = col; ctx.fillRect(px, py - 2, 11, ph); ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py - 1.5, 10, ph - 1); }
      else { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(px, py - 2, 11, ph); }
    }
    ctx.textAlign = 'left'; ctx.font = `600 ${fs - 3}px ${FONT}`; ctx.fillStyle = 'rgba(200,215,230,0.75)'; ctx.fillText(`Lv ${lf} → ${lt}`, tx + 44, py + 3);
    ctx.font = `${fs - 2}px ${FONT}`; ctx.fillStyle = 'rgba(190,205,222,0.85)';
    ctx.fillText(info.desc || '', tx, y + h - pad - 1, w - (tx - x) - pad);
    // key number
    ctx.font = `700 ${fs}px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(String(info.idx), x + w - 7, y + fs + 4);
    if (info.active) { // ACTIVE tag
      ctx.font = `700 ${Math.max(8, fs - 6)}px ${FONT}`; const tw = ctx.measureText('ACTIVE').width + 8, th = Math.max(8, fs - 6) + 4, tgx = x + w - tw - 6, tgy = y + h - th - 5 - fs;
      ctx.fillStyle = A.rgba(col, 0.25); ctx.fillRect(tgx, tgy, tw, th); ctx.strokeStyle = A.rgba(col, 0.8); ctx.lineWidth = 1; ctx.strokeRect(tgx + 0.5, tgy + 0.5, tw - 1, th - 1);
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ACTIVE', tgx + tw / 2, tgy + th / 2 + 0.5);
    }
    ctx.restore();
  };

  // ---- lock-on reticle (world coords) ----
  H.reticle = (ctx, x, y, r, t) => {
    const p = 0.5 + 0.5 * Math.sin(t * 6), rr = r * (1 + 0.06 * p), L = Math.max(5, r * 0.4), lw = Math.max(1.5, r * 0.07);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.1);
    ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(255,90,90,${0.65 + 0.3 * p})`;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), q = (px, py) => [px * ca - py * sa, px * sa + py * ca];
      const p0 = q(rr, -rr + L), p1 = q(rr, -rr), p2 = q(rr - L, -rr); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.9, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = `rgba(255,120,120,${0.1 + 0.15 * p})`; ctx.stroke();
    ctx.restore();
  };
})();
