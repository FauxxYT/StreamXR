// The Description panel's Comments tab, YouTube's side: the comment threads' state (comments
// reached only through `actions`), how YouTube's comments map onto the Info style's
// 'thread' kind, and the rows' footer (a slot of the Info style, styles/info.js):
// 👍 likes and 👎 (buttons when signed in: your like / dislike filled), the creator's ❤
// (their small picture with a red heart).
//
//   const view = ns.ytVr.comments.create(actions);
//   actions: { comments(sort) -> pager of comments ('top' | 'newest'),
//              replies(comment) -> pager of that thread's replies,
//              rateComment(comment, 'like' | 'unlike' | 'dislike' | 'undislike') -> Promise of { ok } }
//   view.show(videoId)      once per frame while the tab shows (a new video starts over)
//   view.loadMore()         load the next page of threads (when you're near the end)
//   view.setSort(sort) -> true if it changed (the list restarts)
//   view.toggleReplies(i), view.moreReplies(i)   thread i's replies: open / fold, next page
//   view.rate(at, 'like' | 'dislike')            at = "<i>" (a thread) or "<i>.<j>" (its reply j);
//                           shown at once (each comment's likeState), undone if YouTube refuses
//   view.content(count)     the Info style's 'thread' content (count: "7.4K" or '')
//   view.state()            { sort, threads: [{ comment, replies: null | { open, items, loading, more } }],
//                             loading, done, error }
//   view.version()          bumps on every change (for redraw keys)
//   ns.ytVr.comments.footer(f)   the Info style's threadFooter slot
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  // The sort pills and the thread's own words, in the interface language.
  const sorts = () => [{ id: 'top', label: tr('yt.comments.top') }, { id: 'newest', label: tr('yt.comments.newest') }];
  const labels = () => ({ hide: tr('yt.comments.hide'), more: tr('yt.comments.more'), empty: tr('yt.comments.empty') });

  function create(actions) {
    let videoId = '', sort = 'top', pager = null, loading = false, error = '';
    let replies = new Map();                  // thread index -> { open, pager, loading }
    const rated = new Map();                  // comment id -> 'liked' | 'disliked' | 'none' (your clicks)
    let gen = 0, ver = 0;                     // gen: ignore answers for a list no longer shown
    const bump = () => { ver++; };

    // A comment as shown: your like / dislike from this session wins over the loaded one.
    const withRating = c => (rated.has(c.id) ? { ...c, likeState: rated.get(c.id) } : c);

    // Like / dislike button on the comment at "<i>" or "<i>.<j>": toggles your rating.
    function rate(at, button) {
      const [i, j] = at.split('.').map(Number);
      const threads = pager ? pager.items : [];
      const r = j >= 0 ? replies.get(i) : null;
      const c = j >= 0 ? (r && r.pager.items[j]) : threads[i];
      if (!c || !c.actions) return;
      const before = withRating(c).likeState;
      const on = button === 'like' ? before !== 'liked' : before !== 'disliked';
      const what = button === 'like' ? (on ? 'like' : 'unlike') : (on ? 'dislike' : 'undislike');
      rated.set(c.id, on ? (button === 'like' ? 'liked' : 'disliked') : 'none'); bump();
      Promise.resolve(actions.rateComment(c, what)).then(res => {
        if (!(res && res.ok)) { rated.set(c.id, before); bump(); console.warn('[streamxr] comment rating failed:', res && res.error); }
      }, err => { rated.set(c.id, before); bump(); console.warn('[streamxr] comment rating failed:', err); });
    }

    // Start the list over (new video or new sort) and load its first page.
    function restart() {
      gen++; error = ''; loading = false; replies = new Map();
      try { pager = actions.comments(sort); } catch (err) { pager = null; error = String(err && err.message || err); }
      bump();
      loadMore();
    }

    function show(id) {
      if (id && id !== videoId) { videoId = id; sort = 'top'; restart(); }
    }

    // Load one more page of threads (one request at a time).
    function loadMore() {
      if (!pager || loading || pager.done) return;
      const p = pager, my = gen;
      loading = true; bump();
      p.next().catch(err => { if (my === gen) error = tr('yt.comments.failed', { error: err && err.message || err }); })
        .finally(() => { if (my === gen) { loading = false; bump(); } });
    }

    // Load a page of thread i's replies.
    function loadReplies(i) {
      const r = replies.get(i);
      if (!r || r.loading || r.pager.done) return;
      const my = gen;
      r.loading = true; bump();
      r.pager.next().catch(err => console.warn('[streamxr] replies unavailable:', err && err.message || err))
        .finally(() => { if (my === gen) { r.loading = false; bump(); } });
    }

    function setSort(s) {
      if (s === sort || !sorts().some(x => x.id === s)) return false;
      sort = s; restart();
      return true;
    }

    // Open / fold thread i's replies (loading the first page the first time).
    function toggleReplies(i) {
      const c = (pager ? pager.items : [])[i];
      let r = replies.get(i);
      if (r) { r.open = !r.open; bump(); }
      else if (c && c.repliesToken) {
        r = { open: true, pager: actions.replies(c), loading: false };
        replies.set(i, r); bump(); loadReplies(i);
      }
    }

    function state() {
      const threads = (pager ? pager.items : []).map((comment, i) => {
        const r = replies.get(i);
        return { comment: withRating(comment),
          replies: r ? { open: r.open, items: r.pager.items.map(withRating), loading: r.loading, more: !r.pager.done } : null };
      });
      return { sort, threads, loading, done: !!pager && pager.done, error };
    }

    // One YouTube comment as an Info 'thread' row (the original rides along for the footer).
    const row = c => ({
      id: c.id, author: c.author, avatar: c.authorAvatar, highlight: !!c.isCreator,
      badge: c.authorVerified ? 'verified' : null, text: c.text,
      meta: [c.published, c.pinned ? tr('yt.comments.pinned') : ''].filter(Boolean).join(' · '),
      childrenLabel: c.replyCount && c.repliesToken ? tr('yt.comments.replies', { n: c.replyCount }) : '',
      yt: c,
    });

    function content(count) {
      const s = state();
      return {
        kind: 'thread', pills: sorts(), pill: s.sort, count: count ? tr('yt.comments.count', { n: count }) : '', labels: labels(),
        threads: s.threads.map(t => ({ comment: row(t.comment),
          children: t.replies ? { ...t.replies, items: t.replies.items.map(row) } : null })),
        loading: s.loading, done: s.done, error: s.error,
      };
    }

    return { show, loadMore, setSort, toggleReplies, moreReplies: loadReplies, rate, state, content, version: () => ver };
  }

  // A heart centred on (x, y), `s` pixels wide, in the current fill colour (the creator's ❤).
  function heart(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * 0.4);
    g.bezierCurveTo(x - s * 0.65, y - s * 0.05, x - s * 0.3, y - s * 0.6, x, y - s * 0.2);
    g.bezierCurveTo(x + s * 0.3, y - s * 0.6, x + s * 0.65, y - s * 0.05, x, y + s * 0.4);
    g.fill();
  }

  // The Info style's threadFooter slot for YouTube comments: 👍 count and 👎 ('like:<at>',
  // 'dislike:<at>'; greyed and not clickable without the sign-in tokens), then the
  // creator's ❤. Returns the x where it ended.
  function footer(f) {
    const { g, kit, at, y: fy } = f, c = f.comment.yt || {};
    const FONT = ns.vrKit.FONT;
    const can = !!c.actions, liked = c.likeState === 'liked', disliked = c.likeState === 'disliked';
    const P = ns.vrTokens.m3;
    const thumbButton = (id, x, w, on, flip, label) => {
      if (can) f.area(id, x, fy - 4, w, 30, 15);                 // clickable, with the M3 hover look
      const col = !can ? ns.vrTokens.m3Alpha('onSurface', 0.38) : on ? P.onSurface : P.onSurfaceVariant;
      g.fillStyle = col; g.strokeStyle = col;
      ns.vrSymbols.draw(g, flip ? 'thumb_down' : 'thumb_up', x + 16, fy + 11, 22, on);   // filled when on
      if (label) { g.font = `18px ${FONT}`; g.fillText(label, x + 30, fy + 2); }
    };
    g.font = `18px ${FONT}`;
    const count = liked ? (c.likesIfLiked || c.likes) : c.likes;
    const likeW = 38 + (count ? g.measureText(count).width + 8 : 0);
    let fx = f.x;
    thumbButton(`like:${at}`, fx, likeW, liked, false, count); fx += likeW + 4;
    thumbButton(`dislike:${at}`, fx, 34, disliked, true, ''); fx += 34 + 12;
    if (c.hearted) {
      kit.avatar(c.creatorAvatar, c.heartBy, fx, fy - 2, 24);
      g.fillStyle = '#FF0033'; heart(g, fx + 22, fy + 18, 13);
      fx += 40;
    }
    return fx;
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.comments = { create, footer };
})(globalThis.__streamxr = globalThis.__streamxr || {});
