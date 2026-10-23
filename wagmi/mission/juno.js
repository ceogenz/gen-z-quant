// WAGMI City: Juno, a real person (23 Oct). Quant's friend, a teenage on-chain sleuth: her own model
// (assets/characters/juno.glb, made the way Gears' and Quant's are, from a MakeHuman-built human: dark skin, a big curly puff
// held up by a light-blue headband, round glasses, an oversized light-blue hoodie, loose dark jeans, white trainers,
// headphones round her neck; idle, talk, phone, sit, sitTalk, wave, arms, shrug, walk, pickup; a 'jaw' morph so her
// mouth moves as she talks), on Quant's skeleton (upperarm01_, lowerarm01_, wrist_).
//   const J = await buildJuno(W)    { root, inner, bones, mixer, rig, clips, top, jaw(k), arm(side, target, pole, w),
//                                    face: { set({ blink, brow, lookX, lookY }), aim(at, opt), live(dt, o), blink() } }
//                                    (also on root.userData.juno)
//   junoPortrait(el, { crop })       her video feed in a call card: frames of her baked from the model, in her room at
//                                    night, the screens behind her, her mouth with her voice; -> { talk(on), stop() }
//   junoVoice()                      her voice now ({ level, t, text }) while one of her lines plays, else null
//   createJunoRoom(W, J)             her room as a little scene of its own (the bake shoots the call's frames in it)
//   buildLaptop()                    her laptop (open, the trace on its screen: .screen(on))
// W.juno = { build, portrait, spawn(at) } is set the first time this module sees WAGMI.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { positionLocal, normalLocal, positionView, normalViewGeometry, mx_worley_noise_float, float, vec3, mix, smoothstep, dFdx, dFdy, cross, dot, sign, abs, normalize } from 'three/tsl';
import { rig, clamp } from './cine.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PI = Math.PI;
// the call's frames: one sheet of COLS x ROWS frames, 9:16 each (her room behind her), her head and collar. A row for
// each of her head's poses (0 straight to the camera, 1 a little tilt and turn, 2 turned toward her screens, 3 chin up
// with her brows raised: a question), a column for each face in it: her mouth shut, half open, open, a blink, a glance
// off the camera (her mouth shut). (23 Oct, round 2: lip-sync; before it, pairs of shut / open per gesture)
export const SHEET = { url: 'assets/characters/juno-call.jpg', cols: 5, rows: 4, w: 360, h: 640 };
export const FACE = { shut: 0, half: 1, open: 2, blink: 3, glance: 4 };

let junoP = null;
const junoGLB = () => junoP || (junoP = new GLTFLoader().loadAsync('assets/characters/juno.glb'));
const MH_ARM = ['upperarm01_', 'lowerarm01_', 'wrist_'];

/* ------------------------------------------------------------- her model -- */
// her puff as hair (23 Oct): the model's puff is a smooth ball in her hair's dark brown (its vertex colours), which read
// as a flat dark blob. Here it is curls: clusters of them about 2.5 cm across raising its surface (so its outline is
// lumpy, not a ball's), the tight coils in each (~7 mm) as a bump in the light, their tops a lighter brown and glossier,
// their hollows darker. Cellular noise in the puff's own space, so the curls ride with her head.
let puffMat = null;
function curlyPuff() {
  if (puffMat) return puffMat;
  const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, name: 'puff' });
  const p = positionLocal;
  const cluster = float(1.0).sub(mx_worley_noise_float(p.mul(40.0)));
  const coil = float(1.0).sub(mx_worley_noise_float(p.mul(140.0).add(vec3(3.1, 7.7, 1.3))));
  m.positionNode = p.add(normalLocal.mul(cluster.mul(0.009).sub(0.003)));
  // (the coils' and clusters' height turned into the surface's tilt: the bump from the screen-space derivatives)
  const h = coil.mul(0.0024).add(cluster.mul(0.004)), nv = normalViewGeometry;
  const dpx = dFdx(positionView), dpy = dFdy(positionView), dhx = dFdx(h), dhy = dFdy(h);
  const r1 = cross(dpy, nv), r2 = cross(nv, dpx), det = dot(dpx, r1);
  m.normalNode = normalize(abs(det).mul(nv).sub(sign(det).mul(dhx.mul(r1).add(dhy.mul(r2)))));
  const lift = smoothstep(0.35, 0.95, coil);
  m.colorNode = vec3(1.0, 0.94, 0.88).mul(mix(float(0.65), float(1.85), lift.mul(lift))).mul(mix(float(0.65), float(1.3), cluster));
  m.roughnessNode = mix(float(0.9), float(0.64), lift);
  return (puffMat = m);
}

