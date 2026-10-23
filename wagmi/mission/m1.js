// WAGMI City: Mission 1 · Dognapped (docs/MISSIONS.md 5), after the opening cutscene (wagmi/intro.js).
//   car     'Get in your car.'                       checkpoint 1 (Quant at his mark, the roadster at the curb)
//   drive   'Follow Moon's tag to Chelsea Park.'     the GPS, Juno on the phone, Moon's tag on the radar
//   arrival 'The swap' (a scene): Moon driven off in a black SUV past him, the Degens cross the lawn for him
//   fight   'Beat up the Degens.'  DEGENS 0/4 -> 0/5 checkpoint 2 (FOMO runs in at two down)
//   search  'Search the van.'      hold F            checkpoint 3: Moon's collar and a burner phone; ZK's text
//   then MISSION PASSED, and six seconds later Juno's DM and the J at Bryant Park.
// Fails: 'Quant got rekt.' (knocked out), 'You left the fight.' (150 m from it). Retry, Quit, Skip (after three).
// start(W, { at }) runs it from a phase ('car' | 'drive' | 'fight' | 'search'); ?m1=<phase> starts there.
import * as THREE from 'three/webgpu';
import { place, getCast, upright, UPRIGHT_BONES } from '../intro.js';
import { createGPS } from './gps.js';
import { createMarker } from './marker.js';
import { createDirector, keys, angleKeys, spline, travel, handheld, clamp, lerp } from './cine.js';

const PI = Math.PI;
const WHITE = '#FFFFFF', ACID = '#B6FF3B', BLUE = '#6CB8FF';
const DEST = { x: -1139, z: 1160, name: 'Chelsea Park · 9th Ave & W 28th St' };
const ARENA = { x: -1200, z: 1157 };
const VAN = [-1240, 1120.2, PI / 2];
const SEARCH_AT = [-1240, 1123.6];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// the getaway SUV: the city's own SUV body in black, acid-green rims, built once (C.suv); window: where Moon sits at its
// back window on the south side, her head out of it (its own frame: nose to +z)
function buildSUV(scene) {
  const N = window.NYC, g = new THREE.Group(); g.name = 'wagmi-suv';
  const spec = N.BODY_SPECS && N.BODY_SPECS.suv;
  if (spec && N.buildCarGeometry && N.createLoftedCarMaterial) {
    const m = new THREE.Mesh(N.buildCarGeometry(spec, true), N.createLoftedCarMaterial(spec, 0x0c0d0f));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  } else {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 4.6), new THREE.MeshStandardMaterial({ color: '#0c0d0f', roughness: 0.4 }));
    m.position.y = 0.95; g.add(m);
  }
  const acid = new THREE.MeshStandardMaterial({ color: '#B6FF3B', emissive: '#6FA81A', emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.3 });
  for (const sx of [-1, 1]) for (const z of [-1.4, 1.4]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.032, 8, 28), acid); r.rotation.y = PI / 2; r.position.set(sx * 1.005, 0.39, z); g.add(r);
  }
  g.visible = false; scene.add(g);
  return { group: g, window: new THREE.Vector3(-1.02, 0.97, -0.75) };
}
class Fail extends Error { constructor(reason, rekt = false) { super(reason); this.reason = reason; this.rekt = rekt; } }
class Quit extends Error {}

export async function start(W, { at = 'car', fromIntro = false } = {}) {
  if (W.mission) W.mission.stop();
  const M = (W.mission = createMission(W));
  return M.run(at, fromIntro);
}

