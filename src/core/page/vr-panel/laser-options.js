// The "Laser" settings tab, which belongs to the shell (the lasers are the shell's,
// whatever the site): a Steadiness slider from Off to Steadiest, with a Default button,
// remembered. It scales the laser smoothing in config.js (laserSmoothing is the default,
// middle setting). A site's Options panel includes it as one of its tabs.
//
//   ns.vrLaserOptions.content() -> the Options style's 'rows' content
//   ns.vrLaserOptions.event(ev) -> true if it was one of this tab's controls
//     ('slider:steadiness', 'default:steadiness')
//   ns.vrLaserOptions.smoothing() -> the pose-smoother settings for now, or null (off)
//   ns.vrLaserOptions.reset() -> back to the default (the global reset)
(function (ns) {
  'use strict';

  const KEY = 'laserSteadiness';      // remembered slider position (storage.js name)
  const DEFAULT = 0.5;                // the slider's middle = config.js's laserSmoothing
  const OFF_BELOW = 0.02;             // the slider's far left counts as Off
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)

  let steadiness = (() => {
    const v = parseFloat(ns.storage.get(KEY));
    return v >= 0 && v <= 1 ? v : DEFAULT;
  })();

  function set(v) {
    steadiness = Math.min(1, Math.max(0, v));
    ns.storage.set(KEY, steadiness.toFixed(3));
  }

  // The smoothing for the slider's position: the middle is config.js's setting; each
  // quarter of the slider towards Steadiest halves the still-hand cutoff (towards Off,
  // doubles it), so the slider feels even along its length. null = off.
  function smoothing() {
    const base = ns.vrPanelConfig.laserSmoothing;
    if (!base || steadiness < OFF_BELOW) return null;
    return { ...base, minCutoff: base.minCutoff * Math.pow(2, (DEFAULT - steadiness) * 4) };
  }

  function content() {
    const off = steadiness < OFF_BELOW;
    return {
      kind: 'rows', note: tr('laser.note'),
      rows: [
        { label: tr('laser.steadiness'),
          control: { type: 'slider', id: 'steadiness', fraction: steadiness, text: off ? tr('laser.off') : `${Math.round(steadiness * 100)}%`,
            enabled: !!ns.vrPanelConfig.laserSmoothing, defaultButton: true, ends: [tr('laser.off'), tr('laser.steadiest')] } },
      ],
    };
  }

  function event(ev) {
    if (ev.type === 'slider' && ev.value === 'steadiness') set(ev.fraction);
    else if (ev.type === 'default' && ev.value === 'steadiness') set(DEFAULT);
    else return false;
    return true;
  }

  // Back to the default (the global reset): forget the slider position.
  function reset() { steadiness = DEFAULT; ns.storage.remove(KEY); }

  ns.vrLaserOptions = { content, event, smoothing, reset };
})(globalThis.__streamxr = globalThis.__streamxr || {});
