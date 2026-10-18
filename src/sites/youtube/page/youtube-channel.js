// A YouTube channel's pages, read without leaving the watch page: the header (name, handle,
// subscribers, avatar, banner), About, Home shelves, and the Videos / Shorts / Live /
// Playlists / Shows / Posts / Store tabs, a post's comments, liking posts and voting in
// polls (signed in), plus search inside the channel. Everything comes
// from YouTube's own browse API (the request its channel pages make), so the video keeps
// playing. Lists are pagers (`p.next()` loads a page, see youtube-data.js); the rest are
// promises. Every function takes a channel id ("UC..."); `currentChannelId()` gives the
// current video's. Reference with live-probed notes: the "YouTube Channel Page Data" doc.
(function (ns) {
  'use strict';

  const D = ns.youtubeData;
  const { strOf, dig, findKey, bestImage, badgeFromData } = D;

  // Tab "params" for the browse request, as YouTube's channel pages send them (Oct 2026).
  // channel() reads the real ones from the channel's response; these are the fallback.
  const TAB_PARAMS = {
    home: 'EghmZWF0dXJlZPIGBAoCMgA=', videos: 'EgZ2aWRlb3PyBgQKAjoA', shorts: 'EgZzaG9ydHPyBgUKA5oBAA==',
    live: 'EgdzdHJlYW1z8gYECgJ6AA==', shows: 'EgVzaG93c_IGBAoCYgA=', playlists: 'EglwbGF5bGlzdHPyBgoKCEIGCgIQaCIA',
    posts: 'EgVwb3N0c_IGBAoCSgA=', store: 'EgVzdG9yZfIGBAoCGgA=', search: 'EgZzZWFyY2jyBgQKAloA',
  };
  // Tab titles as shown on YouTube -> our names (the Live tab is "Live", Posts was "Community").
  const TAB_NAMES = { Home: 'home', Videos: 'videos', Shorts: 'shorts', Live: 'live', Shows: 'shows', Podcasts: 'podcasts',
    Playlists: 'playlists', Posts: 'posts', Community: 'posts', Store: 'store', Search: 'search', Courses: 'courses', Releases: 'releases' };

  // The channel of the video playing now ('' if unknown).
  const currentChannelId = () => dig(D.playerResponse(), 'videoDetails', 'channelId') || '';

  // One browse request for a channel tab (or a continuation token).
  const browse = (channelId, params, extra) => D.innertube('browse', { browseId: channelId, ...(params ? { params: decodeURIComponent(params) } : {}), ...extra });
  const more = token => D.innertube('browse', { continuation: token });

  // The selected tab's content in a browse response ({} if none).
  function tabContent(r) {
    const tabs = dig(r, 'contents', 'twoColumnBrowseResultsRenderer', 'tabs') || [];
    const t = tabs.map(x => x.tabRenderer || x.expandableTabRenderer).find(x => x && x.selected);
    return t && t.content || {};
  }

  // Token for the next page of a channel list. Later pages (and re-sorted first pages) are
  // handled by nextPageToken; a tab's first page keeps its "load more" item at the end of
  // its grid or section instead.
  function pageToken(r) {
    const t = D.nextPageToken(r);
    if (t) return t;
    const c = tabContent(r);
    const lists = [dig(findKey(c, 'richGridRenderer'), 'contents'), dig(findKey(c, 'gridRenderer'), 'items'),
      dig(findKey(c, 'itemSectionRenderer'), 'contents')];
    for (const list of lists) {
      const last = list && list[list.length - 1];
      if (last && last.continuationItemRenderer) return D.continuationOf(last);
    }
    return null;
  }

  // Everything a list response holds: a later (or re-sorted) page's continuation items, else
  // the first page's tab content. Only append/reload actions count: signed in, a tab's first
  // page can carry other actions too, which hold no items.
  function pageRoot(r) {
    const acts = [...(r.onResponseReceivedActions || []), ...(r.onResponseReceivedEndpoints || []), ...(r.onResponseReceivedCommands || [])];
    const lists = acts.map(a => dig(a.appendContinuationItemsAction || a.reloadContinuationItemsCommand, 'continuationItems')).filter(Boolean);
    return lists.length ? lists : tabContent(r);
  }

  // ---------------------------------------------------------------- item readers
  // A Short (shortsLockupViewModel) as a video item: { type: 'video', id, title, views,
  // thumb (vertical), short: true, ... }. Shorts play as normal videos.
  function fromShort(s) {
    const id = dig(s, 'onTap', 'innertubeCommand', 'reelWatchEndpoint', 'videoId') || (/[\w-]{11}$/.exec(s.entityId || '') || [])[0];
    if (!id) return null;
    const title = strOf(dig(s, 'overlayMetadata', 'primaryText'));
    const views = strOf(dig(s, 'overlayMetadata', 'secondaryText'));
    return { type: 'video', id, title, channel: '', channelId: '', badge: null, views, age: '', duration: '',
      kind: D.kindOf(title), thumb: bestImage(s.thumbnailViewModel) || D.thumbOf(id), short: true };
  }

  // A show (gridShowRenderer, Shows tab): a playlist item.
  function fromShow(g) {
    const pid = (dig(g, 'navigationEndpoint', 'browseEndpoint', 'browseId') || '').replace(/^VL/, '');
    if (!pid) return null;
    const count = (/"text":"(\d[\d,]*)"/.exec(JSON.stringify(g.thumbnailOverlays || '')) || [])[1];
    return { type: 'playlist', id: '', playlistId: pid, videoCount: count, title: strOf(g.title),
      channel: strOf(g.shortBylineText), channelId: '', badge: null, views: '', age: '', duration: '', kind: '2D',
      thumb: bestImage(g.thumbnailRenderer) };
  }

  // A post (backstagePostRenderer / postRenderer): { id, text, author, channelId (the
  //   author's, '' if not given), avatar, published, likes,
  //   images: [urls], video: item | null, comments (the count, "882"), commentsParams (its
  //   own page, for postComments), likeState ('liked' | 'disliked' | 'none': yours),
  //   actions: { like, unlike, dislike, undislike } (endpoints for ratePost; null signed out),
  //   poll: { votes ("32K votes"), choices: [{ text, selected (your vote), ifSelected /
  //   ifNotSelected (its share, "55%", if you chose it / didn't; signed in), select, deselect
  //   (endpoints for votePoll; null signed out) }] } | null }.
  //   Signed out, the buttons and choices only lead to sign-in, so they carry no actions.
  const usable = ep => (ep && !findKey(ep, 'signInEndpoint') ? ep : null);
  function fromPost(p) {
    if (!p || !p.postId) return null;
    const att = p.backstageAttachment || {};
    const images = [];
    for (const img of [att.backstageImageRenderer, ...(dig(att, 'postMultiImageRenderer', 'images') || []).map(i => i.backstageImageRenderer)]) {
      const url = img && bestImage(img.image);
      if (url) images.push(url);
    }
    const poll = att.pollRenderer;
    const ab = dig(p, 'actionButtons', 'commentActionButtonsRenderer') || {};
    const like = dig(ab, 'likeButton', 'toggleButtonRenderer') || {}, dislike = dig(ab, 'dislikeButton', 'toggleButtonRenderer') || {};
    const reply = dig(ab, 'replyButton', 'buttonRenderer') || {};
    const actions = { like: usable(like.defaultServiceEndpoint), unlike: usable(like.toggledServiceEndpoint),
      dislike: usable(dislike.defaultServiceEndpoint), undislike: usable(dislike.toggledServiceEndpoint) };
    return {
      id: p.postId, text: strOf(p.contentText), author: strOf(p.authorText),
      channelId: dig(p, 'authorEndpoint', 'browseEndpoint', 'browseId') || '', avatar: bestImage(p.authorThumbnail),
      published: strOf(p.publishedTimeText), likes: strOf(p.voteCount),
      images, video: att.videoRenderer ? D.fromCompact(att.videoRenderer) : null,
      comments: strOf(reply.text), commentsParams: dig(reply, 'navigationEndpoint', 'browseEndpoint', 'params') || '',
      likeState: like.isToggled || p.voteStatus === 'LIKE' ? 'liked' : dislike.isToggled || p.voteStatus === 'DISLIKE' ? 'disliked' : 'none',
      actions: Object.values(actions).some(Boolean) ? actions : null,
      poll: poll ? { votes: strOf(poll.totalVotes), choices: (poll.choices || []).map(c => ({
        text: strOf(c.text), selected: !!c.selected,
        ifSelected: strOf(c.votePercentageIfSelected), ifNotSelected: strOf(c.votePercentageIfNotSelected),
        select: usable(c.selectServiceEndpoint), deselect: usable(c.deselectServiceEndpoint) })) } : null,
    };
  }

  // A store product (verticalProductCardRenderer): { title, price, merchant, image, url }.
  // The url leads off YouTube.
  function fromProduct(c) {
    return { title: strOf(c.title), price: strOf(c.price), merchant: strOf(c.merchantName),
      image: bestImage(c.thumbnail), url: findKey(c.navigationEndpoint, 'url') || '' };
  }

  // A channel card (gridChannelRenderer, e.g. Home's featured channels): { id, title, subscribers, thumb }.
  function fromChannelCard(c) {
    return { id: c.channelId, title: strOf(c.title), subscribers: strOf(c.subscriberCountText) || strOf(c.videoCountText), thumb: bestImage(c.thumbnail) };
  }

  // Every item of every kind inside a data object, in order: videos/playlists (the shared
  // readers), Shorts, shows, posts, products and channel cards.
  // Returns { items, shorts, posts, products, channels } (shorts are also in items).
  function collect(root) {
    const out = { items: [], shorts: [], posts: [], products: [], channels: [] };
    const walk = (o, depth) => {
      if (!o || typeof o !== 'object' || depth > 18) return;
      if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (k === 'lockupViewModel') { const it = D.fromLockup(v); if (it) out.items.push(it); continue; }
        if (k === 'videoRenderer' || k === 'compactVideoRenderer' || k === 'gridVideoRenderer') { const it = D.fromCompact(v); if (it) out.items.push(it); continue; }
        if (k === 'shortsLockupViewModel') { const it = fromShort(v); if (it) { out.items.push(it); out.shorts.push(it); } continue; }
        if (k === 'gridShowRenderer') { const it = fromShow(v); if (it) out.items.push(it); continue; }
        if (k === 'backstagePostRenderer' || k === 'postRenderer') { const it = fromPost(v); if (it) out.posts.push(it); continue; }
        if (k === 'verticalProductCardRenderer') { out.products.push(fromProduct(v)); continue; }
        if (k === 'gridChannelRenderer') { out.channels.push(fromChannelCard(v)); continue; }
        if (D.AD_KEY_RE.test(k)) continue;
        walk(v, depth + 1);
      }
    };
    walk(root, 0);
    return out;
  }

  // ---------------------------------------------------------------- header
  // channel(id) -> Promise of { id, title, badge, handle, subscribers, videoCount,
  //   description (short), avatar, banner, links (e.g. "x.com/somechannel and 4 more links"),
  //   url, rssUrl, keywords, isFamilySafe, subscribed (true/false signed in, else null),
  //   notifications (the bell: { state, options } or null, see bellOf),
  //   tabs: { videos: params, ... } (only the tabs this channel has), aboutToken }. Cached
  //   for 5 minutes.
  const headerCache = new Map();              // id -> { at, promise }
  function channel(channelId) {
    const hit = headerCache.get(channelId);
    if (hit && performance.now() - hit.at < 300000) return hit.promise;
    const promise = browse(channelId).then(readHeader);
    promise.catch(() => headerCache.delete(channelId));
    headerCache.set(channelId, { at: performance.now(), promise });
    return promise;
  }

  function readHeader(r) {
    const ph = dig(r, 'header', 'pageHeaderRenderer', 'content', 'pageHeaderViewModel') || {};
    const md = dig(r, 'metadata', 'channelMetadataRenderer') || {};
    let handle = '', subscribers = '', videoCount = '';
    for (const row of dig(ph, 'metadata', 'contentMetadataViewModel', 'metadataRows') || []) {
      for (const part of row.metadataParts || []) {
        const t = strOf(part.text);
        if (/^@/.test(t)) handle = t;
        else if (/subscriber/i.test(t)) subscribers = t;
        else if (/video/i.test(t)) videoCount = t;
      }
    }
    const tabs = {};
    for (const t of dig(r, 'contents', 'twoColumnBrowseResultsRenderer', 'tabs') || []) {
      const tr = t.tabRenderer || t.expandableTabRenderer;
      const name = tr && TAB_NAMES[tr.title];
      if (name) tabs[name] = dig(tr, 'endpoint', 'browseEndpoint', 'params') || TAB_PARAMS[name] || '';
    }
    return {
      id: md.externalId || '', title: strOf(dig(ph, 'title', 'dynamicTextViewModel', 'text')) || md.title || '',
      badge: badgeFromData(ph.title), handle, subscribers, videoCount,
      description: strOf(dig(ph, 'description', 'descriptionPreviewViewModel', 'description')) || md.description || '',
      avatar: bestImage(ph.image) || bestImage(md.avatar), banner: bestImage(ph.banner),
      links: strOf(dig(ph, 'attribution', 'attributionViewModel', 'text')).trim(),
      url: md.vanityChannelUrl || md.channelUrl || '', rssUrl: md.rssUrl || '',
      keywords: md.keywords || '', isFamilySafe: md.isFamilySafe !== false,
      tabs, aboutToken: dig(findKey(ph.description, 'continuationCommand'), 'token') || null,
      // Signed in: YouTube's saved subscription state (the same subscriptionStateEntity a
      // Subscribe answer carries); null while signed out or when it isn't sent.
      subscribed: (() => { const e = findKeyAll(r.frameworkUpdates, 'subscriptionStateEntity')[0]; return e && e.subscribed != null ? !!e.subscribed : null; })(),
      notifications: bellOf(r),
    };
  }

  // The header's notification bell, signed in and subscribed: { state ('ALL', 'OCCASIONAL',
  // 'OFF' ...: the end of SUBSCRIPTION_NOTIFICATION_STATE_*, or ''), options: [{ label,
  // params, selected }] } (the choices YouTube's own bell menu sends, as in the Manage list's
  // notificationOptions), or null when the header has none. UNVERIFIED (written signed out):
  // each choice is found as a modifyChannelNotificationPreferenceEndpoint inside the header,
  // named by the nearest enclosing item with a title or text; the state is the
  // subscriptionNotificationStateEntity the header's button points to (by its store key).
  function bellOf(r) {
    const options = [], seen = new Set();
    const walk = (node, stack, depth) => {
      if (!node || typeof node !== 'object' || depth > 40) return;
      if (Array.isArray(node)) { for (const x of node) walk(x, stack, depth + 1); return; }
      const ep = node.modifyChannelNotificationPreferenceEndpoint;
      if (ep && ep.params) {
        if (seen.has(ep.params)) return;
        seen.add(ep.params);
        const item = [...stack].reverse().find(a => strOf(a.title) || strOf(a.text));
        if (item) options.push({ label: strOf(item.title) || strOf(item.text), params: ep.params, selected: !!(item.isSelected || item.selected) });
        return;
      }
      stack.push(node);
      for (const k of Object.keys(node)) walk(node[k], stack, depth + 1);
      stack.pop();
    };
    walk(r.header, [], 0);
    if (!options.length) return null;
    const key = findKey(r.header, 'notificationStateEntityStoreKey');
    const ents = (dig(r, 'frameworkUpdates', 'entityBatchUpdate', 'mutations') || [])
      .filter(m => findKey(m.payload, 'subscriptionNotificationStateEntity'));
    const ent = ents.find(m => key && m.entityKey === key) || (ents.length === 1 ? ents[0] : null);
    const state = String(dig(findKey(ent && ent.payload, 'subscriptionNotificationStateEntity'), 'state') || '')
      .replace(/^SUBSCRIPTION_NOTIFICATION_STATE_/, '');
    return { state, options };
  }

  // The browse params for one of a channel's tabs (its own, or the usual ones).
  const tabParams = async (channelId, name) => (await channel(channelId)).tabs[name] || TAB_PARAMS[name];

  // ---------------------------------------------------------------- about
  // about(id) -> Promise of { description (full), country, joined, views, videoCount,
  //   subscribers, url, links: [{ title, url }] }, or null if the channel has no About.
  async function about(channelId) {
    const token = (await channel(channelId)).aboutToken;
    if (!token) return null;
    const a = findKey(await more(token), 'aboutChannelViewModel');
    if (!a) return null;
    return {
      description: a.description || '', country: a.country || '',
      joined: strOf(a.joinedDateText), views: a.viewCountText || '', videoCount: a.videoCountText || '',
      subscribers: a.subscriberCountText || '', url: a.displayCanonicalChannelUrl || a.canonicalChannelUrl || '',
      links: (a.links || []).map(l => l.channelExternalLinkViewModel).filter(Boolean)
        .map(l => ({ title: strOf(l.title), url: strOf(l.link) })),
    };
  }

  // ---------------------------------------------------------------- home
  // home(id) -> Promise of { featured: item + description | null (the big video at the top), shelves:
  //   [{ title, items, posts, channels }] } (the channel's own rows: "Videos", "Popular" ...).
  async function home(channelId) {
    const c = tabContent(await browse(channelId, await tabParams(channelId, 'home')));
    const fv = findKey(c, 'channelVideoPlayerRenderer');
    // The featured video also carries its description; `thumb` is the larger hqdefault image
    // (it's shown big); `live` when it's streaming now ("867 watching").
    const views = strOf(fv && fv.viewCountText);
    const featured = fv && fv.videoId ? { type: 'video', id: fv.videoId, title: strOf(fv.title), channel: '', channelId,
      badge: null, views, age: D.longAgo(strOf(fv.publishedTimeText)), duration: '', kind: D.kindOf(strOf(fv.title)),
      live: /watching/i.test(views), description: strOf(fv.description),
      thumb: `https://i.ytimg.com/vi/${fv.videoId}/hqdefault.jpg` } : null;
    const shelves = [];
    for (const s of dig(c, 'sectionListRenderer', 'contents') || []) {
      const shelf = findKey(s, 'shelfRenderer') || findKey(s, 'reelShelfRenderer') || findKey(s, 'richShelfRenderer');
      if (!shelf) continue;
      const got = collect(shelf.content || shelf.items || shelf.contents || shelf);
      shelves.push({ title: strOf(shelf.title), items: got.items, posts: got.posts, channels: got.channels });
    }
    return { featured, shelves };
  }

  // ---------------------------------------------------------------- tab lists
  // A pager over one tab's items. `pick(collected)` chooses what the page yields.
  // `firstPage()` -> the first response (so sorted lists can start from a chip).
  function tabPager(firstPage, pick) {
    return D.pager(async token => {
      const r = token ? await more(token) : await firstPage();
      return { items: pick(collect(pageRoot(r))), token: pageToken(r) };
    }, null);
  }

  // Videos / Shorts / Live with YouTube's sort chips: sort 'latest' (default), 'popular'
  // or 'oldest'. Another sort starts from that chip's token instead of the tab's first page.
  function sortedTab(name, pick) {
    return (channelId, sort = 'latest') => tabPager(async () => {
      const r = await browse(channelId, await tabParams(channelId, name));
      if (sort === 'latest') return r;
      const chip = (findKeyAll(tabContent(r), 'chipViewModel')).find(c => strOf(c.text).toLowerCase() === sort);
      const token = dig(findKey(chip, 'continuationCommand'), 'token');
      return token ? more(token) : r;
    }, pick);
  }

  // Every value under `key` inside `root`.
  function findKeyAll(root, key, out = [], depth = 0) {
    if (!root || typeof root !== 'object' || depth > 20) return out;
    if (Array.isArray(root)) { for (const x of root) findKeyAll(x, key, out, depth + 1); return out; }
    for (const k of Object.keys(root)) { if (k === key) out.push(root[k]); else findKeyAll(root[k], key, out, depth + 1); }
    return out;
  }

  // videos(id, sort) / shorts(id, sort) / live(id, sort) -> pager of items.
  const videos = sortedTab('videos', c => c.items);
  const shorts = sortedTab('shorts', c => c.shorts);
  const live = sortedTab('live', c => c.items);

  // playlists(id, sort) -> pager of playlist items. sort: 'newest' (date added, default) or
  // 'lastAdded' (most recently updated). The sort menu's own params are used when present.
  function playlists(channelId, sort = 'newest') {
    return tabPager(async () => {
      const r = await browse(channelId, await tabParams(channelId, 'playlists'));
      if (sort === 'newest') return r;
      const menu = findKey(tabContent(r), 'sortFilterSubMenuRenderer');
      const opt = (menu && menu.subMenuItems || []).find(i => /last video/i.test(i.title));
      const params = dig(opt, 'navigationEndpoint', 'browseEndpoint', 'params');
      return params ? browse(channelId, params) : r;
    }, c => c.items);
  }

  // shows(id) -> pager of playlist items (a show is a playlist of episodes).
  const shows = channelId => tabPager(async () => browse(channelId, await tabParams(channelId, 'shows')), c => c.items);

  // posts(id) -> pager of posts (see fromPost).
  const posts = channelId => tabPager(async () => browse(channelId, await tabParams(channelId, 'posts')), c => c.posts);

  // postComments(post, sort) -> pager over a post's comment threads, sort 'top' (default) or
  // 'newest', from the post's own page (browse FEpost_detail). Comments have the shape of
  // youtube-content.js's (via 'browse'), so its replies() and rateComment() work on them.
  function postComments(post, sort = 'top') {
    const C = ns.youtubeContent;
    return D.pager(async token => {
      if (!token) {
        if (!post || !post.commentsParams) return { items: [], token: null };
        const page = await D.innertube('browse', { browseId: 'FEpost_detail', params: decodeURIComponent(post.commentsParams) });
        const section = findKeyAll(page, 'itemSectionRenderer').find(s => s.sectionIdentifier === 'comment-item-section');
        token = D.continuationOf(section && section.contents);
        if (!token) return { items: [], token: null };
        if (sort === 'newest') token = C.sortTokens(await more(token)).newest || token;   // the sort menu comes with the first page
      }
      const r = await more(token);
      return { items: C.readComments(r, 'browse'), token: D.nextPageToken(r) };
    }, null);
  }

  // ratePost(post, 'like' | 'unlike' | 'dislike' | 'undislike') -> Promise of { ok, error }
  // (signed in: the post's own button endpoints).
  const ratePost = (post, what) => (post && post.actions && post.actions[what]
    ? D.runEndpoint(post.actions[what]) : Promise.resolve({ ok: false, error: 'not available (signed out?)' }));

  // votePoll(post, index, on) -> Promise of { ok, error }: vote for choice `index` of the
  // post's poll (on), or take the vote back (off).
  function votePoll(post, index, on) {
    const c = post && post.poll && post.poll.choices[index];
    const ep = c && (on ? c.select : c.deselect);
    return ep ? D.runEndpoint(ep) : Promise.resolve({ ok: false, error: 'not available (signed out?)' });
  }

  // store(id) -> Promise of [product] (see fromProduct); [] if the channel has no store.
  // The tab's shelves ("Just dropped", "Featured") can repeat a product: each is listed once.
  async function store(channelId) {
    const params = (await channel(channelId)).tabs.store;
    if (!params) return [];
    const seen = new Set();
    return collect(tabContent(await browse(channelId, params))).products.filter(p => {
      const key = `${p.title}|${p.price}|${p.merchant}`;
      return !seen.has(key) && seen.add(key);
    });
  }

  // search(id, query) -> pager of the channel's videos matching `query`.
  function search(channelId, query) {
    return tabPager(async () => browse(channelId, await tabParams(channelId, 'search'), { query }), c => c.items);
  }

  ns.youtubeChannel = {
    currentChannelId, channel, about, home, videos, shorts, live, playlists, shows, posts, store, search,
    postComments, ratePost, votePoll,
    collect, fromShort, fromShow, fromPost, fromProduct, TAB_PARAMS,
    tabContent, pageToken, findKeyAll,           // also used by youtube-home.js
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
