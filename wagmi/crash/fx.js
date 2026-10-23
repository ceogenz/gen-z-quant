// WAGMI City: a crash's bits: sparks (bright streaks that fall and die), debris (glass, plastic and paint chips that
// tumble, bounce, lie in the road a while and go) and water (a burst hydrant's column, streaks falling back). Three
// instanced meshes, always drawn (one tiny instance under the street when idle, so their pipelines are built at the
// start and the first crash doesn't stall).
import * as THREE from 'three/webgpu';

const G = 9.8;
const rnd = (a, b) => a + Math.random() * (b - a);

export function createFx(scene, ground) {
  const dummy = new THREE.Object3D();
  const _c = new THREE.Color();
  function pool(geo, mat, n, color) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
    if (color) { for (let i = 0; i < n; i++) m.setColorAt(i, _c.setRGB(1, 1, 1)); }
    m.count = 1; dummy.position.set(0, -200, 0); dummy.scale.setScalar(0.001); dummy.updateMatrix(); m.setMatrixAt(0, dummy.matrix);
    scene.add(m);
    return { m, list: [], n };
  }
  const sparkMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(1, 0.62, 0.22).multiplyScalar(5) });
  const sparks = pool(new THREE.BoxGeometry(0.045, 0.045, 1), sparkMat, 260);
  const debrisMat = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.2 });
  const debris = pool(new THREE.BoxGeometry(1, 1, 1), debrisMat, 260, true);
  const waterMat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0.66, 0.8, 0.95), transparent: true, opacity: 0.42, depthWrite: false });
  const water = pool(new THREE.BoxGeometry(1, 1, 1), waterMat, 600);
  water.m.renderOrder = 4;

  // sparks at (x, y, z): n of them, sprayed mostly along (dx, dz) (the way the metal scrapes) and back off the hit
  function spark(x, y, z, dx, dz, n, speed = 8) {
    for (let k = 0; k < n; k++) {
      if (sparks.list.length >= sparks.n) sparks.list.shift();
      const s = rnd(0.4, 1.2) * speed, a = rnd(-0.9, 0.9);
      const c = Math.cos(a), sn = Math.sin(a);
      sparks.list.push({ x, y, z, vx: (dx * c - dz * sn) * s + rnd(-1.5, 1.5), vy: rnd(0.5, 4.5), vz: (dx * sn + dz * c) * s + rnd(-1.5, 1.5), life: 0, max: rnd(0.25, 0.6) });
    }
  }
  // debris: n bits at (x, y, z) flung along (vx, vz) and up; kind 'glass' | 'plastic' | 'paint' (rgb: its colour)
  const GLASS = [0.72, 0.82, 0.86], BLACK = [0.04, 0.04, 0.045], RED = [0.7, 0.04, 0.03];
  function bits(x, y, z, vx, vz, n, kind = 'plastic', rgb = null) {
    for (let k = 0; k < n; k++) {
      if (debris.list.length >= debris.n) debris.list.shift();
      const glass = kind === 'glass', col = glass ? GLASS : kind === 'paint' && rgb ? rgb : Math.random() < 0.18 ? RED : BLACK;
      const sz = glass ? [rnd(0.03, 0.09), 0.008, rnd(0.03, 0.08)] : [rnd(0.05, 0.16), rnd(0.02, 0.05), rnd(0.04, 0.12)];
      debris.list.push({ x: x + rnd(-0.3, 0.3), y, z: z + rnd(-0.3, 0.3), vx: vx * rnd(0.3, 0.9) + rnd(-2.5, 2.5), vy: rnd(1, 5), vz: vz * rnd(0.3, 0.9) + rnd(-2.5, 2.5),
        rx: rnd(0, 6), ry: rnd(0, 6), rz: rnd(0, 6), wx: rnd(-14, 14), wy: rnd(-14, 14), wz: rnd(-14, 14), s: sz, col, life: 0, max: rnd(7, 11), gy: ground(x, z), rest: false, dirty: true });
    }
  }
  // a burst hydrant: a column of water for `dur` s at (x, y, z)
  const jets = [];
  function hydrant(x, y, z, dur = 14) { jets.push({ x, y, z, t: 0, dur, acc: 0 }); }

  function update(dt) {
    // the water: the column (strong at first, easing off), streaks falling back and splashing out
    for (let j = jets.length - 1; j >= 0; j--) {
      const J = jets[j]; J.t += dt;
      if (J.t > J.dur) { jets.splice(j, 1); continue; }
      const k = J.t < 1 ? 1 : Math.max(0.35, 1 - (J.t - 1) / J.dur);
      J.acc += dt * 320 * k;
      while (J.acc >= 1) {
        J.acc -= 1;
        if (water.list.length >= water.n) water.list.shift();
        const up = rnd(7.5, 10.5) * (0.6 + 0.4 * k), a = rnd(0, Math.PI * 2), out = rnd(0.2, 1.4);
        water.list.push({ x: J.x + rnd(-0.08, 0.08), y: J.y + 0.3, z: J.z + rnd(-0.08, 0.08), vx: Math.cos(a) * out, vy: up, vz: Math.sin(a) * out, life: 0, max: 2.6, gy: J.y, w: rnd(0.04, 0.09) });
      }
    }
    let n = 0;
    for (let i = sparks.list.length - 1; i >= 0; i--) {
      const p = sparks.list[i]; p.life += dt;
      if (p.life > p.max) { sparks.list.splice(i, 1); continue; }
      p.vy -= G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.03) { p.y = 0.03; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    }
    for (const p of sparks.list) {
      const sp = Math.hypot(p.vx, p.vy, p.vz) + 1e-3, f = 1 - p.life / p.max;
      dummy.position.set(p.x, p.y, p.z); dummy.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      dummy.scale.set(f, f, Math.min(0.9, sp * 0.045) * f); dummy.updateMatrix(); sparks.m.setMatrixAt(n++, dummy.matrix);
    }
    finish(sparks, n);
    n = 0;
    for (let i = debris.list.length - 1; i >= 0; i--) {
      const p = debris.list[i]; p.life += dt;
      if (p.life > p.max) { debris.list.splice(i, 1); continue; }
      if (p.rest) continue;
      p.vy -= G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rx += p.wx * dt; p.ry += p.wy * dt; p.rz += p.wz * dt;
      const floor = p.gy + p.s[1] * 0.5;
      if (p.y < floor) {
        p.y = floor; p.vy = -p.vy * 0.3; p.vx *= 0.55; p.vz *= 0.55; p.wx *= 0.5; p.wy *= 0.5; p.wz *= 0.5;
        if (Math.abs(p.vy) < 0.6 && Math.hypot(p.vx, p.vz) < 0.4) { p.rest = true; p.rx = Math.round(p.rx / Math.PI) * Math.PI; p.rz = Math.round(p.rz / Math.PI) * Math.PI; }
      }
    }
    for (let i = 0; i < debris.list.length; i++) {
      const p = debris.list[i], f = Math.min(1, (p.max - p.life) / 1.2);
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.set(p.s[0] * f, p.s[1] * f, p.s[2] * f); dummy.updateMatrix(); debris.m.setMatrixAt(n, dummy.matrix);
      debris.m.setColorAt(n, _c.setRGB(p.col[0], p.col[1], p.col[2])); n++;
    }
    dummy.rotation.set(0, 0, 0);
    finish(debris, n);
    if (debris.list.length && debris.m.instanceColor) debris.m.instanceColor.needsUpdate = true;
    n = 0;
    for (let i = water.list.length - 1; i >= 0; i--) {
      const p = water.list[i]; p.life += dt;
      p.vy -= G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      // (back down: a splash out across the ground, then gone)
      if (p.y < p.gy + 0.05 && p.vy < 0) { if (p.splashed || p.life > p.max) { water.list.splice(i, 1); continue; } p.splashed = true; p.y = p.gy + 0.05; p.vy = rnd(0.6, 1.6); const a = rnd(0, 6.3), o = rnd(1, 3); p.vx = Math.cos(a) * o; p.vz = Math.sin(a) * o; }
    }
    for (const p of water.list) {
      const sp = Math.hypot(p.vx, p.vy, p.vz) + 1e-3;
      dummy.position.set(p.x, p.y, p.z); dummy.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      dummy.scale.set(p.w, p.w, Math.min(0.7, 0.12 + sp * 0.05)); dummy.updateMatrix(); water.m.setMatrixAt(n++, dummy.matrix);
    }
    finish(water, n);
  }
  function finish(P, n) {
    if (n === 0) { dummy.position.set(0, -200, 0); dummy.scale.setScalar(0.001); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); P.m.setMatrixAt(0, dummy.matrix); n = 1; }
    P.m.count = n;
    const a = P.m.instanceMatrix; a.clearUpdateRanges(); a.addUpdateRange(0, n * 16); a.needsUpdate = true;
  }
  const busy = () => sparks.list.length + debris.list.length + water.list.length + jets.length;
  return { spark, bits, hydrant, update, busy, meshes: [sparks.m, debris.m, water.m] };
}
