// The signed-in Subscriptions page, read without leaving the watch page: the feed of new
// videos from subscribed channels (with its filter chips), the "Manage" list of subscribed
// channels, Subscribe / Unsubscribe for any channel, and each channel's notification bell.
//
// UNVERIFIED: all of this needs a signed-in YouTube, and it was written while signed out
// (where every request only returns a "Sign in" message). Endpoints and parameters follow
// YouTube.js's documented signed-in calls (Oct 2026); the response shapes follow what the
// same feeds look like elsewhere (Home, channel tabs). Test it signed in before building VR
// UI on it, and fix the readers here if the shapes differ. Lists are pagers (`p.next()`,
// see youtube-data.js). Builds on youtube-channel.js and youtube-home.js (load them first).
(function (ns) {
  'use strict';

  const D = ns.youtubeData, C = ns.youtubeChannel, H = ns.youtubeHome;
  const { strOf, dig, findKey, bestImage, badgeFromData } = D;

  // Subscribe / Unsubscribe request params (fixed values, from YouTube.js).
  const SUBSCRIBE_PARAMS = 'EgIIAhgA', UNSUBSCRIBE_PARAMS = 'CgIIAhgA';

  // Did YouTube treat this request as signed in? (Every response's tracking data carries a
  // logged_in flag; a signed-out Subscribe still answers "OK" but changes nothing.)
  function answeredSignedIn(r) {
    for (const s of dig(r, 'responseContext', 'serviceTrackingParams') || []) {
      for (const p of s.params || []) if (p.key === 'logged_in' || p.key === 'yt_li') return p.value === '1';
    }
    return false;
  }

  // checkSignIn() -> Promise of true/false: does YouTube see our requests as signed in? A
  // quick test that the signed-in Authorization header (youtube-data.js sidAuth) works:
  //   await __streamxr.youtubeSubscriptions.checkSignIn()   (in the page console, signed in)
  async function checkSignIn() {
    return answeredSignedIn(await D.innertube('browse', { browseId: 'FEsubscriptions' }));
  }

  // checkAccount() -> Promise of { signedIn, sameAccount, channelIdentity }: are our requests
  // answered as the SAME YouTube identity the page is using? Compares the identity id every
  // signed-in answer carries (responseContext...datasyncId: "<channel id>||<account id>" for a
  // channel identity, "<account id>||" for the default one) with the page's own (ytcfg
  // DATASYNC_ID). channelIdentity: the page acts as a channel identity (brand channel)
  // rather than the account's default one.
  //   await __streamxr.youtubeSubscriptions.checkAccount()   (in the page console, signed in)
  async function checkAccount() {
    const r = await D.innertube('browse', { browseId: 'FEsubscriptions' });
    const theirs = dig(r, 'responseContext', 'mainAppWebResponseContext', 'datasyncId') || '';
    const ours = (window.ytcfg && window.ytcfg.get && window.ytcfg.get('DATASYNC_ID')) || '';
    const [first, second] = ours.split('||');
    return { signedIn: answeredSignedIn(r), sameAccount: !!theirs && theirs === ours, channelIdentity: !!(first && second) };
  }

  // The sign-in note a signed-out request gets instead of content ('' when there is none).
  function signInMessage(r) {
    const m = findKey(r.contents, 'backgroundPromoRenderer') || findKey(r.contents, 'messageRenderer');
    return m ? strOf(m.title) || strOf(m.text) : '';
  }

  // ---------------------------------------------------------------- the feed
  // feed(filter) -> pager over new videos from subscribed channels, newest first (Shorts
  //   included, flagged `short`). filter: a chip's text ('All' by default). YouTube has
  //   documented chips such as Today, Videos, Shorts, Live, Posts, Continue watching and
  //   Unwatched; which ones appear varies by account and experiment, so after the first page
  //   p.chips = [{ text, selected }] lists the real ones. Also after the first page:
  //   p.shelves = [{ title, items }] (e.g. a Shorts row or YouTube's "Most relevant" block),
  //   p.posts (community posts mixed in), p.message (the sign-in note, '' when signed in).
  function feed(filter = 'All') {
    const p = D.pager(async token => {
      let r;
      if (token) r = await D.innertube('browse', { continuation: token });
      else {
        r = await D.innertube('browse', { browseId: 'FEsubscriptions' });
        p.message = signInMessage(r);
        const chips = H.chipsOf(r);
        p.chips = chips.map(({ text, selected }) => ({ text, selected }));
        const c = filter !== 'All' && chips.find(x => x.text.toLowerCase() === filter.toLowerCase());
        if (c && c.token) {
          r = await D.innertube('browse', { continuation: c.token });
          p.chips = p.chips.map(x => ({ text: x.text, selected: x.text === c.text }));
        }
      }
      const sections = H.sectionsOf(r);
      p.shelves.push(...sections.filter(s => s.title));
      p.posts.push(...sections.flatMap(s => s.posts));
      return { items: sections.filter(s => !s.title).flatMap(s => s.items), token: C.pageToken(r) };
    }, null);
    p.chips = []; p.shelves = []; p.posts = []; p.message = '';
    return p;
  }

  // ---------------------------------------------------------------- subscribed channels
  // A channel in the Manage list (channelRenderer): { id, title, handle, subscribers,
  //   videoCount, description, thumb, badge, subscribed, notifications: { current,
  //   options: [{ label, params, selected }] } }. Newer layouts swap the counts around (the
  //   handle in the subscriber slot, no video count at all - videoCount is then ''), so each
  //   text is sorted by what it looks like. Checked signed in (0.20.1) on 2 channels.
  function fromChannel(c) {
    if (!c || !c.channelId) return null;
    const texts = [strOf(c.subscriberCountText), strOf(c.videoCountText)].filter(Boolean);
    const handle = texts.find(t => /^@/.test(t)) || '';
    const subscribers = texts.find(t => /subscriber/i.test(t)) || '';
    const videoCount = texts.find(t => /video/i.test(t)) || '';
    // The full button (state + bell menu), or for some channels only a stub
    // `subscriptionButton: { subscribed }` with no bell menu (seen in the Manage list, where
    // the stub even said false for a subscribed channel; channels() corrects that).
    const sub = findKey(c.subscribeButton, 'subscribeButtonRenderer') || c.subscriptionButton || {};
    return {
      id: c.channelId, title: strOf(c.title), handle, subscribers, videoCount,
      description: strOf(c.descriptionSnippet), thumb: bestImage(c.thumbnail), badge: badgeFromData(c.ownerBadges),
      subscribed: sub.subscribed != null ? !!sub.subscribed : null,
      notifications: notificationOptions(sub),
    };
  }

  // The notification bell's choices inside a subscribe button: { current, options: [{ label,
  // params, selected }] } (labels like "All", "Personalized", "None"). Each choice carries
  // the params YouTube's own menu sends, so setNotifications() needs no encoding of its own.
  function notificationOptions(sub) {
    const options = [];
    for (const item of C.findKeyAll(sub, 'menuServiceItemRenderer')) {
      const params = dig(findKey(item.serviceEndpoint, 'modifyChannelNotificationPreferenceEndpoint'), 'params');
      if (params) options.push({ label: strOf(item.text), params, selected: !!item.isSelected });
    }
    const toggle = findKey(sub, 'subscriptionNotificationToggleButtonRenderer');
    const state = toggle && (toggle.states || []).find(s => s.stateId === toggle.currentStateId);
    const current = strOf(dig(state, 'state', 'buttonRenderer', 'accessibilityData', 'accessibilityData', 'label'))
      || (options.find(o => o.selected) || {}).label || '';
    return { current, options };
  }

  // channels() -> pager over the subscribed channels (the "Manage" page, browse id
  // FEchannels), A-Z as YouTube lists them. p.message is the sign-in note while signed out.
  function channels() {
    const p = D.pager(async token => {
      const r = await D.innertube('browse', token ? { continuation: token } : { browseId: 'FEchannels' });
      if (!token) p.message = signInMessage(r);
      // Everything in this list is subscribed, whatever its button says (some only carry a
      // stub that says false). notifications.options is [] when YouTube offers no bell.
      const items = C.findKeyAll(r, 'channelRenderer').map(fromChannel).filter(Boolean)
        .map(c => ({ ...c, subscribed: true }));
      return { items, token: C.pageToken(r) };
    }, null);
    p.message = '';
    return p;
  }

  // ---------------------------------------------------------------- actions
  // An answer can be "OK" without anything changing (seen signed in: a bell change that
  // didn't stick), so success is read from what YouTube says the new state is. A real
  // Subscribe answer (checked signed in, 0.20.4) carries all of: a "Subscription added"
  // toast, updateSubscribeButtonAction { subscribed, channelId }, and a
  // subscriptionStateEntity { subscribed } (plus subscriptionNotificationStateEntity
  // { state: 'SUBSCRIPTION_NOTIFICATION_STATE_ALL' ... } for the bell).

  // The subscribed state YouTube reports in an answer (true/false), or null if it says none.
  function reportedSubscribed(r) {
    const act = C.findKeyAll(r, 'updateSubscribeButtonAction')[0];
    if (act && act.subscribed != null) return !!act.subscribed;
    const ent = C.findKeyAll(r, 'subscriptionStateEntity')[0];
    return ent && ent.subscribed != null ? !!ent.subscribed : null;
  }

  // subscribe(channelId) / unsubscribe(channelId) -> Promise of { ok, error? }. ok only when
  // YouTube's answer reports the new state. Works for any channel (not only the playing
  // video's, unlike youtubePage.subscribe(), which presses the page's own button).
  // Signed-in only. Resubscribing keeps the channel's previous bell setting.
  async function setSubscribed(channelId, on) {
    if (!D.signedIn()) return { ok: false, error: 'signed out' };
    try {
      const r = await D.innertube(on ? 'subscription/subscribe' : 'subscription/unsubscribe',
        { channelIds: [channelId], params: on ? SUBSCRIBE_PARAMS : UNSUBSCRIBE_PARAMS });
      if (!answeredSignedIn(r)) return { ok: false, error: 'YouTube treated the request as signed out' };
      if (r.error) return { ok: false, error: r.error.message };
      const now = reportedSubscribed(r);
      if (now === on) return { ok: true };
      return { ok: false, error: now === null ? 'YouTube did not confirm the change' : `YouTube still reports subscribed: ${now}` };
    } catch (err) { return { ok: false, error: String(err && err.message || err) }; }
  }
  const subscribe = id => setSubscribed(id, true);
  const unsubscribe = id => setSubscribed(id, false);

  // The bell state YouTube reports in an answer ('ALL', 'PERSONALIZED', 'OFF' ... - the end
  // of SUBSCRIPTION_NOTIFICATION_STATE_*), or null if it says none.
  function reportedBell(r) {
    const ent = C.findKeyAll(r, 'subscriptionNotificationStateEntity')[0];
    return ent && ent.state ? String(ent.state).replace(/^SUBSCRIPTION_NOTIFICATION_STATE_/, '') : null;
  }
  // Which reported states mean each menu label. Seen signed in: All = ALL, Personalized =
  // OCCASIONAL (0.20.5). None wasn't seen yet, so close variants are accepted.
  const BELL_STATES = { all: /^ALL$/, personalized: /PERSONALI[SZ]ED|DEFAULT|OCCASIONAL/, none: /OFF|NONE|NO_NOTIFICATIONS/ };

  // setNotifications(option) -> Promise of { ok, confirmed, state?, error? }: choose a bell
  // setting, where `option` is one of a channel's notifications.options (from channels()).
  // confirmed: YouTube's answer reported the new state and it matches; if the answer
  // reports no state at all, ok is true but confirmed is false (check the page).
  async function setNotifications(option) {
    if (!option || !option.params) return { ok: false, confirmed: false, error: 'no such option' };
    try {
      const r = await D.innertube('notification/modify_channel_preference', { params: option.params });
      if (!answeredSignedIn(r)) return { ok: false, confirmed: false, error: 'YouTube treated the request as signed out' };
      if (r.error) return { ok: false, confirmed: false, error: r.error.message };
      const state = reportedBell(r), want = BELL_STATES[String(option.label).toLowerCase()];
      if (state === null) return { ok: true, confirmed: false };
      const match = want ? want.test(state) : true;
      return match ? { ok: true, confirmed: true, state } : { ok: false, confirmed: false, state, error: `YouTube reports the bell as ${state}` };
    } catch (err) { return { ok: false, confirmed: false, error: String(err && err.message || err) }; }
  }

  ns.youtubeSubscriptions = { feed, channels, subscribe, unsubscribe, setNotifications, fromChannel, checkSignIn, checkAccount, answeredSignedIn, signedIn: D.signedIn };
})(globalThis.__streamxr = globalThis.__streamxr || {});
