// Gen Z Quant: the pause menu, GTA's. Esc (or P) in play: the city stops where it is (its frame loop held: the traffic,
// the crowd, the fight, the car; the missions' clocks with it), the sound dips, and the menu comes up: Resume, the brief
// (the objective, the last lines said, the last help), the controls, restart from a checkpoint, the sound, back to the
// title. Esc, P or Resume plays on. In a cutscene too (its clock stops with the city's; Space held still skips it); not
// at the start gate, on the fail screen, or over the full map (its own Esc closes it).
// (A pointer locked to the view for a fight lets go on the browser's own Esc, which the page never hears: that letting
// go, when the game didn't ask for it, opens the menu too.)
// B, any time in play: the brief (the tracker over the radar opened on the last lines: ui.brief).
//   W.paused              true while the menu is up
//   W.clock.now()         game time in ms: performance.now() less the time spent paused (missions time things on it)
//   W.missions            the missions 'Restart' knows: register({ id, title, act, checkpoints: [{ id, label }], active(),
//                         at(), restart(id) }): active() true while it runs, at() the checkpoint it would restart from
//                         now (the later ones are locked until reached), restart(id) starts it again from there
//   import { missions } from './pause.js';  missions(W).register({ ... })   (the same registry, made if not yet)
//   carry(W, id, keep, make)  the mission's stats (TIME, HITS...): kept through a checkpoint restart (keep), new from
//                         make() when it starts from the top
//   ui.pause.restartCurrent() the running mission from its last checkpoint (the stall help's 'Restart the checkpoint')
// In the car, with WAGMI.recoverCar (the driving track's), the menu has 'Reset car to road'.
// Credits: the music, sounds, voices and the rest (wagmi/credits.js); Enter, then ↑↓ scroll it.
import { creditsHTML } from '../credits.js';
const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function missions(W = window.WAGMI) {
  if (W.missions) return W.missions;
  const list = new Map();
  return (W.missions = {
    register(m) { list.set(m.id, m); return m; },
    unregister(id) { list.delete(id); },
    get list() { return [...list.values()]; },
    // the one running now (the newest registered first)
    active() { return [...list.values()].reverse().find((m) => { try { return !!m.active?.(); } catch { return false; } }) || null; },
  });
}
export function carry(W, id, keep, make) {
  if (keep && W._mstats?.id === id) return W._mstats.s;
  W._mstats = { id, s: make() };
  return W._mstats.s;
}

