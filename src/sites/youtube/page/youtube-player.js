// YouTube's player: the player element and its API - playback, quality, speed, volume,
// captions, audio tracks, loop/autoplay, playlist position, live, storyboards.
// (The watch page around it is in youtube-page.js and youtube-content.js.)
(function (ns) {
  'use strict';

  // YouTube's player element: it has the control methods (playVideo, seekTo, ...) used below.
  const player = () => document.getElementById('movie_player');

  // The player's main <video> element (also plays the ads). YouTube may replace it between
  // videos, so callers look it up again rather than holding on to it.
  function video() {
    const p = player();
    return p && (p.querySelector('video.html5-main-video') || p.querySelector('video'));
  }

  // Play/pause through YouTube's API (keeps its UI in sync), falling back to the <video>.
  function toggle() {
    const p = player();
    if (p && p.getPlayerState) { p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo(); return; }
    const v = video(); if (v) v.paused ? v.play() : v.pause();
  }

  // Jump `delta` seconds from now (negative = back), never before the start.
  function seek(delta) {
    const p = player();
    if (p && p.seekTo) { p.seekTo(Math.max(0, p.getCurrentTime() + delta), true); return; }
    const v = video(); if (v) v.currentTime = Math.max(0, v.currentTime + delta);
  }

  // Is the video paused? (Reads the <video>; also true when there is none.)
  const isPaused = () => { const v = video(); return !v || v.paused; };

  // Playback position and length in seconds (0 if unknown).
  function currentTime() {
    const p = player();
    if (p && p.getCurrentTime) return p.getCurrentTime() || 0;
    const v = video(); return v ? v.currentTime || 0 : 0;
  }
  function duration() {
    const p = player();
    const d = p && p.getDuration ? p.getDuration() : 0;
    if (d) return d;
    const v = video(); return v && isFinite(v.duration) ? v.duration : 0;
  }

  // Jump to an exact time in seconds (the seek bar uses this).
  function seekTo(seconds) {
    const t = Math.max(0, seconds);
    const p = player();
    if (p && p.seekTo) { p.seekTo(t, true); return; }
    const v = video(); if (v) v.currentTime = t;
  }

  // Video quality. YouTube ids: 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large' (480p),
  // 'medium' (360p), 'small', 'tiny', 'auto'. labels: YouTube's own name for each id where
  // the player gives one (getAvailableQualityData's qualityLabel, e.g. "1080p60" on a 60 fps
  // video; Premium's extra entry is kept apart as `premium`).
  // premium: YouTube Premium's enhanced-bitrate quality, or null when the video has none:
  //   { quality (its id, 'hd1080'), label ("1080p Premium"), formatId, playable (false: you
  //   don't have Premium), on (playing now) }. Seen signed in with Premium (2026-10-17): an
  //   entry with paygatedQualityDetails and its own formatId ("721") beside the plain
  //   1080p's ("399"); getPlaybackQualityLabel() names the one playing.
  // formats: the plain entries' formatIds by id, where the player gives one.
  function quality() {
    try {
      const p = player();
      const levels = (p && p.getAvailableQualityLevels && p.getAvailableQualityLevels()) || [];
      const current = (p && p.getPlaybackQuality && p.getPlaybackQuality()) || null;
      const labels = {}, formats = {};
      let premium = null;
      const data = (p && p.getAvailableQualityData && p.getAvailableQualityData()) || [];
      for (const d of data) {
        if (!d || !d.quality || !d.qualityLabel) continue;
        if (d.paygatedQualityDetails || /premium/i.test(d.qualityLabel)) {
          if (!premium) premium = { quality: d.quality, label: d.qualityLabel, formatId: d.formatId || null, playable: d.isPlayable !== false, on: false };
          continue;
        }
        if (!labels[d.quality]) { labels[d.quality] = d.qualityLabel; if (d.formatId) formats[d.quality] = d.formatId; }
      }
      if (premium) {
        const now = (p.getPlaybackQualityLabel && p.getPlaybackQualityLabel()) || '';
        premium.on = current === premium.quality && now === premium.label;
      }
      return { current, levels, labels, formats, premium };
    } catch (_) { return { current: null, levels: [], labels: {}, formats: {}, premium: null }; }
  }

  // Choose a quality (one of the ids above, or 'premium': Premium's enhanced-bitrate one).
  // Where the player gives a format id it's passed too (it tells the plain 1080p and 1080p
  // Premium apart). YouTube has changed which method works over time, so both are tried;
  // whichever the player lacks is simply skipped.
  function setQuality(level) {
    const p = player();
    if (!p) return;
    const q = quality();
    let id = level, formatId = q.formats[level];
    if (level === 'premium') {
      if (!q.premium || !q.premium.playable) return;
      id = q.premium.quality; formatId = q.premium.formatId;
    }
    try { if (p.setPlaybackQualityRange) p.setPlaybackQualityRange(id, id, formatId || undefined); } catch (_) { /* older player */ }
    if (level !== 'premium') try { if (p.setPlaybackQuality) p.setPlaybackQuality(id); } catch (_) { /* newer player */ }
  }

  // YouTube Premium's Jump ahead: to the point most viewers skip to. YouTube offers it as a pill
  // in the player's "timely actions" overlay at the moments it applies (seen signed in with
  // Premium, 2026-10-17: ytw-timely-action-view-model > button, its text "Jump ahead"), and a
  // script's click on that pill jumps (17 s -> 124 s). The pill is found by its text, so this
  // expects YouTube in English, like the other readers that match YouTube's words.
  //   jumpAheadOffered() -> is the pill on screen now?   jumpAhead() clicks it (if it is).
  function jumpAheadButton() {
    const p = player();
    if (!p) return null;
    for (const b of p.querySelectorAll('.ytp-timely-actions-overlay button, ytw-timely-action-view-model button')) {
      if (b.getClientRects().length && /jump ahead/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.textContent || ''))) return b;
    }
    return null;
  }
  const jumpAheadOffered = () => !!jumpAheadButton();
  function jumpAhead() {
    const b = jumpAheadButton();
    if (b) b.click();
  }

  // Does the signed-in account have YouTube Premium? The page's top-bar logo is YouTube
  // Premium's (seen signed in with Premium, 2026-10-17: topbarLogoRenderer iconType
  // 'YOUTUBE_PREMIUM_LOGO'; 'YOUTUBE_LOGO' otherwise).
  function hasPremium() {
    try {
      const logo = window.ytInitialData && window.ytInitialData.topbar && window.ytInitialData.topbar.desktopTopbarRenderer
        && window.ytInitialData.topbar.desktopTopbarRenderer.logo;
      return JSON.stringify(logo || {}).includes('YOUTUBE_PREMIUM_LOGO');
    } catch (_) { return false; }
  }

  // Name of the channel that posted the video.
  function channel() {
    try {
      const p = player();
      const d = p && p.getVideoData && p.getVideoData();
      if (d && d.author) return d.author;
      const r = (p && p.getPlayerResponse && p.getPlayerResponse()) || {};
      return (r.videoDetails && r.videoDetails.author) || '';
    } catch (_) { return ''; }
  }

  // The video's title (from the player, else the browser tab's title).
  function title() {
    try {
      const p = player();
      const d = p && p.getVideoData && p.getVideoData();
      return (d && d.title) || document.title.replace(/ - YouTube$/, '');
    } catch (_) { return ''; }
  }

  // What YouTube says about the current video, for format detection and the Details panel.
  function info() {
    try {
      const p = player();
      const r = (p && p.getPlayerResponse && p.getPlayerResponse()) || window.ytInitialPlayerResponse || {};
      const sd = r.streamingData || {};
      const fmts = [...(sd.adaptiveFormats || []), ...(sd.formats || [])];
      const uniq = key => [...new Set(fmts.map(f => f[key]).filter(Boolean))];
      const sph = (p && p.getSphericalProperties && p.getSphericalProperties()) || {};
      const vd = r.videoDetails || {};
      // During an ad the <video> holds the ad's frames, so its size says nothing about the
      // video (it made VR180 look like a 360° cubemap).
      const v = p && p.classList.contains('ad-showing') ? null : video();
      return {
        ok: true,
        title: vd.title || '',
        keywords: (vd.keywords || []).join(' '),
        projection: uniq('projectionType'),
        partialSpherical: !!(r.playerConfig && r.playerConfig.vrConfig && r.playerConfig.vrConfig.partialSpherical),   // VR180
        stereo: uniq('stereoLayout'),
        spherical: Object.keys(sph).length > 0,
        video: v ? `${v.videoWidth}x${v.videoHeight}` : null,
      };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  // Call a player method if it exists; `fallback` if the player or method is missing/throws.
  function call(method, args = [], fallback = undefined) {
    const p = player();
    if (!p || typeof p[method] !== 'function') return fallback;
    try { const v = p[method](...args); return v === undefined ? fallback : v; } catch (_) { return fallback; }
  }

  // ---------------------------------------------------------------- speed and volume
  const speeds = () => call('getAvailablePlaybackRates', [], [1]);      // e.g. [0.25 ... 2]
  const speed = () => call('getPlaybackRate', [], 1);
  const setSpeed = rate => { call('setPlaybackRate', [rate]); };

  const volume = () => ({ level: call('getVolume', [], 100), muted: !!call('isMuted', [], false) });  // level 0-100
  const setVolume = level => { call('setVolume', [Math.max(0, Math.min(100, Math.round(level)))]); };
  const setMuted = on => { call(on ? 'mute' : 'unMute'); };

  // ---------------------------------------------------------------- captions
  // Tracks: [{ languageCode, name, auto (auto-generated), vssId }]. current: same shape or null.
  function captions() {
    const r = ns.youtubeData.playerResponse();
    const listed = ns.youtubeData.dig(r, 'captions', 'playerCaptionsTracklistRenderer', 'captionTracks') || [];
    const tracks = listed.map(t => ({ languageCode: t.languageCode, name: ns.youtubeData.strOf(t.name), auto: t.kind === 'asr', vssId: t.vssId }));
    const cur = call('getOption', ['captions', 'track'], null);
    const on = !!call('isSubtitlesOn', [], false) && !!(cur && cur.languageCode);
    return { on, tracks, current: on ? { languageCode: cur.languageCode, name: cur.displayName || cur.languageName || '', auto: cur.kind === 'asr', vssId: cur.vss_id } : null };
  }
  // Turn captions on in a language (a track from captions().tracks), or off with null.
  function setCaptions(track) {
    if (!track) { call('setOption', ['captions', 'track', {}]); return; }
    call('loadModule', ['captions']);
    call('setOption', ['captions', 'track', { languageCode: track.languageCode, ...(track.auto ? { kind: 'asr' } : {}) }]);
  }

  // The caption lines YouTube shows on the page right now ([text], top to bottom; [] with
  // captions off or between lines): its caption window's lines, read from the player's DOM
  // (YouTube draws captions there, not into the video picture).
  function captionLines() {
    const p = player();
    if (!p) return [];
    return [...p.querySelectorAll('.ytp-caption-window-container .caption-visual-line')]
      .map(l => (l.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  // ---------------------------------------------------------------- audio tracks
  // Multi-language videos (dubs). [{ id, name, isDefault, isAutoDubbed, current }].
  // Tracks of a dubbed video: [{ id, name, isDefault, isAutoDubbed, isOriginal, current }]
  // ([] or one track for most videos). Checked on a Russian video with an English auto-dub:
  // "English (US)" (isAutoDubbed, the default) and "Russian original". `id` is the track's
  // language id ("ru.4"); the player's own track id also names the stream format, which can
  // change with the quality.
  const langInfo = t => { try { return (t.getLanguageInfo && t.getLanguageInfo()) || {}; } catch (_) { return {}; } };
  function audioTracks() {
    const list = call('getAvailableAudioTracks', [], []) || [];
    const cur = call('getAudioTrack', [], null);
    return list.map(t => {
      const li = langInfo(t), name = li.name || String(t);
      return { id: li.id || t.id, name, isDefault: !!li.isDefault, isAutoDubbed: !!li.isAutoDubbed,
        isOriginal: /\boriginal\b/i.test(name), current: !!cur && cur.id === t.id };
    });
  }
  // Switch to the track with that id (from audioTracks()); false if it isn't there.
  function setAudioTrack(id) {
    const t = (call('getAvailableAudioTracks', [], []) || []).find(x => langInfo(x).id === id || x.id === id);
    if (t) call('setAudioTrack', [t]);
    return !!t;
  }

  // ---------------------------------------------------------------- loop, autoplay, playlist
  const loop = () => !!call('getLoopVideo', [], false);
  const setLoop = on => { call('setLoopVideo', [!!on]); };

  // Autoplay (play the next video when this one ends): the player's own toggle button.
  // The info card teaser the player shows now (its text, e.g. a linked video's title), or ''.
  // YouTube's card data holds no times for the real cards, so the moment is read from its own
  // player: the `.ytp-cards-teaser` element while it's laid out and visible (UNVERIFIED).
  // YouTube's autoplay countdown at a video's end ("Up next in 5"), while its player shows it:
  // { videoId, title, channel, seconds (null if it shows none) }, or null. Read from the
  // player's own overlay (.ytp-autonav-endscreen-countdown-overlay; UNVERIFIED).
  const visibleEl = sel => [...document.querySelectorAll(sel)]
    .find(e => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden') || null;
  function autoplayCountdown() {
    const ov = visibleEl('#movie_player .ytp-autonav-endscreen-countdown-overlay');
    if (!ov) return null;
    const text = sel => { const e = ov.querySelector(sel); return e ? e.textContent.trim() : ''; };
    const link = ov.querySelector('a[href*="v="]');
    const videoId = ns.youtubeData.videoIdOf(link && link.getAttribute('href'));
    if (!videoId) return null;
    const n = /\d+/.exec(text('.ytp-autonav-endscreen-countdown') || text('.ytp-autonav-endscreen-upnext-header'));
    return { videoId, title: text('.ytp-autonav-endscreen-upnext-title'), channel: text('.ytp-autonav-endscreen-upnext-author'), seconds: n ? +n[0] : null };
  }
  // Cancel it (its own Cancel button); true if there was one to click.
  function cancelAutoplay() {
    const b = visibleEl('#movie_player .ytp-autonav-endscreen-upnext-cancel-button');
    if (b) b.click();
    return !!b;
  }

  function cardTeaser() {
    const el = [...document.querySelectorAll('#movie_player .ytp-cards-teaser')]
      .find(e => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0);
    if (!el) return '';
    const t = el.querySelector('.ytp-cards-teaser-text') || el;
    return (t.textContent || '').trim();
  }

  const autoplayButton = () => document.querySelector('.ytp-autonav-toggle-button');
  const autoplay = () => { const b = autoplayButton(); return b ? b.getAttribute('aria-checked') === 'true' : null; };
  function setAutoplay(on) {
    const b = autoplayButton();
    if (!b) { call('setAutonav', [!!on]); return; }
    if ((b.getAttribute('aria-checked') === 'true') !== !!on) b.click();
  }

  // Inside a playlist: { ids, index } (null when not in a playlist). Titles: youtubeContent.playlist().
  function playlistPosition() {
    const ids = call('getPlaylist', [], null);
    return ids && ids.length ? { ids, index: call('getPlaylistIndex', [], 0) } : null;
  }
  const nextVideo = () => { call('nextVideo'); };
  const previousVideo = () => { call('previousVideo'); };
  const playAt = index => { call('playVideoAt', [index]); };

  // ---------------------------------------------------------------- live
  // { isLive, atLiveHead, dvr, start, end, current } (seconds on the player's clock). A live
  // stream's duration is meaningless (checked: ~53 days on a 12-hour-rewindable stream);
  // what can be watched is start..end (the rewindable part; end = the live moment), and
  // end - current is how far behind live you are. dvr: rewinding is allowed at all.
  // BUT while paused the player stops refreshing `end` (and isAtLiveHead can stay true), so
  // after a pause the gap looks ~0. `ingestion` (unix seconds, or null) is when the frame
  // being shown was broadcast: it stops moving while paused, so (now - ingestion) keeps
  // growing; xr-session compares it with its smallest value to measure being behind.
  const live = () => {
    const d = call('getVideoData', [], {}) || {};
    const ps = call('getProgressState', [], null) || {};
    const current = call('getCurrentTime', [], 0) || 0;
    return {
      isLive: !!d.isLive, atLiveHead: !!call('isAtLiveHead', [], false), dvr: !!d.allowLiveDvr,
      start: isFinite(ps.seekableStart) ? ps.seekableStart : current,
      end: isFinite(ps.seekableEnd) ? Math.max(ps.seekableEnd, current) : current, current,
      ingestion: isFinite(ps.ingestionTime) && ps.ingestionTime > 0 ? ps.ingestionTime : null,
    };
  };
  const goLive = () => { call('seekToLiveHead'); };

  // ---------------------------------------------------------------- 360 view
  // YouTube's own 360 camera (yaw/pitch/roll/fov) - only meaningful on spherical videos.
  const sphericalView = () => call('getSphericalProperties', [], {}) || {};
  const setSphericalView = props => { call('setSphericalProperties', [props]); };

  // ---------------------------------------------------------------- storyboards
  // Seek-bar preview for a time: { url, col, row, cols, rows, tileWidth, tileHeight, level,
  // levels } - one tile of a sprite sheet on i.ytimg.com (CORS-safe for WebGL from
  // youtube.com). level: 0 = smallest; omitted = most detailed.
  // Worked out from the player response's storyboard spec, because the player's own
  // getStoryboardFrame() takes a frame index (not a time) and returns bad sizes.
  // Spec: "baseUrl|w#h#count#cols#rows#intervalMs#name#sigh|..." (one part per level;
  // $L = level, $N = name, $M = sheet number; interval 0 = spread over the video).
  let sbSpec = null, sbLevels = [];
  function storyboardLevels() {
    const spec = ns.youtubeData.dig(ns.youtubeData.playerResponse(), 'storyboards', 'playerStoryboardSpecRenderer', 'spec') || '';
    if (spec !== sbSpec) {
      sbSpec = spec;
      const parts = spec.split('|');
      sbLevels = parts.slice(1).map(s => {
        const [w, h, count, cols, rows, interval, name, sigh] = s.split('#');
        return { base: parts[0], w: +w, h: +h, count: +count, cols: +cols, rows: +rows, interval: +interval, name: name || '', sigh: sigh || '' };
      }).filter(l => l.w && l.count && l.cols && l.rows);
    }
    return sbLevels;
  }
  function storyboard(time, level) {
    const levels = storyboardLevels();
    if (!levels.length) return null;
    const L = level == null ? levels.length - 1 : Math.max(0, Math.min(levels.length - 1, level));
    const lv = levels[L];
    const dur = duration();
    let idx = lv.interval > 0 ? Math.floor(time * 1000 / lv.interval) : (dur ? Math.floor(time / dur * lv.count) : 0);
    idx = Math.max(0, Math.min(lv.count - 1, idx));
    const perSheet = lv.cols * lv.rows, sheet = Math.floor(idx / perSheet), k = idx % perSheet;
    const url = lv.base.replace('$L', L).replace('$N', lv.name.replace('$M', sheet)) + (lv.sigh ? `&sigh=${encodeURIComponent(lv.sigh)}` : '');
    return { url, col: k % lv.cols, row: Math.floor(k / lv.cols), cols: lv.cols, rows: lv.rows,
      tileWidth: lv.w, tileHeight: lv.h, level: L, levels: levels.length };
  }

  // ---------------------------------------------------------------- ads
  // While an ad plays, the player has the 'ad-showing' class and the same <video> element
  // plays the ad (so the element's time/duration are the ad's; the player API keeps
  // reporting the main video). Skip button: button.ytp-skip-ad-button ("Skip") inside the
  // overlay's skip-or-preview box. On skippable ads it's in the page from the start but
  // hidden for the first 5 s (no countdown text); unskippable ads have no button.
  // Script clicks on it are ignored (tested: click(), synthetic pointer/mouse/key events,
  // player.onAdUxClicked, even inside a real click's handler); only a real click skips -
  // see skipAd().
  const SKIP_AFTER = 5;
  const AD_SEL = {
    skip: '.ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button',
    pod: '.ytp-ad-pod-index, .ytp-ad-simple-ad-badge',
  };
  const shown = el => {
    if (!el || !el.isConnected || el.offsetParent === null) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0;
  };

  // null when no ad, else { position, duration, remaining (s), pod ('1 of 2' or ''),
  // skippable (the Skip button is up), skipIn (seconds until it is, or null) }.
  function ad() {
    const p = player();
    if (!p || !p.classList.contains('ad-showing')) return null;
    const v = video();
    const duration = v && isFinite(v.duration) ? v.duration : 0, position = v ? v.currentTime || 0 : 0;
    const btn = p.querySelector(AD_SEL.skip);
    const skippable = shown(btn);
    const skipIn = !skippable && btn ? Math.max(1, Math.ceil(SKIP_AFTER - position)) : null;
    const pod = (/\d+\s+of\s+\d+/i.exec((p.querySelector(AD_SEL.pod) || {}).textContent || '') || [''])[0];
    return { position, duration, remaining: Math.max(0, duration - position), pod, skippable, skipIn };
  }

  // Press YouTube's own Skip button (only once YouTube shows it). Needs a real click, which
  // the optional "StreamXR Skip Helper" extension makes (skip-helper/): it finds the
  // button, scrolls it into view, makes anything covering it click-through (e.g. our own
  // "Watch in VR" panel over the player's corner) and clicks. Resolves { ok, error? }.
  function skipAd() {
    const p = player();
    if (!shown(p && p.querySelector(AD_SEL.skip))) return Promise.resolve({ ok: false, error: 'no skip button' });
    const { bridge } = ns;
    return bridge.ask(bridge.EVENTS.SKIP_AD, bridge.EVENTS.SKIP_AD_DONE, null, 6000);
  }

  // Whether the Skip Helper is installed (so VR can offer Skip ad). Resolves a boolean.
  function skipHelperInstalled() {
    const { bridge } = ns;
    return bridge.ask(bridge.EVENTS.HELPER_STATUS, bridge.EVENTS.HELPER_STATUS_REPLY, null, 1500).then(r => !!(r && r.ok));
  }

  // ---------------------------------------------------------------- technical
  const videoData = () => call('getVideoData', [], {}) || {};            // id, title, author, isLive, quality ...
  const statsForNerds = () => call('getStatsForNerds', [], {}) || {};    // codecs, resolution, bandwidth, buffer ...
  const aspectRatio = () => call('getVideoAspectRatio', [], 16 / 9);
  const playerState = () => call('getPlayerState', [], -1);             // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  const loadedFraction = () => call('getVideoLoadedFraction', [], 0);
  // How far the video is loaded (seconds): the end of the <video>'s buffered range that
  // holds the playback position (a range starting just ahead counts too, as right after a
  // seek); the position itself with none (nothing loaded ahead); null with no video. Video
  // time is YouTube's time on regular videos.
  function bufferedEnd() {
    const v = video();
    if (!v || !v.buffered) return null;
    const t = v.currentTime, b = v.buffered;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 0.5 && b.end(i) >= t) return b.end(i);
    return t;
  }

  ns.youtube = {
    player, video, call, toggle, seek, seekTo, isPaused, currentTime, duration, title, channel, quality, setQuality, hasPremium, jumpAhead, jumpAheadOffered, info,
    speeds, speed, setSpeed, volume, setVolume, setMuted,
    captions, setCaptions, captionLines, audioTracks, setAudioTrack,
    loop, setLoop, autoplay, setAutoplay, autoplayCountdown, cancelAutoplay, cardTeaser, playlistPosition, nextVideo, previousVideo, playAt,
    live, goLive, sphericalView, setSphericalView, storyboard, ad, skipAd, skipHelperInstalled,
    videoData, statsForNerds, aspectRatio, playerState, loadedFraction, bufferedEnd,
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
