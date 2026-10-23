// WAGMI City: the fight's overlays (DOM, no pointer events), in the game's shared style: Barlow Condensed, white with a
// soft shadow, yellow #FFC93C for the cues and key words, health green #4ADE80, danger red #EF4444, dark glass panels.
//  - Quant's health: a GTA bar under the minimap (above it when there is no room), a white chunk trailing what he lost
//  - over each Degen in the fight: his health, and his cue as he winds up (yellow: counter it; red: dodge it); dazed, the
//    grab prompt
//  - edge arrows toward a man winding up off screen
//  - the combo: a floating hit count and the takedown meter
//  - the controls: the city's key bar (walk, turn, jump) swapped for the fight's keys while he fights, and the first time
//    a fight starts a fuller card top left; banners (COUNTER, TAKEDOWN), short messages; a red edge when hurt
//  - over a man lying near: the ground finisher's button
//  - over a bat, a bottle or a trash can by him: the grab key and what it picks up; in his hands: what it is, how much
//    is left of it (a bat's hits) and its buttons, by his health
import * as THREE from 'three/webgpu';
import { clamp } from './util.js';

const Y = '#FFC93C', G = '#4ADE80', R = '#EF4444', PANEL = 'rgba(8,10,14,0.62)';
const CSS = `
#wf{position:fixed;inset:0;pointer-events:none;z-index:24;font-family:'Barlow Condensed',system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.55)}
#wf .wf-hp{position:fixed;height:8px;border-radius:3px;background:${PANEL};box-shadow:0 0 0 1px rgba(255,255,255,.14),0 2px 10px rgba(0,0,0,.35);overflow:hidden;opacity:0;transition:opacity .4s}
#wf .wf-hp.wf-on{opacity:1}
#wf .wf-hp i{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:0 50%}
#wf .wf-hp .wf-trail{background:rgba(255,255,255,.85)}
#wf .wf-hp .wf-fill{background:linear-gradient(180deg,#6BF0A0,${G} 55%,#2FB86A)}
#wf .wf-hp.wf-low .wf-fill{background:linear-gradient(180deg,#FF6B6B,${R} 60%,#B91C1C);animation:wfLow .7s ease-in-out infinite}
@keyframes wfLow{50%{filter:brightness(1.55)}}
#wf .wf-combo{position:fixed;right:5.2vw;top:36vh;text-align:right;opacity:0;transform:translateX(12px);transition:opacity .2s,transform .2s}
#wf .wf-combo.wf-on{opacity:1;transform:none}
#wf .wf-combo.wf-meteronly .wf-n,#wf .wf-combo.wf-meteronly .wf-t{visibility:hidden}
#wf .wf-combo .wf-n{font:italic 800 66px/0.86 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.01em}
#wf .wf-combo .wf-n.wf-pop{animation:wfPop .16s ease-out}
@keyframes wfPop{0%{transform:scale(1.22)}100%{transform:scale(1)}}
#wf .wf-combo .wf-t{font:700 15px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.32em;margin-top:4px;opacity:.9}
#wf .wf-combo .wf-m{position:relative;width:150px;height:5px;margin:9px 0 0 auto;border-radius:3px;background:${PANEL};overflow:hidden}
#wf .wf-combo .wf-m i{position:absolute;inset:0;background:${Y};transform-origin:100% 50%}
#wf .wf-combo .wf-td{display:inline-block;font:800 16px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.14em;color:${Y};margin-top:9px;padding:5px 9px 5px 10px;border-radius:10px;background:${PANEL};text-shadow:0 1px 3px rgba(0,0,0,.7),0 0 10px rgba(255,201,60,.35);opacity:0;transition:opacity .2s}
#wf .wf-combo.wf-ready .wf-td{opacity:1}
#wf .wf-combo.wf-ready .wf-m i{box-shadow:0 0 12px ${Y};animation:wfLow .6s ease-in-out infinite}
#wf .wf-tag{position:fixed;left:0;top:0;width:0;height:0;will-change:transform}
#wf .wf-tag .wf-bar{position:absolute;left:-28px;top:0;width:56px;height:5px;border-radius:3px;background:${PANEL};box-shadow:0 0 0 1px rgba(255,255,255,.18);overflow:hidden;transition:opacity .25s}
#wf .wf-tag .wf-bar i{position:absolute;inset:0;background:${R};transform-origin:0 50%}
#wf .wf-tag.wf-brute .wf-bar{left:-40px;width:80px;height:6px}
#wf .wf-tag .wf-cue{position:absolute;left:-17px;top:-42px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 22px/1 'Barlow Condensed',system-ui,sans-serif;color:#15171C;background:${Y};box-shadow:0 0 0 3px rgba(255,201,60,.35),0 0 22px rgba(255,201,60,.8);opacity:0;transform:scale(.6);transition:opacity .08s,transform .08s;text-shadow:none}
#wf .wf-tag .wf-cue.wf-on{opacity:1;transform:scale(1)}
#wf .wf-tag .wf-cue.wf-dodge{background:${R};color:#fff;box-shadow:0 0 0 3px rgba(239,68,68,.35),0 0 22px rgba(239,68,68,.85)}
#wf .wf-tag .wf-cue.wf-now{animation:wfCue .14s ease-in-out infinite alternate}
@keyframes wfCue{to{transform:scale(1.18)}}
#wf .wf-tag .wf-daze{position:absolute;left:-40px;top:-30px;width:80px;text-align:center;font:700 13px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.12em;color:${Y};opacity:0;transition:opacity .15s}
#wf .wf-tag .wf-daze.wf-on{opacity:1}
#wf .wf-tag .wf-daze kbd{font:800 11px/1 'Barlow Condensed',system-ui,sans-serif;border:1.5px solid ${Y};border-radius:4px;padding:2px 4px;margin-right:4px}
#wf .wf-arrow{position:fixed;left:0;top:0;width:0;height:0;will-change:transform}
#wf .wf-arrow:before{content:'';position:absolute;left:-14px;top:-11px;border-left:28px solid currentColor;border-top:11px solid transparent;border-bottom:11px solid transparent;filter:drop-shadow(0 0 6px currentColor)}
#wf .wf-vig{position:fixed;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(200,20,20,.5) 100%);opacity:0}
#wf .wf-slow{position:fixed;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 52%,rgba(255,201,60,.16) 100%);opacity:0;transition:opacity .15s}
#wf .wf-banner{position:fixed;left:50%;top:24vh;transform:translateX(-50%) scale(.92);font:italic 800 38px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.12em;color:${Y};opacity:0;transition:opacity .15s,transform .15s;white-space:nowrap;text-shadow:0 2px 14px rgba(0,0,0,.6)}
#wf .wf-banner.wf-on{opacity:1;transform:translateX(-50%) scale(1)}
#wf .wf-msg{position:fixed;left:50%;bottom:21vh;transform:translateX(-50%);padding:8px 16px;border-radius:10px;background:${PANEL};font:600 17px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.08em;opacity:0;transition:opacity .2s;white-space:nowrap}
#wf .wf-msg.wf-on{opacity:1}
#wf .wf-msg.wf-danger{color:#FFD5D5;box-shadow:inset 0 0 0 1px rgba(239,68,68,.6)}
#wf .wf-hint{position:fixed;left:16px;top:76px;padding:12px 16px 13px;border-radius:10px;background:${PANEL};display:flex;flex-direction:column;align-items:flex-start;gap:9px;max-width:min(80vw,300px);font:600 15px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.04em;opacity:0;transform:translateX(-8px);transition:opacity .6s,transform .6s}
#wf .wf-hint.wf-on{opacity:1;transform:none}
#wf .wf-keys{position:fixed;left:50%;bottom:var(--edge,16px);transform:translateX(-50%);display:none;flex-wrap:wrap;justify-content:center;gap:6px 16px;width:max-content;max-width:min(94vw,760px);font:600 14px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.05em;color:rgba(255,255,255,.92);text-shadow:0 1px 2px rgba(0,0,0,.75)}
#wf .wf-keys span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
#wf .wf-keys kbd{font:700 11px/1 'Barlow Condensed',system-ui,sans-serif;color:#fff;background:rgba(12,13,15,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);border-radius:4px;padding:3px 5px;text-shadow:none}
#wf .wf-keys i{font-style:normal;margin-left:4px}
#wf .wf-keys b{color:${Y};font-weight:800;letter-spacing:.14em;margin-right:2px}
body.wf-fight #hud-controls-hint{display:none!important}
body.wf-fight #wf .wf-keys{display:flex}
#wf.wf-hinting .wf-keys{display:none!important}
.hud-top-left,.hud-top-right,.hud-bottom-right{transition:opacity .35s}
body.wf-fight .hud-top-left,body.wf-fight .hud-top-right,body.wf-fight .hud-bottom-right{opacity:0!important;pointer-events:none!important}
#wf .wf-tag .wf-fin{position:absolute;left:-46px;top:-30px;width:92px;text-align:center;font:700 13px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.12em;color:${Y};opacity:0;transition:opacity .15s;white-space:nowrap}
#wf .wf-tag .wf-fin.wf-on{opacity:1}
#wf .wf-tag .wf-fin kbd{font:800 11px/1 'Barlow Condensed',system-ui,sans-serif;border:1.5px solid ${Y};border-radius:4px;padding:2px 4px;margin-right:4px}
#wf .wf-hint b{color:${Y};font-weight:800;letter-spacing:.14em;margin-right:4px}
#wf .wf-hint span{display:flex;align-items:center;gap:6px;white-space:nowrap}
#wf .wf-hint kbd{font:700 12px/1 'Barlow Condensed',system-ui,sans-serif;border:1.5px solid rgba(255,255,255,.8);border-radius:4px;padding:3px 5px;background:rgba(0,0,0,.25)}
#wf .wf-offer{position:fixed;left:0;top:0;will-change:transform;opacity:0;transition:opacity .15s}
#wf .wf-offer.wf-on{opacity:1}
#wf .wf-offer div{position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:flex;align-items:center;gap:7px;padding:6px 10px 6px 7px;border-radius:10px;background:${PANEL};white-space:nowrap;font:700 15px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.1em}
#wf .wf-offer kbd{font:800 13px/1 'Barlow Condensed',system-ui,sans-serif;color:#15171C;background:${Y};border-radius:4px;padding:3px 6px}
#wf .wf-offer b{color:${Y};font-weight:800}
#wf .wf-held{position:fixed;display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:10px;background:${PANEL};font:700 14px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.1em;opacity:0;transition:opacity .2s;white-space:nowrap}
#wf .wf-held.wf-on{opacity:1}
#wf .wf-held b{color:${Y};font-weight:800;letter-spacing:.14em}
#wf .wf-held .wf-pips{display:flex;gap:3px}
#wf .wf-held .wf-pips i{width:7px;height:9px;border-radius:2px;background:rgba(255,255,255,.85)}
#wf .wf-held .wf-pips i.wf-gone{background:rgba(255,255,255,.16)}
#wf .wf-held .wf-pips.wf-low i{background:${R}}
#wf .wf-held .wf-pips.wf-low i.wf-gone{background:rgba(255,255,255,.16)}
#wf .wf-held small{font:600 13px/1 'Barlow Condensed',system-ui,sans-serif;letter-spacing:.05em;opacity:.85}
#wf .wf-held kbd{font:700 11px/1 'Barlow Condensed',system-ui,sans-serif;border:1.5px solid rgba(255,255,255,.75);border-radius:4px;padding:2px 4px;margin-right:3px}
`;

