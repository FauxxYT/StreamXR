// YouTube's "Up Next" panel (Queue style): Recommended, and in a playlist a second tab with
// the playlist as a page (playlist.js, 'live': its details, Shuffle as an on / off toggle,
// Save, and its videos as rows, the playing one brought into view). A newly started playlist
// opens on its tab, and whenever the playing video changes that tab brings it into view.
// A playlist card in Recommended opens that playlist as a page in Recommended's place (a
// back button returns). Endless Up Next: once you reach the next-to-last page of
// Recommended, YouTube's next batch is fetched in the background (what scrolling its sidebar
// does), so the Next arrow stays available; one request at a time, stopping when YouTube has
// no more, until the list changes (its first video changes).
// A panel controller: see panels.js for the interface.
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create(host) {
    const { actions } = host;
    const per = host.perPage;
    // tab: 'recs' | 'playlist'; Recommended's page; seen: "<playlist id>|<playing video id>".
    let tab = 'recs', recsPage = 0, seen = '';
    let list = null, shown = [];                    // the last frame's playlist, and this page's items
    let moreLoading = false, moreDone = false, moreKey = '';
    const opened = ns.ytVr.playlist.create(actions);   // a Recommended playlist card, as a page
    const playing = ns.ytVr.playlist.create(actions);  // the playing playlist (its tab)
    // The playing playlist for its page, and playing one of its rows: at its place in the
    // playlist (keeps playing the list).
    const live = () => ({ items: list ? list.items : [], currentId: list && list.currentId, localIndex: list ? list.index : null,
      index: list ? list.index : 0, total: list ? list.count : 0, title: list ? list.title : '' });
    live.play = it => { if (it.plIndex >= 0) actions.playlistAt(it.plIndex); else if (it.id) actions.openVideo(it.id, list && list.id); };

    function loadMore(all, page, pageCount) {
      const key = all.length ? all[0].id : '';
      if (key !== moreKey) { moreKey = key; moreDone = false; }
      if (!actions.loadMoreRecommendations || moreLoading || moreDone || !all.length || page < pageCount - 2) return;
      moreLoading = true;
      Promise.resolve(actions.loadMoreRecommendations())
        .then(n => { if (!n) moreDone = true; }, err => { moreDone = true; console.warn('[streamxr] loading more Up next failed:', err); })
        .finally(() => { moreLoading = false; });
    }

    // Every frame (shown or not): follow the playlist, so a new one opens on its tab, and a
    // new video is brought into view.
    function tick(frame) {
      const st = frame.st;
      list = st.playlist && st.playlist.items && st.playlist.items.length ? st.playlist : null;
      if (!list) { tab = 'recs'; seen = ''; playing.close(); return; }
      if (playing.id() !== list.id) playing.open({ playlistId: list.id, title: list.title }, live);
      if (list.id !== seen.split('|')[0]) tab = 'playlist';
      if (`${list.id}|${list.currentId}` !== seen) { seen = `${list.id}|${list.currentId}`; playing.follow(); }
    }

    function model(frame) {
      const onPlaylist = tab === 'playlist' && !!list;
      const all = onPlaylist ? [] : frame.st.recommendations || [];
      const view = onPlaylist ? playing : opened.isOpen() ? opened : null;
      const pageCount = view ? 1 : Math.max(1, Math.ceil(all.length / per));
      if (!view) { recsPage = Math.min(recsPage, pageCount - 1); loadMore(all, recsPage, pageCount); }
      const page = view ? 0 : recsPage;
      shown = view ? [] : all.slice(page * per, page * per + per);
      const m = {
        title: tr('yt.recs.title'), page, pageCount, emptyText: tr('yt.recs.empty'), tab: onPlaylist ? 'playlist' : 'recs',
        tabs: list ? [{ id: 'recs', label: tr('yt.recs.recommended') }, { id: 'playlist', label: tr('yt.recs.playlist', { index: list.index + 1, count: list.count }) }] : null,
        items: shown.map(it => ns.ytVr.card(it)),
        body: view ? view.body(onPlaylist ? null : tr('yt.recs.recommended'), host.style) : null,
        scroll: view ? view.scroll() : 0, now: frame.now / 1000,
      };
      const spinning = m.body && m.body.loading;
      // (a playlist page's key: what changes it, not its rows: a long playlist has thousands)
      const key = view ? [tab, view.version(), Math.round(view.scroll() || 0), list && list.currentId, list && list.items.length,
        list && list.items.filter(it => it.views).length, onPlaylist && actions.playlistShuffled(), ns.youtubeData.thumbsVersion(),
        JSON.stringify(m.tabs), spinning ? Math.floor(frame.now / 33) : ''].join('|') : JSON.stringify(m);
      return { model: m, key };
    }

    function afterDraw() {
      if (tab === 'playlist' && list) playing.afterDraw(host.style);
      else if (opened.isOpen()) opened.afterDraw(host.style);
    }

    function event(ev) {
      const onPlaylist = tab === 'playlist' && !!list;
      if (ev.type === 'tab') {
        const t = ev.value === 'playlist' ? 'playlist' : 'recs';
        if (t === 'recs' && tab === 'recs') opened.close();              // Recommended again: back to its cards
        tab = t;
        if (tab === 'playlist') playing.follow();
        return;
      }
      if (onPlaylist) { playing.event(ev); return; }
      if (opened.isOpen() && opened.event(ev)) return;
      if (ev.type === 'page') {
        recsPage = Math.max(0, recsPage + (ev.value === 'next' ? 1 : -1));   // clamped at the next frame
      } else if (ev.type === 'item') {
        const it = shown[+ev.value];
        if (!it) return;
        if (ns.ytVr.playlist.opens(it)) { opened.open(it); return; }       // a playlist: its page, in place of the cards
        if (it.playlistId) actions.openVideo(it.id, it.playlistId);       // a mix plays from its first video
        else actions.openVideo(it.id);
        recsPage = 0;
        host.closeMenu();
      }
    }

    return { tick, model, event, afterDraw };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.upNextPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
