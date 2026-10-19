// Core Data Definitions for Chair Evolutions, Upgrades, and Campaign Operations

export const CHAIR_EVOLUTIONS = [
  {
    id: 'stool',
    key: '1',
    name: 'Rickety Bistro Stool',
    subtitle: 'Nimble Bentwood Classic',
    cost: 0,
    unlockedByDefault: true,
    speed: 7.8,
    dashSpeed: 19.5,
    stealthBonus: 1.25, // harder to spot
    siphonRate: 1.0,
    catapultForce: 15.0,
    gluteMagnetRadius: 1.6,
    specialName: 'Whoopee Cushion Pop',
    specialDesc: 'Releases a sonic whoopee shockwave that distracts nearby humans and lures them to sit.',
    statsText: ['Speed: High', 'Stealth: +25%', 'Special: Sonic Lure']
  },
  {
    id: 'swivel',
    key: '2',
    name: 'AeroMesh 9000 Swivel',
    subtitle: 'Ergonomic Corporate Speedster',
    cost: 120,
    unlockedByDefault: false,
    speed: 9.4,
    dashSpeed: 24.5,
    stealthBonus: 1.05,
    siphonRate: 1.25,
    catapultForce: 17.5,
    gluteMagnetRadius: 2.1,
    specialName: '360° Caster Cyclone',
    specialDesc: 'Spins rapidly on precision twin-wheel casters, instantly sabotaging all rival chairs within 4.2m.',
    statsText: ['Speed: Ultra', 'Slide Dash: +30%', 'Special: Caster Cyclone']
  },
  {
    id: 'gaming',
    key: '3',
    name: 'Apex Sit-Pro RGB',
    subtitle: 'Pro-Esports Bucket Chassis',
    cost: 280,
    unlockedByDefault: false,
    speed: 10.2,
    dashSpeed: 27.0,
    stealthBonus: 0.95,
    siphonRate: 1.45,
    catapultForce: 20.0,
    gluteMagnetRadius: 3.1,
    specialName: 'Magnetic Glute Overdrive',
    specialDesc: 'Activates RGB lumbar electromagnetics, pulling any descending human within 6m straight onto your seat!',
    statsText: ['Glute Magnet: Wide', 'Siphon: +45%', 'Special: Glute Magnet']
  },
  {
    id: 'recliner',
    key: '4',
    name: 'CloudNine Velvet Recliner',
    subtitle: 'Plush Luxury Siphon & Launcher',
    cost: 480,
    unlockedByDefault: false,
    speed: 7.4,
    dashSpeed: 21.0,
    stealthBonus: 1.15,
    siphonRate: 2.0,
    catapultForce: 28.0,
    gluteMagnetRadius: 2.6,
    specialName: 'Hyper-Footrest Catapult',
    specialDesc: 'Deploys a 5,000-Newton spring footrest that launches sitters into orbit or bowls over Janitors.',
    statsText: ['Siphon: 2.0x Speed', 'Catapult: Mega', 'Special: Spring Launch']
  },
  {
    id: 'throne',
    key: '5',
    name: 'Sovereign IV Gilded Throne',
    subtitle: 'Supreme Monarch of Posteriors',
    cost: 800,
    unlockedByDefault: false,
    speed: 9.6,
    dashSpeed: 26.5,
    stealthBonus: 1.35,
    siphonRate: 2.4,
    catapultForce: 32.0,
    gluteMagnetRadius: 3.8,
    specialName: 'Royal Decree Shockwave',
    specialDesc: 'Shatters all nearby rival chairs, stuns Janitors, and compels nearby humans to immediately sit!',
    statsText: ['All Stats: Elite', 'VIP Magnet: Max', 'Special: Royal Decree']
  }
];

export const WORKSHOP_UPGRADES = [
  {
    id: 'titaniumCasters',
    name: 'Titanium Ball-Bearing Casters',
    desc: '+12% Scoot & Slide-Intercept velocity per rank.',
    baseCost: 75,
    maxLevel: 5
  },
  {
    id: 'chameleonVarnish',
    name: 'Chameleon Woodgrain Finish',
    desc: '-16% Human suspicion build-up & faster incognito cooldown.',
    baseCost: 85,
    maxLevel: 5
  },
  {
    id: 'memoryFoamCore',
    name: 'NASA Memory-Foam Cushion',
    desc: '+20% Comfort Siphon speed & +25% Glute Gold per sit.',
    baseCost: 90,
    maxLevel: 5
  },
  {
    id: 'pneumaticSprings',
    name: 'Overclocked Pneumatic Piston',
    desc: '+20% Chaos Catapult launch distance & Janitor knockout radius.',
    baseCost: 100,
    maxLevel: 5
  },
  {
    id: 'autoWrench',
    name: 'Telekinetic Allen Wrench',
    desc: '+25% Rival Chair sabotage range & bonus Gold from broken chairs.',
    baseCost: 95,
    maxLevel: 5
  }
];

