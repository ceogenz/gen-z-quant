// WAGMI City: the radio's stations and what they play (assets/music; credits in NOTICE).
// A track: file, title, artist, dur (s), lufs (its measured loudness: the radio evens them out), and for a short one
// loop { start, end } and plays (how many times its loop is heard: the opening once, then the loop again).
export const STATIONS = [
  {
    id: 'wagmi', name: 'WAGMI FM', freq: '94.0', tag: 'Hip-hop · pop · the city\'s anthem', color: '#FFC93C',
    tracks: [
      { file: 'assets/music/wagmi-theme.m4a', title: 'We All Gonna Make It', artist: 'WAGMI City', dur: 142.98, lufs: -14.1 },
      { file: 'assets/music/wagmi-pump.m4a', title: 'Pump & Dump', artist: 'WAGMI City', dur: 137.14, lufs: -14.03 },
      { file: 'assets/music/wagmi-glide.m4a', title: 'Fifth Ave Glide', artist: 'WAGMI City', dur: 133.95, lufs: -14.03 },
    ],
  },
  {
    id: 'stoop', name: 'STOOP RADIO', freq: '88.3', tag: 'Lo-fi · jazz-funk · late on the stoop', color: '#6CB8FF',
    tracks: [
      { file: 'assets/music/chill-lofi.m4a', title: 'Chill Lofi Inspired', artist: 'omfgdude', dur: 66.336, lufs: -15.89, loop: { start: 17.728, end: 66.336 }, plays: 3 },
      { file: 'assets/music/midnight-cruiser.m4a', title: 'Midnight Cruiser', artist: 'Zane Little', dur: 89.593, lufs: -12.96, loop: { start: 32.564, end: 89.593 }, plays: 2 },
    ],
  },
  {
    id: 'afterhours', name: 'AFTER HOURS', freq: '103.5', tag: 'House · electro · all night', color: '#B6FF3B',
    tracks: [
      { file: 'assets/music/funky-house.m4a', title: 'Funky House', artist: 'Of Far Different Nature', dur: 61.458, lufs: -7.02, loop: { start: 16.458, end: 61.458 }, plays: 2 },
      { file: 'assets/music/slampe.m4a', title: 'Slampe', artist: 'Fupi', dur: 97.969, lufs: -13.18, loop: { start: 13.781, end: 97.969 }, plays: 1 },
      { file: 'assets/music/dance-field.m4a', title: 'Dance Field', artist: 'Centurion_of_war', dur: 38.786, lufs: -19.63, loop: { start: 11.363, end: 38.786 }, plays: 3 },
      { file: 'assets/music/vengeance-electro.m4a', title: 'Vengeance Electro', artist: 'Of Far Different Nature', dur: 112.511, lufs: -5.68, loop: { start: 52.516, end: 112.511 }, plays: 1 },
    ],
  },
];
