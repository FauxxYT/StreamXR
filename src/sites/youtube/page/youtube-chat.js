// A live stream's chat, read the way YouTube's own chat frame reads it (docs/youtube.md,
// "Live chat"): the watch page says there is a chat and names its views (Top chat, Live chat);
// the chat frame's data (or the pop-out chat page's, when the page shows no chat) holds each
// view's token; a view's chat page (/live_chat?continuation=<that token>) carries the recent
// messages and the token to poll with, and live_chat/get_live_chat answers each poll with
// what's new and the next token. (The watch page's own view tokens load an empty chat page.)
// Turns YouTube's chat items into plain messages; knows nothing about VR.
//
//   ns.youtubeChat.info() -> null | { replay, views: [{ title, selected }] }
//     the watch page's chat (null when the video has none)
//   await ns.youtubeChat.views(opts) -> [{ title, selected, token }]   the views with the
//     tokens that load them (from the chat frame, else the pop-out page; kept a minute per
//     video); opts.skipFrame: ask the pop-out page (for checking it)
//   await ns.youtubeChat.open(token) -> { items, next, reactions, input, emojis, support, leaderboard }
//     a view's chat page; reactions: the reaction buttons (❤ 😄 🎉 ...; [] when the stream has
//     none, or signed out): [{ emoji (the character), label ("Send ❤"), token (what sends it) }];
//     input: the message box, { placeholder, max (characters), emojiCost (characters an emoji
//     counts for), params, prefix } or { restricted: why you can't chat }, or null (signed
//     out); emojis: the channel's own [{ id, shortcut (':_wave:'), image, label }]; support:
//     what its "$" menu offers ("Super Chat", "Gifts" ...); leaderboard: the Top fans button,
//     { params (loads the list), pointsKey, xp (your XP: "120 XP", or null) }, or null
//   await ns.youtubeChat.poll(next, pointsKey) -> { items, next, xp }   what's new since `next`
//     (xp: your XP when YouTube sent a new value, else undefined)
//   await ns.youtubeChat.topFans(params) -> { fans: [fan], you: fan | null }   the Top fans
//     list (fan: { rank ("1"), name, avatar, points ("30 XP"), badge, note (your row: YouTube's
//     line under it) }; badge: { title ("#1"), bg, fg } | null)
//   await ns.youtubeChat.react(reaction) -> true | false   send one (YouTube's feedback request)
//   await ns.youtubeChat.send(input, segments) -> true | false   post a message: segments
//     [{ text } | { emojiId }] (a channel emoji by its id)
//     items: changes in order, each one of
//       { op: 'add', msg }        a new message (see below)
//       { op: 'remove', id }      a message taken down (deleted, or replaced by a removal)
//       { op: 'removeAuthor', channelId }   every message by someone (banned / timed out)
//       { op: 'banner', banner }  the pinned message: { id, header, msg }
//       { op: 'unbanner', id }    the pinned message taken down
//     next: { token, timeoutMs } to poll with, or null when the chat has ended.
//   msg: { id, kind ('text' | 'paid' | 'sticker' | 'member' | 'notice'), author, avatar,
//     channelId, role ('owner' | 'moderator' | 'member' | null), verified, badge (a member
//     badge's image URL or ''), rank (a Top fan's mark before the name: { title ("#1"), bg, fg }
//     or null), runs: [{ text } | { emoji: { url, label } }], time (ms),
//     amount ('$5.00', paid and sticker), header (a membership's line, e.g. "Member for 6
//     months"), sticker (its image URL), colors ({ header, body, text } '#rrggbb', paid and
//     sticker) }
(function (ns) {
  'use strict';

  const D = ns.youtubeData;
  const { dig, findKey, strOf } = D;

  // ---------------------------------------------------------------- the watch page's chat
  // A chat's view selector -> [{ title, selected, token }] (only views with a token).
  function viewsIn(data) {
    const items = (findKey(data, 'sortFilterSubMenuRenderer') || {}).subMenuItems || [];
    return items.map(v => ({ title: v.title || '', selected: !!v.selected, token: dig(findKey(v, 'reloadContinuationData'), 'continuation') || '' }))
      .filter(v => v.token);
  }

  function info() {
    const lc = findKey(D.watchData(), 'liveChatRenderer');
    if (!lc) return null;
    const views = viewsIn(lc).map(({ title, selected }) => ({ title, selected }));
    return { replay: !!lc.isReplay, views: views.length ? views : [{ title: '', selected: true }] };
  }

  // The chat in a page's data, in either shape: a chat update's `liveChatContinuation` (the
  // chat frame, a view's chat page) or `liveChatRenderer`; both have actions and continuations.
  const chatIn = data => findKey(data, 'liveChatContinuation') || findKey(data, 'liveChatRenderer') || null;

  let viewCache = null;                                    // { video, at (ms), list }
  const VIEW_CACHE_MS = 60000;
  async function views(opts = {}) {
    const video = D.currentVideoId();
    if (!opts.skipFrame && viewCache && viewCache.video === video && Date.now() - viewCache.at < VIEW_CACHE_MS) return viewCache.list;
    let list = [];
    if (!opts.skipFrame) {                                 // the chat frame YouTube shows beside a live stream (same origin)
      try {
        const f = document.querySelector('#chatframe, ytd-live-chat-frame iframe');
        list = viewsIn(chatIn(f && f.contentWindow && f.contentWindow.ytInitialData));
      } catch (_) { /* no frame, or not readable */ }
    }
    if (!list.length) list = viewsIn(chatIn(await page(`/live_chat?is_popout=1&v=${encodeURIComponent(video)}`)));
    if (!list.length) throw new Error('live_chat: no chat views found');
    if (!opts.skipFrame) viewCache = { video, at: Date.now(), list };
    return list;
  }

  // ---------------------------------------------------------------- requests
  // The JSON object a page's HTML assigns to window["name"] (brace matching, skipping
  // strings), or null.
  function jsonAfter(text, name) {
    const at = text.indexOf(`${name}"] = {`);
    if (at < 0) return null;
    const i = text.indexOf('{', at);
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) { try { return JSON.parse(text.slice(i, j + 1)); } catch (_) { return null; } }
    }
    return null;
  }

  // The poll token in a chat update: { token, timeoutMs } or null (the chat ended).
  function nextOf(lcc) {
    const c = (lcc && lcc.continuations || [])[0] || {};
    const d = c.invalidationContinuationData || c.timedContinuationData || c.reloadContinuationData || null;
    return d && d.continuation ? { token: d.continuation, timeoutMs: +d.timeoutMs || 10000 } : null;
  }

  // A chat page's data (its ytInitialData), or null.
  async function page(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`live_chat: HTTP ${res.status}`);
    return jsonAfter(await res.text(), 'ytInitialData');
  }

  // Load a view's chat page: its recent messages (and pinned message), the token to poll with
  // and the reaction buttons.
  async function open(token) {
    const data = await page(`/live_chat?continuation=${encodeURIComponent(token)}`), lcc = chatIn(data);
    if (!lcc) throw new Error('live_chat: no chat data in the page');
    return { items: changes(lcc.actions), next: nextOf(lcc), reactions: reactionsIn(lcc), input: inputIn(lcc), emojis: emojisIn(lcc), support: supportIn(lcc),
      leaderboard: leaderboardIn(lcc, data) };
  }

  // ---------------------------------------------------------------- Top fans
  // The Top fans button in the chat's header (liveViewerLeaderboardChatEntryPointViewModel):
  // the params that load its list, and your XP (an entity YouTube sends under its key).
  function leaderboardIn(lcc, data) {
    const entry = findKey(lcc && lcc.header, 'liveViewerLeaderboardChatEntryPointViewModel');
    const params = entry && dig(findKey(entry, 'showEngagementPanelEndpoint'), 'globalConfiguration', 'params');
    if (!params) return null;
    return { params, pointsKey: entry.pointsEntityKey || '', xp: xpIn(data, entry.pointsEntityKey) || null };
  }
  // Your XP in a response's entity updates ("120 XP"), or undefined when it has none.
  function xpIn(resp, key) {
    const m = (dig(resp, 'frameworkUpdates', 'entityBatchUpdate', 'mutations') || [])
      .find(x => x && x.payload && x.payload.liveViewerLeaderboardPointsEntity && (!key || x.entityKey === key));
    return m ? m.payload.liveViewerLeaderboardPointsEntity.pointsCompactText || '' : undefined;
  }
  // A Top fan's mark (a crown button titled "#1" in YouTube's colours), or null.
  function rankOf(buttons) {
    const b = (buttons || []).map(x => x && x.buttonViewModel).find(x => x && x.title);
    return b ? { title: b.title, bg: hex(b.customBackgroundColor), fg: hex(b.customFontColor) } : null;
  }
  // One row of the list (liveLeaderboardItemViewModel).
  function fanOf(vm) {
    if (!vm) return null;
    const who = dig(vm, 'content', 'liveLeaderboardItemChannelContentViewModel') || {};
    return { rank: dig(vm, 'rank', 'content') || '', points: dig(vm, 'points', 'content') || '', name: dig(who, 'displayName', 'content') || '',
      avatar: dig(vm, 'avatar', 'avatarViewModel', 'image', 'sources', 0, 'url') || '', badge: rankOf([who.badge]),
      note: dig(vm, 'content', 'liveLeaderboardItemActionContentViewModel', 'actionDescription', 'content') || '' };
  }
  // The list, as YouTube's Top fans panel loads it.
  async function topFans(params) {
    const r = await D.innertube('get_panel', { panelId: 'PAlive_viewer_leaderboard', params });
    const panel = dig(r, 'content', 'engagementPanelSectionListRenderer') || {};
    const rows = (dig(panel, 'content', 'sectionListRenderer', 'contents') || []).map(s => fanOf(findKey(s, 'liveLeaderboardItemViewModel'))).filter(Boolean);
    return { fans: rows, you: fanOf(dig(panel, 'footer', 'liveLeaderboardItemViewModel')) };
  }

  // The message box (liveChatMessageInputRenderer: its field and send endpoint), or why you
  // can't chat (whatever else the action panel holds: members only, sign in ...), or null.
  function inputIn(lcc) {
    const panel = lcc && lcc.actionPanel;
    if (!panel) return null;
    const box = panel.liveChatMessageInputRenderer;
    const send = box && findKey(box.sendButton, 'sendLiveChatMessageEndpoint');
    if (!box || !send || !send.params) return { restricted: strOf(findKey(panel, 'message')) || strOf(findKey(panel, 'text')) || '' };
    const field = findKey(box, 'liveChatTextInputFieldRenderer') || {};
    return { placeholder: strOf(field.placeholder), max: +field.maxCharacterLimit || 200, emojiCost: +field.emojiCharacterCount || 1,
      params: send.params, prefix: send.clientIdPrefix || '' };
  }
  // The channel's own emojis (its members' ones): their ids, first shortcut and picture.
  function emojisIn(lcc) {
    return ((lcc && lcc.emojis) || []).filter(e => e.isCustomEmoji && e.emojiId && e.shortcuts && e.shortcuts[0])
      .map(e => ({ id: e.emojiId, shortcut: e.shortcuts[0], image: thumb(e.image), label: e.shortcuts[0] }));
  }
  // What the "$" menu (the product picker) offers: its items' titles.
  function supportIn(lcc) {
    const picker = findKey(lcc && lcc.actionPanel, 'liveChatProductPickerPanelViewModel');
    return ((picker && picker.items) || []).map(it => strOf(findKey(it, 'title') || findKey(it, 'text'))).filter(Boolean);
  }

  // Post a message; true when YouTube took it (its answer echoes it back as a chat item).
  let sent = 0;
  async function send(input, segments) {
    const r = await D.innertube('live_chat/send_message', { params: input.params, clientMessageId: `${input.prefix}${Date.now()}${sent++}`,
      richMessage: { textSegments: segments } });
    return !!(r && !r.errors && (r.actions || []).some(a => a.addChatItemAction));
  }

  // The reaction buttons in a chat's message box (reactionControlPanelViewModel's
  // expandedButtons): each one's emoji, label and feedback token.
  function reactionsIn(lcc) {
    const panel = findKey(lcc && lcc.actionPanel, 'reactionControlPanelViewModel') || {};
    return (panel.expandedButtons || []).map(b => {
      const v = b.reactionControlPanelButtonViewModel || {};
      return { emoji: v.emojiId || '', label: v.a11yLabel || v.emojiId || '', token: dig(findKey(v.onTap, 'feedbackEndpoint'), 'feedbackToken') || '' };
    }).filter(r => r.emoji && r.token);
  }

  // Send a reaction: YouTube's feedback request with its token. True when YouTube took it.
  async function react(reaction) {
    const r = await D.innertube('feedback', { feedbackTokens: [reaction.token], isFeedbackTokenUnencrypted: false, shouldMerge: false });
    const answers = (r && r.feedbackResponses) || [];
    return !answers.some(a => a && a.isProcessed === false);
  }

  // What's new since the last poll.
  async function poll(next, pointsKey) {
    const r = await D.innertube('live_chat/get_live_chat', { continuation: next.token });
    const lcc = dig(r, 'continuationContents', 'liveChatContinuation');
    return { items: changes(lcc && lcc.actions), next: nextOf(lcc), xp: xpIn(r, pointsKey) };
  }

  // ---------------------------------------------------------------- reading items
  // ARGB number -> '#rrggbb' ('' for none).
  const hex = n => (typeof n === 'number' ? `#${((n >>> 0) & 0xffffff).toString(16).padStart(6, '0')}` : '');
  const usec = t => (t ? Math.round(+t / 1000) : 0);
  const thumb = obj => { const l = (obj && obj.thumbnails) || []; const t = l[l.length - 1]; return t && t.url ? t.url.replace(/^\/\//, 'https://') : ''; };

  // A message's text pieces: words as they are; an emoji as its picture (a channel's own
  // emoji) or as its character (a standard one, drawn by the font).
  function runsOf(t) {
    if (!t) return [];
    if (!t.runs) { const s = strOf(t); return s ? [{ text: s }] : []; }
    return t.runs.map(r => {
      if (!r.emoji) return { text: r.text || '' };
      const e = r.emoji;
      if (!e.isCustomEmoji && e.emojiId && !/\//.test(e.emojiId)) return { text: e.emojiId };
      return { emoji: { url: thumb(e.image), label: (e.shortcuts && e.shortcuts[0]) || strOf(dig(e, 'image', 'accessibility', 'accessibilityData', 'label')) || '' } };
    }).filter(r => r.emoji || r.text);
  }

  // Who wrote it: name, picture, channel, and what the badges say (owner, moderator, member
  // with the member badge's picture, verified).
  function authorOf(r) {
    const a = { author: strOf(r.authorName), avatar: thumb(r.authorPhoto), channelId: r.authorExternalChannelId || '', role: null, verified: false, badge: '' };
    for (const b of r.authorBadges || []) {
      const lb = b.liveChatAuthorBadgeRenderer || {};
      const type = dig(lb, 'icon', 'iconType') || '';
      if (type === 'OWNER') a.role = 'owner';
      else if (type === 'MODERATOR') { if (a.role !== 'owner') a.role = 'moderator'; }
      else if (type === 'VERIFIED') a.verified = true;
      else if (lb.customThumbnail) { a.badge = thumb(lb.customThumbnail); if (!a.role) a.role = 'member'; }
    }
    return a;
  }

  // One chat item -> a message, or null for what isn't shown (placeholders: messages YouTube
  // holds back; anything unknown).
  function messageOf(item) {
    const key = item && Object.keys(item)[0], r = key && item[key];
    if (!r) return null;
    const base = { id: r.id || '', time: usec(r.timestampUsec) };
    switch (key) {
      case 'liveChatTextMessageRenderer':
        return { ...base, kind: 'text', ...authorOf(r), rank: rankOf(r.beforeContentButtons), runs: runsOf(r.message) };
      case 'liveChatPaidMessageRenderer':
        return { ...base, kind: 'paid', ...authorOf(r), runs: runsOf(r.message), amount: strOf(r.purchaseAmountText),
          colors: { header: hex(r.headerBackgroundColor), body: hex(r.bodyBackgroundColor), text: hex(r.bodyTextColor) || hex(r.headerTextColor) } };
      case 'liveChatPaidStickerRenderer':
        return { ...base, kind: 'sticker', ...authorOf(r), runs: [], amount: strOf(r.purchaseAmountText), sticker: thumb(r.sticker),
          colors: { header: hex(r.backgroundColor), body: hex(r.backgroundColor), text: hex(r.authorNameTextColor) || hex(r.moneyChipTextColor) } };
      case 'liveChatMembershipItemRenderer':
        return { ...base, kind: 'member', ...authorOf(r), runs: runsOf(r.message), header: strOf(r.headerPrimaryText) || strOf(r.headerSubtext) };
      case 'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer': {
        const h = dig(r, 'header', 'liveChatSponsorshipsHeaderRenderer') || {};
        return { ...base, kind: 'member', ...authorOf(h), runs: [], header: strOf(h.primaryText) };
      }
      case 'liveChatSponsorshipsGiftRedemptionAnnouncementRenderer':
        return { ...base, kind: 'member', ...authorOf(r), runs: runsOf(r.message), header: '' };
      case 'liveChatViewerEngagementMessageRenderer':
      case 'liveChatModeChangeMessageRenderer':
        return { ...base, kind: 'notice', author: '', avatar: '', channelId: '', role: null, verified: false, badge: '',
          runs: [...runsOf(r.message || r.text), ...(r.subtext ? [{ text: ` ${strOf(r.subtext)}` }] : [])] };
      default:
        return null;                                         // placeholders and anything new
    }
  }

  // A chat update's actions -> the changes they make (see the top of the file), in order.
  function changes(actions) {
    const out = [];
    for (const a of actions || []) {
      if (a.replayChatItemAction) { out.push(...changes(a.replayChatItemAction.actions)); continue; }
      if (a.addChatItemAction) {
        const msg = messageOf(a.addChatItemAction.item);
        if (msg && msg.id) out.push({ op: 'add', msg });
      } else if (a.markChatItemAsDeletedAction || a.removeChatItemAction) {
        const id = (a.markChatItemAsDeletedAction || a.removeChatItemAction).targetItemId;
        if (id) out.push({ op: 'remove', id });
      } else if (a.markChatItemsByAuthorAsDeletedAction || a.removeChatItemByAuthorAction) {
        const channelId = (a.markChatItemsByAuthorAsDeletedAction || a.removeChatItemByAuthorAction).externalChannelId;
        if (channelId) out.push({ op: 'removeAuthor', channelId });
      } else if (a.replaceChatItemAction) {
        const ra = a.replaceChatItemAction, msg = messageOf(ra.replacementItem);
        if (msg && msg.id) out.push({ op: 'remove', id: ra.targetItemId }, { op: 'add', msg });
      } else if (a.addBannerToLiveChatCommand) {
        const b = dig(a.addBannerToLiveChatCommand, 'bannerRenderer', 'liveChatBannerRenderer') || {};
        const msg = messageOf(b.contents);                   // a pinned message (a chat summary isn't a message: skipped)
        if (msg && b.bannerType !== 'LIVE_CHAT_BANNER_TYPE_CHAT_SUMMARY') {
          out.push({ op: 'banner', banner: { id: b.actionId || msg.id, header: strOf(dig(b, 'header', 'liveChatBannerHeaderRenderer', 'text')), msg } });
        }
      } else if (a.removeBannerForLiveChatCommand) {
        out.push({ op: 'unbanner', id: a.removeBannerForLiveChatCommand.targetActionId || '' });
      }
    }
    return out;
  }

  ns.youtubeChat = { info, views, open, poll, react, send, topFans, changes };
})(globalThis.__streamxr = globalThis.__streamxr || {});
