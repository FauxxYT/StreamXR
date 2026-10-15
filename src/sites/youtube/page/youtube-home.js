// YouTube's Home page and the feeds in its left menu, read without leaving the watch page:
// the Home feed (with its topic chips, e.g. "Immersive videos"), the Explore pages (Live,
// Gaming, News, Sports, Music, Podcasts, Courses ...), the signed-in feeds (Subscriptions,
// History, You), the left menu itself, your own channel's id, and search suggestions. Everything comes from
// YouTube's own browse API, so the video keeps playing. Lists are pagers (`p.next()` loads
// a page, see youtube-data.js). Items have the Up Next shape (Shorts add `short: true`).
// Builds on youtube-channel.js's readers (load it first). Reference with live-probed notes:
// the "YouTube Home Page Data" doc.
(function (ns) {
  'use strict';

  const D = ns.youtubeData, C = ns.youtubeChannel;
  const { strOf, dig, findKey } = D;

  // Browse ids (and params) of the left menu's feeds (Oct 2026). guide() reads the live list.
  // The signed-in ones (subscriptions, history, library, playlists, watchLater, liked) show a
  // "sign in" message while signed out. History and Playlists are read by the You panel, News by Explore.
  const FEEDS = {
    home: { title: 'Home', browseId: 'FEwhat_to_watch' },
    live: { title: 'Live', browseId: 'UC4R8DWoMoI7CAwX8_LjQHig' },
    gaming: { title: 'Gaming', browseId: 'UCOpNcN46UbXVtpKMrmU4Abg' },
    news: { title: 'News', browseId: 'UCYfdidRxbB8Qhf0Nx7ioOYw' },
    sports: { title: 'Sports', browseId: 'UCEgdi0XIXXZ-qJOFPf4JSKw' },
    music: { title: 'Music', browseId: 'UC-9-kyTW8ZkZNDHQJ6FgpwQ' },
    podcasts: { title: 'Podcasts', browseId: 'FEpodcasts_destination', params: 'qgcCCAE=' },   // refuses the request without params
    courses: { title: 'Courses', browseId: 'FEcourses_destination' },
    hype: { title: 'Hype', browseId: 'FEhype_leaderboard' },
    memberships: { title: 'Memberships', browseId: 'FEchannel_memberships' },
    movies: { title: 'Movies & TV', browseId: 'FEstorefront' },        // lists only: paid films can't play in VR
    playables: { title: 'Playables', browseId: 'FEmini_app_destination' },   // browser games, not videos
    subscriptions: { title: 'Subscriptions', browseId: 'FEsubscriptions' },
    history: { title: 'History', browseId: 'FEhistory' },
    library: { title: 'You', browseId: 'FElibrary' },
    playlists: { title: 'Playlists', browseId: 'FEplaylist_aggregation' },   // your playlists (and saved ones)
    watchLater: { title: 'Watch later', browseId: 'VLWL' },
    liked: { title: 'Liked videos', browseId: 'VLLL' },
  };

  const browse = feed => D.innertube('browse', { browseId: feed.browseId, ...(feed.params ? { params: decodeURIComponent(feed.params) } : {}) });
  const more = token => D.innertube('browse', { continuation: token });

  // ---------------------------------------------------------------- sections
  // The entries of a feed response: a first page's grid / section list, or a later page's
  // (or a chip's re-sorted) continuation items.
  function entriesOf(r) {
    const acts = [...(r.onResponseReceivedActions || []), ...(r.onResponseReceivedEndpoints || []), ...(r.onResponseReceivedCommands || [])];
    const lists = acts.map(a => dig(a.appendContinuationItemsAction || a.reloadContinuationItemsCommand, 'continuationItems')).filter(Boolean);
    if (lists.length) return lists.flat();
    const c = C.tabContent(r);
    return dig(findKey(c, 'richGridRenderer'), 'contents') || dig(findKey(c, 'sectionListRenderer'), 'contents') || [];
  }

  // A feed page as sections: [{ title, items, posts }]. Shelves ("Shorts", "Top news",
  // "Live Now" ...) become their own sections; loose grid items in a row between them are
  // gathered into one untitled section ('').
  function sectionsOf(r) {
    const out = [];
    let loose = null;
    for (const e of entriesOf(r)) {
      if (e.continuationItemRenderer) continue;
      const shelf = findKey(e, 'richShelfRenderer') || findKey(e, 'shelfRenderer') || findKey(e, 'reelShelfRenderer');
      if (shelf) {
        loose = null;
        const got = C.collect(shelf.contents || shelf.content || shelf.items || shelf);
        if (got.items.length || got.posts.length) out.push({ title: strOf(shelf.title), items: got.items, posts: got.posts });
        continue;
      }
      const got = C.collect(e);
      if (!got.items.length && !got.posts.length) continue;
      if (!loose) { loose = { title: '', items: [], posts: [] }; out.push(loose); }
      loose.items.push(...got.items);
      loose.posts.push(...got.posts);
    }
    return out;
  }

  // The topic chips of a feed response: [{ text, selected, token }]. Two shapes: the older
  // chipCloudChipRenderer (Home) and the newer chipViewModel (channel tabs; checked for in
  // case other feeds switch).
  function chipsOf(r) {
    const older = C.findKeyAll(r, 'chipCloudChipRenderer').map(c => ({
      text: strOf(c.text), selected: !!c.isSelected,
      token: dig(findKey(c.navigationEndpoint, 'continuationCommand'), 'token') || null,
    }));
    const newer = C.findKeyAll(r, 'chipViewModel').map(c => ({
      text: strOf(c.text), selected: !!c.selected,
      token: dig(findKey(c.tapCommand, 'continuationCommand'), 'token') || null,
    }));
    return [...older, ...newer].filter(c => c.text);
  }

  // ---------------------------------------------------------------- home feed
  // home(chip) -> pager over the Home feed's videos (Shorts included, flagged `short`).
  //   chip: a chip's text ('All' by default; e.g. 'Immersive videos', 'Gaming', 'Live',
  //   'Recently uploaded'). After the first page: p.chips = [{ text, selected }] (the topics
  //   on offer, personalised) and p.shelves = [{ title, items }] (the "Shorts" and "Top news"
  //   rows mixed into the feed). Ads are skipped.
  function home(chip = 'All') {
    const p = D.pager(async token => {
      let r;
      if (token) r = await more(token);
      else {
        r = await browse(FEEDS.home);
        p.chips = chipsOf(r).map(({ text, selected }) => ({ text, selected }));
        const c = chip !== 'All' && chipsOf(r).find(x => x.text.toLowerCase() === chip.toLowerCase());
        if (c && c.token) {
          r = await more(c.token);
          p.chips = p.chips.map(x => ({ text: x.text, selected: x.text === c.text }));
        }
      }
      const sections = sectionsOf(r);
      p.shelves.push(...sections.filter(s => s.title));
      return { items: sections.filter(s => !s.title).flatMap(s => s.items), token: C.pageToken(r) };
    }, null);
    p.chips = []; p.shelves = [];
    return p;
  }

  // ---------------------------------------------------------------- other feeds
  // feed(name, tab) -> pager over a left-menu feed's sections ([{ title, items, posts }]),
  //   name: a key of FEEDS (e.g. 'live', 'news', 'podcasts', 'subscriptions'). Some feeds
  //   have tabs (News: "Top stories", "Sports" ...; Movies & TV; Playables): after the first
  //   page p.tabs = [{ title, selected }], and `tab` picks one by title. p.title is the
  //   feed's name ("Live"), p.message the sign-in note on signed-in feeds while signed out
  //   ('' otherwise).
  function feed(name, tab) {
    const f = FEEDS[name];
    if (!f) throw new Error(`unknown feed: ${name}`);
    const p = D.pager(async token => {
      let r;
      if (token) r = await more(token);
      else {
        r = await browse(f);
        const tabs = (dig(r, 'contents', 'twoColumnBrowseResultsRenderer', 'tabs') || []).map(t => t.tabRenderer).filter(t => t && t.title);
        const want = tab && tabs.find(t => t.title.toLowerCase() === tab.toLowerCase());
        if (want && !want.selected) {
          const be = dig(want, 'endpoint', 'browseEndpoint');
          if (be) r = await D.innertube('browse', { browseId: be.browseId, ...(be.params ? { params: decodeURIComponent(be.params) } : {}) });
        }
        p.tabs = tabs.map(t => ({ title: t.title, selected: want ? t === want : !!t.selected }));
        const msg = findKey(r.contents, 'backgroundPromoRenderer') || findKey(r.contents, 'messageRenderer');
        p.message = msg ? strOf(msg.title) || strOf(msg.text) : '';
      }
      return { items: sectionsOf(r), token: C.pageToken(r) };
    }, null);
    p.tabs = []; p.title = f.title; p.message = '';
    return p;
  }

  // feedVideos(name) -> pager over a left-menu feed's videos (and playlists), its sections
  //   run together in order (History's date groups and Shorts rows become one list).
  //   p.message as feed().
  function feedVideos(name) {
    const f = feed(name);
    const p = D.pager(async () => {
      const sections = await f.next();
      p.message = f.message;
      return { items: sections.flatMap(s => s.items), token: f.done ? null : 'more' };
    }, 'first');
    p.message = '';
    return p;
  }

  // ---------------------------------------------------------------- left menu
  // guide() -> Promise of [{ title, section, browseId, params, url }] - the left menu as
  // YouTube sends it now (Home, Shorts, Subscriptions, You, History, Explore: Music, Live,
  // Gaming ...). `section` is the group heading ('' for the top group).
  async function guide() {
    const r = await D.innertube('guide', {});
    const out = [];
    for (const s of C.findKeyAll(r, 'guideSectionRenderer')) {
      for (const e of C.findKeyAll(s, 'guideEntryRenderer')) {
        const ep = e.navigationEndpoint || e.serviceEndpoint || {};
        const title = strOf(e.formattedTitle);
        if (!title || /^Show (more|less)$/.test(title)) continue;
        out.push({ title, section: strOf(s.formattedTitle), browseId: dig(ep, 'browseEndpoint', 'browseId') || '',
          params: dig(ep, 'browseEndpoint', 'params') || '', url: dig(ep, 'commandMetadata', 'webCommandMetadata', 'url') || '' });
      }
    }
    return out;
  }

  // myChannelId() -> Promise of the signed-in identity's own channel id ('UC...'), or null
  // (signed out, or not found): the left menu's "Your channel" entry (its account-box icon,
  // or its English name), else the first channel link in the account menu (its "Your
  // channel"). Remembered once found (until the page reloads).
  let mine = null;
  async function myChannelId() {
    if (mine) return mine;
    const isChannel = id => /^UC[\w-]{20,}$/.test(id || '');
    const r = await D.innertube('guide', {});
    for (const e of C.findKeyAll(r, 'guideEntryRenderer')) {
      const id = dig(e.navigationEndpoint || {}, 'browseEndpoint', 'browseId');
      if (isChannel(id) && (dig(e, 'icon', 'iconType') === 'ACCOUNT_BOX' || /^your channel$/i.test(strOf(e.formattedTitle)))) return (mine = id);
    }
    try {
      const a = await D.innertube('account/account_menu', {});
      for (const l of C.findKeyAll(a, 'compactLinkRenderer')) {
        const id = dig(l, 'navigationEndpoint', 'browseEndpoint', 'browseId');
        if (isChannel(id)) return (mine = id);
      }
    } catch (err) { console.warn('[streamxr] account menu unavailable:', err && err.message || err); }
    return null;
  }

  // ---------------------------------------------------------------- search suggestions
  // suggestions(text) -> Promise of [string]: YouTube's search autocomplete for `text`
  // (what the search box shows while typing; the host its own box uses). [] on failure,
  // with the reason logged.
  async function suggestions(text) {
    if (!text) return [];
    try {
      const res = await fetch(`https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();                       // "window.google.ac.h([...])"
      const json = JSON.parse(body.slice(body.indexOf('(') + 1, body.lastIndexOf(')')));
      return (json[1] || []).map(s => s[0]).filter(Boolean);
    } catch (err) {
      console.warn('[streamxr] search suggestions failed:', err && err.message || err);
      return [];
    }
  }

  ns.youtubeHome = { FEEDS, home, feed, feedVideos, guide, myChannelId, suggestions, sectionsOf, chipsOf };
})(globalThis.__streamxr = globalThis.__streamxr || {});
