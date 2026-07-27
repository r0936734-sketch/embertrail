export function createUI(player) {
  const clockEl = document.getElementById('clockEl');
  const speedEl = document.getElementById('speedEl');
  const fpsEl = document.getElementById('fpsEl');
  const gaitEl = document.getElementById('gaitEl');
  const staminaFill = document.getElementById('staminaFill');

  // compass
  const compassWrap = document.getElementById('compassWrap');
  const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const compassSpans = [];
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    compassWrap.appendChild(s);
    compassSpans.push(s);
  }
  let compassCenterX = 130;
  let compassSpanW = 65;

  function recalcCompassLayout() {
    compassCenterX = compassWrap.clientWidth / 2;
    compassSpanW = compassWrap.clientWidth / 4;
    compassSpans.forEach(s => { s.style.width = compassSpanW + 'px'; });
  }
  recalcCompassLayout();
  window.addEventListener('resize', recalcCompassLayout);

  function updateCompass(headingRad) {
    let deg = headingRad * 180 / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    const exact = deg / 45;
    const base = Math.floor(exact);
    const activeIdx = Math.round(exact);

    for (let k = 0; k < 7; k++) {
      const i = base - 3 + k;
      const label = compassDirs[((i % 8) + 8) % 8];
      const x = compassCenterX + (i - exact) * compassSpanW - compassSpanW / 2;
      const span = compassSpans[k];
      span.textContent = label;
      span.style.left = x + 'px';
      if (i === activeIdx) {
        span.style.opacity = '1';
        span.style.fontWeight = '700';
        span.style.color = '#ffffff';
      } else {
        span.style.opacity = '0.5';
        span.style.fontWeight = '400';
        span.style.color = '#c7cedb';
      }
    }
  }

  // POIs
  const pois = [
    { name: 'Camp by the Embers', x: 0, z: 0, r: 9, flavor: 'Warm firelight. The valley begins here.' },
    { name: 'The Blossom Grove', x: -34, z: 24, r: 18, flavor: 'Petals drift on the wind. A quiet place to rest.' },
    { name: 'Cabins at Trail’s End', x: 19, z: 11, r: 11, flavor: 'Smoke rises from the chimneys. Someone still lives here.' },
    { name: 'Sunveil Ridge', x: 95, z: -72, r: 18, flavor: 'The summit. Mist parts. The whole trail lies below.' },
    { name: 'Northern Pines', x: -55, z: -30, r: 14, flavor: 'Tall dark pines. The deer watch from the shadows.' },
    { name: 'Eastern Meadow', x: 48, z: 28, r: 13, flavor: 'Open grass. Rabbits scatter at the sound of hooves.' }
  ];

  let currentPOI = null;
  let flavorTimer = 0;

  function updatePOI(dt, playerPos) {
    let found = null;
    for (const p of pois) {
      const dx = playerPos.x - p.x;
      const dz = playerPos.z - p.z;
      if (Math.sqrt(dx * dx + dz * dz) < p.r) {
        found = p;
        break;
      }
    }
    if (found !== currentPOI) {
      currentPOI = found;
      const el = document.getElementById('poiCaption');
      const fl = document.getElementById('flavorText');
      if (found) {
        el.textContent = found.name;
        el.style.opacity = '1';
        fl.textContent = found.flavor || '';
        fl.style.opacity = '1';
        flavorTimer = 5.5;
      } else {
        el.style.opacity = '0';
        fl.style.opacity = '0';
      }
    }
    if (flavorTimer > 0) {
      flavorTimer -= dt;
      if (flavorTimer <= 0) {
        document.getElementById('flavorText').style.opacity = '0';
      }
    }
  }

  let frameAccum = 0;
  let frameTimer = 0;

  function update(dt, player, climate) {
    updateCompass(player.heading);
    updatePOI(dt, player.group.position);

    const hh = Math.floor(climate.gameMinutes / 60);
    const mm = Math.floor(climate.gameMinutes % 60);
    clockEl.textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    speedEl.textContent = Math.round(Math.abs(player.speed) * 3.6);
    gaitEl.textContent = player.gaitName;

    const pct = Math.round(player.stamina);
    staminaFill.style.width = pct + '%';
    staminaFill.style.background = pct > 50 ? '#6fdc8c' : pct > 20 ? '#e0c15a' : '#e0685a';

    frameAccum++;
    frameTimer += dt;
    if (frameTimer >= 0.5) {
      fpsEl.textContent = Math.round(frameAccum / frameTimer) + ' fps';
      frameAccum = 0;
      frameTimer = 0;
    }
  }

  return { update };
}