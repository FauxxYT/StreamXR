// The Settings panel (the controls panel's pill; Options style), shared: the shell's own tabs,
// with a site's tabs before them. The shell's: 2D Cinema and 3D Cinema (streamxr/page/cinema-options.js),
// Appearance, Safe zone, Auto-hide, Laser, Keyboard and Language (core/page/vr-panel/*-options.js),
// each tab's rows from its options file. A site adds its own (YouTube: Playback, Audio);
// StreamXR's Dashboard has none. The chosen tab is remembered (storage.js 'settingsTab').
//
//   ns.vrSettingsPanel.create(host, opts) -> a panel controller (panels.js's interface)
//     opts.tabs: the site's tabs, first: [{ id, label() (in the interface language), icon
//       (Material Symbols name), shown(st) (optional: false hides it, e.g. Audio with one
//       track), content(st) -> the Options style's content, event(ev, st, actions) -> true if
//       it was this tab's }]
//     opts.first: the tab shown before one is remembered (default: the first one)
// frame.st used: viewSettings (the shell's: the cinema screen) and whatever the site's tabs read.
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);
  const TAB_KEY = 'settingsTab';             // remembered tab (storage.js name)
  // The shell's tabs: id, icon (symbols.js), its options file (label: 'settings.<id>').
  const SHELL = [
    { id: 'cinema', icon: 'theaters' },
    { id: 'cinema3d', icon: '3d_2' },
    { id: 'appearance', icon: 'palette', options: () => ns.vrAppearanceOptions },
    { id: 'safezone', icon: 'center_focus_strong', options: () => ns.vrSafeZoneOptions },
    { id: 'fade', icon: 'timer', options: () => ns.vrFadeOptions },
    { id: 'laser', icon: 'ads_click', options: () => ns.vrLaserOptions },
    { id: 'keyboard', icon: 'keyboard', options: () => ns.vrKeyboardOptions },
    { id: 'language', icon: 'translate', options: () => ns.vrLanguageOptions },
  ];

  function create(host, opts = {}) {
    const site = opts.tabs || [];
    const all = [...site.map(x => x.id), ...SHELL.map(x => x.id)];
    let tab = all.includes(ns.storage.get(TAB_KEY)) ? ns.storage.get(TAB_KEY) : (opts.first || all[0]);
    let st = {}, vs = {};
    const scrolls = {};                       // tab id -> px its rows are scrolled (each tab keeps its own)
    const siteTab = id => site.find(x => x.id === id);

    function model(frame) {
      st = frame.st || {}; vs = st.viewSettings || {};
      const tabs = [
        ...site.filter(x => !x.shown || x.shown(st)).map(x => ({ id: x.id, label: x.label(), icon: x.icon })),
        ...SHELL.map(x => ({ id: x.id, label: t(`settings.${x.id}`), icon: x.icon })),
      ];
      const shownTab = tabs.some(x => x.id === tab) ? tab : tabs[0].id;
      const s = siteTab(shownTab), shell = SHELL.find(x => x.id === shownTab);
      const content = s ? s.content(st) : shell.id === 'cinema' ? ns.vrCinemaOptions.content(vs)
        : shell.id === 'cinema3d' ? ns.vrCinemaOptions.content3d(vs) : shell.options().content();
      const m = { tabs, tab: shownTab, content, scroll: scrolls[shownTab] || 0 };
      return { model: m, key: JSON.stringify(m) };
    }

    function event(ev) {
      if (ev.type === 'tab') { if (all.includes(ev.value)) { tab = ev.value; ns.storage.set(TAB_KEY, tab); } return; }
      if (ev.type === 'scroll') { scrolls[tab] = Math.max(0, Math.min(host.style.maxScroll(), ev.value)); return; }   // (the rows, dragged or by the stick)
      if (ev.type === 'text') return;           // (a press on the rows: a drag may follow)
      const s = siteTab(tab);
      if (s && s.event(ev, st, host.actions)) return;
      // The shell's tabs: each options file says whether it was its control; else the cinema's.
      if (SHELL.some(x => x.options && x.options().event(ev))) return;
      ns.vrCinemaOptions.event(ev, vs, host.actions);
    }

    return { model, event };
  }

  ns.vrSettingsPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
