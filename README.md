# GEN Z QUANT: Unfinished Business

**GEN Z QUANT: Unfinished Business** is an open-world mission game in the browser. Quant went viral for a joke coin. It pumped, it dumped, and the people who lost their bags want someone to blame. Now a crew called the Degens has taken his dog, Moon. Their boss, a masked streamer called ZK, wants the community paid back, and Quant to stop posting. Quant wants his dog back.

Drive Quant's rocket-boosted supercar through Manhattan, fight the Degens hand to hand, follow the trail from Chelsea to the West Side yards to Washington Square, and get Moon home.

GEN Z QUANT is a free, open-source community project. It is built on [Slop New York](https://github.com/mrdoob/slop-newyork) by Mr.doob (three.js, WebGPURenderer and TSL).

## Play it

There is no build step. Serve the folder and open it in a browser with WebGPU (a recent Chrome or Edge works best):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Click, or press any key, for sound.

## What's in it

- **Three story missions.** *Dognapped*: the opening, then Chelsea Park. *Burner*: Bryant Park, Times Square and the West Side yard. *Pump and Dump*: Gears' garage and the $MOON2 rally at Washington Square.
- **An 81-second opening cutscene**, with phone calls, cut scenes and a cast of voiced characters.
- **Street fighting.** Fists, kicks, bats, bottles and trash cans; counters, dodges and takedowns. No guns.
- **Quant's car.** A supercar with a V8 or an all-electric mode (Q), cold-gas thrusters for hops and sideways dashes, and a boost.
- **A living Manhattan.** Traffic, crowds, crashes, police calls, chases you can lose, and a car radio with four stations.
- **Controller support** for Xbox, PlayStation and other standard pads, plus keyboard and mouse.

## Controls

| | Keyboard and mouse | Controller (Xbox) |
|---|---|---|
| Move · look | WASD · mouse | Left stick · right stick |
| Sprint · jump | Shift · Space | LT (hold) or L3 · A |
| Get in / out of the car | F | Y |
| Drive · brake / reverse · steer | W · S · A / D | RT · LT · left stick |
| Boost · hop · dash left / right | Shift · Space · Z / C | X · A · LB / RB |
| Electric / engine | Q | D-pad up |
| Reset car to road | X | B |
| Strike · heavy · counter · dodge · grab | J or left click · K or right click · Q or L · C · E | X · Y · LB · B · RB |
| Radio: next station · off / on | R · T | D-pad right · D-pad down |
| Map · brief · pause | M · B · Esc | View · R3 · Start |
| Skip a cutscene | Hold Space | Hold A |

The pause menu has every control, mission select, checkpoints, sound settings and the credits.

## Credits and licences

The code is under the MIT License (see [LICENSE](LICENSE)), the same licence as Slop New York, which this game is built on.

Some parts are not ours and keep their own terms:

- The street-combat system, the Degens' rig and the freeflow fight moves are ported from **Spiderbench** by Shikhar and used with the author's permission. They are not covered by the MIT License.
- The music, the engine recordings, the 3D characters' source assets, the motion capture and the props come from their own authors under CC0, CC BY and similar licences.
- Quant's, Juno's and the side characters' voices are synthesised with Qwen3-TTS (Apache-2.0).

[NOTICE](NOTICE) and [assets/CREDITS.md](assets/CREDITS.md) list every one of them, and the game shows them on its Credits page.

Geographic data: NYC Open Data and © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL).

## For contributors

- `index.html` loads the city (`js/`, from Slop New York) and the game (`wagmi/`: missions, combat, the car, audio, radio, characters).
- `docs/MISSIONS.md` is the mission design and as-built notes; `docs/VOICE-LINES.md` is the line sheet and how voices are made.
- `tests/` holds the city's tests (`node --test tests/`).
- Every character, place and event is fictional; nobody in the game is based on a real person.
