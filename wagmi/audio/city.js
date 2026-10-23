// WAGMI City: New York's own sound, always on (the amb bus), shaped by where the camera is (where: traffic 0..1, the
// cars about; crowd 0..1, the people about; park 0..1; avenue 0..1, near an avenue and its subway line):
//   a bed      the deep roar of traffic blocks away; the wash of tyres and engines nearer; a hiss of air; a crowd's murmur
//              (babble made once, from a dozen voices that never quite say a word); window air conditioners humming
//   events     distant honks (constant on avenues, rare in a park), a siren a long way off now and then, the subway
//              rumbling under the avenue, pigeons cooing and taking off, sparrows in the parks, a building site's clangs,
//              jackhammer and backing truck, a doorman whistling for a cab, a helicopter going over, the crowd's footfalls
// Calmer in parks (the traffic falls away, the birds come up); the whole bus is muffled inside the car (core.js).
import { SOUNDS } from './sounds.js';

// a crowd's murmur: twelve voices, syllables of random vowels on a wandering pitch with pauses for breath, rendered once
export async function makeBabble(sr = 44100, secs = 8) {
  const len = Math.floor(sr * secs), xf = Math.floor(sr * 0.6);
  const oc = new OfflineAudioContext(2, len + xf, sr);
  const F = [[730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [440, 1020, 2240], [660, 1720, 2410], [490, 1350, 1690]];
  const R = Math.random, sum = oc.createGain(); sum.gain.value = 0.5;
  const lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
  sum.connect(hp); hp.connect(lp); lp.connect(oc.destination);
  for (let k = 0; k < 12; k++) {
    const fem = R() < 0.5, f0 = (fem ? 190 : 105) * (0.85 + R() * 0.3), dist = 0.35 + R() * 0.65;
    const src = oc.createOscillator(); src.type = 'sawtooth'; src.frequency.value = f0;
    const pan = oc.createStereoPanner(); pan.pan.value = R() * 1.6 - 0.8;
    const amp = oc.createGain(); amp.gain.value = 0;
    const bands = F[0].map((f, i) => { const b = oc.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = [6, 8, 9][i]; const g = oc.createGain(); g.gain.value = [1, 0.5, 0.25][i]; src.connect(b); b.connect(g); g.connect(amp); return b; });
    amp.connect(pan); pan.connect(sum);
    let t = R() * 0.8;
    while (t < secs + 0.6) {
      // a phrase: a few syllables, the pitch drifting down, then a pause
      const n = 3 + Math.floor(R() * 9), p0 = f0 * (1 + R() * 0.2);
      for (let s = 0; s < n && t < secs + 0.6; s++) {
        const d = 0.09 + R() * 0.2, v = F[Math.floor(R() * F.length)], peak = (0.5 + R() * 0.5) * dist * 0.4;
        src.frequency.setTargetAtTime(p0 * (1 - s * 0.025) * (0.94 + R() * 0.12), t, 0.04);
        bands.forEach((b, i) => b.frequency.setTargetAtTime(v[i] * (fem ? 1.12 : 1), t, 0.025));
        amp.gain.setTargetAtTime(peak, t, 0.02); amp.gain.setTargetAtTime(peak * 0.15, t + d * 0.8, 0.03);
        t += d;
      }
      amp.gain.setTargetAtTime(0, t, 0.05);
      t += 0.2 + R() * 1.1;
    }
    src.start(0); src.stop(secs + 0.6);
  }
  const buf = await oc.startRendering();
  // seamless: the tail faded over the head
  const out = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: sr });
  for (let c = 0; c < 2; c++) {
    const a = buf.getChannelData(c), b = out.getChannelData(c);
    for (let i = 0; i < len; i++) b[i] = a[i];
    for (let i = 0; i < xf; i++) { const k = i / xf; b[i] = a[i] * k + a[len + i] * (1 - k); }
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(b[i]));
    if (peak > 0) for (let i = 0; i < len; i++) b[i] *= 0.7 / peak;
  }
  return out;
}

