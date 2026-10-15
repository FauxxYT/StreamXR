// YouTube's "Comments" panel (Info style, one tab: "Comments · 7.4K"): the video's comment
// threads (comments.js) in the left zone, beside Description and Channel. The list starts
// (or restarts, for a new video) when the panel shows, and keeps loading pages while you're
// within COMMENTS_AHEAD of the end; its scroll position is kept, and reset for every video.
// When the video has comments turned off, it says so. A panel controller: see panels.js.
//   frame.st used: description: { id, commentsOn, commentCount } | null, time.
//   actions used: seekTo(s) (a time written in a comment), and comments.js's.
(function (ns) {
  'use strict';

  const COMMENTS_AHEAD = 900;       // load more comments when this close (px) to the end
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create(host) {
    const { actions } = host;
    const comments = ns.ytVr.comments.create(actions);
    let scroll = 0, videoId = '';

    function model(frame) {
      const d = frame.st.description || null, id = d ? d.id : '';
      if (id !== videoId) { videoId = id; scroll = 0; }
      const label = d && d.commentCount ? tr('yt.desc.commentsCount', { n: d.commentCount }) : tr('yt.desc.comments');
      let content, loading = false;
      if (!d) content = { kind: 'message', text: tr('yt.loading'), spinner: true };
      else if (!d.commentsOn) content = { kind: 'message', text: tr('yt.comments.off') };
      else {
        comments.show(id);
        if (host.style.maxScroll() - scroll < COMMENTS_AHEAD) comments.loadMore();
        content = comments.content(d.commentCount || '');
        loading = content.loading || content.threads.some(x => x.children && x.children.loading);
      }
      const m = { tabs: [{ id: 'comments', label }], tab: 'comments', content, scroll, now: frame.now / 1000 };
      const key = [label, id, !!(d && d.commentsOn), comments.version(), Math.round(scroll),
        loading || !d ? Math.floor(frame.now / 33) : ''].join('#');
      return { model: m, key };
    }

    // After a draw: keep the scroll where the style clamped it.
    function afterDraw() { scroll = host.style.shownScroll(); }

    function event(ev) {
      const v = ev.value;
      if (ev.type === 'time') actions.seekTo(+v);                               // a time written in a comment
      else if (ev.type === 'pill') { if (comments.setSort(v)) scroll = 0; }
      else if (ev.type === 'children') comments.toggleReplies(+v);
      else if (ev.type === 'more') comments.moreReplies(+v);
      else if (ev.type === 'like' || ev.type === 'dislike') comments.rate(v, ev.type);
      else if (ev.type === 'scroll') scroll = Math.max(0, Math.min(host.style.maxScroll(), ev.value));
    }

    return { model, event, afterDraw };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.commentsPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
