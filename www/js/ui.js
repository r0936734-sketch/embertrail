export function createUI(player, landmarkPois = [], onDiscoverEvent = () => {}, onWaypointChange = () => {}) {
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

  // Camp locations and landmark POIs share one discovery system.
  const localPois = [
    { name: 'Camp by the Embers', x: 0, z: 0, r: 9, flavor: 'Warm firelight. The valley begins here.' },
    { name: 'The Blossom Grove', x: -34, z: 24, r: 18, flavor: 'Petals drift on the wind. A quiet place to rest.' },
    { name: 'Cabins at Trail’s End', x: 19, z: 11, r: 11, flavor: 'Smoke rises from the chimneys. Someone still lives here.' },
    { name: 'Sunveil Ridge', x: 95, z: -72, r: 18, flavor: 'The summit. Mist parts. The whole trail lies below.' },
    { name: 'Northern Pines', x: -55, z: -30, r: 14, flavor: 'Tall dark pines. The deer watch from the shadows.' },
    { name: 'Eastern Meadow', x: 48, z: 28, r: 13, flavor: 'Open grass. Rabbits scatter at the sound of hooves.' }
  ];
  const pois = [
    ...localPois,
    ...landmarkPois.map(p => ({
      name: p.name,
      x: p.pos.x,
      z: p.pos.z,
      r: p.r,
      flavor: p.flavor,
      onDiscover: p.onDiscover
    }))
  ];

  let currentPOI = null;
  let flavorTimer = 0;
  const discovered = new Set();
  const firedEvents = new Set();
  const transientTracker = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  // A small DOM map keeps navigation useful without adding another canvas or render pass.
  let mapOpen = false;
  let mapOpenedAt = -Infinity;
  let waypoint = null;
  const mapBackdrop = document.createElement('div');
  Object.assign(mapBackdrop.style, {
    position: 'fixed', inset: '0', display: 'none', zIndex: '118',
    background: 'rgba(4, 8, 13, 0.58)', backdropFilter: 'blur(3px)'
  });
  const mapPanel = document.createElement('section');
  Object.assign(mapPanel.style, {
    position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    width: 'min(560px, 90vw)', maxHeight: '72vh', overflowY: 'auto', display: 'none',
    zIndex: '119', padding: '18px', boxSizing: 'border-box', borderRadius: '14px',
    background: 'rgba(13, 19, 28, 0.96)', border: '1px solid rgba(234, 199, 124, 0.45)',
    boxShadow: '0 16px 48px rgba(0,0,0,0.42)', color: '#f5eddc', fontFamily: 'inherit'
  });
  const waypointReadout = document.createElement('div');
  Object.assign(waypointReadout.style, {
    position: 'fixed', left: '50%', top: '12%', transform: 'translateX(-50%)', display: 'none',
    zIndex: '16', maxWidth: '72vw', padding: '7px 12px', borderRadius: '14px',
    background: 'rgba(28, 21, 13, 0.76)', border: '1px solid rgba(255, 211, 94, 0.42)',
    color: '#ffe2a2', fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em',
    textTransform: 'uppercase', pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  });
  const mapToggle = document.createElement('button');
  mapToggle.type = 'button';
  mapToggle.textContent = 'MAP';
  Object.assign(mapToggle.style, {
    position: 'fixed', left: '20px', top: '102px', display: transientTracker ? 'none' : 'block',
    zIndex: '15', padding: '8px 11px', borderRadius: '8px', cursor: 'pointer',
    border: '1px solid rgba(226, 236, 248, 0.28)', background: 'rgba(12, 18, 27, 0.76)',
    color: '#edf4fc', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em'
  });
  document.body.append(mapBackdrop, mapPanel, waypointReadout, mapToggle);

  function renderMap() {
    const selectedName = waypoint?.name;
    mapPanel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div><div style="font-size:11px;letter-spacing:.16em;color:#edcd89">TRAIL MAP</div><div style="font-size:13px;opacity:.72;margin-top:4px">Choose a place to set a trail pin.</div></div>
        <button type="button" data-map-close style="padding:7px 10px;border:1px solid rgba(255,255,255,.22);border-radius:7px;background:rgba(255,255,255,.06);color:#fff;cursor:pointer">CLOSE</button>
      </div>
      <div style="height:1px;background:rgba(255,255,255,.12);margin:12px 0"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px">
        ${pois.map((p, index) => `<button type="button" data-waypoint="${index}" style="text-align:left;padding:10px;border-radius:8px;cursor:pointer;color:${selectedName === p.name ? '#ffe2a2' : '#edf4fc'};border:1px solid ${selectedName === p.name ? 'rgba(255,211,94,.72)' : 'rgba(255,255,255,.16)'};background:${selectedName === p.name ? 'rgba(130,90,25,.34)' : 'rgba(255,255,255,.045)'}"><span style="display:block;font-size:12px;font-weight:700">${selectedName === p.name ? '◆ ' : ''}${p.name}</span><span style="display:block;margin-top:3px;font-size:10px;opacity:.66">${Math.round(p.x)}, ${Math.round(p.z)}</span></button>`).join('')}
      </div>
      <button type="button" data-waypoint-clear style="margin-top:13px;padding:8px 11px;border:1px solid rgba(255,255,255,.2);border-radius:7px;background:transparent;color:#cbd6e5;cursor:pointer">CLEAR PIN</button>`;
    mapPanel.querySelector('[data-map-close]').addEventListener('click', () => toggleMap(false));
    mapPanel.querySelector('[data-waypoint-clear]').addEventListener('click', () => {
      setWaypoint(null);
      toggleMap(false);
    });
    mapPanel.querySelectorAll('[data-waypoint]').forEach(button => {
      button.addEventListener('click', () => {
        setWaypoint(pois[Number(button.dataset.waypoint)]);
        toggleMap(false);
      });
    });
  }

  function setWaypoint(point) {
    waypoint = point ? { name: point.name, x: point.x, z: point.z } : null;
    onWaypointChange(waypoint);
    if (mapOpen) renderMap();
  }

  function setWaypointByName(name) {
    const wanted = String(name || '').toLowerCase();
    const point = pois.find(p => p.name.toLowerCase() === wanted) || pois.find(p => p.name.toLowerCase().includes(wanted));
    if (point) setWaypoint(point);
    return !!point;
  }

  function toggleMap(show = !mapOpen) {
    mapOpen = !!show;
    if (mapOpen) mapOpenedAt = performance.now();
    mapBackdrop.style.display = mapOpen ? 'block' : 'none';
    mapPanel.style.display = mapOpen ? 'block' : 'none';
    if (mapOpen) renderMap();
  }
  mapToggle.addEventListener('click', () => toggleMap());
  mapBackdrop.addEventListener('click', event => {
    // The activity button can disappear while its touch is still down. Its
    // compatibility click would then land on this backdrop and close the map.
    if (performance.now() - mapOpenedAt < 350) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    toggleMap(false);
  });
  window.addEventListener('keydown', event => {
    const typing = event.target instanceof Element && event.target.matches('input, textarea, select');
    if (event.key.toLowerCase() === 'm' && !event.repeat && !typing) {
      event.preventDefault();
      toggleMap();
    }
  });

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
        discovered.add(found.name);
        if (!firedEvents.has('poi:' + found.name)) {
          firedEvents.add('poi:' + found.name);
          onDiscoverEvent('poi:' + found.name);
        }
        if (found.onDiscover && !firedEvents.has(found.onDiscover)) {
          firedEvents.add(found.onDiscover);
          onDiscoverEvent(found.onDiscover);
        }
        el.textContent = found.name;
        el.style.opacity = '1';
        fl.textContent = found.flavor || '';
        fl.style.opacity = '1';
        flavorTimer = 5.5;
        refreshTracker();
        revealTracker();
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

  const trackerEl = document.createElement('div');
  trackerEl.id = 'progressTracker';
  Object.assign(trackerEl.style, {
    position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)',
    padding: '10px 14px', background: 'rgba(15,18,26,0.5)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    color: '#fff', fontSize: '11px', letterSpacing: '0.04em', lineHeight: '1.8',
    zIndex: '10', pointerEvents: 'none', opacity: transientTracker ? '0' : '0.9',
    transition: 'opacity 0.35s ease'
  });
  document.body.appendChild(trackerEl);

  let lastSpeciesFound = 0;
  let lastSpeciesTotal = 0;
  let trackerTimer = 0;
  function revealTracker() {
    if (!transientTracker) return;
    trackerTimer = 4.2;
    trackerEl.style.opacity = '0.94';
  }
  function refreshTracker() {
    trackerEl.innerHTML =
      '<div style="opacity:0.6;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:2px">Places found</div>' +
      `<div style="font-weight:700;font-size:14px;margin-bottom:6px">${discovered.size} / ${pois.length}</div>` +
      (lastSpeciesTotal > 0
        ? '<div style="opacity:0.6;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:2px">Species observed</div>' +
          `<div style="font-weight:700;font-size:14px">${lastSpeciesFound} / ${lastSpeciesTotal}</div>`
        : '');
  }
  refreshTracker();

  let frameAccum = 0;
  let frameTimer = 0;

  function update(dt, player, climate, speciesProgress, sampledFps = null) {
    updateCompass(player.heading);
    const activePos = player.position;
    updatePOI(dt, activePos);

    if (waypoint) {
      const distance = Math.hypot(activePos.x - waypoint.x, activePos.z - waypoint.z);
      waypointReadout.textContent = `PIN: ${waypoint.name} · ${Math.round(distance)}m`;
      waypointReadout.style.display = 'block';
    } else {
      waypointReadout.style.display = 'none';
    }

    if (speciesProgress && (speciesProgress.found !== lastSpeciesFound || speciesProgress.total !== lastSpeciesTotal)) {
      lastSpeciesFound = speciesProgress.found;
      lastSpeciesTotal = speciesProgress.total;
      refreshTracker();
      revealTracker();
    }

    if (transientTracker && trackerTimer > 0) {
      trackerTimer -= dt;
      if (trackerTimer <= 0) trackerEl.style.opacity = '0';
    }

    const hh = Math.floor(climate.gameMinutes / 60);
    const mm = Math.floor(climate.gameMinutes % 60);
    clockEl.textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    speedEl.textContent = Math.round(Math.abs(player.speed) * 3.6);
    gaitEl.textContent = player.gaitName;

    const pct = Math.round(player.stamina);
    staminaFill.style.width = pct + '%';
    staminaFill.style.background = pct > 50 ? '#6fdc8c' : pct > 20 ? '#e0c15a' : '#e0685a';

    if (Number.isFinite(sampledFps)) {
      fpsEl.textContent = Math.round(sampledFps) + ' fps';
    } else {
      frameAccum++;
      frameTimer += dt;
      if (frameTimer >= 0.5) {
        fpsEl.textContent = Math.round(frameAccum / frameTimer) + ' fps';
        frameAccum = 0;
        frameTimer = 0;
      }
    }
  }

  return {
    update,
    toggleMap,
    setWaypointByName,
    clearWaypoint() { setWaypoint(null); },
    get discoveredCount() { return discovered.size; },
    get totalPois() { return pois.length; },
    isDiscovered(name) { return discovered.has(name); }
  };
}