// her face's morphs (23 Oct, round 2, the owner: "her lips don't move and eyes when talk to match voice"), made here
// from the GLB's body before its first draw, in place of the GLB's own jaw. Its primitives (skin, eyes, brows,
// lashes, ...) share one buffer of vertices, so each morph is one set of offsets over all of it, given to the
// primitives it moves:
//   jaw             her chin and lower lip turned down about the jaw's hinge, split from the upper lip at the parting
//   blink, blink2   the upper lids, and the lashes on them, turned down over the eyes about each eyeball's middle (the
//                   lower lids up a little to meet them): blink to half way, blink2 the rest, so the lid follows the
//                   eyeball's curve and never cuts into it half way (a morph moves in a straight line)
//   brow            the brows and the forehead over them up 6 mm
//   lookX, lookY    the eyeballs turned about their own middles, LOOK rad toward her left / up at 1 (-1 the other way)
//   lip             her upper lip up 2 mm in the middle (with the jaw: an open mouth, not only a dropped lower lip)
const LOOK = 0.3, LID_UP = 0.74, LID_LO = 0.12;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const MORPHS = { skin: ['jaw', 'lip', 'blink', 'blink2', 'brow'], lashes: ['blink', 'blink2'], brows: ['brow'], eyes: ['lookX', 'lookY'] };
function faceMorphs(meshes) {
  const by = {}; for (const m of meshes) by[m.material.name] = m;
  if (!by.skin || !by.eyes) return null;
  const g0 = by.skin.geometry; if (g0.userData.face) return g0.userData.face;
  const P = g0.attributes.position, n = P.count;
  const verts = (m) => (m ? new Set(m.geometry.index.array) : new Set());
  const eyeV = verts(by.eyes), p = V(), d = V();
  // each eyeball: a sphere fitted to its vertices (least squares: x²+y²+z² = 2a·x + 2b·y + 2c·z + e), its middle the pivot
  const eyes = [1, -1].map((side) => {
    const A = Array.from({ length: 4 }, () => new Float64Array(5));
    for (const v of eyeV) { p.fromBufferAttribute(P, v); if (p.x * side <= 0) continue; const r = [2 * p.x, 2 * p.y, 2 * p.z, 1], s = p.lengthSq();
      for (let i = 0; i < 4; i++) { for (let j = 0; j < 4; j++) A[i][j] += r[i] * r[j]; A[i][4] += r[i] * s; } }
    for (let c = 0; c < 4; c++) { let m = c; for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r; [A[c], A[m]] = [A[m], A[c]];
      for (let r = 0; r < 4; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 5; k++) A[r][k] -= f * A[c][k]; } }
    const c = V(A[0][4] / A[0][0], A[1][4] / A[1][1], A[2][4] / A[2][2]);
    return { side, c, r: Math.sqrt(Math.max(1e-8, c.lengthSq() + A[3][4] / A[3][3])) };
  });
  const eyeOf = (x) => (x >= 0 ? eyes[0] : eyes[1]);
  const off = () => new Float32Array(n * 3), out = { jaw: off(), lip: off(), blink: off(), blink2: off(), brow: off(), lookX: off(), lookY: off() };
  // (her lips part 63 mm under her eyes' middle: the GLB's own jaw morph opened them from 5 mm lower, so her lower lip
  // stretched down and never came away from the upper; here the jaw is made again from the real parting. The chin is
  // 105 mm under her eyes, the jaw's hinge 35 mm under them and 85 mm behind their fronts)
  const ey = eyes[0].c.y, fm = ey - 0.0629, chin = ey - 0.1055, front = eyes[0].c.z + eyes[0].r, hinge = [ey - 0.035, front - 0.085];
  // (a vertex turned about the eye's middle by a about x: down over the front for a > 0; its offset into o, at stage s
  // of two: the first half of the turn, then the rest)
  const lid = (v, e, a) => {
    d.fromBufferAttribute(P, v).sub(e.c); const rho = Math.hypot(d.y, d.z), phi = Math.atan2(d.y, d.z);
    const at = (k) => [rho * Math.sin(phi - a * k), rho * Math.cos(phi - a * k)], h = at(0.5), f = at(1);
    out.blink[v * 3 + 1] = h[0] - d.y; out.blink[v * 3 + 2] = h[1] - d.z; out.blink2[v * 3 + 1] = f[0] - h[0]; out.blink2[v * 3 + 2] = f[1] - h[1];
  };
  let lids = 0, brows = 0;
  for (const v of verts(by.skin)) {
    p.fromBufferAttribute(P, v); const e = eyeOf(p.x); d.copy(p).sub(e.c); const r = d.length();
    // the lids: the upper turned down, all of it near the eye's opening, less out to the crease; the lower up a little
    if (d.z > 0 && r < 0.022) {
      const up = sstep(0.022, 0.0135, r) * sstep(-0.003, 0.001, d.y), lo = sstep(0.019, 0.012, r) * sstep(0.0, -0.003, d.y);
      if (up > 0.002) { lid(v, e, LID_UP * up); lids++; } else if (lo > 0.002) { lid(v, e, -LID_LO * lo); lids++; }
    }
    // the forehead over the brows, up with them (fading out by the hairline, and toward the temples)
    const fw = sstep(e.c.y + 0.002, e.c.y + 0.012, p.y) * (1 - sstep(e.c.y + 0.035, e.c.y + 0.058, p.y)) * (1 - sstep(0.056, 0.072, Math.abs(p.x))) * sstep(e.c.z - 0.03, e.c.z - 0.01, p.z);
    if (fw > 0.002) { out.brow[v * 3 + 1] = 0.006 * fw; brows++; }
    // the jaw: turned down 0.2 rad about the hinge below the ears, all of her below the parting in the middle of her
    // mouth (a clean split, so her lips come apart), the split softer toward its corners; fading out to the jaw's
    // corners, behind, and under the chin
    { const ax = Math.abs(p.x), dz = front - p.z, soft = 0.0006 + 0.008 * sstep(0.011, 0.026, ax);
      let w = sstep(fm + soft, fm - soft, p.y) * (1 - sstep(0.035, 0.06, ax) * sstep(0.02, 0.07, dz)) * (1 - sstep(0.06, 0.1, dz));
      if (p.y < chin) w *= 1 - sstep(0.0, 0.025, chin - p.y);
      if (w > 0.002 && dz < 0.13) { const a = 0.2 * w, y = p.y - hinge[0], z = p.z - hinge[1], c = Math.cos(a), s = Math.sin(a);
        out.jaw[v * 3 + 1] = y * c - z * s - y; out.jaw[v * 3 + 2] = y * s + z * c - z; } }
    // the upper lip, over the parting, its middle most (its corners stay)
    const lw = sstep(0.027, 0.008, Math.abs(p.x)) * sstep(fm + 0.017, fm + 0.005, p.y) * sstep(fm - 0.0001, fm + 0.0012, p.y) * sstep(e.c.z + 0.01, e.c.z + 0.03, p.z);
    if (lw > 0.002) { out.lip[v * 3 + 1] = 0.0021 * lw; out.lip[v * 3 + 2] = 0.0006 * lw; }
  }
  for (const v of verts(by.lashes)) { const e = eyeOf(P.getX(v)); if (P.getY(v) > e.c.y - 0.002) lid(v, e, LID_UP); }
  for (const v of verts(by.brows)) out.brow[v * 3 + 1] = 0.0062;
  // the eyeballs: turned about their middles (to her left: about y; up: about x, the other way)
  const qx = new THREE.Quaternion(), qy = new THREE.Quaternion();
  for (const v of eyeV) {
    const e = eyeOf(P.getX(v)); d.fromBufferAttribute(P, v).sub(e.c);
    p.copy(d).applyQuaternion(qx.setFromAxisAngle(V(0, 1, 0), LOOK)).sub(d); out.lookX.set([p.x, p.y, p.z], v * 3);
    p.copy(d).applyQuaternion(qy.setFromAxisAngle(V(1, 0, 0), -LOOK)).sub(d); out.lookY.set([p.x, p.y, p.z], v * 3);
  }
  const attr = {};
  for (const [k, a] of Object.entries(out)) { attr[k] = new THREE.BufferAttribute(a, 3); attr[k].name = k; }
  // each primitive given the morphs that move it (the shoes and the hair none)
  for (const m of meshes) {
    const list = (MORPHS[m.material.name] || []).filter((k) => attr[k]);
    m.geometry.morphAttributes = list.length ? { position: list.map((k) => attr[k]) } : {};
    m.geometry.morphTargetsRelative = true;
  }
  return (g0.userData.face = { eyes: eyes.map((e) => ({ c: e.c.clone(), r: e.r })), lids, brows });
}

