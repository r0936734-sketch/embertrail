// forage.js — pickable branches, feathers and herbs scattered near the trail.
// Walk close and press G to gather; they respawn after a while.
// Drop-in replacement — same API.
export function createForage({ scene, terrainHeight, inventory, onEvent = () => {} }) {
   const touchControls = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const KINDS = {
    branch:  { color: 0x6a4a2a, label: '🪵 Branch',  count: 26, yOff: 0.18, spin: 0.6 },
    feather: { color: 0xe4dccb, label: '🪶 Feather', count: 16, yOff: 0.28, spin: 1.4 },
    herb:    { color: 0x5f9a48, label: '🌿 Herb',    count: 14, yOff: 0.22, spin: 0.9 }
  };

  const mats = {};
  Object.entries(KINDS).forEach(([k, v]) => {
    mats[k] = new THREE.MeshStandardMaterial({
      color: v.color,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true
    });
  });

  // slightly richer geometry per kind
  const geos = {
    branch: (() => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.065, 0.95, 5),
        mats.branch
      );
      trunk.rotation.z = Math.PI / 2;
      g.add(trunk);
      // small side twig
      const twig = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.028, 0.32, 4),
        mats.branch
      );
      twig.position.set(0.15, 0.08, 0);
      twig.rotation.z = Math.PI * 0.35;
      g.add(twig);
      return g;
    })(),
    feather: (() => {
      const g = new THREE.Group();
      const vane = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.48, 5),
        mats.feather
      );
      vane.rotation.z = -0.15;
      g.add(vane);
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4),
        mats.feather
      );
      shaft.position.y = -0.05;
      g.add(shaft);
      return g;
    })(),
    herb: (() => {
      const g = new THREE.Group();
      // cluster of small leaves
      for (let i = 0; i < 4; i++) {
        const leaf = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.14 + Math.random() * 0.06, 0),
          mats.herb
        );
        const a = (i / 4) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.12, Math.random() * 0.1, Math.sin(a) * 0.12);
        leaf.scale.setScalar(0.7 + Math.random() * 0.5);
        g.add(leaf);
      }
      return g;
    })()
  };

  // clone helper so each node gets its own mesh
  function cloneKind(kind) {
    return geos[kind].clone(true);
  }

  const nodes = [];
  Object.entries(KINDS).forEach(([kind, cfg]) => {
    for (let i = 0; i < cfg.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 16 + Math.random() * 96;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      const mesh = cloneKind(kind);
      mesh.position.set(x, terrainHeight(x, z) + cfg.yOff, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      if (kind === 'branch') mesh.rotation.x = (Math.random() - 0.5) * 0.35;
      mesh.castShadow = true;
      scene.add(mesh);

      nodes.push({
        kind,
        mesh,
        x,
        z,
        taken: 0,
        baseY: cfg.yOff,
        phase: Math.random() * Math.PI * 2,
        spinSpeed: cfg.spin * (0.7 + Math.random() * 0.6),
        pulse: 0
      });
    }
  });

  // gather prompt (same look, slightly nicer)
  const prompt = document.createElement('div');
  prompt.className = 'context-prompt';
  prompt.dataset.mobileKey = 'g';
  Object.assign(prompt.style, {
    position: 'fixed',
    left: '50%',
    bottom: '22%',
    transform: 'translateX(-50%)',
    background: 'rgba(12,15,22,0.72)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: '10px',
    padding: '9px 18px',
    color: '#f2f5ff',
    fontSize: '13px',
    letterSpacing: '1px',
    zIndex: 13,
    opacity: '0',
    transition: 'opacity 0.18s ease',
    pointerEvents: 'none',
    boxShadow: '0 4px 18px rgba(0,0,0,0.35)'
  });
  document.body.appendChild(prompt);

  let prevG = false;
  let lastNearest = null;

  function update(dt, keys, playerPos) {
    const t = Math.min(dt, 0.05);
    let nearest = null;
    let nearestD = 3.15;

    for (const n of nodes) {
      // respawn countdown
      if (n.taken > 0) {
        n.taken -= t;
        if (n.taken <= 0) {
          n.mesh.visible = true;
          n.mesh.scale.setScalar(0.01); // pop-in
          n.pulse = 0.55;
        }
        continue;
      }

      // gentle float + slow spin
      const bob = Math.sin(performance.now() * 0.0018 + n.phase) * 0.045;
      n.mesh.position.y = terrainHeight(n.x, n.z) + n.baseY + bob;
      n.mesh.rotation.y += n.spinSpeed * t * 0.35;

      // gather pop animation
      if (n.pulse > 0) {
        n.pulse -= t;
        const s = 0.85 + Math.sin((1 - Math.max(0, n.pulse) / 0.55) * Math.PI) * 0.25;
        n.mesh.scale.setScalar(Math.max(0.01, s));
      } else {
        n.mesh.scale.setScalar(1);
      }

      const d = Math.hypot(playerPos.x - n.x, playerPos.z - n.z);
      if (d < nearestD) {
        nearestD = d;
        nearest = n;
      }
    }

    if (nearest) {
      // highlight nearest a bit
      if (lastNearest !== nearest) {
        if (lastNearest && lastNearest.mesh.visible) {
          lastNearest.mesh.scale.setScalar(1);
        }
        lastNearest = nearest;
      }
      nearest.mesh.scale.setScalar(1.12 + Math.sin(performance.now() * 0.006) * 0.04);

      prompt.textContent = touchControls
        ? `Tap ACTION to gather ${KINDS[nearest.kind].label}`
        : `G · gather ${KINDS[nearest.kind].label}`;
      prompt.style.opacity = '1';

      const g = !!keys['g'];
      if (g && !prevG) {
        inventory.add(nearest.kind, 1);
        nearest.taken = 40 + Math.random() * 35;
        nearest.mesh.visible = false;
        nearest.mesh.scale.setScalar(1);
        onEvent('gather', { kind: nearest.kind });
      }
      prevG = g;
    } else {
      if (lastNearest && lastNearest.mesh.visible) {
        lastNearest.mesh.scale.setScalar(1);
      }
      lastNearest = null;
      prompt.style.opacity = '0';
      prevG = !!keys['g'];
    }
  }

  return { update, nodes };
}