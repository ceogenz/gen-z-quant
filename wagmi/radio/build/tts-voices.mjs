// Gen Z Quant: the synthesised voices (Node data, for the voice build). The candidates the owner auditioned for Quant and
// Juno, by name (quant-A .. quant-F, juno-A .. juno-F), and for the side characters (bagsy-A/B, lev-A/B, gears-A .. gears-E,
// fiona-A/B, fomo-A/B, wick-A/B); the one picked for a speaker is recorded by `voices.mjs --tts <name>,..` in
// wagmi/radio/build/tts/picks.json, and wagmi/radio/build/tts.py renders that speaker's lines with it (see docs/VOICE-LINES.md).
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
// the side characters' clips: in their own energy (a clone keeps its reference's delivery), still not a game line
const BAGSY_REF = 'Yo, listen, listen. Best week of my whole life, okay? Lost it all on Monday, got it back on Tuesday, lost it again by lunch. Still smiling. That\'s a talent.';
const LEV_REF = 'Okay, everybody, listen to me. This is a once in a lifetime opportunity. I say that every week, but this week I mean it. Ten times, minimum. Don\'t ask me how.';
const GEARS_REF = 'Pop the hood. See that? Hand-wired, every bit of it. Took me three weekends and a lot of coffee. She hums now. Listen to her. That\'s the good stuff.';
const FIONA_REF = 'Hi, everybody! Oh my gosh, look at all of you! This is the best crowd ever, I\'m not even kidding. Phones up, smiles on, and let me hear some noise!';
const FOMO_REF = 'Sorry, sorry, I\'m here, I\'m here! The train was late, then my phone died, then I went to the wrong park. Did I miss it? Please tell me I didn\'t miss it.';
const WICK_REF = 'Let\'s go, let\'s go! Hands up, phones out, nobody past the rope! You, back up. You, you\'re good. Everybody else, keep that energy up!';
const LOUD = 'close-mic, clean dry studio audio, a real person in the moment, not a radio announcer.'; // (raises the pitch: pin it)

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
  // the side characters (invented voices, all adults; ZK keeps his macOS voice and changer): two candidates each
  // Bagsy: the Midtown crew lead; cocky, loud, sing-song mockery, never actually angry
  // (the first designs, 'loud' and 'having the time of his life', came out about 240 Hz, too high for a grown man: the
  // words now pin the range; the picks of 5 designs by pitch, low baritone about 105 Hz and raspy tenor about 130 Hz)
  'bagsy-A': { speaker: 'Bagsy', engine: 'qwen', desc: 'qwen-cocky-baritone', seed: 2101, refText: BAGSY_REF,
    design: `Male, early 30s, American, low-pitched mid baritone, relaxed swagger, cocky and amused, sing-song teasing delivery, grinning through every word, a grown man's chest voice, ${STUDIO}` },
  'bagsy-B': { speaker: 'Bagsy', engine: 'qwen', desc: 'qwen-raspy-tenor', seed: 2112, refText: BAGSY_REF,
    design: `Male, late 20s, American, raspy tenor in a normal adult male range, cocky and fast, mocking sing-song lilt, half laughing as he talks, ${STUDIO}` },
  // Lev (Leverage Larry): big, loud, panicky about his money; every sentence a pitch
  // ('booming' with 'loud and panicky' came out about 300 Hz: the panic is left to the lines; picked of 7 by pitch)
  'lev-A': { speaker: 'Lev', engine: 'qwen', desc: 'qwen-booming-salesman', seed: 2201, refText: LEV_REF,
    design: `Male, mid 40s, American, deep heavy bass-baritone, a big man's booming chest voice, a blustering salesman who pitches every sentence, worried about his money, ${STUDIO}` },
  'lev-B': { speaker: 'Lev', engine: 'qwen', desc: 'qwen-nasal-hustler', seed: 2212, refText: LEV_REF,
    design: `Male, late 30s, American, nasal mid-range voice in a normal adult male range, a fast-talking hustler, anxious and excitable, every sentence rises like a sales pitch, slightly out of breath, ${LOUD}` },
  // Gears: big, gentle, an ex-pit-crew mechanic; slow, warm, proud of his work
  'gears-A': { speaker: 'Gears', engine: 'qwen', desc: 'qwen-deep-warm', seed: 2311, refText: GEARS_REF,
    design: `Male, mid 50s, American, deep warm bass voice, slow and easygoing, gentle and kind, a proud old mechanic, a smile in every word, ${STUDIO}` },
  'gears-B': { speaker: 'Gears', engine: 'qwen', desc: 'qwen-soft-husky', seed: 2312, refText: GEARS_REF,
    design: `Male, mid 40s, American, soft husky baritone, calm and unhurried, a gentle giant, quiet pride, a dry little chuckle, ${STUDIO}` },
  // round 2 (the owner: an old Black man's voice): an older African-American man, about 60, deep, warm, a little gravel,
  // unhurried, kind; an invented voice. Picked of 15 designs by pitch (all about 90 to 100 Hz), how evenly the clone
  // holds it over three lines, and how rough the voicing is: C the slowest, D the most gravel, E the smoothest
  'gears-C': { speaker: 'Gears', engine: 'qwen', desc: 'qwen-old-deep-warm', seed: 2332, refText: GEARS_REF,
    design: `Male, around 60 years old, African-American, deep warm bass voice with a little gravel, low-pitched, a grown man's chest voice, slow and unhurried, gentle and kind, an old mechanic quietly proud of his work, ${STUDIO}` },
  'gears-D': { speaker: 'Gears', engine: 'qwen', desc: 'qwen-old-gravel', seed: 2353, refText: GEARS_REF,
    design: `Male, early 60s, African-American New Yorker, deep gravelly low voice, weathered and husky, unhurried easy pace, kind and steady, a grown man's chest voice, ${STUDIO}` },
  'gears-E': { speaker: 'Gears', engine: 'qwen', desc: 'qwen-old-smooth', seed: 2352, refText: GEARS_REF,
    design: `Male, early 60s, African-American New Yorker, deep gravelly low voice, weathered and husky, unhurried easy pace, kind and steady, a grown man's chest voice, ${STUDIO}` },
  // Fiona (Floor Price Fiona): the hype host on a megaphone; everything is the best thing ever
  // (an adult, and not to be mistaken for Juno, about 270 Hz: B is the lower, fuller one; picked of 7 by pitch)
  'fiona-A': { speaker: 'Fiona', engine: 'qwen', desc: 'qwen-big-hype-mezzo', seed: 2401, refText: FIONA_REF,
    design: `Female, early 30s, American, bright powerful mezzo voice, a party host working a crowd, loud and high energy, everything is the best thing ever, a big smile in the voice, ${LOUD}` },
  'fiona-B': { speaker: 'Fiona', engine: 'qwen', desc: 'qwen-husky-alto-mc', seed: 2402, refText: FIONA_REF,
    design: `Female, mid 30s, American, a full husky alto voice, a seasoned party MC hyping a crowd, loud and fast, everything is the best thing ever, ${LOUD}` },
  // Fomo: a Degen, always late; breathless, panicky, a whiny pitch
  // ('high whiny tenor' came out 280 to 340 Hz, a boy's pitch: a grown man's voice, a bit high; picked of 10 by pitch)
  'fomo-A': { speaker: 'Fomo', engine: 'qwen', desc: 'qwen-breathless-whiny', seed: 2531, refText: FOMO_REF,
    design: `Male, mid 20s, American, a grown man's voice, a bit high and whiny, breathless from running, panicky, talks fast, always sure he missed something, ${LOUD}` },
  'fomo-B': { speaker: 'Fomo', engine: 'qwen', desc: 'qwen-nasal-flustered', seed: 2551, refText: FOMO_REF,
    design: `Male, mid 20s, American, a grown man's mid-range voice with a whiny nasal edge, flustered and apologetic, rushing his words, out of breath, ${STUDIO}` },
  // Wick: a Degen of the hype crew at the rally; loud, jumpy, a hype man turned bouncer
  // ('loud', 'hyped' and every 'hype man' design came out 230 to 340 Hz, too high for a grown man: both are the
  // bouncer's words, B another seed, a higher and jumpier voice; picked of 12 by pitch)
  'wick-A': { speaker: 'Wick', engine: 'qwen', desc: 'qwen-gravel-bouncer', seed: 2601, refText: WICK_REF,
    design: `Male, early 30s, American, low gravelly voice, a big bouncer's chest voice, short barked phrases, restless and jumpy, ${STUDIO}` },
  'wick-B': { speaker: 'Wick', engine: 'qwen', desc: 'qwen-jumpy-bouncer', seed: 2621, refText: WICK_REF,
    design: `Male, early 30s, American, low gravelly voice, a big bouncer's chest voice, short barked phrases, restless and jumpy, ${STUDIO}` },
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
