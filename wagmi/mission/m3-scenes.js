// WAGMI City: Mission 3's scenes, on the cutscene machinery (cine.js, run by Mission 2's runScene): a clock, the shots
// as functions of it, the cast posed from it, cues fired as it passes them; Space held skips.
//   garage  the Static Garage at midday, the next day: the street outside, then the bay: Gears' legs out from under
//           Quant's car ("Cold-gas thrusters..."), Juno's video call: the $MOON2 launch stream (Fiona, Moon's face)
//   rally   Washington Square: the stage under the arch, the chart pumping, Fiona on the megaphone, a Degen spots Quant
//   dump    the third rig down: the chart goes red, Fiona drops the megaphone and runs for her SUV on 5th Ave
//   home    back at the garage: Gears at the door, the car "in one piece"
// Each is paced by its lines (a shot starts with its line) or fixed, and returns when it ends (or is skipped).
import * as THREE from 'three/webgpu';
import { upright, UPRIGHT_BONES } from '../intro.js';
import { keys, clamp, lerp, spline, travel } from './cine.js';
import { GARAGE, ARCH, STAGE, FIONA_AT, SUV_AT, SCREEN_Z, CROWD_CAM, drawMoon } from './m3-set.js';

const PI = Math.PI;
const WHITE = '#FFFFFF', BLUE = '#6CB8FF', ACID = '#B6FF3B', GOLD = '#FFC93C', PINK = '#FF8AD8';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const GX = GARAGE.x, GZ = GARAGE.z, GY = 0.22;
export const SPOT = {
  car: [GX + 1.2, GZ + 6.2, PI],             // in the bay, nose to the door
  quant: [GX - 1.6, GZ + 3.9, 0.59],         // by the car's nose, looking at Gears' legs
  gearsLie: [GX - 0.45, GZ + 5.4],           // his feet, out from under the car's left side (his head under it, east)
  gears: [GX - 1.9, GZ + 6.3, 3.02],         // up, facing Quant
  out: { car: [GX + 6, 1603.6, PI / 2], quant: [GX - 1.2, 1607.6, PI] }, // after: the car at the curb, Quant on the sidewalk
  // the home scene (23 Oct: a metre more between them, across the wide shot's line, which had him right in front of Gears)
  door: { gears: [GX + 0.9, GZ - 1.4], quant: [GX - 1.9, 1607.6] },
};
// where Quant's car waits for the escape (5th Ave at the arch, beside where Fiona's SUV stood, facing north)
export const ESCAPE_CAR = [-3.2, 2787, PI];

