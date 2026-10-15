// The watch page's Up next list and the buttons under the video: the channel's subscriber
// count, views and upload date, and Subscribe / Like / Dislike. YouTube's markup changes
// from time to time; if one of these stops working, this is the file to fix. Text matching
// assumes English YouTube. (Description, comments, transcript, search etc. are in
// youtube-content.js; shared readers in youtube-data.js.)
(function (ns) {
  'use strict';

  const D = ns.youtubeData;
  const { textOf, videoIdOf, cached, compactNumber, timeAgo, VIEWS_RE, AGO_RE, kindOf, channelBadge, dig } = D;
  const first = sel => document.querySelector(sel);       // first element matching a CSS selector

  // ---------------------------------------------------------------- Up next
  // YouTube has two card designs in use (ytd-compact-video-renderer and the newer
  // yt-lockup-view-model); both are handled by finding /watch?v= links in the sidebar
  // (or under the video on narrow windows) and reading the text around them.
  const REC_ROOTS = '#secondary, ytd-watch-next-secondary-results-renderer, #related';
  const CARD = 'ytd-compact-video-renderer, yt-lockup-view-model, ytd-video-renderer, ytd-rich-item-renderer';

  // Up next as the page shows it: finds each card by its /watch?v= link and reads the title,
  // channel, badge, views, age and length from the text around it (skipping ads, playlists
  // and the video being watched). The fallback for when YouTube's data has less.
  function scrapeRecommendations() {
    const current = D.currentVideoId();
    const seen = new Set(), list = [];
    for (const root of document.querySelectorAll(REC_ROOTS)) {
      for (const a of root.querySelectorAll('a[href*="/watch?v="]')) {
        const id = videoIdOf(a.getAttribute('href'));
        if (!id || id === current || seen.has(id)) continue;
        if (/[?&]list=/.test(a.getAttribute('href'))) continue;                               // playlist card
        const card = a.closest(CARD) || a.parentElement;
        if (!card || card.closest('ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer')) continue;   // skip ads
        const title = textOf(card.querySelector('#video-title, h3 [title], h3, .yt-lockup-metadata-view-model__title, a#video-title-link'))
          || a.getAttribute('title') || textOf(a);
        if (!title) continue;
        const metaEls = card.querySelectorAll('#channel-name #text, ytd-channel-name, [class*="content-metadata-view-model"][class*="metadata-text"], .yt-core-attributed-string--link-inherit-color');
        let channel = '', channelEl = null;
        for (const m of metaEls) {
          const t = textOf(m);
          if (t && t !== title && !VIEWS_RE.test(t) && !AGO_RE.test(t)) { channel = t; channelEl = m; break; }
        }
        const all = textOf(card);
        const dur = /(\d{1,2}:)?\d{1,2}:\d{2}/.exec(textOf(card.querySelector('ytd-thumbnail-overlay-time-status-renderer, .badge-shape-wiz__text, .yt-badge-shape__text, badge-shape')) || '');
        const views = VIEWS_RE.exec(all), ago = AGO_RE.exec(all);
        seen.add(id);
        list.push({
          type: 'video', id, title,
          channel: channel.split(' • ')[0],
          badge: channelBadge(card.querySelector('ytd-channel-name, [class*="content-metadata-view-model"][class*="metadata-row"]') || channelEl && channelEl.parentElement || card),
          views: views ? `${views[1].replace(/\s+/g, '')} ${/watching/i.test(views[0]) ? 'watching' : 'views'}` : '',
          age: ago ? ago[1] : '',
          duration: dur ? dur[0] : '',
          kind: kindOf(`${title} ${all}`),
          thumb: D.thumbOf(id),
        });
        if (list.length >= 30) return list;
      }
    }
    return list;
  }

  // YouTube's own data behind the sidebar (more reliable than reading the page text): the
  // sidebar element's data, else the watch page's data. Videos and playlists.
  function dataUpNext() {
    const out = [];
    const el = document.querySelector('ytd-watch-next-secondary-results-renderer');
    const elData = el && (el.data || (el.__data && el.__data.data) || (el.polymerController && el.polymerController.data));
    if (elData) D.collectItems(elData, out);
    if (!out.length) {
      const resp = D.watchData();
      if (resp) D.collectItems(dig(resp, 'contents', 'twoColumnWatchNextResults', 'secondaryResults') || resp, out);
    }
    return out;
  }

  // Extra pages fetched with loadMoreRecommendations() (cleared on every new video).
  let more = [], moreToken, moreFor = null;
  D.onNavigate(() => { more = []; moreToken = undefined; moreFor = null; recommendations.reset(); details.reset(); });

  // Page text and YouTube's data, merged: data fills in whatever the text scraping missed.
  // Videos, plus the playlists / mixes YouTube suggests (from its data; they open as
  // playlists), each put back where YouTube placed it among the videos.
  function readRecommendations() {
    const current = D.currentVideoId();
    let data = [], lists = [];
    try {
      const all = dataUpNext();
      data = all.filter(it => it.type === 'video');
      // Each playlist with how many videos came before it in YouTube's order.
      let videosBefore = 0;
      for (const it of all) { if (it.type === 'video') videosBefore++; else if (it.playlistId) lists.push({ it, at: videosBefore }); }
    } catch (err) { console.warn('[streamxr] reading Up next data failed:', err); }
    if (moreFor === current) data = data.concat(more);
    let dom = [];
    try { dom = scrapeRecommendations(); } catch (_) {}
    const byId = new Map(data.map(d => [d.id, d]));
    const list = [], seen = new Set([current]);
    // Combine a page-text card with the data card for the same video: data fills in gaps
    // (and wins for channel and badge). The 360/180 kind: whichever side found one (the
    // data's comes from YouTube's VR180 / 360° badges), else the title.
    const spatial = k => (k && k !== '2D' ? k : null);
    const merge = (base, extra) => {
      const o = { ...base };
      if (extra) for (const k of Object.keys(extra)) if (extra[k] && (!o[k] || k === 'channel' || k === 'badge')) o[k] = extra[k];
      o.kind = spatial(base.kind) || spatial(extra && extra.kind) || kindOf(o.title || '');
      o.thumb = D.thumbOf(o.id);
      return o;
    };
    for (const d of dom) if (!seen.has(d.id)) { list.push(merge(d, byId.get(d.id))); seen.add(d.id); }
    for (const d of data) if (!seen.has(d.id)) { list.push(merge({ kind: kindOf(d.title) }, d)); seen.add(d.id); }
    const out = list.slice(0, 30 + more.length);
    lists.forEach(({ it, at }, k) => out.splice(Math.min(out.length, at + k), 0, it));   // + k: earlier insertions
    return out;
  }
  const recommendations = cached(readRecommendations, 2000, []);

  // Playlists / mixes YouTube suggests in Up next: [{ type:'playlist', playlistId, id (first
  // video), title, channel, videoCount, thumb, ... }].
  function upNextPlaylists() {
    try { return dataUpNext().filter(it => it.type === 'playlist'); } catch (_) { return []; }
  }

  // Fetch the next page of Up next (what scrolling the sidebar does). Resolves to the number
  // of new videos; recommendations() includes them afterwards.
  async function loadMoreRecommendations() {
    const current = D.currentVideoId();
    if (moreFor !== current) { more = []; moreToken = undefined; moreFor = current; }
    if (moreToken === undefined) {
      const resp = D.watchData();
      moreToken = resp ? D.continuationOf(dig(resp, 'contents', 'twoColumnWatchNextResults', 'secondaryResults')) : null;
    }
    if (!moreToken) return 0;
    const r = await D.innertube('next', { continuation: moreToken });
    if (D.currentVideoId() !== current) return 0;                         // video changed meanwhile
    const items = D.collectItems(r.onResponseReceivedEndpoints || r).filter(it => it.type === 'video');
    moreToken = D.nextPageToken(r);
    const have = new Set(recommendations().map(i => i.id));
    const fresh = items.filter(it => !have.has(it.id));
    more.push(...fresh);
    recommendations.reset();
    return fresh.length;
  }

  // Open a video the way clicking it on the page would: YouTube switches videos inside the
  // same page, so the VR session keeps running. Uses the sidebar link when there is one,
  // otherwise YouTube's own in-page navigation. Optional playlist id plays it as a playlist
  // (with no video id, e.g. a channel's show, its first video is looked up first: opened
  // without one, YouTube played a "not available on this device" placeholder instead).
  // index: the video's 0-based position in the playlist (tells YouTube which copy when a
  // video is listed twice, and where to load the playlist window from).
  // Returns true if it's opening (asynchronously when the first video had to be looked up).
  function openVideo(id, playlistId, index) {
    if (!id && !playlistId) return false;
    if (!id) {
      const go = first => { if (!openNow(first || '', playlistId)) console.warn('[streamxr] could not open playlist', playlistId); };
      firstVideoOf(playlistId).then(go, err => { console.warn('[streamxr] playlist lookup failed:', err); go(''); });
      return true;
    }
    return openNow(id, playlistId, index);
  }

  // The first video of a playlist, as YouTube's own "play all" picks it (the `next` request's
  // current video); '' if it gives none.
  async function firstVideoOf(playlistId) {
    const r = await D.innertube('next', { playlistId });
    return D.dig(r, 'currentVideoEndpoint', 'watchEndpoint', 'videoId') || '';
  }

  // openVideo's navigation itself (id may be '' with a playlist: YouTube picks the video).
  function openNow(id, playlistId, index) {
    const sel = REC_ROOTS.split(',').map(s => `${s.trim()} a[href*="v=${id}"]`).join(', ');
    const a = id && !playlistId && document.querySelector(sel);
    const at = playlistId && index >= 0;
    const url = `/watch?${[id && `v=${id}`, playlistId && `list=${playlistId}`, at && `index=${index + 1}`].filter(Boolean).join('&')}`;
    const endpoint = { ...(id ? { videoId: id } : {}), ...(playlistId ? { playlistId } : {}), ...(at ? { index } : {}) };
    if (a) a.click();
    else if (!navigate(url, endpoint)) return false;
    recommendations.reset(); details.reset();
    return true;
  }

  // In-page navigation through YouTube's app (no page reload). Returns false if unavailable.
  function navigate(url, watchEndpoint) {
    const app = document.querySelector('ytd-app');
    if (!app) return false;
    const endpoint = { commandMetadata: { webCommandMetadata: { url, webPageType: 'WEB_PAGE_TYPE_WATCH', rootVe: 3832 } }, watchEndpoint };
    try {
      app.dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint } }));
      return true;
    } catch (_) { return false; }
  }

  // ---------------------------------------------------------------- this video
  const SEL = {
    owner: 'ytd-watch-metadata #owner, ytd-video-owner-renderer',
    subCount: 'ytd-watch-metadata #owner-sub-count, #owner-sub-count',
    subscribe: 'ytd-watch-metadata #subscribe-button, ytd-watch-metadata ytd-subscribe-button-renderer, #subscribe-button',
    like: 'ytd-watch-metadata like-button-view-model button, ytd-watch-metadata #segmented-like-button button, #segmented-like-button button, like-button-view-model button',
    dislike: 'ytd-watch-metadata dislike-button-view-model button, ytd-watch-metadata #segmented-dislike-button button, #segmented-dislike-button button, dislike-button-view-model button',
    info: 'ytd-watch-metadata #info, ytd-watch-info-text #info, #info-container',
  };

  // Subscribed to the playing video's channel? The subscribe box holds BOTH buttons
  // ("Subscribe" and "Subscribed", so its text always contains "Subscribed") and shows one:
  // the visible one tells. When neither is laid out, the watch page's data
  // (subscribeButtonRenderer.subscribed, as of the page load) decides.
  function isSubscribed(subBox) {
    if (!subBox) return false;
    const shown = [...subBox.querySelectorAll('button')]
      .filter(b => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden');
    if (shown.some(b => /^subscribed$/i.test(textOf(b)))) return true;
    if (shown.some(b => /^subscribe$/i.test(textOf(b)))) return false;
    const data = D.findKey(dig(D.watchData(), 'contents'), 'subscribeButtonRenderer');
    return !!(data && data.subscribed);
  }

  // { subscribers, views, published, badge, subscribed, liked, disliked, likes, canLike, canSubscribe }
  function readDetails() {
    const r = D.playerResponse();
    const vd = r.videoDetails || {}, mf = (r.microformat && r.microformat.playerMicroformatRenderer) || {};
    const info = textOf(first(SEL.info));

    let views = vd.viewCount ? `${compactNumber(+vd.viewCount)} ${vd.isLive ? 'watching' : 'views'}` : '';
    if (!views) { const m = VIEWS_RE.exec(info); if (m) views = `${m[1]} views`; }
    const published = timeAgo(mf.publishDate || mf.uploadDate) || (AGO_RE.exec(info) || [])[1] || '';

    const subBox = first(SEL.subscribe);
    const subBtn = subBox && (subBox.querySelector('button') || subBox);
    const like = first(SEL.like), dislike = first(SEL.dislike);
    // Like count: the button's text when YouTube shows it, otherwise its accessibility label
    // ("like this video along with 98,123 other people").
    let likes = textOf(like).replace(/^like\b/i, '').trim();
    if (!/\d/.test(likes) && like) {
      const m = /([\d,.]+)\s*(?:other\s+)?(?:people|likes?)/i.exec(like.getAttribute('aria-label') || '');
      const liked = like.getAttribute('aria-pressed') === 'true';
      if (m) likes = compactNumber(+m[1].replace(/[,.]/g, '') + (liked && /other/i.test(m[0]) ? 1 : 0));
    }

    return {
      subscribers: textOf(first(SEL.subCount)).replace(/\s*subscribers?$/i, ''),
      views, published,
      badge: channelBadge(first(SEL.owner) && first(SEL.owner).querySelector('ytd-channel-name, #channel-name')),
      canSubscribe: !!subBtn,
      subscribed: subscribedNow.has(vd.channelId) ? subscribedNow.get(vd.channelId) : isSubscribed(subBox),
      canLike: !!like,
      liked: !!like && like.getAttribute('aria-pressed') === 'true',
      disliked: !!dislike && dislike.getAttribute('aria-pressed') === 'true',
      likes: /\d/.test(likes) ? likes : '',
    };
  }
  const details = cached(readDetails, 1000, {});

  // Subscription changes made through YouTube's API (youtube-subscriptions.js) don't update
  // the page's own Subscribe button, so the confirmed result is remembered per channel id
  // until the next video loads (its page then shows the real state).
  const subscribedNow = new Map();             // channel id -> true / false
  D.onNavigate(() => { subscribedNow.clear(); });
  function noteSubscription(channelId, on) {
    if (channelId) subscribedNow.set(channelId, !!on);
    details.reset();
  }

  // Subscribe by clicking the page's button (kept for completeness; the VR panels use the
  // subscriptions API, which can also unsubscribe).
  function subscribe() {
    const d = details();
    if (d.subscribed) return false;
    const box = first(SEL.subscribe), btn = box && (box.querySelector('button') || box);
    if (!btn) return false;
    btn.click(); details.reset();
    return true;
  }
  // Like / Dislike: click YouTube's own buttons (these accept script clicks, unlike Skip ad).
  // Return whether the button was found; the details are re-read right away.
  function like() { const b = first(SEL.like); if (b) { b.click(); details.reset(); } return !!b; }
  function dislike() { const b = first(SEL.dislike); if (b) { b.click(); details.reset(); } return !!b; }

  // YouTube's logo (the play button and "YouTube"), as the page's own top bar draws it:
  // Promise of an image, or null with no logo on the page. A copy of the top bar's SVG with
  // its colours written in (a copy outside the page has none of its styles): YouTube Red
  // kept, everything else white (it's shown on a dark frame: the VR screen's placeholder).
  function logo() {
    const svg = first('ytd-topbar-logo-renderer #logo-icon svg, #logo-icon svg');
    if (!svg) return Promise.resolve(null);
    const copy = svg.cloneNode(true), src = [svg, ...svg.querySelectorAll('*')], dst = [copy, ...copy.querySelectorAll('*')];
    src.forEach((el, i) => {
      const fill = getComputedStyle(el).fill, m = /rgba?\((\d+), (\d+), (\d+)/.exec(fill || '');
      const red = m && +m[1] > 180 && +m[2] < 90 && +m[3] < 90;
      if (fill && fill !== 'none' && dst[i].tagName !== 'svg') dst[i].setAttribute('fill', red ? fill : '#ffffff');
      dst[i].removeAttribute('class'); dst[i].removeAttribute('style');
    });
    // A big, sharp picture: the logo's own shape at 900 px wide.
    const vb = (svg.getAttribute('viewBox') || '0 0 90 20').trim().split(/[\s,]+/).map(Number);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', '900'); copy.setAttribute('height', String(Math.round(900 * vb[3] / vb[2])));
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  ns.youtubePage = {
    recommendations, upNextPlaylists, loadMoreRecommendations, openVideo, navigate,
    details, subscribe, noteSubscription, like, dislike, logo,
    currentVideoId: D.currentVideoId, compactNumber, timeAgo,
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
