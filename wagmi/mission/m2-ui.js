// WAGMI City: Mission 2's overlays, in the shared style (ui.js): Juno's video call and her screen share (the burner's
// twin pinging in Times Square) in the phone frame, Lev's phone (the Degens' group chat), the tail meter (how far
// behind the van, how suspicious they are), the lookouts' alert marks over their heads, and Lev's car's damage.
//   const U = createM2UI(W.ui);
//   U.call.show() / .talk(level) / .share(on) / .hide()     Juno's video call (the phone frame on the right)
//   U.chat(lines, { every }) -> Promise                     Lev's phone: the chat, a message at a time
//   U.tail.set({ d, sus, note }) / .hide()                  the tail meter (bottom right)
//   U.mark(id, { x, y, k, on })  / .unmark(id)              a lookout's '?' filling to '!' at screen x, y
//   U.target(label, k) / U.target(null)                     a target's damage bar (Lev's car)
//   U.prompt(text) / U.prompt(null)                         a small key prompt over the middle ('E · Take him down')
const CSS = `
#wg .m2-tail { position: absolute; right: 24px; bottom: 228px; width: 250px; padding: 10px 14px 12px; background: rgba(8,10,14,0.62); border-radius: 10px; opacity: 0; transition: opacity .3s; z-index: 4; }
#wg .m2-tail.on { opacity: 1; }
#wg .m2-tail .row { display: flex; justify-content: space-between; align-items: baseline; font: 700 14px/1 'Barlow Condensed'; letter-spacing: 3px; color: rgba(255,255,255,.75); }
#wg .m2-tail .row b { font: 800 24px/1 'Barlow Condensed'; letter-spacing: 0; color: #fff; }
#wg .m2-tail .bar { position: relative; height: 10px; margin-top: 8px; border-radius: 5px; overflow: hidden;
  background: linear-gradient(to right, #EF4444 0 8.5%, #F59E0B 8.5% 14%, #FFC93C 14% 46%, rgba(255,255,255,.28) 46% 71%, #EF4444 71% 100%); opacity: .85; }
#wg .m2-tail .pin { position: absolute; top: -4px; width: 4px; height: 18px; margin-left: -2px; border-radius: 2px; background: #fff; box-shadow: 0 0 0 2px rgba(8,10,14,.9); transition: left .12s linear; }
#wg .m2-tail .note { margin-top: 7px; font: 700 13px/1 'Barlow Condensed'; letter-spacing: 2px; text-transform: uppercase; color: #FFC93C; min-height: 13px; }
#wg .m2-tail .sus { display: flex; align-items: center; gap: 8px; margin-top: 8px; font: 700 12px/1 'Barlow Condensed'; letter-spacing: 2.5px; color: rgba(255,255,255,.7); }
#wg .m2-tail .sus i { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,.14); overflow: hidden; }
#wg .m2-tail .sus i s { display: block; height: 100%; width: 0; background: #EF4444; transition: width .1s linear; }
#wg .m2-mark { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; display: grid; place-items: center; opacity: 0; transition: opacity .2s; z-index: 3;
  background: conic-gradient(var(--c) calc(var(--k) * 360deg), rgba(8,10,14,.62) 0); box-shadow: 0 0 0 2px rgba(8,10,14,.85); }
#wg .m2-mark.on { opacity: 1; }
#wg .m2-mark span { width: 22px; height: 22px; border-radius: 50%; background: rgba(8,10,14,.85); display: grid; place-items: center; font: 800 17px/1 'Barlow Condensed'; color: var(--c); }
#wg .m2-target { position: absolute; right: 24px; bottom: 228px; width: 250px; padding: 10px 14px 12px; background: rgba(8,10,14,0.62); border-radius: 10px; opacity: 0; transition: opacity .3s; z-index: 4; }
#wg .m2-target.on { opacity: 1; }
#wg .m2-target .row { display: flex; justify-content: space-between; font: 700 14px/1 'Barlow Condensed'; letter-spacing: 3px; color: rgba(255,255,255,.75); }
#wg .m2-target .row b { color: #EF4444; letter-spacing: 3px; }
#wg .m2-target i { display: block; height: 8px; margin-top: 8px; border-radius: 4px; background: rgba(255,255,255,.14); overflow: hidden; }
#wg .m2-target i s { display: block; height: 100%; background: #EF4444; transition: width .2s; }
#wg .m2-prompt { position: absolute; left: 50%; top: 58%; transform: translate(-50%, -50%); padding: 8px 14px; background: rgba(8,10,14,0.62); border-radius: 10px; font: 700 17px/1 'Barlow Condensed'; letter-spacing: 1px; opacity: 0; transition: opacity .2s; z-index: 5; white-space: nowrap; }
#wg .m2-prompt.on { opacity: 1; }
/* Juno's video call and her screen share, in the phone frame */
.m2-call { position: absolute; inset: 0; background: #070B14; overflow: hidden; }
.m2-call svg.juno, .m2-call svg.map { position: absolute; inset: 0; width: 100%; height: 100%; transition: opacity .35s; }
.m2-call svg.map { opacity: 0; }
.m2-call.share svg.map { opacity: 1; }
.m2-call.share svg.juno { opacity: 0; }
.m2-call .label { position: absolute; top: 8.5%; left: 0; right: 0; text-align: center; font: 800 18px/1 'Barlow Condensed'; letter-spacing: 3px; text-shadow: 0 1px 4px rgba(0,0,0,.8); }
.m2-call .label small { display: block; font: 600 12px/1 'Barlow Condensed'; color: rgba(255,255,255,.6); letter-spacing: 1px; margin-top: 5px; }
.m2-call .wave { position: absolute; left: 14%; right: 14%; bottom: 17%; height: 30px; display: flex; gap: 3px; align-items: center; justify-content: center; }
.m2-call .wave i { display: block; width: 4px; border-radius: 2px; background: #6CB8FF; height: 3px; transition: height .08s; }
.m2-call .pip { position: absolute; right: 6%; bottom: 26%; width: 25%; aspect-ratio: 3 / 4; border-radius: 10px; background: linear-gradient(#2A2E36, #121419); border: 1px solid rgba(255,255,255,.2); overflow: hidden; transition: opacity .3s; }
.m2-call .pip:after { content: ''; position: absolute; left: 22%; right: 22%; bottom: -10%; height: 70%; border-radius: 50% 50% 0 0; background: #07080A; box-shadow: 0 -38px 0 -14px #07080A; }
.m2-call.share .pip { opacity: 0; }
.m2-call .end { position: absolute; bottom: 5%; left: 50%; transform: translateX(-50%); width: 18%; aspect-ratio: 1; border-radius: 50%; background: #EF4444; }
.m2-call .tag { position: absolute; left: 6%; right: 6%; bottom: 27%; padding: 7px 9px; border-radius: 10px; background: rgba(8,10,14,.78); font: 700 12px/1.25 'Barlow Condensed'; letter-spacing: 1px; color: #FFC93C; opacity: 0; transition: opacity .35s .2s; }
.m2-call.share .tag { opacity: 1; }
.m2-call .tag b { display: block; font: 800 16px/1.1 'Barlow Condensed'; color: #fff; letter-spacing: .5px; }
/* Lev's phone: the group chat */
.m2-chat { position: absolute; inset: 0; padding: 17% 5% 5%; background: linear-gradient(#0D1210, #070908); display: flex; flex-direction: column; }
.m2-chat .hd { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(182,255,59,.2); }
.m2-chat .hd .gi { width: 28px; height: 28px; border-radius: 50%; background: #B6FF3B; color: #0A0C10; display: grid; place-items: center; font: 800 15px/1 'Barlow Condensed'; }
.m2-chat .hd .n { font: 800 17px/1 'Barlow Condensed'; letter-spacing: .5px; }
.m2-chat .hd .s { font: 600 11px/1 'Barlow Condensed'; color: rgba(255,255,255,.5); letter-spacing: 1px; margin-top: 3px; }
.m2-chat .list { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; overflow: hidden; padding-top: 8px; }
.m2-chat .m { display: flex; gap: 6px; align-items: flex-end; opacity: 0; transform: translateY(12px); transition: opacity .3s, transform .4s cubic-bezier(.2,.7,.2,1); }
.m2-chat .m.on { opacity: 1; transform: none; }
.m2-chat .m.me { flex-direction: row-reverse; }
.m2-chat .av { flex: 0 0 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font: 800 12px/1 'Barlow Condensed'; color: #0A0C10; }
.m2-chat .b { max-width: 78%; padding: 6px 8px; border-radius: 10px; background: rgba(255,255,255,.08); font: 600 14px/1.2 'Barlow Condensed'; }
.m2-chat .m.me .b { background: rgba(182,255,59,.16); }
.m2-chat .b .w { font: 700 11px/1 'Barlow Condensed'; letter-spacing: 1px; margin-bottom: 3px; }
.m2-chat .b svg { display: block; width: 100%; border-radius: 6px; margin: 2px 0 4px; }
`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Juno on her end of the call: a friendly hacker in her room at night (an original drawing): a big curly puff with a
// blue scrunchie, round glasses with the screens in them, headphones round her neck, a light-blue hoodie, a monitor and
// string lights behind her. Two mouths: shut (a smirk) and open, swapped while she talks.
const JUNO_SVG = `<svg class="juno" viewBox="0 0 90 192" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="m2room" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#18284A"/><stop offset=".6" stop-color="#0A1222"/><stop offset="1" stop-color="#04070E"/></radialGradient>
    <linearGradient id="m2hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7EC3FF"/><stop offset="1" stop-color="#3F7FC4"/></linearGradient>
    <radialGradient id="m2skin" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#A86F4C"/><stop offset="1" stop-color="#7A4A2E"/></radialGradient>
    <linearGradient id="m2lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9FD3FF" stop-opacity=".55"/><stop offset=".5" stop-color="#6CB8FF" stop-opacity=".18"/><stop offset="1" stop-color="#C9E6FF" stop-opacity=".45"/></linearGradient>
  </defs>
  <rect width="90" height="192" fill="url(#m2room)"/>
  <rect x="52" y="34" width="34" height="24" rx="2" fill="#0E2140" stroke="#2F5C94" stroke-width=".8"/>
  <g fill="#6CB8FF" opacity=".7"><rect x="55" y="38" width="16" height="1.4"/><rect x="55" y="41.5" width="24" height="1.4"/><rect x="58" y="45" width="12" height="1.4"/><rect x="55" y="48.5" width="20" height="1.4"/><rect x="58" y="52" width="9" height="1.4"/></g>
  <rect x="4" y="44" width="16" height="22" rx="1" fill="#1B1430" stroke="#FFC93C" stroke-opacity=".5" stroke-width=".6"/>
  <text x="12" y="57" font-family="Barlow Condensed" font-weight="800" font-size="6" fill="#FFC93C" text-anchor="middle" opacity=".8">GM</text>
  <path d="M0 26 Q22 34 45 28 T90 30" fill="none" stroke="#3A3020" stroke-width=".5"/>
  <g fill="#FFD27A">${[4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84].map((x, i) => `<circle cx="${x}" cy="${29 + Math.sin(i * 1.3) * 2.2}" r="1.1" opacity="${0.55 + (i % 3) * 0.15}"/>`).join('')}</g>
  <path d="M6 192 L9 160 Q12 136 32 130 L40 127 L50 127 L58 130 Q78 136 81 160 L84 192 Z" fill="url(#m2hood)"/>
  <path d="M34 131 Q45 146 56 131" fill="none" stroke="#2E6AAE" stroke-width="2.2"/>
  <path d="M40 136 L39 152 M50 136 L51 152" stroke="#F4F7FB" stroke-width="1.1" stroke-linecap="round"/>
  <circle cx="64" cy="152" r="3.2" fill="#FFC93C"/><path d="M62.6 151.3 h.1 M65.4 151.3 h.1" stroke="#3A2A08" stroke-width=".9" stroke-linecap="round"/><path d="M62.4 153.2 Q64 154.8 65.6 153.2" fill="none" stroke="#3A2A08" stroke-width=".6"/>
  <path d="M38 112 L37 128 L53 128 L52 112 Z" fill="#7A4A2E"/>
  <path d="M29 124 Q45 140 61 124" fill="none" stroke="#14161C" stroke-width="3.2"/>
  <ellipse cx="29" cy="124" rx="4.2" ry="5.2" fill="#14161C"/><ellipse cx="61" cy="124" rx="4.2" ry="5.2" fill="#14161C"/>
  <ellipse cx="29" cy="124" rx="2.4" ry="3.2" fill="#6CB8FF"/><ellipse cx="61" cy="124" rx="2.4" ry="3.2" fill="#6CB8FF"/>
  <ellipse cx="45" cy="97" rx="17" ry="21" fill="url(#m2skin)"/>
  <g fill="#17100C">
    <circle cx="45" cy="64" r="15"/><circle cx="33" cy="68" r="10"/><circle cx="57" cy="68" r="10"/><circle cx="38" cy="56" r="9"/><circle cx="52" cy="56" r="9"/><circle cx="45" cy="51" r="8"/>
    <circle cx="28" cy="80" r="6"/><circle cx="62" cy="80" r="6"/><circle cx="27" cy="89" r="4.5"/><circle cx="63" cy="89" r="4.5"/>
  </g>
  <path d="M30 82 Q36 72 45 74 Q54 72 60 82 Q55 77 45 78 Q35 77 30 82 Z" fill="#17100C"/>
  <rect x="35" y="73" width="20" height="3.6" rx="1.8" fill="#6CB8FF"/>
  <g stroke="#2A1B12" stroke-width="1.3" stroke-linecap="round"><path d="M33 89 L41 88.2"/><path d="M49 88.2 L57 89"/></g>
  <ellipse cx="37.5" cy="95.5" rx="1.7" ry="2" fill="#120C08"/><ellipse cx="52.5" cy="95.5" rx="1.7" ry="2" fill="#120C08"/>
  <circle cx="37.5" cy="95.5" r="6.4" fill="url(#m2lens)" stroke="#101216" stroke-width="1.4"/><circle cx="52.5" cy="95.5" r="6.4" fill="url(#m2lens)" stroke="#101216" stroke-width="1.4"/>
  <path d="M43.9 95 Q45 93.8 46.1 95" fill="none" stroke="#101216" stroke-width="1.2"/>
  <path d="M33.5 92.5 L36 91" stroke="#fff" stroke-width=".8" opacity=".7"/><path d="M48.5 92.5 L51 91" stroke="#fff" stroke-width=".8" opacity=".7"/>
  <path d="M44.6 99 Q43.6 104 45.4 104.6" fill="none" stroke="#5E3620" stroke-width=".9"/>
  <g class="mshut"><path d="M39.5 109.5 Q45 112.4 51.5 108.2" fill="none" stroke="#3B1D12" stroke-width="1.4" stroke-linecap="round"/></g>
  <g class="mopen" style="display:none"><ellipse cx="45.5" cy="110" rx="4.6" ry="2.6" fill="#3B1D12"/><path d="M41.4 109 Q45.5 108 49.6 109" stroke="#F4EDE8" stroke-width="1" fill="none"/></g>
  <circle cx="29.5" cy="99" r="1.1" fill="#FFC93C"/><circle cx="60.5" cy="99" r="1.1" fill="#FFC93C"/>
</svg>`;

