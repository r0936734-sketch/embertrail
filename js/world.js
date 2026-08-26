// Open-world settlements, NPCs, and story interactions.
// Talk with E while standing near a character (mount/cabin still win if closer).

import { distSq } from './perf.js';

export function createWorld(scene, terrainHeight, collision, { inventory, onEvent = () => {} } = {}) {
  const dummy = new THREE.Object3D();
  const poiList = [];
  const npcs = [];
  const props = [];

  const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2c, flatShading: true });
  const darkWood = new THREE.MeshLambertMaterial({ color: 0x3a2616, flatShading: true });
  const plaster = new THREE.MeshLambertMaterial({ color: 0xcbb89a, flatShading: true });
  const thatch = new THREE.MeshLambertMaterial({ color: 0x8a6a38, flatShading: true });
  const stone = new THREE.MeshLambertMaterial({ color: 0x8a8278, flatShading: true });
  const cloth = new THREE.MeshLambertMaterial({ color: 0x6b3a2a, flatShading: true });
  const sail = new THREE.MeshLambertMaterial({ color: 0xd8c9a4, flatShading: true });
  const water = new THREE.MeshLambertMaterial({
    color: 0x4a9ec0, transparent: true, opacity: 0.72, flatShading: true
  });

  function addPoi(name, x, z, r, flavor) {
    poiList.push({ name, pos: { x, z }, r, flavor });
  }

  function placeY(x, z) {
    return terrainHeight(x, z);
  }

  function hut(x, z, w, d, h, yaw = 0) {
    const g = new THREE.Group();
    const y = placeY(x, z);
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plaster);
    body.position.y = h * 0.5;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.55, 4), thatch);
    roof.position.y = h + h * 0.18;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.35, 0.08), darkWood);
    door.position.set(0, 0.7, d * 0.5 + 0.02);
    g.add(door);
    scene.add(g);
    if (collision) collision.addCollider(x, z, Math.max(w, d) * 0.42);
    props.push(g);
    return g;
  }

  function stall(x, z, yaw) {
    const g = new THREE.Group();
    g.position.set(x, placeY(x, z), z);
    g.rotation.y = yaw;
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), wood);
    table.position.y = 0.85;
    g.add(table);
    const clothM = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.04, 0.95), cloth);
    clothM.position.y = 0.93;
    g.add(clothM);
    [-0.95, 0.95].forEach(sx => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.7, 4), darkWood);
      post.position.set(sx, 0.85, -0.4);
      g.add(post);
    });
    scene.add(g);
    props.push(g);
  }

  function makePerson(palette, scale = 1) {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: palette.skin, flatShading: true });
    const shirt = new THREE.MeshLambertMaterial({ color: palette.shirt, flatShading: true });
    const pants = new THREE.MeshLambertMaterial({ color: palette.pants, flatShading: true });
    const hair = new THREE.MeshLambertMaterial({ color: palette.hair, flatShading: true });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.28), shirt);
    torso.position.y = 1.18;
    g.add(torso);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.24), pants);
    legs.position.y = 0.62;
    g.add(legs);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.26), skin);
    head.position.y = 1.62;
    g.add(head);
    const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.28), hair);
    hairM.position.y = 1.78;
    g.add(hairM);
    g.scale.setScalar(scale);
    g.userData.head = head;
    return g;
  }

  function addNpc(cfg) {
    const mesh = makePerson(cfg.palette, cfg.scale || 1);
    const y = placeY(cfg.x, cfg.z);
    mesh.position.set(cfg.x, y, cfg.z);
    mesh.rotation.y = cfg.yaw || 0;
    scene.add(mesh);
    const npc = {
      ...cfg,
      mesh,
      home: { x: cfg.x, z: cfg.z },
      heading: cfg.yaw || 0,
      wanderT: 1 + Math.random() * 4,
      talkIndex: 0,
      given: false
    };
    npcs.push(npc);
    return npc;
  }

  // ---------- Emberford village ----------
  const V = { x: -148, z: 48 };
  addPoi('Emberford', V.x, V.z, 28,
    'Lanterns hang from eaves. Mira keeps the last warm inn on the trail.');
  hut(V.x - 6, V.z + 4, 5.2, 4.4, 3.1, 0.2);
  hut(V.x + 8, V.z - 2, 4.4, 4.0, 2.8, -0.4);
  hut(V.x + 2, V.z + 12, 4.8, 3.8, 2.7, 0.9);
  hut(V.x - 12, V.z - 8, 3.8, 3.6, 2.5, 0.1);
  stall(V.x + 1, V.z + 1, 0.4);
  stall(V.x - 3, V.z - 6, -0.8);

  const well = new THREE.Group();
  well.position.set(V.x - 1, placeY(V.x - 1, V.z + 2), V.z + 2);
  well.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.7, 10), stone));
  const wellWater = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), water);
  wellWater.rotation.x = -Math.PI / 2;
  wellWater.position.y = 0.28;
  well.add(wellWater);
  scene.add(well);
  if (collision) collision.addCollider(V.x - 1, V.z + 2, 1.15);

  addNpc({
    id: 'mira',
    name: 'Mira',
    title: 'Innkeeper',
    x: V.x + 0.5, z: V.z + 5.5, yaw: 0.2,
    palette: { skin: 0xe8c4a8, shirt: 0x8b2e2e, pants: 0x2c2430, hair: 0x3a2218 },
    lines: [
      'Rider. The valley forgets its own name when the hearths go cold.',
      'I keep Emberford\'s inn, but the signal fire on the ridge has been dead for seasons.',
      'Take this letter to the hermit by Hidden Falls. He still remembers the old route.',
      'When the beacon burns again, bring me an ember. We will light the village hearth together.'
    ]
  });

  addNpc({
    id: 'pip',
    name: 'Pip',
    title: 'Runner',
    x: V.x + 6, z: V.z + 8, yaw: -1.2, scale: 0.78,
    palette: { skin: 0xf0d0b0, shirt: 0x3d6b8a, pants: 0x4a3a28, hair: 0x6b3a18 },
    lines: [
      'You\'re the rider! Mira said someone would come.',
      'If you see nightberries near the hermit\'s camp, bring me one? I trade stories.',
      'East of here the lantern market glows even in rain. West is the abbey. Don\'t get lost.'
    ]
  });

  addNpc({
    id: 'hal',
    name: 'Hal',
    title: 'Miller',
    x: V.x - 8, z: V.z - 2, yaw: 1.1,
    palette: { skin: 0xd4b08c, shirt: 0xc4b48a, pants: 0x3a342c, hair: 0xb8b0a4 },
    lines: [
      'The old mill on the hill still has locked sails. A good shot wakes them.',
      'Grain, wind, and patience. Same as a long ride.',
      'If you hunt, leave a little meat for the inn. Mira feeds whoever still walks the trail.'
    ]
  });

  // ---------- Saltmarsh docks ----------
  const D = { x: 38, z: 178 };
  addPoi('Saltmarsh Docks', D.x, D.z, 22,
    'Weathered piers lean into a wide water. Kael swears the trout remember the stars.');
  const pier = new THREE.Mesh(new THREE.BoxGeometry(14, 0.28, 3.2), wood);
  pier.position.set(D.x, placeY(D.x, D.z) + 0.2, D.z);
  scene.add(pier);
  const harbor = new THREE.Mesh(new THREE.CircleGeometry(16, 20), water);
  harbor.rotation.x = -Math.PI / 2;
  harbor.position.set(D.x + 8, placeY(D.x, D.z) + 0.04, D.z + 10);
  scene.add(harbor);
  const boat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 1.4), darkWood);
  boat.position.set(D.x + 10, placeY(D.x, D.z) + 0.35, D.z + 8);
  scene.add(boat);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 5), wood);
  mast.position.set(D.x + 10, placeY(D.x, D.z) + 2.1, D.z + 8);
  scene.add(mast);
  const sailM = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), sail);
  sailM.position.set(D.x + 10.6, placeY(D.x, D.z) + 2.0, D.z + 8);
  scene.add(sailM);
  if (collision) collision.addCollider(D.x, D.z, 2.4);

  addNpc({
    id: 'kael',
    name: 'Kael',
    title: 'Fisher',
    x: D.x - 2, z: D.z - 1.5, yaw: 2.4,
    palette: { skin: 0xc9a07a, shirt: 0x2f5d6e, pants: 0x243038, hair: 0x1c1814 },
    lines: [
      'The millpond inland is kinder than this marsh. Cast a line. Wait.',
      'A trout for Sister Wren and she\'ll bless your road. She\'s at the Quiet Abbey, southwest.',
      'Nights here, the water holds the constellations longer than the sky.'
    ]
  });

  // ---------- Quiet Abbey ----------
  const A = { x: -188, z: 132 };
  addPoi('The Quiet Abbey', A.x, A.z, 20,
    'A low stone chapel. Sister Wren keeps a lamp that never quite goes out.');
  const abbey = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 5.5), stone);
  abbey.position.set(A.x, placeY(A.x, A.z) + 2.1, A.z);
  scene.add(abbey);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 4), darkWood);
  spire.position.set(A.x, placeY(A.x, A.z) + 6.4, A.z);
  scene.add(spire);
  if (collision) collision.addCollider(A.x, A.z, 3.4);

  addNpc({
    id: 'wren',
    name: 'Sister Wren',
    title: 'Abbess',
    x: A.x + 4.2, z: A.z + 3, yaw: -0.6,
    palette: { skin: 0xead4c0, shirt: 0xe8e0d4, pants: 0xe8e0d4, hair: 0xcfc8bc },
    lines: [
      'Peace, rider. Hunger makes a hard trail of even kind people.',
      'Bring a fish from the millpond or the docks. We share what we have.',
      'When you have named a star-path, the night will feel less empty. Look up. Press L.'
    ]
  });

  // ---------- Lantern Market ----------
  const M = { x: 168, z: 148 };
  addPoi('Lantern Market', M.x, M.z, 22,
    'Paper lamps and spice smoke. Traders come here when the seasons turn.');
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    stall(M.x + Math.cos(ang) * 8, M.z + Math.sin(ang) * 8, ang + Math.PI);
  }
  hut(M.x + 12, M.z - 4, 4.2, 3.6, 2.6, 0.3);

  addNpc({
    id: 'nara',
    name: 'Nara',
    title: 'Lantern-seller',
    x: M.x, z: M.z + 2, yaw: 3.0,
    palette: { skin: 0xc89068, shirt: 0xd9782a, pants: 0x3a2a22, hair: 0x1a1210 },
    lines: [
      'A lantern for the Ashen Ruins, east of here. The scholar Ash lost theirs in the collapse.',
      'Markets remember every rider who paid in stories instead of coin.',
      'If you craft arrows, I\'ll take feathers. The lamps need wicks.'
    ]
  });

  // ---------- Ashen Ruins ----------
  const R = { x: 214, z: -52 };
  addPoi('Ashen Ruins', R.x, R.z, 24,
    'Broken arches and a scholar who will not leave the stones.');
  for (let i = 0; i < 6; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 3.8 + (i % 3), 6), stone);
    const ang = (i / 6) * Math.PI * 2;
    col.position.set(R.x + Math.cos(ang) * 7, placeY(R.x, R.z) + 1.9, R.z + Math.sin(ang) * 7);
    col.rotation.z = (i % 2) * 0.18;
    scene.add(col);
    if (collision) collision.addCollider(col.position.x, col.position.z, 0.6);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 6, 10, Math.PI), stone);
  arch.position.set(R.x, placeY(R.x, R.z) + 3.4, R.z);
  arch.rotation.z = Math.PI;
  scene.add(arch);

  addNpc({
    id: 'ash',
    name: 'Ash',
    title: 'Ruin-scholar',
    x: R.x + 3, z: R.z - 2, yaw: 2.1,
    palette: { skin: 0xd8c0a8, shirt: 0x4a5560, pants: 0x2c3038, hair: 0x8a7a68 },
    lines: [
      'These stones were a beacon-house, older than Emberford.',
      'Take the lost lantern. Mira can hang it in the inn when you return the last ember.',
      'The mystic stone in the meadow still answers a well-aimed arrow. Proof the old craft lives.'
    ]
  });

  // ---------- Skywatch ----------
  const S = { x: 52, z: -188 };
  addPoi('Skywatch Observatory', S.x, S.z, 18,
    'A ring of standing stones. Ivo maps the night as if it were a trail.');
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const menhir = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.8 + (i % 3) * 0.4, 0.45), stone);
    menhir.position.set(S.x + Math.cos(ang) * 7.5, placeY(S.x, S.z) + 1.5, S.z + Math.sin(ang) * 7.5);
    scene.add(menhir);
    if (collision) collision.addCollider(menhir.position.x, menhir.position.z, 0.5);
  }
  addNpc({
    id: 'ivo',
    name: 'Ivo',
    title: 'Stargazer',
    x: S.x, z: S.z + 1, yaw: 0,
    palette: { skin: 0xe6d2bc, shirt: 0x2a3350, pants: 0x1c1c28, hair: 0xeeeeee },
    lines: [
      'Look up on a clear night. The Wanderer, Ember\'s Bow, the Quiet Doe, Riverline.',
      'Hold L when a path of stars sits in your sight. Naming them keeps the dark honest.',
      'From here you can see Sunveil Ridge. The whole living trail is a sentence. Ride the rest of it.'
    ]
  });

  // ---------- Wolfhollow cave ----------
  const C = { x: -176, z: -128 };
  addPoi('Wolfhollow', C.x, C.z, 18,
    'A dark mouth in the ridge. Tracks braid the snow even in summer.');
  const cave = new THREE.Mesh(new THREE.SphereGeometry(4.2, 8, 6, 0, Math.PI), darkWood);
  cave.position.set(C.x, placeY(C.x, C.z) + 1.6, C.z);
  cave.rotation.y = 0.6;
  scene.add(cave);
  if (collision) collision.addCollider(C.x, C.z, 3.2);
  addNpc({
    id: 'fen',
    name: 'Fen',
    title: 'Tracker',
    x: C.x + 6, z: C.z + 3, yaw: -0.4,
    palette: { skin: 0xb89474, shirt: 0x4a3c32, pants: 0x2a241e, hair: 0x2a2018 },
    lines: [
      'Wolves own this hollow. Give them room, or give them an arrow. Your choice.',
      'Boar root the eastern meadow. Bear sometimes crosses the far pines.',
      'A rider who listens lasts longer than a rider who gallops blind.'
    ]
  });

  // ---------- East Glade shrine ----------
  const G = { x: 118, z: 22 };
  addPoi('East Glade Shrine', G.x, G.z, 14,
    'A ring of mossy stones. Offerings of herbs still appear overnight.');
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), stone);
    rock.position.set(G.x + Math.cos(ang) * 5, placeY(G.x, G.z) + 0.4, G.z + Math.sin(ang) * 5);
    scene.add(rock);
  }

  // ---------- dialogue UI ----------
  const panel = document.createElement('div');
  panel.id = 'dialoguePanel';
  Object.assign(panel.style, {
    position: 'fixed', left: '50%', bottom: '18%', transform: 'translateX(-50%)',
    width: 'min(520px, 86vw)', zIndex: '70', display: 'none',
    background: 'rgba(12,14,20,0.9)', border: '1px solid rgba(217,183,121,0.35)',
    borderRadius: '14px', padding: '14px 16px', color: '#f3ead9',
    fontFamily: 'inherit', pointerEvents: 'auto', backdropFilter: 'blur(8px)'
  });
  panel.innerHTML = `
    <div id="dlgName" style="font-size:11px;letter-spacing:2px;color:#d9b779;margin-bottom:6px"></div>
    <div id="dlgText" style="font-size:15px;line-height:1.45"></div>
    <div style="margin-top:10px;opacity:.65;font-size:11px">E / ACTION — continue &nbsp;·&nbsp; Esc — close</div>`;
  document.body.appendChild(panel);

  const prompt = document.createElement('div');
  prompt.className = 'context-prompt';
  prompt.dataset.mobileKey = 'e';
  Object.assign(prompt.style, {
    position: 'fixed', left: '50%', bottom: '22%', transform: 'translateX(-50%)',
    background: 'rgba(12,15,22,0.72)', border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: '10px', padding: '9px 18px', color: '#f2f5ff', fontSize: '13px',
    zIndex: 13, opacity: '0', transition: 'opacity 0.18s', pointerEvents: 'none'
  });
  document.body.appendChild(prompt);

  let talking = null;
  let nearest = null;

  function grantStoryItems(npc) {
    if (npc.given) return;
    if (npc.id === 'mira') {
      inventory.add('letter', 1);
      onEvent('talk', { id: 'mira', item: 'letter' });
      npc.given = true;
      return 'Mira presses a sealed letter into your hands.';
    }
    if (npc.id === 'ash') {
      inventory.add('lantern', 1);
      onEvent('talk', { id: 'ash', item: 'lantern' });
      npc.given = true;
      return 'Ash gives you a battered bronze lantern, still faintly warm.';
    }
    onEvent('talk', { id: npc.id });
    return null;
  }

  function showLine(npc) {
    talking = npc;
    panel.style.display = 'block';
    document.getElementById('dlgName').textContent = `${npc.name.toUpperCase()}  ·  ${npc.title}`;
    const line = npc.lines[Math.min(npc.talkIndex, npc.lines.length - 1)];
    const extra = grantStoryItems(npc);
    document.getElementById('dlgText').textContent = extra ? `${line}\n\n${extra}` : line;
    npc.talkIndex = Math.min(npc.talkIndex + 1, npc.lines.length - 1);
    onEvent('talk', { id: npc.id });
  }

  function closeTalk() {
    talking = null;
    panel.style.display = 'none';
  }

  function tryInteract(player) {
    if (talking) {
      if (talking.talkIndex >= talking.lines.length - 1) closeTalk();
      else showLine(talking);
      return true;
    }
    if (!nearest) return false;
    showLine(nearest);
    return true;
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && talking) closeTalk();
  });

  function update(dt, elapsed, playerPos, keys) {
    nearest = null;
    let best = 3.6 * 3.6;
    for (const n of npcs) {
      const d2 = distSq(playerPos.x, playerPos.z, n.mesh.position.x, n.mesh.position.z);
      const far = d2 > 140 * 140;
      n.mesh.visible = !far;
      if (far) continue;
      n.wanderT -= dt;
      if (n.wanderT <= 0 && !talking) {
        n.heading += (Math.random() - 0.5) * 1.2;
        n.wanderT = 2 + Math.random() * 4;
      }
      if (!talking) {
        n.mesh.rotation.y += (n.heading - n.mesh.rotation.y) * Math.min(1, dt * 2);
        n.mesh.position.y = placeY(n.mesh.position.x, n.mesh.position.z);
        if (n.mesh.userData.head) {
          n.mesh.userData.head.rotation.y = Math.sin(elapsed * 1.4 + n.x) * 0.08;
        }
      }
      if (d2 < best) {
        best = d2;
        nearest = n;
      }
    }

    if (talking) {
      prompt.style.opacity = '0';
      return;
    }
    if (nearest) {
      prompt.textContent = `Talk to ${nearest.name} (E)`;
      prompt.style.opacity = '1';
    } else {
      prompt.style.opacity = '0';
    }
  }

  return {
    poiList,
    npcs,
    update,
    tryInteract,
    get isTalking() { return !!talking; },
    closeTalk
  };
}
