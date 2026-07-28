// collectibles.js — gatherable items, fishing, journal/sketchbook UI

export function createCollectibles(scene, terrainHeight) {

  // ── item catalogue ──────────────────────────────────────────────────────
  const TYPES = [
    { id: 'flower_red',    label: 'Red Wildflower',    emoji: '🌸', color: 0xff5566, category: 'flora' },
    { id: 'flower_blue',   label: 'Blue Bell',          emoji: '💙', color: 0x5588ff, category: 'flora' },
    { id: 'flower_yellow', label: 'Sunbright',          emoji: '🌼', color: 0xffdd44, category: 'flora' },
    { id: 'mushroom_red',  label: 'Red Cap Mushroom',   emoji: '🍄', color: 0xcc3322, category: 'flora' },
    { id: 'mushroom_blue', label: 'Moonshroom',         emoji: '🔵', color: 0x4466cc, category: 'flora' },
    { id: 'feather_hawk',  label: "Hawk's Feather",     emoji: '🪶', color: 0xbb9944, category: 'fauna' },
    { id: 'feather_blue',  label: 'Bluebird Feather',   emoji: '🪶', color: 0x4499ff, category: 'fauna' },
    { id: 'berry_red',     label: 'Wild Berry',         emoji: '🫐', color: 0xcc2244, category: 'forage' },
    { id: 'berry_blue',    label: 'Nightberry',         emoji: '🫐', color: 0x2244cc, category: 'forage' },
    { id: 'fish_trout',    label: 'River Trout',        emoji: '🐟', color: 0x66ccaa, category: 'fauna' },
    { id: 'fish_perch',    label: 'Golden Perch',       emoji: '🐠', color: 0xffaa44, category: 'fauna' },
  ];

  // ── spawn placement ─────────────────────────────────────────────────────
  const spawnData = [];

  // flowers near blossom grove
  for (let i = 0; i < 8; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 8 + Math.random() * 16;
    spawnData.push({
      type: Math.random() < 0.5 ? 'flower_red' : 'flower_blue',
      x: -34 + Math.cos(ang) * rad, z: 24 + Math.sin(ang) * rad
    });
  }
  // yellow flowers in eastern meadow
  for (let i = 0; i < 6; i++) {
    spawnData.push({ type: 'flower_yellow', x: 40 + Math.random() * 20, z: 20 + Math.random() * 20 });
  }
  // mushrooms — northern pines area
  for (let i = 0; i < 10; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 12 + Math.random() * 30;
    spawnData.push({
      type: Math.random() < 0.5 ? 'mushroom_red' : 'mushroom_blue',
      x: -55 + Math.cos(ang) * rad, z: -30 + Math.sin(ang) * rad
    });
  }
  // feathers scattered across the map
  [{ x: 15, z: -8 }, { x: -20, z: 30 }, { x: 62, z: 15 }, { x: -45, z: -20 }, { x: 82, z: -50 }].forEach(p => {
    spawnData.push({ type: Math.random() < 0.5 ? 'feather_hawk' : 'feather_blue', x: p.x, z: p.z });
  });
  // berries near hermit camp
  for (let i = 0; i < 8; i++) {
    spawnData.push({
      type: Math.random() < 0.5 ? 'berry_red' : 'berry_blue',
      x: -75 + (Math.random() - 0.5) * 30, z: -50 + (Math.random() - 0.5) * 25
    });
  }

  // ── build 3-D collectible meshes ────────────────────────────────────────
  const items = spawnData.map(d => {
    const td  = TYPES.find(t => t.id === d.type);
    const y   = terrainHeight(d.x, d.z) + 0.35;
    const grp = new THREE.Group();
    grp.position.set(d.x, y, d.z);
    scene.add(grp);

    const glowMat = new THREE.MeshStandardMaterial({
      color: td.color, emissive: td.color, emissiveIntensity: 0.4,
      roughness: 0.7, flatShading: true
    });
    grp.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), glowMat));

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.032, 5, 14),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    grp.add(ring);

    return { grp, td, id: d.type, collected: false, seed: Math.random() * Math.PI * 2, ox: d.x, oz: d.z };
  });

  // ── collected set ───────────────────────────────────────────────────────
  const collected = new Set();

  // ── journal UI ──────────────────────────────────────────────────────────
  const journalEl = _buildJournalEl(TYPES);

  // ── gather prompt ───────────────────────────────────────────────────────
  const gatherPrompt = _makeOverlayEl('gatherPrompt', { bottom: '22%', border: '1px solid rgba(255,255,255,0.15)' });
  gatherPrompt.classList.add('context-prompt');
  gatherPrompt.dataset.mobileKey = 'g';
  document.body.appendChild(gatherPrompt);

  // ── toast ────────────────────────────────────────────────────────────────
  const toastEl = _makeOverlayEl('collectToast', {
    top: '18%', border: '1px solid rgba(255,220,100,0.35)',
    background: 'rgba(40,30,20,0.88)', fontSize: '15px'
  });
  document.body.appendChild(toastEl);

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 3200);
  }

  function collectItem(item) {
    item.collected = true;
    collected.add(item.id);
    scene.remove(item.grp);
    _refreshJournal(journalEl, TYPES, collected);
    showToast(`Found: ${item.td.label}`);
  }

  // ── fishing system ───────────────────────────────────────────────────────
  const fishing = _buildFishing(TYPES, collected, showToast, scene, terrainHeight);

  // ── journal toggle  (O key; J is used by the bounty list) ──────────────
  let journalOpen = false;
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyO') {
      journalOpen = !journalOpen;
      journalEl.style.opacity  = journalOpen ? '1' : '0';
      journalEl.style.pointerEvents = journalOpen ? 'auto' : 'none';
    }
    if (e.code === 'KeyG' && _nearItem && !_nearItem.collected) {
      collectItem(_nearItem);
    }
  });

  let _nearItem = null;

  // ── main update ──────────────────────────────────────────────────────────
  function update(dt, t, playerPos, pondPos) {
    // animate uncollected items
    for (const item of items) {
      if (item.collected) continue;
      const bob = Math.sin(t * 2.1 + item.seed) * 0.08;
      item.grp.position.y = terrainHeight(item.ox, item.oz) + 0.35 + bob;
      item.grp.rotation.y = t * 0.8 + item.seed;
      item.grp.children[1].material.opacity = 0.3 + Math.sin(t * 3 + item.seed) * 0.2;
    }

    // nearest uncollected within gather range
    let closest = null, minD = Infinity;
    for (const item of items) {
      if (item.collected) continue;
      const dx = playerPos.x - item.grp.position.x;
      const dz = playerPos.z - item.grp.position.z;
      const d  = Math.sqrt(dx * dx + dz * dz);
      if (d < 3.5 && d < minD) { closest = item; minD = d; }
    }
    _nearItem = closest;
    gatherPrompt.textContent  = _nearItem ? `Press G to collect ${_nearItem.td.label}` : '';
    gatherPrompt.style.opacity = _nearItem ? '1' : '0';

    // fishing
    fishing.update(dt, t, playerPos, pondPos);

    return { total: TYPES.length, found: collected.size };
  }

  return {
    update,
    get foundCount()  { return collected.size; },
    get totalCount()  { return TYPES.length; }
  };
}

