# Gen Z Quant: voice lines

Every spoken line in the game, for a voice service or actors. Generated from the game's own source by
`node wagmi/radio/build/voices.mjs` (do not edit by hand: change the words in the game, then rebuild).

**The other voices in the build today are placeholders** made with the macOS speech voices (Apple's licence allows those for
personal, non-commercial use only). They are meant to be replaced by recordings or synthesised voices. Synthesised instead: Quant (`quant-A`), Juno (`juno-C`), Bagsy (`bagsy-A`), Lev (`lev-B`), Fiona (`fiona-A`), Wick (`wick-A`), Fomo (`fomo-A`), Gears (`gears-D`); see below.

## How to deliver

- One file per line, named by its **id**: `<id>.wav` (mono or stereo, 44.1 or 48 kHz, 24-bit preferred), dry: no music,
  no reverb, no phone effect, and for ZK no voice changer (the game adds ZK's voice changer and the phone/video-call
  sound itself). 0.2 s of room tone either side is fine; it is trimmed.
- Cutscene lines (scene `intro`) must fit their **window** (the time the shot gives them). Mission lines can run long.
- Put the files in `assets/voice/src/` and run `node wagmi/radio/build/voices.mjs`. Each recording then replaces its
  placeholder (trimmed, evened to the same loudness, ZK's run through his voice changer) as `assets/voice/<id>.m4a`;
  the manifest records which lines are real. Nothing in the game's code changes.
- New or changed lines in the game get their speaker's voice (synthesised, else a placeholder) the next time the build
  runs (`--all` rebuilds every line, e.g. after changing a placeholder voice in `wagmi/radio/build/cast.mjs`).

## Synthesised voices

A speaker can be voiced by an open text-to-speech model instead of the macOS placeholders: Qwen3-TTS 12Hz (a voice
designed from words, then cloned for every line) or Kokoro-82M, both Apache-2.0, run locally. The candidates the
owner auditioned are in `wagmi/radio/build/tts-voices.mjs`: Quant `quant-A` .. `quant-F`; Juno `juno-A` .. `juno-F`; Bagsy `bagsy-A`, `bagsy-B`; Lev `lev-A`, `lev-B`; Gears `gears-A` .. `gears-E`; Fiona `fiona-A`, `fiona-B`; Fomo `fomo-A`, `fomo-B`; Wick `wick-A`, `wick-B` (the audition files are in
`.scratch/tts/`, `.scratch/polish-voices/` and `.scratch/r2-voices/`). To give each pick to every line of that
speaker, in one command (today's picks):

```sh
node wagmi/radio/build/voices.mjs --tts quant-A,juno-C,bagsy-A,lev-B,fiona-A,wick-A,fomo-A,gears-D     # the picked names
```

- It records the pick in `wagmi/radio/build/tts/picks.json` (later builds keep using it: a changed line is synthesised
  in the same voice), keeps a picked Qwen voice's reference clip there too (that clip IS the voice), renders the
  speakers' lines with `wagmi/radio/build/tts.py` and rebuilds them like any other line (trim, -19 LUFS, AAC). It also
  builds any other line that is new or changed, as a plain build does; ZK and the rest keep their voices.
- Cutscene lines still fit their windows: Qwen takes a line again (up to 4 seeded takes) and Kokoro says it a little
  quicker when it is long; then the build tightens its pauses and stretches its tempo (the pitch kept, never a
  chipmunk) by at most 1.15x. The manifest's `source` says `tts:...` with the voice, and ` x1.08` when stretched.
- Back to the placeholder for one speaker: `--tts Juno=say`. A real recording in `assets/voice/src/` still wins.
- It needs the local renderer, not in the repo: the venv `.scratch/tts/venv` (Homebrew python3.11 with
  mlx-audio==0.5.8, kokoro-onnx==0.6.1, soundfile) and the weights in `.scratch/downloads/voices/` (`hf/` the two
  mlx-community Qwen3-TTS repos, `kokoro/` kokoro-v1.0.onnx and voices-v1.0.bin). Without it those lines fall back
  to the placeholders, with a warning. Renders are cached in `.scratch/tts/render/`.
- Credit (NOTICE): Qwen3-TTS by the Qwen team, Alibaba Cloud (Apache-2.0) or Kokoro-82M by hexgrad (Apache-2.0).

## The cast

| Speaker | Who | Direction | Voice in the build |
|---|---|---|---|
| Quant | the player: a teenager who went viral for a joke coin he made on a livestream (it pumped, it dumped); Moon is his dog | Quick, deadpan, very online, kinder than the comments think; the jokes are armour. When it is about Moon, the cool cracks. | quant-A: Qwen3-TTS (qwen-teen-tenor) |
| Bagsy | the Degens' Midtown crew lead: shades, a duffel "bag" always slung; his bags went to zero | Cocky street voice, loud, sing-song mockery; enjoys every second; never actually angry. | bagsy-A: Qwen3-TTS (qwen-cocky-baritone) |
| ZK | the Degens' boss ("Zero Knowledge"): an anonymous influencer in a chrome visor, heard through a voice changer | Calm, slow, theatrical menace; a streamer who loves his own show. Never shouts. Smiles through the threats. | Daniel + voice changer (placeholder) |
| Juno | Quant's friend from the group chat, an on-chain sleuth who reads wallets like gossip; mostly a voice on the phone | Quick, friendly, sharp; talks fast because she thinks fast; dry about Quant's choices but on his side. | juno-C: Qwen3-TTS (qwen-low-wry) |
| Fomo | a Degen, always late | Breathless, panicky, running in late; a whiny pitch. | fomo-A: Qwen3-TTS (qwen-breathless-whiny) |
| Lev | Leverage Larry, runs the Degens in Midtown | Big, loud, panicky about his money; every sentence a pitch. | lev-B: Qwen3-TTS (qwen-nasal-hustler) |
| Gears | big, gentle, an ex-pit-crew mechanic with an EV tuning garage | Slow, warm, proud of his work. | gears-D: Qwen3-TTS (qwen-old-gravel) |
| Fiona | Floor Price Fiona, the Degens' hype host | A hype host on a megaphone; everything is the best thing ever. | fiona-A: Qwen3-TTS (qwen-big-hype-mezzo) |
| Wick | a Degen of the hype crew at the $MOON2 rally | Loud, jumpy, a hype man turned bouncer. | wick-A: Qwen3-TTS (qwen-gravel-bouncer) |

## Opening cutscene

The opening cutscene "Dognapped" (wagmi/intro.js): E 37th St at golden hour; Moon is snatched, then ZK calls on video.

| # | id | Speaker | Line | Window | Direction |
|---|---|---|---|---|---|
| 1 | `intro-quant-delete-your-account-good` | Quant | 'Delete your account.' Good morning to you too. | 3.1 s | Reading a hate comment off his phone, walking; dry, unbothered. |
| 2 | `intro-quant-okay-okay-car-then` | Quant | Okay, okay. Car, then the park, then we log off forever. | 3.6 s | To Moon, who is tugging for the car; fond, a little tired. |
| 3 | `intro-quant-kidding-obviously` | Quant | Kidding. Obviously. | 1.4 s | Quick aside, half to himself. A beat of a smile. |
| 4 | `intro-bagsy-yo-coin-kid-huge` | Bagsy | Yo! Coin kid! Huge fan. Sign my bags? | 2.5 s | Jumping out of the van, arms wide; fake-fan enthusiasm. |
| 5 | `intro-quant-i-dont-do-autographs` | Quant | I don't do autographs. I do 'please step back'. | 3.1 s | Stepping back, polite but firm; trying to stay cool. |
| 6 | `intro-bagsy-our-bags-went-to` | Bagsy | Our bags went to zero. So we're borrowing something. | 3.4 s | Grinning, getting closer; "borrowing" is a threat. |
| 7 | `intro-quant-moon` | Quant | Moon! | 1.4 s | A shout, lunging as Moon is grabbed. Real panic, full voice. |
| 8 | `intro-bagsy-want-the-dog-pick` | Bagsy | Want the dog? Pick up your phone. Stay rich. | 2.9 s | Over his shoulder, jumping back in the van; taunting. |
| 9 | `intro-zk-quant-big-fan-loved` | ZK | Quant. Big fan. Loved the coin. Loved it more on the way up. | 4.0 s | Opening the call; slow, mock-friendly, savouring it. A sting on "on the way up". |
| 10 | `intro-quant-who-is-this` | Quant | Who is this? | 1.3 s | Out of breath, just got up off the pavement. |
| 11 | `intro-zk-zero-knowledge-zk-you` | ZK | Zero Knowledge. ZK. You don't know me. That's the brand. | 3.8 s | Introducing himself like a brand; smug. "ZK" said "Zee Kay". |
| 12 | `intro-quant-give-moon-back` | Quant | Give Moon back. | 1.3 s | Low, angry, trying to keep it together. |
| 13 | `intro-zk-my-community-lost-a` | ZK | My community lost a lot of money. Moon is collateral. | 3.5 s | Leaning into the lens on "collateral". Business-like menace. |
| 14 | `intro-zk-you-pay-my-community` | ZK | You pay my community back. Terms by text. And stop posting. | 3.9 s | The demand, hand up to the lens; each sentence a full stop. Cold on "stop posting". |
| 15 | `intro-quant-did-a-guy-with` | Quant | Did a guy with a voice changer just tell me to log off? | 3.6 s | After the call drops, to himself; disbelief turning into a bit of a laugh. |
| 16 | `intro-quant-okay-you-took-the` | Quant | Okay. You took the wrong dog. | 2.0 s | Quiet resolve, turning to his car. The line of the trailer. |

## Mission 1

Mission 1 (wagmi/mission/m1.js): Juno's phone call on the drive; the Degens at Chelsea Park; searching the van.

| # | id | Speaker | Line | Window | Direction |
|---|---|---|---|---|---|
| 1 | `m1-juno-quant-why-is-your` | Juno | Quant. Why is your dog's tag doing forty down Fifth Avenue? |  | On the phone, already typing; amused and alarmed. |
| 2 | `m1-quant-because-some-guys-in` | Quant | Because some guys in a van took Moon. |  | Driving, flat and fast. |
| 3 | `m1-juno-okay-im-on-the` | Juno | ...Okay. I'm on the tag. They're cutting west. Who were they? |  | A beat as it sinks in, then all business, fast. |
| 4 | `m1-quant-guys-who-lost-money` | Quant | Guys who lost money. |  | Deadpan. |
| 5 | `m1-juno-so-everyone-great-narrows` | Juno | So, everyone. Great, narrows it down. |  | Sarcastic, quick. |
| 6 | `m1-juno-tag-stopped-chelsea-park` | Juno | Tag stopped. Chelsea Park, Ninth and Twenty-Eighth. Don't do anything stupid. |  | Reading the location off her screen; the warning is sincere. |
| 7 | `m1-quant-define-stupid` | Quant | Define stupid. |  | Deadpan, already decided. |
| 8 | `m1-juno-going-there-alone` | Juno | Going there alone. |  | Flat, pointed. |
| 9 | `m1-quant-then-im-already-doing` | Quant | Then I'm already doing it. |  | A small grin in the voice. Hangs up. |
| 10 | `m1-fomo-wait-did-i-miss` | Fomo | Wait! Did I miss the pump? |  | Running in across the lawn, out of breath, shouting. |
| 11 | `m1-bagsy-you-always-miss-the` | Bagsy | You always miss the pump! |  | Shouted back mid-fight, exasperated. |
| 12 | `m1-bagsy-told-you-to-check` | Bagsy | Told you to check your DMs. You didn't check your DMs. |  | Squaring up on the lawn, teasing. |
| 13 | `m1-quant-been-a-little-busy` | Quant | Been a little busy getting robbed. |  | Dry, fists coming up. |
| 14 | `m1-bagsy-nothing-personal-kid-its` | Bagsy | Nothing personal, kid. It's just extremely personal. |  | Cracking his knuckles; the fight starts on "personal". |
| 15 | `m1-quant-moons-collar-chewed-right` | Quant | Moon's collar. Chewed right through. |  | Quiet, holding the collar from the van; worried. |
| 16 | `m1-quant-hes-got-my-dog` | Quant | He's got my dog. And my number. |  | Reading ZK's text on the burner; grim. |
| 17 | `m1-quant-cool-cool-cool-cool` | Quant | Cool. Cool cool cool. |  | Not cool at all; a nervous, deadpan spiral. |

## Mission 2

Mission 2 (wagmi/mission/m2*.js).

| # | id | Speaker | Line | Window | Direction |
|---|---|---|---|---|---|
| 1 | `m2-juno-dont-look-around-im` | Juno | Don't look around. I'm not there. |  |  |
| 2 | `m2-quant-you-said-bryant-park` | Quant | You said Bryant Park. |  |  |
| 3 | `m2-juno-i-said-bring-it` | Juno | I said bring it to Bryant Park. I'm on the library's wifi. It's free and it has a lion. |  |  |
| 4 | `m2-juno-hold-the-burner-up` | Juno | Hold the burner up. Okay. It has a twin. Same batch, same buyer. |  |  |
| 5 | `m2-juno-moon-got-tagged-in` | Juno | Moon got tagged in four hundred posts today. Your dog has a bigger following than you. |  |  |
| 6 | `m2-quant-everyone-has-a-bigger` | Quant | Everyone has a bigger following than me. They just hate me. |  |  |
| 7 | `m2-juno-the-twin-pinged-twenty` | Juno | The twin pinged twenty minutes ago. A van, idling in Times Square. Seventh and Forty-Seventh. |  |  |
| 8 | `m2-juno-dont-run-up-to` | Juno | Don't run up to it. Follow it. It'll take us to the rest of them. |  |  |
| 9 | `m2-quant-follow-the-van-got` | Quant | Follow the van. Got it. |  |  |
| 10 | `m2-juno-youre-late-sit-burner` | Juno | You're late. Sit. Burner, please. |  |  |
| 11 | `m2-quant-hi-juno-great-to` | Quant | Hi, Juno. Great to see you too. |  |  |
| 12 | `m2-juno-plugging-it-in-look` | Juno | Plugging it in. Look: two SIMs, one sale, switched on the same minute. Yours, and its twin. |  |  |
| 13 | `m2-lev-my-car-my-beautiful` | Lev | My car! My beautiful leveraged car! |  |  |
| 14 | `m2-lev-not-financial-advice-none` | Lev | Not financial advice! None of it! Ever! |  |  |
| 15 | `m2-quant-that-is-my-door` | Quant | That is my door. |  |  |
| 16 | `m2-quant-they-know-where-i` | Quant | They know where I live. |  |  |
| 17 | `m2-lev-whos-that-liquidate-him` | Lev | Who's that? Liquidate him! |  |  |
| 18 | `m2-lev-wait-coin-kid-in` | Lev | Wait. Coin kid? In MY yard? Liquidate him! |  |  |
| 19 | `m2-lev-everybody-out-of-the` | Lev | Everybody out of the boxes! You're all on payroll! |  |  |
| 20 | `m2-lev-you-cant-catch-leverage` | Lev | You can't catch leverage, kid! |  |  |
| 21 | `m2-juno-ive-got-the-van` | Juno | I've got the van. HODL Moving Co. 'We never let go.' Cute. |  |  |
| 22 | `m2-quant-they-took-my-dog` | Quant | They took my dog, Juno. None of this is cute. |  |  |
| 23 | `m2-juno-its-registered-to-a` | Juno | It's registered to a Leverage Larry. Lev. He runs Midtown for the Degens. |  |  |
| 24 | `m2-quant-leverage-larry-did-his` | Quant | Leverage Larry. Did his parents hate him? |  |  |
| 25 | `m2-juno-he-picked-it-he` | Juno | He picked it. He has it tattooed. In Comic Sans. |  |  |
| 26 | `m2-juno-hang-back-if-they` | Juno | Hang back. If they make you, they'll bolt. |  |  |
| 27 | `m2-juno-thats-levs-car-hes` | Juno | That's Lev's car. He's heading for Herald Square. |  |  |
| 28 | `m2-juno-ram-him-quant-gently` | Juno | Ram him, Quant. Gently. Ish. |  |  |
| 29 | `m2-quant-theres-no-gentle-way` | Quant | There's no gentle way to ram a car. |  |  |
| 30 | `m2-juno-i-saw-the-chat` | Juno | I saw the chat. They know where you live, so you're not sleeping there tonight. |  |  |
| 31 | `m2-quant-where-am-i-sleeping` | Quant | Where am I sleeping? |  |  |
| 32 | `m2-juno-gears-has-a-room` | Juno | Gears has a room over his garage. West Chelsea. He builds rockets for cars. He's nice. Mostly. |  |  |
| 33 | `m2-quant-pete-the-its-a` | Quant | Pete. The 'it's a dog' guy. |  |  |

## Mission 3

Mission 3 (wagmi/mission/m3*.js).

| # | id | Speaker | Line | Window | Direction |
|---|---|---|---|---|---|
| 1 | `m3-gears-cold-gas-thrusters-little` | Gears | Cold-gas thrusters. Little puffs of nitrogen. Very safe. Mostly. |  |  |
| 2 | `m3-quant-define-mostly` | Quant | Define mostly. |  |  |
| 3 | `m3-gears-i-tested-them-on` | Gears | I tested them on my van. Van's fine. It's on the roof now. |  |  |
| 4 | `m3-juno-quant-are-you-watching` | Juno | Quant. Are you watching this? They put Moon on a coin. Live. |  |  |
| 5 | `m3-fiona-moon-two-number-go` | Fiona | Moon two! Number go up! Number go UP! |  |  |
| 6 | `m3-juno-its-up-four-thousand` | Juno | It's up four thousand percent. Your dog is outperforming you again. |  |  |
| 7 | `m3-quant-im-going-to-go` | Quant | I'm going to go unplug it. |  |  |
| 8 | `m3-gears-go-get-your-dog` | Gears | Go get your dog off that screen. |  |  |
| 9 | `m3-fiona-welcome-to-the-launch` | Fiona | Welcome to the launch of the century! Moon two! |  |  |
| 10 | `m3-fiona-number-go-up-number` | Fiona | Number go up! Number go UP! |  |  |
| 11 | `m3-wick-yo-thats-the-coin` | Wick | Yo. That's the coin kid. Protect the streams! |  |  |
| 12 | `m3-fiona-wait-why-is-it` | Fiona | Wait. Why is it red? Why is it going down? |  |  |
| 13 | `m3-fiona-its-a-healthy-correction` | Fiona | It's a healthy correction! Bye! |  |  |
| 14 | `m3-quant-not-financial-advice` | Quant | Not financial advice. |  |  |
| 15 | `m3-quant-pete-the-guy-who` | Quant | Pete. The guy who wants out. |  |  |
| 16 | `m3-gears-youre-back-and-the` | Gears | You're back. And the car's in one piece. |  |  |
| 17 | `m3-quant-mostly` | Quant | Mostly. |  |  |
| 18 | `m3-gears-mostly` | Gears | Mostly? |  |  |
| 19 | `m3-quant-moon-sleeps-on-my` | Quant | Moon sleeps on my feet. Every night. Except last night. |  |  |
| 20 | `m3-quant-the-thrusters-work-great` | Quant | The thrusters work great. Very safe. Mostly. |  |  |
| 21 | `m3-gears-ha-rooms-upstairs-kid` | Gears | Ha. Room's upstairs, kid. Get some sleep. |  |  |
| 22 | `m3-fiona-buy-the-dip-there` | Fiona | Buy the dip! There is no dip! |  |  |
| 23 | `m3-fiona-diamond-hands-everybody-diamond` | Fiona | Diamond hands, everybody! Diamond hands! |  |  |
| 24 | `m3-fiona-dont-look-at-the` | Fiona | Don't look at the kid! Look at the chart! |  |  |
| 25 | `m3-fiona-moon-two-to-the` | Fiona | Moon two! To the moon! |  |  |
| 26 | `m3-fiona-we-lost-a-stream` | Fiona | We lost a stream! Keep pumping! |  |  |
| 27 | `m3-fiona-two-streams-down-this` | Fiona | Two streams down! This is fine! Pump harder! |  |  |
| 28 | `m3-wick-backup-protect-the-last` | Wick | Backup! Protect the last stream! |  |  |
| 29 | `m3-juno-its-a-kol-rally` | Juno | It's a KOL rally. Fiona talks, her followers buy. |  |  |
| 30 | `m3-juno-the-stream-runs-off` | Juno | The stream runs off three ring lights in the park. Kill the rigs, the stream dies. |  |  |
| 31 | `m3-quant-and-no-stream-no` | Quant | And no stream, no pump. |  |  |
| 32 | `m3-juno-and-no-pump-fionas` | Juno | And no pump, Fiona's just a lady shouting at a fountain. |  |  |
| 33 | `m3-juno-two-degens-cars-on` | Juno | Two Degens cars on you. The Village is all crooked streets. Use them. |  |  |
| 34 | `m3-quant-gears-said-the-thrusters` | Quant | Gears said the thrusters were very safe. |  |  |
| 35 | `m3-juno-gears-says-that-about` | Juno | Gears says that about everything. |  |  |
| 36 | `m3-juno-moon-two-is-down` | Juno | Moon two is down ninety-nine point eight percent. The stream died mid-sentence. |  |  |
| 37 | `m3-quant-good` | Quant | Good. |  |  |
| 38 | `m3-juno-everyone-who-bought-it` | Juno | Everyone who bought it is furious. At ZK, for once. Go get some sleep. |  |  |
