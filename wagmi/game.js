// WAGMI City: the game on top of the city. Waits for the city app (window.__NYC_APP), then
//  - puts Quant (assets/characters/quant.glb, every clip) in place of the procedural walker, his idle, walk, jog, run
//    and sprint blended from his speed and his jump from the air under him;
//  - puts Quant's car (wagmi/roadster.js) in place of the taxi, faster, its rocket package firing on the boost;
//  - lets him get in and out of it, GTA style: F beside the car walks him to its door, which swings up, and in; F in it
//    stops it and gets him out at its door (fast: he dives out). See 'in and out of it'.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildRoadster, createDriver } from './roadster.js';

const app = await new Promise((res) => { const t = setInterval(() => { if (window.__NYC_APP && window.__NYC_APP.controllerManager) { clearInterval(t); res(window.__NYC_APP); } }, 100); });
const cm = app.controllerManager, person = cm.entities.person, car = cm.entities.car;
const WAGMI = (window.WAGMI = { app, person, car });

/* --------------------------------------------------------------- the car -- */
{
  // the taxi's body, decals, plates and tyres put away (its headlamps, suspension and physics kept)
  for (const o of car.chassisPivot.children) if (!o.isLight && !(o.isObject3D && o.children.some((k) => k.isLight))) o.visible = false;
  for (const w of car.wheels) w.tire.visible = false;
  const rs = buildRoadster(THREE);   // (its own default paint)
  rs.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  car.chassisPivot.add(rs.group);
  // its size: built at a sports car's, scaled up whole (S) to a big hypercar's, 4.8 m long, 2.2 m wide and 1.28 m tall;
  // a driver in its seat (rs.anchor) stays his own size, the seat's marks (rs.seat, in the anchor's frame) scaled to
  // match. body: its box in its own frame (x across it, z along it, top), for all that runs into it or round it;
  // axle: its axles' distance either side of its middle (the wheels' ground); chase: the chase camera's framing
  // (js/cameras.js): fov, the pull back per m/s, the lens widening with speed and more on the boost, the shake flat out
  // (kept small: at a cruise the car fills as much of the frame as parked, on the boost a little less)
  const S = 1.1;
  rs.group.scale.setScalar(S); rs.anchor.scale.setScalar(1 / S); rs.scale = S;
  for (const k of Object.keys(rs.seat)) rs.seat[k] = rs.seat[k].map((v) => v * S);
  Object.assign(rs, { length: rs.length * S, width: rs.width * S, height: rs.height * S });
  Object.assign(car, { body: { hx: 1.08, z0: -2.33, z1: 2.47, top: 1.28 }, axle: 1.56, mass: 2.0,
    chaseDistance: 6.7, chaseHeight: 2.0, chase: { fov: 58, pull: 0.002, kick: 1.1, boostKick: 3.0, vmax: 34, shake: 0.03, vtop: 56 } });
  Object.assign(car, { label: "Quant's car", topSpeed: 34, boostSpeed: 56, accel: 16, boostAccel: 32, roadster: rs });
  // (the speed panel's name for it, when the city started in the car before this ran)
  if (cm.activeMode === 'car') { const lab = document.getElementById('hud-active-mode'); if (lab) lab.textContent = car.label; }
  car.onUpdate = (dt, keys, throttle, steer) => {
    // (stopping for him to get out: car.halt m/s² of brakes, whatever is pressed)
    if (car.halt) { car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), car.halt * dt); throttle = 0; steer = 0; car.steerAngle *= 0.8; }
    car.boosting = !!keys.boost && throttle > 0;
    rs.setThrust(keys.boost && throttle > 0 ? 1 : 0, keys.boost && throttle > 0 ? 0.85 : 0);
    rs.update(dt, car.speed, -steer * 0.9);
    unpin(dt, throttle);
  };
  // pinned (a tree ahead and one behind, a wreck against a wall): the throttle or reverse held PIN s with the car hardly
  // moving, it wriggles free, slid over to the nearest spot round it where its box is clear of the buildings and the
  // street's things (a beat, at 3 m/s; again after another PIN s if that wasn't enough)
  const PIN = 1.6, pin = { t: 0, x: 0, z: 0, slide: 0, dx: 0, dz: 0 }, probe = { heading: 0, speed: 0, vx: 0, vz: 0, angularVel: 0, body: null };
  const boxClear = (x, z) => {
    const B = car.body, cs = Math.cos(car.heading), sn = Math.sin(car.heading), p = new THREE.Vector3(x, 0, z);
    Object.assign(probe, { heading: car.heading, speed: 0, vx: 0, vz: 0, body: B });
    cm.resolveHorizontalCollision(p, 1.35, 1.0, probe);
    if (Math.hypot(p.x - x, p.z - z) > 0.01) return false;
    for (const b of WAGMI.crash?.props?.around(x, z, 5) || []) {
      if (b.taken) continue;
      const r = (b.w ? Math.max(b.w, b.d) / 2 : b.r || 0.3) + 0.15, dx = b.x - x, dz = b.z - z, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) < B.hx + r && lz > B.z0 - r && lz < B.z1 + r) return false;
    }
    return true;
  };
  function unpin(dt, throttle) {
    if (pin.slide > 0) { pin.slide -= dt; car.vx = pin.dx * 3; car.vz = pin.dz * 3; return; }
    if (!throttle || car.halt || Math.hypot(car.position.x - pin.x, car.position.z - pin.z) > 0.8) { pin.t = 0; pin.x = car.position.x; pin.z = car.position.z; return; }
    if ((pin.t += dt) < PIN) return;
    pin.t = 0;
    // (the nearest clear spot: to either side first, then the corners, then back and ahead; up to 3.5 m off)
    const cs = Math.cos(car.heading), sn = Math.sin(car.heading);
    for (const d of [1.3, 2.2, 3.5]) for (const [ax, az] of [[1, 0], [-1, 0], [0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7], [0, -1], [0, 1]]) {
      const wx = (ax * cs + az * sn) * d, wz = (-ax * sn + az * cs) * d;
      if (!boxClear(car.position.x + wx, car.position.z + wz)) continue;
      Object.assign(pin, { dx: wx / d, dz: wz / d, slide: d / 3 });
      car.speed = 0;
      return;
    }
  }
  // (parked, it still settles its thrust; rolling on with nobody in it, its wheels still turn)
  WAGMI.carIdle = (dt) => { if (cm.activeMode !== 'car') { rs.setThrust(0, 0); rs.update(dt, car.speed || 0, 0); } };
  // parked, it is solid to Quant on foot (the city's collision only knows the buildings): its body a box in its own frame
  // (car.body: x across it, z along it, measured off the model), r m round it; he is put out at its nearest side
  const BODY = car.body;
  person.collide = (pos, r) => {
    if (cm.activeMode === 'car' || !car.mesh.visible || pos.y > car.position.y + BODY.top) return false;
    const cs = Math.cos(car.heading), sn = Math.sin(car.heading), dx = pos.x - car.position.x, dz = pos.z - car.position.z;
    const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
    const side = BODY.hx + r - Math.abs(lx), back = lz - (BODY.z0 - r), front = BODY.z1 + r - lz;
    if (side <= 0 || back <= 0 || front <= 0) return false;
    let nx = lx, nz = lz;
    if (side < Math.min(back, front)) nx = Math.sign(lx || 1) * (BODY.hx + r); else nz = back < front ? BODY.z0 - r : BODY.z1 + r;
    pos.x = car.position.x + nx * cs + nz * sn; pos.z = car.position.z - nx * sn + nz * cs;
    return true;
  };
}

