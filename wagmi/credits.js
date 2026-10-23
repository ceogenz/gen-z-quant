// WAGMI City: the credits, for the pause menu's Credits page (and anything else that lists them). NOTICE is the full
// legal text and assets/CREDITS.md the same list for people reading the repo; this is what the game shows.
//   import { CREDITS, creditsHTML } from '../credits.js';
//   CREDITS        [{ heading, lines: [{ what, who, note, licence, licenceUrl, src }] }], in the order to show them
//   creditsHTML()  CREDITS as HTML for the pause panel (its .t heading and .ln / .mu line classes); empty sections left out
// The music comes from the radio's own list (radio/stations.js: each track's by, lic, src, samples), so a track added
// there is credited here with nothing else to do.
import { STATIONS, LICENCES } from './radio/stations.js';

const music = () => {
  const lines = [], seen = new Set();
  for (const s of STATIONS) for (const t of s.tracks) {
    if (seen.has(t.file)) continue; seen.add(t.file);
    if (t.lic === 'original') { lines.push({ what: `"${t.title}"`, who: 'original to WAGMI City', note: s.name, licence: 'MIT', licenceUrl: null, src: null }); continue; }
    const samples = (t.samples || []).map((x) => `"${x.title}" by ${x.artist}`).join(', ');
    // (by is the author's own wording, '"Full Title" [by] Who': split into the title and the rest)
    const m = /^"(.+?)"\s+(?:by\s+)?(.+)$/.exec(t.by || '');
    lines.push({
      what: `"${m ? m[1] : t.title}"`, who: m ? m[2] : t.by || t.artist,
      note: [s.name, samples && `samples ${samples}`].filter(Boolean).join(' · '),
      licence: t.lic, licenceUrl: LICENCES[t.lic] || null, src: t.src || null,
    });
  }
  return lines;
};

export const CREDITS = [
  { heading: 'Music', lines: music() },
  { heading: 'Characters', lines: [
    { what: 'Quant, Gears, Juno and Fiona', who: 'built from MakeHuman\'s body, clothes and hair', note: 'original characters for WAGMI City', licence: 'CC0 1.0', licenceUrl: LICENCES['CC0 1.0'], src: 'http://www.makehuman.org' },
    { what: 'Motion capture', who: 'CMU Graphics Lab Motion Capture Database', note: 'free for all uses (the data may not be resold); created with funding from NSF EIA-0196217', licence: null, licenceUrl: null, src: 'http://mocap.cs.cmu.edu' },
  ] },
  { heading: 'Engine sounds', lines: [
    { what: '"Maserati GranTurismo S Exhaust"', who: 'lmartins', note: 'Quant\'s car: loops cut at five engine speeds', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', src: 'https://commons.wikimedia.org/wiki/File:Maserati_GranTurismo_S_Exhaust.ogg' },
  ] },
  { heading: 'The city', lines: [
    { what: 'Slop New York', who: 'Mr.doob', note: 'the city this game is built on', licence: 'MIT', licenceUrl: 'https://opensource.org/license/mit', src: null },
  ] },
  { heading: 'Street combat', lines: [
    { what: 'Spiderbench combat', who: 'Shikhar', note: 'the street fight, the Degens\' rig and the freeflow clips, used with the author\'s permission (not MIT)', licence: null, licenceUrl: null, src: null },
  ] },
  { heading: 'Props', lines: [
    { what: '"Metal Trash Can"', who: 'GurJas Studios, from Poly Haven', note: '', licence: 'CC0 1.0', licenceUrl: LICENCES['CC0 1.0'], src: 'https://polyhaven.com/a/metal_trash_can' },
  ] },
  { heading: 'Voices', lines: [
    { what: 'Quant and Juno', who: 'synthesised with Qwen3-TTS (the Qwen team, Alibaba Cloud)', note: 'invented voices, run with mlx-audio (MIT)', licence: 'Apache-2.0', licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0', src: 'https://github.com/QwenLM/Qwen3-TTS' },
    { what: 'Everyone else', who: 'placeholder voices (macOS speech)', note: 'to be replaced', licence: null, licenceUrl: null, src: null },
  ] },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="color:inherit">${esc(text)}</a>` : esc(text));
export function creditsHTML() {
  return CREDITS.filter((c) => c.lines.length).map((c, i) => `<div class="t${i ? ' g' : ''}">${esc(c.heading)}</div>${c.lines.map((l) =>
    `<div class="ln"><b>${esc(l.what)}</b>${esc(l.who)}${l.licence ? ` <span class="mu">· ${link(l.licenceUrl, l.licence)}</span>` : ''}`
    + `${l.note ? `<div class="mu" style="font-size:15px">${esc(l.note)}</div>` : ''}`
    + `${l.src ? `<div class="mu" style="font-size:13px;word-break:break-all">${link(l.src, l.src)}</div>` : ''}</div>`).join('')}`).join('')
    + '<div class="mu" style="margin-top:14px;font-size:14px">Full notices: NOTICE and assets/CREDITS.md in the game\'s source.</div>';
}
