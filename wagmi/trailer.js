// Gen Z Quant: the cold open. A 44 s trailer, live in the engine, between "Tap to start" and the opening: cut on the
// beat of the game's own "Pump & Dump" (140 BPM, assets/music/wagmi-pump.m4a, MIT), letterboxed and graded, then the
// opening (wagmi/intro.js) from its first frame exactly as before. Hold to skip it at any moment (the cutscenes' own
// skip: Space or Enter held, a long press anywhere, the pad's A).
//   ?trailer=0  without it        ?trailer=only  it alone, held on the title at the end (for looking at it)
//   ?nointro, ?nogate and every ?m.. switch leave it out with the opening.
// The shots (docs: .scratch/trailer-intro/shotlist.md):
//   1 black, a phone buzzing: IT STARTED AS A JOKE.     2 an aerial over Midtown at dusk to the Empire State
//   3-6 the opening's own set and cast (its frame at a time, its cameras): Moon and Quant out of his door, IT PUMPED. /
//     IT DUMPED. over a coin's chart, the van swinging in        7-11 the grab, ZK in his ring light ('You pay my
//   community back.', his recorded voice), the shove, the van tearing off        12-26 the drop: the
//   five nozzles lighting on the boom, the launch past a lens on the asphalt, the burn alongside, a drift into 28th St, a
//   drift close up (the wheels counter-steered, the smoke), the hop, the fight in Washington Square Park, the takedown, the
//   rail at a sprint, his face ('Okay.'), a drift out of 27th St that ends on the boost up Fifth Ave (on the hook's new
//   phrase), the burn chased, the car straight at the lens        27 THEY TOOK HIS DOG.
//   28 the logo slam over the car at rest: GEN Z QUANT / WE'RE ALL GONNA MAKE IT
// The drifts are puppets (the car has no drift of its own): a path (a straight, a quarter circle, a straight), its
// heading the path's plus a slip angle, the fronts counter-steered, the body rolled out, tyre smoke (the cold-gas vapour's
// puffs, grey) at the rear wheels. The booster's speed kick: the lens punched wider, a buzz, streaks round the frame.
// Everything in it is a function of its clock (the music's: the context's time), so every cut lands on its beat however
// slow the frame. Only what the game already has: the music file and one voice line (both the game's own), the
// opening's cast, the car, Quant's and the Degens' clips; the park and the avenue are the city's; the car's own boost
// sound (its whump, a rocket's roar under the burns) and the cutscenes' tyre squeal.
//   const tr = createTrailer(W)  (installed by intro.js; null when it is left out);  tr.cover();  await tr.play(borrow)
import * as THREE from 'three/webgpu';
import { createVapor } from './pursuit/vapor.js';
import { keys, rig, clamp, smooth, lerp, ease, handheld } from './mission/cine.js';

const Q = new URLSearchParams(location.search);
const PI = Math.PI;
const BPM = 140, BEAT = 60 / BPM, BAR = 4 * BEAT;
const B = (b) => b * BAR;
const MUSIC = 'assets/music/wagmi-pump.m4a', ZKV = 'assets/voice/intro-zk-you-pay-my-community.m4a';
// the music's edit, on its bar lines (the chord loop kept): [trailer bar, the track's bar, bars]
// (v2: the drop two bars longer, the hook running on to its bar 58; the silent card after it)
const EDIT = [[0, 0, 8], [8, 24, 2], [10, 46, 2], [12, 48, 10], [23, 64, 2.5]];
const DROP = 12, CARD = 22, LOGO = 23, END = B(25.5);
// ZK's line: its first sentence only (0-1.55 s of the file), over the build
const ZK_AT = B(10) + 0.1, ZK_LEN = 1.55;
const WHITE = '#FFFFFF', ACID = '#B6FF3B', GOLD = '#FFC93C';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// who it plays for: not with ?trailer=0, ?nointro, ?nogate or a mission switch; 'only' for ?trailer=only
export function trailerMode() {
  const v = (Q.get('trailer') || '').toLowerCase();
  if (v === '0' || v === 'off' || v === 'no' || v === 'false') return null;
  if (Q.has('nointro') || Q.has('nogate') || [...Q.keys()].some((k) => /^m\d/.test(k))) return null;
  return v === 'only' ? 'only' : 'on';
}

/* ------------------------------------------------------------ the music -- */
// fetched and decoded while the city loads (an offline context: no sound before the tap), then cut to the trailer's
// own soundtrack in one buffer: the edit, short fades at each join, the voice laid in with the music dipped under it
function loadSound() {
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AC || /[?&]noaudio\b/.test(location.search)) return Promise.resolve(null);
  const get = (url) => fetch(url, { priority: 'low' }).then((r) => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); });
  const dec = (ab) => new Promise((res, rej) => { const c = new AC(2, 1, 44100); const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
  return Promise.all([get(MUSIC).then(dec), get(ZKV).then(dec).catch(() => null)]).then(([mus, zk]) => {
    const sr = mus.sampleRate, n = Math.ceil(END * sr), ch = Math.min(2, mus.numberOfChannels);
    const out = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: sr });
    const L = out.getChannelData(0), R = out.getChannelData(1);
    const fadeN = Math.round(0.006 * sr);
    for (const [at, from, bars] of EDIT) {
      const o = Math.round(B(at) * sr), s = Math.round(B(from) * sr), len = Math.min(Math.round(B(bars) * sr), n - o);
      for (let c = 0; c < 2; c++) {
        const src = mus.getChannelData(Math.min(c, ch - 1)), dst = c ? R : L;
        for (let i = 0; i < len; i++) {
          let g = 1; if (i < fadeN) g = i / fadeN; else if (len - i < fadeN) g = (len - i) / fadeN;
          dst[o + i] = src[s + i] * g;
        }
      }
    }
    // the logo's bar faded out over its last 1.4 s
    const f0 = Math.round((END - 1.4) * sr);
    for (let i = f0; i < n; i++) { const g = Math.pow(1 - (i - f0) / (n - f0), 1.6); L[i] *= g; R[i] *= g; }
    if (zk) {
      // the music dipped under him, his line over it
      const a = Math.round(ZK_AT * sr), len = Math.round(ZK_LEN * sr), zc = zk.numberOfChannels;
      const duck = (i) => { const k = (i - a) / sr; return 1 - 0.42 * clamp(Math.min((k + 0.08) / 0.08, (ZK_LEN + 0.15 - k) / 0.15)); };
      for (let i = a - Math.round(0.1 * sr); i < a + len + Math.round(0.2 * sr); i++) { if (i < 0 || i >= n) continue; const d = duck(i); L[i] *= d; R[i] *= d; }
      for (let c = 0; c < 2; c++) {
        const src = zk.getChannelData(Math.min(c, zc - 1)), dst = c ? R : L;
        for (let i = 0; i < len && a + i < n; i++) { const g = i > len - 0.08 * sr ? (len - i) / (0.08 * sr) : 1; dst[a + i] += src[i] * 1.15 * g; }
      }
    }
    return out;
  }).catch((e) => { console.warn('[trailer] no music', e); return null; });
}