// her screen share: Midtown's grid, the burner's twin pinging at 7th Ave and W 47th St (Times Square's bowtie), the
// trail of older pings coming up from Chelsea
const MAP_SVG = `<svg class="map" viewBox="0 0 90 192" preserveAspectRatio="xMidYMid slice">
  <rect width="90" height="192" fill="#0A1322"/>
  ${[10, 24, 38, 52, 66, 80].map((x) => `<rect x="${x}" y="0" width="3" height="192" fill="#16243C"/>`).join('')}
  ${[14, 30, 46, 62, 78, 94, 110, 126, 142, 158, 174].map((y) => `<rect x="0" y="${y}" width="90" height="1.6" fill="#132036"/>`).join('')}
  <path d="M62 0 L30 192" stroke="#1D2E4C" stroke-width="2.4"/>
  <path d="M40 62 L48 78 L40 94 Z" fill="#1F3A66" opacity=".8"/>
  <path d="M33 150 L36 132 L40 114 L44 98 L45 84" fill="none" stroke="#FFC93C" stroke-width="1.2" stroke-dasharray="2.2 2.2" opacity=".7"/>
  ${[[33, 150], [36, 132], [40, 114], [44, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#FFC93C" opacity=".6"/>`).join('')}
  <circle cx="45" cy="80" r="3" fill="#EF4444"/>
  <circle cx="45" cy="80" r="3" fill="none" stroke="#EF4444" stroke-width="1"><animate attributeName="r" values="3;16" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.6s" repeatCount="indefinite"/></circle>
  <circle cx="45" cy="80" r="3" fill="none" stroke="#EF4444" stroke-width="1"><animate attributeName="r" values="3;16" dur="1.6s" begin=".8s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.6s" begin=".8s" repeatCount="indefinite"/></circle>
  <text x="49" y="74" font-family="Barlow Condensed" font-weight="700" font-size="5.5" fill="#fff">7 AV · W 47 ST</text>
  <text x="6" y="186" font-family="Barlow Condensed" font-weight="700" font-size="5" fill="#6CB8FF" letter-spacing=".6">JUNO IS SHARING HER SCREEN</text>