export function createHud(c) {
  if (!document.getElementById('wf-css')) { const st = document.createElement('style'); st.id = 'wf-css'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.id = 'wf';
  root.innerHTML = `<div class="wf-vig"></div><div class="wf-slow"></div>
    <div class="wf-hp"><i class="wf-trail"></i><i class="wf-fill"></i></div>
    <div class="wf-combo"><div class="wf-n">0</div><div class="wf-t">HITS</div><div class="wf-m"><i></i></div><div class="wf-td">TAKEDOWN READY &middot; RMB / K</div></div>
    <div class="wf-tags"></div><div class="wf-arrows"></div>
    <div class="wf-banner"></div><div class="wf-msg"></div>
    <div class="wf-offer"><div><kbd>E</kbd><span>PICK UP <b></b></span></div></div>
    <div class="wf-held"><b></b><span class="wf-pips"></span><small></small></div>
    <div class="wf-hint"><span><b>FIGHT</b></span><span><kbd>LMB</kbd><kbd>J</kbd>Strike</span><span><kbd>RMB</kbd><kbd>K</kbd>Heavy · finish a man down</span><span><kbd>Q</kbd><kbd>L</kbd>Counter a yellow cue</span><span><kbd>C</kbd><kbd>Space</kbd>Dodge a red one</span><span><kbd>E</kbd>Grab a dazed one · pick up · throw</span><span><kbd>WASD</kbd>Move <kbd>Shift</kbd>Run</span><span><kbd>Mouse</kbd>Look <kbd>Esc</kbd>Pause</span></div>
    <div class="wf-keys"><span><b>FIGHT</b></span><span><kbd>LMB</kbd><kbd>J</kbd><i>Strike</i></span><span><kbd>RMB</kbd><kbd>K</kbd><i>Heavy</i></span><span><kbd>Q</kbd><i>Counter</i></span><span><kbd>C</kbd><kbd>Space</kbd><i>Dodge</i></span><span><kbd>E</kbd><i>Grab</i></span><span><kbd>WASD</kbd><i>Move</i></span><span><kbd>Shift</kbd><i>Run</i></span></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const hp = $('.wf-hp'), fill = $('.wf-hp .wf-fill'), trail = $('.wf-hp .wf-trail');
  const combo = $('.wf-combo'), comboN = $('.wf-combo .wf-n'), meter = $('.wf-combo .wf-m i');
  const vig = $('.wf-vig'), slow = $('.wf-slow'), banner = $('.wf-banner'), msg = $('.wf-msg'), hint = $('.wf-hint'), tags = $('.wf-tags'), arrows = $('.wf-arrows');
  const tagEls = new Map(), arrowEls = [];
  const offer = $('.wf-offer'), offerName = $('.wf-offer b'), held = $('.wf-held'), heldName = $('.wf-held b'), pips = $('.wf-held .wf-pips'), heldKeys = $('.wf-held small');
  let heldKey = '';
  let trailV = 1, hold = 0, lastHp = 100, vigV = 0, bannerT = 0, msgT = 0, hintT = 0, hinted = false, lastN = 0, fightKeys = false;
  const _v = new THREE.Vector3();
  const minimap = () => document.getElementById('minimap-card');
  return {
    hurt(k) { vigV = Math.min(1, vigV + 0.45 + k); },
    banner(text, color = Y) { banner.textContent = text; banner.style.color = color; bannerT = 1.0; },
    flash(text, kind = '') { msg.textContent = text; msg.className = 'wf-msg wf-on ' + (kind ? 'wf-' + kind : ''); msgT = 1.6; },
    fightStarted() { if (!hinted) { hinted = true; hintT = 10; } },
    hide() { root.style.display = 'none'; }, show() { root.style.display = ''; },
    update(rdt, S) {
      const me = c.me, cam = c.camera, W = innerWidth, H = innerHeight;
      // health, under the minimap
      const mm = minimap(), r = mm && mm.offsetParent ? mm.getBoundingClientRect() : null;
      const onFoot = S.onFoot;
      hp.classList.toggle('wf-on', onFoot && !S.cutscene && (S.fighting || me.hp < me.maxHp || !r));
      if (r && r.width > 0) { const below = H - r.bottom > 18; hp.style.left = r.left + 'px'; hp.style.width = r.width + 'px'; hp.style.top = (below ? r.bottom + 7 : r.top - 15) + 'px'; }
      else { hp.style.left = '24px'; hp.style.width = '260px'; hp.style.top = (H - 24) + 'px'; }
      const f = clamp(me.hp / me.maxHp, 0, 1);
      fill.style.transform = `scaleX(${f})`;
      if (me.hp < lastHp) hold = 0.5; lastHp = me.hp;
      hold -= rdt; if (f >= trailV) trailV = f; else if (hold <= 0) trailV = Math.max(f, trailV - rdt * 0.6);
      trail.style.transform = `scaleX(${trailV})`;
      hp.classList.toggle('wf-low', f < 0.3);
      // the combo
      const n = c.combo.n, on = n >= 2 && S.fighting;
      combo.classList.toggle('wf-on', on);
      if (n !== lastN && n >= 2) { comboN.textContent = n; comboN.classList.remove('wf-pop'); void comboN.offsetWidth; comboN.classList.add('wf-pop'); }
      lastN = n;
      meter.style.transform = `scaleX(${clamp(me.meter, 0, 1)})`;
      combo.classList.toggle('wf-ready', me.meter >= 1);
      if (me.meter >= 1 && S.fighting && !on) combo.classList.add('wf-on');
      combo.classList.toggle('wf-meteronly', !on); // (the takedown ready with no run going: no '0 HITS')
      // over their heads
      const shown = new Set();
      for (const e of c.enemies) {
        if (!S.fighting && !e.engagedOnce) continue;
        let el = tagEls.get(e);
        const p = e.headPos(_v); p.y += 0.32 * e.scale;
        const d = cam.position.distanceTo(p);
        p.project(cam);
        const vis = e.alive && p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && d < 30 && !S.cutscene && e.state !== 'idle';
        if (!vis) { if (el) el.style.display = 'none'; continue; }
        if (!el) {
          el = document.createElement('div'); el.className = 'wf-tag' + (e.type === 'brute' ? ' wf-brute' : '');
          el.innerHTML = '<div class="wf-bar"><i></i></div><div class="wf-cue">!</div><div class="wf-daze"><kbd>E</kbd>GRAB</div><div class="wf-fin"><kbd>RMB</kbd><span>FINISH</span></div>';
          tags.appendChild(el); tagEls.set(e, el); el._bar = el.querySelector('.wf-bar i'); el._cue = el.querySelector('.wf-cue'); el._daze = el.querySelector('.wf-daze'); el._fin = el.querySelector('.wf-fin'); el._finT = el.querySelector('.wf-fin span');
        }
        shown.add(e);
        el.style.display = 'block';
        const sc = clamp(9 / Math.max(3, d), 0.6, 1.25);
        el.style.transform = `translate(${((p.x * 0.5 + 0.5) * W).toFixed(1)}px,${((1 - (p.y * 0.5 + 0.5)) * H).toFixed(1)}px) scale(${sc.toFixed(3)})`;
        el._bar.style.transform = `scaleX(${clamp(e.hp / e.maxHp, 0, 1)})`;
        // (his health only over the man Quant is on, or one just hurt)
        el._bar.parentNode.style.opacity = e === me.target && c.time - me.lastAttackT < 3 || e === me.focus || e.lastHitT > c.time - 3 ? 1 : 0;
        const t = S.threats.find((x) => x.e === e), lead = t ? t.at - c.time : 9;
        el._cue.classList.toggle('wf-on', !!t && lead > -0.1);
        el._cue.classList.toggle('wf-dodge', !!t && t.kind === 'dodge');
        el._cue.classList.toggle('wf-now', !!t && lead < 0.3);
        el._cue.textContent = t && t.kind === 'dodge' ? '‼' : '!';
        el._daze.classList.toggle('wf-on', e.grabbable && e.state !== 'stagger');
        // (lying near him: the finisher, or with a can in his hands, the can brought down on him)
        const can = me.holding && me.holding.def.hands === 2, dq = Math.hypot(e.pos.x - c.W.person.position.x, e.pos.z - c.W.person.position.z);
        const fin = S.fighting && onFoot && e.grounded && dq < (can ? 3.4 : me.FINISH || 4.5) && (!me.holding || can) && !me.down() && !(me.target === e && (me.moveName() === 'ground' || me.moveName() === 'canSlam'));
        el._fin.classList.toggle('wf-on', fin); if (fin) el._finT.textContent = can ? 'SLAM' : 'FINISH';
      }
      for (const [e, el] of tagEls) if (!c.enemies.includes(e)) { el.remove(); tagEls.delete(e); }
      // arrows toward men winding up off screen
      while (arrowEls.length < S.threats.length) { const i = document.createElement('div'); i.className = 'wf-arrow'; arrows.appendChild(i); arrowEls.push(i); }
      arrowEls.forEach((el, k) => {
        const t = S.threats[k]; if (!t || S.cutscene) { el.style.display = 'none'; return; }
        const p = t.e.chest(_v).project(cam), behind = p.z > 1;
        let x = p.x, y = p.y; if (behind) { x = -x; y = -y; }
        const onScreen = !behind && Math.abs(x) < 0.9 && Math.abs(y) < 0.85;
        const lvl = clamp(1 - (t.at - c.time) / 0.9, 0, 1);
        if (onScreen || lvl <= 0) { el.style.display = 'none'; return; }
        const a = Math.atan2(y, x), rr = Math.max(Math.abs(Math.cos(a)) / 0.9, Math.abs(Math.sin(a)) / 0.82);
        el.style.display = 'block'; el.style.color = t.kind === 'dodge' ? R : Y; el.style.opacity = (0.4 + 0.6 * lvl).toFixed(2);
        el.style.transform = `translate(${((Math.cos(a) / rr * 0.5 + 0.5) * W).toFixed(1)}px,${((1 - (Math.sin(a) / rr * 0.5 + 0.5)) * H).toFixed(1)}px) rotate(${-a}rad) scale(${0.8 + 0.5 * lvl})`;
      });
      // the item by him, and the one in his hands
      const it = onFoot && !S.cutscene ? me.offer : null;
      if (it && it.obj) {
        const q = _v.copy(it.obj.position); q.y += (it.def.hands === 2 ? 0.75 : 0.32); q.project(cam);
        const vis = q.z < 1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1;
        offer.classList.toggle('wf-on', vis);
        if (vis) { offer.style.transform = `translate(${((q.x * 0.5 + 0.5) * W).toFixed(1)}px,${((1 - (q.y * 0.5 + 0.5)) * H).toFixed(1)}px)`; offerName.textContent = it.def.name.toUpperCase(); }
      } else offer.classList.remove('wf-on');
      const I = onFoot && !S.cutscene ? me.holding : null;
      held.classList.toggle('wf-on', !!I);
      if (I) {
        const key = I.kind + ':' + I.hits;
        if (key !== heldKey) {
          heldKey = key; heldName.textContent = I.def.name.toUpperCase();
          const n = I.kind === 'bat' ? I.def.hits : 0;
          pips.innerHTML = n ? Array.from({ length: n }, (_, k) => `<i class="${k < I.hits ? '' : 'wf-gone'}"></i>`).join('') : '';
          pips.classList.toggle('wf-low', n && I.hits <= 2);
          heldKeys.innerHTML = I.def.hands === 2 ? '<kbd>LMB</kbd><kbd>E</kbd>Throw &nbsp; <kbd>RMB</kbd>Slam a man down' : I.kind === 'bottle' ? '<kbd>LMB</kbd>Smash &nbsp; <kbd>E</kbd>Throw' : '<kbd>LMB</kbd>Swing &nbsp; <kbd>E</kbd>Throw';
        }
        // over the speed card (bottom right), else over the health bar
        const br = document.querySelector('.hud-bottom-right'), rr = br && !fightKeys && getComputedStyle(br).display !== 'none' ? br.getBoundingClientRect() : null;
        if (rr && rr.width) { held.style.left = (rr.right - held.offsetWidth) + 'px'; held.style.top = (rr.top - held.offsetHeight - 10) + 'px'; }
        else { const hb = hp.getBoundingClientRect(); held.style.left = (hb.width ? hb.left : 24) + 'px'; held.style.top = (hb.width ? hb.top - 44 : H - 80) + 'px'; }
      }
      vigV = Math.max(0, vigV - rdt * 1.5); vig.style.opacity = (Math.max(vigV, f < 0.25 && onFoot ? 0.35 + 0.15 * Math.sin(c.rtime * 6) : 0)).toFixed(3);
      slow.style.opacity = c.slowK > 0.05 ? (c.slowK).toFixed(2) : '0';
      bannerT -= rdt; banner.classList.toggle('wf-on', bannerT > 0);
      msgT -= rdt; if (msgT <= 0) msg.classList.remove('wf-on');
      hintT -= rdt; const hinting = hintT > 0 && S.fighting && !S.cutscene; hint.classList.toggle('wf-on', hinting); root.classList.toggle('wf-hinting', hinting);
      // the city's key bar swapped for the fight's while he fights
      const fk = S.fighting && onFoot && !S.cutscene;
      if (fk !== fightKeys) { fightKeys = fk; document.body.classList.toggle('wf-fight', fk); }
    },
  };
}