const CSS = `
#wg-pause { position: fixed; inset: 0; z-index: 60; display: none; font-family: 'Barlow Condensed', system-ui, sans-serif; color: #fff; user-select: none;
  background: linear-gradient(90deg, rgba(5,6,9,.9), rgba(5,6,9,.7) 48%, rgba(5,6,9,.45)); }
#wg-pause.on { display: block; animation: wgpIn .18s ease-out; }
@keyframes wgpIn { from { opacity: 0; } to { opacity: 1; } }
body.wg-paused .hud, body.wg-paused #wg .wg-line, body.wg-paused #wg .wg-help { opacity: 0 !important; }
#wg-pause * { box-sizing: border-box; }
#wg-pause .sh { text-shadow: 0 2px 10px rgba(0,0,0,.55), 0 1px 2px rgba(0,0,0,.85); }
#wg-pause .wrap { position: absolute; left: max(16px, 6vw); right: max(16px, 6vw); top: max(16px, 9vh); bottom: max(16px, 7vh); display: flex; gap: clamp(16px, 3vw, 44px); }
#wg-pause .side { flex: 0 0 clamp(220px, 26vw, 330px); display: flex; flex-direction: column; }
#wg-pause .hd { font: italic 800 clamp(44px, 6.4vw, 76px)/.9 'Barlow Condensed'; letter-spacing: 1px; text-transform: uppercase; }
#wg-pause .hd b { color: #FFC93C; font-weight: 800; }
#wg-pause .rule { width: 110px; height: 3px; background: #FFC93C; margin: 12px 0 18px; }
#wg-pause .mi { display: block; width: 100%; text-align: left; font: 700 clamp(18px, 2vw, 24px)/1 'Barlow Condensed'; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.82);
  background: none; border: 0; border-left: 4px solid transparent; padding: 11px 14px 10px; margin: 2px 0; border-radius: 0 10px 10px 0; cursor: pointer; }
#wg-pause .mi.sel { background: rgba(8,10,14,0.62); border-left-color: #FFC93C; color: #FFC93C; }
#wg-pause .mi:hover:not(.sel) { color: #fff; background: rgba(255,255,255,.06); }
#wg-pause .keys { margin-top: auto; font: 600 14px/1.6 'Barlow Condensed'; letter-spacing: 1px; color: rgba(255,255,255,.6); }
#wg-pause kbd { display: inline-block; min-width: 22px; padding: 0 6px; margin: 0 2px; border: 1px solid rgba(255,255,255,.55); border-radius: 5px; background: rgba(255,255,255,.12); font: 700 14px/20px 'Barlow Condensed'; text-align: center; color: #fff; }
#wg-pause .panel { flex: 1 1 auto; max-width: 640px; align-self: flex-start; max-height: 100%; overflow: auto; padding: 18px 22px 20px; background: rgba(8,10,14,0.62); border-radius: 10px; }
#wg-pause .panel.focus { box-shadow: inset 0 0 0 1px rgba(255,201,60,.45); }
#wg-pause .t { font: 700 13px/1 'Barlow Condensed'; letter-spacing: 3px; text-transform: uppercase; color: #FFC93C; margin: 0 0 8px; }
#wg-pause .t.g { color: rgba(255,255,255,.55); margin-top: 18px; }
#wg-pause .ms { font: italic 800 30px/1 'Barlow Condensed'; text-transform: uppercase; margin-bottom: 14px; }
#wg-pause .ob { font: 600 24px/1.25 'Barlow Condensed'; }
#wg-pause .ln { font: 600 18px/1.3 'Barlow Condensed'; margin: 0 0 5px; color: rgba(255,255,255,.92); }
#wg-pause .ln b { font-weight: 700; letter-spacing: .5px; margin-right: 8px; }
#wg-pause .mu { color: rgba(255,255,255,.55); font: 600 18px/1.3 'Barlow Condensed'; }
#wg-pause .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 6px 28px; }
#wg-pause .row { display: flex; justify-content: space-between; gap: 14px; font: 600 17px/1.75 'Barlow Condensed'; border-bottom: 1px solid rgba(255,255,255,.07); }
#wg-pause .row span:last-child { color: rgba(255,255,255,.7); text-align: right; }
/* the controls: what, the keyboard's, a game pad's */
#wg-pause .ctl { grid-template-columns: repeat(auto-fit, minmax(268px, 1fr)); }
#wg-pause .ctl .row { display: grid; grid-template-columns: 1fr auto 58px; align-items: center; gap: 10px; line-height: 1.25; padding: 4px 0; }
#wg-pause .ctl .row span:nth-child(2) { color: rgba(255,255,255,.7); text-align: right; }
#wg-pause .ctl .row .pd { display: flex; align-items: center; justify-content: flex-end; gap: 2px; white-space: nowrap; }
#wg-pause .ctl .row .pd i { font-style: normal; color: rgba(255,255,255,.55); font-size: 14px; margin: 0 2px; }
#wg-pause .ctl .row .pd kbd { font-size: 15px; }
#wg-pause .ctl .row.th { border-bottom: 0; line-height: 1; margin-bottom: 4px; }
#wg-pause .ctl .row.th .t { margin: 0; }
#wg-pause .ctl .row.th span:not(.t) { font: 700 11px/1 'Barlow Condensed'; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.45); }
#wg-pause .opt { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; font: 700 20px/1 'Barlow Condensed'; letter-spacing: 1px; color: #fff; background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 12px 14px; margin: 0 0 8px; cursor: pointer; }
#wg-pause .opt small { margin-left: auto; font: 600 13px/1 'Barlow Condensed'; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.5); }
#wg-pause .opt.sel { border-color: #FFC93C; background: rgba(255,201,60,.12); }
#wg-pause .opt.lock { opacity: .4; cursor: default; }
#wg-pause .opt.cur small { color: #FFC93C; }
#wg-pause .sl { display: grid; grid-template-columns: 90px 1fr 48px; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 10px; border: 1px solid transparent; font: 700 19px/1 'Barlow Condensed'; letter-spacing: 1px; }
#wg-pause .sl.sel { border-color: #FFC93C; background: rgba(255,201,60,.08); }
#wg-pause .sl .bar { position: relative; height: 8px; border-radius: 4px; background: rgba(255,255,255,.15); cursor: pointer; }
#wg-pause .sl .bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: #FFC93C; }
#wg-pause .sl .v { text-align: right; color: rgba(255,255,255,.8); }
@media (max-width: 760px) { #wg-pause .wrap { flex-direction: column; overflow: auto; } #wg-pause .side { flex: 0 0 auto; } #wg-pause .keys { display: none; } #wg-pause .mi { padding: 9px 12px 8px; }
  #wg-pause .panel { flex: 0 0 auto; align-self: stretch; max-width: none; overflow: visible; max-height: none; } }
/* the toolbar's Pause (story mode): the menu found without knowing the key, and the only way in on a phone */
#btn-pause { display: none; }
body.wg-story #btn-pause { display: inline-flex; }
body.touch-enabled .wg-track .k kbd { display: none; }
`;

