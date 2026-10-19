import * as THREE from 'three';

export class RivalChair {
  constructor(scene, x, z, yaw = 0, themeStyle = 'cafe') {
    this.scene = scene;
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw;
    this.sabotaged = false;
    this.occupied = false;
    this.respawnTimer = 0;

    this.root = new THREE.Group();
    this.root.position.copy(this.pos);
    this.root.rotation.y = yaw;
    this.scene.add(this.root);

    this.buildMesh(themeStyle);
  }

  buildMesh(themeStyle) {
    const colorMap = {
      cafe: 0x78350f,
      office: 0x334155,
      gala: 0x581c87,
      palace: 0x991b1b,
      endless: 0x1e293b
    };
    const mainColor = colorMap[themeStyle] || 0x64748b;
    const mat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.6 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.5 });

    this.meshWrap = new THREE.Group();
    this.root.add(this.meshWrap);

    const legGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.66, 8);
    [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]].forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(ox, 0.33, oz);
      leg.castShadow = true;
      this.meshWrap.add(leg);
    });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.1, 0.76), mat);
    seat.position.set(0, 0.68, 0);
    seat.castShadow = true;
    this.meshWrap.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.72, 0.09), mat);
    back.position.set(0, 1.06, -0.34);
    back.castShadow = true;
    this.meshWrap.add(back);

    // Subtle blue rival indicator ring
    const ringGeo = new THREE.RingGeometry(0.48, 0.56, 24);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    });
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.ring.position.y = 0.02;
    this.root.add(this.ring);
  }

  sabotage() {
    if (this.sabotaged) return false;
    this.sabotaged = true;
    this.occupied = false;
    this.respawnTimer = 22.0; // Janitors or time eventually repairs it after 22s

    // Collapse visual pose
    this.meshWrap.rotation.z = 0.48;
    this.meshWrap.rotation.x = -0.32;
    this.meshWrap.position.y = -0.18;
    this.ringMat.color.setHex(0xf43f5e);
    this.ringMat.opacity = 0.15;
    return true;
  }

  repair() {
    this.sabotaged = false;
    this.meshWrap.rotation.set(0, 0, 0);
    this.meshWrap.position.y = 0;
    this.ringMat.color.setHex(0x38bdf8);
    this.ringMat.opacity = 0.32;
  }

  update(dt) {
    if (this.sabotaged) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.repair();
      }
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
