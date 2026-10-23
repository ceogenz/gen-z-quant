// WAGMI City: the cast's voices. Every spoken line is a file (assets/voice/<id>.m4a) listed in assets/voice/manifest.json
// with its speaker and words (built from the game's own lines by wagmi/radio/build/voices.mjs). The subtitles drive
// them: ui.sub(speaker, text) shows a line and calls WAGMI.voice.sub(speaker, text), which plays that line's file
// from the top (once per showing; ui.sub(null) between lines). A call's sound is put on live: ZK's video call, Juno's
// phone. Speech ducks the radio.
//   W.voice.has(speaker, text) · dur(speaker, text) (s, 0 if none) · say(speaker, text) · stop(secs) · level() (0..1,
//   the voice playing now, for mouths and meters) · fx(speaker, 'phone' | 'video' | null) (a speaker's call sound)
export async function createVoice(W, out) {
  const key = (speaker, text) => `${String(speaker).toLowerCase()}|${String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
  let man = { lines: [] };
  try { const r = await fetch('assets/voice/manifest.json', { cache: 'no-cache' }); if (r.ok) man = await r.json(); } catch {}
  const byKey = new Map(man.lines.map((l) => [key(l.speaker, l.text), l]));
  const fxOf = {}; // a speaker's call sound, set at run time (else the manifest's)
  const bufs = new Map();
  let ctx = null, bus = null, ana = null, data = null;
  function graph() {
    if (ctx) return true;
    ctx = out.ctx(); if (!ctx) return false;
    ana = ctx.createAnalyser(); ana.fftSize = 512; data = new Float32Array(ana.fftSize);
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(ana); ana.connect(out.bus('voice'));
    return true;
  }
  function load(l) {
    if (!bufs.has(l.id)) {
      if (!graph()) return Promise.reject(new Error('no audio'));
      bufs.set(l.id, fetch(l.file).then((r) => { if (!r.ok) throw new Error(l.file); return r.arrayBuffer(); }).then((b) => ctx.decodeAudioData(b)).catch((e) => { bufs.delete(l.id); throw e; }));
    }
    return bufs.get(l.id);
  }
  // (the lines decoded ahead, a few at a time, once there is sound: the opening's first)
  let warmed = false;
  function warm() {
    if (warmed || !graph()) return; warmed = true;
    const list = [...man.lines].sort((a, b) => (a.scene === 'intro' ? 0 : 1) - (b.scene === 'intro' ? 0 : 1));
    let i = 0; const step = () => { const batch = list.slice(i, i + 4); i += 4; if (!batch.length) return; Promise.allSettled(batch.map(load)).then(() => setTimeout(step, 30)); };
    step();
  }
  const filters = (kind) => {
    const f = (type, freq, q = 0.7, gain = 0) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q; b.gain.value = gain; return b; };
    if (kind === 'phone') return [f('highpass', 320, 0.8), f('highpass', 320, 0.8), f('peaking', 1800, 1, 4), f('lowpass', 3400, 0.8), f('lowpass', 3400, 0.8)];
    if (kind === 'video') return [f('highpass', 160), f('peaking', 2500, 1, 2), f('lowpass', 6500)];
    return [];
  };
  let cur = null, shown = null;
  function play(l) {
    if (!graph()) return;
    warm();
    const asked = ctx.currentTime;
    load(l).then((buf) => {
      // (still the line on screen; started late by however long the load took, so it keeps to the picture)
      if (shown !== l) return;
      const late = Math.max(0, ctx.currentTime - asked); if (late > buf.duration - 0.2) return;
      V.stop(0.05);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 1;
      const chain = filters(l.speaker in fxOf ? fxOf[l.speaker] : l.fx);
      let n = src; for (const f of chain) { n.connect(f); n = f; } n.connect(g); g.connect(bus);
      src.start(ctx.currentTime, late);
      const me = (cur = { src, g, l });
      V.log.push({ id: l.id, at: +(performance.now() / 1000).toFixed(3), late: +late.toFixed(3), intro: W.intro?.t != null ? +W.intro.t.toFixed(2) : null }); if (V.log.length > 60) V.log.shift();
      src.onended = () => { if (cur === me) cur = null; };
      const secs = buf.duration - late;
      if (out.via() === 'mixer') W.audio.duck('music', 0.6, secs + 0.2); else W.radio?.duck?.(0.3, secs + 0.2);
    }).catch(() => {});
  }
  const V = {
    lines: man.lines, log: [],
    has: (speaker, text) => byKey.has(key(speaker, text)),
    dur: (speaker, text) => byKey.get(key(speaker, text))?.dur || 0,
    line: (speaker, text) => byKey.get(key(speaker, text)) || null,
    // the subtitles' hook: a line shown plays it (once per showing)
    sub(speaker, text) {
      if (!text) { shown = null; return; }
      const l = byKey.get(key(speaker, text)); if (!l || shown === l) return;
      shown = l; play(l);
    },
    // a line spoken without a subtitle
    say(speaker, text) { const l = byKey.get(key(speaker, text)); if (!l) return false; shown = l; play(l); return true; },
    stop(secs = 0.15) {
      if (!cur) return; const { src, g } = cur; cur = null;
      try { g.gain.setTargetAtTime(0, ctx.currentTime, secs / 3); src.stop(ctx.currentTime + secs + 0.05); } catch {}
    },
    level() {
      if (!cur || !ana) return 0;
      ana.getFloatTimeDomainData(data); let e = 0; for (const v of data) e += v * v;
      return Math.min(1, Math.sqrt(e / data.length) * 5);
    },
    fx(speaker, kind) { if (kind === undefined) delete fxOf[speaker]; else fxOf[speaker] = kind; },
    warm,
  };
  // (decoding needs the sound up: the first key or click after the gate)
  const kick = () => { if (out.ctx()) warm(); };
  for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, kick, { passive: true });
  return V;
}
