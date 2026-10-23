// WAGMI City: the chase on screen. The HEAT meter top-right, where GTA keeps its stars: five slots, the heat lit (the
// Degens' skulls in acid green, the police's stars in white); seen, they glow and the radar's rim pulses (acid green,
// or the police's red and blue); out of sight they blink, and out of the search circle they blink fast and go out one
// by one as the escape runs down. On the radar (over the city's, under the GPS's route and blips): the search circle
// round where they last saw him (shrinking as the escape runs down) and a red blip for each car after him.
//   const hud = createHud(W);  hud.show(chase) / hud.show(null);  (it reads chase.view() every frame)
const ACID = '#B6FF3B', RED = '#EF4444', BLUE = '#6CB8FF', HALO = 'rgba(8, 11, 15, 0.9)';
const SKULL = `<svg viewBox="0 0 24 24"><path d="M12 2.2c-5 0-8.6 3.4-8.6 8.1 0 2.7 1.2 4.6 2.9 5.8v2.6c0 .9.7 1.6 1.6 1.6h.9v-2.1h1.5v2.1h3.4v-2.1h1.5v2.1h.9c.9 0 1.6-.7 1.6-1.6v-2.6c1.7-1.2 2.9-3.1 2.9-5.8 0-4.7-3.6-8.1-8.6-8.1zM8.3 14.1a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zm7.4 0a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zM12 15.2l1.1 2h-2.2l1.1-2z"/></svg>`;
const STAR = `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.4l-6.1 3.4 1.4-6.7-5-4.6 6.8-.8z"/></svg>`;
const CSS = `
#wg-heat { position: fixed; top: 22px; right: 28px; z-index: 30; pointer-events: none; display: flex; align-items: center; gap: 2px; opacity: 0; transform: translateY(-6px); transition: opacity .35s, transform .35s; font-family: 'Barlow Condensed', system-ui, sans-serif; }
#wg-heat.on { opacity: 1; transform: none; }
#wg-heat .lab { font: 700 12px/1 'Barlow Condensed'; letter-spacing: 3px; color: rgba(255,255,255,.8); margin-right: 8px; text-shadow: 0 1px 2px rgba(0,0,0,.85), 0 2px 10px rgba(0,0,0,.55); }
#wg-heat .p { width: 30px; height: 30px; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.9)) drop-shadow(0 2px 6px rgba(0,0,0,.45)); transition: opacity .2s, transform .2s; }
#wg-heat .p svg { width: 100%; height: 100%; display: block; }
#wg-heat .p svg path { fill: rgba(255,255,255,.14); stroke: rgba(255,255,255,.38); stroke-width: 1.1; }
#wg-heat.degens .p.lit svg path { fill: ${ACID}; stroke: #1A2408; stroke-width: .8; }
#wg-heat.police .p.lit svg path { fill: #FFFFFF; stroke: #20242B; stroke-width: .8; }
#wg-heat.seen.degens .p.lit { filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.9)) drop-shadow(0 0 7px rgba(182,255,59,.75)); }
#wg-heat.seen.police .p.lit { filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.9)) drop-shadow(0 0 7px rgba(255,255,255,.6)); }
#wg-heat.hid .p.lit { animation: wgHeatBlink 1.1s steps(1) infinite; }
#wg-heat.esc .p.lit { animation: wgHeatBlink .42s steps(1) infinite; }
#wg-heat .p.pop { transform: scale(1.35); }
#wg-heat .msg { position: absolute; right: 0; top: 38px; white-space: nowrap; font: italic 800 22px/1 'Barlow Condensed'; letter-spacing: 1px; text-transform: uppercase; color: #fff; opacity: 0; transition: opacity .3s; text-shadow: 0 1px 2px rgba(0,0,0,.85), 0 2px 10px rgba(0,0,0,.55); }
#wg-heat .msg.on { opacity: 1; }
@keyframes wgHeatBlink { 0% { opacity: 1; } 50% { opacity: .18; } }
body.wg-cine #wg-heat { opacity: 0 !important; }
@media (max-width: 640px) { #wg-heat { top: 70px; right: 16px; } #wg-heat .p { width: 24px; height: 24px; } }`;