/* ----------------------------------------------------------------- Quant -- */
// His body in layers (one mixer, every weight summing to one):
//  - locomotion: the street's gaits (idle, walk, jog, run, sprint) by his speed, or, in a fight (quant.loco.fight), his
//    guard and a boxer's footwork (in, back, left, right) by the way he steps against the way he faces;
//  - actions over it: one-shot moves (quant.play), each cross-faded in over whatever was playing (the same clip twice in a
//    row too) and faded back out to the legs; a held one stays on its last frame until stopped;
//  - hands: a reach for each hand (quant.reach), two-bone IK over the pose (holding, lifting, grabbing).
// The fight sets quant.loco, quant.timeScale (hit-stop, slow motion) and the pre / post hooks it runs around the pose.
{
  const gltf = await new GLTFLoader().loadAsync('assets/characters/quant.glb');
  const body = gltf.scene;
  body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  for (const m of person.crowd.meshes) m.visible = false;
  person.mesh.add(body);
  const mixer = new THREE.AnimationMixer(body), clips = gltf.animations, A = {};
  const clipOf = (n) => THREE.AnimationClip.findByName(clips, n);
  const act = (n) => A[n] || (A[n] = mixer.clipAction(clipOf(n)));
  const bones = {}; body.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  // the gaits and the speed each clip was captured at (its time scale follows the real speed)
  // (a clip the model lacks is left out: a re-export with fewer clips still loads)
  const GAITS = [['idle', 0, 1], ['walk', 1.45, 1.45], ['jog', 3.3, 3.3], ['run', 5.6, 5.6], ['sprint', 7.6, 7.6]].filter(([n]) => clipOf(n));
  // the fight's stance and footwork, and the speed each step was captured at
  const STEPS = [['fight', 0], ['guardF', 0.76], ['guardB', 0.84], ['guardL', 0.46], ['guardR', 0.66]].filter(([n]) => clipOf(n));
  const LOCO = [...GAITS.map((g) => g[0]), ...STEPS.map((s) => s[0])];
  for (const n of LOCO) { const a = act(n); a.play(); a.setEffectiveWeight(n === 'idle' ? 1 : 0); }
  const W = Object.fromEntries(LOCO.map((n) => [n, n === 'idle' ? 1 : 0]));
  // one-shot moves: a few copies of each clip, so a move can cross-fade from itself (jab, jab)
  const pool = {};
  function copyOf(name) {
    const list = pool[name] || (pool[name] = []);
    let a = list.find((x) => !x.userData.live);
    if (!a) { const c = clipOf(name); if (!c) return null; a = mixer.clipAction(c.clone(), body); a.userData = {}; a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; list.push(a); }
    a.userData.live = true; a.enabled = true; a.timeScale = 0; a.setEffectiveWeight(0); a.play();
    return a;
  }
  const tracks = [];
  // play a move: from / until in clip seconds, ts its pace, fade its blend in; hold: stay on `until` until stopped;
  // loop: a held loop (a struggle, a carry)
  function play(name, { from = 0, until = null, ts = 1, fade = 0.08, fadeOut = 0.2, hold = false, loop = false } = {}) {
    const a = copyOf(name); if (!a) return null;
    const dur = a.getClip().duration;
    const tr = { name, a, t: from, from, until: until ?? dur, dur, ts, fade, fadeOut, hold, loop, w: fade <= 0 ? 1 : 0, out: 0, env: 0, wt: 0 };
    tracks.push(tr);
    return tr;
  }
  function stop(fadeOut = 0.22) { for (const t of tracks) if (!t.out) { t.out = 1e-6; t.fadeOut = fadeOut; } }
  function release(tr) { tr.a.setEffectiveWeight(0); tr.a.stop(); tr.a.userData.live = false; }
  // hands: world-space targets, eased in and out by weight
  const ARM = { L: ['upperarm01_L', 'lowerarm01_L', 'wrist_L'], R: ['upperarm01_R', 'lowerarm01_R', 'wrist_R'] };
  const LIMB = { fl: 'finger3-1_L', fr: 'finger3-1_R', footL: 'foot_L', footR: 'foot_R', head: 'head' };
  const hands = { L: { to: new THREE.Vector3(), w: 0, want: 0, pole: new THREE.Vector3(0, -1, -1) }, R: { to: new THREE.Vector3(), w: 0, want: 0, pole: new THREE.Vector3(0, -1, -1) } };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qw = new THREE.Quaternion();
  // turn bone b by the world rotation q (applied on top of its world orientation)
  function turnWorld(b, q) {
    b.getWorldQuaternion(_qw); _q2.copy(q).multiply(_qw);
    b.parent.getWorldQuaternion(_qw); b.quaternion.copy(_qw.invert().multiply(_q2));
    b.updateMatrixWorld(true);
  }
  function ik(side, h) {
    const [n1, n2, n3] = ARM[side], b1 = bones[n1], b2 = bones[n2], b3 = bones[n3]; if (!b1 || !b2 || !b3) return;
    const q1 = b1.quaternion.clone(), q2 = b2.quaternion.clone();
    b1.getWorldPosition(_a); b2.getWorldPosition(_b); b3.getWorldPosition(_c);
    const la = _a.distanceTo(_b), lb = _b.distanceTo(_c);
    _t.copy(h.to); const d = Math.min(la + lb - 1e-3, Math.max(1e-3, _t.distanceTo(_a)));
    // 1. bend the elbow to the angle that puts the wrist at the target's distance
    const cur = _p.subVectors(_a, _b).normalize().angleTo(_n.subVectors(_c, _b).normalize());
    const want = Math.acos(Math.min(1, Math.max(-1, (la * la + lb * lb - d * d) / (2 * la * lb))));
    _n.crossVectors(_p.subVectors(_a, _b), _n.subVectors(_c, _b)); if (_n.lengthSq() < 1e-8) _n.set(1, 0, 0); _n.normalize();
    turnWorld(b2, _q.setFromAxisAngle(_n, want - cur));
    // 2. swing the shoulder so the wrist points at the target
    b3.getWorldPosition(_c);
    turnWorld(b1, _q.setFromUnitVectors(_p.subVectors(_c, _a).normalize(), _n.subVectors(_t, _a).normalize()));
    // 3. roll the arm about shoulder -> target so the elbow points at the pole (down and back, by default)
    b2.getWorldPosition(_b);
    const ax = _p.subVectors(_t, _a).normalize();
    const e = _n.subVectors(_b, _a); e.addScaledVector(ax, -e.dot(ax));
    const pole = _c.copy(h.pole).applyQuaternion(person.mesh.quaternion); pole.addScaledVector(ax, -pole.dot(ax));
    if (e.lengthSq() > 1e-6 && pole.lengthSq() > 1e-6) { let ang = e.angleTo(pole); if (_b.crossVectors(e, pole).dot(ax) < 0) ang = -ang; turnWorld(b1, _q.setFromAxisAngle(ax, ang)); }
    // blended with the pose by weight
    if (h.w < 0.999) { b1.quaternion.slerpQuaternions(q1, _q.copy(b1.quaternion), h.w); b2.quaternion.slerpQuaternions(q2, _q2.copy(b2.quaternion), h.w); b1.updateMatrixWorld(true); }
  }
  const Q = WAGMI.quant = {
    body, mixer, clips: clips.map((c) => c.name), act, bones,
    // what the fight asks of the legs: fight (guard and footwork), speed (m/s), dir (the step against the facing: 0
    // ahead, +PI/2 to his left); null: the street's gaits by person.speed
    loco: null,
    timeScale: 1, pre: null, post: null,
    play, stop, tracks,
    top: () => tracks[tracks.length - 1] || null,
    get busy() { return tracks.some((t) => !t.out); },
    dur: (n) => clipOf(n)?.duration ?? 0,
    // a hand's reach for a world point (w: 0 lets go), its elbow pointing at pole (his frame)
    reach(side, to, w = 1, pole) { const h = hands[side]; if (to) h.to.copy(to); h.want = w; if (pole) h.pole.copy(pole); },
    hands, // (read only: the reaches as they stand)
    hand(side, out = new THREE.Vector3()) { const b = bones[side === 'L' ? 'finger3-1_L' : 'finger3-1_R'] || bones[ARM[side][2]]; return b.getWorldPosition(out); },
    // where a striking limb is now: fl / fr the knuckles, footL / footR the ankles (as the blows were measured)
    limb(name, out = new THREE.Vector3()) { const b = bones[LIMB[name]] || bones.root; body.updateMatrixWorld(true); return b.getWorldPosition(out); },
  };
  let directed = false;
  person.label = 'Quant';
  person.model = {
    update(dt, p, air) {
      // a cutscene (or anything else that directs him) drives the body itself, mixer and all; the moment it takes over
      // the moves and the fight's stance are let go and the gaits left as they were (it finds them as it always did)
      if (WAGMI.directed) {
        if (!directed) { directed = true; for (const t of tracks) release(t); tracks.length = 0; for (const [n] of STEPS) { W[n] = 0; act(n).setEffectiveWeight(0); } for (const h of Object.values(hands)) h.w = h.want = 0; Q.loco = null; }
        WAGMI.directed(dt, p, air); return;
      }
      // (back from it: the loops playing again, whatever it stopped, from the weights it left)
      if (directed) { directed = false; for (const n of LOCO) { const a = act(n); a.enabled = true; a.play(); W[n] = a.getEffectiveWeight(); } }
      Q.pre?.(dt, p, air);
      const d = dt * Q.timeScale, L = Q.loco;
      const v = L ? L.speed : Math.abs(p.speed);
      // the street's gaits: which, by speed (the two nearest blended), and how fast its clip runs
      let k = 0; while (k < GAITS.length - 1 && v > GAITS[k + 1][1]) k++;
      const a = GAITS[k], b = GAITS[Math.min(GAITS.length - 1, k + 1)], f = b === a ? 0 : Math.min(1, Math.max(0, (v - a[1]) / (b[1] - a[1])));
      const want = {};
      for (const [n] of GAITS) want[n] = n === a[0] ? 1 - f : n === b[0] ? f : 0;
      for (const [n, , sp] of GAITS) if (sp) act(n).timeScale = Math.max(0.6, Math.min(1.6, v / sp || 1));
      // the fight's: the guard standing, the footwork by direction (cosine shares) as he moves; running, the gaits
      const fight = L && L.fight && v < 3.2 ? 1 : 0;
      for (const [n] of STEPS) want[n] = 0;
      if (fight) {
        for (const n in want) want[n] = 0;
        const m = smooth((v - 0.12) / 0.5), c = Math.cos(L.dir || 0), s = Math.sin(L.dir || 0);
        const sh = { guardF: Math.max(0, c), guardB: Math.max(0, -c), guardL: Math.max(0, s), guardR: Math.max(0, -s) };
        for (const n in sh) if (!clipOf(n)) sh[n] = 0;
        const tot = sh.guardF + sh.guardB + sh.guardL + sh.guardR || 1;
        want.fight = 1 - m;
        for (const [n, sp] of STEPS) if (sp) { want[n] = m * sh[n] / tot; act(n).timeScale = Math.max(0.6, Math.min(2.2, v / sp)); }
      }
      // the moves over them: newest on top, each over what is below by its own blend; the legs get what is left
      for (const t of tracks) {
        t.t = t.loop ? (t.t + d * t.ts) % t.dur : Math.min(t.until, t.t + d * t.ts);
        t.w = Math.min(1, t.w + d / Math.max(1e-3, t.fade));
        if (t.out) t.out += d / Math.max(1e-3, t.fadeOut);
        if (!t.hold && !t.loop && t.t >= t.until && !t.out) t.out = 1e-6;
        t.env = smooth(t.w) * (1 - smooth(t.out));
      }
      let rem = 1;
      for (let i = tracks.length - 1; i >= 0; i--) { const t = tracks[i]; t.wt = t.env * rem; rem -= t.wt; }
      // (a move under one fully blended in is gone for good)
      let covered = false;
      for (let i = tracks.length - 1; i >= 0; i--) {
        const t = tracks[i];
        if (t.out >= 1 || covered) { release(t); tracks.splice(i, 1); continue; }
        t.a.time = t.t; t.a.setEffectiveWeight(t.wt);
        if (t.env >= 0.999) covered = true;
      }
      for (const n of LOCO) { W[n] += (want[n] - W[n]) * Math.min(1, dt * 10); act(n).setEffectiveWeight(W[n] * rem); }
      mixer.update(d);
      body.position.y = 0;
      // the hands' reach, over the pose
      for (const s of ['L', 'R']) { const h = hands[s]; h.w += (h.want - h.w) * Math.min(1, dt * 14); if (h.w > 0.01) { body.updateMatrixWorld(true); ik(s, h); } }
      Q.post?.(d, p, air);
    },
  };
}

