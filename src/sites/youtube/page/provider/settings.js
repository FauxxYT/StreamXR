// YouTube's "Settings" panel: the shell's shared Settings panel (streamxr/page/settings-panel.js:
// 2D Cinema, Appearance, Safe zone, Auto-hide, Laser, Keyboard, Language) with YouTube's own
// tabs before them:
//   Playback:  Loop (replay this video) and Autoplay (play the next one) switches.
//   Audio:     only for videos with more than one audio track (dubbed): a grid of the
//              tracks, the playing one in blue, each marked "auto-dubbed" / "original".
// Playback is shown first until a tab is remembered. A panel controller: see panels.js.
//   frame.st used: playback: { loop, autoplay }, audio: [tracks] (youtube.audioTracks()) (the
//   provider's), and the shell tabs' (viewSettings).
//   actions used: setLoop(on), setAutoplay(on), setAudioTrack(id), and the cinema tab's.
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create(host) {
    let audioPage = 0;                        // the Audio grid's page (more tracks than fit)
    const tabs = [
      { id: 'playback', icon: 'play_arrow', label: () => tr('yt.settings.playback'),
        content: st => {
          const p = st.playback || { loop: false, autoplay: false };
          return { kind: 'rows', rows: [
            { label: tr('yt.settings.loop'), control: { type: 'switch', id: 'loop', on: !!p.loop }, hint: tr('yt.settings.loopHint') },
            { label: tr('yt.settings.autoplay'), control: { type: 'switch', id: 'autoplay', on: !!p.autoplay }, hint: tr('yt.settings.autoplayHint') },
          ] };
        },
        event: (ev, st, actions) => {
          const p = st.playback || {};
          if (ev.type === 'switch' && ev.value === 'loop') actions.setLoop(!p.loop);
          else if (ev.type === 'switch' && ev.value === 'autoplay') actions.setAutoplay(!p.autoplay);
          else return false;
          return true;
        } },
      { id: 'audio', icon: 'volume_up', label: () => tr('yt.settings.audio'),
        shown: st => (st.audio || []).length > 1,              // Audio only with several tracks
        content: st => ({ kind: 'choices', page: audioPage, items: (st.audio || []).map(a => ({
          label: a.name.replace(/\s+original$/i, ''), on: !!a.current,
          sub: a.isAutoDubbed ? tr('yt.settings.autoDubbed') : a.isOriginal ? tr('yt.settings.original') : '' })) }),
        event: (ev, st, actions) => {
          if (ev.type !== 'choice') return false;
          if (ev.value === 'more') audioPage++;
          else {
            const t = (st.audio || [])[+ev.value];
            if (t && actions.setAudioTrack) actions.setAudioTrack(t.id);
          }
          return true;
        } },
    ];
    return ns.vrSettingsPanel.create(host, { tabs, first: 'playback' });
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.settingsPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