function createMission(W) {
  const app = W.app, cm = app.controllerManager, P = W.person, car = W.car, ui = W.ui, sfx = W.sfx;
  const gps = W.gps || (W.gps = createGPS(W));
  const marker = W.marker || (W.marker = createMarker(THREE, app.scene, { color: '#FFC93C', radius: 3 }));
  // story mode: the sandbox's shortcuts off (a click on the full map sets the waypoint, it doesn't teleport)
  app.mapSystem.onTeleport = null;
  app.mapSystem.waypoint = null; // (no default route to Times Square: the missions set the GPS)
  ui.story(true); // (the teleport, the time of day, the telemetry and the camera picker put away: ui.js)

  /* ------------------------------------------------------------ helpers -- */
  let tok = { dead: false, err: null };
  const fail = (reason, rekt) => { if (!tok.dead) { tok.dead = true; tok.err = new Fail(reason, rekt); } };
  const wait = (cond, t = tok) => new Promise((res, rej) => {
    const f = () => { if (t.dead) return rej(t.err || new Quit()); let ok = false; try { ok = cond(); } catch (e) { return rej(e); } if (ok) res(); else requestAnimationFrame(f); };
    f();
  });
  const delay = (secs, t = tok) => { const end = performance.now() + secs * 1000; return wait(() => performance.now() >= end, t); };
  const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  const inCar = () => cm.activeMode === 'car';
  const me = () => (inCar() ? car.position : P.position);
  // lines: [speaker, colour, text, pause after]; each held for its reading time (15 characters a second, 1.4 s at least),
  // a voice mumbling each phrase of it as it goes (no words: the subtitles are the words)
  const VOICE = { Quant: 152, Bagsy: 104, Juno: 212, Fomo: 128 };
  function voice(who, text, secs) {
    const f0 = VOICE[who]; if (!f0) return;
    const parts = text.match(/[^.?!]+[.?!']*/g) || [text];
    let at = 0;
    for (const ph of parts) {
      const n = ph.trim().length; if (!n) continue;
      setTimeout(() => sfx.play('mumble', { f0: f0 * (0.96 + Math.random() * 0.08), dur: Math.min(0.5, Math.max(0.2, 0.1 + n * 0.02)), gain: who === 'Juno' && inCar() ? 0.2 : 0.28, q: /\?/.test(ph) }), at * 1000 + 30);
      at += ph.length / text.length * secs;
    }
  }
  async function say(lines, t = tok) {
    for (const [who, color, text, pause = 0.25] of lines) {
      if (t.dead) break;
      ui.sub(who, text, color); voice(who, text, Math.max(1.4, text.length / 15));
      await sleep(Math.max(1.4, text.length / 15) * 1000);
      ui.sub(null); await sleep(pause * 1000);
    }
  }
  // Juno's call on the drive: a ring, the caller card, the lines
  async function junoCall(t) {
    sfx.play('ring', { gain: 0.16, times: 1 });
    ui.caller('Juno', BLUE, 'Incoming call');
    await sleep(1800);
    if (t.dead) { ui.caller(null); return; }
    ui.caller('Juno', BLUE, 'On call');
    await say([
      ['Juno', BLUE, "Quant. Why is your dog's tag doing forty down Fifth Avenue?"],
      ['Quant', WHITE, 'Because some guys in a van took Moon.'],
      ['Juno', BLUE, "...Okay. I'm on the tag. They're cutting west. Who were they?"],
      ['Quant', WHITE, 'Guys who lost money.'],
      ['Juno', BLUE, 'So, everyone. Great, narrows it down.', 1.2],
      ['Juno', BLUE, "Tag stopped. Chelsea Park, Ninth and Twenty-Eighth. Don't do anything stupid."],
      ['Quant', WHITE, 'Define stupid.'],
      ['Juno', BLUE, 'Going there alone.'],
      ['Quant', WHITE, "Then I'm already doing it."],
    ], t);
    ui.caller(null);
  }
  const stats = { t0: performance.now(), hits: 0, rekt: 0 };
  let lastHp = null;
  const fails = {};
  const frameHooks = new Set();
  let running = true;
  (function loop() {
    if (!running) return;
    gps.update();
    document.body.classList.toggle('wg-onfoot', !inCar());
    for (const f of frameHooks) { try { f(); } catch (e) { console.warn('[m1]', e); } }
    const hp = W.combat?.player?.hp; if (hp != null) { if (lastHp != null && hp < lastHp - 0.5) stats.hits++; lastHp = hp; }
    requestAnimationFrame(loop);
  })();
  const hook = (f) => { frameHooks.add(f); return () => frameHooks.delete(f); };
  function tidy() {
    frameHooks.clear(); ui.objective(null); ui.sub(null); ui.help(null); ui.counter(null); ui.caller(null); ui.hold(null); ui.phone.hide();
    gps.clear(); app.mapSystem.waypoint = null; for (const id of [...gps.blips.keys()]) gps.unblip(id); marker.hide();
  }
  const holds = (rects) => app.trafficSystem.hold?.(rects);
  function parkHolds() {
    holds([
      { minX: -1300, maxX: -1143, minZ: 1108, maxZ: 1200 }, // W 28th St along the park, and the lawn
      { minX: -1143, maxX: -1125, minZ: 1100, maxZ: 1215 }, // 9th Ave by the park (the roadster is parked in it)
    ]);
  }
  function setVan(C, on) {
    C.van.group.visible = on;
    if (on) { C.van.group.position.set(VAN[0], 0, VAN[1]); C.van.group.rotation.y = VAN[2]; C.van.setDoor(0); C.van.update(0, 0, 0); }
  }

  /* ------------------------------------------------------- the phases -- */
  const PHASES = {
    // 1 · to the car
    async car(fresh) {
      if (fresh) place(W, { car: [88, 394.4, -PI / 2], quant: [109, 390.8, -1.41] });
      gps.blip('car', { x: car.position.x, z: car.position.z, kind: 'car', edge: true });
      ui.objective(['Get in your ', { car: 'blue' }, '.']);
      await delay(0.6);
      ui.help('Press [F] to get in a vehicle.', 10);
      await wait(inCar);
      gps.unblip('car'); ui.help(null);
      ui.place(car.label || "Quant's Roadster", '', 3);
    },
    // 2 · the drive: the GPS, Juno's call, Moon's tag running ahead on the radar
    async drive() {
      gps.set(DEST);
      marker.at(DEST.x, 0, DEST.z);
      const objective = () => ui.objective(["Follow Moon's tag to ", { 'Chelsea Park': 'yellow' }, '.']);
      objective();
      const t0 = performance.now(), tk = tok;
      // the tag: a paw running down 5th Ave, west on 34th St, south on 9th Ave to the park, where it stops
      const tag = [[3.6, 470], [3.6, 641], [-1134, 641], [-1134, 1117], [-1180, 1122]];
      const segs = tag.slice(1).map((p, i) => Math.hypot(p[0] - tag[i][0], p[1] - tag[i][1])), tagLen = segs.reduce((a, b) => a + b, 0);
      const tagAt = (k) => { let s = k * tagLen; for (let i = 0; i < segs.length; i++) { if (s <= segs[i]) { const u = s / segs[i]; return [lerp(tag[i][0], tag[i + 1][0], u), lerp(tag[i][1], tag[i + 1][1], u)]; } s -= segs[i]; } return tag[tag.length - 1]; };
      const helps = [
        [2, ['Your destination is marked with a ', { '●': 'yellow' }, ' on the Radar.']],
        [8, ['GPS shows the quickest legal route with a ', { 'yellow line': 'yellow' }, '.']],
        [20, 'Hold [Shift] to boost.'],
      ];
      let callAt = null, called = false, outOfCar = false;
      const places = [['Garment District', (p) => p.x < -300 && p.z < 700], ["Hell's Kitchen", (p) => p.x < -880 && p.z < 700], ['Chelsea', (p) => p.z > 760]];
      const seen = new Set();
      const off = hook(() => {
        const t = (performance.now() - t0) / 1000;
        if (t < 22) { const [x, z] = tagAt(Math.min(1, t / 20)); gps.blip('tag', { x, z, kind: 'paw', edge: true }); } else gps.unblip('tag');
        while (helps.length && t >= helps[0][0]) ui.help(helps.shift()[1], 7);
        // Juno calls six seconds after he sets off
        if (callAt == null && inCar() && Math.abs(car.speed) > 3) callAt = t + 6;
        if (callAt != null && !called && t >= callAt) { called = true; junoCall(tk); }
        const p = me();
        if (W.cast && !W.cast.van.group.visible && dist(p, DEST.x, DEST.z) < 320) setVan(W.cast, true);
        for (const [name, test] of places) if (!seen.has(name) && test(p)) { seen.add(name); ui.place(name, 'WAGMI City', 3); }
        // out of the car on the way: back in it
        if (!inCar() && !outOfCar && dist(P.position, DEST.x, DEST.z) > 30) { outOfCar = true; ui.objective(['Get back in your ', { car: 'blue' }, '.']); gps.blip('car', { x: car.position.x, z: car.position.z, kind: 'car', edge: true }); }
        if (inCar() && outOfCar) { outOfCar = false; gps.unblip('car'); objective(); }
      });
      await wait(() => (inCar() ? dist(car.position, DEST.x, DEST.z) < 6 && Math.abs(car.speed) < 8 : dist(P.position, DEST.x, DEST.z) < 6));
      off(); gps.unblip('tag'); gps.unblip('car');
    },
    // the arrival: Moon goes off in the SUV past him; the Degens by their van cross the lawn for him
    async arrival() {
      gps.clear(); marker.hide(); ui.objective(null); ui.help(null);
      await scene('arrival');
    },
    // 3 · the fight (checkpoint 2)
    async fight(fresh) {
      const C = await getCast(W);
      setVan(C, true);
      if (fresh) place(W, { car: [DEST.x, DEST.z, 0], quant: [-1145.5, 1160, -PI / 2] });
      parkHolds();
      const combat = W.combat;
      if (!combat?.spawnCrew) { ui.help('The fight is coming soon.', 4); await delay(3); return; }
      combat.clear?.();
      combat.player.hp = combat.player.maxHp; lastHp = combat.player.hp;
      const autoGetUp = combat.player.autoGetUp; combat.player.autoGetUp = false;
      const offDown = combat.player.onDown(() => fail('Quant got rekt.', true));
      try {
        const crews = [combat.spawnCrew({ x: -1182, z: 1156, count: 4 }).engage()];
        let total = 4, fomo = false, warned = false;
        const down = () => crews.reduce((n, c) => n + c.enemies.length - c.alive(), 0);
        const objective = () => ui.objective(['Beat up the ', { Degens: 'red' }, '.']);
        objective();
        ui.counter('DEGENS', `0/${total}`);
        delay(1.5).then(() => ui.help(['Degens are marked with a ', { 'red dot': 'red' }, ' on the Radar.'], 7)).catch(() => {});
        hook(() => {
          // the blips: every Degen still up within 150 m
          const live = new Set();
          for (const e of combat.enemies) if (e.alive && dist(e.pos, P.position.x, P.position.z) < 150) { live.add('e:' + e.id); gps.blip('e:' + e.id, { x: e.pos.x, z: e.pos.z, kind: 'enemy' }); }
          for (const id of [...gps.blips.keys()]) if (id.startsWith('e:') && !live.has(id)) gps.unblip(id);
          ui.counter('DEGENS', `${down()}/${total}`);
          // FOMO runs in along W 28th St at two down
          if (!fomo && down() >= 2) {
            fomo = true; total = 5;
            crews.push(combat.spawnCrew({ x: -1262, z: 1124, count: 1, props: false }).engage());
            say([['Fomo', ACID, 'Wait! Did I miss the pump?'], ['Bagsy', ACID, 'You always miss the pump!']]).catch(() => {});
          }
          // too far from the fight
          const d = dist(me(), ARENA.x, ARENA.z);
          if (d > 150) fail('You left the fight.');
          else if (d > 90 && !warned) { warned = true; ui.objective(['Get back to the ', { fight: 'yellow' }, '.']); }
          else if (d < 80 && warned) { warned = false; objective(); }
        });
        await wait(() => fomo && crews.every((c) => c.alive() === 0));
        stats.rekt = total;
      } finally { offDown?.(); combat.player.autoGetUp = autoGetUp; }
      await delay(1.2);
      tidy();
    },
    // 4 · the van (checkpoint 3): hold F at its door; Moon's collar, a burner, ZK's text
    async search(fresh) {
      const C = await getCast(W);
      setVan(C, true);
      parkHolds();
      if (fresh) place(W, { car: [DEST.x, DEST.z, 0], quant: [-1240, 1125.5, PI] });
      ui.objective(['Search the ', { van: 'green' }, '.']);
      gps.blip('van', { x: VAN[0], z: VAN[1], kind: 'object', edge: true });
      const spot = createMarker(THREE, app.scene, { color: '#4ADE80', radius: 0.8, height: 0.9, alpha: 0.28 }); spot.at(SEARCH_AT[0], 0.22, SEARCH_AT[1]);
      let k = 0, held = false, helped = false;
      const onKey = (e) => { if (e.code === 'KeyF') held = e.type === 'keydown'; };
      addEventListener('keydown', onKey); addEventListener('keyup', onKey);
      try {
        let last = performance.now();
        await wait(() => {
          const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
          const near = !inCar() && dist(P.position, SEARCH_AT[0], SEARCH_AT[1]) < 2.2;
          if (near && !helped) { helped = true; ui.help('Hold [F] to search.', 8); }
          k = near && held ? k + dt / 1.2 : Math.max(0, k - dt * 2);
          ui.hold(near ? 'Search the van' : null, k);
          return k >= 1;
        });
      } finally { removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); ui.hold(null); spot.hide(); app.scene.remove(spot.group); }
      gps.unblip('van'); ui.objective(null); ui.help(null);
      await scene('collar');
    },
  };
  const ORDER = ['car', 'drive', 'arrival', 'fight', 'search'];
  const CHECKPOINT = { car: 'car', drive: 'car', arrival: 'fight', fight: 'fight', search: 'search' };

  /* ------------------------------------------------------- the scenes -- */
  // short scenes on the director: the arrival at the park, the collar in the van (hold Space to skip)
  async function scene(name) {
    const C = await getCast(W);
    const D = createDirector(W), Q = W.quant;
    const grade = app.postFX?.colorGrade, exp0 = grade?.exposure.value ?? 1.04;
    W.cutscene = true;
    ui.cine(true); ui.objective(null);
    if (name === 'arrival') {
      // the car where he stopped (straightened), Quant out of it on the park's sidewalk
      place(W, { car: [DEST.x, DEST.z, 0], quant: [-1145.5, 1160, -PI / 2] });
      setVan(C, true);
      parkHolds();
    }
    for (const a of Q.mixer._actions) if (!C.qRig.owns(a)) a.setEffectiveWeight(0);
    let t = 0, END = 0, done = false, skip = false;
    const shots = [], cues = [], st = { dead: false };
    let pose = () => {}, cleanup = () => {};
    const quantAt = (x, z, h) => { P.position.set(x, cm.getGroundHeight(x, z, 'person'), z); P.heading = h; P.mesh.position.copy(P.position); P.mesh.rotation.y = h; P.mesh.visible = true; };
    // (his pose, then his back upright over his hips: the bone turned over the clip put back first, or a held pose
    // would pile the turns up)
    const ub = UPRIGHT_BONES.map((n) => Q.bones[n]).filter(Boolean), ub0 = ub.map((b) => b.quaternion.clone());
    const poseQuant = (t, h, k = 1) => { ub.forEach((b, i) => b.quaternion.copy(ub0[i])); C.qRig.pose(t); ub.forEach((b, i) => ub0[i].copy(b.quaternion)); Q.body.position.y = 0; Q.body.rotation.x = 0; upright(W, h, k); };
    if (name === 'arrival') {
      // 'The swap' (docs/MISSIONS.md 5.5): A1 the long lens down W 28th St: Gwei slams the black SUV's door on Moon, her
      // head out of its back window, and it pulls away from the van; A2 9th Ave, looking up it from beside Quant: the SUV
      // comes round the corner and whips past him ('MOON!'); A3 after it, going south; A4 over his shoulder, a long lens on
      // the four of them coming across the lawn for him.
      // (A4 runs as long as Bagsy's three lines take: about 10 s)
      END = 19.4;
      const T = { a2: 3.2, a3: 6.4, a4: 8.6 };
      const suv = C.suv || (C.suv = buildSUV(app.scene));
      // the SUV's way out (s = metres along it): the corner of 9th Ave at s 78-100, past Quant (z 1160) at s 123. Across
      // the cut into A2 it jumps on (s 16 -> 70): A1 sees it pull away, A2 sees it take the corner and go by him at 5.8 s.
      const sPath = spline([[-1222, 1120.2], [-1186, 1120.0], [-1150, 1119.6], [-1139.5, 1122.5], [-1134.5, 1129], [-1131.2, 1140], [-1131, 1175], [-1131, 1500]]);
      const sA = travel([[0.85, 0], [T.a2, 14]]);
      const sB = travel([[T.a2, 20], [3.7, 16], [4.4, 16], [5.0, 24], [5.8, 27], [6.4, 28], [8.6, 20], [12, 20]]);
      const sS = (t) => (t < T.a2 ? sA(t) : 70 + sB(t));
      sS.speed = (t) => (t < T.a2 ? sA.speed(t) : sB.speed(t));
      const crew = [[C.bagsy, -1236.5, 1124.4], [C.stops, -1238.8, 1125.0], [C.gwei, -1223.2, 1122.2], [C.wick, -1244.2, 1125.3]];
      // (A1 by the van, Gwei at the SUV's back door and away from it; across the cut, out on the lawn walking for him,
      // kept in a band the long lens holds)
      const lawn = [[-1195, 1156, -1182, 1157], [-1199, 1160.5, -1186, 1161], [-1201, 1154, -1189, 1155], [-1204, 1162.5, -1191, 1162.5]];
      for (const [d] of crew) d.rig.set([[0, 'walk', { from: 0.85, speed: 0 }], [T.a4, 'walk', { speed: 1.0, fade: 0.2 }]]);
      C.gwei.rig.set([[0, 'walk', { from: 0.85, speed: 0 }], [0.75, 'walk', { speed: 1.0, fade: 0.2 }], [T.a2, 'walk', { from: 0.85, speed: 0, fade: 0.3 }], [T.a4, 'walk', { speed: 1.0, fade: 0.2 }]]);
      const gweiX = keys([[0.75, -1223.2], [T.a2, -1227.2]], 'linear');
      // Quant: watching the corner, then the SUV going by him, turning after it; across the cut, back to the lawn
      const qh = angleKeys([[0, 2.87], [4.4, 2.87], [5.0, 2.3], [5.6, 1.6], [6.4, 1.05], [T.a4 - 0.05, 1.05], [T.a4, -PI / 2]]);
      C.qRig.set([[0, 'idle'], [5.3, ['idle/body', 'talk/arms'], { fade: 0.15 }], [6.3, 'idle', { fade: 0.3 }], [T.a4 + 4.4, ['idle/body', 'talk/arms'], { fade: 0.3 }], [T.a4 + 6.8, 'idle', { fade: 0.4 }]]);
      const suvAt = (t) => { const d = sS(t); return d < sPath.length - 0.5 ? sPath.at(d) : null; };
      const smooth01 = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      // A1 a long lens from the park's edge, across W 28th St: Gwei at the SUV's back door, Moon's face at its window; it
      // pulls away and the lens goes with it
      shots.push({ t: 0, cam: (t) => {
        const p = suvAt(t), base = [-1222.6, 1.05, 1121.2], w = smooth01((t - 1.0) / 1.4);
        return { pos: [-1200, 1.45, 1131.5], look: p ? base.map((a, i) => lerp(a, [p.x - 0.8, 1.05, p.z + 0.6][i], w)) : base, fov: keys([[0, 11], [1.0, 11], [T.a2, 19]])(t), shake: 0.3 };
      } });
      // A2 behind Quant (his left shoulder in the left third), looking up 9th Ave to the corner; the lens goes after the SUV
      shots.push({ t: T.a2, cam: (t) => {
        const p = suvAt(t), base = [-1136, 1.3, 1126], w = p ? smooth01((t - 4.9) / 0.8) : 0;
        const look = p ? base.map((a, i) => lerp(a, [p.x, 1.0, p.z][i], w)) : base;
        return { pos: [-1144.2, 1.6, 1166.0], look, fov: 40, shake: t > 5.5 && t < 6.2 ? 2.2 : 0.9 };
      } });
      // A3 after it: its tail lights going away south down 9th Ave
      shots.push({ t: T.a3, cam: (t) => { const p = suvAt(t); return { pos: [-1127.6, 1.45, 1166], look: p ? [lerp(-1131, p.x, 0.7), 1.0, p.z + 4] : [-1131, 1.0, 1300], fov: keys([[T.a3, 32], [T.a4, 13]])(t), shake: 0.6 }; } });
      // A4 over his right shoulder, a long lens on them: four men coming across the grass, not four dots
      shots.push({ t: T.a4, cam: (t) => ({ pos: keys([[T.a4, [-1141.0, 1.78, 1159.3]], [END, [-1141.3, 1.78, 1159.25]]], 'linear')(t), look: keys([[T.a4, [-1189, 1.2, 1161.1]], [END, [-1184, 1.15, 1161.0]]])(t), fov: keys([[T.a4, 9], [END, 11]])(t), shake: 0.35 }) });
      let engine = null;
      pose = (t, dt) => {
        crew.forEach(([d, x, z], i) => {
          d.root.visible = true;
          let px = x, pz = z, h = PI / 2 + 0.2;
          if (d === C.gwei && t < T.a4) { px = gweiX(t); pz = t < 0.75 ? z : lerp(z, 1123.8, clamp((t - 0.75) / 2.2)); h = t < 0.6 ? PI : -PI / 2 - 0.2; }
          if (t >= T.a4) { const k = clamp((t - T.a4) / (END - T.a4 + 0.6)); const [x0, z0, x1, z1] = lawn[i]; px = lerp(x0, x1, k); pz = lerp(z0, z1, k); h = Math.atan2(-1145.5 - px, 1160 - pz); }
          d.root.position.set(px, cm.getGroundHeight(px, pz, 'person'), pz); d.root.rotation.y = h;
          d.rig.pose(t);
        });
        const h = qh(t);
        quantAt(-1145.5, 1160, h);
        poseQuant(t, h);
        // the SUV, Moon's head out of its back window
        const p = suvAt(t);
        suv.group.visible = !!p;
        if (p) { suv.group.position.set(p.x, 0, p.z); suv.group.rotation.y = p.h; }
        const M = C.moon;
        M.group.visible = !!p; C.leash.mesh.visible = false;
        if (p) {
          suv.group.updateMatrixWorld(true);
          M.group.position.copy(suv.window).applyMatrix4(suv.group.matrixWorld); M.group.rotation.set(0, p.h - PI / 2, 0);
          M.update(dt, { mode: 'struggle', calm: 0.8, look: new THREE.Vector3(...D.camera.pos), bark: (t > 1.4 && t < 1.5) || (t > 5.5 && t < 5.6) });
        }
        if (engine) engine.set(clamp(sS.speed(t) / 30), p ? 0.5 * clamp(16 / Math.max(5, Math.hypot(p.x - D.camera.pos[0], p.z - D.camera.pos[2]))) : 0);
      };
      cleanup = () => { suv.group.visible = false; C.moon.group.visible = false; engine?.stop(0.4); };
      cues.push([0.2, () => ui.place('Chelsea Park', 'Chelsea · WAGMI City', 3)]);
      cues.push([0.45, () => sfx.play('thunk', { gain: 0.45, f: 70 })]);
      cues.push([0.85, () => { engine = sfx.engine(); sfx.play('squeal', { gain: 0.16, dur: 0.9, p: -0.3 }); }]);
      cues.push([1.4, () => sfx.play('bark', { gain: 0.22, n: 2, p: -0.4 })]);
      cues.push([3.8, () => sfx.play('squeal', { gain: 0.35, dur: 1.1, p: -0.2 })]);
      cues.push([5.5, () => { ui.sub('Quant', 'MOON!', WHITE); sfx.play('shout', { gain: 0.5, f0: 240, vowel: 'u', dur: 0.7 }); }]);
      cues.push([5.7, () => sfx.play('whoosh', { gain: 0.35, dur: 0.6 })]);
      cues.push([6.6, () => ui.sub(null)]);
      cues.push([7.3, () => sfx.play('bark', { gain: 0.1, n: 1, p: 0.1 })]);
      cues.push([T.a4 + 0.6, () => say([['Bagsy', ACID, "Told you to check your DMs. You didn't check your DMs."], ['Quant', WHITE, 'Been a little busy getting robbed.'], ['Bagsy', ACID, "Nothing personal, kid. It's just extremely personal."]], st)]);
      holds([
        { minX: -1300, maxX: -1143, minZ: 1108, maxZ: 1200 }, { minX: -1143, maxX: -1125, minZ: 1100, maxZ: 1215 },
        { minX: -1140, maxX: -1122, minZ: 1215, maxZ: 1520 }, // (9th Ave south: the SUV's way out)
      ]);
    } else if (name === 'collar') {
      END = 15.5;
      const collar = new THREE.Group();
      {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 24), new THREE.MeshStandardMaterial({ color: '#2F7FD8', roughness: 0.45 })); ring.rotation.x = PI / 2; ring.scale.set(1, 0.8, 1); collar.add(ring);
        const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 16), new THREE.MeshStandardMaterial({ color: '#E8C25A', metalness: 0.9, roughness: 0.25 })); tag.position.set(0.07, 0, 0); collar.add(tag);
      }
      const burner = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.1), new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.6, emissive: '#3A5A10', emissiveIntensity: 0 }));
      app.scene.add(collar, burner);
      // on the lip of the van's door (its park side, toward +z)
      const lipX = VAN[0] - 0.12, lipZ = VAN[1] + 1.1, lipY = 0.555;
      collar.position.set(lipX - 0.12, lipY, lipZ); burner.position.set(lipX + 0.16, lipY, lipZ + 0.01); burner.rotation.y = 0.4;
      const QX = VAN[0] - 0.1, QZ = VAN[1] + 1.65;
      // he steps up to the door, picks the two up, turns away from the van with them; the burner buzzes
      const qz = keys([[0, QZ + 0.9], [2.4, QZ + 0.9], [3.5, QZ, 'out']]), qh = keys([[0, PI], [4.8, PI], [5.6, 0.25]]);
      C.qRig.set([[0, 'idle'], [2.4, 'walk', { speed: 0.8, fade: 0.25 }], [3.45, 'pickup', { loop: false, fade: 0.25 }], [4.5, 'idle', { fade: 0.3 }],
        [4.8, ['walk/body', 'idle/arms'], { speed: 0.9, fade: 0.25 }], [5.6, ['idle/body', ['talk/arms', { from: 1.47, speed: 0.05 }]], { fade: 0.4 }], [13.6, 'idle', { fade: 0.5 }]]);
      shots.push({ t: 0, cam: (t) => ({ pos: keys([[0, [VAN[0] + 1.25, 0.95, VAN[1] + 1.75]], [3.4, [VAN[0] + 1.05, 0.9, VAN[1] + 1.65]]], 'linear')(t), look: [lipX + 0.05, 0.62, lipZ], fov: 32, shake: 0.4 }) });
      shots.push({ t: 3.4, cam: (t) => ({ pos: keys([[3.4, [VAN[0] + 2.6, 1.5, VAN[1] + 3.4]], [9, [VAN[0] + 2.3, 1.5, VAN[1] + 3.2]]], 'linear')(t), look: [QX, 1.0, QZ - 0.1], fov: 38, shake: 0.5 }) });
      shots.push({ t: 9, cam: (t) => ({ pos: keys([[9, [QX + 0.55, 1.55, QZ + 1.45]], [15.5, [QX + 0.5, 1.55, QZ + 1.3]]], 'linear')(t), look: [QX - 0.05, 1.42, QZ], fov: 34, shake: 0.4 }) });
      const doorK = keys([[0.4, 0, 'out'], [1.0, 1]]);
      const _r = new THREE.Vector3(), _l = new THREE.Vector3();
      pose = (t) => {
        C.van.setDoor(doorK(t));
        quantAt(QX, qz(t), qh(t));
        poseQuant(t, qh(t), t > 3.2 && t < 4.6 ? 0.3 : 1); P.mesh.updateMatrixWorld(true);
        // picked up: one in each hand from then on
        if (t > 3.85) {
          const B = Q.bones; B['finger3-1_R'].getWorldPosition(_r); B['finger3-1_L'].getWorldPosition(_l);
          burner.position.copy(_r); collar.position.copy(_l); collar.rotation.set(0.6, 0, 0.2);
          burner.material.emissiveIntensity = t > 6 ? 1.2 : 0;
        }
      };
      cleanup = () => app.scene.remove(collar, burner);
      cues.push([1.1, () => sfx.play('doorSlide', { gain: 0.35 })]);
      cues.push([2.0, () => say([['Quant', WHITE, "Moon's collar. Chewed right through."]], st)]);
      cues.push([6.0, () => { sfx.play('buzz', { gain: 0.2, times: 2 }); sfx.play('ding', { gain: 0.14 }); }]);
      cues.push([6.6, () => ui.phone.show('burner', { text: 'nice moves.\nmoon says hi.\nkeep this phone on.\n\n- ZK' })]);
      cues.push([10.6, () => ui.phone.hide()]);
      cues.push([11.0, () => say([['Quant', WHITE, "He's got my dog. And my number."], ['Quant', WHITE, 'Cool. Cool cool cool.']], st)]);
    }
    cues.sort((a, b) => a[0] - b[0]);
    const shotAt = (x) => { let s = shots[0]; for (const sh of shots) if (sh.t <= x) s = sh; return s; };
    let ci = 0;
    const frame = (dt) => {
      if (!done) t = Math.min(END, t + dt);
      pose(t, dt);
      const c = shotAt(t).cam(t);
      D.camera.pos = c.pos; D.camera.look = c.look; D.camera.fov = c.fov; D.camera.shake = c.shake ? handheld(t, c.shake) : null;
      if (grade) grade.exposure.value = 1.3;
      while (ci < cues.length && cues[ci][0] <= t) { try { cues[ci][1](); } catch (e) { console.warn(e); } ci++; }
    };
    W.directed = (dt) => { D.framed = true; frame(dt); };
    D.onFrame = frame;
    D.take();
    D.block(true, { onSkip: () => { skip = true; } });
    await new Promise((res) => { const f = () => { D.skipStep(1 / 60, ui); if (t >= END || skip) res(); else requestAnimationFrame(f); }; f(); });
    done = true; st.dead = true;
    D.block(false); ui.skip(null); ui.sub(null); ui.phone.hide();
    for (const d of [C.bagsy, C.stops, C.gwei, C.wick]) d.root.visible = false;
    C.qRig.stop(); Q.act('idle').setEffectiveWeight(1); Q.body.rotation.x = 0;
    cleanup();
    delete W.directed; D.onFrame = null;
    if (grade) grade.exposure.value = exp0;
    if (name === 'collar') { C.van.setDoor(1); place(W, { quant: [VAN[0] - 0.1, VAN[1] + 2.4, 0.25] }); }
    else place(W, { quant: [-1145.5, 1160, -PI / 2] });
    const rel = D.release(skip ? 0.4 : 1.2);
    ui.cine(false); W.cutscene = false;
    await rel;
  }

  /* -------------------------------------------------- passed, hand-off -- */
  async function passed() {
    tidy();
    holds([]);
    const secs = Math.round((performance.now() - stats.t0) / 1000);
    sfx.play('passed');
    await ui.passed({ title: 'Dognapped', stats: [['TIME', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`], ['DEGENS REKT', `${stats.rekt || 5}/5`], ['HITS TAKEN', String(stats.hits)]], reward: '+4,210', note: '#CoinKidFights is trending' }, 6);
    W.followers = (W.followers || 0) + 4210;
    await sleep(6000);
    sfx.play('buzz', { gain: 0.18, times: 1 }); sfx.play('ding', { gain: 0.16 });
    ui.dm('Juno', 'that burner is a gift. bring it to me. bryant park, by the library. try not to get mugged on the way.', 10);
    gps.blip('juno', { x: -296, z: 84.5, kind: 'letter', letter: 'J', pulse: 6, edge: true });
    await sleep(1500);
    ui.help(['A new mission is available. Go to the ', { J: 'yellow' }, ' on the Radar.'], 9);
    // (Mission 2 is not built yet: its marker says so)
    const m = createMarker(THREE, app.scene, { color: '#FFC93C', radius: 2 }); m.at(-296, 0.22, 84.5);
    let told = false;
    hook(() => { const d = dist(me(), -296, 84.5); if (d < 3 && !told) { told = true; ui.help(['Mission 2 · ', { Burner: 'yellow' }, ' is coming soon.'], 6); } if (d > 8) told = false; });
  }

  /* ------------------------------------------------------- the runner -- */
  const M = {
    get phase() { return M._phase; },
    stop() { running = false; tok.dead = true; tidy(); },
    async run(at = 'car', fromIntro = false) {
      let i = Math.max(0, ORDER.indexOf(at)), fresh = !fromIntro;
      while (i < ORDER.length) {
        const phase = (M._phase = ORDER[i]);
        tok = { dead: false, err: null };
        try {
          await PHASES[phase](fresh);
          fresh = false; i++;
        } catch (e) {
          if (e instanceof Quit) return;
          if (!(e instanceof Fail)) { console.error('[m1]', phase, e); tidy(); return; }
          // REKT: the world grey, then the fail screen
          tidy();
          if (e.rekt) { ui.rekt(true); sfx.play('failed'); await sleep(2600); ui.rekt(false); } else sfx.play('failed');
          const cp = CHECKPOINT[phase]; fails[cp] = (fails[cp] || 0) + 1;
          const choice = await ui.failed(e.reason, { skip: fails[cp] >= 3 });
          W.combat?.clear?.();
          if (choice === 'quit') { holds([]); M.stop(); return; }
          if (choice === 'skip') { i = ORDER.indexOf(cp) + 1; while (i < ORDER.length && CHECKPOINT[ORDER[i]] === cp) i++; fresh = true; continue; }
          i = ORDER.indexOf(cp); fresh = true;
        }
      }
      M._phase = 'passed';
      await passed();
    },
    fail,
  };
  return M;
}
