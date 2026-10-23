// WAGMI City: the game on top of the city. Waits for the city app (window.__NYC_APP), then
//  - puts Quant (assets/characters/quant.glb, every clip) in place of the procedural walker, his idle, walk, jog, run
//    and sprint blended from his speed and his jump from the air under him;
//  - puts Quant's car (wagmi/roadster.js) in place of the taxi, faster, its rocket package firing on the boost;
//  - lets him get in and out of it, GTA style: F beside the car gets in, F in the car (slow) gets out at its door.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildRoadster } from './roadster.js';

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
  Object.assign(car, { label: "Quant's car", topSpeed: 34, boostSpeed: 56, accel: 16, boostAccel: 32, roadster: rs });
  car.onUpdate = (dt, keys, throttle, steer) => {
    rs.setThrust(keys.boost && throttle > 0 ? 1 : 0, keys.boost && throttle > 0 ? 0.85 : 0);
    rs.update(dt, car.speed, -steer * 0.9);
  };
  // (parked, it still settles its thrust)
  WAGMI.carIdle = (dt) => { if (cm.activeMode !== 'car') { rs.setThrust(0, 0); rs.update(dt, 0, 0); } };
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
const hint = document.createElement('div');
Object.assign(hint.style, { position: 'fixed', left: '50%', bottom: '120px', transform: 'translateX(-50%)', padding: '10px 18px', borderRadius: '12px',
  background: 'rgba(10,12,18,0.72)', color: '#fff', font: '600 15px system-ui, sans-serif', letterSpacing: '0.04em', zIndex: 20, display: 'none', pointerEvents: 'none' });
document.body.appendChild(hint);
const near = () => Math.hypot(person.position.x - car.position.x, person.position.z - car.position.z) < 4.2;
function enter() {
  person.inVehicle = true; person.mesh.visible = false; person.speed = 0;
  app.selectMode('car');
}
function exit() {
  // out at the driver's door (the left), facing the way the car does, on the ground there
  const h = car.heading, side = 1.75;
  person.position.set(car.position.x + Math.cos(h) * side, car.position.y, car.position.z - Math.sin(h) * side);
  person.position.y = cm.getGroundHeight(person.position.x, person.position.z, 'person');
  person.heading = h; person.inVehicle = false; person.mesh.visible = true; person.verticalVel = 0;
  car.speed = 0;
  app.selectMode('person');
}
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyF' || e.repeat) return;
  if (cm.activeMode === 'person' && near()) enter();
  else if (cm.activeMode === 'car' && Math.abs(car.speed) < 4) exit();
});
// the prompt, and the car's parked thrust settling
let last = performance.now();
(function tick() {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  WAGMI.carIdle(dt);
  const show = cm.activeMode === 'person' && near() ? 'F  ·  Get in' : cm.activeMode === 'car' && Math.abs(car.speed) < 4 ? 'F  ·  Get out' : '';
  hint.textContent = show; hint.style.display = show ? 'block' : 'none';
  requestAnimationFrame(tick);
})();
WAGMI.ready = true;
console.log('[wagmi] Quant and the car are in');

// the rest of the game, a module each (one that fails to load leaves the others running)
for (const m of ['./combat/index.js', './intro.js']) {
  try { const mod = await import(m); if (mod.install) await mod.install(WAGMI); } catch (err) { console.error('[wagmi]', m, err); }
}
