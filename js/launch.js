// launch.js — wires the launch/credits/how-to-play/exit screens.
// Purely additive: doesn't touch main.js or any in-game system.
// The 3D scene in main.js already starts rendering immediately on load,
// so "Play" just needs to dismiss the overlay and let it show through.
(function () {
  'use strict';

  const overlay = document.getElementById('launchOverlay');
  const pages = {
    credits: document.getElementById('launchPageCredits'),
    howto: document.getElementById('launchPageHowTo')
  };

  function showPage(name) {
    Object.values(pages).forEach(p => p && p.classList.remove('active'));
    if (pages[name]) pages[name].classList.add('active');
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => { overlay.style.display = 'none'; }, 550);
  }

  const btnPlayCredits = document.getElementById('btnPlayCredits');
  const btnHowToPlay = document.getElementById('btnHowToPlay');
  const btnBackToCredits = document.getElementById('btnBackToCredits');
  const btnPlay = document.getElementById('btnPlay');

  if (btnHowToPlay) btnHowToPlay.addEventListener('click', () => showPage('howto'));
  if (btnBackToCredits) btnBackToCredits.addEventListener('click', () => showPage('credits'));
  if (btnPlayCredits) btnPlayCredits.addEventListener('click', closeOverlay);
  if (btnPlay) btnPlay.addEventListener('click', closeOverlay);

  // ---------- exit confirmation ----------
  const exitDialog = document.getElementById('exitDialog');
  function openExit() { if (exitDialog) exitDialog.style.display = 'flex'; }
  function closeExit() { if (exitDialog) exitDialog.style.display = 'none'; }

  const exitNo = document.getElementById('exitNo');
  const exitYes = document.getElementById('exitYes');
  if (exitNo) exitNo.addEventListener('click', closeExit);
  if (exitYes) {
    exitYes.addEventListener('click', () => {
      window.close();
      // Most browsers block a scripted close on a tab they didn't open —
      // fall back to a calm message instead of a silent no-op.
      setTimeout(() => {
        const msg = exitDialog && exitDialog.querySelector('.exit-dialog-msg');
        if (msg) msg.textContent = "You can close this tab whenever you're ready — the trail will be here.";
      }, 200);
    });
  }

  // Escape opens/closes the exit dialog — wire your own pause/menu button
  // to openExit()/closeExit() (exported below) if you add one later.
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (exitDialog && exitDialog.style.display === 'flex') closeExit();
    else openExit();
  });

  window.embertrailMenu = { showPage, closeOverlay, openExit, closeExit };
})();