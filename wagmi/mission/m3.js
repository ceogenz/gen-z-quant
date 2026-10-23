// WAGMI City: Mission 3 · Pump and Dump (docs/MISSIONS.md 4.4, as built), and the way into it after Mission 2. Installed
// by game.js after m2.js; Mission 2's way on (the G at Gears' garage) is taken over by ours (m3-save.js watchStory).
//   garage  (a scene, midday, the next day) the Static Garage on W 22nd St: Gears under Quant's car ("Cold-gas
//           thrusters..."), Juno's video call: the $MOON2 launch stream, Fiona on the megaphone, Moon on the banner
//                                                                                              checkpoint 'garage'
//   square  'Go to Washington Square.'  the GPS to the arch at the foot of 5th Ave; Juno calls  checkpoint 'square'
//   rally   (a scene) the stage under the arch, the chart pumping, Fiona hyping; a Degen spots him
//   rigs    'Smash the livestream rigs.'  RIGS 0/3: blows (two), a bat, a thrown can or bottle, or the car; two of the
//           hype crew by the rigs (a bat: their help), a brute by the stage who comes on at the first rig down, one more
//           at 2/3; health 130 for it, a slow regen out of reach, +25 a rig; Fiona on the megaphone; the crowd runs;
//           100 m from the fight: 'Get back to the fight.', 160 m: 'You left the fight.'   checkpoint 'rigs' (a retry
//           keeps the rigs smashed and starts by the next one standing)
//   dump    (a scene) the chart goes red, Fiona drops the megaphone and runs for her SUV on 5th Ave
//   escape  'Lose the Degens.'  HEAT 2: two Degens cars (WAGMI.pursuit); the cold-gas thrusters unlock (their help)
//                                                                                              checkpoint 'escape'
//   return  'Go back to the garage.'  Juno calls                                               checkpoint 'return'
//   home    (a scene) Gears at the door: "in one piece." "Mostly."
//   then MISSION PASSED (TIME, RIGS SMASHED, DEGENS REKT, HITS TAKEN, FOLLOWERS +18,500, NEW: bats · cold-gas
//   thrusters), the save, and Pete's DM: the P at Sara D. Roosevelt Park ('Mission 4 is coming soon': no Mission 4 yet)
// Fails: 'Quant got rekt.', 'You left the fight.', 'The Degens caught you.' Retry, Quit, Skip (after three).
// URL: ?m3=garage|square|rigs|escape|return (and handoff: the G at night; pete: the P after it).
import * as THREE from 'three/webgpu';
import { place, getCast } from '../intro.js';
import { createGPS } from './gps.js';
import { createMarker } from './marker.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { missions } from './pause.js';
import { createM2UI } from './m2-ui.js';
import { runScene } from './m2-scenes.js';
import { buildChevron } from './m2-set.js';
import { buildRally, buildGarage, buildSUV, buildFiona, buildGears, ARCH, ARENA, GARAGE, SUV_AT } from './m3-set.js';
import { garageScene, rallyScene, dumpScene, homeScene, SPOT, ESCAPE_CAR } from './m3-scenes.js';
import { watchStory, markDone } from './m3-save.js';
import { clamp } from './cine.js';

const PI = Math.PI;
const WHITE = '#FFFFFF', BLUE = '#6CB8FF', ACID = '#B6FF3B', PINK = '#FF8AD8';
const Q = new URLSearchParams(location.search);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const G_AT = { x: GARAGE.x, z: GARAGE.z };
const P_AT = { x: 933, z: 3561 };                       // Pete's bench, Sara D. Roosevelt Park (Mission 4), clear of its trees
const SQ = { x: 0, z: 2786, name: 'Washington Square · the arch' };
// the end of 5th Ave's last lane before the square, where the drive's route ends (the road graph's lanes round the
// square run over the park: routed to the arch itself, the GPS goes round the block and in along them)
const FIFTH = { x: 0, z: 2738 };
// (the stage and its front kept clear of the city's walkers while the rally stands)
const STAGE_HOLD = { minX: -12.5, maxX: 12.5, minZ: 2801, maxZ: 2815.5 };
// where the car and Quant start a checkpoint played straight in
const FRESH = {
  // (on the lawn behind the crowd, clear of the park's trees, the camera's too: facing the rigs)
  rigs: { car: [4.6, 2772, 0], quant: [0.5, 2836.5, -0.16] },
  ret: [-848.7, 2867.7, -2.76],                          // (in the West Village, where he'd have lost them: northbound)
};

class Fail extends Error { constructor(reason, rekt = false) { super(reason); this.reason = reason; this.rekt = rekt; } }
class Quit extends Error {}

/* -------------------------------------------------------- the install -- */
export async function install(W) {
  watchStory(W);
  const at = Q.get('m3'); if (!at) return;
  await boot(W);
  if (at === 'handoff') {
    // (as Mission 2 leaves him: twilight, on W 22nd St by the garage)
    W.app.selectTime?.('twilight');
    place(W, { car: [-1530, 1603.6, PI / 2], quant: [-1536, 1607.4, -PI / 2] });
    toGarage(W, { quick: true });
    return;
  }
  if (at === 'pete') { place(W, { car: SPOT.out.car, quant: SPOT.out.quant }); toPete(W, { quick: true }); return; }
  start(W, { at }).catch((e) => console.error('[m3]', e));
}
async function boot(W) {
  if (!W.ui) {
    W.ui = createUI(); W.sfx = createAudio();
    const unlock = () => { W.sfx.unlock(); removeEventListener('keydown', unlock, true); removeEventListener('pointerdown', unlock, true); };
    addEventListener('keydown', unlock, true); addEventListener('pointerdown', unlock, true);
  }
  W.ui.story(true); document.body.classList.add('wg-onfoot');
  W.app.mapSystem.onTeleport = null; W.app.mapSystem.waypoint = null;
  for (let i = 0; i < 600 && !W.app.ready; i++) await sleep(100);
}

