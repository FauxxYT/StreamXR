// YouTube's own buttons on the controls panel (the shell's "extras", vr-panel.js): Captions
// (left: a menu of Off and the video's caption tracks; the chosen track's lines are drawn in
// VR by the shell, captions-overlay.js), Info cards (left, after Captions: a menu of the
// video's cards, a choice plays what it leads to; as a card's time comes, its teaser floats
// above the button), Autoplay (right, next to Play: YouTube's switch, On / Off; during its
// countdown at a video's end, the next video floats above it, clickable to play it now), Save
// (right: a scrolling menu of Watch later and your playlists, each ticked when the video is in
// it; a choice adds it or takes it out, and the menu stays open), and Jump ahead (at the seek
// bar's end: YouTube Premium's jump to where most viewers skip to, marked with the Diamond).
//
//   const ex = ns.ytVr.extras.create();       one per VR session (provider.js session())
//   ex.state(st) -> { left: [captions, cards], right: [autoplay, save], seek: jump | null }   every frame (st: { ad, noVideo, paused, live }: all
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

    // Info cards: the playing video's (youtube-content.js cards(), from its description panel;
    // re-read once a second), and the teaser YouTube's player shows now (youtube-player.js
    // cardTeaser(): the cards' times are only known to the player; re-read 4 times a second).
    const infoCards = ns.youtubeData.cached(() => ns.youtubeContent.cards(), 1000, []);
    const teaserNow = ns.youtubeData.cached(() => youtube.cardTeaser(), 250, '');
    // The teasers that aren't info cards: the player's own card list holds only a "View
    // corrections" teaser (no content) on every video; its text is ignored as a teaser.
    const notCards = ns.youtubeData.cached(() => (ns.youtubeData.dig(ns.youtubeData.playerResponse(), 'cards', 'cardCollectionRenderer', 'cards') || [])
      .map(c => c.cardRenderer).filter(c => c && !c.content)
      .map(c => ns.youtubeData.strOf(ns.youtubeData.dig(c, 'teaser', 'simpleCardTeaserRenderer', 'message'))).filter(Boolean), 1000, []);
    // The card a teaser text is about: the one whose title it holds (or that holds it), else
    // the only card; null if neither.
    function cardFor(text, list) {
      const t = text.toLowerCase();
      return list.find(c => c.title && (t.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(t)))
        || (list.length === 1 ? list[0] : null);
    }
    // Autoplay (YouTube's own switch, re-read twice a second): true / false, or null without one.
    const autoplayNow = ns.youtubeData.cached(() => youtube.autoplay(), 500, null);
    // YouTube's autoplay countdown at the end of a video (re-read 4 times a second): { videoId,
    // title, channel, seconds } or null.
    const countdownNow = ns.youtubeData.cached(() => youtube.autoplayCountdown(), 250, null);
    // Play what info card i leads to: its video, or its playlist (a link to elsewhere can't open in VR).
    function openCard(i) {
      const c = infoCards()[i];
      if (c && (c.videoId || c.playlistId)) ns.youtubePage.openVideo(c.videoId || '', c.playlistId);
    }

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
      // Jump ahead (YouTube Premium), at the seek bar's end (where Skip ad goes during ads),
      // only while YouTube's own Jump ahead pill is on screen: the Diamond, its name,
      // fast-forward; greyed out while paused.
      const live = !!(st && st.live), none = !!(st && st.noVideo);
      const ja = live || none || !youtube.jumpAheadOffered() ? null : { id: 'jump', icon: 'fast_forward', label: tr('yt.jumpAhead'), mark: premiumMark(),
        disabled: !!(st && (st.paused || st.ad)) };
      // Info cards (left, after Captions; always there, greyed on a video without cards, so the
      // row never shifts): a menu of the video's cards (thumbnail, title, then who, views and
      // age); while YouTube's player shows a card's teaser, it floats above the button (the
      // card it's about, clickable: plays it; or just its text) and the button's icon fills.
      const ic = infoCards(), shown = ad ? '' : teaserNow(), tease = shown && !notCards().includes(shown) ? shown : '';
      const due = tease ? cardFor(tease, ic) : null;
      const cards = {
        id: 'cards', icon: 'info', label: tr('yt.cards'), on: !!tease, disabled: !ic.length || ad,
        teaser: tease ? { label: tr('yt.cards.teaser'),
          card: { title: due ? due.title : tease, thumb: (due && due.image) || '', icon: 'info', corner: (due && due.duration) || '',
            flags: [], lines: [{ text: (due && due.subtitle) || '' }], inert: true } } : null,
        menu: { items: ic.map((c, i) => ({ id: String(i), disabled: !(c.videoId || c.playlistId), image: c.image || '', corner: c.duration || '',
          text: `${c.title}\n${[c.subtitle, c.videoId || c.playlistId ? '' : tr('yt.cards.link')].filter(Boolean).join(' · ')}` })),
          note: null, scroll: ic.length > 5, width: 560 },
      };
      // Autoplay (right, next to Play: balancing Info cards): YouTube's switch, On / Off under
      // its icon; greyed when the page shows none.
      const auto = autoplayNow();
      // While YouTube counts down to the next video, the video floats above the button ("Up next
      // in 5"; clickable: plays it now; turning Autoplay off cancels it).
      const cd = auto && !ad ? countdownNow() : null;
      const ap = { id: 'autoplay', icon: 'autoplay', label: tr(auto ? 'yt.autoplay.on' : 'yt.autoplay.off'), on: !!auto, disabled: auto == null || none,
        teaser: cd ? { label: cd.seconds != null ? tr('yt.autoplay.upNextIn', { n: cd.seconds }) : tr('yt.autoplay.upNext'),
          card: { title: cd.title, thumb: ns.youtubeData.thumbOf(cd.videoId), flags: [], lines: [{ text: cd.channel }], inert: true } } : null };
      return { left: [cc, cards], right: [ap, sv], seek: ja };
    }

    function extra(id, itemId) {
      if (id === 'jump') { youtube.jumpAhead(); return; }
      if (id === 'autoplay') {                         // the countdown's card: play it now; else the switch
        const cd = countdownNow();
        if (itemId === 'teaser') { if (cd) ns.youtubePage.openVideo(cd.videoId); return; }
        const on = !autoplayNow();
        if (!on && cd) youtube.cancelAutoplay();       // (switching it off cancels the countdown too)
        youtube.setAutoplay(on); autoplayNow.reset(); countdownNow.reset(); return;
      }
      if (id === 'cards') {                            // a card from the menu, or the teaser's (its card)
        if (itemId === 'teaser') { const c = cardFor(teaserNow(), infoCards()); if (c) openCard(infoCards().indexOf(c)); }
        else if (itemId != null) openCard(+itemId);
        return;
      }
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
  // YouTube Premium's mark: Material Symbols' Diamond, YouTube red when you have Premium, purple
  // (an upsell, like YouTube's own) when you don't. An icon spec for the shell (symbols.js drawIcon).
  const PREMIUM_RED = '#ff0033', UPSELL_PURPLE = '#a142f4';
  function premiumMark() { return { name: 'diamond', color: youtube.hasPremium() ? PREMIUM_RED : UPSELL_PURPLE, filled: true }; }

  ns.ytVr.extras = { create };
  ns.ytVr.premiumMark = premiumMark;
})(globalThis.__streamxr = globalThis.__streamxr || {});
