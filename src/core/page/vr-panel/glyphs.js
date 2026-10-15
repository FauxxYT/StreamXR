// Small canvas-2D drawings shared by the VR panels: the loading indicator (Material 3
// Expressive), and textMiddle for lining badges up with text. Badges (e.g. a verified
// channel) are registered by the site: styles/kit.js registerBadge.
(function (ns) {
  'use strict';

  // The y of the middle of capital letters for text drawn at y with the current font and
  // textBaseline: where a badge beside a name lines up with it.
  function textMiddle(g, y) {
    const m = g.measureText('H');
    return y + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
  }

  // The loading indicator (Material 3 Expressive), one frame of it, centred on (x, y) about
  // r px in radius: a filled shape in the brand colour that turns and morphs through seven
  // soft shapes (burst, 9-sided cookie, pentagon, pill, sunny, 4-sided cookie, oval), one
  // every 0.65 s. `disc`: drawn on a round container (M3's "contained" indicator), for use
  // over a video. t: seconds (any running clock; e.g. performance.now() / 1000). Used by the
  // panels while something loads and over the video while it buffers. (Kept under the name
  // `spinner`, which its callers use.)
  // Each shape is a radius at angle a (about 1 on average), so two shapes morph by blending
  // their radii at each angle.
  const SHAPES = [
    a => 1 + 0.11 * Math.cos(10 * a),                                           // soft burst
    a => 1 + 0.07 * Math.cos(9 * a),                                            // 9-sided cookie
    a => 1 + 0.08 * Math.cos(5 * a),                                            // pentagon
    a => 1 / Math.hypot(Math.cos(a) / 1.22, Math.sin(a) / 0.8),                 // pill
    a => 1 + 0.09 * Math.cos(8 * a),                                            // sunny
    a => 1 + 0.12 * Math.cos(4 * a),                                            // 4-sided cookie
    a => 1 / Math.hypot(Math.cos(a) / 1.1, Math.sin(a) / 0.9),                  // oval
  ];
  const MORPH_S = 0.65, STEPS = 96;
  function spinner(g, x, y, r, t, disc) {
    const P = ns.vrTokens.m3;
    g.save();
    if (disc) { g.fillStyle = ns.vrTokens.m3Alpha('surfaceContainerHigh', 0.85); g.beginPath(); g.arc(x, y, r * 1.45, 0, Math.PI * 2); g.fill(); }
    // Which two shapes, and how far between them: the morph takes the first 60% of each
    // step (eased in and out), then the shape holds while it keeps turning.
    const k = t / MORPH_S, n = Math.floor(k), f = Math.min(1, (k - n) / 0.6);
    const m = f * f * (3 - 2 * f);
    const A = SHAPES[((n % SHAPES.length) + SHAPES.length) % SHAPES.length], B = SHAPES[((n + 1) % SHAPES.length + SHAPES.length) % SHAPES.length];
    // Turning: a steady half turn a second, plus a quarter turn with each morph.
    const turn = t * Math.PI + (n + m) * Math.PI / 2;
    g.fillStyle = P.brand;
    g.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const a = (i / STEPS) * Math.PI * 2, s = a - turn;
      const rad = r * 0.92 * (A(s) * (1 - m) + B(s) * m);
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    g.restore();
  }

  ns.vrGlyphs = { textMiddle, spinner };
})(globalThis.__streamxr = globalThis.__streamxr || {});