export const CAMPAIGN_LEVELS = [
  {
    id: 'cafe',
    act: 'ACT I',
    name: 'Bean & Bone Artisanal Café',
    desc: 'Warm sunlit coffeehouse packed with caffeinated hipsters and wooden bistro chairs. Learn the art of the Last-Second Intercept.',
    theme: {
      floorColor: 0x3b2d22,
      checkerColor: 0x473629,
      wallColor: 0x261d17,
      ambientLight: 0xffe4c4,
      sunLight: 0xffb347,
      accentColor: 0xf5b731
    },
    arenaSize: { w: 28, d: 24 },
    sitQuota: 5,
    rivalChairsCount: 8,
    patronsCount: 6,
    janitorsCount: 1,
    boss: {
      name: 'BARON VON ESPRESSO',
      title: 'Triple-Shot Latte Critic',
      sitsRequired: 2,
      speed: 4.3,
      suitColor: 0x7c2d12,
      hatType: 'beret'
    },
    objectives: [
      { id: 'quota', text: 'Harvest 5 Full Sits or Catapults' },
      { id: 'intercept', text: 'Perform 2 Last-Second Slide Intercepts' },
      { id: 'sabotage', text: 'Sabotage 3 Rival Bistro Chairs (Key E)' },
      { id: 'boss', text: 'Seat Boss: Baron Von Espresso (2x)' }
    ]
  },
  {
    id: 'office',
    act: 'ACT II',
    name: 'OmniCorp 88th Floor Boardroom',
    desc: 'High-stakes corporate glass tower. Executives pace on conference calls while Facilities Janitors hunt unauthorized furniture.',
    theme: {
      floorColor: 0x1e293b,
      checkerColor: 0x263449,
      wallColor: 0x0f172a,
      ambientLight: 0xdbeafe,
      sunLight: 0x60a5fa,
      accentColor: 0x2de2e6
    },
    arenaSize: { w: 32, d: 26 },
    sitQuota: 7,
    rivalChairsCount: 10,
    patronsCount: 8,
    janitorsCount: 2,
    boss: {
      name: 'CEO CHAD STERLING',
      title: 'Synergy Overlord',
      sitsRequired: 2,
      speed: 4.8,
      suitColor: 0x1e3a8a,
      hatType: 'exec'
    },
    objectives: [
      { id: 'quota', text: 'Harvest 7 Full Sits or Catapults' },
      { id: 'intercept', text: 'Land 3 Last-Second Slide Intercepts' },
      { id: 'sabotage', text: 'Sabotage 5 Rival Office Chairs (Key E)' },
      { id: 'boss', text: 'Seat Boss: CEO Chad Sterling (2x)' }
    ]
  },
  {
    id: 'gala',
    act: 'ACT III',
    name: 'The Grand Velvet Ballroom',
    desc: 'Black-tie champagne gala under crystal chandeliers. High-society guests refuse to sit unless rival velvet chairs are eliminated.',
    theme: {
      floorColor: 0x27173a,
      checkerColor: 0x351f4f,
      wallColor: 0x180e29,
      ambientLight: 0xf5d0fe,
      sunLight: 0xe879f9,
      accentColor: 0xa855f7
    },
    arenaSize: { w: 34, d: 28 },
    sitQuota: 9,
    rivalChairsCount: 12,
    patronsCount: 9,
    janitorsCount: 2,
    boss: {
      name: 'DUCHESS VIVIENNE',
      title: 'High-Society Connoisseur',
      sitsRequired: 3,
      speed: 5.0,
      suitColor: 0x831843,
      hatType: 'tiara'
    },
    objectives: [
      { id: 'quota', text: 'Harvest 9 Full Sits or Catapults' },
      { id: 'intercept', text: 'Land 4 Last-Second Slide Intercepts' },
      { id: 'catapult', text: 'Catapult 2 Sitters across the Ballroom (Key Q/R)' },
      { id: 'boss', text: 'Seat Boss: Duchess Vivienne (3x)' }
    ]
  },
  {
    id: 'palace',
    act: 'ACT IV // FINALE',
    name: 'The Crimson Throne Room',
    desc: 'Infiltrate the Royal Citadel! Outsmart Royal Guards, shatter golden rival thrones, and claim King Bartholomew’s royal posterior.',
    theme: {
      floorColor: 0x3b0d16,
      checkerColor: 0x4c111d,
      wallColor: 0x22070c,
      ambientLight: 0xfecdd3,
      sunLight: 0xf59e0b,
      accentColor: 0xf43f5e
    },
    arenaSize: { w: 36, d: 30 },
    sitQuota: 11,
    rivalChairsCount: 14,
    patronsCount: 10,
    janitorsCount: 3,
    boss: {
      name: 'KING BARTHOLOMEW IV',
      title: 'The Sovereign of Sit',
      sitsRequired: 3,
      speed: 5.3,
      suitColor: 0xb91c1c,
      hatType: 'crown'
    },
    objectives: [
      { id: 'quota', text: 'Harvest 11 Full Sits or Catapults' },
      { id: 'intercept', text: 'Land 5 Last-Second Slide Intercepts' },
      { id: 'sabotage', text: 'Sabotage 7 Rival Royal Chairs' },
      { id: 'boss', text: 'Seat Final Boss: King Bartholomew IV (3x)' }
    ]
  },
  {
    id: 'endless',
    act: 'BONUS // ARCADE',
    name: 'Endless Musical Chairs Chaos',
    desc: 'Non-stop waves of frantic sitters, escalating Janitor squads, and massive combo multipliers. How many posteriors can you claim?',
    theme: {
      floorColor: 0x111827,
      checkerColor: 0x1f2937,
      wallColor: 0x090d16,
      ambientLight: 0xe0f2fe,
      sunLight: 0xfacc15,
      accentColor: 0xf5b731
    },
    arenaSize: { w: 34, d: 28 },
    sitQuota: 999,
    rivalChairsCount: 12,
    patronsCount: 11,
    janitorsCount: 2,
    boss: {
      name: 'GRANDMASTER GLUTEUS',
      title: 'Eternal Musical Chair Champion',
      sitsRequired: 5,
      speed: 5.4,
      suitColor: 0xd97706,
      hatType: 'crown'
    },
    objectives: [
      { id: 'quota', text: 'Endless Mode: Achieve Highest Score Possible' },
      { id: 'intercept', text: 'Chain Last-Second Intercept Combos' },
      { id: 'boss', text: 'Defeat Grandmaster Gluteus (5x)' }
    ]
  }
];
