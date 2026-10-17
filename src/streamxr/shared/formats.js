// Video formats: what they're called and how the renderer should show each. Loaded into
// both worlds (the panel lists the formats; the renderer needs the projection). Which
// format a video is, is decided by the site's provider (detectFormat).
//
// 3D: most 3D videos reach the desktop as one eye only (shown as mono); some arrive with both
// eyes side by side in one frame, which '180sbs' gives each eye its half of. Nothing in the
// site's data marks those, so it's picked by hand (docs/youtube.md, "Formats and VR180").
(function (ns) {
  'use strict';

  // The five formats. The ids are used everywhere: 'mono' = one picture for both eyes;
  // 'eac' = equi-angular cubemap; 'sbs' = 3D side by side (left eye's picture on the left).
  const IDS = Object.freeze(['flat', '360mono', '360eac', '180mono', '180sbs']);
  const DEFAULT = 'flat';                   // when nothing is known about the video
  const isFormat = id => IDS.includes(id);

  // Their names in the interface language (strings-en.js 'format.*'): the full name (the
  // picker on the video page) and a compact one for the in-VR panel ('\n' = line break on
  // the button).
  const label = id => ns.i18n.t(`format.${id}`);
  const shortLabel = id => ns.i18n.t(`format.short.${id}`);

  // (Which format a video is, is the site's call: its provider's detectFormat, e.g.
  // sites/youtube/page/provider/provider.js.)

  // Horizontal span of the sphere, in radians (the cinema screen doesn't use a sphere).
  const longitudeSpan = fmt => (fmt === '180mono' || fmt === '180sbs' ? Math.PI : Math.PI * 2);

  // Which part of the frame each eye sees, across: [scale, offset] for the left eye and the
  // right eye ([1, 0] = the whole frame; side by side, the left and right halves).
  const eyeSpans = fmt => (fmt === '180sbs' ? { left: [0.5, 0], right: [0.5, 0.5] } : { left: [1, 0], right: [1, 0] });

  // How the sphere maps the frame: 0 = one wrap-around picture (equirectangular),
  // 1 = YouTube's equi-angular cubemap.
  const projectionMode = fmt => (fmt === '360eac' ? 1 : 0);

  // Flat videos go on the cinema screen; everything else on the video sphere.
  const isFlat = fmt => fmt === 'flat';

  ns.formats = { IDS, DEFAULT, isFormat, label, shortLabel, longitudeSpan, eyeSpans, projectionMode, isFlat };
})(globalThis.__streamxr = globalThis.__streamxr || {});
