'use strict';
// STAR BRAWL 2 - team space battle. Mobile controls (joystick + 3 skills, auto-fire lasers, tap to target).
// Gravity wells, black hole, wormholes, capture beacons, mines, modular ships, leviathan boss, meteor showers.
// Host-authoritative over MQTT (trust based): host browser simulates + runs bots, clients send inputs.

const NS = 'starbrawl2-4d7a/';
const BROKER = new URLSearchParams(location.search).get('broker') || 'wss://broker.emqx.io:8084/mqtt';
const MAXP = 8, R0 = 4600, ZONE_T0 = 75, ZONE_T1 = 360, ZONE_MIN = 140, DT = 1 / 30, MAXLV = 16, NP = 19, DRAG = 0.55;
const TC = ['#ff5a5a', '#4da3ff'], TN = ['RED', 'BLUE'];
const PC8 = ['#ff5a5a', '#4da3ff', '#5ee07a', '#ffd34d', '#c779ff', '#ff9a3d', '#38e0d0', '#ff7ad1'];
const BOT_NAMES = ['Nova', 'Vega', 'Orion', 'Lyra', 'Atlas', 'Zeta', 'Kepler', 'Rigel'];
const [ARM, LAS, SHD, ENG, REP, MIS, TOR, DRN, MIN, DSH, RAIL, GRV, PUL, CLK, OD, AEG, NAN, ARC, FLT] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const PARTS = [ // name, desc, tag, active?
  ['Hull Armor', 'more hull, less damage taken', 'AR', 0], ['Lasers', 'more barrels & damage (auto-fire)', 'LS', 0],
  ['Shield', 'regenerating energy shield', 'SH', 0], ['Engines', 'speed & turning', 'EN', 0],
  ['Nano-Repair', 'heals hull over time', 'NR', 0], ['Missiles', 'homing salvo at your target [skill]', 'MS', 1],
  ['Torpedo', 'blast at your target, stuns [skill]', 'TP', 1], ['Drones', 'kamikaze swarm [skill]', 'DR', 1],
  ['Mine Layer', 'field of mines behind you: blow + slow [skill]', 'MN', 1], ['Afterburner', 'dash: untouchable 0.4 s, rams foes [skill]', 'AB', 1],
  ['Railgun', 'charged bolt at your target, hits stunned harder [skill]', 'RG', 1], ['Gravity Bomb', 'brief well: pulls + slows foes, then stuns [skill]', 'GB', 1], ['Shockwave', 'stun + slow + push, clears shots [skill]', 'SW', 1],
  ['Cloak Field', 'vanish from enemy targeting; breaks when hit [skill]', 'CL', 1], ['Overdrive', '+30% damage & speed for a few seconds [skill]', 'OD', 1],
  ['Aegis Barrier', 'bubble that destroys incoming shots [skill]', 'AG', 1], ['Repair Field', 'healing zone for allies & escorts [skill]', 'NF', 1],
  ['Arc Storm', 'chain lightning: damages + stuns several foes [skill]', 'AS', 1], ['Reinforcements', 'call temporary escort ships to fight for you [skill]', 'RF', 1],
];
// Specialisations: once a part reaches level 3 you may pick ONE of two branches (offered as cards with id 100 + part*2 + variant)
const BR = [
  [['Reactive Plating', 'reflects 15% of damage taken'], ['Fortress Hull', '+260 hull, slightly slower']],
  [['Overcharge', '+40% damage, bigger focus ramp'], ['Chain Arc', 'beam arcs to up to 3 more foes']],
  [['Bastion Shield', '+60% shield, regen starts sooner'], ['Nova Shield', 'a broken shield stuns nearby foes']],
  [['Ion Drive', '+20% speed, +25% acceleration'], ['Evasion Matrix', '12% chance to dodge any hit']],
  [['Nano Swarm', 'heals nearby allies & escorts'], ['Last Stand', 'survive a killing blow (once / 60 s)']],
  [['Cluster Salvo', '+4 missiles, weaker each'], ['Heavy Seekers', '2 missiles, 2.6x damage']],
  [['Plasma Torpedo', 'bigger blast, +40% damage'], ['Cluster Torpedo', 'splits into 4 bomblets']],
  [['Swarm', '+6 drones, weaker each'], ['Sapper Drones', 'drones stun what they hit']],
  [['Minefield', '+5 mines, lasts longer'], ['EMP Mines', 'mines stun instead of slow']],
  [['Ram Plating', 'dash hits 2x harder, bigger knockback'], ['Blink Drive', 'dash teleports you forward']],
  null,
  [['Singularity', 'collapse hits harder, stuns longer'], ['Repulsor Well', 'pushes foes away instead']],
  [['Supernova', 'bigger, stronger pulse'], ['Disruptor', 'pulse strips enemy shields']],
  [['Ambush', '+40% damage after you decloak'], ['Long Shroud', 'double duration, faster']],
  [['Berserk', '+60% damage, take +25%'], ['Warp Core', 'cooldowns tick twice as fast']],
  [['Mirror Aegis', 'reflects shots back at foes'], ['Bulwark', 'huge bubble covers allies']],
  [['Resupply Field', 'also restores shields'], ['Toxic Field', 'burns enemies instead']],
  [['Tempest', '3 more targets, longer reach'], ['Overload', 'one target: huge damage + stun']],
  [['Strike Wing', 'summons 3 gunships'], ['Heavy Cruiser', 'summons a tough frigate']],
];
// Fleet ships: stranded ships you rescue, mercenaries you hire at outposts, reinforcements you summon
const ECLS = [
  { n: 'Gunship', hp: 230, rad: 18, cost: 70, rng: 520, dmg: 0.65, col: '#ffd34d', tag: 'G' },
  { n: 'Frigate', hp: 580, rad: 24, cost: 130, rng: 480, dmg: 0.4, col: '#7fe3ff', tag: 'F' },
  { n: 'Medic', hp: 210, rad: 18, cost: 100, rng: 400, dmg: 0.2, col: '#5ee07a', tag: 'M' },
  { n: 'Artillery', hp: 290, rad: 20, cost: 120, rng: 700, dmg: 0, col: '#ff9a3d', tag: 'A' },
  { n: 'Carrier', hp: 330, rad: 22, cost: 140, rng: 720, dmg: 0, col: '#c779ff', tag: 'C' },
];
const SCORE_KILL = 3;   // score mode: points per ship kill
const PCOL = ['#c8d0e0', '#ff6b6b', '#6cf', '#9ef', '#69db7c', '#ffa94d', '#ffd43b', '#b197fc', '#ff8787', '#74c0fc', '#9ff', '#ffb870', '#e599f7', '#a9b8ff', '#ff6a4d', '#7fd8ff', '#8cf0a0', '#fff07a', '#ffb3e6'];
const DIFF = {
  easy:   { err: 0.45, react: 0.6, turn: 3, lead: 0,   spd: 0.75, aggr: 0.2 },
  normal: { err: 0.18, react: 0.3, turn: 6, lead: 0.6, spd: 0.95, aggr: 0.5 },
  hard:   { err: 0.05, react: 0.12, turn: 12, lead: 1, spd: 1,    aggr: 0.9 },
};
const PRIO = { easy: [], normal: [SHD, LAS, ARM, MIS, ENG, TOR, REP, RAIL, ARC, FLT, NAN, GRV, DRN, MIN, PUL, DSH, AEG, OD, CLK], hard: [LAS, SHD, RAIL, MIS, ARM, ARC, TOR, ENG, REP, FLT, OD, GRV, NAN, DRN, MIN, PUL, AEG, DSH, CLK] };
const LASER_RANGE = 430;

const rid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const eff = (s, p) => (s.lv[p] > 0 && !s.dp[p] ? s.lv[p] : 0);
const radOf = lv => 15 + Math.min(14, lv.reduce((a, b) => a + b, 0) * 0.5);
const thresh = n => (40 * n + 8 * n * n) * (LEN === 'quick' ? 0.7 : 1);
const ZS_T0 = 90, ZS_T1 = 330, ZS_MIN = 0.65;   // score mode: the safe zone shrinks from the full arena to 65% (beacons stay inside)
const zoneRS = t => { const f = LEN === 'quick' ? 0.55 : 1, a = ZS_T0 * f, b = ZS_T1 * f; return t < a ? R0 : Math.max(R0 * ZS_MIN, R0 - R0 * (1 - ZS_MIN) * (t - a) / (b - a)); };
const zoneR = t => { const f = LEN === 'quick' ? 0.55 : 1, a = ZONE_T0 * f, b = ZONE_T1 * f; return t < a ? R0 : Math.max(ZONE_MIN, R0 - (R0 - ZONE_MIN) * (t - a) / (b - a)); };
const BRN = (s, p) => (s.lv[p] >= 3 && s.br ? s.br[p] : 0);   // chosen branch of a part (0 = none, 1 = A, 2 = B)
const stats = s => {
  const e = eff(s, ENG), ion = BRN(s, ENG) === 1, f = (BRN(s, ARM) === 2 ? 0.92 : 1) * (s.od > 0 ? 1.3 : 1) * (s.cloak > 0 && BRN(s, CLK) === 2 ? 1.2 : 1);
  return { acc: (480 + 80 * e) * (ion ? 1.25 : 1) * f, vmax: (230 + 35 * e) * (ion ? 1.2 : 1) * f, turn: 4 + 1.5 * e };
};
const HN = n => n.type <= 4 || n.type >= 8;   // hostile neutral: scouts, haulers, boss, sentries, warships, raiders, dreadnought
const cdMax = (lv, p) => [0, 0, 0, 0, 0, 5 - 0.4 * lv[MIS], 7 - 0.8 * lv[TOR], 13 - 1.6 * lv[DRN], 9.5 - 0.8 * lv[MIN], 4.5 - 0.5 * lv[DSH], 6.5 - 0.8 * lv[RAIL], 15 - 1.6 * lv[GRV], 8 - 0.8 * lv[PUL],
  17 - 2 * lv[CLK], 18 - 2 * lv[OD], 16 - 2 * lv[AEG], 15 - 1.5 * lv[NAN], 8 - 0.9 * lv[ARC], 30 - 3 * lv[FLT]][p];
const isLive = t => t && !t.dead && t.alive !== false && (t.hp == null || t.hp > 0);
const isShip = t => t && t.lv != null;
let GMUL = 1;
let STT = 0;
function bez(st, u) {   // quadratic curve point + tangent
  const a = 1 - u, x = a * a * st.x1 + 2 * a * u * st.cx + u * u * st.x2, y = a * a * st.y1 + 2 * a * u * st.cy + u * u * st.y2;
  return [x, y, 2 * a * (st.cx - st.x1) + 2 * u * (st.x2 - st.cx), 2 * a * (st.cy - st.y1) + 2 * u * (st.y2 - st.cy)];
}
function buildStream(o) {
  const st = { ...o }; if (st.cx == null) { st.cx = (st.x1 + st.x2) / 2; st.cy = (st.y1 + st.y2) / 2; }
  if (st.str == null) st.str = 1; if (st.ph == null) st.ph = Math.random() * 6.28;
  st.pts = []; for (let i = 0; i <= 14; i++) st.pts.push(bez(st, i / 14));
  return st;
}
const streamK = st => st.str * (0.65 + 0.35 * Math.sin(STT * 0.35 + st.ph));   // currents surge and ebb
function streamAt(streams, x, y) {
  let ax = 0, ay = 0, ins = 0;
  for (const st of streams) {
    let bd = 1e9, bi = 0;
    for (let i = 0; i < 14; i++) {
      const p = st.pts[i], q = st.pts[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], l2 = dx * dx + dy * dy || 1, t = clamp(((x - p[0]) * dx + (y - p[1]) * dy) / l2, 0, 1);
      const d = Math.hypot(x - (p[0] + dx * t), y - (p[1] + dy * t)); if (d < bd) { bd = d; bi = i; }
    }
    if (bd < st.w) {
      const p = st.pts[bi], q = st.pts[bi + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, k = streamK(st), edge = 1 - bd / st.w * 0.5;
      ax += dx / l * 320 * k * edge; ay += dy / l * 320 * k * edge; ins = Math.max(ins, k);
    }
  }
  return [ax, ay, ins];
}
function gravAt(wells, x, y, fac) {   // fac = your faction: a temporary well cast by your own side doesn't pull you
  let ax = 0, ay = 0;
  for (const w of wells) {
    if (fac != null && w.o >= 0 && PL[w.o] && PL[w.o].fac === fac) continue;
    const dx = w.x - x, dy = w.y - y, d = Math.hypot(dx, dy);
    if (d < w.gr && d > 1) { const f = w.g * GMUL * Math.pow(1 - d / w.gr, 2); ax += dx / d * f; ay += dy / d * f; }
  }
  return [ax, ay];
}

const ui = $('ui');
const panel = (html, cls) => {   // keep the scroll position when the lobby re-renders after a button press
  const old = ui.firstChild, st = old && old.scrollTop || 0;
  ui.innerHTML = html ? `<div class="panel ${cls || ''}">${html}</div>` : '';
  if (st && ui.firstChild) ui.firstChild.scrollTop = st;
};
const S = { id: rid(), name: '', mode: 'menu', host: false, code: '', base: '', c: null, lobby: null, timer: null };
try { S.name = localStorage.getItem('sb_name') || ''; } catch (e) {}
const ART2 = !!(window.Art2 && Art2.ship && Art2.weapons && Art2.fx && Art2.shield);   // shaded sprites from art2/*.js (falls back to basic shapes)
const W2 = (window.Art2 && Art2.world) || {}, H2 = (window.Art2 && Art2.hud) || {}, B2 = (window.Art2 && Art2.bg) || {};
const AH = !!(H2.top && H2.bars && H2.skillButton && H2.upgradeCard && H2.joystick);
function A2(fn) { try { fn(); return true; } catch (e) { if (!window.__artErr) { window.__artErr = e.message; console.error('Art2', e); } return false; } }
let SHAKE = 0, FLASH = 0, WFLASH = 0; const ZAPS = [];
const RELC = ['#ffffff', '#5ee07a', '#ff5a5a'];   // me / ally / enemy
const FL = s => (s.fl != null ? s.fl : flagsOf(s));   // ship status bits: 1 cloaked, 2 aegis, 4 overdrive, 8 ambush
const myFac = () => { const i = S.host ? (G ? G.me : -1) : (C ? C.me : -1); return PL[i] ? PL[i].fac : -1; };
const fieldFac = f => (f.fac != null ? f.fac : (PL[f.o] ? PL[f.o].fac : 0));
let AIMING = null, AIMV = [null, null, null], CUR = null; const TELE = [], BEAMS = [];
let FIRE = {}, HIT = {}, THR = {}, PB = {}, FDT = 0.016, FZ = 1, TT = 0; const SHA = [];
let G = null, C = null, PL = [], simTimer = null, inputTimer = null, MODE = 'teams', COND = 'last', LEN = 'normal';
const FC = f => (MODE === 'teams' ? TC[f] : PC8[f]);
const facC = i => FC(PL[i].fac);
let R = { fx: [], log: [], cam: null, spec: -1, lock: 0 };

// ================================================================ MQTT + lobby
function connect(code, asHost) {
  if (S.c) S.c.end(true);
  S.code = code; S.base = NS + code + '/';
  const opts = { clientId: 'sb_' + S.id, clean: true, reconnectPeriod: 2000, connectTimeout: 8000 };
  if (asHost) opts.will = { topic: S.base + 'lobby', payload: '', retain: true, qos: 0 };
  const c = S.c = mqtt.connect(BROKER, opts);
  c.on('connect', () => {
    c.subscribe(S.base + (asHost ? 'join' : 'lobby'));
    if (asHost) { c.subscribe(S.base + 'cmd'); c.subscribe(S.base + 'leave'); pubLobby(); }
    else c.subscribe(S.base + 'state');
  });
  c.on('message', (topic, payload) => {
    const k = topic.slice(S.base.length);
    let m = null;
    try { if (payload.length) m = JSON.parse(payload.toString()); } catch (e) { return; }
    if (k === 'lobby') onLobby(m);
    else if (k === 'state') onState(m);
    else if (S.host && m) { if (k === 'join') hostJoin(m); else if (k === 'cmd') hostCmd(m); else if (k === 'leave') hostLeave(m); }
  });
}
function pub(topic, obj, retain) {
  if (S.c) S.c.publish(S.base + topic, obj == null ? '' : JSON.stringify(obj), { retain: !!retain, qos: 0 });
}
const pubLobby = () => pub('lobby', S.lobby, true);
function readName(soft) {
  const el = $('name');
  S.name = (el ? el.value : S.name).trim().slice(0, 14) || (soft ? '' : 'Pilot' + Math.floor(Math.random() * 100));
  try { localStorage.setItem('sb_name', S.name); } catch (e) {}
}
function goFullscreen() {
  try { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen).call(d); } catch (e) {}
  try { screen.orientation.lock('landscape'); } catch (e) {}
}
function toggleFs() {
  if (document.fullscreenElement || document.webkitFullscreenElement) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} } else goFullscreen();
}
const HOW = [
  ['🕹️', 'Fly', 'Touch and drag on the <b>left half</b> of the screen to steer. A joystick appears under your thumb. On a PC use <b>WASD</b>.<br>Your lasers <b>fire automatically</b> at anything in range.'],
  ['🎯', 'Pick a target', 'Enemies have a <b>red ring</b>, allies a <b>green ring</b>. <b>Tap an enemy</b> to lock it. Lasers, missiles, torpedoes and the railgun aim at your locked target.'],
  ['⚡', 'Use skills', 'The <b>round buttons</b> on the right fire your special weapons. Tap to fire, or <b>drag from a button to aim</b> and let go to cast. On a PC use <b>Space / Q / E</b>.<br>Skills unlock as you pick upgrades.'],
  ['⬆️', 'Level up', 'Fly through <b>scrap</b> and wreckage to earn upgrades. When cards appear at the top, <b>tap one</b> (or press 1 / 2 / 3). Pick armor, shields, engines or new weapons.'],
  ['🏆', 'Win the match', '<b>Score mode</b> (default): every kill scores points, holding <b>beacons</b> trickles more, and you <b>respawn</b> a few seconds after dying. First to the target score, or the leader when time runs out, wins.<br>Other modes: last ship standing inside the <b>shrinking storm</b>, or capture points.'],
  ['🛰️', 'Build a fleet', '<b>Rescue</b> stranded ships (hold still next to an SOS), <b>hire</b> mercenaries at gold <b>outposts</b> with scrap, or call <b>reinforcements</b>. Gunships, frigates, medics, artillery and carriers follow and fight for you.'],
  ['☄️', 'Survive the void', 'The arena is huge and hostile: <b>solar flares</b> (hide in nebulae / behind rocks), pirate <b>raids</b> and a <b>Dreadnought</b>, rogue planets, radiation clouds, meteors, ion storms and gravity surges. At <b>level 3</b> a part can <b>specialise</b> into one of two branches.'],
];
const condName = c => (c === 'capture' ? 'Capture points' : c === 'score' ? 'Score + respawn' : 'Last ship');
let howFirst = false;
function showHow(i, first) {
  S.mode = 'how'; if (first != null) howFirst = !!first;
  const n = HOW.length, h = HOW[i];
  panel(`<div class="how"><div class="hico">${h[0]}</div><div class="hbody"><h2>${h[1]}</h2><p>${h[2]}</p></div></div>
    <div class="dots">${HOW.map((_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>
    <div class="nav">${i < n - 1 ? `<button class="sec" onclick="howDone()">${howFirst ? 'Skip' : 'Close'}</button>` : '<span></span>'}
      ${i > 0 ? `<button class="sec" onclick="showHow(${i - 1})">Back</button>` : ''}
      <button onclick="${i < n - 1 ? `showHow(${i + 1})` : 'howDone()'}">${i < n - 1 ? 'Next' : howFirst ? "Let's play" : 'Done'}</button></div>`, 'howp');
}
function howDone() { try { localStorage.setItem('sb_seen', '1'); } catch (e) {} showMenu(); }
function togSnd(k) { SFX[k === 'music' ? 'setMusic' : 'setSfx'](k === 'music' ? !SFX.musicOn : !SFX.sfx); if (S.mode === 'menu') { readName(true); showMenu(); } else if (S.mode === 'lobby') showLobby(); }
const sndRow = () => window.SFX ? `<div class="two"><button class="sec" onclick="togSnd('sfx')">${SFX.sfx ? '🔊' : '🔇'} Sound</button><button class="sec" onclick="togSnd('music')">${SFX.musicOn ? '🎵' : '🎵✕'} Music</button></div>` : '';
function showMenu(err) {
  S.mode = 'menu';
  const hashCode = (location.hash || '').replace('#', '').toUpperCase().slice(0, 4);
  const typed = ($('code') || {}).value;
  panel(`<div class="cols"><div>
      <h1>Star Brawl</h1>${err ? `<p class="err">${esc(err)}</p>` : ''}
      <input id="name" maxlength="14" value="${esc(S.name)}" placeholder="Your name" autocomplete="off">
      <button onclick="createRoom()">Create room</button>
      <div class="or"><span>or join with a code</span></div>
      <div class="two"><input id="code" maxlength="4" value="${esc(typed || hashCode)}" placeholder="ABCD" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;text-align:center;letter-spacing:4px"><button class="sec" onclick="joinRoom()">Join</button></div>
    </div><div class="side">
      <button class="sec" onclick="readName(true);showHow(0,false)">❓ How to play</button>
      <button class="sec" onclick="goFullscreen()">⛶ Fullscreen</button>
      ${sndRow()}
      <p class="dim hint">Teams or free-for-all. Score battle with respawns, capture points or last ship standing. Best played in landscape.</p>
    </div></div><div class="rot">↻ Rotate your phone to landscape for the best view</div>`, 'menu');
}
function showLobby() {
  if (S.mode !== 'lobby') return;
  const L = S.lobby, link = location.origin + location.pathname + '#' + S.code, teams = L.mode === 'teams';
  if (L.players.length > (showLobby.n || 0) && window.SFX && showLobby.n != null) SFX.play('join'); showLobby.n = L.players.length;
  const rows = L.players.map((p, i) => `<div class="row">${teams ? `<button class="tm" style="background:${TC[p.team]} !important" ${S.host ? `onclick="toggleTeam(${i})"` : 'disabled'}>${TN[p.team]}</button>` : `<span style="width:12px;height:12px;border-radius:50%;background:${PC8[i]}"></span>`}${esc(p.name)}${p.id === S.id ? ' <span class="dim">(you)</span>' : ''}
    ${S.host && p.bot ? `<button class="x" onclick="removeBot(${i})">✕</button>` : ''}</div>`).join('');
  const t0 = teamCount(L, 0), t1 = teamCount(L, 1), canStart = L.players.length >= 2 && (!teams || (t0 && t1));
  const opt = (fn, k, v) => `<button class="sec opt" onclick="${fn}()"><small>${k}</small>${v}</button>`;
  panel(`<div class="cols"><div>
      <h2>Lobby</h2><div class="code">${S.code}</div>
      <button class="sec" onclick="navigator.clipboard&&navigator.clipboard.writeText('${link}')">Copy invite link</button>
      <p class="dim">${L.players.length}/${MAXP} pilots${S.host && teams ? ' · tap a team badge to switch' : ''}</p><div class="plist">${rows}</div>
    </div><div class="side">
      ${S.host ? `<div class="opts">${opt('toggleMode', 'Mode', teams ? 'Teams' : 'Free for all')}${opt('toggleCond', 'Game mode', condName(L.cond))}${opt('toggleLen', 'Length', L.cond === 'score' ? (L.len === 'quick' ? 'Quick ~4 min' : 'Normal ~8 min') : (L.len === 'quick' ? 'Quick ~3 min' : 'Normal ~6 min'))}${opt('cycleDiff', 'Bots', L.diff)}</div>
      <button class="sec" onclick="addBot()" ${L.players.length >= MAXP ? 'disabled' : ''}>+ Add bot</button>
      <button onclick="startMatch()" ${canStart ? '' : 'disabled'}>Start game</button>` : `<p class="dim">${teams ? 'Teams' : 'Free for all'} · ${condName(L.cond)} · ${L.len === 'quick' ? 'Quick' : 'Normal'} · bots ${L.diff}</p><p class="dim">Waiting for the host…</p>`}
      ${sndRow()}
      <button class="sec" onclick="leaveRoom()">Leave</button>
    </div></div>`, 'lobby');
}
function showOver(f) {
  let t = 'Draw';
  if (f >= 0) t = MODE === 'teams' ? `<span style="color:${TC[f]}">${TN[f]} TEAM</span> wins!` : `<span style="color:${PC8[f]}">${esc(PL[f] ? PL[f].name : '?')}</span> wins!`;
  const mi = S.host ? (G ? G.me : -1) : (C ? C.me : -1), mine = PL[mi] ? PL[mi].fac : -2;
  if (window.SFX && f >= 0) SFX.play(f === mine ? 'win' : 'lose');
  const sc = (S.host ? G && G.score : C && C.last && C.last.score), NFo = MODE === 'teams' ? 2 : PL.length;
  const scTxt = COND === 'score' && sc ? `<p>${Array.from({ length: NFo }, (_, k) => `<span style="color:${FC(k)}">${MODE === 'teams' ? TN[k] : esc(PL[k].name)} <b>${Math.floor(sc[k] || 0)}</b></span>`).join(' &nbsp;·&nbsp; ')}</p>` : '';
  panel(`<h2>${t}</h2>${scTxt}${S.host ? '<button onclick="playAgain()">Back to lobby</button>' : '<p class="dim">Waiting for host…</p>'}<button class="sec" onclick="leaveRoom()">Leave</button>`, 'over');
}
function createRoom() {
  readName();
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  S.host = true; S.mode = 'lobby';
  S.lobby = { status: 'waiting', seed: 0, diff: 'normal', mode: 'ffa', cond: 'score', len: 'normal', players: [{ id: S.id, name: S.name, bot: false, team: 0 }] };
  connect(code, true); showLobby();
}
function joinRoom() {
  readName();
  const code = $('code').value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) return showMenu('Enter a 4-letter room code.');
  S.host = false; S.mode = 'joining'; connect(code, false); panel('<h2>Joining…</h2>');
  S.timer = setTimeout(() => { if (S.mode === 'joining') leaveRoom('Room not found or no response.'); }, 7000);
}
function leaveRoom(msg) {
  clearTimeout(S.timer); clearInterval(simTimer); clearInterval(inputTimer);
  if (S.c) { if (S.host) pub('lobby', null, true); else pub('leave', { id: S.id }); S.c.end(false); S.c = null; }
  G = null; C = null; S.host = false; S.lobby = null;
  showMenu(typeof msg === 'string' ? msg : '');
}
addEventListener('beforeunload', () => { if (S.c && !S.host) pub('leave', { id: S.id }); });
function onLobby(m) {
  if (S.host) return;
  if (!m) { if (S.mode !== 'menu') leaveRoom('The host closed the room.'); return; }
  S.lobby = m;
  const inIt = m.players.some(p => p.id === S.id);
  if (S.mode === 'joining') {
    if (!inIt) {
      if (m.status !== 'waiting') return leaveRoom('Game already in progress.');
      if (m.players.length >= MAXP) return leaveRoom('Room is full.');
      pub('join', { id: S.id, name: S.name }); return;
    }
    clearTimeout(S.timer); S.mode = 'lobby';
  }
  if (S.mode === 'lobby') { if (m.status === 'playing') startGame(m); else showLobby(); }
  else if (S.mode === 'game' && m.status === 'waiting') { C = null; clearInterval(inputTimer); S.mode = 'lobby'; showLobby(); }
}
const teamCount = (L, t) => L.players.filter(p => p.team === t).length;
function hostJoin(m) {
  const L = S.lobby;
  if (L.status !== 'waiting' || L.players.length >= MAXP || L.players.some(p => p.id === m.id)) return;
  L.players.push({ id: String(m.id), name: String(m.name || 'Pilot').slice(0, 14), bot: false, team: teamCount(L, 0) <= teamCount(L, 1) ? 0 : 1 });
  pubLobby(); showLobby();
}
function hostLeave(m) {
  const L = S.lobby, i = L.players.findIndex(p => p.id === m.id);
  if (i < 0) return;
  if (L.status === 'waiting') { L.players.splice(i, 1); pubLobby(); showLobby(); } else L.players[i].bot = true;
}
function addBot() {
  const L = S.lobby;
  if (L.players.length >= MAXP) return;
  L.players.push({ id: 'bot_' + rid(), name: BOT_NAMES[L.players.length] + ' (bot)', bot: true, team: teamCount(L, 0) <= teamCount(L, 1) ? 0 : 1 });
  pubLobby(); showLobby();
}
function removeBot(i) { S.lobby.players.splice(i, 1); pubLobby(); showLobby(); }
function toggleTeam(i) { const p = S.lobby.players[i]; p.team = 1 - p.team; pubLobby(); showLobby(); }
function cycleDiff() { const L = S.lobby; L.diff = { easy: 'normal', normal: 'hard', hard: 'easy' }[L.diff]; pubLobby(); showLobby(); }
function toggleMode() { const L = S.lobby; L.mode = L.mode === 'teams' ? 'ffa' : 'teams'; pubLobby(); showLobby(); }
function toggleLen() { const L = S.lobby; L.len = L.len === 'quick' ? 'normal' : 'quick'; pubLobby(); showLobby(); }
function toggleCond() { const L = S.lobby; L.cond = { score: 'last', last: 'capture', capture: 'score' }[L.cond] || 'score'; pubLobby(); showLobby(); }
function startMatch() { const L = S.lobby; if (L.players.length < 2 || (L.mode === 'teams' && (!teamCount(L, 0) || !teamCount(L, 1)))) return; L.status = 'playing'; pubLobby(); startGame(L); }
function playAgain() { clearInterval(simTimer); G = null; S.lobby.status = 'waiting'; S.mode = 'lobby'; pubLobby(); showLobby(); }
function startGame(L) {
  PL = L.players; MODE = L.mode || 'teams'; COND = L.cond || 'last'; LEN = L.len || 'normal'; PL.forEach((p, i) => { p.fac = MODE === 'teams' ? p.team : i; });
  R = { fx: [], log: [], cam: null, spec: 0, lock: 0 }; FIRE = {}; HIT = {}; THR = {}; PB = {};
  if (ART2) { try { Art2.fx.clear(); } catch (e) {} }
  clearInterval(simTimer); clearInterval(inputTimer);
  myTg = ''; GMUL = 1;
  if (S.host) { newGame(L); simTimer = setInterval(hostTick, 33); }
  else { C = { me: PL.findIndex(p => p.id === S.id), snaps: [], pred: null, over: false }; inputTimer = setInterval(sendInput, 50); }
  S.mode = 'game'; panel(''); if (window.SFX) SFX.play('go');
}

