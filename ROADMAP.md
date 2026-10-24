# Roadmap

GEN Z QUANT: Unfinished Business is planned as eight story missions in three acts. The full design, beat by beat, is in [docs/MISSIONS.md](docs/MISSIONS.md). This page is the short version: what's playable, what's next, and where help is welcome.

Ideas go in [Discussions → Ideas](https://github.com/ceogenz/gen-z-quant/discussions/categories/ideas). Before building something big, open an issue so we can agree on it first (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Playable now: Episode 1

| | Mission | Where |
|---|---|---|
| Act I · Bags | **M1 · Dognapped**: the opening cutscene, the drive, the fight in Chelsea Park | Murray Hill → Chelsea |
| Act I · Bags | **M2 · Burner**: Lev's burner phone, the tail, the West Side yard | Bryant Park → Times Square → Hell's Kitchen |
| Act II · Down Bad | **M3 · KOLs**: Gears' thrusters, and shutting down Floor Price Fiona's $MOON2 KOL rally | West Chelsea → Washington Square → West Village |

The game also has free roam across Manhattan, Quant's car (boost, thrusters, V8 or electric), traffic, crowds, chases, a car radio and the cold-open trailer, on desktop and phones.

## Next: the rest of the story

| | Mission | The idea |
|---|---|---|
| Act II · Down Bad | **M4 · Paper Hands** | Paper Hands Pete wants out of the Degens and will trade what he knows. Lower East Side → Chinatown → the Seaport. (The teaser is already in the game: Pete's bench in Sara D. Roosevelt Park.) |
| Act II · Down Bad | **M5 · Bull Run** | ZK's armoured "vault truck" outside the stock exchange. Juno thinks Moon is inside. Financial District → the Battery → FDR Drive. Unlocks the rocket burst. |
| Act III · To the Moon | **M6 · Buy the Dip** | Quant at his lowest. Coach Ruth trains him, then they find the Degens running a "Moon's ransom" table on 125th St. Harlem → Riverside Park. |
| Act III · To the Moon | **M7 · Diamond Hands** | The hand-over at Bethesda Terrace: the closest Quant gets before the end. Central Park → Columbus Circle. |
| Act III · To the Moon | **M8 · WAGMI** | Midnight showdown with ZK. Times Square → Penn Station, then home. |

Each mission opens more of the city, Act II opens Downtown and Act III opens the whole island up to 129th St.

## Where help is welcome

- **The city's tests:** 40 of the 97 tests in `tests/` fail after the game's changes to the city code. Getting them green is a self-contained first contribution.
- **Street life:** more pedestrians, outfits, small scenes and side activities that make Manhattan feel busy.
- **The radio:** new tracks for the car radio. They must be your own work, or CC0 / CC BY from their author.
- **Phones:** testing and fixing layouts and controls on real devices: foldables, small phones, tablets.
- **Accessibility:** readable text, subtitles, controls and screen-reader labels for the menus.
- **Performance:** a smoother frame rate on low-end laptops and phones.
- **Mission 4 groundwork:** the Lower East Side, Chinatown and Seaport sets and Pete's character. Pitch it in Discussions first, since the story is decided by the maintainer.

## Known issues

- Some of ZK's lines in the opening use placeholder voices, to be replaced.
- `https://www.genzquant.com` (with `www`) shows a certificate warning. Use **genzquant.com**.
