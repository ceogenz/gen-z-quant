// WAGMI City: the GPS and the mission blips. The quickest legal route is an A* search over the traffic's road graph
// (__NYC_APP.trafficSystem.network: lane edges joined by the turns the graph allows, so one-way streets are kept),
// edge to edge, re-planned every second and whenever the player strays 25 m off it. The route (yellow on a dark casing),
// the destination and the blips are drawn on the radar and the full map over the city's own layers, in place of its
// L-shaped line (mapSystem.waypoint still names the destination).
//   const gps = createGPS(W);  gps.set({ x, z, name });  gps.clear();
//   gps.blip(id, { x, z, kind: 'dest' | 'car' | 'enemy' | 'friend' | 'object' | 'letter' | 'paw', letter, pulse, edge });
//   gps.unblip(id);  gps.update() (every frame; the radar asks for it itself)
const YELLOW = '#FFC93C', BLUE = '#6CB8FF', RED = '#EF4444', GREEN = '#4ADE80', HALO = 'rgba(8, 11, 15, 0.9)';

export function createGPS(W) {
  const app = W.app, ms = app.mapSystem, cm = app.controllerManager, net = app.trafficSystem.network;
  const edges = net.edges;
  const endOf = (e) => [e.sx + e.dx * e.len, e.sz + e.dz * e.len];
  // the nearest lane edge to (x, z), favouring one that runs the way `h` faces
  function nearest(x, z, h = null) {
    let best = null, bs = Infinity;
    for (const e of edges) {
      const s = Math.max(0, Math.min(e.len, (x - e.sx) * e.dx + (z - e.sz) * e.dz));
      const d = Math.hypot(e.sx + e.dx * s - x, e.sz + e.dz * s - z);
      const score = d + (h != null && Math.sin(h) * e.dx + Math.cos(h) * e.dz < -0.3 ? 6 : 0);
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
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
      const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
      best = Math.min(best, Math.hypot(ax + dx * k - x, az + dz * k - z));
    }
    return best;
  };
  const lengthOf = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };

  const blips = new Map();
  const gps = {
    dest: null, route: null, length: 0, lastPlan: 0, waypoints: null,
    // a destination; via: authored waypoints the route goes through in turn (shore highways are not in the graph)
    set(dest, via = null) { gps.dest = dest; gps.waypoints = via; gps.route = null; gps.lastPlan = 0; ms.waypoint = { x: dest.x, z: dest.z, name: dest.name || '' }; gps.blip('dest', { x: dest.x, z: dest.z, kind: 'dest', edge: true }); gps.update(true); },
    clear() { gps.dest = null; gps.route = null; gps.unblip('dest'); },
    blip(id, b) { blips.set(id, { ...blips.get(id), ...b, born: blips.get(id)?.born ?? performance.now() }); },
    unblip(id) { blips.delete(id); },
    get blips() { return blips; },
    update(force = false) {
      if (!gps.dest) return;
      const ent = cm.getActiveEntity(), now = performance.now();
      const p = ent.position;
      if (force || !gps.route || now - gps.lastPlan > 1000 || offRoute(p.x, p.z, gps.route) > 25) {
        gps.lastPlan = now;
        const r = plan({ x: p.x, z: p.z }, gps.dest, ent.heading);
        gps.route = r || [[p.x, p.z], [gps.dest.x, gps.dest.z]];
        gps.length = lengthOf(gps.route);
      } else if (gps.route) { gps.route[0] = [p.x, p.z]; }
    },
    plan,
  };

  /* --------------------------------------------------------- the drawing -- */
  function drawRoute(ctx, toX, toY, width) {
    if (!gps.route) return;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); gps.route.forEach(([x, z], i) => (i ? ctx.lineTo(toX(x), toY(z)) : ctx.moveTo(toX(x), toY(z))));
    ctx.strokeStyle = HALO; ctx.lineWidth = width + 3; ctx.stroke();
    ctx.strokeStyle = YELLOW; ctx.lineWidth = width; ctx.stroke();
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
    const wp = ms.waypoint; if (gps.dest || blips.size) ms.waypoint = null;
    const ground = (cm.getActiveEntity().position.y || 0) < 25;
    if (ground && (gps.dest || blips.size)) {
      zoom += ((cm.activeMode === 'person' ? FOOT : GROUND) - zoom) * 0.06;
      ms.miniScale = (zoom - 0.08 * GROUND) / 0.92;
    } else zoom = ms.miniScale;
    miniOrig(); ms.waypoint = wp;
    if (!gps.dest && !blips.size) return;
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
    if (gps.dest && gps.length) {
      const mi = gps.length / 1609.34, txt = mi >= 0.1 ? `${mi.toFixed(mi < 10 ? 2 : 1)} mi` : `${Math.round(gps.length)} m`;
      ctx.font = '700 12px "Barlow Condensed", system-ui'; ctx.textAlign = 'center';
      const tw = ctx.measureText(txt).width + 12;
      ctx.fillStyle = 'rgba(8, 10, 14, 0.75)'; ctx.fillRect(-tw / 2, h * 0.5 - 22, tw, 16);
      ctx.fillStyle = YELLOW; ctx.fillText(txt, 0, h * 0.5 - 10);
    }
    ctx.restore();
  };
  // the full map
  const fullOrig = ms.renderFullMap.bind(ms);
  ms.renderFullMap = function () {
    const wp = ms.waypoint; if (gps.dest || blips.size) ms.waypoint = null;
    fullOrig(); ms.waypoint = wp;
    if ((!gps.dest && !blips.size) || !ms.isFullMapOpen || !ms.fullCtx) return;
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