// ── fishing sub-system ──────────────────────────────────────────────────────
function _buildFishing(TYPES, collected, showToast) {
  let active   = false;
  let progress = 0;

  const promptEl = _makeOverlayEl('fishPrompt', { bottom: '22%', border: '1px solid rgba(120,200,255,0.3)' });
  promptEl.classList.add('context-prompt');
  promptEl.dataset.mobileKey = 'c';
  document.body.appendChild(promptEl);

  const barWrap = document.createElement('div');
  barWrap.id = 'fishBar';
  Object.assign(barWrap.style, {
    position: 'fixed', left: '50%', bottom: '26%', transform: 'translateX(-50%)',
    width: '160px', height: '10px', background: 'rgba(20,16,12,0.75)',
    borderRadius: '5px', border: '1px solid rgba(120,200,255,0.3)',
    opacity: '0', transition: 'opacity 0.2s', zIndex: '50'
  });
  const barFill = document.createElement('div');
  Object.assign(barFill.style, { height: '100%', width: '0%', background: '#5abcd8', borderRadius: '5px', transition: 'width 0.1s' });
  barWrap.appendChild(barFill);
  document.body.appendChild(barWrap);

  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyC') return;
    if (!active && promptEl.style.opacity === '1') { active = true; progress = 0; return; }
    if (active) { active = false; progress = 0; barWrap.style.opacity = '0'; }
  });

  function update(dt, t, playerPos, pondPos) {
    if (!pondPos) return;
    const dx   = playerPos.x - pondPos.x;
    const dz   = playerPos.z - pondPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const near = dist < 10;

    if (!active) {
      promptEl.textContent   = near ? 'Press C to cast a line' : '';
      promptEl.style.opacity = near ? '1' : '0';
      barWrap.style.opacity  = '0';
    }

    if (active) {
      promptEl.textContent   = 'Fishing… (C to stop)';
      promptEl.style.opacity = '1';
      barWrap.style.opacity  = '1';

      // progress varies — mimics waiting patiently
      progress += dt * (0.05 + Math.abs(Math.sin(t * 0.4)) * 0.04);
      barFill.style.width = Math.min(100, progress * 100) + '%';

      if (progress >= 1) {
        active = false; progress = 0; barWrap.style.opacity = '0';
        const id = Math.random() < 0.55 ? 'fish_trout' : 'fish_perch';
        collected.add(id);
        const td = TYPES.find(x => x.id === id);
        showToast(`You caught a ${td.label}!`);
      }
    }
  }

  return { update };
}

