// The "Appearance" settings tab, which belongs to the shell (the panels' look is the shell's,
// whatever the site): the colour theme (one of the site's themes), the glass look on or off,
// and its tint (how much of the surface colour covers the blurred video behind a panel), with
// a Default button; the panel size (80-130%); the controllers' vibration on or off (greyed out,
// with a note, while no controller can vibrate); all
// remembered. The glass lives in tokens.js (ns.vrTokens.glass), which
// every panel draws from; each change (a theme too) bumps its `version`, so every panel
// redraws. A site's Options panel includes it as one of its tabs.
//
//   ns.vrAppearanceOptions.content() -> the Options style's 'rows' content
//   ns.vrAppearanceOptions.event(ev) -> true if it was one of this tab's controls
//     ('prev:theme' / 'next:theme', 'switch:glass', 'slider:tint', 'default:tint',
//     'slider:size', 'default:size', 'switch:haptics')
//   ns.vrAppearanceOptions.scale() -> the panel size (1 = the layout's own); sizeVersion()
//     bumps when it changes
//   ns.vrAppearanceOptions.haptics() -> true while the controllers may vibrate
//   ns.vrAppearanceOptions.useSite(provider) -> take the site's themes (provider.themes:
//     [{ id, label (text, or a function giving it), theme (tokens.js apply()) }], the first
//     the default; or just provider.theme) and apply the remembered one (at each VR start,
//     and for the popup's colours)
//   ns.vrAppearanceOptions.reset()   -> back to the defaults (the global reset)
//   ns.vrAppearanceOptions.load()    -> re-read the remembered glass, size and vibration (at each VR start)
// The popup (streamxr/ui/panel.js) reads and writes the same remembered { on, tint }.
(function (ns) {
  'use strict';

  const KEY = 'glass';                       // remembered { on, tint } (storage.js name)
  const TINT = { min: 0.2, max: 0.9 };       // the slider's range (its ends: clearest, darkest)
  const G = ns.vrTokens.glass;
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)

  // Take what's remembered (or the defaults). Done now and again when a VR session starts
  // (xr-session.js), since the popup can switch the glass between sessions (it writes the
  // same remembered setting).
  function load() {
    const saved = ns.storage.getJSON(KEY) || {};
    G.on = typeof saved.on === 'boolean' ? saved.on : true;
    G.tint = typeof saved.tint === 'number' && saved.tint >= TINT.min && saved.tint <= TINT.max ? saved.tint : G.DEFAULT_TINT;
    G.version++;
  }
  load();

  // Change the glass (patch: { on?, tint? }), remember it, and have the panels redraw.
  function set(patch) {
    if (patch.on != null) G.on = !!patch.on;
    if (patch.tint != null) G.tint = Math.min(TINT.max, Math.max(TINT.min, patch.tint));
    ns.storage.setJSON(KEY, { on: G.on, tint: Math.round(G.tint * 1000) / 1000 });
    G.version++;
  }

  // ------------------------------------------------------------ the colour theme
  const THEME_KEY = 'colorTheme';            // remembered theme id (storage.js name)
  let themes = [], theme = null;             // the site's themes; the one in use
  const labelOf = t => (typeof t.label === 'function' ? t.label() : t.label || t.id);
  function useSite(provider) {
    themes = (provider && provider.themes && provider.themes.length) ? provider.themes
      : [{ id: 'site', label: provider ? provider.name : '', theme: provider ? provider.theme : null }];
    const saved = ns.storage.get(THEME_KEY);
    applyTheme(themes.find(t => t.id === saved) || themes[0]);
  }
  // Use theme t (its colours replace the palette: tokens.js apply()) and have everything redraw.
  function applyTheme(t) {
    theme = t;
    ns.vrTokens.apply(t.theme);
    G.version++;
  }
  // Step to the previous (dir < 0) / next theme, and remember it.
  function stepTheme(dir) {
    if (themes.length < 2) return;
    const i = Math.max(0, themes.indexOf(theme));
    applyTheme(themes[(i + dir + themes.length) % themes.length]);
    ns.storage.set(THEME_KEY, theme.id);
  }

  // ------------------------------------------------------------ panel size and vibration
  // Panel size: how big every panel is drawn (text, buttons and panels together), as a
  // multiple of the layout's own size (config.js layout.pxPerDegree), in SIZE.step stops.
  // vr-panel.js reads scale() and lays everything out again when sizeVersion() changes.
  // Vibration: the controllers' small buzz on pointing and clicking (vr-panel.js buzz()).
  const SIZE_KEY = 'panelScale', HAPTICS_KEY = 'haptics';   // remembered (storage.js names)
  const SIZE = { min: 0.8, max: 1.3, step: 0.05, def: 1 };
  const snapSize = s => Math.min(SIZE.max, Math.max(SIZE.min, Math.round(Math.round(s / SIZE.step) * SIZE.step * 100) / 100));
  let scale = SIZE.def, sizeVer = 0, haptics = true;
  function loadFeel() {
    const s = parseFloat(ns.storage.get(SIZE_KEY));
    const next = s >= SIZE.min && s <= SIZE.max ? snapSize(s) : SIZE.def;
    if (next !== scale) { scale = next; sizeVer++; }
    haptics = ns.storage.get(HAPTICS_KEY) !== 'off';
  }
  loadFeel();
  function setScale(s) {
    const next = snapSize(s);
    if (next === scale) return;
    scale = next; sizeVer++;
    if (scale === SIZE.def) ns.storage.remove(SIZE_KEY); else ns.storage.set(SIZE_KEY, scale.toFixed(2));
  }
  function setHaptics(on) {
    haptics = on;
    if (on) ns.storage.remove(HAPTICS_KEY); else ns.storage.set(HAPTICS_KEY, 'off');
  }
  const sizeFraction = s => (s - SIZE.min) / (SIZE.max - SIZE.min);
  const canVibrate = () => !!(ns.diagnostics && ns.diagnostics.canVibrate());   // a controller seen so far can vibrate

  // The slider's position (0..1) for a tint, and back.
  const fractionOf = tint => (tint - TINT.min) / (TINT.max - TINT.min);
  const tintAt = f => TINT.min + f * (TINT.max - TINT.min);

  function content() {
    return {
      kind: 'rows', note: tr('appearance.note'),
      rows: [
        ...(themes.length > 1 ? [{ label: tr('appearance.theme'), hint: tr('appearance.themeHint'),
          control: { type: 'stepper', id: 'theme', text: theme ? labelOf(theme) : '' } }] : []),
        { label: tr('appearance.glass'), hint: tr('appearance.glassHint'), control: { type: 'switch', id: 'glass', on: G.on } },
        { label: tr('appearance.tint'), dim: !G.on,
          control: { type: 'slider', id: 'tint', fraction: fractionOf(G.tint), text: `${Math.round(G.tint * 100)}%`,
            enabled: G.on, defaultButton: true, ends: [tr('appearance.clearer'), tr('appearance.darker')] } },
        { label: tr('appearance.size'), hint: tr('appearance.sizeHint'),
          control: { type: 'slider', id: 'size', fraction: sizeFraction(scale), text: `${Math.round(scale * 100)}%`, enabled: true, defaultButton: true } },
        // (greyed out and off, saying why, while no controller can vibrate: diagnostics.js canVibrate)
        canVibrate()
          ? { label: tr('appearance.haptics'), hint: tr('appearance.hapticsHint'), control: { type: 'switch', id: 'haptics', on: haptics } }
          : { label: tr('appearance.haptics'), hint: tr('appearance.hapticsMissing'), control: { type: 'switch', id: 'haptics', on: false, enabled: false } },
      ],
    };
  }

  function event(ev) {
    if ((ev.type === 'prev' || ev.type === 'next') && ev.value === 'theme') stepTheme(ev.type === 'prev' ? -1 : 1);
    else if (ev.type === 'switch' && ev.value === 'glass') set({ on: !G.on });
    else if (ev.type === 'slider' && ev.value === 'tint') set({ tint: tintAt(ev.fraction) });
    else if (ev.type === 'default' && ev.value === 'tint') set({ tint: G.DEFAULT_TINT });
    else if (ev.type === 'slider' && ev.value === 'size') setScale(SIZE.min + ev.fraction * (SIZE.max - SIZE.min));
    else if (ev.type === 'default' && ev.value === 'size') setScale(SIZE.def);
    else if (ev.type === 'switch' && ev.value === 'haptics' && canVibrate()) setHaptics(!haptics);
    else return false;
    return true;
  }

  // Back to the defaults (the global reset): the site's first theme, glass on at the default
  // tint; forget the choices.
  function reset() {
    G.on = true; G.tint = G.DEFAULT_TINT; ns.storage.remove(KEY);
    ns.storage.remove(THEME_KEY); if (themes.length) applyTheme(themes[0]);
    setScale(SIZE.def); setHaptics(true);
    G.version++;
  }

  ns.vrAppearanceOptions = {
    content, event, reset, useSite,
    load: () => { load(); loadFeel(); },
    scale: () => scale, sizeVersion: () => sizeVer, haptics: () => haptics,
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