// her hoodie on a call and across a table (23 Oct, round 2): the cloth over her chest had come out of the export in
// facets (the shell is welded coarse there), and its shading read as a figure under it. On the torso (not the sleeves,
// not the collar) its normals are made a loose, boxy garment's: no up or down in them (it hangs), its front flat across
// and rounding only at the sides, and soft vertical folds falling from the chest to the hem
function hoodieNormals(mesh) {
  const g = mesh.geometry; if (g.userData.boxy) return; g.userData.boxy = true;
  const P = g.attributes.position, N = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const arm = new Set(mesh.skeleton.bones.map((b, i) => (/^(upperarm|lowerarm|shoulder|wrist|finger)/.test(b.name) ? i : -1)).filter((i) => i >= 0));
  const n = V(), b = V();
  for (let v = 0; v < P.count; v++) {
    let aw = 0; for (let j = 0; j < 4; j++) if (arm.has(si.getComponent(v, j))) aw += sw.getComponent(v, j);
    const x = P.getX(v), y = P.getY(v), z = P.getZ(v), ax = Math.abs(x);
    const w = (1 - sstep(0.15, 0.4, aw)) * sstep(0.88, 0.95, y) * (1 - sstep(1.37, 1.43, y)) * (1 - sstep(0.17, 0.2, ax));
    if (w <= 0) continue;
    n.fromBufferAttribute(N, v);
    // (the box: flat across the front and the back, rounding over the last 8 cm to the sides)
    const fz = clamp((z - 0.015) / 0.05, -1, 1), side = Math.sign(x) * (sstep(0.08, 0.18, ax) * 2.6 + ax * 0.6);
    // (the folds: a few soft ones 5-6 cm apart, wandering a little as they fall, fading out up by the collar)
    const fold = 0.16 * Math.sin(x * 118 + Math.sin(y * 7.3 + x * 20) * 1.4) * (1 - sstep(1.2, 1.38, y));
    b.set(side + fold, -0.04, fz).normalize();
    n.lerp(b, w).normalize(); N.setXYZ(v, n.x, n.y, n.z);
  }
  N.needsUpdate = true;
}

