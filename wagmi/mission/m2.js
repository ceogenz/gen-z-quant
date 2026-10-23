// WAGMI City: Mission 2 · Burner (docs/MISSIONS.md 4.4, as built), and the way into it after Mission 1. Installed by
// game.js; Mission 1's end calls handoff(W).
//   hand-off  Juno's DM, 'Meet Juno at Bryant Park.', the route to the J, its corona at the park's 6th Ave entrance;
//             free roam with the J always on the radar and a nudge from Juno when he wanders; into the corona (on foot,
//             or stopped in the car): the mission
//   start     'Burner' (a scene, twilight, m2-scenes.js burnerMeet): Juno in person at a park table on the 6th Ave
//             side, her laptop; Quant hands her the burner, she traces its twin: a van idling in Times Square. She
//             stays at her table until he is 70 m off (her old video call, burnerScene, is the fallback)
//                                                                                            checkpoint 'start'
//   go        'Go to Times Square.'  the van at 7th Ave & W 47th St                            checkpoint 'go'
//   tail      'Follow the van.' stay 18-70 m back (the tail meter); too close or in its mirrors fills SUSPICION:
//             spotted, it bolts ('Don't lose the van.'); over 140 m for 5 s: 'The van got away.' Juno calls. W 47th St
//             west, 10th Ave north, W 55th St west (the traffic held off its blocks, met at the corners: held up, it
//             honks and noses through) to the Degens' container yard on 12th Ave; about a minute and a half
//                                                                                            checkpoint 'tail'
//   yard      'Sneak up on the stash.' three lookouts with sight cones; E from behind takes one down; seen: the alarm
//             (arriving spotted: the alarm at once; pulling up behind the van, 6 s to get out of the car unseen)
//                                                                                            checkpoint 'yard'
//   fight     'Beat up the Degens.' DEGENS 0/n, trash cans and bottles about (their help), Lev shouting from his car:
//             the lookouts still up and three at the stash, then (down to their last man) a second wind and two more
//             out of the containers; health 130 for it, a slow regen out of reach. Lost: back to 'yard'
//   chase     Lev bolts: 'Take down Lev.' W 55th St, 11th Ave south past Javits, W 34th St east through
//             the traffic (he plows it), rubber-banded; ram him (LEV'S CAR damage) or keep up; he crashes at Greeley
//             Square (or where the rams wreck him); over 260 m for 6 s: 'Lev got away.'      checkpoint 'chase'
//   crash     (a scene) Lev climbs out, drops his phone, runs; 'Take Lev's phone.' hold F    checkpoint 'phone'
//   phone     (a scene) the Degens' group chat: a photo of Quant's own door
//   then MISSION PASSED (TIME, DEGENS REKT, QUIET TAKEDOWNS, HITS TAKEN, FOLLOWERS +9,800), Juno's call, Pete's DM
//   ('i'll DM you tomorrow'), and the G at Gears' garage in West Chelsea: 'Pete will DM you tomorrow.'
// Fails: 'Quant got rekt.', 'The van got away.', 'You left the fight.', 'Lev got away.' Retry, Quit, Skip (after three).
// URL: ?m2=handoff|start|go|tail|yard|fight|chase|phone (with ?nointro until intro.js knows ?m2 the way it knows ?m1).
import * as THREE from 'three/webgpu';
import { place, getCast } from '../intro.js';
import { createGPS } from './gps.js';
import { createMarker } from './marker.js';
import { createUI } from './ui.js';
import { createAudio } from './audio.js';
import { missions, carry } from './pause.js';
import { createM2UI } from './m2-ui.js';
import { createDriver } from './m2-drive.js';
import { createStealth } from './m2-stealth.js';
import { buildYard, buildLevCar, buildLev, buildChevron, YARD } from './m2-set.js';
import * as SCENES from './m2-scenes.js';
import { runScene, burnerScene, crashScene, phoneScene, J_AT, CRASH } from './m2-scenes.js';
import { clamp } from './cine.js';

const PI = Math.PI;
const WHITE = '#FFFFFF', BLUE = '#6CB8FF', ACID = '#B6FF3B';
const Q = new URLSearchParams(location.search);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const G_AT = { x: -1560, z: 1611 }; // Gears' garage, W 22nd St (Mission 3's giver)
// the van's way: out of the curb on 7th Ave, right onto W 47th St, right up 10th Ave, left along W 55th St over 11th
// Ave to 12th Ave, in at the yard's side gate to the stash (its two right turns swung wide, out into the next lane and
// into the far one: a tight one from the curb lane put its corners over the sidewalk)
const VAN_ROUTE = [
  [-591, -447], [-590, -432], [-589, -420], [-589.5, -410], [-592.5, -403.5], [-599, -400], [-612, -400], [-660, -404.5], [-860, -404.5],
  [-1134, -404.5], [-1300, -404.5], [-1375, -401.5], [-1392, -400], [-1401, -402], [-1407, -407.5], [-1409.5, -416], [-1409.5, -430],
  [-1405, -465], [-1403, -480], [-1403, -1018], [-1405, -1029], [-1411, -1036.5], [-1422, -1039.5], [-1683, -1039.5],
  [-1880, -1039.5], [-1897, -1039.5], [-1906, -1040.5], [-1914, -1041],
];
// Lev's: out of the side gate, east along W 55th St (the wrong way: nobody else is on it this side of 11th Ave), south
// down 11th Ave past Javits, east on W 34th St, and into Greeley Square
const LEV_ROUTE = [
  [-1910, -1032], [-1904, -1033], [-1898, -1036], [-1890, -1037.5], [-1800, -1037.5], [-1706, -1037.5], [-1695, -1033], [-1689.5, -1023],
  [-1688, -1005], [-1688, 0], [-1688, 600], [-1686.5, 626], [-1679, 640], [-1664, 645], [-1400, 645], [-1100, 645], [-860, 645], [-600, 645],
  [-430, 645], [-392, 644], [-370, 637], [-354, 623], [CRASH.x, CRASH.z],
];
// the traffic kept off the van's way while the mission needs it (the 7th Ave block behind it, W 47th St, 10th Ave and
// W 55th St between the cross streets: the crossings keep theirs, so it still meets the traffic at every corner; held
// up there, it honks and noses through)
// (7th Ave's west lanes from W 49th St down to the van: the tail's restart puts his car in them, TAIL_CAR)
const TAIL_HOLDS = [
  { minX: -592, maxX: -586, minZ: -548, maxZ: -416 },
  { minX: -844, maxX: -598, minZ: -409.5, maxZ: -397.5 }, { minX: -1121, maxX: -875, minZ: -409.5, maxZ: -397.5 }, { minX: -1395, maxX: -1149, minZ: -409.5, maxZ: -397.5 },
  ...[[-413, -470], [-494, -549], [-573, -630], [-651, -709], [-732, -789], [-810, -869], [-889, -948], [-969, -1028]].map(([a, b]) => ({ minX: -1412, maxX: -1406, minZ: b, maxZ: a })),
  { minX: -1676, maxX: -1416, minZ: -1045.5, maxZ: -1033.5 }, { minX: -1896, maxX: -1700, minZ: -1045.5, maxZ: -1033.5 },
];

