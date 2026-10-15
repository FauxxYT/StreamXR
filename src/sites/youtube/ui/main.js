// Isolated-world entry point: keeps the VR buttons on the page (in the player, and in the top
// bar next to "+ Create") and closes the panel when you navigate or click elsewhere. Loaded last.
(function (ns) {
  'use strict';

  const { panel, playerButton, topbarButton } = ns;
  const ensureButtons = () => {
    playerButton.ensure(panel.open);                                   // the popup inside the player
    topbarButton.ensure(btn => panel.open(btn, { fixed: true }));      // the popup under the top bar's button
  };

  // Opening another video inside the page: close the panel (it described the old video) and
  // make sure the buttons are back (YouTube may have rebuilt the player's controls).
  document.addEventListener('yt-navigate-finish', () => { panel.close(); ensureButtons(); });
  // A click anywhere else closes the panel (clicks on a VR button toggle it instead).
  document.addEventListener('click', e => {
    if (panel.isOpen() && !e.target.closest(`.${playerButton.CLASS}, .${topbarButton.CLASS}`)) panel.close();
  });
  setInterval(ensureButtons, 1500);          // YouTube rebuilds its controls; keep re-adding
  ensureButtons();
})(globalThis.__streamxr = globalThis.__streamxr || {});
