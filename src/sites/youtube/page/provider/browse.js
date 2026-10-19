// YouTube's feed panels, both in the Catalog style: Explore (YouTube's Home feed with its
// topic chips, then the Explore pages of YouTube's left menu) and You (your own feeds, signed
// in: Subscriptions, Channels (the ones you subscribe to: a click opens one in the Channel
// panel), Your channel, History, Playlists, Watch later, Liked videos, Movies &
// TV). Each shows its sources as tabs (the row slides when they don't all fit), the loaded
// videos (a pager that loads more pages as you page through) and the current page. A source
// that isn't built yet shows "Coming soon" with the construction icon. A source loads the
// first time it shows. Panel controllers: see panels.js.
//   actions used: browseHome(chip) -> pager (youtube-home.js home(); p.chips after a page),
//   browseSubscriptions() -> pager (youtube-subscriptions.js feed()), browseChannels() ->
//   pager (youtube-subscriptions.js channels()), browseSections(name) -> pager of sections
//   (youtube-home.js feed(): the Explore pages), browseFeed(name) ->
//   pager (youtube-home.js feedVideos()), browsePlaylist(id) -> pager (youtube-content.js
//   playlistVideos()), myChannelId() -> Promise of id | null (youtube-home.js),
//   channelHeader(id) -> Promise of header (its tabs), channelList(id, tab) -> pager
//   (youtube-channel.js), openVideo(id, playlistId).
(function (ns) {
  'use strict';

  const IMMERSIVE = 'Immersive videos';    // YouTube's 360°/VR chip: shown right after "All"
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  // A feed of titled sections (an Explore page: Live's "Live Now", "Upcoming Live Streams" ...)
  // as one list, offering its sections as choices (p.sorts: "All" first, then each section's
  // title in the order they arrive; chip: the section to show, ALL or none for every one).
  // All: the sections run together; the first time, up to PRELOAD more pages are read at once
  // so sections that only come later (e.g. Gaming's game shelves) are offered too. A chosen
  // section with a "View all" (youtube-home.js viewAllOf) shows that whole list instead, page
  // by page; one without stops when later pages bring nothing more of it (SECTION_TRIES).
  // tab: the page's own tab to read (News: "Top stories", "Sports" ...), or none.
  const ALL = '*', SECTION_TRIES = 3, PRELOAD = 3;
  function sectionList(a, name, chip, tab) {
    const inner = a.browseSections(name, tab), want = chip && chip !== ALL ? chip : null;
    const sections = [];
    let dry = 0, full = null, first = true;
    const p = {
      items: [], done: false, message: '', sorts: [],
      async next() {
        if (full) { await full.next(); p.items = full.items; p.done = full.done; return; }
        sections.push(...((await inner.next()) || []));
        if (first && !want) for (let i = 0; i < PRELOAD && !inner.done; i++) sections.push(...((await inner.next()) || []));
        first = false;
        const titles = [...new Set(sections.map(s => s.title).filter(Boolean))];
        p.sorts = [{ text: ALL, label: tr('yt.browse.all'), selected: !want },
          ...titles.map(t => ({ text: t, selected: t === want }))];
        p.message = inner.message || '';
        // The chosen section's whole list, where it has one.
        const chosen = want && sections.find(s => s.title === want && s.viewAll);
        if (chosen) {
          full = a.browseViewAll(chosen.viewAll);
          await full.next(); p.items = full.items; p.done = full.done;
          return;
        }
        const before = p.items.length;
        p.items = sections.filter(s => !want || s.title === want).flatMap(s => s.items);
        dry = want && p.items.length === before ? dry + 1 : 0;
        p.done = inner.done || dry >= SECTION_TRIES;
      },
    };
    return p;
  }

  // The News page as one list, its own tabs (Top stories, Sports, Business ...) offered as the
  // choices (p.sorts, the one shown selected; chip: a tab's title, none: YouTube's first). A
  // tab's sections run together (its posts left out).
  function newsList(a, chip) {
    const inner = a.browseSections('news', chip && chip !== ALL ? chip : undefined);
    const p = {
      items: [], done: false, message: '', sorts: [],
      async next() {
        const got = (await inner.next()) || [];
        p.items = [...p.items, ...got.flatMap(s => s.items)];
        p.sorts = (inner.tabs || []).map(t => ({ text: t.title, selected: !!t.selected }));
        p.message = inner.message || ''; p.done = inner.done;
      },
    };
    return p;
  }

  // A panel's sources, in YouTube's left-menu order. Each: id (its name is 'yt.browse.<id>'
  // in the string tables, and with `note` the grey line under the tabs 'yt.browse.<id>Note'),
  // icon (Material Symbols, symbols.js), and either load(actions, chip) (makes the pager;
  // `list` is the playlist its videos play in) with optional chips, or soon (not built yet:
  // "Coming soon"). card (optional): how an item becomes a card (default: a video card);
  // pick(host, item) (optional): what clicking one does (default: play it). chips: 'home'
  // (the Home feed's topic chips, from its pager), 'sorts' (the choices its pager offers:
  // p.sorts: [{ text (its id), label (optional), selected }], e.g. sorts or sections), or a
  // fixed list of chip ids (named
  // 'yt.channel.<id>'), the first one chosen at first.
  const EXPLORE = [
    { id: 'home', icon: 'home', load: (a, chip) => a.browseHome(chip), chips: 'home' },
    { id: 'shorts', icon: 'smart_display', soon: true },
    { id: 'music', icon: 'music_note', load: (a, chip) => sectionList(a, 'music', chip), chips: 'sorts' },
    { id: 'movies', icon: 'movie', soon: true },
    { id: 'hype', icon: 'local_fire_department', load: (a, chip) => sectionList(a, 'hype', chip), chips: 'sorts' },
    { id: 'live', icon: 'sensors', load: (a, chip) => sectionList(a, 'live', chip), chips: 'sorts' },
    { id: 'gaming', icon: 'sports_esports', load: (a, chip) => sectionList(a, 'gaming', chip), chips: 'sorts' },
    { id: 'news', icon: 'newspaper', load: (a, chip) => newsList(a, chip), chips: 'sorts' },
    { id: 'learning', icon: 'lightbulb', soon: true },
    { id: 'courses', icon: 'school', load: (a, chip) => sectionList(a, 'courses', chip), chips: 'sorts' },
    { id: 'podcasts', icon: 'podcasts', load: (a, chip) => sectionList(a, 'podcasts', chip), chips: 'sorts' },
    { id: 'memberships', icon: 'card_membership', load: (a, chip) => sectionList(a, 'memberships', chip), chips: 'sorts' },
  ];
  // A subscribed channel (youtube-subscriptions.js channels()) as a card: its round picture,
  // name, handle · subscribers, and the bell's setting when YouTube offers one; a flag with
  // its section's title when it's listed apart (e.g. "Purchased": a channel you're a member of).
  function channelCard(c) {
    const n = c.notifications || {}, cur = String(n.current || '').toLowerCase();
    const now = (n.options || []).find(o => o.selected) || (n.options || []).find(o => cur && cur.includes(String(o.label).toLowerCase()));
    const bell = now ? now.label : '';
    return { title: c.title, thumb: c.thumb, fit: 'round', flags: c.aside ? [{ text: c.aside, bg: 'tertiary', fg: 'surface' }] : [],
      lines: [{ text: [c.handle, c.subscribers].filter(Boolean).join(' · '), badge: c.badge || null },
        ...(bell ? [{ text: tr('yt.bell.line', { name: bell }) }] : [])] };
  }

  // Clicking a channel: show it in the Channel panel (left of the zone).
  // hint: what's known of it (default: one of your subscriptions, with its bell, from the list).
  function showChannel(host, c, hint = { subscribed: true, notifications: c.notifications }) {
    const ch = host.panel && host.panel('channel');
    if (ch && ch.show) ch.show(c.id, hint);
  }

  const MY_TABS = ['videos', 'shorts', 'live', 'playlists'];   // Your channel's chips (those it has)
  const YOU = [
    { id: 'subs', icon: 'subscriptions', load: a => a.browseSubscriptions(), note: true },
    { id: 'channels', icon: 'person', load: (a, sort) => a.browseChannels(sort), chips: 'sorts', note: true, card: channelCard, pick: showChannel },
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
    // The list's layout: square cards when most items have a square picture (podcasts' covers:
    // the others then show their picture whole in the square), else the standard ones; and how
    // many cards that layout fits on a page.
    const shapeNow = () => (items().filter(it => it.square).length * 2 > items().length ? 'square' : null);
    const perPage = () => (host.style.perPageFor ? host.style.perPageFor(shapeNow()) : host.perPage);
    let source = sources[0].id;
    let homeChips = [];                                  // the Home feed's chip texts on offer, in display order
    const sortsOf = {};                                  // source id -> the choices its pager offers, [{ id, label }] (chips: 'sorts')
    const chipOf = { home: 'All' };                      // source id -> its chosen chip id
    const availOf = {};                                  // source id -> the fixed chips it turned out to have (p.tabs)
    let pager = null, page = 0, loading = false, error = '', ver = 0;
    const playlist = ns.ytVr.playlist.create(actions);   // a playlist card opened in place of the list (playlist.js)
    const bump = () => { ver++; };

    const current = () => sources.find(s => s.id === source);
    const items = () => (pager ? pager.items : []);
    const pageCount = () => Math.max(1, Math.ceil(items().length / perPage()));
    const tabs = () => sources.map(({ id, icon }) => ({ id, label: tr(`yt.browse.${id}`), icon }));
    // A source's chips ([{ id, label }]) and its chosen one.
    function chipList(s = current()) {
      if (s.chips === 'home') return homeChips.map(t => ({ id: t, label: t }));
      if (s.chips === 'sorts') return sortsOf[s.id] || [];
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
        // A list with its own choices (the Channels list's sorts, a feed's sections): offered as its pills, the one
        // it shows chosen.
        if (p === pager && current().chips === 'sorts' && p.sorts && p.sorts.length) {
          sortsOf[source] = p.sorts.map(x => ({ id: x.text, label: x.label || x.text }));
          const on = p.sorts.find(x => x.selected); if (on) chipOf[source] = on.text;
        }
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
      // An open playlist takes its own controls; a tab (the same one too) closes it.
      if (playlist.isOpen()) {
        if (ev.type === 'tab') { playlist.close(); if (ev.value === source) return; }
        else if (playlist.event(ev)) return;
      }
      if (ev.type === 'tab') {
        if (ev.value !== source && sources.some(x => x.id === ev.value)) { source = ev.value; startList(); }
      } else if (ev.type === 'pill') {
        const c = chipList().find(x => x.id === ev.value);
        if (c && c.id !== chipNow()) { chipOf[source] = c.id; startList(); }
      } else if (ev.type === 'page') {
        page = ev.value === 'next' ? Math.min(pageCount() - 1, page + 1) : Math.max(0, page - 1); bump();
      } else if (ev.type === 'item') {
        const it = items()[page * perPage() + +ev.value];
        if (it && current().pick) current().pick(host, it);
        // a creator card: their channel, on its Membership tab when its offer can be asked for
        else if (it && it.type === 'channel') showChannel(host, it, it.offerParams ? { tab: 'membership', offerParams: it.offerParams } : {});
        else if (ns.ytVr.playlist.opens(it)) playlist.open(it);           // a playlist: its page, in place of the list
        else if (it) actions.openVideo(it.id, it.playlistId || current().list);
      }
    }

    // While shown: start the first source the first time, and keep a page of videos ahead
    // of where you are. Returns the Catalog model.
    function model(frame) {
      const shape = shapeNow();                          // (the layout, once per frame)
      const s = current();
      if (!pager && s.load && !error) startList();
      if (pager && !loading && !pager.done && page >= pageCount() - 2) loadNext();
      const message = error || (pager && pager.message) || (pager && pager.done ? tr('yt.nothingYet') : '');
      const chips = chipList(s);
      const m = {
        title: tr(title), tabs: tabs(), tab: source,
        pills: chips, pill: chips.length ? chipNow(s) : null,
        note: s.note ? tr(`yt.browse.${source}Note`) : '',
        shape: shape,
        items: items().slice(page * perPage(), page * perPage() + perPage()).map(it => (s.card ? s.card(it) : ns.ytVr.card(it)))
          .map(c => (shape === 'square' && !c.square && !c.fit ? { ...c, fit: 'contain' } : c)),
        page, pageCount: pageCount(), more: !!pager && !pager.done, loading,
        emptyText: s.soon ? tr('yt.comingSoon') : loading ? tr('yt.loading') : message || tr('yt.nothingYet'),
        emptyIcon: s.soon ? 'construction' : null,
        now: frame.now / 1000,                                            // the loading indicator's clock
        body: playlist.body(tr(`yt.browse.${source}`), host.style), scroll: playlist.scroll(),
      };
      // Redraw on any change, and ~30 times a second while the loading indicator shows.
      const spinning = m.body ? m.body.loading : loading && !m.items.length;
      return { model: m, key: `${ver}|${playlist.version()}|${Math.round(playlist.scroll())}|${ns.youtubeData.thumbsVersion()}|${spinning ? Math.floor(frame.now / 33) : ''}` };
    }

    return { model, event };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.browsePanel = { create: host => createFeedPanel(host, 'yt.panel.browse', EXPLORE) };
  ns.ytVr.youPanel = { create: host => createFeedPanel(host, 'yt.panel.you', YOU) };
})(globalThis.__streamxr = globalThis.__streamxr || {});
