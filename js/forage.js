// forage.js — pickable branches, feathers and herbs scattered near the trail.
// Walk close and press G to gather; they respawn after a while.
export function createForage({ scene, terrainHeight, inventory, onEvent = () => {} }) {
  const KINDS = {
    branch:  { color: 0x6a4a2a, label: '🪵 Branch',  count: 26 },
    feather: { color: 0xe4dccb, label: '🪶 Feather', count: 16 },
    herb:    { color: 0x5f9a48, label: '🌿 Herb',    count: 14 }
  };

  const mats = {};
  Object.entries(KINDS).forEach(([k, v]) => {
    mats[k] = new THREE.MeshStandardMaterial({ color: v.color, roughness: 1, flatShading: true });
  });

  const geos = {
    branch: new THREE.CylinderGeometry(0.05, 0.07, 0.9, 5),
    feather: new THREE.ConeGeometry(0.09, 0.42, 4),
    herb: new THREE.IcosahedronGeometry(0.22, 0)
  };

  const nodes = [];
  Object.entries(KINDS).forEach(([kind, cfg]) => {
    for (let i = 0; i < cfg.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 92;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const mesh = new THREE.Mesh(geos[kind], mats[kind]);
      mesh.position.set(x, terrainHeight(x, z) + 0.2, z);
      if (kind === 'branch') mesh.rotation.z = Math.PI / 2;
      mesh.rotation.y = Math.random() * Math.PI;
      scene.add(mesh);
      nodes.push({ kind, mesh, x, z, taken: 0 });
    }
  });

  const prompt = document.createElement('div');
  prompt.className = 'context-prompt';
  prompt.dataset.mobileKey = 'g';
  Object.assign(prompt.style, {
    position: 'fixed', left: '50%', bottom: '22%', transform: 'translateX(-50%)',
    background: 'rgba(15,18,26,0.66)', border: '1px solid rgba(255,255,255,.14)',
    borderRadius: '9px', padding: '8px 16px', color: '#f2f5ff', fontSize: '13px',
    letterSpacing: '1px', zIndex: 13, opacity: '0', transition: 'opacity .2s',
    pointerEvents: 'none'
  });
  document.body.appendChild(prompt);

  let prevG = false;

  function update(dt, keys, playerPos) {
    let nearest = null, nearestD = 3.2;
    for (const n of nodes) {
      if (n.taken > 0) {
        n.taken -= dt;
        if (n.taken <= 0) n.mesh.visible = true;
        continue;
      }
      n.mesh.position.y = terrainHeight(n.x, n.z) + 0.2 + Math.sin(performance.now() * 0.002 + n.x) * 0.04;
      const d = Math.hypot(playerPos.x - n.x, playerPos.z - n.z);
      if (d < nearestD) { nearestD = d; nearest = n; }
    }

    if (nearest) {
      prompt.textContent = `G · gather ${KINDS[nearest.kind].label}`;
      prompt.style.opacity = '1';
      const g = !!keys['g'];
      if (g && !prevG) {
        inventory.add(nearest.kind, 1);
        nearest.taken = 45 + Math.random() * 30;
        nearest.mesh.visible = false;
        onEvent('gather', { kind: nearest.kind });
      }
      prevG = g;
    } else {
      prompt.style.opacity = '0';
      prevG = !!keys['g'];
    }
  }

  return { update, nodes };
}
