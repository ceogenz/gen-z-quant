// WAGMI City: Juno, a real person (23 Oct). Quant's friend, a teenage on-chain sleuth: her own model
// (assets/characters/juno.glb, made the way Gears' and Quant's are, from a MakeHuman-built human: dark skin, a big curly puff
// held up by a light-blue headband, round glasses, an oversized light-blue hoodie, loose dark jeans, white trainers,
// headphones round her neck; idle, talk, phone, sit, sitTalk, wave, arms, shrug, walk, pickup; a 'jaw' morph so her
// mouth moves as she talks), on Quant's skeleton (upperarm01_, lowerarm01_, wrist_).
//   const J = await buildJuno(W)    { root, inner, bones, mixer, rig, clips, top, jaw(k), arm(side, target, pole, w) }
//   junoPortrait(el, { crop })       her video feed in a call card: frames of her baked from the model, in her room at
//                                    night, the screens behind her; -> { talk(level 0..1), stop() }
//   createJunoRoom(W, J)             her room as a little scene of its own (the bake shoots the call's frames in it)
//   buildLaptop()                    her laptop (open, the trace on its screen: .screen(on))
// W.juno = { build, portrait, spawn(at) } is set the first time this module sees WAGMI.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { rig, clamp } from './cine.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
// the call's frames: one sheet of COLS x ROWS frames, 9:16 each (her room behind her); frame 0 at rest, then the talk
// frames in pairs (mouth shut, mouth open) for each of her gestures
export const SHEET = { url: 'assets/characters/juno-call.jpg', cols: 4, rows: 2, w: 360, h: 640 };

let junoP = null;
const junoGLB = () => junoP || (junoP = new GLTFLoader().loadAsync('assets/characters/juno.glb'));
const MH_ARM = ['upperarm01_', 'lowerarm01_', 'wrist_'];

/* ------------------------------------------------------------- her model -- */
export async function buildJuno(W, { scene = W.app.scene } = {}) {
  const gltf = await junoGLB();
  const root = new THREE.Group(); root.name = 'Juno';
  const inner = skClone(gltf.scene); root.add(inner);
  const morphs = [];
  inner.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    if (o.morphTargetDictionary && 'jaw' in o.morphTargetDictionary) morphs.push([o, o.morphTargetDictionary.jaw]);
  });
  const bones = {}; inner.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  inner.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(inner).max.y;
  const mixer = new THREE.AnimationMixer(inner);
  const clipMap = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
  if (clipMap.idle) clipMap.thugIdle = clipMap.idle;
  root.visible = false; scene?.add(root);
  const P = {
    root, inner, bones, mixer, rig: rig(mixer, clipMap), clips: Object.keys(clipMap), top,
    // her mouth, 0 (shut) .. 1 (wide); about 0.35 is talking
    jaw(k) { for (const [m, i] of morphs) m.morphTargetInfluences[i] = clamp(k, 0, 1); },
    // talking: the mouth's opening at time t (s) while she speaks, from a voice level when there is one
    talk(t, on, level = null) { P.jaw(!on ? 0 : level != null ? 0.08 + level * 0.5 : 0.12 + 0.28 * Math.max(0, Math.sin(t * 17) * Math.sin(t * 5.3 + 1.1))); },
    arm: (side, target, pole, w) => armTo(bones, side, target, pole, w),
  };
  return P;
}

// two-bone reach for her arm (side 'L' | 'R'): the wrist to a world point, the elbow toward pole, by weight w
const _q = new THREE.Quaternion(), _w = new THREE.Quaternion();
function turnWorld(b, q) { b.getWorldQuaternion(_w); const want = q.clone().multiply(_w); b.parent.getWorldQuaternion(_w); b.quaternion.copy(_w.invert().multiply(want)); b.updateMatrixWorld(true); }
export function armTo(B, side, target, pole, w = 1) {
  const b1 = B[MH_ARM[0] + side], b2 = B[MH_ARM[1] + side], b3 = B[MH_ARM[2] + side];
  if (!b1 || !b2 || !b3 || w <= 0) return;
  const q1 = b1.quaternion.clone(), q2 = b2.quaternion.clone();
  const a = b1.getWorldPosition(V()), b = b2.getWorldPosition(V()); let c = b3.getWorldPosition(V());
  const la = a.distanceTo(b), lb = b.distanceTo(c), d = clamp(target.distanceTo(a), 0.05, la + lb - 1e-3);
  const cur = a.clone().sub(b).normalize().angleTo(c.clone().sub(b).normalize());
  const want = Math.acos(clamp((la * la + lb * lb - d * d) / (2 * la * lb), -1, 1));
  const n = V().crossVectors(a.clone().sub(b), c.clone().sub(b)); if (n.lengthSq() < 1e-8) n.set(1, 0, 0); n.normalize();
  turnWorld(b2, _q.setFromAxisAngle(n, want - cur));
  c = b3.getWorldPosition(V());
  turnWorld(b1, _q.setFromUnitVectors(c.sub(a).normalize(), target.clone().sub(a).normalize()));
  const ax = target.clone().sub(a).normalize(), e = b2.getWorldPosition(V()).sub(a), p = pole.clone().sub(a);
  e.addScaledVector(ax, -e.dot(ax)); p.addScaledVector(ax, -p.dot(ax));
  if (e.lengthSq() > 1e-6 && p.lengthSq() > 1e-6) { let ang = e.angleTo(p); if (V().crossVectors(e, p).dot(ax) < 0) ang = -ang; turnWorld(b1, _q.setFromAxisAngle(ax, ang)); }
  if (w < 0.999) { b1.quaternion.slerpQuaternions(q1, b1.quaternion.clone(), w); b2.quaternion.slerpQuaternions(q2, b2.quaternion.clone(), w); b1.updateMatrixWorld(true); }
}