/* ------------------------------------------------------- in and out of it -- */
// GTA style, with the car's doors (roadster.js) and the driver's way in and out of his seat (createDriver):
//  - F beside it walks him to the driver's door the short way round the car, his hand lifts the door, he gets in, the
//    door comes down and the engine starts, the camera easing over to the car's. F again or a drive key: in at once. In
//    a fight, or with that side against a wall: in at once, the door flung up and slammed.
//  - F in it, slow: it brakes to a stop, the door goes up, he climbs out and stands by it, the door comes down (F or a
//    move key: out at once). From BAIL m/s up he dives out and rolls, and the car runs on, its door up, till it stops.
//  - An F the game sends itself (the fight's drag-out, ?fight) works the old way, at once. Whatever else puts him in or
//    out (a scene's place(), the sandbox's mode keys) is followed: in the car means at the wheel, on foot means out.
// WAGMI.ride: phase (null, 'walk', 'in', 'stop', 'out' or 'bail'), getIn(quick), getOut(quick), skip(), door() (0..1),
// driver (createDriver's)
const BAIL = 10, T_IN = 1.15, T_OUT = 1.05, MOVE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const rs = car.roadster, Q = WAGMI.quant, cs = app.cameraSystem, cam = cs.camera, drv = createDriver(THREE, rs, Q);
const ride = (WAGMI.ride = { phase: null, mode: null, k: 1, t: 0 });
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const hdist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _cl = new THREE.Vector3();
// the car's own frame (x across it, +x its left, the driver's side; z along it) to the world's, and back
const toWorld = (lx, lz, out = new THREE.Vector3()) => { const c = Math.cos(car.heading), s = Math.sin(car.heading); return out.set(car.position.x + lx * c + lz * s, car.position.y, car.position.z - lx * s + lz * c); };
const toLocal = (p, out = { x: 0, z: 0 }) => { const c = Math.cos(car.heading), s = Math.sin(car.heading), dx = p.x - car.position.x, dz = p.z - car.position.z; out.x = dx * c - dz * s; out.z = dx * s + dz * c; return out; };
const ground = (p) => cm.getGroundHeight(p.x, p.z, 'person');
const near = () => Math.hypot(person.position.x - car.position.x, person.position.z - car.position.z) < 4.2 * (rs.scale || 1);
// (a spot he can't stand on: in a building)
const walled = (p) => { _v.set(p.x, ground(p), p.z); cm.resolveHorizontalCollision(_v, 0.35, _v.y + 1.0); return hdist(_v, p) > 0.02; };
const sound = (name, vol = 1, at = null) => { const p = at || toWorld((car.body?.hx ?? 1) + 0.1, 0.1, _w); WAGMI.audio?.play?.(name, { pos: [p.x, p.y + 0.8, p.z], vol }); };
// (jobs for later, seconds from now; a new move clears them)
let jobs = [];
const later = (secs, fn) => jobs.push({ t: secs, fn });

