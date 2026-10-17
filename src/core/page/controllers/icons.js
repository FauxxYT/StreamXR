// Icon artwork for the controller labels, drawn with canvas 2D (no HTML, so it's fine in
// the page world under YouTube's Trusted Types policy), in Material 3 Expressive: each icon
// is a round tonal icon button (the colour theme's secondaryContainer, tokens.js) with its
// Material Symbols icon (symbols.js) in onSecondaryContainer. Add an icon by adding an entry.
(function (ns) {
  'use strict';

  const CELL = 128;                       // each icon gets a 128×128 pixel cell in the atlas
  const R = CELL * 0.46;                  // the button's radius in its cell
  const ICON = 68;                        // one Material Symbols icon's size (px); a pair: PAIR each
  const PAIR = 46;

  // name (what src/core/shared/controls.js bindings call `icon`) -> the Material Symbols
  // icon(s) drawn for it: one, or two side by side (e.g. −10 s / +10 s for the stick).
  const ICONS = {
    playpause: ['play_pause'],
    recenter: ['recenter'],
    grab: ['back_hand'],                    // the grip while it grabs (a move bar or handle, a resize corner) instead of recentering
    pointer: ['ads_click'],                 // the trigger: point and click with the laser
    panel: ['bottom_panel_close'],          // hide the panels (they're up)
    panelopen: ['bottom_panel_open'],       // show the panels again (they're hidden)
    seek: ['replay_10', 'forward_10'],      // the stick's left / right: back / forward 10 s
    scroll: ['swap_vert'],                  // the stick scrolls the text you point at
    keyboard: ['keyboard'],
    keyboardhide: ['keyboard_hide'],         // the keyboard button while the keyboard is up (it puts it away)
    page: ['menu_book'],                    // the stick turns the pages of the panel you point at
  };
  const NAMES = Object.keys(ICONS);       // atlas order: icon i sits at cell i
  const colors = () => ns.vrTokens.m3;    // the colour theme in use, read at draw time

  // The round tonal button (centred on 0, 0).
  function container(g) {
    g.fillStyle = colors().secondaryContainer;
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  }

  // One horizontal strip with every icon on its button. Returns the canvas. (Drawn at
  // session start and whenever the colours change, and uploaded as a texture by icon-pass.js.)
  function drawAtlas() {
    const cv = document.createElement('canvas');
    cv.width = CELL * NAMES.length; cv.height = CELL;
    const g = cv.getContext('2d');
    NAMES.forEach((name, i) => {
      g.save(); g.translate(i * CELL + CELL / 2, CELL / 2);
      container(g);
      g.fillStyle = colors().onSecondaryContainer;
      const list = ICONS[name];
      if (list.length > 1) list.forEach((icon, k) => ns.vrSymbols.draw(g, icon, (k - 0.5) * PAIR * 1.05, 0, PAIR, false));
      else ns.vrSymbols.draw(g, list[0], 0, 0, ICON, false);
      g.restore();
    });
    return cv;
  }

  // A held button's countdown, in place of its part's icon (one CELL-sized canvas, redrawn
  // as it changes and uploaded by icon-pass.js): the same button with an M3 Expressive
  // circular progress indicator round its edge (a thick rounded track, the active part in
  // the theme's brand colour filling clockwise from the top as `fraction` (0..1) goes up,
  // a small gap at each end), and the seconds left in the middle, or a tick once it's done.
  // hold: input.js's holds() entry.
  function drawHold(cv, hold) {
    if (cv.width !== CELL || cv.height !== CELL) { cv.width = CELL; cv.height = CELL; }
    const g = cv.getContext('2d'), P = colors();
    g.clearRect(0, 0, CELL, CELL);
    g.save(); g.translate(CELL / 2, CELL / 2);
    container(g);
    const r = CELL * 0.38, gap = 0.18, start = -Math.PI / 2, f = Math.max(0, Math.min(1, hold.fraction));
    g.lineWidth = 10; g.lineCap = 'round';
    const arc = (a0, a1, color) => { if (a1 - a0 < 0.01) return; g.strokeStyle = color; g.beginPath(); g.arc(0, 0, r, a0, a1); g.stroke(); };
    if (f < 1) arc(start + Math.PI * 2 * f + gap, start + Math.PI * 2 - gap, ns.vrTokens.m3Alpha('onSecondaryContainer', 0.25));   // the track
    arc(start, start + Math.PI * 2 * f, P.brand);
    g.fillStyle = P.onSecondaryContainer;
    if (hold.done) ns.vrSymbols.draw(g, 'check', 0, 0, 60, false);
    else {
      g.font = '700 52px Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(hold.secondsLeft), 0, 3);
    }
    g.restore();
    return cv;
  }

  // Horizontal texture range [u0, u1] of an icon in the atlas.
  function uRange(name) {
    const i = NAMES.indexOf(name);
    return [i / NAMES.length, (i + 1) / NAMES.length];
  }

  // `has(name)`: is there an entry for that icon name (bindings with unknown icons are skipped).
  ns.controllerIcons = { NAMES, drawAtlas, drawHold, uRange, has: name => name in ICONS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