// her voice now, while one of her lines is playing (the voices' log says which line started last and when, their
// analyser how loud it is): { level 0..1, t (s into it), dur, text }; null when none of hers is
let lineIx = null;
export function junoVoice(W = typeof window !== 'undefined' ? window.WAGMI : null) {
  const VO = W?.voice; if (!VO || !VO.log || !VO.log.length || !VO.lines) return null;
  if (!lineIx || lineIx.n !== VO.lines.length) lineIx = { n: VO.lines.length, m: new Map(VO.lines.map((l) => [l.id, l])) };
  const e = VO.log[VO.log.length - 1], l = lineIx.m.get(e.id); if (!l || !/^juno$/i.test(l.speaker)) return null;
  const t = performance.now() / 1000 - (e.at + (e.wait || 0)), dur = (l.dur || 0) - (e.late || 0);
  if (t < -0.05 || t > dur + 0.08) return null;
  return { level: VO.level ? VO.level() : 0, t, dur, text: l.text };
}
// a mouth from a voice level: an envelope that opens fast and closes a little slower, its own gain riding the line's
// loudness (a quiet line opens her mouth as far as a loud one), shut under the floor. -> (raw, dt) => 0 shut .. 1 wide
export function mouthFollower() {
  let env = 0, peak = 0.3;
  return (raw, dt) => {
    const x = raw < 0.035 ? 0 : raw;
    env += (x - env) * (1 - Math.exp(-dt / (x > env ? 0.025 : 0.06)));
    peak = Math.max(env, peak * Math.exp(-dt / 3), 0.22);
    // (the dips between syllables close it most of the way: the voice's level rides high through a line)
    return Math.pow(clamp((env / peak - 0.22) / 0.72, 0, 1), 1.25);
  };
}
// a mouth's level talking when there is no voice to follow (her line has no recording, or the sound is off): syllables
// at about four a second, a pause now and then
const chatter = (t) => Math.max(0, Math.sin(t * 25.1) * 0.5 + 0.5) * (0.35 + 0.65 * Math.max(0, Math.sin(t * 5.3 + 1.1))) * (Math.sin(t * 1.3) > -0.75 ? 1 : 0);

