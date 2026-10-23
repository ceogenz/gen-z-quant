// WAGMI City: the GPS and the mission blips. The quickest legal route is an A* search over the traffic's road graph
// (__NYC_APP.trafficSystem.network: lane edges joined by the turns the graph allows, so one-way streets are kept),
// edge to edge, re-planned every second and whenever the player strays 25 m off it. The route (yellow on a dark casing),
// the destination and the blips are drawn on the radar and the full map over the city's own layers, in place of its
// L-shaped line (mapSystem.waypoint still names the destination). On foot and close (150 m) the route is a straight line.
// The rule (every mission, GTA's): the route always goes where the current objective says. An objective about the car
// routes to the car, one about a place to the place, a fight has none.
//   const gps = createGPS(W);  gps.set({ x, z, name });  gps.clear();
//   gps.objective(parts, target, { blip })   the objective (ui.objective: the line and the tracker) and the route with
//                         it, in one call: target a place { x, z, name } (its yellow blip too, unless blip: false), a thing
//                         that moves { follow: () => ({ x, z }), name } (the route only), or null (no route)
//   gps.to(target)        the route's target alone, the blips left as they are (same targets)
//   gps.drive({ dest, objective, onFoot, grace }) -> { step(), stop(), state }   a 'drive there' objective: out of the
//                         car on the way, after a grace of a few seconds, 'Get back in your car.' with the car blipped
//                         and the route to it; within onFoot m of the place on foot, on to it on foot; back in the car,
//                         the place again. step() every frame (from the mission's frame hook), stop() at the end.
//   gps.blip(id, { x, z, kind: 'dest' | 'car' | 'enemy' | 'friend' | 'object' | 'letter' | 'paw' | 'waypoint', letter,
//                  pulse, edge, name });  gps.unblip(id);  gps.update() (every frame; the radar asks for it itself)
//   gps.user              the player's own waypoint (a click on the full map, or its search's 'Set waypoint'): purple,
//                         its route wins over the mission's until he gets there, clicks it away, or the objective changes
// Named mission places (the route's place, named blips) are found by the full map's search (mapSystem.searchExtra).
// Stalls (instead of reminders on a timer): with a place to go, no headway along the route for 50 s of play, or the car
// stuck (the pedal down, going nowhere, 4 s), real help is offered once (ui.offer): the way shown again, the car put
// back on the road (WAGMI.recoverCar), the checkpoint restarted (a mission running). gps.stallNote = [from, text]: one
// gentle line sent with the first offer (the contact's), then never again for that objective.
const YELLOW = '#FFC93C', BLUE = '#6CB8FF', RED = '#EF4444', GREEN = '#4ADE80', PURPLE = '#C77DFF', HALO = 'rgba(8, 11, 15, 0.9)';
const FOOT_LINE = 150; // m: on foot and this close, the route is the straight line to it

