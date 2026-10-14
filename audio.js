'use strict';
// Star Brawl audio: everything is synthesized with Web Audio (no asset files).
// API: SFX.play(name, {v: volume 0..1, pan: -1..1}), SFX.unlock(), SFX.setSfx(bool), SFX.setMusic(bool), SFX.music(on)
(function () {
  let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null, musTimer = null, musOn = false, voices = 0;
  const last = {};
  const pref = { sfx: true, music: true };
  try { const j = JSON.parse(localStorage.getItem('sb_snd') || 'null'); if (j) { pref.sfx = j.sfx !== false; pref.music = j.music !== false; } } catch (e) {}
  const save = () => { try { localStorage.setItem('sb_snd', JSON.stringify(pref)); } catch (e) {} };

  function init() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ac = new AC(); } catch (e) { return null; }
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5;
    master = ac.createGain(); master.gain.value = 0.8; master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = pref.sfx ? 1 : 0; sfxBus.connect(master);
    musBus = ac.createGain(); musBus.gain.value = pref.music ? 0.5 : 0; musBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  function out(pan) {
    if (!pan || !ac.createStereoPanner) return sfxBus;
    const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(sfxBus); return p;
  }
  // one oscillator blip: frequency glides f0 -> f1
  function tone(o, f0, f1, dur, type, vol, delay) {
    const t = ac.currentTime + (delay || 0), os = ac.createOscillator(), g = ac.createGain();
    os.type = type || 'sine'; os.frequency.setValueAtTime(f0, t); if (f1 !== f0) os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(o); os.start(t); os.stop(t + dur + 0.05);
  }
  // filtered noise burst: cutoff glides c0 -> c1
  function noise(o, dur, c0, c1, vol, type, delay) {
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || 'lowpass'; f.frequency.setValueAtTime(c0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, c1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // name: [min interval s, builder(out, vol)]
  const S = {
    laser:   [0.07, (o, v) => { tone(o, 1500, 380, 0.09, 'square', 0.07 * v); }],
    hit:     [0.05, (o, v) => { noise(o, 0.07, 3000, 700, 0.18 * v, 'bandpass'); tone(o, 180, 90, 0.07, 'triangle', 0.15 * v); }],
    shield:  [0.08, (o, v) => { tone(o, 900, 1500, 0.14, 'sine', 0.14 * v); tone(o, 1350, 2200, 0.12, 'sine', 0.07 * v); }],
    boomS:   [0.05, (o, v) => { noise(o, 0.28, 2400, 200, 0.3 * v); tone(o, 120, 45, 0.25, 'sine', 0.3 * v); }],
    boomM:   [0.06, (o, v) => { noise(o, 0.55, 2000, 120, 0.4 * v); tone(o, 100, 35, 0.5, 'sine', 0.4 * v); }],
    boomL:   [0.1,  (o, v) => { noise(o, 1.0, 1800, 80, 0.5 * v); tone(o, 80, 28, 0.9, 'sine', 0.5 * v); noise(o, 0.5, 900, 100, 0.25 * v, 'lowpass', 0.12); }],
    death:   [0.1,  (o, v) => { noise(o, 1.1, 2600, 70, 0.55 * v); tone(o, 220, 30, 1.0, 'sawtooth', 0.25 * v); tone(o, 110, 25, 1.1, 'sine', 0.45 * v); }],
    shock:   [0.1,  (o, v) => { tone(o, 90, 40, 0.5, 'sine', 0.5 * v); noise(o, 0.5, 4000, 200, 0.3 * v, 'bandpass'); tone(o, 600, 150, 0.4, 'triangle', 0.15 * v); }],
    warp:    [0.1,  (o, v) => { tone(o, 300, 1400, 0.3, 'sine', 0.18 * v); tone(o, 1400, 200, 0.25, 'sine', 0.14 * v, 0.1); }],
    pickup:  [0.05, (o, v) => { tone(o, 880, 880, 0.08, 'triangle', 0.14 * v); tone(o, 1320, 1320, 0.14, 'triangle', 0.14 * v, 0.07); }],
    railCharge: [0.2, (o, v) => { tone(o, 200, 1800, 0.45, 'sawtooth', 0.12 * v); tone(o, 400, 3000, 0.45, 'sine', 0.08 * v); }],
    rail:    [0.1,  (o, v) => { noise(o, 0.35, 6000, 300, 0.35 * v, 'bandpass'); tone(o, 2200, 90, 0.35, 'sawtooth', 0.25 * v); }],
    missile: [0.1,  (o, v) => { noise(o, 0.45, 1800, 500, 0.22 * v, 'bandpass'); tone(o, 260, 600, 0.3, 'triangle', 0.1 * v); }],
    torpedo: [0.1,  (o, v) => { tone(o, 140, 50, 0.45, 'sawtooth', 0.22 * v); noise(o, 0.4, 900, 200, 0.2 * v); }],
    drone:   [0.1,  (o, v) => { for (let i = 0; i < 4; i++) tone(o, 500 + i * 120, 900 + i * 150, 0.12, 'square', 0.06 * v, i * 0.06); }],
    mine:    [0.1,  (o, v) => { tone(o, 500, 500, 0.07, 'sine', 0.15 * v); tone(o, 380, 380, 0.09, 'sine', 0.15 * v, 0.1); }],
    dash:    [0.1,  (o, v) => { noise(o, 0.4, 600, 5000, 0.28 * v, 'bandpass'); tone(o, 200, 700, 0.3, 'sawtooth', 0.1 * v); }],
    gravity: [0.1,  (o, v) => { tone(o, 400, 60, 0.7, 'sine', 0.35 * v); tone(o, 100, 300, 0.5, 'triangle', 0.15 * v); }],
    scatter: [0.08, (o, v) => { noise(o, 0.22, 5000, 500, 0.4 * v, 'bandpass'); tone(o, 220, 70, 0.2, 'sawtooth', 0.22 * v); noise(o, 0.12, 2500, 300, 0.25 * v, 'lowpass', 0.02); }],
    siphon:  [0.2,  (o, v) => { tone(o, 300, 520, 0.3, 'sine', 0.12 * v); tone(o, 450, 780, 0.28, 'triangle', 0.07 * v, 0.05); }],
    turret:  [0.15, (o, v) => { tone(o, 180, 90, 0.18, 'square', 0.14 * v); noise(o, 0.12, 2000, 600, 0.18 * v, 'bandpass'); tone(o, 720, 720, 0.07, 'triangle', 0.1 * v, 0.16); }],
    chrono:  [0.2,  (o, v) => { tone(o, 1200, 180, 0.5, 'sine', 0.2 * v); tone(o, 180, 1200, 0.35, 'triangle', 0.1 * v, 0.2); noise(o, 0.4, 6000, 800, 0.12 * v, 'highpass'); }],
    skillFail: [0.15, (o, v) => { tone(o, 160, 120, 0.12, 'square', 0.1 * v); }],
    click:   [0.03, (o, v) => { tone(o, 700, 500, 0.05, 'triangle', 0.18 * v); }],
    back:    [0.03, (o, v) => { tone(o, 500, 330, 0.06, 'triangle', 0.16 * v); }],
    join:    [0.1,  (o, v) => { tone(o, 520, 520, 0.1, 'triangle', 0.15 * v); tone(o, 780, 780, 0.16, 'triangle', 0.15 * v, 0.09); }],
    offer:   [0.3,  (o, v) => { [660, 880, 1320].forEach((f, i) => tone(o, f, f, 0.16, 'sine', 0.13 * v, i * 0.07)); }],
    choose:  [0.1,  (o, v) => { [440, 660, 880, 1320].forEach((f, i) => tone(o, f, f, 0.18, 'triangle', 0.15 * v, i * 0.05)); noise(o, 0.2, 5000, 1500, 0.07 * v, 'highpass'); }],
    beep:    [0.1,  (o, v) => { tone(o, 600, 600, 0.12, 'square', 0.1 * v); }],
    go:      [0.1,  (o, v) => { tone(o, 900, 900, 0.35, 'square', 0.12 * v); tone(o, 1350, 1350, 0.4, 'sine', 0.1 * v); }],
    win:     [1,    (o, v) => { [523, 659, 784, 1047, 1319].forEach((f, i) => { tone(o, f, f, 0.5, 'triangle', 0.17 * v, i * 0.13); tone(o, f * 2, f * 2, 0.4, 'sine', 0.05 * v, i * 0.13); }); }],
    lose:    [1,    (o, v) => { [392, 349, 311, 233].forEach((f, i) => tone(o, f, f * 0.97, 0.55, 'sawtooth', 0.1 * v, i * 0.2)); }],
    zone:    [2,    (o, v) => { for (let i = 0; i < 3; i++) tone(o, 440, 440, 0.12, 'square', 0.09 * v, i * 0.2); }],
  };

  function play(name, opt) {
    if (!pref.sfx) return;
    if (!ac && !init()) return;
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} return; }
    const s = S[name]; if (!s) return;
    const now = ac.currentTime; if (now - (last[name] || 0) < s[0] || voices > 28) return; last[name] = now;
    const v = opt && opt.v != null ? opt.v : 1; if (v < 0.03) return;
    voices++; setTimeout(() => { voices--; }, 450);
    try { s[1](out(opt && opt.pan), v); } catch (e) {}
  }

  // ---- ambient music: slow evolving pad + sparse pentatonic notes
  const ROOTS = [110, 98, 87.31, 98], PENT = [0, 3, 5, 7, 10, 12, 15];
  let bar = 0;
  function musicBar() {
    if (!ac || !musOn) return;
    const o = musBus, t0 = ac.currentTime, root = ROOTS[bar++ % ROOTS.length], len = 6;
    [1, 1.5, 2].forEach((m, i) => {
      const os = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      os.type = i === 2 ? 'triangle' : 'sawtooth'; os.frequency.value = root * m * (i === 1 ? 1.004 : 1); f.type = 'lowpass'; f.frequency.value = 500;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 2); g.gain.linearRampToValueAtTime(0.0001, t0 + len + 1);
      os.connect(f); f.connect(g); g.connect(o); os.start(t0); os.stop(t0 + len + 1.2);
    });
    for (let i = 0; i < 4; i++) if (Math.random() < 0.7) {
      const f = root * 4 * Math.pow(2, PENT[Math.floor(Math.random() * PENT.length)] / 12), dl = 0.5 + i * 1.4 + Math.random() * 0.6;
      tone(o, f, f, 1.6, 'sine', 0.05, dl);
    }
  }
  function music(on) {
    musOn = !!on;
    clearInterval(musTimer); musTimer = null;
    if (!musOn || !pref.music || !ac) return;
    musicBar(); musTimer = setInterval(musicBar, 5800);
  }

  function unlock() {
    if (!init()) return;
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    if (pref.music && !musTimer) music(true);
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(e => addEventListener(e, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) { try { ac.suspend(); } catch (e) {} } else { try { ac.resume(); } catch (e) {} }
  });

  window.SFX = {
    play, unlock, music,
    get sfx() { return pref.sfx; }, get musicOn() { return pref.music; },
    setSfx(b) { pref.sfx = !!b; if (sfxBus) sfxBus.gain.value = b ? 1 : 0; save(); if (b) play('click'); },
    setMusic(b) {
      pref.music = !!b; save(); if (!init()) return;
      musBus.gain.value = b ? 0.5 : 0;
      if (b) { musOn = true; music(true); } else { clearInterval(musTimer); musTimer = null; }
    },
    // distance-attenuated + panned sound for in-world events
    at(name, x, y, listener, maxD) {
      if (!listener) return play(name, { v: 0.6 });
      const dx = x - listener.x, d = Math.hypot(dx, y - listener.y), md = maxD || 1000;
      if (d > md) return;
      play(name, { v: Math.pow(1 - d / md, 1.4), pan: dx / 700 });
    },
  };
})();
