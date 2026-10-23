// WAGMI City: the traffic's sound, read off the city's own cars and buses (js/traffic.js: x, z, yaw, speed, acc, vx, vz,
// bus, isNYPD, isTaxi, isSUV, pAhead / pRight: where the player is against it), no hooks inside it:
//  - the nearest four cars and the nearest bus each get one of a few shared voices (an engine's hum and the tyres'
//    hiss, a bus's diesel), placed and pitched by doppler as they pass; a voice changes hands by fading, never cutting;
//  - NYPD cruisers go out on calls: each on its own clock, some of the time its siren on (a wail, a yelp when it is stuck
//    or pushing through), the nearest two heard, doppler and all; ram one and it yelps at you;
//  - horns: a car Quant stands or parks in front of honks (and leans on it if he stays), one he cuts off honks, the
//    drivers around honk while he drives on the sidewalk, one he rams honks after the bang, now and then one at a light
//    honks at the car ahead that hasn't moved;
//  - a bus's air brakes hiss when it comes to a stop.
import { LOOPS } from './loops.js';

export function createTraffic(M, E) {
  const out = M.bus.amb;
  const R = M.R;
  const memo = new WeakMap();
  const mem = (v) => { let m = memo.get(v); if (!m) memo.set(v, (m = { blocked: 0, cool: R() * 3, kick: Math.hypot(v.vx || 0, v.vz || 0), prev: v.speed, light: 0, siren: null })); return m; };
  // a voice: a loop in a placed spot, given to one vehicle at a time
  const voice = (kind, ref) => {
    const spot = M.spot(out, null, { ref, verb: 0.22 });
    const L = LOOPS[kind](M, spot.in);
    return { L, spot, v: null, w: 0, want: 0, kind };
  };
  let carV = null, busV = null, sirenV = null;
  const build = () => { carV = [0, 1, 2, 3].map(() => voice('carHum', 7)); busV = [voice('busHum', 9)]; sirenV = [voice('siren', 22), voice('siren', 22)]; };

  const vel = (v) => [v.tx * v.speed + (v.vx || 0), v.tz * v.speed + (v.vz || 0)];
  // hand the voices to the nearest few (cand sorted near to far): one keeps its vehicle while it is still among them
  function assign(voices, cand, dt) {
    const keep = new Set(cand.slice(0, voices.length + 1));
    for (const x of voices) x.want = x.v && keep.has(x.v) ? 1 : 0;
    const voiced = new Set(voices.filter((x) => x.v && x.want).map((x) => x.v));
    for (const c of cand.slice(0, voices.length)) {
      if (voiced.has(c)) continue;
      const free = voices.find((x) => !x.v || (x.want === 0 && x.w < 0.02));
      if (!free) break;
      free.v = c; free.want = 1; free.w = 0; voiced.add(c);
    }
    for (const x of voices) {
      x.w += Math.sign(x.want - x.w) * Math.min(Math.abs(x.want - x.w), dt / 0.35);
      if (x.want === 0 && x.w <= 0) x.v = null;
    }
  }
  function sound(x, set) {
    const v = x.v;
    if (!v) { if (!x.quiet) x.L.set({ vol: 0 }); x.quiet = true; return; }
    x.quiet = false;
    x.spot.set([v.x, 0.9, v.z], 0.03);
    const [vx, vz] = vel(v);
    set(v, M.doppler(v.x, 0.9, v.z, vx, vz));
  }
  const honk = (v, len, delay = 0) => {
    const kind = v.bus ? 'bus' : v.isNYPD ? 'police' : v.isTaxi ? 'taxi' : v.isSUV ? 'suv' : 'sedan';
    E.play('horn', { pos: [v.x, 1, v.z], kind, len, bus: 'amb', vol: 0.9, delay });
    hornCool = 0.35;
  };
  let hornCool = 0, sidewalkT = 2;
  const call = { v: null, t: 8 + R() * 30, mode: 'wail', sw: 3 };

  // per frame. cars / buses: the city's; P: { x, z, inCar, speed, onSidewalk, active (no cutscene) }
  function update(dt, cars, buses, P) {
    if (!carV) build();
    hornCool -= dt;
    const L = M.listener, R2 = 85 * 85;
    const near = [], nearBus = [], cops = [];
    for (const list of [cars, buses]) for (const v of list) {
      if (!v.edge) continue;
      const dx = v.x - L.x, dz = v.z - L.z, d2 = dx * dx + dz * dz;
      if (v.isNYPD) cops.push([v, d2]);
      if (d2 > R2) continue;
      (v.bus ? nearBus : near).push([v, d2]);
      const m = mem(v);
      m.cool -= dt;
      // horns: is the player in its way (standing, parked) ahead in its lane?
      if (P.active) {
        const inWay = v.pAhead > 0 && v.pAhead < 15 && Math.abs(v.pRight) < 2.1;
        if (inWay && v.speed < 1.2) m.blocked += dt; else m.blocked = Math.max(0, m.blocked - dt * 2);
        if (m.blocked > 1.4 && m.cool <= 0 && hornCool <= 0) { honk(v, m.blocked > 6 ? 'lean' : m.blocked > 3.5 ? 'long' : R() < 0.5 ? 'double' : 'beep'); m.cool = 2.2 + R() * 2.5; }
        // cut off: braking hard for the player just ahead
        if (v.acc < -4.2 && v.speed > 3 && v.pAhead > 0 && v.pAhead < 26 && m.cool <= 0 && hornCool <= 0) { honk(v, R() < 0.6 ? 'long' : 'triple', 0.15); m.cool = 4; }
        // rammed: a kick it didn't make itself
        const kick = Math.hypot(v.vx || 0, v.vz || 0);
        if (kick - m.kick > 1.2 && Math.hypot(v.x - P.x, v.z - P.z) < 12) {
          if (v.isNYPD) { m.siren = { mode: 'yelp', t: 2.5 + R() * 2 }; }
          // (a wreck's driver is wagmi/crash's to honk)
          if (!v.wreck && (m.cool <= 0 || kick - m.kick > 3)) { honk(v, R() < 0.5 ? 'lean' : 'long', 0.45 + R() * 0.4); m.cool = 3; }
        }
        m.kick = kick;
      }
      // the light's green and the car ahead hasn't gone
      if (v.speed < 0.3 && v.leaderSpeed > 2.2 && v.gap < 14 && v.gap > 2) { m.light += dt; if (m.light > 0.9 && m.cool <= 0 && hornCool <= 0 && R() < 0.35) { honk(v, R() < 0.5 ? 'tap' : 'double'); m.cool = 8; } }
      else m.light = 0;
      // a bus stopping: its air brakes
      if (v.bus) { if (v.speed > 2) m.moving = true; else if (m.moving && v.speed < 0.2) { m.moving = false; E.play('airBrake', { pos: [v.x, 1.2, v.z], bus: 'amb', vol: 0.8 }); } }
      m.prev = v.speed;
    }
    // driving on the sidewalk: the drivers round about lean on their horns
    if (P.active && P.inCar && P.onSidewalk && P.speed > 4) {
      sidewalkT -= dt;
      if (sidewalkT <= 0 && near.length) { const [v] = near[Math.floor(R() * Math.min(4, near.length))]; honk(v, M.pick(['long', 'double', 'lean', 'triple'])); sidewalkT = 1.2 + R() * 2; }
    } else sidewalkT = Math.min(sidewalkT + dt, 1);

    near.sort((a, b) => a[1] - b[1]); nearBus.sort((a, b) => a[1] - b[1]);
    assign(carV, near.map((a) => a[0]), dt);
    assign(busV, nearBus.map((a) => a[0]), dt);
    for (const x of carV) sound(x, (v, dop) => x.L.set({ speed: v.speed, load: Math.max(0.15, Math.min(1, 0.35 + v.acc * 0.3)), dop, vol: x.w * 0.9 }));
    for (const x of busV) sound(x, (v, dop) => x.L.set({ speed: v.speed, load: Math.max(0.2, Math.min(1, 0.4 + v.acc * 0.4)), dop, vol: x.w * 1.0 }));

    // the cruisers' calls: one at a time, every minute or so a cruiser 60-300 m off goes out on one for a while (a wail
    // on the move, a yelp or a phaser when it is stuck)
    call.t -= dt;
    if (call.v && (call.t <= 0 || !call.v.edge)) { call.v = null; call.t = 35 + R() * 70; }
    else if (!call.v && call.t <= 0) {
      const pool = cops.filter(([, d2]) => d2 > 60 * 60 && d2 < 300 * 300);
      if (pool.length) { call.v = pool[Math.floor(R() * pool.length)][0]; call.t = 14 + R() * 18; call.mode = 'wail'; call.sw = 3; } else call.t = 5;
    }
    if (call.v) { call.sw -= dt; if (call.sw <= 0) { call.mode = call.v.speed < 4 ? (R() < 0.7 ? 'yelp' : 'phaser') : R() < 0.75 ? 'wail' : 'yelp'; call.sw = 2.5 + R() * 5; } }
    const calling = [];
    for (const [v, d2] of cops) {
      const m = mem(v);
      if (m.siren) { m.siren.t -= dt; if (m.siren.t <= 0) m.siren = null; }
      // (a cruiser can be told: v.siren = 'wail' | 'yelp' | 'phaser' | 'off', null for its own calls)
      const mode = v.siren ? (v.siren === 'off' ? null : v.siren) : m.siren ? m.siren.mode : call.v === v ? call.mode : null;
      if (mode && d2 < 420 * 420) calling.push([v, d2, mode]);
    }
    calling.sort((a, b) => a[1] - b[1]);
    const modeOf = new Map(calling.map((a) => [a[0], a[2]]));
    assign(sirenV, calling.map((a) => a[0]), dt);
    for (const x of sirenV) sound(x, (v, dop) => x.L.set({ mode: modeOf.get(v) || x.L.mode, dop, vol: x.w * 0.55 }));
  }
  return { update, get voices() { return { cars: carV, buses: busV, sirens: sirenV }; } };
}
