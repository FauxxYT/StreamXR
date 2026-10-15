// Settings for the floating VR control panel and the laser pointer.
(function (ns) {
  'use strict';

  ns.vrPanelConfig = {
    // Where everything goes is laid out around the Safe Zone (safe-zone.js; vr-panel.js
    // "the layout"), this far from your eyes, every canvas shown at the same pixel density:
    // pxPerDegree canvas pixels per degree of your view (26: text as big as the panels of
    // 0.62 and before, which were 1.0 m wide at about 1.08 m).
    layout: { distance: 1.7, pxPerDegree: 26 },
    showOnStart: true,          // visible when you enter VR
    // The site's panels' canvas sizes in pixels, by the name a registration gives:
    //   wide:     width, and the most height; a Catalog panel trims its height to its cards
    //             and every 'wide' panel takes that same height, so they all match.
    //   tall:     width x height, untrimmed.
    //   standard: width x height (Settings: 1024 wide, a little narrower than the controls
    //             panel; taller than the style's
    //             own 390, so its rows have more room: six fit, as the 2D Cinema tab has).
    // The side panels are narrower and taller than the panels of 0.63 and before (there's
    // more room up and down beside the Safe Zone than across).
    sizes: {
      wide: { width: 900, height: 1100 },
      tall: { width: 900, height: 1100 },
      standard: { width: 1024, height: 600 },
    },

    laser: {
      length: 2.5,              // metres, when it isn't hitting the panel
      width: 0.0035,            // beam thickness in metres
      color: [0.24, 0.65, 1.0], // matches the controllers' pressed colour
      dotSize: 0.016,
    },
    haptics: true,              // small buzz on hover and click
    // The in-VR keyboard (keyboard.js), shown / hidden by its controller button in the
    // controls panel's place, at `scale` (resizing it by its corners changes and remembers
    // that, within min..max).
    keyboard: {
      scale: 0.8,               // 1 = its keys at the panels' pixel density (layout.pxPerDegree)
      minScale: 0.5, maxScale: 1.4,
      repeatDelay: 450,         // ms a key is held before it types again
      repeatEvery: 70,          // ms between repeats while still held
    },
    // Smoothing of the laser (pointing, clicking, and what it holds) against hand tremor
    // (pose-smoother.js; null = off, and the Laser settings tab's slider is greyed out).
    // A still hand is smoothed at minCutoff Hz (lower = steadier but laggier); moving or
    // turning raises it, so real moves aren't slowed. These are the slider's middle
    // (default) position; the slider scales minCutoff (laser-options.js).
    laserSmoothing: {
      minCutoff: 0.7,           // Hz while the hand is still
      posBeta: 10,              // + Hz per m/s of hand movement
      rotBeta: 2,               // + Hz per rad/s of wrist turn
      dCutoff: 1.0,             // Hz: smoothing of the speed estimate
    },
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