// the tail's restart: his car on 7th Ave ~50 m behind the van at the curb, facing south the way it will go
const TAIL_CAR = [-589.5, -498, 0];
// the chase's restart: on 12th Ave a few metres north of W 55th St, facing south toward it, Lev pulling out of the side
// gate in front of him and off east along it (facing east, the old spot put the car's nose into the building line)
const CHASE_CAR = [-1880, -1056, 0];

class Fail extends Error { constructor(reason, rekt = false) { super(reason); this.reason = reason; this.rekt = rekt; } }
class Quit extends Error {}

/* -------------------------------------------------------- the install -- */
export async function install(W) {
  const at = Q.get('m2'); if (!at) return;
  await boot(W);
  if (at === 'handoff') {
    // (as Mission 1 leaves him: by the van at Chelsea Park, his car on 9th Ave)
    place(W, { car: [-1139, 1160, 0], quant: [-1240.1, 1126, 0.25] });
    handoff(W, { quick: true });
    return;
  }
  start(W, { at }).catch((e) => console.error('[m2]', e));
}
// (straight in with ?nointro: the story's overlays, its sound and story mode, which the intro would have set up)
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

export async function start(W, { at = 'start', keep = false } = {}) {
  if (W.mission) W.mission.stop();
  W.between?.stop();
  const M = (W.mission = createMission(W, { keep }));
  return M.run(at);
}

/* ----------------------------------------------------- between missions -- */
// The way to the next mission, GTA's: its contact's letter on the radar (always, held at the edge), the route to it,
// the corona of light where it starts, the objective with them. No reminders on a timer: after a genuine stall the GPS
// offers real help once (gps.js), with one gentle line from the contact (note). Into the corona on foot (or stopped in
// it in the car): onArrive.
function between(W, { letter, at, name, objective, note = null, onArrive, radius = 2.2 }) {
  const app = W.app, cm = app.controllerManager, P = W.person, car = W.car, ui = W.ui;
  const gps = W.gps || (W.gps = createGPS(W));
  ui.step?.('free:' + letter);
  const m = createMarker(THREE, app.scene, { color: '#FFC93C', radius, height: 2.2, alpha: 0.3 });
  m.at(at.x, cm.getGroundHeight(at.x, at.z, 'person'), at.z);
  const dest = { x: at.x, z: at.z, name };
  const setObjective = () => {
    if (gps.objective) gps.objective(objective, dest, { blip: false }); else { ui.objective(objective); gps.set(dest); }
    gps.unblip('dest');
    gps.blip('next', { x: at.x, z: at.z, kind: 'letter', letter, pulse: 6, edge: true, name });
    gps.stallNote = note;
  };
  setObjective();
  let live = true, arrived = false;
  const B = {
    marker: m, objective: setObjective, at,
    stop() { live = false; m.hide(); app.scene.remove(m.group); gps.unblip('next'); gps.unblip('car'); if (gps.stallNote === note) gps.stallNote = null; if (gps.dest && gps.dest.x === at.x && gps.dest.z === at.z) gps.clear(); if (W.between === B) W.between = null; },
  };
  (function loop() {
    if (!live) return;
    requestAnimationFrame(loop);
    if (W.paused || W.cutscene || W.mission?.running) return;
    gps.update();
    const inCar = cm.activeMode === 'car', p = inCar ? car.position : P.position;
    document.body.classList.toggle('wg-onfoot', !inCar);
    // (his car on the radar while he is away from it)
    if (!inCar && Math.hypot(car.position.x - P.position.x, car.position.z - P.position.z) > 25) gps.blip('car', { x: car.position.x, z: car.position.z, kind: 'car', edge: true, name: car.label || "Quant's car" });
    else gps.unblip('car');
    const d = Math.hypot(p.x - at.x, p.z - at.z);
    if (!arrived && (inCar ? d < radius + 4.5 && Math.abs(car.speed) < 3 : d < radius && Math.abs(p.y - cm.getGroundHeight(at.x, at.z, 'person')) < 1.2)) {
      arrived = true; onArrive?.(B);
    }
    if (d > radius + 6) arrived = false;
  })();
  W.between?.stop(); W.between = B;
  return B;
}

// After Mission 1: Juno's DM, then the way to Bryant Park (and Mission 2 at the corona there)
export function handoff(W, { quick = false } = {}) {
  const ui = W.ui, sfx = W.sfx;
  W.mission?.stop?.(); // (Mission 1 is over: its loop, blips and marker go)
  (async () => {
    if (!quick) await sleep(200);
    sfx?.play('buzz', { gain: 0.18, times: 1 }); sfx?.play('ding', { gain: 0.16 }); W.audio?.play?.('phoneBuzz');
    ui.dm('Juno', "that burner is a gift. bring it to me and i'll crack it open. bryant park, 6th ave side. try not to get mugged on the way.", 10);
    await sleep(2200);
    between(W, {
      letter: 'J', at: J_AT, name: 'Juno · Bryant Park', objective: ['Bring the burner to ', { Juno: 'blue' }, ' at ', { 'Bryant Park': 'yellow' }, '.'],
      note: ['Juno', "no rush. i'm at bryant park, 6th ave side. the J on your radar."],
      onArrive: (b) => { b.stop(); start(W, { at: 'start' }).catch((e) => console.error('[m2]', e)); },
    });
    await sleep(1800);
    ui.help(['A new mission is available. Go to the ', { J: 'yellow' }, ' on the Radar.'], 9);
  })();
}

