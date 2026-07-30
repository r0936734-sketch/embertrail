// mysticStone.js — an ancient glowing stone in the eastern meadow.
// Hit it with an arrow to activate a magical light effect.
// Simple, optimized interactive landmark.

export function createMysticStone({
  scene,
  terrainHeight,
  archery,
  position = { x: 70, z: 40 },
  onEvent = () => {}
}) {
  const px = position.x;
  const pz = position.z;
  const y0 = terrainHeight(px, pz);

  const group = new THREE.Group();
  group.position.set(px, y0, pz);
  group.visible = false;
  scene.add(group);

  const stoneMat = new THREE.MeshStandardMaterial({ 
    color: 0x4a4a5a, 
    roughness: 0.6, 
    flatShading: true,
    metalness: 0.2
  });
  
  const colors = [
    { color: 0x6b4fa3, emissive: 0x9b6ef3 }, // Purple (default)
    { color: 0x4fa36b, emissive: 0x6ef39b }, // Green
    { color: 0xa34f4f, emissive: 0xf36e6e }, // Red
    { color: 0x4f6ba3, emissive: 0x6e9bf3 }, // Blue
    { color: 0xa3a34f, emissive: 0xf3f36e }, // Yellow
  ];

  const glowMat = new THREE.MeshStandardMaterial({
    color: colors[0].color,
    emissive: colors[0].emissive,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
    flatShading: true
  });

  // Main stone structure
  const mainStone = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.8, 0),
    stoneMat
  );
  mainStone.position.y = 1.2;
  mainStone.scale.set(1, 1.3, 0.8);
  group.add(mainStone);

  // Smaller stones around it
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const smallStone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0),
      stoneMat
    );
    smallStone.position.set(
      Math.cos(angle) * 2.2,
      0.3,
      Math.sin(angle) * 2.2
    );
    smallStone.rotation.set(
      Math.random() * 0.5,
      Math.random() * Math.PI,
      Math.random() * 0.5
    );
    group.add(smallStone);
  }

  // Glowing core (the target)
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.8, 0),
    glowMat
  );
  core.position.y = 2.2;
  group.add(core);

  // Point light for magical effect
  const magicLight = new THREE.PointLight(0x9b6ef3, 0.8, 15, 2); // Reduced intensity and range
  magicLight.position.set(0, 2.5, 0);
  group.add(magicLight);

  // Glow sphere around the core
  const glowSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 8, 6),
    new THREE.MeshBasicMaterial({ 
      color: colors[0].emissive, 
      transparent: true, 
      opacity: 0.15 
    })
  );
  glowSphere.position.y = 2.2;
  group.add(glowSphere);

  // Particle system for activation effect (reduced for performance)
  const particles = [];
  const particleCount = 8; // Reduced from 20
  
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 4),
      new THREE.MeshBasicMaterial({ 
        color: colors[0].emissive, 
        transparent: true, 
        opacity: 0 
      })
    );
    particle.position.set(
      (Math.random() - 0.5) * 4,
      1.5 + Math.random() * 2,
      (Math.random() - 0.5) * 4
    );
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3,
        (Math.random() - 0.5) * 2
      ),
      life: 0
    };
    group.add(particle);
    particles.push(particle);
  }

  // State
  let activated = false;
  let glowIntensity = 0;
  let colorChangeIndex = 0;
  let isVisible = false;
  const RENDER_DISTANCE = 120;
  const coreWorldPos = new THREE.Vector3(px, y0 + 2.2, pz);

  archery.register({
    name: 'mysticStone',
    radius: 2.5,
    getPos: () => coreWorldPos,
    onHit: power => {
      if (!activated) {
        activated = true;
        glowIntensity = 1;
        onEvent('stoneActivated', { power });
        
        // Trigger particle burst
        particles.forEach(p => {
          p.userData.life = 1;
          p.material.opacity = 0.8;
        });
      } else {
        // Change color on subsequent hits
        colorChangeIndex = (colorChangeIndex + 1) % colors.length;
        const newColor = colors[colorChangeIndex];
        core.material.color.setHex(newColor.color);
        core.material.emissive.setHex(newColor.emissive);
        magicLight.color.setHex(newColor.emissive);
        glowSphere.material.color.setHex(newColor.emissive);
        particles.forEach(p => p.material.color.setHex(newColor.emissive));
        onEvent('stoneColorChanged', { colorIndex: colorChangeIndex });
      }
    }
  });

  const poiList = [{
    name: 'Mystic Stone',
    pos: { x: px, z: pz },
    r: 18,
    flavor: 'An ancient stone with a dark core. Legends say it holds dormant magic.'
  }];

  function update(dt, elapsed, playerPos = null) {
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

    // Idle animation for core (simplified)
    if (!activated) {
      const pulse = 0.3 + 0.15 * Math.sin(elapsed * 1.5); // Slower animation
      core.material.emissiveIntensity = pulse;
      core.scale.setScalar(0.9 + 0.1 * Math.sin(elapsed * 1.5));
    } else {
      // Active glowing state (simplified)
      const flicker = 0.8 + 0.2 * Math.sin(elapsed * 2); // Slower flicker
      core.material.emissiveIntensity = glowIntensity * flicker;
      magicLight.intensity = glowIntensity * 1.5 * flicker; // Reduced intensity
      
      // Update particles less frequently
      particles.forEach(p => {
        if (p.userData.life > 0) {
          p.userData.life -= dt * 0.6; // Slower decay
          p.position.addScaledVector(p.userData.velocity, dt);
          p.material.opacity = p.userData.life * 0.8;
          
          if (p.userData.life <= 0) {
            p.material.opacity = 0;
          }
        }
      });
    }
  }

  return {
    update,
    poiList,
    position: { x: px, z: pz },
    get activated() { return activated; },
    group
  };
}