export function createGPS(W) {
  const app = W.app, ms = app.mapSystem, cm = app.controllerManager, net = app.trafficSystem.network;
  const edges = net.edges;
  const endOf = (e) => [e.sx + e.dx * e.len, e.sz + e.dz * e.len];
  // the nearest lane edge to (x, z), favouring one that runs the way `h` faces: across it (a cross street's lane met in
  // the middle of a junction, where the avenue's own lanes are 17 m off) counts as 20 m further off, against it as 40
  // (so driving straight through a junction it stays on the avenue ahead and never routes round the block)
  function nearest(x, z, h = null) {
    let best = null, bs = Infinity;
    for (const e of edges) {
      const s = Math.max(0, Math.min(e.len, (x - e.sx) * e.dx + (z - e.sz) * e.dz));
      const d = Math.hypot(e.sx + e.dx * s - x, e.sz + e.dz * s - z);
      const score = d + (h != null ? (1 - (Math.sin(h) * e.dx + Math.cos(h) * e.dz)) * 20 : 0);
      if (score < bs) { bs = score; best = { e, s, d }; }
    }
    return best;
  }
  // A* from edge to edge: g = metres to the end of an edge
  function plan(from, to, h) {
    const A = nearest(from.x, from.z, h), Bn = nearest(to.x, to.z);
    if (!A || !Bn) return null;
    const P = (e, s) => [e.sx + e.dx * s, e.sz + e.dz * s];
    if (A.e === Bn.e && Bn.s >= A.s) return [[from.x, from.z], P(A.e, A.s), P(Bn.e, Bn.s), [to.x, to.z]];
    const g = new Map([[A.e, A.e.len - A.s]]), came = new Map(), closed = new Set();
    const heap = [];
    const hcost = (e) => { const [ex, ez] = endOf(e); return Math.hypot(ex - to.x, ez - to.z); };
    const push = (e, f) => { heap.push([f, e]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    push(A.e, g.get(A.e) + hcost(A.e));
    let found = null, n = 0;
    while (heap.length && n++ < 20000) {
      const [, e] = pop(); if (closed.has(e)) continue; closed.add(e);
      if (e === Bn.e && e !== A.e) { found = e; break; }
      const [ex, ez] = endOf(e);
      for (const m of e.moves) {
        const f = m.to; if (!f || closed.has(f)) continue;
        // (a turn costs as much as 40 m of straight road: the route keeps to the long avenues, as a driver would)
        const ng = g.get(e) + Math.hypot(f.sx - ex, f.sz - ez) + f.len + (m.turn && m.turn !== 'S' ? 40 : 0);
        if (ng < (g.get(f) ?? Infinity)) { g.set(f, ng); came.set(f, e); push(f, ng + hcost(f)); }
      }
    }
    if (!found) return null;
    const chain = []; for (let e = found; e; e = came.get(e)) chain.unshift(e);
    const pts = [[from.x, from.z], P(A.e, A.s), endOf(A.e)];
    for (let i = 1; i < chain.length; i++) { const e = chain[i]; pts.push([e.sx, e.sz]); pts.push(i === chain.length - 1 ? P(e, Bn.s) : endOf(e)); }
    pts.push([to.x, to.z]);
    return pts;
  }
  const offRoute = (x, z, pts) => {
    let best = Infinity;
    for (let i = pts.length > 2 ? 2 : 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
      const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
      best = Math.min(best, Math.hypot(ax + dx * k - x, az + dz * k - z));
    }
    return best;
  };
  const lengthOf = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  // the route on from (x, z): from the nearest point on its first 300 m, the part behind him dropped
  // (pts[0] is always where he was: the route proper starts at pts[1])
  const onFrom = (pts, x, z) => {
    if (pts.length < 3) return [[x, z], pts[pts.length - 1]];
    let bi = 2, bd = Infinity, bk = 0, run = 0;
    for (let i = 2; i < pts.length && run < 300; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
      const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)), d = Math.hypot(ax + dx * k - x, az + dz * k - z);
      if (d < bd) { bd = d; bi = i; bk = k; }
      run += Math.sqrt(L);
    }
    const [ax, az] = pts[bi - 1], [bx, bz] = pts[bi];
    return [[x, z], [ax + (bx - ax) * bk, az + (bz - az) * bk], ...pts.slice(bi)];
  };

  const blips = new Map();
  const now = () => (W.clock ? W.clock.now() : performance.now());
  const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
  // where the route goes now: the player's own waypoint, else the objective's target (a moving one read afresh)
  const target = () => gps.user || (gps.dest && (gps.dest.follow ? gps.dest.follow() : gps.dest)) || null;
  const named = (t) => (t ? { x: t.x, z: t.z, name: t.name || '' } : null);
  const gps = {
    dest: null, user: null, route: null, length: 0, lastPlan: 0, waypoints: null, _to: null,
    // a destination; via: authored waypoints the route goes through in turn (shore highways are not in the graph)
    set(dest, via = null) { gps.to(dest); gps.waypoints = via; gps.blip('dest', { x: dest.x, z: dest.z, kind: 'dest', edge: true, name: dest.name }); },
    // the route's target alone (the objective changed: the player's own waypoint gives way to it)
    to(t) {
      const same = t && gps.dest && !t.follow && !gps.dest.follow && dist(t, gps.dest) < 1;
      gps.dest = t || null; gps.route = null; gps.lastPlan = 0; gps._to = null;
      if (!same) stall.reset(true);
      if (gps.user) { gps.user = null; ms.userWaypoint = null; gps.unblip('user'); }
      if (!t) { gps.length = 0; ms.waypoint = null; return; }
      const p = t.follow ? t.follow() : t;
      ms.waypoint = p ? { x: p.x, z: p.z, name: t.name || '' } : null;
      gps.update(true);
    },
    clear() { gps.to(null); gps.unblip('dest'); },
    // the objective and its route together (the rule: a new objective, a new route)
    objective(parts, t = null, { blip = true, secs } = {}) {
      W.ui?.objective(parts, secs);
      gps.unblip('dest');
      gps.to(t);
      if (t && !t.follow && blip) gps.blip('dest', { x: t.x, z: t.z, kind: 'dest', edge: true, name: t.name });
    },
    // the player's own waypoint (null takes it away): the route goes there until he does
    setUser(wp) {
      gps.user = wp ? { x: wp.x, z: wp.z, name: wp.name || 'Waypoint' } : null;
      ms.userWaypoint = gps.user;
      gps.route = null; gps.lastPlan = 0; gps._to = null;
      if (gps.user) gps.blip('user', { x: gps.user.x, z: gps.user.z, kind: 'waypoint', edge: true, name: gps.user.name });
      else gps.unblip('user');
      ms.waypoint = named(target());
      gps.update(true);
    },
    blip(id, b) { blips.set(id, { ...blips.get(id), ...b, born: blips.get(id)?.born ?? performance.now() }); },
    unblip(id) { blips.delete(id); },
    get blips() { return blips; },
    update(force = false) {
      const ent = cm.getActiveEntity(), p = ent.position, t0 = performance.now();
      // (there: the player's own waypoint goes, the objective's route comes back)
      if (gps.user && dist(p, gps.user) < 20) { gps.setUser(null); return; }
      const t = target();
      if (!t) { gps.route = null; gps.length = 0; stall.reset(); return; }
      // (headway only counts toward a place that stays put: a car he's chasing comes and goes; a stuck car, any time)
      if (!force) stall.step(!!gps.user || !!(gps.dest && (!gps.dest.follow || gps.dest.still)));
      // (a target on the move, a car he's chasing: planned again as it goes, a few times a second at most)
      const moved = gps._to && dist(t, gps._to) > 8 && t0 - gps.lastPlan > 350;
      if (force || moved || !gps.route || t0 - gps.lastPlan > 1000 || offRoute(p.x, p.z, gps.route) > 25) {
        gps.lastPlan = t0; gps._to = { x: t.x, z: t.z };
        const foot = cm.activeMode !== 'car';
        const r = foot && dist(p, t) < FOOT_LINE ? null : plan({ x: p.x, z: p.z }, t, foot ? null : ent.heading);
        // (still on the route it had, a new plan much longer is not taken: crossing a junction straight on, a cross
        // street's lane can look like the way he is going for a moment, and the line must not flick round a block)
        const old = !force && !moved && r && gps.route && gps.route.length > 2 && offRoute(p.x, p.z, gps.route) < 10 ? onFrom(gps.route, p.x, p.z) : null;
        gps.route = old && lengthOf(r) > lengthOf(old) + 120 ? old : r || [[p.x, p.z], [t.x, t.z]];
        gps.length = lengthOf(gps.route);
      } else if (gps.route) { gps.route = onFrom(gps.route, p.x, p.z); gps.route[gps.route.length - 1] = [t.x, t.z]; gps.length = lengthOf(gps.route); }
    },
    // a 'drive there' objective, the GTA way (see the top)
    drive({ dest, objective, back = ['Get back in your ', { car: 'blue' }, '.'], onFoot = 150, grace = 2.5 }) {
      const car = W.car, ui = W.ui;
      const carTarget = { follow: () => car.position, name: car.label || "Quant's car" };
      let state = 'drive', outAt = 0, live = true;
      const apply = (s) => {
        const was = state; state = s;
        // (between driving and walking the objective and the route stay as they are: a waypoint of his own too)
        if (s === 'back') { gps.to(carTarget); ui?.objective(back); }
        else if (was === 'back') { gps.to(dest); ui?.objective(objective); }
        if (s === 'drive') gps.unblip('car');
      };
      gps.set(dest); ui?.objective(objective);
      return {
        get state() { return state; },
        step() {
          if (!live) return;
          const inCar = cm.activeMode === 'car', p = cm.getActiveEntity().position, t = now();
          let want = state;
          if (inCar) { outAt = 0; want = 'drive'; }
          else {
            if (!outAt) outAt = t;
            const d = dist(p, dest);
            if (state === 'walk' ? d < onFoot * 1.25 : d < onFoot) want = 'walk';
            else if (t - outAt > grace * 1000) want = 'back';
            else if (state === 'walk') want = 'back';
          }
          if (want !== state) apply(want);
          if (state !== 'drive') gps.blip('car', { x: car.position.x, z: car.position.z, kind: 'car', edge: true, name: carTarget.name });
        },
        stop() { live = false; gps.unblip('car'); },
      };
    },
    plan,
  };
  // the stall watch (see the top): headway is the route getting shorter; the time is play time (the clock stops in the
  // pause menu, and a cutscene starts it over)
  const stall = (() => {
    let best = Infinity, since = 0, stuckT = 0, lastT = 0, offered = false, noted = false;
    const S = {
      reset(all = false) { best = Infinity; since = now(); stuckT = 0; if (all) { offered = false; noted = false; } },
      step(still = true) {
        const t = now(), dt = Math.min(0.1, Math.max(0, (t - (lastT || t)) / 1000)); lastT = t;
        if (W.cutscene || W.paused || document.body.classList.contains('wg-cine')) { since = t; stuckT = 0; return; }
        if (!since) since = t;
        const L = gps.length || Infinity;
        if (!still || L < best - 25 || L < 40) { best = Math.min(best, L); since = t; }
        const car = W.car, k = cm.keys || {}, inCar = cm.activeMode === 'car';
        // (stuck: the car's own signal when it has one, the one its 'X · Reset car to road' prompt uses: the pedal held,
        // the car going nowhere; else the pedal down with it stood still)
        if (W.carStuck) stuckT = inCar ? W.carStuck() : 0;
        else stuckT = inCar && (k.forward || k.backward) && Math.abs(car?.speed || 0) < 1.2 ? stuckT + dt : Math.max(0, stuckT - dt * 2);
        if (offered) return;
        if (t - since > 50000) S.offer('lost');
        else if (stuckT > 4 && W.recoverCar) S.offer('stuck');
      },
      // the help itself: what fits him now
      offer(why) {
        const ui = W.ui; if (!ui?.offer) return;
        offered = true;
        const inCar = cm.activeMode === 'car', M = W.missions?.active?.(), opts = [];
        if (why === 'lost' || !inCar) opts.push({ key: '1', label: ['Show me the way (the ', { 'yellow line': 'yellow' }, ')'], run: () => S.showWay() });
        if (inCar && W.recoverCar) opts.push({ key: String(opts.length + 1), label: 'Put my car back on the road', run: () => { W.recoverCar?.(); S.reset(); } });
        if (M && W.ui?.pause?.restartCurrent) opts.push({ key: String(opts.length + 1), label: 'Restart the checkpoint', run: () => W.ui.pause.restartCurrent() });
        if (!opts.length) return;
        ui.offer({ title: why === 'stuck' ? 'Stuck?' : 'Need a hand?', note: why === 'stuck' ? 'The car is going nowhere.' : null, options: opts });
        if (!noted && gps.stallNote && why === 'lost') { noted = true; const [from, text] = gps.stallNote; W.sfx?.play?.('buzz', { gain: 0.14, times: 1 }); W.audio?.play?.('phoneBuzz'); ui.dm(from, text, 8); }
      },
      // the way, again: his own waypoint away, the route planned afresh, the objective's line up, the place's blip pulsing
      showWay() {
        if (gps.user) gps.setUser(null);
        gps.update(true);
        const r = W.ui?.recent?.();
        if (r?.objective && W.ui) { const el = document.querySelector('#wg .wg-obj'); if (el) { el.innerHTML = r.objective; el.classList.remove('hide'); setTimeout(() => el.classList.add('hide'), 7000); } }
        for (const [id, b] of blips) if (b.kind === 'dest' || b.kind === 'letter' || b.kind === 'waypoint') blips.set(id, { ...b, born: performance.now(), pulse: 8 });
        W.ui?.brief?.(true);
        S.reset();
      },
      get offered() { return offered; },
    };
    return S;
  })();
  gps.stall = stall; gps.stallNote = null;
  // the player's own waypoint comes from the full map (a click, or 'Set waypoint' on a search hit)
  ms.onWaypoint = (wp) => gps.setUser(wp);
  // the full map's search finds the mission's named places: the route's place and every named blip (once each: the
  // place a letter blip stands on is the same place); a search finds them by their second name too (mapSystem)
  ms.searchExtra = () => {
    const out = [];
    const add = (name, x, z, sub) => {
      if (!name) return;
      const [n, s2] = String(name).split(' · ');
      if (out.some((o) => o.name === n && Math.hypot(o.x - x, o.z - z) < 30)) return;
      out.push({ name: n, sub: s2 || sub || 'Mission', x, z, kind: 'Mission' });
    };
    if (gps.dest && !gps.dest.follow) add(gps.dest.name, gps.dest.x, gps.dest.z);
    for (const b of blips.values()) {
      if (b.kind === 'waypoint' || b.kind === 'enemy') continue;
      add(b.name || (b.kind === 'letter' ? `Mission ${b.letter}` : ''), b.x, b.z, b.kind === 'letter' ? 'A new mission' : '');
    }
    return out;
  };

  /* --------------------------------------------------------- the drawing -- */
  function drawRoute(ctx, toX, toY, width) {
    if (!gps.route) return;
    const col = gps.user ? PURPLE : YELLOW;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); gps.route.forEach(([x, z], i) => (i ? ctx.lineTo(toX(x), toY(z)) : ctx.moveTo(toX(x), toY(z))));
    ctx.strokeStyle = HALO; ctx.lineWidth = width + 3; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = width; ctx.stroke();
  }
  function drawBlip(ctx, x, y, b, r, t) {
    const pulse = b.pulse && (performance.now() - b.born) / 1000 < b.pulse;
    if (pulse) { const k = (t % 1100) / 1100; ctx.fillStyle = `rgba(255, 201, 60, ${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y, r + 4 + k * 12, 0, Math.PI * 2); ctx.fill(); }
    const disc = (c, rr = r) => { ctx.fillStyle = HALO; ctx.beginPath(); ctx.arc(x, y, rr + 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); };
    switch (b.kind) {
      case 'dest': disc(YELLOW); ctx.fillStyle = HALO; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill(); break;
      case 'enemy': disc(RED, r * 0.6); break;
      case 'friend': disc(BLUE, r * 0.7); break;
      case 'object': disc(GREEN, r * 0.7); break;
      case 'car': {
        disc(BLUE, r);
        ctx.fillStyle = '#0B1220'; ctx.fillRect(x - r * 0.55, y - r * 0.18, r * 1.1, r * 0.42); ctx.fillRect(x - r * 0.32, y - r * 0.42, r * 0.64, r * 0.3);
        break;
      }
      case 'paw': {
        disc(BLUE, r);
        ctx.fillStyle = '#0B1220'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.2, r * 0.32, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
        for (const [dx, dy] of [[-0.42, -0.2], [-0.15, -0.45], [0.15, -0.45], [0.42, -0.2]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * 0.13, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      // the player's own waypoint: GTA's purple flag
      case 'waypoint': {
        disc(PURPLE, r);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.32, y - r * 0.55, r * 0.14, r * 1.1);
        ctx.beginPath(); ctx.moveTo(x - r * 0.2, y - r * 0.55); ctx.lineTo(x + r * 0.5, y - r * 0.32); ctx.lineTo(x - r * 0.2, y - r * 0.08); ctx.closePath(); ctx.fill();
        break;
      }
      case 'letter': {
        disc(YELLOW, r * 1.15);
        ctx.fillStyle = '#0B0D12'; ctx.font = `800 ${Math.round(r * 1.5)}px "Barlow Condensed", system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.letter || '?', x, y + 1); ctx.textBaseline = 'alphabetic';
        break;
      }
    }
  }
  function drawArrow(ctx, heading, tipY, halfWidth, tailY) {
    ctx.save(); ctx.rotate(-heading + Math.PI);
    ctx.beginPath(); ctx.moveTo(0, tipY); ctx.lineTo(halfWidth, tailY); ctx.lineTo(0, tailY * 0.45); ctx.lineTo(-halfWidth, tailY); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = HALO; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }
  // the radar: after the city's layers, the route, the blips (mission ones held at its edge), the arrow again on top.
  // On foot in a mission it zooms in (a car parked 20 m off is a blip of its own, not one under the arrow); it eases
  // back out in the car. (The city's radar eases its own scale 8% a frame toward its target: set ahead of it so it
  // lands where ours is.)
  const miniOrig = ms.renderMinimap.bind(ms);
  const GROUND = ms.miniScale || 0.32, FOOT = 1.0;
  let zoom = GROUND;
  ms.renderMinimap = function () {
    const wp = ms.waypoint; if (gps.dest || gps.user || blips.size) ms.waypoint = null;
    const ground = (cm.getActiveEntity().position.y || 0) < 25;
    if (ground && (gps.dest || gps.user || blips.size)) {
      zoom += ((cm.activeMode === 'person' ? FOOT : GROUND) - zoom) * 0.06;
      ms.miniScale = (zoom - 0.08 * GROUND) / 0.92;
    } else zoom = ms.miniScale;
    miniOrig(); ms.waypoint = wp;
    if (!gps.dest && !gps.user && !blips.size) return;
    const cv = ms.miniCanvas, ctx = ms.miniCtx; if (!cv || !ctx || !cv.offsetParent) return;
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), s = ms.miniScale;
    const ent = cm.getActiveEntity(), px = ent.position.x, pz = ent.position.z, t = performance.now();
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, dpr * w * 0.5, dpr * h * 0.5);
    const toX = (x) => (x - px) * s, toY = (z) => (z - pz) * s;
    drawRoute(ctx, toX, toY, 3);
    const mx = w * 0.5 - 9, my = h * 0.5 - 9;
    for (const b of blips.values()) {
      let x = toX(b.x), y = toY(b.z);
      const out = Math.abs(x) > mx || Math.abs(y) > my;
      if (out) { if (!b.edge) continue; const k = Math.min(mx / Math.abs(x || 1e-6), my / Math.abs(y || 1e-6)); x *= k; y *= k; }
      drawBlip(ctx, x, y, b, b.kind === 'enemy' ? 5 : 6, t);
    }
    drawArrow(ctx, ent.heading, -9, 6.5, 7);
    // the distance to go, under it all
    if ((gps.dest || gps.user) && gps.length) {
      const mi = gps.length / 1609.34, txt = mi >= 0.1 ? `${mi.toFixed(mi < 10 ? 2 : 1)} mi` : `${Math.round(gps.length)} m`;
      ctx.font = '700 12px "Barlow Condensed", system-ui'; ctx.textAlign = 'center';
      const tw = ctx.measureText(txt).width + 12;
      ctx.fillStyle = 'rgba(8, 10, 14, 0.75)'; ctx.fillRect(-tw / 2, h * 0.5 - 22, tw, 16);
      ctx.fillStyle = gps.user ? PURPLE : YELLOW; ctx.fillText(txt, 0, h * 0.5 - 10);
    }
    ctx.restore();
  };
  // the full map
  const fullOrig = ms.renderFullMap.bind(ms);
  ms.renderFullMap = function () {
    const wp = ms.waypoint; if (gps.dest || gps.user || blips.size) ms.waypoint = null;
    fullOrig(); ms.waypoint = wp;
    if ((!gps.dest && !gps.user && !blips.size) || !ms.isFullMapOpen || !ms.fullCtx) return;
    const ctx = ms.fullCtx, dpr = ms.fullDpr || 1, { w, h } = ms.fullSize(), s = ms.viewZoom, cx = ms.viewCenterX, cz = ms.viewCenterZ;
    const ent = cm.getActiveEntity(), t = performance.now();
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, dpr * w * 0.5, dpr * h * 0.5);
    const toX = (x) => (x - cx) * s, toY = (z) => (z - cz) * s;
    drawRoute(ctx, toX, toY, 4);
    for (const b of blips.values()) drawBlip(ctx, toX(b.x), toY(b.z), b, 8, t);
    ctx.translate(toX(ent.position.x), toY(ent.position.z)); drawArrow(ctx, ent.heading, -11, 7.5, 8);
    ctx.restore();
  };
  return gps;
}
