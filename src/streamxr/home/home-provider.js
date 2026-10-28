// StreamXR Home's side of the VR shell (docs/Home-Page.md, step 4: Test VR): a provider like a
// site's (the interface is at the top of src/sites/youtube/page/provider/provider.js), for a
// page with no video: the screen shows StreamXR's logo, the controls panel says your setup
// works, and one side panel ("Your setup") says what to do next. It runs the real shell
// (xr-session.js, vr-panel/), so Test VR proves the whole VR interface works on a page of
// StreamXR's own. Registered in the site registry for this page (the extension's own host),
// as a site's provider is for its site; home.js starts VR with it.
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);

  // StreamXR's colors: its brand red (the toolbar icon's) for accents, the same Material 3
  // scheme the YouTube theme is made from (tokens.js).
  const THEME = { accent: '#FF0033', accentPressed: '#ff4d70', dark: '#212121', onAccent: '#FFFFFF', seed: '#FF0033', scheme: 'fidelity' };

  // The screen's picture while no video plays: the headset (Material Symbols' Head Mounted
  // Device, in StreamXR's red) over "StreamXR" in white, as a large SVG image.
  function logo() {
    const W = 900, H = 520;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <g transform="translate(${(W - 300) / 2} 330) scale(${300 / 960})"><path fill="#FF0033" d="${ns.gogglesIcon.PATH}"/></g>
      <text x="${W / 2}" y="${H - 40}" text-anchor="middle" font-family="Roboto, Arial, sans-serif" font-size="120" font-weight="700" fill="#ffffff">${t('home.name')}</text></svg>`;
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
  }

  // The "Your setup" panel (info style, one text tab): that VR works here, and what next.
  function setupPanel(host) {
    let scroll = 0;
    function model(frame) {
      const text = t('home.vr.panelText');
      const m = { tabs: [{ id: 'setup', label: t('home.vr.panelTab') }], tab: 'setup', scroll, now: frame.now / 1000,
        content: { kind: 'text', header: t('home.vr.panelHeader'), text, links: [] } };
      return { model: m, key: `${ns.i18n.version()}|${Math.round(scroll)}` };
    }
    function event(ev) {
      if (ev.type === 'scroll') scroll = Math.max(0, Math.min(host.style.maxScroll(), ev.value));
    }
    return { model, event, afterDraw: () => { scroll = host.style.shownScroll(); } };
  }
  // Settings (the controls panel's pill; Options style): the shell's own tabs, the same as on a
  // site minus the site's (YouTube's Playback and Audio): 2D Cinema, Appearance, Safe zone,
  // Auto-hide, Laser, Keyboard, Language (each tab's rows from its options file). The chosen
  // tab is remembered (Home's own storage).
  const SETTINGS_TABS = ['cinema', 'appearance', 'safezone', 'fade', 'laser', 'keyboard', 'language'];
  const SETTINGS_ICONS = { cinema: 'theaters', appearance: 'palette', safezone: 'center_focus_strong', fade: 'timer', laser: 'ads_click', keyboard: 'keyboard', language: 'translate' };
  function settingsPanel(host) {
    const TAB_KEY = 'settingsTab';
    let tab = SETTINGS_TABS.includes(ns.storage.get(TAB_KEY)) ? ns.storage.get(TAB_KEY) : 'appearance', vs = {};
    const scrolls = {};
    const options = { appearance: ns.vrAppearanceOptions, safezone: ns.vrSafeZoneOptions, fade: ns.vrFadeOptions, laser: ns.vrLaserOptions, keyboard: ns.vrKeyboardOptions, language: ns.vrLanguageOptions };
    function model(frame) {
      vs = frame.st.viewSettings || {};
      const tabs = SETTINGS_TABS.map(id => ({ id, label: t(`settings.${id}`), icon: SETTINGS_ICONS[id] }));
      const content = tab === 'cinema' ? ns.vrCinemaOptions.content(vs) : options[tab].content();
      const m = { tabs, tab, content, scroll: scrolls[tab] || 0 };
      return { model: m, key: JSON.stringify(m) };
    }
    function event(ev) {
      if (ev.type === 'tab' && SETTINGS_TABS.includes(ev.value)) { tab = ev.value; ns.storage.set(TAB_KEY, tab); }
      else if (ev.type === 'scroll') scrolls[tab] = Math.max(0, Math.min(host.style.maxScroll(), ev.value));
      else if (ev.type === 'text') { /* (a press on the rows: a drag may follow) */ }
      else if (!Object.values(options).some(o => o.event(ev))) ns.vrCinemaOptions.event(ev, vs, host.actions);
    }
    return { model, event };
  }
  // Sites (the right side; Options style, a grid of choices): each site (ns.homeSites), "Opens
  // in VR" under its name; picking one leaves this VR session and opens the site, VR meant
  // there (home-ui.js openSite: it starts by itself with the Skip Helper, on a key press or
  // click without it). "More sites coming" in the corner.
  function sitesPanel() {
    function model() {
      const sites = ns.homeSites.all();
      const m = { tabs: [{ id: 'sites', label: t('home.sites'), icon: 'smart_display' }], tab: 'sites', corner: t('home.moreSites'),
        content: { kind: 'choices', page: 0, items: sites.map(s => ({ label: s.name, sub: t('home.vr.opensInVr'), on: false })) } };
      return { model: m, key: `${ns.i18n.version()}|${sites.length}` };
    }
    function event(ev) {
      if (ev.type !== 'choice') return;
      const site = ns.homeSites.all()[+ev.value];
      if (site && ns.homeUi) ns.homeUi.openSite(site, true);
    }
    return { model, event };
  }
  const PANELS = [
    { id: 'setup', zone: 'left', label: () => t('home.vr.panelTab'), icon: 'info', style: 'info', size: 'standard', create: setupPanel, default: true },
    // (the Sites panel: hidden for now with the rest of cross-page VR, home-ui.js CROSS_PAGE_VR)
    ...(ns.homeUi && ns.homeUi.CROSS_PAGE_VR
      ? [{ id: 'sites', zone: 'right', label: () => t('home.sites'), icon: 'smart_display', style: 'options', size: 'standard', create: sitesPanel, default: true }] : []),
    { id: 'settings', zone: 'controls', label: () => t('settings.title'), icon: 'settings', style: 'options', size: 'standard', create: settingsPanel },
  ];

  // One VR session's side: nothing to play, so the actions do nothing and the state is a
  // video-less one (as a site's with no video): a title and a line saying the setup works.
  function session() {
    const none = () => {};
    const actions = {
      toggle: none, seekBy: none, seekTo: none, goLive: none, setQuality: none, setSpeed: none,
      setVolume: none, setMuted: none, storyboard: () => null, skipAd: none, previousVideo: none,
      nextVideo: none, extra: none,
    };
    function state() {
      return {
        title: t('home.vr.title'), time: 0, duration: 0, paused: true, live: null, buffered: null,
        quality: { current: null, levels: [] }, speed: 1, speeds: [1], volume: { level: 100, muted: false },
        chapters: [], heatmap: [], ad: null, playable: true, extras: null,
        nowPlaying: { info: [{ text: t('home.vr.hint'), color: 'onSurfaceVariant' }], creator: null, actions: [], queue: null },
      };
    }
    return { actions, state, ad: () => null, poster: () => null, captions: () => [], site: { name: t('home.pageTitle'), panels: PANELS } };
  }

  const provider = {
    name: 'StreamXR',
    theme: THEME,
    video: () => null,                                   // never a video: the screen shows the logo
    logo,
    info: () => ({ ok: false }),
    detectFormat: () => ({ fmt: ns.formats.DEFAULT, isSpatial: false }),
    isPaused: () => true,
    toggle: () => {},
    seek: () => {},
    buffering: () => false,
    onNavigate: () => () => {},
    session,
  };
  ns.homeProvider = provider;
  // In the site registry for this page (core/page/sites.js), so anything asking for the
  // page's site finds it; its host is the extension's own (chrome-extension://<id>).
  ns.sites.register({ id: 'streamxr-home', name: 'StreamXR Dashboard', hosts: [location.hostname], provider });
})(globalThis.__streamxr = globalThis.__streamxr || {});
