# WAGMI City: Missions

The campaign design: what a GTA mission is made of, the eight missions that walk Quant across the whole island, and
Mission 1 "Dognapped" shot by shot so it can be built now.

Units and axes are the city's own (js/city-config.js): 1 unit = 1 m, x = grid east, z = grid south (north is -z),
y up, origin on the centreline of 5th Ave and 42nd St. Heading follows js/controllers.js: forward = (sin h, cos h), so
h = 0 faces south (+z), h = PI faces north, h = PI/2 faces east, h = -PI/2 faces west. Ground: roadway y = 0, sidewalks
y = 0.22, Central Park y = 1.24, the Bryant Park lawn y = 1.32. Every coordinate below comes from the map code
(streetZ, avenueX, blockAt, the paved plaza rects, the colliders) and the Mission 1 cameras were checked as stills in
the running city (.scratch/missions/s8.jpg).

---------------------------------------------------------------------------------------------------------------------

## 1. What a GTA mission is made of (the study)

**The video:** "GTA 5's First Mission in First Person - IGN Plays" (IGN, 9:29). Two hosts play GTA V's Prologue (the
North Yankton bank job) on PS4 in first-person view. I sampled it frame by frame (about 45 stills between 1:36 and
9:25, plus close-ups of every piece of HUD text) and read the full auto-generated transcript, which is the hosts'
commentary rather than game dialogue. The first ~95 s are the hosts in the settings menu. The mission joins in
progress (the opening hold-up cutscene is cut), and the video fades out before the Mission Passed screen and the
hand-off, so those two parts below come from the series as a whole (III, San Andreas, IV, V), not from the video.

**The Prologue, beat by beat (video times):**

| Time | Beat | What it teaches |
|---|---|---|
| 1:36-1:52 | Play cuts in and out of the hold-up cutscene (masked crew in a bank back office, a guard in a headlock, staff on their knees) with no loading. | A cold open in the middle of the action. |
| 2:00 | Play: hostage control. Help box top-left: "Hold R1 to aim." | One control, taught when it is first needed. |
| 2:20 | Objective (bottom centre): "Use the phone to trigger the explosive charge." Help: "Press [up] to bring up the phone." | The phone is a gameplay tool. |
| 2:44 | Charge blows the vault door: debris, slow settle. | A spectacle reward for following the objective. |
| 2:52-3:10 | Help: "Locations are marked with a [yellow dot] on the Radar." Objective: "Collect the **cash**." (cash in green). Counter bottom-right: TAKE $179,500. | Colour codes; a mission-specific counter. |
| 3:20 | Mid-mission cutscene: a guard takes the lead character hostage. | The twist at the half-way point. |
| 3:30 | Help: "To SWITCH hold [down] to show the available characters." Play continues as the second robber. | A character switch solves the twist. |
| 3:52 | Objective: "Get to **cover**." (cover in yellow). Help: "Press R1 to take cover." | |
| 4:16 | Objective: "Open the **shutter door**." (green: an object to use). | Indoors gives way to outdoors. |
| 4:28 | Outside: five wanted stars top-right, the radar flashes red and blue. Help about aiming from cover. | The heat rises the moment you step out. |
| 5:16-5:58 | Help: "Hold [x] to run and [x] to sprint when outside." Area name bottom-right in italics: *North Yankton*, then the street: *Cavalry Blvd*. | Place names as you enter them. |
| 6:16-6:50 | Cutscene: into the getaway car, then cinematic shots of the car with police in pursuit (no HUD). | Cutscenes also bridge on-foot to driving. |
| 6:58 | Vehicle name bottom-right in italics: *Declasse Rancher XL, Off-Road*. Help: "Use [stick] to steer a vehicle." | |
| 7:16-7:28 | Help: "Your destination is marked with a [yellow dot] on the Radar." then "GPS indicates the shortest legal route to a destination with a yellow line." Radar shows the yellow route and a distance (0.50 mi). | The GPS grammar. |
| 7:40 | Cutscene: the getaway car is wrecked at a level crossing. | The drive ends in a twist, not on arrival. |
| 8:16-8:40 | Cutscene: ambush, a crew member goes down. Play: "Hold off the **Cops**." (Cops in red). | The last stand. |
| 9:04-9:25 | Closing cutscene, one survivor escapes; fade to black. | The status quo changes; the story moves elsewhere. |

**Observed UI rules** (these are the ones we copy):
- Objective: one short imperative sentence, bottom centre, white, the key noun coloured: **yellow = a place**,
  **green = an object or pickup**, **red = enemies**, and (series-wide) **blue = friends and your vehicle**.
- Help: a small dark box top-left, two lines at most, one control at a time, shown when it is first needed.
- Place, street and vehicle names: bottom-right, italic, a few seconds, when you enter them.
- Counters: bottom-right (TAKE $179,500). Heat: top-right (the stars). Radar: bottom-left with health under it.
- Cutscenes cut in and out with no loading and no HUD; letterboxed.
- Mix in nine minutes: about a quarter cutscene, a third on-foot action, a quarter driving, the rest small
  interactions (phone, door, pickups). It escalates indoors, outdoors, vehicle, crash, last stand.

---------------------------------------------------------------------------------------------------------------------

## 2. The mission grammar (our template)

Every WAGMI City mission is built from these pieces, in this order. Wording and colours are exact.

### 2.1 Blip and trigger
- The contact's mission shows on the radar and the full map as a round blip with the contact's initial, accent
  yellow #FFC93C on a dark disc: **J** Juno, **G** Gears, **C** Coach Ruth, **Z** ZK (the last missions), **Q** for
  missions Quant starts himself. A new blip pulses for 6 s.
- Within 60 m a yellow ground ring (the GTA "corona": a 3 m translucent cylinder, #FFC93C at 35%) marks the start.
  Walking into it, or stopping the car in it (speed < 3 m/s), starts the mission.
- First time only, help: "Story missions are marked on the Radar with the contact's initial. Go to the yellow marker to
  start."
- On trigger: control frozen, input cleared, traffic and pedestrians within 60 m put away (or held), HUD fades out
  (0.3 s), letterbox bars slide in (0.4 s, 11% of the height each).

### 2.2 Title card
Over the first shot of the opening cutscene: the mission title, Barlow Condensed 800 italic, 64 px, white with a soft
dark shadow, centred at 64% of the height, 0.4 s in, 2.6 s hold, 0.6 s out. The act name sits above it in 18 px 700,
accent yellow, letter-spaced 3 px ("ACT I · BAGS").

### 2.3 Opening cutscene
30-90 s, 6-14 shots: **where** (establishing) -> **who** (character) -> **the problem** (inciting incident) -> **the joke**
-> **the instruction** (what to do now). The last shot ends on a camera close to the gameplay camera and blends into it
(0.8-1.5 s ease) while the bars slide out and the HUD fades in. "Hold Space to skip" appears bottom-right after 1 s
(14 px, 60% white); holding it 0.6 s jumps to the hand-off state.

### 2.4 Objective text
- Bottom centre, 26 px Barlow Condensed 600, white with a soft shadow, one sentence, imperative, sentence case, ends
  with a full stop, 8 words at most, one coloured noun:
  places **#FFC93C**, enemies **#EF4444**, friends and Quant's car **#6CB8FF** (a light blue added to the shared palette
  for this), objects and pickups **#4ADE80**.
