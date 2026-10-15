// The "Auto-hide" settings tab, which belongs to the shell: how long each part of the
// interface waits, unused, before it hides or fades. One slider each (from 1 s to 30 s, or
// Never), with a Default button; remembered.
//   panels:      the controls panel and the open panels (and the lasers with them), while
//                the video plays (vr-panel.js)
//   bars:        the side toolbars and their open panels, while the video plays (vr-panel.js)
//   search:      the search bar, while the video plays (vr-panel.js)
//   controllers: a controller left still fades (controllers/controllers.js)
//   lasers:      a still controller's laser beam fades (controllers/controllers.js)
// A site's Options panel includes it as one of its tabs.
//
//   ns.vrFadeOptions.seconds(name) -> the wait in seconds (Infinity: never)
//   ns.vrFadeOptions.content() -> the Options style's 'rows' content
//   ns.vrFadeOptions.event(ev) -> true if it was one of this tab's controls
//     ('slider:fade-<name>', 'default:fade-<name>')
//   ns.vrFadeOptions.reset() -> back to the defaults (the global reset)
(function (ns) {
  'use strict';

  const KEY = 'fadeTimes';                   // remembered { name: seconds | null (never) } (storage.js name)
  const NAMES = ['panels', 'bars', 'search', 'controllers', 'lasers'];
  const DEFAULTS = { panels: 6, bars: 3, search: 3, controllers: 3.5, lasers: 3.5 };
  // The slider's stops: seconds, then Never (null) at its right end.
  const STOPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 15, 20, 30, null];
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)

  const times = { ...DEFAULTS };
  {
    const saved = ns.storage.getJSON(KEY) || {};
    for (const n of NAMES) if (n in saved && (saved[n] === null || STOPS.includes(saved[n]))) times[n] = saved[n];
  }
  const remember = () => ns.storage.setJSON(KEY, times);

  const seconds = name => (times[name] === null ? Infinity : times[name] != null ? times[name] : DEFAULTS[name]);

  // The slider: the stop's position (0..1), and the stop nearest a position.
  const fractionOf = v => { const i = STOPS.indexOf(v); return (i < 0 ? STOPS.indexOf(DEFAULTS.panels) : i) / (STOPS.length - 1); };
  const stopAt = f => STOPS[Math.round(Math.min(1, Math.max(0, f)) * (STOPS.length - 1))];
  const text = v => (v === null ? tr('fade.never') : tr('fade.seconds', { n: v }));

  function content() {
    return {
      kind: 'rows', note: tr('fade.note'),
      rows: NAMES.map(n => ({ label: tr(`fade.${n}`), hint: tr(`fade.${n}Hint`),
        control: { type: 'slider', id: `fade-${n}`, fraction: fractionOf(times[n]), text: text(times[n]), enabled: true, defaultButton: true } })),
    };
  }

  function event(ev) {
    const n = typeof ev.value === 'string' && ev.value.startsWith('fade-') ? ev.value.slice(5) : null;
    if (!NAMES.includes(n)) return false;
    if (ev.type === 'slider') times[n] = stopAt(ev.fraction);
    else if (ev.type === 'default') times[n] = DEFAULTS[n];
    else return false;
    remember();
    return true;
  }

  // Back to the defaults (the global reset); forget the choices.
  function reset() { Object.assign(times, DEFAULTS); ns.storage.remove(KEY); }

  ns.vrFadeOptions = { seconds, content, event, reset, DEFAULTS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
