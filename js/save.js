// save.js - small localStorage-backed autosave/load manager.
export function createSaveSystem({ key = 'embertrail-save', collect, apply, intervalSec = 20 }) {
  let timer = 0;
  let lastSaved = null;

  function save() {
    try {
      const data = collect();
      data.__savedAt = Date.now();
      localStorage.setItem(key, JSON.stringify(data));
      lastSaved = data;
      return true;
    } catch (error) {
      console.warn('Save failed:', error);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const data = JSON.parse(raw);
      apply(data);
      lastSaved = data;
      return true;
    } catch (error) {
      console.warn('Load failed:', error);
      return false;
    }
  }

  function hasSave() {
    return !!localStorage.getItem(key);
  }

  function clear() {
    localStorage.removeItem(key);
    lastSaved = null;
  }

  function update(dt) {
    timer += dt;
    if (timer >= intervalSec) {
      timer = 0;
      save();
    }
  }

  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });

  return { save, load, hasSave, clear, update, get lastSaved() { return lastSaved; } };
}