- Shows for 7 s, then fades; it comes back when re-issued. Subtitles take the same line while someone speaks; the
  objective waits for the gap.
- The standard sentences: "Get in your **car**." "Get back in your **car**." "Go to **Chelsea Park**." "Follow the
  **van**." "Don't lose the **van**." "Beat up the **Degens**." "Search the **van**." "Lose the **Degens**." "Take down
  **Lev**." "Protect **Pete**." "Smash the **livestream rigs**." "Get back to the **fight**." "Get home."

### 2.5 Help text
Top-left box: panel rgba(8,10,14,0.62), radius 10 px, 15 px white text, 2 lines at most, key caps drawn inline
(`F`, `Shift`). Once per mechanic, at the moment it is first needed, 7 s or until the player does it. Colour the same
nouns as the objectives. Ours: "Press F to get in a vehicle." "Your destination is marked with a ● on the Radar."
"GPS shows the quickest legal route with a yellow line." "Hold Shift to boost." "Hold F to search." "Degens are marked
with a red dot on the Radar." The combat team owns the fight help.

### 2.6 Subtitles
Bottom centre (the objective line), 24 px, white; the speaker's name first in caps, 700: QUANT in white, JUNO in
#6CB8FF, the Degens and ZK in acid green #B6FF3B. Two lines at most; 15 characters per second reading time, 1.4 s
minimum. Phone calls show the caller card bottom-right (name, small avatar, "On call").

### 2.7 GPS
- Destination: a yellow dot blip, and the yellow route on the radar and the full map. Distance under the radar
  ("0.8 mi" / "450 m").
- Route: A* over the traffic road graph (`__NYC_APP.trafficSystem.network`: nodes, directed edges, so one-way streets
  are respected, as GTA says: "the shortest legal route"). Re-plan every 1 s and when 25 m off the route. (Today
  nyc-map.js draws an L-shaped line, x then z; the mission layer replaces that.) The shore highways are not in the
  graph, so routes along them use authored waypoints.
- Mission blips: enemies red dots within 150 m, friends and Quant's car blue, objects green, Moon a blue paw.

### 2.8 Place names and counters
- Entering a new neighbourhood (`districtAt`): its name bottom-right, Barlow Condensed 700 italic, 30 px, 3 s
  ("Murray Hill", "Hell's Kitchen", "Chelsea"). Getting in a car: "Quant's Roadster". (The city's street-sign location
  panel stays.)
- Mission counters bottom-right above the speed cluster: label 14 px 700 letter-spaced, value 28 px:
  `DEGENS 2/5`, `RIGS 1/3`, `DISTANCE 84 m`, `0:45`.

