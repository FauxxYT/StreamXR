// YouTube's "Live chat" panel (Info style, 'chat' content): a live stream's chat, in the
// right zone, shown only while one is playing (its registration's `available`) and staying up
// while the rest of the panels fade (`stays`). Its tabs are YouTube's chat views (Top chat,
// Live chat; the one chosen is remembered). While the panel is open the chat is polled every
// POLL_MS (youtube-chat.js; YouTube's own frame is pushed new messages, so its suggested 10 s
// wait would lag); closed, it rests, and reopening after a while starts it afresh. The list
// follows the newest message; scrolling back pauses it (new messages are counted, not
// shown) until you scroll to the end or press "jump to newest". The stream's reaction buttons
// (❤ 😄 🎉, from the chat page) sit along the panel's bottom: a click sends one (at most one
// every REACT_GAP_MS) and lights the button a moment. Above them, the message field: a click
// brings up the VR keyboard (with the channel's own emojis first on its emoji pages: typed as
// their shortcuts, sent as emojis), Enter or Send posts the message, Escape (or a click on
// nothing) stops typing; where you can't chat, YouTube's reason shows instead. Support opens a
// dialog: paying (Super Chat, gifts, memberships) happens in YouTube's own window on the
// desktop. Top fans: your XP in a 👑 pill at the right of the tabs (kept up to date by the
// polls); it opens the ranked list in the panel (refreshed every FANS_REFRESH_MS while open; a
// back button returns to the chat), and the top three have their "#1" pills in the chat.
// A finished stream's chat replay plays along with the video instead: its recorded messages
// are fetched ahead (REPLAY_AHEAD_MS) and each shows when the video reaches its time, so a
// pause stops the chat; a jump back, or ahead past SEEK_AHEAD_MS, starts it again at the new
// place (with the last REPLAY_BACKFILL_MS of chat at once). No typing, reactions or Top fans
// there, as on YouTube.
// A panel controller: see panels.js.
//   frame.st used: liveChat (youtubeChat.info(): { replay, views } | null), time (a replay's place).
(function (ns) {
  'use strict';

  const POLL_MS = 2000;             // how often to ask for new messages
  const RETRY_MS = 5000;            // after a failed request
  const MAX_TRIES = 3;              // failed requests in a row before giving up (a tab click retries)
  const RESTART_MS = 30000;         // closed longer than this: start afresh when reopened
  const START_TRIES = 5, START_RETRY_MS = 3000;   // a chat that won't load yet (e.g. YouTube's chat frame still
                                                  // loading for a new video): tried again this often, the spinner showing
  const MAX_ITEMS = 150;            // messages kept while following (more while paused, up to MAX_PAUSED)
  const MAX_PAUSED = 600;
  const REACT_GAP_MS = 500;         // the shortest time between two reactions sent
  const REACT_LIT_MS = 700;         // how long a sent reaction's button stays lit
  const FANS_REFRESH_MS = 30000;    // how often the open Top fans list is loaded again
  const REPLAY_AHEAD_MS = 30000;    // a replay: fetch more while less than this is waiting ahead of the video
  const REPLAY_BACKFILL_MS = 60000; // a replay: on starting or a jump, the chat from this long before shows at once
  const SEEK_BACK_MS = 1500, SEEK_AHEAD_MS = 5000;   // the video jumping back / ahead more than this is a seek
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
    const it = { id: msg.id, author: msg.author, avatar: msg.avatar, channelId: msg.channelId, badges, rank: msg.rank || null,
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
    // The chat being followed: { video, view (its position), replay, items, ids, banner, next,
    // status ('loading' | 'live' | 'ended' | 'error'), busy (a request out), due (ms: next
    // poll), tries, version (changes with what's shown), and youtube-chat.js open()'s reactions,
    // input, emojis, support; a replay also: first (its start: the token a seek asks with),
    // queue (fetched changes waiting for their time, `at` ms), queueEnd (the last `at` fetched),
    // needSeek (fetch from the video's place with `first`), lastT (the video's last place, ms) }
    let chat = null, lastOpen = 0;
    let lastReact = 0, lit = {};      // when the last reaction was sent; when each button was (ms)
    let draft = '', typing = false, sending = false, sendError = '';   // the message being typed
    // The Top fans list while it's open: { rows, you, loading, error, busy, at (ms: last
    // loaded), version }, and how far it's scrolled.
    let fans = null, fansScroll = 0;
    let follow = true, frozen = null, unseen = 0, scroll = 0;

    const viewsOf = st => (st.liveChat && st.liveChat.views) || [];
    // The view to show: the one chosen, else the one YouTube selects.
    function chosen(views) {
      if (view != null && views[view]) return view;
      const i = views.findIndex(v => v.selected);
      return i >= 0 ? i : 0;
    }

    // Start following view `index` (titled `title`; a replay's or not): find the token that
    // loads it (youtube-chat.js views(): the same title, else the same position), then load it.
    // (attempt: how many starts failed before this one: see START_TRIES)
    function start(index, title, replay, attempt = 0) {
      const c = chat = { video: ns.youtubeData.currentVideoId(), view: index, title, attempt, retryAt: 0, replay: !!replay, items: [], ids: new Set(), banner: null, next: null,
        status: 'loading', busy: true, due: 0, tries: 0, version: 0, reactions: [], input: null, emojis: [], support: [], leaderboard: null, xp: null,
        first: null, queue: [], queueEnd: -1, needSeek: false, lastT: null };
      follow = true; frozen = null; unseen = 0; scroll = 0;
      stopTyping(); draft = ''; sendError = '';           // (another chat: a new message)
      fans = null; fansScroll = 0;
      ns.youtubeChat.views({ replay: c.replay }).then(list => {
        const v = (title && list.find(x => x.title === title)) || list[index] || list[0];
        return ns.youtubeChat.open(v.token, c.replay);
      }).then(r => {
        if (chat !== c) return;
        c.next = r.next; c.status = r.next ? 'live' : 'ended';
        if (c.replay) { c.first = r.next; c.needSeek = true; return; }   // (a replay starts at the video's place: tickReplay)
        apply(c, r.items);
        c.reactions = r.reactions || []; c.input = r.input || null; c.emojis = r.emojis || []; c.support = r.support || [];
        c.leaderboard = r.leaderboard || null; c.xp = c.leaderboard ? c.leaderboard.xp : null;
      }, err => {
        if (chat !== c) return;
        if (attempt + 1 < START_TRIES) { c.status = 'retry'; c.retryAt = performance.now() + START_RETRY_MS; return; }   // (tick tries again)
        console.warn('[streamxr] live chat unavailable:', err && err.message || err);
        c.status = 'error';
      }).then(() => { c.busy = false; c.due = performance.now() + (c.replay ? 0 : POLL_MS); });   // (a replay fetches at once)
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
      ns.youtubeChat.poll(c.next, c.leaderboard && c.leaderboard.pointsKey).then(r => {
        if (chat !== c) return;
        apply(c, r.items); c.next = r.next; c.tries = 0;
        if (r.xp !== undefined && r.xp !== c.xp) { c.xp = r.xp; c.version++; }
        if (!r.next) c.status = 'ended';
        c.due = performance.now() + POLL_MS;
      }, err => {
        if (chat !== c) return;
        if (++c.tries >= MAX_TRIES) { console.warn('[streamxr] live chat stopped:', err && err.message || err); c.status = 'error'; }
        c.due = performance.now() + RETRY_MS;
      }).then(() => { c.busy = false; });
    }

    // A replay, every frame: a seek starts it again; what's due by the video's place shows; more
    // is fetched while little waits ahead.
    function tickReplay(c, frame) {
      const t = Math.round((frame.st.time || 0) * 1000);
      if (c.lastT != null && (t < c.lastT - SEEK_BACK_MS || t > c.lastT + SEEK_AHEAD_MS)) {
        c.items = []; c.ids = new Set(); c.banner = null; c.queue = []; c.queueEnd = -1; c.needSeek = true; c.version++;
        resume();
      }
      c.lastT = t;
      let due = 0;
      while (due < c.queue.length && c.queue[due].at <= t) due++;
      if (due) apply(c, c.queue.splice(0, due));
      if (!c.busy && performance.now() >= c.due && (c.needSeek || (c.next && c.queueEnd - t < REPLAY_AHEAD_MS))) fetchReplay(c, t);
    }
    // Fetch a replay's next chunk (or, for a seek, the chunk from a little before the video's place).
    function fetchReplay(c, t) {
      const seek = c.needSeek, from = seek ? Math.max(0, t - REPLAY_BACKFILL_MS) : t;
      c.busy = true;
      ns.youtubeChat.pollReplay(seek ? c.first : c.next, from).then(r => {
        if (chat !== c) return;
        if (seek) { c.queue = []; c.needSeek = false; }
        const items = r.items.map(ch => (ch.at != null ? ch : { ...ch, at: from }));
        c.queue.push(...items);
        if (items.length) c.queueEnd = Math.max(c.queueEnd, items[items.length - 1].at);
        c.next = r.next;
        if (!r.next) c.queueEnd = Infinity;                // the end of the recorded chat: nothing more to fetch
        c.tries = 0;
        c.due = performance.now() + (items.length ? 0 : POLL_MS);
      }, err => {
        if (chat !== c) return;
        if (++c.tries >= MAX_TRIES) { console.warn('[streamxr] chat replay stopped:', err && err.message || err); c.status = 'error'; }
        c.due = performance.now() + RETRY_MS;
      }).then(() => { c.busy = false; });
    }

    // Every frame: while the panel is open, start the chat (or start it again: another video,
    // another view, live or replay, or reopened after a while) and poll it when due (a replay:
    // tickReplay).
    function tick(frame) {
      if (!host.isOpen()) return;
      const now = frame.now, views = viewsOf(frame.st), replay = !!(frame.st.liveChat && frame.st.liveChat.replay);
      if (!views.length) { chat = null; return; }
      const i = chosen(views);
      const stale = now - lastOpen > RESTART_MS;
      lastOpen = now;
      if (!chat || chat.view !== i || chat.replay !== replay || chat.video !== ns.youtubeData.currentVideoId() || (stale && !chat.busy)) {
        start(i, views[i].title, replay); return;
      }
      if (chat.status === 'retry') { if (performance.now() >= chat.retryAt) start(chat.view, chat.title, chat.replay, chat.attempt + 1); return; }
      if (chat.replay) { if (chat.status === 'live') tickReplay(chat, frame); }
      else if (chat.status === 'live' && !chat.busy && now >= chat.due && chat.next) poll(chat, now);
      if (fans && fans.at && !fans.busy && performance.now() - fans.at > FANS_REFRESH_MS) loadFans();
    }

    // ------------------------------------------------------------ Top fans
    function openFans() {
      if (!chat || !chat.leaderboard) return;
      fans = { rows: [], you: null, loading: true, error: '', busy: false, at: 0, version: 0 }; fansScroll = 0;
      loadFans();
    }
    function loadFans() {
      const f = fans;
      if (!f || !chat || !chat.leaderboard) return;
      f.busy = true;
      ns.youtubeChat.topFans(chat.leaderboard.params).then(r => {
        if (fans !== f) return;
        f.rows = r.fans; f.you = r.you ? { ...r.you, name: r.you.name || tr('yt.chat.you') } : null; f.error = '';
      }, err => {
        if (fans !== f) return;
        console.warn('[streamxr] top fans unavailable:', err && err.message || err);
        if (!f.rows.length) f.error = tr('yt.chat.fansError');
      }).then(() => { f.busy = false; f.loading = false; f.at = performance.now(); f.version++; });
    }

    function model(frame) {
      const views = viewsOf(frame.st), i = chosen(views);
      const tabs = views.length ? views.map((v, k) => ({ id: String(k), label: v.title || tr('yt.panel.chat') })) : [{ id: '0', label: tr('yt.panel.chat') }];
      let content;
      if (!views.length) content = { kind: 'message', text: tr('yt.chat.none') };
      else if (!chat || ((chat.status === 'loading' || chat.status === 'retry') && !chat.items.length)) content = { kind: 'message', text: tr('yt.loading'), spinner: true };
      else if (chat.status === 'error' && !chat.items.length) content = { kind: 'message', text: tr('yt.chat.error') };
      else {
        // (an emoji written without its emoji selector, as YouTube writes ❤, gets one: drawn in colour, not as a plain glyph)
        const reactions = chat.status === 'live' ? chat.reactions.map((r, k) => ({ id: String(k), emoji: /️$/.test(r.emoji) ? r.emoji : `${r.emoji}️`,
          on: frame.now - (lit[k] || -Infinity) < REACT_LIT_MS })) : [];
        content = { kind: 'chat', banner: chat.banner, items: follow ? chat.items : (frozen || chat.items), follow, reactions,
          input: inputModel(), support: chat.status === 'live' && chat.support.length > 0,
          xp: chat.leaderboard ? { label: chat.xp || tr('yt.chat.topFans') } : null,
          fans: fans ? { title: tr('yt.chat.topFans'), loading: fans.loading, error: fans.error, empty: tr('yt.chat.fansEmpty'), rows: fans.rows, you: fans.you } : null,
          labels: { newest: unseen ? tr('yt.chat.newestCount', { n: unseen }) : tr('yt.chat.newest'), empty: chat.status === 'ended' ? tr('yt.chat.ended') : tr('yt.chat.empty'),
            send: tr('yt.chat.send'), support: tr('yt.chat.support') } };
      }
      const m = { tabs, tab: String(i), content, scroll: fans ? fansScroll : scroll, now: frame.now / 1000 };
      const loading = !chat || chat.status === 'loading' || chat.status === 'retry';
      const lits = content.reactions ? content.reactions.map(r => (r.on ? 1 : 0)).join('') : '';
      const key = [tabs.map(t => t.label).join(','), i, chat ? `${chat.video}:${chat.status}:${follow ? chat.version : 'paused'}` : '',
        follow, unseen, Math.round(scroll), chat && chat.banner ? chat.banner.id : '', lits, draft, typing, sending, sendError,
        chat ? chat.xp : '', fans ? `${fans.version}:${Math.round(fansScroll)}` : '',
        loading || (fans && fans.loading) ? Math.floor(frame.now / 33) : '', ns.i18n.version()].join('#');
      return { model: m, key };
    }

    // After a draw: keep the scroll where the style put it; at the end again, follow again.
    function afterDraw() {
      if (fans) { fansScroll = host.style.shownScroll(); return; }
      scroll = host.style.shownScroll();
      if (!follow && scroll >= host.style.maxScroll() - 2 && frozen) resume();
    }
    function resume() { follow = true; frozen = null; unseen = 0; if (chat && chat.items.length > MAX_ITEMS) chat.items = chat.items.slice(-MAX_ITEMS); }

    // ------------------------------------------------------------ typing a message
    const canType = () => !!(chat && chat.status === 'live' && chat.input && chat.input.params);
    // The draft in pieces: a channel emoji's shortcut (':_wave:', as its key types it), or the
    // text between them.
    function pieces(text) {
      const map = new Map((chat ? chat.emojis : []).map(e => [e.shortcut, e])), out = [];
      const re = /:[^:\s]+:/g;
      let at = 0, mt;
      while ((mt = re.exec(text))) {
        const e = map.get(mt[0]);
        if (!e) continue;
        if (mt.index > at) out.push({ text: text.slice(at, mt.index) });
        out.push({ emoji: e }); at = mt.index + mt[0].length;
      }
      if (at < text.length) out.push({ text: text.slice(at) });
      return out;
    }
    // How long YouTube counts it: characters, a channel emoji counting as input.emojiCost.
    const lengthOf = text => pieces(text).reduce((n, p) => n + (p.emoji ? chat.input.emojiCost : Array.from(p.text).length), 0);

    // The message row for the model: why you can't chat, or the field.
    function inputModel() {
      const input = chat && chat.status === 'live' ? chat.input : null;
      if (!input) return null;
      if (!input.params) return input.restricted ? { note: input.restricted } : null;
      return { runs: pieces(draft).map(p => (p.emoji ? { image: p.emoji.image, label: p.emoji.shortcut } : { text: p.text })),
        placeholder: input.placeholder || tr('yt.chat.placeholder'), focused: typing, canSend: !!draft.trim() && !sending, error: sendError };
    }

    // The keys come to the field (the keyboard's emoji pages starting with the channel's own).
    function startTyping() {
      if (!canType()) return;
      typing = true;
      host.typeInto(true, { emojis: chat.emojis.map(e => ({ text: e.shortcut, image: e.image, label: e.label })) });
    }
    function stopTyping() { if (typing) { typing = false; host.typeInto(false); } }

    // A key from the keyboard: a character (or an emoji, or a channel emoji's shortcut) is
    // added while it fits YouTube's limit; Backspace takes off the last character or emoji;
    // Enter sends; Escape stops typing.
    function key(v) {
      if (v === 'Escape') { stopTyping(); return; }
      if (v === 'Enter') { sendDraft(); return; }
      sendError = '';
      if (v === 'Backspace') {
        const last = pieces(draft).pop();
        if (last) draft = draft.slice(0, draft.length - (last.emoji ? last.emoji.shortcut.length : (Array.from(last.text).pop() || '').length));
        return;
      }
      if (canType() && lengthOf(draft + v) <= chat.input.max) draft += v;
    }

    // Post the draft (text and channel emojis); cleared once YouTube took it, then the list
    // goes back to the newest (where it will appear). Typing goes on.
    function sendDraft() {
      if (!canType() || sending || !draft.trim()) return;
      const text = draft, segments = pieces(text).map(p => (p.emoji ? { emojiId: p.emoji.id } : { text: p.text }));
      sending = true; sendError = '';
      ns.youtubeChat.send(chat.input, segments).then(ok => {
        if (ok) { if (draft === text) draft = ''; resume(); } else sendError = tr('yt.chat.sendFailed');
      }, err => { console.warn('[streamxr] chat message not sent:', err && err.message || err); sendError = tr('yt.chat.sendFailed'); })
        .then(() => { sending = false; });
    }

    // Support: YouTube takes payments in its own window, so the dialog says where to go and
    // what this stream offers there.
    function support() {
      const offers = chat ? chat.support.join(', ') : '';
      host.confirm({ title: tr('yt.chat.supportTitle'), text: offers ? tr('yt.chat.supportTextWith', { offers }) : tr('yt.chat.supportText'),
        confirm: tr('yt.chat.supportOk'), cancel: null });
    }

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
      else if (ev.type === 'field') startTyping();
      else if (ev.type === 'send') sendDraft();
      else if (ev.type === 'key') { if (typing) key(ev.value); }
      else if (ev.type === 'support') support();
      else if (ev.type === 'fans') { if (fans) fans = null; else openFans(); }
      else if (ev.type === 'fansBack') fans = null;
      else if (ev.type === 'scroll' && fans) fansScroll = Math.max(0, Math.min(host.style.maxScroll(), ev.value));
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
