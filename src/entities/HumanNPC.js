import * as THREE from 'three';

const SKIN_TONES = [0xfcd34d, 0xfdba74, 0xe0ac69, 0xc68642, 0x8d5524];
const OUTFIT_COLORS = [0x2563eb, 0x059669, 0xd97706, 0x7c3aed, 0xdb2777, 0x475569, 0x0891b2];

export class HumanNPC {
  /**
   * @param {THREE.Scene} scene
   * @param {object} config - { role: 'patron' | 'janitor' | 'boss', x, z, bossData }
   */
  constructor(scene, config) {
    this.scene = scene;
    this.role = config.role || 'patron'; // 'patron' | 'janitor' | 'boss'
    this.bossData = config.bossData || null;
    this.name = this.bossData ? this.bossData.name : (this.role === 'janitor' ? 'FACILITIES JANITOR' : 'TIRED PATRON');

    this.pos = new THREE.Vector3(config.x || 0, 0, config.z || 0);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.yaw = Math.random() * Math.PI * 2;

    // State machine:
    // 'stroll' | 'seek_chair' | 'lowering' | 'sitting_rival' | 'sitting_player' | 'catapulted' | 'stunned' | 'chasing'
    this.state = 'stroll';
    this.stateTimer = 1.5 + Math.random() * 2.5;
    this.sitDurationRequired = this.role === 'boss' ? 2.6 : 2.1;
    this.sitProgress = 0;
    this.loweringDuration = this.role === 'boss' ? 2.1 : 2.4;
    this.loweringElapsed = 0;

    // Boss tracking
    this.bossSitsCompleted = 0;
    this.bossSitsMax = this.bossData ? this.bossData.sitsRequired : 1;

    // Target waypoint or rival chair
    this.targetPos = new THREE.Vector3(this.pos.x, 0, this.pos.z);
    this.targetRivalChair = null;
    this.suspicion = 0; // 0 to 1
    this.walkCycle = Math.random() * 10;

    // Ragdoll / Catapult physics
    this.airVel = new THREE.Vector3();
    this.airY = 0;

    this.root = new THREE.Group();
    this.root.position.copy(this.pos);
    this.scene.add(this.root);

    this.buildCharacterMesh();
    this.buildVisionCone();
    this.buildSitTargetRing();
  }

