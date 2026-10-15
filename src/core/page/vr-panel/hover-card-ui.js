// A single video card that floats just above a control while the laser points at it: the
// playlist's Previous / Next video buttons show the video they lead to. Same card design as
// the card panels (the card kit in styles/kit.js), on a dark rounded
// plate with a label ("Next video") above the card. Canvas 2D, knows nothing about WebXR.
(function (ns) {
  'use strict';

  const T = ns.vrTokens;                                 // design tokens (tokens.js)

  const { roundRect, createCardKit, cardHeight } = ns.vrKit;
  const W = 300, H = 318, PAD = 20, LABEL_H = 34;   // tall enough for title (2 lines), channel and views
  const THUMB_H = Math.round((W - PAD * 2) * 9 / 16);
  const BOX = { w: W - PAD * 2, h: cardHeight(THUMB_H), thumbH: THUMB_H };

  // onImageLoaded(): the thumbnail arrived (redraw).
  // Returns { canvas, draw(card, label), imagesReady() } (sized in the world like every panel: vr-panel.js).
  function create(onImageLoaded) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const kit = createCardKit(g, onImageLoaded);

    // Paint `card` (a generic card, kit.js) under `label`.
    function draw(card, label) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = T.panelFill(); roundRect(g, 0, 0, W, H, 22); g.fill();   // the panels' background (glass or solid)
      g.strokeStyle = T.m3.outlineVariant; g.lineWidth = 2; roundRect(g, 1, 1, W - 2, H - 2, 21); g.stroke();
      g.fillStyle = T.m3.onSurfaceVariant; g.font = '500 20px Roboto, Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(label, PAD, PAD + LABEL_H / 2 - 4);
      if (card) kit.drawCard(card, PAD, PAD + LABEL_H, BOX, {}, [], 'card');
    }

    return { canvas, draw, imagesReady: kit.imagesReady };
  }

  ns.vrHoverCardUI = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
