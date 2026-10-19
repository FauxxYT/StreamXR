// YouTube's "Channel" panel (Profile style): which channel is open, its header, the chosen
// tab and sort, the loaded videos (a pager that loads more pages as you page through), the
// current page, the channel's featured video (a "Featured" tab, first, when the channel
// has one), and the Subscribe button (unsubscribing asks in a dialog), with the notification
// bell beside it once subscribed (a round button opening a menu of YouTube's choices). Three tabs aren't
// video grids: Store (product cards, just to look at: buying leads off YouTube), Posts (a
// scrolling feed, more loading near its end) and About (a scrolling page). On a post you
// can like / dislike it and vote in its poll (signed in; shown at once, undone if YouTube
// refuses), and open it: the post with its comments under it (the Comments tab's code,
// comments.js), and a back button to the feed where you left it. The search button (on
// channels YouTube lets you search) turns the tab row into a search bar: type (the keys come
// through host.typeInto), Search, and the channel's matching videos fill the grid; back
// returns to the tab you were on. Opening the panel (or
// showing it with no channel yet) shows the playing video's channel, and while it shows that
// channel it follows to the next video's (tick). A channel with memberships has a Membership tab
// (its levels, prices and perks; joining on desktop), and a members-only video brings up a
// dialog offering it (offerDialog). A panel controller:
// see panels.js. Extra calls for the controls panel:
//   openChannel(channelId, subscribedHint)  show a channel (a no-op if it's already shown)
//   openCurrent()                           show the playing video's channel
//   showCurrent()                           the channel name was clicked: fold the panel if it
//                                           shows that channel, else open it on it
//   show(id, hint)                          show a channel picked elsewhere (the You panel's
//                                           Channels list; hint: { subscribed, notifications })
//                                           and open the panel
//   noteSubscribed(id, on)                  a subscription changed elsewhere (controls panel)
//   channelId()                             the channel shown (or null)
//   actions used: channelHeader(id) -> Promise of header (youtube-channel.js channel()),
//   channelList(id, tab, sort) -> pager (Store: Promise of [products]), channelAbout(id) ->
//   Promise of about | null, channelFeatured(id) -> Promise of item | null,
//   setSubscribed(id, on) -> Promise of { ok, error }, setBell(option) -> Promise of { ok, error },
//   channelOffer(params) -> Promise of offer | null (youtube-channel.js offer()),
//   bellMatches(label, state), openVideo(id, playlistId), state(),
//   ratePost(post, what), votePoll(post, index, on) -> Promise of { ok, error },
//   postComments(post, sort) -> pager, replies(comment), rateComment(comment, what).
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (strings-en.js)
  // Tabs and sort pills with their names: 'yt.channel.<id>' in the string tables.
  const named = list => list.map(x => ({ id: x.id, label: tr(`yt.channel.${x.id}`) }));

  // The tabs the panel can show (only those the channel has; About when it has an About
  // page), and each one's sort choices.
  const TABS = ['videos', 'shorts', 'live', 'playlists', 'podcasts', 'shows', 'posts', 'store', 'about'].map(id => ({ id }));
  const VIDEO_SORTS = [{ id: 'latest' }, { id: 'popular' }, { id: 'oldest' }];
  const SORTS = { videos: VIDEO_SORTS, shorts: VIDEO_SORTS, live: VIDEO_SORTS,
    playlists: [{ id: 'newest' }, { id: 'lastAdded' }],
    podcasts: [], shows: [], featured: [], posts: [], store: [], about: [], membership: [] };     // these have no sort choices
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
    let bell = null;                          // the channel's bell: { state, options: [{ label, params, selected }], busy } | null
    let offerParams = null, offer;            // its membership offer: the params to ask with, and the offer (undefined: not asked, null: none)
    let member, memberAsk = null;             // your membership of it (undefined: not asked, null: none), and the request for it
    let gen = 0, ver = 0;                     // gen: ignore answers for a channel/list no longer shown
    const bump = () => { ver++; };

    const items = () => (pager ? pager.items : []);
    // The list shows as the posts feed (the Posts tab, or a membership's members-only posts).
    const feedNow = () => tab === 'posts' || (tab === 'membership' && sort === 'memberPosts');
    // The Membership tab shows one of your membership's lists (its videos or posts) rather than a page.
    const memberList = () => tab === 'membership' && (sort === 'memberVideos' || sort === 'memberPosts');
    const pageCount = () => Math.max(1, Math.ceil(items().length / perPage));
    // The tabs this channel has (all of TABS until its header arrives; About when it has an
    // About page), "Featured" first once its featured video is known, "Membership" last when the
    // channel has that tab or its membership offer can be asked for (a member gets the tab
    // but no Join button, so no offer).
    const tabs = () => named([...(featured ? [FEATURED_TAB] : []),
      ...(header && header.tabs ? TABS.filter(t => (t.id === 'about' ? !!header.aboutToken : header.tabs[t.id])) : TABS),
      ...(offerParams || (header && header.tabs && header.tabs.membership) ? [{ id: 'membership' }] : [])]);

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
        flags: p.membersOnly ? [{ text: tr('yt.card.membersOnly'), bg: 'chatMember', fg: 'onChatMember' }] : [],
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
      if (tab === 'membership') {
        if (!sort) sort = 'perks';
        if (memberList()) {                    // your membership's videos or posts, from the one request
          const want = sort === 'memberVideos' ? 'videos' : 'posts';
          pager = oncePager(() => loadMember().then(m => (m ? m[want] : [])));
          bump(); loadNext(); return;
        }
        pager = null; bump();
        if (offerParams) loadOffer(); else loadMember();
        return;
      }
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

    // bellHint: the channel's bell from elsewhere (the Channels list's notifications), until
    // the header brings its own.
    function openChannel(id, subscribedHint, bellHint) {
      if (!id || id === channelId) return;
      if (search) { searchFocus(false); search = null; }
      channelId = id; header = null; error = ''; pager = null; page = 0; loading = false; featured = null; about = undefined; scroll = 0; opened = null; offerParams = null; offer = undefined; offerLoading = false; member = undefined; memberAsk = null;
      tab = 'videos'; sort = SORTS.videos[0].id;
      sub = subscribedHint == null ? 'unknown' : subscribedHint ? 'subscribed' : 'unsubscribed';
      bell = bellOf(bellHint);
      const my = ++gen;
      bump();
      Promise.resolve(actions.channelHeader(id)).then(h => {
        if (my !== gen) return;
        header = h;
        // YouTube's own answer wins over the hint (the watch page's can be the previous video's).
        if (h && h.subscribed != null && sub !== 'busy') sub = h.subscribed ? 'subscribed' : 'unsubscribed';
        if (!bell && h) bell = bellOf(h.notifications);
        if (!offerParams && h && h.offerParams) offerParams = h.offerParams;   // (a channel with memberships: its Membership tab)
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

    // ---- the membership offer (the Membership tab: levels, prices, perks; joining on desktop)
    // Ask for the offer once per channel (actions.channelOffer: youtube-channel.js offer()).
    let offerLoading = false;
    function loadOffer() {
      if (offer !== undefined || offerLoading || !offerParams) return;
      const id = channelId;
      offerLoading = true; bump();
      const done = o => { if (id !== channelId) return; offer = o || null; offerLoading = false; bump(); };
      Promise.resolve(actions.channelOffer(offerParams)).then(done,
        err => { console.warn('[streamxr] membership offer unavailable:', err && err.message || err); done(null); });
    }
    // Ask once per channel for your membership of it (actions.channelMembership: youtube-channel.js
    // membership()); the Promise of it (null: none).
    function loadMember() {
      if (!memberAsk) {
        const id = channelId;
        const done = m => { if (id === channelId) { member = m || null; bump(); } return m || null; };
        memberAsk = Promise.resolve(actions.channelMembership(id)).then(done,
          err => { console.warn('[streamxr] membership unavailable:', err && err.message || err); return done(null); });
      }
      return memberAsk;
    }
    // The Membership tab's pills: a member's Perks, Videos and Posts (none for the Join offer).
    const MEMBER_PILLS = [{ id: 'perks' }, { id: 'memberVideos' }, { id: 'memberPosts' }];
    const pillsNow = () => (tab === 'membership' ? (member ? MEMBER_PILLS : []) : SORTS[tab] || []);

    // The Membership tab as the style's 'tiers' page. A member: the channel's picture and name,
    // your level, "Member · 3 months", then your perks (with their emoji / loyalty badges).
    // Otherwise the Join offer: "Join this channel", YouTube's lines, then each level (its
    // price, a greyed "Join on desktop": paying stays on desktop, its disclaimer, its perks),
    // and the footnote.
    function membershipPage() {
      if (!offerParams) {
        if (!member) return { kind: 'tiers', tiers: [], loading: member === undefined,
          emptyText: member === undefined ? tr('yt.loading') : tr('yt.channel.membershipOnDesktop') };
        return { kind: 'tiers', image: member.avatar || (header && header.avatar) || '', kicker: (header && header.title) || '',
          title: member.tier, intro: [[member.status, member.length].filter(Boolean).join(' · ')].filter(Boolean),
          tiers: [{ title: member.perksTitle || tr('yt.channel.perks'), items: member.perks }] };
      }
      if (!offer) return { kind: 'tiers', tiers: [], loading: offerLoading || offer === undefined,
        emptyText: offerLoading || offer === undefined ? tr('yt.loading') : tr('yt.channel.noMembership') };
      return { kind: 'tiers', image: offer.image, kicker: offer.channel, title: offer.title,
        intro: [offer.subtitle, offer.alert].filter(Boolean),
        tiers: offer.tiers.map((t, i) => ({ title: t.title, price: t.price, note: t.disclaimer, items: t.perks,
          button: { id: `join${i}`, label: tr('yt.channel.joinOnDesktop'), enabled: false } })),
        footer: offer.footer };
    }

    // ---- the notification bell (signed in and subscribed, when YouTube offers one)
    // The bell from a header's or the Channels list's `notifications` ({ state | current,
    // options }), with the current choice marked (selected; else the one the state or the
    // current label names), or null when it has no choices.
    function bellOf(n) {
      if (!n || !n.options || !n.options.length) return null;
      const options = n.options.map(o => ({ ...o }));
      if (!options.some(o => o.selected)) {
        const now = options.find(o => n.state && actions.bellMatches && actions.bellMatches(o.label, n.state))
          || options.find(o => n.current && String(n.current).toLowerCase().includes(String(o.label).toLowerCase()));
        if (now) now.selected = true;
      }
      return { options, busy: false };
    }
    // A choice's icon (Material Symbols) from its label (YouTube's words: All / Personalized / None).
    const bellIcon = label => (/^all/i.test(label) ? 'notifications_active' : /none|off/i.test(label) ? 'notifications_off' : 'notifications');
    // The bell's menu (host.openMenu('action:bell')): YouTube's choices, the current one ticked.
    function menu(local) {
      if (local !== 'action:bell' || !bell) return null;
      return { note: tr('yt.bell.title'), items: bell.options.map(o => ({ id: o.params, text: o.label, on: !!o.selected, icons: [bellIcon(o.label)], disabled: bell.busy })) };
    }
    // Choose a bell setting; the tick moves only when YouTube's answer confirms it (or, with no
    // state in the answer, when it says OK).
    function chooseBell(params) {
      const b = bell, o = b && b.options.find(x => x.params === params), id = channelId;
      if (!o || o.selected || b.busy) return;
      b.busy = true; bump();
      Promise.resolve(actions.setBell(o)).then(res => {
        if (res && res.ok) b.options.forEach(x => { x.selected = x === o; });
        else console.warn('[streamxr] bell change failed:', res && res.error);
      }, err => console.warn('[streamxr] bell change failed:', err)).finally(() => { b.busy = false; if (id === channelId) bump(); });
    }

    function event(ev) {
      if (!channelId) return;
      if (ev.type === 'action' && ev.value === 'bell') { if (bell) host.openMenu('action:bell'); return; }
      if (ev.type === 'menu' && ev.menu === 'action:bell') { chooseBell(ev.value); return; }
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
        const p = feedNow() ? items()[i] : null;
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
        const p = feedNow() ? items()[+ev.value] : null;
        if (p && p.video) actions.openVideo(p.video.id, p.video.playlistId);
      } else if (ev.type === 'scroll') { scroll = Math.max(0, Math.min(host.style.maxScroll(), ev.value)); bump(); }
    }

    // After a draw: keep the scroll where the style clamped it.
    function afterDraw() {
      if (feedNow() || tab === 'about') scroll = host.style.shownScroll();
    }

    // While shown: open the playing video's channel if none is shown yet,
    // keep a page of videos ahead of where you are (Posts: the next posts
    // once you scroll near the end). Returns the Profile model.
    function model(frame) {
      if (!channelId) openCurrent();
      const nearEnd = feedNow() ? host.style.maxScroll() - scroll < POSTS_AHEAD : page >= pageCount() - 2;
      if (opened) { if (nearEnd) opened.view.loadMore(); }                // an opened post: its next comments
      else if (pager && !loading && !pager.done && nearEnd) loadNext();
      const h = header, f = tab === 'featured' ? featured : null;
      const isLoading = loading || (!!channelId && !header && !error);
      const message = error || (pager && pager.done ? tr('yt.nothingYet') : '');
      const body = tab === 'about' ? aboutPage() : tab === 'membership' && !memberList() ? membershipPage()
        : opened ? { kind: 'post', post: feedPost(opened.post, opened.i), back: tr('yt.channel.posts'), thread: opened.view.content(opened.post.comments) }
        : feedNow() ? { kind: 'feed', posts: items().map(feedPost), loading: isLoading, emptyText: message || tr('yt.channel.noPosts') }
        : null;
      // (square pictures, podcasts' covers, show whole in the standard card)
      const card = tab === 'store' ? productCard : it => {
        const c = ns.ytVr.card(it, { showChannel: false });
        return c.square && !c.fit ? { ...c, fit: 'contain' } : c;
      };
      const m = {
        header: h ? { title: h.title, badge: h.badge, avatar: h.avatar, banner: h.banner,
          stats: [h.handle, h.subscribers, h.videoCount].filter(Boolean).join('  ·  ') } : null,
        loadingTitle: tr('yt.channel.loading'),
        action: channelId ? { id: 'subscribe', look: BUTTON[sub].look, label: BUTTON[sub].key ? tr(BUTTON[sub].key) : '…' } : null,
        // The bell, beside Subscribed: its icon shows the current choice.
        iconAction: channelId && sub === 'subscribed' && bell ? { id: 'bell', look: bell.busy ? 'busy' : 'secondary',
          icon: bellIcon((bell.options.find(o => o.selected) || { label: '' }).label) } : null,
        tabs: tabs(), tab, pills: search ? [] : named(pillsNow()), pill: sort,
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

    // A channel picked elsewhere (the You panel's Channels list): show it and open the panel.
    // hint: { subscribed, notifications } from that list, tab (optional): the tab to open on
    // (e.g. 'posts'; the first one it has if it lacks that).
    function show(id, hint = {}) {
      if (id !== channelId) openChannel(id, hint.subscribed, hint.notifications);
      if (hint.offerParams) offerParams = hint.offerParams;
      if (hint.offer) offer = hint.offer;
      if (hint.tab && SORTS[hint.tab] && hint.tab !== tab) {
        closePost();
        tab = hint.tab; sort = firstSort(tab);
        if (header) startList(); else bump();       // (before the header arrives, its callback starts the list)
      }
      if (!host.isOpen()) host.open();
    }

    // Every frame (shown or not): follow the playing video. When another video's channel starts
    // playing and the panel still shows the previous video's channel (you didn't go elsewhere
    // in it, search or open a post), it shows the new one.
    let playing = null;                       // the playing video's channel at the last tick
    // A members-only video (st.membersOnly, once per video): ask for its channel's offer, then a
    // dialog: "Members only: <channel>", YouTube's line about the level it needs, and See perks
    // (this panel on the channel's Membership tab) or OK. Without an offer, just OK.
    let offeredFor = null;                    // the members-only video already asked about
    let waitingSince = 0, waitingFor = null;  // waiting for that video's offer params: since when (ms), for which video
    const OFFER_WAIT_MS = 3000;
    let normalSince = 0;                      // since when (ms) no members-only video has been playing
    function offerDialog(mo) {
      Promise.resolve(mo.offerParams ? actions.channelOffer(mo.offerParams) : null).catch(() => null).then(o => {
        const d = { title: tr('yt.members.title', { name: (o && o.channel) || '' }), text: (o && o.alert) || tr('yt.membersOnlyVideo') };
        if (!o) return host.confirm({ ...d, confirm: tr('yt.members.ok'), cancel: null });
        return Promise.resolve(host.confirm({ ...d, confirm: tr('yt.members.seePerks'), cancel: tr('yt.members.ok') })).then(yes => {
          if (yes) show(mo.channelId, { tab: 'membership', offerParams: mo.offerParams, offer: o });
        });
      });
    }

    function tick(frame) {
      const mo = frame && frame.st && frame.st.membersOnly;
      // (Each time one is opened: a playing video that isn't one clears it. The page's data
      // naming the offer can come a moment after the video: wait up to OFFER_WAIT_MS for it.)
      if (!mo) {                              // (a normal video for a moment: the next members-only one asks again)
        waitingSince = 0;
        if (!normalSince) normalSince = frame.now;
        if (frame.now - normalSince > 1500) offeredFor = null;
      }
      else normalSince = 0;
      if (mo && mo.videoId && mo.videoId !== offeredFor && host.confirm) {
        if (!waitingSince || waitingFor !== mo.videoId) { waitingSince = frame.now; waitingFor = mo.videoId; }
        if (mo.offerParams || frame.now - waitingSince > OFFER_WAIT_MS) {
          offeredFor = mo.videoId; waitingSince = 0;
          offerDialog(mo);
        }
      }
      const now = frame && frame.st && frame.st.channelId;
      if (!now || now === playing) return;
      const was = playing;
      playing = now;
      if (was && channelId === was && !search && !opened) openCurrent();
    }

    return { model, event, menu, tick, afterDraw, opened: openCurrent, openChannel, openCurrent, showCurrent, show, noteSubscribed, channelId: () => channelId };
  }

  ns.ytVr = ns.ytVr || {};
  ns.ytVr.channelPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
