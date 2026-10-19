// A playlist as a page, YouTube's side: shared by the panels whose cards can be playlists
// (Explore, You, Search, Channel, Up Next's Recommended) and by Up Next's playlist tab. The
// panel shows it in place of its list as the style's 'collection' body
// (styles/collection.js): the playlist's picture, title, author, stats and description, its
// buttons, then its videos as rows. Opened from a card: Play all · Shuffle · Save, more videos
// loading as you scroll, a row plays that video in the playlist; the panel keeps it open
// while you're elsewhere, and its back button (or the panel's tab again) returns to the list.
// The playing playlist (Up Next's tab, `live`): the videos the watch page holds, the playing
// one marked and brought into view, Shuffle as an on / off toggle (the watch page's) and Save.
//
//   const view = ns.ytVr.playlist.create(actions);
//   actions: playlistDetails(id) -> Promise of details (youtube-content.js), browsePlaylist(id)
//     -> pager of its videos, savePlaylist(id, on) -> Promise of { ok }, openVideo(id,
//     playlistId, index, params), shuffleWhenReady(id), playlistShuffled() -> bool | null,
//     setPlaylistShuffle(on)
//   ns.ytVr.playlist.opens(item)   true for a card this opens (a playlist that isn't a mix:
//                                  mixes have no page of their own and just play)
//   view.open(item, live)          open a playlist card's item ({ playlistId, title, channel,
//                                  thumb }); live: () => the playing playlist ({ items,
//                                  currentId, localIndex, title, channel, index, total }) and
//                                  play(item): its rows come from there instead
//   view.close(), view.isOpen(), view.id()
//   view.event(ev) -> true if it was this page's ('back', 'action', 'row', 'scroll')
//   view.follow()                  bring the playing row into view at the next draw
//   view.afterDraw(style)          keep the scroll where the style put it
//   view.body(back, style) -> the 'collection' body (back: the back button's label, or none;
//                             style: the panel's style, to load more near the end), or null
//   view.scroll()                  px scrolled, or null until the first draw after follow()
//   view.version()                 bumps on every change (for redraw keys)
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  const AHEAD = 1200;                                  // px from the end at which more videos load
  const isMix = id => /^RD/.test(id || '');            // mixes' ids start with RD: no page of their own
  // Save changes made here, by playlist id (shared by every page, so a playlist open in two
  // panels shows the same state), and a counter every page's redraw key includes.
  const savedNow = new Map();
  let savedVer = 0;
  const isSaved = d => (savedNow.has(d.id) ? savedNow.get(d.id) : !!d.saved);
  const noteSaved = (id, on) => { savedNow.set(id, on); savedVer++; };
  const opens = it => !!it && it.type === 'playlist' && !!it.playlistId && !isMix(it.playlistId);

  function create(actions) {
    let item = null, live = null, details, pager = null, loading = false, scroll = 0, saving = false, error = '';
    let gen = 0, ver = 0;                     // gen: ignore answers for a playlist no longer open
    const bump = () => { ver++; };

    // Load the next page of its videos (one request at a time).
    function loadMore() {
      if (!pager || loading || pager.done) return;
      const p = pager;
      loading = true; bump();
      p.next().catch(err => { if (p === pager) { error = String(err && err.message || err); console.warn('[streamxr] playlist videos unavailable:', error); } })
        .finally(() => { if (p === pager) { loading = false; bump(); } });
    }

    function open(it, liveOpts) {
      item = it; live = liveOpts || null; details = undefined; saving = false; error = '';
      scroll = live ? null : 0;
      const my = ++gen, id = it.playlistId;
      pager = live ? null : actions.browsePlaylist(id);
      if (isMix(id)) details = null;
      else Promise.resolve(actions.playlistDetails(id)).then(d => { if (my === gen) { details = d || null; bump(); } },
        err => { if (my === gen) { details = null; console.warn('[streamxr] playlist details unavailable:', err && err.message || err); bump(); } });
      bump(); loadMore();
    }
    function close() { if (item) { item = null; live = null; pager = null; gen++; bump(); } }

    // Save / remove it (shown at once, put back if YouTube refuses).
    function toggleSave() {
      if (!details || !details.canSave || saving) return;
      const d = details, on = !isSaved(d);
      noteSaved(d.id, on); saving = true; bump();
      Promise.resolve(actions.savePlaylist(d.id, on)).then(res => {
        if (!res || !res.ok) { noteSaved(d.id, !on); console.warn('[streamxr] saving the playlist failed:', res && res.error); }
      }, err => { noteSaved(d.id, !on); console.warn('[streamxr] saving the playlist failed:', err); })
        .finally(() => { saving = false; bump(); });
    }

    // Shuffle: from a card, play YouTube's random first video and turn the watch page's
    // shuffle on once it shows; the playing playlist: flip that toggle.
    function shuffle() {
      const id = item.playlistId;
      if (live) { const on = actions.playlistShuffled(); if (on != null) actions.setPlaylistShuffle(!on); bump(); return; }
      if (!details || !details.shuffle) return;
      actions.openVideo(details.shuffle.videoId, id, undefined, details.shuffle.params);
      actions.shuffleWhenReady(id);
    }

    function event(ev) {
      if (!item) return false;
      const id = item.playlistId;
      if (ev.type === 'back' && !live) close();
      else if (ev.type === 'scroll') { scroll = Math.max(0, ev.value); bump(); }
      else if (ev.type === 'action' && ev.value === 'playAll') actions.openVideo((details && details.firstVideo) || '', id);
      else if (ev.type === 'action' && ev.value === 'shuffle') shuffle();
      else if (ev.type === 'action' && ev.value === 'save') toggleSave();
      else if (ev.type === 'row') {
        const i = +ev.value;
        if (live) { const v = live().items[i]; if (v) live.play(v, i); }
        else { const v = pager && pager.items[i]; if (v) actions.openVideo(v.id, id, i); }
      }
      else return false;
      return true;
    }

    // The rows for `videos` (the same list and playing video: the same rows, made once).
    let rowsMemo = { videos: null, playing: null, n: 0, rows: [] };
    function rowsOf(videos, playing) {
      if (rowsMemo.videos === videos && rowsMemo.playing === playing && rowsMemo.n === videos.length) return rowsMemo.rows;
      const rows = videos.map(v => ({ thumb: v.thumb, corner: v.duration || '', title: v.title, current: v.id === playing,
        line: [v.channel, v.views, v.age].filter(Boolean).join(' · ') }));
      rowsMemo = { videos, playing, n: videos.length, rows };
      return rows;
    }

    // The 'collection' body: the heading from its details (from the card's item, or the
    // playing playlist, until they arrive), the buttons, and its videos so far; from a card,
    // more load when you're near the end.
    function body(back, style) {
      if (!item) return null;
      const now = live ? live() : null;
      if (pager && !pager.done && !loading && style && style.maxScroll && style.maxScroll() - (scroll || 0) < AHEAD) loadMore();
      const d = details || {};
      const playing = now ? now.currentId : ns.youtubeData.currentVideoId();
      const videos = now ? now.items : pager ? pager.items : [];
      const shuffled = now ? actions.playlistShuffled() : null;
      const save = d.canSave ? [{ id: 'save', label: tr(isSaved(d) ? 'yt.playlist.saved' : 'yt.playlist.save'), icon: isSaved(d) ? 'playlist_add_check' : 'playlist_add', enabled: !saving }] : [];
      return {
        kind: 'collection', back, image: d.thumb || item.thumb || (videos[0] && videos[0].thumb) || '',
        title: d.title || (now && now.title) || item.title || '',
        lines: [d.author || (now && now.channel) || item.channel || '',
          now && now.total ? tr('yt.recs.playlist', { index: now.index + 1, count: now.total }) : (d.stats || []).slice(0, 2).join(' · ')],
        text: d.description || '',
        buttons: now
          ? [...(shuffled != null ? [{ id: 'shuffle', label: tr('yt.playlist.shuffle'), icon: 'shuffle', kind: shuffled ? 'filled' : 'tonal' }] : []), ...save]
          : [{ id: 'playAll', label: tr('yt.playlist.playAll'), icon: 'play_arrow', kind: 'filled', enabled: !!(d.firstVideo || videos.length) },
            { id: 'shuffle', label: tr('yt.playlist.shuffle'), icon: 'shuffle', enabled: !!d.shuffle }, ...save],
        rows: rowsOf(videos, playing),
        focusRow: now ? (now.localIndex != null ? now.localIndex : videos.findIndex(v => v.id === playing)) : null,
        loading: !now && (loading || (!!pager && !pager.done && !videos.length && !error)),
        emptyText: error ? tr('yt.playlist.failed', { error }) : tr('yt.nothingYet'),
      };
    }

    return {
      open, close, isOpen: () => !!item, id: () => (item ? item.playlistId : null), event, body,
      follow() { if (item) { scroll = null; bump(); } },
      afterDraw(style) { if (item && scroll == null && style.shownScroll) scroll = style.shownScroll(); },
      scroll: () => scroll, version: () => `${ver}.${savedVer}`,
    };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.playlist = { create, opens };
})(globalThis.__streamxr = globalThis.__streamxr || {});