/* ------------------------------------------------------------ helpers -- */
function poser(W, C) {
  const Q = W.quant, P = W.person, cm = W.app.controllerManager;
  const ub = UPRIGHT_BONES.map((n) => Q.bones[n]).filter(Boolean), ub0 = ub.map((b) => b.quaternion.clone());
  return {
    at(x, z, h) { P.position.set(x, cm.getGroundHeight(x, z, 'person'), z); P.heading = h; P.mesh.position.copy(P.position); P.mesh.rotation.y = h; P.mesh.visible = true; },
    pose(t, h, k = 1) { ub.forEach((b, i) => b.quaternion.copy(ub0[i])); C.qRig.pose(t); ub.forEach((b, i) => ub0[i].copy(b.quaternion)); Q.body.position.y = 0; Q.body.rotation.x = 0; upright(W, h, k); },
  };
}
const _q = new THREE.Quaternion(), _w = new THREE.Quaternion();
function turnWorld(b, q) { b.getWorldQuaternion(_w); const want = q.clone().multiply(_w); b.parent.getWorldQuaternion(_w); b.quaternion.copy(_w.invert().multiply(want)); b.updateMatrixWorld(true); }
function armTo(W, side, target, pole, w = 1) {
  const B = W.quant.bones, b1 = B['upperarm01_' + side], b2 = B['lowerarm01_' + side], b3 = B['wrist_' + side];
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
// his phone up in front of him in his right hand (k 0..1)
function holdPhone(W, phone, h, k) {
  const B = W.quant.bones; if (!B.head || k <= 0.001) { phone.visible = false; return; }
  W.person.mesh.updateMatrixWorld(true);
  const F = V(Math.sin(h), 0, Math.cos(h)), R = V(-Math.cos(h), 0, Math.sin(h));
  const eye = B.head.getWorldPosition(V()).add(V(0, 0.07, 0)).addScaledVector(F, 0.08);
  const P = eye.clone().addScaledVector(F, 0.3).add(V(0, -0.27, 0)).addScaledVector(R, 0.05);
  const z = eye.clone().sub(P).normalize(), y = V(0, 1, 0).addScaledVector(z, -z.y).normalize(), x = V().crossVectors(y, z).normalize();
  const sh = B.upperarm01_R.getWorldPosition(V());
  armTo(W, 'R', P.clone().addScaledVector(z, -0.03).addScaledVector(y, -0.05), sh.clone().add(V(0, -1, 0)).addScaledVector(R, 0.5).addScaledVector(F, -0.3), k);
  phone.visible = k > 0.6;
  phone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); phone.position.copy(P);
}
const drift = (a, b, secs) => (t, t0) => keys([[t0, a], [t0 + secs, b]], 'linear')(t);
// a thug rig placed and posed: x, z, heading, the scene clock
function stand(W, P, x, z, h, t, { y = null, lie = false } = {}) {
  const cm = W.app.controllerManager;
  P.root.visible = true;
  P.root.rotation.order = 'YXZ';
  if (lie) { P.root.rotation.set(-PI / 2, h, 0); P.root.position.set(x, y ?? cm.getGroundHeight(x, z, 'person'), z); }
  else { P.root.rotation.set(0, h, 0); P.root.position.set(x, y ?? cm.getGroundHeight(x, z, 'person'), z); }
  P.rig.pose(t);
}

/* ---------------------------------------- the $MOON2 stream (the call) -- */
// what Juno shares: the launch stream (an original drawing): the arch, the stage, the chart pumping on the big screen,
// Moon's face on the banner, Fiona in her white puffer on the megaphone, the chat going by
function streamSVG() {
  const face = document.createElement('canvas'); face.width = face.height = 96; drawMoon(face.getContext('2d'), 48, 50, 38);
  const moon = face.toDataURL();
  return `<svg class="map" viewBox="0 0 90 192" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="m3sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FC3EA"/><stop offset="1" stop-color="#D9ECF7"/></linearGradient></defs>
  <rect width="90" height="192" fill="url(#m3sky)"/>
  <rect x="0" y="40" width="14" height="80" fill="#B9A28A"/><rect x="76" y="34" width="14" height="86" fill="#A88E76"/>
  <path d="M14 120 L14 46 L76 46 L76 120 L58 120 L58 80 Q45 58 32 80 L32 120 Z" fill="#EDE8DE"/>
  <rect x="14" y="46" width="62" height="12" fill="#E3DDD1"/>
  <rect x="17" y="47" width="56" height="10" fill="#0B0D10" stroke="#B6FF3B" stroke-width=".8"/>
  <image href="${moon}" x="18" y="46.5" width="11" height="11"/>
  <text x="31" y="55" font-family="Barlow Condensed" font-weight="800" font-style="italic" font-size="7.5" fill="#B6FF3B">$MOON2</text>
  <rect x="24" y="78" width="42" height="26" fill="#0B140A" stroke="#222" stroke-width="1"/>
  <path d="M27 100 L33 97 L37 98 L42 92 L46 93 L51 86 L55 87 L60 81 L63 82" fill="none" stroke="#B6FF3B" stroke-width="1.6"><animate attributeName="stroke-opacity" values="1;.6;1" dur="1s" repeatCount="indefinite"/></path>
  <text x="28" y="85" font-family="Barlow Condensed" font-weight="800" font-size="5" fill="#B6FF3B">+4,120%</text>
  <rect x="0" y="118" width="90" height="74" fill="#5D6B4E"/><rect x="10" y="118" width="70" height="7" fill="#2A2D33"/>
  <g transform="translate(45 104)">
    <ellipse cx="0" cy="12" rx="6" ry="9" fill="#F1F1F4"/><rect x="-4" y="19" width="3" height="10" fill="#1B1C20"/><rect x="1" y="19" width="3" height="10" fill="#1B1C20"/>
    <circle cx="0" cy="0" r="3.4" fill="#C9906E"/><path d="M-3.6 -0.6 Q0 -6 3.6 -0.6 L3.4 1 Q0 -2 -3.4 1 Z" fill="#EDE3C8"/><path d="M2.8 -1 Q6 4 4 10" stroke="#EDE3C8" stroke-width="1.6" fill="none"/>
    <rect x="-2.9" y="-0.6" width="5.8" height="1.5" rx=".6" fill="#F4F4F6"/>
    <path d="M-5 6 L-10 2 L-11 7 Z" fill="#F2F2F0"/><path d="M5 7 L9 -2" stroke="#F1F1F4" stroke-width="2.2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 5 7;-18 5 7;0 5 7" dur=".5s" repeatCount="indefinite"/></path>
  </g>
  ${[[10, 140], [22, 146], [70, 142], [80, 150], [58, 152], [32, 156], [46, 160], [16, 166]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${['#3A2E28', '#1C1E22', '#7A5236', '#2B2F36'][i % 4]}"/><rect x="${x - 3.6}" y="${y + 2.6}" width="7.2" height="9" rx="2" fill="${['#2E3440', '#B6FF3B', '#5D2E3A', '#1D2026'][i % 4]}"/>`).join('')}
  <rect x="4" y="12" width="20" height="8" rx="2" fill="#EF4444"/><text x="7.6" y="18.2" font-family="Barlow Condensed" font-weight="800" font-size="6" fill="#fff">LIVE</text>
  <text x="27" y="18.2" font-family="Barlow Condensed" font-weight="700" font-size="5.4" fill="#fff" stroke="#000" stroke-width=".25">11.2K WATCHING</text>
  <g font-family="Barlow Condensed" font-weight="700" font-size="4.8" fill="#fff">
    <text x="5" y="172"><tspan fill="#B6FF3B">wick</tspan> MOON2 TO 1 DOLLAR</text><text x="5" y="178"><tspan fill="#FFC93C">gwei</tspan> aped my rent</text><text x="5" y="184"><tspan fill="#B6FF3B">fomo</tspan> wait is this the dog</text>
  </g>