export async function buildJuno(W, { scene = W.app.scene } = {}) {
  const gltf = await junoGLB();
  const root = new THREE.Group(); root.name = 'Juno';
  const inner = skClone(gltf.scene); root.add(inner);
  const body = []; let teeth = null;
  inner.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    if (o.material && o.material.name === 'puff') o.material = curlyPuff();
    // (the short curls under her band: their cards caught a park lamp as white streaks; matte and a shade darker)
    if (o.material && o.material.name === 'hair' && !o.material.userData.toned) { o.material.roughness = 0.88; o.material.color.multiplyScalar(0.8); o.material.userData.toned = true; }
    if (o.isSkinnedMesh && o.name === 'hoodie') hoodieNormals(o);
    if (!o.isSkinnedMesh && o.material?.color?.getHexString() === 'e8e2d8') teeth = o;
    if (o.isSkinnedMesh && o.morphTargetDictionary) body.push(o);
  });
  // her face's morphs (faceMorphs), each primitive's own list of them
  const fm = faceMorphs(body), morphed = [];
  for (const m of body) {
    const list = (m.geometry.morphAttributes.position || []).map((a, i) => a.name || (i ? String(i) : 'jaw'));
    if (list.length) { m.morphTargetDictionary = Object.fromEntries(list.map((k, i) => [k, i])); m.morphTargetInfluences = list.map(() => 0); morphed.push(m); }
    else { m.morphTargetDictionary = undefined; m.morphTargetInfluences = undefined; }
  }
  // (her top teeth: the export set them under the lips' parting as it had it, 5 mm low, a white bar across her open
  // mouth; up under her upper lip and a little further in (out of sight with her mouth shut), and darker: inside her mouth)
  if (teeth && !teeth.userData.set) {
    inner.updateMatrixWorld(true); const w = teeth.getWorldPosition(V()).add(V(0, 0.0012, -0.0035));
    teeth.position.copy(teeth.parent.worldToLocal(w)); teeth.material = teeth.material.clone(); teeth.material.color.multiplyScalar(0.55); teeth.userData.set = true;
  }
  const setM = (k, x) => { for (const m of morphed) { const i = m.morphTargetDictionary[k]; if (i != null) m.morphTargetInfluences[i] = x; } };
  const bones = {}; inner.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  inner.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(inner).max.y;
  const mixer = new THREE.AnimationMixer(inner);
  const clipMap = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
  if (clipMap.idle) clipMap.thugIdle = clipMap.idle;
  root.visible = false; scene?.add(root);

  /* her face: the morphs set straight (the call's bake), her head turned toward a point after the rig has posed it,
     and live(dt, o) each frame of a scene, after her pose: her mouth from her voice, blinks every 2-6 s, her eyes
     glancing between what she looks at (o.look) and what she glances at (o.alt), her head following them a little and
     nodding with her words, her brows up on a question */
  const skinM = body.find((m) => m.material.name === 'skin'), headIx = skinM ? skinM.skeleton.bones.indexOf(bones.head) : -1;
  const Mh = new THREE.Matrix4(), Mi = new THREE.Matrix4(), tb = V(), mid = fm ? fm.eyes[0].c.clone().add(fm.eyes[1].c).multiplyScalar(0.5) : V(0, 1.64, 0.12);
  // her head's rest frame (the body's bind space) to the world, as the head bone has it now
  const headM = () => { bones.head.updateWorldMatrix(true, false); return Mh.multiplyMatrices(bones.head.matrixWorld, skinM.skeleton.boneInverses[headIx]).multiply(skinM.bindMatrix); };
  // a point's direction from between her eyes, in that frame: [yaw toward her left, pitch up]
  const toward = (at) => { tb.copy(at).applyMatrix4(Mi.copy(headM()).invert()).sub(mid); return [Math.atan2(tb.x, tb.z), Math.atan2(tb.y, Math.hypot(tb.x, tb.z))]; };
  // (her head's pose as the rig left it, put back first if the rig didn't set it again this frame; and as we left it)
  let hq0 = null, hq1 = null;
  const headBase = () => { const h = bones.head.quaternion; if (hq1 && h.equals(hq1)) h.copy(hq0); hq0 = h.clone(); };
  const _a = V(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  const turnHead = (yaw, pitch, roll = 0) => {
    headM(); const ax = (x, y, z) => _a.set(x, y, z).transformDirection(Mh);
    _qa.setFromAxisAngle(ax(0, 1, 0), yaw); _qb.setFromAxisAngle(ax(1, 0, 0), -pitch); _qa.multiply(_qb); _qb.setFromAxisAngle(ax(0, 0, 1), roll); _qa.multiply(_qb);
    turnWorld(bones.head, _qa.clone()); hq1 = bones.head.quaternion.clone();
  };
  const fs = { blink: 0, brow: 0, lookX: 0, lookY: 0 };
  const L = { t: 0, mouth: mouthFollower(), slow: 0, blinkAt: 1 + Math.random() * 3, blinkT: -1, gaze: 0, gazeAt: 0, mx: 0, my: 0, microAt: 0, ex: 0, ey: 0, hy: 0, hp: 0, brow: 0, browT: -9 };
  const face = {
    // { blink 0..1, brow 0..1, lookX -1..1 (her left), lookY -1..1 (up) }
    set(o) {
      Object.assign(fs, o); const b = clamp(fs.blink, 0, 1);
      setM('blink', Math.min(1, b * 2)); setM('blink2', Math.max(0, b * 2 - 1)); setM('brow', clamp(fs.brow, 0, 1)); setM('lookX', clamp(fs.lookX, -1, 1)); setM('lookY', clamp(fs.lookY, -1, 1));
    },
    // her head turned toward a world point by k of the way (plus yaw / pitch / roll of its own), her eyes on `eyes` (the
    // same point by default) for the rest
    aim(at, { k = 0.8, yaw = 0, pitch = 0, roll = 0, eyes = at } = {}) {
      if (!skinM) return; headBase(); const [y, p] = toward(at); turnHead(y * k + yaw, p * k + pitch, roll);
      const [ey, ep] = toward(eyes); face.set({ lookX: ey / LOOK, lookY: ep / LOOK });
    },
    // o: { talking (her line is up), text (its words), look (a world point: who she talks to), alt (where she glances:
    // her laptop) }
    live(dt, o = {}) {
      if (!skinM) return; L.t += dt; const t = L.t;
      // the mouth: her voice when one of her lines is playing; with no voice to follow (none recorded, or no sound)
      // syllables while her line is up; else shut
      const v = junoVoice(W), au = W.audio?.ctx?.state === 'running', rec = o.text ? !!W.voice?.has?.('Juno', o.text) : !!W.voice;
      const raw = v ? v.level : o.talking && (!au || !rec) ? chatter(t) : 0;
      const mouth = L.mouth(raw, dt); L.slow += (mouth - L.slow) * (1 - Math.exp(-dt / 0.18));
      P.jaw(mouth * 0.5);
      // blinks: every 2-6 s, now and then two together; 60 ms down, held 30 ms, 90 ms up
      let b = 0;
      if (L.blinkT < 0 && t >= L.blinkAt) L.blinkT = 0;
      if (L.blinkT >= 0) { L.blinkT += dt; const u = L.blinkT; b = u < 0.06 ? u / 0.06 : u < 0.09 ? 1 : Math.max(0, 1 - (u - 0.09) / 0.09);
        if (u >= 0.18) { L.blinkT = -1; L.blinkAt = t + (Math.random() < 0.12 ? 0.08 : 2 + Math.random() * 4); } }
      // where she looks: who she talks to, glancing off at o.alt (more while she listens), a small flick now and then
      const talking = o.talking || mouth > 0;
      if (t >= L.gazeAt) { L.gaze = o.alt && Math.random() < (talking ? 0.28 : 0.6) ? 1 : 0; L.gazeAt = t + (L.gaze ? 0.5 + Math.random() * 1.3 : 0.9 + Math.random() * 2.3); }
      if (t >= L.microAt) { L.mx = (Math.random() - 0.5) * 0.07; L.my = (Math.random() - 0.5) * 0.04; L.microAt = t + 0.3 + Math.random() * 0.7; }
      headBase();
      const at = L.gaze && o.alt ? o.alt : o.look; let gy = L.mx, gp = L.my;
      if (at) { const [y, p] = toward(at); gy += y; gp += p; }
      // (her head takes a part of the turn, slowly; it nods a little with her words and sways while she listens)
      const k1 = 1 - Math.exp(-dt / 0.35);
      L.hy += (clamp(gy, -0.7, 0.7) * 0.35 - L.hy) * k1; L.hp += (clamp(gp, -0.5, 0.45) * 0.3 - L.hp) * k1;
      turnHead(L.hy + 0.018 * Math.sin(t * 0.55), L.hp - 0.05 * L.slow + 0.012 * Math.sin(t * 0.8 + 1), 0.015 * Math.sin(t * 0.43 + 2));
      // (her eyes the rest, fast: a saccade is over in a few tens of ms)
      const k2 = 1 - Math.exp(-dt / 0.03);
      L.ex += (clamp(gy - L.hy, -0.45, 0.45) - L.ex) * k2; L.ey += (clamp(gp - L.hp, -0.4, 0.35) - L.ey) * k2;
      // her brows: up through the end of a question, and with a word she leans on now and then
      if (mouth > 0.85 && Math.random() < dt * 0.5) L.browT = t;
      const q = talking && /\?/.test(o.text || v?.text || '') && (!v || v.t > v.dur * 0.5);
      L.brow += ((q ? 0.75 : 0) + (t - L.browT < 0.5 ? 0.45 : 0) - L.brow) * (1 - Math.exp(-dt / 0.12));
      // (looking down, her lids come down with her eyes)
      face.set({ blink: Math.max(b, clamp(-L.ey / LOOK, 0, 1) * 0.3), brow: L.brow, lookX: L.ex / LOOK, lookY: L.ey / LOOK });
      return { mouth, blink: b, gaze: L.gaze, brow: L.brow };
    },
    // a blink now (on a cut, a beat)
    blink() { L.blinkT = 0; },
    get state() { return { ...fs }; },
    // between her eyes, in the world, as her head is now
    eyes() { return skinM ? mid.clone().applyMatrix4(headM()) : bones.head.getWorldPosition(V()); },
    rig: fm,
  };
  const P = {
    root, inner, bones, mixer, rig: rig(mixer, clipMap), clips: Object.keys(clipMap), top, face,
    // her mouth, 0 (shut) .. 1 (wide); about 0.35 is talking
    jaw(k) { setM('jaw', clamp(k, 0, 1)); setM('lip', clamp(k * 1.2, 0, 1)); },
    // talking: the mouth's opening at time t (s) while she speaks, from a voice level when there is one (face.live does
    // more: her voice itself, her eyes)
    talk(t, on, level = null) { P.jaw(!on ? 0 : level != null ? 0.08 + level * 0.5 : 0.12 + 0.28 * Math.max(0, Math.sin(t * 17) * Math.sin(t * 5.3 + 1.1))); },
    arm: (side, target, pole, w) => armTo(bones, side, target, pole, w),
  };
  root.userData.juno = P;
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
// el: the card's element (its size is the card's); crop 'phone' (the whole 9:16 frame: her head and collar) or 'face'
// (the caller's tile: the same, a touch closer). The frames come from the sheet (SHEET), on the portrait's own clock,
// every frame: her mouth with her voice (junoVoice: shut, half or open by how loud she is), a blink every 2-6 s and a
// glance off the camera now and then while her mouth is shut, her head's pose changing every few seconds while she
// talks (a quick cross-fade) and her brows up through the end of a question; and the picture itself moving a little, a phone held
// in a hand, her head nodding with her words. talk(on): her line is up (the callers' word for it: with no recording of
// the line playing she chatters to it); speaking(): the same, asked every frame, in place of talk()
// (the sheet loaded once, ahead of the first call: until it is in, the feed stays clear and what the card had under it
// shows, her initial; it is never an empty square)
let sheetImg = null;
const sheetReady = () => { if (!sheetImg) { sheetImg = new Image(); sheetImg.src = SHEET.url; } return sheetImg.complete && sheetImg.naturalWidth > 0; };
if (typeof window !== 'undefined') sheetReady();
// (her eyes sit this far down a frame: the tile's crop is centred on them)
const EYES = 0.45;
// the subtitle on screen: { who, text }
const subLine = () => { const s = document.querySelector('#wg .wg-sub'); if (!s || s.classList.contains('hide')) return null; const b = s.querySelector('b'), who = b ? b.textContent.trim() : ''; return { who, text: s.textContent.trim().slice(who.length).trim() }; };
export function junoPortrait(el, { crop = 'phone', speaking = null } = {}) {
  const S = SHEET, zoom = crop === 'face' ? 1.06 : 1;
  const box = document.createElement('div'); box.className = 'juno-feed';
  Object.assign(box.style, { position: 'absolute', inset: '0', overflow: 'hidden', backgroundColor: '#0A1222', opacity: sheetReady() ? '1' : '0', transition: 'opacity .2s' });
  const wrap = document.createElement('div'); Object.assign(wrap.style, { position: 'absolute', inset: '0', willChange: 'transform' }); box.appendChild(wrap);
  const layer = () => { const d = document.createElement('div'); Object.assign(d.style, { position: 'absolute', inset: '0', backgroundImage: `url(${S.url})`, backgroundRepeat: 'no-repeat' }); wrap.appendChild(d); return d; };
  // (A the frame now; B the one before it over it, fading out when her pose changes)
  const A = layer(), B = layer(); B.style.opacity = '0';
  if (!sheetReady()) sheetImg.addEventListener('load', () => { box.style.opacity = '1'; api.resize(); }, { once: true });
  el.appendChild(box);
  let dims = null, cur = -1;
  const measure = () => {
    const r = el.getBoundingClientRect(), W = r.width || 120, H = r.height || 213;
    // (each frame scaled to cover the card; cropped, her eyes a little above its middle)
    const k = Math.max(W / S.w, H / S.h) * zoom, fw = S.w * k, fh = S.h * k;
    dims = { fw, fh, ox: (W - fw) / 2, oy: crop === 'face' ? H * 0.45 - fh * EYES : (H - fh) / 2 };
  };
  const place = (d, f) => {
    if (!dims) measure();
    d.style.backgroundSize = `${dims.fw * S.cols}px ${dims.fh * S.rows}px`;
    d.style.backgroundPosition = `${dims.ox - (f % S.cols) * dims.fw}px ${dims.oy - Math.floor(f / S.cols) * dims.fh}px`;
  };
  const show = (f, fade) => {
    if (f === cur) return;
    if (fade && cur >= 0) { place(B, cur); B.style.transition = 'none'; B.style.opacity = '1'; void B.offsetWidth; B.style.transition = 'opacity .16s linear'; B.style.opacity = '0'; }
    place(A, f); cur = f; box.dataset.f = f;
  };
  show(0);
  const st = { t: 0, gate: 0, mouth: mouthFollower(), m: 0, slow: 0, col: 0, colT: 0, pose: 0, poseAt: 1.5, blinkAt: 1 + Math.random() * 3, blinkT: -9, glanceAt: 2.5 + Math.random() * 3, glanceT: -9, glanceFor: 0 };
  let last = performance.now(), raf = 0, stopped = false;
  const pick = (w) => { let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return i; return 0; };
  const tick = () => {
    if (stopped) return;
    if (!box.isConnected && cur >= 0 && st.t > 0.5) { api.stop(); return; }
    raf = requestAnimationFrame(tick);
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; st.t += dt; const t = st.t;
    const Wg = window.WAGMI, line = subLine(), mine = !!line && /^juno/i.test(line.who);
    const on = speaking ? !!speaking() : now < st.gate;
    // her mouth: her voice while one of her lines plays; with none to follow (no recording, no sound) and her line up,
    // syllables; else shut
    const v = junoVoice(Wg), au = Wg?.audio?.ctx?.state === 'running', rec = mine ? !!Wg?.voice?.has?.('Juno', line.text) : !!Wg?.voice;
    const raw = v ? v.level : on && (!au || !rec) ? chatter(t) : 0;
    const m = st.mouth(raw, dt); st.m = m; st.slow += (m - st.slow) * (1 - Math.exp(-dt / 0.15));
    // (shut, half, open: a step up at 0.2 / 0.55, down at 0.12 / 0.45, each held at least 60 ms)
    const want = m > (st.col >= 2 ? 0.45 : 0.55) ? 2 : m > (st.col >= 1 ? 0.12 : 0.2) ? 1 : 0;
    if (want !== st.col && t - st.colT > 0.06) { st.col = want; st.colT = t; }
    const talking = !!v || on || m > 0.02;
    // her head's pose: up with her brows through the end of a question; else a new one every 1.6-3.4 s while she talks, and
    // between straight and turned to her screens every few seconds while she listens
    // (a question's brows come in the second half of its line: the question is mostly at its end)
    const q = talking && /\?/.test(v?.text || (mine ? line.text : '') || '') && (!v || v.t > v.dur * 0.5);
    let pose = st.pose;
    if (q) pose = 3;
    else if (t >= st.poseAt || st.pose === 3) {
      pose = talking ? pick(st.pose === 0 ? [0.2, 0.5, 0.3, 0] : st.pose === 1 ? [0.5, 0.15, 0.35, 0] : [0.5, 0.4, 0.1, 0]) : pick([0.7, 0, 0.3, 0]);
      st.poseAt = t + (talking ? 1.6 + Math.random() * 1.8 : 3 + Math.random() * 3);
    }
    // a blink (her mouth shut) every 2-6 s, now and then two; a glance off the camera while she listens
    if (st.col === 0 && t >= st.blinkAt && t - st.blinkT > 0.3) { st.blinkT = t; st.blinkAt = t + (Math.random() < 0.12 ? 0.32 : 2 + Math.random() * 4); }
    if (!talking && t >= st.glanceAt) { st.glanceT = t; st.glanceFor = 0.5 + Math.random() * 0.9; st.glanceAt = t + st.glanceFor + 2.5 + Math.random() * 4; }
    const face = t - st.blinkT < 0.13 ? FACE.blink : st.col === 0 && t - st.glanceT < st.glanceFor ? FACE.glance : st.col;
    show(pose * S.cols + face, pose !== st.pose); st.pose = pose;
    // (the phone in her hand: a slow drift, and a little nod down with her words)
    const x = 0.5 * Math.sin(t * 0.7) + 0.3 * Math.sin(t * 1.9 + 1), y = 0.4 * Math.sin(t * 0.9 + 2) + 0.25 * Math.sin(t * 2.3) + 1.1 * st.slow, r = 0.3 * Math.sin(t * 0.6 + 0.5);
    wrap.style.transform = `translate(${x.toFixed(2)}%, ${y.toFixed(2)}%) rotate(${r.toFixed(2)}deg) scale(1.05)`;
  };
  raf = requestAnimationFrame(tick);
  const api = {
    // on: her line is up (a number for the old callers: a level over 0.08 is on)
    talk(on = 0) { st.gate = (typeof on === 'number' ? on > 0.08 : !!on) ? performance.now() + 400 : 0; },
    resize() { dims = null; const f = cur; cur = -1; show(Math.max(0, f)); },
    stop() { stopped = true; cancelAnimationFrame(raf); box.remove(); },
    get state() { return { f: cur, pose: st.pose, mouth: +st.m.toFixed(3), col: st.col }; },
    el: box,
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
