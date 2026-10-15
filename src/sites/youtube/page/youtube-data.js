// Shared plumbing for reading YouTube: text helpers, the watch page's data object, calls
// to YouTube's own internal API (the one its pages use), and readers for the video/playlist
// item shapes that Up next, search and playlists share. No page clicking here; that lives
// in youtube-page.js / youtube-content.js. Text matching assumes English YouTube.
(function (ns) {
  'use strict';

  // ---------------------------------------------------------------- small helpers
  // An element's text with whitespace collapsed ('' for no element).
  const textOf = el => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  // The 11-character video id in a /watch?v=... link (null if there isn't one).
  const videoIdOf = href => { const m = /[?&]v=([\w-]{11})/.exec(href || ''); return m ? m[1] : null; };
  const currentVideoId = () => videoIdOf(location.href);          // the video this tab is on

  // YouTube text objects: "plain", { simpleText }, { content } or { runs: [{ text }] }.
  const strOf = t => !t ? '' : typeof t === 'string' ? t
    : t.simpleText || t.content || (t.runs ? t.runs.map(r => r.text).join('') : '') || '';

  // dig(obj, 'a', 'b', 0, 'c') -> obj.a.b[0].c, or undefined if any step is missing.
  function dig(o, ...path) {
    for (const k of path) { if (o == null) return undefined; o = o[k]; }
    return o;
  }

  // First value under `key` anywhere inside `root` (depth-limited).
  function findKey(root, key, depth = 0) {
    if (!root || typeof root !== 'object' || depth > 20) return undefined;
    if (Object.prototype.hasOwnProperty.call(root, key)) return root[key];
    for (const k of Object.keys(root)) {
      const v = findKey(root[k], key, depth + 1);
      if (v !== undefined) return v;
    }
    return undefined;
  }

  // Largest image URL in a { thumbnails: [...] } / { sources: [...] } object.
  function bestImage(obj) {
    const list = obj && (obj.thumbnails || obj.sources || findKey(obj, 'thumbnails') || findKey(obj, 'sources')) || [];
    let best = null;
    for (const t of list) if (t && t.url && (!best || (t.width || 0) > (best.width || 0))) best = t;
    return best ? best.url.replace(/^\/\//, 'https://') : '';
  }

  // Re-read at most every `ms`; reset() forces a fresh read (after we click something).
  // The panel asks for these values every frame, so reading the page that often would be
  // wasteful. If `fn` throws, the cached value becomes `fallback` (until the next read).
  function cached(fn, ms, fallback) {
    let at = -Infinity, val;
    const get = () => {
      const now = performance.now();
      if (now - at > ms) { try { val = fn(); } catch (_) { val = fallback; } at = now; }
      return val;
    };
    get.reset = () => { at = -Infinity; };
    return get;
  }

  // await sleep(250): the shell's frame clock, which keeps time in VR (the page's own timers
  // can be held back there; frame-clock.js).
  const sleep = ms => ns.frameClock.sleep(ms);

  // ---------------------------------------------------------------- formatting
  function compactNumber(n) {
    if (!isFinite(n)) return '';
    if (n >= 1e9) return `${+(n / 1e9).toFixed(n < 1e10 ? 1 : 0)}B`;
    if (n >= 1e6) return `${+(n / 1e6).toFixed(n < 1e7 ? 1 : 0)}M`;
    if (n >= 1e3) return `${+(n / 1e3).toFixed(n < 1e4 ? 1 : 0)}K`;
    return String(n);
  }

  // A date like "2018-07-11T11:00:42-07:00" -> "8 years ago", "3 days ago" ... (the largest
  // whole unit, as of now; '' if it can't be parsed).
  function timeAgo(dateText) {
    const t = Date.parse(dateText);
    if (!isFinite(t)) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [name, size] of units) {
      const n = Math.floor(s / size);
      if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  }

  // "1:02:03" / "4:05" -> seconds (NaN if not a timestamp).
  function parseClock(text) {
    const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec((text || '').trim());
    return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) : NaN;
  }

  // "1.2M views", "3 days ago" etc. from a block of card text.
  const VIEWS_RE = /([\d.,]+\s*[KMB]?)\s+(?:views|watching)/i;
  const AGO_RE = /((?:Streamed |Premiered )?\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago)/i;

  // Newer short dates ("8mo ago", "1y ago") -> "8 months ago", "1 year ago".
  const SHORT_AGO_RE = /^((?:Streamed |Premiered )?)(\d+)\s*(y|mo|w|d|h|min|m|s)\s+ago$/i;
  const AGO_UNITS = { y: 'year', mo: 'month', w: 'week', d: 'day', h: 'hour', min: 'minute', m: 'minute', s: 'second' };
  // Text that isn't a short date ("5 days ago", "Streamed live") is returned unchanged.
  function longAgo(text) {
    const t = (text || '').trim(), m = SHORT_AGO_RE.exec(t);
    if (!m) return t;
    return `${m[1]}${m[2]} ${AGO_UNITS[m[3].toLowerCase()]}${m[2] === '1' ? '' : 's'} ago`;
  }

  // Best guess at what kind of video a title/description is: '360', '180' or '2D'.
  function kindOf(text) {
    if (/\bVR ?180\b|\b180°|\b180 ?VR\b|\b180 3D\b/i.test(text)) return '180';
    if (/\b360°|\b360 ?VR\b|\bVR ?360\b|\b360 video\b|\b360 degree/i.test(text)) return '360';
    return '2D';
  }

  // A card's kind from YouTube's own badges: "VR180" -> '180', "360°" -> '360', else null.
  // (metadataBadgeRenderer.label on older cards, badgeViewModel.badgeText on newer ones;
  // seen on Noodle's VR180 video, whose title doesn't say 180, and on 360° search results.)
  function badgeKind(obj) {
    const j = JSON.stringify(obj || {});
    if (/"(?:label|badgeText)":"VR ?180"/i.test(j)) return '180';
    if (/"(?:label|badgeText)":"360°?"/.test(j)) return '360';
    return null;
  }

  // Badge on a channel name in the page: 'verified' (check in a circle), 'artist' (official
  // artist channel, music note) or null. YouTube marks these with aria-labels / CSS classes.
  function channelBadge(root) {
    if (!root) return null;
    if (root.querySelector('.badge-style-type-verified-artist, [aria-label*="Official Artist" i], [title*="Official Artist" i]')) return 'artist';
    if (root.querySelector('.badge-style-type-verified, [aria-label*="Verified" i], [title*="Verified" i]')) return 'verified';
    return null;
  }

  // The same badge, from YouTube's data instead of the page.
  function badgeFromData(obj) {
    if (!obj) return null;
    const j = JSON.stringify(obj);
    if (/VERIFIED_ARTIST|OFFICIAL_ARTIST|Official Artist|AUDIO_BADGE|MUSIC_FILLED/i.test(j)) return 'artist';
    if (/BADGE_STYLE_TYPE_VERIFIED|CHECK_CIRCLE|"Verified"/i.test(j)) return 'verified';
    return null;
  }

  // ---------------------------------------------------------------- watch page data
  // YouTube switches videos inside the same page; each switch fires yt-navigate-finish with
  // the new page's data. On a fresh load the data is window.ytInitialData instead.
  let navResponse = null;
  const navListeners = [];
  document.addEventListener('yt-navigate-finish', e => {
    try { navResponse = e.detail && e.detail.response && e.detail.response.response || null; } catch (_) { navResponse = null; }
    for (const fn of navListeners) { try { fn(); } catch (err) { console.warn('[streamxr] navigate listener failed:', err); } }
  });
  // Run fn whenever YouTube finishes switching to another video (to reset our caches).
  const onNavigate = fn => { navListeners.push(fn); };

  // The watch page's data for the video playing now, or null if only stale data is around.
  function watchData() {
    const id = currentVideoId();
    for (const resp of [navResponse, window.ytInitialData]) {
      if (!resp || !resp.contents || !resp.contents.twoColumnWatchNextResults) continue;
      const vid = dig(resp, 'currentVideoEndpoint', 'watchEndpoint', 'videoId');
      if (vid && vid !== id) continue;
      return resp;
    }
    return null;
  }

  // The player's data for the video playing now (metadata, captions, end screen, formats).
  function playerResponse() {
    const p = document.getElementById('movie_player');
    let r = null;
    try { r = p && p.getPlayerResponse && p.getPlayerResponse(); } catch (_) { /* player not ready */ }
    return r || window.ytInitialPlayerResponse || {};
  }

  // Is someone signed in to YouTube in this tab? (Signed-out pages hide some features.)
  const signedIn = () => !!(window.ytcfg && window.ytcfg.get && window.ytcfg.get('LOGGED_IN'));

  // ---------------------------------------------------------------- YouTube's internal API
  // The Authorization header YouTube's own pages send while signed in:
  // "SAPISIDHASH <time>_<sha1('<time> <SAPISID cookie> https://www.youtube.com')>"
  // (as documented by YouTube.js and yt-dlp). null when signed out (no SAPISID cookie).
  async function sidAuth() {
    const m = /(?:^|;\s*)(?:SAPISID|__Secure-3PAPISID)=([^;]+)/.exec(document.cookie);
    if (!m || !crypto.subtle) return null;
    const ts = Math.floor(Date.now() / 1000);
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${ts} ${m[1]} ${location.origin}`));
    const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    return `SAPISIDHASH ${ts}_${hex}`;
  }

  // POST /youtubei/v1/<endpoint> the way YouTube's own pages do (same origin, the user's
  // cookies, plus the signed-in Authorization header when there is one, so signed-in
  // requests see the user's own feeds). Used for: next (more Up next / comments), search,
  // browse, guide, subscriptions. If YouTube refuses the signed-in header, the request is
  // retried once without it (answered as signed out rather than failing).
  async function innertube(endpoint, body) {
    const cfg = window.ytcfg;
    if (!cfg || !cfg.get) throw new Error('ytcfg not available');
    const headers = { 'content-type': 'application/json' };
    const name = cfg.get('INNERTUBE_CONTEXT_CLIENT_NAME'), version = cfg.get('INNERTUBE_CONTEXT_CLIENT_VERSION');
    if (name) headers['X-Youtube-Client-Name'] = String(name);
    if (version) headers['X-Youtube-Client-Version'] = version;
    if (cfg.get('VISITOR_DATA')) headers['X-Goog-Visitor-Id'] = cfg.get('VISITOR_DATA');
    // Which YouTube identity to act as: an account can have several (its own channel, brand
    // channels). YouTube's pages name the one in use with X-Goog-PageId and
    // context.user.onBehalfOfUser (the page's DELEGATED_SESSION_ID); without them a request is
    // answered as the account's default identity - seen signed in (0.22.0): the
    // Subscriptions feed and Subscribe acted on a different channel than the user's.
    const context = cfg.get('INNERTUBE_CONTEXT') || {};
    const pageId = cfg.get('DELEGATED_SESSION_ID') || dig(context, 'user', 'onBehalfOfUser') || '';
    const ctx = pageId ? { ...context, user: { ...(context.user || {}), onBehalfOfUser: pageId } } : context;
    const send = h => fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
      method: 'POST', credentials: 'same-origin', headers: h,
      body: JSON.stringify({ context: ctx, ...body }),
    });
    const auth = signedIn() ? await sidAuth().catch(() => null) : null;
    let res = await send(auth ? {
      ...headers, Authorization: auth, 'X-Goog-AuthUser': String(cfg.get('SESSION_INDEX') || 0), 'X-Origin': location.origin,
      ...(pageId ? { 'X-Goog-PageId': pageId } : {}),
    } : headers);
    if (auth && (res.status === 401 || res.status === 403)) res = await send(headers);
    if (!res.ok) throw new Error(`youtubei ${endpoint}: HTTP ${res.status}`);
    return res.json();
  }

  // Run one of the action endpoints YouTube puts on its buttons (liking a post, voting in
  // a poll ...) the way its page does. A performCommentActionEndpoint sends its action
  // token to comment/perform_comment_action ({ actions: [token] }); any other endpoint is
  // POSTed to its own apiUrl with its own data. Resolves { ok, error, response }; ok unless
  // the request fails or YouTube reports the action as failed.
  async function runEndpoint(ep) {
    try {
      const pca = findKey(ep, 'performCommentActionEndpoint');
      let r;
      if (pca && pca.action) r = await innertube('comment/perform_comment_action', { actions: [pca.action] });
      else {
        const api = dig(findKey(ep, 'webCommandMetadata'), 'apiUrl') || '';
        const key = ep && Object.keys(ep).find(k => !/^(commandMetadata|clickTrackingParams)$/.test(k) && ep[k] && typeof ep[k] === 'object');
        if (!/^\/youtubei\/v1\//.test(api) || !key) return { ok: false, error: 'no action to run (signed out?)' };
        r = await innertube(api.replace(/^\/youtubei\/v1\//, ''), ep[key]);
      }
      const results = r && r.actionResults;
      const failed = Array.isArray(results) && results.some(x => /FAIL/i.test(x.status || ''));
      return failed ? { ok: false, error: JSON.stringify(results), response: r } : { ok: true, response: r };
    } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  }

  // Continuation token (for "load more") anywhere inside a data object. Two shapes:
  // continuationItemRenderer, and the newer continuationItemViewModel (playlist pages, Oct
  // 2026), whose token sits in continuationCommand.innertubeCommand.continuationCommand.
  function continuationOf(obj) {
    const item = findKey(obj, 'continuationItemRenderer');
    if (item) {
      return dig(item, 'continuationEndpoint', 'continuationCommand', 'token')
        || dig(item, 'button', 'buttonRenderer', 'command', 'continuationCommand', 'token')
        || dig(findKey(item, 'continuationCommand'), 'token') || null;
    }
    const vm = findKey(obj, 'continuationItemViewModel');
    return dig(vm, 'continuationCommand', 'innertubeCommand', 'continuationCommand', 'token')
      || dig(findKey(dig(vm, 'continuationCommand', 'innertubeCommand'), 'continuationCommand'), 'token') || null;
  }

  // Token for the NEXT PAGE of a list response: the continuation item that ends the list
  // (items inside, like comment threads, can carry their own tokens - those are skipped).
  function nextPageToken(r) {
    const lists = [];
    for (const e of [...(r && r.onResponseReceivedEndpoints || []), ...(r && r.onResponseReceivedCommands || []),
      ...(r && r.onResponseReceivedActions || [])]) {
      const a = e.appendContinuationItemsAction || e.reloadContinuationItemsCommand;
      if (a && a.continuationItems) lists.push(a.continuationItems);
    }
    if (!lists.length) { const sl = findKey(r, 'sectionListRenderer'); if (sl && sl.contents) lists.push(sl.contents); }
    for (const list of lists.reverse()) {
      const last = list[list.length - 1];
      if (last && (last.continuationItemRenderer || last.continuationItemViewModel)) return continuationOf(last);
    }
    return null;
  }

  // Paging helper: `fetchPage(token)` -> { items, token }. Returns { next(), done, items }:
  // next() loads one more page and resolves to that page's items ([] when finished).
  function pager(fetchPage, firstToken) {
    let token = firstToken, started = false, busy = null;
    const p = {
      items: [], done: false,
      next() {
        if (busy) return busy;
        if (p.done || (started && !token)) { p.done = true; return Promise.resolve([]); }
        busy = fetchPage(started ? token : firstToken).then(page => {
          started = true; token = page.token || null;
          if (!token) p.done = true;
          p.items.push(...page.items);
          return page.items;
        }).finally(() => { busy = null; });
        return busy;
      },
    };
    return p;
  }

  // ---------------------------------------------------------------- item readers
  // Every item: { type: 'video'|'playlist', id, title, channel, channelId, badge, views,
  // age, duration, kind ('2D'|'180'|'360'), live (streaming now), watched (0-100: percent
  // you've watched, 0 if none or signed out), thumb } (+ playlistId, videoCount for playlists).
  const thumbOf = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

  // A view count as "26M views" / "1.2K watching". Takes the visible text, and the hidden
  // accessibility label as a fallback for the newer cards that show only "26M".
  function viewsText(text, label) {
    const m = VIEWS_RE.exec(text || '');
    if (m) return `${m[1].replace(/\s+/g, '')} ${/watching/i.test(m[0]) ? 'watching' : 'views'}`;
    if (/\b(?:views?|watching)\b/i.test(label || '') && /^[\d.,]+\s*[KMB]?$/i.test((text || '').trim()))
      return `${text.trim()} ${/watching/i.test(label) ? 'watching' : 'views'}`;
    return '';
  }

  // A duration in seconds as a clock: 605 -> "10:05", 3725 -> "1:02:05" ('' for none).
  function clockOf(seconds) {
    const s = Math.floor(+seconds);
    if (!(s > 0)) return '';
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, pad = n => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  }

  // Views and age from a playlist row's "videoInfo" line, which may be long ("7.4K views •
  // 4 days ago") or short ("7.4K • 4d ago", Watch later): { views: "7.4K views", age:
  // "4 days ago" }, '' for what's missing.
  function statsFromInfo(info) {
    const parts = strOf(info).split('•').map(s => s.trim()).filter(Boolean);
    let views = '', age = '';
    for (const p of parts) {
      if (!views && (viewsText(p) || /^[\d.,]+\s*[KMB]?$/i.test(p))) views = viewsText(p) || `${p} views`;
      else if (!age && (AGO_RE.test(p) || SHORT_AGO_RE.test(p))) age = longAgo(p);
    }
    return { views, age };
  }

  // Older shape (still used by search results and playlists): compactVideoRenderer /
  // videoRenderer / playlistPanelVideoRenderer / playlistVideoRenderer (a playlist page's
  // row, e.g. Watch later's: views and age only in its "videoInfo" line, duration also as
  // lengthSeconds).
  function fromCompact(r) {
    if (!r || !r.videoId) return null;
    const title = strOf(r.title);
    const byline = r.longBylineText || r.shortBylineText || r.ownerText;
    const info = statsFromInfo(r.videoInfo);
    return {
      type: 'video', id: r.videoId, title,
      channel: strOf(byline),
      channelId: dig(byline, 'runs', 0, 'navigationEndpoint', 'browseEndpoint', 'browseId') || '',
      badge: badgeFromData(r.ownerBadges),
      views: viewsText(strOf(r.shortViewCountText), dig(r.shortViewCountText, 'accessibility', 'accessibilityData', 'label'))
        || viewsText(strOf(r.viewCountText)) || info.views,
      age: longAgo(strOf(r.publishedTimeText)) || info.age,
      duration: strOf(r.lengthText) || clockOf(r.lengthSeconds),
      kind: badgeKind(r.badges) || kindOf(`${title} ${strOf(r.detailedMetadataSnippets && r.detailedMetadataSnippets[0] && r.detailedMetadataSnippets[0].snippetText)}`),
      // Live now: a "LIVE NOW" badge or a LIVE time overlay.
      live: /BADGE_STYLE_TYPE_LIVE_NOW|"style":"LIVE"/.test(JSON.stringify([r.badges || [], r.thumbnailOverlays || []])),
      // Percent of it you've watched (signed in; the red bar under YouTube's thumbnail).
      watched: +dig(findKey(r.thumbnailOverlays, 'thumbnailOverlayResumePlaybackRenderer'), 'percentDurationWatched') || 0,
      thumb: thumbOf(r.videoId),
    };
  }

  // Newer shape: lockupViewModel (Up next, feeds, channel tabs). Videos (also SHORT, MOVIE)
  // and playlists (also SHOW, PODCAST, ALBUM, and STATION = mixes); content types as listed
  // by YouTube.js. Newer cards show just "26M" / "1y ago"; the accessibility label has the
  // long form.
  function fromLockup(r) {
    if (!r || !r.contentId) return null;
    const isPlaylist = /PLAYLIST|SHOW|PODCAST|ALBUM|STATION/.test(r.contentType || '');
    if (r.contentType && !isPlaylist && !/VIDEO|SHORT|MOVIE/.test(r.contentType)) return null;
    const md = r.metadata && r.metadata.lockupMetadataViewModel || {};
    const rows = dig(md, 'metadata', 'contentMetadataViewModel', 'metadataRows') || [];
    let channel = '', channelId = '', badge = null, views = '', age = '';
    for (const row of rows) for (const part of row.metadataParts || []) {
      const text = strOf(part.text), label = part.accessibilityLabel || '';
      if (!text) continue;
      const v = !views && viewsText(text, label);
      if (v) views = v;
      else if (!age && (AGO_RE.test(label) || AGO_RE.test(text) || SHORT_AGO_RE.test(text)))
        age = (AGO_RE.exec(label) || AGO_RE.exec(text) || [, longAgo(text)])[1];
      else if (!channel) {
        channel = text; badge = badgeFromData(part);
        channelId = dig(findKey(part, 'browseEndpoint'), 'browseId') || '';
      }
    }
    const badges = JSON.stringify(r.contentImage || {});
    const live = /THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE|BADGE_STYLE_TYPE_LIVE/.test(badges);   // live now (red "LIVE" badge)
    const durM = !live && /"text":"((?:\d{1,2}:)?\d{1,2}:\d{2})"/.exec(badges);
    const countM = /"text":"(\d[\d,]*) (?:videos|lessons|episodes)"/i.exec(badges);
    if (!channelId) channelId = dig(findKey(md.image, 'browseEndpoint'), 'browseId') || '';
    const title = strOf(md.title);
    const firstVideo = isPlaylist ? (dig(findKey(r, 'watchEndpoint'), 'videoId') || '') : r.contentId;
    return {
      type: isPlaylist ? 'playlist' : 'video',
      id: isPlaylist ? firstVideo : r.contentId,
      playlistId: isPlaylist ? r.contentId : undefined,
      videoCount: countM ? countM[1] : undefined,
      title, channel, channelId, badge, views, age,
      duration: durM ? durM[1] : '',
      kind: badgeKind(md) || kindOf(title), live,
      // Percent of it you've watched (signed in; the thumbnail's progress bar overlay).
      watched: isPlaylist ? 0 : +dig(findKey(r.contentImage, 'thumbnailOverlayProgressBarViewModel'), 'startPercent') || 0,
      thumb: firstVideo ? thumbOf(firstVideo) : bestImage(r.contentImage),
    };
  }

  // Keys of ad blocks, which item collectors skip (capital "Ad" so that e.g.
  // "backstagePostThreadRenderer" doesn't count).
  const AD_KEY_RE = /^(adSlotRenderer|promoted\w*Renderer|\w*Ad(Layout)?Renderer)$/;

  // Every video/playlist item anywhere inside a data object (skipping ads), in order.
  function collectItems(root, out = [], depth = 0) {
    if (!root || typeof root !== 'object' || depth > 16 || out.length > 200) return out;
    if (Array.isArray(root)) { for (const x of root) collectItems(x, out, depth + 1); return out; }
    for (const k of Object.keys(root)) {
      const v = root[k];
      if (AD_KEY_RE.test(k)) continue;
      if (k === 'compactVideoRenderer' || k === 'videoRenderer' || k === 'playlistPanelVideoRenderer' || k === 'playlistVideoRenderer') { const it = fromCompact(v); if (it) out.push(it); continue; }
      if (k === 'lockupViewModel') { const it = fromLockup(v); if (it) out.push(it); continue; }
      if (v && typeof v === 'object') collectItems(v, out, depth + 1);
    }
    return out;
  }

  ns.youtubeData = {
    textOf, strOf, dig, findKey, bestImage, videoIdOf, currentVideoId, cached, sleep,
    compactNumber, timeAgo, longAgo, parseClock, VIEWS_RE, AGO_RE, kindOf, badgeKind, channelBadge, badgeFromData,
    onNavigate, watchData, playerResponse, signedIn,
    innertube, sidAuth, runEndpoint, continuationOf, nextPageToken, pager,
    fromCompact, fromLockup, collectItems, thumbOf, AD_KEY_RE,
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
