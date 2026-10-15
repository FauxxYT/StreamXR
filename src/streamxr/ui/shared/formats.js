// GENERATED from src/streamxr/shared/formats.js by tools/sync-shared.js - edit that file, not this one.
// Video formats: what they're called and how the renderer should show each. Loaded into
// both worlds (the panel lists the formats; the renderer needs the projection). Which
// format a video is, is decided by the site's provider (detectFormat).
//
// There are no 3D formats: on desktop YouTube sends one eye only, even for 3D videos.
(function (ns) {
  'use strict';

  // The four formats. The ids are used everywhere: 'mono' = one picture for both eyes;
  // 'eac' = equi-angular cubemap.
  const IDS = Object.freeze(['flat', '360mono', '360eac', '180mono']);
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
  const longitudeSpan = fmt => (fmt === '180mono' ? Math.PI : Math.PI * 2);

  // How the sphere maps the frame: 0 = one wrap-around picture (equirectangular),
  // 1 = YouTube's equi-angular cubemap.
  const projectionMode = fmt => (fmt === '360eac' ? 1 : 0);

  // Flat videos go on the cinema screen; everything else on the video sphere.
  const isFlat = fmt => fmt === 'flat';

  ns.formats = { IDS, DEFAULT, isFormat, label, shortLabel, longitudeSpan, projectionMode, isFlat };
})(globalThis.__streamxr = globalThis.__streamxr || {});