// ================================================================ host simulation
const ev = (t, x, y, r = 0) => { const e = [t, Math.round(x), Math.round(y), Math.round(r)]; G.evPub.push(e); G.evLoc.push(e); };
const logMsg = t => { G.logPub.push(t); G.logLoc.push(t); };
const teamOf = i => G.players[i].fac;
const enemyOf = (s, t) => (isShip(t) ? t.alive && !(t.cloak > 0) && teamOf(t.i) !== teamOf(s.i) : isLive(t) && t.type !== 5 && t.type !== 7 && !(t.type === 6 && teamOf(t.ow) === teamOf(s.i)));

function newGame(L) {
  G = { players: L.players, diff: L.diff || 'normal', mode: MODE, cond: COND, NF: MODE === 'teams' ? 2 : L.players.length, shares: Array(MODE === 'teams' ? 2 : L.players.length).fill(1 / (MODE === 'teams' ? 2 : L.players.length)), t: 0, acc: 0, last: performance.now(), lastPub: 0, pubN: 0, over: false, winner: -1,
    me: L.players.findIndex(p => p.id === S.id), z: R0, ships: [], neut: [], ast: [], proj: [], pick: [], mines: [], drops: [],
    evPub: [], evLoc: [], logPub: [], logLoc: [], nid: 1, spawnT: 0, dropT: ZONE_T0, boss: false, bhs: Math.random() < 0.5 ? 1 : -1, shower: 0, surge: 0, ion: null, showerT: 0,
    score: Array(MODE === 'teams' ? 2 : L.players.length).fill(0), fields: [], haz: [], flare: 0, evQ: [], lastEv: '', rogue: 0, dread: false };
  G.lenF = LEN === 'quick' ? 0.55 : 1; G.dropT = ZONE_T0 * G.lenF; G.relics = [85, 175, 265, 355, 445].map(t => ({ t: t * G.lenF })); G.cometT = 30 * G.lenF; G.sosT = 0; G.warT = 0;
  G.evT = 38 * G.lenF; G.bossAt = 110 * G.lenF; G.dreadAt = 170 * G.lenF; G.target = Math.round(90 * G.lenF); G.tlim = 480 * G.lenF;
  const np = L.players.length, cnt = [0, 0], tot = [teamCount(L, 0), teamCount(L, 1)];
  L.players.forEach((p, i) => {
    const t = p.team, k = cnt[t]++, side = t ? 1 : -1, ra = i / np * Math.PI * 2;
    const sx = MODE === 'teams' ? side * R0 * 0.72 : Math.cos(ra) * R0 * 0.75, sy = MODE === 'teams' ? (k - (tot[t] - 1) / 2) * 280 : Math.sin(ra) * R0 * 0.75, sa = MODE === 'teams' ? (t ? Math.PI : 0) : ra + Math.PI;
    const s = { i, x: sx, y: sy, sx, sy, sa, vx: 0, vy: 0, ang: sa, respT: 0, inv: 0, slow: 0, hp: 900, hpMax: 900, sh: 0, shMax: 0, rad: 15,
      lv: Array(NP).fill(0), dp: Array(NP).fill(0), ph: Array(NP).fill(0), br: Array(NP).fill(0), sk: [-1, -1, -1], cd: Array(NP).fill(0), scrap: 0, level: 0, pending: 1, offers: [],
      cloak: 0, od: 0, aegis: 0, amb: 0, streak: 0, lsT: 0, novaT: 0,
      alive: true, emp: 0, boost: 0, thr: 0, fireT: 0, repT: 0, portalT: 0, lastHit: -9, kills: 0, inT: 0,
      in: { mx: 0, my: 0, tg: '', s0: 0, s1: 0, s2: 0, sa: [0, 0, 0] }, tgtNow: null,
      ai: { t: 0, mode: 'roam', tgt: null, goal: null, err: 0, strafe: 1, strT: 0, seed: Math.floor(Math.random() * 3) } };
    makeOffers(s); G.ships.push(s);
  });
  const LN = ['Classic', 'Asteroid Ring', 'Twin Suns'], mp = new URLSearchParams(location.search).get('map');
  G.layout = mp != null && LN[+mp] ? +mp : Math.floor(Math.random() * 3);
  const planet = (x, y) => ({ type: 0, x: x * R0, y: y * R0, r: 85, gr: 340, g: 280 });
  const hole = () => ({ type: 1, x: 0, y: 0, r: 45, gr: 480, g: 420 });   // gravity hole: slows you, can't kill, always escapable
  const minihole = (x, y) => ({ type: 1, x: x * R0, y: y * R0, r: 34, gr: 380, g: 340 });   // fixed smaller hole
  const star = (x, y) => ({ type: 2, x: x * R0, y: y * R0, r: 70, gr: 520, g: 330 });   // star: gravity + burning heat zone
  const neb = (x, y, r) => G.nebs.push({ x: x * R0, y: y * R0, r });
  G.wells = []; G.portals = []; G.nebs = []; G.streams = []; G.bh = null;
  if (G.layout === 0) {
    [[-0.38, -0.3], [0.38, 0.3], [-0.3, 0.38], [0.3, -0.38], [-0.72, 0.3], [0.72, -0.3], [0.1, 0.72], [-0.1, -0.72]].forEach(([x, y]) => G.wells.push(planet(x, y)));
    G.bh = hole(); G.wells.push(G.bh, minihole(-0.62, -0.5), minihole(0.62, 0.5)); G.portals = [{ x: -0.45 * R0, y: 0.02 * R0 }, { x: 0.45 * R0, y: -0.02 * R0 }];
    neb(-0.2, -0.5, 340); neb(0.2, 0.5, 340); neb(-0.7, -0.05, 300); neb(0.7, 0.05, 300);
  } else if (G.layout === 1) {
    G.wells.push(planet(-0.22, 0.1), planet(0.22, -0.1), planet(-0.75, -0.35), planet(0.75, 0.35), planet(0, 0.8), planet(0, -0.8)); G.bh = hole(); G.wells.push(G.bh, minihole(-0.68, 0.45), minihole(0.68, -0.45));
    G.portals = [{ x: -0.2 * R0, y: -0.3 * R0 }, { x: 0.2 * R0, y: 0.3 * R0 }]; neb(0, 0.3, 320); neb(0, -0.3, 320); neb(-0.6, 0, 280); neb(0.6, 0, 280);
    for (let i = 0; i < 70; i++) ringAst();
  } else {
    G.wells.push(star(0, -0.3), star(0, 0.3), planet(-0.42, 0.05), planet(0.42, -0.05), planet(-0.8, 0.5), planet(0.8, -0.5), star(-0.72, -0.62), star(0.72, 0.62));
    const w = 0.12 * R0; G.streams.push({ x1: -0.6 * R0, y1: -w, x2: 0.6 * R0, y2: -w, w: 110 }, { x1: 0.6 * R0, y1: w, x2: -0.6 * R0, y2: w, w: 110 });
    neb(-0.5, -0.45, 300); neb(0.5, 0.45, 300); neb(0.1, 0.78, 280); neb(-0.1, -0.78, 280);
  }
  logMsg('Map: ' + LN[G.layout]);
  const sl = (x1, y1, cx, cy, x2, y2, w = 120, str = 1) => G.streams.push({ x1: x1 * R0, y1: y1 * R0, cx: cx * R0, cy: cy * R0, x2: x2 * R0, y2: y2 * R0, w, str });
  if (G.layout === 0) { sl(-0.75, -0.7, -0.3, -0.9, 0.1, -0.72, 120, 0.9); sl(0.75, 0.7, 0.3, 0.9, -0.1, 0.72, 120, 0.8); sl(-0.15, 0.45, -0.4, 0, -0.15, -0.45, 100, 0.6); }
  else if (G.layout === 1) { sl(-0.3, -0.05, 0, 0.2, 0.3, -0.05, 110, 0.7); sl(0, -0.95, 0.2, -0.75, 0, -0.55, 110, 0.8); sl(0, 0.95, -0.2, 0.75, 0, 0.55, 110, 0.8); }
  else { sl(-0.3, -0.8, 0, -0.95, 0.3, -0.8, 140, 0.7); sl(0.3, 0.8, 0, 0.95, -0.3, 0.8, 140, 0.7); }
  G.streams = G.streams.map(buildStream);
  G.pads = [[-0.55, -0.2], [0.55, 0.2]].map(([x, y]) => ({ x: x * R0, y: y * R0, r: 110 }));   // repair relays: heal any ship inside
  G.bea = (G.cond !== 'last' ? [[0, 0], [0, -0.58], [0, 0.58]] : []).map(([x, y]) => ({ x: x * R0, y: y * R0, r: 170, p: 0, owner: -1, cap: -1, cont: 0 }));
  for (let i = 0; i < (G.layout === 1 ? 22 : 52); i++) spawnAst(220);
  for (let i = 0; i < 12; i++) bigRock();
  for (let i = 0; i < 20; i++) spawnNeut(0, 260);
  for (let i = 0; i < 5; i++) spawnNeut(1, 260);
  for (let i = 0; i < 7; i++) spawnNeut(3, 400);   // sentry turret platforms
  for (let i = 0; i < 2; i++) spawnNeut(5, 500);   // stranded ships to rescue
  for (let i = 0; i < 5; i++) spawnNeut(7, 700, i);   // hire outposts: one per ship class
  for (let i = 0; i < 5; i++) debrisField();
  for (let i = 0; i < 4; i++) richCluster();
  for (let i = 0; i < 6; i++) hazard();   // radiation clouds
}
function freeSpot(minD, frac) {
  for (let k = 0; k < 14; k++) {
    const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * G.z * frac, p = { x: Math.cos(a) * r, y: Math.sin(a) * r };
    if (G.ships.every(s => !s.alive || dist(s, p) > minD) && G.wells.every(w => dist(w, p) > w.r + (w.type === 1 ? w.gr : w.type === 2 ? 240 : 90)) && G.bea.every(b => dist(b, p) > 170)) return p;
  }
  return null;
}
function debrisField() {
  const p = freeSpot(300, 0.75); if (!p) return; const a = rnd(0, 6.28), sp = rnd(35, 60), vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
  for (let i = 0; i < 12; i++) { const r = rnd(10, 22), aa = rnd(0, 6.28), rr = rnd(0, 170); G.ast.push({ id: G.nid++, x: p.x + Math.cos(aa) * rr, y: p.y + Math.sin(aa) * rr, r, hp: r * 1.2, hpMax: r * 1.2, vx: vx + rnd(-8, 8), vy: vy + rnd(-8, 8), deb: 1 }); }
}
function richCluster() {
  const p = freeSpot(300, 0.75); if (!p) return;
  for (let i = 0; i < 7; i++) { const r = rnd(24, 40), aa = rnd(0, 6.28), rr = rnd(0, 160); G.ast.push({ id: G.nid++, x: p.x + Math.cos(aa) * rr, y: p.y + Math.sin(aa) * rr, r, hp: r * 2.2, hpMax: r * 2.2, rich: 1 }); }
  return p;
}
function bigRock() {   // large indestructible rocks: cover that blocks shots and ships
  const p = freeSpot(320, 0.85); if (!p) return; const r = rnd(70, 115);
  G.ast.push({ id: G.nid++, x: p.x, y: p.y, r, hp: 1e6, hpMax: 1e6, big: 1 });
}
function ringAst() {
  let a = rnd(0, 6.283); for (let k = 0; k < 8 && Math.abs(Math.sin(2 * a)) < 0.2; k++) a = rnd(0, 6.283);   // leave 4 gaps in the ring
  const rr = 0.42 * R0 + rnd(-80, 80), r = rnd(22, 44);
  G.ast.push({ id: G.nid++, x: Math.cos(a) * rr, y: Math.sin(a) * rr, r, hp: r * 2.2, hpMax: r * 2.2 });
}
function spawnAst(minD) { const p = freeSpot(minD, 0.92); if (!p) return; const r = rnd(16, 40); G.ast.push({ id: G.nid++, x: p.x, y: p.y, r, hp: r * 2.2, hpMax: r * 2.2 }); }
function spawnNeut(type, minD, cls) {   // 0 scout, 1 hauler, 2 leviathan, 3 sentry, 4 warship, 5 stranded ship, 6 escort, 7 hire outpost, 8 raider, 9 dreadnought
  const p = type === 2 ? { x: 0, y: -0.25 * G.z } : freeSpot(minD, type === 7 ? 0.6 : 0.85); if (!p) return null;
  const hp = [30, 140, 1400, 320, 700, 150, 220, 1e9, 90, 3400][type], rad = [13, 26, 70, 22, 36, 18, 18, 34, 13, 90][type];
  if (type === 5) { cls = cls != null ? cls : [0, 0, 1, 2, 3, 4][Math.floor(Math.random() * 6)]; }
  const n = { id: G.nid++, type, cls: cls || 0, x: p.x, y: p.y, vx: 0, vy: 0, ang: rnd(0, 6.28), hp, hpMax: hp, gx: p.x, gy: p.y, shT: rnd(0, 1), rad, by: -1, ow: -1, res: 0 };
  G.neut.push(n); return n;
}
function hazard() {   // radiation cloud: burns anything inside, but hides a rich asteroid cluster
  const p = freeSpot(500, 0.62); if (!p) return; const r = rnd(230, 340);
  G.haz.push({ x: p.x, y: p.y, r, k: 0 });
  for (let i = 0; i < 4; i++) { const a = rnd(0, 6.28), rr = rnd(0, r * 0.55), ar = rnd(24, 38); G.ast.push({ id: G.nid++, x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr, r: ar, hp: ar * 2.2, hpMax: ar * 2.2, rich: 1 }); }
}
const fleetCap = s => 2 + Math.floor(s.level / 4);
const fleetN = i => G.neut.filter(m => m.type === 6 && m.ow === i && !m.dead && m.ttl == null).length;
function addEscort(s, cls, ttl, hpMul) {
  const C = ECLS[cls], hp = C.hp * (1 + 0.04 * s.level) * (hpMul || 1);
  G.neut.push({ id: G.nid++, type: 6, cls, x: s.x + rnd(-50, 50), y: s.y + rnd(-50, 50), vx: 0, vy: 0, ang: s.ang, hp, hpMax: hp, gx: s.x, gy: s.y, shT: rnd(0, 1), rad: C.rad, by: -1, ow: s.i, res: 0, ttl });
  ev('w', s.x, s.y);
}
function addScore(f, pts) { if (G.cond === 'score' && f >= 0 && f < G.score.length) G.score[f] += pts; }
function makeOffers(s) {
  if (s.pending <= 0) { s.offers = []; return; }
  const free = s.sk.includes(-1);
  const pool = [...Array(NP).keys()].filter(p => p !== RAIL && s.lv[p] < 3 && (!PARTS[p][3] || s.lv[p] > 0 || free)).sort(() => Math.random() - 0.5);
  const ready = [...Array(NP).keys()].filter(p => BR[p] && s.lv[p] >= 3 && !s.br[p]);
  if (ready.length && Math.random() < 0.75) {   // a maxed part may specialise: both branches are offered side by side
    const p = ready[Math.floor(Math.random() * ready.length)];
    s.offers = [100 + p * 2, 100 + p * 2 + 1, ...pool.slice(0, 1)];
  } else s.offers = pool.slice(0, 3);
}
function choose(s, k) {
  if (!s.alive || s.pending <= 0 || s.offers[k] == null) return;
  const p = s.offers[k];
  if (p >= 100) {   // branch card
    const q = (p - 100) >> 1, v = ((p - 100) & 1) + 1;
    if (!BR[q] || s.lv[q] < 3 || s.br[q]) return;
    s.br[q] = v; s.pending--;
    if (q === ARM && v === 2) { s.hpMax += 260; s.hp += 260; }
    ev('w', s.x, s.y); s.hp = Math.min(s.hpMax, s.hp + 30); makeOffers(s); return;
  }
  if (PARTS[p][3] && s.lv[p] === 0) { const j = s.sk.indexOf(-1); if (j < 0) return; s.sk[j] = p; }
  s.lv[p]++; s.dp[p] = 0; s.ph[p] = 30 + 20 * s.lv[p]; s.pending--;
  if (p === ARM) { s.hpMax += 110; s.hp += 110; }
  if (p === SHD) s.sh = 45 * s.lv[SHD];
  s.hp = Math.min(s.hpMax, s.hp + 15); s.rad = radOf(s.lv); makeOffers(s);
}
function addScrap(s, n) {
  s.scrap += n;
  while (s.level < MAXLV && s.scrap >= thresh(s.level + 1)) { s.level++; s.pending++; }
  if (s.pending > 0 && !s.offers.length) makeOffers(s);
}
function hurt(s, dmg, by, x, y) {
  if (!s.alive || G.over || s.inv > 0 || s.phase > 0) return;
  if (BRN(s, ENG) === 2 && Math.random() < 0.12) { ev('s', x, y, 0); return; }   // Evasion Matrix
  s.lastHit = G.t; s.cloak = 0;
  dmg *= (s.emp > 0 ? 1.35 : 1) * (s.slow > 0 ? 1.15 : 1);   // combo window: stunned +35%, slowed +15%
  if (s.aegis > 0) dmg *= 0.6;
  if (s.od > 0 && BRN(s, OD) === 1) dmg *= 1.25;
  if (s.sh > 0) {
    const a = Math.min(s.sh, dmg); s.sh -= a; dmg -= a; ev('s', x, y, Math.round(a));
    if (s.sh <= 0 && BRN(s, SHD) === 2 && G.t >= s.novaT) {   // Nova Shield: the broken shield bursts and stuns what is near
      s.novaT = G.t + 12; ev('k', s.x, s.y, 190);
      for (const o of G.ships) if (o.alive && teamOf(o.i) !== teamOf(s.i) && dist(o, s) < 190 + o.rad) { o.emp = Math.max(o.emp, 0.7); const d = dist(o, s) || 1; o.vx += (o.x - s.x) / d * 300; o.vy += (o.y - s.y) / d * 300; }
    }
    if (dmg <= 0) return;
  }
  dmg *= 1 - 0.07 * eff(s, ARM);
  if (BRN(s, ARM) === 1 && by >= 0 && by !== s.i) {   // Reactive Plating
    const o = G.ships[by]; if (o && o.alive && teamOf(o.i) !== teamOf(s.i)) { o.hp -= dmg * 0.15; if (o.hp <= 0) killShip(o, s.i); }
  }
  s.hp -= dmg; ev('h', x, y, Math.round(dmg));
  if (s.hp <= 0) {
    if (BRN(s, REP) === 2 && G.t >= s.lsT) { s.lsT = G.t + 60; s.hp = s.hpMax * 0.25; s.inv = 2; ev('w', s.x, s.y); logMsg(G.players[s.i].name + ' survived with Last Stand!'); return; }
    killShip(s, by);
  }
}
function killShip(s, by) {
  if (!s.alive) return;
  s.alive = false; s.hp = 0; s.respT = G.cond === 'last' ? 6 : 5 + Math.min(4, Math.floor(s.level / 4)); ev('d', s.x, s.y, s.i);
  dropOrbs(s.x, s.y, 20 + s.scrap * 0.35, 6);
  if (Math.random() < 0.5) G.pick.push({ id: G.nid++, t: 1, x: s.x, y: s.y, v: 0, vx: 0, vy: 0, life: 60 });
  const k = by >= 0 ? G.ships[by] : null, st = s.streak; s.streak = 0; s.cloak = s.od = s.aegis = s.amb = 0;
  if (k && k.alive && teamOf(k.i) !== teamOf(s.i)) {
    k.kills++; k.streak++; addScrap(k, 25 + 8 * s.level + 12 * Math.max(0, s.level - k.level)); k.hp = Math.min(k.hpMax, k.hp + 60);
    let pts = SCORE_KILL, msg = `${G.players[k.i].name} destroyed ${G.players[s.i].name}`;
    if (st >= 3) { const b = Math.min(5, st - 2); pts += b; msg += ` — ended a ${st}-kill streak (+${b} bounty)`; }
    if (k.streak === 3 || k.streak === 5 || k.streak === 8) logMsg(`🔥 ${G.players[k.i].name} is on a ${k.streak}-kill streak — bounty on their head!`);
    addScore(teamOf(k.i), pts); logMsg(msg);
  }
  else logMsg(`${G.players[s.i].name} was lost to the void`);
}
function collapseWell(w) {   // end of a gravity bomb: stun + damage everything still inside
  const lvl = w.lvl || 1, cr = 170 + 15 * lvl, ot = teamOf(w.o), dm = (25 + 8 * lvl) * (w.br === 1 ? 1.8 : 1), stun = Math.max(0, 0.7 + 0.15 * lvl + (w.br === 1 ? 0.6 : w.br === 2 ? -0.7 : 0));
  ev('k', w.x, w.y, cr);
  for (const sh of G.ships) if (sh.alive && teamOf(sh.i) !== ot && Math.hypot(sh.x - w.x, sh.y - w.y) < cr + sh.rad) {
    sh.emp = Math.max(sh.emp, stun); hurt(sh, dm, w.o, sh.x, sh.y);
    if (w.br === 2) { const d = Math.hypot(sh.x - w.x, sh.y - w.y) || 1; sh.vx += (sh.x - w.x) / d * 520; sh.vy += (sh.y - w.y) / d * 520; }
  }
  for (const n of G.neut) if (!n.dead && HN(n) && Math.hypot(n.x - w.x, n.y - w.y) < cr + n.rad) hurtNeut(n, dm, n.x, n.y, w.o);
}
function respawn(s) {   // pick the safest of a few spots around the start base (far from enemies and gravity wells)
  let best = { x: s.sx, y: s.sy }, bs = -1e9;
  const foes = G.ships.filter(o => o.alive && teamOf(o.i) !== teamOf(s.i));
  for (let k = 0; k < 9; k++) {
    const a = rnd(0, 6.28), r = k ? rnd(100, 650) : 0, p = { x: s.sx + Math.cos(a) * r, y: s.sy + Math.sin(a) * r };
    let sc = Math.min(2500, ...foes.map(o => dist(o, p)));
    for (const w of G.wells) if (w.type !== 1 || w.life == null) sc -= Math.max(0, w.gr + 150 - dist(w, p)) * 1.5;
    for (const h of G.haz) sc -= Math.max(0, h.r + 100 - dist(h, p)) * 2;
    if (Math.hypot(p.x, p.y) > G.z - 250) sc -= 3000;
    if (sc > bs) { bs = sc; best = p; }
  }
  { const d = Math.hypot(best.x, best.y), lim = G.z - 320; if (d > lim && d > 0) best = { x: best.x / d * lim, y: best.y / d * lim }; }
  s.alive = true; s.hp = s.hpMax; s.sh = s.shMax; s.x = best.x; s.y = best.y; s.vx = s.vy = 0; s.ang = Math.atan2(-best.y, -best.x); s.emp = 0; s.slow = 0; s.inv = 3; s.lastHit = G.t;
  s.cloak = s.od = s.aegis = s.amb = 0; s.streak = 0;
  for (let p = 0; p < NP; p++) { s.dp[p] = 0; s.ph[p] = 30 + 20 * s.lv[p]; }
  ev('w', s.x, s.y);
}
function dropOrbs(x, y, total, n) {
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), sp = rnd(30, 110); G.pick.push({ id: G.nid++, t: 0, x, y, v: total / n, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 60 }); }
}
function hurtNeut(n, dmg, x, y, by) {
  if (n.dead || n.type === 5 || n.type === 7 || (n.type === 6 && by >= 0 && teamOf(by) === teamOf(n.ow))) return;
  n.hp -= dmg; ev('h', x, y, Math.round(dmg)); if (by >= 0) n.by = by;
  if (n.hp > 0) return;
  n.dead = true; ev('x', n.x, n.y, n.rad * 2);
  if (n.type === 6) { if (n.ttl == null) logMsg(`A ${ECLS[n.cls || 0].n} escort was destroyed`); return; }
  const k = n.by >= 0 ? G.ships[n.by] : null, kf = k && k.alive ? teamOf(k.i) : -1;
  if (n.type === 2 || n.type === 9) {   // bosses: Leviathan and Dreadnought
    const dn = n.type === 9;
    dropOrbs(n.x, n.y, dn ? 320 : 220, 10);
    for (let i = 0; i < 3; i++) G.pick.push({ id: G.nid++, t: 1, x: n.x + rnd(-40, 40), y: n.y + rnd(-40, 40), v: 0, vx: 0, vy: 0, life: 60 });
    if (dn) { G.dread = false; G.dreadAt = G.cond === 'last' ? 1e9 : G.t + 150 * G.lenF; } else { G.boss = false; G.bossAt = G.cond === 'last' ? 1e9 : G.t + 140 * G.lenF; }
    const nm = dn ? 'Dreadnought' : 'Leviathan';
    if (k && k.alive) { k.pending += 2; makeOffers(k); k.hp = k.hpMax; addScore(kf, dn ? 12 : 8); logMsg(`${G.players[k.i].name} slew the ${nm} and claimed a relic (+2 upgrades${G.cond === 'score' ? ', +' + (dn ? 12 : 8) + ' pts' : ''})!`); }
    else logMsg(`The ${nm} was destroyed`);
  } else {
    dropOrbs(n.x, n.y, n.type === 4 ? 120 : n.type ? 35 : 10, n.type === 4 ? 8 : n.type ? 5 : 2);
    if (n.type && Math.random() < (n.type === 8 ? 0.12 : 0.6)) G.pick.push({ id: G.nid++, t: 1, x: n.x, y: n.y, v: 0, vx: 0, vy: 0, life: 60 });
    if (n.type === 4 && kf >= 0) { addScore(kf, 2); logMsg(`${G.players[k.i].name} sank a pirate warship`); }
  }
}
function hurtAst(a, dmg, x, y) {
  if (a.dead) return;
  a.hp -= dmg; ev('h', x, y, Math.round(dmg));
  if (a.hp <= 0) { a.dead = true; ev('x', a.x, a.y, a.r); if (a.rich) dropOrbs(a.x, a.y, a.r * 1.5, 3); else dropOrbs(a.x, a.y, a.r * 0.25, 1); }
}
function spawnProj(k, o, x, y, ang, speed, life, dmg, extra) {
  G.proj.push(Object.assign({ k, o, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life, dmg, tg: null }, extra));
}
function explode(x, y, r, dmg, owner, slowOnly) {
  ev('x', x, y, r);
  const ot = owner >= 0 ? teamOf(owner) : -9;
  for (const s of G.ships) {
    if (!s.alive || teamOf(s.i) === ot) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < r + s.rad) { if (slowOnly === 'emp') s.emp = Math.max(s.emp, 0.9); else if (slowOnly) s.slow = Math.max(s.slow || 0, 2.2); else s.emp = 1.6; hurt(s, dmg * (1 - 0.4 * Math.min(1, d / r)), owner, s.x, s.y); }
  }
  for (const n of G.neut) if (Math.hypot(n.x - x, n.y - y) < r + n.rad) hurtNeut(n, dmg, n.x, n.y, owner);
  for (const a of G.ast) if (Math.hypot(a.x - x, a.y - y) < r + a.r) hurtAst(a, dmg, a.x, a.y);
}
function boom(p) {   // torpedo detonation (cluster variant splits into bomblets)
  explode(p.x, p.y, p.rad, p.dmg, p.o);
  if (p.cl) for (let k = 0; k < 4; k++) spawnProj(4, p.o, p.x, p.y, k * 1.571 + rnd(0, 0.6), 230, 0.55, p.dmg * 0.45, { rad: 52 });
}
function nearest(list, from, maxD = 1e9) {
  let best = null, bd = maxD;
  for (const o of list) { const d = Math.hypot(o.x - from.x, o.y - from.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
const enemyShips = s => G.ships.filter(o => o.alive && !(o.cloak > 0) && teamOf(o.i) !== teamOf(s.i));
const targetsFor = owner => (owner >= 0 ? G.ships.filter(o => o.alive && !(o.cloak > 0) && teamOf(o.i) !== teamOf(owner)) : G.ships.filter(o => o.alive)).concat(G.neut.filter(n => !n.dead && (HN(n) || (n.type === 6 && (owner < 0 || teamOf(n.ow) !== teamOf(owner))))));
function tgtObj(str) {
  if (!str) return null;
  const k = str[0], id = +str.slice(1);
  return k === 's' ? G.ships[id] : k === 'n' ? G.neut.find(n => n.id === id) : k === 'a' ? G.ast.find(a => a.id === id) : null;
}
function idStr(t) { return isShip(t) ? 's' + t.i : t.type != null ? 'n' + t.id : 'a' + t.id; }

function segBlock(x1, y1, x2, y2, ignore) {   // first rock / planet / star on the segment
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1; let best = null, bu = 2;
  const test = (o, r) => {
    if (o === ignore || o.dead) return;
    const u = clamp(((o.x - x1) * dx + (o.y - y1) * dy) / l2, 0, 1), px = x1 + dx * u, py = y1 + dy * u, d = Math.hypot(o.x - px, o.y - py);
    if (d < r) { const back = Math.sqrt(r * r - d * d) / Math.sqrt(l2), u2 = Math.max(0, u - back); if (u2 < bu) { bu = u2; best = { x: x1 + dx * u2, y: y1 + dy * u2, obj: o }; } }
  };
  for (const a of G.ast) test(a, a.r); for (const w of G.wells) if (w.type !== 1) test(w, w.r);
  return best;
}
function fireBeam(sh, t, dmg, owner, evId) {
  let x2 = t.x, y2 = t.y, obj = t;
  { const rr = t.lv ? t.rad * (t.sh > 0 ? 1.6 : 1) : (t.rad || t.r || 0), dd = Math.hypot(t.x - sh.x, t.y - sh.y) || 1; x2 = t.x - (t.x - sh.x) / dd * rr; y2 = t.y - (t.y - sh.y) / dd * rr; }   // stop at the hull edge, or at the shield bubble
  const b = segBlock(sh.x, sh.y, x2, y2, t); if (b) { x2 = b.x; y2 = b.y; obj = b.obj; }
  ev('l', x2, y2, evId);
  if (obj.gr != null) return;
  if (obj.lv) hurt(obj, dmg, owner, x2, y2); else if (obj.type != null) hurtNeut(obj, dmg, x2, y2, owner); else hurtAst(obj, dmg, x2, y2);
}
function arcStorm(s, lv, b) {   // instant chain lightning on the nearest foes (Tempest: more, farther; Overload: one big stunning hit)
  const rng = b === 1 ? 640 : 480, foes = targetsFor(s.i).filter(o => dist(o, s) < rng + (o.rad || 0)).sort((x, y) => dist(x, s) - dist(y, s));
  const n = b === 2 ? 1 : 3 + lv + (b === 1 ? 3 : 0), dm = (30 + 10 * lv) * (b === 2 ? 3 : 1);
  ev('k', s.x, s.y, 90);
  for (const o of foes.slice(0, n)) {
    ev('A', o.x, o.y, s.i);
    if (isShip(o)) { o.emp = Math.max(o.emp, b === 2 ? 1.1 : 0.5); hurt(o, dm, s.i, o.x, o.y); } else hurtNeut(o, dm, o.x, o.y, s.i);
  }
}
function updateShip(s, dt) {
  const st = stats(s), I = s.in, L = k => eff(s, k);
  const inNeb = G.nebs.some(n => Math.hypot(s.x - n.x, s.y - n.y) < n.r), inIon = G.ion && Math.hypot(s.x - G.ion.x, s.y - G.ion.y) < G.ion.r;
  s.emp = Math.max(0, s.emp - dt); s.slow = Math.max(0, (s.slow || 0) - dt); s.boost = Math.max(0, s.boost - dt);
  s.phase = Math.max(0, (s.phase || 0) - dt); s.od = Math.max(0, s.od - dt); s.aegis = Math.max(0, s.aegis - dt); s.amb = Math.max(0, s.amb - dt);
  if (s.cloak > 0) { s.cloak -= dt; if (s.cloak <= 0) { s.cloak = 0; if (BRN(s, CLK) === 1) s.amb = 4; ev('w', s.x, s.y); } }
  if (s.phase > 0 && s.ram) for (const o of G.ships) {
    if (!o.alive || teamOf(o.i) === teamOf(s.i) || s.ram.has(o.i)) continue;
    if (Math.hypot(o.x - s.x, o.y - s.y) < s.rad + o.rad + 8) { s.ram.add(o.i); hurt(o, (25 + 10 * (s.dashLv || 1)) * (s.dashA ? 2.2 : 1), s.i, o.x, o.y); o.emp = Math.max(o.emp, 0.5); const d = dist(o, s) || 1; o.vx += (o.x - s.x) / d * (s.dashA ? 700 : 350); o.vy += (o.y - s.y) / d * (s.dashA ? 700 : 350); ev('x', (o.x + s.x) / 2, (o.y + s.y) / 2, 40); }
  } s.portalT -= dt; s.fireT -= dt;
  const cdk = s.od > 0 && BRN(s, OD) === 2 ? 2 : 1;
  for (let p = 0; p < NP; p++) s.cd[p] = Math.max(0, s.cd[p] - dt * cdk);
  s.shMax = 45 * L(SHD) * (BRN(s, SHD) === 1 ? 1.6 : 1);
  if (s.sh > s.shMax) s.sh = s.shMax;
  if (s.sh < s.shMax && G.t - s.lastHit > (BRN(s, SHD) === 1 ? 1.5 : 3) && !inNeb && !inIon) s.sh = Math.min(s.shMax, s.sh + (8 + 6 * L(SHD)) * dt);
  const rp = L(REP);
  if (rp && G.t - s.lastHit > 3) {
    s.hp = Math.min(s.hpMax, s.hp + (1 + rp) * dt);
    if (BRN(s, REP) === 1) {   // Nano Swarm: heal allies and their escorts nearby
      for (const o of G.ships) if (o !== s && o.alive && teamOf(o.i) === teamOf(s.i) && dist(o, s) < 260) o.hp = Math.min(o.hpMax, o.hp + 4 * dt);
      for (const n of G.neut) if (n.type === 6 && !n.dead && G.ships[n.ow] && teamOf(n.ow) === teamOf(s.i) && dist(n, s) < 260) n.hp = Math.min(n.hpMax, n.hp + 4 * dt);
    }
    if ((s.repT -= dt) <= 0) { s.repT = 12 - 3 * rp; const d = [...Array(NP).keys()].find(p => s.dp[p]); if (d != null) { s.dp[d] = 0; s.ph[d] = 30 + 20 * s.lv[d]; } }
  }
  // movement
  let mx = s.emp > 0 ? 0 : I.mx, my = s.emp > 0 ? 0 : I.my; const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  s.thr = ml > 0.05 ? 1 : 0;
  const sf = s.slow > 0 ? 0.6 : 1; s.vx += mx * st.acc * sf * dt; s.vy += my * st.acc * sf * dt;
  const [gx, gy] = gravAt(G.wells, s.x, s.y, teamOf(s.i)); s.vx += gx * dt; s.vy += gy * dt;
  const [qx, qy, inSt] = streamAt(G.streams, s.x, s.y); s.vx += qx * dt; s.vy += qy * dt;
  const kd = Math.exp(-DRAG * dt); s.vx *= kd; s.vy *= kd;
  const vm = st.vmax * (s.boost > 0 ? 2.2 : 1) * (inNeb ? 0.65 : 1) * (1 + 0.35 * inSt) * (s.slow > 0 ? 0.55 : 1), sp = Math.hypot(s.vx, s.vy);
  if (sp > vm) { s.vx *= vm / sp; s.vy *= vm / sp; }
  // facing: toward the locked target if any (so you can drift around it), otherwise toward the stick direction
  const lock = tgtObj(I.tg), lockOk = lock && enemyOf(s, lock) && dist(s, lock) <= 720;
  const fa = lockOk ? Math.atan2(lock.y - s.y, lock.x - s.x) : (ml > 0.05 ? Math.atan2(my, mx) : null);
  if (fa != null) s.ang += clamp(angDiff(s.ang, fa), -st.turn * dt, st.turn * dt);
  s.x += s.vx * dt; s.y += s.vy * dt;
  const dc = Math.hypot(s.x, s.y);
  if (dc > R0 + 150) { s.x *= (R0 + 150) / dc; s.y *= (R0 + 150) / dc; s.vx *= 0.5; s.vy *= 0.5; }
  if (dc > G.z) { s.hp -= (6 + (dc - G.z) / 80) * dt; if (s.hp <= 0) return killShip(s, -2); }
  if (inIon) { s.hp -= 10 * dt; s.ionT = (s.ionT || 0) - dt; if (s.ionT <= 0) { s.ionT = 2; s.emp = Math.max(s.emp, 0.5); ev('s', s.x, s.y); } if (s.hp <= 0) return killShip(s, -2); }
  for (const h of G.haz) if (Math.hypot(s.x - h.x, s.y - h.y) < h.r) { s.hp -= 9 * dt; s.lastHit = G.t; if (s.hp <= 0) return killShip(s, -2); break; }   // radiation cloud
  for (const w of G.wells) {
    const d = Math.hypot(s.x - w.x, s.y - w.y);
    if (w.type === 2) { const H = w.r + 110; if (d < H) { s.hp -= (12 + 55 * (1 - d / H)) * dt; if (s.hp <= 0) return killShip(s, -2); } }
    if (w.type !== 1 && d < w.r + s.rad && d > 0) {
      const nx = (s.x - w.x) / d, ny = (s.y - w.y) / d; s.x = w.x + nx * (w.r + s.rad); s.y = w.y + ny * (w.r + s.rad);
      const vn = s.vx * nx + s.vy * ny; if (vn < 0) { s.vx -= 1.5 * vn * nx; s.vy -= 1.5 * vn * ny; }
    }
  }
  for (const a of G.ast) {
    const d = Math.hypot(s.x - a.x, s.y - a.y), mn = s.rad + a.r;
    if (d < mn && d > 0) { const nx = (s.x - a.x) / d, ny = (s.y - a.y) / d; s.x = a.x + nx * mn; s.y = a.y + ny * mn; const vn = s.vx * nx + s.vy * ny; if (vn < 0) { s.vx -= 1.6 * vn * nx; s.vy -= 1.6 * vn * ny; } if (a.deb && (s.debT || 0) <= G.t) { s.debT = G.t + 0.4; hurt(s, 7, -1, s.x, s.y); } }
  }
  if (s.portalT <= 0) {
    for (let k = 0; k < G.portals.length; k++) {
      const p = G.portals[k];
      if (Math.hypot(s.x - p.x, s.y - p.y) < 40 + s.rad) { const q = G.portals[1 - k]; ev('w', s.x, s.y); s.x = q.x + (s.vx > 0 ? 1 : -1) * 70; s.y = q.y; s.portalT = 2.5; ev('w', s.x, s.y); break; }
    }
  }
  // target resolution + auto-fire lasers
  let t = tgtObj(I.tg);
  if (!t || !enemyOf(s, t) || dist(s, t) > 720) t = null;
  if (!t) t = nearest(enemyShips(s), s, LASER_RANGE) || nearest(G.neut.filter(n => !n.dead && (HN(n) || (n.type === 6 && teamOf(n.ow) !== teamOf(s.i)))), s, 560) || nearest(G.ast.filter(a => !a.big), s, 330);
  s.tgtNow = t;
  if (s.emp > 0) { s.railQ = null; return; }
  if (s.railQ) { s.railQ.t -= dt; if (s.railQ.t <= 0) { const q = s.railQ; s.railQ = null; spawnProj(7, s.i, s.x + Math.cos(q.a) * s.rad, s.y + Math.sin(q.a) * s.rad, q.a, 1500, 0.8, 70 + 25 * q.lv, { hit: [] }); ev('F', s.x, s.y, s.i); } }
  s.bAcc = t ? Math.min(0.2, (s.bAcc || 0) + dt) : 0;
  if (!t) { s.fT = 0; s.fTg = null; }
  if (t && s.fireT <= 0 && dist(s, t) < LASER_RANGE + (t.rad || t.r || 0)) {
    const l = L(LAS), n = 1 + (l >= 2 ? 1 : 0) + (l >= 3 ? 1 : 0); s.fireT = 0.1;
    if (s.fTg !== t) { s.fTg = t; s.fT = 0; }   // focus: staying on one target ramps the beam up to +80% over 3 s
    s.fT = Math.min(3, (s.fT || 0) + s.bAcc);
    const lb = BRN(s, LAS), dm = (lb === 1 ? 1.4 : 1) * (s.od > 0 ? (BRN(s, OD) === 1 ? 1.6 : 1.3) : 1) * (s.amb > 0 ? 1.4 : 1);
    const dmgTick = n * (5 + 1.5 * l) / (0.55 - 0.03 * l) * Math.max(0.05, s.bAcc) * (1 + (lb === 1 ? 1.6 : 0.8) * s.fT / 3) * dm;
    fireBeam(s, t, dmgTick, s.i, s.i); s.bAcc = 0;
    if (l >= 2) {   // arc to a second enemy near the target (Chain Arc: up to 3 more)
      const arcs = enemyShips(s).filter(o => o !== t && dist(o, t) < 170 + 30 * l).sort((a, b) => dist(a, t) - dist(b, t)).slice(0, lb === 2 ? 3 : 1);
      for (const t2 of arcs) hurt(t2, dmgTick * (lb === 2 ? 0.6 : 0.5), s.i, t2.x, t2.y);
    }
    if ((s.fN = (s.fN || 0) + 1) % 3 === 0) ev('f', s.x, s.y, s.i);
  }
  // skills
  for (let j = 0; j < 3; j++) {
    const p = s.sk[j];
    if (p < 0 || !I['s' + j] || s.cd[p] > 0 || !L(p)) continue;
    s.cd[p] = cdMax(s.lv, p);
    const lv = L(p), ta = t ? Math.atan2(t.y - s.y, t.x - s.x) : s.ang;
    const am = I.sa && I.sa[j] ? I.sa[j] : null, aa = am ? am[0] : null, pw = am ? am[1] : 0;   // player-aimed direction + power (drag length)
    const ang0 = aa != null ? aa : ta;
    const bp = BRN(s, p);
    if (p === MIS) { const mn = bp === 2 ? 2 : 2 + lv + (bp === 1 ? 4 : 0), md = (18 + 4 * lv) * (bp === 1 ? 0.65 : bp === 2 ? 2.6 : 1); for (let k = 0; k < mn; k++) spawnProj(2, s.i, s.x, s.y, ang0 + (k - (mn - 1) / 2) * 0.3, 340, 3.5, md, { tg: aa != null ? null : t, turn: bp === 2 ? 4 : 3.2, sp: 340 }); }
    else if (p === DRN) { const dn = 4 + 2 * lv + (bp === 1 ? 6 : 0); for (let k = 0; k < dn; k++) spawnProj(3, s.i, s.x, s.y, aa != null ? aa + rnd(-0.7, 0.7) : rnd(0, 6.28), 230, 10, (9 + 2 * lv) * (bp === 1 ? 0.75 : 1), { turn: 5, sp: 230, emp: bp === 2 ? 0.7 : 0 }); }
    else if (p === TOR) spawnProj(4, s.i, s.x + Math.cos(ang0) * s.rad, s.y + Math.sin(ang0) * s.rad, ang0, 300, 2.2, (55 + 15 * lv) * (bp === 1 ? 1.4 : 1), { rad: (75 + 15 * lv) * (bp === 1 ? 1.6 : 1), cl: bp === 2 ? 1 : 0 });
    else if (p === MIN) {
      const own = G.mines.filter(m => m.o === s.i); if (own.length >= 2) G.mines.splice(G.mines.indexOf(own[0]), 1);
      const bm = BRN(s, MIN), r = 90 + 15 * lv, dd = aa != null ? 80 + pw * 370 : s.rad + r * 0.7, da = aa != null ? aa : (Math.hypot(s.vx, s.vy) > 30 ? Math.atan2(-s.vy, -s.vx) : s.ang + Math.PI);   // behind your MOVEMENT, not your facing (you face your target while locked)
      G.mines.push({ id: G.nid++, x: s.x + Math.cos(da) * dd, y: s.y + Math.sin(da) * dd, vx: s.vx * 0.3, vy: s.vy * 0.3, o: s.i, r, life: bm === 1 ? 18 : 12, arm: 1, dmg: 28 + 8 * lv, emp: bm === 2 ? 1 : 0,
        ms: Array.from({ length: 5 + 2 * lv + (bm === 1 ? 5 : 0) }, () => { const a = rnd(0, 6.28), rr = Math.sqrt(Math.random()) * r; return [Math.cos(a) * rr, Math.sin(a) * rr]; }) });
    } else if (p === DSH) {
      const da = aa != null ? aa : (ml > 0.05 ? Math.atan2(my, mx) : s.ang);
      if (bp === 2) { ev('w', s.x, s.y); s.x += Math.cos(da) * 480; s.y += Math.sin(da) * 480; s.phase = 0.5; s.ram = null; const dc2 = Math.hypot(s.x, s.y); if (dc2 > R0 + 100) { s.x *= (R0 + 100) / dc2; s.y *= (R0 + 100) / dc2; } ev('w', s.x, s.y); }
      else { s.boost = 0.4; s.phase = 0.4; s.ram = new Set(); s.dashLv = lv; s.dashA = bp === 1; s.vx += Math.cos(da) * 800; s.vy += Math.sin(da) * 800; }
    }
    else if (p === RAIL) { const fa2 = aa != null ? aa : (t && Math.abs(angDiff(s.ang, ta)) < 0.3 ? ta : s.ang); s.railQ = { t: 0.45, a: fa2, lv }; ev('g', s.x, s.y, Math.round(fa2 * 100)); }   // charge-up is visible to everyone, so it can be dodged
    else if (p === GRV) {   // temporary gravity well: pulls + slows foes, then collapses into a stun
      const at = aa != null ? { x: s.x + Math.cos(aa) * (150 + pw * 550), y: s.y + Math.sin(aa) * (150 + pw * 550) } : (t && dist(s, t) < 700 ? { x: t.x, y: t.y } : { x: s.x + Math.cos(s.ang) * 350, y: s.y + Math.sin(s.ang) * 350 });
      G.wells.push({ type: 1, x: at.x, y: at.y, r: 30, gr: 300, g: bp === 2 ? -380 : 400, life: 4.5, o: s.i, lvl: lv, br: bp }); ev('w', at.x, at.y);
    }
    else if (p === PUL) {
      const pr = bp === 1 ? 380 : 260, pd = (20 + 8 * lv) * (bp === 1 ? 1.6 : 1);
      ev('k', s.x, s.y, pr);
      for (const o of G.ships) { if (!o.alive || teamOf(o.i) === teamOf(s.i)) continue; const d = dist(o, s); if (d < pr + o.rad && d > 0) { o.vx += (o.x - s.x) / d * 520; o.vy += (o.y - s.y) / d * 520; o.emp = Math.max(o.emp, 0.9); o.slow = Math.max(o.slow || 0, 2.5); if (bp === 2) { o.sh = 0; o.lastHit = G.t; } hurt(o, pd, s.i, o.x, o.y); } }
      for (const n of G.neut) if (!n.dead && HN(n) && dist(n, s) < pr + n.rad) hurtNeut(n, pd, n.x, n.y, s.i);
      for (let k = G.proj.length - 1; k >= 0; k--) { const q = G.proj[k]; if (q.o !== s.i && (q.k === 1 || q.k === 2 || q.k === 3 || q.k === 5) && dist(q, s) < pr - 40 && (q.o < 0 || teamOf(q.o) !== teamOf(s.i))) G.proj.splice(k, 1); }
    }
    else if (p === CLK) { s.cloak = (3 + lv) * (bp === 2 ? 2 : 1); s.amb = 0; ev('w', s.x, s.y); }
    else if (p === OD) { s.od = 6 + lv; ev('w', s.x, s.y); }
    else if (p === AEG) { s.aegis = 3.5 + lv; ev('k', s.x, s.y, 120); }
    else if (p === NAN) {
      const old = G.fields.findIndex(f => f.o === s.i); if (old >= 0) G.fields.splice(old, 1);
      G.fields.push({ x: s.x, y: s.y, r: 230, life: 6, max: 6, o: s.i, k: bp === 2 ? 1 : 0, br: bp, lvl: lv }); ev('w', s.x, s.y);
    }
    else if (p === ARC) arcStorm(s, lv, bp);
    else if (p === FLT) { if (bp === 1) for (let k = 0; k < 3; k++) addEscort(s, 0, 25); else if (bp === 2) addEscort(s, 1, 40, 1.5); else { addEscort(s, 0, 25); addEscort(s, 0, 25); } logMsg(`${G.players[s.i].name} called reinforcements!`); }
  }
}
function stepProj(p, dt) {
  if (p.k === 2 || p.k === 3) {
    const o = G.ships[p.o];
    if (!isLive(p.tg) || (isShip(p.tg) && teamOf(p.tg.i) === teamOf(p.o))) { const hd = Math.atan2(p.vy, p.vx); p.tg = nearest(targetsFor(p.o).filter(t2 => p.k !== 2 || Math.abs(angDiff(hd, Math.atan2(t2.y - p.y, t2.x - p.x))) < 0.8), p, p.k === 2 ? 420 : 700); }
    let want = Math.atan2(p.vy, p.vx);
    if (p.tg) want = Math.atan2(p.tg.y - p.y, p.tg.x - p.x); else if (p.k === 3 && o && o.alive) want = Math.atan2(o.y - p.y, o.x - p.x) + 1.2;
    const [gx, gy] = gravAt(G.wells, p.x, p.y); p.vx += gx * dt; p.vy += gy * dt;
    const cur = Math.atan2(p.vy, p.vx), na = cur + clamp(angDiff(cur, want), -p.turn * dt, p.turn * dt);
    p.vx = Math.cos(na) * p.sp; p.vy = Math.sin(na) * p.sp;
  } else if (p.k !== 6 && p.k !== 7) { const [gx, gy] = gravAt(G.wells, p.x, p.y); const f = p.k === 4 ? 1 : 0.6; p.vx += gx * dt * f; p.vy += gy * dt * f; }
  p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
}
function projHit(p) {
  const pr = [0, 3, 5, 5, 9, 4, 14, 5][p.k];
  for (const w of G.wells) { const d = Math.hypot(p.x - w.x, p.y - w.y); if (w.type !== 1 && d < w.r) { if (p.k === 4) boom(p); return true; } }
  if (p.k === 7) {   // railgun: pierces everything once, planets stop it
    const ot = teamOf(p.o);
    for (const sh of G.ships) { const id = 's' + sh.i; if (sh.alive && teamOf(sh.i) !== ot && !p.hit.includes(id) && Math.hypot(sh.x - p.x, sh.y - p.y) < sh.rad + pr) { p.hit.push(id); hurt(sh, p.dmg * (sh.emp > 0 ? 1.25 : 1), p.o, p.x, p.y); } }
    for (const n of G.neut) { const id = 'n' + n.id; if (!n.dead && n.type !== 5 && n.type !== 7 && !(n.type === 6 && teamOf(n.ow) === ot) && !p.hit.includes(id) && Math.hypot(n.x - p.x, n.y - p.y) < n.rad + pr) { p.hit.push(id); hurtNeut(n, p.dmg, p.x, p.y, p.o); } }
    for (const a of G.ast) { const id = 'a' + a.id; if (!a.dead && !p.hit.includes(id) && Math.hypot(a.x - p.x, a.y - p.y) < a.r + pr) { p.hit.push(id); hurtAst(a, p.dmg, p.x, p.y); } }
    return false;
  }
  if (p.k === 5 || p.k === 6) {
    for (const s of G.ships) if (s.alive && Math.hypot(s.x - p.x, s.y - p.y) < s.rad + pr) { hurt(s, p.dmg, -1, p.x, p.y); return true; }
    if (p.k === 6) for (const a of G.ast) if (!a.dead && Math.hypot(a.x - p.x, a.y - p.y) < a.r + pr) { hurtAst(a, 60, p.x, p.y); return true; }
    return false;
  }
  const ot = teamOf(p.o);
  for (const s of G.ships) {
    if (!s.alive || teamOf(s.i) === ot) continue;
    if (Math.hypot(s.x - p.x, s.y - p.y) < s.rad + pr) { if (p.k === 4) boom(p); else { hurt(s, p.dmg, p.o, p.x, p.y); if (p.emp) s.emp = Math.max(s.emp, p.emp); } return true; }
  }
  for (const n of G.neut) if (!n.dead && n.type !== 5 && n.type !== 7 && !(n.type === 6 && teamOf(n.ow) === ot) && Math.hypot(n.x - p.x, n.y - p.y) < n.rad + pr) { if (p.k === 4) boom(p); else hurtNeut(n, p.dmg, p.x, p.y, p.o); return true; }
  for (const a of G.ast) if (!a.dead && Math.hypot(a.x - p.x, a.y - p.y) < a.r + pr) { if (p.k === 4) boom(p); else hurtAst(a, p.dmg, p.x, p.y); return true; }
  return false;
}
function updateNeut(n, dt) {
  if (n.type === 4) {   // pirate warship: patrols, hunts nearby ships, fires fan bursts
    const tg = nearest(G.ships.filter(sh => sh.alive), n, 760);
    if (tg) { n.gx = tg.x; n.gy = tg.y; } else if (Math.hypot(n.gx - n.x, n.gy - n.y) < 60 || Math.random() < 0.002) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * G.z * 0.8; n.gx = Math.cos(a) * r; n.gy = Math.sin(a) * r; }
    if (Math.hypot(n.x, n.y) > G.z * 0.92) { n.gx = 0; n.gy = 0; }
    const dx = n.gx - n.x, dy = n.gy - n.y, d = Math.hypot(dx, dy) || 1, want = tg ? (d > 340 ? 95 : d < 260 ? -60 : 0) : 70;
    n.vx += (dx / d * want - n.vx) * Math.min(1, dt); n.vy += (dy / d * want - n.vy) * Math.min(1, dt); n.x += n.vx * dt; n.y += n.vy * dt;
    n.ang = tg ? Math.atan2(tg.y - n.y, tg.x - n.x) : (Math.hypot(n.vx, n.vy) > 5 ? Math.atan2(n.vy, n.vx) : n.ang);
    if (tg && (n.shT -= dt) <= 0) { n.shT = 1.5; const cnt = n.hp < n.hpMax * 0.5 ? 9 : 5; for (let k = 0; k < cnt; k++) spawnProj(5, -1, n.x, n.y, n.ang + (k - (cnt - 1) / 2) * 0.16, 400, 2.2, 9); }
    return;
  }
  if (n.type === 5) {   // stranded ship (rescue: hold still next to it) -- convoy ships are guarded by raiders
    n.x += n.vx * dt; n.y += n.vy * dt; n.ang += dt * 0.4; if (Math.random() < 0.01) { n.vx = rnd(-12, 12); n.vy = rnd(-12, 12); }
    const near = nearest(G.ships.filter(sh => sh.alive), n, 110 + 20);
    if (near && fleetN(near.i) < fleetCap(near)) {
      n.res = Math.min(1, (n.res || 0) + dt / 3);
      if (n.res >= 1) {
        const C = ECLS[n.cls || 0], hp = C.hp * (1 + 0.04 * near.level);
        n.type = 6; n.ow = near.i; n.hp = n.hpMax = hp; n.rad = C.rad; n.shT = 0; n.res = 0; ev('w', n.x, n.y);
        if (n.conv) { addScore(teamOf(near.i), 2); addScrap(near, 40); logMsg(`${G.players[near.i].name} saved the convoy — a ${C.n} joins their fleet${G.cond === 'score' ? ' (+2 pts)' : ''}!`); }
        else logMsg(`${G.players[near.i].name} rescued a ${C.n} — it now follows them!`);
      }
    } else {
      n.res = Math.max(0, (n.res || 0) - dt / 2);
      if (near && G.t > (near.dnT || 0)) { near.dnT = G.t + 3; ev('n', n.x, n.y, near.i * 10 + 2); }
    }
    return;
  }
  if (n.type === 6) {   // escort: sails in formation around its owner (or the owner's wreck while they respawn); behaviour depends on class
    const o = G.ships[n.ow]; if (!o || (!o.alive && G.cond === 'last')) { n.dead = true; return; }
    if (n.ttl != null && (n.ttl -= dt) <= 0) { n.dead = true; ev('x', n.x, n.y, 30); return; }
    const C = ECLS[n.cls || 0], fl = G.neut.filter(m => m.type === 6 && m.ow === n.ow && !m.dead), idx = Math.max(0, fl.indexOf(n)), ring = Math.floor(idx / 4), inRing = Math.min(4, fl.length - ring * 4);
    const a = G.t * (0.6 - 0.1 * ring) + (idx - ring * 4) * 6.283 / Math.max(1, inRing) + ring, rr = 95 + 50 * ring, tx = o.x + Math.cos(a) * rr, ty = o.y + Math.sin(a) * rr, dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(340, d * 3);
    n.vx += (dx / d * sp - n.vx) * Math.min(1, 3 * dt); n.vy += (dy / d * sp - n.vy) * Math.min(1, 3 * dt); n.x += n.vx * dt; n.y += n.vy * dt;
    const foe = nearest(targetsFor(n.ow), n, C.rng), lvm = 1 + 0.05 * o.level;
    n.ang = foe ? Math.atan2(foe.y - n.y, foe.x - n.x) : (Math.hypot(n.vx, n.vy) > 5 ? Math.atan2(n.vy, n.vx) : n.ang);
    if (n.cls === 2) {   // medic: repairs the owner, allies and their escorts nearby
      for (const sh of G.ships) if (sh.alive && teamOf(sh.i) === teamOf(n.ow) && dist(sh, n) < 280) sh.hp = Math.min(sh.hpMax, sh.hp + 7 * dt * lvm);
      for (const m of G.neut) if (m !== n && m.type === 6 && !m.dead && G.ships[m.ow] && teamOf(m.ow) === teamOf(n.ow) && dist(m, n) < 280) m.hp = Math.min(m.hpMax, m.hp + 7 * dt * lvm);
    }
    if (!foe) return;
    if (C.dmg > 0 && (n.shT -= dt) <= 0) { n.shT = 0.1; fireBeam(n, foe, C.dmg * lvm, n.ow, 1000 + n.id); }
    else if (n.cls === 3) { if ((n.shT -= dt) <= 0) { n.shT = 3.2; for (let k = 0; k < 2; k++) spawnProj(2, n.ow, n.x, n.y, n.ang + (k - 0.5) * 0.4, 340, 3.5, 16 * lvm, { tg: foe, turn: 3.2, sp: 340 }); } }
    else if (n.cls === 4) { if ((n.shT -= dt) <= 0) { n.shT = 8; for (let k = 0; k < 3; k++) spawnProj(3, n.ow, n.x, n.y, rnd(0, 6.28), 230, 10, 9 * lvm, { turn: 5, sp: 230 }); } }
    return;
  }
  if (n.type === 7) {   // hire outpost: stay inside the ring for 2 s to buy its ship class with scrap
    n.ang += dt * 0.25; const C = ECLS[n.cls || 0], near = nearest(G.ships.filter(sh => sh.alive), n, 125);
    if (!near) { n.res = Math.max(0, (n.res || 0) - dt); return; }
    const full = fleetN(near.i) >= fleetCap(near), poor = near.scrap < C.cost;
    if (full || poor) { n.res = 0; if (G.t > (near.dnT || 0)) { near.dnT = G.t + 3; ev('n', n.x, n.y, near.i * 10 + (full ? 2 : 1)); } return; }
    n.res = Math.min(1, (n.res || 0) + dt / 2);
    if (n.res >= 1) { n.res = -0.4; near.scrap -= C.cost; addEscort(near, n.cls || 0); logMsg(`${G.players[near.i].name} hired a ${C.n} (-${C.cost} scrap)`); }
    if (n.res < 0) n.res = Math.min(0, n.res + dt * 0.4) || 0;
    return;
  }
  if (n.type === 8) {   // raider: fast pirate fighter; guards its convoy, otherwise hunts the nearest ship
    const tg = nearest(G.ships.filter(sh => sh.alive && !(sh.cloak > 0)), n, n.guard ? 560 : 950);
    if (tg) { n.gx = tg.x; n.gy = tg.y; }
    else if (n.guard) { n.gx = n.guard.x + Math.cos(G.t * 0.4 + n.id) * 150; n.gy = n.guard.y + Math.sin(G.t * 0.4 + n.id) * 150; }
    else if (Math.hypot(n.gx - n.x, n.gy - n.y) < 80 || Math.random() < 0.002) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * G.z * 0.8; n.gx = Math.cos(a) * r; n.gy = Math.sin(a) * r; }
    const dx = n.gx - n.x, dy = n.gy - n.y, d = Math.hypot(dx, dy) || 1, want = tg ? (d > 320 ? 190 : d < 200 ? -100 : 20) : 120;
    n.vx += (dx / d * want - n.vx) * Math.min(1, 1.6 * dt); n.vy += (dy / d * want - n.vy) * Math.min(1, 1.6 * dt); n.x += n.vx * dt; n.y += n.vy * dt;
    for (const w of G.wells) if (w.type !== 1 && Math.hypot(n.x - w.x, n.y - w.y) < w.r + 10) { n.dead = true; return; }
    n.ang = tg ? Math.atan2(tg.y - n.y, tg.x - n.x) : (Math.hypot(n.vx, n.vy) > 5 ? Math.atan2(n.vy, n.vx) : n.ang);
    if (tg && (n.shT -= dt) <= 0) { n.shT = 1.2; for (let k = -1; k <= 1; k++) spawnProj(5, -1, n.x, n.y, n.ang + k * 0.14, 400, 1.6, 6); }
    return;
  }
  if (n.type === 9) {   // dreadnought: slow pirate mothership: aimed volleys, launches raiders, rages below half hull
    const tg = nearest(G.ships.filter(sh => sh.alive && !(sh.cloak > 0)), n, 1500), rage = n.hp < n.hpMax * 0.5;
    if (tg) { const d = dist(n, tg) || 1, want = d > 520 ? 48 : 0; n.vx += ((tg.x - n.x) / d * want - n.vx) * Math.min(1, dt); n.vy += ((tg.y - n.y) / d * want - n.vy) * Math.min(1, dt); n.ang = Math.atan2(tg.y - n.y, tg.x - n.x); }
    else { n.vx *= 0.98; n.vy *= 0.98; }
    n.x += n.vx * dt; n.y += n.vy * dt;
    if (tg && dist(n, tg) < 900 && (n.shT -= dt) <= 0) {
      n.shT = rage ? 1.8 : 2.4; const cnt = rage ? 9 : 5;
      for (let k = 0; k < cnt; k++) spawnProj(5, -1, n.x, n.y, n.ang + (k - (cnt - 1) / 2) * 0.13, 330, 3, 10);
      if (rage) for (let k = 0; k < 10; k++) spawnProj(5, -1, n.x, n.y, k * 0.628 + G.t, 260, 2.4, 8);
    }
    if (tg && (n.lnT = (n.lnT == null ? 6 : n.lnT) - dt) <= 0) { n.lnT = rage ? 8 : 12; if (G.neut.filter(m => m.type === 8).length < 14) for (let k = 0; k < 2; k++) spawnRaider(n.x + rnd(-80, 80), n.y + rnd(-80, 80)); }
    return;
  }
  if (n.type === 3) {   // sentry: stationary turret, bursts at the nearest ship in range
    const tg = nearest(G.ships.filter(sh => sh.alive), n, 560);
    if (tg) { n.ang = Math.atan2(tg.y - n.y, tg.x - n.x); if ((n.shT -= dt) <= 0) { n.shT = 1.6; for (let k = -1; k <= 1; k++) spawnProj(5, -1, n.x, n.y, n.ang + k * 0.18, 420, 1.4, 7); } }
    return;
  }
  if (n.type === 2) {
    const tg = nearest(G.ships.filter(s => s.alive), n, 1100);
    if (tg) { const d = dist(n, tg) || 1; n.vx += ((tg.x - n.x) / d * 55 - n.vx) * Math.min(1, dt); n.vy += ((tg.y - n.y) / d * 55 - n.vy) * Math.min(1, dt); n.ang = Math.atan2(tg.y - n.y, tg.x - n.x); }
    n.x += n.vx * dt; n.y += n.vy * dt;
    if (tg && dist(n, tg) < 750 && (n.shT -= dt) <= 0) {
      const rage = n.hp < n.hpMax * 0.5; n.shT = rage ? 2.2 : 2.8;
      const cnt = rage ? 18 : 10, base = rage ? 0 : n.ang - 0.6, span = rage ? 6.28 : 1.2;
      for (let k = 0; k < cnt; k++) spawnProj(5, -1, n.x, n.y, base + span * k / cnt, 300, 3, 9);
    }
    return;
  }
  const sc = n.type === 0;
  const tgt = sc ? nearest(G.ships.filter(s => s.alive), n, 380) : null;
  if (tgt) { n.gx = tgt.x; n.gy = tgt.y; }
  else if (Math.hypot(n.gx - n.x, n.gy - n.y) < 40 || Math.random() < 0.003) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * G.z * 0.8; n.gx = Math.cos(a) * r; n.gy = Math.sin(a) * r; }
  if (Math.hypot(n.x, n.y) > G.z * 0.95) { n.gx = 0; n.gy = 0; }
  let dx = n.gx - n.x, dy = n.gy - n.y; const d = Math.hypot(dx, dy) || 1;
  if (tgt && d < 200) { dx = -dx; dy = -dy; }
  const sp = sc ? (tgt ? 150 : 90) : 45, k = Math.min(1, 2 * dt);
  n.vx += (dx / d * sp - n.vx) * k; n.vy += (dy / d * sp - n.vy) * k;
  const [gx, gy] = gravAt(G.wells, n.x, n.y); n.vx += gx * dt * 0.5; n.vy += gy * dt * 0.5;
  n.x += n.vx * dt; n.y += n.vy * dt;
  for (const w of G.wells) if (w.type !== 1 && Math.hypot(n.x - w.x, n.y - w.y) < w.r) { n.dead = true; return; }
  n.ang = tgt ? Math.atan2(tgt.y - n.y, tgt.x - n.x) : (Math.hypot(n.vx, n.vy) > 5 ? Math.atan2(n.vy, n.vx) : n.ang);
  if (tgt && (n.shT -= dt) <= 0) { n.shT = 1.3; spawnProj(5, -1, n.x, n.y, n.ang + rnd(-0.12, 0.12), 380, 1.3, 5); }
}

