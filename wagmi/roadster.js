// WAGMI City: Quant's car. An original electric hypercar in the spirit of the second-generation Roadster's
// styling: a low, wide two-door with a long sloping nose and no grille, slim angular lamps, a raked glass bubble
// cabin with a glass targa roof, fender crowns, wide rear haunches and a clean tail with slim lamps and a diffuser.
// No maker's name, badge or exact shape. With the rocket package: cold-gas thrusters (compressed air) behind a
// rear panel that flips down, and a rocket bell under the tail.
//
// Built in code: one lofted shell (paint, glass and black trim as groups of one geometry), wheels, lamps, mirrors,
// the thruster bay and its plumes. Units are metres; the car stands on y = 0 with its nose toward +z.
//
//   const car = buildRoadster(THREE, { paint: '#8E0B14' });
//   scene.add(car.group); car.setThrust(1, 0.6); car.update(dt, speed, steer);

export function buildRoadster(THREE, o = {}) {
  const g = new THREE.Group(); g.name = 'wagmi-roadster';

  /* ------------------------------------------------------------ the shape -- */
  // smooth curves through keys, never overshooting them (monotone cubic)
  function pchip(keys) {
    const n = keys.length, xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]), h = [], d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
    };
  }
  const Z0 = -2.14, Z1 = 2.14;
  // the side profile's top, half the width, the widest line, the floor, and how round the top and the bottom are
  const TOP = pchip([[-2.14, 0.66], [-2.06, 0.8], [-1.88, 0.9], [-1.5, 0.93], [-1.05, 0.97], [-0.7, 1.03], [-0.35, 1.1], [-0.05, 1.13], [0.25, 1.1],
    [0.5, 1.0], [0.78, 0.86], [1.05, 0.77], [1.4, 0.69], [1.75, 0.6], [2.0, 0.5], [2.14, 0.38]]);
  const WID = pchip([[-2.14, 0.84], [-2.02, 0.94], [-1.66, 0.99], [-1.25, 0.99], [-0.82, 0.95], [-0.3, 0.9], [0.3, 0.91], [0.8, 0.95], [1.3, 0.96],
    [1.75, 0.92], [2.0, 0.78], [2.14, 0.5]]);
  const BELT = pchip([[-2.14, 0.5], [-1.6, 0.6], [-0.6, 0.6], [0.6, 0.56], [1.6, 0.5], [2.14, 0.34]]);
  const FLOOR = pchip([[-2.14, 0.3], [-1.92, 0.18], [-1.6, 0.14], [1.7, 0.13], [2.0, 0.16], [2.14, 0.22]]);
  const NUP = pchip([[-2.14, 2.6], [-1.6, 3.1], [-0.85, 2.3], [0.0, 2.0], [0.7, 2.4], [1.15, 3.4], [1.9, 3.0], [2.14, 2.4]]);
  // the fender crowns: raised over each wheel and along the haunches, lower over the cabin
  const CROWN = pchip([[-2.14, 0.02], [-1.75, 0.06], [-1.3, 0.08], [-0.85, 0.04], [-0.4, 0.01], [0.6, 0.01], [1.0, 0.035], [1.32, 0.05], [1.7, 0.035], [2.14, 0.01]]);
  const NLOW = 4.2;
  const WHEELS = [{ z: 1.32, r: 0.355, w: 0.26, x: 0.835 }, { z: -1.3, r: 0.365, w: 0.3, x: 0.845 }];
  const ARCH_R = 0.43;
  // over a wheel the body's lower half steps in (the wheel well) and the widest line follows the arch
  function arch(z) {
    let a = 0, top = 0;
    for (const w of WHEELS) {
      const dz = Math.abs(z - w.z);
      if (dz < ARCH_R + 0.07) a = Math.max(a, dz < ARCH_R ? 1 : 1 - (dz - ARCH_R) / 0.07);
      if (dz < ARCH_R) top = Math.max(top, w.r + Math.sqrt(ARCH_R * ARCH_R - dz * dz) - 0.03);
    }
    return { a, top };
  }
  function section(z) {
    const W = WID(z), T = TOP(z), A = arch(z), belt = Math.min(Math.max(BELT(z), A.top), T - 0.005);
    const wLow = W + (0.6 - W) * A.a, B = Math.min(FLOOR(z), belt - 0.05);
    return { W, T, belt, wLow, B, nu: NUP(z), crown: CROWN(z) };
  }
  // a point on the shell: upper half (u 0..1 from the right side over the top to the left side), lower half (v)
  function upper(s, u) {
    const ph = u * Math.PI, c = Math.cos(ph), si = Math.sin(ph), p = 2 / s.nu;
    const x = s.W * Math.sign(c) * Math.pow(Math.abs(c), p);
    const q = Math.abs(x) / s.W, bump = Math.exp(-Math.pow((q - 0.8) / 0.17, 2));
    const y = s.belt + (s.T - s.belt) * Math.pow(si, p) + s.crown * bump * Math.pow(Math.max(0, si), 0.35);
    return [x, y];
  }
  function lower(s, v) {
    const ph = Math.PI + v * Math.PI, c = Math.cos(ph), si = Math.abs(Math.sin(ph)), p = 2 / NLOW;
    return [s.wLow * Math.sign(c) * Math.pow(Math.abs(c), p), s.belt - (s.belt - s.B) * Math.pow(si, p)];
  }
  const NS = 150, NU = 44, NL = 18, RING = NU + 1 + NL + 1;
  const zs = []; for (let i = 0; i <= NS; i++) { const t = i / NS; zs.push(Z0 + (Z1 - Z0) * (0.5 - 0.5 * Math.cos(Math.PI * t)) * 0.35 + (Z0 + (Z1 - Z0) * t) * 0.65 - Z0 * 0.35 * 0 ); }
  // (stations a little closer together toward both ends, where the shape turns fastest)
  for (let i = 0; i <= NS; i++) { const t = i / NS, e = 0.5 - 0.5 * Math.cos(Math.PI * t); zs[i] = Z0 + (Z1 - Z0) * (0.62 * t + 0.38 * e); }
  const pos = [], ringKind = [];
  const S = zs.map(section);
  for (let i = 0; i <= NS; i++) {
    const s = S[i], z = zs[i];
    for (let k = 0; k <= NU; k++) { const [x, y] = upper(s, k / NU); pos.push(x, y, z); }
    for (let k = 0; k <= NL; k++) { const [x, y] = lower(s, k / NL); pos.push(x, y, z); }
  }
  for (let k = 0; k <= NU; k++) ringKind.push('u'); for (let k = 0; k <= NL; k++) ringKind.push('l');
  // the caps: the tail's and the nose's middles
  const capR = pos.length / 3; pos.push(0, (S[0].belt + S[0].B) / 2 + 0.05, zs[0] - 0.005);
  const capF = pos.length / 3; pos.push(0, (S[NS].belt + S[NS].B) / 2, zs[NS] + 0.005);
  const PAINT = [], GLASS = [], BLACK = [];
  const vtx = (i, k) => i * RING + k;
  const P = (n) => [pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]];
  // black trim, by where a face sits on the ring (so its edges run clean along the body): the lower half under the
  // nose (the intake), under the tail (the diffuser), the sills, and the wheel wells' inner walls
  function groupOf(i, k) {
    if (k <= NU) return PAINT;
    const z = (zs[i] + zs[i + 1]) / 2, v = (k - NU - 1 + 0.5) / NL, bottom = Math.abs(Math.sin(Math.PI * v)) > 0.62;
    const mid = v > 0.18 && v < 0.82;
    if ((z > 1.95 && mid) || (z < -1.98 && mid) || bottom) return BLACK;
    if (arch(z).a > 0.97) return BLACK;
    return PAINT;
  }
  for (let i = 0; i < NS; i++) {
    for (let k = 0; k < RING; k++) {
      const k1 = (k + 1) % RING, a = vtx(i, k), b = vtx(i + 1, k), c = vtx(i + 1, k1), d = vtx(i, k1);
      // (the ledge from the lower half's last point back to the upper half's first: the wheel well's roof)
      const G = k === RING - 1 || k === NU ? BLACK : groupOf(i, k);
      G.push(a, c, b, a, d, c);
    }
  }
  for (let k = 0; k < RING; k++) { const k1 = (k + 1) % RING; PAINT.push(capR, vtx(0, k1), vtx(0, k)); PAINT.push(capF, vtx(NS, k), vtx(NS, k1)); }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const idx = PAINT.concat(GLASS, BLACK); shell.setIndex(idx);
  shell.addGroup(0, PAINT.length, 0); shell.addGroup(PAINT.length + GLASS.length, BLACK.length, 2);
  shell.computeVertexNormals();

  /* ------------------------------------------------------------ materials -- */
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: o.paint ?? '#8E0B14', metalness: o.matte ? 0.2 : 0.55, roughness: o.matte ? 0.55 : 0.3, clearcoat: o.matte ? 0.15 : 1, clearcoatRoughness: o.matte ? 0.6 : 0.04 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#06080C', metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 }),
    black: new THREE.MeshPhysicalMaterial({ color: '#0C0D10', metalness: 0.3, roughness: 0.45, clearcoat: 0.4 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.86 }),
    rim: new THREE.MeshPhysicalMaterial({ color: o.rim ?? '#2A2D33', metalness: 0.85, roughness: 0.28, clearcoat: 0.6 }),
    disc: new THREE.MeshStandardMaterial({ color: '#6C6E72', metalness: 0.8, roughness: 0.4 }),
    caliper: new THREE.MeshPhysicalMaterial({ color: '#C8102E', metalness: 0.2, roughness: 0.35, clearcoat: 0.8 }),
    head: new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#F2F6FF', emissiveIntensity: 3 }),
    tail: new THREE.MeshStandardMaterial({ color: '#2A0005', emissive: '#FF1030', emissiveIntensity: 2.4 }),
    nozzle: new THREE.MeshPhysicalMaterial({ color: '#8A8E96', metalness: 1, roughness: 0.22 }),
    bell: new THREE.MeshPhysicalMaterial({ color: '#4A3A30', metalness: 1, roughness: 0.3 }),
  };
  const body = new THREE.Mesh(shell, [M.paint, M.glass, M.black]); body.castShadow = true; body.receiveShadow = true; g.add(body);

  // a point just off the shell's surface, and its outward normal: for the lamps and the trim that hug it
  function onUpper(z, u, lift = 0.004) {
    const s = section(z), [x, y] = upper(s, u), e = 0.002, [x2, y2] = upper(s, Math.min(1, u + e)), [x3, y3] = upper(section(z + e * 4), u);
    const t1 = new THREE.Vector3(x2 - x, y2 - y, 0), t2 = new THREE.Vector3(x3 - x, y3 - y, e * 4), nrm = new THREE.Vector3().crossVectors(t2, t1).normalize();
    const mid = new THREE.Vector3(0, (s.belt + s.B) / 2, 0), out = new THREE.Vector3(x, y, 0).sub(mid);
    if (nrm.dot(out) < 0) nrm.negate();
    return new THREE.Vector3(x, y, z).addScaledVector(nrm, lift);
  }
  function strip(points, r, mat) {
    const curve = new THREE.CatmullRomCurve3(points);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 8, false), mat); g.add(m); return m;
  }

  /* ------------------------------------------------------------- the glass -- */
  // the greenhouse: one sheet laid 4 mm over the shell above the window line, from the windscreen's foot over the
  // targa roof to the rear glass, so its edges are smooth curves (the windscreen, the side glass and the roof)
  {
    const WIN = pchip([[-0.66, 0.9], [-0.42, 0.83], [0.2, 0.8], [0.6, 0.8], [0.82, 0.815]]);
    const gz0 = -0.66, gz1 = 0.82, GN = 60, GU = 40, gp = [], gi = [];
    for (let i = 0; i <= GN; i++) {
      const z = gz0 + (gz1 - gz0) * i / GN, s = section(z), wy = WIN(z);
      // where the side crosses the window line (the upper half rises from the side to the top)
      let lo = 0, hi = 0.5; for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (upper(s, m)[1] < wy) lo = m; else hi = m; }
      const u0 = hi;
      for (let k = 0; k <= GU; k++) { const p = onUpper(z, u0 + (1 - 2 * u0) * k / GU, 0.008); gp.push(p.x, p.y, p.z); }
    }
    for (let i = 0; i < GN; i++) for (let k = 0; k < GU; k++) { const a = i * (GU + 1) + k, b = a + GU + 1; gi.push(a, b + 1, b, a, a + 1, b + 1); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gg.setIndex(gi); gg.computeVertexNormals();
    const glass = new THREE.Mesh(gg, M.glass); glass.castShadow = true; g.add(glass);
    // a slim black frame round the glass, the window line's chrome-less seam
    for (const sd of [1, -1]) {
      const pts = []; for (let i = 0; i <= 12; i++) { const z = gz0 + (gz1 - gz0) * i / 12, s = section(z), wy = WIN(z); let lo = 0, hi = 0.5; for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2; if (upper(s, m)[1] < wy) lo = m; else hi = m; } pts.push(onUpper(z, sd > 0 ? hi : 1 - hi, 0.005)); }
      strip(pts, 0.006, M.black);
    }
  }

  /* ------------------------------------------------------------- the lamps -- */
  // headlamps: a slim angular blade sweeping up the nose's corner, with a short lower signature beneath it
  for (const sd of [1, -1]) {
    const u = (t) => (sd > 0 ? t : 1 - t);
    strip([onUpper(2.02, u(0.07)), onUpper(1.96, u(0.12)), onUpper(1.88, u(0.19)), onUpper(1.8, u(0.25))], 0.016, M.head);
    strip([onUpper(2.05, u(0.1)), onUpper(2.0, u(0.15))], 0.01, M.head);
    // the tail lamps: slim wraparound blades at the corners
    strip([onUpper(-2.0, u(0.06)), onUpper(-2.05, u(0.14)), onUpper(-2.08, u(0.24)), onUpper(-2.09, u(0.33))], 0.015, M.tail);
  }
  strip([onUpper(-2.1, 0.36), onUpper(-2.11, 0.5), onUpper(-2.1, 0.64)], 0.006, M.tail);

  /* ------------------------------------------------------- mirrors, seams -- */
  for (const sd of [1, -1]) {
    const base = onUpper(0.6, sd > 0 ? 0.06 : 0.94, 0.0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.1, 4, 8), M.black); arm.rotation.z = Math.PI / 2; arm.position.set(base.x + sd * 0.07, base.y + 0.03, base.z); g.add(arm);
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), M.paint); pod.scale.set(0.8, 0.55, 1.3); pod.position.set(base.x + sd * 0.15, base.y + 0.04, base.z - 0.02); pod.castShadow = true; g.add(pod);
    // the door's shut line, a fine dark seam down the side from the glass to the sill
    const seam = [];
    for (let t = 0; t <= 1; t += 0.1) { const z = 0.78 - 0.04 * t, s = section(z), uu = sd > 0 ? 0.02 + 0.12 * (1 - t) : 0.98 - 0.12 * (1 - t); seam.push(onUpper(z, uu, 0.002)); }
    strip(seam, 0.0035, M.black);
  }

  /* ------------------------------------------------------------ the wheels -- */
  const wheels = [];
  function wheel(r, w, sd) {
    const W = new THREE.Group(), spin = new THREE.Group(); W.add(spin);
    // the tyre: a lathe of its section turned round the axle
    const tw = w / 2, prof = [];
    const sec = [[r - 0.105, -tw * 0.92], [r - 0.03, -tw], [r - 0.006, -tw * 0.84], [r, -tw * 0.5], [r, tw * 0.5], [r - 0.006, tw * 0.84], [r - 0.03, tw], [r - 0.105, tw * 0.92]];
    for (const [rr, x] of sec) prof.push(new THREE.Vector2(rr, x));
    const tyre = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.rubber); tyre.rotation.z = Math.PI / 2; tyre.castShadow = true; spin.add(tyre);
    // the rim: a deep barrel and ten turbine blades, twisted, round a centre cap
    const rimR = r - 0.1;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, w * 0.86, 40, 1, true), M.rim); barrel.rotation.z = Math.PI / 2; spin.add(barrel);
    const face = sd * (w * 0.43 - 0.01);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, blade = new THREE.Mesh(new THREE.BoxGeometry(0.018, rimR * 0.82, 0.05), M.rim);
      const hold = new THREE.Group(); hold.rotation.x = a; spin.add(hold);
      blade.position.set(face, rimR * 0.52, 0); blade.rotation.set(0, sd * 0.5, 0.18); hold.add(blade);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 24), M.rim); cap.rotation.z = Math.PI / 2; cap.position.x = face; spin.add(cap);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.012, 8, 48), M.rim); lip.rotation.y = Math.PI / 2; lip.position.x = face; spin.add(lip);
    // the brake: a disc and a red calliper that do not turn with the wheel
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(rimR * 0.82, rimR * 0.82, 0.03, 32), M.disc); disc.rotation.z = Math.PI / 2; disc.position.x = -sd * 0.03; W.add(disc);
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.09), M.caliper); cal.position.set(sd * 0.02, rimR * 0.62, -0.03); W.add(cal);
    return { W, spin };
  }
  for (const ax of WHEELS) {
    for (const sd of [1, -1]) {
      const wh = wheel(ax.r, ax.w, sd); wh.W.position.set(sd * ax.x, ax.r, ax.z); g.add(wh.W);
      wheels.push({ ...wh, front: ax.z > 0, r: ax.r });
    }
  }

  /* --------------------------------------------- the rocket package -- */
  // the rear panel (where a plate would sit) flips down on its hinge to open the thruster bay
  const bay = new THREE.Group(); bay.position.set(0, 0.44, -2.08); g.add(bay);
  const recess = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.12), M.black); recess.position.z = 0.03; bay.add(recess);
  const flap = new THREE.Group(); flap.position.set(0, -0.08, -0.03); bay.add(flap);
  const flapPanel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.012), M.paint); flapPanel.position.y = 0.08; flap.add(flapPanel);
  const nozzles = [];
  const bellG = (r0, r1, len) => new THREE.LatheGeometry([new THREE.Vector2(r0 * 0.7, 0), new THREE.Vector2(r0, 0.02), new THREE.Vector2(r0 * 1.1, len * 0.45), new THREE.Vector2(r1, len)], 32);
  for (let k = 0; k < 4; k++) {
    const nz = new THREE.Mesh(bellG(0.022, 0.045, 0.09), M.nozzle); nz.rotation.x = -Math.PI / 2; nz.position.set(-0.21 + k * 0.14, 0, -0.02); bay.add(nz); nozzles.push(nz);
  }
  const rocket = new THREE.Mesh(bellG(0.05, 0.13, 0.26), M.bell); rocket.rotation.x = -Math.PI / 2; rocket.position.set(0, 0.24, -2.02); g.add(rocket);
  // the plumes: cold gas (a pale blue-white jet and its vapour) from each thruster, fire from the bell
  const add = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const coldM = add('#BFE6FF', 0.55), coreM = add('#FFFFFF', 0.8), fireM = add('#FF8A2A', 0.7), fireCoreM = add('#FFE6B0', 0.9);
  const plumes = [];
  for (const nz of nozzles) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.9, 20, 1, true), coldM); p.rotation.x = -Math.PI / 2; p.position.set(nz.position.x, 0, -0.52); bay.add(p);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.5, 12, 1, true), coreM); c.rotation.x = -Math.PI / 2; c.position.set(nz.position.x, 0, -0.32); bay.add(c);
    plumes.push(p, c);
  }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.6, 24, 1, true), fireM); fire.rotation.x = -Math.PI / 2; fire.position.set(0, 0.24, -2.95); g.add(fire);
  const fireCore = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.9, 16, 1, true), fireCoreM); fireCore.rotation.x = -Math.PI / 2; fireCore.position.set(0, 0.24, -2.6); g.add(fireCore);
  let cold = 0, burn = 0, coldWant = 0, burnWant = 0, t = 0;
  function setThrust(c, b = 0) { coldWant = Math.max(0, Math.min(1, c)); burnWant = Math.max(0, Math.min(1, b)); }
  function applyThrust() {
    const open = Math.min(1, Math.max(cold, burn) * 3); flap.rotation.x = -open * 1.45;
    // (the nozzles slide out as the panel drops, and back in behind it)
    nozzles.forEach((n) => { n.visible = open > 0.15; n.position.z = -0.02 - 0.06 * open; });
    const fl = 0.88 + 0.12 * Math.sin(t * 60) * Math.sin(t * 37);
    plumes.forEach((p, i) => { const k = cold * fl * (i % 2 ? 1 : 1.1); p.visible = cold > 0.02; p.scale.set(0.6 + 0.4 * k, k, 0.6 + 0.4 * k); });
    fire.visible = fireCore.visible = burn > 0.02;
    const kb = burn * fl; fire.scale.set(0.6 + 0.4 * kb, kb, 0.6 + 0.4 * kb); fireCore.scale.set(0.7 + 0.3 * kb, kb, 0.7 + 0.3 * kb);
  }

  /* -------------------------------------------------------------- driving -- */
  // per frame: the wheels turn with the distance, the fronts steer, the thrust eases toward what was asked
  function update(dt, speed = 0, steer = 0) {
    t += dt;
    for (const w of wheels) { w.spin.rotation.x += (speed * dt) / w.r; if (w.front) w.W.rotation.y = steer * 0.5; }
    cold += (coldWant - cold) * Math.min(1, dt * 10); burn += (burnWant - burn) * Math.min(1, dt * 6);
    applyThrust();
  }
  setThrust(o.cold ?? 0, o.burn ?? 0); cold = coldWant; burn = burnWant; applyThrust();
  return { group: g, materials: M, wheels, setThrust, update, length: Z1 - Z0, width: 2.0, height: 1.15 };
}