### 2.9 Set pieces
- **Drive**: a destination, GPS, a phone call in the car (GTA's exposition happens while you drive).
- **Fight**: an arena (a paved plaza or park: no traffic), enemies in a wave or two, a reinforcement at half-way,
  environment weapons laid out (trash cans, bottles, bats). Leaving the arena by 90 m: "Get back to the **fight**.";
  by 150 m: fail.
- **Tail**: stay 15-60 m behind; closer than 12 m or in the target's look-back cone for 2 s fills a suspicion bar
  (bottom-right); full = "You were spotted." and the mission branches to a chase or fails.
- **Chase**: target blip red with a distance counter; over 150 m: "The **van** is getting away."; over 250 m for 5 s:
  fail. Scripted targets rubber-band (they slow when you fall behind, so a chase is a show, not a test of top speed).
- **Escape**: "Lose the **Degens**." HEAT in the top-right corner where GTA keeps its stars: 1-3 acid-green pips,
  the radar edge pulsing acid green. Break line of sight and get 200 m clear for 8 s to drop a pip.
- Every mission introduces one new mechanic and teaches it with one help text.

### 2.10 Checkpoints and failure
- A checkpoint at the start of every phase (after a cutscene, at arrival, after a fight). Retry restarts there with the
  player, car and enemies placed as the phase begins.
- Knocked out: **REKT** (our WASTED): 96 px, #EF4444, Barlow Condensed 800 italic, the world desaturated and in
  0.3x slow motion for 2.5 s. In a mission it leads to the fail screen; in free roam Quant wakes at the last safehouse.
- Fail screen: **MISSION FAILED** (72 px, #EF4444), the reason under it (26 px, white), then "Retry" and "Quit".
  After 3 failures at the same checkpoint, a third option: "Skip" (to the next checkpoint).
- Reasons: "Quant got rekt." "The van got away." "Moon's trail went cold." "You were spotted." "Pete got rekt."
  "You abandoned Pete." "You left the fight." "Lev got away."

### 2.11 Mission Passed
**MISSION PASSED** (84 px, accent yellow #FFC93C, Barlow Condensed 800 italic) with the title under it (34 px white),
then a stats panel (shared panel style): TIME, DEGENS REKT, HITS TAKEN, and the reward line
**FOLLOWERS +4,210** (followers are this game's respect: every public fight gets filmed and goes viral), a medal
(gold / silver / bronze on time and hits), any unlock ("NEW: Cold-gas thrusters"). A sting, the world behind in slow
motion, 6 s, then the HUD returns.

### 2.12 Hand-off
4-12 s after Mission Passed, Quant's phone: a call (the caller card bottom-right, 2-6 lines) or a DM (a card
top-right: "New message · Juno"). The next contact's blip appears and pulses, with help: "A new mission is available.
Go to the **J** on the Radar."

### 2.13 Act transitions
At the end of an act: a closing cutscene that takes away the base (GTA's "you can't stay here"), a short news-radio
gag over a shot of the skyline, then the full map opens by itself: the Smart Barrier fog sweeps off the new district,
the new safehouse blip (a house) drops in, help: "New area unlocked: **Downtown**." Quant wakes at the new safehouse
(that is the save point).

### 2.14 Data shape (for wagmi/mission/**)
```js
{ id: 'dognapped', n: 1, act: 1, title: 'Dognapped', giver: { letter: 'Q', at: [112, 0.22, 388.6] }, time: 'golden',
  cutscenes: { intro: [/* shots, 5.2 */], arrival: [...], collar: [...] },
  phases: [
    { id: 'car',   checkpoint: true, objective: ['Get in your ', { car: 'blue' }, '.'], help: ['enterCar'], done: 'inCar' },
    { id: 'drive', objective: ['Follow Moon\'s tag to ', { 'Chelsea Park': 'yellow' }, '.'], gps: [-1139, 1160],
      call: 'juno1', done: { arrive: [-1139, 1160], r: 6, maxSpeed: 8 } },
    { id: 'fight', checkpoint: true, cutscene: 'arrival', objective: [...], spawn: [...], fail: { leave: [-1200, 1157, 150] } },
    ...
  ],
  passed: { followers: 4210, unlock: ['contact:juno'] }, handoff: { dm: 'juno1', blip: { letter: 'J', at: [-296, 0.22, 84.5] } } }
```

---------------------------------------------------------------------------------------------------------------------

## 3. The map

**Extent.** The detailed island runs from z = -7090 (about 129th St, Harlem) to z = 6512 (the Battery), x from -2117
to 2569 (ISLAND_BOUNDS). Ground vehicles and Quant are kept 8 m inside the shore (`getIslandBoundsAtZ`), so piers,
bridges, Roosevelt and Governors Island are scenery: every mission stays on the island. The ground is flat (no ramps,
no bridge decks), Central Park is drivable grass and drives at y = 1.24.

**Streets.** Avenue x: West Side Hwy along the shore (~west shore + 14), 11th Ave -1683, 10th/Amsterdam -1408 (north),
9th/Columbus -1134 (south), 8th/CPW/Frederick Douglass -860, 7th/ACP Blvd -585 (south), 6th/Lenox -310 (north),
5th 0 (south), Madison 155 (north), Park 311, Lexington 467 (south), 3rd 622 (north), 2nd 838 (south), 1st 1067
(north), York 1284, FDR along the east shore. Street z (centreline): 14th 2219, 23rd 1515, 28th 1117, 34th 641,
37th 399, 42nd 0, 47th -403, 57th -1204, 59th -1370, 72nd -2410, 79th -2987, 86th -3563, 96th -4372, 110th -5508,
116th -5992, 125th -6723. Downtown: Houston 3254-3376, Canal 4070, Chambers 4846, Fulton 5337, Wall 5748, Battery Pl
6143. Even streets run east, odd streets west, with the real exceptions (23rd, 34th, 42nd, 57th, 59th, 125th two-way).

**Fight arenas** (`window.NYC.pavedPlazaRects`, traffic-free): Duffy Square x -638..-604, z -398..-330 (TKTS red
steps), the Times Square bowties down to 42nd St, Herald and Greeley Squares (-364..-282, 561..719), Chelsea Park
(-1397..-1143, 1122..1269), Madison Square Park (9..148, 1278..1505), Union Square (186..300, 1979..2210), Washington
Square Park (-169..139, 2796..2961), Sara D. Roosevelt Park (872..1043, 3320..4222), Columbus Park (591..745,
4407..4600), City Hall Park (234..451, 4866..5152), the Hudson waterfront by the cruise piers (-1998..-1906,
-1159..-457), De Witt Clinton Park (-1873..-1693, -955..-805), Marcus Garvey Park (-146..145, -6632..-6322),
Morningside Park (-1400..-1006, -6552..-5512), Riverside Park (-1983..-1871, -6888..-6318).

**Landmarks** (centres): Empire State (-80, 686), Bryant Park and the library (-153, 98), Times Square / One Times
Square (-561, -35), Grand Central (311, -67), Chrysler (512, -43), Port Authority (-997, 86), Macy's (-461, 595),
Madison Square Garden (-771, 804), Hudson Yards (-1478, 763), Javits (-1820, 394), Flatiron (29, 1566), One WTC
(-204, 5255), NYSE (265, 5753), Bowling Green (205, 6049), Castle Clinton (34, 6323), Columbus Circle (-860, -1375),
Grand Army Plaza (-32, -1327), Bethesda Fountain (-380, -2434), Bow Bridge (-526, -2536), Belvedere Castle
(-506, -3000), the Great Lawn (-441, -3294), the Reservoir (-371, -3994), AMNH (-996, -2972), Guggenheim (35, -3767).

**Systems we build on:** 200 traffic cars (taxis, sedans, SUVs, police cruisers) and 32 buses on the road graph with
IDM car-following and signals; 340 pedestrians; time presets golden (17:45, the default), midday, twilight (19:15),
midnight; the radar and full map with `mapSystem.waypoint`; the chase, action and POV cameras; the helicopter and bike
entities (story uses the helicopter as ZK's chopper). Quant starts in his car on 5th Ave at E 37th St, facing south.

**Story mode must switch off** the sandbox shortcuts until the story is done: mode keys 1-4, the teleport menu,
click-to-teleport on the full map (a click sets the waypoint instead, like GTA), and the time-of-day buttons (missions
set the time). They come back as the post-game reward ("Director Mode").

---------------------------------------------------------------------------------------------------------------------

## 4. The campaign

### 4.1 Story
Quant is a teenager who went viral for a joke coin he made on a livestream. It pumped, it dumped, and the internet
decided a kid was the villain. The Degens are a street gang of sore, broke traders and hustlers who aped in late with
borrowed money and want someone to blame: "You got rich, our bags went to zero." Their boss is **ZK** ("Zero
Knowledge"), an anonymous influencer in a chrome visor who pumped the coin to his followers and sold at the top, then
pointed their anger at Quant. The Degens dognap **Moon**, Quant's small white shaggy dog, for ransom. Quant gets Moon
back by crossing the whole city, and on the way the Degens find out who really took their money.

### 4.2 Cast
- **Quant**: the player. Quick, deadpan, very online, kinder than the comments think.
- **Moon**: a small white long-haired dog, pink-brown nose, dark eyes. On screen always "Moon" or "the dog", never a
  gendered pronoun.
- **Juno**: Quant's friend from the group chat, an on-chain sleuth who reads wallets like gossip. Mostly a voice on the
  phone; in person at Bryant Park. Blip **J**.
- **Gears**: big, gentle, an ex-pit-crew mechanic with an EV tuning garage in West Chelsea who built the roadster's
  rocket package. Blip **G**.
- **Coach Ruth**: a retired boxing champ with a gym on W 125th St; tough love; teaches the slams. Blip **C**.
- **The Degens** (black and charcoal streetwear, acid-green #B6FF3B accents): **Bagsy** (Midtown crew lead, a duffel
  "bag" always slung), **Stops**, **Gwei**, **Wick**, **FOMO** (always late), **Lev** (Leverage Larry, runs Midtown),
  **Floor Price Fiona** (hype host), **Paper Hands Pete** (wants out), **Doug the Rug** (uptown), **Diamond Hands Dana**
  (ZK's right hand, never sells), **Exit** and **Liquidity** (ZK's bodyguards, twins).
- **ZK**: tall, black tailored tracksuit with acid-green piping, mirrored chrome visor, voice changer, a gold "0"
  pendant. Fights with a ring-light stand. An original villain: no real person behind him, no real name for him. When the visor finally comes
  off, there is another visor under it.

### 4.3 Acts, safehouses, gates

| Act | Name | Open zone | Safehouse (save point) | New contact |
|---|---|---|---|---|
| I | Bags | Midtown: z -1385 (59th St) to z 1530 (23rd St), river to river | Quant's apartment, E 37th St, door (112, 0.22, 387.5) facing south | Juno |
| II | Down Bad | adds Downtown: everything south of z -1385 to the Battery | Gears' "Static Garage", W 22nd St between 10th & 11th Ave, bay door (-1560, 0.22, 1611) facing north | Gears |
| III | To the Moon | the whole island to z -7090 (129th St) | Coach Ruth's gym "Ruth's Corner", W 125th St between Lenox Ave & ACP Blvd, door (-450, 0.22, -6708) facing north | Coach Ruth |

**The gate.** WAGMI City DOT's "Smart Barrier Pilot": concrete barriers with orange LED signs (SMART BARRIER PILOT ·
ROAD CLOSED · THANK YOU FOR YOUR PATIENCE) across every road at the act's boundary, and a soft wall for every mode at
that z (z < -1385 in Acts I-II, z > 1530 in Act I). Touching it, help: "The Smart Barrier is closed. This part of WAGMI
City opens later in the story." The full map shades the locked area and labels it CLOSED. Act ends lift it, with the
news radio: "The city has ended its Smart Barrier pilot after the barriers were found mining crypto."

**Unlocks that make the car and the fists grow:** M1 fists and kicks, M2 trash cans and bottles, M3 bats and the
roadster's **cold-gas thrusters** (a sideways hop to dodge), M5 the **rocket burst** (a short, huge speed burst), M6
**bodyslams** (Coach Ruth), after M8 Director Mode.

**Time of day across the story:** Act I golden then twilight, Act II midday then golden, Act III golden, twilight,
midnight, then the epilogue back at golden hour on E 37th St.

### 4.4 The eight missions

#### M1 · Dognapped (Act I) · Murray Hill -> 37th St crosstown -> Chelsea
Golden hour. Giver: the game's opening (Q). The Degens snatch Moon outside Quant's building. Drive to Moon's tag in
Chelsea Park, find the swap already done, fight Bagsy's crew, take the burner phone, take ZK's first call. Full detail
in section 5.
- Locations: door (112, 0.22, 387.5); car (88, 0, 394.4) h -PI/2; arrival (-1139, 0, 1160); arena centre
  (-1200, 0, 1157); the van (-1240, 0, 1120.2) h PI/2.
- Reward: FOLLOWERS +4,210; Juno becomes a contact. Hand-off: Juno's DM, **J** at Bryant Park.

#### M2 · Burner (Act I) · Bryant Park -> Times Square -> Hell's Kitchen waterfront -> Herald Square -> home
Twilight (Times Square lights on). Juno traces the burner's twin to a Degens courier.
- Giver **J**: Bryant Park, 6th Ave entrance at W 41st St (-296, 0.22, 84.5); Juno at a café table on the lawn
  terrace (-272, 1.32, 92).
- Opening cutscene: Juno with her laptop under the library ("free wifi and a lion"); she plugs in the burner; a map of
  pings; "Your dog has a bigger following than you." She points him to a Degens van idling in Times Square.
- Beats:
  1. "Go to **Times Square**." The van ("HODL Moving Co. · We never let go.") parked on 7th Ave at W 47th St
     (-578, 0, -410).
  2. Tail by car: "Follow the **van**. Don't get too close." West on W 47th St (westbound) through Hell's Kitchen to
     12th Ave, then north to the cruise piers. Suspicion bar; the van runs one red light to test you.
  3. The stash: a container yard on the waterfront promenade by Pier 88/90, the cruise ship behind it, centre
     (-1950, 0, -560). On foot, stealth-lite: "Sneak up on the **stash**." Three lookouts with sight cones; takedowns
     from behind.
  4. Alarm, fight: "Beat up the **Degens**." (6, with trash cans and bottles laid out: new help for pickups). Lev
     shouts from his car: "Liquidate him!"
  5. Lev drives off: "Take down **Lev**." Chase south on 12th Ave (authored waypoints along the shore), east on W 34th
     St past Javits, Hudson Yards and the Garden; Lev crashes into Greeley Square (-340, 0, 600).
  6. "Take **Lev's phone**." The phone overlay: the Degens' group chat, a photo of Quant's door: "found the coin kid's
     crib". "Get home." (to E 37th St, 700 m).
- Closing cutscene (act end): the door sprayed NGMI in acid green, the lobby trashed, Mr. Szabo the super with a
  broom: "Three vans, kid. Three." Juno on the phone: "You can't stay there. Gears has a room over his garage."
- Fails: spotted on the tail (from beat 2: branches into the chase; in beat 3: "You were spotted."), "Lev got away.",
  "Quant got rekt."
- Reward: FOLLOWERS +9,800; trash cans and bottles. Hand-off: Act II opens; **G** at the Static Garage.

#### M3 · Pump and Dump (Act II) · West Chelsea -> Washington Square -> West Village
Midday. The Degens launch $MOON2, a copycat coin with Moon's photo on it, at a rally under the Washington Square arch.
- Giver **G**: the Static Garage bay door (-1560, 0.22, 1611).
- Opening cutscene: Gears under the roadster: "Cold-gas thrusters. Little puffs of nitrogen. Very safe. Mostly."
  Juno on video call: the $MOON2 launch stream, Floor Price Fiona with a megaphone and Moon's face on a banner.
- Beats:
  1. "Go to **Washington Square**." (the arch at the foot of 5th Ave (0, 0, 2806)).
  2. "Smash the **livestream rigs**." Three ring-light rigs at (-8, 0, 2858), (-30, 0, 2895), (18, 0, 2890); counter
     RIGS 0/3; the hype crew attacks (bats appear: new help). Fiona keeps hyping into the megaphone during the fight
     ("Number go up! Number go UP!").
  3. At 3/3 the chart on the big screen goes red; Fiona runs to her SUV on Washington Sq S (-60, 0, 2968).
  4. "Lose the **Degens**." HEAT 2: two Degens cars through the West Village's crooked streets (Bleecker, Christopher,
     W 4th, Hudson). The thrusters unlock here (a help text teaches them; the car track picks the key).
  5. "Go back to the **garage**."
- Fails: "Quant got rekt.", "You left the fight."
- Reward: FOLLOWERS +18,500; bats; cold-gas thrusters. Hand-off: a DM from an unknown number: "i want out. i know where
  the dog is going. sara roosevelt park. come alone. -P"

#### M4 · Paper Hands (Act II) · Lower East Side -> Chinatown -> Two Bridges -> the Seaport
Golden hour. Paper Hands Pete wants out and will trade what he knows.
- Giver **Q** (Pete's DM): Sara D. Roosevelt Park at Rivington St; Pete waits on a bench at (925, 0, 3560).
- Beats:
  1. "Go to **Sara D. Roosevelt Park**." Lookouts on the corners: Chrystie & Houston (880, 0, 3330), Forsyth &
     Rivington (962, 0, 3555), Forsyth & Delancey (975, 0, 3700). "Don't let the **lookouts** see you." Approach
     along the park's interior paths.
  2. Cutscene: Pete, shaking: "ZK's moving the dog to his vault downtown. Wall Street. Friday." Car doors slam on
     Delancey.
  3. "Protect **Pete**." Ambush, 7 Degens in two waves in the park; Pete cowers behind a bench (blue blip, health bar).
  4. "Get **Pete** to the Seaport." Pete in the passenger seat; Degens cars ram on Canal St and East Broadway, under
     the Manhattan Bridge approach (903, 4217); thrusters to dodge.
  5. Drop at South St by Pier 17 (985, 0, 5480). Pete walks onto the ferry: "If anyone asks, I'm in Staten Island.
     Spiritually."
- Fails: "Pete got rekt.", "You abandoned Pete." (over 100 m from Pete in beat 3), "You were spotted." (beat 1).
- Reward: FOLLOWERS +12,300. Hand-off: Juno calls: "Wall Street, Friday? Of course his vault is on Wall Street."

#### M5 · Bull Run (Act II) · Financial District -> the Battery -> FDR Drive -> East 34th St
Midday. ZK's armoured "vault truck" outside the stock exchange: Juno thinks Moon and ZK's cold wallet are inside.
- Giver **J**: a phone call starts it from anywhere; the destination is Wall St & Broad St (300, 0, 5755).
- Beats:
  1. "Go to **Wall Street**." The truck parked on Broad St (305, 0, 5790) h 0; Exit and Liquidity at its doors.
  2. Fight on the Wall St plaza: "Beat up **Exit** and **Liquidity**." (two bosses who fight as a pair) and their crew.
  3. The truck flees south down Broad St, around the Battery on State St (z 6231) and Whitehall (437, 6394), onto
     South St and up the FDR Drive (authored waypoints: (730, 6000), (1029, 5300), (1207, 5000), (1980, 4500),
     (2530, 4000), (2380, 3000), (2010, 2000), (1487, 1515), (1348, 1000), (1229, 640)). "Take down the **truck**."
  4. Gears on the phone: "Rocket's armed. Wait for a straight bit." The rocket burst unlocks (a help text teaches it; the car track picks the
     key); the long straight north of E 23rd St is where it lands.
  5. The truck spins out at the FDR's E 34th St exit (1229, 0, 640). "Open the **truck**." Inside: a mop in a dog bed
     with a bow on it, and the cold wallet.
- Closing cutscene (act end): ZK calls: "Cute. Keep the wallet. It's empty, like your garage." Cut to the Static
  Garage tagged NGMI, Gears in the doorway with a fire extinguisher, unharmed and furious. Coach Ruth calls: "I hear
  you're fighting the whole city. Come uptown. Bring your hands."
- Fails: "The truck got away.", "Quant got rekt."
- Reward: FOLLOWERS +26,000; the rocket burst. Hand-off: Act III opens; **C** at Ruth's Corner.

#### M6 · Buy the Dip (Act III) · Harlem -> Morningside Heights -> Riverside Park
Golden hour. Quant at his lowest: no home, no garage, no dog. Coach Ruth trains him, then they find the Degens
running a "Moon's ransom" donation table on 125th St.
- Giver **C**: Ruth's Corner (-450, 0.22, -6708).
- Beats:
  1. Training in the gym yard (a short tutorial): "Grab a dazed **Degen** and slam him." Bodyslams unlock.
  2. "Go to **Marcus Garvey Park**." The donation table at the park's SW corner (-130, 0, -6340): "GoFundMoon: help the
     Degens recover their losses."
  3. Fight with Coach Ruth beside you (blue blip; she can be knocked down, not out). 8 Degens, one Brute.
  4. Doug the Rug runs to his car: "Take down **Doug**." Chase west on W 125th St, down Morningside Ave, past
     Morningside Park (-1200, 0, -6000) and Columbia on W 116th St, to Riverside Dr; Doug crashes by Riverside Park at
     W 122nd St (-1925, 0, -6500).
  5. Cutscene: Doug talks: "Dana's got the dog. She's handing it to ZK tonight. Bethesda." Coach Ruth: "Then we go
     tonight."
- Fails: "Quant got rekt.", "Doug got away."
- Reward: FOLLOWERS +31,000; bodyslams. Hand-off: Juno texts the meeting time: 7:15 PM.

#### M7 · Diamond Hands (Act III) · Central Park -> Columbus Circle -> 7th Ave
Twilight. The hand-over at Bethesda Terrace; the closest Quant gets before the end.
- Giver **Q** (after Juno's text): Bethesda Terrace (-376, 0, -2414; the terrace block in city-grid.js) and the
  fountain (-380, 1.24, -2434); the fight is around the fountain on the park ground (y 1.24).
- Beats:
  1. "Go to **Bethesda Terrace**." Sneak along the Lake's edge; Dana on the terrace holding Moon's carrier; Degens
     around the fountain.
  2. Fight on the terrace and around the fountain. Dana runs to her SUV on Terrace Drive (-346, 1.24, -2368).
  3. "Follow **Dana**." Chase on the park drives (no traffic): Terrace Drive west, West Drive north past the Lake and
     Belvedere Castle (-506, 1.24, -3000), into the Great Lawn (-441, 1.24, -3294).
  4. Cutscene: ZK's helicopter lands on the Great Lawn. Dana hands over the carrier; ZK takes it and leaves her on the
     grass: "Diamond hands, Dana. Hold." The helicopter lifts off south. Dana, sitting in the grass, to Quant: "He's
     auctioning the dog. Times Square billboards. Midnight." (Moon cam cutaway: Moon in the chopper, looking down at
     the city.)
  5. "Follow the **helicopter**." Out of the park at Columbus Circle (-860, 0, -1375), down 7th Ave to Times Square;
     it lands on the roof of One Times Square (-561, -35).
- Fails: "Dana got away.", "Quant got rekt.", "The helicopter got away." (over 400 m for 6 s).
- Reward: FOLLOWERS +44,000. Hand-off: every billboard in Times Square flips to ZK's face: "ONE OF ONE. MOON.
  BIDS CLOSE AT MIDNIGHT." **Z** blip at Duffy Square.

#### M8 · WAGMI (Act III) · Times Square -> 7th Ave -> Penn Station, then home
Midnight. The showdown.
- Giver **Z**: Duffy Square (-621, 0.2, -364). The Degens' box trucks close 7th Ave and Broadway at W 47th
  (-585, 0, -410) and W 42nd (-585, 0, -8): Times Square is the arena.
- Opening cutscene: Juno, Gears and Coach Ruth meet Quant at 6th Ave & W 45th: the plan. Juno: "Keep him talking. I
  need ninety seconds on the billboards." Gears: "The rocket's full." Ruth: "Hands up."
- Beats:
  1. "Get to **Duffy Square**." Wave 1 in the bowties around 44th-45th (-570, 0, -190); wave 2 on Duffy Square.
  2. "Beat up **Exit** and **Liquidity**." at the foot of the TKTS red steps (about (-621, 0, -372); the steps rise
     about 5 m to the north).
  3. Juno takes the billboards: ZK's wallet history in 40-foot letters, "ZK SOLD THE TOP. YOUR BAGS PAID FOR HIS
     YACHT." Half the remaining Degens stop fighting; some start booing ZK.
  4. Boss fight: ZK on the red steps with the ring-light stand. At half health ZK gets Quant in a headlock:
     **SWITCH** (help, echoing the Prologue: "To SWITCH, hold Tab."): play as Moon for 15 s, slip out of the carrier
     and bite ZK's ankle; switch back and finish him. (If the dog controller isn't ready, a QTE prompt plays the same
     beat.)
  5. ZK grabs the carrier and runs for his armoured car on 7th Ave at W 45th (-585, 0, -244): "Take down **ZK**."
     South down 7th Ave, rocket burst on the straight; ZK crashes outside Penn Station at 7th Ave & W 33rd
     (-585, 0, 725).
  6. Cutscene: the carrier door; Moon jumps into Quant's arms. ZK's visor comes off: another visor under it. The
     ex-Degens sit on him. Quant to the crowd's phones: "Log off. Touch grass. Pet a dog."
- Epilogue (golden hour, E 37th St): the door (112, 0.22, 387.5) opens, Moon trots out first, Quant follows; Juno,
  Gears and Coach Ruth on the steps; a van turns in from Madison (the music stops), it's an ice-cream truck. Quant
  puts the phone in his pocket without looking at it. Title: **WAGMI**. Credits over the skyline.
- Reward: FOLLOWERS +1,000,000 (and a notification: "ZK has deactivated his account."); Director Mode (every mode, time and
  teleport, back to the sandbox).

**Coverage:** Murray Hill, Midtown, the Garment District, Hell's Kitchen, Chelsea (M1); Bryant Park, Times Square, the
Hudson waterfront, Hudson Yards, Herald Square (M2); West Chelsea, Greenwich Village, the West Village (M3); the Lower
East Side, Chinatown, Two Bridges, the Seaport (M4); the Financial District, the Battery, the East Side along the FDR
(M5); Harlem, Morningside Heights, Riverside (M6); Central Park, the Upper West and East Sides' edges, Columbus Circle
(M7); Times Square and Penn Station (M8). Every district on the island is a mission location or on a mission route.

---------------------------------------------------------------------------------------------------------------------

## 5. Mission 1 · Dognapped (build this now)

**Length:** about 6 minutes: opening 42 s, drive ~110 s, arrival 13 s, fight ~90 s, the van and the call ~35 s,
Mission Passed 6 s. **Time:** golden hour (the default preset), no change during the mission. **New mechanics:**
getting in the car (F), GPS, boost, fists and kicks.

### 5.1 Set and marks

| Mark | Position (x, y, z) | Heading | Notes |
|---|---|---|---|
| Quant's building door | (112, 0.22, 387.5) | 0 (door faces south) | North side of E 37th St between 5th and Madison: the red-brick apartment house with the air conditioners (block 1382; façade collider at z 387.5). The ground floor is generic glazing, so dress the spot: a dark entrance door 1.3 m x 2.5 m set into the façade, a small black canopy, two steps of trim. |
| Quant, first mark (just out of the door) | (112, 0.22, 388.6) | 0 | |
| Quant, walking mark | (109, 0.22, 390.8) | -PI/2 (west, toward his car) | He turns to PI/2 (east) to face the Degens. |
| Moon | 0.9 m ahead of Quant on the leash, building side | follows Quant | |
| Quant's roadster, parked | (88, 0, 394.4) | -PI/2 (west) | Against the north curb (z 393.25), 24 m west of the door. Mode: person, `person.inVehicle = false`. |
| Degens van stop | (116, 0, 394.6) | -PI/2 | At the curb in front of the door; sliding door on its right (curb) side. About 5.6 x 2.0 x 2.4 m, black with an acid-green stripe, "HODL Moving Co. · We never let go." |
| Van entry path | (160, 0, 397.2) -> (130, 0, 396.0) -> (116, 0, 394.6) | | Turns in from Madison Ave (x 155), E 37th St runs one way west. |
| Van exit path | (116, 0, 394.6) -> (100, 0, 397.5) -> (12, 0, 397.5) -> (3.6, 0, 405) -> (3.6, 0, 470) | | West past the roadster, left (south) onto 5th Ave, gone. |
| Bagsy | (113.5, 0.22, 391.4) | -PI/2 | Crew lead: charcoal hoodie, acid-green drawstrings, a duffel slung across his chest, sunglasses. |
| Stops | (114.8, 0.22, 392.6) | -PI/2 | Lanky, acid-green beanie. He takes Moon. |
| Clear zone during the opening | x 0..160, z 385..406 | | No traffic or pedestrians on this block while the cutscene runs; let traffic back when control returns. |

Street facts: E 37th St centreline z 398.6, 10.7 m roadway (curbs z 393.25 and 403.95), one way westbound; north
sidewalk z 387.5..393.25 at y 0.22. The sun is low in the north-west, so the street is in warm shade and the upper floors
across the street catch the light.

### 5.2 Opening cutscene (42 s)
Camera moves ease in-out (cubic). FOV is vertical, in degrees (the city's chase camera is 56). "->" is a move over the
shot's duration. All shots checked as stills in the running city.

| # | Dur | Camera position | Look-at | FOV | Move | What happens | Dialogue |
|---|---|---|---|---|---|---|---|
| 1 | 6.0 s | (260, 140, 250) -> (200, 120, 330) | (-80, 180, 686) -> (-80, 150, 686) | 50 | slow push in and down | Aerial over Murray Hill's rooftops at golden hour, the Empire State Building filling the frame. Title: **WAGMI CITY** (the game's title card, styled as 2.2 at 80 px). | Ambient city, a distant siren. |
| 2 | 5.0 s | (152, 5.5, 397.5) -> (148, 3.2, 397.0) | (70, 3, 392) | 45 | crane down | E 37th St from the Madison end looking west: brick, AC units, the roadster parked at the right-hand curb. Place name bottom-right: *Murray Hill*. Title card: ACT I · BAGS / **DOGNAPPED**. | |
| 3 | 4.0 s | (104, 1.0, 392.2) -> (104.3, 1.0, 391.9) | (112.5, 1.5, 388.6) | 50 | tiny push | Low 3/4 on the door. It opens; Moon trots out first, leash taut; Quant follows, phone in his free hand, eyes on the screen. He walks to his walking mark. | QUANT (reading, flat): "'Delete your account.' Good morning to you too." |
| 4 | 3.5 s | hold shot 3 | | | | 2D phone overlay over a soft blur (a third of the screen, right side): the comments scroll. "@bagzzz: you rugged us kid", "@ngmi_420: we know where u live", "@moonfan: MOON IS SO FLUFFY". Moon tugs toward the car. | QUANT: "Okay, okay. Car, then the park, then we log off forever." (beat) "Kidding. Obviously." |
| 5 | 3.5 s | (60, 0.7, 399.5) | (155, 1.6, 396) | 40 | static (long lens) | Road level looking east to Madison. The black van turns in from Madison and rolls toward camera, slowing, bass thumping. | Tyre squeal. |
| 6 | 3.0 s | (96, 1.5, 390.8) | (116, 1.3, 393.0) | 48 | static | Sidewalk wide looking east: Quant (turning around, now h PI/2) and Moon in the foreground, the van pulling in at the curb; the sliding door rips open, Bagsy and Stops hop down. | BAGSY: "Yo! Coin kid! Huge fan. Sign my bags?" |
| 7 | 4.0 s | (115.6, 1.75, 392.4) | (109, 1.6, 390.8) | 40 | slight handheld drift | Over Bagsy's left shoulder onto Quant's face; Moon at his feet. | QUANT: "I don't do autographs. I do 'please step back'." BAGSY: "You got rich. Our bags went to zero. So we're borrowing something." |
| 8 | 2.5 s | (106, 0.45, 389.2) | (109.5, 0.5, 391) | 60 | quick pan with Moon | Moon's eye level. Stops lunges in from the right and scoops Moon up; the leash whips out of Quant's hand. Moon barks. | QUANT: "Moon!" |
| 9 | 2.5 s | (104.5, 1.4, 392.5) | (109, 1.2, 390.8) | 45 | static | Behind Quant: he lunges; Bagsy shoves him hard and he goes down on the sidewalk. | BAGSY (backing into the van): "Want the dog? Check your DMs. Stay rich." |
| 10 | 3.0 s | (135, 1.2, 397.0) | (60, 1.0, 397.5) | 50 | static, then a small pan left | Behind the van looking west: the door slams, the van pulls out, passes the roadster, brakes at 5th Ave and turns left. | Tyre squeal, horn from a taxi. |
| 11 | 3.5 s | (106.5, 1.5, 393.0) | (109, 1.3, 390.8) | 40 | slow push in | Front close on Quant getting up (getup clip). His phone buzzes: 2D notification, "MoonTag · Moon is moving · 5th Ave", a little map pin. He looks at it, then down the street. | QUANT (quiet): "Okay. You took the wrong dog." |
| 12 | 1.5 s | blend from shot 11 to the chase camera behind Quant (h -PI/2) | | 56 | 1.5 s ease | Bars slide out, HUD fades in. Control returns at (109, 0.22, 390.8) facing the roadster. | |

Total 42.0 s (shot 4 overlays shot 3's set; it is 3.5 s of its own). Skippable after 1 s (Hold Space).

### 5.3 Phase 1 · To the car (checkpoint 1)
- Objective: "Get in your **car**." (car in #6CB8FF). The roadster is a blue blip.
- Help: "Press F to get in a vehicle." (game.js's own F prompt "F · Get in" also shows beside the car).
- In the car: vehicle name bottom-right, *Quant's Roadster*.

### 5.4 Phase 2 · The drive (~2.0 km, ~110 s)
- Objective: "Follow Moon's tag to **Chelsea Park**." Destination blip and corona at **(-1139, 0, 1160)**: 9th Ave's
  west lane beside the park's east edge, just south of W 28th St. Arrive: inside 6 m at under 8 m/s.
- Route (the legal GPS route): west on E/W 37th St (one way west) from x 88 to 9th Ave (x -1134), left (south) on 9th
  Ave (one way south) from z 398.6 to 1160. Waypoints: (88, 397.5), (-1134, 397.5), (-1139, 1160). On the way: 5th,
  6th, Broadway, 7th (the Garment District), 8th, 9th Ave (Hell's Kitchen), then Chelsea.
- Help in turn: "Your destination is marked with a ● on the Radar." (2 s in), "GPS shows the quickest legal route with
  a yellow line." (8 s), "Hold Shift to boost." (20 s).
- Moon's tag: a blue paw blip moving ahead on the radar for the first 20 s (cosmetic, along 5th Ave south to 34th St,
  west on 34th St to 9th Ave, south to W 28th St), then it stops at the park and the yellow destination takes over.
- Phone call in the car, starting 6 s after he sets off (caller card JUNO, bottom-right):
  - JUNO: "Quant. Why is your dog's tag doing forty down Fifth Avenue?"
  - QUANT: "Because some guys in a van took Moon."
  - JUNO: "...Okay. I'm on the tag. They're cutting west. Who were they?"
  - QUANT: "Guys who lost money."
  - JUNO: "So, everyone. Great, narrows it down."
  - JUNO: "Tag stopped. Chelsea Park, Ninth and Twenty-Eighth. Don't do anything stupid."
  - QUANT: "Define stupid."
  - JUNO: "Going there alone."
  - QUANT: "Then I'm already doing it."
- Fail: none on the drive (a first mission is forgiving). Leaving the car: "Get back in your **car**."

### 5.5 Arrival cutscene "The swap" (13 s, checkpoint 2 after it)
Set when it starts: the van parked on W 28th St at the park's north edge **(-1240, 0, 1120.2) h PI/2** (W 28th St runs
one way east; its sliding door faces the park); a black SUV with acid-green rims ahead of it at **(-1222, 0, 1120.2)
h PI/2**, Moon's carrier going in through the back. Quant's car where he stopped (snap it to (-1139, 0, 1160) h 0 if
he arrived crooked).

| # | Dur | Camera position | Look-at | FOV | What happens | Dialogue |
|---|---|---|---|---|---|---|
| A1 | 3.5 s | (-1133, 1.7, 1124) | (-1225, 1.4, 1120) | 38 | Long lens down W 28th St along the park: Gwei slams the SUV's back door; Moon's face at the rear window. | |
| A2 | 3.0 s | (-1137.5, 1.2, 1168) | (-1140, 1.4, 1118) | 45 | Behind Quant by his car: the SUV comes round the corner of W 28th onto 9th Ave and whips past on his right (east), close. | QUANT: "MOON!" |
| A3 | 2.0 s | (-1128, 1.6, 1150) | (-1133, 1.5, 1300) | 45 | The SUV's tail lights going away south down 9th Ave (despawn at z 1500). A bark, distant. | |
| A4 | 4.5 s | (-1141.8, 1.75, 1161.2) | (-1190, 1.3, 1156) | 45 | Over Quant's shoulder (Quant at (-1145.5, 0.22, 1160) h -PI/2, the park sidewalk): Bagsy, Stops, Gwei and Wick walk out across the lawn toward him; Wick tips a trash can over, Stops picks up a bottle. | BAGSY: "Told you to check your DMs. You didn't check your DMs." QUANT: "Been a little busy getting robbed." BAGSY: "Nothing personal, kid. It's just extremely personal." |

SUV path: (-1222, 1120.2) -> (-1150, 1119.5) -> (-1136, 1128) -> (-1131, 1175) -> (-1131, 1500), about 16 m/s.

### 5.6 Phase 3 · The fight (checkpoint 2)
- Objective: "Beat up the **Degens**." Counter: DEGENS 0/4 (becomes 0/5 when FOMO arrives). Help (first fight): the
  combat team's, plus "Degens are marked with a red dot on the Radar."
- Arena: Chelsea Park's east end, centre **(-1200, 0, 1157)**, radius 45 m; the park runs x -1392..-1147, z
  1127..1188, with no colliders on the lawn; the north sidewalk at z 1122..1127.
- Spawns: Bagsy (-1178, 0, 1150), Stops (-1185, 0, 1163), Gwei (-1192, 0, 1140), Wick (-1190, 0, 1172), all facing
  east. Fists and kicks only for them (Bagsy hits 1.5x as hard and takes 1.5x the damage).
- Props: a trash can at (-1160, 0, 1132), bottles at (-1205, 0, 1145) and (-1170, 0, 1175). (Pickups are taught in M2;
  here they are just there.)
- Reinforcement: when 2 are down, FOMO runs in along W 28th St from (-1265, 0, 1121): "Wait! Did I miss the pump?"
  BAGSY: "You always miss the pump!"
- Barks during the fight (Degens, 6-10 s apart): "This is for my margin call!" "I was up forty grand, kid!" "Buy high,
  hit hard!" "Somebody record this!" Quant (on hits): "Read the whitepaper." "That's a dip." "Stop-loss."
- Last hit: 0.6 s slow motion.
- Leaving 90 m from the centre: "Get back to the **fight**."; 150 m: fail "You left the fight."

### 5.7 Phase 4 · The van and the call (checkpoint 3)
- Objective: "Search the **van**." (green). Marker on the park sidewalk at its sliding door: **(-1240, 0.22, 1123.6)**.
  Help: "Hold F to search." (1.2 s hold, a ring fills.)
- Cutscene "The collar" (about 30 s):
  - C1 (3 s): camera (-1239.2, 1.8, 1125.2), look (-1240.5, 1.0, 1120.5), FOV 45. Over Quant's shoulder: the door slides
    open. On the seat: Moon's collar with the tag, chewed off, and a cheap burner phone. It rings.
  - C2 (4 s): camera (-1236.8, 1.6, 1127.0), look (-1240, 1.55, 1123.6), FOV 40. Quant picks up the collar, then the
    phone. He answers.
  - Call (2D caller card: UNKNOWN, a chrome visor icon; ZK's voice pitched and buzzy). C3 holds a slow push on Quant's
    face, camera (-1238.2, 1.6, 1126.2) -> (-1238.6, 1.6, 1125.6), look (-1240, 1.6, 1123.6), FOV 38:
    - ZK: "Quant. Big fan. Loved the coin. Loved it more on the way up."
    - QUANT: "Who is this?"
    - ZK: "Zero Knowledge. ZK. You don't know me. That's the brand."
    - QUANT: "Give Moon back."
    - ZK: "My community lost a lot of money, Quant. Moon is collateral. Keep this phone on you. And maybe stop
      posting."
    - (click)
    - QUANT (to the dead phone): "Did a guy with a voice changer just tell me to log off?"
- **MISSION PASSED** · Dognapped. TIME, DEGENS REKT 5/5, HITS TAKEN, **FOLLOWERS +4,210** ("#CoinKidFights is
  trending"). Unlock: Juno's contact.

### 5.8 Hand-off
6 s later, a DM card top-right, "New message · Juno": "that burner is a gift. bring it to me. bryant park, by the
library. try not to get mugged on the way." The **J** blip drops at Bryant Park, the 6th Ave entrance at W 41st St
(-296, 0.22, 84.5), and pulses. Help: "A new mission is available. Go to the **J** on the Radar."

### 5.9 Fails and checkpoints

| Checkpoint | Restart state |
|---|---|
| 1 · after the opening | Quant (109, 0.22, 390.8) h -PI/2, person mode; roadster (88, 0, 394.4) h -PI/2. |
| 2 · after the arrival | Quant (-1145.5, 0.22, 1160) h -PI/2, person mode; roadster (-1139, 0, 1160) h 0; the van and four Degens at their spawns; the SUV gone. |
| 3 · after the fight | Quant (-1240, 0.22, 1125) h PI, beside the van. |

Fails: "Quant got rekt." (knocked out, any phase), "You left the fight." (phase 3). The drive cannot fail.

### 5.10 Option B (upgrade once the van drives well): a live chase
Instead of the tag, the van leaves in shot 10 and the player chases it: "Follow the **van**." The van drives the GPS
route above (37th St west, 9th Ave south) 30-80 m ahead, rubber-banded so it can't be lost (first missions don't
fail), runs the red lights and scatters traffic, and reaches the park 6 s before Quant; the arrival cutscene then
plays exactly as written (the swap happens as he pulls up).

---------------------------------------------------------------------------------------------------------------------

## 6. Notes for the other tracks (seen while scouting, not fixed: not my files)
- In car mode at start, the player's walker is not marked as in the car, so the ambient branch of
  `controllerManager.update` walks Quant's model up the 5th Ave sidewalk while you drive (at load the person entity is
  at (-11.6, 0.22, 408.8), visible). game.js could set `person.inVehicle = true` when the game starts in the car.
- Traffic includes police cruisers with the real city's livery; for WAGMI City they want a fictional one (WCPD).
- The full map teleports on click; story mode needs that off (section 3).
- The cutscene camera pattern used for the scouting stills: replace `__NYC_APP.cameraSystem.update` with a function
  that sets the camera's position, look-at and FOV each frame, and put it back when the shot ends
  (.scratch/missions/scout.mts).
- Scouting sheets: .scratch/missions/s1-s8.jpg (s3: the E 37th St set; s6: Chelsea Park; s7: Times Square at midnight,
  Washington Square, Wall St, 125th St, Bethesda, the Great Lawn; s8: every Mission 1 camera above).