// ---- random world events (a director picks one every 30-50 s; some warn a few seconds ahead)
const EVENTS = [['meteor', 30, 2], ['surge', 50, 1.4], ['ion', 60, 1.4], ['flare', 70, 1.4], ['raid', 45, 2], ['rogue', 70, 1], ['convoy', 40, 2], ['rush', 35, 1.5], ['comet', 25, 1]];
function spawnRaider(x, y, guard) {
  G.neut.push({ id: G.nid++, type: 8, cls: 0, x, y, vx: 0, vy: 0, ang: rnd(0, 6.28), hp: 90, hpMax: 90, gx: x, gy: y, shT: rnd(0, 1), rad: 13, by: -1, ow: -1, res: 0, guard });
}
function spawnDread() {
  const n = spawnNeut(9, 0); if (!n) { G.dread = false; return; }
  G.drops.push({ x: n.x, y: n.y, t: 30 }); logMsg('☠ A PIRATE DREADNOUGHT has entered the arena — destroy it for a relic!');
}
function spawnComet() { const a = rnd(0, 6.28), sx = Math.cos(a) * R0 * 1.1, sy = Math.sin(a) * R0 * 1.1, tx = rnd(-0.4, 0.4) * G.z, ty = rnd(-0.4, 0.4) * G.z; spawnProj(6, -1, sx, sy, Math.atan2(ty - sy, tx - sx), 240, 26, 80); }
function pickEvent() {
  const ok = EVENTS.filter(([k, t]) => G.t >= t * G.lenF && k !== G.lastEv && !(k === 'rogue' && G.rogue) && !(k === 'raid' && G.neut.filter(n => n.type === 8).length > 8) && !(k === 'convoy' && G.neut.filter(n => n.type === 5).length >= 3) && !(k === 'flare' && G.flare > 0));
  if (!ok.length) return;
  let r = Math.random() * ok.reduce((a, e) => a + e[2], 0), k = ok[0][0];
  for (const e of ok) { if ((r -= e[2]) <= 0) { k = e[0]; break; } }
  G.lastEv = k;
  const warn = { meteor: '☄ Meteor shower incoming!', surge: '🌀 Gravity surge incoming — fight the pull!', ion: '⚡ Ion storm approaching!' }[k];
  if (warn) { logMsg(warn); G.evQ.push({ k, t: 3 }); } else runEvent(k);
}
function runEvent(k) {
  if (k === 'meteor') G.shower = 12;
  else if (k === 'surge') G.surge = 12;
  else if (k === 'ion') { const a = rnd(0, 6.28), z = G.z * 0.85; G.ion = { x: Math.cos(a) * z, y: Math.sin(a) * z, vx: -Math.cos(a) * 85, vy: -Math.sin(a) * 85, r: 440, life: 30 }; }
  else if (k === 'flare') { G.flare = 5; logMsg('☀ SOLAR FLARE in 5 s — hide inside a nebula or behind a big rock!'); }
  else if (k === 'raid') {
    const a = rnd(0, 6.28), n = 4 + Math.min(4, Math.floor(G.t / (100 * G.lenF))), z = G.z * 0.95;
    for (let i = 0; i < n; i++) spawnRaider(Math.cos(a) * z + rnd(-120, 120), Math.sin(a) * z + rnd(-120, 120));
    logMsg('⚠ Pirate raid! ' + n + ' raiders are hunting in the ' + (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 'east' : 'west') : (Math.sin(a) > 0 ? 'south' : 'north')));
  }
  else if (k === 'rogue') {
    const a = rnd(0, 6.28), R = R0 * 1.25, x = Math.cos(a) * R, y = Math.sin(a) * R, ta = Math.atan2(rnd(-0.4, 0.4) * R0 - y, rnd(-0.4, 0.4) * R0 - x);
    G.wells.push({ type: 0, x, y, r: 70, gr: 320, g: 300, vx: Math.cos(ta) * 120, vy: Math.sin(ta) * 120 }); G.rogue = 1; logMsg('🪐 A rogue planet is crossing the arena!');
  }
  else if (k === 'convoy') {
    const n = spawnNeut(5, 700, [1, 3, 4, 2][Math.floor(Math.random() * 4)]); if (!n) return;
    n.conv = 1; for (let i = 0; i < 3 + (G.t > 200 * G.lenF ? 1 : 0); i++) spawnRaider(n.x + rnd(-160, 160), n.y + rnd(-160, 160), { x: n.x, y: n.y });
    G.drops.push({ x: n.x, y: n.y, t: 40 }); logMsg(`🚨 A convoy ${ECLS[n.cls].n} is under attack! Beat the raiders, then save it!`);
  }
  else if (k === 'rush') {
    let p = null; for (let i = 0; i < 3; i++) p = richCluster() || p;
    if (p) { G.drops.push({ x: p.x, y: p.y, t: 35 }); logMsg('💎 Mining rush — rich asteroid fields detected!'); }
  }
  else if (k === 'comet') { for (let i = 0; i < 3; i++) spawnComet(); logMsg('☄ A comet swarm is crossing the arena!'); }
}
function solarFlare() {
  ev('V', 0, 0, 0); let hit = 0;
  for (const s of G.ships) {
    if (!s.alive) continue;
    if (G.nebs.some(n => dist(n, s) < n.r) || G.ast.some(a => a.big && dist(a, s) < a.r + 90)) { ev('s', s.x, s.y, 0); continue; }
    s.sh = 0; s.lastHit = G.t; s.emp = Math.max(s.emp, 0.8); hurt(s, 90, -1, s.x, s.y); hit++;
  }
  logMsg(hit ? `☀ The solar flare scorched ${hit} ship${hit > 1 ? 's' : ''}!` : '☀ Everyone found cover from the solar flare');
}
function stepOnce(dt) {
  G.t += dt; STT = G.t; G.z = G.cond === 'last' ? zoneR(G.t) : G.cond === 'score' ? zoneRS(G.t) : R0;
  if (G.bh) { G.bh.x = G.bhs * Math.sin(G.t * 0.04) * R0 * 0.25; G.bh.y = Math.cos(G.t * 0.06) * R0 * 0.3; }
  for (const w of G.wells) if (w.life != null && w.o != null && w.g > 0) for (const sh of G.ships) if (sh.alive && teamOf(sh.i) !== teamOf(w.o) && Math.hypot(sh.x - w.x, sh.y - w.y) < w.gr * 0.55) sh.slow = Math.max(sh.slow || 0, 0.4);
  for (const w of G.wells) if (w.vx != null) { w.x += w.vx * dt; w.y += w.vy * dt; if (Math.hypot(w.x, w.y) < R0 * 1.1) w.in = 1; }
  G.wells = G.wells.filter(w => { if (w.vx != null && w.in && Math.hypot(w.x, w.y) > R0 * 1.3) { G.rogue = 0; return false; } if (w.life == null) return true; if ((w.life -= dt) > 0) return true; if (w.o != null) collapseWell(w); return false; });
  for (const s of G.ships) {
    if (!s.alive) { if (G.cond !== 'last' && (s.respT -= dt) <= 0) respawn(s); continue; }
    s.inv = Math.max(0, s.inv - dt);
    if (G.players[s.i].bot) botControl(s, dt); else if (G.t - s.inT > 1.5) { s.in.s0 = s.in.s1 = s.in.s2 = 0; }
    updateShip(s, dt);
  }
  for (let i = 0; i < G.ships.length; i++) for (let j = i + 1; j < G.ships.length; j++) {
    const a = G.ships[i], b = G.ships[j];
    if (!a.alive || !b.alive) continue;
    const d = Math.hypot(b.x - a.x, b.y - a.y), mn = a.rad + b.rad;
    if (d < mn && d > 0) {
      const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d, ov = (mn - d) / 2;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel > 0) { a.vx -= rel * nx * 0.9; a.vy -= rel * ny * 0.9; b.vx += rel * nx * 0.9; b.vy += rel * ny * 0.9; }
    }
  }
  for (const n of G.neut) updateNeut(n, dt);
  for (const a of G.ast) if (a.vx !== undefined) {   // drifting debris bounces off the storm edge
    a.x += a.vx * dt; a.y += a.vy * dt; const d = Math.hypot(a.x, a.y);
    if (d > G.z * 0.88 && d > 0) { const nx = a.x / d, ny = a.y / d, dp = a.vx * nx + a.vy * ny; if (dp > 0) { a.vx -= 2 * dp * nx; a.vy -= 2 * dp * ny; } }
  }
  for (let i = G.proj.length - 1; i >= 0; i--) {
    const p = G.proj[i]; stepProj(p, dt);
    if (projHit(p)) G.proj.splice(i, 1);
    else if (p.life <= 0 || Math.hypot(p.x, p.y) > R0 * 1.25) { if (p.k === 4) boom(p); G.proj.splice(i, 1); }
  }
  // mine fields: every mine is armed after 1 s and detonates on the first enemy (or hostile neutral) that touches it
  for (let i = G.mines.length - 1; i >= 0; i--) {
    const m = G.mines[i], [gx, gy] = gravAt(G.wells, m.x, m.y);
    m.vx = (m.vx + gx * dt) * 0.98; m.vy = (m.vy + gy * dt) * 0.98; m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt; m.arm -= dt;
    if (m.life <= 0 || !m.ms.length) { G.mines.splice(i, 1); continue; }
    if (m.arm > 0) continue;
    const ot = teamOf(m.o);
    for (let k = m.ms.length - 1; k >= 0; k--) {
      const mx = m.x + m.ms[k][0], my = m.y + m.ms[k][1];
      if (G.ships.some(sh => sh.alive && teamOf(sh.i) !== ot && Math.hypot(sh.x - mx, sh.y - my) < 42 + sh.rad) || G.neut.some(n => !n.dead && HN(n) && Math.hypot(n.x - mx, n.y - my) < 36 + n.rad)) { explode(mx, my, 80, m.dmg, m.o, m.emp ? 'emp' : true); m.ms.splice(k, 1); }
    }
  }
  // pickups
  for (let i = G.pick.length - 1; i >= 0; i--) {
    const c = G.pick[i]; c.life -= dt;
    const [gx, gy] = gravAt(G.wells, c.x, c.y); c.vx += gx * dt; c.vy += gy * dt;
    const [qx2, qy2] = streamAt(G.streams, c.x, c.y); c.vx += qx2 * dt * 0.4; c.vy += qy2 * dt * 0.4;
    c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.96; c.vy *= 0.96;
    let taken = false;
    for (const s of G.ships) {
      if (!s.alive) continue;
      const d = Math.hypot(s.x - c.x, s.y - c.y);
      if (d < 130) { c.x += (s.x - c.x) / d * 380 * dt; c.y += (s.y - c.y) / d * 380 * dt; }
      if (d < s.rad + 12) {
        taken = true; ev('p', c.x, c.y);
        if (c.t === 0) addScrap(s, c.v); else if (c.t === 2) { s.pending++; if (!s.offers.length) makeOffers(s); logMsg(G.players[s.i].name + ' claimed a relic (+1 upgrade)'); } else { s.hp = Math.min(s.hpMax, s.hp + 100); for (let p = 0; p < NP; p++) if (s.lv[p]) { s.dp[p] = 0; s.ph[p] = 30 + 20 * s.lv[p]; } }
        break;
      }
    }
    if (taken || c.life <= 0 || G.wells.some(w => w.type !== 1 && Math.hypot(c.x - w.x, c.y - w.y) < w.r)) G.pick.splice(i, 1);
  }
  G.neut = G.neut.filter(n => !n.dead); G.ast = G.ast.filter(a => !a.dead);
  // beacons (capture + passive buffs)
  const NF = G.NF, owned = Array(NF).fill(0);
  for (const b of G.bea) {
    const c = Array(NF).fill(0);
    for (const s of G.ships) if (s.alive && Math.hypot(s.x - b.x, s.y - b.y) < b.r + s.rad) c[teamOf(s.i)]++;
    const present = []; c.forEach((n, f) => { if (n) present.push(f); });
    b.cont = present.length > 1 ? 1 : 0;
    if (present.length === 1) {
      const f = present[0], rate = dt * (0.12 + 0.04 * c[f]);
      if (b.owner === f) { b.p = 1; b.cap = f; }
      else if (b.cap === f) { b.p = Math.min(1, b.p + rate); if (b.p >= 1) { b.owner = f; ev('w', b.x, b.y); } }
      else { b.p = Math.max(0, b.p - rate); if (b.p <= 0) b.cap = f; }
    }
    if (b.owner >= 0) {
      owned[b.owner]++;
      for (const s of G.ships) if (s.alive && teamOf(s.i) === b.owner && Math.hypot(s.x - b.x, s.y - b.y) < b.r + s.rad) s.hp = Math.min(s.hpMax, s.hp + 8 * dt);
    }
  }
  for (const s of G.ships) if (s.alive && owned[teamOf(s.i)]) addScrap(s, owned[teamOf(s.i)] * 0.8 * dt);
  if (G.cond === 'score') for (let f = 0; f < NF; f++) G.score[f] += owned[f] * 0.04 * dt;   // each held beacon: 1 point per 25 s
  if (G.cond === 'capture') {   // tug-of-war: each owned beacon steals share from the other factions
    const sh = G.shares;
    for (let f = 0; f < NF; f++) {
      if (!owned[f]) continue;
      const O = 1 - sh[f]; if (O <= 0) continue;
      const a = Math.min(O, dt * 0.004 * owned[f]);
      for (let g = 0; g < NF; g++) if (g !== f) sh[g] -= a * sh[g] / O;
      sh[f] += a;
    }
  }
  // world upkeep + events
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = 1.5;
    if (G.neut.filter(n => n.type === 0).length < 20) spawnNeut(0, 450);
    if (G.neut.filter(n => n.type === 1).length < 5) spawnNeut(1, 450);
    if (G.ast.length < 50) { if (G.layout === 1 && Math.random() < 0.6) ringAst(); else spawnAst(400); }
    if (G.neut.filter(n => n.type === 5).length < 3 && (G.sosT -= 1.5) <= 0) { const n = spawnNeut(5, 500); if (n) { G.sosT = 32 * G.lenF; logMsg(`📡 Distress signal — a stranded ${ECLS[n.cls].n} needs rescue!`); } }
    if (G.t > 60 * G.lenF && G.neut.filter(n => n.type === 4).length < (G.t > 200 * G.lenF ? 2 : 1) && (G.warT -= 1.5) <= 0) { spawnNeut(4, 600); G.warT = 75 * G.lenF; logMsg('⚠ A pirate warship is patrolling the arena!'); }
  }
  if (!G.boss && G.t > G.bossAt) { G.boss = true; spawnNeut(2, 0); logMsg('⚠ A LEVIATHAN has appeared near the centre!'); }
  if (!G.dread && G.t > G.dreadAt) { G.dread = true; spawnDread(); }
  if ((G.evT -= dt) <= 0) { G.evT = rnd(32, 48) * G.lenF; pickEvent(); }
  for (let i = G.evQ.length - 1; i >= 0; i--) if ((G.evQ[i].t -= dt) <= 0) { runEvent(G.evQ[i].k); G.evQ.splice(i, 1); }
  if (G.flare > 0 && (G.flare -= dt) <= 0) solarFlare();
  if (G.surge > 0) G.surge -= dt;
  GMUL = G.surge > 0 ? 2 : 1;
  if (G.ion) { G.ion.x += G.ion.vx * dt; G.ion.y += G.ion.vy * dt; if ((G.ion.life -= dt) <= 0) G.ion = null; }
  if (G.shower > 0) {
    G.shower -= dt; G.showerT -= dt;
    if (G.showerT <= 0) { G.showerT = 0.22; const a = rnd(0, 6.28), tx = rnd(-0.6, 0.6) * G.z, ty = rnd(-0.6, 0.6) * G.z, d = Math.atan2(ty - Math.sin(a) * R0 * 1.1, tx - Math.cos(a) * R0 * 1.1); spawnProj(6, -1, Math.cos(a) * R0 * 1.1, Math.sin(a) * R0 * 1.1, d, 420, 14, 40); }
  }
  for (const s of G.ships) if (s.alive && s.aegis > 0) {   // Aegis Barrier: shots that enter the bubble are destroyed (Mirror Aegis reflects them)
    const A = BRN(s, AEG), rad = A === 2 ? 300 : 120;
    for (let k = G.proj.length - 1; k >= 0; k--) {
      const q = G.proj[k]; if (q.k === 7 || (q.o >= 0 && teamOf(q.o) === teamOf(s.i)) || dist(q, s) > rad) continue;
      if (A === 1 && q.o >= 0 && q.k !== 6) { q.o = s.i; q.vx = -q.vx; q.vy = -q.vy; q.tg = null; ev('s', q.x, q.y, 0); } else { G.proj.splice(k, 1); ev('s', q.x, q.y, 0); }
    }
  }
  for (let i = G.fields.length - 1; i >= 0; i--) {   // Repair Field: heals allies and escorts inside (Toxic Field burns foes instead)
    const f = G.fields[i]; if ((f.life -= dt) <= 0) { G.fields.splice(i, 1); continue; }
    const ft = teamOf(f.o), tick = (f.tk = (f.tk || 0) - dt) <= 0; if (tick) f.tk = 0.5;
    for (const sh of G.ships) {
      if (!sh.alive || dist(sh, f) > f.r + sh.rad) continue;
      if (teamOf(sh.i) === ft && f.k === 0) { sh.hp = Math.min(sh.hpMax, sh.hp + (20 + 6 * f.lvl) * dt); if (f.br === 1) { sh.sh = Math.min(sh.shMax, sh.sh + 14 * dt); sh.emp = Math.max(0, sh.emp - dt * 2); } }
      else if (teamOf(sh.i) !== ft && f.k === 1 && tick) hurt(sh, (14 + 4 * f.lvl) * 0.5, f.o, sh.x, sh.y);
    }
    for (const n of G.neut) {
      if (n.dead || dist(n, f) > f.r + n.rad) continue;
      if (n.type === 6 && G.ships[n.ow] && teamOf(n.ow) === ft && f.k === 0) n.hp = Math.min(n.hpMax, n.hp + (20 + 6 * f.lvl) * dt);
      else if (HN(n) && f.k === 1 && tick) hurtNeut(n, (14 + 4 * f.lvl) * 0.5, n.x, n.y, f.o);
    }
  }
  for (const p of G.pads) for (const sh of G.ships) if (sh.alive && Math.hypot(sh.x - p.x, sh.y - p.y) < p.r + sh.rad) sh.hp = Math.min(sh.hpMax, sh.hp + 22 * dt);
  for (const e of G.relics) if (!e.d && G.t > e.t) { e.d = 1; const p = freeSpot(0, 0.6) || { x: 0, y: 0 }; G.pick.push({ id: G.nid++, t: 2, x: p.x, y: p.y, v: 0, vx: 0, vy: 0, life: 90 }); G.drops.push({ x: p.x, y: p.y, t: 30 }); logMsg('★ A relic appeared — grab it for a free upgrade!'); }
  if ((G.cometT -= dt) <= 0) { G.cometT = 30 * G.lenF; spawnComet(); logMsg('☄ A comet is crossing the arena!'); }
  G.dropT -= dt;
  if (G.dropT <= 0) {
    G.dropT = 30 * G.lenF; const p = freeSpot(0, 0.7) || { x: 300, y: 300 };
    G.pick.push({ id: G.nid++, t: 1, x: p.x, y: p.y, v: 0, vx: 0, vy: 0, life: 60 }); dropOrbs(p.x, p.y, 90, 6);
    G.drops.push({ x: p.x, y: p.y, t: 25 }); logMsg('Supply drop landed — follow the yellow arrow!');
  }
  G.drops = G.drops.filter(d => (d.t -= dt) > 0);
  if (G.cond === 'score') {
    const top = G.score.indexOf(Math.max(...G.score));
    if (G.score[top] >= G.target || G.t >= G.tlim) {
      const tie = G.score.filter(v => Math.floor(v) === Math.floor(G.score[top])).length > 1 && G.score[top] < G.target;
      G.over = true; G.winner = tie ? -1 : top; showOver(G.winner);
    }
  } else if (G.cond === 'capture') {
    const sh = G.shares, top = sh.indexOf(Math.max(...sh));
    if (sh[top] >= 0.97 || G.t > 480 * G.lenF) { G.over = true; G.winner = top; showOver(top); }
  } else {
    const teams = new Set(G.ships.filter(s => s.alive).map(s => teamOf(s.i)));
    if (teams.size <= 1) { G.over = true; G.winner = teams.size ? [...teams][0] : -1; showOver(G.winner); }
  }
}
function hostTick() {
  if (!G) return;
  const now = performance.now(), real = Math.min(0.25, (now - G.last) / 1000); G.last = now;
  const humans = G.ships.some(s => (s.alive || G.cond !== 'last') && !G.players[s.i].bot);
  if (!G.over) G.acc += real * (humans ? 1 : 4);
  for (let n = 0; G.acc >= DT && n < 12; n++) { G.acc -= DT; if (!G.over) stepOnce(DT); if (++G.pubN % 2 === 0) publish(now); }
  if (G.acc > DT * 12) G.acc = 0;
  if (G.over && now - G.lastPub > 300) publish(now);
}
const r0 = Math.round;
const astRow = a => [a.id, r0(a.x), r0(a.y), r0(a.r), r0(a.hp), r0(a.hpMax), a.rich ? 1 : a.deb ? 2 : 0];
const flagsOf = s => (s.cloak > 0 ? 1 : 0) | (s.aegis > 0 ? 2 : 0) | (s.od > 0 ? 4 : 0) | (s.amb > 0 ? 8 : 0);
function publish(now) {
  G.lastPub = now || performance.now();
  pub('state', {
    t: +G.t.toFixed(2), z: r0(G.z), o: G.over ? 1 : 0, w: G.winner, ev: G.evPub.splice(0), lg: G.logPub.splice(0), dr: G.drops.map(d => [r0(d.x), r0(d.y)]),
    s: G.ships.map(s => [s.i, r0(s.x), r0(s.y), r0(s.vx), r0(s.vy), +s.ang.toFixed(2), r0(s.hp), s.hpMax, r0(s.sh), s.shMax, s.alive ? 1 : 0, s.lv.join(''),
      s.dp.reduce((m, v, j) => m | v << j, 0), s.emp > 0 ? 1 : 0, s.boost > 0 ? 1 : 0, s.thr, Math.floor(s.scrap), s.level, s.pending, s.offers,
      s.sk.map(p => (p < 0 ? 0 : r0(s.cd[p] * 10))), s.sk, s.kills, r0(s.respT * 10), s.slow > 0 ? 1 : 0, s.br.join(''), flagsOf(s), s.streak]),
    sh: G.shares.map(v => r0(v * 1000)),
    n: G.neut.map(n => [n.id, n.type, r0(n.x), r0(n.y), +n.ang.toFixed(2), r0(n.hp), r0(n.hpMax), n.rad, n.ow, r0((n.res || 0) * 100), n.cls || 0, n.conv ? 1 : 0]),
    a: (G.pubK = (G.pubK || 0) + 1) % 8 === 1 ? G.ast.filter(a => a.vx === undefined).map(astRow) : undefined,   // static rocks: only ~2x per second
    ad: G.ast.filter(a => a.vx !== undefined).map(astRow),   // drifting debris: every snapshot
    p: G.proj.map(p => [p.k, p.o, r0(p.x), r0(p.y), r0(p.vx), r0(p.vy)]),
    k: G.pick.map(c => [c.t, r0(c.x), r0(c.y)]),
    m: G.mines.map(m => [r0(m.x), r0(m.y), teamOf(m.o), m.r, +m.life.toFixed(1), m.arm > 0 ? 1 : 0, m.ms.map(q => [r0(q[0]), r0(q[1])])]),
    wl: G.wells.map(w => [w.type, r0(w.x), r0(w.y), w.r, w.gr, w.g, w.life != null ? +w.life.toFixed(1) : 0, w.o == null ? -1 : w.o, w.lvl || 0]), pt: G.portals.map(p => [r0(p.x), r0(p.y)]),
    b: G.bea.map(b => [r0(b.x), r0(b.y), r0(b.p * 100), b.owner, b.cont, b.cap]), pd: G.pads.map(p => [r0(p.x), r0(p.y)]),
    nb: G.nebs.map(n => [r0(n.x), r0(n.y), n.r]), sm: G.streams.map(m => [r0(m.x1), r0(m.y1), r0(m.x2), r0(m.y2), m.w, r0(m.cx), r0(m.cy), +m.str.toFixed(2), +m.ph.toFixed(2)]),
    io: G.ion ? [r0(G.ion.x), r0(G.ion.y), G.ion.r] : 0, gs: +Math.max(0, G.surge).toFixed(1), ly: G.layout,
    sc: G.score.map(v => +v.toFixed(1)), tg: G.target, tl: r0(Math.max(0, G.tlim - G.t)), hz: G.haz.map(h => [r0(h.x), r0(h.y), r0(h.r), h.k]),
    fd: G.fields.map(f => [r0(f.x), r0(f.y), r0(f.r), f.k, teamOf(f.o), +(f.life / f.max).toFixed(2)]), fl: +Math.max(0, G.flare).toFixed(1),
  });
}
function hostCmd(m) {
  if (!G || S.mode !== 'game') return;
  const s = G.ships.find(o => G.players[o.i].id === m.id);
  if (!s) return;
  if (m.pick != null) return choose(s, m.pick | 0);
  const n = v => (Number.isFinite(+v) ? +v : 0);
  Object.assign(s.in, { mx: clamp(n(m.mx), -1, 1), my: clamp(n(m.my), -1, 1), tg: typeof m.tg === 'string' ? m.tg.slice(0, 8) : '', s0: m.s0 ? 1 : 0, s1: m.s1 ? 1 : 0, s2: m.s2 ? 1 : 0,
    sa: Array.isArray(m.sa) ? [0, 1, 2].map(j => (Array.isArray(m.sa[j]) && Number.isFinite(+m.sa[j][0]) ? [+m.sa[j][0], clamp(+m.sa[j][1] || 0, 0, 1)] : 0)) : [0, 0, 0] });
  s.inT = G.t;
}

