// YouTube items -> the shell's generic cards (styles/kit.js). An item is what the
// youtube-*.js readers return for a video or playlist: { id, title, channel, badge, views,
// age, duration, kind ('2D' | '180' | '360'), live, watched (0-100), short, type
// ('playlist'), playlistId, videoCount, thumb, thumbFrom (a playlist whose thumbnail is its
// first video's, looked up: youtube-data.js playlistThumb) }. YouTube's labels for its flags
// live here, and
// their colours as colour roles (tokens.js; YouTube's own ones are custom colours in
// provider.js's theme: vr180, mix, playlist).
(function (ns) {
  'use strict';

  // What kind of video it is (top-left flag): 2D, 180° or 360°, all as wide as the widest
  // of the three so they line up.
  const KIND_TEXTS = ['2D', '180°', '360°'];
  const KINDS = {
    '2D':  { text: '2D',   bg: 'surface/0.75', fg: 'onSurface', matchWidth: KIND_TEXTS },
    '180': { text: '180°', bg: 'vr180',     fg: 'surface', matchWidth: KIND_TEXTS },
    '360': { text: '360°', bg: 'tertiary',  fg: 'surface', matchWidth: KIND_TEXTS },
  };
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  const liveFlag = () => ({ text: tr('yt.card.live'), bg: 'primary', fg: 'onSurface', dot: true });   // streaming now

  // A card for `item`. opts.showChannel: false leaves the channel line out (on a channel's
  // own page); opts.current: the item playing now (outlined, "Now playing" as its flag).
  function card(item, opts = {}) {
    // A creator to join (the Memberships page): their round picture, name and monthly price.
    if (item.type === 'channel') return { title: item.title, thumb: item.thumb, fit: 'round', backdrop: item.banner || '', flags: [], lines: [{ text: item.price || '' }] };
    const playlist = item.type === 'playlist', podcast = playlist && !!item.square;   // (a podcast: its square cover)
    const kind = opts.current ? { text: tr('yt.card.nowPlaying'), bg: 'tertiary', fg: 'surface' }
      : playlist && /^RD/.test(item.playlistId || '') ? { text: tr('yt.card.mix'), bg: 'mix', fg: 'surface' }   // mixes' ids start with RD
      : podcast ? { text: tr('yt.card.podcast'), bg: 'playlist', fg: 'surface' }
      : playlist ? { text: tr('yt.card.playlist'), bg: 'playlist', fg: 'surface' }
      : item.short ? { text: tr('yt.card.short'), bg: 'primary', fg: 'onSurface' } : KINDS[item.kind] || KINDS['2D'];
    const stats = [item.views, item.age].filter(Boolean).join(' · ');
    return {
      title: item.title, thumb: item.thumb || (item.thumbFrom ? ns.youtubeData.playlistThumb(item.thumbFrom) : ''), square: !!item.square, current: !!opts.current,
      corner: item.duration || (playlist && item.videoCount ? tr(podcast ? 'yt.card.episodes' : 'yt.card.videos', { n: item.videoCount }) : ''),
      flags: [kind, ...(item.live ? [liveFlag()] : []), ...(item.membersOnly ? [{ text: tr('yt.card.membersOnly'), bg: 'chatMember', fg: 'onChatMember' }] : [])],
      progress: (item.watched || 0) / 100,
      lines: [...(opts.showChannel === false ? [] : [{ text: item.channel || '', badge: item.badge || null }]),
        ...(stats ? [{ text: stats }] : [])],
    };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.card = card;
  ns.ytVr.liveFlag = liveFlag;          // the LIVE flag, for cards made elsewhere (a channel's featured video)
})(globalThis.__streamxr = globalThis.__streamxr || {});
