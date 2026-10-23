// Gen Z Quant: who speaks how (the voice build's cast, the line sheet's directions).
// voice / rate (words a minute) / pbas: the macOS placeholder (say -v '?' lists them); fx 'zk': ZK's voice changer,
// baked into his files; call: the sound the game puts on the line live ('phone' a handset, 'video' a laptop call).
export const CAST = {
  Quant: { voice: 'Eddy (English (US))', rate: 188, who: 'the player: a teenager who went viral for a joke coin he made on a livestream (it pumped, it dumped); Moon is his dog',
    direction: 'Quick, deadpan, very online, kinder than the comments think; the jokes are armour. When it is about Moon, the cool cracks.' },
  Bagsy: { voice: 'Rocko (English (US))', rate: 182, who: 'the Degens\' Midtown crew lead: shades, a duffel "bag" always slung; his bags went to zero',
    direction: 'Cocky street voice, loud, sing-song mockery; enjoys every second; never actually angry.' },
  ZK: { voice: 'Daniel', rate: 165, fx: 'zk', call: 'video', zk: { semis: -3, octave: 0.42, ring: 0.3, ringHz: 46 },
    who: 'the Degens\' boss ("Zero Knowledge"): an anonymous influencer in a chrome visor, heard through a voice changer',
    direction: 'Calm, slow, theatrical menace; a streamer who loves his own show. Never shouts. Smiles through the threats.' },
  Juno: { voice: 'Samantha', rate: 205, call: 'phone', who: 'Quant\'s friend from the group chat, an on-chain sleuth who reads wallets like gossip; mostly a voice on the phone',
    direction: 'Quick, friendly, sharp; talks fast because she thinks fast; dry about Quant\'s choices but on his side.' },
  Fomo: { voice: 'Reed (English (US))', rate: 220, pbas: 52, who: 'a Degen, always late',
    direction: 'Breathless, panicky, running in late; a whiny pitch.' },
  // (the later missions' people: placeholders ready for their lines)
  Lev: { voice: 'Rocko (English (US))', rate: 178, pbas: 34, who: 'Leverage Larry, runs the Degens in Midtown', direction: 'Big, loud, panicky about his money; every sentence a pitch.' },
  Stops: { voice: 'Rocko (English (US))', rate: 190, pbas: 50, who: 'a lanky Degen in an acid-green beanie', direction: 'Few words, mumbled, nervous.' },
  Gears: { voice: 'Reed (English (US))', rate: 165, pbas: 34, who: 'big, gentle, an ex-pit-crew mechanic with an EV tuning garage', direction: 'Slow, warm, proud of his work.' },
  'Coach Ruth': { voice: 'Shelley (English (US))', rate: 182, pbas: 40, who: 'a retired boxing champ with a gym on W 125th St', direction: 'Tough love; short sentences; a smile under it.' },
  Pete: { voice: 'Reed (English (US))', rate: 205, pbas: 56, who: 'Paper Hands Pete, a Degen who wants out', direction: 'Nervous, quick, apologetic.' },
  Fiona: { voice: 'Flo (English (US))', rate: 215, who: 'Floor Price Fiona, the Degens\' hype host', direction: 'A hype host on a megaphone; everything is the best thing ever.' },
  Wick: { voice: 'Rocko (English (US))', rate: 198, pbas: 44, who: 'a Degen of the hype crew at the $MOON2 rally', direction: 'Loud, jumpy, a hype man turned bouncer.' },
  default: { voice: 'Reed (English (US))', rate: 190, who: '', direction: '' },
};

// how the speech voices should say a few words (the subtitles keep the spelling)
export const SAY = [
  [/\bZK\b/g, 'Zee Kay'],
  [/\bDMs\b/g, 'D M\'s'],
  [/\bMOON\b/g, 'Moon'],
  [/^\.\.\./, ''],
];

// a note for each line (the sheet's direction column)
export const DIRECTION = {
  'intro-quant-delete-your-account-good': 'Reading a hate comment off his phone, walking; dry, unbothered.',
  'intro-quant-okay-okay-car-then': 'To Moon, who is tugging for the car; fond, a little tired.',
  'intro-quant-kidding-obviously': 'Quick aside, half to himself. A beat of a smile.',
  'intro-bagsy-yo-coin-kid-huge': 'Jumping out of the van, arms wide; fake-fan enthusiasm.',
  'intro-quant-i-dont-do-autographs': 'Stepping back, polite but firm; trying to stay cool.',
  'intro-bagsy-our-bags-went-to': 'Grinning, getting closer; "borrowing" is a threat.',
  'intro-quant-moon': 'A shout, lunging as Moon is grabbed. Real panic, full voice.',
  'intro-bagsy-want-the-dog-pick': 'Over his shoulder, jumping back in the van; taunting.',
  'intro-zk-quant-big-fan-loved': 'Opening the call; slow, mock-friendly, savouring it. A sting on "on the way up".',
  'intro-quant-who-is-this': 'Out of breath, just got up off the pavement.',
  'intro-zk-zero-knowledge-zk-you': 'Introducing himself like a brand; smug. "ZK" said "Zee Kay".',
  'intro-quant-give-moon-back': 'Low, angry, trying to keep it together.',
  'intro-zk-my-community-lost-a': 'Leaning into the lens on "collateral". Business-like menace.',
  'intro-zk-you-pay-my-community': 'The demand, hand up to the lens; each sentence a full stop. Cold on "stop posting".',
  'intro-quant-did-a-guy-with': 'After the call drops, to himself; disbelief turning into a bit of a laugh.',
  'intro-quant-okay-you-took-the': 'Quiet resolve, turning to his car. The line of the trailer.',
  'm1-juno-quant-why-is-your': 'On the phone, already typing; amused and alarmed.',
  'm1-quant-because-some-guys-in': 'Driving, flat and fast.',
  'm1-juno-okay-im-on-the': 'A beat as it sinks in, then all business, fast.',
  'm1-quant-guys-who-lost-money': 'Deadpan.',
  'm1-juno-so-everyone-great-narrows': 'Sarcastic, quick.',
  'm1-juno-tag-stopped-chelsea-park': 'Reading the location off her screen; the warning is sincere.',
  'm1-quant-define-stupid': 'Deadpan, already decided.',
  'm1-juno-going-there-alone': 'Flat, pointed.',
  'm1-quant-then-im-already-doing': 'A small grin in the voice. Hangs up.',
  'm1-fomo-wait-did-i-miss': 'Running in across the lawn, out of breath, shouting.',
  'm1-bagsy-you-always-miss-the': 'Shouted back mid-fight, exasperated.',
  'm1-bagsy-told-you-to-check': 'Squaring up on the lawn, teasing.',
  'm1-quant-been-a-little-busy': 'Dry, fists coming up.',
  'm1-bagsy-nothing-personal-kid-its': 'Cracking his knuckles; the fight starts on "personal".',
  'm1-quant-moons-collar-chewed-right': 'Quiet, holding the collar from the van; worried.',
  'm1-quant-hes-got-my-dog': 'Reading ZK\'s text on the burner; grim.',
  'm1-quant-cool-cool-cool-cool': 'Not cool at all; a nervous, deadpan spiral.',
};

// a placeholder line said differently from its speaker's default (say only; a recording is used as it is)
export const TWEAK = {
  'intro-quant-moon': { pbas: 62, rate: 150, gain: 4 }, // a shout
  'm1-fomo-wait-did-i-miss': { gain: 2 },
  'm3-fiona-number-go-up-number': { rate: 230, gain: 2 }, // (on the megaphone)
};