// ================================================================ bots
function botControl(s, dt) {
  const d = DIFF[G.diff], ai = s.ai, I = s.in, team = teamOf(s.i);
  if (s.pending > 0 && s.offers.length) {
    let k = Math.floor(Math.random() * s.offers.length);
    const bi = s.offers.findIndex(o => o >= 100);
    if (bi >= 0 && G.diff !== 'easy') k = bi + (Math.random() < 0.5 ? 0 : 1) % s.offers.filter(o => o >= 100).length;
    else if (G.diff !== 'easy') { const idx = PRIO[G.diff].map(p => s.offers.indexOf(p)).filter(i => i >= 0)[0]; k = idx != null ? idx : 0; }
    choose(s, k);
  }
  ai.t -= dt;
  if (ai.t <= 0) {
    ai.t = d.react * rnd(0.7, 1.3);
    if (--ai.strT <= 0) { ai.strafe = -ai.strafe; ai.strT = Math.floor(rnd(8, 16)); }
    ai.tgt = null; ai.mode = 'roam';
    const foe = nearest(enemyShips(s), s), fd = foe ? dist(foe, s) : 1e9;
    const rep = s.hp < s.hpMax * 0.4 ? nearest(G.pick.filter(c => c.t === 1), s, 1500) : null;
    const orb = nearest(G.pick.filter(c => c.t === 0), s, 700);
    const boss = G.neut.find(n => n.type === 2);
    const beas = G.bea.filter(b => b.owner !== team).sort((a, b) => dist(a, s) - dist(b, s));
    const nb = nearest(G.neut.filter(n => n.type < 2), s, 900) || nearest(G.ast, s, 500);
    const sos = nearest(G.neut.filter(n => n.type === 5), s, 1400);
    const hire = G.diff !== 'easy' && fleetN(s.i) < fleetCap(s) ? nearest(G.neut.filter(n => n.type === 7 && s.scrap >= ECLS[n.cls || 0].cost + 20), s, 2200) : null;
    if (Math.hypot(s.x, s.y) > G.z - 150) ai.mode = 'zone';
    else if (rep) { ai.mode = 'pick'; ai.goal = rep; }
    else if (foe && fd < 650 && s.hp > s.hpMax * 0.35 && (s.level >= (G.diff === 'hard' ? 2 : 3) || G.t > 120)) { ai.mode = 'fight'; ai.tgt = foe; }
    else if (boss && s.level >= 4 && dist(boss, s) < 1000 && s.hp > s.hpMax * 0.6) { ai.mode = 'fight'; ai.tgt = boss; }
    else if (orb) { ai.mode = 'pick'; ai.goal = orb; }
    else if ((G.cond === 'capture' || G.t > 40) && beas.length && (s.i + ai.seed) % (G.cond === 'capture' ? 4 : 3) !== 0) { ai.mode = 'beacon'; ai.goal = beas[Math.min(ai.seed, beas.length - 1)]; }
    else if (hire) { ai.mode = 'hold'; ai.goal = hire; }
    else if (sos) { ai.mode = 'hold'; ai.goal = sos; }
    else if (nb) { ai.mode = 'farm'; ai.tgt = nb; }
    else if (!ai.goal || ai.goal.life != null || dist(ai.goal, s) < 80) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * G.z * 0.7; ai.goal = { x: Math.cos(a) * r, y: Math.sin(a) * r }; }
    I.tg = ai.tgt ? idStr(ai.tgt) : '';
  }
  let tx = 0, ty = 0, dd = 1e9;
  const tg = isLive(ai.tgt) ? ai.tgt : null;
  if (ai.mode === 'zone') { tx = -s.x; ty = -s.y; }
  else if (tg && (ai.mode === 'fight' || ai.mode === 'farm')) {
    const dx = tg.x - s.x, dy = tg.y - s.y; dd = Math.hypot(dx, dy) || 1;
    const want = ai.mode === 'fight' ? (tg.type === 2 ? 480 : 300) : 240, rad = dd > want + 60 ? 1 : dd < want - 80 ? -1 : 0, st = ai.mode === 'fight' ? 0.9 : 0.25;
    tx = dx / dd * rad - dy / dd * ai.strafe * st; ty = dy / dd * rad + dx / dd * ai.strafe * st;
  } else if (ai.goal) { const gd = dist(ai.goal, s); if (ai.mode === 'hold' && gd < 60) { tx = ty = 0; } else if (ai.mode === 'beacon' && gd < 90) { tx = -(s.y - ai.goal.y) * 0.01; ty = (s.x - ai.goal.x) * 0.01; } else { tx = ai.goal.x - s.x; ty = ai.goal.y - s.y; } }
  let tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
  for (const w of G.wells) {   // steer away from wells
    const wd = dist(w, s) || 1, rr = w.type ? w.gr * 0.85 : w.r + 130;
    if (wd < rr) { const k = (1 - wd / rr) * (w.type ? 0.6 : 1.5); tx += (s.x - w.x) / wd * k; ty += (s.y - w.y) / wd * k; }
  }
  for (const h of G.haz) { const hd = dist(h, s) || 1; if (hd < h.r + 120) { const k = 1.4 * (1 - hd / (h.r + 120)) + 0.3; tx += (s.x - h.x) / hd * k; ty += (s.y - h.y) / hd * k; } }   // stay out of radiation clouds
  if (G.flare > 0 && ai.mode !== 'hold') { const sh = nearest(G.nebs, s); if (sh) { tx = sh.x - s.x; ty = sh.y - s.y; tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; } }   // run for cover
  tl = Math.hypot(tx, ty) || 1;
  I.mx = tl > 1e-6 && (tx || ty) ? tx / tl * d.spd : 0; I.my = tl > 1e-6 && (tx || ty) ? ty / tl * d.spd : 0;
  const fight = ai.mode === 'fight', flee = s.hp < s.hpMax * 0.35 && dist(nearest(enemyShips(s), s) || { x: 1e9, y: 1e9 }, s) < 450;
  for (let j = 0; j < 3; j++) {
    const p = s.sk[j]; let on = 0; const ad = tg ? Math.abs(angDiff(s.ang, Math.atan2(tg.y - s.y, tg.x - s.x))) : 9;
    if (p === MIS) on = fight && dd < 700; else if (p === TOR) on = fight && dd < 480; else if (p === DRN) on = fight && dd < 650;
    else if (p === MIN) on = flee || (fight && dd < 320); else if (p === DSH) on = flee || (d.lead >= 1 && fight && dd > 450 && Math.random() < 0.02);
    else if (p === RAIL) on = fight && dd < 1000 && ad < 0.15; else if (p === GRV) on = fight && dd < 600 && dd > 200; else if (p === PUL) on = fight && dd < 230;
    else if (p === CLK) on = flee || (fight && dd > 450 && dd < 900 && Math.random() < 0.03); else if (p === OD) on = fight && dd < 520; else if (p === AEG) on = G.proj.some(q => q.o !== s.i && (q.o < 0 || teamOf(q.o) !== team) && q.k !== 7 && dist(q, s) < 280);
    else if (p === NAN) on = s.hp < s.hpMax * 0.6 && G.t - s.lastHit < 6; else if (p === ARC) on = fight && dd < 520; else if (p === FLT) on = fight && dd < 800;
    I['s' + j] = on ? 1 : 0;
  }
}

