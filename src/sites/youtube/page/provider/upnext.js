// YouTube's "Up Next" panel (Queue style): Recommended, and in a playlist a second tab with
// the playlist's videos. A newly started playlist opens on its tab, and whenever the playing
// video changes that tab jumps to the page holding it. Endless Up Next: once you reach the
// next-to-last page of Recommended, YouTube's next batch is fetched in the background (what
// scrolling its sidebar does), so the Next arrow stays available; one request at a time,
// stopping when YouTube has no more, until the list changes (its first video changes).
// A panel controller: see panels.js for the interface.
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create(host) {
    const { actions } = host;
    const per = host.perPage;
    // tab: 'recs' | 'playlist'; each tab's page; seen: "<playlist id>|<playing video id>";
    // jump: show the playing video's page at the next frame.
    let tab = 'recs', recsPage = 0, plPage = 0, seen = '', jump = false;
    let list = null, shown = [];                    // the last frame's playlist, and this page's items
    let moreLoading = false, moreDone = false, moreKey = '';

    function loadMore(all, page, pageCount) {
      const key = all.length ? all[0].id : '';
      if (key !== moreKey) { moreKey = key; moreDone = false; }
      if (!actions.loadMoreRecommendations || moreLoading || moreDone || !all.length || page < pageCount - 2) return;
      moreLoading = true;
      Promise.resolve(actions.loadMoreRecommendations())
        .then(n => { if (!n) moreDone = true; }, err => { moreDone = true; console.warn('[streamxr] loading more Up next failed:', err); })
        .finally(() => { moreLoading = false; });
    }

    // Every frame (shown or not): follow the playlist, so a new one opens on its tab.
    function tick(frame) {
      const st = frame.st;
      list = st.playlist && st.playlist.items && st.playlist.items.length ? st.playlist : null;
      if (!list) { tab = 'recs'; seen = ''; return; }
      // Items are in playlist order (one per position), so the playing video's page is its index's.
      const curPage = () => Math.max(0, Math.floor(list.index / per));
      if (list.id !== seen.split('|')[0]) tab = 'playlist';
      if (`${list.id}|${list.currentId}` !== seen) { plPage = curPage(); seen = `${list.id}|${list.currentId}`; }
      if (jump) { plPage = curPage(); jump = false; }
    }

    function model(frame) {
      const onPlaylist = tab === 'playlist' && !!list;
      const all = onPlaylist ? list.items : frame.st.recommendations || [];
      const pageCount = Math.max(1, Math.ceil(all.length / per));
      if (onPlaylist) plPage = Math.min(plPage, pageCount - 1);
      else { recsPage = Math.min(recsPage, pageCount - 1); loadMore(all, recsPage, pageCount); }
      const page = onPlaylist ? plPage : recsPage;
      shown = all.slice(page * per, page * per + per);
      const m = {
        title: tr('yt.recs.title'), page, pageCount, emptyText: tr('yt.recs.empty'), tab: onPlaylist ? 'playlist' : 'recs',
        tabs: list ? [{ id: 'recs', label: tr('yt.recs.recommended') }, { id: 'playlist', label: tr('yt.recs.playlist', { index: list.index + 1, count: list.count }) }] : null,
        items: shown.map(it => ns.ytVr.card(it, { current: onPlaylist && it.id === list.currentId })),
      };
      return { model: m, key: JSON.stringify(m) };
    }

    function event(ev) {
      const onPlaylist = tab === 'playlist' && !!list;
      if (ev.type === 'tab') { tab = ev.value === 'playlist' ? 'playlist' : 'recs'; if (tab === 'playlist') jump = true; }
      else if (ev.type === 'page') {
        const d = ev.value === 'next' ? 1 : -1;                     // clamped at the next frame
        if (onPlaylist) plPage = Math.max(0, plPage + d); else recsPage = Math.max(0, recsPage + d);
      } else if (ev.type === 'item') {
        const it = shown[+ev.value];
        if (!it) return;
        if (onPlaylist) {
          // A playlist video: play it at its place in the playlist (keeps playing the list).
          if (it.plIndex >= 0) actions.playlistAt(it.plIndex);
          else actions.openVideo(it.id, list.id);
        } else {
          if (it.playlistId) actions.openVideo(it.id, it.playlistId);   // a playlist / mix plays from its first video
          else actions.openVideo(it.id);
          recsPage = 0;
        }
        host.closeMenu();
      }
    }

    return { tick, model, event };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.upNextPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
