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
  const rs = buildRoadster(THREE, { paint: '#8E0B14' });
  rs.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  car.chassisPivot.add(rs.group);
  Object.assign(car, { label: "Quant's Roadster", topSpeed: 34, boostSpeed: 56, accel: 16, boostAccel: 32, roadster: rs });
  car.onUpdate = (dt, keys, throttle, steer) => {
    rs.setThrust(keys.boost && throttle > 0 ? 1 : 0, keys.boost && throttle > 0 ? 0.85 : 0);
    rs.update(dt, car.speed, -steer * 0.9);
  };
  // (parked, it still settles its thrust)
  WAGMI.carIdle = (dt) => { if (cm.activeMode !== 'car') { rs.setThrust(0, 0); rs.update(dt, 0, 0); } };
}

/* ----------------------------------------------------------------- Quant -- */
{
  const gltf = await new GLTFLoader().loadAsync('assets/characters/quant.glb');
  const body = gltf.scene;
  body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  for (const m of person.crowd.meshes) m.visible = false;
  person.mesh.add(body);
  const mixer = new THREE.AnimationMixer(body), clips = gltf.animations, A = {};
  const act = (n) => A[n] || (A[n] = mixer.clipAction(THREE.AnimationClip.findByName(clips, n)));
  // the gaits and the speed each clip was captured at (its time scale follows the real speed)
  const GAITS = [['idle', 0, 1], ['walk', 1.45, 1.45], ['jog', 3.3, 3.3], ['run', 5.6, 5.6], ['sprint', 7.6, 7.6]];
  for (const [n] of GAITS) { const a = act(n); a.play(); a.setEffectiveWeight(n === 'idle' ? 1 : 0); }
  const W = Object.fromEntries(GAITS.map(([n]) => [n, n === 'idle' ? 1 : 0]));
  WAGMI.quant = { body, mixer, clips: clips.map((c) => c.name), act };
  person.label = 'Quant';
  person.model = {
    update(dt, p, air) {
      // a cutscene (or anything else that directs him) drives the body itself, mixer and all
      if (WAGMI.directed) { WAGMI.directed(dt, p, air); return; }
      const v = Math.abs(p.speed);
      // which gait, by speed (the two nearest blended), and how fast its clip runs
      let k = 0; while (k < GAITS.length - 1 && v > GAITS[k + 1][1]) k++;
      const a = GAITS[k], b = GAITS[Math.min(GAITS.length - 1, k + 1)], f = b === a ? 0 : Math.min(1, Math.max(0, (v - a[1]) / (b[1] - a[1])));
      for (const [n] of GAITS) { const want = n === a[0] ? 1 - f : n === b[0] ? f : 0; W[n] += (want - W[n]) * Math.min(1, dt * 10); act(n).setEffectiveWeight(W[n]); }
      for (const [n, , sp] of GAITS) if (sp) act(n).timeScale = Math.max(0.6, Math.min(1.6, v / sp || 1));
      mixer.update(dt);
      body.position.y = 0;
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
