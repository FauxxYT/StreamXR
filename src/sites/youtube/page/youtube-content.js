// Everything else YouTube shows about the current video, read from its data: full
// metadata, description (with links/timestamps), channel owner, chapters, "Most replayed"
// heatmap, end screen, info cards, the playlist being played, comments, transcript, plus
// search, and saving it to your playlists. Paged things (comments, search) return a pager: `p.next()` loads a page.
// Reference with live-probed notes: the "YouTube Watch Page Data" doc.
(function (ns) {
  'use strict';

  const D = ns.youtubeData;
  const { strOf, dig, findKey, bestImage, badgeFromData, textOf } = D;
  // The watch page's main data block ({} if there is none yet).
  const results = () => dig(D.watchData(), 'contents', 'twoColumnWatchNextResults') || {};
  // One of the sections under the video (e.g. 'videoPrimaryInfoRenderer': title/likes,
  // 'videoSecondaryInfoRenderer': description/owner), or null.
  const primary = key => {
    for (const c of dig(results(), 'results', 'results', 'contents') || []) if (c[key]) return c[key];
    return null;
  };

  // ---------------------------------------------------------------- metadata
  // { id, title, channel, channelId, channelUrl, description, keywords[], category,
  //   lengthSeconds, views, likes, publishDate, uploadDate, isLive, isLiveContent,
  //   isFamilySafe, isUnlisted, isPrivate, allowRatings, thumbnail, playable, unplayableReason }
  function metadata() {
    const r = D.playerResponse();
    const vd = r.videoDetails || {}, mf = dig(r, 'microformat', 'playerMicroformatRenderer') || {};
    const ps = r.playabilityStatus || {};
    return {
      id: vd.videoId || D.currentVideoId(),
      title: vd.title || strOf(mf.title),
      channel: vd.author || mf.ownerChannelName || '',
      channelId: vd.channelId || mf.externalChannelId || '',
      channelUrl: mf.ownerProfileUrl || '',
      description: description().text,
      keywords: vd.keywords || [],
      category: mf.category || '',
      lengthSeconds: +(vd.lengthSeconds || mf.lengthSeconds || 0),
      views: +(vd.viewCount || mf.viewCount || 0),
      likes: mf.likeCount != null ? +mf.likeCount : null,
      publishDate: mf.publishDate || '', uploadDate: mf.uploadDate || '',
      isLive: !!dig(r, 'videoDetails', 'isLive'), isLiveContent: !!vd.isLiveContent,
      isFamilySafe: mf.isFamilySafe !== false, isUnlisted: !!mf.isUnlisted, isPrivate: !!vd.isPrivate,
      allowRatings: vd.allowRatings !== false,
      thumbnail: bestImage(vd.thumbnail || mf.thumbnail),
      playable: !ps.status || ps.status === 'OK', unplayableReason: ps.status && ps.status !== 'OK' ? (ps.reason || ps.status) : '',
    };
  }

  // ---------------------------------------------------------------- description
  // { text, links: [{ text, start, length (where it sits in `text`), time? (seconds),
  //   videoId?, url?, channelId? }] }
  function description() {
    const vsi = primary('videoSecondaryInfoRenderer');
    const ad = vsi && vsi.attributedDescription;
    if (ad && ad.content) {
      const links = (ad.commandRuns || []).map(run => {
        const cmd = dig(run, 'onTap', 'innertubeCommand') || {};
        const we = cmd.watchEndpoint, ue = cmd.urlEndpoint, be = cmd.browseEndpoint;
        let url = ue && ue.url || '';
        const m = /[?&]q=([^&]+)/.exec(url); if (/\/redirect\?/.test(url) && m) url = decodeURIComponent(m[1]);
        return {
          text: ad.content.substr(run.startIndex, run.length), start: run.startIndex, length: run.length,
          time: we && we.startTimeSeconds != null ? we.startTimeSeconds : undefined,
          videoId: we && we.videoId || undefined,
          url: url || undefined,
          channelId: be && be.browseId || undefined,
        };
      });
      return { text: ad.content, links };
    }
    const r = D.playerResponse();
    return { text: strOf(dig(r, 'microformat', 'playerMicroformatRenderer', 'description')) || dig(r, 'videoDetails', 'shortDescription') || '', links: [] };
  }

  // The description without its chapter list (the Chapters tab shows that): drops every
  // line that starts with, or holds a link to, one of the chapters' start times (± 2 s), a
  // "Chapters:" / "Timestamps:" heading line just before them, and blank lines left doubled.
  // Other timestamps stay. Same shape as description(), with the links' positions updated.
  function descriptionWithoutChapters() {
    const d = description(), starts = chapters().map(c => c.start);
    if (!starts.length) return d;
    const isChapterTime = t => isFinite(t) && starts.some(s => Math.abs(s - t) <= 2);
    const lines = [];
    let at = 0;
    for (const text of d.text.split('\n')) { lines.push({ text, start: at, end: at + text.length }); at += text.length + 1; }
    // The times of the line's timestamp links: links whose text is a time ("12:34"). Links to
    // other videos also carry a start time (0), so the text decides.
    const linkTimes = l => d.links.filter(k => k.start >= l.start && k.start < l.end)
      .map(k => D.parseClock(k.text)).filter(isFinite);
    // A time at the start of a line, after any symbols / emoji / brackets ("⌨️ (1:45) Setup").
    const lead = l => D.parseClock((/^[^\p{L}\p{N}]*((?:\d+:)?\d{1,2}:\d{2})\b/u.exec(l.text) || [])[1] || '');
    lines.forEach(l => { l.chapter = isChapterTime(lead(l)) || linkTimes(l).some(isChapterTime); });
    lines.forEach((l, i) => {
      const next = lines.slice(i + 1).find(n => n.text.trim());
      if (/^[^\p{L}\p{N}]*(chapters|timestamps|time ?stamps|contents)[^\p{L}\p{N}]*$/iu.test(l.text) && next && next.chapter) l.chapter = true;
    });
    // Rebuild the text from the kept lines (no two blank lines in a row) and move the links.
    let text = '', blank = false;
    const shift = new Map();                           // kept line -> its new start
    for (const l of lines) {
      if (l.chapter) continue;
      const isBlank = !l.text.trim();
      if (isBlank && blank) continue;
      blank = isBlank;
      if (text) text += '\n';
      shift.set(l, text.length); text += l.text;
    }
    const links = [];
    for (const k of d.links) {
      const l = lines.find(x => k.start >= x.start && k.start < x.end);
      if (l && shift.has(l)) links.push({ ...k, start: shift.get(l) + (k.start - l.start) });
    }
    return text.trim() ? { text, links } : { text: '', links: [] };
  }

  // Does the video have a transcript? (Its page lists the transcript panel; no clicking.)
  const hasTranscript = () => (dig(D.watchData(), 'engagementPanels') || [])
    .some(p => dig(p, 'engagementPanelSectionListRenderer', 'targetId') === 'engagement-panel-searchable-transcript');

  // ---------------------------------------------------------------- channel owner
  // { name, channelId, url, avatar, subscribers, badge }
  function owner() {
    const o = dig(primary('videoSecondaryInfoRenderer'), 'owner', 'videoOwnerRenderer');
    if (!o) { const m = metadata(); return { name: m.channel, channelId: m.channelId, url: m.channelUrl, avatar: '', subscribers: '', badge: null }; }
    const be = dig(o, 'navigationEndpoint', 'browseEndpoint') || {};
    return {
      name: strOf(o.title), channelId: be.browseId || '', url: be.canonicalBaseUrl || '',
      avatar: bestImage(o.thumbnail), subscribers: strOf(o.subscriberCountText).replace(/\s*subscribers?$/i, ''),
      badge: badgeFromData(o.badges),
    };
  }

  // ---------------------------------------------------------------- chapters / heatmap
  // The seek bar's markers in a watch page's data (the page's own unless `data` is given).
  function markersMap(data = D.watchData()) {
    return dig(data, 'playerOverlays', 'playerOverlayRenderer', 'decoratedPlayerBarRenderer',
      'decoratedPlayerBarRenderer', 'playerBar', 'multiMarkersPlayerBarRenderer', 'markersMap') || [];
  }
  // Newer pages send chapters/heatmap as separate "entities" instead of inside markersMap:
  // the list of that marker type, or null if the page has none.
  function markerEntities(type, data = D.watchData()) {
    const muts = dig(data, 'frameworkUpdates', 'entityBatchUpdate', 'mutations') || [];
    for (const m of muts) {
      const list = dig(m, 'payload', 'macroMarkersListEntity', 'markersList');
      if (list && list.markerType === type) return list.markers || [];
    }
    return null;
  }

  // [{ title, start (s), thumb }] - empty when the video has none.
  function chapters() {
    for (const m of markersMap()) {
      const list = m.value && m.value.chapters;
      if (list && list.length) return list.map(c => c.chapterRenderer).filter(Boolean).map(c => ({
        title: strOf(c.title), start: (c.timeRangeStartMillis || 0) / 1000, thumb: bestImage(c.thumbnail),
      }));
    }
    const ents = markerEntities('MARKER_TYPE_CHAPTERS') || [];
    return ents.map(c => ({ title: strOf(c.title), start: (+c.startMillis || 0) / 1000, thumb: bestImage(c.thumbnailDetails) }));
  }

  // "Most replayed" in a watch page's data (the page's own unless `data` is given):
  // [{ start (s), duration (s), intensity 0..1 }] (100 markers over the video), empty when
  // it isn't there. Newer data has it as an entity (seen Oct 2026), older inside markersMap.
  function heatmap(data = D.watchData()) {
    for (const m of markersMap(data)) {
      const hm = dig(m, 'value', 'heatmap', 'heatmapRenderer', 'heatMarkers');
      if (hm && hm.length) return hm.map(h => h.heatMarkerRenderer || h).map(h => ({
        start: (+h.timeRangeStartMillis || 0) / 1000, duration: (+h.markerDurationMillis || 0) / 1000, intensity: +h.heatMarkerIntensityScoreNormalized || 0,
      }));
    }
    const ents = markerEntities('MARKER_TYPE_HEATMAP', data) || [];
    return ents.map(h => ({ start: (+h.startMillis || 0) / 1000, duration: (+h.durationMillis || 0) / 1000, intensity: +h.intensityScoreNormalized || 0 }));
  }

  // "Most replayed" for the video playing now. A fresh page load leaves it out of the page's
  // data (YouTube's own in-page `next` request has it), so when the page has none it's asked
  // for once per video with that request. [] while asking, and when the video has none
  // (newer or less watched videos).
  const heatmaps = new Map();                // video id -> list, or null while asking
  function mostReplayed() {
    const id = D.currentVideoId();
    if (!id) return [];
    const own = heatmap();
    if (own.length) return own;
    if (!heatmaps.has(id)) {
      heatmaps.set(id, null);
      if (heatmaps.size > 20) heatmaps.delete(heatmaps.keys().next().value);   // keep a few
      D.innertube('next', { videoId: id }).then(r => heatmaps.set(id, heatmap(r)),
        err => { heatmaps.set(id, []); console.warn('[streamxr] most replayed unavailable:', err && err.message || err); });
    }
    return heatmaps.get(id) || [];
  }

  // ---------------------------------------------------------------- end screen and cards
  // End screen tiles: [{ type: 'video'|'playlist'|'channel'|'subscribe'|'website'|...,
  //   title, subtitle, image, start, end (s), rect: { left, top, width, aspectRatio } (0..1 of
  //   the video), videoId?, playlistId?, channelId?, url? }]
  function endScreen() {
    const els = dig(D.playerResponse(), 'endscreen', 'endscreenRenderer', 'elements') || [];
    return els.map(e => e.endscreenElementRenderer).filter(Boolean).map(e => {
      const we = findKey(e.endpoint, 'watchEndpoint') || {}, be = findKey(e.endpoint, 'browseEndpoint') || {}, ue = findKey(e.endpoint, 'urlEndpoint') || {};
      return {
        type: (e.style || '').toLowerCase(), title: strOf(e.title), subtitle: strOf(e.metadata),
        image: bestImage(e.image), start: (+e.startMs || 0) / 1000, end: (+e.endMs || 0) / 1000,
        rect: { left: +e.left || 0, top: +e.top || 0, width: +e.width || 0, aspectRatio: +e.aspectRatio || 0 },
        videoId: we.videoId, playlistId: we.playlistId || (be.browseId && /^VL/.test(be.browseId) ? be.browseId.slice(2) : undefined),
        channelId: be.browseId && !/^VL/.test(be.browseId) ? be.browseId : undefined, url: ue.url,
      };
    });
  }

  // Info cards (the "i" teasers during the video): [{ start (s), teaser, title, subtitle,
  //   image, videoId?, playlistId?, url? }]
  function cards() {
    const list = dig(D.playerResponse(), 'cards', 'cardCollectionRenderer', 'cards') || [];
    return list.map(c => c.cardRenderer).filter(Boolean).map(c => {
      const content = c.content ? c.content[Object.keys(c.content)[0]] : {};
      const we = findKey(content, 'watchEndpoint') || {}, ue = findKey(content, 'urlEndpoint') || {};
      return {
        start: (+dig(c, 'cueRanges', 0, 'startCardActiveMs') || 0) / 1000,
        teaser: strOf(dig(c, 'teaser', 'simpleCardTeaserRenderer', 'message')),
        title: strOf(content.videoTitle || content.playlistTitle || content.title),
        subtitle: strOf(content.channelName || content.viewCountText || content.playlistVideoCount),
        image: bestImage(content.videoThumbnail || content.playlistThumbnail || content.image),
        videoId: we.videoId, playlistId: we.playlistId, url: ue.url,
      };
    });
  }

  // ---------------------------------------------------------------- playlist being played
  // { id, title, channel, index, total, localIndex, infinite, items: [video items] } or null
  // when not in a playlist. A long playlist's sidebar (and the player) hold only a window of
  // ~100-200 videos around the playing one: `index` is the playing video's position in the
  // WHOLE playlist (0-based), `localIndex` its position in that window (= items), `total`
  // the playlist's length (0 if not given). `infinite`: a mix, with no fixed length.
  function playlist() {
    const pl = dig(results(), 'playlist', 'playlist');
    if (!pl) return null;
    return {
      id: pl.playlistId, title: strOf(pl.title), channel: strOf(pl.ownerName),
      index: pl.currentIndex || 0, total: +pl.totalVideos || 0,
      localIndex: pl.localCurrentIndex != null ? pl.localCurrentIndex : null, infinite: !!pl.isInfinite,
      items: D.collectItems(pl.contents || []),
    };
  }

  // A playlist's own page (browse "VL<id>"), asked once a minute at most: its details and its
  // videos' first page come from the same answer.
  const pageCache = new Map();                 // playlist id -> { at, promise }
  function playlistPage(playlistId) {
    const hit = pageCache.get(playlistId);
    if (hit && performance.now() - hit.at < 60000) return hit.promise;
    const promise = D.innertube('browse', { browseId: `VL${playlistId}` });
    promise.catch(() => pageCache.delete(playlistId));
    pageCache.set(playlistId, { at: performance.now(), promise });
    return promise;
  }

  // playlistDetails(id) -> Promise of a playlist's details from its own page:
  //   { id, title, author, authorId, stats: ["24 videos", "1,234 views", "Updated …"],
  //   description, thumb (its first video's), firstVideo (Play all's), shuffle: { videoId,
  //   params } | null (YouTube's Shuffle play), canSave (signed in, someone else's playlist),
  //   saved (in your library) }. Read from the page's sidebar (playlistSidebarPrimaryInfoRenderer,
  //   with Save as a toggleButtonRenderer of likeEndpoints and Shuffle as a SHUFFLE button's
  //   watchEndpoint; seen signed in, 2026-10-18), else its header.
  async function playlistDetails(playlistId) {
    const r = await playlistPage(playlistId);
    const pri = findKey(r.sidebar, 'playlistSidebarPrimaryInfoRenderer') || {};
    const sec = findKey(r.sidebar, 'playlistSidebarSecondaryInfoRenderer') || {};
    const ph = dig(r, 'header', 'pageHeaderRenderer', 'content', 'pageHeaderViewModel') || {};
    const owner = dig(sec, 'videoOwner', 'videoOwnerRenderer') || {};
    const buttons = dig(pri, 'menu', 'menuRenderer', 'topLevelButtons') || [];
    const save = buttons.map(b => b.toggleButtonRenderer).find(t => t && findKey(t, 'likeEndpoint'));
    const shuffleEp = dig(buttons.map(b => b.buttonRenderer).find(b => b && dig(b, 'icon', 'iconType') === 'SHUFFLE'), 'navigationEndpoint', 'watchEndpoint');
    const firstVideo = dig(pri, 'navigationEndpoint', 'watchEndpoint', 'videoId') || dig(findKey(ph.actions, 'watchEndpoint'), 'videoId') || '';
    return {
      id: playlistId, title: strOf(pri.title) || strOf(dig(ph, 'title', 'dynamicTextViewModel', 'text')),
      author: strOf(owner.title), authorId: dig(owner, 'navigationEndpoint', 'browseEndpoint', 'browseId') || '',
      stats: (pri.stats || []).map(strOf).filter(Boolean),
      description: strOf(pri.description) || strOf(dig(ph, 'description', 'descriptionPreviewViewModel', 'description')),
      thumb: firstVideo ? D.thumbOf(firstVideo) : '', firstVideo,
      shuffle: shuffleEp && shuffleEp.videoId ? { videoId: shuffleEp.videoId, params: shuffleEp.params || '' } : null,
      canSave: !!save && D.signedIn() && !findKey(save, 'signInEndpoint'), saved: !!(save && save.isToggled),
    };
  }

  // Save a playlist to your library (on) or remove it (YouTube's Save button: like/like and
  // like/removelike with the playlist as the target) -> Promise of { ok, error }.
  async function savePlaylist(playlistId, on) {
    try {
      await D.innertube(on ? 'like/like' : 'like/removelike', { target: { playlistId } });
      pageCache.delete(playlistId);
      return { ok: true };
    } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  }

  // A playlist's videos as its own page lists them (browse "VL<id>"), with the views, age and
  // badge the watch page's playlist sidebar leaves out. Pager of video items, 100 a page.
  // Also your own lists: 'WL' (Watch later), 'LL' (Liked videos). Mixes ("RD...") have no
  // such page; the request fails for them.
  function playlistVideos(playlistId) {
    return D.pager(async token => {
      const r = token ? await D.innertube('browse', { continuation: token }) : await playlistPage(playlistId);
      // Later pages also repeat `contents`, so their items are read from the append action
      // only. A first page's videos can follow other sections (Watch later puts its own
      // controls first), so every section of the list is read.
      const list = token
        ? (r.onResponseReceivedActions || []).map(a => dig(a, 'appendContinuationItemsAction', 'continuationItems') || []).flat()
        : (dig(D.findKey(r.contents, 'sectionListRenderer'), 'contents') || []).map(s => dig(s, 'itemSectionRenderer', 'contents') || [s]).flat();
      const items = D.collectItems(list);
      if (!token && !items.length) console.warn(`[streamxr] no videos found on playlist page VL${playlistId}:`, r);
      // A first row whose views or age couldn't be read: logged once, for fixing the reader.
      if (!token && items[0] && (!items[0].views || !items[0].age))
        console.info(`[streamxr] playlist VL${playlistId}: first row without views or age:`, D.findKey(list, 'playlistVideoRenderer') || list[0]);
      return { items, token: D.continuationOf(list) };
    }, null);
  }

  // ---------------------------------------------------------------- comments
  // Comment: { id, text, author, authorChannelId, authorAvatar, authorVerified, isCreator,
  //   published, likes, likesIfLiked (the count with your like), replyCount, pinned,
  //   repliesToken, hearted (the video's creator gave it a ❤), heartBy ("❤ by @somechannel"),
  //   creatorAvatar (shown with the heart), likeState ('liked' | 'disliked' | 'none': yours),
  //   actions: { like, unlike, dislike, undislike } (tokens for rateComment; only signed in),
  //   via (the request its page came from: 'next' for a video's, 'browse' for a post's; its
  //   replies load the same way) }.
  //   YouTube sends the comment's words, its toolbar state (your like, the heart) and its
  //   toolbar commands separately from its layout ("entities"), matched by key.
  const LIKE_STATES = { TOOLBAR_LIKE_STATE_LIKED: 'liked', TOOLBAR_LIKE_STATE_DISLIKED: 'disliked' };
  function readComments(r, via = 'next') {
    const ents = new Map(), states = new Map(), surfaces = new Map();
    for (const m of dig(r, 'frameworkUpdates', 'entityBatchUpdate', 'mutations') || []) {
      const pl = m.payload || {};
      if (pl.commentEntityPayload) ents.set(m.entityKey, pl.commentEntityPayload);
      if (pl.engagementToolbarStateEntityPayload) states.set(m.entityKey, pl.engagementToolbarStateEntityPayload);
      if (pl.engagementToolbarSurfaceEntityPayload) surfaces.set(m.entityKey, pl.engagementToolbarSurfaceEntityPayload);
    }
    // The perform-comment-action token inside one of the toolbar's commands (none signed out).
    const actionOf = (surface, name) => dig(findKey(dig(surface, `${name}Command`), 'performCommentActionEndpoint'), 'action') || null;
    const out = [];
    const fromViewModel = (cvm, repliesToken) => {
      const e = ents.get(cvm.commentKey);
      if (!e) return;
      const p = e.properties || {}, a = e.author || {}, t = e.toolbar || {};
      const st = states.get(cvm.toolbarStateKey) || {}, sf = surfaces.get(cvm.toolbarSurfaceKey);
      const rc = /([\d,.]+\s*[KM]?)\s+repl/i.exec(t.replyCountA11y || '') || /^([\d,.]+\s*[KM]?)$/.exec(t.replyCount || '');
      const actions = { like: actionOf(sf, 'like'), unlike: actionOf(sf, 'unlike'), dislike: actionOf(sf, 'dislike'), undislike: actionOf(sf, 'undislike') };
      out.push({
        id: p.commentId || cvm.commentId, text: strOf(p.content), published: p.publishedTime || '',
        author: a.displayName || '', authorChannelId: a.channelId || '', authorAvatar: a.avatarThumbnailUrl || '',
        authorVerified: !!a.isVerified, isCreator: !!a.isCreator,
        likes: t.likeCountNotliked || '', likesIfLiked: t.likeCountLiked || '', replyCount: rc ? rc[1] : '',
        pinned: !!cvm.pinnedText, repliesToken: repliesToken || null,
        hearted: st.heartState === 'TOOLBAR_HEART_STATE_HEARTED', heartBy: t.heartActiveTooltip || '',
        creatorAvatar: t.creatorThumbnailUrl || '', likeState: LIKE_STATES[st.likeState] || 'none',
        actions: Object.values(actions).some(Boolean) ? actions : null, via,
      });
    };
    (function walk(o, depth) {
      if (!o || typeof o !== 'object' || depth > 25) return;
      if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
      if (o.commentThreadRenderer) {
        const th = o.commentThreadRenderer;
        const cvm = dig(th, 'commentViewModel', 'commentViewModel') || th.commentViewModel;
        if (cvm && cvm.commentKey) fromViewModel(cvm, D.continuationOf(dig(th, 'replies', 'commentRepliesRenderer')));
        return;
      }
      if (o.commentViewModel && o.commentViewModel.commentKey) { fromViewModel(o.commentViewModel); return; }
      for (const k of Object.keys(o)) if (k !== 'frameworkUpdates') walk(o[k], depth + 1);
    })(r, 0);
    return out;
  }

  // Are comments on for this video, and how many: { on, count ("7.4K", or '') }. From the
  // watch page's comments panel (its header shows the count); no panel = comments off.
  function commentsInfo() {
    const panel = ((D.watchData() || {}).engagementPanels || []).map(e => e.engagementPanelSectionListRenderer)
      .find(p => p && (p.panelIdentifier === 'engagement-panel-comments-section' || p.targetId === 'engagement-panel-comments-section'));
    if (!panel) return { on: false, count: '' };
    return { on: true, count: strOf(dig(panel, 'header', 'engagementPanelTitleHeaderRenderer', 'contextualInfo')) };
  }

  // Sort-menu tokens ({ top, newest }) anywhere in a response.
  function sortTokens(r) {
    const menu = findKey(r, 'sortFilterSubMenuRenderer');
    const items = (menu && menu.subMenuItems) || [];
    const tok = i => dig(items[i], 'serviceEndpoint', 'continuationCommand', 'token') || dig(findKey(items[i], 'continuationCommand'), 'token') || null;
    return { top: tok(0), newest: tok(1) };
  }

  // The token that loads the first page of comments in the order `sort` ('top' | 'newest').
  // The comments panel's data already holds both; if not, get 'newest' from the sort menu
  // that comes with the first page.
  async function commentsStartToken(sort) {
    const wd = D.watchData();
    const panel = (wd && wd.engagementPanels || []).map(e => e.engagementPanelSectionListRenderer)
      .find(p => p && (p.panelIdentifier === 'engagement-panel-comments-section' || p.targetId === 'engagement-panel-comments-section'));
    const known = sortTokens(panel);
    if (known[sort]) return known[sort];
    const section = (dig(results(), 'results', 'results', 'contents') || [])
      .map(c => c.itemSectionRenderer).find(s => s && s.sectionIdentifier === 'comment-item-section');
    const start = D.continuationOf(dig(panel, 'content')) || D.continuationOf(section);
    if (!start || sort === 'top') return start;
    // Newest first: the sort menu only arrives with the first page.
    const first = await D.innertube('next', { continuation: start });
    return sortTokens(first).newest || start;
  }

  // comments('top' | 'newest') -> pager; each page is ~20 threads.
  function comments(sort = 'top') {
    return D.pager(async token => {
      if (!token) token = await commentsStartToken(sort);
      if (!token) return { items: [], token: null };
      const r = await D.innertube('next', { continuation: token });
      return { items: readComments(r), token: D.nextPageToken(r) };
    }, null);
  }

  // Like / unlike / dislike / undislike a comment (signed in: its `actions` tokens), the way
  // YouTube's page does (POST comment/perform_comment_action). Resolves { ok, error }; ok
  // when YouTube doesn't report the action as failed. UNVERIFIED signed in (signed out the
  // tokens are missing and this answers ok: false).
  async function rateComment(comment, what) {
    const token = comment && comment.actions && comment.actions[what];
    if (!token) return { ok: false, error: 'not available (signed out?)' };
    try {
      const r = await D.innertube('comment/perform_comment_action', { actions: [token] });
      const results = r && r.actionResults;
      const failed = Array.isArray(results) && results.some(x => /FAIL/i.test(x.status || ''));
      return failed ? { ok: false, error: JSON.stringify(results) } : { ok: true };
    } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  }

  // replies(comment) -> pager over a thread's replies (comment.repliesToken), asked for the
  // way its comment was (comment.via).
  function replies(comment) {
    const via = (comment && comment.via) || 'next';
    return D.pager(async token => {
      if (!token) return { items: [], token: null };
      const r = await D.innertube(via, { continuation: token });
      return { items: readComments(r, via), token: D.nextPageToken(r) };
    }, comment && comment.repliesToken);
  }

  // ---------------------------------------------------------------- saving to playlists
  // saveTargets(videoId) -> Promise of [{ id, title, saved }]: where YouTube's Save menu can
  // put the video (Watch later first, then your playlists), and whether it's in each
  // (POST playlist/get_add_to_playlist, as the page's Save button does). [] signed out.
  // Verified signed in (0.77.0).
  async function saveTargets(videoId) {
    if (!D.signedIn() || !videoId) return [];
    const r = await D.innertube('playlist/get_add_to_playlist', { videoIds: [videoId], excludeWatchLater: false });
    return ns.youtubeChannel.findKeyAll(r, 'playlistAddToOptionRenderer').map(o => ({
      id: o.playlistId, title: strOf(o.title), saved: o.containsSelectedVideos === 'ALL',
    })).filter(o => o.id);
  }
  // setSaved(videoId, playlistId, on) -> Promise of { ok, error }: add the video to the
  // playlist (on) or take it out (POST browse/edit_playlist). Verified signed in (0.77.0).
  async function setSaved(videoId, playlistId, on) {
    try {
      const action = on ? { action: 'ACTION_ADD_VIDEO', addedVideoId: videoId }
        : { action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: videoId };
      const r = await D.innertube('browse/edit_playlist', { playlistId, actions: [action] });
      return r && r.status === 'STATUS_SUCCEEDED' ? { ok: true } : { ok: false, error: (r && r.status) || 'no answer' };
    } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  }

  // ---------------------------------------------------------------- transcript
  // [{ start (s), text }] for the current video, or [] if it has none. YouTube refuses
  // direct transcript requests, so this opens the page's own transcript panel (the
  // description's "Show transcript" button), reads it, and closes it again.
  let transcriptCache = { id: null, lines: null };
  const SEG = 'transcript-segment-view-model, ytd-transcript-segment-renderer';
  function readSegments(panel) {
    return [...panel.querySelectorAll(SEG)].map(s => {
      const ts = s.querySelector('.ytwTranscriptSegmentViewModelTimestamp, .segment-timestamp');
      const tx = s.querySelector('.ytAttributedStringHost, .segment-text, yt-formatted-string');
      return { start: D.parseClock(textOf(ts)), text: textOf(tx) };
    }).filter(l => isFinite(l.start) && l.text);
  }
  const isOpen = p => !!p && p.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED';
  const panelWithSegments = () => [...document.querySelectorAll('ytd-engagement-panel-section-list-renderer')].find(p => p.querySelector(SEG));

  // Resolves the transcript lines (cached per video). Does nothing visible if the panel was
  // already open; otherwise opens it, waits for it to fill, reads it and closes it again.
  async function transcript() {
    const id = D.currentVideoId();
    if (transcriptCache.id === id && transcriptCache.lines) return transcriptCache.lines;
    let panel = panelWithSegments();
    const wasOpen = isOpen(panel);
    if (!wasOpen) {
      const btn = document.querySelector('ytd-video-description-transcript-section-renderer button, button[aria-label="Show transcript" i]');
      if (!btn) return [];
      btn.click();
      // Wait for the panel to open (a hidden one may still hold the previous video's lines).
      for (let i = 0; i < 40 && !isOpen(panel = panelWithSegments()); i++) await D.sleep(250);
      if (!isOpen(panel)) return [];
      await D.sleep(300);                                                  // let the list finish rendering
    }
    const lines = readSegments(panel);
    if (!wasOpen) { const close = panel.querySelector('#visibility-button button, button[aria-label="Close" i]'); if (close) close.click(); }
    if (D.currentVideoId() === id) transcriptCache = { id, lines };
    return lines;
  }

  // ---------------------------------------------------------------- search
  // search('query') -> pager of items (videos and playlists, same shape as Up next).
  function search(query) {
    return D.pager(async token => {
      const r = await D.innertube('search', token ? { continuation: token } : { query });
      return { items: D.collectItems(token ? (r.onResponseReceivedCommands || r) : dig(r, 'contents') || r), token: D.nextPageToken(r) };
    }, null);
  }

  ns.youtubeContent = {
    metadata, description, descriptionWithoutChapters, hasTranscript, owner, chapters, heatmap, mostReplayed, endScreen, cards, playlist, playlistVideos, playlistDetails, savePlaylist,
    comments, commentsInfo, replies, rateComment, readComments, sortTokens, transcript, search, saveTargets, setSaved, signedIn: D.signedIn,
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
