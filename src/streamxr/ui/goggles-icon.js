// The VR headset icon (Material Symbols' Head Mounted Device, Rounded) for the VR buttons
// (in the player and the top bar) and the "Watch in VR" popup.
//
// Material Symbols: Copyright Google LLC, Apache License 2.0
// (https://github.com/google/material-design-icons; the license is in
// third_party/material-symbols/LICENSE). The path is copied unchanged from
// symbols/web/head_mounted_device/materialsymbolsrounded/head_mounted_device_24px.svg.
(function (ns) {
  'use strict';

  // Drawn in a 960-unit box whose top edge is at y = -960 (the SVG's viewBox "0 -960 960 960").
  const PATH = 'M300-240q-66 0-113-47t-47-113v-163q0-51 32-89.5t82-47.5q57-11 113-15.5t113-4.5q57 0 113.5 4.5T706-700q50 10 82 48t32 89v163q0 66-47 113t-113 47h-40q-13 0-26-1.5t-25-6.5l-64-22q-12-5-25-5t-25 5l-64 22q-12 5-25 6.5t-26 1.5h-40Zm0-80h40q7 0 13.5-1t12.5-3q29-9 56.5-19t57.5-10q30 0 58 9.5t56 19.5q6 2 12.5 3t13.5 1h40q33 0 56.5-23.5T740-400v-163q0-22-14-38t-35-21q-52-11-104.5-14.5T480-640q-54 0-106 4t-105 14q-21 4-35 20.5T220-563v163q0 33 23.5 56.5T300-320ZM70-400q-13 0-21.5-8.5T40-430v-100q0-13 8.5-21.5T70-560q13 0 21.5 8.5T100-530v100q0 13-8.5 21.5T70-400Zm820 0q-13 0-21.5-8.5T860-430v-100q0-13 8.5-21.5T890-560q13 0 21.5 8.5T920-530v100q0 13-8.5 21.5T890-400Zm-410-80Z';

  // SVG content for a square grid of `gridSize` units (YouTube's own icons use 24 or 36): the
  // icon at 24 units, centred.
  function markup(gridSize) {
    const off = (gridSize - 24) / 2, k = 24 / 960;
    return `<g transform="translate(${off} ${off + 24}) scale(${k})"><path fill="currentColor" d="${PATH}"/></g>`;
  }

  // A complete standalone SVG, for when there's no YouTube icon to copy.
  const standalone = () => `<svg height="100%" width="100%" viewBox="0 0 36 36">${markup(36)}</svg>`;

  ns.gogglesIcon = { markup, standalone };
})(globalThis.__streamxr = globalThis.__streamxr || {});
