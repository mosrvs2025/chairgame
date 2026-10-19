# 🪑 SIT ON ME — The Sentient Chair Tactical Stealth & Physics Action Game

> **"Every posterior in the room shall know your lumbar support."**

**SIT ON ME (`chairgame`)** is a 3D WebGL / Three.js stealth-action & physics comedy game where you play as a **sentient, hyper-ambitious chair**. Sneak behind humans when they aren't looking, sabotage inferior rival furniture, slide-intercept descending glutes at the last millisecond, evolve across 5 distinct chair chassis, or launch VIPs across the room into patrolling Facilities Janitors.

---

## 🎮 Core Gameplay Mechanics

1. **👁️ Red Light, Green Light Stealth (`SPACE`)**
   - Humans freak out if they see a chair scooting across the floor! Watch their floor vision cones and hold **`SPACE`** to close your sentient backrest eyes and freeze as an innocent piece of furniture.
   - Tap **`SPACE`** while moving to perform a **Chair Hop**.

2. **🎯 Last-Second Glute Intercepts (`SHIFT`)**
   - When a human decides to sit, a golden **Target Drop Ring** appears beneath them as they squat down.
   - Hit **`SHIFT`** to turbo-slide right underneath their descending glutes for a **Last-Second Intercept** multiplier!

3. **🔧 Rival Chair Sabotage (`E`)**
   - Press **`E`** near ordinary chairs to unscrew their legs! When a human tries sitting on a sabotaged rival chair, it collapses—creating an extended mid-air panic window for you to slide underneath and catch them.

4. **🚀 Comfort Siphon vs. Chaos Catapult (`Q` & `R`)**
   - Hold still while a human sits on you to **Siphon Comfort Energy** and harvest **Glute Gold (🪙)**.
   - Or press **`Q` / `R`** to trigger your **Pneumatic Catapult**, launching the sitter across the room to bowl over patrolling **Facilities Janitors**!

5. **🛠️ Chair Evolution & Live Morphing (`1`–`5` / `TAB`)**
   - Unlock and hot-swap between 5 sentient chair evolutions mid-mission:
     - `[1]` **Rickety Bistro Stool** — High stealth & *Sonic Whoopee Lure*
     - `[2]` **AeroMesh 9000 Swivel** — High-speed twin casters & *360° Caster Cyclone* (AoE rival sabotage)
     - `[3]` **Apex Sit-Pro RGB** — Wide magnetic glute pull & *RGB Glute Magnet Overdrive*
     - `[4]` **CloudNine Velvet Recliner** — 2x Comfort Siphon speed & *Hyper-Footrest Catapult*
     - `[5]` **Sovereign IV Gilded Throne** — Supreme stats & *Royal Decree Shockwave*

---

## 🗺️ Multi-Level Campaign + Endless Mode

- **Act I: Bean & Bone Artisanal Café** — *VIP Boss: Baron Von Espresso*
- **Act II: OmniCorp 88th Floor Boardroom** — *VIP Boss: CEO Chad Sterling*
- **Act III: The Grand Velvet Ballroom** — *VIP Boss: Duchess Vivienne*
- **Act IV: The Crimson Throne Room** — *VIP Boss: King Bartholomew IV*
- **Bonus Arcade: Endless Musical Chairs Chaos** — *VIP Boss: Grandmaster Gluteus*

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```


## Phone & tablet controls

The game supports portrait and landscape touch play. Drag the left thumbstick to scoot; you can hold it with one thumb while using abilities with the other.

- **FREEZE**: hold to disguise yourself; tap while moving to hop.
- **DASH**: turbo slide toward a golden sit target (cooldown shown on button).
- **SABOTAGE**: break a nearby rival chair.
- **SPECIAL**: activate the current chair's special ability.
- **SIPHON / CATAPULT**: tap to switch mode; becomes **LAUNCH** when occupied.
- **Evolutions**: open the workshop to unlock and equip every chassis by touch.
- **Pause**: stop the mission and resume without restarting it. Switching apps also pauses and clears held input.

Touch controls appear on phones, tablets, touch laptops, and windows up to 900px wide. Safe-area insets and dynamic viewport height keep controls clear of browser chrome. Mobile uses a capped 1.25 pixel ratio and 1024px shadow maps.

## Browser regression tests

```
npm ci
npm test
npm run build
```

Tests require Google Chrome installed (`channel: chrome`). The suite starts its own Vite server and covers real browser touch events, simultaneous thumbstick/ability input, release/cancellation, freeze, dash, sabotage, special, harvesting, catapulting, evolution purchases/equipping, pause/resume, and desktop keyboard controls. Layouts cover 320×568, 390×844, 844×390 landscape, and 768×1024. Device emulation does not replace performance testing on physical iOS/Android hardware.