export function createHud(W) {
  const app = W.app, ms = app.mapSystem, cm = app.controllerManager;
  if (!document.getElementById('wg-heat-css')) { const st = document.createElement('style'); st.id = 'wg-heat-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'wg-heat';
  el.innerHTML = `<span class="lab">HEAT</span>${'<span class="p"></span>'.repeat(5)}<div class="msg"></div>`;
  document.body.appendChild(el);
  const pips = [...el.querySelectorAll('.p')], msg = el.querySelector('.msg');
  let chase = null, kind = '', lit = -1, cls = '', msgT = 0;
  function show(c) {
    chase = c;
    if (!c) { el.classList.remove('on'); return; }
    if (kind !== c.kind) { kind = c.kind; for (const p of pips) p.innerHTML = kind === 'police' ? STAR : SKULL; }
    el.classList.remove('degens', 'police'); el.classList.add(kind === 'police' ? 'police' : 'degens', 'on');
    lit = -1;
  }
  function say(text, secs = 2.5) { msg.textContent = text; msg.classList.add('on'); msgT = secs; }
  // (beside the toolbar top-right while it shows, story mode's Map and Pause: the line under it is the street's 'hit and
  // run' note and the DM card's; under the sandbox's wide one)
  function place() {
    const tb = document.querySelector('.hud-top-right');
    let r = null;
    if (tb) { const s = getComputedStyle(tb), b = tb.getBoundingClientRect(); if (s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && b.height > 0 && b.width > 0) r = b; }
    if (!r) { el.style.top = el.style.right = ''; return; }
    if (r.width < innerWidth * 0.4) { el.style.top = `${Math.round(r.top + (r.height - el.offsetHeight) / 2)}px`; el.style.right = `${Math.round(innerWidth - r.left + 14)}px`; }
    // (under the sandbox's wide one, and under the street's 'hit and run' note there too: it sits at 96-132 px)
    else { el.style.top = `${Math.round(Math.max(r.bottom + 12, 140))}px`; el.style.right = ''; }
  }
  let placeT = 0;
  function frame(dt) {
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) msg.classList.remove('on'); }
    if (!chase) return;
    if ((placeT -= dt) <= 0) { placeT = 1; place(); }
    const v = chase.view();
    // (over: the pips out and the line under them a moment, then away)
    if (!v.on) {
      el.classList.remove('seen', 'hid', 'esc'); cls = '';
      if (lit !== 0) { lit = 0; for (const p of pips) p.classList.remove('lit'); }
      if (msgT <= 0) el.classList.remove('on');
      return;
    }
    if (v.pips !== lit) { const was = lit; lit = v.pips; pips.forEach((p, i) => { p.classList.toggle('lit', i < lit); if (was >= 0 && i === lit - 1 && lit > was) { p.classList.add('pop'); setTimeout(() => p.classList.remove('pop'), 220); } }); }
    const c = v.seen ? 'seen' : v.escaping ? 'esc' : 'hid';
    if (c !== cls) { el.classList.remove('seen', 'hid', 'esc'); el.classList.add(c); cls = c; }
  }

  /* -------------------------------------------------------------- the radar -- */
  // round the city's radar (whoever wraps it later, the GPS, draws over this)
  const orig = ms.renderMinimap.bind(ms);
  ms.renderMinimap = function () {
    orig();
    if (!chase) return;
    const v = chase.view(); if (!v.on && !v.cars.length) return;
    const cv = ms.miniCanvas, ctx = ms.miniCtx; if (!cv || !ctx || !cv.offsetParent || document.body.classList.contains('hud-minimized')) return;
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), s = ms.miniScale;
    const ent = cm.getActiveEntity(), px = ent.position.x, pz = ent.position.z, t = performance.now();
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, dpr * w * 0.5, dpr * h * 0.5);
    const toX = (x) => (x - px) * s, toY = (z) => (z - pz) * s;
    const police = v.kind === 'police', flip = Math.floor(t / 260) % 2;
    // the search circle
    if (v.on && v.circle) {
      const { x, z, r } = v.circle, cx = toX(x), cy = toY(z), rr = Math.max(0, r * s);
      const col = police ? (flip ? '239, 68, 68' : '108, 184, 255') : '182, 255, 59';
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col}, ${v.seen ? 0.16 : 0.1})`; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${col}, ${v.seen ? 0.85 : 0.6})`;
      if (!v.seen) ctx.setLineDash([6, 5]);
      ctx.stroke(); ctx.setLineDash([]);
    }
    // the cars after him: red (the police's flashing red and blue), held at the radar's edge when off it
    const mx = w * 0.5 - 7, my = h * 0.5 - 7;
    for (const c of v.cars) {
      let x = toX(c.x), y = toY(c.z);
      const out = Math.abs(x) > mx || Math.abs(y) > my;
      if (out) { const k = Math.min(mx / Math.abs(x || 1e-6), my / Math.abs(y || 1e-6)); x *= k; y *= k; }
      const r = out ? 3.4 : 4.6, colr = c.wrecked ? 'rgba(160, 160, 160, 0.9)' : police ? (flip ^ (c.i & 1) ? RED : BLUE) : RED;
      ctx.fillStyle = HALO; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // the rim, pulsing while they see him
    if (v.on && v.seen) {
      const k = 0.5 + 0.5 * Math.sin(t / 1000 * Math.PI * 2 * 1.6);
      const col = police ? (flip ? `rgba(239, 68, 68, ${0.45 + 0.45 * k})` : `rgba(108, 184, 255, ${0.45 + 0.45 * k})`) : `rgba(182, 255, 59, ${0.35 + 0.5 * k})`;
      ctx.lineWidth = 3 + 2 * k; ctx.strokeStyle = col;
      const x0 = -w / 2 + 1.5, y0 = -h / 2 + 1.5, ww = w - 3, hh = h - 3, rad = 16;
      ctx.beginPath(); ctx.moveTo(x0 + rad, y0); ctx.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, rad); ctx.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, rad); ctx.arcTo(x0, y0 + hh, x0, y0, rad); ctx.arcTo(x0, y0, x0 + ww, y0, rad); ctx.closePath(); ctx.stroke();
    }
    // (his arrow again on top, as the city draws it)
    ctx.rotate(-ent.heading + Math.PI);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6.5, 7); ctx.lineTo(0, 7 * 0.45); ctx.lineTo(-6.5, 7); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = HALO; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  };
  return { show, frame, say, el };
}
