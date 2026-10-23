// YouTube's "Settings" panel (Options style). Tabs (the chosen one is remembered):
//   Playback:  Loop (replay this video) and Autoplay (play the next one) switches.
//   Audio:     only for videos with more than one audio track (dubbed): a grid of the
//              tracks, the playing one in blue, each marked "auto-dubbed" / "original".
//   2D Cinema: StreamXR's cinema screen settings (streamxr/page/cinema-options.js), with the
//              current format as its note.
//   Appearance: the shell's glass look on / off and its tint (vr-panel/appearance-options.js).
//   Safe zone: the shell's Safe Zone, where the panels are laid out (vr-panel/safe-zone-options.js).
//   Auto-hide: how long the shell's parts wait before hiding / fading (vr-panel/fade-options.js).
//   Laser:     the shell's laser steadiness (vr-panel/laser-options.js).
//   Keyboard:  the shell's VR keyboard layout: style and language (vr-panel/keyboard-options.js).
//   Language:  the shell's interface language (vr-panel/language-options.js).
// A panel controller: see panels.js.
//   frame.st used: playback: { loop, autoplay }, audio: [tracks] (youtube.audioTracks()) (the
//   provider's), viewSettings: { cinema, distance } (the shell's).
//   actions used: setLoop(on), setAutoplay(on), setAudioTrack(id), and the cinema tab's.
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  const TAB_KEY = 'settingsTab';                // remembered tab (shell storage.js name)
  const TABS = ['playback', 'audio', 'cinema', 'appearance', 'safezone', 'fade', 'laser', 'keyboard', 'language'];   // label: 'yt.settings.<id>'
  const TAB_ICONS = { playback: 'play_arrow', audio: 'volume_up', cinema: 'theaters', appearance: 'palette', safezone: 'center_focus_strong', fade: 'timer', laser: 'ads_click', keyboard: 'keyboard', language: 'translate' };   // Material Symbols (symbols.js)

  function create(host) {
    const { actions } = host;
    let tab = 'playback', audioPage = 0, vs = {}, st = {};
    const scrolls = {};                       // tab id -> px its rows are scrolled (each tab keeps its own)
    { const t = ns.storage.get(TAB_KEY); if (TABS.includes(t)) tab = t; }

    function model(frame) {
      st = frame.st; vs = st.viewSettings || {};
      const audio = st.audio || [];
      const tabs = TABS.filter(id => id !== 'audio' || audio.length > 1)      // Audio only with several tracks
        .map(id => ({ id, label: tr(`yt.settings.${id}`), icon: TAB_ICONS[id] }));
      const t = tabs.some(x => x.id === tab) ? tab : 'playback';
      const p = st.playback || { loop: false, autoplay: false };
      const content = t === 'cinema' ? ns.vrCinemaOptions.content(vs)
        : t === 'appearance' ? ns.vrAppearanceOptions.content()
        : t === 'safezone' ? ns.vrSafeZoneOptions.content()
        : t === 'fade' ? ns.vrFadeOptions.content()
        : t === 'laser' ? ns.vrLaserOptions.content()
        : t === 'keyboard' ? ns.vrKeyboardOptions.content()
        : t === 'language' ? ns.vrLanguageOptions.content()
        : t === 'audio' ? { kind: 'choices', page: audioPage, items: audio.map(a => ({
          label: a.name.replace(/\s+original$/i, ''), on: !!a.current,
          sub: a.isAutoDubbed ? tr('yt.settings.autoDubbed') : a.isOriginal ? tr('yt.settings.original') : '' })) }
        : { kind: 'rows', rows: [
          { label: tr('yt.settings.loop'), control: { type: 'switch', id: 'loop', on: !!p.loop }, hint: tr('yt.settings.loopHint') },
          { label: tr('yt.settings.autoplay'), control: { type: 'switch', id: 'autoplay', on: !!p.autoplay }, hint: tr('yt.settings.autoplayHint') },
        ] };
      const m = { tabs, tab: t, content, scroll: scrolls[t] || 0 };
      return { model: m, key: JSON.stringify(m) };
    }

    function event(ev) {
      const p = st.playback || {};
      if (ev.type === 'tab') { tab = ev.value; ns.storage.set(TAB_KEY, tab); }
      else if (ev.type === 'scroll') scrolls[tab] = Math.max(0, Math.min(host.style.maxScroll(), ev.value));   // (the rows, dragged or by the stick)
      else if (ev.type === 'text') { /* (a press on the rows: a drag may follow) */ }
      else if (ev.type === 'switch' && ev.value === 'loop') actions.setLoop(!p.loop);
      else if (ev.type === 'switch' && ev.value === 'autoplay') actions.setAutoplay(!p.autoplay);
      else if (ev.type === 'choice' && ev.value === 'more') audioPage++;
      else if (ev.type === 'choice') {
        const t = (st.audio || [])[+ev.value];
        if (t && actions.setAudioTrack) actions.setAudioTrack(t.id);
      } else if (!ns.vrAppearanceOptions.event(ev) && !ns.vrSafeZoneOptions.event(ev) && !ns.vrFadeOptions.event(ev) && !ns.vrLaserOptions.event(ev) && !ns.vrKeyboardOptions.event(ev) && !ns.vrLanguageOptions.event(ev)) {
        ns.vrCinemaOptions.event(ev, vs, actions);
      }
    }

    return { model, event };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.settingsPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
