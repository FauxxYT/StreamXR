// The Description panel's Comments tab, YouTube's side: the comment threads' state (comments
// reached only through `actions`), how YouTube's comments map onto the Info style's
// 'thread' kind, and the rows' footer (a slot of the Info style, styles/info.js):
// 👍 likes and 👎 (buttons when signed in: your like / dislike filled), the creator's ❤
// (their small picture with a red heart).
//
//   const view = ns.ytVr.comments.create(actions);
//   actions: { comments(sort) -> pager of comments ('top' | 'newest'),
//              replies(comment) -> pager of that thread's replies,
//              rateComment(comment, 'like' | 'unlike' | 'dislike' | 'undislike') -> Promise of { ok },
//              sendComment(compose, text) -> Promise of { ok, comment, error } (the comments
//              pager's p.compose: the "Add a comment" box, when YouTube offers one),
//              sendReply(comment, text) -> Promise of { ok, comment, error } (optional: without
//              it no Reply buttons show) }
//   view.show(videoId)      once per frame while the tab shows (a new video starts over)
//   view.loadMore()         load the next page of threads (when you're near the end)
//   view.setSort(sort) -> true if it changed (the list restarts)
//   view.toggleReplies(i), view.moreReplies(i)   thread i's replies: open / fold, next page
//   view.toggleFold(at)     fold / unfold the own replies of the reply at "<i>.<j>" (its row's fold)
//   view.rate(at, 'like' | 'dislike')            at = "<i>" (a thread) or "<i>.<j>" (its reply j);
//                           shown at once (each comment's likeState), undone if YouTube refuses
//   view.content(count, typing)   the Info style's 'thread' content (count: "7.4K" or ''), with
//                           the "Add a comment" field (input) when YouTube offers one (typing: it
//                           has the keys: outlined, with a caret)
//   view.canWrite()         a comment can be written here (signed in, comments open)
//   view.type(key)          a key from the keyboard into the draft (a character or 'Backspace')
//   view.replyTo(at)        reply to the comment at "<i>" or "<i>.<j>": the field says "Replying to
//                           @name" (a reply's reply starts with "@name "); true if it can be replied to
//   view.cancelReply()      back to writing a new comment (the draft clears)
//   view.ownMenu(at) -> [{ id: 'edit' | 'delete', text }] for your own comment at "<i>" / "<i>.<j>"
//                           (its "⋮" menu; [] if it isn't yours)
//   view.startEdit(at)      edit your comment: its text in the field, "Editing your comment" over it
//                           (the x cancels: cancelReply), Save (post) updates it in place; true if it can
//   view.deleteQuestion(at) -> { title, text }: YouTube's own words for the delete confirm
//   view.remove(at) -> Promise of true once YouTube deleted it (it goes from the list, its replies too)
//   view.editing()          true while editing
//   view.replying()         true while replying
//   view.post() -> Promise of true once posted: the draft goes to YouTube; your comment shows at
//                           the top at once (as YouTube shows it, or as typed if its answer
//                           couldn't be read), the draft clears; false (with the field's error) if not.
//                           A reply shows first under its comment (its replies opened); a reply to a reply, under
//                           that reply. An open thread's replies bring their own replies along, to any depth
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
    let posted = [];                          // your comments posted here, newest first (shown at the top)
    let draft = '', sending = false, sendError = '';   // the comment being written
    let replying = null;                      // { threadId, target (the comment replied to), name } while replying
    const added = new Map();                  // thread comment id -> your replies posted here, newest first
    const addedSub = new Map();               // reply id -> your replies to that reply posted here, newest first
    let subs = new Map();                     // reply id -> { pager, loading, pages }: that reply's own replies
    let folded = new Set();                   // reply ids whose own replies are folded away (toggleFold)
    let editing = null;                       // { target (your comment being edited) } while editing
    const edited = new Map();                 // comment id -> { text, published } as edited here (YouTube's "(edited)" time)
    let deleted = new Set();                  // comment ids deleted here (left out, with their replies)
    const SUB_PAGES = 3;                      // read at most this many pages of a reply's replies
    const MAX_CHARS = 10000;                  // YouTube's limit for a comment
    // Every thread shown: yours posted here first, then the loaded ones (without those again).
    function all() {
      const mine = new Set(posted.map(c => c.id));
      return [...posted, ...(pager ? pager.items.filter(c => !mine.has(c.id)) : [])].filter(c => !deleted.has(c.id));
    }
    // Thread i's replies as shown, one list, the whole tree in reading order: each reply
    // followed by its own replies, theirs after each of them, and so on (depth 1, 2, 3 ...; deeper
    // ones with parentId: the comment they answer). At each level yours posted here come first,
    // then those YouTube sent with it (inlineReplies), then any read behind its token (subs);
    // each comment once. A reply with replies of its own carries fold: { open, label ("2 replies") };
    // a folded one (its thread line clicked: toggleFold) leaves them out.
    function childItems(i) {
      const t = all()[i];
      if (!t) return [];
      const r = replies.get(i), out = [], seen = new Set();
      const visit = (c, depth, parentId) => {
        if (seen.has(c.id) || deleted.has(c.id)) return;             // (a deleted one goes, its replies with it)
        seen.add(c.id);
        const sub = subs.get(c.id);
        const kids = [...(addedSub.get(c.id) || []), ...(c.inlineReplies || []), ...(sub ? sub.pager.items : [])];
        const open = !folded.has(c.id);
        out.push(depth > 1 || kids.length ? { ...c, ...(depth > 1 ? { depth, parentId } : {}),
          ...(kids.length ? { fold: { open, label: tr('yt.comments.replies', { n: kids.length }) } } : {}) } : c);
        if (open) for (const k of kids) visit(k, depth + 1, c.id);
      };
      for (const c of [...(added.get(t.id) || []), ...(r ? r.pager.items : [])]) visit(c, 1, null);
      return out;
    }
    // Read the replies of thread i's replies (at any depth) that have a token for them (each
    // once, a page at a time, at most SUB_PAGES pages); called while the thread is open.
    function loadSubs(i) {
      if (!replies.get(i)) return;
      for (const c of childItems(i)) {
        if (!c.repliesToken || subs.has(c.id)) continue;
        const s = { pager: actions.replies(c), loading: false, pages: 0 };
        subs.set(c.id, s);
        nextSub(s);
      }
    }
    function nextSub(s) {
      if (s.loading || s.pager.done || s.pages >= SUB_PAGES) return;
      const my = gen;
      s.loading = true; bump();
      s.pager.next().catch(err => console.warn('[streamxr] replies to a reply unavailable:', err && err.message || err))
        .finally(() => { if (my !== gen) return; s.loading = false; s.pages++; bump(); nextSub(s); });
    }
    // The comment at "<i>" (a thread) or "<i>.<j>" (its reply j), or null.
    function at(spot) {
      const [i, j] = String(spot).split('.').map(Number);
      return (j >= 0 ? childItems(i)[j] : all()[i]) || null;
    }
    const bump = () => { ver++; };

    // A comment as shown: your like / dislike from this session wins over the loaded one.
    const withRating = c => (rated.has(c.id) ? { ...c, likeState: rated.get(c.id) } : c);
    // ... and its text (and time, "... (edited)") as you edited it here.
    const shown = c => { const x = withRating(c), e = edited.get(c.id); return e ? { ...x, text: e.text, published: e.published || x.published } : x; };

    // Like / dislike button on the comment at "<i>" or "<i>.<j>": toggles your rating.
    function rate(spot, button) {
      const c = at(spot);
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
      gen++; error = ''; loading = false; replies = new Map(); subs = new Map(); folded = new Set();
      try { pager = actions.comments(sort); } catch (err) { pager = null; error = String(err && err.message || err); }
      bump();
      loadMore();
    }

    function show(id) {
      if (id && id !== videoId) { videoId = id; sort = 'top'; posted = []; added.clear(); addedSub.clear(); edited.clear(); deleted = new Set(); replying = null; editing = null; draft = ''; sendError = ''; restart(); }
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

    // Fold or unfold the replies of the reply at "<i>.<j>" (its thread line, or its "N replies").
    function toggleFold(spot) {
      const c = at(spot);
      if (!c || !c.fold) return;
      if (folded.has(c.id)) folded.delete(c.id); else folded.add(c.id);
      bump();
    }

    // Open / fold thread i's replies (loading the first page the first time).
    function toggleReplies(i) {
      const c = all()[i];
      let r = replies.get(i);
      if (r) { r.open = !r.open; bump(); }
      else if (c && c.repliesToken) {
        r = { open: true, pager: actions.replies(c), loading: false };
        replies.set(i, r); bump(); loadReplies(i);
      }
    }

    // ---- writing a comment
    const compose = () => (pager && pager.compose) || null;
    const canWrite = () => !!compose();
    function type(key) {
      sendError = '';
      if (key === 'Backspace') draft = Array.from(draft).slice(0, -1).join('');
      else if (Array.from(draft + key).length <= MAX_CHARS) draft += key;
      bump();
    }
    function replyTo(spot) {
      const c = at(spot), t = all()[Number(String(spot).split('.')[0])];
      if (!c || !t || !c.replyParams || !actions.sendReply) return false;
      const isReply = String(spot).includes('.');
      // A reply to a reply goes right under the reply it answers (parentId), as YouTube nests it.
      editing = null;
      replying = { threadId: t.id, target: c, name: c.author || '', parentId: isReply ? c.id : null };
      draft = isReply && c.author ? `${c.author} ` : ''; sendError = ''; bump();
      return true;
    }
    // Back to a new comment from a reply or an edit (the field's x); the draft clears.
    function cancelReply() { if (replying || editing) { replying = null; editing = null; draft = ''; sendError = ''; bump(); } }

    // ---- your own comments: edit, delete
    const isYours = c => !!(c && c.own && (c.own.editParams || c.own.deleteAction));
    function ownMenu(spot) {
      const c = at(spot);
      if (!isYours(c)) return [];
      return [...(c.own.editParams && actions.editComment ? [{ id: 'edit', text: tr('yt.comments.edit') }] : []),
        ...(c.own.deleteAction && actions.deleteComment ? [{ id: 'delete', text: tr('yt.comments.delete') }] : [])];
    }
    function startEdit(spot) {
      const c = at(spot);
      if (!c || !c.own || !c.own.editParams || !actions.editComment) return false;
      replying = null; editing = { target: c };
      draft = edited.has(c.id) ? edited.get(c.id).text : c.text || ''; sendError = ''; bump();
      return true;
    }
    // Save the edit: the comment shows its new text in place (as YouTube answers, or as typed).
    function saveEdit() {
      const ed = editing, text = draft.trim(), forVideo = videoId;
      if (!ed || !text || sending) return Promise.resolve(false);
      sending = true; sendError = ''; bump();
      return Promise.resolve(actions.editComment(ed.target, text)).then(res => {
        if (!(res && res.ok)) { sendError = tr('yt.comments.saveFailed'); console.warn('[streamxr] comment not edited:', res && res.error); return false; }
        if (videoId !== forVideo) return true;
        edited.set(ed.target.id, { text: (res.comment && res.comment.text) || text, published: res.comment && res.comment.published });
        if (editing === ed) editing = null;
        if (draft.trim() === text) draft = '';
        return true;
      }, err => { sendError = tr('yt.comments.saveFailed'); console.warn('[streamxr] comment not edited:', err && err.message || err); return false; })
        .finally(() => { sending = false; bump(); });
    }
    const deleteQuestion = spot => {
      const c = at(spot), o = (c && c.own) || {};
      return { title: o.deleteTitle || tr('yt.comments.deleteTitle'), text: o.deleteText || tr('yt.comments.deleteText') };
    };
    // Delete it (asked first by the panel); once YouTube did, it leaves the list (a thread: the
    // threads below move up one, their opened replies with them).
    function remove(spot) {
      const c = at(spot), forVideo = videoId;
      if (!c || !c.own || !c.own.deleteAction || !actions.deleteComment) return Promise.resolve(false);
      return Promise.resolve(actions.deleteComment(c)).then(res => {
        if (!(res && res.ok)) { console.warn('[streamxr] comment not deleted:', res && res.error); return false; }
        if (videoId !== forVideo) return true;
        if (!String(spot).includes('.')) {
          const i = Number(spot);
          replies = new Map([...replies].filter(([k]) => k !== i).map(([k, v]) => [k > i ? k - 1 : k, v]));
        }
        deleted.add(c.id);
        if (editing && editing.target.id === c.id) { editing = null; draft = ''; }
        if (replying && replying.target.id === c.id) { replying = null; draft = ''; }
        bump();
        return true;
      }, err => { console.warn('[streamxr] comment not deleted:', err && err.message || err); return false; });
    }

    function post() {
      if (editing) return saveEdit();
      if (replying) return postReply();
      const box = compose(), text = draft.trim(), forVideo = videoId;
      if (!box || !text || sending) return Promise.resolve(false);
      sending = true; sendError = ''; bump();
      return Promise.resolve(actions.sendComment(box, text)).then(res => {
        if (!(res && res.ok)) { sendError = tr('yt.comments.postFailed'); console.warn('[streamxr] comment not posted:', res && res.error); return false; }
        if (videoId !== forVideo) return true;                          // (another video since: posted, not shown here)
        // Shown at the top at once; the threads below move down one, their opened replies with them.
        posted.unshift(res.comment || { id: `local:${Date.now()}`, text, author: tr('yt.comments.you'), authorAvatar: box.avatar || '',
          published: tr('yt.comments.justNow'), likes: '', replyCount: '', repliesToken: null, likeState: 'none', actions: null });
        replies = new Map([...replies].map(([k, v]) => [k + 1, v]));
        if (draft.trim() === text) draft = '';
        return true;
      }, err => { sendError = tr('yt.comments.postFailed'); console.warn('[streamxr] comment not posted:', err && err.message || err); return false; })
        .finally(() => { sending = false; bump(); });
    }
    // Post the draft as a reply; it shows first under its comment, with that thread's replies opened.
    function postReply() {
      const rp = replying, text = draft.trim(), forVideo = videoId, box = compose();
      if (!rp || !text || sending) return Promise.resolve(false);
      sending = true; sendError = ''; bump();
      return Promise.resolve(actions.sendReply(rp.target, text)).then(res => {
        if (!(res && res.ok)) { sendError = tr('yt.comments.postFailed'); console.warn('[streamxr] reply not posted:', res && res.error); return false; }
        if (videoId !== forVideo) return true;
        const list = rp.parentId ? addedSub : added, key = rp.parentId || rp.threadId;
        const mine = list.get(key) || [];
        mine.unshift(res.comment || { id: `local:${Date.now()}`, text, author: tr('yt.comments.you'), authorAvatar: (box && box.avatar) || '',
          published: tr('yt.comments.justNow'), likes: '', replyCount: '', repliesToken: null, likeState: 'none', actions: null });
        list.set(key, mine);
        if (rp.parentId) folded.delete(rp.parentId);                  // (shown: a folded reply opens for it)
        const r = replies.get(all().findIndex(c => c.id === rp.threadId));
        if (r) r.open = true;
        if (replying === rp) replying = null;
        if (draft.trim() === text) draft = '';
        return true;
      }, err => { sendError = tr('yt.comments.postFailed'); console.warn('[streamxr] reply not posted:', err && err.message || err); return false; })
        .finally(() => { sending = false; bump(); });
    }
    // The field for the Info style ('thread' input), or null where you can't write.
    function input(typing) {
      const box = compose();
      if (!box) return null;
      return { runs: draft ? [{ text: draft }] : [],
        placeholder: replying ? tr('yt.comments.replyPlaceholder') : box.placeholder || tr('yt.comments.placeholder'),
        context: editing ? { label: tr('yt.comments.editing') } : replying ? { label: tr('yt.comments.replyingTo', { name: replying.name }) } : null,   // (an x cancels: 'unreply')
        focused: !!typing, canSend: !!draft.trim() && !sending, error: sendError };
    }

    function state() {
      const threads = all().map((comment, i) => {
        const r = replies.get(i), mine = added.has(comment.id);
        if (r && r.open) loadSubs(i);                                  // (an open thread's replies to replies)
        const subLoading = r && r.open && childItems(i).some(c => (subs.get(c.id) || {}).loading);
        return { comment: shown(comment),
          replies: r ? { open: r.open, items: childItems(i).map(shown), loading: r.loading || !!subLoading, more: !r.pager.done }
            : mine ? { open: true, items: childItems(i).map(shown), loading: false, more: false } : null };
      });
      return { sort, threads, loading, done: !!pager && pager.done, error };
    }

    // One YouTube comment as an Info 'thread' row (the original rides along for the footer).
    const row = c => ({
      id: c.id, author: c.author, avatar: c.authorAvatar, highlight: !!c.isCreator,
      badge: c.authorVerified ? 'verified' : null, text: c.text,
      meta: [c.published, c.pinned ? tr('yt.comments.pinned') : ''].filter(Boolean).join(' · '),
      childrenLabel: c.replyCount && c.repliesToken ? tr('yt.comments.replies', { n: c.replyCount }) : '',
      depth: c.depth || 1,                                              // (2: a reply to a reply, 3 ...)
      fold: c.fold || null,                                             // (a reply's own replies: { open, label })
      own: isYours(c) && !!(actions.editComment || actions.deleteComment),   // (the footer's "⋮": your own comment)
      canReply: !!(c.replyParams && actions.sendReply && compose()), yt: c,   // (the footer's Reply button)
    });

    function content(count, typing = false) {
      const s = state();
      return {
        kind: 'thread', pills: sorts(), pill: s.sort, count: count ? tr('yt.comments.count', { n: count }) : '',
        labels: { ...labels(), send: tr(editing ? 'yt.comments.save' : replying ? 'yt.comments.reply' : 'yt.comments.post') }, input: input(typing),
        threads: s.threads.map(t => ({ comment: row(t.comment),
          children: t.replies ? { ...t.replies, items: t.replies.items.map(row) } : null })),
        loading: s.loading, done: s.done, error: s.error,
      };
    }

    return { show, loadMore, setSort, toggleReplies, toggleFold, moreReplies: loadReplies, rate, state, content, canWrite, type, post, replyTo, cancelReply, replying: () => !!replying,
      ownMenu, startEdit, saveEdit, deleteQuestion, remove, editing: () => !!editing, version: () => ver };
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
  // creator's ❤, then Reply ('reply:<at>') where you can reply (the row's canReply), then "⋮"
  // ('own:<at>') on your own comments (the row's own). Returns the x where it ended.
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
    if (f.comment.canReply) {                                    // Reply ('reply:<at>'): a text button, as YouTube's
      const label = ns.i18n.t('yt.comments.reply');
      g.font = `500 18px ${FONT}`;
      const w = g.measureText(label).width + 24;
      f.area(`reply:${at}`, fx, fy - 4, w, 30, 15);
      g.fillStyle = P.onSurface; g.fillText(label, fx + 12, fy + 2);
      fx += w + 8;
    }
    if (f.comment.own) {                                         // your own comment: "⋮" ('own:<at>') opens Edit / Delete
      f.area(`own:${at}`, fx, fy - 4, 30, 30, 15);
      g.fillStyle = P.onSurfaceVariant; ns.vrSymbols.draw(g, 'more_vert', fx + 15, fy + 11, 24, false);
      fx += 38;
    }
    return fx;
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.comments = { create, footer };
})(globalThis.__streamxr = globalThis.__streamxr || {});
