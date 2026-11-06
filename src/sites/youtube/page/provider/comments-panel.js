// YouTube's "Comments" panel (Info style, one tab: "Comments · 7.4K"): the video's comment
// threads (comments.js) in the left zone, beside Description and Channel. The list starts
// (or restarts, for a new video) when the panel shows, and keeps loading pages while you're
// within COMMENTS_AHEAD of the end; its scroll position is kept, and reset for every video.
// When the video has comments turned off, it says so. Signed in, an "Add a comment" field runs
// along the bottom: a click gives it the keys (the VR keyboard comes up), Enter or Comment posts
// (no confirm; your comment shows at the top, the list scrolls there), Escape stops typing.
// A comment's Reply turns the field into a reply to it ("Replying to @name" over it, an x
// going back to a new comment); the reply shows under its comment.
// Your own comments have a "⋮": Edit (its text in the field, "Editing your comment" over it,
// Save updates it in place) and Delete (YouTube's question first, then it goes).
// A panel controller: see panels.js.
//   frame.st used: description: { id, commentsOn, commentCount } | null, time.
//   actions used: seekTo(s) (a time written in a comment), and comments.js's (sendComment, sendReply, editComment, deleteComment).
//   host used: typeInto(on) (the keys for the field), openMenu / closeMenu (the "⋮" menu), confirm
//   (delete), style.maxScroll() / shownScroll().
(function (ns) {
  'use strict';

  const COMMENTS_AHEAD = 900;       // load more comments when this close (px) to the end
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  function create(host) {
    const { actions } = host;
    const comments = ns.ytVr.comments.create(actions);
    let scroll = 0, videoId = '';
    let typing = false;                // the field has the keys
    function startTyping() { if (!typing && comments.canWrite()) { typing = true; host.typeInto(true); } }
    function stopTyping() { if (typing) { typing = false; host.typeInto(false); } }
    // Post the draft; once posted, typing stops and, for a new comment, the list goes to the top,
    // where it shows (a reply shows under its comment, an edit in place: where you are).
    function post() {
      const stay = comments.replying() || comments.editing();
      comments.post().then(ok => { if (ok) { stopTyping(); if (!stay) scroll = 0; } });
    }

    // Your own comment's "⋮" menu (a dropdown under it): Edit puts its text in the field; Delete
    // asks first (YouTube's own question), then deletes it.
    function menu(local) {
      if (!String(local).startsWith('own:')) return null;
      const items = comments.ownMenu(local.slice(4)).map(x => ({ ...x, icons: [] }));
      return items.length ? { items, width: 300 } : null;
    }
    function ownChoice(at, choice) {
      host.closeMenu();
      if (choice === 'edit') { if (comments.startEdit(at)) startTyping(); return; }
      if (choice !== 'delete') return;
      const q = comments.deleteQuestion(at);
      Promise.resolve(host.confirm({ title: q.title, text: q.text, confirm: tr('yt.comments.delete'), danger: true }))
        .then(yes => { if (yes) comments.remove(at); });
    }

    function model(frame) {
      const d = frame.st.description || null, id = d ? d.id : '';
      if (id !== videoId) { videoId = id; scroll = 0; stopTyping(); }
      const label = d && d.commentCount ? tr('yt.desc.commentsCount', { n: d.commentCount }) : tr('yt.desc.comments');
      let content, loading = false;
      if (!d) content = { kind: 'message', text: tr('yt.loading'), spinner: true };
      else if (!d.commentsOn) content = { kind: 'message', text: tr('yt.comments.off') };
      else {
        comments.show(id);
        if (host.style.maxScroll() - scroll < COMMENTS_AHEAD) comments.loadMore();
        content = comments.content(d.commentCount || '', typing);
        loading = content.loading || content.threads.some(x => x.children && x.children.loading);
      }
      const m = { tabs: [{ id: 'comments', label }], tab: 'comments', content, scroll, now: frame.now / 1000 };
      const key = [label, id, !!(d && d.commentsOn), comments.version(), Math.round(scroll), typing,
        loading || !d ? Math.floor(frame.now / 33) : ''].join('#');
      return { model: m, key };
    }

    // After a draw: keep the scroll where the style clamped it.
    function afterDraw() { scroll = host.style.shownScroll(); }

    function event(ev) {
      const v = ev.value;
      if (ev.type === 'key') {                                                 // the keyboard, while the field has the keys
        if (!typing) return;
        if (v === 'Escape') stopTyping();
        else if (v === 'Enter') post();
        else comments.type(v);
        return;
      }
      if (ev.type === 'field') { startTyping(); return; }
      if (ev.type === 'send') { post(); return; }
      if (ev.type === 'reply') { if (comments.replyTo(v)) startTyping(); return; }   // a comment's Reply: the field replies to it
      if (ev.type === 'unreply') { comments.cancelReply(); return; }                     // the x over the field: back to a new comment
      if (ev.type === 'own') { host.openMenu(`own:${v}`, { below: true }); return; }      // your comment's "⋮"
      if (ev.type === 'menu' && String(ev.menu).startsWith('own:')) { ownChoice(ev.menu.slice(4), ev.value); return; }
      if (ev.type === 'time') actions.seekTo(+v);                               // a time written in a comment
      else if (ev.type === 'pill') { if (comments.setSort(v)) scroll = 0; }
      else if (ev.type === 'children') comments.toggleReplies(+v);            // a comment's "N replies" / Hide, or its thread line
      else if (ev.type === 'fold') comments.toggleFold(v);                     // a reply's thread line, or its "N replies"
      else if (ev.type === 'more') comments.moreReplies(+v);
      else if (ev.type === 'like' || ev.type === 'dislike') comments.rate(v, ev.type);
      else if (ev.type === 'scroll') scroll = Math.max(0, Math.min(host.style.maxScroll(), ev.value));
    }

    return { model, event, afterDraw, menu };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.commentsPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
