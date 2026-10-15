// YouTube's own buttons on the controls panel (the shell's "extras", vr-panel.js): Captions
// (left: a menu of Off and the video's caption tracks; the chosen track's lines are drawn in
// VR by the shell, captions-overlay.js) and Save (right: a scrolling menu of Watch later and
// your playlists, each ticked when the video is in it; a choice adds it or takes it out, and
// the menu stays open).
//
//   const ex = ns.ytVr.extras.create();       one per VR session (provider.js session())
//   ex.state(st) -> { left: [captions], right: [save] }   every frame (st: { ad, noVideo }: both
//                   are greyed out during an ad or with no video playing; the provider's
//                   state); the buttons as panel-ui.js / vr-panel.js read them
//   ex.extra(id, itemId)   the shell's actions.extra: a button's menu opened (itemId null) or
//                          one of its items was chosen
//   ex.lines() -> [text]   the caption lines to draw now ([] with captions off or during an ad)
(function (ns) {
  'use strict';

  const { youtube } = ns;
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create() {
    // Captions: the tracks and the one showing (re-read twice a second).
    // If reading throws: captions off, no tracks.
    const captions = ns.youtubeData.cached(() => youtube.captions(), 500, { on: false, tracks: [], current: null });
    // A track is the current one when its language and kind (auto-generated or not) match.
    const same = (t, c) => !!c && t.languageCode === c.languageCode && !!t.auto === !!c.auto;

    // Save: the video the list is for, the list ([{ id, title, saved, busy }]), whether it's
    // loading, and a problem to show (as the menu's note).
    let save = { videoId: null, list: null, loading: false, note: '' };
    function loadSave() {
      const videoId = ns.youtubeData.currentVideoId();
      if (!ns.youtubeData.signedIn()) { save = { videoId, list: [], loading: false, note: tr('yt.save.signIn') }; return; }
      save = { videoId, list: save.videoId === videoId ? save.list : null, loading: true, note: '' };
      Promise.resolve(ns.youtubeContent.saveTargets(videoId)).then(list => {
        if (save.videoId !== videoId) return;
        save = { ...save, list: list.map(o => ({ ...o, busy: false })), loading: false, note: list.length ? '' : tr('yt.save.none') };
      }, err => {
        if (save.videoId !== videoId) return;
        save = { ...save, loading: false, note: tr('yt.save.failed', { error: err && err.message || err }) };
      });
    }
    // Add the video to playlist `id` or take it out (the row shows busy meanwhile; it only
    // changes once YouTube confirms).
    function toggleSave(id) {
      const row = save.list && save.list.find(o => o.id === id);
      if (!row || row.busy) return;
      const videoId = save.videoId, on = !row.saved;
      row.busy = true; save = { ...save, note: '' };
      Promise.resolve(ns.youtubeContent.setSaved(videoId, id, on)).then(res => {
        row.busy = false;
        if (res && res.ok) row.saved = on;
        else save = { ...save, note: tr('yt.save.failed', { error: res && res.error || '' }) };
        save = { ...save };
      });
    }

    function state(st) {
      const c = captions(), ad = !!(st && (st.ad || st.noVideo));   // (either: both buttons greyed out)
      const cc = {
        id: 'captions', icon: c.tracks.length ? 'closed_caption' : 'closed_caption_disabled',
        label: c.on && c.current ? (c.current.languageCode || '').toUpperCase().slice(0, 5) : tr('yt.cc.off'),
        on: c.on, disabled: !c.tracks.length || ad,
        menu: { items: [{ id: 'off', text: tr('yt.cc.off'), on: !c.on },
          ...c.tracks.map((t, i) => ({ id: String(i), text: t.name || t.languageCode, on: c.on && same(t, c.current) }))],
        note: null, scroll: c.tracks.length > 7, width: 460 },
      };
      // A new video: its Save list is read again the next time the menu opens.
      if (save.videoId && save.videoId !== ns.youtubeData.currentVideoId()) save = { videoId: null, list: null, loading: false, note: '' };
      const list = save.list || [];
      const sv = {
        id: 'save', icon: 'bookmark', label: tr('yt.save'), on: list.some(o => o.saved), disabled: ad,
        menu: { items: list.map(o => ({ id: o.id, text: o.busy ? `${o.title}\n${tr('yt.save.busy')}` : o.title, on: o.saved, disabled: o.busy })),
          note: save.loading && !list.length ? tr('yt.loading') : save.note || null, scroll: true, width: 520, stay: true },
      };
      return { left: [cc], right: [sv] };
    }

    function extra(id, itemId) {
      if (id === 'captions' && itemId != null) {
        const c = captions();
        youtube.setCaptions(itemId === 'off' ? null : c.tracks[+itemId] || null);
        captions.reset();                              // (show the change at once)
      } else if (id === 'save') {
        if (itemId == null) loadSave();               // the menu opened: read where it's saved
        else toggleSave(itemId);
      }
    }

    const lines = () => (captions().on ? youtube.captionLines() : []);

    return { state, extra, lines };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.extras = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