// the driver's door: p its way up (0 to 1, eased on the hinge) going toward want; shut, it thunks (slam: a slam), and
// starts the engine if he just got in
const door = { p: 0, want: 0, rate: 2, slam: false };
function doorTo(want, secs, slam = false) {
  door.rate = 1 / secs; door.slam = slam;
  if (door.want === want) return;
  door.want = want; if (want) sound('doorOpen', 0.9);
}
function doorStep(dt) {
  if (door.p === door.want) return;
  door.p += Math.sign(door.want - door.p) * Math.min(Math.abs(door.want - door.p), dt * door.rate);
  if (door.p === 0) { sound(door.slam ? 'doorClose' : 'doorThunk', 1); if (ride.engine) { ride.engine = false; sound('engineStart', 0.9); } }
  rs.setDoor('L', door.p < 0.5 ? 4 * door.p ** 3 : 1 - (-2 * door.p + 2) ** 3 / 2);
}

// the camera: over T s from where it was to wherever the city's camera wants it now (it follows the mode); where it was
// carried along with `with` (a point that moves, as he does diving out of a fast car)
const blend = { on: false, t: 0, T: 1, pos: new THREE.Vector3(), look: new THREE.Vector3(), with: null, at: new THREE.Vector3(), off: new THREE.Vector3() };
function camFrom(T, withPt = null) {
  cam.getWorldDirection(_cl);
  blend.pos.copy(cam.position); blend.look.copy(cam.position).addScaledVector(_cl, Math.max(2, cam.position.distanceTo(cs.currentLookAt)));
  Object.assign(blend, { on: true, t: 0, T, with: withPt }); if (withPt) blend.at.copy(withPt);
}
{
  const base = cs.update.bind(cs);
  cs.update = function (dt, el) {
    base(dt, el);
    if (!blend.on) return;
    blend.t += dt * (ride.slow || 1); const e = smooth(blend.t / blend.T);
    if (e >= 1 || WAGMI.cutscene || WAGMI.directed) { blend.on = false; return; }
    const off = blend.with ? blend.off.subVectors(blend.with, blend.at).setY(0) : blend.off.set(0, 0, 0);
    cam.position.lerpVectors(_v.copy(blend.pos).add(off), cam.position, e); cam.lookAt(_cl.lerpVectors(_w.copy(blend.look).add(off), cs.currentLookAt, e));
  };
}