</svg>`;
}
export function streamCall(W, U) {
  U.call.show();
  const c = W.ui.phone.el.querySelector('.content .m2-call'); if (!c) return;
  const old = c.querySelector('svg.map'); if (old) old.outerHTML = streamSVG();
  const tag = c.querySelector('.tag'); if (tag) tag.innerHTML = '$MOON2 · LIVE LAUNCH · 11.2K WATCHING<b>Washington Square Arch</b>';
}

/* ------------------------------------------------------------- garage -- */
// U: Mission 2's overlays (the call), say(lines, st, onLine), cast { car: W.car, gears, garage }
export function garageScene(W, { U, say, gears, garage }) {
  const C = W.cast, ui = W.ui, sfx = W.sfx;
  const [QX, QZ, QH] = SPOT.quant, G = W.app.controllerManager.getGroundHeight(QX, QZ, 'person');
  const F = [Math.sin(QH), Math.cos(QH)], Rr = [-Math.cos(QH), Math.sin(QH)];
  const at = (f, r, y) => [QX + F[0] * f + Rr[0] * r, G + y, QZ + F[1] * f + Rr[1] * r];
  const T = { inside: 3.6, ring: Infinity, up: null, down: null };
  let ps = null, talkUntil = 0, gearsUp = false;
  const LINES = [
    ['Gears', GOLD, 'Cold-gas thrusters. Little puffs of nitrogen. Very safe. Mostly.'],
    ['Quant', WHITE, 'Define mostly.'],
    ['Gears', GOLD, "I tested them on my van. Van's fine. It's on the roof now."],
    ['Juno', BLUE, 'Quant. Are you watching this? They put Moon on a coin. Live.'],
    ['Fiona', PINK, 'Moon two! Number go up! Number go UP!'],
    ['Juno', BLUE, "It's up four thousand percent. Your dog is outperforming you again."],
    ['Quant', WHITE, "I'm going to go unplug it."],
    ['Gears', GOLD, 'Go get your dog off that screen.'],
  ];
  const OTS = { cam: (t, t0) => ({ pos: drift(at(-1.7, 0.72, 1.86), at(-1.55, 0.68, 1.84), 5)(t, t0), look: at(1.5, 0.22, 1.36), fov: 42, shake: 0.3 }) };
  const def = {
    END: Infinity, exposure: null,
    shots: [
      // W 22nd St at midday: the garage's sign, its door half up
      { t: 0, cam: (t, t0) => ({ pos: drift([GX - 12.5, 1.9, GZ - 14.5], [GX - 11, 2.1, GZ - 13.2], 4)(t, t0), look: drift([GX + 0.4, 3.3, GZ], [GX, 3.0, GZ], 4)(t, t0), fov: 46, shake: 0.4 }) },
      // the bay: his legs out from under the car, Quant at its nose
      { t: T.inside, cam: (t, t0) => ({ pos: drift([GX - 4.3, GY + 1.05, GZ + 9.2], [GX - 4.0, GY + 1.0, GZ + 8.8], 6)(t, t0), look: [GX - 1.0, GY + 0.45, GZ + 5.0], fov: 44, shake: 0.35 }) },
      { line: 1, t: Infinity, cam: (t, t0) => ({ pos: drift([GX - 0.85, GY + 1.25, GZ + 5.7], [GX - 0.9, GY + 1.3, GZ + 5.55], 3)(t, t0), look: [QX, GY + 1.55, QZ], fov: 34, shake: 0.3 }) },
      { line: 2, t: Infinity, cam: (t, t0) => ({ pos: drift([GX - 1.05, GY + 1.5, GZ + 4.0], [GX - 1.1, GY + 1.48, GZ + 4.15], 4)(t, t0), look: [SPOT.gears[0], GY + 1.38, SPOT.gears[1]], fov: 40, shake: 0.3 }) },
      { line: 3, t: Infinity, ...OTS },
      { line: 4, t: Infinity, cam: (t, t0) => ({ pos: drift(at(-1.2, 0.55, 1.8), at(-1.05, 0.5, 1.78), 4)(t, t0), look: at(1.5, 0.22, 1.36), fov: 34, shake: 0.3 }) },
      { line: 5, t: Infinity, cam: (t, t0) => ({ pos: drift(at(1.6, -0.95, 1.7), at(1.45, -0.85, 1.7), 5)(t, t0), look: at(0, 0, 1.64), fov: 28, shake: 0.3 }) },
      { line: 6, t: Infinity, cam: (t, t0) => ({ pos: drift(at(2.9, -1.7, 1.7), at(2.6, -1.6, 1.68), 4)(t, t0), look: at(0, 0, 1.45), fov: 38, shake: 0.3 }) },
      { line: 7, t: Infinity, cam: (t, t0) => ({ pos: drift([GX - 1.0, GY + 1.5, GZ + 4.3], [GX - 1.05, GY + 1.5, GZ + 4.45], 3)(t, t0), look: [SPOT.gears[0], GY + 1.42, SPOT.gears[1]], fov: 34, shake: 0.3 }) },
    ],
    cues: [
      [0.3, () => { ui.title('ACT II · DOWN BAD', 'Pump and Dump', 2.8); sfx?.play('stinger', { gain: 0.35 }); W.audio?.play?.('missionStart'); }],
      [1.0, () => ui.place('Static Garage', 'West Chelsea · WAGMI City', 3.2)],
      [T.inside - 0.1, () => { garage.inside(true); }],
      [1.3, (st) => {
        say(LINES, st, (who, i) => {
          const now = W.sceneClock?.t ?? 0;
          for (const sh of def.shots) if (sh.line === i) sh.t = now;
          if (i === 2) gearsUp = true;
          if (i === 3) { sfx?.play('ring', { gain: 0.16, times: 1 }); W.audio?.play?.('phoneBuzz'); T.up = now; streamCall(W, U); }
          if (i === 4) { U.call.share(true); W.voice?.fx?.('Fiona', 'video'); }
          if (i === 5) U.call.share(false);
          if (i === 6) { T.down = now + 0.3; U.call.hide(); sfx?.play('hangup', { gain: 0.12 }); }
          if (who === 'Juno') talkUntil = performance.now() + 400;
          // (Gears talks with his hands on his own lines, once he's up)
          if (who === 'Gears' && gearsUp) gears.rig.set([[0, 'idle'], [now, 'talk', { fade: 0.4, speed: 0.8 }], [now + 3.2, 'idle', { fade: 0.6 }]]);
        }).finally(() => { const now = W.sceneClock?.t; if (now != null) def.END = now + 1.2; U.call.hide(); });
      }],
      // (an impact wrench under the car)
      [2.2, () => sfx?.play('thunk', { gain: 0.18, f: 420, ring: false })],
      [4.4, () => sfx?.play('thunk', { gain: 0.14, f: 520, ring: false })],
    ],
    pose(t, dt) {
      ps = ps || poser(W, C);
      ps.at(QX, QZ, QH); ps.pose(t, QH);
      const k = T.up == null ? 0 : clamp((t - T.up) / 0.6) * (T.down == null ? 1 : 1 - clamp((t - T.down) / 0.6));
      holdPhone(W, C.phone, QH, k); if (C.phone.visible) C.phone.show?.('off', t);
      if (U.call.on) U.call.talk(performance.now() < talkUntil ? 0.6 + Math.random() * 0.4 : 0);
      // Gears: under the car on his creeper, then up (the cut hides the getting up)
      if (!gearsUp) {
        const [fx, fz] = SPOT.gearsLie;
        stand(W, gears, fx, fz, -PI / 2, t, { y: GY + 0.27, lie: true });
        garage.creeper.position.set(fx + 0.85, GY, fz); garage.creeper.rotation.y = PI / 2;
      } else {
        stand(W, gears, SPOT.gears[0], SPOT.gears[1], SPOT.gears[2], t); gears.relax(SPOT.gears[2], 1, 'LR', t);
        garage.creeper.position.set(SPOT.gearsLie[0] - 0.2, GY, SPOT.gearsLie[1] + 0.6); garage.creeper.rotation.y = 0.4;
      }
    },
    setup() {
      const car = W.car; car.position.set(SPOT.car[0], GY, SPOT.car[1]); car.heading = SPOT.car[2]; car.speed = 0; car.mesh.position.copy(car.position); car.mesh.rotation.y = car.heading;
      garage.show(true); garage.inside(false);
      C.qRig.set([[0, 'idle'], [6, ['idle/noArmL', ['talk/armL', { from: 0.6, speed: 0.7 }]], { fade: 0.5 }]]);
      gears.rig.set([[0, 'idle']]);
    },
    cleanup() {
      U.call.hide(); C.phone.visible = false; gears.root.visible = false; garage.inside(false);
      W.voice?.fx?.('Fiona', null);
    },
  };
  return def;
}

/* -------------------------------------------------------------- rally -- */
// ~9 s. fiona: her rig (hype), rally: the set, crew: the Degen who spots Quant ({ e } an enemy of the crew, or null)
export function rallyScene(W, { say, fiona, rally, spotter }) {
  const ui = W.ui, [FX, FZ] = FIONA_AT, top = STAGE.top;
  const sp = spotter ? { x: spotter.pos.x, z: spotter.pos.z } : { x: -8, z: 2856 };
  return {
    END: 11.0, quant: false,
    shots: [
      // from 5th Ave: the arch, Moon on the banner, the chart through the opening
      { t: 0, cam: (t) => ({ pos: keys([[0, [7.5, 2.0, 2748]], [3.2, [6.5, 2.3, 2758]]], 'linear')(t), look: keys([[0, [0, 11, 2801]], [3.2, [0, 10, 2801]]], 'linear')(t), fov: 54, shake: 0.4 }) },
      // in the crowd, the stage
      // (in the crowd, over their heads: a spot the park's trees leave clear to the stage)
      { t: 3.2, cam: (t) => ({ pos: keys([[3.2, [CROWD_CAM[0], 2.75, CROWD_CAM[1]]], [5.8, [CROWD_CAM[0] - 0.3, 2.7, CROWD_CAM[1] - 0.5]]], 'linear')(t), look: [0, 3.7, 2808.5], fov: 50, shake: 0.5 }) },
      { t: 5.8, cam: (t) => ({ pos: keys([[5.8, [2.6, top + 1.2, FZ + 4.4]], [8.4, [2.2, top + 1.25, FZ + 3.9]]], 'linear')(t), look: [FX, top + 1.55, FZ], fov: 34, shake: 0.6 }) },
      { t: 8.4, cam: (t) => ({ pos: [sp.x - 1.6, 1.75, sp.z + 2.6], look: keys([[8.4, [sp.x + 0.2, 1.5, sp.z - 0.4]], [11, [sp.x + 0.4, 1.4, sp.z - 2]]])(t), fov: 40, shake: 0.6 }) },
    ],
    cues: [
      [0.2, () => ui.place('Washington Square', 'Greenwich Village · WAGMI City', 3.2)],
      [0.6, (st) => { W.voice?.fx?.('Fiona', 'phone'); say([['Fiona', PINK, 'Welcome to the launch of the century! Moon two!']], st); }],
      [5.9, (st) => say([['Fiona', PINK, 'Number go up! Number go UP!']], st)],
      [8.6, (st) => say([['Wick', ACID, "Yo. That's the coin kid. Protect the streams!"]], st)],
    ],
    pose(t, dt) {
      stand(W, fiona, FX, FZ, 0, t, { y: top });
      fiona.hype(0, 1, 1, t);
      rally.update(dt, W.app.cameraSystem.camera.position);
      if (spotter && t > 8.8) { const e = spotter; const want = Math.atan2(W.person.position.x - e.pos.x, W.person.position.z - e.pos.z); e.yaw = want; e.root.rotation.y = want; }
    },
    setup() { fiona.rig.set([[0, 'thugIdle']]); },
    cleanup() {},
  };
}

/* --------------------------------------------------------------- dump -- */
// ~11.5 s: the chart red, Fiona off the stage and away in her SUV
export function dumpScene(W, { say, fiona, rally, suv }) {
  const sfx = W.sfx, cm = W.app.controllerManager, [FX, FZ] = FIONA_AT, top = STAGE.top;
  const T = { drop: 3.0, run: 3.6, cut: 6.0, inCar: 8.4, go: 8.7, end: 11.4 };
  const [SX, SZ, SH] = SUV_AT;
  // her run: along the stage to its east end, down, round the arch's east pier (cut), then the last steps to the SUV
  // (the second leg at the pace that gets her to its door as it opens)
  const run1 = spline([[FX, FZ], [5, FZ + 0.6], [STAGE.x1 - 0.3, STAGE.z1 - 0.4], [STAGE.x1 + 1.6, STAGE.z1 - 0.2], [11.6, 2808], [12, 2800]]);
  const doorAt = [SX + 1.35, SZ + 0.4];
  const run2 = spline([[10.7, 2797], [10.2, 2792], [doorAt[0] + 0.4, doorAt[1] + 2.5], [doorAt[0], doorAt[1]]]);
  const v2 = run2.length / (T.inCar - T.cut);
  const r1 = travel([[T.run, 0], [T.run + 0.5, 5.4], [T.cut, 5.4]]), r2 = travel([[T.cut, v2], [T.inCar, v2]]);
  const way = spline([[SX, SZ], [SX - 0.5, SZ - 22], [SX - 2, SZ - 70], [SX - 3, SZ - 160]]), go = travel([[T.go, 0], [T.go + 1.4, 12], [T.end, 18]]);
  const onStage = (p) => p.x < STAGE.x1 && p.z < STAGE.z1;
  let megaT = null;
  return {
    END: T.end, quant: false,
    // (the cameras stand where nothing of the park's trees comes between them and her: see the set's tree list)
    shots: [
      // from the stage's front, west of her: Fiona under the screen as the chart goes red
      { t: 0, cam: (t) => ({ pos: keys([[0, [-4.4, 2.0, 2814.0]], [2.6, [-4.0, 2.1, 2813.4]]], 'linear')(t), look: keys([[0, [0.6, 4.6, SCREEN_Z]], [2.6, [0.4, 4.2, SCREEN_Z + 1]]], 'linear')(t), fov: 50, shake: 0.4 }) },
      // east of her, low by the stage's edge: the megaphone dropped, and her run past the camera to the steps
      { t: 2.6, cam: (t) => ({ pos: keys([[2.6, [4.2, 1.85, 2813.2]], [T.cut, [4.7, 1.8, 2813.0]]], 'linear')(t), look: (() => { const p = t < T.run ? { x: FX, z: FZ } : run1.at(Math.min(run1.length, r1(t))); return [p.x, onStage(p) ? top + 1.0 : 1.3, p.z]; })(), fov: 46, shake: 0.7 }) },
      { t: T.cut, cam: (t) => ({ pos: [16.8, 1.8, 2789.5], look: keys([[T.cut, [10, 1.2, 2794]], [T.go + 0.4, [SX + 0.5, 1.1, SZ]], [T.end, [SX - 1, 1.2, SZ - 30]]])(t), fov: 44, shake: 0.6 }) },
      { t: T.end - 1.6, cam: () => { const [cx, cz, ch] = ESCAPE_CAR; return { pos: [cx - Math.sin(ch) * 7.5, 2.3, cz - Math.cos(ch) * 7.5], look: [cx + Math.sin(ch) * 6, 1.1, cz + Math.cos(ch) * 6], fov: 52, shake: 0.4 }; } },
    ],
    cues: [
      [0.1, () => { rally.screen.mode('dump'); sfx?.play('squeal', { gain: 0.2, dur: 0.6 }); }],
      [0.5, (st) => { W.voice?.fx?.('Fiona', 'phone'); say([['Fiona', PINK, 'Wait. Why is it red? Why is it going down?']], st); }],
      [T.drop, () => { megaT = T.drop; W.voice?.fx?.('Fiona', null); }],
      [T.run - 0.2, (st) => say([['Fiona', PINK, "It's a healthy correction! Bye!"]], st)],
      [T.inCar - 0.1, () => W.audio?.play?.('doorOpen', { pos: [doorAt[0], 1, doorAt[1]] })],
      [T.go, () => { sfx?.play('squeal', { gain: 0.45, dur: 1.2 }); W.audio?.play?.('engineStart', { pos: [SX, 0.8, SZ] }); }],
      [T.end - 1.4, (st) => say([['Quant', WHITE, 'Pump. And dump.']], st)],
    ],
    pose(t, dt) {
      rally.update(dt, W.app.cameraSystem.camera.position);
      // Fiona
      if (t < T.run) { stand(W, fiona, FX, FZ, 0, t, { y: top }); fiona.hype(0, t < T.drop ? 1 : 0, 0, t); }
      else if (t < T.cut) {
        const s = Math.min(run1.length, r1(t)), p = run1.at(s);
        stand(W, fiona, p.x, p.z, p.h, t, { y: onStage(p) ? top : cm.getGroundHeight(p.x, p.z, 'person') }); fiona.hype(p.h, 0, 0, t);
      } else if (t < T.inCar) { const p = run2.at(Math.min(run2.length, r2(t))); stand(W, fiona, p.x, p.z, p.h, t); fiona.hype(p.h, 0, 0, t); }
      else { fiona.root.visible = false; }
      // the megaphone dropped on the stage
      if (megaT != null) {
        const k = clamp((t - megaT) / 0.5), m = fiona.mega;
        m.visible = true; m.position.set(FX + 0.35, lerp(top + 1.5, top + 0.12, k * k), FZ + 0.25); m.rotation.set(PI / 2 * k, 0.6, 0);
      }
      // the SUV, parked, then away up 5th Ave
      suv.group.visible = t < T.go || go(t) < way.length - 2;
      const p = t < T.go ? way.at(0) : way.at(Math.min(way.length, go(t)));
      suv.group.position.set(p.x, 0, p.z); suv.group.rotation.set(0, t < T.go ? SH : p.h, 0);
      if (t > T.go) suv.spin(dt * go.speed(t) / 0.4);
    },
    setup() {
      fiona.rig.set([[0, 'thugIdle'], [T.run, fiona.clips.includes('run') ? 'run' : 'jog', { fade: 0.2, speed: 1.1 }]]);
      suv.group.visible = true;
    },
    cleanup() { fiona.root.visible = false; fiona.mega.visible = false; suv.group.visible = false; },
  };
}

/* --------------------------------------------------------------- home -- */
// ~12 s: Gears at the bay door, Quant back, the car at the curb
export function homeScene(W, { say, gears, garage }) {
  const C = W.cast;
  const [gx, gz] = SPOT.door.gears, [qx, qz] = SPOT.door.quant;
  const QH = Math.atan2(gx - qx, gz - qz), GH = QH + PI;
  const G = W.app.controllerManager.getGroundHeight(qx, qz, 'person');
  let ps = null;
  const LINES = [
    ['Gears', GOLD, "You're back. And the car's in one piece."],
    ['Quant', WHITE, 'Mostly.'],
    ['Gears', GOLD, 'Mostly?'],
    ['Quant', WHITE, 'The thrusters work great. Very safe. Mostly.'],
    ['Gears', GOLD, "Ha. Room's upstairs, kid. Get some sleep."],
  ];
  const def = {
    END: Infinity,
    shots: [
      { t: 0, cam: (t, t0) => ({ pos: drift([GX - 10, 2.3, 1596.5], [GX - 9, 2.2, 1597.5], 5)(t, t0), look: [GX - 0.2, 1.5, 1608.5], fov: 40, shake: 0.4 }) },
      { line: 1, t: Infinity, cam: () => ({ pos: [gx - 0.5, G + 1.65, gz - 0.9], look: [qx, G + 1.55, qz], fov: 34, shake: 0.3 }) },
      // (his whole cap in, with room over it)
      { line: 2, t: Infinity, cam: () => ({ pos: [qx + 0.35, G + 1.62, qz + 0.8], look: [gx, G + 1.72, gz], fov: 36, shake: 0.3 }) },
      { line: 3, t: Infinity, cam: () => ({ pos: [gx - 0.6, G + 1.6, gz - 1.0], look: [qx, G + 1.5, qz], fov: 30, shake: 0.3 }) },
      { line: 4, t: Infinity, cam: (t, t0) => ({ pos: drift([GX - 6, 1.8, 1599], [GX - 6.5, 2.4, 1597.5], 4)(t, t0), look: [GX - 0.2, 1.6, 1609], fov: 38, shake: 0.4 }) },
    ],
    cues: [
      [0.2, () => W.ui.place('Static Garage', 'West Chelsea · WAGMI City', 3)],
      [0.6, (st) => {
        say(LINES, st, (who, i) => {
          const now = W.sceneClock?.t ?? 0; for (const sh of def.shots) if (sh.line === i) sh.t = now;
          if (who === 'Gears') gears.rig.set([[0, 'idle'], [now, 'talk', { fade: 0.4, speed: 0.8 }], [now + 3.2, 'idle', { fade: 0.6 }]]);
        })
          .finally(() => { const now = W.sceneClock?.t; if (now != null) def.END = now + 1.0; });
      }],
    ],
    pose(t) {
      ps = ps || poser(W, C);
      ps.at(qx, qz, QH); ps.pose(t, QH);
      stand(W, gears, gx, gz, GH, t); gears.relax(GH, 1, 'LR', t);
    },
    setup() {
      const [cx, cz, ch] = SPOT.out.car, car = W.car;
      car.position.set(cx, 0, cz); car.heading = ch; car.speed = 0; car.mesh.position.copy(car.position); car.mesh.rotation.y = ch;
      garage.show(true);
      C.qRig.set([[0, 'idle'], [3, ['idle/noArmL', ['talk/armL', { from: 0.6, speed: 0.7 }]], { fade: 0.5 }]]);
      gears.rig.set([[0, 'idle']]);
    },
    cleanup() { gears.root.visible = false; },
  };
  return def;
}