  buildCharacterMesh() {
    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    const skinColor = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const suitColor = this.bossData
      ? this.bossData.suitColor
      : (this.role === 'janitor' ? 0xb45309 : OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)]);

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const suitMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.55 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5b731, roughness: 0.25, metalness: 0.85 });

    const scale = this.role === 'boss' ? 1.22 : 1.0;
    this.bodyGroup.scale.setScalar(scale);

    // Legs (pivoted at hip y = 0.86)
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.16, 0.86, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.86, 10), pantsMat);
    leftLegMesh.position.y = -0.43;
    leftLegMesh.castShadow = true;
    this.leftLegPivot.add(leftLegMesh);
    this.bodyGroup.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.16, 0.86, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.86, 10), pantsMat);
    rightLegMesh.position.y = -0.43;
    rightLegMesh.castShadow = true;
    this.rightLegPivot.add(rightLegMesh);
    this.bodyGroup.add(this.rightLegPivot);

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.76, 0.34), suitMat);
    this.torso.position.set(0, 1.24, 0);
    this.torso.castShadow = true;
    this.bodyGroup.add(this.torso);

    // Arms
    this.leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.68, 8), suitMat);
    this.leftArm.position.set(-0.36, 1.22, 0);
    this.bodyGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.68, 8), suitMat);
    this.rightArm.position.set(0.36, 1.22, 0);
    this.bodyGroup.add(this.rightArm);

    // Janitor Push-Broom prop
    if (this.role === 'janitor') {
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.55, 8),
        new THREE.MeshStandardMaterial({ color: 0xfde047 })
      );
      handle.position.set(0.42, 0.9, 0.25);
      handle.rotation.x = 0.25;
      const bristles = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.14, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      bristles.position.set(0.42, 0.14, 0.44);
      this.bodyGroup.add(handle);
      this.bodyGroup.add(bristles);
    }

    // Head
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
    this.head.position.set(0, 1.86, 0);
    this.head.castShadow = true;
    this.bodyGroup.add(this.head);

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    [-0.08, 0.08].forEach(ox => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat);
      eye.position.set(ox, 1.9, 0.21);
      this.bodyGroup.add(eye);
    });

    // Hats / Boss Crown
    if (this.role === 'boss') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.22, 7), goldMat);
      crown.position.set(0, 2.12, 0);
      this.bodyGroup.add(crown);
    } else if (this.role === 'janitor') {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0xd97706 })
      );
      cap.position.set(0, 2.06, 0);
      this.bodyGroup.add(cap);
    }
  }

  buildVisionCone() {
    const fov = this.role === 'janitor' ? Math.PI * 0.48 : Math.PI * 0.40;
    const range = this.role === 'janitor' ? 8.2 : 6.4;
    this.visionRange = range;
    this.visionHalfAngle = fov / 2;

    const geo = new THREE.CircleGeometry(range, 24, Math.PI / 2 - fov / 2, fov);
    geo.rotateX(-Math.PI / 2);
    // Orient cone along +Z local forward
    geo.rotateY(Math.PI);

    this.visionMat = new THREE.MeshBasicMaterial({
      color: this.role === 'janitor' ? 0xf97316 : 0x38bdf8,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.visionCone = new THREE.Mesh(geo, this.visionMat);
    this.visionCone.position.y = 0.025;
    this.root.add(this.visionCone);
  }

  buildSitTargetRing() {
    // Golden pulsing floor ring when human is lowering their glutes to sit!
    this.sitRingGroup = new THREE.Group();
    this.sitRingGroup.position.y = 0.04;
    this.sitRingGroup.visible = false;

    const outerGeo = new THREE.RingGeometry(0.75, 0.92, 32);
    outerGeo.rotateX(-Math.PI / 2);
    this.sitOuterMat = new THREE.MeshBasicMaterial({
      color: 0xf5b731,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.sitOuterRing = new THREE.Mesh(outerGeo, this.sitOuterMat);
    this.sitRingGroup.add(this.sitOuterRing);

    const innerGeo = new THREE.RingGeometry(0.15, 0.82, 32);
    innerGeo.rotateX(-Math.PI / 2);
    this.sitInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.sitInnerRing = new THREE.Mesh(innerGeo, this.sitInnerMat);
    this.sitRingGroup.add(this.sitInnerRing);

    this.root.add(this.sitRingGroup);
  }

  pickRandomWaypoint(arenaBounds) {
    const halfW = arenaBounds.w / 2 - 2.4;
    const halfD = arenaBounds.d / 2 - 2.4;
    this.targetPos.set(
      (Math.random() * 2 - 1) * halfW,
      0,
      (Math.random() * 2 - 1) * halfD
    );
  }

  triggerLoweringHere(extraTime = 0) {
    if (this.role === 'janitor') return;
    if (this.state === 'sitting_player' || this.state === 'catapulted') return;
    this.state = 'lowering';
    this.loweringElapsed = 0;
    this.loweringDuration = (this.role === 'boss' ? 2.2 : 2.5) + extraTime;
    this.sitRingGroup.visible = true;
  }

  launchCatapult(dirX, dirZ, force) {
    this.state = 'catapulted';
    this.sitRingGroup.visible = false;
    this.airY = 0.8;
    const len = Math.hypot(dirX, dirZ) || 1;
    this.airVel.set((dirX / len) * force * 0.72, force * 0.68, (dirZ / len) * force * 0.72);
  }

  stun(seconds = 6.0) {
    this.state = 'stunned';
    this.stateTimer = seconds;
    this.sitRingGroup.visible = false;
    this.visionCone.visible = false;
  }

  canSeePlayer(player, upgrades) {
    if (this.state === 'sitting_player' || this.state === 'catapulted' || this.state === 'stunned' || this.state === 'lowering') {
      return 0;
    }
    const moveRatio = player.getMovingRatio();
    if (moveRatio <= 0) return 0; // Perfectly disguised as an innocent chair!

    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > this.visionRange) return 0;

    // Forward vector of NPC is (sin(yaw), cos(yaw))
    const fwdX = Math.sin(this.yaw);
    const fwdZ = Math.cos(this.yaw);
    const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
    const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));

    if (angle <= this.visionHalfAngle) {
      const chameleonReduction = 1 - (upgrades.chameleonVarnish || 0) * 0.14;
      const stealthDiv = player.currentForm.stealthBonus || 1.0;
      return (moveRatio * Math.max(0.25, chameleonReduction)) / stealthDiv;
    }
    return 0;
  }

  update(dt, game) {
    const { player, rivalChairs, arenaBounds, upgrades, sound } = game;

    // 1. Check vision & suspicion
    const sightFactor = this.canSeePlayer(player, upgrades);
    if (sightFactor > 0) {
      this.suspicion = Math.min(1, this.suspicion + dt * 0.95 * sightFactor);
      this.visionMat.color.setHex(0xf43f5e);
      this.visionMat.opacity = 0.28;

      if (this.suspicion >= 1.0) {
        if (this.role === 'janitor' && this.state !== 'chasing') {
          this.state = 'chasing';
          this.stateTimer = 5.0;
          sound.playAlert();
          game.spawnFloater(this.pos, 'UNAUTHORIZED CHAIR!', 'crimson');
        } else if (this.role !== 'janitor') {
          // Patron or Boss gets spooked and cancels sit to walk away!
          this.suspicion = 0.5;
          this.state = 'stroll';
          this.sitRingGroup.visible = false;
          this.pickRandomWaypoint(arenaBounds);
          this.stateTimer = 3.0;
          sound.playAlert();
          game.spawnFloater(this.pos, '?! MOVING CHAIR!', 'crimson');
        }
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.65);
      this.visionMat.color.setHex(this.role === 'janitor' ? 0xf97316 : 0x38bdf8);
      this.visionMat.opacity = this.state === 'lowering' ? 0.04 : 0.13;
    }

    // 2. State Machine
    if (this.state === 'catapulted') {
      this.pos.x += this.airVel.x * dt;
      this.pos.z += this.airVel.z * dt;
      this.airY += this.airVel.y * dt;
      this.airVel.y -= 28.0 * dt;

      // Spin in air
      this.bodyGroup.rotation.x += dt * 10;
      this.bodyGroup.rotation.z += dt * 6;

      // Check collision with any Janitor mid-flight!
      for (const other of game.npcs) {
        if (other !== this && other.role === 'janitor' && other.state !== 'stunned') {
          const d = Math.hypot(this.pos.x - other.pos.x, this.pos.z - other.pos.z);
          if (d < 1.8) {
            other.stun(8.0);
            game.addScore(450, 'JANITOR BOWLED OVER!', this.pos, 'purple');
            sound.playSabotage();
          }
        }
      }

      // Clamp inside walls
      const halfW = arenaBounds.w / 2 - 1.2;
      const halfD = arenaBounds.d / 2 - 1.2;
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, -halfW, halfW);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, -halfD, halfD);

      if (this.airY <= 0) {
        this.airY = 0;
        this.bodyGroup.rotation.set(0, 0, 0);
        this.stun(3.2);
      }
      this.root.position.set(this.pos.x, this.airY, this.pos.z);
      return;
    }

    if (this.state === 'stunned') {
      this.stateTimer -= dt;
      this.bodyGroup.rotation.z = Math.sin(performance.now() * 0.015) * 0.25;
      this.bodyGroup.position.y = -0.35;
      if (this.stateTimer <= 0) {
        this.bodyGroup.rotation.set(0, 0, 0);
        this.bodyGroup.position.y = 0;
        this.visionCone.visible = true;
        this.state = 'stroll';
        this.pickRandomWaypoint(arenaBounds);
        this.stateTimer = 2.5;
      }
      return;
    }

    if (this.state === 'chasing' && this.role === 'janitor') {
      // Janitor chases player unless player freezes in disguise out of immediate reach!
      this.stateTimer -= dt;
      if (player.isFrozenDisguise && this.stateTimer < 3.6) {
        this.state = 'stroll';
        this.suspicion = 0;
        game.spawnFloater(this.pos, 'Hmm... just a normal chair.', 'cyan');
        this.pickRandomWaypoint(arenaBounds);
        return;
      }
      this.moveToward(player.pos.x, player.pos.z, 5.4, dt);
      const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      if (dist < 1.25) {
        player.health = Math.max(0, player.health - 24 * dt);
        game.triggerDangerVignette();
      }
      if (this.stateTimer <= 0) {
        this.state = 'stroll';
        this.pickRandomWaypoint(arenaBounds);
      }
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.yaw;
      return;
    }

    if (this.state === 'sitting_player') {
      // Lock position onto the player's seat cushion!
      this.pos.copy(player.pos);
      this.yaw = player.yaw;
      this.root.position.set(this.pos.x, player.hopY - 0.16, this.pos.z);
      this.root.rotation.y = this.yaw;

      // Sitting pose
      this.leftLegPivot.rotation.x = -Math.PI / 2.2;
      this.rightLegPivot.rotation.x = -Math.PI / 2.2;
      this.bodyGroup.position.y = -0.22;
      this.visionCone.visible = false;
      this.sitRingGroup.visible = false;

      // If player is in Catapult mode, launch immediately!
      if (player.trapMode === 'catapult') {
        game.executeCatapultOnActiveSitter();
        return;
      }

      // Otherwise Siphon Comfort Energy!
      const foamMult = 1 + (upgrades.memoryFoamCore || 0) * 0.2;
      const siphonSpeed = player.currentForm.siphonRate * foamMult;
      this.sitProgress += (dt * siphonSpeed) / this.sitDurationRequired;

      if (Math.random() < dt * 4.5) {
        sound.playSiphonTick(this.sitProgress);
      }

      if (this.sitProgress >= 1.0) {
        // Completed Full Sit Harvest!
        player.occupiedBy = null;
        this.visionCone.visible = true;
        this.bodyGroup.position.y = 0;
        this.leftLegPivot.rotation.x = 0;
        this.rightLegPivot.rotation.x = 0;
        this.sitProgress = 0;

        game.onCompleteSitHarvest(this);

        // Step forward off the chair
        this.pos.x += Math.sin(this.yaw) * 1.35;
        this.pos.z += Math.cos(this.yaw) * 1.35;
        this.state = 'stroll';
        this.pickRandomWaypoint(arenaBounds);
        this.stateTimer = 3.5;
      }
      return;
    }

    if (this.state === 'sitting_rival') {
      // Sitting on an ordinary rival chair
      this.stateTimer -= dt;
      this.leftLegPivot.rotation.x = -Math.PI / 2.2;
      this.rightLegPivot.rotation.x = -Math.PI / 2.2;
      this.bodyGroup.position.y = -0.24;

      // If player sabotages this rival chair while NPC is sitting on it, they tumble into lowering state!
      if (!this.targetRivalChair || this.targetRivalChair.sabotaged) {
        this.bodyGroup.position.y = 0;
        this.triggerLoweringHere(0.6);
        game.spawnFloater(this.pos, 'CHAIR COLLAPSED! CATCH ME!', 'gold');
        return;
      }

      if (this.stateTimer <= 0) {
        if (this.targetRivalChair) this.targetRivalChair.occupied = false;
        this.targetRivalChair = null;
        this.bodyGroup.position.y = 0;
        this.leftLegPivot.rotation.x = 0;
        this.rightLegPivot.rotation.x = 0;
        this.state = 'stroll';
        this.pickRandomWaypoint(arenaBounds);
        this.stateTimer = 2.2 + Math.random() * 2.0;
      }
      return;
    }

    if (this.state === 'lowering') {
      // THE SIGNATURE "ABOUT TO SIT" INTERCEPT WINDOW!
      this.loweringElapsed += dt;
      const progress = Math.min(1, this.loweringElapsed / this.loweringDuration);

      // Squat animation
      this.leftLegPivot.rotation.x = -progress * 1.15;
      this.rightLegPivot.rotation.x = -progress * 1.15;
      this.bodyGroup.position.y = -progress * 0.36;

      // Shrink inner ring toward center
      const ringScale = Math.max(0.15, 1 - progress);
      this.sitInnerRing.scale.set(ringScale, ringScale, 1);
      this.sitOuterMat.color.setHex(progress > 0.55 ? 0xf43f5e : 0xf5b731);

      // Magnetic Glute Pull when player is close!
      const distToPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      const magnetRadius = player.currentForm.gluteMagnetRadius;

      if (!player.occupiedBy && distToPlayer < magnetRadius) {
        // Gently pull NPC glutes toward the player's seat cushion
        this.pos.x = THREE.MathUtils.lerp(this.pos.x, player.pos.x, dt * 6.5);
        this.pos.z = THREE.MathUtils.lerp(this.pos.z, player.pos.z, dt * 6.5);

        if (distToPlayer < 1.18) {
          // CAUGHT ON THE PLAYER CHAIR!
          const isLastSecond = progress >= 0.42 || player.isDashing;
          this.sitRingGroup.visible = false;
          if (this.targetRivalChair) {
            this.targetRivalChair.occupied = false;
            this.targetRivalChair = null;
          }
          this.state = 'sitting_player';
          this.sitProgress = 0;
          player.occupiedBy = this;
          game.onPlayerCatchSitter(this, isLastSecond);
          return;
        }
      }

      if (this.loweringElapsed >= this.loweringDuration) {
        // Finished lowering! Did they land on an intact rival chair, or hit the floor?
        this.sitRingGroup.visible = false;
        if (this.targetRivalChair && !this.targetRivalChair.sabotaged &&
            Math.hypot(this.targetRivalChair.pos.x - this.pos.x, this.targetRivalChair.pos.z - this.pos.z) < 1.0) {
          this.state = 'sitting_rival';
          this.targetRivalChair.occupied = true;
          this.stateTimer = 4.0;
          game.spawnFloater(this.pos, 'Sat on Rival Chair...', 'cyan');
        } else {
          // Fell flat on their behind because their chair was sabotaged or missing!
          game.spawnFloater(this.pos, 'MISSED SIT!', 'crimson');
          this.stun(1.8);
        }
      }

      this.root.position.copy(this.pos);
      this.root.rotation.y = this.yaw;
      return;
    }

    // Default: 'stroll' or 'seek_chair'
    this.stateTimer -= dt;
    const moveSpd = this.bossData ? this.bossData.speed : (this.role === 'janitor' ? 3.5 : 3.2);
    const distToTarget = this.moveToward(this.targetPos.x, this.targetPos.z, moveSpd, dt);

    if (this.state === 'seek_chair') {
      if (distToTarget < 0.65) {
        // Reached chair spot! Begin lowering glutes!
        this.triggerLoweringHere(this.targetRivalChair && this.targetRivalChair.sabotaged ? 0.55 : 0);
      } else if (this.stateTimer <= 0) {
        this.state = 'stroll';
        this.pickRandomWaypoint(arenaBounds);
        this.stateTimer = 3.0;
      }
    } else {
      // Strolling
      if (distToTarget < 0.8 || this.stateTimer <= 0) {
        if (this.role === 'janitor') {
          // Janitor looks for broken rival chairs to repair or patrols randomly
          const broken = rivalChairs.find(c => c.sabotaged && Math.random() < 0.65);
          if (broken) {
            this.targetPos.copy(broken.pos);
            if (Math.hypot(broken.pos.x - this.pos.x, broken.pos.z - this.pos.z) < 1.4) {
              broken.repair();
              game.spawnFloater(this.pos, 'Rival Chair Repaired', 'cyan');
            }
          } else {
            this.pickRandomWaypoint(arenaBounds);
          }
          this.stateTimer = 3.5 + Math.random() * 2.5;
        } else {
          // Patron or Boss decides to sit down!
          const availableRivals = rivalChairs.filter(c => !c.occupied && !c.sabotaged);
          if (availableRivals.length > 0 && Math.random() < 0.65) {
            const chosen = availableRivals[Math.floor(Math.random() * availableRivals.length)];
            this.targetRivalChair = chosen;
            this.targetPos.copy(chosen.pos);
            this.state = 'seek_chair';
            this.stateTimer = 6.0;
          } else {
            // Spontaneous sit right here!
            this.targetRivalChair = null;
            this.triggerLoweringHere(0.25);
          }
        }
      }
    }

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
  }

  moveToward(tx, tz, speed, dt) {
    const dx = tx - this.pos.x;
    const dz = tz - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.1) {
      const step = Math.min(dist, speed * dt);
      this.pos.x += (dx / dist) * step;
      this.pos.z += (dz / dist) * step;

      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 10);

      // Walk leg swing
      this.walkCycle += speed * dt * 2.8;
      this.leftLegPivot.rotation.x = Math.sin(this.walkCycle) * 0.55;
      this.rightLegPivot.rotation.x = -Math.sin(this.walkCycle) * 0.55;
      this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.4;
      this.rightArm.rotation.x = Math.sin(this.walkCycle) * 0.4;
      this.bodyGroup.position.y = Math.abs(Math.cos(this.walkCycle)) * 0.05;
    }
    return dist;
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
