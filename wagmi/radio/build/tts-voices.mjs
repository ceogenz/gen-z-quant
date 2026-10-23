// WAGMI City: the synthesised voices (Node data, for the voice build). The candidates the owner auditioned for Quant and
// Juno, by name (quant-A .. quant-F, juno-A .. juno-F); the one picked for a speaker is set in cast.mjs (CAST[..].tts),
// and wagmi/radio/build/tts.py renders that speaker's lines with it (voices.mjs runs it; see docs/VOICE-LINES.md).
//
//   engine 'qwen'    Qwen3-TTS 12Hz (Apache-2.0) on Apple silicon through mlx-audio (MIT). The voice is DESIGNED once
//                    from words (design, with the 1.7B VoiceDesign model and a fixed seed), saved as a reference clip
//                    (ref: the voice itself, keep it), then every line is CLONED from that clip by the 0.6B Base model.
//   engine 'kokoro'  Kokoro-82M (Apache-2.0) through kokoro-onnx (MIT): a stock voice or a blend of them, at a speed.
//                    Deterministic: the same words give the same audio.
// Only the rendered audio ships. The models, the venv and the reference clips of voices nobody picked stay in
// .scratch/tts (not in the repo); a picked qwen voice's reference clip is copied to wagmi/radio/build/tts/.

// the clip each qwen voice is designed on: neutral words in character, not a game line (about 8 to 10 s)
const QUANT_REF = 'Honestly, I just wanted to walk my dog and get a bagel. Instead my phone has been buzzing all morning, and half the internet is mad at me. Cool. Normal Tuesday.';
const JUNO_REF = 'Okay, so I pulled the wallet history, and it is honestly kind of a mess. Three transfers, same address, all after midnight. I will send you the screenshots, just do not do anything weird with them.';
const STUDIO = 'close-mic, clean dry studio audio, natural and conversational, not an announcer.';

export const VOICES = {
  // Quant: a normal teenager (the owner: the macOS voice was 'too robotic')
  'quant-A': { speaker: 'Quant', engine: 'qwen', desc: 'qwen-teen-tenor', seed: 1701, refText: QUANT_REF,
    design: `Male, 17 years old, American, light tenor, casual and deadpan, quick dry delivery, very online, slightly nasal teenage timbre, ${STUDIO}` },
  'quant-B': { speaker: 'Quant', engine: 'qwen', desc: 'qwen-young-mumbly', seed: 1702, refText: QUANT_REF,
    design: `Male, 16 years old, American teenager, young light tenor voice, relaxed and quick, mumbly deadpan humour, a bit online, ${STUDIO}` },
  // (seed 1703 with 'high-school kid, clear mid tenor' came out a child's pitch, about 220 Hz: re-rolled)
  'quant-C': { speaker: 'Quant', engine: 'qwen', desc: 'qwen-midrange-dry', seed: 1753, refText: QUANT_REF,
    design: 'Male, 17 years old, American high-school senior, a normal teenage boy\'s voice in a comfortable mid-low range, quick and dry, sarcastic but warm underneath, close-mic, clean dry studio audio, natural and conversational, not an announcer.' },
  'quant-D': { speaker: 'Quant', engine: 'kokoro', desc: 'kokoro-puck', voice: { am_puck: 1 }, speed: 1.1 },
  'quant-E': { speaker: 'Quant', engine: 'kokoro', desc: 'kokoro-liam', voice: { am_liam: 1 }, speed: 1.1 },
  'quant-F': { speaker: 'Quant', engine: 'kokoro', desc: 'kokoro-puck-liam-blend', voice: { am_puck: 0.7, am_liam: 0.3 }, speed: 1.1 },
  // Juno: a teenage girl; quick, friendly, sharp
  'juno-A': { speaker: 'Juno', engine: 'qwen', desc: 'qwen-bright-fast', seed: 1601, refText: JUNO_REF,
    design: `Female, 16 years old, American, bright mezzo-soprano, quick and friendly, talks fast, sharp and amused, warm, ${STUDIO}` },
  'juno-B': { speaker: 'Juno', engine: 'qwen', desc: 'qwen-bright-dry', seed: 1602, refText: JUNO_REF,
    design: `Female, 16 years old, American teenager, bright and clear, quick talker, friendly with a dry deadpan edge, confident and smart, ${STUDIO}` },
  'juno-C': { speaker: 'Juno', engine: 'qwen', desc: 'qwen-low-wry', seed: 1603, refText: JUNO_REF,
    design: `Female, 17 years old, American, slightly husky low voice, fast and focused, dry sarcastic humour, warm underneath, casual teen speech, ${STUDIO}` },
  'juno-D': { speaker: 'Juno', engine: 'kokoro', desc: 'kokoro-kore', voice: { af_kore: 1 }, speed: 1.2 },
  'juno-E': { speaker: 'Juno', engine: 'kokoro', desc: 'kokoro-heart', voice: { af_heart: 1 }, speed: 1.2 },
  'juno-F': { speaker: 'Juno', engine: 'kokoro', desc: 'kokoro-heart-kore-blend', voice: { af_heart: 0.6, af_kore: 0.4 }, speed: 1.2 },
};

// how the synthesised voices should say a few words (on top of cast.mjs SAY; the subtitles keep the spelling)
export const TTS_SAY = [
  [/\bHODL\b/g, 'hoddle'],
  [/^\.\.\./, ''],
];

// a source tag for the manifest and NOTICE: what made the line
export const ttsSource = (name, v = VOICES[name]) => v.engine === 'qwen'
  ? `tts:qwen3-tts-12hz-0.6b-base:${name}(design 1.7b-voicedesign seed ${v.seed})`
  : `tts:kokoro-82m-v1.0:${name}(${Object.entries(v.voice).map(([k, w]) => (w === 1 ? k : `${w}*${k}`)).join('+')}@${v.speed})`;