export async function start(W, { at = 'garage' } = {}) {
  if (W.mission) W.mission.stop();
  W.between?.stop();
  const M = (W.mission = createMission(W));
  return M.run(['square', 'rigs', 'escape', 'return'].includes(at) ? at : 'garage');
}

/* ----------------------------------------------------- between missions -- */
// the way to a mission (GTA's): its contact's letter on the radar, the route, the corona where it starts; a nudge on
// the phone when he makes no headway; a sign over the corona if it has one (sign: [big, small])
// (carR: how near a stopped car counts as in it: the curb lane by a door on the building line is ~7.5 m off)
function between(W, { letter, at, name, objective, nudges = [], onArrive, radius = 2.2, carR = radius + 4.5, sign = null }) {
  const app = W.app, cm = app.controllerManager, P = W.person, car = W.car, ui = W.ui, sfx = W.sfx;
  const gps = W.gps || (W.gps = createGPS(W));
  const now = () => (W.clock ? W.clock.now() : performance.now());
  const m = createMarker(THREE, app.scene, { color: '#FFC93C', radius, height: 2.2, alpha: 0.3 });
  const gy = cm.getGroundHeight(at.x, at.z, 'person');
  m.at(at.x, gy, at.z);
  let label = null;
  if (sign) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = 'rgba(8,10,14,0.72)'; x.beginPath(); x.roundRect(4, 4, 504, 120, 18); x.fill();
    x.textAlign = 'center'; x.fillStyle = '#FFC93C'; x.font = 'italic 800 54px "Barlow Condensed", sans-serif'; x.fillText(sign[0], 256, 62);
    x.fillStyle = '#FFFFFF'; x.font = '700 30px "Barlow Condensed", sans-serif'; x.fillText(sign[1] || '', 256, 104);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    label = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    label.position.set(at.x, gy + 3.1, at.z); label.renderOrder = 7; app.scene.add(label);
  }
  const dest = { x: at.x, z: at.z, name };
  const setObjective = () => {
    if (gps.objective) gps.objective(objective, dest, { blip: false }); else { ui?.objective(objective); gps.set(dest); }
    gps.unblip('dest');
    gps.blip('next', { x: at.x, z: at.z, kind: 'letter', letter, pulse: 6, edge: true, name });
  };
  setObjective();
  let live = true, best = Infinity, sinceT = now(), nudgeI = 0, arrived = false;
  const B = {
    m3: true, marker: m, objective: setObjective, at,
    stop() { live = false; m.hide(); app.scene.remove(m.group); if (label) app.scene.remove(label); gps.unblip('next'); gps.unblip('car'); if (gps.dest && gps.dest.x === at.x && gps.dest.z === at.z) gps.clear(); if (W.between === B) W.between = null; },
  };
  (function loop() {
    if (!live) return;
    requestAnimationFrame(loop);
    if (W.paused || W.cutscene || W.mission?.running) return;
    gps.update();
    const inCar = cm.activeMode === 'car', p = inCar ? car.position : P.position;
    document.body.classList.toggle('wg-onfoot', !inCar);
    if (label) label.quaternion.copy(app.cameraSystem.camera.quaternion);
    if (!inCar && Math.hypot(car.position.x - P.position.x, car.position.z - P.position.z) > 25) gps.blip('car', { x: car.position.x, z: car.position.z, kind: 'car', edge: true, name: car.label || "Quant's car" });
    else gps.unblip('car');
    const d = Math.hypot(p.x - at.x, p.z - at.z);
    if (d < best - 30) { best = d; sinceT = now(); }
    if (nudges.length && now() - sinceT > 50000 && d > 40) {
      sinceT = now(); best = d;
      const [from, text] = nudges[nudgeI++ % nudges.length];
      sfx?.play('buzz', { gain: 0.16, times: 1 }); sfx?.play('ding', { gain: 0.12 }); W.audio?.play?.('phoneBuzz');
      ui?.dm(from, text, 8); setObjective();
    }
    if (!arrived && (inCar ? d < carR && Math.abs(car.speed) < 3 : d < radius && Math.abs(p.y - gy) < 1.2)) { arrived = true; onArrive?.(B); }
    if (d > Math.max(radius + 6, carR + 1.5)) arrived = false;
  })();
  W.between?.stop(); W.between = B;
  return B;
}

// after Mission 2: the G at Gears' garage; into its corona, Mission 3
export function toGarage(W, { quick = false } = {}) {
  between(W, {
    letter: 'G', at: G_AT, name: "Gears' garage · W 22nd St", objective: ['Go to ', { "Gears' garage": 'yellow' }, '.'], carR: 9,
    nudges: [['Juno', "gears' garage. west chelsea. the G on your radar."], ['Juno', 'you need sleep. the G. go.']],
    onArrive: (b) => { b.stop(); start(W, { at: 'garage' }).catch((e) => console.error('[m3]', e)); },
  });
  if (!quick) W.ui?.help(['A new mission is available. Go to the ', { G: 'yellow' }, ' on the Radar.'], 9);
}
// after Mission 3: Pete's P at Sara D. Roosevelt Park, where Mission 4 will start
export function toPete(W, { quick = false } = {}) {
  between(W, {
    letter: 'P', at: P_AT, name: 'Pete · Sara D. Roosevelt Park', objective: ['Meet ', { Pete: 'blue' }, ' at ', { 'Sara D. Roosevelt Park': 'yellow' }, '.'],
    sign: ['MISSION 4', 'COMING SOON'],
    nudges: [['Unknown number', 'sara roosevelt park. by the benches. come alone. -P']],
    onArrive: () => { W.ui?.place('Sara D. Roosevelt Park', 'Lower East Side · WAGMI City', 3); W.ui?.help(['Mission 4 is coming soon. ', { Pete: 'blue' }, ' will meet you here.'], 9); },
  });
  if (!quick) W.ui?.help(['A new mission is available. Go to the ', { P: 'yellow' }, ' on the Radar.'], 9);
}