/* ------------------------------------------------------------ her laptop -- */
// open on a table: the base at the origin, its front (and the screen) toward +z, where she sits; a sticker on the back
// of the lid; screen(mode): 'off' | 'scan' (lines of her tools) | 'trace' (the burner's twin, a red ping on a map)
export function buildLaptop() {
  const g = new THREE.Group(); g.name = 'juno-laptop';
  const shell = new THREE.MeshStandardMaterial({ color: '#2B2F38', roughness: 0.45, metalness: 0.5 });
  const keysM = new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.24), shell); base.position.y = 0.009; g.add(base);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.002, 0.11), keysM); kb.position.set(0, 0.019, -0.03); g.add(kb);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.018, -0.12); hinge.rotation.x = -0.32; g.add(hinge);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.23, 0.01), shell); lid.position.set(0, 0.115, -0.005); hinge.add(lid);
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25, 1.25, 1.25) }));
  // (the screen on the lid's inside, toward her: the base's front, +z)
  scr.position.set(0, 0.115, 0.0008); hinge.add(scr);
  // (her sticker on the back of the lid: a little yellow smiley, the GM her room's poster has)
  const st = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshStandardMaterial({ color: '#FFC93C', roughness: 0.6 }));
  st.position.set(0.06, 0.14, -0.0105); st.rotation.y = PI; hinge.add(st);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
  let mode = '', tick = -1;
  // (the trace's ping redrawn ten times a second, not every frame)
  g.userData.screen = (m, t = 0) => {
    if (m === mode && (m !== 'trace' || Math.floor(t * 10) === tick)) return; mode = m; tick = Math.floor(t * 10);
    x.fillStyle = '#071021'; x.fillRect(0, 0, 512, 320);
    if (m === 'off') { tex.needsUpdate = true; return; }
    if (m === 'scan') {
      x.font = '700 18px "Barlow Condensed", monospace'; x.fillStyle = '#6CB8FF';
      ['> burner: 2 SIMs, 1 eSIM', '> imei 35-209100-... batch 0x4E', '> same batch, same buyer: 2', '> twin: last ping 20 min', '> tracing...'].forEach((l, i) => x.fillText(l, 22, 46 + i * 34));
    } else {
      x.fillStyle = '#0B1630'; x.fillRect(0, 0, 512, 320);
      x.fillStyle = '#16243C'; for (let i = 0; i < 7; i++) x.fillRect(30 + i * 70, 0, 8, 320); for (let j = 0; j < 6; j++) x.fillRect(0, 20 + j * 55, 512, 4);
      x.strokeStyle = '#FFC93C'; x.setLineDash([6, 6]); x.lineWidth = 3; x.beginPath(); x.moveTo(120, 300); x.lineTo(210, 210); x.lineTo(300, 140); x.stroke(); x.setLineDash([]);
      const r = 8 + 14 * ((t * 0.8) % 1);
      x.fillStyle = '#EF4444'; x.beginPath(); x.arc(300, 140, 9, 0, PI * 2); x.fill();
      x.strokeStyle = `rgba(239,68,68,${1 - ((t * 0.8) % 1)})`; x.lineWidth = 3; x.beginPath(); x.arc(300, 140, r + 6, 0, PI * 2); x.stroke();
      x.fillStyle = '#fff'; x.font = '700 22px "Barlow Condensed", sans-serif'; x.fillText('TWIN · 7 AV & W 47 ST', 318, 132);
    }
    tex.needsUpdate = true;
  };
  g.userData.screen('off');
  return g;
}

