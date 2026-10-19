import * as THREE from 'three';

export class ArenaBuilder {
  constructor(scene) {
    this.scene = scene;
    this.envGroup = new THREE.Group();
    this.scene.add(this.envGroup);
    this.obstacles = []; // { x, z, radius }
    this.particles = [];
    this.shockwaves = [];
  }

  clear() {
    while (this.envGroup.children.length > 0) {
      this.envGroup.remove(this.envGroup.children[0]);
    }
    this.obstacles = [];
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];
    this.shockwaves.forEach(s => this.scene.remove(s.mesh));
    this.shockwaves = [];
  }

  buildStage(levelConfig) {
    this.clear();
    const { w, d } = levelConfig.arenaSize;
    const { floorColor, checkerColor, wallColor, accentColor } = levelConfig.theme;

    // 1. Procedural Checkered / Tile Floor Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const c1 = '#' + floorColor.toString(16).padStart(6, '0');
    const c2 = '#' + checkerColor.toString(16).padStart(6, '0');

    const tiles = 8;
    const step = 512 / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? c1 : c2;
        ctx.fillRect(x * step, y * step, step, step);
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeRect(x * step, y * step, step, step);
      }
    }

    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(w / 4, d / 4);

    const floorGeo = new THREE.PlaneGeometry(w, d);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.42,
      metalness: 0.15
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    this.envGroup.add(floorMesh);

    // 2. Center Carpet / Runner for Royal Palace or Gala
    const rugGeo = new THREE.PlaneGeometry(w * 0.35, d * 0.72);
    rugGeo.rotateX(-Math.PI / 2);
    const rugMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.85,
      transparent: true,
      opacity: 0.22
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.y = 0.01;
    rug.receiveShadow = true;
    this.envGroup.add(rug);

    // 3. Perimeter Low Walls & Neon Trim
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.6
    });

    const wallH = 2.6;
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, wallH, 0.5), wallMat);
    northWall.position.set(0, wallH / 2, -d / 2 - 0.25);
    northWall.receiveShadow = true;
    this.envGroup.add(northWall);

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallH, d + 0.8), wallMat);
    westWall.position.set(-w / 2 - 0.25, wallH / 2, 0);
    this.envGroup.add(westWall);

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallH, d + 0.8), wallMat);
    eastWall.position.set(w / 2 + 0.25, wallH / 2, 0);
    this.envGroup.add(eastWall);

    const trimBar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.55), trimMat);
    trimBar.position.set(0, wallH + 0.06, -d / 2 - 0.25);
    this.envGroup.add(trimBar);

    // 4. Stage-Specific Tables & Props (plus Rival Chair spawn points!)
    const rivalSpawns = [];
    const tablePositions = [
      [-w * 0.24, -d * 0.2],
      [w * 0.24, -d * 0.2],
      [-w * 0.24, d * 0.18],
      [w * 0.24, d * 0.18],
      [0, -d * 0.02]
    ];

    tablePositions.forEach(([tx, tz], idx) => {
      this.createTable(tx, tz, levelConfig.id, accentColor);
      this.obstacles.push({ x: tx, z: tz, radius: 1.35 });

      // Add rival chair slots around each table
      const chairDist = 1.95;
      const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
      angles.forEach((ang, aIdx) => {
        if ((idx + aIdx) % 2 === 0 || rivalSpawns.length < levelConfig.rivalChairsCount) {
          const cx = tx + Math.sin(ang) * chairDist;
          const cz = tz + Math.cos(ang) * chairDist;
          // Face toward table
          rivalSpawns.push({ x: cx, z: cz, yaw: ang + Math.PI });
        }
      });
    });

    // Decorative corner potted plants / pillars
    const corners = [
      [-w / 2 + 1.8, -d / 2 + 1.8],
      [w / 2 - 1.8, -d / 2 + 1.8],
      [-w / 2 + 1.8, d / 2 - 1.8],
      [w / 2 - 1.8, d / 2 - 1.8]
    ];
    corners.forEach(([px, pz]) => {
      this.createCornerProp(px, pz, accentColor);
      this.obstacles.push({ x: px, z: pz, radius: 0.85 });
    });

    return rivalSpawns.slice(0, levelConfig.rivalChairsCount);
  }

  createTable(x, z, levelId, accentColor) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const topColor = levelId === 'cafe' ? 0xd97706 : (levelId === 'office' ? 0xe2e8f0 : 0xfef3c7);
    const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.35 });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.42, 0.96, 14), baseMat);
    pedestal.position.y = 0.48;
    pedestal.castShadow = true;
    group.add(pedestal);

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.18, 0.1, 24), topMat);
    tableTop.position.y = 0.98;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // Centerpiece lamp / espresso cup
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.28, 12),
      new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.75
      })
    );
    lamp.position.y = 1.16;
    group.add(lamp);

    this.envGroup.add(group);
  }

  createCornerProp(x, z, accentColor) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.35, 0.65, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
    );
    pot.position.y = 0.325;
    pot.castShadow = true;
    group.add(pot);

    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.62, 1),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.7 })
    );
    foliage.position.y = 1.05;
    foliage.castShadow = true;
    group.add(foliage);

    this.envGroup.add(group);
  }

  spawnBurst(pos, colorHex = 0xf5b731, count = 16, speed = 5.5) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, (pos.y || 0) + 0.65, pos.z);
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.8) * speed;
      const vel = new THREE.Vector3(
        Math.cos(angle) * spd,
        2.0 + Math.random() * 4.5,
        Math.sin(angle) * spd
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0.65 + Math.random() * 0.35 });
    }
  }

  spawnShockwave(pos, colorHex = 0xf5b731, maxRadius = 6.0) {
    const geo = new THREE.RingGeometry(0.3, 0.55, 36);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.06, pos.z);
    this.scene.add(mesh);
    this.shockwaves.push({ mesh, mat, elapsed: 0, duration: 0.55, maxRadius });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 16.0 * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 6;
      p.mesh.scale.setScalar(Math.max(0.1, p.life));
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.elapsed += dt;
      const prog = s.elapsed / s.duration;
      if (prog >= 1) {
        this.scene.remove(s.mesh);
        this.shockwaves.splice(i, 1);
        continue;
      }
      const scale = 1 + prog * s.maxRadius * 1.8;
      s.mesh.scale.set(scale, scale, 1);
      s.mat.opacity = (1 - prog) * 0.85;
    }
  }
}