/* ---------------------------------------------------------- the mission -- */
function createMission(W) {
  const app = W.app, cm = app.controllerManager, P = W.person, car = W.car, ui = W.ui, sfx = W.sfx;
  const gps = W.gps || (W.gps = createGPS(W));
  const U = W.m2ui || (W.m2ui = createM2UI(ui));
  app.mapSystem.onTeleport = null;
  ui.story(true);

  /* ------------------------------------------------------------ helpers -- */
  let tok = { dead: false, err: null };
  const fail = (reason, rekt) => { if (!tok.dead) { tok.dead = true; tok.err = new Fail(reason, rekt); } };
  const now = () => (W.clock ? W.clock.now() : performance.now());
  const wait = (cond, t = tok) => new Promise((res, rej) => {
    const f = () => { if (t.dead) return rej(t.err || new Quit()); if (W.paused) return requestAnimationFrame(f); let ok = false; try { ok = cond(); } catch (e) { return rej(e); } if (ok) res(); else requestAnimationFrame(f); };
    f();
  });
  const delay = (secs, t = tok) => { const end = now() + secs * 1000; return wait(() => now() >= end, t); };
  const gsleep = (ms) => new Promise((r) => { const end = now() + ms; const f = () => (now() >= end ? r() : setTimeout(f, Math.max(16, end - now()))); setTimeout(f, Math.max(0, ms)); });
  const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  const inCar = () => cm.activeMode === 'car';
  const me = () => (inCar() ? car.position : P.position);
  // the lines: subtitles (their recorded voices play from them), held for their reading time or their voice, a mumble
  // where there is no voice; onLine(who, i) as each starts
  const VOICE = { Quant: 152, Juno: 212, Gears: 92, Fiona: 236, Wick: 112 };
  async function say(lines, t = tok, onLine = null) {
    for (let i = 0; i < lines.length; i++) {
      const [who, color, text, pause = 0.25] = lines[i];
      if (t.dead) break;
      const secs = Math.max(1.4, text.length / 15, (W.voice?.dur?.(who, text) || 0) + 0.15);
      ui.sub(who, text, color); onLine?.(who, i);
      if (VOICE[who] && !W.voice?.has?.(who, text)) {
        const parts = text.match(/[^.?!]+[.?!']*/g) || [text]; let a = 0;
        for (const ph of parts) { const n = ph.trim().length; if (n) setTimeout(() => sfx?.play('mumble', { f0: VOICE[who] * (0.96 + Math.random() * 0.08), dur: Math.min(0.5, Math.max(0.2, 0.1 + n * 0.02)), gain: 0.24, q: /\?/.test(ph) }), a * 1000 + 30); a += ph.length / text.length * secs; }
      }
      const talk = setInterval(() => { if (who === 'Juno' && U.call.on) U.call.talk(0.5 + Math.random() * 0.5); }, 90);
      await gsleep(secs * 1000); clearInterval(talk);
      ui.sub(null); await gsleep(pause * 1000);
    }
  }
  const objective = (parts, target = null) => {
    if (gps.objective) gps.objective(parts, target, { blip: !!target && !target.follow });
    else { ui.objective(parts); if (target && !target.follow) gps.set(target); else gps.clear(); }
  };
  const holds = (rects) => app.trafficSystem.hold?.(rects);
  const midday = () => { if (app.lightingSystem?.activePresetId !== 'midday') app.selectTime?.('midday'); };
  const stats = { t0: now(), hits: 0, rekt: 0, smashed: 0 };
  let lastHp = null;
  const fails = {};
  const hooks = new Set();
  let running = true;
  (function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    if (W.paused) return;
    gps.update();
    document.body.classList.toggle('wg-onfoot', !inCar());
    for (const f of hooks) { try { f(); } catch (e) { console.warn('[m3]', e); } }
    const hp = W.combat?.player?.hp; if (hp != null) { if (lastHp != null && hp < lastHp - 0.5) stats.hits++; lastHp = hp; }
  })();
  const hook = (f) => { hooks.add(f); return () => hooks.delete(f); };
  let lastT = now();
  const frameDt = () => { const t = now(), d = Math.min(0.05, (t - lastT) / 1000); lastT = t; return d; };

  /* -------------------------------------------------- the sets, the cast -- */
  // (built once a session, kept on W: a restart reuses them)
  const S = W._m3 || (W._m3 = { R: null, Gar: null, suv: null, fiona: null, gears: null, chev: null, C: null, setsP: null });
  Object.assign(S, { crew: null, brute: null, extra: null, chase: null, fionaUp: false, awake: false, bruteUp: false });
  function sets() {
    return S.setsP || (S.setsP = (async () => {
      if (!S.C) S.C = await getCast(W);
      if (!S.Gar) S.Gar = buildGarage(W);
      if (!S.R) S.R = buildRally(W);
      if (!S.suv) S.suv = buildSUV(W);
      if (!S.chev) S.chev = [0, 1, 2].map(() => buildChevron(W, '#4ADE80'));
      if (!S.gears) S.gears = await buildGears(W);
      if (!S.fiona) S.fiona = await buildFiona(W);
      return S;
    })());
  }
  // the rally standing: the set, Fiona on the stage hyping, the crew by the rigs (not yet awake), the crowd
  let fionaHook = null;
  async function spawnRally({ crew = true } = {}) {
    await sets();
    if (!S.R.shown) { S.R.reset(); S.R.show(true); }
    holds([STAGE_HOLD]);
    S.suv.group.visible = true; S.suv.group.position.set(SUV_AT[0], 0, SUV_AT[1]); S.suv.group.rotation.set(0, SUV_AT[2], 0);
    // Fiona, every frame she's up (rig-posed, the megaphone at her mouth, the other fist pumping)
    S.fiona.rig.set([[0, 'thugIdle']]); S.fionaUp = true;
    fionaHook?.(); fionaHook = hook(() => {
      if (!S.fionaUp || W.cutscene) return;
      const t = now() / 1000, F = S.fiona;
      F.root.visible = true; F.root.rotation.set(0, 0, 0); F.root.position.set(0, 1.36, 2809.6);
      F.rig.pose(t % 30); F.hype(0, 1, 0.8, t);
    });
    if (crew && !S.crew && W.combat?.spawnCrew) {
      // two by the rigs (one with a bat), and a brute by the stage, a crew of his own: he holds back till the first
      // rig goes down; facing the stage until it starts. Bats, cans and bottles lying about
      const C = S.crew = W.combat.spawnCrew({ x: -8, z: 2872, count: 2, brute: 0, weapons: ['bat'], aggro: false, props: { cans: 3, bottles: 2, bats: 2 } });
      const B = S.brute = W.combat.spawnCrew({ x: -9.5, z: 2822, count: 0, brute: 1, aggro: false, props: false });
      const spots = [[-6.5, 2856.5], [16.5, 2888], [-9.5, 2822]];
      [...C.enemies, ...B.enemies].forEach((e, i) => {
        const [x, z] = spots[i % spots.length];
        e.pos.set(x, cm.getGroundHeight(x, z, 'person'), z);
        const face = Math.atan2(0 - x, 2809.6 - z), up = e.update.bind(e), crew = e.crew;
        e.update = (dt) => { up(dt); if (!(crew === B ? S.bruteUp : S.awake) && e.alive && e.state === 'idle') { e.yaw = face; e.root.rotation.y = face; } };
        e._m3restore = () => { e.update = up; };
      });
    }
  }
  function wake() { S.awake = true; for (const e of S.crew?.enemies || []) e._m3restore?.(); S.crew?.engage(); }
  function wakeBrute() { if (S.bruteUp) return; S.bruteUp = true; for (const e of S.brute?.enemies || []) e._m3restore?.(); S.brute?.engage(); }

  function tidy() {
    hooks.clear(); fionaHook = null; ui.objective(null); ui.sub(null); ui.help(null); ui.counter(null); ui.caller(null); ui.hold(null); ui.phone.hide(); U.call?.hide();
    gps.clear(); for (const id of [...gps.blips.keys()]) gps.unblip(id);
    for (const c of S.chev || []) c.hide();
    S.chase?.stop?.(); S.chase = null;
  }
  function teardown() {
    tidy(); holds([]);
    S.R?.show(false); S.Gar?.show(false); S.Gar?.inside(false);
    if (S.suv) S.suv.group.visible = false;
    if (S.fiona) { S.fiona.root.visible = false; S.fiona.mega.visible = false; } S.fionaUp = false;
    if (S.gears) S.gears.root.visible = false;
    S.crew = null; S.brute = null; S.extra = null; S.awake = false; S.bruteUp = false;
  }
  function inTheCar(x, z, h) { place(W, { car: [x, z, h] }); P.inVehicle = true; P.mesh.visible = false; P.speed = 0; app.selectMode('car'); }
  const blipCar = () => gps.blip('car', { x: car.position.x, z: car.position.z, kind: 'car', edge: true, name: car.label || "Quant's car" });

  /* --------------------------------------------------------- the phases -- */
  const PHASES = {
    // the next day: the garage, Gears, Juno's call
    async garage() {
      W.cutscene = true; ui.cine(true); cm.resetInput?.();
      await ui.fade(1, 0.5);
      W.combat?.clear?.();
      // (come in his car: out of it, so the scene can park it in the bay; the car's controls hold it where it stands)
      if (inCar()) place(W, { quant: SPOT.out.quant });
      await sets();
      midday();
      ui.caption('THE NEXT DAY', 'Midday · West Chelsea', '#FFC93C', 2.6);
      holds([{ minX: G_AT.x - 45, maxX: G_AT.x + 45, minZ: 1590, maxZ: 1612 }]);
      const def = garageScene(W, { U, say, gears: S.gears, garage: S.Gar });
      def.setup();
      ui.fade(0, 0.9);
      await runScene(W, def);
      holds([]);
      S.Gar.show(true); S.Gar.inside(false);
      place(W, { car: SPOT.out.car, quant: SPOT.out.quant });
    },
    // to Washington Square (the rally goes up on the way)
    async square(fresh) {
      // (played straight in: the light and his place first, the sets after: a slow load doesn't leave him at the city's
      // own start in its golden hour)
      if (fresh) { midday(); place(W, { car: SPOT.out.car, quant: SPOT.out.quant }); }
      await sets(); midday();
      if (fresh) S.Gar.show(true);
      // (the blip on the arch; the route down 5th Ave to its last lane, and on foot near the square, to the arch; in the
      // car on that last stretch, no line: the stage is in sight)
      const dest = { ...SQ, follow: () => (inCar() || dist(me(), SQ.x, SQ.z) > 140 ? FIFTH : SQ) };
      const drive = gps.drive({ dest, objective: ['Go to ', { 'Washington Square': 'yellow' }, '.'] });
      const t0 = now(); let called = false, up = false, bare = false;
      const at5th = (p) => Math.abs(p.x) < 22 && p.z > FIFTH.z - 6 && p.z < ARCH.z;
      const off = hook(() => {
        const dt = frameDt();
        drive.step();
        const last = inCar() && at5th(car.position) && drive.state === 'drive';
        if (last !== bare) { bare = last; gps.to(last ? null : dest); }
        const d = dist(me(), ARCH.x, ARCH.z);
        if (!up && d < 900) { up = true; spawnRally().catch((e) => console.warn('[m3]', e)); }
        if (dist(me(), G_AT.x, G_AT.z) > 300) S.Gar.show(false);
        if (S.R?.shown) S.R.update(dt, app.cameraSystem.camera.position);
        if (!called && inCar() && now() - t0 > 7000) { called = true; junoDrive(); }
      });
      // (there: by the arch, or stopped on 5th Ave's last stretch in front of it, or on foot near it)
      try { await wait(() => { const p = me(), d = dist(p, ARCH.x, ARCH.z); return d < 26 || ((d < 60 || at5th(p)) && (!inCar() || Math.abs(car.speed) < 6)); }); }
      finally { off(); drive.stop(); }
      if (!up) await spawnRally();
    },
    // the launch, seen; a Degen spots him
    async rally(fresh) {
      await sets(); midday();
      if (fresh) place(W, { car: FRESH.rigs.car, quant: [2.5, 2790, 0] });
      await spawnRally();
      car.speed = 0;
      // (its shots kept clear while it plays, M1's way: 5th Ave's last block down to the arch, the stage, the lawn to
      // the rigs; then only the stage again)
      holds([STAGE_HOLD, { minX: -26, maxX: 26, minZ: 2735, maxZ: 2905 }]);
      const def = rallyScene(W, { say, fiona: S.fiona, rally: S.R, spotter: S.crew?.enemies[0] || null });
      def.setup();
      try { await runScene(W, def); } finally { holds([STAGE_HOLD]); }
    },
    // the fight round the rigs
    async rigs(fresh) {
      if (fresh) { midday(); place(W, { car: FRESH.rigs.car, quant: FRESH.rigs.quant }); }
      await sets(); midday();
      if (fresh) {
        await spawnRally();
        // (a retry: the rigs he smashed stay smashed, and he starts by the next one standing, a few steps off it)
        const next = S.R.smashed ? S.R.rigs.filter((r) => !r.down).sort((a, b) => Math.hypot(a.x, a.z - 2836) - Math.hypot(b.x, b.z - 2836))[0] : null;
        place(W, { car: FRESH.rigs.car, quant: next ? [next.x + 1.2, next.z - 3.4, Math.atan2(-1.2, 3.4)] : FRESH.rigs.quant });
      }
      const combat = W.combat, R = S.R;
      const autoGetUp = combat?.player.autoGetUp, maxHp0 = combat?.player.maxHp;
      let offDown = null;
      // (his health stretched for it (130), a slow second wind when he's kept out of reach a few seconds, a top-up as
      // each rig goes down)
      if (combat?.player) { combat.player.maxHp = 130; combat.player.hp = combat.player.maxHp; lastHp = combat.player.hp; combat.player.autoGetUp = false; offDown = combat.player.onDown(() => fail('Quant got rekt.', true)); }
      let onKey = null, offFight = null;
      try {
        wake();
        R.crowd?.scatter(P.position.x, P.position.z - 20);
        const go = () => objective(['Smash the ', { 'livestream rigs': 'green' }, '.'], null);
        go();
        ui.counter('RIGS', `${R.smashed}/3`);
        delay(1.6).then(() => ui.help(['Bats: walk up to one and press [E] to pick it up. One swing smashes a ', { rig: 'green' }, '.'], 9)).catch(() => {});
        let warned = false, barkT = now() + 6000, helped2 = false, extra = false, lastMv = 'free', swing = null, said = 0;
        const BARKS = [
          ['Fiona', PINK, 'Number go up! Number go UP!'], ['Fiona', PINK, 'Buy the dip! There is no dip!'], ['Fiona', PINK, 'Diamond hands, everybody! Diamond hands!'],
          ['Fiona', PINK, "Don't look at the kid! Look at the chart!"], ['Fiona', PINK, 'Moon two! To the moon!'],
        ];
        const LOST = [['Fiona', PINK, 'We lost a stream! Keep pumping!'], ['Fiona', PINK, 'Two streams down! This is fine! Pump harder!']];
        const smashed = (r) => {
          stats.smashed = R.smashed; ui.counter('RIGS', `${R.smashed}/3`);
          R.screen.dip(); S.chev[r.i].hide(); gps.unblip('rig' + r.i);
          sfx?.play('thunk', { gain: 0.3, f: 90 });
          if (combat?.player && !combat.player.down) combat.player.hp = Math.min(combat.player.maxHp, combat.player.hp + 25);
          wakeBrute();
          if (R.smashed < 3) { W.voice?.fx?.('Fiona', 'phone'); say([LOST[Math.min(LOST.length - 1, said++)]]).catch(() => {}); barkT = now() + 9000; }
        };
        // a blow at a rig: Quant's swing (the fight's own move, or the keys), what he throws, his car
        let heavyT = -1e9, pressT = -1e9;
        const reachOf = () => (W.combat?.debug?.c?.me?.holding?.kind === 'bat' ? 3.0 : 2.4);
        const blow = (r, heavy) => {
          const held = W.combat?.debug?.c?.me?.holding?.kind, dmg = held === 'bat' || held === 'bottle' ? 3 : heavy ? 2 : 1;
          if (!r.hit(dmg, P.position) && !helped2) { helped2 = true; ui.help(['Hit it again. Or throw a ', { 'trash can': 'green' }, ' at it.'], 7); }
        };
        // (the fight's swing, where it lands: a rig in reach in front of him, or right by him)
        const strike = (heavy) => {
          if (inCar()) return;
          const reach = reachOf(), fx = Math.sin(P.heading), fz = Math.cos(P.heading);
          let best = null, bd = Infinity;
          for (const r of R.rigs) {
            if (r.down) continue;
            const dx = r.x - P.position.x, dz = r.z - P.position.z, d = Math.hypot(dx, dz);
            if (d > reach) continue;
            const ang = Math.acos(clamp((dx * fx + dz * fz) / Math.max(1e-3, d), -1, 1));
            if (d > 1.15 && ang > 1.4) continue;
            if (d < bd) { bd = d; best = r; }
          }
          if (best) blow(best, heavy);
        };
        // (a blow pressed with a rig in reach and nearer him than any Degen, or right by him: the rig's, whichever way
        // the fight turns him to swing; with a Degen nearer, the fight has it)
        const rigAt = () => {
          const reach = reachOf(), px = P.position.x, pz = P.position.z;
          let best = null, bd = Infinity;
          for (const r of R.rigs) { if (r.down) continue; const d = Math.hypot(r.x - px, r.z - pz); if (d <= reach && d < bd) { bd = d; best = r; } }
          if (!best || bd < 1.5) return best;
          for (const e of W.combat?.enemies || []) if (e.alive && Math.hypot(e.pos.x - px, e.pos.z - pz) < bd - 0.2) return null;
          return best;
        };
        onKey = (e) => {
          const key = e.type === 'keydown' && !e.repeat && (e.code === 'KeyJ' || e.code === 'KeyK'), click = e.type === 'pointerdown' && (e.button === 0 || e.button === 2);
          if ((!key && !click) || W.cutscene || W.paused || inCar()) return;
          const heavy = e.code === 'KeyK' || e.button === 2;
          // (a heavy pressed: the fight calls a heavy at nobody a whiff, but at a rig it lands as a heavy)
          if (heavy) heavyT = now();
          const r = rigAt();
          if (r) { pressT = now(); setTimeout(() => { if (!r.down && !W.paused) blow(r, heavy); }, 160); return; }
          // (without the fight's own moves to read: the strike keys)
          if (!W.combat?.debug?.c?.me) setTimeout(() => strike(heavy), 160);
        };
        addEventListener('keydown', onKey, true); addEventListener('pointerdown', onKey, true);
        let hurtT = now(), hp0 = combat?.player?.hp ?? 0;
        offFight = hook(() => {
          const dt = frameDt(); if (W.cutscene) return;
          R.update(dt, app.cameraSystem.camera.position);
          if (combat?.player) {
            const hp = combat.player.hp; if (hp < hp0 - 0.5) hurtT = now(); hp0 = hp;
            if (hp > 0 && !combat.player.down && now() - hurtT > 3500 && hp < combat.player.maxHp * 0.6) combat.player.hp = hp + 4 * dt;
          }
          // (the brute at the stage comes for him if he goes for him first)
          if (!S.bruteUp && S.brute?.enemies.some((e) => !e.alive || e.state !== 'idle' || dist(P.position, e.pos.x, e.pos.z) < 5)) wakeBrute();
          // (his swing: the moment a strike, a heavy or a swing at the air starts, its blow lands ~0.16 s on)
          const mv = W.combat?.debug?.c?.me?.moveName?.() || 'free';
          // (a swing the press already gave to a rig isn't counted twice)
          if (mv !== lastMv) { if ((mv === 'whiff' || mv === 'strike' || mv === 'heavy') && now() - pressT > 450) swing = { t: 0, heavy: mv === 'heavy' || (mv === 'whiff' && now() - heavyT < 450) }; lastMv = mv; }
          if (swing) { swing.t += dt; if (swing.t > 0.16) { strike(swing.heavy); swing = null; } }
          // things thrown, and the car
          // (a thing in the air: its path over the frame against each rig, a post 2.6 m tall and 0.5 m round)
          for (const I of W.combat?.items?.list || []) {
            const p = I.obj.position, was = I._m3at || (I._m3at = p.clone()), fly = I.state === 'fly' && I.vel.lengthSq() > 9;
            if (fly) for (const r of R.rigs) {
              if (r.down || Math.min(p.y, was.y) > 2.9) continue;
              const ax = was.x - r.x, az = was.z - r.z, bx = p.x - was.x, bz = p.z - was.z, L = bx * bx + bz * bz;
              const k = L > 1e-6 ? clamp(-(ax * bx + az * bz) / L, 0, 1) : 0;
              if (Math.hypot(ax + bx * k, az + bz * k) < 0.75) r.hit(3, p);
            }
            was.copy(p);
          }
          if (inCar() && Math.abs(car.speed) > 2.5) for (const r of R.rigs) if (!r.down && dist(car.position, r.x, r.z) < 2.4) r.hit(3, car.position);
          // (each rig down, whatever brought it down: counted, its marks off, the chart shaken)
          for (const r of R.rigs) if (r.down && !r.counted) { r.counted = true; smashed(r); }
          // the rigs marked (green blips, a chevron over each), the Degens red
          for (const r of R.rigs) if (!r.down) { gps.blip('rig' + r.i, { x: r.x, z: r.z, kind: 'object', edge: true, name: 'Livestream rig' }); S.chev[r.i].at(r.x, 2.9, r.z, dt); }
          const live = new Set();
          for (const e of W.combat?.enemies || []) if (e.alive && dist(e.pos, P.position.x, P.position.z) < 150) { live.add('e:' + e.id); gps.blip('e:' + e.id, { x: e.pos.x, z: e.pos.z, kind: 'enemy' }); }
          for (const id of [...gps.blips.keys()]) if (id.startsWith('e:') && !live.has(id)) gps.unblip(id);
          // Fiona on the megaphone
          if (now() > barkT) { barkT = now() + 9000 + Math.random() * 3000; W.voice?.fx?.('Fiona', 'phone'); say([BARKS[Math.floor(Math.random() * BARKS.length)]]).catch(() => {}); }
          // one more at two down
          if (!extra && R.smashed >= 2 && W.combat?.spawnCrew) {
            extra = true;
            S.extra = W.combat.spawnCrew({ x: -24, z: 2944, count: 1, brute: 0, weapons: ['bottle'], aggro: true, props: false });
            S.extra.engage?.();
            say([['Wick', ACID, 'Backup! Protect the last stream!']]).catch(() => {});
          }
          // the fight's ground (from past the fountain up 5th Ave to where the drive ended)
          const d = Math.min(dist(me(), ARENA.x, ARENA.z), dist(me(), FIFTH.x, FIFTH.z + 30));
          if (d > 160) fail('You left the fight.');
          else if (d > 100 && !warned) { warned = true; ui.objective(['Get back to the ', { fight: 'yellow' }, '.']); }
          else if (d < 90 && warned) { warned = false; go(); }
        });
        await wait(() => R.smashed >= 3);
        stats.rekt = [S.crew, S.brute, S.extra].filter(Boolean).reduce((n, c) => n + c.enemies.filter((e) => !e.alive).length, 0);
      } finally {
        offFight?.();
        if (onKey) { removeEventListener('keydown', onKey, true); removeEventListener('pointerdown', onKey, true); }
        offDown?.(); if (combat?.player) { combat.player.autoGetUp = autoGetUp; combat.player.maxHp = maxHp0; combat.player.hp = Math.min(combat.player.hp, maxHp0); }
      }
      for (const id of [...gps.blips.keys()]) if (id.startsWith('e:') || id.startsWith('rig')) gps.unblip(id);
      ui.counter(null);
      await delay(0.8);
    },
    // the dump: the chart red, Fiona gone, the car waiting
    async dump(fresh) {
      await sets(); midday();
      if (fresh) { await spawnRally({ crew: false }); for (const r of S.R.rigs) if (!r.down) r.hit(3); }
      S.fionaUp = false;
      W.combat?.clear?.(); S.crew = null; S.brute = null; S.extra = null;
      for (const c of S.chev) c.hide();
      holds([{ minX: -12, maxX: 12, minZ: 2560, maxZ: 2796 }, { minX: -16, maxX: 26, minZ: 2776, maxZ: 2830 }, STAGE_HOLD]);
      inTheCar(...ESCAPE_CAR);
      const def = dumpScene(W, { say, fiona: S.fiona, rally: S.R, suv: S.suv });
      def.setup();
      await runScene(W, def);
      holds([]);
    },
    // the Degens' cars after him
    async escape(fresh) {
      if (fresh) { midday(); inTheCar(...ESCAPE_CAR); }
      await sets(); midday();
      if (fresh) { if (!S.R.shown) { S.R.reset(); S.R.show(true); } for (const r of S.R.rigs) if (!r.down) r.hit(3); S.R.screen.mode('dump'); }
      // (a retry starts him back where the dump left him, whatever shoved the car about before)
      if (fresh || !inCar()) inTheCar(...ESCAPE_CAR);
      objective(['Lose the ', { Degens: 'red' }, '.'], null);
      W.audio?.play?.('horn', { pos: [car.position.x - 40, 1, car.position.z] });
      // the thrusters: Gears' cold-gas, unlocked now (their own help)
      delay(2.2).then(() => {
        if (W.thrusters?.unlock) W.thrusters.unlock('all', { announce: true });
        else ui.help(['Cold-gas thrusters: [Space] hops the car, [Q] / [E] dash it sideways.'], 9);
      }).catch(() => {});
      delay(9).then(() => junoEscape()).catch(() => {});
      // (they come out of W 8th St onto 5th Ave, ~80 m up from him, out of sight until they turn the corner)
      const chase = S.chase = W.pursuit?.start?.({ heat: 2, kind: 'degens', count: 2, from: { x: -150, z: 2696 }, target: () => (inCar() ? car.position : P.position) }) || null;
      let lost = false, wasIn = inCar();
      const t0 = now();
      const off = hook(() => {
        const dt = frameDt();
        if (S.R.shown) { S.R.update(dt, app.cameraSystem.camera.position); if (dist(me(), ARCH.x, ARCH.z) > 700) S.R.show(false); }
        if (inCar() && !wasIn) { gps.unblip('car'); objective(['Lose the ', { Degens: 'red' }, '.'], null); }
        if (!inCar() && wasIn) blipCar();
        wasIn = inCar();
        // (no pursuit to run: get well clear of the square and keep driving)
        if (!chase && now() - t0 > 14000 && dist(me(), ARCH.x, ARCH.z + 150) > 420) lost = true;
      });
      if (chase) {
        chase.on?.('lost', () => { lost = true; });
        chase.on?.('caught', () => fail('The Degens caught you.'));
        chase.on?.('wrecked', () => { stats.wrecked = (stats.wrecked || 0) + 1; });
      } else ui.counter('HEAT', '2');
      try { await wait(() => lost); } finally { off(); chase?.stop?.(); S.chase = null; ui.counter(null); }
      ui.objective(['You lost the ', { Degens: 'red' }, '.'], 3);
      await delay(1.5);
    },
    // back to the garage
    async ret(fresh) {
      if (fresh) { midday(); inTheCar(...FRESH.ret); }
      await sets(); midday();
      S.R.show(false); S.Gar.show(true);
      const door = { x: G_AT.x, z: G_AT.z - 3.2, name: "Gears' garage · W 22nd St" };
      const drive = gps.drive({ dest: door, objective: ['Go back to the ', { garage: 'yellow' }, '.'] });
      const m = createMarker(THREE, app.scene, { color: '#FFC93C', radius: 2.4, height: 2.2, alpha: 0.3 });
      m.at(door.x, cm.getGroundHeight(door.x, door.z, 'person'), door.z);
      const t0 = now(); let called = false;
      const off = hook(() => { drive.step(); if (!called && inCar() && now() - t0 > 8000) { called = true; junoReturn(); } });
      try { await wait(() => { const d = dist(me(), door.x, door.z); return inCar() ? d < 7 && Math.abs(car.speed) < 3 : d < 2.6; }); }
      finally { off(); drive.stop(); m.hide(); app.scene.remove(m.group); }
    },
    async home() {
      await sets(); midday();
      S.Gar.show(true);
      car.speed = 0;
      // (out of the car for the scene: it parks him and his car where it wants them)
      place(W, { quant: [SPOT.door.quant[0], SPOT.door.quant[1], 0] });
      holds([{ minX: G_AT.x - 45, maxX: G_AT.x + 45, minZ: 1590, maxZ: 1612 }]);
      const def = homeScene(W, { say, gears: S.gears, garage: S.Gar });
      def.setup();
      await runScene(W, def);
      holds([]);
      place(W, { quant: [SPOT.door.quant[0], SPOT.door.quant[1], 0] });
    },
  };
  const ORDER = ['garage', 'square', 'rally', 'rigs', 'dump', 'escape', 'ret', 'home'];
  const CHECKPOINT = { garage: 'garage', square: 'square', rally: 'square', rigs: 'rigs', dump: 'rigs', escape: 'escape', ret: 'return', home: 'return' };
  const PHASE_OF = { garage: 'garage', square: 'square', rigs: 'rigs', escape: 'escape', return: 'ret' };
  const LABELS = { garage: "Gears' garage", square: 'To Washington Square', rigs: 'The rigs', escape: 'Lose the Degens', return: 'Back to the garage' };

  // the calls on the way
  async function junoDrive() {
    const t = tok;
    sfx?.play('ring', { gain: 0.14, times: 1 }); ui.caller('Juno', BLUE, 'Incoming call'); await gsleep(1500);
    if (t.dead) { ui.caller(null); return; }
    ui.caller('Juno', BLUE, 'On call');
    await say([
      ['Juno', BLUE, 'The stream runs off three ring lights in the park. Kill the rigs, the stream dies.'],
      ['Quant', WHITE, 'And no stream, no pump.'],
      ['Juno', BLUE, "And no pump, Fiona's just a lady shouting at a fountain."],
    ], t).catch(() => {});
    ui.caller(null);
  }
  async function junoEscape() {
    const t = tok;
    sfx?.play('ring', { gain: 0.14, times: 1 }); ui.caller('Juno', BLUE, 'On call'); await gsleep(900);
    await say([
      ['Juno', BLUE, 'Two Degens cars on you. The Village is all crooked streets. Use them.'],
      ['Quant', WHITE, 'Gears said the thrusters were very safe.'],
      ['Juno', BLUE, 'Gears says that about everything.'],
    ], t).catch(() => {});
    ui.caller(null);
  }
  async function junoReturn() {
    const t = tok;
    sfx?.play('ring', { gain: 0.14, times: 1 }); ui.caller('Juno', BLUE, 'On call'); await gsleep(900);
    await say([
      ['Juno', BLUE, 'Moon two is down ninety-nine point eight percent. The stream died mid-sentence.'],
      ['Quant', WHITE, 'Good.'],
      ['Juno', BLUE, 'Everyone who bought it is furious. At ZK, for once. Go get some sleep.'],
    ], t).catch(() => {});
    ui.caller(null);
  }

  /* --------------------------------------------------- passed, hand-off -- */
  async function passed() {
    teardown();
    const secs = Math.round((now() - stats.t0) / 1000);
    sfx?.play('passed'); W.audio?.play?.('missionPassed');
    await ui.passed({ title: 'Pump and Dump', stats: [
      ['TIME', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`], ['RIGS SMASHED', '3/3'],
      ['DEGENS REKT', String(stats.rekt || 0)], ['HITS TAKEN', String(stats.hits)],
    ], reward: '+18,500', note: '#MoonTwoRugged is trending · NEW: bats · cold-gas thrusters' }, 6);
    W.followers = (W.followers || 0) + 18500;
    W.progress = { ...(W.progress || {}), m3: true };
    markDone(W, 'm3');
    await gsleep(4500);
    sfx?.play('buzz', { gain: 0.18, times: 2 }); sfx?.play('ding', { gain: 0.14 }); W.audio?.play?.('phoneBuzz');
    ui.dm('Unknown number', 'i want out. i know where the dog is going. sara roosevelt park. come alone. -P', 12);
    await gsleep(2500);
    toPete(W);
  }

  /* ------------------------------------------------------- the runner -- */
  const M = {
    get phase() { return M._phase; },
    get running() { return running && !!M._phase && M._phase !== 'passed'; },
    stop() { running = false; tok.dead = true; teardown(); W.combat?.clear?.(); },
    async run(at = 'garage') {
      let i = Math.max(0, ORDER.indexOf(PHASE_OF[at] || at)), fresh = true;
      while (i < ORDER.length && running) {
        const phase = (M._phase = ORDER[i]);
        tok = { dead: false, err: null };
        try {
          await PHASES[phase](fresh);
          // (the phase's leftovers stop with it: a call or a timer it started doesn't run on into the next)
          tok.dead = true; tok.err = new Quit();
          fresh = false; i++;
        } catch (e) {
          if (e instanceof Quit) return;
          if (!(e instanceof Fail)) { console.error('[m3]', phase, e); tidy(); W.cutscene = false; ui.cine(false); return; }
          tidy(); cm.resetInput?.();
          if (e.rekt) { ui.rekt(true); sfx?.play('failed'); await sleep(2600); ui.rekt(false); } else sfx?.play('failed');
          const cp = CHECKPOINT[phase]; fails[cp] = (fails[cp] || 0) + 1;
          // (the choices move only on fresh presses: ui.failed)
          const choice = await ui.failed(e.reason, { skip: fails[cp] >= 3 });
          W.combat?.clear?.(); S.crew = null; S.brute = null; S.extra = null; S.awake = false; S.bruteUp = false;
          if (W.combat?.player) W.combat.player.hp = W.combat.player.maxHp;
          if (choice === 'quit') { M.stop(); toGarage(W, { quick: true }); return; }
          // (a retry of the rigs keeps the ones he smashed: it starts by the next one standing)
          // (a skip goes on past the part he failed, its scene after it still played: the rigs' skip still sees Fiona run)
          if (choice === 'skip') { i = ORDER.indexOf(PHASE_OF[cp]) + 1; fresh = true; continue; }
          i = ORDER.indexOf(PHASE_OF[cp]); fresh = true;
        }
      }
      if (!running) return;
      M._phase = 'passed';
      await passed();
      running = false;
    },
    fail,
    S,
  };
  missions(W).register({
    id: 'm3', act: 'Act II · Mission 3', title: 'Pump and Dump',
    checkpoints: ['garage', 'square', 'rigs', 'escape', 'return'].map((id) => ({ id, label: LABELS[id] })),
    active: () => running && !!M._phase && M._phase !== 'passed',
    at: () => CHECKPOINT[M._phase] || 'garage',
    restart: (at) => { ui.rekt(false); start(W, { at }).catch((e) => console.error('[m3]', e)); },
  });
  return M;
}
