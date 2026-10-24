# Contributing to GEN Z QUANT

GEN Z QUANT: Unfinished Business is a free, open-source community game. It will never be sold, and there are no ads. If you want to fix a bug, polish something, add to the city or help build the next mission, you're welcome here.

The first goal isn't stars. It's the first pull request from someone outside the project that changes something players can feel in the game.

## Run it

There is no build step and nothing to install.

```bash
git clone https://github.com/ceogenz/gen-z-quant.git
cd gen-z-quant
python3 -m http.server 8000
```

Open http://localhost:8000 and click, or press any key, for sound. A recent Chrome or Edge works best. It falls back to WebGL2 when WebGPU isn't there, and phones work too.

Add these to the URL to jump straight to what you're working on:

| Switch | What it does |
|---|---|
| `?nointro` | Free roam: no cutscene, no mission |
| `?m1=car`, `drive`, `fight`, `search` | Mission 1 (*Dognapped*) from that checkpoint |
| `?m2=start`, `go`, `tail`, `yard`, `fight`, `chase`, `phone` | Mission 2 (*Burner*) from that checkpoint |
| `?m3=garage`, `square`, `rigs`, `escape`, `return` | Mission 3 (*KOLs*) from that checkpoint |
| `?trailer=0` / `?trailer=only` | Skip the cold-open trailer / play only the trailer |
| `?gfx=high`, `phone`, `low` | Force a graphics tier |

## Where things live

- `index.html` loads everything: the instant title screen, the HUD and the scripts.
- `js/` is the city: roads, buildings, traffic, people, cameras and controls. It comes from [Slop New York](https://github.com/mrdoob/slop-newyork) by Mr.doob, with changes for this game.
- `wagmi/` is the game:
  - `wagmi/mission/` holds the missions, their scenes and the mission UI.
  - `wagmi/combat/` is the street fighting.
  - `wagmi/intro.js` is the opening cutscene and `wagmi/trailer.js` the cold-open trailer.
  - `wagmi/audio/` and `wagmi/radio/` are the sound and the car radio.
  - There are also the characters, the car and the phone UI.
- `assets/` holds the models, animation, music, voices and images. Every third-party file is listed in `assets/CREDITS.md` and `NOTICE`.
- `docs/MISSIONS.md` is the design of all eight missions, with as-built notes for the first three. `docs/VOICE-LINES.md` is every spoken line and how voices are made.
- `tests/` holds the city's tests (`node --test tests/`). **Heads-up:** 40 of the 97 fail today because the game changed code the tests stub out. Fixing them is a great first contribution. Otherwise, just don't add new failures.

## House rules

These keep the game what it is. A pull request that breaks one won't be merged, however good the code is.

- **No guns and no knives.** Fights are fists, kicks, bats, bottles and trash cans.
- **ZK is always masked.** His face is never shown.
- **Everyone and everything is fictional.** No real person's name or likeness, and no real brands or logos. Look-alikes need original names and no badges.
- **Juno is a teenager and is always dressed and shown modestly.**
- **Nothing in the game names the tools used to make it.**
- **Keep it fun and kind.** No hate, no sexual content, no real-world harassment. The villains can be ridiculous; the game shouldn't be cruel.
- **Phones count.** If you touch the UI or controls, check it on a phone (portrait and landscape) as well as a desktop.

## Licences

- **Code** you contribute is released under the [MIT License](LICENSE), the same as the rest of the code.
- **Assets** (models, textures, sounds, music, motion) must be yours to give under CC0, or CC0 / CC BY from their author. Add the source, author and licence to `assets/CREDITS.md` and `NOTICE`. Ask in an issue first before adding anything under other terms.
- Some parts keep their own terms and must not be copied elsewhere: the street-combat system ported from Spiderbench (used with its author's permission) and the Bandai Namco motion capture (CC BY-NC 4.0). See `NOTICE`.

## Sending a change

1. **Check first.** Look at the open issues (`good first issue` and `help wanted` are good places to start). For anything bigger than a fix, open an issue or a post in [Discussions](https://github.com/ceogenz/gen-z-quant/discussions) to agree on the idea before you build it.
2. **Fork and branch.** Fork the repo and make a branch, one change per pull request. Small pull requests get reviewed fastest.
3. **Test it** in the browser:
   - no new errors in the console;
   - the mission or area you changed plays through;
   - for anything visual, desktop and phone.
4. **Open the pull request.** Use the template: what changed, why, how you tested it, and screenshots or a short clip for anything you can see or hear.

The maintainer (@ceogenz) reviews every pull request, may ask for changes, and has the final say on what goes in, especially anything to do with the story and the characters. Merged work is credited.

## Ideas and the story

The campaign is planned as eight missions (see [ROADMAP.md](ROADMAP.md) and `docs/MISSIONS.md`). Ideas for missions, characters, side activities and the city are very welcome in [Discussions → Ideas](https://github.com/ceogenz/gen-z-quant/discussions/categories/ideas). The story itself is decided by the maintainer, so pitch before you build.

## Be decent

Everyone taking part agrees to the [Code of Conduct](CODE_OF_CONDUCT.md).
