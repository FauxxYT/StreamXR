// YouTube's "Live chat" panel (Info style, 'chat' content): a live stream's chat, in the
// right zone, shown only while one is playing (its registration's `available`) and staying up
// while the rest of the panels fade (`stays`). Its tabs are YouTube's chat views (Top chat,
// Live chat; the one chosen is remembered). While the panel is open the chat is polled every
// POLL_MS (youtube-chat.js; YouTube's own frame is pushed new messages, so its suggested 10 s
// wait would lag); closed, it rests, and reopening after a while starts it afresh. The list
// follows the newest message; scrolling back pauses it (new messages are counted, not
// shown) until you scroll to the end or press "jump to newest". The stream's reaction buttons
// (❤ 😄 🎉, from the chat page) sit along the panel's bottom: a click sends one (at most one
// every REACT_GAP_MS) and lights the button a moment. A panel controller: see panels.js.
//   frame.st used: liveChat (youtubeChat.info(): { views } | null).
(function (ns) {
  'use strict';

  const POLL_MS = 2000;             // how often to ask for new messages
  const RETRY_MS = 5000;            // after a failed request
  const MAX_TRIES = 3;              // failed requests in a row before giving up (a tab click retries)
  const RESTART_MS = 30000;         // closed longer than this: start afresh when reopened
  const MAX_ITEMS = 150;            // messages kept while following (more while paused, up to MAX_PAUSED)
  const MAX_PAUSED = 600;
  const REACT_GAP_MS = 500;         // the shortest time between two reactions sent
  const REACT_LIT_MS = 700;         // how long a sent reaction's button stays lit
  const VIEW_KEY = 'chatView';      // storage.js name: the chosen view's position (0: Top chat, 1: Live chat)
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)

  // A chat message (youtube-chat.js) -> the shell's chat item (chat.js), in YouTube's colours
  // (the theme's custom roles: provider.js): the owner's name on a yellow chip, moderators in
  // blue with a wrench, members in green with their badge; Super Chats / Stickers as cards in
  // their tier's colours, memberships as green cards.
  function itemOf(msg) {
    const badges = [];
    if (msg.badge) badges.push({ image: msg.badge });
    if (msg.role === 'moderator') badges.push({ icon: 'construction', color: 'chatModerator' });
    if (msg.verified) badges.push({ icon: 'verified', color: 'onSurfaceVariant' });
    const it = { id: msg.id, author: msg.author, avatar: msg.avatar, channelId: msg.channelId, badges,
      runs: msg.runs.map(r => (r.emoji ? { image: r.emoji.url, label: r.emoji.label } : { text: r.text })) };
    if (msg.role === 'owner') { it.nameFill = 'chatOwner'; it.nameColor = 'onChatOwner'; }
    else if (msg.role === 'moderator') it.nameColor = 'chatModerator';
    else if (msg.role === 'member') it.nameColor = 'chatMember';
    if (msg.kind === 'notice') return { ...it, kind: 'notice' };
    if (msg.kind === 'paid' || msg.kind === 'sticker') {
      return { ...it, kind: 'card', card: { color: msg.colors.header || 'chatMember', onColor: msg.colors.text || 'onSurface', title: msg.amount, sticker: msg.sticker || '' } };
    }
    if (msg.kind === 'member') {
      return { ...it, kind: 'card', card: { color: 'chatMember', onColor: 'onChatMember', title: msg.header || tr('yt.chat.newMember') } };
    }
    return { ...it, kind: 'text' };
  }

  function create(host) {
    let view = null;                // the chosen view's position in st.liveChat.views
    { const v = parseInt(ns.storage.get(VIEW_KEY), 10); if (v >= 0) view = v; }
    // The chat being followed: { video, view (its position), items, ids, banner, next, status
    // ('loading' | 'live' | 'ended' | 'error'), busy (a request out), due (ms: next poll),
    // tries, version (changes with what's shown), reactions (youtube-chat.js open()'s) }
    let chat = null, lastOpen = 0;
    let lastReact = 0, lit = {};      // when the last reaction was sent; when each button was (ms)
    let follow = true, frozen = null, unseen = 0, scroll = 0;

    const viewsOf = st => (st.liveChat && st.liveChat.views) || [];
    // The view to show: the one chosen, else the one YouTube selects.
    function chosen(views) {
      if (view != null && views[view]) return view;
      const i = views.findIndex(v => v.selected);
      return i >= 0 ? i : 0;
    }

    // Start following view `index` (titled `title`): find the token that loads it
    // (youtube-chat.js views(): the same title, else the same position), then load it.
    function start(index, title) {
      const c = chat = { video: ns.youtubeData.currentVideoId(), view: index, items: [], ids: new Set(), banner: null, next: null,
        status: 'loading', busy: true, due: 0, tries: 0, version: 0, reactions: [] };
      follow = true; frozen = null; unseen = 0; scroll = 0;
      ns.youtubeChat.views().then(list => {
        const v = (title && list.find(x => x.title === title)) || list[index] || list[0];
        return ns.youtubeChat.open(v.token);
      }).then(r => {
        if (chat !== c) return;
        apply(c, r.items); c.next = r.next; c.status = r.next ? 'live' : 'ended'; c.reactions = r.reactions || [];
      }, err => {
        if (chat !== c) return;
        console.warn('[streamxr] live chat unavailable:', err && err.message || err);
        c.status = 'error';
      }).then(() => { c.busy = false; c.due = performance.now() + POLL_MS; });
    }

    // Apply a batch of changes (youtube-chat.js) to the chat.
    function apply(c, changes) {
      let added = 0;
      for (const ch of changes) {
        if (ch.op === 'add' && !c.ids.has(ch.msg.id)) { c.ids.add(ch.msg.id); c.items.push(itemOf(ch.msg)); added++; }
        else if (ch.op === 'remove') c.items = c.items.filter(it => it.id !== ch.id);
        else if (ch.op === 'removeAuthor') c.items = c.items.filter(it => it.channelId !== ch.channelId);
        else if (ch.op === 'banner') c.banner = { id: ch.banner.id, header: ch.banner.header, item: itemOf(ch.banner.msg) };
        else if (ch.op === 'unbanner' && c.banner && (!ch.id || ch.id === c.banner.id)) c.banner = null;
      }
      const max = follow ? MAX_ITEMS : MAX_PAUSED;
      if (c.items.length > max) c.items = c.items.slice(-max);
      if (c.ids.size > MAX_PAUSED * 4) c.ids = new Set(c.items.map(it => it.id));   // (forget long-gone ids)
      if (!follow) unseen += added;
      if (changes.length) c.version++;
    }

    function poll(c, now) {
      c.busy = true;
      ns.youtubeChat.poll(c.next).then(r => {
        if (chat !== c) return;
        apply(c, r.items); c.next = r.next; c.tries = 0;
        if (!r.next) c.status = 'ended';
        c.due = performance.now() + POLL_MS;
      }, err => {
        if (chat !== c) return;
        if (++c.tries >= MAX_TRIES) { console.warn('[streamxr] live chat stopped:', err && err.message || err); c.status = 'error'; }
        c.due = performance.now() + RETRY_MS;
      }).then(() => { c.busy = false; });
    }

    // Every frame: while the panel is open, start the chat (or start it again: another video,
    // another view, or reopened after a while) and poll it when due.
    function tick(frame) {
      if (!host.isOpen()) return;
      const now = frame.now, views = viewsOf(frame.st);
      if (!views.length) { chat = null; return; }
      const i = chosen(views);
      const stale = now - lastOpen > RESTART_MS;
      lastOpen = now;
      if (!chat || chat.view !== i || chat.video !== ns.youtubeData.currentVideoId() || (stale && !chat.busy)) { start(i, views[i].title); return; }
      if (chat.status === 'live' && !chat.busy && now >= chat.due && chat.next) poll(chat, now);
    }

    function model(frame) {
      const views = viewsOf(frame.st), i = chosen(views);
      const tabs = views.length ? views.map((v, k) => ({ id: String(k), label: v.title || tr('yt.panel.chat') })) : [{ id: '0', label: tr('yt.panel.chat') }];
      let content;
      if (!views.length) content = { kind: 'message', text: tr('yt.chat.none') };
      else if (!chat || (chat.status === 'loading' && !chat.items.length)) content = { kind: 'message', text: tr('yt.loading'), spinner: true };
      else if (chat.status === 'error' && !chat.items.length) content = { kind: 'message', text: tr('yt.chat.error') };
      else {
        // (an emoji written without its emoji selector, as YouTube writes ❤, gets one: drawn in colour, not as a plain glyph)
        const reactions = chat.status === 'live' ? chat.reactions.map((r, k) => ({ id: String(k), emoji: /️$/.test(r.emoji) ? r.emoji : `${r.emoji}️`,
          on: frame.now - (lit[k] || -Infinity) < REACT_LIT_MS })) : [];
        content = { kind: 'chat', banner: chat.banner, items: follow ? chat.items : (frozen || chat.items), follow, reactions,
          labels: { newest: unseen ? tr('yt.chat.newestCount', { n: unseen }) : tr('yt.chat.newest'), empty: chat.status === 'ended' ? tr('yt.chat.ended') : tr('yt.chat.empty') } };
      }
      const m = { tabs, tab: String(i), content, scroll, now: frame.now / 1000 };
      const loading = !chat || chat.status === 'loading';
      const lits = content.reactions ? content.reactions.map(r => (r.on ? 1 : 0)).join('') : '';
      const key = [tabs.map(t => t.label).join(','), i, chat ? `${chat.video}:${chat.status}:${follow ? chat.version : 'paused'}` : '',
        follow, unseen, Math.round(scroll), chat && chat.banner ? chat.banner.id : '', lits, loading ? Math.floor(frame.now / 33) : '', ns.i18n.version()].join('#');
      return { model: m, key };
    }

    // After a draw: keep the scroll where the style put it; at the end again, follow again.
    function afterDraw() {
      scroll = host.style.shownScroll();
      if (!follow && scroll >= host.style.maxScroll() - 2 && frozen) resume();
    }
    function resume() { follow = true; frozen = null; unseen = 0; if (chat && chat.items.length > MAX_ITEMS) chat.items = chat.items.slice(-MAX_ITEMS); }

    // Send reaction k (lit at once; a refusal is only logged: YouTube shows nothing either).
    function react(k) {
      const r = chat && chat.reactions[k], now = performance.now();
      if (!r || now - lastReact < REACT_GAP_MS) return;
      lastReact = now; lit[k] = now;
      ns.youtubeChat.react(r).then(ok => { if (!ok) console.warn('[streamxr] reaction not taken:', r.emoji); },
        err => console.warn('[streamxr] reaction failed:', err && err.message || err));
    }

    function event(ev) {
      if (ev.type === 'tab') {
        const k = +ev.value;
        if (k !== view) { view = k; ns.storage.set(VIEW_KEY, String(k)); chat = null; }
      } else if (ev.type === 'newest') resume();
      else if (ev.type === 'react') react(+ev.value);
      else if (ev.type === 'scroll') {
        const max = host.style.maxScroll();
        scroll = Math.max(0, Math.min(max, ev.value));
        if (follow && scroll < max - 4) { follow = false; frozen = chat ? chat.items.slice() : null; unseen = 0; }   // scrolled back: pause
      }
    }

    return { model, event, tick, afterDraw };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.liveChatPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