// ================================================================ client: snapshots, interpolation, prediction
function decode(w, at) {
  return {
    at, t: w.t, z: w.z, over: !!w.o, winner: w.w, ev: w.ev, lg: w.lg, drops: w.dr.map(([x, y]) => ({ x, y })),
    ships: w.s.map(a => ({ i: a[0], x: a[1], y: a[2], vx: a[3], vy: a[4], ang: a[5], hp: a[6], hpMax: a[7], sh: a[8], shMax: a[9], alive: !!a[10],
      lv: a[11].split('').map(Number), dp: [...Array(NP).keys()].map(j => (a[12] >> j) & 1), emp: a[13], boost: a[14], thr: a[15], scrap: a[16], level: a[17],
      pending: a[18], offers: a[19], cd: a[20].map(v => v / 10), sk: a[21], kills: a[22], rs: (a[23] || 0) / 10, slow: a[24] || 0,
      br: (a[25] || '').split('').map(Number), fl: a[26] | 0, cloak: a[26] & 1, aegis: a[26] & 2, od: a[26] & 4, amb: a[26] & 8, streak: a[27] | 0 })),
    shares: w.sh.map(v => v / 1000),
    neut: w.n.map(a => ({ id: a[0], type: a[1], x: a[2], y: a[3], ang: a[4], hp: a[5], hpMax: a[6], rad: a[7], ow: a[8] == null ? -1 : a[8], res: Math.max(0, (a[9] || 0) / 100), cls: a[10] || 0, conv: a[11] || 0 })),
    ast: (w.a || (C && C.sa) || []).concat(w.ad || []).map(a => ({ id: a[0], x: a[1], y: a[2], r: a[3], hp: a[4], hpMax: a[5], k: a[6] || 0 })),
    proj: w.p.map(a => ({ k: a[0], o: a[1], x: a[2], y: a[3], vx: a[4], vy: a[5] })),
    pick: w.k.map(a => ({ t: a[0], x: a[1], y: a[2] })), mines: w.m.map(a => ({ x: a[0], y: a[1], fac: a[2], r: a[3], life: a[4], arm: a[5], ms: a[6] || [] })),
    wells: w.wl.map(a => ({ type: a[0], x: a[1], y: a[2], r: a[3], gr: a[4], g: a[5], life: a[6] || 0, o: a[7] == null ? -1 : a[7], lvl: a[8] || 0 })), portals: w.pt.map(a => ({ x: a[0], y: a[1] })),
    bea: w.b.map(a => ({ x: a[0], y: a[1], p: a[2] / 100, owner: a[3], cont: a[4], cap: a[5], r: 150 })),
    nebs: w.nb.map(a => ({ x: a[0], y: a[1], r: a[2] })), streams: w.sm.map(a => buildStream({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], w: a[4], cx: a[5], cy: a[6], str: a[7], ph: a[8] })),
    ion: w.io ? { x: w.io[0], y: w.io[1], r: w.io[2] } : null, surge: w.gs, layout: w.ly, pads: w.pd.map(a => ({ x: a[0], y: a[1], r: 110 })),
    score: w.sc || [], target: w.tg || 0, tleft: w.tl || 0, haz: (w.hz || []).map(a => ({ x: a[0], y: a[1], r: a[2], k: a[3] })), fields: (w.fd || []).map(a => ({ x: a[0], y: a[1], r: a[2], k: a[3], fac: a[4], f: a[5] })), flare: w.fl || 0,
  };
}
function onState(m) {
  if (S.host || S.mode !== 'game' || !m || !C) return;
  if (m.a) C.sa = m.a;
  const snap = decode(m, performance.now());
  C.snaps.push(snap); if (C.snaps.length > 8) C.snaps.shift();
  C.last = snap; STT = snap.t; GMUL = snap.surge > 0 ? 2 : 1; processEvents(snap.ev); snap.lg.forEach(addLog);
  if (snap.over && !C.over) { C.over = true; showOver(snap.winner); }
}
function buildView(now) {
  const sn = C.snaps, L = C.last; if (!L) return null;
  const rt = now - 90; let a = null, b = null;
  for (let i = sn.length - 1; i >= 0; i--) if (sn[i].at <= rt) { a = sn[i]; b = sn[i + 1] || null; break; }
  if (!a) a = sn[0];
  let ships, neut;
  if (b) {
    const f = clamp((rt - a.at) / (b.at - a.at), 0, 1);
    ships = b.ships.map((sb, k) => { const sa = a.ships[k]; return { ...sb, x: sa.x + (sb.x - sa.x) * f, y: sa.y + (sb.y - sa.y) * f, ang: sa.ang + angDiff(sa.ang, sb.ang) * f }; });
    const am = new Map(a.neut.map(n => [n.id, n]));
    neut = b.neut.map(nb => { const na = am.get(nb.id); return na ? { ...nb, x: na.x + (nb.x - na.x) * f, y: na.y + (nb.y - na.y) * f, ang: na.ang + angDiff(na.ang, nb.ang) * f } : nb; });
  } else { ships = a.ships.map(s => ({ ...s })); neut = a.neut; }
  const dt = clamp((now - L.at) / 1000, 0, 0.2), me = ships[C.me];
  if (me && C.pred && me.alive) { me.x = C.pred.x; me.y = C.pred.y; me.ang = C.pred.ang; me.vx = C.pred.vx; me.vy = C.pred.vy; }
  return { ...L, ships, neut, proj: L.proj.map(p => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt })) };
}
function lockedFrom(L, str) {
  if (!str) return null;
  const id = +str.slice(1), k = str[0], o = k === 's' ? L.ships[id] : k === 'n' ? L.neut.find(n => n.id === id) : k === 'a' ? L.ast.find(a => a.id === id) : null;
  return o && o.alive !== false ? o : null;
}
function predict(dt, inp) {
  const L = C.last; if (!L) return;
  const ms = L.ships[C.me]; if (!ms || !ms.alive) { C.pred = null; return; }
  if (!C.pred) C.pred = { x: ms.x, y: ms.y, vx: ms.vx, vy: ms.vy, ang: ms.ang };
  const P = C.pred, st = stats(ms);
  let mx = ms.emp ? 0 : inp.mx, my = ms.emp ? 0 : inp.my; const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  const [gx, gy] = gravAt(L.wells, P.x, P.y, PL[C.me] ? PL[C.me].fac : null);
  const [qx, qy, inSt] = streamAt(L.streams, P.x, P.y), inNeb = L.nebs.some(n => Math.hypot(P.x - n.x, P.y - n.y) < n.r);
  const sf = ms.slow ? 0.6 : 1; P.vx += (mx * st.acc * sf + gx + qx) * dt; P.vy += (my * st.acc * sf + gy + qy) * dt;
  const kd = Math.exp(-DRAG * dt); P.vx *= kd; P.vy *= kd;
  const vm = st.vmax * (ms.boost ? 2.2 : 1) * (inNeb ? 0.65 : 1) * (1 + 0.35 * inSt) * (ms.slow ? 0.55 : 1), sp = Math.hypot(P.vx, P.vy);
  if (sp > vm) { P.vx *= vm / sp; P.vy *= vm / sp; }
  const T = lockedFrom(L, myTg), fa = T ? Math.atan2(T.y - P.y, T.x - P.x) : (ml > 0.05 ? Math.atan2(my, mx) : null);
  if (fa != null) P.ang += clamp(angDiff(P.ang, fa), -st.turn * dt, st.turn * dt);
  P.x += P.vx * dt; P.y += P.vy * dt;
  const age = (performance.now() - L.at) / 1000 + 0.07, tx = ms.x + ms.vx * age, ty = ms.y + ms.vy * age;
  if (Math.hypot(tx - P.x, ty - P.y) > 220) { P.x = tx; P.y = ty; P.vx = ms.vx; P.vy = ms.vy; }
  else { const k = Math.min(1, 5 * dt); P.x += (tx - P.x) * k; P.y += (ty - P.y) * k; P.vx += (ms.vx - P.vx) * Math.min(1, 3 * dt); P.vy += (ms.vy - P.vy) * Math.min(1, 3 * dt); }
}