/* ---------------------------------------------------------- the mission -- */
function createMission(W, { keep = false } = {}) {
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
  // the lines: subtitles (their recorded voices play from them, wagmi/radio), held for their reading time or their
  // voice, a mumble where there is no voice; onLine(who) as each starts
  const VOICE = { Quant: 152, Juno: 212, Lev: 98, Bagsy: 104 };
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
      // (Juno talking: her wave and her mouth on the call)
      const talk = setInterval(() => { if (who === 'Juno' && U.call.on) U.call.talk(0.5 + Math.random() * 0.5); }, 90);
      await gsleep(secs * 1000); clearInterval(talk); if (who === 'Juno' && U.call.on) U.call.talk(0);
      ui.sub(null); await gsleep(pause * 1000);
    }
  }
  const objective = (parts, target = null) => {
    if (gps.objective) gps.objective(parts, target, { blip: !!target && !target.follow });
    else { ui.objective(parts); if (target && !target.follow) gps.set(target); else gps.clear(); }
  };
  const holds = (rects) => app.trafficSystem.hold?.(rects);
  const twilight = () => { if (app.lightingSystem?.activePresetId !== 'twilight') app.selectTime?.('twilight'); };
  // (kept through a checkpoint restart: the card counts the whole mission)
  const stats = carry(W, 'm2', keep, () => ({ t0: now(), hits: 0, rekt: 0, quiet: 0, lookouts: 0 }));
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
    for (const f of hooks) { try { f(); } catch (e) { console.warn('[m2]', e); } }
    const hp = W.combat?.player?.hp; if (hp != null) { if (lastHp != null && hp < lastHp - 0.5) stats.hits++; lastHp = hp; }
  })();
  const hook = (f) => { hooks.add(f); return () => hooks.delete(f); };
  // a frame clock for the hooks that move things (game time: still while paused)
  let lastT = now();
  const frameDt = () => { const t = now(), d = Math.min(0.05, (t - lastT) / 1000); lastT = t; return d; };

  /* -------------------------------------------------------- the cast -- */
  const S = { chev: null, C: null, Y: null, L: null, lev: null, phone: null, stealth: null, crew: null, vanD: null, levD: null, levHp: 100, alarm: false, flee: false, engine: null, crashAt: null, phoneAt: null };
  async function sets() {
    if (!S.C) S.C = await getCast(W);
    if (!S.Y) { S.Y = buildYard(W); S.Y.warm(); }
    if (!S.L) S.L = buildLevCar(W);
    if (!S.chev) S.chev = buildChevron(W);
    if (!S.phone) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.011, 0.15), new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.4, metalness: 0.5 }));
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#B6FF3B', emissiveIntensity: 1.4 }));
      scr.rotation.x = -PI / 2; scr.position.y = 0.0062; g.add(body, scr); g.visible = false; app.scene.add(g); S.phone = g;
    }
    return S;
  }
  const levRig = async () => S.lev || (S.lev = await buildLev(W));
  // things standing in the yard: the van by the stash, Lev's car at the side gate (both solid while parked)
  function parkInYard({ van = true, lev = true } = {}) {
    const { C, Y, L } = S, Cc = cm.colliders;
    for (let i = Cc.length - 1; i >= 0; i--) if (Cc[i].wagmi === 'm2park') Cc.splice(i, 1);
    // (a box round each, its long side along its heading: they park along x or along z)
    const box = (x, z, h, hw, hl, top) => { const along = Math.abs(Math.sin(h)) > 0.7, ex = along ? hl : hw, ez = along ? hw : hl; Cc.push({ minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez, maxY: top, wagmi: 'm2park' }); };
    if (van) { const [x, z, h] = Y.vanAt; C.van.group.visible = true; C.van.group.position.set(x, 0, z); C.van.group.rotation.set(0, h, 0); C.van.setDoor(1); C.van.update(0, 0, 0); box(x, z, h, 1.0, 2.8, 2.4); }
    if (lev) { const [x, z, h] = Y.levAt; L.group.visible = true; L.group.position.set(x, 0, z); L.group.rotation.set(0, h, 0); box(x, z, h, 0.95, 2.3, 1.5); }
    cm._colliderCells = null;
  }
  function unpark() { const Cc = cm.colliders; for (let i = Cc.length - 1; i >= 0; i--) if (Cc[i].wagmi === 'm2park') Cc.splice(i, 1); cm._colliderCells = null; }

  function tidy() {
    hooks.clear(); ui.objective(null); ui.sub(null); ui.help(null); ui.counter(null); ui.caller(null); ui.hold(null); ui.phone.hide(); U.clear();
    gps.clear(); for (const id of [...gps.blips.keys()]) gps.unblip(id);
    S.engine?.stop(0.4); S.engine = null;
  }
  // everything the mission put in the world, put away (a restart, the end, a quit)
  function teardown() {
    tidy(); holds([]);
    S.stealth?.dispose(); S.stealth = null; S.crew = null;
    if (S.Y) S.Y.show(false); unpark();
    if (S.L) { S.L.group.visible = false; S.L.smoke(false); }
    if (S.phone) S.phone.visible = false;
    if (S.lev) S.lev.root.visible = false;
    if (S.C) S.C.van.group.visible = false;
    S.chev?.hide();
  }
  // (x, z) in the camera's view
  const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sp = new THREE.Sphere(new THREE.Vector3(), 3.5);
  function inView(x, z) { const c = app.cameraSystem.camera; _pm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm); _sp.center.set(x, 1, z); return _fr.intersectsSphere(_sp); }
  // the nearest spot from (x, z) at least 1.5 m up on a sidewalk, clear of the walls, facing the street: [x, z, h] or null
  function curbSide(x, z) {
    const v = new THREE.Vector3();
    for (let r = 2; r <= 30; r++) for (let k = 0; k < 24; k++) {
      const a = (k / 24) * PI * 2, dx = Math.sin(a), dz = Math.cos(a), qx = x + dx * r, qz = z + dz * r;
      if (!cm.isPointOnSidewalk(qx, qz) || !cm.isPointOnSidewalk(qx - dx * 1.5, qz - dz * 1.5)) continue;
      v.set(qx, 0.2, qz); cm.resolveHorizontalCollision(v, 0.5, 1.2);
      if (Math.abs(v.x - qx) + Math.abs(v.z - qz) < 0.01) return [qx, qz, Math.atan2(-dx, -dz)];
    }
    return null;
  }
  // into the car at (x, z), facing h
  function inTheCar(x, z, h) { place(W, { car: [x, z, h] }); P.inVehicle = true; P.mesh.visible = false; P.speed = 0; app.selectMode('car'); }
  const blipCar = () => gps.blip('car', { x: car.position.x, z: car.position.z, kind: 'car', edge: true, name: car.label || "Quant's car" });
  const vanDriver = () => createDriver(W, { obj: S.C.van.group, path: VAN_ROUTE, halfW: 1.0, halfL: 2.8, accel: 3.6, onWheels: (dt, v, st) => S.C.van.update(dt, v, st) });

  /* --------------------------------------------------------- the phases -- */
  const PHASES = {
    // the scene at Bryant Park
    async start(fresh) {
      if (fresh) place(W, { car: [-303.5, 66, PI], quant: [J_AT.x, J_AT.z, PI] });
      // (his car stopped on the corona: moved to the curb, out of the scene's way)
      else if (dist(car.position, J_AT.x, J_AT.z) < 4.5) place(W, { car: [-303.5, J_AT.z + 9, PI] });
      // (the bars in while the sets load: control is his again after the scene)
      W.cutscene = true; ui.cine(true); cm.resetInput?.();
      if (!S.C || !S.Y) { ui.fade(1, 0.35); await sets(); ui.fade(0, 0.6); } else await sets();
      twilight();
      W.combat?.clear?.();
      // the meeting (the point of the trip): Juno there in person, the burner handed over and opened on her laptop, the
      // twin found in Times Square: m2-scenes.js burnerMeet(W, { U, say, van, at }) when the characters track has it (a
      // scene def for runScene, or a promise that plays itself); until then, her video call from the library's wifi
      const meet = SCENES.burnerMeet;
      const def = meet ? meet(W, { U, say, van: S.C.van, at: J_AT }) : burnerScene(W, { U, say, van: S.C.van });
      if (def && typeof def.then !== 'function') def.setup?.();
      // (the street crowd kept off his stretch of the sidewalk, curb to terrace, Juno's table and the street-side cameras
      // west of it, and the curb by the van in Times Square for the cutaway, while it plays: nobody walks through its
      // close shots; the avenues' traffic is left be, but for the curb lane where his car stands. The traffic's hold
      // goes first: street/index.js hands the traffic's rects to the crowd too, so the crowd's own hold is set after it)
      holds([{ minX: car.position.x - 2, maxX: car.position.x + 2, minZ: car.position.z - 7, maxZ: car.position.z + 7 }]);
      W.street?.crowd?.hold([{ minX: J_AT.x - 4, maxX: J_AT.x + 6, minZ: J_AT.z - 14, maxZ: J_AT.z + 12 }, { minX: -598, maxX: -584, minZ: -462, maxZ: -432 }]);
      try { if (def && typeof def.then === 'function') await def; else await runScene(W, def); } finally { W.street?.crowd?.hold([]); holds([]); }
      // (where play goes on: the meeting's scene leaves him where it ends; the call, at the J)
      if (!meet) place(W, { quant: [J_AT.x, J_AT.z, PI] });
    },
    // to Times Square: the van at the curb, idling
    async go(fresh) {
      // (straight in, from the pause menu: in his car at the curb by the park, the drive ahead of him)
      if (fresh) { twilight(); inTheCar(-303.5, 66, PI); }
      await sets(); twilight();
      S.vanD = vanDriver(); const vanD = S.vanD;
      vanD.place(0); S.C.van.group.visible = true; S.C.van.setDoor(0);
      holds(TAIL_HOLDS);
      // the step's objective, as it stands: the drive, then (Times Square reached) the van; out of the car by the van,
      // back into it, and the step's own again once he is
      const goObj = () => objective(['Go to ', { 'Times Square': 'yellow' }, '.'], { x: -589, z: -488, name: 'Times Square · 7th Ave & W 47th St' });
      const findObj = () => objective(['Find the ', { van: 'red' }, '. Stay in your car.'], null);
      goObj();
      let footTold = false;
      const off = hook(() => {
        const d = dist(me(), vanD.pos.x, vanD.pos.z);
        if (d < 260) gps.blip('van', { x: vanD.pos.x, z: vanD.pos.z, kind: 'enemy', edge: true, name: 'The van' }); else gps.unblip('van');
        if (d < 160) S.chev.at(vanD.pos.x, vanD.pos.y + 3.4, vanD.pos.z, frameDt()); else S.chev.hide();
        // (Times Square reached: from here a restart puts him in his car behind the van, not back at the park)
        if (!S.square && d < 160) { S.square = true; ui.place('Times Square', 'Midtown · WAGMI City', 3); findObj(); }
        if (!inCar() && d < 60 && !footTold) { footTold = true; objective(['Get back in your ', { car: 'blue' }, '.'], null); blipCar(); }
        if (inCar() && footTold) { footTold = false; gps.unblip('car'); if (S.square) findObj(); else goObj(); }
        // (right on top of it: they know)
        if (inCar() && d < 9) S.flee = true;
      });
      try { await wait(() => S.flee || (inCar() && dist(car.position, vanD.pos.x, vanD.pos.z) < 75)); } finally { off(); gps.unblip('car'); S.chev.hide(); }
    },
    // the tail
    async tail(fresh) {
      // (played straight in: the light and his car first, the sets after: a slow load doesn't leave him at the city's
      // own start in its golden hour)
      // (a restart: in his car 50 m behind the van at the curb, in GOOD range; his lane and the block ahead held clear
      // of the traffic, so no bus stands between them)
      if (fresh) { twilight(); inTheCar(...TAIL_CAR); holds(TAIL_HOLDS); }
      await sets(); twilight();
      const { C } = S;
      if (fresh || !S.vanD) {
        S.vanD = vanDriver(); S.vanD.place(0); C.van.group.visible = true; C.van.setDoor(0);
        inTheCar(...TAIL_CAR);
        holds(TAIL_HOLDS);
      }
      const vanD = S.vanD;
      gps.unblip('van');
      // (its tail lamps up for the tail, brighter when it brakes: a dark van on a dark street stays in sight)
      let lamps = null; C.van.group.traverse((o) => { if (!lamps && o.isMesh && o.material?.emissive?.getHex() === 0xFF2A1A) lamps = o.material; });
      const lamps0 = lamps?.emissiveIntensity ?? 0;
      let sus = 0, farT = 0, lost = false, helped = false, called = false, onFootT = 0, yardUp = false, lastV = vanD.v, goT = null;
      const t0 = now();
      // (a tail has no route: the van's blip and the chevron over it, GTA's way)
      const vanTarget = null;
      const say1 = () => objective(S.flee ? ["Don't lose the ", { van: 'red' }, '.'] : ['Follow the ', { van: 'red' }, ". Don't get too close."], vanTarget);
      say1();
      S.engine = sfx?.engine?.();
      const off = hook(() => {
        const dt = frameDt(), t = (now() - t0) / 1000;
        const p = me(), d = dist(p, vanD.pos.x, vanD.pos.z);
        // the van's pace: its own (brisk: the tail is a minute and a half, not three), slowed when he falls behind (a tail
        // is followed, not raced), quicker when he's close; pulling out from the curb it takes its time (he has the
        // corner to make)
        let want = (S.flee ? 27 : 23.5) * (d < 70 ? 1 : d < 100 ? 0.8 : d < 130 ? 0.6 : 0.35);
        if (!S.flee && d < 18) want *= 1.12;
        // (a fair start: it idles at the curb till he's rolling in his car (or 10 s), then pulls out gently, so he
        // makes its first corner with it)
        if (goT == null && (S.flee || t > 10 || (inCar() && Math.abs(car.speed) > 2.5 && d < 90))) goT = t;
        if (goT == null) want = 0;
        // (pulling out: gently, but quicker with him close behind it, so a heavy right foot doesn't run him into it)
        else if (!S.flee) want = Math.min(want, 6 + (t - goT) * (d < 30 ? 3 : 1.4));
        if (!inCar()) want = Math.min(want, 7);
        vanD.step(dt, want);
        if (lamps && dt > 0) { lamps.emissiveIntensity += ((vanD.v < lastV - dt * 1.5 || vanD.v < 0.5 ? 9 : 3.5) - lamps.emissiveIntensity) * Math.min(1, dt * 10); lastV = vanD.v; }
        S.chev.at(vanD.pos.x, vanD.pos.y + 3.4, vanD.pos.z, dt);
        gps.blip('van', { x: vanD.pos.x, z: vanD.pos.z, kind: 'enemy', edge: true, name: 'The van' });
        S.engine?.set(clamp(vanD.v / 30), clamp(14 / Math.max(6, d)) * 0.35);
        // suspicion: too close, or sitting in its mirrors (right behind it, close)
        if (!S.flee) {
          const fx = Math.sin(vanD.heading), fz = Math.cos(vanD.heading), bx = p.x - vanD.pos.x, bz = p.z - vanD.pos.z;
          const behind = -(bx * fx + bz * fz), lat = Math.abs(bx * fz - bz * fx), mirror = behind > 0 && lat < 3 && d < 24;
          // (its first seconds at the curb and pulling out: a slow fill, he's still finding his distance)
          const early = goT == null || t - goT < 6 ? 0.35 : 1;
          if (d < 12) sus += dt * 0.55 * early; else if (mirror) sus += dt * 0.12 * early; else sus = Math.max(0, sus - dt * 0.12);
          if (sus >= 1) {
            S.flee = true; sus = 1;
            objective(['You were ', { spotted: 'red' }, ". Don't lose the ", { van: 'red' }, '.'], vanTarget);
            W.audio?.play?.('horn', { pos: [vanD.pos.x, 1, vanD.pos.z] }); sfx?.play('squeal', { gain: 0.3, dur: 0.9 });
          }
        }
        const zone = d < 12 ? ['TOO CLOSE', '#EF4444'] : d < 18 ? ['CLOSE', '#F59E0B'] : d < 70 ? ['GOOD', '#FFC93C'] : d < 100 ? ['FALLING BEHIND', '#FFFFFF'] : ['LOSING THEM', '#EF4444'];
        U.tail.set({ d, sus, note: S.flee ? 'SPOTTED · KEEP UP' : zone[0], color: S.flee ? '#EF4444' : zone[1] });
        if (!helped && t > 1.5) { helped = true; ui.help('Keep the van in sight. Too close and they spot you, too far and you lose it. Watch the meter.', 9); }
        // losing it
        if (d > 110) { farT += dt; if (!lost) { lost = true; objective(["Don't lose the ", { van: 'red' }, '.'], vanTarget); } } else { farT = Math.max(0, farT - dt); if (lost && d < 80) { lost = false; say1(); } }
        // (not in its first seconds on the move: he's still making the corner)
        if (goT != null && t - goT > 14 && ((d > 140 && farT > 5) || d > 240)) fail('The van got away.');
        // out of the car on the way
        if (!inCar()) { onFootT += dt; if (onFootT > 1.5 && onFootT - dt <= 1.5) objective(['Get back in your ', { car: 'blue' }, '.'], null); blipCar(); } else if (onFootT) { onFootT = 0; gps.unblip('car'); say1(); }
        // Juno calls a little way in
        if (!called && t > 9 && !S.flee) { called = true; junoTail(); }
        // the yard goes up before it can be seen
        if (!yardUp && dist(vanD.pos, YARD.cx, YARD.cz) < 750) { yardUp = true; S.Y.show(true); parkInYard({ van: false, lev: true }); spawnYard(); }
      });
      try { await wait(() => vanD.done); } finally { off(); U.tail.hide(); S.chev.hide(); S.engine?.stop(0.8); S.engine = null; if (lamps) lamps.emissiveIntensity = lamps0; }
      holds([]);
      gps.unblip('van');
      parkInYard({ van: true, lev: true });
      if (!S.stealth) await spawnYard();
    },
    // the yard: the lookouts
    async yard(fresh) {
      if (fresh) { twilight(); inTheCar(-1800, -1039.5, -PI / 2); place(W, { quant: [-1802, -1043.5, -PI / 2] }); }
      await sets(); twilight();
      if (fresh) { S.Y.show(true); parkInYard(); inTheCar(-1800, -1039.5, -PI / 2); place(W, { quant: [-1802, -1043.5, -PI / 2] }); await spawnYard(); }
      parkInYard();
      const stealth = S.stealth;
      if (S.flee) { S.alarm = true; return; }
      // (pulled up behind the van at the side gate, in the gate lookout's eye: a moment to stop and get out, told so)
      if (!fresh && stealth && inCar()) { stealth.grace = 6; ui.help(['Stop and get out: a lookout spots a ', { car: 'blue' }, ' from further off than a man on foot.'], 7); }
      objective(['Sneak up on the ', { stash: 'green' }, '.'], { x: S.Y.stash.x, z: S.Y.stash.z, name: 'The stash' });
      sfx?.play('buzz', { gain: 0.14, times: 1 }); W.audio?.play?.('phoneBuzz');
      ui.dm('Juno', "that's a lot of shipping containers for a moving company. lookouts on the gates. go quiet.", 8);
      gps.blip('stash', { x: S.Y.stash.x, z: S.Y.stash.z, kind: 'object', edge: true, name: 'The stash' });
      delay(stealth?.grace > 0 ? 7 : 1.2).then(() => ui.help(['Lookouts see down the ', { 'yellow cones': 'yellow' }, '. Get behind one and press [E] to take him down quietly.'], 10)).catch(() => {});
      let spotted = null, reached = false;
      const off = hook(() => {
        const dt = frameDt();
        spotted = stealth?.step(dt) || spotted;
        // the crew at the stash, and the stash itself
        if (dist(me(), S.Y.stash.x, S.Y.stash.z) < 6.5) reached = true;
        for (const e of S.crew?.enemies || []) if (e.alive && dist(me(), e.pos.x, e.pos.z) < 7) reached = true;
        if (dist(me(), YARD.cx, YARD.cz) > 400) fail('You left the yard.');
      });
      try { await wait(() => spotted || reached); } finally { off(); }
      stats.quiet = stealth?.quiet || 0; stats.lookouts = stealth?.down || 0;
      gps.unblip('stash');
      if (spotted) {
        ui.objective(['You were ', { spotted: 'red' }, '.']);
        W.audio?.play?.('horn', { pos: [YARD.cx, 1, YARD.cz] }); sfx?.play('shout', { gain: 0.4, f0: 150, vowel: 'a', dur: 0.6 });
        await say([['Lev', ACID, "Who's that? Liquidate him!"]]);
      } else await say([['Lev', ACID, 'Wait. Coin kid? In MY yard? Liquidate him!']]);
      S.alarm = true;
    },
    // the fight in the yard
    async fight(fresh) {
      if (fresh) { twilight(); place(W, { car: [-1840, -1039.5, -PI / 2], quant: [-1928, -1040, PI / 2] }); }
      await sets(); twilight();
      const combat = W.combat;
      if (fresh) { S.Y.show(true); parkInYard(); place(W, { car: [-1840, -1039.5, -PI / 2], quant: [-1928, -1040, PI / 2] }); await spawnYard(); }
      if (!combat?.spawnCrew) { ui.help('The fight is coming soon.', 4); await delay(3); return; }
      // (a yard of them: his health stretched for it (130), a slow second wind when he's kept out of reach a few
      // seconds, and a top-up between the waves)
      const maxHp0 = combat.player.maxHp; combat.player.maxHp = 130;
      combat.player.hp = combat.player.maxHp; lastHp = combat.player.hp;
      const autoGetUp = combat.player.autoGetUp; combat.player.autoGetUp = false;
      const offDown = combat.player.onDown(() => fail('Quant got rekt.', true));
      let offFight = null;
      try {
        S.alarm = true; S.stealth?.alarm(); wakeCrew();
        // two waves: the lookouts still up and the crew at the stash; down to their last man, two more out of the
        // containers at the back (a brute among them)
        const crews = [S.crew, S.stealth?.crew].filter(Boolean), WAVE2 = 2;
        const alive = () => crews.reduce((n, c) => n + c.alive(), 0);
        let wave2 = null;
        const total = alive() + WAVE2;
        const down = () => total - alive() - (wave2 ? 0 : WAVE2);
        objective(['Beat up the ', { Degens: 'red' }, '.'], null);
        ui.counter('DEGENS', `0/${total}`);
        delay(1.5).then(() => ui.help(['Press [E] by a ', { 'trash can': 'green' }, ' or a ', { bottle: 'green' }, ' to pick it up. [E] again throws it.'], 9)).catch(() => {});
        let warned = false, half = false, barkT = now() + 9000, hurtT = now(), hp0 = combat.player.hp;
        const barks = ["I'm too leveraged to fight! Somebody hit him!", 'Number go up! Hit him harder!', 'Do you know what my liquidation price is?'];
        offFight = hook(() => {
          const dt = frameDt(), hp = combat.player.hp;
          if (hp < hp0 - 0.5) hurtT = now(); hp0 = hp;
          if (hp > 0 && !combat.player.down && now() - hurtT > 3500 && hp < combat.player.maxHp * 0.6) combat.player.hp = hp + 4 * dt;
          if (!wave2 && alive() <= 1) {
            wave2 = W.combat.spawnCrew({ x: -1932, z: -1062, count: 1, brute: 1, weapons: ['bottle'], aggro: true, props: false }).engage();
            crews.push(wave2);
            combat.player.hp = Math.max(combat.player.hp, combat.player.maxHp * 0.8);
            sfx?.play('ding', { gain: 0.14 });
            ui.help(['Second wind: ', { 'health topped up': 'green' }, '. More of them coming out of the containers.'], 6);
            say([['Lev', ACID, "Everybody out of the boxes! You're all on payroll!"]]).catch(() => {});
          }
          const live = new Set();
          for (const e of combat.enemies) if (e.alive && dist(e.pos, P.position.x, P.position.z) < 150) { live.add('e:' + e.id); gps.blip('e:' + e.id, { x: e.pos.x, z: e.pos.z, kind: 'enemy' }); }
          for (const id of [...gps.blips.keys()]) if (id.startsWith('e:') && !live.has(id)) gps.unblip(id);
          ui.counter('DEGENS', `${down()}/${total}`);
          if (!half && down() >= Math.ceil(total / 2)) { half = true; say([['Lev', ACID, barks[0]]]).catch(() => {}); barkT = now() + 12000; }
          if (now() > barkT) { barkT = now() + 14000; say([['Lev', ACID, barks[1 + Math.floor(Math.random() * 2)]]]).catch(() => {}); }
          const d = dist(me(), YARD.cx, YARD.cz);
          if (d > 150) fail('You left the fight.');
          else if (d > 90 && !warned) { warned = true; ui.objective(['Get back to the ', { fight: 'yellow' }, '.']); }
          else if (d < 80 && warned) { warned = false; ui.objective(['Beat up the ', { Degens: 'red' }, '.']); }
        });
        await wait(() => wave2 && crews.every((c) => c.alive() === 0));
        stats.rekt = total;
      } finally { offFight?.(); offDown?.(); combat.player.autoGetUp = autoGetUp; combat.player.maxHp = maxHp0; combat.player.hp = Math.min(combat.player.hp, maxHp0); }
      for (const id of [...gps.blips.keys()]) if (id.startsWith('e:')) gps.unblip(id);
      ui.counter(null);
      await delay(1.0);
    },
    // Lev bolts: the chase
    async chase(fresh) {
      if (fresh) { twilight(); inTheCar(...CHASE_CAR); }
      await sets(); twilight();
      if (fresh) { S.Y.show(true); parkInYard({ van: true, lev: true }); inTheCar(...CHASE_CAR); }
      W.combat?.clear?.(); S.stealth?.dispose(); S.stealth = null; S.crew = null;
      parkInYard({ van: true, lev: false });
      // (on foot after the fight with his car left far off: it waits by the side gate instead, when that isn't in view)
      if (!inCar() && dist(car.position, P.position.x, P.position.z) > 40 && !inView(-1886, -1049)) place(W, { car: [-1886, -1049, PI / 2] });
      const { L } = S;
      S.levHp = 100;
      let lastRam = 0;
      const levD = S.levD = createDriver(W, { obj: L.group, path: LEV_ROUTE, halfW: 0.95, halfL: 2.3, plow: true, accel: 6, brake: 9, stopAtEnd: false,
        onWheels: (dt) => L.update(dt),
        onHit: (sp) => {
          if (sp < 2.5 || now() - lastRam < 400) return; lastRam = now();
          S.levHp -= clamp((sp - 2) * 2.6, 4, 30); U.target("LEV'S CAR", 1 - Math.max(0, S.levHp) / 100);
          W.audio?.play?.('carHit', { pos: [levD.pos.x, 0.6, levD.pos.z], vol: clamp(sp / 12, 0.3, 1) }); if (sp > 7) W.audio?.play?.('glass', { pos: [levD.pos.x, 0.8, levD.pos.z], vol: 0.6 });
          if (Math.random() < 0.5) say([['Lev', ACID, ['My paint!', 'That was a margin call!', 'Rug pull! Rug pull!', 'This car is on loan!'][Math.floor(Math.random() * 4)]]]).catch(() => {});
        } });
      levD.place(0); L.group.visible = true; L.smoke(false);
      sfx?.play('squeal', { gain: 0.4, dur: 1.1 }); W.audio?.play?.('engineStart', { pos: [levD.pos.x, 0.8, levD.pos.z] });
      U.target("LEV'S CAR", 0);
      // (the GPS line on Lev, re-planned as he goes: the streets to him, not just his blip)
      const levTarget = { follow: () => levD.pos, name: 'Lev' };
      const go = () => objective(['Take down ', { Lev: 'red' }, '.'], levTarget);
      if (!inCar()) { objective(['Get in your ', { car: 'blue' }, '.'], null); blipCar(); } else go();
      say([['Lev', ACID, "You can't catch leverage, kid!"]]).catch(() => {});
      S.engine = sfx?.engine?.();
      let farT = 0, warned = false, wasIn = inCar(), everIn = wasIn, helped = false, juno = false, goT = null;
      const t0 = now();
      const off = hook(() => {
        const dt = frameDt(), t = (now() - t0) / 1000, p = me(), d = dist(p, levD.pos.x, levD.pos.z);
        // his pace: fast on the open roads, slower in the traffic; slowed when Quant falls back, quicker when he's on him
        const onOpen = levD.pos.z < -1000 && levD.pos.x < -1700;
        let want = onOpen ? 26 : 21;
        // (on foot: he dawdles till Quant's first in his car, then waits a little less)
        if (inCar()) everIn = true;
        if (!inCar()) want = Math.min(want, !everIn ? 4 : t < 30 ? 5 : 12);
        // (a fair start: in his car, Lev's engine revs till Quant is rolling (or 4 s), then he pulls away, building up)
        if (goT == null && (!inCar() || Math.abs(car.speed) > 3 || t > 4)) goT = t;
        if (goT == null) want = 0; else if (inCar()) want = Math.min(want, 9 + (t - goT) * 3);
        if (d > 90) want *= 0.8; if (d > 140) want *= 0.65; if (d > 200) want *= 0.6; if (d < 28) want *= 1.08;
        levD.step(dt, want);
        S.chev.at(levD.pos.x, levD.pos.y + 2.6, levD.pos.z, dt);
        gps.blip('lev', { x: levD.pos.x, z: levD.pos.z, kind: 'enemy', edge: true, name: 'Lev' });
        S.engine?.set(clamp(levD.v / 32), clamp(16 / Math.max(6, d)) * 0.4);
        if (inCar() && !wasIn) { go(); gps.unblip('car'); } if (!inCar() && wasIn) { objective(['Get back in your ', { car: 'blue' }, '.'], null); blipCar(); }
        wasIn = inCar();
        if (!helped && inCar() && t > 2) { helped = true; ui.help("Ram Lev's car to wreck it, or keep up until he crashes.", 8); }
        if (!juno && t > 14 && inCar()) { juno = true; junoChase(); }
        if (d > 150 && !warned) { warned = true; ui.objective([{ Lev: 'red' }, ' is getting away.']); } else if (d < 110 && warned) { warned = false; go(); }
        // (not while he's still running for his car at the start)
        if (d > 260 && everIn) farT += dt; else farT = Math.max(0, farT - dt);
        if (farT > 6 || d > 450) fail('Lev got away.');
      });
      try { await wait(() => levD.done || S.levHp <= 0); } finally { off(); S.chev.hide(); S.engine?.stop(0.6); S.engine = null; gps.unblip('lev'); }
      U.target(null);
      // the crash: where the rams wrecked him, or into Greeley Square at the end of his run
      const wreck = S.levHp <= 0 && !levD.done;
      S.crashAt = wreck ? { x: levD.pos.x, z: levD.pos.z, h: levD.heading + 0.7, run: [Math.sin(levD.heading), Math.cos(levD.heading)] } : { ...CRASH };
      W.audio?.play?.('carHit', { pos: [S.crashAt.x, 0.8, S.crashAt.z], vol: 1 }); W.audio?.play?.('glass', { pos: [S.crashAt.x, 0.8, S.crashAt.z], vol: 0.9 });
      sfx?.play('thunk', { gain: 0.5, f: 60 });
    },
    // the crash, and Lev's phone on the ground
    async crash(fresh) {
      await sets(); twilight();
      const at = S.crashAt || { ...CRASH };
      if (fresh) inTheCar(at.x - 18, at.z + 22, PI / 2);
      // (his car stopped, clear of the wreck)
      car.speed = 0; car.vx = car.vz = 0; car.angularVel = 0;
      const dc = dist(car.position, at.x, at.z);
      if (dc < 10) { const k = 10 / Math.max(0.5, dc); car.position.x = at.x + (car.position.x - at.x) * k; car.position.z = at.z + (car.position.z - at.z) * k; car.mesh.position.copy(car.position); }
      const lev = await levRig();
      S.L.smoke(true);
      // (the crash site kept clear of the traffic and the walkers, M1's way, while the scene plays and his phone lies
      // there: let go at the mission's end)
      holds([{ minX: at.x - 18, maxX: at.x + 18, minZ: at.z - 18, maxZ: at.z + 18 }]);
      const def = crashScene(W, { levCar: S.L, lev, phone: S.phone, say, at });
      def.setup();
      await runScene(W, def);
      S.phoneAt = def.drop;
    },
    async phone(fresh) {
      await sets(); twilight();
      const at = S.crashAt || { ...CRASH };
      if (fresh) {
        S.L.group.visible = true; S.L.group.position.set(at.x, 0, at.z); S.L.group.rotation.set(0, at.h, 0.04); S.L.smoke(true);
        place(W, { car: [at.x + 14, at.z - 16, PI], quant: [at.x + 7, at.z - 6, -PI * 0.75] });
      }
      const drop = S.phoneAt || crashScene(W, { levCar: S.L, lev: null, phone: S.phone, say, at }).drop;
      holds([{ minX: Math.min(at.x, drop[0]) - 18, maxX: Math.max(at.x, drop[0]) + 18, minZ: Math.min(at.z, drop[1]) - 18, maxZ: Math.max(at.z, drop[1]) + 18 }]);
      S.phone.visible = true; S.phone.position.set(drop[0], cm.getGroundHeight(drop[0], drop[1], 'person') + 0.012, drop[1]); S.phone.rotation.set(0, 0.6, 0);
      objective(['Take ', { "Lev's phone": 'green' }, '.'], null);
      gps.blip('phone', { x: drop[0], z: drop[1], kind: 'object', edge: true, name: "Lev's phone" });
      const spot = createMarker(THREE, app.scene, { color: '#4ADE80', radius: 0.7, height: 0.8, alpha: 0.3 }); spot.at(drop[0], cm.getGroundHeight(drop[0], drop[1], 'person'), drop[1]);
      let carTold = false;
      // (the ring a few metres out, the pick-up from anywhere near it: ui.holdAct)
      const act = ui.holdAct({ label: "take Lev's phone", noun: "Lev's phone", secs: 1.0, show: 8, reach: 2.8 });
      try {
        await wait(() => {
          const dt = frameDt();
          S.L.update(dt);
          if (inCar() && !carTold && dist(car.position, drop[0], drop[1]) < 30) { carTold = true; ui.help('Press [F] to get out.', 6, { mode: 'car' }); }
          return act.step(dt, dist(P.position, drop[0], drop[1]), !inCar());
        });
      } finally { act.stop(); spot.hide(); app.scene.remove(spot.group); }
      gps.unblip('phone'); S.phone.visible = false;
      const h = Math.atan2(drop[0] - P.position.x, drop[1] - P.position.z) + PI;
      const def = phoneScene(W, { U, say, at: [P.position.x, P.position.z, h] });
      def.setup();
      await runScene(W, def);
    },
  };
  const ORDER = ['start', 'go', 'tail', 'yard', 'fight', 'chase', 'crash', 'phone'];
  // (the fight lost: back to the yard's own start, the lookouts at their posts again, the quiet way open again)
  const CHECKPOINT = { start: 'start', go: 'go', tail: 'tail', yard: 'yard', fight: 'yard', chase: 'chase', crash: 'chase', phone: 'phone' };
  // (a skip goes on to the next thing that happens: the chase's skip still plays the crash, Lev's car and all)
  const SKIP_TO = { chase: 'crash' };
  const LABELS = { start: 'Bryant Park', go: 'To Times Square', tail: 'Times Square · the tail', yard: 'The yard', fight: 'The fight', chase: 'The chase', phone: "Lev's phone" };
  // the checkpoint he'd restart from now: Times Square reached, the tail's (in his car behind the van), not the park's
  const checkpointNow = () => (M._phase === 'go' && S.square ? 'tail' : CHECKPOINT[M._phase] || 'start');

  // the yard's people: the lookouts at their posts, the crew at the stash (none of them awake yet)
  async function spawnYard() {
    if (S.stealth || !W.combat?.spawnCrew) return;
    const Y = S.Y;
    const stealth = S.stealth = createStealth(W, { posts: Y.posts, U, center: { x: YARD.cx, z: YARD.cz } });
    await stealth.spawn();
    // three at the stash, trash cans and bottles about, facing their table (until the alarm; two more wait in the
    // containers for the fight's second wave)
    const cx = Y.stash.x - 1.5, cz = Y.stash.z - 5;
    const crew = S.crew = W.combat.spawnCrew({ x: cx, z: cz, count: 3, brute: 0, weapons: ['bottle'], aggro: false, props: { cans: 3, bottles: 4 } });
    crew.enemies.forEach((e, i) => {
      const a = i / crew.enemies.length * PI * 2, r = 3.0 + (i % 2) * 1.3, x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
      e.pos.set(x, cm.getGroundHeight(x, z, 'person'), z);
      const face = Math.atan2(cx - x, cz - z), up = e.update.bind(e);
      e.update = (dt) => { up(dt); if (!S.alarm && e.alive && e.state === 'idle') { e.yaw = face; e.root.rotation.y = face; } };
      e._m2restore = () => { e.update = up; };
    });
  }
  function wakeCrew() { for (const e of S.crew?.enemies || []) e._m2restore?.(); S.crew?.engage(); }

  // Juno on the phone during the tail (the caller card, in the car)
  async function junoTail() {
    const t = tok;
    sfx?.play('ring', { gain: 0.14, times: 1 }); ui.caller('Juno', BLUE, 'Incoming call'); await gsleep(1600);
    if (t.dead || S.flee) { ui.caller(null); return; }
    ui.caller('Juno', BLUE, 'On call');
    await say([
      ['Juno', BLUE, "I've got the van. HODL Moving Co. 'We never let go.' Cute."],
      ['Quant', WHITE, 'They took my dog, Juno. None of this is cute.'],
      ['Juno', BLUE, "It's registered to a Leverage Larry. Lev. He runs Midtown for the Degens."],
      ['Quant', WHITE, 'Leverage Larry. Did his parents hate him?'],
      ['Juno', BLUE, 'He picked it. He has it tattooed. In Comic Sans.'],
      ['Juno', BLUE, "Hang back. If they make you, they'll bolt."],
    ], t).catch(() => {});
    ui.caller(null);
  }
  async function junoChase() {
    const t = tok;
    sfx?.play('ring', { gain: 0.14, times: 1 }); ui.caller('Juno', BLUE, 'On call'); await gsleep(900);
    await say([['Juno', BLUE, "That's Lev's car. He's heading for Herald Square."], ['Juno', BLUE, 'Ram him, Quant. Gently. Ish.'], ['Quant', WHITE, "There's no gentle way to ram a car."]], t).catch(() => {});
    ui.caller(null);
  }

  /* --------------------------------------------------- passed, hand-off -- */
  async function passed() {
    teardown();
    // (left standing in the road where Lev's phone was: onto the nearest sidewalk, under a quick fade)
    if (!inCar() && !cm.isPointOnSidewalk(P.position.x, P.position.z)) {
      const s = curbSide(P.position.x, P.position.z);
      if (s) { await ui.fade(1, 0.3); place(W, { quant: s }); await ui.fade(0, 0.5); }
    }
    const secs = Math.round((now() - stats.t0) / 1000);
    sfx?.play('passed');
    await ui.passed({ title: 'Burner', stats: [
      ['TIME', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`], ['DEGENS REKT', String(stats.rekt || 0)],
      ['QUIET TAKEDOWNS', `${stats.quiet}/3`], ['HITS TAKEN', String(stats.hits)],
    ], reward: '+9,800', note: '#CoinKidChase is trending · NEW: trash cans and bottles' }, 6);
    W.followers = (W.followers || 0) + 9800;
    await gsleep(3500);
    // Juno, then Pete, then the way to Gears' garage
    sfx?.play('ring', { gain: 0.14, times: 1 }); ui.caller('Juno', BLUE, 'On call'); await gsleep(1000);
    await say([
      ['Juno', BLUE, "I saw the chat. They know where you live, so you're not sleeping there tonight."],
      ['Quant', WHITE, 'Where am I sleeping?'],
      ['Juno', BLUE, "Gears has a room over his garage. West Chelsea. He builds rockets for cars. He's nice. Mostly."],
    ], { dead: false }).catch(() => {});
    ui.caller(null);
    await gsleep(1200);
    sfx?.play('buzz', { gain: 0.18, times: 2 }); sfx?.play('ding', { gain: 0.14 }); W.audio?.play?.('phoneBuzz');
    ui.dm('Unknown number', "this is pete. from lev's chat. i want out. i know where they're taking the dog. i'll DM you tomorrow. -P", 12);
    await gsleep(2500);
    W.progress = { ...(W.progress || {}), m2: true };
    between(W, {
      letter: 'G', at: G_AT, name: "Gears' garage · W 22nd St", objective: ['Go to ', { "Gears' garage": 'yellow' }, '.'],
      note: ['Juno', "gears' garage is in west chelsea, the G on your radar. he's expecting you."],
      onArrive: (b) => {
        ui.place('Static Garage', 'West Chelsea · WAGMI City', 3.5);
        ui.objective(null); W.gps?.clear();
        ui.help(['You made it to Gears. ', { 'Pete will DM you tomorrow.': 'yellow' }], 10);
        b.marker.hide();
      },
    });
  }

  /* ------------------------------------------------------- the runner -- */
  const M = {
    get phase() { return M._phase; },
    get running() { return running && !!M._phase && M._phase !== 'passed'; },
    stop() { running = false; tok.dead = true; teardown(); W.combat?.clear?.(); },
    async run(at = 'start') {
      let i = Math.max(0, ORDER.indexOf(at)), fresh = true;
      while (i < ORDER.length && running) {
        const phase = (M._phase = ORDER[i]);
        tok = { dead: false, err: null };
        ui.step('m2:' + phase);
        try {
          await PHASES[phase](fresh);
          fresh = false; i++;
        } catch (e) {
          if (e instanceof Quit) return;
          if (!(e instanceof Fail)) { console.error('[m2]', phase, e); tidy(); return; }
          tidy(); cm.resetInput?.();
          if (e.rekt) { ui.rekt(true); sfx?.play('failed'); await sleep(2600); ui.rekt(false); } else sfx?.play('failed');
          const cp = checkpointNow(); fails[cp] = (fails[cp] || 0) + 1;
          const choice = await ui.failed(e.reason, { skip: fails[cp] >= 3 });
          W.combat?.clear?.(); S.stealth?.dispose(); S.stealth = null; S.crew = null; S.alarm = false;
          if (choice === 'quit') { M.stop(); return; }
          // (a retry starts the tail over unspotted)
          S.flee = false;
          if (choice === 'skip') {
            if (SKIP_TO[cp]) i = ORDER.indexOf(SKIP_TO[cp]);
            else { i = ORDER.indexOf(cp) + 1; while (i < ORDER.length && CHECKPOINT[ORDER[i]] === cp) i++; }
            fresh = true; continue;
          }
          i = ORDER.indexOf(cp); fresh = true;
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
    id: 'm2', act: 'Act I · Mission 2', title: 'Burner',
    checkpoints: ['start', 'go', 'tail', 'yard', 'chase', 'phone'].map((id) => ({ id, label: LABELS[id] })),
    active: () => running && !!M._phase && M._phase !== 'passed',
    at: checkpointNow,
    restart: (at) => { ui.rekt(false); start(W, { at, keep: true }).catch((e) => console.error('[m2]', e)); },
  });
  return M;
}