// his way to the door: straight there, or by the corners round the car (its box, his room round it, kept clear), the
// shortest; as world points
function route(from) {
  const B = car.body, hx = B.hx + 0.45, z0 = B.z0 - 0.45, z1 = B.z1 + 0.45, m = 0.62;
  const S = toLocal(from), D = { x: drv.door[0], z: drv.door[1] };
  // (pressed up against it: from just off its side)
  if (Math.abs(S.x) < hx && S.z > z0 && S.z < z1) { const ex = hx - Math.abs(S.x), e0 = S.z - z0, e1 = z1 - S.z; if (ex <= Math.min(e0, e1)) S.x = Math.sign(S.x || 1) * (hx + 0.01); else S.z = e0 < e1 ? z0 - 0.01 : z1 + 0.01; }
  const crosses = (a, b) => {
    let t0 = 0, t1 = 1;
    for (const [p, d, lo, hi] of [[a.x, b.x - a.x, -hx, hx], [a.z, b.z - a.z, z0, z1]]) {
      if (Math.abs(d) < 1e-9) { if (p <= lo || p >= hi) return false; continue; }
      let u0 = (lo - p) / d, u1 = (hi - p) / d; if (u0 > u1) [u0, u1] = [u1, u0];
      t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t1 - t0 <= 1e-6) return false;
    }
    return true;
  };
  const N = [S, ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => ({ x: sx * (B.hx + m), z: sz > 0 ? B.z1 + m : B.z0 - m })), D];
  const dist = N.map(() => Infinity), prev = N.map(() => -1), done = N.map(() => false); dist[0] = 0;
  for (;;) {
    let u = -1; for (let i = 0; i < N.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === N.length - 1) break; done[u] = true;
    for (let v = 0; v < N.length; v++) if (!done[v] && !crosses(N[u], N[v])) { const d = dist[u] + Math.hypot(N[u].x - N[v].x, N[u].z - N[v].z); if (d < dist[v]) { dist[v] = d; prev[v] = u; } }
  }
  const path = []; for (let i = N.length - 1; i > 0; i = prev[i]) { if (i < 0) return [toWorld(D.x, D.z)]; path.unshift(toWorld(N[i].x, N[i].z)); }
  return path;
}