// [what, the keyboard's, a game pad's] (the pad's: its buttons by their standard names, A B X Y, LB RB LT RT, LS RS
// (the sticks) L3 R3 (pressed in), Up Down Left Right (the D-pad), View, Start: drawn as the pad's own, wagmi/pad.js)
const CONTROLS = [
  ['On foot', [['Move', 'W A S D', 'LS'], ['Sprint', 'Shift', 'LT · L3'], ['Jump', 'Space', 'A'], ['Get in the car', 'F', 'Y'], ['Look round', 'drag the mouse', 'RS']]],
  ['In the car', [['Drive · brake', 'W · S', 'RT · LT'], ['Steer', 'A · D', 'LS'], ['Boost', 'Shift', 'X'], ['Get out', 'F (slow down first)', 'Y'], ['Reset car to road', 'recover', 'B'], ['Electric / Engine', 'Q', 'Up'], ['Thrusters: hop', 'Space', 'A'], ['Thrusters: dash left · right', 'Z · C', 'LB · RB'], ['Next station', 'R', 'Right'], ['Station back', '', 'Left'], ['Radio off / on', 'T', 'Down'], ['Look round', 'drag the mouse', 'RS']]],
  ['Fighting', [['Strike', 'Left click · J', 'X'], ['Heavy', 'Right click · K', 'Y'], ['Counter (on the cue)', 'Q · L', 'LB'], ['Dodge', 'C · Space', 'B'], ['Grab · pick up · throw', 'E', 'RB'], ['Lock the mouse to the view', 'click in a fight', '']]],
  ['Anywhere', [['Map', 'M', 'View'], ['Brief: the objective, the last lines', 'B', 'R3'], ['Pause', 'Esc · P', 'Start'], ['Skip a cutscene', 'hold Space', 'hold A'], ['Menus: choose · OK · back', '↑ ↓ · Enter · Esc', 'Up Down · A · B'], ['Need a hand? options', '1 · 2 · 3', 'Up · Right · Down']]],
];
// (a pad's column: its buttons drawn, the words between them as they are)
const PAD_IDS = new Set(['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'LS', 'RS', 'L3', 'R3', 'Up', 'Down', 'Left', 'Right', 'View', 'Start']);
const padCol = (s) => (s ? s.split(' ').map((t) => (PAD_IDS.has(t) ? (window.WAGMI?.pad?.glyph?.(t) || `<kbd>${esc(t)}</kbd>`) : `<i>${esc(t)}</i>`)).join('') : '<i>—</i>');
const VOLS = [['master', 'Master'], ['music', 'Music'], ['voice', 'Voices']];

export function createPause(ui) {
  const W = window.WAGMI; if (!W || !W.app) return null;
  const app = W.app, cm = app.controllerManager;
  missions(W);
  // game time: the paused stretches left out
  let pausedMs = 0, since = 0;
  W.paused = false;
  W.clock = { now: () => (W.paused ? since : performance.now()) - pausedMs };

  if (!document.getElementById('wg-pause-css')) { const st = document.createElement('style'); st.id = 'wg-pause-css'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.id = 'wg-pause';
  root.innerHTML = `<div class="wrap"><div class="side"><div class="hd sh">Paused</div><div class="rule"></div><div class="menu"></div>
    <div class="keys"><kbd>↑</kbd><kbd>↓</kbd> select · <kbd>Enter</kbd> OK · <kbd>Esc</kbd> back</div></div><div class="panel"></div></div>`;
  document.body.appendChild(root);
  const menuEl = root.querySelector('.menu'), panel = root.querySelector('.panel');
  // the toolbar's button, beside the Map's
  const btn = document.createElement('button');
  btn.id = 'btn-pause'; btn.className = 'tool-btn'; btn.type = 'button'; btn.title = 'Pause [Esc]';
  btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/></svg><span class="tool-label">Pause</span><kbd>Esc</kbd>`;
  (document.getElementById('btn-open-map') || null)?.after(btn);
  btn.addEventListener('click', () => { if (pausable()) open(); });

  /* ---------------------------------------------------------- the sound -- */
  const vol = { master: 1, music: 1, voice: 1 };
  try { Object.assign(vol, JSON.parse(localStorage.getItem('wagmi.volume') || '{}')); } catch {}
  const base = new Map();
  function applyVol() {
    const bus = W.audio?.bus; if (!bus) return;
    for (const [k] of VOLS) {
      const g = bus[k]; if (!g || !g.gain) continue;
      if (!base.has(g)) base.set(g, g.gain.value);
      g.gain.setTargetAtTime(base.get(g) * Math.max(0, Math.min(1, vol[k])), g.context.currentTime, 0.05);
    }
  }
  if (VOLS.some(([k]) => vol[k] !== 1)) { try { applyVol(); } catch (e) { console.warn('[pause] volume', e); } }
  // the dip while paused: each bus held down a second at a time, so it comes back up a moment after Resume
  let duckT = 0;
  const duck = () => { for (const b of ['music', 'amb', 'sfx', 'voice']) W.audio?.duck?.(b, 0.9, 0.8); };

  /* ---------------------------------------------- holding the city still -- */
  // the city's frame loop (main.js, through the renderer's animation loop): while paused it only draws the frame
  // (the scene as it stood); failing that, its updates are held one by one
  function holdLoop() {
    const anim = app.renderer?._animation;
    if (anim && typeof anim._animationLoop === 'function') {
      if (anim._wgHeld) return;
      const loop = anim._animationLoop; anim._wgHeld = true;
      anim._animationLoop = (t, xr) => { if (!W.paused) return loop(t, xr); try { app.renderPipeline?.render(); } catch {} };
      return;
    }
    for (const o of [cm, app.cameraSystem, app.trafficSystem, app.highwayTraffic]) {
      if (!o || o._wgHeld || typeof o.update !== 'function') continue;
      const f = o.update; o._wgHeld = true;
      o.update = function (...a) { if (!W.paused) return f.apply(this, a); };
    }
  }

  /* --------------------------------------------------------- when it may -- */
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable;
  function pausable() {
    const b = document.body.classList;
    if (!app.ready || b.contains('wg-gating')) return false;
    if (app.mapSystem?.isFullMapOpen) return false;
    if (document.querySelector('#wg .wg-big.on .choices')) return false; // (the fail screen asks its own question)
    return true;
  }

  /* ----------------------------------------------------------- the menu -- */
  const ALL = [
    ['resume', 'Resume'], ['brief', 'Brief'], ['controls', 'Controls'], ['recover', 'Reset car to road'], ['restart', 'Restart checkpoint'], ['select', 'Mission select'], ['sound', 'Sound'], ['credits', 'Credits'], ['title', 'Return to title'],
  ];
  // (the car's reset only in the car, and only with the driving track's WAGMI.recoverCar: fixed while the menu is up)
  let ITEMS = ALL;
  const items = () => (ITEMS = ALL.filter(([id]) => id !== 'recover' || (cm.activeMode === 'car' && typeof W.recoverCar === 'function')));
  // the recover key's name, from the driving track (WAGMI.recoverCar.key: 'KeyX' or 'X'), for the controls
  const recoverKey = () => { const k = W.recoverCar?.key; return k ? String(k).replace(/^Key|^Digit/, '') : 'see the car controls'; };
  // Mission select: the story's missions (W.storyList(), mission/m3-save.js); a passed one can be played again (W.replay)
  const story = () => W.storyList?.() || [];
  let sel = 0, inPanel = false, sub = 0, isOpen = false, openedAt = 0;
  function brief() {
    const r = ui.recent(), M = W.missions.active();
    const head = M ? `<div class="t">${esc(M.act || 'Mission')}</div><div class="ms sh">${esc(M.title || '')}</div>` : '';
    const lines = r.lines.map(([w, c, t]) => `<div class="ln">${w ? `<b style="color:${c}">${esc(w.toUpperCase())}</b>` : ''}${esc(t)}</div>`).join('');
    return `${head}<div class="t">Objective</div><div class="ob sh">${r.objective || '<span class="mu">No objective right now.</span>'}</div>
      ${lines ? `<div class="t g">Lately</div>${lines}` : ''}${r.help.length ? `<div class="t g">Help</div>${r.help.map((h) => `<div class="ln">${h}</div>`).join('')}` : ''}`;
  }
  function checkpoints() {
    const M = W.missions.active();
    if (!M) return { M: null, list: [] };
    const ids = M.checkpoints.map((c) => c.id), at = Math.max(0, ids.indexOf(M.at?.() ?? ids[0]));
    return { M, list: M.checkpoints.map((c, i) => ({ ...c, cur: i === at, lock: i > at && !DEBUG })) };
  }
  function drawMenu() {
    menuEl.innerHTML = ITEMS.map(([id, label], i) => `<button class="mi sh${i === sel ? ' sel' : ''}" data-i="${i}">${esc(label)}</button>`).join('');
  }
  function drawPanel() {
    const id = ITEMS[sel][0];
    panel.classList.toggle('focus', inPanel);
    if (id === 'resume' || id === 'brief') panel.innerHTML = brief();
    else if (id === 'controls') panel.innerHTML = `<div class="cols ctl">${CONTROLS.map(([h, rows]) => `<div><div class="row th"><span class="t">${esc(h)}</span><span>Keys</span><span>Controller</span></div>${rows.filter(([, k]) => k !== 'recover' || W.recoverCar).map(([a, k, p]) => `<div class="row"><span>${esc(a)}</span><span>${esc(k === 'recover' ? recoverKey() : k || '—')}</span><span class="pd">${padCol(p)}</span></div>`).join('')}</div>`).join('')}</div>`;
    else if (id === 'recover') panel.innerHTML = `<div class="t">Reset car to road</div><div class="ln">Stuck on a wall, a kerb or a lamp post? Your car goes back on the nearest lane, upright and facing the way the traffic goes.</div>
      <div class="mu" style="margin-top:10px;font-size:15px"><kbd>Enter</kbd> to reset${W.recoverCar?.key ? ` · in the car, any time: <kbd>${esc(recoverKey())}</kbd>` : ''}</div>`;
    else if (id === 'restart') {
      const { M, list } = checkpoints();
      panel.innerHTML = M ? `<div class="t">${esc(M.act || 'Mission')}</div><div class="ms sh">${esc(M.title)}</div>
        ${list.map((c, i) => `<button class="opt${inPanel && i === sub ? ' sel' : ''}${c.lock ? ' lock' : ''}${c.cur ? ' cur' : ''}" data-cp="${i}">${esc(c.label)}<small>${c.cur ? 'Last checkpoint' : c.lock ? 'Not reached' : ''}</small></button>`).join('')}`
        : `<div class="t">Restart</div><div class="mu">No mission running: nothing to restart.</div>`;
    } else if (id === 'sound') {
      panel.innerHTML = `<div class="t">Sound</div>${W.audio?.bus ? VOLS.map(([k, label], i) => `<div class="sl${inPanel && i === sub ? ' sel' : ''}" data-v="${k}"><span>${label}</span><div class="bar"><i style="width:${Math.round(vol[k] * 100)}%"></i></div><span class="v">${Math.round(vol[k] * 100)}%</span></div>`).join('')
        : '<div class="mu">No sound in this session.</div>'}<div class="mu" style="margin-top:12px;font-size:15px">${inPanel ? '<kbd>←</kbd><kbd>→</kbd> change · <kbd>↑</kbd><kbd>↓</kbd> choose' : '<kbd>Enter</kbd> to change'}</div>`;
    } else if (id === 'select') {
      panel.innerHTML = `<div class="t">Mission select</div>${story().map((m, i) => `<button class="opt${inPanel && i === sub ? ' sel' : ''}${m.passed ? '' : ' lock'}" data-ms="${i}">${esc(m.title)}<small>${m.passed ? 'Replay' : 'Not passed yet'}</small></button>`).join('') || '<div class="mu">No missions yet.</div>'}
        <div class="mu" style="margin-top:8px;font-size:15px">A replay starts the mission from the top. Your story stays where it is.</div>`;
    } else if (id === 'credits') {
      panel.innerHTML = creditsHTML();
    } else if (id === 'title') {
      panel.innerHTML = `<div class="t">Return to title</div><div class="ln">Back to the start screen. This mission starts over from the opening.</div><div style="height:10px"></div>
        <button class="opt${inPanel && sub === 0 ? ' sel' : ''}" data-yes="1">Return to title</button><button class="opt${inPanel && sub === 1 ? ' sel' : ''}" data-no="1">Cancel</button>`;
    }
  }
  const draw = () => { drawMenu(); drawPanel(); };
  const subCount = () => { const id = ITEMS[sel][0]; return id === 'restart' ? checkpoints().list.length : id === 'select' ? story().length : id === 'sound' ? (W.audio?.bus ? VOLS.length : 0) : id === 'title' ? 2 : 0; };
  // (from inside a cutscene: it is skipped first, as a held Space would, and has let go of the camera before the restart)
  async function leaveScene() {
    if (!W.cutscene || !W.cineSkip?.()) return;
    for (let i = 0; i < 60 && W.cutscene; i++) await new Promise((r) => setTimeout(r, 50));
  }
  async function replay(i) {
    const m = story()[i]; if (!m || !m.passed || !W.replay) return;
    close();
    await ui.fade(1, 0.35);
    await leaveScene();
    try { await W.replay(m.id); } catch (e) { console.warn('[pause] replay', e); }
    setTimeout(() => ui.fade(0, 0.6), 250);
  }

  function open() {
    if (isOpen) return;
    holdLoop();
    isOpen = true; openedAt = performance.now();
    W.paused = true; since = performance.now();
    cm.resetInput?.();
    if (document.pointerLockElement) { gameLetGo = performance.now(); document.exitPointerLock?.(); }
    duck(); duckT = setInterval(duck, 500);
    ui.brief?.(false);
    items(); sel = 0; inPanel = false; sub = 0; draw();
    root.classList.add('on'); document.body.classList.add('wg-paused');
  }
  function close() {
    if (!isOpen) return;
    isOpen = false; root.classList.remove('on'); document.body.classList.remove('wg-paused');
    clearInterval(duckT);
    pausedMs += performance.now() - since; W.paused = false;
    cm.resetInput?.();
  }
  function act(id) {
    if (id === 'resume') close();
    else if (id === 'recover') { close(); try { W.recoverCar?.(); } catch (e) { console.warn('[pause] recover', e); } }
    else if (id === 'credits') { inPanel = true; panel.classList.add('focus'); }
    else if (subCount()) { inPanel = true; sub = 0; if (id === 'restart') { const l = checkpoints().list; sub = Math.max(0, l.findIndex((c) => c.cur)); } draw(); }
  }
  // the running mission from its last checkpoint (the stall help)
  function restartCurrent() {
    const { list } = checkpoints(), i = list.findIndex((c) => c.cur);
    if (i >= 0) restart(i);
  }
  async function restart(i) {
    const { M, list } = checkpoints(), c = list[i]; if (!M || !c || c.lock) return;
    close();
    await ui.fade(1, 0.35);
    await leaveScene();
    try { await M.restart(c.id); } catch (e) { console.warn('[pause] restart', e); }
    setTimeout(() => ui.fade(0, 0.6), 250);
  }
  function toTitle() {
    const q = new URLSearchParams(location.search);
    for (const k of ['m1', 'm2', 'm3', 'nogate', 'nointro', 'fight']) q.delete(k);
    const s = q.toString();
    close(); ui.fade(1, 0.3).then(() => location.assign(location.pathname + (s ? '?' + s : '')));
  }
  function setVol(k, v) { vol[k] = Math.round(Math.max(0, Math.min(1, v)) * 10) / 10; try { localStorage.setItem('wagmi.volume', JSON.stringify(vol)); } catch {} applyVol(); drawPanel(); }
  function enterSub() {
    const id = ITEMS[sel][0];
    if (id === 'restart') restart(sub);
    else if (id === 'select') replay(sub);
    else if (id === 'title') { if (sub === 0) toTitle(); else { inPanel = false; draw(); } }
  }

  /* --------------------------------------------------------- the inputs -- */
  function menuKey(e) {
    const c = e.code, up = c === 'ArrowUp' || c === 'KeyW', down = c === 'ArrowDown' || c === 'KeyS';
    const left = c === 'ArrowLeft' || c === 'KeyA', right = c === 'ArrowRight' || c === 'KeyD', ok = c === 'Enter' || c === 'NumpadEnter' || c === 'Space';
    const back = c === 'Escape' || c === 'Backspace' || c === 'KeyP';
    if (!inPanel) {
      if (up || down) { sel = (sel + (up ? -1 : 1) + ITEMS.length) % ITEMS.length; draw(); }
      else if (ok || right) act(ITEMS[sel][0]);
      else if (back && !(c === 'Escape' && performance.now() - openedAt < 300)) close();
      return;
    }
    const n = subCount(), id = ITEMS[sel][0];
    // (the credits only scroll: redrawing them would jump back to the top)
    if (id === 'credits') { if (up || down) panel.scrollBy({ top: up ? -90 : 90 }); else if (back || left) { inPanel = false; draw(); } return; }
    if (up || down) { sub = (sub + (up ? -1 : 1) + n) % Math.max(1, n); drawPanel(); }
    else if (id === 'sound' && (left || right)) { const k = VOLS[sub][0]; setVol(k, vol[k] + (right ? 0.1 : -0.1)); }
    else if (ok) enterSub();
    else if (back || left) { inPanel = false; draw(); }
  }
  addEventListener('keydown', (e) => {
    if (isOpen) { if (!typing(e) && !e.metaKey && !e.ctrlKey && !e.altKey) { if (!e.repeat || /Arrow/.test(e.code)) menuKey(e); e.stopImmediatePropagation(); e.preventDefault(); } return; }
    if (typing(e) || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!pausable()) return;
      // (an Esc the browser also used to let the pointer go: the menu is up already)
      if (performance.now() - openedAt < 300) { e.stopImmediatePropagation(); return; }
      e.stopImmediatePropagation(); e.preventDefault(); open();
    } else if (e.code === 'KeyB') {
      const b = document.body.classList;
      if (!b.contains('wg-gating') && !b.contains('wg-cine') && !W.cutscene) ui.brief?.();
    }
  }, true);
  addEventListener('keyup', (e) => { if (isOpen && !typing(e)) e.stopImmediatePropagation(); }, true);
  // the browser's own Esc lets a locked pointer go and the page never hears the key: the letting go opens the menu
  // (unless the game let it go itself: the end of a fight)
  let gameLetGo = 0;
  const exitPL = document.exitPointerLock?.bind(document);
  if (exitPL) document.exitPointerLock = () => { gameLetGo = performance.now(); return exitPL(); };
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement || isOpen || performance.now() - gameLetGo < 500 || !document.hasFocus()) return;
    if (pausable()) open();
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, .bar'); if (!t) return;
    if (t.dataset.i != null) { const i = +t.dataset.i; if (i === sel && ITEMS[i][0] === 'resume') return close(); sel = i; inPanel = false; draw(); if (ITEMS[i][0] === 'resume') close(); return; }
    if (t.dataset.cp != null) { inPanel = true; sub = +t.dataset.cp; return restart(sub); }
    if (t.dataset.ms != null) { inPanel = true; sub = +t.dataset.ms; return replay(sub); }
    if (t.dataset.yes) return toTitle();
    if (t.dataset.no) { inPanel = false; return draw(); }
    if (t.classList.contains('bar')) { const k = t.parentElement.dataset.v, r = t.getBoundingClientRect(); inPanel = true; sub = VOLS.findIndex(([v]) => v === k); setVol(k, (e.clientX - r.left) / r.width); }
  });
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  root.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

  return { open, close, get isOpen() { return isOpen; }, pausable, restartCurrent };
}