// ================================================================ input (touch joystick + skills, tap-to-target; keyboard/mouse fallback)
const K = {}, cv = $('cv'), ctx = cv.getContext('2d');
let CW = 1, CH = 1, DPR = 1, JOY = null, myTg = '', LASTM = null, SKP = [0, 0, 0], VIEWNOW = null;
let LOWQ = false, EMA = 0.016, SA = { t: 0, r: 0, b: 0, l: 0 };
function readSafe() { try { const cs = getComputedStyle($('safe')); SA = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 }; } catch (e) {} }
function resize() { DPR = LOWQ ? 1 : Math.min(1.5, devicePixelRatio || 1); CW = innerWidth; CH = innerHeight; cv.width = CW * DPR; cv.height = CH * DPR; readSafe(); }
addEventListener('resize', resize); resize();
function layout() {
  const br = clamp(Math.min(CW, CH) * 0.09, 28, 46), Rr = CW - SA.r, Bb = CH - SA.b;
  const cw = clamp(CW * 0.19, 130, 170), gap = 8, x0 = CW / 2 - (3 * cw + 2 * gap) / 2, y0 = SA.t + 94;
  return { br, btn: [{ x: Rr - br * 1.5, y: Bb - br * 1.5, r: br }, { x: Rr - br * 3.9, y: Bb - br * 1.2, r: br }, { x: Rr - br * 1.3, y: Bb - br * 3.9, r: br }],
    cards: [0, 1, 2].map(j => ({ x: x0 + j * (cw + gap), y: y0, w: cw, h: 58 })), fs: { x: Rr - 44, y: SA.t + 8, w: 34, h: 34 } };
}
function uiHit(x, y) {
  const Lo = layout(), f = Lo.fs;
  if (x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h) return { t: 'fs' };
  for (let j = 0; j < 3; j++) if (Math.hypot(x - Lo.btn[j].x, y - Lo.btn[j].y) < Lo.btn[j].r * 1.15) return { t: 'sk', i: j };
  if (LASTM && LASTM.pending > 0) for (let j = 0; j < LASTM.offers.length; j++) { const c = Lo.cards[j]; if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) return { t: 'card', i: j }; }
  return null;
}
const DEMOZ = +((location.search.match(/[?&]zoom=([0-9.]+)/) || [])[1]) || 1;
const zoomOf = () => Math.min(CW, CH) / (Math.min(CW, CH) < 500 ? 600 : 700) * DEMOZ;
function worldAt(sx, sy) { const Z = zoomOf(); return { x: R.cam.x + (sx - CW / 2) / Z, y: R.cam.y + (sy - CH / 2) / Z }; }
function tapTarget(sx, sy) {
  if (S.mode !== 'game' || !VIEWNOW || !R.cam) return;
  const w = worldAt(sx, sy), V = VIEWNOW, me = S.host ? G.me : C.me, mt = PL[me] ? PL[me].fac : 0, slop = 50 / zoomOf();
  let best = null, bd = 1e9;
  const test = (o, id, r) => { const d = Math.hypot(o.x - w.x, o.y - w.y) - r; if (d < slop && d < bd) { bd = d; best = id; } };
  V.ships.forEach(s => { if (s.alive && PL[s.i].fac !== mt && !(FL(s) & 1)) test(s, 's' + s.i, radOf(s.lv)); });
  V.ast.forEach(a => { if (a.hpMax < 1e5) test(a, 'a' + a.id, a.r); });
  V.neut.forEach(n => { if (n.type === 5 || n.type === 7 || (n.type === 6 && PL[n.ow] && PL[n.ow].fac === mt)) return; test(n, 'n' + n.id, n.rad); });
  myTg = best || '';
}
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (S.mode !== 'game') return;
  const h = uiHit(e.clientX, e.clientY);
  if (h) {
    if (h.t === 'fs') toggleFs();
    else if (h.t === 'sk') {
      if (e.pointerType === 'mouse') SKP[h.i] = performance.now() + 160;   // PC: click/keys fire with auto-aim
      else { const b = layout().btn[h.i]; AIMING = { j: h.i, id: e.pointerId, bx: b.x, by: b.y, x: e.clientX, y: e.clientY, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} }   // touch: tap = auto-aim, drag = aim
    }
    else doPick(h.i);
    return;
  }
  if (e.pointerType !== 'mouse' && !document.fullscreenElement && !document.webkitFullscreenElement) goFullscreen();
  if (!LASTM) { if (COND === 'last') R.spec++; return; }
  if (e.pointerType === 'mouse') { if (e.button === 0) tapTarget(e.clientX, e.clientY); return; }
  if (e.clientX < CW * 0.55 && !JOY) { JOY = { id: e.pointerId, bx: e.clientX, by: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; cv.setPointerCapture(e.pointerId); }
  else tapTarget(e.clientX, e.clientY);
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') CUR = { x: e.clientX, y: e.clientY };
  if (AIMING && AIMING.id === e.pointerId) { AIMING.x = e.clientX; AIMING.y = e.clientY; if (Math.hypot(AIMING.x - AIMING.bx, AIMING.y - AIMING.by) > 18) AIMING.moved = true; return; }
  if (!JOY || JOY.id !== e.pointerId) return;
  JOY.x = e.clientX; JOY.y = e.clientY; JOY.moved = Math.max(JOY.moved, Math.hypot(JOY.x - JOY.bx, JOY.y - JOY.by));
  const dx = JOY.x - JOY.bx, dy = JOY.y - JOY.by, l = Math.hypot(dx, dy);
  if (l > 70) { JOY.bx += dx / l * (l - 70); JOY.by += dy / l * (l - 70); }
});
const endPtr = e => {
  if (AIMING && AIMING.id === e.pointerId) {   // release = fire; dragging aims it (direction + distance), a plain tap uses auto-aim
    const a = AIMING; AIMING = null; const now = performance.now(), l = Math.hypot(a.x - a.bx, a.y - a.by);
    SKP[a.j] = now + 160; AIMV[a.j] = a.moved ? { a: Math.atan2(a.y - a.by, a.x - a.bx), pw: clamp((l - 18) / 110, 0, 1), until: now + 250 } : null;
    return;
  }
  if (JOY && JOY.id === e.pointerId) { if (performance.now() - JOY.t < 250 && JOY.moved < 12) tapTarget(JOY.x, JOY.y); JOY = null; } };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
addEventListener('blur', () => { for (const k in K) K[k] = 0; JOY = null; });
addEventListener('keydown', e => {
  if (S.mode !== 'game') return;
  K[e.code] = 1;
  if (e.code === 'Space') e.preventDefault();
  const k = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code]; if (k != null) doPick(k);
});
addEventListener('keyup', e => { K[e.code] = 0; });
function readInput() {
  let mx = 0, my = 0;
  if (JOY) { const dx = JOY.x - JOY.bx, dy = JOY.y - JOY.by, l = Math.hypot(dx, dy), m = clamp((l - 8) / 50, 0, 1); if (l) { mx = dx / l * m; my = dy / l * m; } }
  mx = clamp(mx + (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0), -1, 1);
  my = clamp(my + (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0), -1, 1);
  const now = performance.now();
  return { mx: +mx.toFixed(2), my: +my.toFixed(2), tg: myTg, s0: K.Space || now < SKP[0] ? 1 : 0, s1: K.KeyQ || now < SKP[1] ? 1 : 0, s2: K.KeyE || now < SKP[2] ? 1 : 0,
    sa: [0, 1, 2].map(j => (AIMV[j] && now < AIMV[j].until ? [+AIMV[j].a.toFixed(3), +AIMV[j].pw.toFixed(2)] : 0)) };
}
function sendInput() { if (S.mode === 'game' && C) pub('cmd', Object.assign({ id: S.id }, readInput())); }
function doPick(k) {
  const now = performance.now(); if (now < R.lock) return; R.lock = now + 250;
  if (window.SFX && LASTM && LASTM.offers && LASTM.offers[k] != null) SFX.play('choose');
  if (S.host) { const s = G.ships[G.me]; if (s) choose(s, k); } else pub('cmd', { id: S.id, pick: k });
}