// ── journal UI helpers ──────────────────────────────────────────────────────
function _buildJournalEl(TYPES) {
  const el = document.createElement('div');
  el.id = 'journal';
  Object.assign(el.style, {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: '340px', maxHeight: '470px', overflowY: 'auto',
    background: 'rgba(14,11,8,0.94)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '13px', borderRadius: '14px',
    border: '1px solid rgba(200,170,100,0.35)', padding: '20px 22px',
    letterSpacing: '0.025em', opacity: '0', transition: 'opacity 0.3s',
    pointerEvents: 'none', zIndex: '60', backdropFilter: 'blur(8px)'
  });
  el.innerHTML = `
    <div style="font-size:16px;font-weight:700;letter-spacing:0.1em;margin-bottom:14px;color:#f0d890">📓 TRAIL SKETCHBOOK</div>
    <div id="journalEntries"></div>
    <div style="margin-top:12px;color:rgba(243,234,217,0.4);font-size:11px">Press O to close</div>`;
  document.body.appendChild(el);
  _refreshJournal(el, TYPES, new Set());
  return el;
}

function _refreshJournal(el, TYPES, collected) {
  const entries = document.getElementById('journalEntries');
  if (!entries) return;
  const cats = { flora: '🌿 Flora', fauna: '🦋 Fauna', forage: '🧺 Forage' };
  let html = '';
  for (const [cat, label] of Object.entries(cats)) {
    const items = TYPES.filter(t => t.category === cat);
    const found = items.filter(t => collected.has(t.id));
    html += `<div style="margin-bottom:10px">
      <div style="font-size:10px;letter-spacing:0.09em;color:rgba(240,216,144,0.7);margin-bottom:5px;text-transform:uppercase">${label} ${found.length}/${items.length}</div>`;
    for (const item of items) {
      const has = collected.has(item.id);
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;opacity:${has ? '1' : '0.28'}">
        <span style="font-size:14px">${item.emoji}</span>
        <span style="font-size:12px">${has ? item.label : '???'}</span>
      </div>`;
    }
    html += '</div>';
  }
  entries.innerHTML = html;
}

function _makeOverlayEl(id, extra = {}) {
  const el = document.createElement('div');
  el.id = id;
  Object.assign(el.style, {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)',
    padding: '8px 16px', background: 'rgba(20,16,12,0.76)', color: '#f3ead9',
    fontFamily: 'inherit', fontSize: '14px', borderRadius: '9px',
    letterSpacing: '0.02em', opacity: '0', transition: 'opacity 0.22s',
    pointerEvents: 'none', zIndex: '50', ...extra
  });
  return el;
}
