// YouTube's feed panels, both in the Catalog style: Explore (YouTube's Home feed with its
// topic chips, then the Explore pages of YouTube's left menu) and You (your own feeds, signed
// in: Subscriptions, Your channel, History, Playlists, Watch later, Liked videos, Movies &
// TV). Each shows its sources as tabs (the row slides when they don't all fit), the loaded
// videos (a pager that loads more pages as you page through) and the current page. A source
// that isn't built yet shows "Coming soon" with the construction icon. A source loads the
// first time it shows. Panel controllers: see panels.js.
//   actions used: browseHome(chip) -> pager (youtube-home.js home(); p.chips after a page),
//   browseSubscriptions() -> pager (youtube-subscriptions.js feed()), browseFeed(name) ->
//   pager (youtube-home.js feedVideos()), browsePlaylist(id) -> pager (youtube-content.js
//   playlistVideos()), myChannelId() -> Promise of id | null (youtube-home.js),
//   channelHeader(id) -> Promise of header (its tabs), channelList(id, tab) -> pager
//   (youtube-channel.js), openVideo(id, playlistId).
(function (ns) {
  'use strict';

  const IMMERSIVE = 'Immersive videos';    // YouTube's 360°/VR chip: shown right after "All"
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  // A panel's sources, in YouTube's left-menu order. Each: id (its name is 'yt.browse.<id>'
  // in the string tables, and with `note` the grey line under the tabs 'yt.browse.<id>Note'),
  // icon (Material Symbols, symbols.js), and either load(actions, chip) (makes the pager;
  // `list` is the playlist its videos play in) with optional chips, or soon (not built yet:
  // "Coming soon"). chips: 'home' (the Home feed's topic chips, from its pager), or a fixed
  // list of chip ids (named 'yt.channel.<id>'), the first one chosen at first.
  const EXPLORE = [
    { id: 'home', icon: 'home', load: (a, chip) => a.browseHome(chip), chips: 'home' },
    { id: 'shorts', icon: 'smart_display', soon: true },
    { id: 'music', icon: 'music_note', soon: true },
    { id: 'movies', icon: 'movie', soon: true },
    { id: 'hype', icon: 'local_fire_department', soon: true },
    { id: 'live', icon: 'sensors', soon: true },
    { id: 'gaming', icon: 'sports_esports', soon: true },
    { id: 'news', icon: 'newspaper', load: a => a.browseFeed('news') },
    { id: 'learning', icon: 'lightbulb', soon: true },
    { id: 'courses', icon: 'school', soon: true },
    { id: 'podcasts', icon: 'podcasts', soon: true },
    { id: 'memberships', icon: 'card_membership', soon: true },
  ];
  const MY_TABS = ['videos', 'shorts', 'live', 'playlists'];   // Your channel's chips (those it has)
  const YOU = [
    { id: 'subs', icon: 'subscriptions', load: a => a.browseSubscriptions(), note: true },
    { id: 'mychannel', icon: 'account_box', load: (a, chip) => myChannel(a, chip, MY_TABS), chips: MY_TABS },
    { id: 'history', icon: 'history', load: a => a.browseFeed('history'), note: true },
    { id: 'playlists', icon: 'playlist_play', load: a => a.browseFeed('playlists'), note: true },
    { id: 'later', icon: 'schedule', load: a => a.browsePlaylist('WL'), list: 'WL', note: true },
    { id: 'liked', icon: 'thumb_up', load: a => a.browsePlaylist('LL'), list: 'LL', note: true },
    { id: 'movies', icon: 'movie', soon: true },
  ];

  // Your channel's list `tab` (one of `tabs`, MY_TABS): a pager that finds your channel's id
  // and which of those tabs it has first (its header: a channel with no live streams has no
  // Live tab), then reads that tab of it (newest first; the first one it has if it lacks
  // `tab`). p.tabs: the ones it has, p.tab: the one read (null until known). With no channel
  // found it's done at once, its message saying so.
  function myChannel(a, tab, tabs) {
    let inner = null;
    const p = {
      items: [], done: false, message: '', tabs: null, tab: null,
      async next() {
        if (!inner) {
          const id = await a.myChannelId();
          if (!id) { p.done = true; p.message = tr('yt.browse.mychannelMissing'); return; }
          const h = await Promise.resolve(a.channelHeader(id)).catch(() => null);
          if (h && h.tabs) {
            p.tabs = tabs.filter(t => t in h.tabs);
            if (p.tabs.length && !p.tabs.includes(tab)) tab = p.tabs[0];
          }
          p.tab = tab;
          inner = a.channelList(id, tab);
        }
        await inner.next();
        p.items = inner.items; p.done = inner.done; p.message = inner.message || '';
      },
    };
    return p;
  }

  // A feed panel: `title` its name's string key, `sources` (above) its tabs.
  function createFeedPanel(host, title, sources) {
    const { actions } = host;
    const perPage = host.perPage;
    let source = sources[0].id;
    let homeChips = [];                                  // the Home feed's chip texts on offer, in display order
    const chipOf = { home: 'All' };                      // source id -> its chosen chip id
    const availOf = {};                                  // source id -> the fixed chips it turned out to have (p.tabs)
    let pager = null, page = 0, loading = false, error = '', ver = 0;
    const bump = () => { ver++; };

    const current = () => sources.find(s => s.id === source);
    const items = () => (pager ? pager.items : []);
    const pageCount = () => Math.max(1, Math.ceil(items().length / perPage));
    const tabs = () => sources.map(({ id, icon }) => ({ id, label: tr(`yt.browse.${id}`), icon }));
    // A source's chips ([{ id, label }]) and its chosen one.
    function chipList(s = current()) {
      if (s.chips === 'home') return homeChips.map(t => ({ id: t, label: t }));
      return (availOf[s.id] || s.chips || []).map(id => ({ id, label: tr(`yt.channel.${id}`) }));
    }
    const chipNow = (s = current()) => chipOf[s.id] || (Array.isArray(s.chips) ? s.chips[0] : null);

    // "All" first, "Immersive videos" second, then YouTube's other (personalised) chips.
    function orderChips(list) {
      const texts = list.map(c => c.text).filter(Boolean);
      const rest = texts.filter(t => t !== 'All' && t !== IMMERSIVE);
      return [...(texts.includes('All') ? ['All'] : []), ...(texts.includes(IMMERSIVE) ? [IMMERSIVE] : []), ...rest];
    }

    // Load one more page of the current list (one request at a time). The Home pager also
    // reports the chips on offer after its first page.
    function loadNext() {
      if (!pager || loading || pager.done) return;
      const p = pager;
      loading = true; bump();
      p.next().then(() => {
        if (p === pager && current().chips === 'home' && p.chips && p.chips.length) homeChips = orderChips(p.chips);
        // A list that found out which of its chips exist (Your channel's tabs), and which it read.
        if (p === pager && p.tabs && p.tabs.length) { availOf[source] = p.tabs; if (p.tab) chipOf[source] = p.tab; }
      }, err => { if (p === pager) error = tr('yt.browse.failed', { error: err && err.message || err }); })
        .finally(() => { if (p === pager) loading = false; bump(); });
    }

    // Start the current source (and chip) from its first page ("Coming soon" ones have none).
    function startList() {
      error = ''; page = 0; loading = false; pager = null;
      const s = current();
      if (s.load) {
        try { pager = s.load(actions, chipNow(s)); }
        catch (err) { error = String(err && err.message || err); }
      }
      bump();
      loadNext();
    }

    function event(ev) {
      if (ev.type === 'tab') {
        if (ev.value !== source && sources.some(x => x.id === ev.value)) { source = ev.value; startList(); }
      } else if (ev.type === 'pill') {
        const c = chipList().find(x => x.id === ev.value);
        if (c && c.id !== chipNow()) { chipOf[source] = c.id; startList(); }
      } else if (ev.type === 'page') {
        page = ev.value === 'next' ? Math.min(pageCount() - 1, page + 1) : Math.max(0, page - 1); bump();
      } else if (ev.type === 'item') {
        const it = items()[page * perPage + +ev.value];
        if (it) actions.openVideo(it.id, it.playlistId || current().list);
      }
    }

    // While shown: start the first source the first time, and keep a page of videos ahead
    // of where you are. Returns the Catalog model.
    function model(frame) {
      const s = current();
      if (!pager && s.load && !error) startList();
      if (pager && !loading && !pager.done && page >= pageCount() - 2) loadNext();
      const message = error || (pager && pager.message) || (pager && pager.done ? tr('yt.nothingYet') : '');
      const chips = chipList(s);
      const m = {
        title: tr(title), tabs: tabs(), tab: source,
        pills: chips, pill: chips.length ? chipNow(s) : null,
        note: s.note ? tr(`yt.browse.${source}Note`) : '',
        items: items().slice(page * perPage, page * perPage + perPage).map(it => ns.ytVr.card(it)),
        page, pageCount: pageCount(), more: !!pager && !pager.done, loading,
        emptyText: s.soon ? tr('yt.comingSoon') : loading ? tr('yt.loading') : message || tr('yt.nothingYet'),
        emptyIcon: s.soon ? 'construction' : null,
        now: frame.now / 1000,                                            // the loading indicator's clock
      };
      // Redraw on any change, and ~30 times a second while the loading indicator shows.
      const spinning = loading && !m.items.length;
      return { model: m, key: `${ver}|${spinning ? Math.floor(frame.now / 33) : ''}` };
    }

    return { model, event };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.browsePanel = { create: host => createFeedPanel(host, 'yt.panel.browse', EXPLORE) };
  ns.ytVr.youPanel = { create: host => createFeedPanel(host, 'yt.panel.you', YOU) };
})(globalThis.__streamxr = globalThis.__streamxr || {});