</svg>`;

// a photo in the chat: Quant's front door on E 37th St (the dark door under its canopy, 214 in brass)
const DOOR_SVG = `<svg viewBox="0 0 120 80"><rect width="120" height="80" fill="#5A2F22"/>
  <g fill="#6B3828">${Array.from({ length: 10 }, (_, r) => Array.from({ length: 7 }, (_, c) => `<rect x="${c * 18 + (r % 2) * 9 - 6}" y="${r * 8}" width="16" height="6.4"/>`).join('')).join('')}</g>
  <rect x="44" y="20" width="32" height="60" fill="#121316"/><rect x="47" y="23" width="26" height="57" fill="#1B1D21"/><rect x="57" y="30" width="7" height="30" fill="#0A0C10"/>
  <rect x="66" y="47" width="1.6" height="9" fill="#C9A453"/><rect x="38" y="13" width="44" height="5" fill="#0D0E10"/>
  <text x="60" y="11" font-family="Barlow Condensed" font-weight="700" font-size="8" fill="#C9A453" text-anchor="middle">214</text>
  <rect x="0" y="0" width="120" height="80" fill="url(#m2flash)" opacity=".25"/><defs><radialGradient id="m2flash"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>`;

export function createM2UI(ui) {
  if (!document.getElementById('m2-css')) { const st = document.createElement('style'); st.id = 'm2-css'; st.textContent = CSS; document.head.appendChild(st); }
  const root = ui.root;
  const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; root.appendChild(d); return d; };
  const content = () => ui.phone.el.querySelector('.content');

  /* ------------------------------------------------------- Juno's call -- */
  let callEl = null, waveEl = null, clockEl = null, callT = 0, shut = null, open = null;
  const call = {
    show() {
      ui.phone.show('ended'); // (the frame, the shade: its content is ours)
      const c = content(); if (!c) return;
      c.innerHTML = `<div class="m2-call">${JUNO_SVG}${MAP_SVG}<div class="label">JUNO<small class="clock">VIDEO CALL · 00:00</small></div>
        <div class="tag">BURNER TWIN · LAST PING 20 MIN AGO<b>7th Ave &amp; W 47th St</b></div><div class="pip"></div><div class="wave">${'<i></i>'.repeat(20)}</div><div class="end"></div></div>`;
      callEl = c.querySelector('.m2-call'); waveEl = c.querySelector('.wave'); clockEl = c.querySelector('.clock');
      shut = c.querySelector('.mshut'); open = c.querySelector('.mopen'); callT = performance.now();
    },
    // level 0..1: her voice (the wave, her mouth)
    talk(level = 0) {
      if (!callEl) return;
      for (const b of waveEl.children) b.style.height = `${3 + Math.random() * 24 * level}px`;
      const o = level > 0.15 && Math.random() < 0.6; if (shut) { shut.style.display = o ? 'none' : ''; open.style.display = o ? '' : 'none'; }
      const s = Math.floor((performance.now() - callT) / 1000); clockEl.textContent = `VIDEO CALL · 00:${String(s % 60).padStart(2, '0')}`;
    },
    share(on) { callEl?.classList.toggle('share', !!on); },
    hide() { if (callEl) { ui.phone.hide(); callEl = null; } },
    get on() { return !!callEl; },
  };

  /* ------------------------------------------------------- Lev's phone -- */
  // lines: [who, colour, text, { photo, me }]
  async function chat(lines, { every = 900, title = 'DEGENS · MIDTOWN', sub = '14 members' } = {}) {
    ui.phone.show('ended');
    const c = content(); if (!c) return;
    c.innerHTML = `<div class="m2-chat"><div class="hd"><div class="gi">D</div><div><div class="n">${esc(title)}</div><div class="s">${esc(sub)}</div></div></div><div class="list"></div></div>`;
    const list = c.querySelector('.list');
    for (const [who, col, text, o = {}] of lines) {
      const m = document.createElement('div'); m.className = 'm' + (o.me ? ' me' : '');
      m.innerHTML = `<div class="av" style="background:${col}">${esc(who[0].toUpperCase())}</div><div class="b"><div class="w" style="color:${col}">${esc(who)}</div>${o.photo ? DOOR_SVG : ''}${esc(text)}</div>`;
      list.appendChild(m);
      // (older ones scroll off the top)
      while (list.children.length > 6) list.removeChild(list.firstChild);
      await sleep(30); m.classList.add('on');
      await sleep(every * (o.hold || 1));
    }
  }

  /* --------------------------------------------------------- the tail -- */
  const tailEl = el('m2-tail', `<div class="row"><span>THE VAN</span><b class="d">0 m</b></div><div class="bar"><div class="pin"></div></div><div class="note"></div><div class="sus"><span>SUSPICION</span><i><s></s></i></div>`);
  const tailD = tailEl.querySelector('.d'), pin = tailEl.querySelector('.pin'), note = tailEl.querySelector('.note'), sus = tailEl.querySelector('.sus s');
  const tail = {
    // d metres behind it, sus 0..1, the note under the bar (and its colour)
    set({ d, sus: s = 0, note: n = '', color = '#FFC93C', max = 140 }) {
      tailEl.classList.add('on');
      tailD.textContent = `${Math.round(d)} m`;
      pin.style.left = `${Math.min(100, Math.max(0, d / max * 100)).toFixed(1)}%`;
      note.textContent = n; note.style.color = color;
      sus.style.width = `${Math.round(Math.min(1, s) * 100)}%`;
    },
    hide() { tailEl.classList.remove('on'); },
  };

  /* ------------------------------------------------- lookouts' marks -- */
  const marks = new Map();
  function mark(id, { x, y, k = 0, on = true }) {
    let m = marks.get(id);
    if (!m) { m = el('m2-mark', '<span>?</span>'); marks.set(id, m); }
    const alert = k >= 1;
    m.style.left = `${x}px`; m.style.top = `${y}px`;
    m.style.setProperty('--k', String(Math.min(1, k))); m.style.setProperty('--c', alert ? '#EF4444' : k > 0.5 ? '#F59E0B' : '#FFC93C');
    m.firstChild.textContent = alert ? '!' : '?';
    m.classList.toggle('on', !!on);
  }
  function unmark(id) { const m = marks.get(id); if (m) { m.remove(); marks.delete(id); } }

  /* ------------------------------------------------- a target's damage -- */
  const tgtEl = el('m2-target', `<div class="row"><b class="n"></b><span>DAMAGE</span></div><i><s></s></i>`);
  function target(label, k = 0) {
    if (!label) { tgtEl.classList.remove('on'); return; }
    tgtEl.querySelector('.n').textContent = label; tgtEl.querySelector('s').style.width = `${Math.round(Math.min(1, Math.max(0, k)) * 100)}%`;
    tgtEl.classList.add('on');
  }

  /* ---------------------------------------------------------- a prompt -- */
  const promptEl = el('m2-prompt');
  const keycaps = (s) => esc(s).replace(/\[([^\]]+)\]/g, '<kbd>$1</kbd>');
  function prompt(text) { if (!text) { promptEl.classList.remove('on'); return; } promptEl.innerHTML = keycaps(text); promptEl.classList.add('on'); }

  return {
    call, chat, tail, mark, unmark, target, prompt,
    clear() { call.hide(); tail.hide(); target(null); prompt(null); for (const id of [...marks.keys()]) unmark(id); },
  };
}
