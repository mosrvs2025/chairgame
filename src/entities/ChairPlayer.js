import * as THREE from 'three';
import { CHAIR_EVOLUTIONS } from '../data/GameData.js';

export class ChairPlayer {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.meshGroup = new THREE.Group();
    this.root.add(this.meshGroup);
    this.scene.add(this.root);

    // Position & Physics state
    this.pos = new THREE.Vector3(0, 0, 8);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.yaw = Math.PI;
    this.hopY = 0;
    this.hopVel = 0;

    // Gameplay states
    this.currentFormId = 'stool';
    this.currentForm = CHAIR_EVOLUTIONS[0];
    this.isFrozenDisguise = false;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.sabotageCooldown = 0;
    this.specialCooldown = 0;
    this.trapMode = 'siphon'; // 'siphon' | 'catapult'

    this.health = 100;
    this.maxHealth = 100;
    this.occupiedBy = null; // HumanNPC currently sitting on player
    this.cushionSquish = 0;
    this.walkPhase = 0;
    this.spinBoostAngle = 0;

    // Visual sub-elements
    this.legs = [];
    this.eyesGroup = null;
    this.seatCushion = null;
    this.auraRing = null;

    this.buildAuraRing();
    this.buildChairModel('stool');
  }

  buildAuraRing() {
    const geo = new THREE.RingGeometry(0.68, 0.85, 36);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf5b731,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    this.auraRing = new THREE.Mesh(geo, mat);
    this.auraRing.position.y = 0.03;
    this.root.add(this.auraRing);
  }

  setForm(formId) {
    const found = CHAIR_EVOLUTIONS.find(f => f.id === formId);
    if (!found) return;
    this.currentFormId = formId;
    this.currentForm = found;
    this.buildChairModel(formId);
  }

  buildChairModel(formId) {
    // Clear previous meshGroup children
    while (this.meshGroup.children.length > 0) {
      const child = this.meshGroup.children[0];
      this.meshGroup.remove(child);
    }
    this.legs = [];

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.55, metalness: 0.1 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5b731, roughness: 0.22, metalness: 0.88, emissive: 0x422006, emissiveIntensity: 0.3 });

    if (formId === 'stool') {
      // Classic Bentwood Café Chair
      const legGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.72, 10);
      const offsets = [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]];
      offsets.forEach(([ox, oz]) => {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(ox, 0.36, oz);
        leg.castShadow = true;
        this.meshGroup.add(leg);
        this.legs.push(leg);
      });

      const seatGeo = new THREE.CylinderGeometry(0.52, 0.50, 0.12, 24);
      const cushionMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.65 });
      this.seatCushion = new THREE.Mesh(seatGeo, cushionMat);
      this.seatCushion.position.set(0, 0.75, 0);
      this.seatCushion.castShadow = true;
      this.meshGroup.add(this.seatCushion);

      // Backrest posts + curved slat
      const postGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.85, 10);
      [-0.32, 0.32].forEach(ox => {
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.set(ox, 1.18, -0.36);
        post.castShadow = true;
        this.meshGroup.add(post);
      });
      const backSlat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.36, 0.09), woodMat);
      backSlat.position.set(0, 1.38, -0.36);
      backSlat.castShadow = true;
      this.meshGroup.add(backSlat);

      this.attachSentientEyes(0, 1.38, -0.30);
    } else if (formId === 'swivel') {
      // Ergonomic Office Swivel Chair
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.52, 12), chromeMat);
      stem.position.set(0, 0.36, 0);
      this.meshGroup.add(stem);

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spokeGroup = new THREE.Group();
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.52), chromeMat);
        spoke.position.set(0, 0.14, 0.24);
        spokeGroup.add(spoke);
        const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), darkMetalMat);
        wheel.position.set(0, 0.075, 0.46);
        spokeGroup.add(wheel);
        spokeGroup.rotation.y = angle;
        this.meshGroup.add(spokeGroup);
        this.legs.push(spokeGroup);
      }

      const meshMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 });
      this.seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.92), meshMat);
      this.seatCushion.position.set(0, 0.72, 0);
      this.seatCushion.castShadow = true;
      this.meshGroup.add(this.seatCushion);

      // Armrests
      [-0.5, 0.5].forEach(ox => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.55), darkMetalMat);
        arm.position.set(ox, 0.94, 0);
        this.meshGroup.add(arm);
      });

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.98, 0.12), meshMat);
      back.position.set(0, 1.28, -0.42);
      back.castShadow = true;
      this.meshGroup.add(back);

      this.attachSentientEyes(0, 1.42, -0.35);
    } else if (formId === 'gaming') {
      // Pro RGB Esports Bucket Chair
      const racingMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35 });
      const neonMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.85,
        roughness: 0.2
      });

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spokeGroup = new THREE.Group();
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.56), racingMat);
        spoke.position.set(0, 0.12, 0.26);
        spokeGroup.add(spoke);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), neonMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(0, 0.08, 0.5);
        spokeGroup.add(rim);
        spokeGroup.rotation.y = angle;
        this.meshGroup.add(spokeGroup);
        this.legs.push(spokeGroup);
      }

      this.seatCushion = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.16, 0.98), racingMat);
      this.seatCushion.position.set(0, 0.72, 0);
      this.seatCushion.castShadow = true;
      this.meshGroup.add(this.seatCushion);

      // Bucket bolsters with RGB trim
      [-0.48, 0.48].forEach(ox => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.18, 0.16), neonMat);
        strip.position.set(ox, 1.35, -0.42);
        this.meshGroup.add(strip);
      });

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.24, 0.14), racingMat);
      back.position.set(0, 1.36, -0.44);
      back.castShadow = true;
      this.meshGroup.add(back);

      this.attachSentientEyes(0, 1.56, -0.36);
    } else if (formId === 'recliner') {
      // Plush Velvet Recliner
      const velvetMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.75 });
      const goldTrim = goldMat;

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.18, 20), goldTrim);
      base.position.set(0, 0.09, 0);
      this.meshGroup.add(base);
      this.legs.push(base);

      this.seatCushion = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 1.12), velvetMat);
      this.seatCushion.position.set(0, 0.58, 0.04);
      this.seatCushion.castShadow = true;
      this.meshGroup.add(this.seatCushion);

      // Puffy rolled armrests
      [-0.62, 0.62].forEach(ox => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.46, 1.12), velvetMat);
        arm.position.set(ox, 0.82, 0.02);
        arm.castShadow = true;
        this.meshGroup.add(arm);
      });

      const back = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.05, 0.32), velvetMat);
      back.position.set(0, 1.22, -0.44);
      back.castShadow = true;
      this.meshGroup.add(back);

      this.attachSentientEyes(0, 1.38, -0.26);
    } else if (formId === 'throne') {
      // Sovereign Gilded Royal Throne
      const crimsonVelvet = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
      const legOffsets = [[-0.52, -0.48], [0.52, -0.48], [-0.52, 0.48], [0.52, 0.48]];
      legOffsets.forEach(([ox, oz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.68, 12), goldMat);
        leg.position.set(ox, 0.34, oz);
        leg.castShadow = true;
        this.meshGroup.add(leg);
        this.legs.push(leg);
      });

      this.seatCushion = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.22, 1.08), crimsonVelvet);
      this.seatCushion.position.set(0, 0.74, 0);
      this.seatCushion.castShadow = true;
      this.meshGroup.add(this.seatCushion);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.16), goldMat);
      frame.position.set(0, 0.64, 0);
      this.meshGroup.add(frame);

      [-0.58, 0.58].forEach(ox => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.96), goldMat);
        arm.position.set(ox, 0.96, 0);
        this.meshGroup.add(arm);
      });

      const highBack = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.58, 0.18), crimsonVelvet);
      highBack.position.set(0, 1.54, -0.48);
      highBack.castShadow = true;
      this.meshGroup.add(highBack);

      const goldCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.28, 6), goldMat);
      goldCrest.position.set(0, 2.42, -0.48);
      this.meshGroup.add(goldCrest);

      this.attachSentientEyes(0, 1.68, -0.37);
    }
  }

  attachSentientEyes(x, y, z) {
    this.eyesGroup = new THREE.Group();
    this.eyesGroup.position.set(x, y, z);

    const scleraGeo = new THREE.SphereGeometry(0.095, 14, 14);
    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(0.048, 10, 10);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });

    [-0.15, 0.15].forEach(ox => {
      const eyeWrap = new THREE.Group();
      eyeWrap.position.set(ox, 0, 0);
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      sclera.scale.set(1, 1.15, 0.55);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0, 0.05);
      eyeWrap.add(sclera);
      eyeWrap.add(pupil);
      this.eyesGroup.add(eyeWrap);
    });

    this.meshGroup.add(this.eyesGroup);
  }

  update(dt, input, arenaBounds, obstacles, upgrades, sound) {
    // Cooldowns
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.sabotageCooldown > 0) this.sabotageCooldown = Math.max(0, this.sabotageCooldown - dt);
    if (this.specialCooldown > 0) this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

    // Check Freeze / Disguise Pose (Hold Space when not moving or explicitly holding Space)
    const held = code => input.keys[code] || input.touchKeys?.[code];
    this.isFrozenDisguise = Boolean(held('Space')) && !this.isDashing;

    // Hide sentient eyes when frozen in disguise or occupied!
    if (this.eyesGroup) {
      const eyesClosed = this.isFrozenDisguise;
      this.eyesGroup.scale.y = THREE.MathUtils.lerp(this.eyesGroup.scale.y, eyesClosed ? 0.05 : 1.0, dt * 16);
    }

    // Speed multiplier from Titanium Casters upgrade
    const casterMult = 1 + (upgrades.titaniumCasters || 0) * 0.12;
    const moveSpeed = this.currentForm.speed * casterMult;
    const dashSpeed = this.currentForm.dashSpeed * casterMult;

    // Input direction
    let ix = 0;
    let iz = 0;
    if (!this.isFrozenDisguise && !this.occupiedBy) {
      ix = input.move?.x || 0;
      iz = input.move?.z || 0;
      if (input.keys['KeyW'] || input.keys['ArrowUp']) iz -= 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) iz += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) ix -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) ix += 1;
    }

    const inputLen = Math.hypot(ix, iz);
    if (inputLen > 1) {
      ix /= inputLen;
      iz /= inputLen;
    }

    // Trigger Last-Second Slide-Intercept Dash (Shift)
    if ((held('ShiftLeft') || held('ShiftRight')) && this.dashCooldown <= 0 && !this.occupiedBy) {
      this.isDashing = true;
      this.dashTimer = 0.26;
      this.dashCooldown = 1.15;
      const dirX = inputLen > 0 ? ix / Math.min(inputLen, 1) : Math.sin(this.yaw);
      const dirZ = inputLen > 0 ? iz / Math.min(inputLen, 1) : Math.cos(this.yaw);
      this.vel.x = dirX * dashSpeed;
      this.vel.z = dirZ * dashSpeed;
      sound.playDash();
    }

    if (!this.isDashing) {
      const targetVx = ix * moveSpeed;
      const targetVz = iz * moveSpeed;
      const accel = this.isFrozenDisguise || this.occupiedBy ? 18.0 : 12.0;
      this.vel.x = THREE.MathUtils.lerp(this.vel.x, targetVx, dt * accel);
      this.vel.z = THREE.MathUtils.lerp(this.vel.z, targetVz, dt * accel);
    } else {
      this.vel.multiplyScalar(Math.pow(0.92, dt * 60));
    }

    // Apply movement
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // Clamp to arena bounds
    const halfW = arenaBounds.w / 2 - 1.0;
    const halfD = arenaBounds.d / 2 - 1.0;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -halfW, halfW);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -halfD, halfD);

    // Collide gently with tables/pillars
    for (const obs of obstacles) {
      const dx = this.pos.x - obs.x;
      const dz = this.pos.z - obs.z;
      const dist = Math.hypot(dx, dz);
      const minDist = obs.radius + 0.58;
      if (dist < minDist && dist > 0.001) {
        const push = (minDist - dist);
        this.pos.x += (dx / dist) * push;
        this.pos.z += (dz / dist) * push;
      }
    }

    // Hop physics
    if (this.hopY > 0 || this.hopVel !== 0) {
      this.hopY += this.hopVel * dt;
      this.hopVel -= 26.0 * dt;
      if (this.hopY <= 0) {
        this.hopY = 0;
        this.hopVel = 0;
      }
    }

    // Rotate toward velocity
    const horizontalSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (horizontalSpeed > 0.35) {
      const targetYaw = Math.atan2(this.vel.x, this.vel.z);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 14);
      this.walkPhase += horizontalSpeed * dt * 3.6;
      sound.playScoot(horizontalSpeed / moveSpeed);
    }

    // Spin boost visual decay
    if (this.spinBoostAngle > 0.01) {
      this.spinBoostAngle = THREE.MathUtils.lerp(this.spinBoostAngle, 0, dt * 8);
    }

    // Procedural leg walk & body tilt
    const tiltForward = THREE.MathUtils.clamp(horizontalSpeed * 0.022, 0, 0.22);
    const waddleRoll = horizontalSpeed > 0.3 && !this.isFrozenDisguise
      ? Math.sin(this.walkPhase) * 0.08
      : 0;

    this.root.position.set(this.pos.x, this.hopY, this.pos.z);
    this.meshGroup.rotation.set(tiltForward, this.yaw + this.spinBoostAngle, waddleRoll);

    // Cushion squish when someone sits on you
    const targetSquish = this.occupiedBy ? 1.0 : 0.0;
    this.cushionSquish = THREE.MathUtils.lerp(this.cushionSquish, targetSquish, dt * 12);
    if (this.seatCushion) {
      this.seatCushion.scale.set(
        1 + this.cushionSquish * 0.14,
        1 - this.cushionSquish * 0.32,
        1 + this.cushionSquish * 0.14
      );
    }

    // Aura ring color & pulse
    if (this.auraRing) {
      if (this.isFrozenDisguise) {
        this.auraRing.material.color.setHex(0x10b981);
        this.auraRing.material.opacity = 0.22;
      } else if (this.trapMode === 'catapult') {
        this.auraRing.material.color.setHex(0xf43f5e);
        this.auraRing.material.opacity = 0.55;
      } else {
        this.auraRing.material.color.setHex(0xf5b731);
        this.auraRing.material.opacity = 0.42;
      }
      const scale = 1.0 + Math.sin(performance.now() * 0.006) * 0.05;
      this.auraRing.scale.set(scale, scale, 1);
    }
  }

  getMovingRatio() {
    if (this.isFrozenDisguise || this.occupiedBy) return 0;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    return speed > 0.45 ? Math.min(1.5, speed / 7.5) : 0;
  }
}