/* ------------------------------------------------------------ the page -- */
const CSS = `
#wg-tr { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; font-family: 'Barlow Condensed', system-ui, sans-serif; color: #fff; }
#wg-tr .vig { position: absolute; inset: 0; background: radial-gradient(130% 100% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,.5) 100%); opacity: 0; transition: opacity .6s; }
#wg-tr.on .vig { opacity: 1; }
#wg-tr .blk { position: absolute; inset: -2px; background: #000; opacity: 0; }
#wg-tr .flash { position: absolute; inset: 0; background: #fff; opacity: 0; mix-blend-mode: normal; }
#wg-tr .shade { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(3,6,12,.78) 0%, rgba(3,6,12,.35) 40%, rgba(3,6,12,0) 66%); opacity: 0; }
#wg-tr .card { position: absolute; left: 0; right: 0; top: 50%; text-align: center; opacity: 0; transform: translateY(-50%); }
#wg-tr .card .t { font: 700 clamp(26px, 4.4vw, 60px)/1 'Barlow Condensed'; letter-spacing: .26em; padding-left: .26em; white-space: nowrap; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
#wg-tr .card .r { width: clamp(56px, 7vw, 96px); height: 3px; background: ${GOLD}; margin: clamp(12px, 1.8vw, 22px) auto 0; transform: scaleX(0); }
#wg-tr .chart { position: absolute; left: 8%; right: 8%; top: calc(var(--bar) + 6%); bottom: calc(var(--bar) + 8%); opacity: 0; }
#wg-tr .chart svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
#wg-tr .chart .tick { position: absolute; right: 0; top: 0; font: 700 clamp(15px, 2vw, 26px)/1 'Barlow Condensed'; letter-spacing: .08em; padding: .3em .55em .25em; border-radius: 4px; background: rgba(8,10,14,.62); }
#wg-tr .big { position: absolute; left: 0; right: 0; bottom: calc(var(--bar) + 7%); text-align: center; font: italic 800 clamp(44px, 9.5vw, 132px)/.9 'Barlow Condensed'; letter-spacing: .01em; white-space: nowrap; opacity: 0; text-shadow: 0 6px 30px rgba(0,0,0,.6), 0 2px 3px rgba(0,0,0,.5); }
#wg-tr .logo { position: absolute; left: 0; right: 0; top: 50%; text-align: center; opacity: 0; transform: translateY(-58%); }
#wg-tr .logo .l { font: italic 800 clamp(58px, 12.5vw, 190px)/.86 'Barlow Condensed'; letter-spacing: .01em; white-space: nowrap; text-shadow: 0 8px 40px rgba(0,0,0,.7), 0 3px 0 rgba(0,0,0,.35); }
#wg-tr .logo .l b { color: ${GOLD}; font-weight: 800; }
#wg-tr .logo .r { width: clamp(90px, 13vw, 180px); height: 4px; background: ${GOLD}; margin: clamp(14px, 2vw, 26px) auto 0; transform: scaleX(0); }
#wg-tr .logo .g { margin-top: clamp(12px, 1.7vw, 22px); font: 700 clamp(14px, 2vw, 28px)/1 'Barlow Condensed'; letter-spacing: .34em; padding-left: .34em; white-space: nowrap; opacity: 0; text-shadow: 0 2px 10px rgba(0,0,0,.85); }
#wg-tr .spd { position: absolute; left: 0; right: 0; top: var(--bar, 0px); bottom: var(--bar, 0px); overflow: hidden; }
#wg-tr .spd i { position: absolute; inset: 0; opacity: 0; -webkit-mask-image: radial-gradient(closest-side, transparent 58%, rgba(0,0,0,.5) 82%, #000 112%); mask-image: radial-gradient(closest-side, transparent 58%, rgba(0,0,0,.5) 82%, #000 112%); }
body.wg-trailer #wg .wg-bar { transition: none; }
`;
// the speed streaks: thin white lines out from the middle of the frame, irregular (seeded), two sets flickered between
const STREAKS = [3, 11].map((seed) => {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const st = []; let a = 0;
  while (a < 356) { const w = 0.12 + rnd() * 0.32, al = (0.25 + rnd() * 0.6).toFixed(2); a += 2.2 + rnd() * 6.5; if (a + w > 359) break;
    st.push(`rgba(255,255,255,0) ${a.toFixed(2)}deg`, `rgba(255,255,255,${al}) ${(a + w * 0.5).toFixed(2)}deg`, `rgba(255,255,255,0) ${(a + w).toFixed(2)}deg`); }
  return `conic-gradient(from ${(seed * 7) % 360}deg, rgba(255,255,255,0) 0deg, ${st.join(', ')}, rgba(255,255,255,0) 360deg)`;
});
function buildPage() {
  if (!document.getElementById('wg-tr-css')) { const st = document.createElement('style'); st.id = 'wg-tr-css'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.id = 'wg-tr';
  root.innerHTML = `<div class="vig"></div><div class="shade"></div><div class="blk"></div>
<div class="chart"><svg viewBox="0 0 1000 420" preserveAspectRatio="none"><defs><linearGradient id="wgTrUp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ADE80" stop-opacity=".38"/><stop offset="1" stop-color="#4ADE80" stop-opacity="0"/></linearGradient></defs>
<path class="area" fill="url(#wgTrUp)" d=""/><path class="up" fill="none" stroke="#4ADE80" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" d=""/><path class="down" fill="none" stroke="#EF4444" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" d=""/></svg><div class="tick"></div></div>
<div class="spd"><i></i><i></i></div>
<div class="big"></div>
<div class="card"><div class="t"></div><div class="r"></div></div>
<div class="logo"><div class="l">GEN Z <b>QUANT</b></div><div class="r"></div><div class="g">WE'RE ALL GONNA MAKE IT</div></div>
<div class="flash"></div>`;
  (document.getElementById('wg') || document.body).appendChild(root);
  root.querySelectorAll('.spd i').forEach((el, i) => { el.style.background = STREAKS[i]; });
  const $ = (s) => root.querySelector(s);
  return { root, vig: $('.vig'), shade: $('.shade'), chart: $('.chart'), area: $('.chart .area'), up: $('.chart .up'), down: $('.chart .down'), tick: $('.chart .tick'), big: $('.big'), card: $('.card'), cardT: $('.card .t'), cardR: $('.card .r'), logo: $('.logo'), logoL: $('.logo .l'), logoR: $('.logo .r'), logoG: $('.logo .g'), flash: $('.flash'), blk: $('.blk'), spd: [...root.querySelectorAll('.spd i')] };
}
// the coin's chart: a jagged climb (seeded), then the cliff
const CHART = (() => {
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pts = []; let y = 360;
  for (let i = 0; i <= 40; i++) { const x = i * 18; const k = i / 40; y = 380 - 330 * Math.pow(k, 2.2) + (rnd() - 0.5) * 34 * (0.4 + k); pts.push([x, Math.min(400, Math.max(18, y))]); }
  pts[pts.length - 1][1] = 22;
  const down = [[720, 22], [744, 120], [760, 96], [790, 300], [806, 268], [840, 392], [1000, 404]];
  const d = (p) => 'M' + p.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join(' L');
  return { up: d(pts), area: d(pts) + ' L720 420 L0 420 Z', down: d(down), upLen: 1400, downLen: 700 };
})();

export function createTrailer(W) {
  const mode = trailerMode();
  if (!mode) return null;
  const soundP = loadSound();
  let page = null;
  const T = { mode, sound: null, soundP };
  soundP.then((b) => { T.sound = b; });
  // black at once on the start's tap (the opening's first frame and the gate's logo under it until the trailer plays)
  T.cover = () => {
    if (!page) page = buildPage();
    page.blk.style.opacity = '1'; page.root.classList.add('on'); document.body.classList.add('wg-trailer');
    W.ui?.gameTitle(false, true);
  };
  T.play = (borrow) => play(W, T, borrow, () => page || (page = buildPage()));
  return T;
}

/* ------------------------------------------------------------- the film -- */
async function play(W, T, borrow, getPage) {
  const app = W.app, cm = app.controllerManager, cs = app.cameraSystem, ui = W.ui, sfx = W.sfx, D = borrow.D;
  const P = W.person, Qn = W.quant, car = W.car, rs = car.roadster, C = W.cast;
  const pg = getPage();
  T.cover();
  ui.gameTitle(false, true); ui.sub(null);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // the music: up to 8 s more for it after the tap (the first card holds on black meanwhile); without it the clock is
  // the page's own
  const actx = W.audio?.ctx || null;
  if (!T.sound && actx) await Promise.race([T.soundP, sleep(8000)]);
  const N = window.NYC;
  const X5 = N?.avenueX ? N.avenueX('5') : 0.4;
  const grade = app.postFX?.colorGrade;

  /* ---- the cast of the trailer's own shots */
  // Quant's clips (copies: actions of their own on his mixer, put away after), the Degens' (Gwei and Wick, the opening's
  // spare two: the missions set them again when they need them)
  const qc = (n) => { const a = Qn.clips.includes(n) ? Qn.act(n) : null; return a ? a.getClip().clone() : null; };
  const QCL = {}; for (const n of ['sprint', 'run', 'fight', 'guard', 'ffJab', 'ffCross', 'ffHook', 'ffKick', 'ffLeap', 'ffAirHold', 'idle', 'jog']) { const c = qc(n); if (c) QCL[n] = c; }
  const qRig = rig(Qn.mixer, QCL);
  // (every bone of his and of the two Degens as the opening left them, put back after: the mixer writes a bone only
  // when its value changes, so a pose of the trailer's could otherwise outlive it in a bone the opening never moves)
  const snap = (root) => { const L = []; root?.traverse((o) => { if (o.isBone) L.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); }); return () => { for (const [o, p, q, sc] of L) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); } }; };
  const unsnap = [snap(Qn.body), snap(C?.gwei?.inner), snap(C?.wick?.inner)];
  const thugs = [];
  const degen = (d) => {
    if (!d) return null;
    const cl = {}; for (const [k, c] of Object.entries(C.thugClips || {})) cl[k] = c.clone();
    const r = rig(d.mixer, cl); thugs.push({ d, r }); return { d, r };
  };
  const gwei = degen(C?.gwei), wick = degen(C?.wick);
  const vapor = createVapor(app.scene);
  // (the drifts' tyre smoke: puffs of its own, so a drift's never take the hop's)
  const smoke = createVapor(app.scene);
  // (the car's own idle step put aside: its thrust and wheels are the trailer's while it plays. kick: the burn lit at
  // once on an ignition, not eased in. The glow the burn throws on the road and the tail reaches further meanwhile)
  const carIdle0 = W.carIdle;
  let carState = { speed: 0, cold: 0, burn: 0, steer: 0 }, kick = false;
  let glowL = null; rs.group?.traverse((o) => { if (o.isPointLight && o.position.z < -2) glowL = o; });
  const glowD0 = glowL ? glowL.distance : 0; if (glowL) glowL.distance = 11;
  W.carIdle = (dt) => {
    rs.setThrust(carState.cold, carState.burn);
    if (kick) { kick = false; rs.update(1, 0, carState.steer); }
    rs.update(dt, carState.speed, carState.steer);
    if (glowL) glowL.intensity *= 2.2;
  };

  /* ---- where */
  const ground = (x, z, k = 'person') => cm.getGroundHeight(x, z, k);
  const LANE = X5 - 3.4;                       // 5th Ave, northbound (heading PI: -z)
  // Washington Square Park: the low iron rail along the west side of the path from the arch to the fountain (x -16.7,
  // z 2802-2859), cleared west to east off the lawn; the fight on the fountain's plaza
  const FENCE = { x: -16.7, z: 2836, top: 0.91 };
  const FIGHT = { x: -6.5, z: 2866 };
  // the drifts: 5th Ave north into 28th St west (a left), and 27th St west into 5th Ave north (a right), then the burn
  const Z28 = N?.streetZ ? N.streetZ(28) : 1117.1, Z27 = N?.streetZ ? N.streetZ(27) : 1195.8;

  /* ---- the shots: [from bar, to bar, kind, params] */
  const S = [
    { a: 0, b: 2, kind: 'black' },
    { a: 2, b: 4, kind: 'aerial' },
    { a: 4, b: 5, kind: 'open', t0: 11.4 },
    { a: 5, b: 6, kind: 'open', t0: 15.0, chart: 'up' },
    { a: 6, b: 7, kind: 'open', t0: 19.0, chart: 'down' },
    { a: 7, b: 8, kind: 'open', t0: 21.55 },
    { a: 8, b: 9, kind: 'open', t0: 25.0 },
    { a: 9, b: 10, kind: 'open', t0: 33.45 },
    { a: 10, b: 11, kind: 'open', t0: 65.0, rate: 0.9 },
    { a: 11, b: 11.5, kind: 'open', t0: 36.0 },
    { a: 11.5, b: 11.875, kind: 'open', t0: 39.25 },
    // (the stop: the tail in the dark; the drop: the five light)
    { a: 11.875, b: 12.5, kind: 'ignite' },
    { a: 12.5, b: 13, kind: 'launch' },
    { a: 13, b: 14, kind: 'burn' },
    { a: 14, b: 15, kind: 'driftA' },
    { a: 15, b: 15.5, kind: 'driftB' },
    { a: 15.5, b: 16.5, kind: 'hop' },
    { a: 16.5, b: 17.5, kind: 'fight' },
    { a: 17.5, b: 18.5, kind: 'takedown' },
    { a: 18.5, b: 19, kind: 'fence' },
    { a: 19, b: 19.5, kind: 'open', t0: 60.0 },
    { a: 19.5, b: 20.5, kind: 'driftC' },
    { a: 20.5, b: 21.5, kind: 'chase' },
    { a: 21.5, b: 22, kind: 'headOn' },
    { a: CARD, b: LOGO, kind: 'black' },
    { a: LOGO, b: 25.5, kind: 'logo' },
  ];
  for (const s of S) { s.A = B(s.a); s.Bt = B(s.b); }
  const shotAt = (t) => { let s = S[0]; for (const x of S) if (x.A <= t) s = x; return s; };
  const dusk = (s) => !(s.kind === 'open' || s.kind === 'black');

  /* ---- the cues: once each as the clock passes them */
  const play1 = (name, o) => { try { sfx.play(name, o); } catch {} };
  const CUES = [
    [0.35, () => play1('buzz', { gain: 0.22, times: 2 })],
    [B(7) + 0.05, () => play1('squeal', { gain: 0.32, dur: 1.5, p: 0.3 })],
    [B(8) + 0.12, () => play1('doorSlide', { gain: 0.7 })],
    [B(9) + 0.62, () => play1('yelp', { gain: 0.4, n: 3 })],
    [B(10) + 0.05, () => ui.sub('ZK', 'You pay my community back.', ACID)],
    [B(11) - 0.05, () => ui.sub(null)],
    [B(11) + 0.06, () => { play1('shove', { gain: 0.8 }); play1('hit', { gain: 0.45 }); play1('grunt', { gain: 0.5, f0: 165, vowel: 'o' }); }],
    [B(11.5) + 0.02, () => play1('squeal', { gain: 0.4, dur: 1.0, p: -0.2 })],
    // the drop: the car's own whump as the five light; the launch past the lens; the drifts' squeal; the boost out of the
    // last one on the hook's new phrase
    [B(DROP), () => W.audio?.play?.('boostIgnite', { vol: 1 })],
    [B(12.5) + 0.27, () => W.audio?.play?.('whoosh', { vol: 1, rate: 1.35 })],
    [B(14) + 0.3, () => play1('squeal', { gain: 0.36, dur: 1.4, p: -0.25 })],
    [B(15) + 0.02, () => play1('squeal', { gain: 0.3, dur: 0.85, p: 0.2 })],
    [B(15.5) + 0.32, () => W.audio?.play?.('whoosh', { vol: 0.7, rate: 0.75 })],
    [B(16.5) + 0.33, () => play1('hit', { gain: 0.5 })],
    [B(16.5) + 0.8, () => play1('hit', { gain: 0.6 })],
    [B(17.5) + 0.36, () => { play1('hit', { gain: 0.8 }); play1('grunt', { gain: 0.5, f0: 105 }); }],
    [B(17.5) + 1.2, () => play1('fall', { gain: 0.7 })],
    [B(19.5) + 0.02, () => play1('squeal', { gain: 0.38, dur: 1.0, p: 0.15 })],
    [B(20), () => W.audio?.play?.('boostIgnite', { vol: 1 })],
    [B(21.5) + 0.3, () => W.audio?.play?.('whoosh', { vol: 0.85, rate: 1.2 })],
    [B(CARD) + 0.02, () => play1('thunk', { gain: 0.55, f: 52 })],
    [B(LOGO), () => play1('thunk', { gain: 0.6, f: 70 })],
  ].sort((a, b) => a[0] - b[0]);
  let cueAt = 0;

  /* ---- the clock: the music's, smoothed onto the page's (the context's time moves in steps) */
  let t0Audio = 0, src = null, clockP = 0, perf0 = 0, ran = false;
  const lat = () => (actx ? (actx.outputLatency || 0) + (actx.baseLatency || 0) : 0);
  function startClock() {
    perf0 = performance.now();
    if (T.sound && actx) {
      try {
        src = actx.createBufferSource(); src.buffer = T.sound;
        const g = actx.createGain(); g.gain.value = 0.92; src.connect(g); g.connect(W.audio.bus?.master || actx.destination);
        src._g = g;
        t0Audio = actx.currentTime + 0.06; src.start(t0Audio);
      } catch (e) { console.warn('[trailer] music', e); src = null; }
    }
  }
  function clock() {
    const tp = (performance.now() - perf0) / 1000 - 0.06;
    if (src && actx.state !== 'running') {
      // (held while the sound is: a hidden tab. A context that never got going (no unlock) is let go after 0.8 s and the
      // page's clock carries the pictures on alone, rather than black for ever)
      if (ran || tp < 0.8) return clockP;
      try { src.stop(); } catch {} src = null;
    }
    if (!src) { clockP = tp; return clockP; }
    ran = true;
    const ta = actx.currentTime - t0Audio - lat();
    // (between the context's steps the page's time carries it; held to the music's)
    clockP = Math.abs(ta - clockP) > 0.12 ? ta : clockP + (ta - clockP) * 0.2;
    return clockP;
  }
  let lastP = performance.now();

  /* ---- the frame */
  const cam = D.camera;
  const setCam = (pos, look, fov, o = {}) => { cam.pos = pos; cam.look = look; cam.fov = fov; cam.roll = o.roll || 0; cam.band = o.band !== false; cam.shake = o.shake ? handheld(clockP * (o.rate || 1.3), o.shake) : null; };
  let cur = null, last = -1, timeOf = null;
  const lookOf = { golden: { bal: [1.06, 1.0, 0.92], sat: 1.12, con: 1.16 }, dusk: { bal: [0.93, 1.0, 1.1], sat: 1.12, con: 1.14 } };
  function look(kind, exp) {
    if (!grade) return;
    const L = lookOf[kind];
    if (exp != null) grade.exposure.value = exp;
    grade.balance.value.set(...L.bal); grade.saturation.value = L.sat; grade.contrast.value = L.con;
  }
  function setTime(id) { if (timeOf === id) return; timeOf = id; app.selectTime?.(id); }
  // (the opening's set and cast away for a shot of the trailer's own; Quant's bones back to the opening's clean pose)
  let borrowed = false;
  function own() { if (borrowed) { borrowed = false; borrow.off(); } }
  function unOwn() { // Quant's and the Degens' own clips out (weights), the opening's set back to its frame
    for (const a of Qn.mixer._actions) if (qRig.owns(a)) a.setEffectiveWeight(0);
    for (const { d } of thugs) d.root.visible = false;
    borrowed = true;
  }
  // Quant on foot at (x, z), facing h, posed by the trailer's clips at its time u
  function quant(x, z, h, y = null) {
    P.position.set(x, y ?? ground(x, z), z); P.heading = h; P.speed = 0; P.verticalVel = 0; P.inVehicle = false;
    P.mesh.position.copy(P.position); P.mesh.rotation.y = h; P.mesh.visible = true;
    for (const a of Qn.mixer._actions) if (!qRig.owns(a)) a.setEffectiveWeight(0);
  }
  function qPose(u) { Qn.body.position.y = 0; Qn.body.rotation.x = 0; qRig.pose(u); P.mesh.updateMatrixWorld(true); }
  function thug(o, x, z, h, u, vis = true) {
    if (!o) return; const d = o.d;
    d.root.visible = vis; if (!vis) return;
    d.root.position.set(x, ground(x, z), z); d.root.rotation.set(0, h, 0);
    for (const a of d.mixer._actions) if (!o.r.owns(a)) a.setEffectiveWeight(0);
    o.r.pose(u);
  }
  function carPose(x, z, h, o = {}) {
    car.position.set(x, ground(x, z, 'car') + (o.y || 0), z); car.heading = h; car.speed = 0; car.vx = car.vz = 0;
    car.mesh.position.copy(car.position); car.mesh.rotation.set(0, h, o.roll || 0); car.mesh.visible = true;
    carState = { speed: o.speed || 0, cold: o.cold || 0, burn: o.burn || 0, steer: o.steer || 0 };
  }
  const carAt = (x, z, h, y = 0, speed = 0, cold = 0, burn = 0, steer = 0) => carPose(x, z, h, { y, speed, cold, burn, steer });
  // a point in the car's frame: f forward, r right, u up (relP: in the frame of a pose at x, ground y0, z, heading h)
  const relP = (x, y0, z, h, f, r, u) => { const fx = Math.sin(h), fz = Math.cos(h); return [x + fx * f - fz * r, y0 + u, z + fz * f + fx * r]; };
  const rel = (f, r, u) => relP(car.position.x, car.position.y, car.position.z, car.heading, f, r, u);
  // the speed kick: the lens punched wider at `at`, settling back part way
  const punch = (u, at, amt) => amt * (smooth((u - at) / 0.06) - 0.5 * smooth((u - at - 0.06) / 0.55));
  const fx = { spd: 0 };
  // a drift (sp): a straight up to the arc's start (x0, z0, heading h0), a quarter circle of radius R turning dir (1 left,
  // -1 right), a straight on; v m/s (and acc from ign: the boost out of the corner); s at t = 0 is pre. Its heading the
  // path's plus a slip angle (slip, built over on, let go over off), the fronts turned in, then counter-steered against
  // the slide, the body rolled to the outside
  function drift(sp, t) {
    const dI = Math.max(0, t - (sp.ign ?? Infinity)), acc = sp.acc || 0;
    const s = sp.pre + sp.v * t + 0.5 * acc * dI * dI, v = sp.v + acc * dI;
    const L = sp.R * PI / 2, d = sp.dir;
    const left = (h) => [Math.cos(h), -Math.sin(h)];
    let x, z, hv;
    if (s < 0) { x = sp.x0 + Math.sin(sp.h0) * s; z = sp.z0 + Math.cos(sp.h0) * s; hv = sp.h0; }
    else {
      const l0 = left(sp.h0), cx = sp.x0 + d * sp.R * l0[0], cz = sp.z0 + d * sp.R * l0[1];
      hv = sp.h0 + d * Math.min(s, L) / sp.R;
      const l = left(hv); x = cx - d * sp.R * l[0]; z = cz - d * sp.R * l[1];
      if (s > L) { x += Math.sin(hv) * (s - L); z += Math.cos(hv) * (s - L); }
    }
    const env = smooth((t - sp.on[0]) / (sp.on[1] - sp.on[0])) * (1 - smooth((t - sp.off[0]) / (sp.off[1] - sp.off[0])));
    const turnIn = smooth((t - (sp.on[0] - 0.22)) / 0.16);
    return { x, z, hv, dir: d, h: hv + d * sp.slip * env, v, env, steer: lerp(d * 0.55 * turnIn, -d * 0.95, env), roll: d * 0.045 * env };
  }
  const DR = 9.5;
  const DRIFT_A = { x0: LANE, z0: Z28 + DR, h0: PI, dir: 1, R: DR, v: 17, pre: -6.2, on: [0.2, 0.52], off: [1.22, 1.62], slip: 0.62 };
  const DRIFT_C = { x0: LANE + DR, z0: Z27 + 1.2, h0: 1.5 * PI, dir: -1, R: DR, v: 16, pre: -2.6, on: [-0.1, 0.16], off: [0.86, 1.3], slip: 0.66, ign: B(20) - B(19.5), acc: 24 };
  // tyre smoke: grey puffs at the rear wheels (a few at the fronts) while it slides, left behind on the road, rising
  let smokeAcc = 0;
  const _w = new THREE.Vector3();
  function tyreSmoke(d, dt, rate = 1) {
    if (!(dt > 0) || d.env < 0.15) return;
    smokeAcc += Math.min(dt, 0.1) * 30 * d.env * rate;
    const n = Math.floor(smokeAcc); if (!n) return; smokeAcc -= n;
    car.mesh.updateMatrixWorld(true);
    // (left on the road as the car slides on, and thrown out to the outside of the turn)
    const vx = Math.sin(d.hv) * d.v, vz = Math.cos(d.hv) * d.v, g = car.position.y, ox = -Math.cos(d.hv) * d.dir, oz = Math.sin(d.hv) * d.dir;
    for (const w of rs.wheels || []) {
      if (w.front && Math.random() < 0.7) continue;
      w.W.getWorldPosition(_w);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * PI * 2, sp = 0.5 + Math.random() * 1.8;
        smoke.puff(_w.x + (Math.random() - 0.5) * 0.35, g + 0.2 + Math.random() * 0.15, _w.z + (Math.random() - 0.5) * 0.35,
          vx * 0.14 + Math.sin(a) * sp + ox * (2 + Math.random() * 3), 0.4 + Math.random() * 0.9, vz * 0.14 + Math.cos(a) * sp + oz * (2 + Math.random() * 3),
          { r: 0.34, grow: 3.4, life: 0.9 + Math.random() * 0.6, a: 0.34, k: 0.42, drag: 1.8, lift: 0.8 });
      }
    }
  }
  const puffs = { last: -1 };
  function hopPuffs(kind) {
    const b = car.body || { hx: 1.05, z0: -2.3, z1: 2.4 }, h = car.heading, fx = Math.sin(h), fz = Math.cos(h), v = carState.speed;
    if (kind === 'up') for (const [lx, lz] of [[b.hx - 0.25, b.z1 - 0.5], [-(b.hx - 0.25), b.z1 - 0.5], [b.hx - 0.25, b.z0 + 0.45], [-(b.hx - 0.25), b.z0 + 0.45]]) {
      const x = car.position.x + lx * Math.cos(h) + lz * fx, z = car.position.z - lx * Math.sin(h) + lz * fz;
      for (let i = 0; i < 6; i++) { const a = Math.random() * PI * 2, sp = 3 + Math.random() * 5; vapor.puff(x, car.position.y + 0.25, z, fx * v * 0.35 + Math.sin(a) * sp, -1 + Math.random() * 1.5, fz * v * 0.35 + Math.cos(a) * sp, { r: 0.22, grow: 3.2, life: 0.9 + Math.random() * 0.5, a: 0.5, drag: 3.2 }); }
    }
    if (kind === 'side') { // the left flank's ports, out to the right... the car shoved left: the jets out of its right side
      for (const lz of [b.z1 - 0.9, b.z0 + 0.8]) {
        const lx = -(b.hx + 0.05), x = car.position.x + lx * Math.cos(h) + lz * fx, z = car.position.z - lx * Math.sin(h) + lz * fz, rx = -Math.cos(h), rz = Math.sin(h);
        for (let i = 0; i < 12; i++) { const k = i / 11, out = 0.15 + k * 1.6, sp = 4 + Math.random() * 5; vapor.puff(x + rx * out, car.position.y + 0.45, z + rz * out, fx * v * 0.85 + rx * sp, (Math.random() - 0.3) * 1.6, fz * v * 0.85 + rz * sp, { r: 0.2 + k * 0.22, grow: 2.6, life: 0.55 + Math.random() * 0.45, a: 0.62 * (1 - k * 0.45), drag: 3.5 }); }
      }
    }
  }

  // each kind's frame at its own time u (s since the cut)
  const K = {
    black(u) { },
    aerial(u, s) {
      // dusk over Midtown: from over Murray Hill, a long climbing sweep west and round to the Empire State, lit
      const k = ease.inOut(u / (s.Bt - s.A));
      const pos = [lerp(230, 70, k), lerp(95, 150, k), lerp(330, 470, k)];
      const look = [lerp(-40, -80, k), lerp(150, 250, k), lerp(640, 686, k)];
      setCam(pos, look, lerp(46, 40, k), { band: false, roll: lerp(0.05, -0.02, k) });
      P.mesh.visible = false;
    },
    ignite(u, s) {
      // the stop: the tail in the dark, the lens low at its quarter; the boom: the five light at once, the street goes
      // orange, and the car leaps away from the lens
      const tB = B(DROP) - s.A, lit = u >= tB, go = Math.max(0, u - tB - 0.28);
      if (lit && !s.lit) { s.lit = true; kick = true; }
      const ZI = 1398, g = ground(LANE, ZI, 'car');
      carPose(LANE, ZI - 15 * go * go, PI, { speed: 30 * go, cold: lit && u < tB + 0.18 ? 0.6 : 0, burn: lit ? 1 : 0 });
      setCam(relP(LANE, g, ZI, PI, -4.3 - 0.3 * smooth(u / 1.07), 1.6, 0.42), rel(-2.3, 0.05, 0.5), 30 + punch(u, tB, 9), { shake: lit ? 4 : 0.6, rate: lit ? 9 : 1.3 });
      P.mesh.visible = false;
    },
    launch(u) {
      // a lens on the asphalt by the lane: the car comes at it on the burn and blows past, the lens whipping round after it
      const ZL = 1340, z = ZL + 13 - (26 * u + 20 * u * u), tp = 0.41;
      carPose(LANE, z, PI, { speed: 26 + 40 * u, burn: 1 });
      const g = ground(LANE + 2.1, ZL);
      setCam([LANE + 2.1, g + 0.26, ZL], [LANE + 0.2, g + 0.62, z - 3.2], 34 + punch(u, tp - 0.05, 16), { shake: 2 + 5 * smooth((u - tp + 0.1) / 0.1), rate: 8 });
      fx.spd = 0.85 * smooth((u - tp + 0.12) / 0.12);
      P.mesh.visible = false;
    },
    burn(u) {
      // alongside it on the burn at 55 m/s, low, side on: the plumes streaming off the tail, the road lit under them
      const v = 55, z = 1300 - v * u, k = smooth(u / 1.714);
      carPose(LANE, z, PI, { speed: v, burn: 1 });
      setCam(rel(lerp(0.2, -1.1, k), lerp(5.8, 5.2, k), 0.55), rel(-2.0, 0, 0.6), 42, { shake: 3, rate: 9 });
      fx.spd = 0.55;
      P.mesh.visible = false;
    },
    driftA(u, s, dt) {
      // the lens low in the middle of 5th & 28th, outside the turn: up the avenue, the turn-in, sideways into 28th, the
      // tail swinging out at the lens, the smoke rolling
      const d = drift(DRIFT_A, u);
      carPose(d.x, d.z, d.h, { speed: d.v, steer: d.steer, roll: d.roll });
      tyreSmoke(d, dt);
      const cx = X5 - 1.2, cz = Z28 - 2.1, g = ground(cx, cz);
      setCam([cx, g + 0.42, cz], [car.position.x + 0.3, g + 0.72, car.position.z + 0.4], 36, { shake: 1.6 });
      P.mesh.visible = false;
    },
    driftB(u, s, dt) {
      // riding with it mid-slide, low off its front quarter on the outside: the fronts turned against the slide, the side
      // sweeping back to the rears pouring smoke (the smoke of the turn-in laid down first)
      if (!s.warm) { s.warm = true; for (let t = 0.2; t < 0.5; t += 1 / 30) { const w = drift(DRIFT_A, t); carPose(w.x, w.z, w.h); tyreSmoke(w, 1 / 30); smoke.update(1 / 30); } }
      const d = drift(DRIFT_A, u + 0.5);
      carPose(d.x, d.z, d.h, { speed: d.v, steer: d.steer, roll: d.roll });
      tyreSmoke(d, dt);
      const o = DRIFT_A.dir, fX = Math.sin(d.hv), fZ = Math.cos(d.hv), rX = -fZ * o, rZ = fX * o, g = ground(d.x, d.z);
      setCam([d.x + fX * 4.2 + rX * 2.5, g + 0.95, d.z + fZ * 4.2 + rZ * 2.5], [d.x - fX * 0.9, g + 0.45, d.z - fZ * 0.9], 46, { shake: 2.4, rate: 6 });
      P.mesh.visible = false;
    },
    hop(u) {
      const z0 = 1125, v = 30, z = z0 - v * u, H0 = 0.32;
      const ht = u - H0, y = ht > 0 && ht < 1.112 ? Math.max(0, 8.9 * ht - 8 * ht * ht) : 0;
      const gas = ht > 0 && ht < 0.4 ? 1 : 0;
      carAt(LANE, z, PI, y, v, gas, 0);
      if (ht > 0 && puffs.last < 1) { puffs.last = 1; hopPuffs('up'); }
      if (ht > 1.112 && puffs.last < 2) { puffs.last = 2; W.audio?.play?.('kerb', { vol: 0.8 }); }
      setCam([LANE + 7.4, 1.05, z0 - v * u + 4.6 - 0.6 * u], [car.position.x, 1.0 + y * 0.6, car.position.z - 1.2], 44, { shake: 1 });
      P.mesh.visible = false;
    },
    fight(u) {
      // on the park's path: Quant (his back to the rail) and Gwei, jab, cross, hook; Wick squaring up behind
      const { x, z } = FIGHT, hQ = 0, gz = z + 1.05 + 0.5 * smooth((u - 0.85) / 0.6);
      quant(x, z, hQ);
      if (u === 0 || qRig._k !== 'fight') { qRig._k = 'fight'; qRig.set([[0, 'fight', { fade: 0.01 }], [0.12, 'ffJab', { speed: 1.55, loop: false, from: 0.07, fade: 0.08 }], [0.56, 'ffCross', { speed: 1.5, loop: false, from: 0.06, fade: 0.08 }], [1.06, 'ffHook', { speed: 1.45, loop: false, fade: 0.08 }]]); }
      qPose(u);
      if (gwei && gwei.r._k !== 'fight') { gwei.r._k = 'fight'; gwei.r.set([[0, 'guard', { fade: 0.01 }], [0.28, 'hitReact', { loop: false, fade: 0.05, speed: 1.2 }], [0.72, 'thugStumbleBack', { loop: false, fade: 0.06, speed: 1.3 }], [1.3, 'hitReact', { loop: false, fade: 0.05 }]]); }
      thug(gwei, x, gz, PI, u);
      if (wick && wick.r._k !== 'fight') { wick.r._k = 'fight'; wick.r.set([[0, 'guard', { fade: 0.01 }]]); }
      thug(wick, x + 1.9, z + 2.6, PI + 0.5, u);
      const k = u / 1.714;
      setCam([x + 2.3 - 0.4 * k, ground(x, z) + 0.75, z - 1.6 + 0.3 * k], [x - 0.2, ground(x, z) + 1.25, z + 1.2], lerp(42, 36, k), { shake: 1.6 });
    },
    takedown(u) {
      // the flying kick: Quant off his feet at Wick from four metres, Wick laid out (the impact slowed a touch)
      const { x, z } = FIGHT, z1 = z + 3.4;
      const w = u < 0.45 ? u * 0.85 : u < 1.0 ? 0.3825 + (u - 0.45) * 0.45 : 0.63 + (u - 1.0) * 1.1;   // the speed ramp
      const fly = clamp(w / 0.36), qz = lerp(z, z1 - 0.95, ease.out(fly)), qy = Math.sin(fly * PI) * 0.55;
      quant(x, qz, 0, ground(x, qz) + qy);
      if (qRig._k !== 'take') { qRig._k = 'take'; qRig.set([[0, 'ffLeap', { speed: 1.15, loop: false, fade: 0.01 }], [0.62, 'fight', { fade: 0.25 }]]); }
      qPose(w);
      const hit = 0.3, kb = clamp((w - hit) / 0.5), wz = z1 + 2.2 * ease.out(kb);
      if (wick && wick.r._k !== 'take') { wick.r._k = 'take'; wick.r.set([[0, 'guard', { fade: 0.01 }], [hit, 'thugKnockdown', { loop: false, fade: 0.04, speed: 1.45 }]]); }
      thug(wick, x, wz, PI, w);
      thug(gwei, 0, 0, 0, 0, false);
      const g = ground(x, z);
      setCam([x - 3.6, g + 0.45, lerp(z + 0.6, z + 1.6, smooth(u / 1.714))], [x, g + 1.0, lerp(z + 1.6, z1 + 0.6, smooth(w / 0.6))], 44, { shake: 1.2 });
    },
    fence(u) {
      // a sprint at the rail and over it, his legs tucked under him, on running the way he was
      const v = 7.4, a = 0.3, b2 = 0.66, x0 = FENCE.x - 1.3 - a * v, x = x0 + v * u, z = FENCE.z, k = clamp((u - a) / (b2 - a));
      const y = ground(x, z) + (k > 0 && k < 1 ? Math.sin(k * PI) * 0.62 : 0);
      quant(x, z, PI / 2, y);
      if (qRig._k !== 'fence') { qRig._k = 'fence'; qRig.set([[0, 'sprint', { fade: 0.01 }], [a - 0.04, 'ffAirHold', { fade: 0.1 }], [b2 - 0.02, 'sprint', { fade: 0.12, from: 0.2 }]]); }
      qPose(u);
      const g = ground(FENCE.x, z);
      setCam([FENCE.x - 0.9, g + 0.5, z - 5.6], [lerp(x, FENCE.x, 0.35), g + 0.95, z], 40, { shake: 0.9 });
      thug(gwei, 0, 0, 0, 0, false); thug(wick, 0, 0, 0, 0, false);
    },
    driftC(u, s, dt) {
      // the lens low in 5th Ave below 27th, outside the turn: the car slides out of 27th into the avenue, its tail swinging
      // at the lens; on the hook's new phrase the five light straight down the lens and it rockets off up the avenue
      const d = drift(DRIFT_C, u), tI = DRIFT_C.ign, lit = u >= tI;
      if (lit && !s.lit) { s.lit = true; kick = true; }
      carPose(d.x, d.z, d.h, { speed: d.v, steer: d.steer, roll: d.roll, cold: lit && u < tI + 0.15 ? 0.6 : 0, burn: lit ? 1 : 0 });
      if (!lit) tyreSmoke(d, dt, 0.6);
      const cx = X5 - 6.9, cz = Z27 + 3.2, g = ground(cx, cz), k = smooth((u - tI) / 0.6);
      const aim = [lerp(car.position.x, X5 - 3.4, k), g + lerp(0.7, 1.8, k), lerp(car.position.z, car.position.z - 30, k)];
      setCam([cx, g + 0.8, cz], aim, 40 + punch(u, tI, 12), { shake: lit ? 4 : 1.2, rate: lit ? 9 : 1.3 });
      fx.spd = lit ? 0.6 * smooth((u - tI) / 0.1) * (1 - 0.4 * smooth((u - tI - 0.4) / 0.4)) : 0;
      P.mesh.visible = false;
    },
    chase(u) {
      // the burn, chased: the lens low behind it up 5th, the plumes and the street orange, the Empire State ahead
      const v = 52, z = Z27 - 10 - (v * u + 3 * u * u), k = smooth(u / 1.714);
      carPose(LANE, z, PI, { speed: v, burn: 1 });
      setCam(rel(-lerp(5.6, 4.4, k), 1.3, 0.5), rel(18, 0.1, 1.3), 46 + 4 * k, { shake: 3, rate: 8, roll: lerp(-0.03, 0.02, k) });
      fx.spd = 0.5;
      P.mesh.visible = false;
    },
    headOn(u) {
      const z0 = 1010, v = 50, z = z0 - v * u;
      carAt(LANE, z, PI, 0, v, 1, 0.9);
      const cz = z0 - v * 0.857 - 2.5;
      setCam([LANE + 0.2, 0.42, cz], [car.position.x, 0.7, car.position.z], 34, { shake: 2 });
      P.mesh.visible = false;
    },
    logo(u) {
      // the car at rest in the avenue, its rockets glowing; the lens low behind it, pushing in
      const z = 1180; carAt(LANE, z, PI, 0, 0, 0.35, 0.3);
      const k = smooth(u / (B(2.5)));
      setCam(rel(lerp(-6.2, -5.2, k), lerp(2.6, 2.2, k), lerp(0.75, 0.68, k)), rel(10, -0.4, 1.4 + 0.3 * k), 44);
      P.mesh.visible = false;
    },
  };

  /* ---- the type over it */
  const set = (el, o) => { if (el.style.opacity !== String(o)) el.style.opacity = String(o); };
  function overlay(t, s, u) {
    // the black: the cards, the stop before the drop, the fade at the end
    let blk = 0;
    if (s.kind === 'black') blk = 1;
    if (t >= B(11.875) && t < B(DROP)) blk = 0.4;
    if (t < B(2)) blk = 1 - smooth((t - (B(2) - 0.08)) / 0.08);
    if (t > END - 0.5) blk = smooth((t - (END - 0.5)) / 0.45);
    set(pg.blk, blk.toFixed(3));
    // the flash: the ignition on the drop (light: the five are the flash), the boost out of the last drift, the slam
    const flashAt = (at, peak, len) => (t >= at ? Math.max(0, 1 - (t - at) / len) * peak : 0);
    const fl = flashAt(B(DROP), 0.38, 0.12) + flashAt(B(20), 0.28, 0.1) + flashAt(B(LOGO), 0.9, 0.3);
    set(pg.flash, fl.toFixed(3));
    // the cards
    const card = t < B(2) ? { text: 'IT STARTED AS A JOKE.', a: 0.45, b: B(2) - 0.12, rule: true } : t >= B(CARD) && t < B(LOGO) ? { text: 'THEY TOOK HIS DOG.', a: B(CARD) + 0.1, b: B(LOGO) - 0.04, rule: false } : null;
    if (card) {
      const ca = smooth((t - card.a) / 0.35) * (1 - smooth((t - (card.b - 0.18)) / 0.18));
      if (pg.cardT.textContent !== card.text) pg.cardT.textContent = card.text;
      set(pg.card, ca.toFixed(3));
      pg.card.style.transform = `translateY(-50%) scale(${(1.035 - 0.035 * ease.out((t - card.a) / 1.6)).toFixed(4)})`;
      pg.cardR.style.transform = `scaleX(${card.rule ? ease.out((t - card.a - 0.4) / 0.8).toFixed(3) : 0})`;
    } else set(pg.card, 0);
    // the chart and the big words
    let ch = 0, upK = 0, dnK = 0, big = '', bigA = 0, tick = '', tickC = '#4ADE80';
    if (s.chart) {
      ch = s.chart === 'up' ? smooth(u / 0.18) : 1 - smooth((u - (s.Bt - s.A - 0.15)) / 0.15);
      upK = s.chart === 'up' ? ease.out(u / 1.1) : 1;
      dnK = s.chart === 'down' ? ease.in(clamp(u / 0.75)) : 0;
      big = s.chart === 'up' ? 'IT PUMPED.' : 'IT DUMPED.';
      bigA = smooth((u - 0.1) / 0.12) * (1 - smooth((u - (s.Bt - s.A - 0.14)) / 0.14));
      if (s.chart === 'up') { tick = '$QUANT  +' + Math.round(4269 * upK).toLocaleString('en-US') + '%'; }
      else { tick = '$QUANT  −' + (99.7 * Math.min(1, dnK * 1.15)).toFixed(1) + '%'; tickC = '#EF4444'; }
    }
    set(pg.chart, ch.toFixed(3));
    if (ch > 0) {
      if (pg.up.getAttribute('d') !== CHART.up) { pg.up.setAttribute('d', CHART.up); pg.area.setAttribute('d', CHART.area); pg.down.setAttribute('d', CHART.down); }
      pg.up.style.strokeDasharray = CHART.upLen; pg.up.style.strokeDashoffset = (CHART.upLen * (1 - upK)).toFixed(1);
      pg.area.style.opacity = (upK * (1 - dnK)).toFixed(3);
      pg.down.style.strokeDasharray = CHART.downLen; pg.down.style.strokeDashoffset = (CHART.downLen * (1 - dnK)).toFixed(1);
      if (pg.tick.textContent !== tick) pg.tick.textContent = tick; pg.tick.style.color = tickC;
    }
    if (pg.big.textContent !== big && big) { pg.big.textContent = big; pg.big.style.color = s.chart === 'up' ? '#fff' : '#fff'; }
    set(pg.big, bigA.toFixed(3));
    pg.big.style.transform = `scale(${(1.06 - 0.06 * ease.out(u / 0.25)).toFixed(4)})`;
    // the logo: slammed in on the crash, the rule drawn, the line after it
    if (t >= B(LOGO)) {
      const k = t - B(LOGO);
      set(pg.logo, Math.min(1, k / 0.06).toFixed(3));
      pg.logo.style.transform = `translateY(-58%) scale(${(1 + 0.32 * Math.pow(1 - clamp(k / 0.16), 2.4) + 0.035 * clamp(k / 4.3)).toFixed(4)})`;
      pg.logoR.style.transform = `scaleX(${ease.out((k - 0.25) / 0.6).toFixed(3)})`;
      set(pg.logoG, smooth((k - 0.75) / 0.5).toFixed(3));
      set(pg.shade, smooth(k / 0.3).toFixed(3));
    } else { set(pg.logo, 0); set(pg.shade, 0); }
    // the booster's speed streaks round the frame, flickered between their two sets
    const sp = fx.spd;
    if (sp > 0.01) {
      const f = (++flick & 1) ? 1 : 0.3;
      set(pg.spd[0], (sp * f).toFixed(2)); set(pg.spd[1], (sp * (1.3 - f)).toFixed(2));
      for (const el of pg.spd) el.style.transform = `scale(${(1 + Math.random() * 0.07).toFixed(3)})`;
    } else { set(pg.spd[0], 0); set(pg.spd[1], 0); }
  }
  let flick = 0;

  /* ---- the run */
  // (the exposure: the car's shots up, v1's burns read too dark)
  const EXP = { aerial: 1.0, fight: 1.28, takedown: 1.28, fence: 1.28, hop: 1.3, logo: 1.1, ignite: 1.1, chase: 1.3, headOn: 1.3 };
  // the rocket's roar under the burns (the city's sound: a bed of its own, made at the first burn, let go at the end)
  const BURNS = new Set(['ignite', 'launch', 'burn', 'driftC', 'chase', 'headOn']);
  let roar = null, roarV = -1;
  function roarAt(s) {
    const want = BURNS.has(s.kind) ? 0.3 * carState.burn : 0;
    if (!roar && want > 0) { try { roar = W.audio?.loop?.('roar', { bus: 'sfx', vol: 0 }) || null; } catch { roar = null; } }
    if (roar && Math.abs(want - roarV) > 0.01) { roarV = want; try { roar.set({ vol: want }); } catch {} }
  }
  function frameAt(t, dt) {
    const s = shotAt(t), u = t - s.A;
    if (s !== cur) {
      // a cut: the time of day for it, the opening's set in or out; the last shot's vapour and smoke gone with it
      cur = s; puffs.last = -1; smokeAcc = 0; vapor.update(99); smoke.update(99);
      if (s.kind === 'open') { setTime('golden'); unOwn(); } else { own(); if (dusk(s)) setTime('twilight'); }
    }
    fx.spd = 0;
    if (s.kind === 'open') {
      borrow.at(s.t0 + u * (s.rate || 1), dt);
      look('golden', null);
    } else {
      K[s.kind](u, s, dt);
      if (dusk(s)) look('dusk', EXP[s.kind] ?? 1.45);
    }
    roarAt(s);
    vapor.update(dt); smoke.update(dt);
    overlay(t, s, u);
    while (cueAt < CUES.length && CUES[cueAt][0] <= t) { try { CUES[cueAt][1](); } catch (e) { console.warn('[trailer] cue', e); } cueAt++; }
  }

  // wait for the music (the first card's black holds), then the clock and the frames
  borrow.quiet = true;
  // (the opening's frames are the trailer's from now: its director's camera, its quiet set)
  W.directed = (dt) => { D.framed = true; tick(dt); };
  D.onFrame = (dt) => tick(dt);
  let done = null, skipped = false, sawLogo = false, held = false, ended = false;
  W.audio?.duck?.('amb', 0.45, END + 2);
  // (the avenue, and the two streets the drifts turn into, kept clear)
  app.trafficSystem?.hold?.([...(borrow.hold || []), { minX: X5 - 16, maxX: X5 + 16, minZ: 880, maxZ: 1420 },
    { minX: X5 - 48, maxX: X5 + 16, minZ: Z28 - 12, maxZ: Z28 + 14 }, { minX: X5 - 16, maxX: X5 + 40, minZ: Z27 - 12, maxZ: Z27 + 14 }]);
  startClock();
  function tick(dt) {
    if (ended) return;
    let t = clock();
    if (T.mode === 'only' && t >= END - 0.55) t = END - 0.55;
    t = clamp(t, 0, END);
    if (t >= END) { finish(false); return; }
    frameAt(t, dt);
  }
  D.block(true, { onSkip: () => finish(true), skipAfter: 0.8 });
  const skipLoop = () => { if (ended) { ui.skip(null); return; } D.skipStep(1 / 60, ui); requestAnimationFrame(skipLoop); };
  requestAnimationFrame(skipLoop);
  W.trailerT = () => clockP; // (for looking at it)

  async function finish(skip) {
    if (ended) return; ended = true; skipped = skip;
    // (did the player see the logo slam? then the opening leaves its own title out: the owner's call, 23 Oct)
    sawLogo = !skip || clockP >= (S.find((x) => x.kind === 'logo')?.A ?? Infinity);
    D.block(false); ui.skip(null); ui.sub(null);
    // to black (at once on a skip, the music let go)
    pg.blk.style.transition = 'opacity .22s'; pg.blk.style.opacity = '1';
    if (src) { try { const g = src._g.gain; g.cancelScheduledValues(actx.currentTime); g.setValueAtTime(g.value, actx.currentTime); g.linearRampToValueAtTime(0, actx.currentTime + (skip ? 0.35 : 0.1)); src.stop(actx.currentTime + 0.5); } catch {} }
    if (skip) { try { sfx.stopAll?.(0.25); } catch {} }
    await sleep(skip ? 240 : 60);
    // everything the trailer moved, back
    for (const a of Qn.mixer._actions) if (qRig.owns(a)) a.setEffectiveWeight(0);
    qRig.stop();
    for (const { d, r } of thugs) { r.stop(); d.root.visible = false; }
    borrow.off();
    for (const f of unsnap) f();
    W.carIdle = carIdle0; car.mesh.rotation.set(0, car.heading, 0); carState = { speed: 0, cold: 0, burn: 0, steer: 0 }; kick = false;
    try { rs.setThrust(0, 0); } catch {}
    if (glowL) glowL.distance = glowD0;
    if (roar) { try { roar.stop(skip ? 0.2 : 0.3); } catch {} roar = null; }
    for (const v of [vapor, smoke]) if (v.mesh) { app.scene.remove(v.mesh); v.mesh.geometry?.dispose(); v.mesh.material?.dispose(); }
    W.audio?.duck?.('amb', 0, 0);
    borrow.quiet = false;
    delete W.trailerT;
    document.body.classList.remove('wg-trailer');
    pg.chart.style.opacity = '0'; pg.big.style.opacity = '0'; pg.card.style.opacity = '0'; pg.logo.style.opacity = '0'; pg.flash.style.opacity = '0'; pg.shade.style.opacity = '0'; pg.vig.style.opacity = '0'; for (const el of pg.spd) el.style.opacity = '0';
    // the opening takes its own frame back (intro.js: its start again, then it plays); the black lifts off it
    done?.();
    setTimeout(() => { pg.blk.style.transition = 'opacity .7s'; pg.blk.style.opacity = '0'; }, 80);
    setTimeout(() => pg.root.remove(), 1200);
  }
  if (T.mode === 'only') W.trailerEnd = () => finish(true);
  await new Promise((res) => { done = res; });
  return { skipped, sawLogo };
}
