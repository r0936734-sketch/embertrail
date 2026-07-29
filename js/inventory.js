// inventory.js — arrows, loot, crafting and a small pouch HUD.
// Press  I  to toggle the pouch,  X  to craft 3 arrows from 2 branches.
export function createInventory(startArrows = 18) {
  const items = { arrow: startArrows, branch: 6, hide: 0, meat: 0, feather: 4, herb: 0 };
  const listeners = [];
  const isMobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  // Semi-transparent backdrop — absorbs taps outside the panel on mobile
  const backdrop = document.createElement('div');
  Object.assign(backdrop.style, {
    position: 'fixed', inset: '0', zIndex: '59',
    background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(1px)',
    display: 'none', touchAction: 'manipulation'
  });
  document.body.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'activity-panel inventory-panel';
  Object.assign(panel.style, {
    position: 'fixed', left: '16px', bottom: '110px', zIndex: '60',
    background: 'rgba(15,18,26,0.84)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px',
    padding: '10px 14px', color: '#eef1f6', fontSize: '12px', lineHeight: '1.7',
    letterSpacing: '0.5px', pointerEvents: 'none', minWidth: '160px',
    transition: 'opacity .2s ease'
  });
  document.body.appendChild(panel);

  let open = !isMobile;

  const ICON = { arrow: '🏹 Arrows', branch: '🪵 Branches', hide: '🟫 Hides', meat: '🍖 Meat', feather: '🪶 Feathers', herb: '🌿 Herbs' };

  function render() {
    panel.style.opacity        = open ? '1' : '0';
    panel.style.pointerEvents  = open ? 'auto' : 'none';
    panel.style.visibility     = open ? 'visible' : 'hidden';
    backdrop.style.display     = (open && isMobile) ? 'block' : 'none';
    panel.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
         <span style="opacity:.55;font-size:9px;letter-spacing:2px">POUCH</span>
         ${isMobile ? '<button id="pouchCloseBtn" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:14px;cursor:pointer;padding:0 2px;line-height:1">×</button>' : ''}
       </div>` +
      Object.keys(ICON).map(k => `<div>${ICON[k]}<span style="float:right;margin-left:18px;font-weight:700">${items[k]}</span></div>`).join('') +
      `<div style="opacity:.5;font-size:9px;margin-top:6px">X · craft 3 arrows (2 branches + 1 feather)</div>`;
    if (isMobile && open) {
      const closeBtn = document.getElementById('pouchCloseBtn');
      if (closeBtn) closeBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); setOpen(false); });
    }
  }

  function setOpen(val) {
    open = val;
    render();
  }

  backdrop.addEventListener('pointerdown', () => setOpen(false));
  render();

  function count(k)    { return items[k] || 0; }
  function add(k, n=1) { items[k] = (items[k]||0)+n; render(); listeners.forEach(f=>f(k,items[k])); }
  function take(k, n=1) {
    if ((items[k]||0)<n) return false;
    items[k]-=n; render(); listeners.forEach(f=>f(k,items[k]));
    return true;
  }

  function craftArrows() {
    if (count('branch')>=2 && count('feather')>=1) {
      take('branch',2); take('feather',1); add('arrow',3);
      return true;
    }
    return false;
  }

  let prevX = false, prevI = false;
  function update(_dt, keys, onCraft=()=>{}) {
    const x = !!keys['x'];
    if (x && !prevX) { if (craftArrows()) onCraft(); }
    prevX = x;
    const i = !!keys['i'];
    if (i && !prevI) { setOpen(!open); }
    prevI = i;
  }

  return { items, count, add, take, craftArrows, update, onChange: f=>listeners.push(f), close: ()=>setOpen(false), get isOpen(){ return open; } };
}