// (something standing in his way at p: a building, or a post, a hydrant, a bench... the crash's props still up)
function blocked(p) {
  if (walled(p)) return true;
  for (const b of WAGMI.crash?.props?.around(p.x, p.z, 2) || []) if (!b.taken && hdist(b, p) < (b.w ? Math.max(b.w, b.d) / 2 : b.r || 0.3) + 0.3) return true;
  return false;
}
// in: walk round to the door, then climb in (or at once). All of it within IN_MAX s: a way round with anything in it
// (a wall, a post) isn't walked, and a walk that takes longer ends with him in at once
const IN_MAX = 1.5;
function getIn(quick = false) {
  if (ride.phase) return;
  if (quick || walled(toWorld(drv.door[0], drv.door[1]))) return inQuick();
  jobs = [];
  const path = route(person.position);
  let L = 0; for (let i = 0; i < path.length; i++) L += hdist(i ? path[i - 1] : person.position, path[i]);
  for (let i = 0; i < path.length; i++) {
    const a = i ? path[i - 1] : person.position, b = path[i], n = Math.ceil(hdist(a, b) / 0.5);
    for (let k = 1; k <= n; k++) if (blocked(_cl.set(a.x + (b.x - a.x) * k / n, 0, a.z + (b.z - a.z) * k / n))) return inQuick();
  }
  // (coming down the side from ahead, the door swings into his way: it opens once he's there)
  const lastFrom = toLocal(path.length > 1 ? path[path.length - 2] : person.position);
  Object.assign(ride, { phase: 'walk', mode: 'person', path, i: 0, t: 0, v: Math.min(6.4, Math.max(1.8, L * 1.1)), limit: IN_MAX - 0.35, early: lastFrom.z < drv.door[1] + 0.6 });
}
function walkStep(dt) {
  const P = person, path = ride.path;
  // (knocked down on the way: that's the end of it)
  if (WAGMI.combat?.player?.down) return abort();
  ride.t += dt;
  let rem = 0; for (let i = ride.i; i < path.length; i++) rem += hdist(i === ride.i ? P.position : path[i - 1], path[i]);
  // at his pace, easing to a stop at the door (the last few cm stepped)
  if (rem < 0.04 && ride.i < path.length) { const e = path[path.length - 1]; P.position.x = e.x; P.position.z = e.z; ride.i = path.length; rem = 0; }
  P.speed += (Math.min(ride.v, 0.3 + Math.sqrt(10 * rem)) * (rem > 0 ? 1 : 0) - P.speed) * Math.min(1, dt * 8);
  let go = P.speed * dt;
  while (go > 1e-6 && ride.i < path.length) {
    const to = path[ride.i], d = hdist(P.position, to);
    if (d <= go) { P.position.x = to.x; P.position.z = to.z; go -= d; ride.i++; } else { P.position.x += (to.x - P.position.x) / d * go; P.position.z += (to.z - P.position.z) / d * go; go = 0; }
  }
  // facing the way he goes, and the car's way at the door
  const to = path[Math.min(ride.i, path.length - 1)], there = ride.i >= path.length || (ride.i === path.length - 1 && hdist(P.position, to) < 0.3);
  const face = there ? car.heading : Math.atan2(to.x - P.position.x, to.z - P.position.z), a = wrap(face - P.heading);
  P.heading += Math.sign(a) * Math.min(Math.abs(a), dt * 9);
  P.position.y = ground(P.position); P.verticalVel = 0;
  P.mesh.position.copy(P.position); P.mesh.rotation.y = P.heading;
  // the door up as he comes to it, his near hand (the right) lifting it by its edge
  if (!door.want && (ride.i >= path.length || rem < (ride.early ? 0.7 : 1.2))) doorTo(1, 0.45);
  const inner = rs.doors?.L?.pivot.children[0];
  if (door.want && door.p < 0.45 && inner) { inner.updateWorldMatrix(true, false); Q.reach('R', inner.localToWorld(_v.set(0.86, 0.86, -0.18)), 1); } else Q.reach('R', null, 0);
  if (ride.i >= path.length && door.p >= 0.5 && Math.abs(wrap(car.heading - P.heading)) < 0.2) startIn();
  // (out of time: at the door, in; still on his way, in at once)
  else if (ride.t > ride.limit) { if (rem < 0.6) startIn(); else inQuick(); }
}
function startIn() {
  Q.reach('R', null, 0);
  camFrom(1.2);
  person.inVehicle = true; person.speed = 0; person.mesh.visible = false;
  app.selectMode('car'); car.speed = 0; cs.orbitYawOffset = 0;
  if (!drv.attached) drv.attach();
  Object.assign(ride, { phase: 'in', mode: 'car', k: 0, t: 0 });
  doorTo(1, 0.4);
}
function inQuick() {
  jobs = []; ride.phase = null; ride.k = 1;
  Q.reach('R', null, 0);
  person.inVehicle = true; person.speed = 0; person.mesh.visible = false;
  app.selectMode('car'); car.speed = 0;
  if (!drv.attached) drv.attach(0.12);
  door.p = Math.max(door.p, 0.55); doorTo(1, 0.12); later(0.3, () => { doorTo(0, 0.22, true); ride.engine = true; });
}

