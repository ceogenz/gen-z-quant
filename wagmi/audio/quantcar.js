// WAGMI City: Quant's car, heard from the driver's seat. A supercar: its engine (supercar.js) is a V8 voice over a
// virtual six-speed gearbox (revs that climb and drop at each shift, pops on the upshifts, crackle on the overrun, blips
// on the downshifts, the limiter, an idle burble). Over and around it, following the speed (v) and the load (the throttle):
//   turbine  a narrow band of rushing air whistling high, spooling up while the boost burns
//   tyres, grain, wind   the road under it (rougher on kerbs, grass and pavement) and the air over it
//   squeal   two narrow wobbling bands when the tyres let go (hard cornering, braking at speed, a launch, wheelspin)
//   boost    the cold-gas thrusters' hiss in bursts, the rocket's saturated roar, its crackle and its low rumble, lit by a
//            whump; the crackle lingers a moment when it cuts
// The graph exists only while Quant is at the wheel (built when he gets in, taken down a few seconds after he gets out).
// The engine's loops are fetched once, when the mixer starts (ready: a promise for them).
import { createSupercar, preloadEngine } from './supercar.js';

export function createQuantCar(M, E, dest = M.bus.sfx, opt = {}) {
  const ready = preloadEngine(M.ctx, opt.voice).catch(() => null);
  let G = null, onW = 0, off = 0, burn = 0, tail = 0, gasT = 0, launch = 0, lastBoost = false;
  const ramp = (p, v, k = 0.04) => p.setTargetAtTime(v, M.now(), k);

  function build() {
    const out = M.gain(0, dest), S = [];
    const add = (s) => (S.push(s), s);
    const eng = createSupercar(M, out, { voice: opt.voice });
    const tn = add(M.src(M.white)), tbp = M.filt('bandpass', 2000, 14), tg = M.gain(0); tn.connect(tbp); tbp.connect(tg); tg.connect(out);
    const tw = add(M.osc('sine', 1800)), twg = M.gain(0); tw.connect(twg); twg.connect(out);
    const ty = add(M.src(M.pink)), tlp = M.filt('lowpass', 400, 0.7), tyg = M.gain(0); ty.connect(tlp); tlp.connect(tyg); tyg.connect(out);
    const gr = add(M.src(M.brown)), glp = M.filt('lowpass', 110, 0.8), gg = M.gain(0); gr.connect(glp); glp.connect(gg); gg.connect(out);
    const wn = add(M.src(M.white)), wbp = M.filt('bandpass', 800, 0.5), wng = M.gain(0); wn.connect(wbp); wbp.connect(wng); wng.connect(out);
    const sq = add(M.src(M.white)), sb1 = M.filt('bandpass', 1950, 14), sb2 = M.filt('bandpass', 3300, 11), sqg = M.gain(0), wob = add(M.osc('sine', 6.5)), wobg = M.gain(70);
    sq.connect(sb1); sq.connect(sb2); sb1.connect(sqg); sb2.connect(sqg); sqg.connect(out); wob.connect(wobg); wobg.connect(sb1.frequency); wobg.connect(sb2.frequency);
    const cg = add(M.src(M.white)), chp = M.filt('highpass', 2600, 0.7), cpk = M.filt('peaking', 6000, 1), cgg = M.gain(0); cpk.gain.value = 6; cg.connect(chp); chp.connect(cpk); cpk.connect(cgg); cgg.connect(out);
    const rk = add(M.src(M.brown, { rate: 1.3 })), rlp = M.filt('lowpass', 900, 0.8), rsh = M.shaper(3), rg = M.gain(0); rk.connect(rlp); rlp.connect(rsh); rsh.connect(rg); rg.connect(out);
    const ck = add(M.src(M.crackle)), cbp = M.filt('bandpass', 1600, 0.6), ckg = M.gain(0); ck.connect(cbp); cbp.connect(ckg); ckg.connect(out);
    const rl = add(M.src(M.brown, { rate: 0.6 })), rll = M.filt('lowpass', 70, 0.9), rlg = M.gain(0); rl.connect(rll); rll.connect(rlg); rlg.connect(out);
    for (const s of S) s.start();
    G = { out, S, eng, tbp, tg, tw, twg, tlp, tyg, gg, wbp, wng, sb1, sb2, sqg, cgg, rlp, rg, ckg, rlg };
  }
  function teardown() { const t = M.now(); G.eng.stop(t); for (const s of G.S) try { s.stop(t + 0.05); } catch {} const out = G.out; if (M.live) setTimeout(() => { try { out.disconnect(); } catch {} }, 200); G = null; }

  // s: { on, speed m/s (signed), throttle -1..1, boost, latAcc m/s^2, slide 0..1, rough 0..1 (kerb, pavement, grass), jolt (a kerb's bump) }
  function update(dt, s) {
    if (s.on && !G) build();
    if (!G) return;
    onW += Math.sign((s.on ? 1 : 0) - onW) * Math.min(Math.abs((s.on ? 1 : 0) - onW), dt / 0.35);
    if (!s.on) { off += dt; if (off > 3 && onW <= 0) { teardown(); return; } } else off = 0;
    const v = Math.abs(s.speed), v01 = Math.min(1, v / 56), th = s.throttle || 0;
    const fwd = s.speed >= -0.5 ? 1 : -1;
    const load = Math.max(0, th * fwd), braking = th * fwd < 0 ? Math.min(1, v / 10) : 0;
    const boost = !!s.boost && th > 0 && s.on;
    // the boost: a whump as it lights, the burn easing up, a crackling tail as it cuts
    if (boost && !lastBoost) { E.play('boostIgnite', { vol: 0.8 }); launch = v < 10 ? 0.6 : 0; }
    if (!boost && lastBoost) tail = 0.6;
    lastBoost = boost;
    burn += ((boost ? 1 : 0) - burn) * Math.min(1, dt / (boost ? 0.12 : 0.3));
    tail = Math.max(0, tail - dt);
    // launches chirp the tyres
    if (s.on && th > 0.5 && v < 4 && !launch) launch = 0.25;
    launch = Math.max(0, launch - dt);
    const on = onW;
    // the engine (its gearbox reads the speed and the throttle)
    const st = G.eng.update(dt, { speed: s.speed, throttle: th, on: on > 0.01 });
    // the turbine: a whistle spooling up with the burn, over the engine
    ramp(G.tbp.frequency, Math.min(9000, 2200 + v * 70 + burn * 1500)); ramp(G.tg.gain, on * (0.04 * v01 + burn * (0.3 + 0.35 * v01)));
    ramp(G.tw.frequency, 1600 + 2600 * burn + v * 40, 0.25); ramp(G.twg.gain, on * burn * 0.035, 0.2);
    const vr = Math.min(1, v / 30), rough = s.rough || 0;
    ramp(G.tlp.frequency, 260 + v * 20 + rough * 300); ramp(G.tyg.gain, on * (0.32 * Math.pow(vr, 1.3)) * (1 + rough * 0.6));
    ramp(G.gg.gain, on * Math.min(1, v / 8) * (0.06 + 0.4 * rough));
    ramp(G.wbp.frequency, 600 + v * 26); ramp(G.wng.gain, on * 0.2 * v01 * v01);
    const slip = Math.min(1, Math.max(0, ((s.latAcc || 0) - 13) / 14)) + braking * Math.min(1, Math.max(0, (v - 10) / 14)) * 0.7 + (launch > 0 ? 0.55 : 0) + (s.slide || 0) + (st.stuck > 0.5 ? 0.6 : 0);
    ramp(G.sqg.gain, on * 0.55 * Math.min(1, slip), 0.03);
    ramp(G.sb1.frequency, 1800 + 400 * Math.min(1, slip)); ramp(G.sb2.frequency, 3100 + 500 * Math.min(1, slip));
    // the cold gas: bursts while it burns
    gasT -= dt;
    if (gasT <= 0) { gasT = 0.05 + Math.random() * 0.14; ramp(G.cgg.gain, on * burn * (Math.random() < 0.55 ? 0.3 : 0.07), 0.015); }
    ramp(G.rlp.frequency, 650 + 700 * burn);
    ramp(G.rg.gain, on * 0.34 * burn, 0.03);
    ramp(G.ckg.gain, on * (0.4 * burn + 0.5 * tail), 0.03);
    ramp(G.rlg.gain, on * 0.45 * burn, 0.05);
    ramp(G.out.gain, 1, 0.05);
    if (s.jolt > 0.02 && s.on) E.play('kerb', { k: Math.min(1, s.jolt), vol: 0.9 });
  }
  return { update, ready, get built() { return !!G; }, get engine() { return G ? { gear: G.eng.state.gear, rpm: Math.round(G.eng.state.rpm), load: +G.eng.state.load.toFixed(2), loops: G.eng.loaded } : null; } };
}
