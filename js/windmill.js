// windmill.js — an old windmill landmark. Shoot the wooden locking wedge
// near the hub to release the brake; once freed, the sails spin driven by
// the same wind value that already sways the falling leaves/snow/petals
// (see main.js's windX), and small lanterns light up around the eaves at
// night. A satisfying, persistent "unlock" moment, same category of
// interaction as flametower.js but grounded rather than skyward.
// THREE is global (r128). No imports.

function woodMat(color = 0x4a3424) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, metalness: 0 });
}
function stoneMat(color = 0x6b6058) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, metalness: 0.04 });
}

export function createWindmill({
  scene,
  terrainHeight,
  collision,
  archery,
  position = { x: 30, z: 55 },
  onEvent = () => {}
}) {
  const px = position.x;
  const pz = position.z;
  const y0 = terrainHeight(px, pz);

  const group = new THREE.Group();
  group.position.set(px, y0, pz);
  group.visible = false;
  scene.add(group);

  const wood = woodMat(0x5a3d24);
  const woodDark = woodMat(0x3a2716);
  const stone = stoneMat(0x6b6058);
  const stoneDark = stoneMat(0x4e463f);
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1, flatShading: true });

  // ---------- cottage body (tapered stone base + conical thatch roof) ----------
  const bodyH = 6.2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.6, bodyH, 8), stone);
  body.position.y = bodyH / 2;
  group.add(body);

  for (let ring = 0; ring < 3; ring++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(2.15 - ring * 0.14, 2.15 - ring * 0.14, 0.22, 8), stoneDark);
    band.position.y = 1.4 + ring * 1.8;
    group.add(band);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.6, 8), thatchMat);
  roof.position.y = bodyH + 1.3;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.1), woodDark);
  door.position.set(0, 0.85, 2.02);
  group.add(door);
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.85, 0.14), woodDark);
  doorFrame.position.set(0, 0.95, 2.0);
  group.add(doorFrame);
  const window1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffcf87, emissive: 0xffa95b, emissiveIntensity: 0.4, flatShading: true })
  );
  window1.position.set(1.4, 3.4, 1.4);
  window1.rotation.y = -0.6;
  group.add(window1);

  // ---------- sail hub + blades (the moving part) ----------
  const hubY = bodyH + 0.6;
  const hubMount = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 8), woodDark);
  hubMount.rotation.z = Math.PI / 2;
  hubMount.position.set(0, hubY, 2.1);
  group.add(hubMount);

  const sailPivot = new THREE.Group();
  sailPivot.position.set(0, hubY, 2.55);
  group.add(sailPivot);

  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 8), woodDark);
  hubCap.rotation.x = Math.PI / 2;
  sailPivot.add(hubCap);

  const bladeMat = wood;
  const latticeMat = woodDark;
  const bladeLength = 3.6;
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    blade.rotation.z = (i / 4) * Math.PI * 2;
    sailPivot.add(blade);

    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.14, bladeLength, 0.08), bladeMat);
    spar.position.y = bladeLength / 2;
    blade.add(spar);

    for (let s = 0; s < 5; s++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.75 - s * 0.1, 0.06, 0.05), latticeMat);
      rung.position.y = 0.5 + s * (bladeLength - 0.9) / 4;
      blade.add(rung);
    }
  }

  // locking wedge — the shootable target holding the brake shut
  const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 0.22), woodDark);
  wedge.position.set(0.4, hubY - 0.1, 2.15);
  group.add(wedge);
  const wedgeGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.03, 4, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb15a, transparent: true, opacity: 0.6 })
  );
  wedgeGlow.position.copy(wedge.position);
  group.add(wedgeGlow);

  // ---------- eave lanterns (lit once unlocked, at night) ----------
  const lanterns = [];
  const lanternAngles = [0.5, 2.4, 4.1]; // Reduced from 4 to 3 for performance
  lanternAngles.forEach(a => {
    const lx = Math.cos(a) * 2.35;
    const lz = Math.sin(a) * 2.35;
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a2e18, emissive: 0xffa95b, emissiveIntensity: 0, flatShading: true })
    );
    lantern.position.set(lx, bodyH - 0.1, lz);
    group.add(lantern);
    const light = new THREE.PointLight(0xffa95b, 0, 4, 2); // Reduced range for performance
    light.position.copy(lantern.position);
    group.add(light);
    lanterns.push({ mesh: lantern, light });
  });

  if (collision && typeof collision.addCollider === 'function') {
    collision.addCollider(px, pz, 2.4);
  }

  // ---------- state ----------
  let unlocked = false;
  let sailAngle = 0;
  let isVisible = false;
  const RENDER_DISTANCE = 120;
  const wedgeWorldPos = new THREE.Vector3(px + 0.4, y0 + hubY - 0.1, pz + 2.15);

  archery.register({
    name: 'windmillWedge',
    radius: 0.9,
    getPos: () => wedgeWorldPos,
    onHit: power => {
      if (unlocked) return;
      unlocked = true;
      wedge.visible = false;
      wedgeGlow.visible = false;
      onEvent('millUnlocked', { power });
    }
  });

  const poiList = [{
    name: 'The Old Windmill',
    pos: { x: px, z: pz },
    r: 14,
    flavor: 'Its sails have been locked still for years. A well-placed arrow might free the brake and let the wind take it again.'
  }];

  // ---------- update ----------
  function update(dt, elapsed, windX = 0, nightAmt = 0, playerPos = null) {
    // Distance-based visibility
    if (playerPos) {
      const dist = Math.hypot(playerPos.x - px, playerPos.z - pz);
      const shouldRender = dist < RENDER_DISTANCE;
      if (shouldRender !== isVisible) {
        isVisible = shouldRender;
        group.visible = isVisible;
      }
    }
    
    if (!isVisible) return;

    // unlit target pulses gently so it reads as interactive
    if (!unlocked) {
      const s = 0.9 + 0.12 * Math.sin(elapsed * 2); // Slower animation
      wedgeGlow.scale.setScalar(s);
      wedgeGlow.material.opacity = 0.45 + 0.2 * Math.sin(elapsed * 2);
    } else {
      // sails spin proportional to how hard the wind is blowing right now
      const spinSpeed = 0.4 + Math.abs(windX) * 1.0; // Slower spin
      sailAngle += dt * spinSpeed;
      sailPivot.rotation.z = sailAngle;

      // lanterns fade in at night (simplified)
      const targetGlow = nightAmt > 0.5 ? (nightAmt - 0.5) * 2 : 0;
      lanterns.forEach((l, i) => {
        const flicker = 0.85 + 0.15 * Math.sin(elapsed * 2 + i * 1.7); // Slower flicker
        l.mesh.material.emissiveIntensity += (targetGlow * flicker - l.mesh.material.emissiveIntensity) * Math.min(1, dt * 2);
        l.light.intensity += (targetGlow * 0.8 * flicker - l.light.intensity) * Math.min(1, dt * 2); // Reduced intensity
      });
    }
  }

  return {
    update,
    poiList,
    position: { x: px, z: pz },
    get unlocked() { return unlocked; },
    group
  };
}