// out: brake to a stop, then climb out; fast, a dive
function getOut(quick = false) {
  if (ride.phase) return;
  if (quick) return outQuick();
  if (Math.abs(car.speed) >= BAIL) return bail();
  jobs = [];
  if (Math.abs(car.speed) > 0.3) { Object.assign(ride, { phase: 'stop', mode: 'car' }); car.halt = 22; return; }
  startOut();
}
function startOut() {
  const d = toWorld(drv.door[0], drv.door[1]);
  car.halt = 0; car.speed = 0;
  if (walled(d)) return outQuick();
  camFrom(1.1);
  person.position.set(d.x, ground(d), d.z); person.heading = car.heading; person.speed = 0; person.verticalVel = 0;
  person.inVehicle = false; person.mesh.visible = true;
  app.selectMode('person');
  Object.assign(ride, { phase: 'out', mode: 'person', k: 1, t: 0 });
  doorTo(1, 0.5);
}
function finishOut() { if (drv.attached) drv.detach(person.mesh); ride.phase = null; ride.k = 1; doorTo(0, 0.5); }
// (the old way: out at the driver's door at once, 1.75 m off the car's middle; the door flung up and slammed)
function outQuick() {
  jobs = []; ride.phase = null; ride.k = 1; car.halt = 0;
  const h = car.heading, side = 1.75;
  person.position.set(car.position.x + Math.cos(h) * side, car.position.y, car.position.z - Math.sin(h) * side);
  person.position.y = ground(person.position);
  person.heading = h; person.inVehicle = false; person.mesh.visible = true; person.verticalVel = 0;
  car.speed = 0;
  if (drv.attached) drv.detach(person.mesh);
  app.selectMode('person');
  door.p = Math.max(door.p, 0.4); doorTo(1, 0.15); later(0.9, () => doorTo(0, 0.4, true));
}
// the dive: the door flung up while he braces in his seat (LAUNCH s), then out of it with the car's way on him, a roll
// on the road, up on his feet; the car runs on
const LAUNCH = 0.12;
function bail() {
  jobs = [];
  const seat = toWorld(rs.seat.hip[0], rs.seat.hip[2], _w); person.position.set(seat.x, ground(seat), seat.z);
  camFrom(0.9, person.position);
  person.inVehicle = false; person.speed = 0; person.verticalVel = 0;
  app.selectMode('person');
  Object.assign(ride, { phase: 'bail', mode: 'person', t: 0, k: 1, h: car.heading, f0: null, out: false, landed: false });
  door.p = Math.max(door.p, 0.2); doorTo(1, 0.14);
  bailStep(0);
}
function bailStep(dt) {
  const P = person, t = (ride.t += dt), h = ride.h;
  if (!ride.out) {
    // (in his seat, the car's)
    const seat = toWorld(rs.seat.hip[0], rs.seat.hip[2], _w);
    P.position.set(seat.x, ground(seat), seat.z); P.heading = car.heading;
    if (t < LAUNCH) return;
    ride.out = true; ride.h = car.heading; ride.f0 = Math.max(-30, Math.min(30, car.speed));
    if (drv.attached) drv.detach(person.mesh);
    P.mesh.visible = true; P.heading = ride.h + 1.1;
    Q.play('roll', { from: 0.12, ts: 1.05, fade: 0.08, fadeOut: 0.25 });
    sound('whoosh', 0.8, P.position);
  }
  // (with the car for the first beat, clearing its side; then the road takes his way off him)
  const u = t - LAUNCH, vf = u < 0.18 ? car.speed : ride.f0 * Math.exp(-3.2 * (u - 0.18)), vs = 6 * (u < 0.15 ? 1 : Math.exp(-6 * (u - 0.15)));
  P.position.x += (Math.sin(ride.h) * vf + Math.cos(ride.h) * vs) * dt; P.position.z += (Math.cos(ride.h) * vf - Math.sin(ride.h) * vs) * dt;
  cm.resolveHorizontalCollision(P.position, 0.42, P.position.y + 1.0);
  P.position.y = ground(P.position); P.verticalVel = 0; P.speed = 0;
  P.mesh.position.copy(P.position); P.mesh.rotation.y = P.heading;
  if (!ride.landed && u > 0.45) { ride.landed = true; sound('pedHit', 0.45, P.position); }
  if (u > 1.2) ride.phase = null;
}
// nobody at the wheel: it rolls on, slowing, into whatever is in its way; at rest, its door comes down
function coast(dt) {
  if (cm.activeMode === 'car' || (!car.speed && !car.vx && !car.vz)) return;
  const s = Math.abs(car.speed);
  car.speed -= Math.sign(car.speed) * Math.min(s, (1.2 + 0.3 * s) * dt);
  car.angularVel = (car.angularVel || 0) * Math.exp(-dt * 7.8); car.heading += car.angularVel * dt;
  car.position.x += (Math.sin(car.heading) * car.speed + (car.vx || 0)) * dt; car.position.z += (Math.cos(car.heading) * car.speed + (car.vz || 0)) * dt;
  const g = Math.exp(-dt * 6.8); car.vx = (car.vx || 0) * g; car.vz = (car.vz || 0) * g;
  if (Math.abs(car.vx) + Math.abs(car.vz) < 0.02) car.vx = car.vz = 0;
  cm.resolveHorizontalCollision(car.position, 1.35, 1.0, car);
  car.position.y = cm.getGroundHeight(car.position.x, car.position.z, 'car');
  car.mesh.position.copy(car.position); car.mesh.rotation.y = car.heading;
  if (Math.abs(car.speed) < 0.05) { car.speed = 0; if (!ride.phase && door.want) doorTo(0, 0.6); }
}

