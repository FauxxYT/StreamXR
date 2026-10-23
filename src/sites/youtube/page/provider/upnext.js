// YouTube's "Up Next" panel (Queue style): Recommended; in a playlist a tab with the playlist
// as a page (playlist.js, 'live': its details, Shuffle as an on / off toggle, Save, and its
// videos as rows, the playing one brought into view); and once a video's end screen starts,
// an End screen tab with its tiles as cards (suggested videos and playlists, other channels:
// provider.js endScreen()). A newly started playlist opens on its tab, and whenever the
// playing video changes that tab brings it into view; an end screen starting switches to its
// tab and opens the panel if it's closed; the tab stays until another video starts. A playlist
// card (in Recommended or the end screen) opens that playlist as a page in the tab's place (a
// back button returns). Endless Up Next: once you reach the next-to-last page of
// Recommended, YouTube's next batch is fetched in the background (what scrolling its sidebar
// does), so the Next arrow stays available; one request at a time, stopping when YouTube has
// no more, until the list changes (its first video changes).
// A panel controller: see panels.js for the interface.
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  const SETTLE_MS = 1500;                            // after a video switch, wait this long before its end screen can start

  // An end screen tile as an item for a card (cards.js): a video, a playlist or a channel.
  function tileItem(t) {
    if (t.type === 'channel') return { type: 'channel', id: t.channelId, title: t.title, thumb: t.image };
    if (t.type === 'playlist') return { type: 'playlist', playlistId: t.playlistId, id: t.videoId || '', title: t.title, channel: t.subtitle, thumb: t.image };
    return { type: 'video', id: t.videoId, title: t.title, views: t.subtitle, thumb: t.image };
  }

  function create(host) {
    const { actions } = host;
    const per = host.perPage;
    // tab: 'recs' | 'playlist' | 'end'; Recommended's and the end screen's pages; seen:
    // "<playlist id>|<playing video id>".
    let tab = 'recs', recsPage = 0, endPage = 0, seen = '';
    let list = null, shown = [];                    // the last frame's playlist, and this page's items
    let ends = [], endFor = null, endOn = false, endSince = 0;   // the end screen's items, the video they're for (since when), whether it has started
    let moreLoading = false, moreDone = false, moreKey = '';
    const opened = ns.ytVr.playlist.create(actions);   // a playlist card, as a page
    const playing = ns.ytVr.playlist.create(actions);  // the playing playlist (its tab)
    // The playing playlist for its page, and playing one of its rows: at its place in the
    // playlist (keeps playing the list).
    const live = () => ({ items: list ? list.items : [], queue: !!(list && list.queue), currentId: list && list.currentId, localIndex: list ? list.index : null,
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

    // Every frame (shown or not): the end screen (its tab once it starts, until another video
    // starts), and follow the playlist, so a new one opens on its tab, and a new video is
    // brought into view.
    function tick(frame) {
      const st = frame.st;
      const vid = ns.youtubeData.currentVideoId();
      if (vid !== endFor) {                       // another video: no end screen until its own starts
        endFor = vid; endSince = frame.now; endOn = false; ends = []; endPage = 0;
        if (tab === 'end') { tab = 'recs'; opened.close(); }
      }
      // Only this video's tiles, and only once it has settled (just after a switch the
      // player's time can still be the previous video's).
      const es = st.endScreen || {}, tiles = es.videoId === vid ? es.tiles || [] : [];
      if (!endOn && tiles.length && frame.now - endSince > SETTLE_MS && st.time >= Math.min(...tiles.map(t => t.start))) {
        endOn = true; ends = tiles.map(tileItem); tab = 'end'; opened.close();
        if (!host.isOpen()) host.open();
        if (host.reveal) host.reveal();           // (panels hidden by auto-hide come back for it)
      }
      list = st.playlist && st.playlist.items && st.playlist.items.length ? st.playlist : null;
      if (!list) { if (tab === 'playlist') tab = 'recs'; seen = ''; playing.close(); return; }
      if (playing.id() !== list.id) playing.open({ playlistId: list.id, title: list.title }, live);
      // A new playlist opens on its tab; YouTube's queue doesn't (it starts when you add to it:
      // jumping there would be jarring), its tab just appears.
      if (list.id !== seen.split('|')[0] && !endOn && !list.queue) tab = 'playlist';
      if (`${list.id}|${list.currentId}` !== seen) { seen = `${list.id}|${list.currentId}`; playing.follow(); }
    }

    function model(frame) {
      const onPlaylist = tab === 'playlist' && !!list, onEnd = tab === 'end' && endOn;
      const all = onPlaylist ? [] : onEnd ? ends : frame.st.recommendations || [];
      const view = onPlaylist ? playing : opened.isOpen() ? opened : null;
      const pageCount = view ? 1 : Math.max(1, Math.ceil(all.length / per));
      if (!view && onEnd) endPage = Math.min(endPage, pageCount - 1);
      else if (!view) { recsPage = Math.min(recsPage, pageCount - 1); loadMore(all, recsPage, pageCount); }
      const page = view ? 0 : onEnd ? endPage : recsPage;
      shown = view ? [] : all.slice(page * per, page * per + per);
      const m = {
        title: tr('yt.recs.title'), page, pageCount, emptyText: tr('yt.recs.empty'), tab: onPlaylist ? 'playlist' : onEnd ? 'end' : 'recs',
        tabs: list || endOn ? [{ id: 'recs', label: tr('yt.recs.recommended') },
          ...(list ? [{ id: 'playlist', label: tr(list.queue ? 'yt.recs.queue' : 'yt.recs.playlist', { index: list.index + 1, count: list.count }) }] : []),   // (YouTube's queue takes the playlist's place)
          ...(endOn ? [{ id: 'end', label: tr('yt.recs.endScreen') }] : [])] : null,
        items: shown.map(it => ns.ytVr.card(it)),
        body: view ? view.body(onPlaylist ? null : tr(onEnd ? 'yt.recs.endScreen' : 'yt.recs.recommended'), host.style) : null,
        scroll: view ? view.scroll() : 0, now: frame.now / 1000,
      };
      // (the queue's Save or Clear filled while its menu or dialog is up; Save's menu, once
      // gone, isn't asked for any more)
      if (inUse === 'saveQueue' && !asking && performance.now() - menuSeenAt > 300) inUse = null;
      if (m.body && inUse) m.body.buttons = m.body.buttons.map(b => (b.id === inUse ? { ...b, kind: 'filled' } : b));
      const spinning = m.body && m.body.loading;
      // (a playlist page's key: what changes it, not its rows: a long playlist has thousands)
      const key = view ? [tab, inUse, view.version(), Math.round(view.scroll() || 0), list && list.currentId, list && list.items.length,
        list && list.items.filter(it => it.views).length, onPlaylist && actions.playlistShuffled(), ns.youtubeData.thumbsVersion(),
        JSON.stringify(m.tabs), spinning ? Math.floor(frame.now / 33) : ''].join('|') : JSON.stringify(m);
      return { model: m, key };
    }

    // ---- the queue's Clear and Save (its tab's buttons)
    // inUse: the button whose menu or dialogs are up ('saveQueue' | 'clearQueue'), drawn filled
    // in the site's colour meanwhile; menuSeenAt: when the Save menu was last asked for (it
    // closes by itself on a click elsewhere); asking: a dialog of Save's still up.
    let inUse = null, menuSeenAt = 0, asking = false;
    // Clear: asked first (no Undo here), then the Queue box's own Clear.
    function clearQueue() {
      inUse = 'clearQueue';
      Promise.resolve(host.confirm({ title: tr('yt.queue.clearTitle'), text: tr('yt.queue.clearText'), confirm: tr('yt.queue.clear'), danger: true }))
        .then(yes => { if (yes && !actions.clearQueue()) console.warn('[streamxr] couldn’t clear the queue'); })
        .finally(() => { inUse = null; });
    }
    // Save: a menu (on the Save button) of "New playlist…", then Watch later and your playlists
    // (ticked when one holds all of the queue already); a choice adds every queued video.
    // qsave: { ids (the queue's videos it's for), list: [{ id, title, saved, busy }] | null,
    // loading, note }.
    let qsave = { ids: [], list: null, loading: false, note: '' };
    const queueIds = () => (list && list.queue ? list.items.map(it => it.id).filter(Boolean) : []);
    function openSave() {
      const ids = queueIds();
      qsave = { ids, list: null, loading: true, note: '' }; inUse = 'saveQueue'; menuSeenAt = performance.now();
      host.openMenu('action:saveQueue', { below: true });   // (a dropdown under the button)
      Promise.resolve(actions.queueSaveTargets(list && list.id)).then(l => {
        if (qsave.ids !== ids) return;
        qsave = { ...qsave, list: l.map(o => ({ ...o, busy: false })), loading: false, note: l.length ? '' : tr('yt.save.signIn') };
      }, err => { if (qsave.ids === ids) qsave = { ...qsave, loading: false, note: tr('yt.save.failed', { error: err && err.message || err }) }; });
    }
    function chooseSave(id) {
      const ids = qsave.ids;
      if (id === 'new') {                                 // a new playlist: its name typed in a dialog
        host.closeMenu();
        let name = ''; asking = true;
        Promise.resolve(host.prompt({ title: tr('yt.queue.newTitle'), placeholder: tr('yt.queue.namePlaceholder'), confirm: tr('yt.queue.create') }))
          .then(n => { name = n || ''; return name && actions.createPlaylist(name, ids); })
          .then(res => {
            if (!res) return null;
            // How it went, in a dialog that only informs (OK closes it).
            return host.confirm({ title: res.ok ? tr('yt.queue.created') : tr('yt.save.failed', { error: res.error || '' }),
              text: res.ok ? name : '', confirm: tr('yt.members.ok'), cancel: null });
          })
          .finally(() => { asking = false; inUse = null; });
        return;
      }
      const row = qsave.list && qsave.list.find(o => o.id === id);
      if (!row || row.busy || row.saved) return;
      row.busy = true; qsave = { ...qsave, note: '' };
      Promise.resolve(actions.addToPlaylist(id, ids)).then(res => {
        row.busy = false;
        if (res && res.ok) row.saved = true;
        else qsave = { ...qsave, note: tr('yt.save.failed', { error: res && res.error || '' }) };
        qsave = { ...qsave };
      });
    }
    // The Save menu's items, each frame while it's open (host.openMenu).
    function menu(local) {
      if (local !== 'action:saveQueue') return null;
      menuSeenAt = performance.now();
      const rows = qsave.list || [];
      return {
        items: [{ id: 'new', text: tr('yt.queue.newPlaylist'), icons: ['playlist_add'] },
          ...rows.map(o => ({ id: o.id, text: o.busy ? `${o.title}\n${tr('yt.save.busy')}` : o.title, on: o.saved, disabled: o.busy || o.saved, icons: [] }))],
        note: qsave.loading && !rows.length ? tr('yt.loading') : qsave.note || null, scroll: true, width: 520, stay: true,
      };
    }

    function afterDraw() {
      if (tab === 'playlist' && list) playing.afterDraw(host.style);
      else if (opened.isOpen()) opened.afterDraw(host.style);
    }

    function event(ev) {
      const onPlaylist = tab === 'playlist' && !!list, onEnd = tab === 'end' && endOn;
      if (ev.type === 'tab') {
        opened.close();                                                  // (any tab, the same one too: back to its cards)
        tab = ev.value === 'playlist' || ev.value === 'end' ? ev.value : 'recs';
        if (tab === 'playlist') playing.follow();
        return;
      }
      if (ev.type === 'menu' && ev.menu === 'action:saveQueue') { chooseSave(ev.value); return; }
      if (onPlaylist && list.queue && ev.type === 'action' && ev.value === 'saveQueue') { openSave(); return; }
      if (onPlaylist && list.queue && ev.type === 'action' && ev.value === 'clearQueue') { clearQueue(); return; }
      if (onPlaylist) { playing.event(ev); return; }
      if (opened.isOpen() && opened.event(ev)) return;
      if (ev.type === 'page') {
        const d = ev.value === 'next' ? 1 : -1;                         // clamped at the next frame
        if (onEnd) endPage = Math.max(0, endPage + d); else recsPage = Math.max(0, recsPage + d);
      } else if (ev.type === 'quick') {                                   // a card's Add to queue
        const it = shown[+ev.value];
        if (it && it.id) actions.addToQueue(it.id);
      } else if (ev.type === 'item') {
        const it = shown[+ev.value];
        if (!it) return;
        if (ns.ytVr.playlist.opens(it)) { opened.open(it); return; }       // a playlist: its page, in place of the cards
        if (it.type === 'channel') {                                     // another channel (the end screen): the Channel panel
          const ch = host.panel && host.panel('channel');
          if (ch && ch.show) ch.show(it.id, {});
          return;
        }
        if (it.playlistId) actions.openVideo(it.id, it.playlistId);       // a mix plays from its first video
        else actions.openVideo(it.id);
        recsPage = 0;
        host.closeMenu();
      }
    }

    return { tick, model, event, menu, afterDraw };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.upNextPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
