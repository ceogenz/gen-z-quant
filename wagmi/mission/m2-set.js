// WAGMI City: Mission 2's sets. The Degens' container yard on the 12th Ave apron by the cruise piers (W 54th-55th St):
// a chain-link fence with a gate onto 12th Ave (south), a side gate (east) and a torn gap on the park side (west), stacks
// of shipping containers (solid: they join the city's colliders while the yard stands, so Quant, the car, the Degens and
// the fight's camera all keep out of them), floodlights with pools of light, and the stash: a folding table of burner
// phones and laptops by the van's side door, crates of MOON2 merch. Lev's car (a black sedan, acid-green rims and
// underglow, plate LEV 100X) and Lev himself (thug.glb in the gang's colours: a gold chain, an acid-green cap).
//   const Y = buildYard(W); Y.show(true) (colliders in) / Y.show(false) (out); Y.posts, Y.stash, Y.vanAt, Y.levAt ...
//   const L = buildLevCar(W);  const lev = await buildLev(W);
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { rig } from './cine.js';

const PI = Math.PI;
export const YARD = { x0: -1946, x1: -1898, z0: -1080, z1: -1022, cx: -1924, cz: -1050 };

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildYard(W) {
  const app = W.app, cm = app.controllerManager, scene = app.scene;
  const g = new THREE.Group(); g.name = 'wagmi-m2-yard'; g.visible = false; scene.add(g);
  const ground = (x, z) => cm.getGroundHeight(x, z, 'person');

  /* ------------------------------------------------------- containers -- */
  // the ribs of the steel (grey, tinted per container by its colour), a frame round the edge, rust down from the top
  const ribs = canvasTex(256, 64, (x, w, h) => {
    x.fillStyle = '#B8B8B8'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const px = i * w / 40; const gr = x.createLinearGradient(px, 0, px + w / 40, 0); gr.addColorStop(0, '#8E8E8E'); gr.addColorStop(0.35, '#D2D2D2'); gr.addColorStop(0.7, '#A6A6A6'); gr.addColorStop(1, '#7A7A7A'); x.fillStyle = gr; x.fillRect(px, 3, w / 40, h - 6); }
    x.fillStyle = '#6A6A6A'; x.fillRect(0, 0, w, 3); x.fillRect(0, h - 3, w, 3);
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(90,52,30,${0.08 + Math.random() * 0.16})`; x.fillRect(Math.random() * w, 3, 1 + Math.random() * 3, 6 + Math.random() * 30); }
  });
  const COLS = ['#8E3B2E', '#2F6F73', '#26384F', '#B5652A', '#6C7176', '#16181B'];
  const cmats = COLS.map((c) => new THREE.MeshStandardMaterial({ color: c, map: ribs, roughness: 0.72, metalness: 0.35 }));
  // [centre x, centre z, along x (40 ft / 20 ft) or along z, length, levels, colour, label]
  const BOXES = [
    [-1942.6, -1072, 'z', 12.2, 2, 0, 'NGMI LOGISTICS'], [-1940.0, -1072, 'z', 12.2, 1, 2, null], [-1942.6, -1046, 'z', 12.2, 1, 1, 'WAGMI MARINE'], [-1942.6, -1030.5, 'z', 6.1, 1, 3, null],
    [-1928, -1077.3, 'x', 12.2, 3, 2, 'HODL LINES'], [-1914, -1077.3, 'x', 12.2, 1, 4, null], [-1902, -1070, 'z', 12.2, 2, 3, 'WAGMI MARINE'],
    [-1930, -1052, 'x', 6.1, 1, 5, 'DGNS'], [-1928, -1064, 'x', 6.1, 1, 1, null], [-1925, -1033, 'z', 6.1, 1, 0, null],
    [-1936, -1014, 'x', 12.2, 1, 1, 'WAGMI MARINE'], [-1957, -1040, 'z', 12.2, 1, 3, null], [-1952, -1062, 'z', 12.2, 2, 0, 'NGMI LOGISTICS'],
  ];
  const H = 2.59, Wd = 2.44, boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const colliders = [];
  const labelMat = (text, acid) => new THREE.MeshStandardMaterial({ map: canvasTex(512, 96, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    if (acid) { x.fillStyle = '#B6FF3B'; x.font = 'italic 900 76px "Barlow Condensed", sans-serif'; x.textAlign = 'center'; x.shadowColor = '#B6FF3B'; x.shadowBlur = 8; x.fillText(text, w / 2, 76); }
    else { x.fillStyle = 'rgba(240,240,232,.86)'; x.font = '800 60px "Barlow Condensed", sans-serif'; x.textAlign = 'center'; x.fillText(text, w / 2, 70); }
  }), transparent: true, alphaTest: 0.2, roughness: 0.8, depthWrite: false, ...(acid ? { emissive: '#4A7A10', emissiveIntensity: 0.6 } : {}) });
  const labels = {};
  for (const [cx, cz, ax, len, lv, ci, label] of BOXES) {
    const sx = ax === 'x' ? len : Wd, sz = ax === 'x' ? Wd : len, y0 = ground(cx, cz);
    for (let k = 0; k < lv; k++) {
      const m = new THREE.Mesh(boxGeo, cmats[(ci + k * 2) % cmats.length]);
      m.scale.set(sx, H, sz); m.position.set(cx, y0 + H * (k + 0.5), cz); m.castShadow = true; m.receiveShadow = true; g.add(m);
    }
    if (label) {
      const mat = labels[label] || (labels[label] = labelMat(label, label === 'DGNS'));
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(len * 0.7, 8), Math.min(len * 0.7, 8) * 96 / 512), mat);
        if (ax === 'x') { p.position.set(cx, y0 + H * 0.62, cz + s * (Wd / 2 + 0.02)); p.rotation.y = s > 0 ? 0 : PI; }
        else { p.position.set(cx + s * (Wd / 2 + 0.02), y0 + H * 0.62, cz); p.rotation.y = s > 0 ? PI / 2 : -PI / 2; }
        g.add(p);
      }
    }
    colliders.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2, maxY: y0 + H * lv, wagmi: 'm2' });
  }

  /* ------------------------------------------------------------ fence -- */
  const link = canvasTex(64, 64, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.strokeStyle = '#C9CED4'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w / 2, 0); x.lineTo(w, h / 2); x.lineTo(w / 2, h); x.closePath(); x.stroke();
    x.beginPath(); x.moveTo(0, 0); x.lineTo(2, 2); x.moveTo(w, 0); x.lineTo(w - 2, 2); x.moveTo(0, h); x.lineTo(2, h - 2); x.moveTo(w, h); x.lineTo(w - 2, h - 2); x.stroke();
  }, true);
  const fenceMat = new THREE.MeshStandardMaterial({ map: link, alphaTest: 0.45, side: THREE.DoubleSide, color: '#A7ADB4', metalness: 0.6, roughness: 0.45 });
  const steel = new THREE.MeshStandardMaterial({ color: '#4A5058', metalness: 0.7, roughness: 0.45 });
  const FH = 2.4, { x0, x1, z0, z1 } = YARD;
  // runs [ax, az, bx, bz] round the yard with the gates left open: south gate x -1922..-1910, the side gate onto W 55th
  // St z -1044..-1034, the torn gap on the park side z -1060..-1055
  const RUNS = [[x0, z1, -1922, z1], [-1910, z1, x1, z1], [x1, z1, x1, -1034], [x1, -1044, x1, z0], [x1, z0, x0, z0], [x0, z0, x0, -1060], [x0, -1055, x0, z1]];
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, FH + 0.15, 8);
  for (const [ax, az, bx, bz] of RUNS) {
    const len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = ground(mx, mz);
    const geo = new THREE.PlaneGeometry(len, FH); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.7, uv.getY(i) * FH / 0.7);
    const p = new THREE.Mesh(geo, fenceMat); p.position.set(mx, y + FH / 2 + 0.05, mz); p.rotation.y = Math.atan2(bz - az, bx - ax) * -1; p.castShadow = true; g.add(p);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), steel); rail.rotation.z = PI / 2; rail.rotation.y = p.rotation.y; rail.position.set(mx, y + FH + 0.08, mz); g.add(rail);
    for (let s = 0; s <= len + 0.01; s += 3) { const k = Math.min(1, s / len); const q = new THREE.Mesh(postGeo, steel); const px = ax + (bx - ax) * k, pz = az + (bz - az) * k; q.position.set(px, ground(px, pz) + (FH + 0.15) / 2, pz); q.castShadow = true; g.add(q); }
    colliders.push({ minX: Math.min(ax, bx) - 0.1, maxX: Math.max(ax, bx) + 0.1, minZ: Math.min(az, bz) - 0.1, maxZ: Math.max(az, bz) + 0.1, maxY: y + FH, wagmi: 'm2' });
  }
  // a sign on the gate: the gang's idea of a front
  {
    const t = canvasTex(512, 160, (x, w, h) => {
      x.fillStyle = '#0E0F11'; x.fillRect(0, 0, w, h); x.strokeStyle = '#B6FF3B'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
      x.fillStyle = '#fff'; x.font = '800 54px "Barlow Condensed", sans-serif'; x.textAlign = 'center'; x.fillText('HODL MOVING CO.', w / 2, 70);
      x.fillStyle = '#B6FF3B'; x.font = '700 32px "Barlow Condensed", sans-serif'; x.fillText('DEPOT · NO LOITERING · WE NEVER LET GO', w / 2, 122);
    });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: '#FFFFFF', emissiveMap: t, emissiveIntensity: 0.25 }));
    s.position.set(-1928, ground(-1928, z1) + 1.55, z1 + 0.06); g.add(s);
  }

  /* ------------------------------------------------------- floodlights -- */
  const pool = canvasTex(128, 128, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const poolMat = new THREE.MeshBasicMaterial({ map: pool, color: '#FFD9A6', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
  const lampMat = new THREE.MeshStandardMaterial({ color: '#FFF4DE', emissive: '#FFE7C0', emissiveIntensity: 3.2 });
  const poleMat = new THREE.MeshStandardMaterial({ color: '#3A3E44', metalness: 0.6, roughness: 0.5 });
  for (const [px, pz, tx, tz] of [[-1944.5, -1024, -1930, -1036], [-1944.5, -1079, -1930, -1064], [-1899.5, -1079, -1912, -1066], [-1899.5, -1024, -1912, -1036]]) {
    const y = ground(px, pz), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 8, 8), poleMat); pole.position.set(px, y + 4, pz); pole.castShadow = true; g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), lampMat); head.position.set(px, y + 8, pz); head.lookAt(tx, 0, tz); head.rotateX(-0.5); g.add(head);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), poolMat); p.rotation.x = -PI / 2; p.position.set(tx, 0.26, tz); p.renderOrder = 4; g.add(p);
  }

  /* ---------------------------------------------------------- the stash -- */
  const STASH = { x: -1914, z: -1046.2 };
  {
    const sx = STASH.x, sz = STASH.z, y = ground(sx, sz);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.8), new THREE.MeshStandardMaterial({ color: '#D9D6CF', roughness: 0.8 })); top.position.set(sx, y + 0.76, sz); top.castShadow = true; g.add(top);
    for (const [lx, lz] of [[-0.85, -0.33], [0.85, -0.33], [-0.85, 0.33], [0.85, 0.33]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.74, 6), steel); l.position.set(sx + lx, y + 0.37, sz + lz); g.add(l); }
    const chart = canvasTex(256, 160, (x, w, h) => {
      x.fillStyle = '#05140A'; x.fillRect(0, 0, w, h); x.strokeStyle = '#B6FF3B'; x.lineWidth = 4; x.beginPath();
      [[0, 140], [40, 120], [70, 128], [110, 90], [140, 98], [180, 50], [210, 60], [256, 14]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
      x.fillStyle = '#B6FF3B'; x.font = '800 30px "Barlow Condensed", sans-serif'; x.fillText('$MOON2 ▲ 4,200%', 10, 34);
    });
    const scr = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#FFFFFF', emissiveMap: chart, emissiveIntensity: 1.6, map: chart });
    const shell = new THREE.MeshStandardMaterial({ color: '#2B2E33', metalness: 0.6, roughness: 0.35 });
    for (const [lx, a] of [[-0.45, 0.15], [0.4, -0.2]]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.24), shell); base.position.set(sx + lx, y + 0.795, sz + 0.05); base.rotation.y = a; g.add(base);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.012), [shell, shell, shell, shell, scr, shell]); lid.position.set(sx + lx - Math.sin(a) * 0.12, y + 0.9, sz + 0.05 - Math.cos(a) * 0.12); lid.rotation.set(-0.25, a, 0, 'YXZ'); g.add(lid);
    }
    for (let i = 0; i < 9; i++) { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.14), shell); ph.position.set(sx - 0.1 + (i % 3) * 0.12, y + 0.79, sz - 0.25 + Math.floor(i / 3) * 0.17); ph.rotation.y = (i * 0.7) % 0.6 - 0.3; g.add(ph); }
    const merch = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#B08A5A'; x.fillRect(0, 0, w, h); x.strokeStyle = '#7A5C36'; x.lineWidth = 6; x.strokeRect(4, 4, w - 8, h - 8); x.fillStyle = '#1A1A1A'; x.font = '800 44px "Barlow Condensed", sans-serif'; x.textAlign = 'center'; x.fillText('$MOON2 MERCH', w / 2, 62); x.font = '700 26px "Barlow Condensed", sans-serif'; x.fillText('THIS SIDE UP ↑ ONLY', w / 2, 102); });
    const crate = new THREE.MeshStandardMaterial({ map: merch, roughness: 0.85 });
    for (const [cx, cz, cy] of [[1.6, 0.2, 0], [1.6, -0.55, 0], [1.6, -0.15, 1]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), crate); c.position.set(sx + cx, y + 0.275 + cy * 0.55, sz + cz); c.rotation.y = cz * 0.6; c.castShadow = true; g.add(c); }
  }

  let on = false;
  const Y = {
    group: g, colliders, stash: STASH,
    // where things go: the van in at the side gate (facing west), its door on the stash; Lev's car by the gate facing out
    vanAt: [-1914, -1041, -PI / 2], levAt: [-1910, -1032, PI / 2],
    gateIn: [-1916, -1016], // (in front of the south gate, on the apron)
    // the lookouts: at the gate (watching 12th Ave), walking the west row, at the side gate by Lev's car
    posts: [
      { at: [-1916, -1018.5], yaw: 0, sweep: 0.9, period: 7.5 },
      { path: [[-1935.5, -1035], [-1935.5, -1066]], speed: 1.15, pause: 2.2 },
      { at: [-1901.5, -1048.5], yaw: PI / 2 + 0.25, sweep: 0.8, period: 6.5 },
    ],
    show(v) {
      if (v === on) return; on = !!v; g.visible = on;
      // (the containers and the fence in the city's colliders while it stands: its cells rebuilt on the next query)
      const C = cm.colliders;
      if (on) C.push(...colliders); else for (let i = C.length - 1; i >= 0; i--) if (C[i].wagmi === 'm2') C.splice(i, 1);
      cm._colliderCells = null;
    },
    get on() { return on; },
    // (its pipelines built before it is first seen)
    async warm() { const v = g.visible; g.visible = true; try { await app.renderer.compileAsync(g, app.cameraSystem.camera, scene); } catch (e) { console.warn('[m2] warm', e); } g.visible = v || on; },
  };
  return Y;
}

// Lev's car: the city's sedan body in gloss black, acid-green rims and underglow, his plate
export function buildLevCar(W) {
  const N = window.NYC, g = new THREE.Group(); g.name = 'wagmi-lev-car';
  const spec = N.BODY_SPECS && N.BODY_SPECS.sedan;
  const body = new THREE.Group(); g.add(body);
  if (spec && N.buildCarGeometry && N.createLoftedCarMaterial) {
    const m = new THREE.Mesh(N.buildCarGeometry(spec, true), N.createLoftedCarMaterial(spec, 0x08090b));
    m.castShadow = true; m.receiveShadow = true; body.add(m);
  } else {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 4.5), new THREE.MeshStandardMaterial({ color: '#08090b', roughness: 0.3 })); m.position.y = 0.8; body.add(m);
  }
  const acid = new THREE.MeshStandardMaterial({ color: '#B6FF3B', emissive: '#7FC21A', emissiveIntensity: 1.1, roughness: 0.4, metalness: 0.3 });
  for (const sx of [-1, 1]) for (const z of [-1.38, 1.38]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.034, 8, 28), acid); r.rotation.y = PI / 2; r.position.set(sx * 0.93, 0.37, z); body.add(r); }
  const glowTex = canvasTex(64, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.0), new THREE.MeshBasicMaterial({ map: glowTex, color: '#9BFF2A', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -PI / 2; glow.position.y = 0.04; glow.renderOrder = 4; g.add(glow);
  const plate = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#F2F2EC'; x.fillRect(0, 0, w, h); x.fillStyle = '#0E1A3A'; x.font = '800 44px "Barlow Condensed", sans-serif'; x.textAlign = 'center'; x.fillText('LEV 100X', w / 2, 48); });
  for (const z of [-2.27, 2.3]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.13), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5 })); p.position.set(0, 0.48, z); p.rotation.y = z < 0 ? PI : 0; body.add(p); }
  // smoke from under the bonnet once he has crashed: soft grey puffs rising and spreading
  const puffTex = canvasTex(64, 64, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(200,200,200,.9)'); gr.addColorStop(1, 'rgba(200,200,200,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const puffMat = new THREE.SpriteMaterial({ map: puffTex, color: '#8C8F94', transparent: true, depthWrite: false, opacity: 0.6 });
  const puffs = Array.from({ length: 10 }, (_, i) => { const s = new THREE.Sprite(puffMat.clone()); s.visible = false; s.userData.t = i * 0.3; g.add(s); return s; });
  g.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  g.visible = false; W.app.scene.add(g);
  let smoking = false;
  return {
    group: g, body, smoke(on) { smoking = on; for (const s of puffs) s.visible = on; },
    update(dt) {
      if (!smoking) return;
      for (const s of puffs) {
        s.userData.t = (s.userData.t + dt) % 3; const k = s.userData.t / 3;
        s.position.set(Math.sin(k * 9 + s.id) * 0.3, 1.0 + k * 3.2, 1.6 + k * 0.6); s.scale.setScalar(0.6 + k * 2.4); s.material.opacity = 0.55 * (1 - k);
      }
    },
  };
}

// Lev: a Degen (thug.glb, the fight's dressing) in his look: a gold chain over the hoodie, an acid-green cap, his clips
// ready for a scene (cine.js rig)
export async function buildLev(W) {
  const gltf = await new GLTFLoader().loadAsync('assets/characters/thug.glb');
  const root = new THREE.Group(); root.name = 'Degen-Lev';
  const inner = skClone(gltf.scene); root.add(inner);
  if (W.combat?.dressDegen) W.combat.dressDegen(inner, 'c');
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  const bones = {}; inner.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  inner.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(inner).max.y;
  const head = bones.head, spine = bones.spine2 || bones.spine1;
  if (head) {
    const hp = head.getWorldPosition(new THREE.Vector3());
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 10, 0, PI * 2, 0, PI / 2), new THREE.MeshStandardMaterial({ color: '#B6FF3B', roughness: 0.75 }));
    cap.scale.set(1, 0.85, 1.08); cap.position.set(0, top - 0.1, hp.z);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.012, 16, 1, false, -PI / 2, PI), new THREE.MeshStandardMaterial({ color: '#16181B', roughness: 0.7 }));
    brim.scale.set(1, 1, 1.3); brim.position.set(0, 0.005, 0.1); cap.add(brim);
    inner.add(cap); head.attach(cap);
  }
  if (spine) {
    const sp = spine.getWorldPosition(new THREE.Vector3());
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 6, 30), new THREE.MeshStandardMaterial({ color: '#E8C25A', metalness: 0.95, roughness: 0.25 }));
    chain.rotation.x = PI / 2 - 0.35; chain.scale.set(1, 1.25, 1); chain.position.set(0, sp.y + 0.12, sp.z + 0.06);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 18), chain.material); coin.rotation.x = PI / 2; coin.position.set(0, sp.y - 0.05, sp.z + 0.16);
    inner.add(chain, coin); spine.attach(chain); spine.attach(coin);
  }
  const mixer = new THREE.AnimationMixer(inner);
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
  root.visible = false; W.app.scene.add(root);
  return { root, inner, bones, mixer, rig: rig(mixer, clips), clips: Object.keys(clips) };
}

// GTA's target marker: a chevron of light pointing down over a vehicle to follow, turning and bobbing
export function buildChevron(W, color = '#EF4444') {
  const g = new THREE.Group(); g.name = 'wagmi-chevron';
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 4), mat); c.rotation.x = PI; g.add(c);
  const edge = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.86, 4), new THREE.MeshBasicMaterial({ color: '#0A0C10', transparent: true, opacity: 0.55, side: THREE.BackSide, depthWrite: false })); edge.rotation.x = PI; g.add(edge);
  g.traverse((o) => { if (o.isMesh) { o.renderOrder = 6; o.frustumCulled = false; } });
  g.visible = false; W.app.scene.add(g);
  let t = 0;
  return {
    group: g,
    at(x, y, z, dt = 0.016) { t += dt; g.visible = true; g.position.set(x, y + 0.18 * Math.sin(t * 3), z); g.rotation.y = t * 1.6; },
    hide() { g.visible = false; },
  };
}
