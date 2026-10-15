// YouTube's "Channel" panel (Profile style): which channel is open, its header, the chosen
// tab and sort, the loaded videos (a pager that loads more pages as you page through), the
// current page, the channel's featured video (a "Featured" tab, first, when the channel
// has one), and the Subscribe button (unsubscribing asks in a dialog). Three tabs aren't
// video grids: Store (product cards, just to look at: buying leads off YouTube), Posts (a
// scrolling feed, more loading near its end) and About (a scrolling page). On a post you
// can like / dislike it and vote in its poll (signed in; shown at once, undone if YouTube
// refuses), and open it: the post with its comments under it (the Comments tab's code,
// comments.js), and a back button to the feed where you left it. The search button (on
// channels YouTube lets you search) turns the tab row into a search bar: type (the keys come
// through host.typeInto), Search, and the channel's matching videos fill the grid; back
// returns to the tab you were on. Opening the panel (or
// showing it with no channel yet) shows the playing video's channel. A panel controller:
// see panels.js. Extra calls for the controls panel:
//   openChannel(channelId, subscribedHint)  show a channel (a no-op if it's already shown)
//   openCurrent()                           show the playing video's channel
//   showCurrent()                           the channel name was clicked: fold the panel if it
//                                           shows that channel, else open it on it
//   noteSubscribed(id, on)                  a subscription changed elsewhere (controls panel)
//   channelId()                             the channel shown (or null)
//   actions used: channelHeader(id) -> Promise of header (youtube-channel.js channel()),
//   channelList(id, tab, sort) -> pager (Store: Promise of [products]), channelAbout(id) ->
//   Promise of about | null, channelFeatured(id) -> Promise of item | null,
//   setSubscribed(id, on) -> Promise of { ok, error }, openVideo(id, playlistId), state(),
//   ratePost(post, what), votePoll(post, index, on) -> Promise of { ok, error },
//   postComments(post, sort) -> pager, replies(comment), rateComment(comment, what).
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  // Tabs and sort pills with their names: 'yt.channel.<id>' in the string tables.
  const named = list => list.map(x => ({ id: x.id, label: tr(`yt.channel.${x.id}`) }));

  // The tabs the panel can show (only those the channel has; About when it has an About
  // page), and each one's sort choices.
  const TABS = ['videos', 'shorts', 'live', 'playlists', 'shows', 'posts', 'store', 'about'].map(id => ({ id }));
  const VIDEO_SORTS = [{ id: 'latest' }, { id: 'popular' }, { id: 'oldest' }];
  const SORTS = { videos: VIDEO_SORTS, shorts: VIDEO_SORTS, live: VIDEO_SORTS,
    playlists: [{ id: 'newest' }, { id: 'lastAdded' }],
    shows: [], featured: [], posts: [], store: [], about: [] };     // these have no sort choices
  const POSTS_AHEAD = 1200;              // px from the feed's end at which the next posts load
  const FEATURED_TAB = { id: 'featured' };
  const firstSort = t => (SORTS[t][0] || { id: '' }).id;
  // The Subscribe button's look and text (a string table key) for each state.
  const BUTTON = {
    unsubscribed: { look: 'primary', key: 'yt.subscribe' }, unknown: { look: 'primary', key: 'yt.subscribe' },
    subscribed: { look: 'secondary', key: 'yt.subscribed' },
    busy: { look: 'busy', key: null },
  };

  // A list that arrives in one go (a Promise of items, e.g. the Store) as a pager, so it
  // loads and pages like the others.
  function oncePager(load) {
    const p = { items: [], done: false };
    p.next = () => Promise.resolve(load()).then(list => { p.items.push(...(list || [])); p.done = true; return list || []; });
    return p;
  }

  // A store product as a card: the whole picture, name, price · shop; not clickable.
  const productCard = pr => ({ title: pr.title, thumb: pr.image, fit: 'contain', inert: true, flags: [],
    lines: [{ text: [pr.price, pr.merchant].filter(Boolean).join(' · ') }] });

  function create(host) {
    const { actions } = host;
    const perPage = host.perPage;
    let channelId = null, header = null, error = '';
    let tab = 'videos', sort = 'latest', pager = null, page = 0, loading = false;
    let featured = null;                      // the channel's featured video (item) once known
    let about;                                // the About page: undefined (not asked yet), null (none) or its data
    let scroll = 0;                           // Posts / About: px scrolled (kept where the style clamped it)
    let opened = null;                        // an opened post: { i (in the feed), post, view (comments.js), feedScroll }
    let search = null;                        // searching the channel: { text, focused, query, back: { tab, sort } (to return to) }
    const rated = new Map();                  // post id -> 'liked' | 'disliked' | 'none' (your clicks)
    const voted = new Map();                  // post id -> the poll choice you picked (-1: none) (your clicks)
    let sub = 'unknown';                     // 'unknown' | 'subscribed' | 'unsubscribed' | 'busy'
    let gen = 0, ver = 0;                     // gen: ignore answers for a channel/list no longer shown
    const bump = () => { ver++; };

    const items = () => (pager ? pager.items : []);
    const pageCount = () => Math.max(1, Math.ceil(items().length / perPage));
    // The tabs this channel has (all of TABS until its header arrives; About when it has an
    // About page), "Featured" first once its featured video is known.
    const tabs = () => named([...(featured ? [FEATURED_TAB] : []),
      ...(header && header.tabs ? TABS.filter(t => (t.id === 'about' ? !!header.aboutToken : header.tabs[t.id])) : TABS)]);

    // Your rating of post p and your vote in its poll: your clicks here win over the loaded ones.
    const likeOf = p => (rated.has(p.id) ? rated.get(p.id) : p.likeState);
    const voteOf = p => (voted.has(p.id) ? voted.get(p.id) : p.poll ? p.poll.choices.findIndex(c => c.selected) : -1);

    // Post p (number i in the feed) as the style shows it: the channel's own picture and
    // name, the time, the text, pictures, an attached video as a card, the poll (its shares
    // once you've voted), and 👍 likes / 👎 / 💬 comments. Made again only when your rating
    // or vote changes, so the style can keep its layout.
    const feedPosts = new WeakMap();
    function feedPost(p, i) {
      const like = likeOf(p), vote = voteOf(p), key = `${like}|${vote}`;
      const hit = feedPosts.get(p);
      if (hit && hit.key === key) return hit.f;
      const share = t => { const n = parseFloat(t); return isFinite(n) ? n : null; };
      const f = {
        at: String(i), author: p.author || (header && header.title) || '', avatar: header && header.avatar, meta: p.published,
        text: p.text, images: p.images || [], card: p.video ? ns.ytVr.card(p.video, { showChannel: false }) : null,
        poll: p.poll ? { note: p.poll.votes, enabled: p.poll.choices.some(c => c.select || c.deselect),
          choices: p.poll.choices.map((c, k) => ({ text: c.text, on: k === vote,
            percent: vote >= 0 ? share(k === vote ? c.ifSelected : c.ifNotSelected) : null })) } : null,
        buttons: [
          { name: 'postlike', icon: 'like', label: p.likes, on: like === 'liked', enabled: !!p.actions },
          { name: 'postdislike', icon: 'dislike', label: '', on: like === 'disliked', enabled: !!p.actions },
          ...(p.commentsParams ? [{ name: 'postcomments', icon: 'comments', label: p.comments, on: false, enabled: true }] : []),
        ],
      };
      feedPosts.set(p, { key, f });
      return f;
    }

    // 👍 / 👎 on post p: toggles your rating.
    function ratePost(p, button) {
      const before = likeOf(p);
      const on = button === 'like' ? before !== 'liked' : before !== 'disliked';
      const what = button === 'like' ? (on ? 'like' : 'unlike') : (on ? 'dislike' : 'undislike');
      rated.set(p.id, on ? (button === 'like' ? 'liked' : 'disliked') : 'none'); bump();
      const undo = err => { rated.set(p.id, before); bump(); console.warn('[streamxr] post rating failed:', err); };
      Promise.resolve(actions.ratePost(p, what)).then(res => { if (!(res && res.ok)) undo(res && res.error); }, undo);
    }

    // A poll choice on post p: vote for it, or take your vote back if it's already yours.
    function vote(p, k) {
      const before = voteOf(p), on = before !== k;
      voted.set(p.id, on ? k : -1); bump();
      const undo = err => { voted.set(p.id, before); bump(); console.warn('[streamxr] poll vote failed:', err); };
      Promise.resolve(actions.votePoll(p, on ? k : before, on)).then(res => { if (!(res && res.ok)) undo(res && res.error); }, undo);
    }

    // Open post i of the feed (its comments start loading), or go back to the feed.
    function openPost(i) {
      const p = items()[i];
      if (!p) return;
      const view = ns.ytVr.comments.create({
        comments: s => actions.postComments(p, s), replies: c => actions.replies(c), rateComment: (c, w) => actions.rateComment(c, w),
      });
      view.show(p.id);
      opened = { i, post: p, view, feedScroll: scroll };
      scroll = 0; bump();
    }
    function closePost() {
      if (!opened) return;
      scroll = opened.feedScroll; opened = null; bump();
    }

    // The About page as the style's text page: the description, then the details and links.
    function aboutPage() {
      const a = about;
      if (!a) return { kind: 'page', text: '', facts: [], loading: about === undefined && !error,
        emptyText: error || tr('yt.channel.noAbout') };
      const facts = [
        // (YouTube writes "Joined Mar 2008" in English; the word is taken off and ours shown.)
        [tr('yt.channel.joined'), a.joined.replace(/^Joined\s*/i, '')], [tr('yt.channel.country'), a.country],
        [tr('yt.channel.views'), a.views], [tr('yt.channel.videoCount'), a.videoCount],
        [tr('yt.channel.subscribers'), a.subscribers], [tr('yt.channel.link'), a.url],
        ...a.links.map(l => [l.title || tr('yt.channel.otherLink'), l.url]),
      ].filter(f => f[1]).map(([label, value]) => ({ label, value }));
      return { kind: 'page', text: a.description, facts, loading: false, emptyText: '' };
    }

    // Load one more page of the current list (one request at a time).
    function loadNext() {
      if (!pager || loading || pager.done) return;
      const p = pager;
      loading = true; bump();
      p.next().catch(err => { if (p === pager) error = tr('yt.channel.tabFailed', { error: err && err.message || err }); })
        .finally(() => { if (p === pager) loading = false; bump(); });
    }

    // Start the current tab + sort from its first page (Featured has no list; About asks
    // for its page once per channel).
    function startList() {
      error = ''; page = 0; loading = false; scroll = 0; opened = null;
      if (tab === 'featured' || tab === 'about') {
        pager = null; bump();
        if (tab === 'about' && about === undefined) {
          const my = gen;
          Promise.resolve(actions.channelAbout(channelId)).then(a => { if (my === gen) { about = a || null; bump(); } },
            err => { if (my === gen) { about = null; error = tr('yt.channel.aboutFailed', { error: err && err.message || err }); bump(); } });
        }
        return;
      }
      try {
        pager = tab === 'store' ? oncePager(() => actions.channelList(channelId, 'store')) : actions.channelList(channelId, tab, sort);
      } catch (err) { pager = null; error = String(err && err.message || err); }
      bump();
      loadNext();
    }

    // ---- searching the channel (the search button on the tab row)
    // Start or stop typing into the search field (the keys come through host.typeInto).
    function searchFocus(on) {
      if (!search || search.focused === on) return;
      search.focused = on; host.typeInto(on); bump();
    }
    // Search mode: the tab row becomes the search bar (remembering the tab to go back to).
    function startSearch() {
      if (search) { searchFocus(true); return; }
      search = { text: '', focused: false, query: '', back: { tab, sort } };
      pager = null; page = 0; loading = false; error = ''; opened = null;
      searchFocus(true); bump();
    }
    function endSearch() {
      if (!search) return;
      const back = search.back;
      searchFocus(false); search = null;
      tab = back.tab; sort = back.sort; startList();
    }
    // Search the channel for what's typed (nothing to do when it's empty), and stop typing.
    function submitSearch() {
      const q = search.text.trim();
      searchFocus(false);
      if (!q) return;
      search.query = q; tab = 'search'; sort = q;                     // channelList(id, 'search', query)
      startList();
    }
    function searchKey(k) {
      if (k === 'Enter') submitSearch();
      else if (k === 'Escape') searchFocus(false);
      else if (k === 'Backspace') { search.text = search.text.slice(0, -1); bump(); }
      else if (k.length === 1) { search.text += k; bump(); }
    }

    function openChannel(id, subscribedHint) {
      if (!id || id === channelId) return;
      if (search) { searchFocus(false); search = null; }
      channelId = id; header = null; error = ''; pager = null; page = 0; loading = false; featured = null; about = undefined; scroll = 0; opened = null;
      tab = 'videos'; sort = SORTS.videos[0].id;
      sub = subscribedHint == null ? 'unknown' : subscribedHint ? 'subscribed' : 'unsubscribed';
      const my = ++gen;
      bump();
      Promise.resolve(actions.channelHeader(id)).then(h => {
        if (my !== gen) return;
        header = h;
        if (h && h.subscribed != null && sub === 'unknown') sub = h.subscribed ? 'subscribed' : 'unsubscribed';
        const lists = tabs().filter(t => t.id !== 'featured');
        if (!lists.some(t => t.id === tab) && lists.length) { tab = lists[0].id; sort = firstSort(tab); }
        startList();
        // The featured video (from the channel's Home tab) arrives in the background.
        if (h && h.tabs && h.tabs.home && actions.channelFeatured) {
          Promise.resolve(actions.channelFeatured(id)).then(item => {
            if (my === gen && item) { featured = item; bump(); }
          }, err => console.warn('[streamxr] featured video unavailable:', err && err.message || err));
        }
      }, err => {
        if (my !== gen) return;
        error = tr('yt.channel.failed', { error: err && err.message || err }); bump();
      });
    }

    // The playing video's channel (with the watch page's subscribed state as a first guess).
    function openCurrent() {
      const s = actions.state();
      openChannel(s.channelId, s.details && s.details.canSubscribe ? !!s.details.subscribed : null);
    }

    // Subscribe / Unsubscribe through the actions; the button shows "…" meanwhile and only
    // changes state when YouTube confirms it.
    function setSubscribed(on) {
      const before = sub, id = channelId;
      sub = 'busy'; bump();
      Promise.resolve(actions.setSubscribed(id, on)).then(res => {
        if (id !== channelId) return;
        if (res && res.ok) sub = on ? 'subscribed' : 'unsubscribed';
        else { sub = before; console.warn('[streamxr] subscription change failed:', res && res.error); }
        bump();
      }, err => { if (id === channelId) { sub = before; console.warn('[streamxr] subscription change failed:', err); bump(); } });
    }

    function event(ev) {
      if (!channelId) return;
      // Searching: the search bar's controls and the typed keys.
      if (ev.type === 'search') { startSearch(); return; }
      if (search && !opened) {
        if (ev.type === 'back') { endSearch(); return; }
        if (ev.type === 'field') { searchFocus(true); return; }
        if (ev.type === 'clear') { search.text = ''; search.query = ''; pager = null; page = 0; loading = false; error = ''; searchFocus(false); bump(); return; }   // start over, not typing
        if (ev.type === 'submit') { submitSearch(); return; }
        if (ev.type === 'key') { if (search.focused) searchKey(ev.value); return; }
      }
      if (ev.type === 'action' && ev.value === 'subscribe') {
        // Unsubscribing asks first, in the shell's dialog (it can't be undone with one click).
        if (sub === 'subscribed') {
          const id = channelId, name = (header && header.title) || '';
          Promise.resolve(host.confirm ? host.confirm({ title: tr('yt.unsubscribeFrom', { name }), confirm: tr('yt.unsubscribe'), danger: true }) : true)
            .then(yes => { if (yes && id === channelId && sub === 'subscribed') setSubscribed(false); });
        }
        else if (sub === 'unsubscribed' || sub === 'unknown') setSubscribed(true);
      } else if (ev.type === 'tab') {
        const t = ev.value;
        if (t !== tab && SORTS[t]) { tab = t; sort = firstSort(t); startList(); }
        else if (t === tab) closePost();                                   // the Posts tab again: back to the feed
      } else if (ev.type === 'postlike' || ev.type === 'postdislike' || ev.type === 'postcomments' || ev.type === 'vote') {
        const [i, k] = ev.value.split('.').map(Number);
        const p = tab === 'posts' ? items()[i] : null;
        if (!p) return;
        if (ev.type === 'postcomments') { if (!opened) openPost(i); }
        else if (ev.type === 'vote') { if (p.poll && p.poll.choices[k]) vote(p, k); }
        else if (p.actions) ratePost(p, ev.type === 'postlike' ? 'like' : 'dislike');
      } else if (opened && ev.type === 'back') closePost();
      else if (opened && ev.type === 'pill') { if (opened.view.setSort(ev.value)) { scroll = 0; bump(); } }
      else if (opened && ev.type === 'children') opened.view.toggleReplies(+ev.value);
      else if (opened && ev.type === 'more') opened.view.moreReplies(+ev.value);
      else if (opened && (ev.type === 'like' || ev.type === 'dislike')) opened.view.rate(ev.value, ev.type);   // a comment's 👍 / 👎
      else if (ev.type === 'pill') {
        if (ev.value !== sort) { sort = ev.value; startList(); }
      } else if (ev.type === 'page') {
        page = ev.value === 'next' ? Math.min(pageCount() - 1, page + 1) : Math.max(0, page - 1); bump();
      } else if (ev.type === 'item') {
        const it = tab === 'store' ? null : items()[page * perPage + +ev.value];    // products aren't clickable
        if (it) actions.openVideo(it.id, it.playlistId);
      } else if (ev.type === 'featured' && featured) actions.openVideo(featured.id);
      else if (ev.type === 'post') {                                      // a post's attached video
        const p = tab === 'posts' ? items()[+ev.value] : null;
        if (p && p.video) actions.openVideo(p.video.id, p.video.playlistId);
      } else if (ev.type === 'scroll') { scroll = Math.max(0, Math.min(host.style.maxScroll(), ev.value)); bump(); }
    }

    // After a draw: keep the scroll where the style clamped it.
    function afterDraw() {
      if (tab === 'posts' || tab === 'about') scroll = host.style.shownScroll();
    }

    // While shown: open the playing video's channel if none is shown yet,
    // keep a page of videos ahead of where you are (Posts: the next posts
    // once you scroll near the end). Returns the Profile model.
    function model(frame) {
      if (!channelId) openCurrent();
      const nearEnd = tab === 'posts' ? host.style.maxScroll() - scroll < POSTS_AHEAD : page >= pageCount() - 2;
      if (opened) { if (nearEnd) opened.view.loadMore(); }                // an opened post: its next comments
      else if (pager && !loading && !pager.done && nearEnd) loadNext();
      const h = header, f = tab === 'featured' ? featured : null;
      const isLoading = loading || (!!channelId && !header && !error);
      const message = error || (pager && pager.done ? tr('yt.nothingYet') : '');
      const body = tab === 'about' ? aboutPage()
        : opened ? { kind: 'post', post: feedPost(opened.post, opened.i), back: tr('yt.channel.posts'), thread: opened.view.content(opened.post.comments) }
        : tab === 'posts' ? { kind: 'feed', posts: items().map(feedPost), loading: isLoading, emptyText: message || tr('yt.channel.noPosts') }
        : null;
      const card = tab === 'store' ? productCard : it => ns.ytVr.card(it, { showChannel: false });
      const m = {
        header: h ? { title: h.title, badge: h.badge, avatar: h.avatar, banner: h.banner,
          stats: [h.handle, h.subscribers, h.videoCount].filter(Boolean).join('  ·  ') } : null,
        loadingTitle: tr('yt.channel.loading'),
        action: channelId ? { id: 'subscribe', look: BUTTON[sub].look, label: BUTTON[sub].key ? tr(BUTTON[sub].key) : '…' } : null,
        tabs: tabs(), tab, pills: search ? [] : named(SORTS[tab] || []), pill: sort,
        search: !search && !!(header && header.tabs && header.tabs.search),   // the channel can be searched
        field: search ? { id: 'query', text: search.text, placeholder: tr('yt.channel.searchIn', { name: (header && header.title) || tr('yt.channel.thisChannel') }),
          focused: search.focused, button: tr('yt.search'), clearable: !!search.text || !!pager } : null,
        items: body ? [] : items().slice(page * perPage, page * perPage + perPage).map(card),
        page, pageCount: pageCount(), more: !!pager && !pager.done, loading: isLoading,
        emptyText: search && !search.query ? tr('yt.channel.searchHint')
          : isLoading ? tr(search ? 'yt.searching' : 'yt.loading')
          : search && pager && pager.done && !items().length ? tr('yt.noResults', { query: search.query }) : message || tr('yt.nothingYet'),
        featured: f ? { thumb: f.thumb, flags: f.live ? [ns.ytVr.liveFlag()] : [], kicker: tr('yt.channel.featuredVideo'), title: f.title,
          stats: [f.views, f.age].filter(Boolean).join(' · '), description: f.description } : null,
        body, scroll, now: frame.now / 1000,
      };
      // Redraw on any change, while scrolling, and ~30 times a second while the loading
      // indicator shows (a body loading, or the grid's first page).
      const spinning = body ? body.loading || (body.thread && (body.thread.loading || body.thread.threads.some(t => t.children && t.children.loading)))
        : isLoading && !m.items.length;
      const cv = opened ? opened.view.version() : '';
      return { model: m, key: `${ver}|${cv}|${Math.round(scroll)}|${spinning ? Math.floor(frame.now / 33) : ''}` };
    }

    // A subscription change made elsewhere (the controls' Subscribe button) for channel `id`.
    function noteSubscribed(id, on) {
      if (id === channelId && sub !== 'busy') { sub = on ? 'subscribed' : 'unsubscribed'; bump(); }
    }

    // The channel name on the controls panel: fold the panel if it already shows the playing
    // video's channel, else show that channel and open the panel.
    function showCurrent() {
      const s = actions.state();
      if (host.isOpen() && channelId === s.channelId) { host.close(); return; }
      openCurrent();
      host.open();
    }

    return { model, event, afterDraw, opened: openCurrent, openChannel, openCurrent, showCurrent, noteSubscribed, channelId: () => channelId };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.channelPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