/* -------------------------------------------------------------- her room -- */
// Her room at night, a scene of its own like ZK's (zk.js): a dark blue wall, a desk of screens with code on them behind
// her, warm string lights, a GM poster, a desk lamp; she stands at her desk in her hoodie, the call's camera at her eye
// level. full(cam): drawn in place of the city's frame (the bake's shots), null to stop.
export function createJunoRoom(W, J) {
  const app = W.app, renderer = app.renderer;
  const scene = new THREE.Scene(); scene.name = 'wagmi-juno-room'; scene.background = new THREE.Color('#060A14');
  scene.add(J.root); J.root.position.set(0, 0, 0); J.root.rotation.set(0, 0, 0); J.root.visible = true;
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; };
  box(8, 5, 0.1, new THREE.MeshStandardMaterial({ color: '#16233F', roughness: 0.95 }), 0, 2.2, -1.6);
  box(8, 0.1, 6, new THREE.MeshStandardMaterial({ color: '#15110F', roughness: 0.8 }), 0, -0.05, 0);
  // the screens on the desk behind her: code and charts, blue
  const scr = (seed, title) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 300; const x = c.getContext('2d');
    let s = seed; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    x.fillStyle = '#06101F'; x.fillRect(0, 0, 512, 300);
    x.font = '600 17px monospace';
    for (let i = 0; i < 13; i++) { x.fillStyle = R() < 0.3 ? '#FFC93C' : R() < 0.5 ? '#9FD3FF' : '#4E8FD8'; x.fillText('0x' + Math.floor(R() * 1e12).toString(16) + '  ' + ['transfer', 'swap', 'mint', 'approve', 'bridge'][Math.floor(R() * 5)] + '  ' + (R() * 100).toFixed(2), 16, 28 + i * 21); }
    x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '700 20px "Barlow Condensed", sans-serif'; x.fillText(title, 330, 290);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const frameM = new THREE.MeshStandardMaterial({ color: '#0D0F14', roughness: 0.5, metalness: 0.4 });
  [[-0.62, 1.42, -1.1, 0.35, 'TRACE · 01'], [0.66, 1.46, -1.1, -0.32, 'WALLETS'], [0.05, 1.86, -1.35, 0, 'MEMPOOL']].forEach(([x, y, z, ry, t], i) => {
    const f = box(0.86, 0.52, 0.04, frameM, x, y, z); f.rotation.y = ry;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.46), new THREE.MeshBasicMaterial({ map: scr(31 + i * 97, t), color: new THREE.Color(1.3, 1.35, 1.5) })); s.position.z = 0.022; f.add(s);
  });
  // a GM poster, the string lights over it
  const pc = document.createElement('canvas'); pc.width = 256; pc.height = 340; const px = pc.getContext('2d');
  px.fillStyle = '#1B1430'; px.fillRect(0, 0, 256, 340); px.strokeStyle = '#FFC93C'; px.lineWidth = 6; px.strokeRect(10, 10, 236, 320);
  px.fillStyle = '#FFC93C'; px.font = '800 120px "Barlow Condensed", sans-serif'; px.textAlign = 'center'; px.fillText('GM', 128, 210);
  const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.9 })); poster.position.set(-1.25, 1.75, -1.54); scene.add(poster);
  const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.8) });
  for (let i = 0; i < 22; i++) { const u = i / 21, x = -2.2 + u * 4.4, y = 2.42 - Math.sin(u * PI) * 0.22 + Math.sin(i * 1.7) * 0.02; const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), bulbM); b.position.set(x, y, -1.5); scene.add(b); }
  // the light: her screens' blue from in front and behind (a laptop's glow on her face), the warm string lights, a lamp
  scene.add(new THREE.AmbientLight('#2A3550', 0.7));
  const key = new THREE.PointLight('#CFE2FF', 3.2, 0, 2); key.position.set(0.15, 1.55, 0.75); scene.add(key);
  const warm = new THREE.PointLight('#FFC27A', 2.2, 0, 2); warm.position.set(-0.9, 2.1, -0.9); scene.add(warm);
  const rim = new THREE.PointLight('#6CB8FF', 2.6, 0, 2); rim.position.set(0.7, 1.7, -0.9); scene.add(rim);
  const fill = new THREE.PointLight('#FFD9B0', 1.0, 0, 2); fill.position.set(-0.8, 1.2, 0.8); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(36, 9 / 16, 0.05, 30);
  const state = { full: null };
  const rp = app.renderPipeline, render0 = rp.render.bind(rp);
  rp.render = function (...a) {
    if (state.full) {
      try {
        const c = state.full; cam.position.set(...c.pos); cam.lookAt(c.look[0], c.look[1], c.look[2]);
        const asp = c.aspect || app.cameraSystem.camera.aspect || 16 / 9; if (cam.fov !== c.fov || cam.aspect !== asp) { cam.fov = c.fov; cam.aspect = asp; cam.updateProjectionMatrix(); }
        renderer.setRenderTarget(null); renderer.render(scene, cam); return;
      } catch (e) { console.warn('[juno] room', e); state.full = null; }
    }
    return render0(...a);
  };
  return { scene, cam, full(c) { state.full = c || null; }, dispose() { rp.render = render0; } };
}

