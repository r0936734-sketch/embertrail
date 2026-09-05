// Story campaign "The Last Ember" plus optional bounties.
// Events: talk {id}, discover {name}, fish, named, lantern, kill, bullseye,
// craft, towerLit, stoneActivated, meat, deliver.

export function createQuests({ inventory, onComplete = () => {} }) {
  const bounties = [
    { id: 'first-blood', text: 'Take your first game animal', need: 1, type: 'kill', reward: { arrow: 5 } },
    { id: 'marksman', text: 'Hit 5 bullseyes at the range', need: 5, type: 'bullseye', reward: { arrow: 8 } },
    { id: 'larder', text: 'Gather 10 meat for the cabin larder', need: 10, type: 'meat', reward: { arrow: 10, herb: 2 } },
    { id: 'boar-hunter', text: 'Bring down 2 boar', need: 2, type: 'kill:boar', reward: { arrow: 12, hide: 1 } },
    { id: 'fletcher', text: 'Craft arrows 3 times', need: 3, type: 'craft', reward: { feather: 4, branch: 6 } }
  ].map(b => ({ ...b, done: 0, complete: false }));

  const isMobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const chapters = [
    {
      title: 'Chapter 1 · First Tracks',
      objective: 'Ride west to Emberford and speak with Mira the innkeeper',
      flavor: 'Hearths along the living trail are going cold. Mira still keeps a lamp in the west.',
      hint: 'Ride west from camp to Emberford',
      type: 'talk', match: 'mira', need: 1, reward: { arrow: 3 }
    },
    {
      title: 'Chapter 2 · Inn Larder',
      objective: 'Take one game animal so Mira can feed the inn',
      flavor: 'A rider who cannot hunt cannot keep a village through winter.',
      hint: 'Hunt deer, rabbit, or boar in the meadows',
      type: 'kill', need: 1, reward: { meat: 1 }
    },
    {
      title: 'Chapter 3 · Letter for the Hermit',
      objective: 'Find the hermit camp beyond Hidden Falls',
      flavor: 'Mira\'s letter is meant for the recluse who still remembers the beacon road.',
      hint: 'Ride southwest past Hidden Falls to the hermit camp',
      type: 'discover', match: 'hermit', need: 1, reward: { herb: 2 }
    },
    {
      title: 'Chapter 4 · Wake the Beacon',
      objective: 'Light the Flame Tower with a well-aimed arrow',
      flavor: 'The ridge signal has been dead for seasons. One burning crown can be seen from Emberford.',
      hint: 'Ride east to the Flame Tower and shoot the brazier',
      type: 'towerLit', need: 1, reward: { arrow: 6 }
    },
    {
      title: 'Chapter 5 · River Gift',
      objective: 'Catch a fish at the millpond, Twin Falls, or Saltmarsh',
      flavor: 'Sister Wren will not turn away a rider who brings food before prayers.',
      hint: 'Press C at still water — millpond, Twin Falls, or the docks',
      type: 'fish', need: 1, reward: { herb: 1 }
    },
    {
      title: 'Chapter 6 · Abbey Bell',
      objective: 'Speak with Sister Wren at the Quiet Abbey',
      flavor: 'Southwest of Emberford a chapel lamp never quite goes out.',
      hint: 'Ride southwest of Emberford to the Quiet Abbey',
      type: 'talk', match: 'wren', need: 1, reward: { herb: 2 }
    },
    {
      title: 'Chapter 7 · Ashen Lantern',
      objective: 'Talk to Ash at the Ashen Ruins and take the lost lantern',
      flavor: 'East of the market the old beacon-house lies in columns.',
      hint: 'Ride far east to the Ashen Ruins',
      type: 'talk', match: 'ash', need: 1, reward: { arrow: 4 }
    },
    {
      title: 'Chapter 8 · The Quiet Stone',
      objective: 'Awaken the mystic stone in the meadow',
      flavor: 'Ash says the old craft still answers a well-aimed arrow.',
      hint: 'Find the mystic stone east of camp and shoot it',
      type: 'stoneActivated', need: 1, reward: { herb: 3 }
    },
    {
      title: 'Chapter 9 · Skywatch',
      objective: 'At night, look up and press L to name a constellation',
      flavor: 'Ivo at Skywatch maps the dark so riders do not lose the trail.',
      hint: 'Wait for night, look up, press L — or ride north to Skywatch',
      type: 'named', need: 1, reward: { feather: 2 }
    },
    {
      title: 'Chapter 10 · Market of Lights',
      objective: 'Discover the Lantern Market in the northeast',
      flavor: 'Paper lamps mark the last trading circle before the ruins.',
      hint: 'Ride northeast to the Lantern Market',
      type: 'discover', match: 'lantern market', need: 1, reward: { herb: 2 }
    },
    {
      title: 'Chapter 11 · Return the Ember',
      objective: 'Speak with Mira again now that the valley remembers fire',
      flavor: 'The letter, the beacon, the lantern, the named stars — bring them home.',
      hint: 'Return west to Mira in Emberford',
      type: 'talk', match: 'mira-end', need: 1, reward: { arrow: 8, herb: 3 }
    },
    {
      title: 'Chapter 12 · The Trail Is Yours',
      objective: 'Discover Wolfhollow or Saltmarsh Docks — finish exploring',
      flavor: 'The living trail is a sentence. Ride the rest of it.',
      hint: 'Visit Wolfhollow (northwest) or Saltmarsh Docks (south)',
      type: 'discover', match: 'hollow|saltmarsh|docks', need: 1, reward: { hide: 1, arrow: 5 }
    }
  ].map(chapter => ({ ...chapter, done: 0, complete: false }));
  let chapterIndex = 0;
  let miraTalks = 0;

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
    position: 'fixed', right: '18px', top: '150px', width: '248px', zIndex: '60',
    background: 'rgba(15,18,26,0.84)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px',
    padding: '10px 13px', color: '#e9edf5', fontSize: '11.5px', lineHeight: '1.55',
    pointerEvents: 'none', transition: 'opacity .2s'
  });
  document.body.appendChild(panel);

  let open = !isMobile;

  function render() {
    panel.style.opacity = open ? '1' : '0';
    panel.style.pointerEvents = open ? 'auto' : 'none';
    panel.style.visibility = open ? 'visible' : 'hidden';
    backdrop.style.display = (open && isMobile) ? 'block' : 'none';
    const story = chapters[chapterIndex];
    const storyMarkup = story ? `
      <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:8px;padding-top:8px">
        <div style="font-size:9px;letter-spacing:1.5px;color:#d9b779">THE LAST EMBER · ${chapterIndex + 1}/${chapters.length}</div>
        <div style="font-weight:700;margin-top:2px">${story.title}</div>
        <div style="opacity:.78;font-size:11px;line-height:1.35;margin-top:3px">${story.objective}</div>
        <div style="opacity:.55;font-size:10.5px;line-height:1.35;margin-top:4px">${story.flavor || ''}</div>
        <div style="margin-top:5px;color:#d9b779">${story.hint || ''}</div>
        <div style="margin-top:3px;color:#d9b779">${Math.min(story.done, story.need)}/${story.need}</div>
      </div>` : `
      <div style="border-top:1px solid rgba(255,255,255,.1);margin-top:8px;padding-top:8px;color:#d9b779">
        <div style="font-size:9px;letter-spacing:1.5px">STORY COMPLETE</div>
        <div style="margin-top:2px;color:#e9edf5">The hearths remember. The trail is yours to follow.</div>
      </div>`;
    panel.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
         <span style="opacity:.55;font-size:9px;letter-spacing:2px">BOUNTIES</span>
         ${isMobile ? '<button id="questCloseBtn" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer;padding:0 2px;line-height:1">×</button>' : ''}
       </div>` +
      bounties.map(b => `<div style="opacity:${b.complete ? 0.45 : 1};margin-bottom:3px">
         ${b.complete ? '✔' : '▢'} ${b.text}
        <span style="float:right;opacity:.7">${Math.min(b.done, b.need)}/${b.need}</span></div>`).join('');
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
      transition: 'opacity .5s', textAlign: 'center', maxWidth: '70vw',
      whiteSpace: 'pre-line'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }, 3800);
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
        toast(`Bounty complete — ${b.text}\nReward: ${rewardText}`);
        onComplete(b);
      }
    }
    if (changed) render();
  }

  function chapterMatches(chapter, type, data = {}) {
    if (!chapter || chapter.type !== type) return false;
    if (!chapter.match) return true;
    if (type === 'talk') {
      const id = String(data.id || '').toLowerCase();
      if (chapter.match === 'mira-end') return id === 'mira' && miraTalks >= 2;
      return id === chapter.match;
    }
    if (type === 'discover') {
      const name = String(data.name || '').toLowerCase();
      return chapter.match.split('|').some(part => name.includes(part));
    }
    return true;
  }

  function advanceStory(type, amount = 1, data = {}) {
    const chapter = chapters[chapterIndex];
    if (!chapter || chapter.complete) return false;
    if (!chapterMatches(chapter, type, data)) return false;
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

  function handleEvent(type, data = {}) {
    if (type === 'bullseye') {
      progress('bullseye');
      advanceStory('bullseye', 1, data);
    }
    if (type === 'kill') {
      progress('kill');
      progress(`kill:${data.type}`);
      if (data.loot && data.loot.meat) progress('meat', data.loot.meat);
      advanceStory('kill', 1, data);
      if (data.loot && data.loot.meat) advanceStory('meat', data.loot.meat, data);
    }
    if (type === 'craft') {
      progress('craft');
      advanceStory('craft', 1, data);
    }
    if (type === 'towerLit') advanceStory('towerLit', 1, data);
    if (type === 'stoneActivated') advanceStory('stoneActivated', 1, data);
    if (type === 'talk') {
      if (String(data.id).toLowerCase() === 'mira') miraTalks += 1;
      advanceStory('talk', 1, data);
    }
    if (type === 'fish' || type === 'catch') advanceStory('fish', 1, data);
    if (type === 'named') advanceStory('named', 1, data);
    if (type === 'lantern') advanceStory('talk', 1, { id: 'ash' });
    if (type === 'deliver') advanceStory('discover', 1, { name: data.id || 'hermit' });
    if (type === 'discover') discover(data.name);
  }

  function discover(name = '') {
    const key = String(name).toLowerCase();
    if (key.includes('mystic stone')) return advanceStory('stoneActivated');
    if (key.includes('flame tower')) return advanceStory('towerLit');
    return advanceStory('discover', 1, { name });
  }

  let prevJ = false;
  function update(_dt, keys) {
    const j = !!keys['j'];
    if (j && !prevJ) { setOpen(!open); }
    prevJ = j;
  }

  function getState() {
    return {
      chapterIndex,
      miraTalks,
      bounties: bounties.map(b => ({ done: b.done, complete: b.complete })),
      chapters: chapters.map(chapter => ({ done: chapter.done, complete: chapter.complete }))
    };
  }

  function restoreState(state = {}) {
    if (Number.isInteger(state.chapterIndex)) chapterIndex = Math.max(0, Math.min(chapters.length, state.chapterIndex));
    if (Number.isInteger(state.miraTalks)) miraTalks = Math.max(0, state.miraTalks);
    (state.bounties || []).forEach((saved, index) => {
      if (!bounties[index]) return;
      if (Number.isFinite(saved.done)) bounties[index].done = Math.max(0, saved.done);
      bounties[index].complete = !!saved.complete;
    });
    (state.chapters || []).forEach((saved, index) => {
      if (!chapters[index]) return;
      if (Number.isFinite(saved.done)) chapters[index].done = Math.max(0, saved.done);
      chapters[index].complete = !!saved.complete;
    });
    render();
  }

  return {
    handleEvent, progress, discover, update, bounties, chapters, toast,
    getState, restoreState, close: () => setOpen(false), get isOpen() { return open; }, get chapter() { return chapterIndex; }
  };
}
