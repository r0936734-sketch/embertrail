// quests.js — a small bounty/challenge tracker fed by archery + hunting events.
// Completing a bounty rewards arrows and shows a toast.
export function createQuests({ inventory, onComplete = () => {} }) {
  const bounties = [
    { id: 'first-blood', text: 'Take your first game animal', need: 1, type: 'kill', reward: { arrow: 5 } },
    { id: 'marksman', text: 'Hit 5 bullseyes at the range', need: 5, type: 'bullseye', reward: { arrow: 8 } },
    { id: 'larder', text: 'Gather 10 meat for the cabin larder', need: 10, type: 'meat', reward: { arrow: 10, herb: 2 } },
    { id: 'boar-hunter', text: 'Bring down 2 boar', need: 2, type: 'kill:boar', reward: { arrow: 12, hide: 1 } },
    { id: 'fletcher', text: 'Craft arrows 3 times', need: 3, type: 'craft', reward: { feather: 4, branch: 6 } }
  ].map(b => ({ ...b, done: 0, complete: false }));

  const panel = document.createElement('div');
  panel.className = 'activity-panel quest-panel';
  Object.assign(panel.style, {
    position: 'fixed', right: '18px', top: '150px', width: '228px', zIndex: 13,
    background: 'rgba(15,18,26,0.58)', backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    padding: '10px 13px', color: '#e9edf5', fontSize: '11.5px', lineHeight: '1.55',
    pointerEvents: 'none', transition: 'opacity .25s'
  });
  document.body.appendChild(panel);
  let open = !(window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

  function render() {
    panel.style.opacity = open ? '1' : '0';
    panel.innerHTML =
      `<div style="opacity:.55;font-size:9px;letter-spacing:2px;margin-bottom:5px">BOUNTIES — J</div>` +
      bounties.map(b => `<div style="opacity:${b.complete ? 0.45 : 1};margin-bottom:3px">
        ${b.complete ? '✔' : '▢'} ${b.text}
        <span style="float:right;opacity:.7">${Math.min(b.done, b.need)}/${b.need}</span></div>`).join('');
  }
  render();

  function toast(text) {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed', left: '50%', top: '42%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.82)', color: '#f6ecd8', padding: '12px 22px',
      borderRadius: '10px', fontSize: '14px', zIndex: 60, opacity: '0',
      transition: 'opacity .5s', textAlign: 'center', maxWidth: '70vw'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }, 3600);
  }

  function progress(type, amount = 1) {
    let changed = false;
    for (const b of bounties) {
      if (b.complete || b.type !== type) continue;
      b.done += amount;
      changed = true;
      if (b.done >= b.need) {
        b.complete = true;
        Object.entries(b.reward).forEach(([k, v]) => inventory.add(k, v));
        const rewardText = Object.entries(b.reward).map(([k, v]) => `${v} ${k}`).join(', ');
        toast(`🏅 Bounty complete — ${b.text}\nReward: ${rewardText}`);
        onComplete(b);
      }
    }
    if (changed) render();
  }

  // wire this to archery/hunting events
  function handleEvent(type, data = {}) {
    if (type === 'bullseye') progress('bullseye');
    if (type === 'kill') {
      progress('kill');
      progress(`kill:${data.type}`);
      if (data.loot && data.loot.meat) progress('meat', data.loot.meat);
    }
    if (type === 'craft') progress('craft');
  }

  let prevJ = false;
  function update(_dt, keys) {
    const j = !!keys['j'];
    if (j && !prevJ) { open = !open; render(); }
    prevJ = j;
  }

  return { handleEvent, progress, update, bounties, toast };
}