/* -------------------------------------------------- her face on a call -- */
// el: the card's element (its size is the card's); crop 'phone' (the whole 9:16 frame) or 'face' (round, her head and
// shoulders). The frames come from the sheet: at rest frame 0; talking, a gesture every so often and her mouth opening
// and closing with the voice
// (the sheet loaded once, ahead of the first call: until it is in, the feed stays clear and what the card had under it
// shows, her initial; it is never an empty square)
let sheetImg = null;
const sheetReady = () => { if (!sheetImg) { sheetImg = new Image(); sheetImg.src = SHEET.url; } return sheetImg.complete && sheetImg.naturalWidth > 0; };
if (typeof window !== 'undefined') sheetReady();
export function junoPortrait(el, { crop = 'phone' } = {}) {
  const S = SHEET, d = document.createElement('div');
  d.className = 'juno-feed';
  const zoom = crop === 'face' ? 2.3 : 1;
  Object.assign(d.style, { position: 'absolute', inset: '0', backgroundImage: `url(${S.url})`, backgroundRepeat: 'no-repeat', backgroundColor: '#0A1222', opacity: sheetReady() ? '1' : '0', transition: 'opacity .2s' });
  if (!sheetReady()) { const on = () => { d.style.opacity = '1'; frame = -1; show(Math.max(0, f0)); }; sheetImg.addEventListener('load', on, { once: true }); }
  el.appendChild(d);
  let frame = -1, gesture = 0, nextG = 0, open = false, stopped = false, breathe = 0, f0 = 0;
  const show = (f) => {
    f0 = f;
    if (f === frame) return; frame = f;
    const r = el.getBoundingClientRect(), W = r.width || 120, H = r.height || 213;
    // (each frame scaled to cover the card, her face kept in the middle when it is cropped: her eyes to her mouth sit at
    // about 39-49% of a frame's height)
    const k = Math.max(W / S.w, H / S.h) * zoom, fw = S.w * k, fh = S.h * k;
    const cx = (f % S.cols) * fw, cy = Math.floor(f / S.cols) * fh, ox = (W - fw) / 2, oy = crop === 'face' ? H / 2 - fh * 0.43 : (H - fh) / 2;
    d.style.backgroundSize = `${fw * S.cols}px ${fh * S.rows}px`;
    d.style.backgroundPosition = `${ox - cx}px ${oy - cy}px`;
  };
  show(0);
  const api = {
    // level 0..1: her voice now (0: listening)
    talk(level = 0) {
      if (stopped) return;
      const t = performance.now() / 1000;
      if (level > 0.08) {
        if (t > nextG) { gesture = 1 + Math.floor(Math.random() * (S.cols * S.rows / 2 - 1)); nextG = t + 1.4 + Math.random() * 1.6; }
        open = level > 0.18 && !open ? true : Math.random() < 0.45 ? !open : open;
        show(Math.min(S.cols * S.rows - 1, gesture * 2 + (open ? 1 : 0)));
      } else { breathe = t; show(0); }
    },
    resize() { const f = frame; frame = -1; show(Math.max(0, f)); },
    stop() { stopped = true; d.remove(); },
    el: d,
  };
  return api;
}

// W.juno for the other modules (the call cards in ui.js, the scenes): build() her model, portrait(el, opt), spawn(at):
// her model placed in the city at [x, z, heading], posed by its rig at time t by the caller
const API = {
  build: (opt) => buildJuno(window.WAGMI, opt),
  portrait: junoPortrait,
  async spawn(at, { clip = 'idle' } = {}) {
    const J = await buildJuno(window.WAGMI); const [x, z, h = 0] = at, cm = window.WAGMI.app.controllerManager;
    J.root.position.set(x, cm.getGroundHeight(x, z, 'person'), z); J.root.rotation.y = h; J.root.visible = true; J.rig.set([[0, clip]]); J.rig.pose(0);
    return J;
  },
  sheet: SHEET,
};
const hook = () => { const W = window.WAGMI; if (!W) return false; if (!W.juno) W.juno = API; return true; };
if (!hook()) { const t = setInterval(() => { if (hook()) clearInterval(t); }, 250); }
