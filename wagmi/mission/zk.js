// Gen Z Quant: ZK on a video call. His room is a little scene of its own, not the city's (a light added to the city
// would cost every material in it a recompile): ZK standing at his microphone, tall, in a black tailored tracksuit with
// acid-green piping, a hood, a mirrored chrome visor and a gold '0' on a chain; a neon ring on the wall behind his head,
// red charts falling on the screens either side, lit by his ring light from the front and the screens from behind.
// It is drawn in place of the city's frame (the full-frame insert) or into a texture (his feed on Quant's phone).
//   const zk = createZK(W, gltf);  zk.pose(t, { lean, tilt, palm })  zk.full({ pos, look, fov } | null)  zk.phone(on)
//   zk.texture (the phone feed)  zk.warm() (compiles it all behind the gate)
import * as THREE from 'three/webgpu';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { rig, clamp, smooth } from './cine.js';

const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function createZK(W, gltf) {
  const app = W.app, renderer = app.renderer;
  const scene = new THREE.Scene(); scene.name = 'wagmi-zk-room';
  scene.background = new THREE.Color('#050307');
  // (the city's sky for the chrome and the gold to catch, kept low: the room is dark)
  const env = app.scene.environment || null;

  /* ------------------------------------------------------------- the man -- */
  // Masked from head to foot, never a face: a matte black balaclava over the whole head, the hood up over it, the
  // chrome visor plate with its two ring eyes, gloves (the whole body one plain black: no skin, the neck covered by
  // the balaclava and the collar). Built at the origin in the rest pose at scale 1, each piece fixed to its bone, then
  // the man scaled up (he is tall).
  const root = new THREE.Group(); root.name = 'ZK'; scene.add(root);
  const inner = skClone(gltf.scene); root.add(inner);
  // the tracksuit and gloves: plain black, a little tailored sheen (no texture: the Degen's printed face never shows)
  const suit = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.78, metalness: 0 });
  inner.traverse((o) => { if (o.isMesh) { o.material = suit; o.frustumCulled = false; } });
  const bones = {}; inner.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  root.updateMatrixWorld(true);
  const wp = (b) => b.getWorldPosition(V());
  const acid = new THREE.MeshStandardMaterial({ color: '#B6FF3B', emissive: '#7FBF1A', emissiveIntensity: 0.9, roughness: 0.5 });
  // (the visor a mirror: a sky above its horizon line, the dark room below, streaks across it)
  const chromeTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 64, 0, 0);
    [[0, '#20242B'], [0.3, '#5C6470'], [0.47, '#C9D0DA'], [0.52, '#3A404B'], [0.6, '#F4F7FB'], [0.82, '#AEB6C2'], [1, '#6B7380']].forEach(([k, col]) => g.addColorStop(k, col));
    x.fillStyle = g; x.fillRect(0, 0, 256, 64);
    for (const [u, w, a] of [[40, 10, 0.5], [70, 4, 0.35], [168, 14, 0.45], [200, 5, 0.3]]) { x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.moveTo(u, 0); x.lineTo(u + w, 0); x.lineTo(u + w - 18, 64); x.lineTo(u - 18, 64); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const chrome = new THREE.MeshStandardMaterial({ map: chromeTex, color: '#FFFFFF', metalness: 0.55, roughness: 0.12, envMap: env, envMapIntensity: 0.5, emissive: '#FFFFFF', emissiveMap: chromeTex, emissiveIntensity: 0.12 });
  const gold = new THREE.MeshStandardMaterial({ color: '#E7B94A', metalness: 1, roughness: 0.22, envMap: env, envMapIntensity: 1.3 });
  const knit = new THREE.MeshStandardMaterial({ color: '#0D0D10', roughness: 0.96, metalness: 0 });
  const hoodMat = new THREE.MeshStandardMaterial({ color: '#121215', roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.5, metalness: 0.4 });
  // the head, measured from the skin itself (every vertex above the neck)
  const hb = new THREE.Box3(), _p = V(), neckY = wp(bones.head).y - 0.03;
  inner.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { o.getVertexPosition(i, _p); _p.applyMatrix4(o.matrixWorld); if (_p.y > neckY && Math.abs(_p.x) < 0.16) hb.expandByPoint(_p); }
  });
  const hc = hb.getCenter(V()), hr = hb.getSize(V()).multiplyScalar(0.5);
  const R = V(hr.x * 1.1 + 0.006, hr.y * 1.06 + 0.006, hr.z * 1.08 + 0.006); // (the balaclava's radii: over every feature)
  const head = bones.head;
  const fix = (m, bone = head) => { root.add(m); bone.attach(m); m.traverse((k) => { if (k.isMesh) { k.castShadow = true; k.frustumCulled = false; } }); return m; };
  // the balaclava: a smooth shell over the whole head and down over the neck
  const mask = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), knit); mask.scale.copy(R); mask.position.copy(hc); fix(mask);
  const neckTube = new THREE.Mesh(new THREE.CylinderGeometry(R.x * 0.62, R.x * 0.74, 0.16, 28, 1, true), knit);
  neckTube.position.set(hc.x, hc.y - R.y * 0.95, hc.z - R.z * 0.12); fix(neckTube, bones.neck);
  // the hood up over it, open at the face
  const hood = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, PI / 2 + 0.95, 2 * PI - 1.9, 0, PI * 0.72), hoodMat);
  hood.scale.set(R.x * 1.16, R.y * 1.12, R.z * 1.14); hood.position.set(hc.x, hc.y + 0.012, hc.z - 0.018); fix(hood);
  // the visor: a band of mirror round the front at the eyes, hugging the mask, a black rim above and below, and the two
  // ring 'eyes' on it (his look on the call)
  const eyeY = hc.y + R.y * 0.16, shrink = Math.sqrt(1 - Math.pow((eyeY - hc.y) / R.y, 2)), vx = R.x * shrink * 1.025, vz = R.z * shrink * 1.025;
  const VH = R.y * 0.34;
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, VH, 48, 1, true, -1.25, 2.5), chrome);
  visor.scale.set(vx, 1, vz); visor.position.set(hc.x, eyeY, hc.z); fix(visor);
  for (const dy of [VH / 2, -VH / 2]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.007, 48, 1, true, -1.27, 2.54), rimMat);
    r.scale.set(vx * 1.012, 1, vz * 1.012); r.position.set(hc.x, eyeY + dy, hc.z); fix(r);
  }
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.7) });
  for (const th of [-0.36, 0.36]) {
    const e = new THREE.Mesh(new THREE.TorusGeometry(VH * 0.3, 0.0032, 8, 32), ringMat);
    e.scale.set(1.25, 0.72, 1); e.rotation.y = th;
    e.position.set(hc.x + Math.sin(th) * vx * 1.012, eyeY, hc.z + Math.cos(th) * vz * 1.012); fix(e);
  }
  let pendant = null;
  {
    // the piping: acid green down the outside of each arm, round the collar, down the zip
    const tube = (a, b, out, bone, r = 0.0065) => {
      const d = b.clone().sub(a), L = d.length();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6, 1), acid);
      m.position.copy(a).add(b).multiplyScalar(0.5).add(out);
      m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
      return fix(m, bone);
    };
    for (const s of ['L', 'R']) {
      const sh = wp(bones['upperArm' + s]), el = wp(bones['forearm' + s]), wr = wp(bones['hand' + s]);
      const side = Math.sign(sh.x) || (s === 'L' ? 1 : -1);
      tube(sh, el, V(side * 0.0, 0.052, 0), bones['upperArm' + s]);
      tube(el, wr, V(side * 0.0, 0.042, 0), bones['forearm' + s], 0.0055);
    }
    const n = wp(bones.neck), s2 = wp(bones.spine2), s1 = wp(bones.spine1);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(1, 0.075, 6, 40), acid);
    collar.rotation.x = PI / 2 - 0.2; collar.position.set(hc.x, hc.y - R.y * 1.02, hc.z - R.z * 0.1); collar.scale.set(R.x * 0.82, R.z * 0.86, 0.08); fix(collar, bones.neck);
    tube(V(0, n.y - 0.06, n.z + 0.1), V(0, s1.y - 0.05, s1.z + 0.13), V(), bones.spine2, 0.0065);
    // and over each shoulder, collar to sleeve
    for (const s of ['L', 'R']) { const sh = wp(bones['upperArm' + s]); tube(V(Math.sign(sh.x) * 0.07, n.y - 0.02, n.z), V(sh.x, sh.y + 0.06, sh.z), V(), bones.spine2, 0.006); }
    // the gold '0' on its chain
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.0032, 6, 40, PI * 1.15), gold);
    chain.rotation.set(-0.5, 0, PI * 1.07); chain.position.set(0, n.y - 0.07, n.z + 0.06); chain.scale.set(1, 1.25, 1); fix(chain, bones.spine2);
    const zero = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.01, 12, 32), gold);
    zero.scale.set(0.72, 1, 1); zero.position.set(0, s2.y - 0.02, s2.z + 0.135); fix(zero, bones.spine2);
    pendant = zero;
  }
  root.scale.setScalar(1.07); root.updateMatrixWorld(true);
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
  const mixer = new THREE.AnimationMixer(inner);
  // (standing still: a frame of the walk, feet under him, the arms then put where the scene wants them)
  const body = rig(mixer, clips).set([[0, 'walk', { from: 0.85, speed: 0 }]]);
  const top = (hb.max.y + 0.03) * 1.07;
  // his eyes (the visor's middle) in the room, standing: the shots are framed on it
  const EYE = V(hc.x, eyeY, hc.z + vz).multiplyScalar(1.07);

  /* ------------------------------------------------------------ the room -- */
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; };
  const wallMat = new THREE.MeshStandardMaterial({ color: '#17101F', roughness: 0.95 });
  box(9, 5, 0.1, wallMat, 0, 2.2, -2.4);
  box(0.1, 5, 6, wallMat, -3.2, 2.2, 0.2).rotation.y = 0.25;
  box(0.1, 5, 6, wallMat, 3.2, 2.2, 0.2).rotation.y = -0.25;
  box(9, 0.1, 7, new THREE.MeshStandardMaterial({ color: '#0B0A0E', roughness: 0.6, metalness: 0.2 }), 0, -0.05, 0);
  // acoustic panels behind him, in a grid, catching the ring's light
  const panelMat = new THREE.MeshStandardMaterial({ color: '#221830', roughness: 1 });
  for (let i = -3; i <= 3; i++) for (let j = 0; j < 4; j++) if (Math.abs(i) > 0 || j < 1 || j > 2) box(0.56, 0.56, 0.06, panelMat, i * 0.62, 0.62 + j * 0.62, -2.32);
  // the neon ring: his halo on the call (and a soft glow round it: the room's own bloom)
  const ringY = EYE.y + 0.02;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.022, 12, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.25, 2.7) }));
  ring.position.set(0, ringY, -1.9); scene.add(ring);
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 60, 128, 128, 128);
    g.addColorStop(0, 'rgba(200,180,255,0)'); g.addColorStop(0.42, 'rgba(210,195,255,0.0)'); g.addColorStop(0.47, 'rgba(225,215,255,0.55)'); g.addColorStop(0.53, 'rgba(200,180,255,0.18)'); g.addColorStop(1, 'rgba(160,120,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(0, ringY, -1.88); scene.add(glow);
  // the screens: red candles all the way down, a ticker, a big red number
  function chart(seed, title) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 300; const x = c.getContext('2d');
    let s = seed; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    x.fillStyle = '#07060A'; x.fillRect(0, 0, 512, 300);
    x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 1; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, i * 50); x.lineTo(512, i * 50); x.stroke(); }
    let y = 70;
    for (let i = 0; i < 30; i++) {
      const up = R() < 0.22, h = 6 + R() * 26, cx = 30 + i * 15.5;
      const o = y, cl = up ? y - h * 0.5 : y + h; y = Math.min(268, cl);
      x.strokeStyle = up ? '#2CE07A' : '#FF3B3B'; x.beginPath(); x.moveTo(cx, Math.min(o, cl) - 6 - R() * 8); x.lineTo(cx, Math.max(o, cl) + 6 + R() * 8); x.stroke();
      x.fillStyle = up ? '#2CE07A' : '#FF3B3B'; x.fillRect(cx - 5, Math.min(o, cl), 10, Math.max(3, Math.abs(cl - o)));
    }
    x.fillStyle = '#FF3B3B'; x.font = '800 44px "Barlow Condensed", sans-serif'; x.fillText('-' + (60 + Math.round(R() * 35)) + '.' + Math.round(R() * 9) + '%', 300, 54);
    x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 22px "Barlow Condensed", sans-serif'; x.fillText(title, 18, 30);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const frameMat = new THREE.MeshStandardMaterial({ color: '#0C0C0F', roughness: 0.4, metalness: 0.6 });
  // (the top two kept below the call's labels in the corners of every shot)
  [[-1.32, 1.5, -1.75, 0.45, '$QUANT · 1D'], [-1.5, 0.85, -1.6, 0.5, 'BAGS · ALL TIME'], [1.32, 1.5, -1.75, -0.45, 'MY COMMUNITY'], [1.5, 0.85, -1.6, -0.5, '$QUANT · 1H']].forEach(([x, y, z, ry, title], i) => {
    const f = box(0.98, 0.6, 0.04, frameMat, x, y, z); f.rotation.y = ry;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.54), new THREE.MeshBasicMaterial({ map: chart(17 + i * 71, title), color: new THREE.Color(1.5, 1.5, 1.5) }));
    scr.position.set(0, 0, 0.022); f.add(scr);
  });
  // the light: his ring light in front (cool white), the neon ring behind him, the screens' red, an acid kicker
  scene.add(new THREE.AmbientLight('#3A2C4A', 0.55));
  const key = new THREE.PointLight('#ECE6FF', 5.5, 0, 2); key.position.set(0.25, 2.05, 1.35); scene.add(key);
  const halo = new THREE.PointLight('#C9B8FF', 3.2, 0, 2); halo.position.set(0, ringY, -1.45); scene.add(halo);
  const red = new THREE.PointLight('#FF3A2A', 2.2, 0, 2); red.position.set(1.15, 1.55, -1.25); scene.add(red);
  const red2 = new THREE.PointLight('#FF3A2A', 1.6, 0, 2); red2.position.set(-1.15, 1.55, -1.25); scene.add(red2);
  const kick = new THREE.PointLight('#B6FF3B', 1.8, 0, 2); kick.position.set(-0.9, 1.3, -0.45); scene.add(kick);

  /* ---------------------------------------------------------- the camera -- */
  const cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.05, 30);
  const phoneCam = new THREE.PerspectiveCamera(42, 0.46, 0.05, 30);
  phoneCam.position.set(0.02, EYE.y - 0.02, 1.25); phoneCam.lookAt(0, EYE.y - 0.13, 0);
  const rt = new THREE.RenderTarget(236, 512, { samples: 4 });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;

  /* ----------------------------------------------------------- the pose -- */
  const spine = [bones.spine, bones.spine1, bones.spine2].filter(Boolean);
  const keep = spine.concat([bones.neck, bones.head, bones.upperArmL, bones.forearmL, bones.handL, bones.upperArmR, bones.forearmR, bones.handR].filter(Boolean)).map((b) => [b, b.quaternion.clone()]);
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _a = V(), _b = V(), _c = V(), _t = V(), _n = V();
  function turn(b, axis, ang) { b.getWorldQuaternion(_q2); _q.setFromAxisAngle(axis, ang).multiply(_q2); b.parent.getWorldQuaternion(_q2); b.quaternion.copy(_q2.invert().multiply(_q)); b.updateMatrixWorld(true); }
  function reach(b1, b2, b3, target, pole, w) {
    if (!b1 || !b2 || !b3 || w <= 0.001) return;
    const q1 = b1.quaternion.clone(), q2 = b2.quaternion.clone();
    b1.getWorldPosition(_a); b2.getWorldPosition(_b); b3.getWorldPosition(_c);
    const la = _a.distanceTo(_b), lb = _b.distanceTo(_c), d = clamp(target.distanceTo(_a), 0.05, la + lb - 1e-3);
    const cur = _t.subVectors(_a, _b).normalize().angleTo(_n.subVectors(_c, _b).normalize());
    const want = Math.acos(clamp((la * la + lb * lb - d * d) / (2 * la * lb), -1, 1));
    const ax = V().crossVectors(_t.subVectors(_a, _b), _n.subVectors(_c, _b)); if (ax.lengthSq() < 1e-8) ax.set(1, 0, 0); ax.normalize();
    turn(b2, ax, want - cur);
    b3.getWorldPosition(_c);
    const from = _t.subVectors(_c, _a).normalize(), to = _n.subVectors(target, _a).normalize();
    const ax2 = V().crossVectors(from, to); if (ax2.lengthSq() > 1e-10) turn(b1, ax2.normalize(), from.angleTo(to));
    if (pole) {
      b2.getWorldPosition(_b); const axl = V().subVectors(target, _a).normalize(), e = V().subVectors(_b, _a); e.addScaledVector(axl, -e.dot(axl));
      const p = pole.clone().sub(_a); p.addScaledVector(axl, -p.dot(axl));
      if (e.lengthSq() > 1e-6 && p.lengthSq() > 1e-6) { let ang = e.angleTo(p); if (V().crossVectors(e, p).dot(axl) < 0) ang = -ang; turn(b1, axl, ang); }
    }
    if (w < 0.999) { b1.quaternion.slerpQuaternions(q1, b1.quaternion.clone(), w); b2.quaternion.slerpQuaternions(q2, b2.quaternion.clone(), w); b1.updateMatrixWorld(true); }
  }
  // t: the scene clock; lean: toward the lens (0..1); tilt: his head to one side (radians); palm: his right hand up,
  // open to the lens (0..1). His hands rest steepled in front of his chest; he breathes.
  function pose(t, { lean = 0, tilt = 0, palm = 0 } = {}) {
    for (const [b, q] of keep) b.quaternion.copy(q);
    body.pose(t);
    for (const [b, q] of keep) q.copy(b.quaternion);
    root.updateMatrixWorld(true);
    const X = V(1, 0, 0), Z = V(0, 0, 1);
    // (standing tall, chin up; leaning into the lens; a slow breath)
    for (const b of spine) turn(b, X, (-0.03 + 0.14 * lean + 0.012 * Math.sin(t * 1.7)) / spine.length);
    if (bones.neck) turn(bones.neck, X, 0.05 * lean);
    if (bones.head) { turn(bones.head, Z, tilt); turn(bones.head, X, -0.06 + 0.06 * lean); }
    // the hands: steepled in front of his chest, up under his chin (where the lens sees them); the right one up, palm to
    // the lens, for the demand
    const ch = wp2(bones.spine2).add(V(0, 0.08, 0.3));
    if (bones.upperArmL) reach(bones.upperArmL, bones.forearmL, bones.handL, ch.clone().add(V(0.085, 0, 0)), ch.clone().add(V(0.7, -0.6, -0.2)), 1);
    if (bones.upperArmR) {
      const up = wp2(bones.spine2).add(V(-0.21, 0.24, 0.44));
      reach(bones.upperArmR, bones.forearmR, bones.handR, ch.clone().add(V(-0.085, 0, 0)).lerp(up, palm), ch.clone().add(V(-0.7, -0.6, -0.2)), 1);
    }
    // the light along the ring's edge slowly breathing; the screens flicker now and then
    ring.material.color.setScalar(2.3 + 0.15 * Math.sin(t * 2.1));
  }
  const wp2 = (b) => b.getWorldPosition(V());

  /* ----------------------------------------------------------- the draw -- */
  // (in front of the city's frame: the full-frame insert replaces it; the phone's feed is drawn before it)
  const state = { full: null, phone: false, warm: 0 };
  const rp = app.renderPipeline, render0 = rp.render.bind(rp);
  rp.render = function (...a) {
    try {
      if (state.phone || state.warm) { renderer.setRenderTarget(rt); renderer.render(scene, phoneCam); renderer.setRenderTarget(null); }
      if (state.full || state.warm) {
        const c = state.full || { pos: [0.2, 1.6, 1.8], look: [0, 1.55, 0], fov: 34 };
        cam.position.set(...c.pos); cam.lookAt(c.look[0], c.look[1], c.look[2]); if (c.roll) cam.rotateZ(c.roll);
        const asp = app.cameraSystem.camera.aspect || 16 / 9;
        if (cam.fov !== c.fov || cam.aspect !== asp) { cam.fov = c.fov; cam.aspect = asp; cam.updateProjectionMatrix(); }
        renderer.setRenderTarget(null); renderer.render(scene, cam);
        if (state.full) return;
      }
    } catch (e) { console.warn('[zk]', e); state.full = null; state.phone = false; }
    if (state.warm) state.warm--;
    return render0(...a);
  };
  const zkApi = {
    scene, root, bones, mixer, cam, phoneCam, top, eye: EYE, texture: rt.texture,
    pose, pendant,
    full(c) { state.full = c || null; },
    phone(on) { state.phone = !!on; },
    // the pipelines, the frame buffer and the feed built now (behind the gate), not on the insert's first frame
    async warm() { pose(0); try { await renderer.compileAsync(scene, cam); } catch (e) { console.warn('[zk] compile', e); } state.warm = 3; },
  };
  return zkApi;
}