export function createCity(M, E) {
  const out = M.bus.amb, R = M.R;
  const layer = (buf, type, f, q, rate = 1) => { const s = M.src(buf, { rate }), fl = M.filt(type, f, q), g = M.gain(0, out); s.connect(fl); fl.connect(g); s.start(0, R() * 2); return { s, fl, g }; };
  const rumble = layer(M.brown, 'lowpass', 150, 0.6, 0.8);
  const wash = layer(M.pink, 'bandpass', 620, 0.45);
  const hiss = layer(M.white, 'highpass', 3200, 0.5);
  // the wash breathes as traffic comes and goes in the distance
  const breathe = M.osc('sine', 0.045), bg = M.gain(0.35); breathe.connect(bg); bg.connect(wash.fl.frequency); breathe.start();
  const sway = M.osc('sine', 0.07), sg = M.gain(0); sway.connect(sg); sg.connect(wash.g.gain); sway.start();
  // window units: a mains hum and a fan
  const acG = M.gain(0, out), ac1 = M.osc('sine', 120), ac2 = M.osc('sine', 240), acn = M.src(M.pink), acf = M.filt('bandpass', 420, 1.2), acg2 = M.gain(0.08);
  ac1.connect(acG); ac2.connect(acg2); acg2.connect(acG); acn.connect(acf); acf.connect(acG); for (const s of [ac1, ac2, acn]) s.start();
  let murmur = null;
  const startMurmur = (buf) => { M.babble = buf; murmur = layer(buf, 'bandpass', 1000, 0.45); };
  if (M.babble) startMurmur(M.babble);
  else if (M.live) makeBabble(M.sr).then(startMurmur).catch(() => {});

  // an event somewhere about: pan -1..1, d metres away
  const at = (name, o) => E.play(name, { bus: 'amb', ...o, pan: o.pan ?? R() * 1.8 - 0.9, d: o.d ?? 60 });
  const T = { honk: 1, siren: 20 + R() * 40, subway: 25 + R() * 30, coo: 3, chirp: 2, flutter: 30, build: 15 + R() * 30, whistle: 40 + R() * 40, heli: 90 + R() * 120, steps: 0 };
  let farSiren = null, heli = null, subway = null;
  const w = { traffic: 0.5, crowd: 0.3, park: 0, avenue: 0.5 };

  function update(dt, where) {
    // the place, eased (a cut doesn't snap it)
    const k = Math.min(1, dt / 1.2);
    for (const key in w) w[key] += ((where[key] ?? w[key]) - w[key]) * k;
    const { traffic, crowd, park, avenue } = w, city = 1 - 0.75 * park, t = M.now();
    const set = (p, v) => p.setTargetAtTime(v, t, 0.3);
    set(rumble.g.gain, city * (0.06 + 0.2 * traffic));
    set(wash.g.gain, city * (0.07 + 0.22 * traffic));
    set(sg.gain, city * 0.05 * traffic);
    set(hiss.g.gain, city * (0.008 + 0.02 * traffic));
    set(acG.gain, 0.05 * (1 - park) * (1 - 0.6 * traffic));
    if (murmur) set(murmur.g.gain, 0.04 + 0.42 * crowd);

    // events, each on its own clock (faster where it belongs)
    for (const key in T) T[key] -= dt;
    if (T.honk <= 0) { at('horn', { d: 50 + R() * 220, vol: 0.5 + R() * 0.5, len: M.pick(['tap', 'beep', 'beep', 'double', 'double', 'long', 'triple']), verb: 0.7 }); T.honk = (1 + R() * 3.5) / (0.12 + 0.65 * traffic * city); }
    if (T.siren <= 0 && !farSiren) {
      // a siren somewhere out there: in, along, away, its pitch sliding as it goes
      const dur = 12 + R() * 14, p0 = R() * 2 - 1, p1 = Math.max(-1, Math.min(1, p0 + (R() - 0.5) * 1.4)), d0 = 220 + R() * 380;
      const L = E.loop('siren', { bus: 'amb', vol: 0, pan: p0, d: d0 * 2, ref: 22, verb: 0.9 });
      farSiren = { L, t: 0, dur, p0, p1, d0, mode: R() < 0.7 ? 'wail' : 'yelp', sw: 4 };
      T.siren = 35 + R() * 70;
    }
    if (farSiren) {
      const s = farSiren; s.t += dt; s.sw -= dt;
      const k2 = s.t / s.dur, env = Math.sin(Math.PI * Math.min(1, k2)), dop = 1.025 - 0.05 * k2;
      if (s.sw <= 0) { s.mode = s.mode === 'wail' ? 'yelp' : 'wail'; s.sw = 3 + R() * 5; }
      // (in from twice as far, closest halfway, away again)
      s.L.set({ mode: s.mode, dop, vol: 0.5 * env * (0.6 + 0.4 * city), pan: s.p0 + (s.p1 - s.p0) * k2, d: s.d0 * (1 + Math.abs(1 - 2 * k2)) });
      if (k2 >= 1) { s.L.stop(0.5); farSiren = null; }
    }
    if (T.subway <= 0) {
      T.subway = 30 + R() * 50;
      if (avenue > 0.35 && park < 0.5) subway = { t: 0, dur: 7 + R() * 4, n: 0 };
    }
    if (subway) {
      // under the grates: the rumble swelling and going, the wheels' da-dum over the joints, a far squeal of steel
      const s = subway; s.t += dt;
      const k2 = s.t / s.dur, env = Math.sin(Math.PI * Math.min(1, k2));
      if (!s.L) { s.L = E.loop('rumble', { bus: 'amb', vol: 0, f: 90 }); s.Q = E.loop('squeal', { bus: 'amb', vol: 0, f: 2600 }); }
      s.L.set({ vol: 0.3 * env * avenue });
      s.Q.set({ vol: 0.01 * env * env * avenue });
      if (s.t > s.n * 0.62 && k2 < 0.9) { s.n++; for (const dd of [0, 0.13]) E.play('kerb', { bus: 'amb', k: 0.3 * env, vol: avenue, pan: 0, d: 12 + dd }); }
      if (k2 >= 1) { s.L.stop(0.5); s.Q.stop(0.5); subway = null; }
    }
    if (T.coo <= 0) { at('coo', { d: 5 + R() * 22, vol: 0.5 + 0.5 * R() }); T.coo = (3 + R() * 9) / (0.4 + 1.6 * park); }
    if (T.chirp <= 0) { if (park > 0.2) at('chirps', { d: 8 + R() * 30, vol: park }); T.chirp = 1 + R() * 4; }
    if (T.flutter <= 0) { at('flutter', { d: 4 + R() * 14, vol: 0.6 }); T.flutter = 20 + R() * 40; }
    if (T.build <= 0) {
      T.build = 30 + R() * 60;
      if (park < 0.5) {
        const d = 40 + R() * 110, pan = R() * 1.8 - 0.9, kind = R();
        if (kind < 0.45) { const n = 3 + Math.floor(R() * 5), f = 360 + R() * 140; let dl = 0; for (let i = 0; i < n; i++) { at('clang', { d, pan, f, vol: 0.8, delay: dl }); dl += 0.55 + R() * 0.25; } }
        else if (kind < 0.8) at('jackhammer', { d, pan, vol: 0.7 });
        else at('beeper', { d: d * 1.5, pan, n: 4 + Math.floor(R() * 5), vol: 0.5 });
      }
    }
    if (T.whistle <= 0) { if (park < 0.5) at('whistle', { d: 30 + R() * 60, vol: 0.4 + 0.6 * crowd }); T.whistle = 50 + R() * 70; }
    if (T.heli <= 0 && !heli) { heli = { t: 0, dur: 18 + R() * 10, p0: R() * 2 - 1 }; heli.L = E.loop('heli', { bus: 'amb', vol: 0, pan: heli.p0, d: 300, ref: 30 }); T.heli = 120 + R() * 180; }
    if (heli) {
      // going over: in from far off, overhead, away the other side
      const h = heli; h.t += dt;
      const k2 = h.t / h.dur;
      h.L.set({ vol: 0.55, pan: h.p0 * (1 - 2 * k2), d: 60 + 340 * Math.abs(1 - 2 * k2) });
      if (k2 >= 1) { h.L.stop(0.5); heli = null; }
    }
    // the crowd's footfalls
    if (T.steps <= 0) { if (crowd > 0.05) at('crowdStep', { d: 4 + R() * 12, vol: 0.12 + 0.2 * R(), surface: park > 0.6 ? 'grass' : 'hard', verb: 0.15 }); T.steps = 1 / (0.5 + 7 * crowd); }
  }
  // (force(name): an event now, for tests and scenes: honk, siren, subway, coo, chirp, flutter, build, whistle, heli)
  return { update, startMurmur, force(name) { if (name in T) T[name] = 0; }, get where() { return w; } };
}
