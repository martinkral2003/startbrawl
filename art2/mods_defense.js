// Art2 defense modules: armor, shield emitter hardware, engines (+flames), repair rack, afterburner fins.
(function () {
  const A = window.Art2 = window.Art2 || {};
  A.mods = A.mods || {};
  const { litGrad, mix, rgba, glow, STEEL, TAU } = A;
  const SEAM = 'rgba(8,12,20,0.75)';

  // teardrop flame pointing toward -x from (x0,y)
  function drop(c, x0, y, len, w, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x0, y - w);
    c.quadraticCurveTo(x0 - len * 0.55, y - w * 0.9, x0 - len, y);
    c.quadraticCurveTo(x0 - len * 0.55, y + w * 0.9, x0, y + w); c.closePath(); c.fill();
  }
  function flame(c, o, x0, y, len, w, k, hot) {
    const t = o.t || 0, f = 1 + 0.12 * Math.sin(t * 47 + k * 2.1) + 0.08 * Math.sin(t * 83 + k * 1.3) + 0.05 * Math.sin(t * 131 + k);
    len *= f; w *= 0.92 + 0.08 * Math.sin(t * 61 + k);
    c.save(); c.globalCompositeOperation = 'lighter';
    glow(c, x0 - len * 0.3, y, len * 0.75 + w * 2, hot ? 'rgba(140,200,255,0.55)' : 'rgba(70,150,255,0.4)', 0.8);
    drop(c, x0, y, len, w * 1.5, hot ? 'rgba(80,150,255,0.35)' : 'rgba(40,120,255,0.3)');
    drop(c, x0, y, len * 0.78, w * 1.0, 'rgba(90,220,255,0.65)');
    drop(c, x0, y, len * 0.5, w * 0.55, 'rgba(255,255,255,0.9)');
    c.restore();
  }

  A.mods.engines = function (c, o) {
    const r = o.r, l = o.l | 0, thr = o.thr || 0, boost = o.boost ? 1 : 0, t = o.t || 0;
    const nl = r * (0.4 + 0.07 * l), hw = r * (0.1 + 0.025 * l), xf = -0.8 * r, xb = xf - nl, yy = r * 0.32;
    const power = 0.3 + 0.7 * thr;
    const len = r * (0.35 + 0.3 * l) * (0.25 + 0.75 * thr) * (1 + 0.9 * boost);
    for (let s = -1; s <= 1; s += 2) {
      const y = s * yy;
      // flame first (behind nacelle)
      flame(c, o, xb + 2, y, len + r * 0.1, hw * (0.75 + 0.15 * l) * (0.6 + 0.4 * power) * (1 + 0.3 * boost), s, boost);
      if (l >= 2 && o.lod) { // fins
        c.fillStyle = litGrad(c, o.ang, r * 0.4, mix(STEEL, 0.1), mix(STEEL, -0.35), mix(STEEL, -0.65));
        c.beginPath(); c.moveTo(xf + r * 0.05, y + s * hw * 0.8); c.lineTo(xb - r * 0.08, y + s * (hw + r * (0.1 + 0.03 * l)));
        c.lineTo(xb + nl * 0.3, y + s * hw * 0.8); c.closePath(); c.fill(); c.strokeStyle = SEAM; c.lineWidth = 0.7; c.stroke();
      }
      // nacelle body
      c.fillStyle = litGrad(c, o.ang, hw * 1.2, mix(STEEL, 0.28), mix(STEEL, -0.2), mix(STEEL, -0.62));
      c.beginPath(); c.moveTo(xf, y - hw * 0.8); c.lineTo(xf - nl * 0.15, y - hw);
      c.lineTo(xb + nl * 0.1, y - hw); c.lineTo(xb, y - hw * 0.85); c.lineTo(xb, y + hw * 0.85);
      c.lineTo(xb + nl * 0.1, y + hw); c.lineTo(xf - nl * 0.15, y + hw); c.lineTo(xf, y + hw * 0.8); c.closePath(); c.fill();
      c.strokeStyle = SEAM; c.lineWidth = 0.8; c.stroke();
      if (o.lod) { // seams + rim light
        c.beginPath(); c.moveTo(xf - nl * 0.45, y - hw); c.lineTo(xf - nl * 0.45, y + hw);
        if (l >= 1) { c.moveTo(xf - nl * 0.7, y - hw); c.lineTo(xf - nl * 0.7, y + hw); }
        c.stroke();
        c.strokeStyle = 'rgba(220,235,255,0.28)'; c.lineWidth = 0.6; c.beginPath();
        c.moveTo(xf - nl * 0.1, y - hw * 0.9); c.lineTo(xb + nl * 0.15, y - hw * 0.9); c.stroke();
      }
      // nozzle ring + hot interior
      c.fillStyle = '#10151d'; c.beginPath(); c.ellipse(xb, y, hw * 0.28, hw * 0.85, 0, 0, TAU); c.fill();
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = boost ? 'rgba(170,220,255,0.8)' : `rgba(90,190,255,${0.25 + 0.5 * power})`;
      c.beginPath(); c.ellipse(xb, y, hw * 0.16, hw * 0.6, 0, 0, TAU); c.fill(); c.restore();
      if (l >= 3) glow(c, xb, y, hw * 2.4, 'rgba(80,170,255,0.5)', 0.4 + 0.4 * power + 0.05 * Math.sin(t * 20));
    }
  };

  A.mods.armor = function (c, o) {
    const l = o.l | 0; if (!l) return;
    const r = o.r, th = r * (0.09 + 0.035 * l), pl = r * (0.5 + 0.04 * l), span = r * 1.0;
    const step = l > 1 ? (span - pl) / (l - 1) : 0, x00 = l > 1 ? -0.65 * r : -0.1 * r - pl / 2;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < l; i++) {
        const xa = x00 + i * step, xb = xa + pl, yi = s * 0.45 * r, yo = s * (0.45 * r + th), bul = s * r * 0.04;
        c.fillStyle = litGrad(c, o.ang, r * 0.5, mix(STEEL, 0.22 - i * 0.04), mix(STEEL, -0.28), mix(STEEL, -0.66));
        c.beginPath(); c.moveTo(xa, yi); c.lineTo(xa + pl * 0.12, yo);
        c.quadraticCurveTo((xa + xb) / 2, yo + bul, xb - pl * 0.12, yo);
        c.lineTo(xb, yi); c.closePath(); c.fill();
        c.strokeStyle = SEAM; c.lineWidth = 0.9; c.stroke();
        if (!o.lod) continue;
        // bevel highlight along outer edge
        c.strokeStyle = 'rgba(225,238,255,0.4)'; c.lineWidth = 0.7; c.beginPath();
        c.moveTo(xa + pl * 0.14, yo - s * th * 0.2); c.quadraticCurveTo((xa + xb) / 2, yo + bul - s * th * 0.2, xb - pl * 0.14, yo - s * th * 0.2); c.stroke();
        // inner shadow seam
        c.strokeStyle = 'rgba(5,8,14,0.5)'; c.beginPath(); c.moveTo(xa + pl * 0.1, yi + s * th * 0.4); c.lineTo(xb - pl * 0.05, yi + s * th * 0.4); c.stroke();
        // bolts
        c.fillStyle = mix(STEEL, -0.55);
        const br = Math.max(0.6, r * 0.022);
        for (let b = 0; b < 2; b++) { c.beginPath(); c.arc(xa + pl * (0.25 + 0.5 * b), s * (0.45 * r + th * 0.55), br, 0, TAU); c.fill(); }
        if (l >= 3 && i === 1) { c.strokeStyle = rgba(o.col || '#37c2ff', 0.7); c.lineWidth = 0.8; c.beginPath(); c.moveTo(xa + pl * 0.2, yo - s * th * 0.45); c.lineTo(xb - pl * 0.2, yo - s * th * 0.45); c.stroke(); }
      }
    }
  };

  A.mods.shield = function (c, o) {
    const l = o.l | 0; if (!l) return;
    const r = o.r, t = o.t || 0, rad = r * (0.17 + 0.04 * l), x = -0.15 * r;
    const la = A.LIGHT - o.ang, hx = Math.cos(la) * rad * 0.4, hy = Math.sin(la) * rad * 0.4;
    const sc = o.col || '#37c2ff', cc = mix(sc, 0.2);
    c.fillStyle = '#10151d'; c.beginPath(); c.arc(x, 0, rad * 1.18, 0, TAU); c.fill(); // base collar
    c.strokeStyle = SEAM; c.lineWidth = 0.8; c.stroke();
    if (l >= 2 && o.lod) { // emitter prongs
      c.fillStyle = mix(STEEL, -0.45);
      const n = 2 + l * 2;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.4; c.beginPath(); c.arc(x + Math.cos(a) * rad * 1.18, Math.sin(a) * rad * 1.18, r * 0.04, 0, TAU); c.fill(); }
    }
    const g = c.createRadialGradient(x + hx, hy, rad * 0.05, x, 0, rad);
    g.addColorStop(0, mix(STEEL, 0.4)); g.addColorStop(0.55, mix(STEEL, -0.3)); g.addColorStop(1, mix(STEEL, -0.7));
    c.fillStyle = g; c.beginPath(); c.arc(x, 0, rad, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(8,12,20,0.7)'; c.lineWidth = 0.7; c.stroke();
    if (o.lod) { // dish rim light + seam ring
      c.strokeStyle = 'rgba(220,235,255,0.3)'; c.lineWidth = 0.7; c.beginPath(); c.arc(x, 0, rad * 0.95, la + 0.6, la + 2.5); c.stroke();
      c.strokeStyle = 'rgba(8,12,20,0.5)'; c.beginPath(); c.arc(x, 0, rad * 0.62, 0, TAU); c.stroke();
    }
    const pulse = 0.55 + 0.25 * Math.sin(t * 2.4);
    glow(c, x, 0, rad * (0.85 + 0.1 * l), rgba(sc, 0.9), pulse * (0.35 + 0.15 * l));
    c.fillStyle = cc; c.globalAlpha = 0.55 + 0.3 * pulse; c.beginPath(); c.arc(x, 0, rad * 0.2, 0, TAU); c.fill(); c.globalAlpha = 1;
  };

  A.mods.repair = function (c, o) {
    const l = o.l | 0; if (!l) return;
    const r = o.r, t = o.t || 0, w = r * (0.2 + 0.03 * l), h = r * 0.1, x = 0.05 * r;
    for (let s = -1; s <= 1; s += 2) {
      const y = s * 0.18 * r;
      c.fillStyle = litGrad(c, o.ang, h * 1.5, mix('#6f8f7a', 0.25), mix('#4c6656', -0.25), mix('#2b3a31', -0.55));
      c.beginPath(); c.rect(x - w / 2, y - h / 2, w, h); c.fill();
      c.strokeStyle = SEAM; c.lineWidth = 0.7; c.stroke();
      if (!o.lod) { glow(c, x, y, w * 0.6, 'rgba(80,255,130,0.5)', 0.4); continue; }
      const n = 2 + l;
      for (let i = 0; i < n; i++) {
        const lx = x - w / 2 + w * (i + 0.5) / n, p = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.3 + s);
        glow(c, lx, y, r * 0.07, 'rgba(90,255,140,0.9)', 0.25 + 0.55 * p);
        c.fillStyle = `rgba(150,255,180,${0.5 + 0.5 * p})`; c.beginPath(); c.arc(lx, y, r * 0.016, 0, TAU); c.fill();
      }
      // tiny plus mark
      const pr = r * 0.025, px = x - w / 2 + pr * 1.6, py = y - s * h * 0.9;
      c.strokeStyle = 'rgba(120,255,160,0.75)'; c.lineWidth = 0.7; c.beginPath();
      c.moveTo(px - pr, py); c.lineTo(px + pr, py); c.moveTo(px, py - pr); c.lineTo(px, py + pr); c.stroke();
    }
  };

  A.mods.afterburner = function (c, o) {
    const l = o.l | 0; if (!l) return;
    const r = o.r, t = o.t || 0, boost = o.boost === 1, fx = -0.8 * r, fy = 0.95 * r;
    const glowA = (0.3 + 0.12 * l) * (0.8 + 0.2 * Math.sin(t * 9)) + (boost ? 0.5 : 0);
    for (let s = -1; s <= 1; s += 2) {
      const y0 = s * fy, fl = r * (0.2 + 0.05 * l);
      if (boost) { // big flare behind (drawn first)
        flame(c, o, fx - r * 0.25, y0, r * (1.2 + 0.35 * l), r * 0.11, s * 3, 1);
        c.save(); c.strokeStyle = 'rgba(160,210,255,0.22)'; c.lineWidth = 1.2;
        for (let k = 0; k < 2; k++) {
          const ph = (t * 2.2 + k * 0.5 + (s > 0 ? 0.25 : 0)) % 1;
          c.globalAlpha = 0.5 * (1 - ph); c.beginPath(); c.ellipse(fx - r * (0.4 + ph * 1.1), y0, r * (0.08 + ph * 0.12), r * (0.16 + ph * 0.3), 0, 0, TAU); c.stroke();
        }
        c.restore();
      }
      // swept fin
      c.fillStyle = litGrad(c, o.ang, r * 0.3, mix(STEEL, 0.2), mix(STEEL, -0.32), mix(STEEL, -0.68));
      c.beginPath(); c.moveTo(fx + fl * 0.8, y0 - s * r * 0.1); c.lineTo(fx - fl * 1.1, y0 + s * r * 0.05);
      c.lineTo(fx - fl * 0.5, y0 - s * r * 0.1); c.closePath(); c.fill();
      c.strokeStyle = SEAM; c.lineWidth = 0.8; c.stroke();
      // glowing trailing edge
      c.save(); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = boost ? `rgba(200,230,255,${Math.min(1, glowA)})` : `rgba(255,150,60,${glowA})`;
      c.lineWidth = Math.max(1, r * 0.04); c.lineCap = 'round'; c.beginPath();
      c.moveTo(fx - fl * 1.1, y0 + s * r * 0.05); c.lineTo(fx - fl * 0.5, y0 - s * r * 0.1); c.stroke(); c.restore();
      glow(c, fx - fl * 0.9, y0 + s * r * 0.02, r * (0.14 + 0.05 * l), boost ? 'rgba(190,225,255,0.9)' : 'rgba(255,140,50,0.8)', Math.min(1, glowA));
      if (o.lod) { c.strokeStyle = 'rgba(225,238,255,0.3)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(fx + fl * 0.7, y0 - s * r * 0.09); c.lineTo(fx - fl * 0.4, y0 - s * r * 0.09); c.stroke(); }
    }
  };
})();
