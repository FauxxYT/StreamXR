// YouTube's provider: the middle layer between the VR shell and the youtube-*.js site
// files (ARCHITECTURE.md, "The provider"). The shell (xr-session.js, vr-panel/) asks it what's
// playing and tells it what was pressed; everything YouTube-specific the shell used to do
// itself lives here: the player calls, format detection, ads, live streams, the playlist
// window, the controls panel's "now playing" (title, info line, channel, Subscribe / Like /
// Dislike) and the chevron panels' data.
//
// The provider interface (what any site's provider offers; `ns.ytVr.provider` is YouTube's):
//   name                       the site's name, for messages ("YouTube")
//   theme                      the interface's colours: { accent, accentPressed, dark, custom:
//                              { name: '#rrggbb' } (extra colour roles, e.g. for card flags),
//                              seed: '#rrggbb' (its Material 3 palette is made from it), palette:
//                              { M3 role: '#rrggbb' } (optional, by hand) } (vr-panel/tokens.js)
//   video() -> <video>         the element to show (may change when another video opens), or
//                              null with no video playing (VR then shows the logo)
//   logo() -> Promise of image the site's logo, for the screen while no video plays (optional)
//   info() -> object           what the site says about the video (for the Details panel)
//   detectFormat(info?) -> { fmt, isSpatial }   which format (shared/formats.js ids) to show
//   isPaused(), toggle(), seek(seconds)         basic playback (also for the controller buttons)
//   buffering() -> bool        the video is waiting for data (the loading spinner shows)
//   onNavigate(fn) -> stop()   fn runs when another video opens in the page
//   session() -> one VR session's side of the site (see below), made when VR starts
// A session: {
//   actions: the controls panel's and the chevron panels' actions (vr-panel.js lists the
//            ones the shell calls: toggle, seekBy, seekTo, goLive, setQuality, setSpeed,
//            setVolume, setMuted, storyboard, skipAd, previousVideo, nextVideo, extra; the rest are
//            for this site's own panels),
//   state(): polled every frame: { title, nowPlaying (see nowPlaying below), time, duration,
//            live, paused, quality: { current, currentLabel, icons, levels: [{ id, label, icons }] }, speed,
//            speeds, volume, chapters, heatmap, ad, extras (its own controls panel buttons:
//            vr-panel.js; used through actions.extra), ...whatever this site's panels read },
//   ad() -> null | { ... }     the ad playing now (the shell shows ads on the cinema screen)
//   captions() -> [text]       the caption lines to draw over the video now (optional; [] for none)
//   site: { name, panels (the chevron panels, panels.js), onControl(id, panel, shell) (controls
//           panel controls the shell doesn't know: 'title', 'creator', 'action:<id>'; shell:
//           { confirm(d) -> Promise of bool }, the shell's dialog) } }
(function (ns) {
  'use strict';

  const { youtube, youtubePage: page } = ns;
  const cached = (fn, ms, fallback) => ns.youtubeData.cached(fn, ms, fallback);
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  // Is a video playing: are we on a watch page? (Elsewhere VR shows the logo, and YouTube's
  // leftover player is left alone.)
  const watching = () => location.pathname === '/watch';

  // YouTube's quality ids -> what people call them.
  const QUALITY_NAMES = {
    highres: '4320p', hd2880: '2880p', hd2160: '2160p', hd1440: '1440p', hd1080: '1080p', hd720: '720p',
    large: '480p', medium: '360p', small: '240p', tiny: '144p',
  };
  // A quality's name: YouTube's own (labels: e.g. "1080p60", youtube.quality()), else ours.
  const qualityName = (q, labels = {}) => (!q || q === 'auto' ? tr('yt.auto') : labels[q] || QUALITY_NAMES[q] || q);
  // The Quality button's icons (Material Symbols) for a quality id: 8K, 4K, 2K (1440p), Full
  // HD (1080p), HD (720p), "high quality off" below that, plus the 60 fps icon under it when
  // YouTube's name for it has a frame rate of 50 or more ("1080p60"; "2160s60" for a 360° /
  // VR180 video: YouTube writes "s" for spherical); the full name is in the menu. Unknown or
  // 'auto': the plain high-quality icon.
  const QUALITY_ICONS = { highres: '8k', hd2880: '4k', hd2160: '4k', hd1440: '2k', hd1080: 'full_hd', hd720: 'hd',
    large: 'high_quality_off', medium: 'high_quality_off', small: 'high_quality_off', tiny: 'high_quality_off' };
  function qualityIcons(q, labels = {}) {
    const fps = +(((labels[q] || '').match(/\d[ps](\d+)/) || [])[1] || 0);
    return [QUALITY_ICONS[q] || 'high_quality', ...(fps >= 50 ? ['60fps'] : [])];
  }

  // YouTube Premium's mark (extras.js premiumMark: the Diamond, red with Premium, purple without).
  const diamond = () => ns.ytVr.premiumMark();

  // The shell's quality state from youtube.quality(): the levels (YouTube's names and icons),
  // with Premium's enhanced-bitrate one ('premium', e.g. "1080p Premium") just above its plain
  // twin, marked with the Diamond and greyed out without Premium; it's the current one while
  // it plays.
  function qualityState(q) {
    const p = q.premium;
    const premiumLevel = p && { id: 'premium', label: p.label.replace(' ', '\n'), icons: [...qualityIcons(p.quality, q.labels).slice(0, 1), diamond()], disabled: !p.playable };
    const levels = [];
    for (const id of q.levels || []) {
      if (premiumLevel && id === p.quality) levels.push(premiumLevel);
      levels.push({ id, label: qualityName(id, q.labels), icons: qualityIcons(id, q.labels) });
    }
    if (p && p.on) return { current: 'premium', currentLabel: p.label, icons: premiumLevel.icons, levels };
    return { current: q.current, currentLabel: qualityName(q.current, q.labels), icons: qualityIcons(q.current, q.labels), levels };
  }

  // Pick the format from player data (youtube.info(): projection[], spherical,
  // partialSpherical, title, keywords, video = "WxH"):
  //   not marked spherical by YouTube        -> cinema screen
  //   "MESH" projection                      -> 180° if VR180, else 360° cubemap
  //   equirectangular                        -> 180° if VR180, else 360°
  // VR180 = YouTube's partialSpherical flag (playerConfig.vrConfig; checked on 2 VR180 and
  // 2 360° videos), else the title saying 180, else (old fallback) a nearly square frame.
  // The frame shape alone is unreliable: VR180 streams are often 16:9 below 2160p.
  // isSpatial: whether YouTube itself marks the video as 360/VR.
  function detectFormat(info = youtube.info()) {
    const proj = (info.projection || []).join(' ').toUpperCase();
    const text = `${info.title || ''} ${info.keywords || ''}`.toLowerCase();
    const says180 = /vr\s?180|180\s?(°|deg|degree|vr|3d)|\b180\b/.test(text);
    const isSpatial = !!info.spherical || !!info.partialSpherical || /EQUI|MESH/.test(proj);
    const m = /^(\d+)x(\d+)$/.exec(info.video || '');
    const aspect = m && +m[2] ? +m[1] / +m[2] : null;
    const is180 = !!info.partialSpherical || says180;
    let fmt;
    if (!isSpatial) fmt = 'flat';
    else if (/MESH/.test(proj)) fmt = is180 || (aspect && aspect < 1.6) ? '180mono' : '360eac';
    else fmt = is180 ? '180mono' : '360mono';
    return { fmt, isSpatial };
  }

  // The controls panel's "now playing" from YouTube's data (a pure mapping, so it can be
  // checked without a page). raw: { title, channel, details (youtube-page.js details()),
  // playlist (the session's playlist state, or null), subscribeUi ('busy' | null) }.
  // Returns { info: [{ text, color }] (line 1: "1.2M views · 3 days ago", then the playlist
  // in blue), creator: { name, badge, stats }, actions: [Subscribe, Like, Dislike] (hidden
  // ones keep their place), queue: null | { hasPrev, hasNext, prev, next (cards) } }.
  function nowPlaying(raw) {
    const d = raw.details || {}, pl = raw.playlist;
    const stats = [d.views, d.published].filter(Boolean).join('  ·  ');
    const ui = raw.subscribeUi;
    const sub = ui === 'busy' ? { look: 'busy', label: '…' }
      : d.subscribed ? { look: 'secondary', label: tr('yt.subscribed') } : { look: 'primary', label: tr('yt.subscribe') };
    return {
      info: [{ text: stats, color: 'onSurfaceVariant' },
        ...(pl ? [{ text: `${stats ? '  ·  ' : ''}${tr('yt.playlistPosition', { index: pl.index + 1, count: pl.count })}${pl.title ? `  ·  ${pl.title}` : ''}`, color: 'secondary' }] : [])],
      creator: { name: raw.channel || '', badge: d.badge || null, stats: d.subscribers ? tr('yt.subscribers', { n: d.subscribers }) : '' },
      actions: [
        { id: 'subscribe', kind: 'pill', width: 170, hidden: !d.canSubscribe, ...sub },
        { id: 'like', kind: 'icon', width: 138, icon: 'thumbUp', on: !!d.liked, count: d.likes || '', hidden: !d.canLike },
        { id: 'dislike', kind: 'icon', width: 104, icon: 'thumbDown', on: !!d.disliked, hidden: !d.canLike },
      ],
      queue: pl ? { hasPrev: pl.index > 0, hasNext: pl.index < pl.count - 1,
        prev: pl.prev ? ns.ytVr.card(pl.prev) : null, next: pl.next ? ns.ytVr.card(pl.next) : null } : null,
    };
  }

  // One VR session's side of YouTube (see the top of the file).
  function session() {
    // Ads: Skip ad in VR needs the optional Skip Helper extension; checked at the start and
    // at every ad (it may get installed meanwhile).
    const adNow = cached(() => youtube.ad(), 200, null);
    let skipHelper = false, adSeen = false;
    const checkSkipHelper = () => youtube.skipHelperInstalled().then(v => { skipHelper = v; }, () => {});
    checkSkipHelper();
    function ad() {
      if (!watching()) return null;                          // (no video playing: no ad either)
      const a = adNow();
      if (a && !adSeen) checkSkipHelper();
      adSeen = !!a;
      return a && { ...a, canSkipInVR: skipHelper };
    }

    // Settings: the player's Loop and Autoplay switches, and the audio tracks (re-read once a second).
    const audioTracks = cached(() => youtube.audioTracks(), 1000, []);
    // Chapter marks for the seek bar (re-read every 2 s; they change with the video).
    const chapters = cached(() => ns.youtubeContent.chapters(), 2000, []);
    // "Most replayed" for the seek bar's graph (re-read every second: it arrives a moment
    // after a video opens).
    const heatmap = cached(() => ns.youtubeContent.mostReplayed(), 1000, []);
    // For the Description panel (re-read every 2 s): { id (video), header ("6,254,731
    // views · Oct 8, 2026"), text and links (the description without its chapter list),
    // hasTranscript, commentsOn, commentCount ("7.4K") }.
    const description = cached(() => {
      const m = ns.youtubeContent.metadata(), d = ns.youtubeContent.descriptionWithoutChapters();
      const date = Date.parse(m.publishDate || m.uploadDate);
      const header = [m.views ? `${m.views.toLocaleString('en-US')} views` : '',
        isFinite(date) ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''].filter(Boolean).join(' · ');
      const ci = ns.youtubeContent.commentsInfo();
      return { id: m.id, header, text: d.text, links: d.links, hasTranscript: ns.youtubeContent.hasTranscript(),
        commentsOn: ci.on, commentCount: ci.count };
    }, 2000, null);

    // The playlist being played, if any: { index, count, title, id, currentId, items,
    // prev, next, offset, windowLength } (re-read twice a second). For a long playlist the
    // player (and the page's sidebar) hold only a WINDOW of ~100-200 videos around the
    // playing one, and the player's index counts from the window's start; `offset` is the
    // window's position in the whole playlist, so index, count and every item's plIndex
    // are positions in the WHOLE playlist. Cards, by position: inside the window, the
    // sidebar's card (title, channel, length) with the playlist page's details (views,
    // age, badge) filled in; outside it, the playlist page's card
    // (youtubeContent.playlistVideos, loaded once per playlist in the background, in
    // order, at most 50 pages of 100); not loaded yet, a blank card (no id, not playable).
    // plDetails: { id, order: [items in playlist order], byId: Map }. plMemo keeps the
    // last known offset / length / name while the page's data lags behind the player.
    let plDetails = null, plMemo = null;
    function loadPlaylistDetails(id) {
      if (!id || (plDetails && plDetails.id === id)) return;
      const d = plDetails = { id, order: [], byId: new Map() };
      (async () => {
        const p = ns.youtubeContent.playlistVideos(id);
        for (let i = 0; i < 50 && !p.done && plDetails === d; i++) {
          for (const it of await p.next()) { d.order.push(it); if (!d.byId.has(it.id)) d.byId.set(it.id, it); }
        }
      })().catch(err => console.warn('[streamxr] playlist details unavailable:', err && err.message || err));
    }
    const BLANK_CARD = { type: 'video', id: '', title: '', channel: '', views: '', age: '', duration: '', kind: '2D', thumb: '' };
    const playlist = cached(() => {
      const pos = youtube.playlistPosition();
      if (!pos) return null;
      const pl = ns.youtubeContent.playlist();
      const listId = pl ? pl.id : plMemo && plMemo.id;
      if (pl && !pl.infinite) loadPlaylistDetails(pl.id);
      const d = plDetails && plDetails.id === listId ? plDetails : null;
      // Where the player's window starts in the whole playlist: from the page's data when it
      // describes the same window (same first video), else by finding the playing video in
      // the playlist page's order, else the last known offset for this window.
      let offset = null;
      if (pl && pl.localIndex != null && pl.items.length && pl.items[0].id === pos.ids[0]) offset = pl.index - pl.localIndex;
      if (offset == null && d) { const at = d.order.findIndex(it => it.id === pos.ids[pos.index]); if (at >= 0) offset = at - pos.index; }
      if (offset == null && plMemo && plMemo.id === listId && plMemo.firstId === pos.ids[0]) offset = plMemo.offset;
      if (offset == null) offset = 0;
      const total = (pl && pl.total) || (plMemo && plMemo.id === listId ? plMemo.total : 0);
      plMemo = { id: listId, firstId: pos.ids[0], offset, total, title: pl ? pl.title : (plMemo && plMemo.title) || '' };

      const side = new Map((pl ? pl.items : []).map(i => [i.id, i]));
      // The best card for a video id: the sidebar's with the playlist page's details filled
      // in, else the playlist page's, else a bare card (thumbnail only).
      const card = id => {
        if (!id) return null;
        const it = side.get(id), more = d && d.byId.get(id);
        if (it && more) return { ...it, views: it.views || more.views, age: it.age || more.age, badge: it.badge || more.badge,
          channelId: it.channelId || more.channelId, duration: it.duration || more.duration };
        return it || more || { ...BLANK_CARD, id, thumb: ns.youtubeData.thumbOf(id) };
      };
      // The video id at a position in the whole playlist ('' if not known yet).
      const idAt = i => (i >= offset && i < offset + pos.ids.length ? pos.ids[i - offset] : (d && d.order[i] && d.order[i].id) || '');
      const index = offset + pos.index;
      const count = Math.max(total, offset + pos.ids.length, d ? d.order.length : 0);
      // Every position in playlist order, with that position (plIndex) for playing it.
      const items = Array.from({ length: count }, (_, i) => ({ ...(card(idAt(i)) || BLANK_CARD), plIndex: i }));
      return { index, count, title: plMemo.title, id: listId || '', currentId: pos.ids[pos.index], items,
        offset, windowLength: pos.ids.length,
        prev: card(idAt(index - 1)), next: card(idAt(index + 1)) };
    }, 500, null);
    // Play the video at a position in the whole playlist: inside the player's window with the
    // player itself (stays in the list), else by opening it at that position.
    function playlistAt(i) {
      const st = playlist();
      if (!st) return;
      if (i >= st.offset && i < st.offset + st.windowLength) youtube.playAt(i - st.offset);
      else if (st.items[i] && st.items[i].id) page.openVideo(st.items[i].id, st.id, i);
    }

    // A live stream, if one is playing: youtube.live() (null otherwise; re-read 4 times a
    // second). The seek bar then covers the rewindable part (time 0 = its start, duration =
    // its length) and the time shows the LIVE label (`liveLabel`).
    const liveNow = cached(() => { const l = youtube.live(); return l.isLive ? l : null; }, 250, null);
    // The video's chat (youtube-chat.js info(): { replay, views }; re-read every second), or
    // null: a live stream's live chat, or a finished stream's chat replay (state(): liveChat).
    const liveChat = cached(() => ns.youtubeChat.info(), 1000, null);
    const chatFor = l => { const c = liveChat(); return c && (c.replay ? !l : !!l) ? c : null; };
    const LIVE_SLACK = 12;          // seconds behind the live moment that still count as live
    // How far behind live: the larger of (a) the gap to the rewindable end and (b) the
    // broadcast delay (now - ingestion) beyond its smallest value seen for this video (the
    // stream's normal delay). (a) misses pauses (the end isn't refreshed while paused, and
    // isAtLiveHead can stay true); (b) catches them. Live = close on both counts.
    let liveDelay = { id: '', min: Infinity };
    const liveLabel = l => {
      const endBehind = Math.max(0, l.end - l.current);
      let delayBehind = 0;
      if (l.ingestion) {
        const id = ns.youtubeData.currentVideoId(), delay = Date.now() / 1000 - l.ingestion;
        if (liveDelay.id !== id) liveDelay = { id, min: Infinity };
        liveDelay.min = Math.min(liveDelay.min, delay);
        delayBehind = Math.max(0, delay - liveDelay.min);
      }
      const atHead = (l.atLiveHead || endBehind < LIVE_SLACK) && delayBehind < LIVE_SLACK;
      return { atHead, behind: Math.max(endBehind, delayBehind), dvr: l.dvr };
    };

    // The controls' Subscribe button, through the subscriptions API: a click subscribes;
    // when subscribed, a dialog asks first ("Unsubscribe from <channel>?", the shell's
    // confirm()). "…" while YouTube answers. A confirmed change is remembered (the page's
    // own button doesn't update) and passed on to the panels.
    let subBusy = false;
    const subscribeUi = () => (subBusy ? 'busy' : null);
    function setSubscribed(id, on) {
      return ns.youtubeSubscriptions
        ? ns.youtubeSubscriptions[on ? 'subscribe' : 'unsubscribe'](id).then(res => {
          if (res && res.ok) page.noteSubscription(id, on);
          return res;
        })
        : Promise.resolve({ ok: false, error: 'subscriptions module missing' });
    }
    function clickSubscribe(panel, shell) {
      const id = ns.youtubeChannel.currentChannelId(), d = page.details() || {};
      const subscribed = !!d.subscribed;
      if (!id || subBusy) return;
      const change = () => {
        subBusy = true;
        Promise.resolve(setSubscribed(id, !subscribed)).then(res => {
          if (res && res.ok) { const ch = panel('channel'); if (ch && ch.noteSubscribed) ch.noteSubscribed(id, !subscribed); }
          else console.warn('[streamxr] subscription change failed:', res && res.error);
        }, err => console.warn('[streamxr] subscription change failed:', err)).finally(() => { subBusy = false; });
      };
      if (!subscribed) { change(); return; }
      Promise.resolve(shell && shell.confirm
        ? shell.confirm({ title: tr('yt.unsubscribeFrom', { name: youtube.channel() || '' }), confirm: tr('yt.unsubscribe'), danger: true })
        : true).then(yes => { if (yes) change(); });
    }

    // The controls panel's controls the shell passes on: the title opens the Description
    // tab, the channel name the Channel panel; Subscribe, Like and Dislike.
    function onControl(id, panel, shell) {
      if (id === 'title') panel('desc').showDescription();
      else if (id === 'creator') panel('channel').showCurrent();
      else if (id === 'action:subscribe') clickSubscribe(panel, shell);
      else if (id === 'action:like') page.like();
      else if (id === 'action:dislike') page.dislike();
      else return false;
      return true;
    }

    const actions = {
      // The shell's (vr-panel.js): playback, the seek bar, menus.
      toggle: () => { if (watching()) youtube.toggle(); },      // (no video playing: nothing to play)
      seekBy: s => { if (watching()) youtube.seek(s); },
      seekTo: t => { const l = liveNow(); youtube.seekTo(l ? l.start + t : t); },   // live: t from the rewindable start
      goLive: youtube.goLive,
      setQuality: youtube.setQuality,
      setSpeed: youtube.setSpeed,
      setVolume: youtube.setVolume,
      setMuted: youtube.setMuted,
      storyboard: time => (liveNow() ? null : youtube.storyboard(time)),          // live streams: no previews
      skipAd: () => youtube.skipAd().then(res => {
        if (!res.ok) console.warn('[streamxr] skipping the ad failed:', res.error || res);
        adNow.reset();
      }),
      previousVideo: youtube.previousVideo,
      nextVideo: youtube.nextVideo,
      // YouTube's own panels (sites/youtube/page/provider/*.js).
      openVideo: (id, playlistId) => { if (!page.openVideo(id, playlistId)) console.warn('[streamxr] couldn’t open that video'); },
      // Channel panel: any channel's header, tab lists and About page (youtube-channel.js), and
      // Subscribe / Unsubscribe confirmed by YouTube (youtube-subscriptions.js).
      channelHeader: id => ns.youtubeChannel.channel(id),
      channelList: (id, tab, sort) => ns.youtubeChannel[tab](id, sort),
      channelFeatured: id => ns.youtubeChannel.home(id).then(h => h.featured),
      channelAbout: id => ns.youtubeChannel.about(id),
      // Posts: a post's comments (replies and rating through the comment actions below),
      // liking it, voting in its poll.
      postComments: (post, sort) => ns.youtubeChannel.postComments(post, sort),
      ratePost: (post, what) => ns.youtubeChannel.ratePost(post, what),
      votePoll: (post, index, on) => ns.youtubeChannel.votePoll(post, index, on),
      setSubscribed,
      // A channel's notification bell: one of its notifications.options (youtube-subscriptions.js
      // setNotifications -> { ok, confirmed, state, error }), and which choice a state means.
      setBell: option => ns.youtubeSubscriptions.setNotifications(option),
      bellMatches: (label, state) => ns.youtubeSubscriptions.bellMatches(label, state),
      // Description panel: the transcript (opens and reads YouTube's transcript panel), the
      // comments ('top' | 'newest') and a thread's replies (pagers), rating a comment.
      transcript: () => ns.youtubeContent.transcript(),
      comments: sort => ns.youtubeContent.comments(sort),
      replies: comment => ns.youtubeContent.replies(comment),
      rateComment: (comment, what) => ns.youtubeContent.rateComment(comment, what),
      // Explore and You panels: the Home feed (with a topic chip), News, the Subscriptions
      // feed, the signed-in left-menu feeds ('history', 'playlists'), your own lists ('WL' =
      // Watch later, 'LL' = Liked videos) and your channel's id.
      browseHome: chip => ns.youtubeHome.home(chip),
      search: query => ns.youtubeContent.search(query),                 // the Search panel
      suggest: text => ns.youtubeHome.suggestions(text),                // and its suggestions
      browseSubscriptions: () => ns.youtubeSubscriptions.feed(),
      browseChannels: sort => ns.youtubeSubscriptions.channels(sort), // You: Channels (sort: one of p.sorts' texts)
      browseFeed: name => ns.youtubeHome.feedVideos(name),
      browsePlaylist: id => ns.youtubeContent.playlistVideos(id),
      myChannelId: () => ns.youtubeHome.myChannelId(),                   // You: Your channel
      signedIn: () => ns.youtubeData.signedIn(),
      // Up Next and Settings.
      loadMoreRecommendations: page.loadMoreRecommendations,
      playlistAt,
      setLoop: youtube.setLoop,
      setAutoplay: youtube.setAutoplay,
      setAudioTrack: id => { youtube.setAudioTrack(id); audioTracks.reset(); },
      // The controls panel's Captions and Save buttons (extras.js).
      extra: (id, itemId) => extras.extra(id, itemId),
    };

    // Captions and Save (extras.js): the buttons, and the caption lines the shell draws.
    const extras = ns.ytVr.extras.create();

    function state() {
      const l = liveNow(), pl = playlist(), details = page.details(), title = youtube.title(), channel = youtube.channel();
      const q = youtube.quality() || { current: null, levels: [] };
      const st = {
        title, time: l ? l.current - l.start : youtube.currentTime(), duration: l ? l.end - l.start : youtube.duration(),
        live: l && liveLabel(l), paused: youtube.isPaused(),
        buffered: l || ad() ? null : youtube.bufferedEnd(),           // the seek bar's loaded part (not on live streams or ads)
        quality: qualityState(q),
        speed: youtube.speed(), speeds: youtube.speeds(), volume: youtube.volume(), chapters: chapters(), heatmap: l ? [] : heatmap(), ad: ad(),
        nowPlaying: nowPlaying({ title, channel, details, playlist: pl, subscribeUi: subscribeUi() }),
        // For YouTube's panels:
        channelId: ns.youtubeChannel.currentChannelId(), details, playlist: pl, description: description(),
        recommendations: page.recommendations(),
        playback: { loop: youtube.loop(), autoplay: !!youtube.autoplay() }, audio: audioTracks(),
        extras: extras.state({ ad: ad(), paused: youtube.isPaused(), live: !!l }),
        liveChat: chatFor(l),                                        // a live stream's chat, or a finished one's chat replay (live-chat.js)
      };
      // No video playing (VR started from the Home page...): what the panels show instead of
      // the last video's leftovers (YouTube may keep its old player around): a line saying how
      // to pick one, an empty seek bar, nothing in Up Next or Description.
      if (watching()) return st;
      return { ...st, title: tr('yt.noVideo'), time: 0, duration: 0, paused: true, live: null, buffered: null, chapters: [], heatmap: [], ad: null, liveChat: null,
        nowPlaying: { info: [{ text: tr('yt.noVideoHint'), color: 'onSurfaceVariant' }], creator: null, actions: [], queue: null },
        channelId: null, details: {}, playlist: null, description: null, recommendations: [], extras: extras.state({ ad: null, noVideo: true }) };
    }

    return { actions, state, ad, captions: () => (ad() || !watching() ? [] : extras.lines()), site: { name: 'YouTube', panels: ns.ytVr.panels, onControl } };
  }

  ns.ytVr = ns.ytVr || {};
  // YouTube's brand colours (its brand page): YouTube Red, Almost Black (vr-panel/tokens.js),
  // its card flags' own colours (cards.js): VR180 purple, Mix orange, Playlist green, and its
  // live chat's (live-chat.js): the owner's yellow name chip, moderators' blue, members' green.
  // seed: its Material 3 palette is made from YouTube Red when VR starts (tokens.js
  // scheme()), in the Fidelity variant, with the pink and the deep red swapped (buttons
  // pink, accents red); the accents themselves use the exact YouTube Red (`accent`, the
  // brand role). Decided in docs/Materials-Redesign.md, "The colours".
  const M3_THEME = { accent: '#FF0033', accentPressed: '#ff4d70', dark: '#212121', onAccent: '#FFFFFF',
    custom: { vr180: '#b388ff', mix: '#ff8a00', playlist: '#2ecc71',
      chatOwner: '#ffd600', onChatOwner: '#0f0f0f', chatModerator: '#5e84f1', chatMember: '#2ba640', onChatMember: '#ffffff' },
    seed: '#FF0033', scheme: 'fidelity',
    swap: [['primary', 'secondaryContainer'], ['onPrimary', 'onSecondaryContainer']] };
  // The "YouTube" theme's roles, set over that palette (tokens.js theme.palette): Almost Black
  // (#282828) panels and the greys around it; white text (#f1f1f1) and grey secondary text;
  // white buttons (secondaryContainer) with Almost Black text; the selected thing (primary:
  // an open panel's toolbar item, a chosen menu row's tick ...) in YouTube Red; links and
  // the current chapter in YouTube's blue.
  const YOUTUBE_PALETTE = {
    surface: '#212121', surfaceDim: '#1a1a1a', surfaceBright: '#3f3f3f',
    surfaceContainerLowest: '#181818', surfaceContainerLow: '#1f1f1f', surfaceContainer: '#282828',
    surfaceContainerHigh: '#323232', surfaceContainerHighest: '#3d3d3d', surfaceVariant: '#3d3d3d',
    onSurface: '#f1f1f1', onSurfaceVariant: '#aaaaaa', outline: '#717171', outlineVariant: '#3d3d3d',
    secondaryContainer: '#f1f1f1', onSecondaryContainer: '#282828', secondary: '#f1f1f1', onSecondary: '#282828',
    primary: '#ff0033', onPrimary: '#ffffff', primaryContainer: '#3d3d3d', onPrimaryContainer: '#f1f1f1',
    tertiary: '#3ea6ff', onTertiary: '#0f0f0f', tertiaryContainer: '#263850', onTertiaryContainer: '#d3e3fd',
    inverseSurface: '#f1f1f1', inverseOnSurface: '#282828', surfaceTint: '#f1f1f1',
  };

  ns.ytVr.provider = {
    name: 'YouTube',
    // Its Material 3 theme (M3_THEME above; the "YouTube" theme below is built on it).
    theme: M3_THEME,
    // The colour themes the user can choose (Settings → Appearance → Colours; the first is
    // the default): "YouTube" (the default since 0.68.1): the same YouTube Red
    // accents, white buttons with Almost Black text, Almost Black panels, white text, blue
    // links (YouTube's own dark look); and "Material 3" (the theme above).
    themes: [
      { id: 'youtube', label: () => tr('yt.theme.youtube'), theme: { ...M3_THEME, palette: YOUTUBE_PALETTE } },
      { id: 'material', label: () => tr('yt.theme.material'), theme: M3_THEME },
    ],
    // The video: only on a watch page (elsewhere, e.g. the Home page, VR shows the logo until
    // you open a video in it; YouTube may keep an old player around there).
    video: () => (watching() ? youtube.video() : null),
    logo: () => page.logo(),                    // the placeholder's logo while no video plays
    info: () => youtube.info(),
    detectFormat,
    isPaused: () => youtube.isPaused(),
    toggle: () => { if (watching()) youtube.toggle(); },
    seek: seconds => { if (watching()) youtube.seek(seconds); },
    buffering: () => youtube.playerState() === 3,
    onNavigate(fn) {                            // YouTube opens videos inside the page
      document.addEventListener('yt-navigate-finish', fn);
      return () => document.removeEventListener('yt-navigate-finish', fn);
    },
    session,
    nowPlaying,                                 // (exposed for checking the mapping)
  };

  // YouTube in the site registry (core/page/sites.js): StreamXR picks this provider on
  // youtube.com.
  ns.sites.register({ id: 'youtube', name: 'YouTube', hosts: ['www.youtube.com'], provider: ns.ytVr.provider });
})(globalThis.__streamxr = globalThis.__streamxr || {});
