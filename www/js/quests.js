// quests.js — a small bounty/challenge tracker fed by archery + hunting events.
// Completing a bounty rewards arrows and shows a toast.
export function createQuests({ inventory, onComplete = () => {} }) {
  const bounties = [
    { id: 'first-blood', text: 'Take your first game animal',       need: 1,  type: 'kill',      reward: { arrow: 5 } },
    { id: 'marksman',    text: 'Hit 5 bullseyes at the range',       need: 5,  type: 'bullseye',  reward: { arrow: 8 } },
    { id: 'larder',      text: 'Gather 10 meat for the cabin larder',need: 10, type: 'meat',      reward: { arrow: 10, herb: 2 } },
    { id: 'boar-hunter', text: 'Bring down 2 boar',                  need: 2,  type: 'kill:boar', reward: { arrow: 12, hide: 1 } },
    { id: 'fletcher',    text: 'Craft arrows 3 times',               need: 3,  type: 'craft',     reward: { feather: 4, branch: 6 } }
  ].map(b => ({ ...b, done: 0, complete: false }));

  const isMobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const chapters = [
    { title: 'Chapter 1 · First Tracks', objective: 'Take your first game animal', type: 'kill', need: 1, reward: { arrow: 3 } },
    { title: 'Chapter 2 · A Steady Hand', objective: 'Land 5 bullseyes at the range', type: 'bullseye', need: 5, reward: { arrow: 4 } },
    { title: 'Chapter 3 · Keep the Fire', objective: 'Gather 10 meat for the larder', type: 'meat', need: 10, reward: { herb: 2 } },
    { title: 'Chapter 4 · Wake the Beacon', objective: 'Light the flame tower', type: 'towerLit', need: 1, reward: { arrow: 6 } },
    { title: 'Chapter 5 · The Tusks', objective: 'Bring down 2 boar', type: 'kill:boar', need: 2, reward: { hide: 1 } },
    { title: 'Chapter 6 · Trail-Made Arrows', objective: 'Craft arrows 3 times', type: 'craft', need: 3, reward: { feather: 2, branch: 3 } },
    { title: 'Chapter 7 · The Quiet Stone', objective: 'Awaken the mystic stone', type: 'stoneActivated', need: 1, reward: { herb: 3 } }
  ].map(chapter => ({ ...chapter, done: 0, complete: false }));
  let chapterIndex = 0;

  // Semi-transparent backdrop — absorbs taps outside the panel on mobile
  const backdrop = document.createElement('div');
  Object.assign(backdrop.style, {
    position: 'fixed', inset: '0', zIndex: '59',
    background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(1px)',
    display: 'none', touchAction: 'manipulation'
  });
  document.body.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'activity-panel quest-panel';
  Object.assign(panel.style, {
    position: 'fixed', right: '18px', top: '150px', width: '228px', zIndex: '60',
    background: 'rgba(15,18,26,0.84)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px',
    padding: '10px 13px', color: '#e9edf5', fontSize: '11.5px', lineHeight: '1.55',
    pointerEvents: 'none', transition: 'opacity .2s'
  });
  document.body.appendChild(panel);

  let open = !isMobile;

  function render() {
    panel.style.opacity       = open ? '1' : '0';
    panel.style.pointerEvents = open ? 'auto' : 'none';
    panel.style.visibility    = open ? 'visible' : 'hidden';
    backdrop.style.display    = (open && isMobile) ? 'block' : 'none';
    const story = chapters[chapterIndex];
    const storyMarkup = story ? `
      <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:8px;padding-top:8px">
        <div style="font-size:9px;letter-spacing:1.5px;color:#d9b779">STORY · ${chapterIndex + 1}/${chapters.length}</div>
        <div style="font-weight:700;margin-top:2px">${story.title}</div>
        <div style="opacity:.72;font-size:11px;line-height:1.35">${story.objective}</div>
        <div style="margin-top:3px;color:#d9b779">${Math.min(story.done, story.need)}/${story.need}</div>
      </div>` : `
      <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:8px;padding-top:8px;color:#d9b779">
        <div style="font-size:9px;letter-spacing:1.5px">STORY COMPLETE</div>
        <div style="margin-top:2px;color:#e9edf5">The trail is yours to follow.</div>
      </div>`;
    panel.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
         <span style="opacity:.55;font-size:9px;letter-spacing:2px">BOUNTIES</span>
         ${isMobile ? '<button id="questCloseBtn" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer;padding:0 2px;line-height:1">×</button>' : ''}
       </div>` +
      bounties.map(b => `<div style="opacity:${b.complete ? 0.45 : 1};margin-bottom:3px">
         ${b.complete ? '✔' : '▢'} ${b.text}
        <span style="float:right;opacity:.7">${Math.min(b.done,b.need)}/${b.need}</span></div>`).join('');
    panel.innerHTML += storyMarkup;
    if (isMobile && open) {
      const closeBtn = document.getElementById('questCloseBtn');
      if (closeBtn) closeBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); setOpen(false); });
    }
  }

  function setOpen(val) {
    open = val;
    render();
  }

  backdrop.addEventListener('pointerdown', () => setOpen(false));
  render();

  function toast(text) {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed', left: '50%', top: '42%', transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.82)', color: '#f6ecd8', padding: '12px 22px',
      borderRadius: '10px', fontSize: '14px', zIndex: 100, opacity: '0',
      transition: 'opacity .5s', textAlign: 'center', maxWidth: '70vw'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }, 3600);
  }

  function progress(type, amount=1) {
    let changed = false;
    for (const b of bounties) {
      if (b.complete || b.type!==type) continue;
      b.done += amount;
      changed = true;
      if (b.done >= b.need) {
        b.complete = true;
        Object.entries(b.reward).forEach(([k,v]) => inventory.add(k,v));
        const rewardText = Object.entries(b.reward).map(([k,v]) => `${v} ${k}`).join(', ');
        toast(`Bounty complete — ${b.text}\nReward: ${rewardText}`);
        onComplete(b);
      }
    }
    if (changed) render();
  }

  function advanceStory(type, amount=1) {
    const chapter = chapters[chapterIndex];
    if (!chapter || chapter.complete || chapter.type !== type) return false;
    chapter.done += amount;
    if (chapter.done < chapter.need) {
      render();
      return true;
    }
    chapter.complete = true;
    Object.entries(chapter.reward).forEach(([key, value]) => inventory.add(key, value));
    const rewardText = Object.entries(chapter.reward).map(([key, value]) => `${value} ${key}`).join(', ');
    toast(`${chapter.title} complete\nReward: ${rewardText}`);
    chapterIndex += 1;
    render();
    return true;
  }

  function handleEvent(type, data={}) {
    if (type === 'bullseye') {
      progress('bullseye');
      advanceStory('bullseye');
    }
    if (type === 'kill') {
      progress('kill');
      progress(`kill:${data.type}`);
      if (data.loot && data.loot.meat) progress('meat', data.loot.meat);
      // Any game animal starts the story; the later boar chapter is reached
      // only after the earlier chapters have been completed.
      advanceStory('kill');
      if (data.loot && data.loot.meat) advanceStory('meat', data.loot.meat);
    }
    if (type === 'craft') {
      progress('craft');
      advanceStory('craft');
    }
    if (type === 'towerLit') advanceStory('towerLit');
    if (type === 'stoneActivated') advanceStory('stoneActivated');
    if (type === 'discover') discover(data.name);
  }

  // Optional bridge for exploration systems without coupling quests to them.
  function discover(name='') {
    const key = String(name).toLowerCase();
    if (key.includes('mystic stone') || key === 'stoneactivated') return advanceStory('stoneActivated');
    if (key.includes('flame tower') || key === 'towerlit') return advanceStory('towerLit');
    return false;
  }

  let prevJ = false;
  function update(_dt, keys) {
    const j = !!keys['j'];
    if (j && !prevJ) { setOpen(!open); }
    prevJ = j;
  }

  return {
    handleEvent, progress, discover, update, bounties, chapters, toast,
    close: ()=>setOpen(false), get isOpen(){ return open; }, get chapter(){ return chapterIndex; }
  };
}
