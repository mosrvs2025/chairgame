import * as THREE from 'three';
import { TouchControls } from './input/TouchControls.js';
import { CHAIR_EVOLUTIONS, WORKSHOP_UPGRADES, CAMPAIGN_LEVELS } from './data/GameData.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { ChairPlayer } from './entities/ChairPlayer.js';
import { RivalChair } from './entities/RivalChair.js';
import { HumanNPC } from './entities/HumanNPC.js';
import { ArenaBuilder } from './world/ArenaBuilder.js';

class ChairGameApp {
  constructor() {
    this.canvas = document.getElementById('three-canvas');
    this.mobileDevice = navigator.maxTouchPoints > 0 || matchMedia('(max-width: 900px)').matches;
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');
    this.labelsContainer = document.getElementById('world-labels-container');

    this.sound = new SoundEngine();

    // Persistent Save State
    this.saveData = this.loadSaveData();

    // Three.js Core
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090f);
    this.scene.fog = new THREE.FogExp2(0x07090f, 0.018);

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 120);
    this.camera.position.set(0, 16, 19);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.mobileDevice,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobileDevice ? 1.25 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.setupLights();

    // Entities & World
    this.arena = new ArenaBuilder(this.scene);
    this.player = new ChairPlayer(this.scene);
    this.player.setForm(this.saveData.equippedForm);

    this.rivalChairs = [];
    this.npcs = [];
    this.bossNpc = null;
    this.floaters = []; // { el, worldPos, life }
    this.activeBadges = new Map();

    // Mission State
    this.mode = 'menu'; // menu | playing | paused | workshop | result
    this.currentLevelIndex = 0;
    this.currentLevel = CAMPAIGN_LEVELS[0];
    this.arenaBounds = { w: 28, d: 24 };

    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.sitsHarvested = 0;
    this.interceptsLanded = 0;
    this.sabotagesDone = 0;
    this.catapultsLaunched = 0;
    this.cameraShake = 0;

    // Input State
    this.input = { keys: {} };
    this.touch = new TouchControls(this.input, code => this.handleAction(code));
    this.bindEvents();
    this.buildMenuUI();
    this.updateWorkshopUI();
    this.updateEvolutionBarUI();

    // Load background showcase stage for main menu
    this.loadStage(0, true);

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loadSaveData() {
    try {
      const raw = localStorage.getItem('chairgame_save_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore storage errors
    }
    return {
      coins: 150, // Starter Glute Gold so player can experiment right away!
      unlockedForms: ['stool'],
      equippedForm: 'stool',
      upgrades: {
        titaniumCasters: 0,
        chameleonVarnish: 0,
        memoryFoamCore: 0,
        pneumaticSprings: 0,
        autoWrench: 0
      },
      completedLevels: []
    };
  }

  saveProgress() {
    try {
      localStorage.setItem('chairgame_save_v1', JSON.stringify(this.saveData));
    } catch (e) {
      // ignore
    }
    this.refreshCurrencyDisplays();
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffe4c4, 0.75);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffb347, 1.85);
    this.dirLight.position.set(12, 24, 14);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = this.mobileDevice ? 1024 : 2048;
    this.dirLight.shadow.mapSize.height = this.mobileDevice ? 1024 : 2048;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 60;
    const d = 22;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.playerSpot = new THREE.PointLight(0xf5b731, 1.2, 9);
    this.playerSpot.position.set(0, 3.5, 0);
    this.scene.add(this.playerSpot);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && this.mode === 'playing') e.preventDefault();
      this.input.keys[e.code] = true;
      if (!e.repeat) this.handleAction(e.code);
    });
    window.addEventListener('keyup', e => { this.input.keys[e.code] = false; });
    const suspend = () => { this.input.keys = {}; this.touch.clear(); this.pauseMission(); };
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeMission());
    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      document.getElementById('pause-modal').classList.add('hidden');
      this.showMainMenu();
    });

    // Buttons
    document.getElementById('btn-open-workshop-menu').addEventListener('click', () => this.openWorkshop());
    document.getElementById('btn-open-workshop-hud').addEventListener('click', () => this.openWorkshop());
    document.getElementById('btn-close-workshop').addEventListener('click', () => this.closeWorkshop());
    document.getElementById('btn-pause-hud').addEventListener('click', () => this.pauseMission());

    const audioBtn = document.getElementById('btn-toggle-audio');
    audioBtn.addEventListener('click', () => {
      const on = this.sound.toggle();
      audioBtn.textContent = on ? '🔊 Audio: ON' : '🔇 Audio: OFF';
    });

    document.getElementById('btn-result-next').addEventListener('click', () => {
      const nextIdx = (this.currentLevelIndex + 1) % CAMPAIGN_LEVELS.length;
      this.startMission(nextIdx);
    });
    document.getElementById('btn-result-workshop').addEventListener('click', () => {
      document.getElementById('result-modal').classList.add('hidden');
      this.openWorkshop();
    });
    document.getElementById('btn-result-retry').addEventListener('click', () => {
      this.startMission(this.currentLevelIndex);
    });
    document.getElementById('btn-result-menu').addEventListener('click', () => {
      this.showMainMenu();
    });
  }

  handleAction(code) {
    if (this.mode === 'paused' && code === 'Escape') return this.resumeMission();
    if (this.mode === 'workshop' && (code === 'Escape' || code === 'Tab')) return this.closeWorkshop();
    if (this.mode !== 'playing') return;
    if (code === 'Space') {
      if (Math.hypot(this.player.vel.x, this.player.vel.z) > 2.2 && this.player.hopY === 0 && !this.player.occupiedBy) {
        this.player.hopVel = 7.2;
        this.sound.playHop();
      } else this.sound.playFreeze();
    }
    if (code === 'KeyE') this.trySabotageNearbyChair();
    if (code === 'KeyQ') {
      if (this.player.occupiedBy) this.executeCatapultOnActiveSitter();
      else {
        this.player.trapMode = this.player.trapMode === 'siphon' ? 'catapult' : 'siphon';
        this.updateTrapModeUI();
        this.sound.playFreeze();
      }
    }
    if (code === 'KeyR') {
      if (this.player.occupiedBy) this.executeCatapultOnActiveSitter();
      else this.triggerChairSpecial();
    }
    if (/^Digit[1-5]$/.test(code)) {
      const evo = CHAIR_EVOLUTIONS[Number(code.slice(-1)) - 1];
      if (this.saveData.unlockedForms.includes(evo.id)) this.equipChairForm(evo.id);
    }
    if (code === 'Tab') this.openWorkshop();
    if (code === 'Escape') this.pauseMission();
  }

  pauseMission() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.input.keys = {};
    this.touch.setEnabled(false);
    document.getElementById('pause-modal').classList.remove('hidden');
  }

  resumeMission() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.lastTime = performance.now();
    document.getElementById('pause-modal').classList.add('hidden');
    this.touch.setEnabled(true);
  }

  get upgrades() {
    return this.saveData.upgrades;
  }

  loadStage(levelIndex, isMenuPreview = false) {
    this.currentLevelIndex = levelIndex;
    this.currentLevel = CAMPAIGN_LEVELS[levelIndex];
    this.arenaBounds = this.currentLevel.arenaSize;

    // Clear existing entities
    this.rivalChairs.forEach(c => c.destroy());
    this.rivalChairs = [];
    this.npcs.forEach(n => n.destroy());
    this.npcs = [];
    this.bossNpc = null;
    this.clearWorldLabels();

    // Update lighting to match level theme
    const theme = this.currentLevel.theme;
    this.ambientLight.color.setHex(theme.ambientLight);
    this.dirLight.color.setHex(theme.sunLight);
    this.playerSpot.color.setHex(theme.accentColor);

    // Build 3D arena & tables
    const chairSpawns = this.arena.buildStage(this.currentLevel);

    // Spawn Rival Chairs
    chairSpawns.forEach(sp => {
      this.rivalChairs.push(new RivalChair(this.scene, sp.x, sp.z, sp.yaw, this.currentLevel.id));
    });

    // Reset Player Chair
    this.player.pos.set(0, 0, this.arenaBounds.d * 0.32);
    this.player.vel.set(0, 0, 0);
    this.player.health = 100;
    this.player.occupiedBy = null;
    this.player.setForm(this.saveData.equippedForm);

    // Spawn Patrons
    for (let i = 0; i < this.currentLevel.patronsCount; i++) {
      const rx = (Math.random() * 2 - 1) * (this.arenaBounds.w * 0.38);
      const rz = (Math.random() * 2 - 1) * (this.arenaBounds.d * 0.35);
      this.npcs.push(new HumanNPC(this.scene, { role: 'patron', x: rx, z: rz }));
    }

    // Spawn Janitors
    for (let i = 0; i < this.currentLevel.janitorsCount; i++) {
      const jx = (i % 2 === 0 ? -1 : 1) * (this.arenaBounds.w * 0.36);
      const jz = -this.arenaBounds.d * 0.32;
      this.npcs.push(new HumanNPC(this.scene, { role: 'janitor', x: jx, z: jz }));
    }

    // Spawn Stage VIP Boss Sitter!
    if (this.currentLevel.boss) {
      this.bossNpc = new HumanNPC(this.scene, {
        role: 'boss',
        x: 0,
        z: -this.arenaBounds.d * 0.28,
        bossData: this.currentLevel.boss
      });
      this.npcs.push(this.bossNpc);
    }

    if (!isMenuPreview) {
      this.score = 0;
      this.combo = 1.0;
      this.comboTimer = 0;
      this.sitsHarvested = 0;
      this.interceptsLanded = 0;
      this.sabotagesDone = 0;
      this.catapultsLaunched = 0;
      this.updateHUD();
    }
  }

  startMission(levelIndex) {
    this.sound.init();
    this.sound.startMusic();
    this.loadStage(levelIndex, false);
    this.mode = 'playing';
    this.input.keys = {};
    this.touch.clear();
    this.touch.setEnabled(true);
    document.getElementById('main-menu-modal').classList.add('hidden');
    document.getElementById('workshop-modal').classList.add('hidden');
    document.getElementById('result-modal').classList.add('hidden');
    document.getElementById('hud-top').classList.remove('hud-hidden');
    document.getElementById('hud-bottom').classList.remove('hud-hidden');

    document.getElementById('hud-level-badge').textContent = this.currentLevel.act;
    document.getElementById('hud-level-title').textContent = this.currentLevel.name.toUpperCase();

    if (this.bossNpc) {
      document.getElementById('boss-hud').classList.remove('hidden');
      document.getElementById('boss-name').textContent = this.currentLevel.boss.name;
    } else {
      document.getElementById('boss-hud').classList.add('hidden');
    }

    this.updateTrapModeUI();
    this.updateEvolutionBarUI();
    this.announce(this.currentLevel.name.toUpperCase(), `${this.currentLevel.act} // CLAIM EVERY POSTERIOR`);
  }

  showMainMenu() {
    this.mode = 'menu';
    this.input && (this.input.keys = {});
    this.touch?.setEnabled(false);
    document.getElementById('main-menu-modal').classList.remove('hidden');
    document.getElementById('workshop-modal').classList.add('hidden');
    document.getElementById('result-modal').classList.add('hidden');
    document.getElementById('hud-top').classList.add('hud-hidden');
    document.getElementById('hud-bottom').classList.add('hud-hidden');
    this.buildMenuUI();
  }

  openWorkshop() {
    this.prevMode = this.mode === 'workshop' ? 'menu' : this.mode;
    this.mode = 'workshop';
    this.input && (this.input.keys = {});
    this.touch?.setEnabled(false);
    this.updateWorkshopUI();
    document.getElementById('workshop-modal').classList.remove('hidden');
  }

  closeWorkshop() {
    document.getElementById('workshop-modal').classList.add('hidden');
    this.mode = this.prevMode || 'menu';
    this.touch.setEnabled(this.mode === 'playing');
    this.updateEvolutionBarUI();
  }

  equipChairForm(formId) {
    this.saveData.equippedForm = formId;
    this.player.setForm(formId);
    this.arena.spawnBurst(this.player.pos, 0x2de2e6, 22, 6.5);
    this.arena.spawnShockwave(this.player.pos, 0x2de2e6, 3.5);
    this.sound.playMorph();
    this.saveProgress();
    this.updateEvolutionBarUI();
    this.updateWorkshopUI();
    document.getElementById('slot-special-label').textContent = this.player.currentForm.specialName;
    this.spawnFloater(this.player.pos, `MORPHED: ${this.player.currentForm.name.toUpperCase()}`, 'cyan');
  }

  trySabotageNearbyChair() {
    if (this.player.sabotageCooldown > 0 || this.player.occupiedBy) return;
    const wrenchBonus = 1 + (this.upgrades.autoWrench || 0) * 0.25;
    const range = 2.45 * wrenchBonus;

    let closest = null;
    let minDist = range;
    for (const rc of this.rivalChairs) {
      if (!rc.sabotaged) {
        const d = Math.hypot(rc.pos.x - this.player.pos.x, rc.pos.z - this.player.pos.z);
        if (d < minDist) {
          minDist = d;
          closest = rc;
        }
      }
    }

    if (closest) {
      closest.sabotage();
      this.player.sabotageCooldown = 0.9;
      this.sabotagesDone++;
      const goldBonus = 15 + (this.upgrades.autoWrench || 0) * 8;
      this.saveData.coins += goldBonus;
      this.saveProgress();
      this.sound.playSabotage();
      this.arena.spawnBurst(closest.pos, 0xf5b731, 18, 5.5);
      this.addScore(150, `RIVAL SABOTAGED! +${goldBonus}🪙`, closest.pos, 'gold');
    } else {
      this.spawnFloater(this.player.pos, 'Move closer to a Rival Chair!', 'cyan');
    }
  }

  triggerChairSpecial() {
    if (this.player.specialCooldown > 0) return;
    this.player.specialCooldown = 6.5;
    const formId = this.player.currentFormId;
    this.player.spinBoostAngle = Math.PI * 4;

    if (formId === 'stool') {
      // Sonic Whoopee Lure: Compels nearest strolling human to immediately lower their glutes!
      this.sound.playCatapult();
      this.arena.spawnShockwave(this.player.pos, 0xf5b731, 6.5);
      let lured = 0;
      for (const npc of this.npcs) {
        if (npc.role !== 'janitor' && npc.state === 'stroll') {
          const d = Math.hypot(npc.pos.x - this.player.pos.x, npc.pos.z - this.player.pos.z);
          if (d < 8.5 && lured < 2) {
            npc.triggerLoweringHere(0.8);
            lured++;
          }
        }
      }
      this.spawnFloater(this.player.pos, 'SONIC WHOOPEE LURE!', 'gold');
    } else if (formId === 'swivel') {
      // 360 Caster Cyclone: Sabotages all rival chairs within 5.5m
      this.sound.playSabotage();
      this.arena.spawnShockwave(this.player.pos, 0x2de2e6, 5.8);
      let count = 0;
      for (const rc of this.rivalChairs) {
        if (!rc.sabotaged && Math.hypot(rc.pos.x - this.player.pos.x, rc.pos.z - this.player.pos.z) < 5.8) {
          rc.sabotage();
          this.sabotagesDone++;
          count++;
        }
      }
      this.addScore(count * 160 + 100, `CASTER CYCLONE (${count} BROKEN)!`, this.player.pos, 'cyan');
    } else if (formId === 'gaming') {
      // RGB Magnetic Glute Overdrive: Pulls any lowering or nearby patron straight onto seat
      this.sound.playMorph();
      this.arena.spawnShockwave(this.player.pos, 0xf43f5e, 7.5);
      const target = this.npcs.find(n => n.role !== 'janitor' && (n.state === 'lowering' || n.state === 'seek_chair'));
      if (target) {
        target.pos.x = THREE.MathUtils.lerp(target.pos.x, this.player.pos.x, 0.78);
        target.pos.z = THREE.MathUtils.lerp(target.pos.z, this.player.pos.z, 0.78);
        target.triggerLoweringHere(1.0);
        this.spawnFloater(this.player.pos, 'RGB GLUTE MAGNET ENGAGED!', 'purple');
      }
    } else if (formId === 'recliner') {
      // Hyper-Footrest Spring Wave: Stuns nearby Janitors and forces nearby patrons to sit
      this.sound.playCatapult();
      this.arena.spawnShockwave(this.player.pos, 0xa855f7, 7.0);
      for (const npc of this.npcs) {
        const d = Math.hypot(npc.pos.x - this.player.pos.x, npc.pos.z - this.player.pos.z);
        if (d < 6.8) {
          if (npc.role === 'janitor') npc.stun(6.5);
          else npc.triggerLoweringHere(0.9);
        }
      }
      this.spawnFloater(this.player.pos, 'PLUSH SHOCKWAVE!', 'purple');
    } else if (formId === 'throne') {
      // Royal Decree: Sabotages nearby chairs, stuns Janitors, and forces Boss/Patrons to sit!
      this.sound.playVictory();
      this.arena.spawnShockwave(this.player.pos, 0xf5b731, 9.5);
      this.rivalChairs.forEach(rc => {
        if (!rc.sabotaged && Math.hypot(rc.pos.x - this.player.pos.x, rc.pos.z - this.player.pos.z) < 8.0) {
          rc.sabotage();
          this.sabotagesDone++;
        }
      });
      this.npcs.forEach(npc => {
        if (Math.hypot(npc.pos.x - this.player.pos.x, npc.pos.z - this.player.pos.z) < 8.5) {
          if (npc.role === 'janitor') npc.stun(8.0);
          else npc.triggerLoweringHere(1.2);
        }
      });
      this.announce('ROYAL DECREE!', 'ALL POSTERIORS COMMANDED TO KNEEL');
    }
  }

  onPlayerCatchSitter(npc, isLastSecond) {
    this.sound.playSitCatch(isLastSecond);
    this.arena.spawnBurst(this.player.pos, isLastSecond ? 0xf5b731 : 0x2de2e6, 20, 6.0);
    this.cameraShake = isLastSecond ? 0.35 : 0.15;

    if (isLastSecond) {
      this.interceptsLanded++;
      this.combo = Math.min(8.0, +(this.combo + 0.5).toFixed(1));
      this.comboTimer = 12.0;
      this.addScore(350, 'LAST-SECOND INTERCEPT!', this.player.pos, 'gold');
      this.triggerInterceptVignette();
    } else {
      this.combo = Math.min(8.0, +(this.combo + 0.2).toFixed(1));
      this.comboTimer = 10.0;
      this.addScore(150, 'SEAT ENGAGED!', this.player.pos, 'cyan');
    }
  }

  onCompleteSitHarvest(npc) {
    this.sitsHarvested++;
    this.sound.playSitComplete();
    this.arena.spawnBurst(this.player.pos, 0x10b981, 26, 7.0);

    const foamGoldBonus = 1 + (this.upgrades.memoryFoamCore || 0) * 0.25;
    const baseGold = npc.role === 'boss' ? 95 : 35;
    const earnedGold = Math.round(baseGold * foamGoldBonus * Math.min(3, this.combo));
    this.saveData.coins += earnedGold;
    this.saveProgress();

    if (npc.role === 'boss') {
      npc.bossSitsCompleted++;
      this.addScore(800, `VIP BOSS SEATED! +${earnedGold}🪙`, this.player.pos, 'gold');
      this.announce('VIP POSTERIOR HARVESTED!', `${npc.name} (${npc.bossSitsCompleted}/${npc.bossSitsMax})`);
    } else {
      this.addScore(300, `FULL COMFORT HARVEST! +${earnedGold}🪙`, this.player.pos, 'gold');
    }

    this.checkStageVictory();
  }

  executeCatapultOnActiveSitter() {
    const sitter = this.player.occupiedBy;
    if (!sitter) return;

    this.player.occupiedBy = null;
    this.sitsHarvested++;
    this.catapultsLaunched++;

    // Aim toward nearest Janitor if one is within 12m, otherwise forward!
    let dirX = Math.sin(this.player.yaw);
    let dirZ = Math.cos(this.player.yaw);
    const nearestJanitor = this.npcs.find(n => n.role === 'janitor' && n.state !== 'stunned');
    if (nearestJanitor) {
      dirX = nearestJanitor.pos.x - this.player.pos.x;
      dirZ = nearestJanitor.pos.z - this.player.pos.z;
    }

    const springMult = 1 + (this.upgrades.pneumaticSprings || 0) * 0.2;
    const force = this.player.currentForm.catapultForce * springMult;
    sitter.launchCatapult(dirX, dirZ, force);

    const earnedGold = sitter.role === 'boss' ? 85 : 40;
    this.saveData.coins += earnedGold;
    this.saveProgress();

    if (sitter.role === 'boss') {
      sitter.bossSitsCompleted++;
    }

    this.sound.playCatapult();
    this.cameraShake = 0.45;
    this.arena.spawnBurst(this.player.pos, 0xf43f5e, 28, 8.5);
    this.arena.spawnShockwave(this.player.pos, 0xf43f5e, 4.5);
    this.addScore(420, `CHAOS CATAPULT! +${earnedGold}🪙`, this.player.pos, 'crimson');

    this.checkStageVictory();
  }

  checkStageVictory() {
    this.updateHUD();
    if (this.currentLevel.id === 'endless') return;

    const quotaMet = this.sitsHarvested >= this.currentLevel.sitQuota;
    const bossMet = !this.bossNpc || this.bossNpc.bossSitsCompleted >= this.bossNpc.bossSitsMax;

    if (quotaMet && bossMet) {
      this.completeStage(true);
    }
  }

  completeStage(victory) {
    this.mode = 'result';
    this.input && (this.input.keys = {});
    this.touch?.setEnabled(false);
    if (victory) {
      this.sound.playVictory();
      const stageReward = 150 + this.currentLevelIndex * 90;
      this.saveData.coins += stageReward;
      if (!this.saveData.completedLevels.includes(this.currentLevel.id)) {
        this.saveData.completedLevels.push(this.currentLevel.id);
      }
      this.saveProgress();

      document.getElementById('result-eyebrow').textContent = `${this.currentLevel.act} ACCOMPLISHED`;
      document.getElementById('result-title').textContent = 'STAGE COMPLETE!';
      document.getElementById('result-subtitle').textContent =
        `You claimed every posterior in ${this.currentLevel.name} and earned +${stageReward}🪙 Stage Bonus!`;
    } else {
      this.sound.playAlert();
      document.getElementById('result-eyebrow').textContent = 'STRUCTURAL FAILURE';
      document.getElementById('result-title').textContent = 'CHAIR DECOMMISSIONED!';
      document.getElementById('result-subtitle').textContent =
        'The Facilities Janitors dismantled your lumbar support. Upgrade your chassis and try again!';
    }

    const statsGrid = document.getElementById('result-stats-grid');
    statsGrid.innerHTML = `
      <div class="result-stat-box">
        <div class="label">FINAL SCORE</div>
        <div class="val">${this.score.toLocaleString()}</div>
      </div>
      <div class="result-stat-box">
        <div class="label">SITS HARVESTED</div>
        <div class="val">${this.sitsHarvested} / ${this.currentLevel.sitQuota}</div>
      </div>
      <div class="result-stat-box">
        <div class="label">PERFECT INTERCEPTS</div>
        <div class="val">${this.interceptsLanded}</div>
      </div>
      <div class="result-stat-box">
        <div class="label">GLUTE GOLD BANKED</div>
        <div class="val">${this.saveData.coins} 🪙</div>
      </div>
    `;

    document.getElementById('result-modal').classList.remove('hidden');
  }

  addScore(basePts, label, worldPos, colorClass = 'gold') {
    const pts = Math.round(basePts * this.combo);
    this.score += pts;
    if (worldPos && label) {
      this.spawnFloater(worldPos, `${label} (+${pts})`, colorClass);
    }
    this.updateHUD();
  }

  spawnFloater(worldPos, text, colorClass = 'gold') {
    const el = document.createElement('div');
    el.className = `world-floater ${colorClass}`;
    el.textContent = text;
    this.labelsContainer.appendChild(el);
    const pos = worldPos.clone();
    pos.y += 1.9;
    this.floaters.push({ el, worldPos: pos, life: 1.2 });
  }

  clearWorldLabels() {
    this.labelsContainer.innerHTML = '';
    this.floaters = [];
    this.activeBadges.clear();
  }

  announce(title, sub) {
    const banner = document.getElementById('announcement-banner');
    document.getElementById('announcement-title').textContent = title;
    document.getElementById('announcement-sub').textContent = sub;
    banner.classList.remove('hidden');
    clearTimeout(this.announceTimeout);
    this.announceTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, 2400);
  }

  triggerDangerVignette() {
    const v = document.getElementById('vignette-overlay');
    v.classList.add('danger-pulse');
    clearTimeout(this.vignetteTimer);
    this.vignetteTimer = setTimeout(() => v.classList.remove('danger-pulse'), 350);
  }

  triggerInterceptVignette() {
    const v = document.getElementById('vignette-overlay');
    v.classList.add('intercept-pulse');
    clearTimeout(this.vignetteTimer);
    this.vignetteTimer = setTimeout(() => v.classList.remove('intercept-pulse'), 450);
  }

  updateTrapModeUI() {
    const label = document.getElementById('slot-mode-label');
    const tag = document.getElementById('active-sitter-mode-tag');
    if (this.player.trapMode === 'catapult') {
      label.textContent = 'Mode: CATAPULT';
      tag.textContent = 'AUTO-CATAPULT ARMED';
      tag.className = 'mode-tag catapult';
    } else {
      label.textContent = 'Mode: Siphon';
      tag.textContent = 'SIPHONING COMFORT';
      tag.className = 'mode-tag siphon';
    }
  }

  updateEvolutionBarUI() {
    const bar = document.getElementById('hud-evolution-bar');
    bar.innerHTML = '';
    CHAIR_EVOLUTIONS.forEach(evo => {
      const unlocked = this.saveData.unlockedForms.includes(evo.id);
      const active = this.player.currentFormId === evo.id;
      const pill = document.createElement('div');
      pill.className = `evo-pill ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}`;
      pill.innerHTML = `<kbd>${evo.key}</kbd> <span>${evo.name.split(' ')[0]}</span>`;
      pill.addEventListener('click', () => {
        if (unlocked) this.equipChairForm(evo.id);
        else this.openWorkshop();
      });
      bar.appendChild(pill);
    });
    document.getElementById('slot-special-label').textContent = this.player.currentForm.specialName;
  }

  buildMenuUI() {
    this.refreshCurrencyDisplays();
    const grid = document.getElementById('campaign-grid');
    grid.innerHTML = '';

    CAMPAIGN_LEVELS.forEach((lvl, idx) => {
      const completed = this.saveData.completedLevels.includes(lvl.id);
      const card = document.createElement('div');
      card.className = 'level-card';
      card.innerHTML = `
        <div>
          <div class="act-tag">${lvl.act} ${completed ? '✓ COMPLETED' : ''}</div>
          <h4>${lvl.name}</h4>
          <p>${lvl.desc}</p>
        </div>
        <div class="level-meta">
          <span>🎯 Sit Quota: ${lvl.sitQuota === 999 ? 'ENDLESS' : lvl.sitQuota + ' Sits'}</span>
          <span>👑 VIP Boss: ${lvl.boss.name}</span>
          <button class="primary-cta" style="margin-top:8px;width:100%">Deploy Chair →</button>
        </div>
      `;
      card.addEventListener('click', () => this.startMission(idx));
      grid.appendChild(card);
    });
  }

  updateWorkshopUI() {
    this.refreshCurrencyDisplays();
    const evoList = document.getElementById('evolutions-list');
    evoList.innerHTML = '';

    CHAIR_EVOLUTIONS.forEach(evo => {
      const unlocked = this.saveData.unlockedForms.includes(evo.id);
      const equipped = this.saveData.equippedForm === evo.id;
      const card = document.createElement('div');
      card.className = `evo-card ${equipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="evo-card-info">
          <h4>[${evo.key}] ${evo.name} <small style="color:#94a3b8">(${evo.subtitle})</small></h4>
          <p>${evo.specialDesc}</p>
          <div class="evo-stat-tags">
            ${evo.statsText.map(s => `<span>${s}</span>`).join('')}
          </div>
        </div>
        <div>
          ${
            equipped
              ? `<button class="secondary-cta" disabled>Equipped ✓</button>`
              : unlocked
              ? `<button class="primary-cta">Equip Chassis</button>`
              : `<button class="primary-cta">Unlock (${evo.cost} 🪙)</button>`
          }
        </div>
      `;

      const btn = card.querySelector('button');
      if (btn && !equipped) {
        btn.addEventListener('click', () => {
          if (unlocked) {
            this.equipChairForm(evo.id);
          } else if (this.saveData.coins >= evo.cost) {
            this.saveData.coins -= evo.cost;
            this.saveData.unlockedForms.push(evo.id);
            this.equipChairForm(evo.id);
          } else {
            btn.textContent = 'Need More 🪙!';
            setTimeout(() => this.updateWorkshopUI(), 900);
          }
        });
      }
      evoList.appendChild(card);
    });

    const upgList = document.getElementById('upgrades-list');
    upgList.innerHTML = '';
    WORKSHOP_UPGRADES.forEach(u => {
      const rank = this.saveData.upgrades[u.id] || 0;
      const cost = Math.round(u.baseCost * Math.pow(1.45, rank));
      const maxed = rank >= u.maxLevel;

      const row = document.createElement('div');
      row.className = 'upgrade-row';
      row.innerHTML = `
        <div>
          <h4>${u.name} <span style="color:#2de2e6;font-family:var(--font-mono)">[Rank ${rank}/${u.maxLevel}]</span></h4>
          <p>${u.desc}</p>
        </div>
        <div>
          ${
            maxed
              ? `<button class="secondary-cta" disabled>MAXED</button>`
              : `<button class="secondary-cta">Upgrade (${cost} 🪙)</button>`
          }
        </div>
      `;
      const btn = row.querySelector('button');
      if (btn && !maxed) {
        btn.addEventListener('click', () => {
          if (this.saveData.coins >= cost) {
            this.saveData.coins -= cost;
            this.saveData.upgrades[u.id] = rank + 1;
            this.sound.playMorph();
            this.saveProgress();
            this.updateWorkshopUI();
          } else {
            btn.textContent = 'Need More 🪙!';
            setTimeout(() => this.updateWorkshopUI(), 900);
          }
        });
      }
      upgList.appendChild(row);
    });
  }

  refreshCurrencyDisplays() {
    const c = this.saveData.coins;
    document.getElementById('hud-coins').textContent = `${c} 🪙`;
    document.getElementById('menu-coins-display').textContent = `${c} 🪙 Glute Gold`;
    document.getElementById('workshop-coins-display').textContent = `${c} 🪙 Glute Gold`;
  }

  updateHUD() {
    document.getElementById('hud-score').textContent = this.score.toLocaleString();
    document.getElementById('hud-combo').textContent = `x${this.combo.toFixed(1)}`;
    this.refreshCurrencyDisplays();

    const quota = this.currentLevel.sitQuota;
    const pct = quota === 999 ? 100 : Math.min(100, (this.sitsHarvested / quota) * 100);
    document.getElementById('hud-quota-text').textContent =
      quota === 999 ? `${this.sitsHarvested} SITS` : `${this.sitsHarvested} / ${quota} SITS`;
    document.getElementById('hud-quota-fill').style.width = `${pct}%`;

    // Boss progress
    if (this.bossNpc) {
      const rem = `${this.bossNpc.bossSitsCompleted} / ${this.bossNpc.bossSitsMax} SEATED`;
      document.getElementById('boss-sits-remaining').textContent = rem;
      const bossPct = Math.max(0, 100 - (this.bossNpc.bossSitsCompleted / this.bossNpc.bossSitsMax) * 100);
      document.getElementById('boss-bar-fill').style.width = `${bossPct}%`;
    }

    // Objectives checklist
    const objList = document.getElementById('hud-objectives-list');
    objList.innerHTML = '';
    this.currentLevel.objectives.forEach(obj => {
      let done = false;
      if (obj.id === 'quota') done = this.sitsHarvested >= this.currentLevel.sitQuota;
      if (obj.id === 'intercept') done = this.interceptsLanded >= 2;
      if (obj.id === 'sabotage') done = this.sabotagesDone >= 3;
      if (obj.id === 'catapult') done = this.catapultsLaunched >= 2;
      if (obj.id === 'boss') done = this.bossNpc && this.bossNpc.bossSitsCompleted >= this.bossNpc.bossSitsMax;

      const li = document.createElement('li');
      li.className = done ? 'done' : '';
      li.textContent = `${done ? '☑' : '☐'} ${obj.text}`;
      objList.appendChild(li);
    });
  }

  updateRealtimeHUD(dt) {
    // Health bar
    const hpPct = Math.round(this.player.health);
    document.getElementById('hud-health-text').textContent = `${hpPct}%`;
    document.getElementById('hud-health-fill').style.width = `${hpPct}%`;
    if (this.player.health <= 0 && this.mode === 'playing') {
      this.completeStage(false);
      return;
    }

    // Combo decay
    if (this.combo > 1.0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1.0;
        this.updateHUD();
      }
    }

    // Cooldown overlays
    document.getElementById('cd-dash').style.height = `${(this.player.dashCooldown / 1.15) * 100}%`;
    document.getElementById('cd-sabotage').style.height = `${(this.player.sabotageCooldown / 0.9) * 100}%`;
    document.getElementById('cd-special').style.height = `${(this.player.specialCooldown / 6.5) * 100}%`;

    // Stealth suspicion meter & music intensity
    let maxSuspicion = 0;
    let anyoneLowering = false;
    let janitorChasing = false;
    for (const npc of this.npcs) {
      if (npc.suspicion > maxSuspicion) maxSuspicion = npc.suspicion;
      if (npc.state === 'lowering') anyoneLowering = true;
      if (npc.state === 'chasing') janitorChasing = true;
    }

    this.sound.intensity = janitorChasing ? 2 : (anyoneLowering ? 1 : 0);

    const stealthBox = document.getElementById('stealth-indicator');
    const stealthText = document.getElementById('stealth-status-text');
    document.getElementById('suspicion-bar-fill').style.width = `${Math.round(maxSuspicion * 100)}%`;

    if (janitorChasing || maxSuspicion > 0.7) {
      stealthBox.className = 'stealth-box state-danger';
      stealthText.textContent = document.body.classList.contains('touch-layout') ? 'SPOTTED! HOLD FREEZE TO HIDE' : 'SPOTTED MOVING! HOLD [SPACE] TO FREEZE!';
    } else if (maxSuspicion > 0.15) {
      stealthBox.className = 'stealth-box state-caution';
      stealthText.textContent = 'HUMAN PERIPHERAL // FREEZE SOON';
    } else if (this.player.isFrozenDisguise) {
      stealthBox.className = 'stealth-box state-safe';
      stealthText.textContent = 'DISGUISE LOCKED // 100% ORDINARY CHAIR';
    } else {
      stealthBox.className = 'stealth-box state-safe';
      stealthText.textContent = 'INCOGNITO // FURNITURE BLEND';
    }

    // Active Sitter Panel
    const sitterPanel = document.getElementById('active-sitter-panel');
    if (this.player.occupiedBy) {
      sitterPanel.classList.remove('hidden');
      document.getElementById('active-sitter-name').textContent =
        `${this.player.occupiedBy.name} SITTING ON YOU!`;
      document.getElementById('active-siphon-fill').style.width =
        `${Math.min(100, Math.round(this.player.occupiedBy.sitProgress * 100))}%`;
    } else {
      sitterPanel.classList.add('hidden');
    }
  }

  updateWorldProjections(dt) {
    // 1. Update animated score floaters
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      if (f.life <= 0) {
        f.el.remove();
        this.floaters.splice(i, 1);
        continue;
      }
      const screen = this.projectToScreen(f.worldPos);
      if (screen.visible) {
        f.el.style.left = `${screen.x}px`;
        f.el.style.top = `${screen.y}px`;
      }
    }

    // 2. Show live "SLIDE UNDER ME! [SHIFT]" badge on any human currently lowering to sit!
    const activeEntities = new Set();
    for (const npc of this.npcs) {
      if (npc.state === 'lowering') {
        activeEntities.add(npc);
        let badge = this.activeBadges.get(npc);
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'sit-prompt-badge';
          this.labelsContainer.appendChild(badge);
          this.activeBadges.set(npc, badge);
        }
        const rem = Math.max(0, npc.loweringDuration - npc.loweringElapsed).toFixed(1);
        badge.textContent = document.body.classList.contains('touch-layout') ? `🎯 ${rem}s · DASH TO CATCH!` : `🎯 SITTING IN ${rem}s! [SHIFT] INTERCEPT`;
        const worldPos = npc.pos.clone();
        worldPos.y += 2.45;
        const screen = this.projectToScreen(worldPos);
        badge.style.display = screen.visible ? 'block' : 'none';
        badge.style.left = `${screen.x}px`;
        badge.style.top = `${screen.y}px`;
      }
    }

    for (const [npc, badge] of this.activeBadges.entries()) {
      if (!activeEntities.has(npc)) {
        badge.remove();
        this.activeBadges.delete(npc);
      }
    }
  }

  projectToScreen(vec3) {
    const v = vec3.clone().project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
    return { x, y, visible: v.z < 1 };
  }

  renderRadar() {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    // Radar grid rings
    ctx.strokeStyle = 'rgba(45, 226, 230, 0.16)';
    ctx.lineWidth = 1;
    [28, 54, 78].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    const scale = (w * 0.42) / (Math.max(this.arenaBounds.w, this.arenaBounds.d) / 2);

    // Rival Chairs
    for (const rc of this.rivalChairs) {
      const rx = cx + rc.pos.x * scale;
      const ry = cy + rc.pos.z * scale;
      ctx.fillStyle = rc.sabotaged ? 'rgba(244, 63, 94, 0.4)' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // NPCs
    for (const npc of this.npcs) {
      const nx = cx + npc.pos.x * scale;
      const ny = cy + npc.pos.z * scale;
      if (npc.role === 'janitor') {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (npc.state === 'lowering') {
        ctx.strokeStyle = '#f5b731';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(nx, ny, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = npc.role === 'boss' ? '#f5b731' : '#a5f3fc';
        ctx.beginPath();
        ctx.arc(nx, ny, npc.role === 'boss' ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player Chair
    const px = cx + this.player.pos.x * scale;
    const py = cy + this.player.pos.z * scale;
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (document.hidden) return;

    if (this.mode === 'playing') {
      this.player.update(dt, this.input, this.arenaBounds, this.arena.obstacles, this.upgrades, this.sound);
      this.rivalChairs.forEach(rc => rc.update(dt));
      this.npcs.forEach(npc => npc.update(dt, this));
      this.arena.updateParticles(dt);

      // Follow camera with smooth damping & impact shake
      if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 1.5);
      const shakeX = (Math.random() - 0.5) * this.cameraShake;
      const shakeY = (Math.random() - 0.5) * this.cameraShake;

      const targetCamX = this.player.pos.x * 0.72 + shakeX;
      const portrait = window.innerHeight > window.innerWidth;
      const targetCamY = (portrait ? 18 : 14.5) + shakeY;
      const targetCamZ = this.player.pos.z * 0.72 + (portrait ? 17 : 13.5);

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, dt * 6);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, dt * 6);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, dt * 6);
      this.camera.lookAt(this.player.pos.x * 0.5, 0.8, this.player.pos.z * 0.5);

      this.playerSpot.position.set(this.player.pos.x, 3.8, this.player.pos.z);

      this.touch.update(this.player);
      this.updateRealtimeHUD(dt);
      this.updateWorldProjections(dt);
      this.renderRadar();
    } else if (this.mode !== 'paused') {
      // Cinematic orbit camera in Menu / Workshop
      const angle = now * 0.00035;
      this.camera.position.set(Math.sin(angle) * 16, 11.5, Math.cos(angle) * 16);
      this.camera.lookAt(0, 1.0, 0);
      this.arena.updateParticles(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.chairGame = new ChairGameApp();
});