// F again (or a drive key): the rest of it at once
function skip() {
  if (ride.phase === 'walk') inQuick();
  else if (ride.phase === 'in') ride.k = 1;
  else if (ride.phase === 'out') finishOut();
}
// something else took him (a scene, a mode key): what was going stops where it is
function abort() {
  ride.phase = null; ride.k = 1; car.halt = 0; jobs = [];
  Q.reach('R', null, 0);
  if (cm.activeMode !== 'car' && drv.attached) drv.detach(person.mesh);
  if (door.want) doorTo(0, 0.4);
}
// every frame, before his body is posed (person.model.update, below)
function step(dt) {
  if (jobs.length) { for (const j of jobs) j.t -= dt; const due = jobs.filter((j) => j.t <= 0); jobs = jobs.filter((j) => j.t > 0); for (const j of due) j.fn(); }
  const mode = cm.activeMode;
  if (ride.phase && (WAGMI.directed || WAGMI.cutscene || mode !== ride.mode)) abort();
  doorStep(dt); coast(dt);
  switch (ride.phase) {
    case 'walk': walkStep(dt); break;
    case 'in':
      ride.k = Math.min(1, ride.k + dt / T_IN);
      if (cm.keys.forward || cm.keys.backward || cm.keys.left || cm.keys.right) ride.k = 1;
      if (ride.k > 0.84 && door.want) { doorTo(0, ride.k >= 1 ? 0.3 : 0.5); ride.engine = true; }
      if (ride.k >= 1) ride.phase = null;
      break;
    case 'stop': if (Math.abs(car.speed) < 0.3) startOut(); break;
    case 'out':
      ride.t += dt;
      if (door.p > 0.45) ride.k = Math.max(0, ride.k - dt / T_OUT);
      if (ride.k <= 0) finishOut();
      break;
    case 'bail': bailStep(dt); break;
  }
  // in the car means at the wheel (unless a scene has him); on foot, out of it
  if (!ride.phase) {
    if (mode === 'car' && !WAGMI.directed) { if (!drv.attached) { person.inVehicle = true; person.mesh.visible = false; drv.attach(0); } ride.k = 1; }
    else if (drv.attached) drv.detach(person.mesh);
  }
  // (at the wheel, where he is is where the car is)
  if (drv.attached && mode === 'car') { person.position.copy(car.position); person.heading = car.heading; }
}
// his feet are his own on foot, not while a move of this has him: person.control is this; whatever else is set there
// (the fight's footwork) runs under it, the latest first (one that wraps what it found gets the one before)
const unders = [];
let depth = 0;
const control = (dt, keys, mgr) => {
  if (ride.phase) return true;
  const f = unders[unders.length - 1 - depth]; if (!f) return false;
  depth++; try { return f(dt, keys, mgr); } finally { depth--; }
};
if (person.control) unders.push(person.control);
Object.defineProperty(person, 'control', { configurable: true, get: () => control, set: (f) => { if (typeof f === 'function' && f !== control) unders.push(f); } });
{
  const base = person.model.update;
  // (ride.slow, for looking at it: all of this in slow motion)
  person.model.update = (dt, p, air) => {
    dt *= ride.slow || 1;
    step(dt);
    if (drv.attached) { drv.pose(dt, ride.k); return; }
    base(dt, p, air);
  };
}
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyF' || e.repeat) return;
  // (the game's own F: the old way, at once)
  if (!e.isTrusted) { if (cm.activeMode === 'person' && near()) inQuick(); else if (cm.activeMode === 'car' && Math.abs(car.speed) < 4) outQuick(); return; }
  if (WAGMI.cutscene || WAGMI.directed) return;
  if (ride.phase) return skip();
  if (cm.activeMode === 'person' && near()) getIn(!!WAGMI.combat?.fighting);
  else if (cm.activeMode === 'car') getOut();
});
addEventListener('keydown', (e) => {
  if (!ride.phase || !e.isTrusted || e.repeat || !MOVE.has(e.code)) return;
  // (braking to get out: the throttle or reverse keeps him driving)
  if (ride.phase === 'stop') { if (/W|S|Up|Down/.test(e.code)) { ride.phase = null; car.halt = 0; } return; }
  if (ride.phase === 'bail') return;
  skip();
});
Object.assign(ride, { getIn, getOut, skip, door: () => door.p, driver: drv });

const hint = document.createElement('div');
Object.assign(hint.style, { position: 'fixed', left: '50%', bottom: '120px', transform: 'translateX(-50%)', padding: '10px 18px', borderRadius: '12px',
  background: 'rgba(10,12,18,0.72)', color: '#fff', font: '600 15px system-ui, sans-serif', letterSpacing: '0.04em', zIndex: 20, display: 'none', pointerEvents: 'none',
  transition: 'bottom 0.2s', whiteSpace: 'nowrap' });
document.body.appendChild(hint);
// (never on the mission's objective line or the subtitle under it: over them, 10 px clear, wherever they would meet)
function placeHint() {
  const hr = hint.getBoundingClientRect(), H = innerHeight, cx = innerWidth / 2;
  const lines = [];
  for (const el of document.querySelectorAll('#wg .wg-obj, #wg .wg-sub')) {
    if (el.classList.contains('hide') || !el.textContent.trim()) continue;
    const r = el.getBoundingClientRect();
    if (r.height && r.right > cx - hr.width / 2 - 8 && r.left < cx + hr.width / 2 + 8) lines.push(r);
  }
  let bottom = 120;
  for (const r of lines.sort((a, b) => b.bottom - a.bottom)) if (r.top < H - bottom + 10 && r.bottom > H - bottom - hr.height - 10) bottom = H - r.top + 10;
  if (hint.style.bottom !== bottom + 'px') hint.style.bottom = bottom + 'px';
}
// the prompt, and the car's parked thrust settling
let last = performance.now();
(function tick() {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  WAGMI.carIdle(dt);
  const show = ride.phase || WAGMI.paused || WAGMI.cutscene || WAGMI.directed ? '' : cm.activeMode === 'person' && near() ? 'F  ·  Get in' : cm.activeMode === 'car' && Math.abs(car.speed) < 4 ? 'F  ·  Get out' : '';
  if (hint.textContent !== show) hint.textContent = show;
  hint.style.display = show ? 'block' : 'none';
  if (show) placeHint();
  requestAnimationFrame(tick);
})();
WAGMI.ready = true;
console.log('[wagmi] Quant and the car are in');

// the rest of the game, a module each (one that fails to load leaves the others running)
for (const m of ['./audio/index.js', './combat/index.js', './street/index.js', './crash/index.js', './pursuit/index.js', './radio/index.js', './intro.js', './mission/m2.js', './mission/m3.js']) {
  try { const mod = await import(m); if (mod.install) await mod.install(WAGMI); } catch (err) { console.error('[wagmi]', m, err); }
}