// ================================================================ rendering (basic MVP graphics)
function addLog(t) { R.log.push({ t, at: performance.now() }); if (R.log.length > 5) R.log.shift(); }
function fx(x, y, vx, vy, life, c, size, ring) { if (R.fx.length < 500) R.fx.push({ x, y, vx, vy, l: life, m: life, c, s: size, ring }); }
function burst(x, y, n, c, sp, life, size) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(sp * 0.3, sp); fx(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(life * 0.5, life), c, size); } }
function nearestShip(x, y, d) {
  const V = VIEWNOW; if (!V) return null;
  let b = null, bd = d;
  for (const s of V.ships) { if (!s.alive) continue; const k = Math.hypot(s.x - x, s.y - y); if (k < bd) { bd = k; b = s; } }
  return b;
}
function processEvents2(list) {
  const myi = S.host ? (G ? G.me : -1) : (C ? C.me : -1);
  try {
    for (const [t, x, y, r] of list) {
      const SX = (n, d) => { if (window.SFX) SFX.at(n, x, y, R.cam, d); };
      if (t === 'f') { FIRE[r] = 1; SX('laser', 750); }
      else if (t === 'F') { FIRE[r] = 1; SX('rail', 1500); }
      else if (t === 'h') { SX('hit', 800); const sh = nearestShip(x, y, 80); if (sh && r >= 8) { HIT[sh.i] = 0.6; if (sh.i === myi) { SHAKE = Math.max(SHAKE, 7); FLASH = Math.min(1, FLASH + 0.45); } } if (!LOWQ && (r >= 8 || Math.random() < 0.25)) Art2.fx.spawn('spark', x, y, {}); }
      else if (t === 's') { SX('shield', 800); const sh = nearestShip(x, y, 110); if (sh) { Art2.shield.hit(sh.i, Math.atan2(y - sh.y, x - sh.x), 1); if (sh.i === myi && r >= 8) SHAKE = Math.max(SHAKE, 3); } }
      else if (t === 'x') { SX(r < 40 ? 'boomS' : r < 120 ? 'boomM' : 'boomL', 1400); Art2.fx.spawn('explosion', x, y, { size: r < 40 ? 'small' : r < 120 ? 'medium' : 'large' }); const mv = VIEWNOW && VIEWNOW.ships[myi]; if (mv && mv.alive) { const d = Math.hypot(mv.x - x, mv.y - y); if (d < 500) SHAKE = Math.max(SHAKE, (r < 40 ? 3 : 9) * (1 - d / 500)); } }
      else if (t === 'k') { SX('shock', 1400); Art2.fx.spawn('shockwave', x, y, { r, col: '#9ff' }); }
      else if (t === 'd') { SX('death', 2000); Art2.fx.spawn('death', x, y, { col: PL[r] ? facC(r) : '#fff' }); const mv = VIEWNOW && VIEWNOW.ships[myi]; if (mv && mv.alive) { const d = Math.hypot(mv.x - x, mv.y - y); if (d < 700) SHAKE = Math.max(SHAKE, 11 * (1 - d / 700)); } }
      else if (t === 'w') { SX('warp', 1000); Art2.fx.spawn('shockwave', x, y, { r: 80, col: '#8ff' }); }
      else if (t === 'p') SX('pickup', 350);
      else if (t === 'l') { const nw = performance.now(), b0 = BEAMS.find(q => q.s === r); if (b0) { b0.tx = x; b0.ty = y; b0.until = nw + 220; } else BEAMS.push({ s: r, x, y, tx: x, ty: y, until: nw + 220 }); }
      else if (t === 'A') { const src = VIEWNOW && VIEWNOW.ships[r]; ZAPS.push({ x1: src ? src.x : x, y1: src ? src.y : y, x2: x, y2: y, until: performance.now() + 320 }); SX('shock', 1400); if (!LOWQ) Art2.fx.spawn('spark', x, y, {}); }
      else if (t === 'V') { WFLASH = 1; SHAKE = Math.max(SHAKE, 8); SX('boomL', 3000); }
      else if (t === 'n') { if (Math.floor(r / 10) === myi) addLog(r % 10 === 1 ? 'Not enough scrap to hire this ship' : 'Fleet full — level up for more slots'); }
      else if (t === 'g') { SX('railCharge', 1200); TELE.push({ x, y, a: r / 100, until: performance.now() + 450 }); }
    }
  } catch (e) { if (!window.__artErr) { window.__artErr = e.message; console.error('Art2 events', e); } }
}
function processEvents(list) {
  if (ART2) return processEvents2(list);
  for (const [t, x, y, r] of list) {
    if (t === 'h') burst(x, y, 3, '#ffb347', 160, 0.35, 2); else if (t === 's') burst(x, y, 3, '#6cf', 140, 0.3, 2);
    else if (t === 'x') { fx(x, y, 0, 0, 0.45, '#ffcf70', r, 1); burst(x, y, 12 + (r >> 2), '#ff8a3d', 260, 0.7, 3); }
    else if (t === 'd') { const c = PL[r] ? facC(r) : '#fff'; fx(x, y, 0, 0, 0.9, c, 140, 1); burst(x, y, 50, c, 420, 1.1, 3); burst(x, y, 24, '#fff', 300, 0.8, 2); }
    else if (t === 'p') burst(x, y, 4, '#ffe066', 120, 0.4, 2); else if (t === 'w') fx(x, y, 0, 0, 0.5, '#8ff', 60, 1);
  }
}
const stars = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random(), z: 0.15 + Math.random() * 0.5 }));
const PO = { k: 1, x: 0, y: 0, vx: 0, vy: 0, col: '#fff' };
const GRID = Array.from({ length: NP }, (_, p) => (p < 7 ? [p - 3, -1] : [p - 10, 1]));
function hullPath(r) { ctx.moveTo(r * 1.3, 0); ctx.lineTo(-r * 0.9, r * 0.8); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r * 0.9, -r * 0.8); ctx.closePath(); }
function drawAimPreview(M, A_) {
  const p = M.sk[A_.j]; if (p < 0) return;
  const a = Math.atan2(A_.y - A_.by, A_.x - A_.bx), pw = clamp((Math.hypot(A_.x - A_.bx, A_.y - A_.by) - 18) / 110, 0, 1), cx = Math.cos(a), cy = Math.sin(a);
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
  const line = len => { ctx.beginPath(); ctx.moveTo(M.x, M.y); ctx.lineTo(M.x + cx * len, M.y + cy * len); ctx.stroke(); };
  const circ = (d, r) => { ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(M.x + cx * d, M.y + cy * d, r, 0, 7); ctx.fill(); ctx.stroke(); };
  if (p === RAIL) line(1300); else if (p === MIS) line(700); else if (p === TOR) line(650); else if (p === DRN) line(500); else if (p === DSH) line(320);
  else if (p === GRV) { line(150 + pw * 550); circ(150 + pw * 550, 120); } else if (p === MIN) { line(80 + pw * 370); circ(80 + pw * 370, 90 + 15 * M.lv[MIN]); }
  ctx.restore();
}
function shipTag(s, r, isMe) {   // plate above a ship: level badge + name (green = ally, red = enemy), segmented hull bar, shield bar, status
  const rl = isMe ? 0 : PL[s.i].fac === myFac() ? 1 : 2, rc = RELC[rl], w = 74, x = s.x, y = s.y - r * 1.9 - 20, col = facC(s.i);
  const hpf = clamp(s.hp / s.hpMax, 0, 1), shf = s.shMax ? clamp(s.sh / s.shMax, 0, 1) : 0, segs = clamp(Math.round(s.hpMax / 100), 5, 14), gap = 1, sw = (w - gap * (segs - 1)) / segs;
  ctx.save(); ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(4,8,14,0.72)'; ctx.fillRect(x - w / 2 - 2, y - 17, w + 4, 17 + 8 + (s.shMax ? 5 : 0));
  ctx.fillStyle = rc; ctx.fillRect(x - w / 2 - 2, y - 17, 2, 17 + 8 + (s.shMax ? 5 : 0));
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - w / 2 + 9, y - 8, 8, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2.5; ctx.strokeText(String(s.level + 1), x - w / 2 + 9, y - 4.5); ctx.fillText(String(s.level + 1), x - w / 2 + 9, y - 4.5);
  ctx.textAlign = 'left'; ctx.font = 'bold 11px system-ui'; ctx.fillStyle = rc; ctx.fillText(PL[s.i].name, x - w / 2 + 21, y - 5, w - 22);
  const bc = hpf > 0.6 ? '#5ee08a' : hpf > 0.3 ? '#ffc04a' : '#ff5a4a';
  for (let i = 0; i < segs; i++) { const f = clamp(hpf * segs - i, 0, 1), bx = x - w / 2 + i * (sw + gap); ctx.fillStyle = 'rgba(120,150,190,0.25)'; ctx.fillRect(bx, y + 1, sw, 6); if (f > 0) { ctx.fillStyle = bc; ctx.fillRect(bx, y + 1, sw * f, 6); } }
  if (s.shMax) { ctx.fillStyle = 'rgba(120,150,190,0.25)'; ctx.fillRect(x - w / 2, y + 9, w, 3); ctx.fillStyle = '#5fd0ff'; ctx.fillRect(x - w / 2, y + 9, w * shf, 3); }
  const st = []; if (s.emp) st.push('⚡'); if (s.slow) st.push('❄'); if (s.streak >= 3) st.push('🔥' + s.streak);
  if (st.length) { ctx.textAlign = 'center'; ctx.font = '10px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(st.join(' '), x, y + (s.shMax ? 23 : 19)); }
  ctx.restore();
}
function drawShip(s, isMe) {
  const fl = FL(s), r0_ = radOf(s.lv), mine = PL[s.i].fac === myFac();
  if ((fl & 1) && !isMe && !mine) {   // enemy under a cloak field: only a faint shimmer
    ctx.save(); ctx.strokeStyle = '#9cf'; ctx.globalAlpha = 0.16 + 0.08 * Math.sin(TT * 5 + s.i); ctx.lineWidth = 2; ctx.setLineDash([4, 8]); ctx.lineDashOffset = -TT * 12; ctx.beginPath(); ctx.arc(s.x, s.y, r0_ * 1.5, 0, 7); ctx.stroke(); ctx.restore(); return;
  }
  { const rc = RELC[isMe ? 0 : mine ? 1 : 2]; ctx.strokeStyle = rc; ctx.fillStyle = rc; ctx.globalAlpha = isMe ? 0.28 : 0.5; ctx.lineWidth = isMe ? 2 : 3; ctx.beginPath(); ctx.arc(s.x, s.y, r0_ * 1.6, 0, 7); ctx.stroke(); ctx.globalAlpha = 0.07; ctx.fill(); ctx.globalAlpha = 1; }
  if (fl & 4) { const g = ctx.createRadialGradient(s.x, s.y, r0_ * 0.5, s.x, s.y, r0_ * 3); g.addColorStop(0, 'rgba(255,120,60,0.35)'); g.addColorStop(1, 'rgba(255,120,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r0_ * 3, 0, 7); ctx.fill(); }
  if (fl & 1) ctx.globalAlpha = 0.45;
  drawShipMain(s, isMe);
  ctx.globalAlpha = 1;
  if (fl & 1) { ctx.strokeStyle = '#9cf'; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.lineDashOffset = -TT * 10; ctx.beginPath(); ctx.arc(s.x, s.y, r0_ * 1.7, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (fl & 2) { const rad = BRN(s, AEG) === 2 ? 300 : 120, g = ctx.createRadialGradient(s.x, s.y, rad * 0.6, s.x, s.y, rad); g.addColorStop(0, 'rgba(120,200,255,0.02)'); g.addColorStop(1, 'rgba(120,200,255,0.22)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, 7); ctx.fill(); ctx.strokeStyle = '#8fd8ff'; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(TT * 8); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  if (fl & 8) { ctx.strokeStyle = '#ffe066'; ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r0_ * 1.4, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawShipMain(s, isMe) {
  if (!ART2) return drawShipOld(s, isMe);
  const i = s.i, a = SHA[i] || (SHA[i] = {}), r = radOf(s.lv);
  FIRE[i] = Math.max(0, (FIRE[i] || 0) - FDT * 6); HIT[i] = Math.max(0, (HIT[i] || 0) - FDT * 3);
  THR[i] = (THR[i] || 0) + ((s.thr ? 1 : 0) - (THR[i] || 0)) * Math.min(1, 8 * FDT);
  if (s.boost && !PB[i]) { try { Art2.fx.spawn('dashTrail', s.x, s.y, { ang: s.ang, col: facC(i) }); } catch (e) {} }
  PB[i] = s.boost;
  a.id = i; a.x = s.x; a.y = s.y; a.ang = s.ang; a.vx = s.vx; a.vy = s.vy; a.lv = s.lv; a.col = facC(i); a.seed = i * 7 + 3; a.thr = THR[i]; a.boost = s.boost ? 1 : 0;
  a.fire = FIRE[i]; a.hit = HIT[i]; a.hpf = clamp(s.hp / s.hpMax, 0, 1); a.shf = s.shMax ? clamp(s.sh / s.shMax, 0, 1) : 0; a.emp = s.emp ? 1 : 0; a.alive = true; a.zoom = FZ;
  try { Art2.ship.draw(ctx, a, TT); if (!LOWQ || isMe) Art2.shield.draw(ctx, a, TT); }
  catch (e) { if (!window.__artErr) { window.__artErr = e.message; console.error('Art2 ship', e); } return drawShipOld(s, isMe); }
  if (s.slow) { ctx.strokeStyle = '#7fe3ff'; ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -TT * 20; ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.35, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (isMe) { ctx.strokeStyle = a.col; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.1, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  shipTag(s, r, isMe);
}
function drawShipOld(s, isMe) {
  const r = radOf(s.lv), col = facC(s.i);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.ang);
  if (s.thr) { const fl = r * (0.7 + Math.random() * 0.5); ctx.fillStyle = s.boost ? '#9cf' : '#ffb347'; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(-r * 0.6 - fl, 0); ctx.lineTo(-r * 0.6, r * 0.3); ctx.fill(); }
  ctx.fillStyle = '#10182b'; ctx.strokeStyle = col; ctx.lineWidth = isMe ? 3.5 : 2.5; ctx.beginPath(); hullPath(r); ctx.fill(); ctx.stroke();
  // modular grid: each of the 10 module slots is a cell on the hull
  const cs = r * 0.2;
  for (let p = 0; p < NP; p++) {
    const [gx, gy] = GRID[p], x = gx * cs * 1.05 + r * 0.1, y = gy * cs * 0.65, l = s.lv[p];
    ctx.fillStyle = l ? (s.dp[p] ? '#5a1d1d' : PCOL[p]) : '#1a2236'; ctx.globalAlpha = l ? 0.4 + 0.2 * l : 0.6; ctx.fillRect(x - cs / 2, y - cs * 0.3, cs * 0.92, cs * 0.6);
  }
  ctx.globalAlpha = 1;
  if (eff(s, LAS)) { ctx.fillStyle = '#ff6b6b'; for (let j = 0; j <= s.lv[LAS]; j++) ctx.fillRect(r * 0.9, (j - s.lv[LAS] / 2) * 5 - 1, r * 0.4, 2.5); }
  ctx.restore();
  if (s.shMax > 0 && s.sh > 0) { ctx.strokeStyle = `rgba(110,200,255,${0.2 + 0.5 * s.sh / s.shMax})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.6, 0, 7); ctx.stroke(); }
  if (s.emp) { ctx.strokeStyle = '#9cf'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(s.x, s.y, r * 1.9, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  const w = 40, y = s.y - r * 1.9 - 10;
  ctx.fillStyle = '#0009'; ctx.fillRect(s.x - w / 2, y, w, 5); ctx.fillStyle = s.hp / s.hpMax > 0.4 ? '#5ee07a' : '#ff5a5a'; ctx.fillRect(s.x - w / 2, y, w * clamp(s.hp / s.hpMax, 0, 1), 5);
  if (s.shMax > 0) { ctx.fillStyle = '#6cf'; ctx.fillRect(s.x - w / 2, y - 4, w * clamp(s.sh / s.shMax, 0, 1), 3); }
  ctx.fillStyle = '#cfd6e6'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(PL[s.i].name, s.x, y - 9);
}
function drawMineField(m) {   // individual spiked mines; dim while arming, then blinking in the owner's colour
  const col = FC(m.fac), fade = clamp(m.life / 2, 0, 1);
  ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = 0.16 * fade; ctx.lineWidth = 2; ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  for (const q of m.ms) {
    const x = m.x + q[0], y = m.y + q[1], blink = m.arm ? 0.25 : 0.55 + 0.45 * Math.sin(TT * 7 + q[0]);
    ctx.globalAlpha = fade; ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a93a8'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let a = 0; a < 6; a++) { ctx.moveTo(x + Math.cos(a * 1.047) * 7, y + Math.sin(a * 1.047) * 7); ctx.lineTo(x + Math.cos(a * 1.047) * 11, y + Math.sin(a * 1.047) * 11); } ctx.stroke();
    ctx.fillStyle = col; ctx.globalAlpha = fade * blink; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); ctx.globalAlpha = fade * blink * 0.4; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawBombTelegraph(w) {   // gravity bomb: slow zone, collapse (stun) zone that flashes red before it pops, and a timer ring
  const col = w.o >= 0 && PL[w.o] ? facC(w.o) : '#ffb870', cr = 170 + 15 * (w.lvl || 1), f = clamp(w.life / 4.5, 0, 1), soon = w.life < 0.9;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.5; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -TT * 30; ctx.beginPath(); ctx.arc(w.x, w.y, w.gr * 0.7, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = soon ? 0.6 + 0.4 * Math.sin(TT * 25) : 0.35; ctx.strokeStyle = soon ? '#ff5a3a' : col; ctx.lineWidth = soon ? 4 : 2; ctx.beginPath(); ctx.arc(w.x, w.y, cr, 0, 7); ctx.stroke();
  ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(w.x, w.y, 48, -Math.PI / 2, -Math.PI / 2 + f * 6.283); ctx.stroke();
  ctx.restore();
}
function drawStreamFlow(st, tt) {
  if (LOWQ) return;   // faint bubbles drifting along a curved current; denser/brighter when it is strong
  const k = streamK(st), len = Math.hypot(st.x2 - st.x1, st.y2 - st.y1) * 1.1, n = Math.floor(len / 34);
  ctx.save(); ctx.fillStyle = 'rgba(170,225,255,1)';
  for (let i = 0; i < n; i++) {
    const h = Math.sin((i + st.x1 * 0.013) * 12.9898) * 43758.5453, r1 = h - Math.floor(h), h2 = Math.sin((i + st.y1 * 0.017) * 78.233) * 12345.678, r2 = h2 - Math.floor(h2);
    const u = (i / n + tt * (90 + 90 * r1) * k / len) % 1, off = (r2 - 0.5) * 2 * st.w * 0.9, a = Math.sin(u * Math.PI), b = bez(st, u), tl = Math.hypot(b[2], b[3]) || 1;
    ctx.globalAlpha = (0.08 + 0.3 * a * (0.4 + r2 * 0.6)) * (0.35 + 0.65 * k); ctx.beginPath(); ctx.arc(b[0] - b[3] / tl * off, b[1] + b[2] / tl * off, 1 + r1 * 2.4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const Z13 = Array(NP).fill(0);
const CLV = ECLS.map((_, c) => { const a = Array(NP).fill(0); a[LAS] = 1; if (c === 1) { a[ARM] = 3; a[SHD] = 1; } else if (c === 2) { a[REP] = 3; } else if (c === 3) { a[MIS] = 3; } else if (c === 4) { a[DRN] = 3; } return a; });
function drawOutpost(n) {   // hire outpost: stand in the ring for 2 s to buy the ship it sells
  const C = ECLS[n.cls || 0];
  ctx.save(); ctx.translate(n.x, n.y);
  ctx.strokeStyle = C.col; ctx.globalAlpha = 0.4; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -TT * 20; ctx.beginPath(); ctx.arc(0, 0, 125, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  if (n.res > 0) { ctx.globalAlpha = 0.95; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 125, -Math.PI / 2, -Math.PI / 2 + n.res * 6.283); ctx.stroke(); ctx.lineCap = 'butt'; }
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(-8, -10, 3, 0, 0, 36); g.addColorStop(0, '#6a738c'); g.addColorStop(1, '#1d2233'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.fill(); ctx.strokeStyle = C.col; ctx.lineWidth = 3; ctx.stroke();
  ctx.rotate(n.ang); ctx.fillStyle = '#2b3347'; for (let i = 0; i < 3; i++) { ctx.rotate(2.094); ctx.fillRect(26, -5, 22, 10); ctx.fillStyle = C.col; ctx.fillRect(44, -5, 4, 10); ctx.fillStyle = '#2b3347'; }
  ctx.rotate(-n.ang); ctx.fillStyle = C.col; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(C.tag, 0, 6);
  ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#ffe9a0'; ctx.fillText('HIRE ' + C.n.toUpperCase(), 0, -48); ctx.fillStyle = '#cfd6e6'; ctx.font = '11px system-ui'; ctx.fillText(C.cost + ' scrap', 0, -34);
  ctx.restore();
}
function drawRaider(n) {
  const a = { id: 400 + n.id, x: n.x, y: n.y, ang: n.ang, vx: 0, vy: 0, lv: CLV[0], col: '#ff4d4d', seed: n.id, thr: 0.7, boost: 0, fire: 0, hit: 0, hpf: n.hp / n.hpMax, shf: 0, emp: 0, alive: true, zoom: FZ };
  let ok = false; if (ART2) ok = A2(() => Art2.ship.draw(ctx, a, TT));
  if (!ok) { ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.ang); ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, 9); ctx.lineTo(-10, -9); ctx.fill(); ctx.restore(); }
  ctx.strokeStyle = '#ff4d4d'; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.x, n.y, 22, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
  if (n.hp < n.hpMax) { ctx.fillStyle = '#0009'; ctx.fillRect(n.x - 15, n.y - 28, 30, 3); ctx.fillStyle = '#ff7a7a'; ctx.fillRect(n.x - 15, n.y - 28, 30 * n.hp / n.hpMax, 3); }
}
function drawShipNeut(n) {   // stranded ship (type 5) and rescued escort (type 6)
  const esc = n.type === 6, col = esc && PL[n.ow] ? facC(n.ow) : '#9aa6b8', C = ECLS[n.cls || 0];
  const a = { id: 200 + n.id, x: n.x, y: n.y, ang: n.ang, vx: 0, vy: 0, lv: CLV[n.cls || 0], col, seed: n.id, thr: esc ? 0.6 : 0, boost: 0, fire: 0, hit: 0, hpf: esc ? n.hp / n.hpMax : 0.35, shf: 0, emp: esc ? 0 : 1, alive: true, zoom: FZ };
  let ok = false; if (ART2) ok = A2(() => Art2.ship.draw(ctx, a, TT));
  if (!ok) { ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.ang); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, 10); ctx.lineTo(-12, -10); ctx.fill(); ctx.restore(); }
  if (esc) { ctx.strokeStyle = PL[n.ow] && PL[n.ow].fac === myFac() ? RELC[1] : RELC[2]; ctx.globalAlpha = 0.65; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(n.x, n.y, 24 + (C.rad - 18) * 0.5, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = C.col; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(C.tag, n.x, n.y - 33); if (n.hp < n.hpMax) { ctx.fillStyle = '#0009'; ctx.fillRect(n.x - 15, n.y - 30, 30, 3); ctx.fillStyle = '#5ee07a'; ctx.fillRect(n.x - 15, n.y - 30, 30 * n.hp / n.hpMax, 3); } return; }
  ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -TT * 18; ctx.beginPath(); ctx.arc(n.x, n.y, 110, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  if (n.res > 0) { ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(n.x, n.y, 110, -Math.PI / 2, -Math.PI / 2 + n.res * 6.283); ctx.stroke(); ctx.lineCap = 'butt'; }
  ctx.fillStyle = '#7fe3ff'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(TT * 5); ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText((n.conv ? 'CONVOY' : 'SOS') + ' · ' + C.n + ' — stay close to rescue', n.x, n.y - 32); ctx.globalAlpha = 1;
}
function drawSentry(n) {
  ctx.save(); ctx.translate(n.x, n.y);
  const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 24); g.addColorStop(0, '#9aa3b8'); g.addColorStop(1, '#232838'); ctx.fillStyle = g;
  ctx.beginPath(); for (let i = 0; i < 8; i++) ctx.lineTo(Math.cos(i * 0.785 + 0.39) * 22, Math.sin(i * 0.785 + 0.39) * 22); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#0a0d18'; ctx.lineWidth = 2; ctx.stroke();
  ctx.rotate(n.ang); ctx.fillStyle = '#3a4258'; ctx.fillRect(4, -9, 26, 6); ctx.fillRect(4, 3, 26, 6); ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
  ctx.restore();
  if (n.hp < n.hpMax) { const w = 34; ctx.fillStyle = '#0009'; ctx.fillRect(n.x - w / 2, n.y - 36, w, 4); ctx.fillStyle = '#ff7a7a'; ctx.fillRect(n.x - w / 2, n.y - 36, w * n.hp / n.hpMax, 4); }
}
function drawRelic(c) {
  ctx.save(); ctx.translate(c.x, c.y);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 42); g.addColorStop(0, 'rgba(255,230,140,.9)'); g.addColorStop(1, 'rgba(255,170,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 42, 0, 7); ctx.fill();
  ctx.rotate(TT); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 16; ctx.lineTo(Math.cos(i * 0.785) * r, Math.sin(i * 0.785) * r); } ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawNeut(n) {
  if (n.type === 3) { drawSentry(n); return; }
  if (n.type === 5 || n.type === 6) { drawShipNeut(n); return; }
  if (n.type === 7) { drawOutpost(n); return; }
  if (n.type === 8) { drawRaider(n); return; }
  if (n.type === 9) {
    const ok = W2.leviathan && A2(() => W2.leviathan(ctx, n, TT));
    if (!ok) { ctx.fillStyle = '#ff3d6e'; ctx.beginPath(); ctx.arc(n.x, n.y, n.rad, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#ff3d3d'; ctx.globalAlpha = 0.5; ctx.lineWidth = 4; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -TT * 20; ctx.beginPath(); ctx.arc(n.x, n.y, n.rad + 24, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff9bb3'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('DREADNOUGHT', n.x, n.y - n.rad - 30);
    ctx.fillStyle = '#0009'; ctx.fillRect(n.x - 50, n.y - n.rad - 22, 100, 6); ctx.fillStyle = '#ff5a5a'; ctx.fillRect(n.x - 50, n.y - n.rad - 22, 100 * n.hp / n.hpMax, 6);
    return;
  }
  if (n.type === 4) {
    const ok = W2.leviathan && A2(() => W2.leviathan(ctx, n, TT));
    if (!ok) { ctx.fillStyle = '#ff3d6e'; ctx.beginPath(); ctx.arc(n.x, n.y, n.rad, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffb0c0'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('WARSHIP', n.x, n.y - n.rad - 16);
    if (n.hp < n.hpMax) { ctx.fillStyle = '#0009'; ctx.fillRect(n.x - 24, n.y - n.rad - 10, 48, 4); ctx.fillStyle = '#ff7a7a'; ctx.fillRect(n.x - 24, n.y - n.rad - 10, 48 * n.hp / n.hpMax, 4); }
    return;
  }
  const fn = n.type === 0 ? W2.scout : n.type === 1 ? W2.hauler : W2.leviathan;
  if (fn && A2(() => fn(ctx, n, TT))) {
    if (n.hp < n.hpMax) { const w = n.rad; ctx.fillStyle = '#0009'; ctx.fillRect(n.x - w / 2, n.y - n.rad - 12, w, 4); ctx.fillStyle = '#ff7a7a'; ctx.fillRect(n.x - w / 2, n.y - n.rad - 12, w * n.hp / n.hpMax, 4); }
    if (n.type === 2) { ctx.fillStyle = '#ff9bb3'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('LEVIATHAN', n.x, n.y - n.rad - 18); }
    return;
  }
  drawNeutOld(n);
}
function drawNeutOld(n) {
  ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.ang);
  if (n.type === 0) { ctx.fillStyle = '#2a1015'; ctx.strokeStyle = '#ff5f5f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, 9); ctx.lineTo(-5, 0); ctx.lineTo(-10, -9); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (n.type === 1) { ctx.fillStyle = '#1f2a1c'; ctx.strokeStyle = '#8fbf6a'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * 1.047) * 26, Math.sin(i * 1.047) * 20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd34d'; ctx.fillRect(-6, -3, 12, 6); }
  else { ctx.fillStyle = '#240a14'; ctx.strokeStyle = '#ff3d6e'; ctx.lineWidth = 4; ctx.beginPath(); for (let i = 0; i < 8; i++) ctx.lineTo(Math.cos(i * 0.785) * 70, Math.sin(i * 0.785) * 56); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff3d6e'; ctx.beginPath(); ctx.arc(30, 0, 12, 0, 7); ctx.fill(); ctx.fillRect(-40, -6, 50, 12); }
  ctx.restore();
  if (n.hp < n.hpMax) { const w = n.rad; ctx.fillStyle = '#0009'; ctx.fillRect(n.x - w / 2, n.y - n.rad - 12, w, 4); ctx.fillStyle = '#ff7a7a'; ctx.fillRect(n.x - w / 2, n.y - n.rad - 12, w * n.hp / n.hpMax, 4); }
  if (n.type === 2) { ctx.fillStyle = '#ff9bb3'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('LEVIATHAN', n.x, n.y - n.rad - 18); }
}
function drawProj(p, tt) {
  const c = p.k === 6 ? '#ff9a3d' : p.o >= 0 ? facC(p.o) : '#ff9a3d';
  ctx.fillStyle = ctx.strokeStyle = c;
  if (p.k === 1 || p.k === 5) { ctx.lineWidth = p.k === 1 ? 3 : 2.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); }
  else if (p.k === 2) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, 4); ctx.lineTo(-5, -4); ctx.fill(); ctx.restore(); if (Math.random() < 0.4) fx(p.x, p.y, -p.vx * 0.1, -p.vy * 0.1, 0.3, '#ffb347', 2.5); }
  else if (p.k === 3) { ctx.beginPath(); ctx.moveTo(p.x + 5, p.y); ctx.lineTo(p.x, p.y + 4); ctx.lineTo(p.x - 5, p.y); ctx.lineTo(p.x, p.y - 4); ctx.fill(); }
  else if (p.k === 7) { ctx.strokeStyle = '#cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); ctx.stroke(); ctx.lineWidth = 9; ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1; }
  else if (p.k === 6) { ctx.fillStyle = '#7a4a2a'; ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, 7); ctx.fill(); ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 6; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.15, p.y - p.vy * 0.15); ctx.stroke(); ctx.globalAlpha = 1; }
  else { ctx.beginPath(); ctx.arc(p.x, p.y, 7 + Math.sin(tt * 20) * 1.5, 0, 7); ctx.fill(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 7); ctx.stroke(); }
}
function bar(x, y, w, h, f, c) { ctx.fillStyle = '#0009'; ctx.fillRect(x, y, w, h); ctx.fillStyle = c; ctx.fillRect(x, y, w * clamp(f, 0, 1), h); }

const SKSND = { [MIS]: 'missile', [TOR]: 'torpedo', [DRN]: 'drone', [MIN]: 'mine', [DSH]: 'dash', [GRV]: 'gravity', [CLK]: 'warp', [OD]: 'dash', [AEG]: 'shield', [NAN]: 'pickup', [ARC]: 'shock', [FLT]: 'warp' };
let SKPREV = [0, 0, 0], OFFN = 0;
function uiSounds(M) {
  if (!window.SFX || !M || !M.alive) { OFFN = 0; return; }
  const n = M.offers ? M.offers.length : 0; if (n > 0 && OFFN === 0) SFX.play('offer'); OFFN = n;
  for (let j = 0; j < 3; j++) {
    const cd = slotCd(M, j), p = M.sk[j];
    if (p >= 0 && cd > SKPREV[j] + 0.4 && SKSND[p]) SFX.play(SKSND[p], { v: 0.8 });
    SKPREV[j] = cd;
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
  EMA += (dt - EMA) * 0.04;
  if (!LOWQ && EMA > 0.027 && now > 5000 && S.mode === 'game') { LOWQ = true; resize(); }   // slow device: drop to 1x resolution and skip decorative effects
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (S.mode !== 'game') return;
  let V, me;
  if (S.host) {
    if (!G) return;
    V = G; me = G.me; const s = G.ships[me];
    if (s && s.alive) Object.assign(s.in, readInput()), s.inT = G.t;
    processEvents(G.evLoc.splice(0)); G.logLoc.splice(0).forEach(addLog);
  } else { if (!C) return; predict(dt, readInput()); V = buildView(now); me = C.me; if (!V) return; }
  VIEWNOW = V;
  const M = V.ships[me]; LASTM = M && M.alive ? M : null;
  uiSounds(M);
  let fo = LASTM;
  if (!fo && COND !== 'last' && M) fo = M;
  if (!fo) { const myf = PL[me] ? PL[me].fac : -1, al = V.ships.filter(s => s.alive).sort((a, b) => (PL[b.i].fac === myf) - (PL[a.i].fac === myf)); if (al.length) fo = al[((R.spec % al.length) + al.length) % al.length]; }
  if (fo) { if (!R.cam) R.cam = { x: fo.x, y: fo.y }; const k = fo === M ? 1 : Math.min(1, 6 * dt); R.cam.x += (fo.x - R.cam.x) * k; R.cam.y += (fo.y - R.cam.y) * k; }
  if (!R.cam) return;
  const Z = zoomOf(), cam = R.cam, tt = now / 1000; FDT = dt; FZ = Z; TT = tt;
  if (SHAKE > 0.3) { cam.x += (Math.random() - 0.5) * SHAKE; cam.y += (Math.random() - 0.5) * SHAKE; } SHAKE *= Math.exp(-9 * dt); FLASH = Math.max(0, FLASH - dt * 2.2); WFLASH = Math.max(0, WFLASH - dt * 1.4);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!(B2.draw && A2(() => B2.draw(ctx, { x: cam.x, y: cam.y, zoom: Z, w: CW, h: CH }, tt, V.layout || 0)))) for (const st of stars) { const x = (((st.x * CW - cam.x * st.z * Z) % CW) + CW) % CW, y = (((st.y * CH - cam.y * st.z * Z) % CH) + CH) % CH; ctx.fillStyle = `rgba(200,215,255,${0.25 + st.z})`; ctx.fillRect(x, y, st.z * 3, st.z * 3); }
  ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (CW / 2 - cam.x * Z), DPR * (CH / 2 - cam.y * Z));
  ctx.textAlign = 'center';
  // danger zone + wells
  if (!(W2.storm && A2(() => W2.storm(ctx, V.z, { x0: cam.x - CW / 2 / Z, y0: cam.y - CH / 2 / Z, x1: cam.x + CW / 2 / Z, y1: cam.y + CH / 2 / Z }, tt)))) {
    ctx.fillStyle = 'rgba(255,40,40,0.16)'; ctx.beginPath(); ctx.rect(-9000, -9000, 18000, 18000); ctx.moveTo(V.z, 0); ctx.arc(0, 0, V.z, 0, 7); ctx.fill('evenodd');
    ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, V.z, 0, 7); ctx.stroke();
  }
  for (const w of V.wells) {
    if (ART2 && w.life > 0) { try { Art2.fx.gravityWell(ctx, w, tt); } catch (e) {} drawBombTelegraph(w); continue; }   // gravity bomb
    if (w.type === 0 && W2.planet && A2(() => W2.planet(ctx, w, tt))) continue;
    if (w.type === 2 && W2.star && A2(() => W2.star(ctx, w, tt))) continue;
    if (w.type === 1 && W2.gravityHole && A2(() => W2.gravityHole(ctx, w, tt, V.surge))) continue;
    ctx.strokeStyle = w.type ? '#a06bff44' : '#66ccff33'; ctx.lineWidth = 2; ctx.setLineDash([10, 14]); ctx.beginPath(); ctx.arc(w.x, w.y, w.gr, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (w.type === 2) { const g = ctx.createRadialGradient(w.x, w.y, 5, w.x, w.y, w.r * 2.4); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.35, '#ffb02e'); g.addColorStop(1, 'rgba(255,100,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w.x, w.y, w.r * 2.4, 0, 7); ctx.fill(); ctx.strokeStyle = '#ff5a2a99'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(w.x, w.y, w.r + 110, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    else if (w.type === 1) { const g = ctx.createRadialGradient(w.x, w.y, w.r * 0.3, w.x, w.y, w.r * 3); g.addColorStop(0, '#000'); g.addColorStop(0.35, '#2b0a55'); g.addColorStop(1, 'rgba(80,20,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w.x, w.y, w.r * 3, 0, 7); ctx.fill(); ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w.x, w.y, w.r * 1.2 + Math.sin(tt * 3) * 3, 0, 7); ctx.stroke(); }
    else { const g = ctx.createRadialGradient(w.x - w.r * 0.3, w.y - w.r * 0.3, 5, w.x, w.y, w.r); g.addColorStop(0, '#6a7aa8'); g.addColorStop(1, '#232a45'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, 7); ctx.fill(); }
  }
  for (const n of V.nebs) { if (W2.nebula && A2(() => W2.nebula(ctx, n, tt))) continue; const g = ctx.createRadialGradient(n.x, n.y, n.r * 0.2, n.x, n.y, n.r); g.addColorStop(0, 'rgba(150,90,220,0.38)'); g.addColorStop(1, 'rgba(90,40,160,0.05)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(190,140,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  for (const h of V.haz || []) {   // radiation clouds
    const g = ctx.createRadialGradient(h.x, h.y, h.r * 0.25, h.x, h.y, h.r); g.addColorStop(0, 'rgba(150,255,60,0.05)'); g.addColorStop(0.75, 'rgba(150,255,60,0.15)'); g.addColorStop(1, 'rgba(170,255,70,0.3)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b6ff4d'; ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.lineDashOffset = tt * 14; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#d4ff7a'; ctx.globalAlpha = 0.28 + 0.12 * Math.sin(tt * 2 + h.x); ctx.font = 'bold 44px system-ui'; ctx.textAlign = 'center'; ctx.fillText('☢', h.x, h.y + 15); ctx.globalAlpha = 1;
  }
  for (const f of V.fields || []) {   // repair / toxic fields
    const col = f.k ? '#c779ff' : '#5ee07a', fr = f.f != null ? f.f : clamp(f.life / f.max, 0, 1), g = ctx.createRadialGradient(f.x, f.y, f.r * 0.2, f.x, f.y, f.r);
    g.addColorStop(0, col + '10'); g.addColorStop(1, col + '55'); ctx.fillStyle = g; ctx.globalAlpha = 0.5 + 0.5 * fr; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
    ctx.strokeStyle = PL[fieldFac(f)] ? facC(fieldFac(f)) : col; ctx.lineWidth = 3; ctx.globalAlpha = 0.7; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -tt * 20; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col; ctx.globalAlpha = 0.6; if (!f.k) { ctx.fillRect(f.x - 4, f.y - 18, 8, 36); ctx.fillRect(f.x - 18, f.y - 4, 36, 8); } ctx.globalAlpha = 1;
  }
  for (const st of V.streams) {
    drawStreamFlow(st, tt); continue;
    const dx = st.x2 - st.x1, dy = st.y2 - st.y1, len = Math.hypot(dx, dy);
    ctx.save(); ctx.translate(st.x1, st.y1); ctx.rotate(Math.atan2(dy, dx)); ctx.fillStyle = 'rgba(80,200,255,0.10)'; ctx.fillRect(0, -st.w, len, st.w * 2);
    ctx.strokeStyle = 'rgba(120,220,255,0.7)'; ctx.lineWidth = 3; for (let x = (tt * 160) % 90; x < len; x += 90) { ctx.beginPath(); ctx.moveTo(x, -22); ctx.lineTo(x + 18, 0); ctx.lineTo(x, 22); ctx.stroke(); }
    ctx.restore();
  }
  if (V.surge > 0 && !W2.gravityHole) for (const w of V.wells) { ctx.strokeStyle = '#ff9bf5'; ctx.globalAlpha = 0.6; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w.x, w.y, w.gr * (1 - ((tt * 0.8) % 1)), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  if (V.ion && !(W2.ionStorm && A2(() => W2.ionStorm(ctx, V.ion, tt)))) {
    const io = V.ion, g = ctx.createRadialGradient(io.x, io.y, io.r * 0.2, io.x, io.y, io.r); g.addColorStop(0, 'rgba(210,190,255,0.35)'); g.addColorStop(1, 'rgba(120,80,220,0.08)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(io.x, io.y, io.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#d6c8ff'; ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + Math.floor(tt * 6) * 1.7, r1 = io.r * (0.3 + 0.6 * ((k * 0.37) % 1)); ctx.beginPath(); ctx.moveTo(io.x + Math.cos(a) * r1, io.y + Math.sin(a) * r1); ctx.lineTo(io.x + Math.cos(a + 0.3) * (r1 + 40), io.y + Math.sin(a + 0.3) * (r1 + 40)); ctx.lineTo(io.x + Math.cos(a + 0.1) * (r1 + 80), io.y + Math.sin(a + 0.1) * (r1 + 80)); ctx.stroke(); }
  }
  for (const p of V.portals) { if (W2.portal && A2(() => W2.portal(ctx, p, tt))) continue; ctx.strokeStyle = '#77ffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 38, 0, 7); ctx.stroke(); ctx.strokeStyle = '#77ffff66'; ctx.beginPath(); ctx.arc(p.x, p.y, 24 + Math.sin(tt * 4) * 5, 0, 7); ctx.stroke(); }
  for (const b of V.bea) {
    if (W2.beacon && A2(() => W2.beacon(ctx, b, tt, { owner: b.owner >= 0 ? FC(b.owner) : null, cap: b.cap >= 0 ? FC(b.cap) : null }))) continue;
    const c = b.owner >= 0 ? FC(b.owner) : '#aabbcc';
    ctx.strokeStyle = c + '88'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
    if (b.cap >= 0 && b.p > 0 && b.p < 1) { ctx.strokeStyle = FC(b.cap); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 8, -1.57, -1.57 + b.p * 6.283); ctx.stroke(); }
    ctx.fillStyle = b.cont ? '#fff' : c; ctx.beginPath(); ctx.moveTo(b.x, b.y - 16); ctx.lineTo(b.x + 12, b.y); ctx.lineTo(b.x, b.y + 16); ctx.lineTo(b.x - 12, b.y); ctx.fill();
  }
  for (const p of V.pads || []) {
    const pc = { x: p.x, y: p.y, r: p.r, p: 0, owner: 1, cap: -1, cont: 0 };
    if (!(W2.beacon && A2(() => W2.beacon(ctx, pc, tt, { owner: '#5ee07a', cap: null })))) { ctx.strokeStyle = '#5ee07a'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#5ee07a'; ctx.globalAlpha = 0.55 + 0.3 * Math.sin(tt * 3); ctx.fillRect(p.x - 3, p.y - 14, 6, 28); ctx.fillRect(p.x - 14, p.y - 3, 28, 6); ctx.globalAlpha = 1;   // repair cross
  }
  for (const a of V.ast) { if (a.k === 1) { ctx.fillStyle = 'rgba(255,205,80,0.13)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 1.5 + 4 * Math.sin(tt * 3 + a.id), 0, 7); ctx.fill(); } if (W2.asteroid && A2(() => W2.asteroid(ctx, a, tt))) continue; ctx.beginPath(); for (let i = 0; i < 9; i++) { const rr = a.r * (0.82 + 0.2 * Math.sin(a.id * 7.1 + i * 2.3)); ctx.lineTo(a.x + Math.cos(i * 0.698) * rr, a.y + Math.sin(i * 0.698) * rr); } ctx.closePath(); ctx.fillStyle = '#1d2233'; ctx.fill(); ctx.strokeStyle = '#5b6584'; ctx.lineWidth = 2; ctx.stroke(); }
  for (const c of V.pick) {
    if (c.t === 2) { drawRelic(c); continue; }
    if (W2.scrap && A2(() => W2.scrap(ctx, c, tt))) continue;
    if (c.t === 0) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.moveTo(c.x, c.y - 6); ctx.lineTo(c.x + 5, c.y); ctx.lineTo(c.x, c.y + 6); ctx.lineTo(c.x - 5, c.y); ctx.fill(); }
    else { ctx.fillStyle = '#12301d'; ctx.strokeStyle = '#5ee07a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5ee07a'; ctx.fillRect(c.x - 6, c.y - 1.5, 12, 3); ctx.fillRect(c.x - 1.5, c.y - 6, 3, 12); }
  }
  for (const d of V.drops) { if (W2.supplyDrop && A2(() => W2.supplyDrop(ctx, d, tt))) continue; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(tt * 5); ctx.beginPath(); ctx.arc(d.x, d.y, 50 + Math.sin(tt * 3) * 6, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const m of V.mines) {   // mine field: area of mines, fades out over its last 2 s
    drawMineField(m); continue;
    const col = FC(m.fac), fade = clamp(m.life / 2, 0, 1);
    ctx.fillStyle = col; ctx.globalAlpha = 0.1 * fade + 0.04; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5 * fade; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < 9; k++) { const a = k * 2.4, rr = m.r * Math.sqrt((k + 0.5) / 9) * 0.9, px = m.x + Math.cos(a) * rr, py = m.y + Math.sin(a) * rr; ctx.globalAlpha = (0.5 + 0.5 * Math.sin(tt * 6 + k)) * fade; ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 5, py + 4); ctx.lineTo(px - 5, py + 4); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  for (const n of V.neut) drawNeut(n);
  if (ART2) {
    try { for (const p of V.proj) { PO.k = p.k; PO.x = p.x; PO.y = p.y; PO.vx = p.vx; PO.vy = p.vy; PO.col = p.k === 6 || p.o < 0 ? '#ff9a3d' : facC(p.o); Art2.weapons.draw(ctx, PO, tt); } }
    catch (e) { if (!window.__artErr) { window.__artErr = e.message; console.error('Art2 weapons', e); } }
  } else { ctx.globalCompositeOperation = 'lighter'; for (const p of V.proj) drawProj(p, tt); ctx.globalCompositeOperation = 'source-over'; }
  // target reticle
  const tobj = myTg ? (myTg[0] === 's' ? V.ships[+myTg.slice(1)] : myTg[0] === 'n' ? V.neut.find(n => n.id === +myTg.slice(1)) : V.ast.find(a => a.id === +myTg.slice(1))) : null;
  if (tobj && tobj.alive !== false) { const rr = (tobj.rad || tobj.r || radOf(tobj.lv)) + 14; if (!(H2.reticle && A2(() => H2.reticle(ctx, tobj.x, tobj.y, rr, tt)))) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(tobj.x, tobj.y, rr + Math.sin(tt * 6) * 2, 0, 7); ctx.stroke(); ctx.setLineDash([]); } }
  else if (myTg) myTg = '';
  for (const s of V.ships) {
    if (!s.alive) continue;
    if (!ART2 && s.thr && Math.random() < 0.7) { const b = radOf(s.lv) * 0.7; fx(s.x - Math.cos(s.ang) * b, s.y - Math.sin(s.ang) * b, -s.vx * 0.15 + rnd(-20, 20), -s.vy * 0.15 + rnd(-20, 20), 0.35, s.boost ? '#9cf' : '#ff9a3d', 3); }
    drawShip(s, s === M);
  }
  { const nb = performance.now();   // laser beams: full line from the shooter to what it hits
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = BEAMS.length - 1; i >= 0; i--) {
      const b = BEAMS[i]; if (b.until < nb) { BEAMS.splice(i, 1); continue; }
      const sh = b.s < 1000 ? V.ships[b.s] : V.neut.find(n => n.id === b.s - 1000); if (!sh || sh.alive === false) continue;
      b.x += (b.tx - b.x) * 0.5; b.y += (b.ty - b.y) * 0.5; const f = Math.min(1, (b.until - nb) / 110) * (0.97 + 0.03 * Math.sin(nb / 60 + b.s)), col = '#ff8f2e', th = b.s < 1000 ? 1 + (sh.lv ? sh.lv[LAS] : 0) * 0.6 : 0.8;
      const ang = Math.atan2(b.y - sh.y, b.x - sh.x), rr = sh.lv ? radOf(sh.lv) : (sh.rad || 14);
      ctx.beginPath(); ctx.moveTo(sh.x + Math.cos(ang) * rr * 1.1, sh.y + Math.sin(ang) * rr * 1.1); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = col; ctx.globalAlpha = 0.4 * f; ctx.lineWidth = 9 * th * f + 2; ctx.stroke();
      ctx.strokeStyle = '#ffe3b8'; ctx.globalAlpha = 0.95 * f; ctx.lineWidth = 2.2 * th * f + 0.8; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt'; }
  { const nz = performance.now();   // arc storm lightning
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = ZAPS.length - 1; i >= 0; i--) {
      const z = ZAPS[i]; if (z.until < nz) { ZAPS.splice(i, 1); continue; }
      const f = (z.until - nz) / 320, dx = z.x2 - z.x1, dy = z.y2 - z.y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = Math.max(4, Math.floor(L / 40));
      ctx.beginPath(); ctx.moveTo(z.x1, z.y1); for (let k = 1; k < n; k++) { const j = (Math.random() - 0.5) * 36 * f; ctx.lineTo(z.x1 + dx * k / n + nx * j, z.y1 + dy * k / n + ny * j); } ctx.lineTo(z.x2, z.y2);
      ctx.strokeStyle = '#7fb8ff'; ctx.globalAlpha = 0.5 * f; ctx.lineWidth = 9 * f + 2; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.95 * f; ctx.lineWidth = 2.2; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; }
  { const np = performance.now();   // railgun charge telegraphs
    for (let i = TELE.length - 1; i >= 0; i--) { const q = TELE[i]; if (q.until < np) { TELE.splice(i, 1); continue; } const f = (q.until - np) / 450; ctx.strokeStyle = 'rgba(255,' + (120 + 100 * (1 - f) | 0) + ',120,' + (0.25 + 0.5 * (1 - f)) + ')'; ctx.lineWidth = 2 + 4 * (1 - f); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + Math.cos(q.a) * 1300, q.y + Math.sin(q.a) * 1300); ctx.stroke(); } }
  if (AIMING && AIMING.moved && M && M.alive) drawAimPreview(M, AIMING);
  if (ART2) { try { Art2.shield.update(dt); Art2.fx.update(dt); Art2.fx.draw(ctx); } catch (e) { if (!window.__artErr) { window.__artErr = e.message; console.error('Art2 fx', e); } } }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = R.fx.length - 1; i >= 0; i--) {
    const p = R.fx[i]; p.l -= dt; if (p.l <= 0) { R.fx.splice(i, 1); continue; }
    const f = p.l / p.m; ctx.globalAlpha = f;
    if (p.ring) { ctx.strokeStyle = p.c; ctx.lineWidth = 4 * f; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - f * 0.9), 0, 7); ctx.stroke(); }
    else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s * (0.5 + f), p.s * (0.5 + f)); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (!(AH && A2(() => drawHUD2(V, me, M, now)))) drawHUD(V, me, M, now);
}
const slotCd = (M, j) => (M.sk[j] < 0 ? 0 : (S.host ? M.cd[M.sk[j]] : M.cd[j]));   // host ships store cooldowns per module, snapshots per slot
function cdOverlay(b, cd, mx, col) {   // clear cooldown: dimmed button, big seconds left, and a ring that drains
  const f = clamp(cd / mx, 0, 1), txt = cd >= 10 ? String(Math.ceil(cd)) : cd.toFixed(1);
  ctx.save(); ctx.fillStyle = 'rgba(4,8,18,0.62)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6, -Math.PI / 2, -Math.PI / 2 + f * 6.283); ctx.stroke();
  ctx.font = 'bold ' + Math.round(b.r * 0.85) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(txt, b.x, b.y); ctx.fillStyle = '#fff'; ctx.fillText(txt, b.x, b.y);
  ctx.restore();
}
const tleftOf = V => (V.tleft != null ? V.tleft : Math.max(0, (V.tlim || 0) - V.t));
function offerInfo(p, M) {   // card content for a plain upgrade (part id) or a branch (id >= 100)
  if (p >= 100) { const q = (p - 100) >> 1, b = (BR[q] && BR[q][(p - 100) & 1]) || ['?', '']; return { mod: q, name: '★ ' + b[0], desc: b[1], lvFrom: 3, lvTo: 3, active: false, branch: true }; }
  return { mod: p, name: PARTS[p][0], desc: PARTS[p][1].replace(' [skill]', ''), lvFrom: M.lv[p], lvTo: M.lv[p] + 1, active: !!PARTS[p][3] };
}
function drawAlerts(V, M) {   // full-screen flashes, solar-flare warning, status effects, fleet size
  if (WFLASH > 0.02) { ctx.fillStyle = 'rgba(255,240,210,' + (0.85 * WFLASH) + ')'; ctx.fillRect(0, 0, CW, CH); }
  const bn = (txt, y, col) => { if (H2.banner) H2.banner(ctx, txt, CW / 2, y, col); else { ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.font = 'bold 18px system-ui'; ctx.fillText(txt, CW / 2, y); } };
  if (V.flare > 0) {
    const pu = 0.5 + 0.5 * Math.sin(TT * 8), g = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.3, CW / 2, CH / 2, Math.max(CW, CH) * 0.75);
    g.addColorStop(0, 'rgba(255,170,60,0)'); g.addColorStop(1, 'rgba(255,150,40,' + (0.16 + 0.2 * pu) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    bn('SOLAR FLARE IN ' + Math.ceil(V.flare) + ' — HIDE IN A NEBULA OR BEHIND A ROCK', SA.t + 112, '#ffb45a');
  }
  if (M && M.alive && COND !== 'capture' && Math.hypot(M.x, M.y) > V.z) bn('OUTSIDE THE SAFE ZONE — RETURN TO THE CENTRE', SA.t + (V.flare > 0 ? 160 : 112), '#ff5a5a');
  if (!M || !M.alive) return;
  const fl = FL(M), st = [];
  if (fl & 1) st.push('CLOAKED'); if (fl & 2) st.push('AEGIS'); if (fl & 4) st.push('OVERDRIVE'); if (fl & 8) st.push('AMBUSH');
  if (M.emp) st.push('EMP');
  const nf = V.neut.filter(n => n.type === 6 && n.ow === M.i).length, lines = [];
  lines.push('Fleet ' + nf + '/' + (2 + Math.floor(M.level / 4)));
  if (M.streak >= 2) lines.push('Streak ' + M.streak);
  if (st.length) lines.push(st.join(' · '));
  ctx.textAlign = 'left'; ctx.font = '600 11px system-ui';
  lines.forEach((t, i) => { const y = SA.t + 118 + i * 15; ctx.fillStyle = 'rgba(8,14,24,0.55)'; ctx.fillRect(SA.l + 4, y - 11, ctx.measureText(t).width + 12, 15); ctx.fillStyle = i === lines.length - 1 && st.length ? '#9cf' : '#cfe3ff'; ctx.fillText(t, SA.l + 10, y); });
}
function drawHUD2(V, me, M, now) {
  if (window.__artErr) { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = "#ff6b6b"; ctx.font = "12px monospace"; ctx.textAlign = "left"; ctx.fillText("ART ERR: " + window.__artErr, 10, CH - 8); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (FLASH > 0.02) { const g = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * 0.35, CW / 2, CH / 2, Math.max(CW, CH) * 0.7); g.addColorStop(0, 'rgba(255,40,40,0)'); g.addColorStop(1, 'rgba(255,40,40,' + (0.45 * FLASH) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH); }
  drawAlerts(V, M);
  const Lo = layout(), L0 = SA.l + 10, T0 = SA.t + 8, cap = COND === 'capture', Zz = zoomOf(), cm = R.cam, zt0 = (COND === 'score' ? ZS_T0 : ZONE_T0) * (LEN === 'quick' ? 0.55 : 1);
  // edge pointers to beacons / Leviathan / supply drops when off-screen
  const arrow = (wx, wy, col) => {
    const sx = CW / 2 + (wx - cm.x) * Zz, sy = CH / 2 + (wy - cm.y) * Zz, m = 26;
    if (sx > m && sx < CW - m && sy > m + SA.t && sy < CH - m) return;
    const dx = sx - CW / 2, dy = sy - CH / 2, k = Math.min((CW / 2 - m) / Math.abs(dx || 1), (CH / 2 - m) / Math.abs(dy || 1));
    H2.arrow(ctx, CW / 2 + dx * k, CH / 2 + dy * k, Math.atan2(dy, dx), col);
  };
  if (M && M.alive && cm && H2.arrow) { V.bea.forEach(b => arrow(b.x, b.y, b.owner >= 0 ? FC(b.owner) : '#aabbcc')); V.neut.forEach(n => { if (n.type === 2 || n.type === 4 || n.type === 9) arrow(n.x, n.y, '#ff3d6e'); else if (n.type === 5) arrow(n.x, n.y, n.conv ? '#ffd34d' : '#7fe3ff'); }); V.drops.forEach(d => arrow(d.x, d.y, '#ffe066')); }
  if (M && M.alive && cm && H2.arrow) {   // the arena is huge: point at the nearest enemy, and at a hire outpost you can afford
    if (COND !== 'capture' && Math.hypot(M.x, M.y) > V.z) arrow(0, 0, '#ff5a5a');
    if (COND !== 'last') { let b = null, bd = 1e9; V.ships.forEach(o => { if (o.alive && PL[o.i].fac !== myFac() && !(FL(o) & 1)) { const d = Math.hypot(o.x - M.x, o.y - M.y); if (d < bd) { bd = d; b = o; } } }); if (b) arrow(b.x, b.y, '#ff6b6b'); }
    if (V.neut.filter(n => n.type === 6 && n.ow === M.i).length < 2 + Math.floor(M.level / 4)) { let b = null, bd = 1e9; V.neut.forEach(n => { if (n.type === 7 && M.scrap >= ECLS[n.cls || 0].cost) { const d = Math.hypot(n.x - M.x, n.y - M.y); if (d < bd) { bd = d; b = n; } } }); if (b) arrow(b.x, b.y, ECLS[b.cls || 0].col); }
  }
  const NFc = MODE === 'teams' ? 2 : PL.length, alive = Array(NFc).fill(0);
  V.ships.forEach(sh => { if (sh.alive) alive[PL[sh.i].fac]++; });
  H2.top(ctx, { w: CW, h: CH, sa: SA, mode: MODE, cond: COND, time: COND === 'score' ? tleftOf(V) : V.t, scores: V.score || [], target: V.target || 0, me: myFac(), alive, aliveTotal: V.ships.filter(sh => sh.alive).length, shares: V.shares || [], fcol: alive.map((_, f) => FC(f)),
    stormIn: COND !== 'capture' && V.t < zt0 ? Math.ceil(zt0 - V.t) : 0, stormOn: COND !== 'capture' && V.t >= zt0, lost: !!(!S.host && C && C.last && performance.now() - C.last.at > 4000 && !V.over) }, TT);
  if (H2.fsButton) H2.fsButton(ctx, Lo.fs, TT);
  R.log = R.log.filter(l => now - l.at < 7000);
  if (H2.log) H2.log(ctx, R.log, CW - SA.r - 10, Lo.fs.y + Lo.fs.h + 16, now);
  const banner = (txt, x, y, col) => { if (H2.banner) H2.banner(ctx, txt, x, y, col); else { ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.font = 'bold 18px system-ui'; ctx.fillText(txt, x, y); } };
  if (!M || !M.alive) { banner(COND !== 'last' && M ? 'Respawning in ' + Math.ceil(M.rs) + '…' : 'Destroyed — tap to switch spectated ship', CW / 2, CH - 30 - SA.b, '#ff7a7a'); return; }
  const lo = thresh(M.level), hi = thresh(M.level + 1), mc = H2.MODCOL || PCOL;
  H2.bars(ctx, { x: L0, y: T0, hpf: clamp(M.hp / M.hpMax, 0, 1), shf: M.shMax ? clamp(M.sh / M.shMax, 0, 1) : 0, hasShield: M.shMax > 0, xpf: M.level >= MAXLV ? 1 : clamp((M.scrap - lo) / (hi - lo), 0, 1), level: M.level, maxLevel: MAXLV, lv: M.lv, col: facC(me) }, TT);
  for (let j = 0; j < 3; j++) { const p = M.sk[j]; H2.skillButton(ctx, Lo.btn[j], { mod: p, cd: slotCd(M, j), cdMax: p >= 0 ? cdMax(M.lv, p) : 1, ready: p >= 0 && slotCd(M, j) <= 0, col: p >= 0 ? mc[p] : '#2a3350' }, TT); if (p >= 0 && slotCd(M, j) > 0) cdOverlay(Lo.btn[j], slotCd(M, j), cdMax(M.lv, p), mc[p]); }
  if (JOY) H2.joystick(ctx, JOY);
  if (M.emp) banner('EMP — SYSTEMS DOWN', CW / 2, CH / 2 + 110, '#9cf');
  if (M.pending > 0 && M.offers.length) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 12px system-ui'; ctx.fillText('UPGRADE' + (M.pending > 1 ? ' ×' + M.pending : '') + ' — tap one', CW / 2, Lo.cards[0].y - 6);
    M.offers.forEach((p, j) => H2.upgradeCard(ctx, Lo.cards[j], Object.assign({ idx: j + 1 }, offerInfo(p, M)), TT));
  }
}
function drawHUD(V, me, M, now) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const Lo = layout(), L0 = SA.l + 10, T0 = SA.t + 8, cap = COND === 'capture', teams = MODE === 'teams';
  const mmss = `${Math.floor(V.t / 60)}:${String(Math.floor(V.t % 60)).padStart(2, '0')}`;
  // edge pointers replace the minimap: beacons, the Leviathan and supply drops when off-screen
  const Zz = zoomOf(), cm = R.cam;
  const arrow = (wx, wy, col) => {
    const sx = CW / 2 + (wx - cm.x) * Zz, sy = CH / 2 + (wy - cm.y) * Zz, m = 26;
    if (sx > m && sx < CW - m && sy > m + SA.t && sy < CH - m) return;
    const dx = sx - CW / 2, dy = sy - CH / 2, k = Math.min((CW / 2 - m) / Math.abs(dx || 1), (CH / 2 - m) / Math.abs(dy || 1));
    ctx.save(); ctx.translate(CW / 2 + dx * k, CH / 2 + dy * k); ctx.rotate(Math.atan2(dy, dx)); ctx.fillStyle = col; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -7); ctx.lineTo(-7, 7); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
  };
  if (M && M.alive && cm) { V.bea.forEach(b => arrow(b.x, b.y, b.owner >= 0 ? FC(b.owner) : '#aabbcc')); V.neut.forEach(n => { if (n.type === 2) arrow(n.x, n.y, '#ff3d6e'); }); V.drops.forEach(d => arrow(d.x, d.y, '#ffe066')); }
  ctx.textAlign = 'center';
  const bw = clamp(CW * 0.34, 200, 340), bx = CW / 2 - bw / 2;
  if (cap) {   // tug-of-war bar: each faction's share of the bar grows as it holds beacons; fill it to win
    ctx.fillStyle = '#0009'; ctx.fillRect(bx - 2, T0 - 2, bw + 4, 18);
    let x = bx; V.shares.forEach((v, f) => { ctx.fillStyle = FC(f); ctx.fillRect(x, T0, bw * v, 14); x += bw * v; });
    ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1; ctx.strokeRect(bx - 2, T0 - 2, bw + 4, 18);
    ctx.font = '11px system-ui'; ctx.fillStyle = '#cfd6e6'; ctx.fillText(mmss, CW / 2, T0 + 32);
  } else if (COND === 'score') {
    const tl = tleftOf(V), nf = teams ? 2 : PL.length, sc = V.score || [];
    ctx.font = 'bold 16px system-ui'; ctx.fillStyle = '#dfe6f5'; ctx.fillText(Math.floor(tl / 60) + ':' + String(Math.floor(tl % 60)).padStart(2, '0') + ' · first to ' + (V.target || 0), CW / 2, T0 + 14);
    for (let f = 0; f < nf; f++) { ctx.fillStyle = FC(f); ctx.fillText(String(Math.floor(sc[f] || 0)), CW / 2 + (f - (nf - 1) / 2) * 44, T0 + 34); }
  } else {
    const alive = Array(8).fill(0); V.ships.forEach(s => { if (s.alive) alive[PL[s.i].fac]++; });
    ctx.font = 'bold 16px system-ui';
    if (teams) { ctx.fillStyle = TC[0]; ctx.fillText(`RED ${alive[0]}`, CW / 2 - 80, T0 + 14); ctx.fillStyle = TC[1]; ctx.fillText(`${alive[1]} BLUE`, CW / 2 + 80, T0 + 14); ctx.fillStyle = '#dfe6f5'; ctx.fillText(mmss, CW / 2, T0 + 14); }
    else { ctx.fillStyle = '#dfe6f5'; ctx.fillText(`${V.ships.filter(s => s.alive).length} alive · ${mmss}`, CW / 2, T0 + 14); }
    ctx.font = '11px system-ui'; ctx.fillStyle = V.t < ZONE_T0 ? '#8a93a8' : '#ff7a7a'; ctx.fillText(V.t < ZONE_T0 ? `Storm closes in ${Math.ceil(ZONE_T0 - V.t)}s` : 'The storm is closing in', CW / 2, T0 + 30);
  }
  if (!S.host && C && C.last && performance.now() - C.last.at > 4000 && !V.over) { ctx.fillStyle = '#ff7a7a'; ctx.font = 'bold 18px system-ui'; ctx.fillText('Connection to host lost…', CW / 2, CH - 20 - SA.b); }
  // fullscreen button + log (top-right)
  const f = Lo.fs; ctx.fillStyle = '#151a2bcc'; ctx.fillRect(f.x, f.y, f.w, f.h); ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5; ctx.strokeRect(f.x + 8, f.y + 8, f.w - 16, f.h - 16);
  ctx.textAlign = 'right'; ctx.font = '11px system-ui'; R.log = R.log.filter(l => now - l.at < 7000);
  R.log.forEach((l, i) => { ctx.fillStyle = '#cfd6e6'; ctx.fillText(l.t, CW - SA.r - 10, f.y + f.h + 16 + i * 14); });
  drawAlerts(V, M);
  if (!M || !M.alive) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff7a7a'; ctx.font = 'bold 18px system-ui';
    ctx.fillText(COND !== 'last' && M ? `Respawning in ${Math.ceil(M.rs)}…` : 'Destroyed — tap to switch spectated ship', CW / 2, CH - 30 - SA.b);
    return;
  }
  // status bars (no numbers): hull, shield, xp, level pips, modules
  bar(L0, T0, 150, 8, M.hp / M.hpMax, M.hp / M.hpMax > 0.4 ? '#5ee07a' : '#ff5a5a');
  if (M.shMax) bar(L0, T0 + 11, 150, 5, M.sh / M.shMax, '#6cf');
  const lo = thresh(M.level), hi = thresh(M.level + 1);
  bar(L0, T0 + 19, 150, 5, M.level >= MAXLV ? 1 : (M.scrap - lo) / (hi - lo), '#ffe066');
  for (let i = 0; i < MAXLV; i++) { ctx.fillStyle = i < M.level ? '#ffe066' : '#2a3350'; ctx.fillRect(L0 + i * 12.5, T0 + 28, 10, 4); }
  for (let p = 0; p < NP; p++) { const x = L0 + p * 15, l = M.lv[p]; ctx.fillStyle = M.dp[p] ? '#5a1d1d' : l ? PCOL[p] + 'cc' : '#12172a'; ctx.fillRect(x, T0 + 38, 13, 13); ctx.fillStyle = l ? '#000' : '#4a5270'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillText(PARTS[p][2], x + 6.5, T0 + 47.5); }
  // skill buttons: cooldown sweep + seconds left, pulsing ring when ready
  for (let j = 0; j < 3; j++) {
    const b = Lo.btn[j], p = M.sk[j], has = p >= 0, cdv = slotCd(M, j), ready = has && cdv <= 0;
    ctx.fillStyle = has ? '#1d2b4acc' : '#12172a99'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.strokeStyle = has ? PCOL[p] : '#2a3350'; ctx.lineWidth = ready ? 4 : 2; ctx.stroke();
    if (ready) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now / 180); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    if (has && cdv > 0) { ctx.fillStyle = '#000b'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r - 1, -1.57, -1.57 + 6.283 * clamp(cdv / cdMax(M.lv, p), 0, 1)); ctx.fill(); }
    ctx.textAlign = 'center';
    if (has && cdv > 0) { ctx.fillStyle = '#fff'; ctx.font = `bold ${b.r * 0.62}px system-ui`; ctx.fillText(Math.ceil(cdv), b.x, b.y + b.r * 0.22); }
    else { ctx.fillStyle = has ? '#fff' : '#4a5270'; ctx.font = `bold ${b.r * 0.5}px system-ui`; ctx.fillText(has ? PARTS[p][2] : '–', b.x, b.y + b.r * 0.18); }
  }
  if (JOY) { ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(JOY.bx, JOY.by, 56, 0, 7); ctx.stroke(); ctx.fillStyle = '#ffffff44'; ctx.beginPath(); ctx.arc(JOY.x, JOY.y, 24, 0, 7); ctx.fill(); }
  if (M.emp) { ctx.textAlign = 'center'; ctx.fillStyle = '#9cf'; ctx.font = 'bold 18px system-ui'; ctx.fillText('EMP — SYSTEMS DOWN', CW / 2, CH / 2 + 110); }
  // upgrade cards: top-centre row (never over the joystick), semi-transparent
  if (M.pending > 0 && M.offers.length) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 12px system-ui'; ctx.fillText(`UPGRADE${M.pending > 1 ? ' ×' + M.pending : ''} — tap one`, CW / 2, Lo.cards[0].y - 6);
    M.offers.forEach((p, j) => {
      const c = Lo.cards[j], cx = c.x + c.w / 2, oi = offerInfo(p, M);
      ctx.fillStyle = '#151a2bb0'; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeStyle = PCOL[oi.mod]; ctx.lineWidth = 1.5; ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.fillText(`${j + 1}. ${oi.name}${oi.active ? ' ◉' : ''}`, cx, c.y + 17);
      ctx.fillStyle = '#8fd0ff'; ctx.font = '11px system-ui'; ctx.fillText(oi.branch ? 'SPECIALISE' : `Lv ${oi.lvFrom}→${oi.lvTo}${M.dp[oi.mod] ? ' (repairs)' : ''}`, cx, c.y + 33);
      ctx.fillStyle = '#9aa3b8'; ctx.font = '10px system-ui'; ctx.fillText(oi.desc, cx, c.y + 49);
    });
  }
}
requestAnimationFrame(frame);
showMenu();
try { if (!/[?&]demo/.test(location.search) && !localStorage.getItem('sb_seen')) showHow(0, true); } catch (e) {}
ui.addEventListener('click', e => { if (window.SFX && e.target.closest && e.target.closest('button:not(:disabled)')) SFX.play('click'); });

if (/[?&]demo/.test(location.search)) {
  S.host = true; S.name = 'Demo';
  const pl = [{ id: S.id, name: 'You', bot: false, team: 0 }, ...[1, 2, 3].map(i => ({ id: 'bot_' + i, name: BOT_NAMES[i] + ' (bot)', bot: true, team: i % 2 }))];
  S.lobby = { status: 'playing', seed: 0, diff: 'normal', mode: 'teams', cond: (location.search.match(/[?&]cond=(\w+)/) || [])[1] || 'last', len: 'normal', players: pl };
  startGame(S.lobby); document.body.setAttribute("data-vp", innerWidth + "x" + innerHeight);
  const me = G.ships[0]; me.lv = [2, 3, 2, 2, 1, 2, 2, 0, 2, 2, 0, 0, 0]; me.sk = [MIS, TOR, MIN]; me.hpMax = me.hp = 900; me.cd[MIS] = 40; me.cd[TOR] = 25; me.pending = 1; makeOffers(me); me.level = 4; me.scrap = 300;
  if (/[?&]fight/.test(location.search)) {   // store-screenshot scene: enemies right next to you, fully kitted
    const kits = [[3, 3, 2, 3, 1, 2, 2, 2, 2, 2, 0, 1, 1], [2, 2, 2, 2, 0, 2, 1, 1, 0, 1, 0, 0, 0], [3, 2, 1, 2, 1, 1, 2, 0, 1, 2, 0, 0, 1]];
    G.ships.forEach((o, i) => { if (!i) { o.x = 0; o.y = 0; o.ang = 0.3; return; } const an = i * 2.2 + 0.2; o.x = Math.cos(an) * 175; o.y = Math.sin(an) * 175; o.lv = kits[i - 1]; o.rad = radOf(o.lv); o.hpMax = o.hp = 800; o.sh = o.shMax = 90; });
    me.lv = [3, 3, 3, 3, 1, 2, 2, 0, 2, 2, 0, 0, 0]; me.rad = radOf(me.lv); me.sh = me.shMax = 120;
    G.players.forEach((p, i) => { if (i) p.bot = false; });   // hold the enemies in place so the shot has a fight in it
  }
  G.ships.forEach(o => { while (o.lv.length < NP) o.lv.push(0); o.rad = radOf(o.lv); });
  const scene = (location.search.match(/[?&]scene=(\w+)/) || [])[1];
  if (scene) {   // debug / screenshot scenes: ?demo&scene=fleet | hazard | flare
    const out = G.neut.find(n => n.type === 7), hz = G.haz[0];
    me.lv[CLK] = 3; me.lv[ARC] = 3; me.lv[AEG] = 3; me.br[ARC] = 1; me.sk = [ARC, AEG, CLK]; me.cd.fill(0); me.pending = 2; me.level = 9; me.scrap = 400; makeOffers(me); me.lv[MIS] = 3; me.lv[TOR] = 3; makeOffers(me);
    if (scene === 'hazard' && hz) { me.x = hz.x - hz.r * 0.6; me.y = hz.y; }
    else if (out) { me.x = out.x - 150; me.y = out.y + 70; }
    G.players.forEach((p, i) => { if (i) p.bot = false; });
    ECLS.forEach((_, c) => addEscort(me, c));
    if (scene === 'flare') G.flare = 4;
    G.fields.push({ x: me.x + 200, y: me.y - 120, r: 230, life: 60, max: 60, o: 0, k: 0, br: 0, lvl: 2 });
    G.ships[1].x = me.x + 380; G.ships[1].y = me.y + 40; G.ships[1].cloak = 99; G.ships[0].aegis = 99;
  }
}
