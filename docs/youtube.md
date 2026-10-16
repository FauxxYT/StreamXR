# YouTube notes

What the YouTube site files do, and what has been learned about YouTube's pages, data and
player while building StreamXR (October 2026, English YouTube, desktop Chrome). Read this
before touching `src/sites/youtube/`; YouTube changes often, so re-check a fact live when
something stops working. How the code is structured is in
[ARCHITECTURE.md](../ARCHITECTURE.md).

## The site modules (`src/sites/youtube/page/`)

The `youtube-*.js` files are the **only place** that reads, clicks or requests anything
from YouTube. When YouTube's markup or data changes, fix it there. They expose everything
YouTube offers, whether the VR interface uses it yet or not (the unused parts are the
backlogs in [features/](features/)):

- `youtube-data.js` (`ns.youtubeData`): helpers, `watchData()` / `playerResponse()`,
  `innertube()` (POST to YouTube's own `/youtubei/v1/`), `pager()`, `cached()`, and the item
  readers for the `compactVideoRenderer` / `videoRenderer` and `lockupViewModel` shapes.
- `youtube-player.js` (`ns.youtube`): everything on the `#movie_player` API.
- `youtube-page.js` (`ns.youtubePage`): Up Next (merged data + DOM scraping, load more,
  playlists), the controls panel's details, Subscribe / Like / Dislike, in-page navigation.
- `youtube-content.js` (`ns.youtubeContent`): metadata, description, owner, chapters,
  heatmap, end screen, cards, playlist, comments / replies, transcript, search.
- `youtube-channel.js` (`ns.youtubeChannel`): any channel by id (`currentChannelId()` for the
  playing video's), via the browse API so the video keeps playing: header, About, Home
  shelves, Videos / Shorts / Live (latest / popular / oldest), Playlists, Shows, Posts,
  Store, channel search.
- `youtube-home.js` (`ns.youtubeHome`): the Home feed with its topic chips ("Immersive
  videos" = 360/VR content), Explore feeds (Live, News, Gaming, Sports, Music, Podcasts,
  Courses, Hype, Memberships), signed-in feeds (unverified), the left menu (`guide()`), your
  own channel's id (`myChannelId()`: the menu's "Your channel" entry, else the account menu; verified signed in, 0.74.0) and
  search `suggestions()`.
- `youtube-subscriptions.js` (`ns.youtubeSubscriptions`): the Subscriptions feed, the Manage
  list (`channels()`), Subscribe / Unsubscribe any channel, the notification bell. Verified
  signed in: `checkSignIn()`, `feed()` (first page = 100 videos), `channels()` (in the
  Manage list `subscribed` is always true; one channel had only a stub `subscriptionButton`
  and no bell), subscribe / unsubscribe / `setNotifications` (they report ok only when
  YouTube's answer shows the new state). Filter chips: none on desktop for the tested
  account (the documented ones seem app-only).
- `youtube-chat.js` (`ns.youtubeChat`): a live stream's chat ("Live chat" below): `info()`
  (its views), `open(token)` (a view's chat page), `poll(next)`, and the chat items as plain
  messages and changes (add, remove, banner).

The provider (`provider/`) is the only code that calls these modules on the shell's behalf.

The maintainer keeps private, live-probed inventories of what each page offers (Watch,
Channel, Home, Subscriptions); what matters from them is in this file and the backlogs in
`docs/features/`.

## Data and requests

- Newer items show short text ("26M", "1y ago", "8mo ago"); the accessibility label holds
  the long form. `longAgo()` expands short dates.
- Signed-in requests need `Authorization: SAPISIDHASH <ts>_<sha1("<ts> <SAPISID cookie>
  https://www.youtube.com")>`; `innertube()` sends it (and retries without it on 401/403).
  Every response's `responseContext` has a `logged_in` flag; a signed-out Subscribe still
  answers 200 but changes nothing.
- **Which identity:** an account can have several YouTube identities (default + brand
  channels). Without one, YouTube answers as the account's DEFAULT identity, not the channel
  the user browses as (once, the Subscriptions feed showed another identity's channels, and
  test subscriptions changed that identity). `innertube()` sends `X-Goog-PageId` +
  `context.user.onBehalfOfUser` (ytcfg DELEGATED_SESSION_ID). Check in the page console:
  `await __streamxr.youtubeSubscriptions.checkAccount()` -> `sameAccount` must be true.
- Channel tabs (browse API): a tab's first page keeps its "load more" token at the end of its
  grid / section; later and re-sorted pages arrive in `onResponseReceivedActions`. Sorting
  is a chip token (Videos / Shorts / Live) or the sort menu's params (Playlists). A
  signed-in first page can carry other `onResponseReceived*` actions with no items, so
  `pageRoot` reads only append / reload continuation lists (Live / Playlists / Shows looked
  empty before that; the cause is a theory, the fix works).
- A newer "load more" shape, `continuationItemViewModel` (token in
  continuationCommand.innertubeCommand.continuationCommand), is read by `continuationOf` and
  `nextPageToken` (playlist pages use it).
- Ad filtering must match a capital "Ad" (`AD_KEY_RE`): a loose `/[aA]dRenderer$/` also
  matched "backstagePostThreadRenderer" and silently dropped every channel post.
- Text matching in `youtube-page.js` assumes **English** YouTube.

## Subscribe and Like

- The watch page's subscribe box holds both buttons ("Subscribe" and "Subscribed"), so its
  text always matches /subscribed/: `isSubscribed` reads the visible button, else the watch
  data's subscribeButtonRenderer.subscribed.
- The page's own button doesn't update after an API change, so
  `youtubePage.noteSubscription(channelId, on)` remembers confirmed changes until the next
  video; the controls panel and the Channel panel tell each other (`noteSubscribed`).
- The Channel header's own `subscribed` takes the FIRST subscriptionStateEntity in the reply
  (signed in, a Home tab may carry others); it only matters when the watch page gives no answer.
- The like count falls back to the button's aria-label.

## Video formats

The formats are in `src/streamxr/shared/formats.js`; YouTube's detection is the provider's
`detectFormat`.

- **Quality names** (0.67.1): the player's `getAvailableQualityLevels()` gives only ids
  (`hd1080` ...), with no frame rate, so a 60 fps video showed "1080p". The names now come
  from `getAvailableQualityData()` (`qualityLabel`, e.g. "1080p60", or "2160s60" for a 360° /
  VR180 video: "s" for spherical) where the player has it
  (`youtube-player.js` `quality().labels`); with Premium it also lists "1080p Premium",
  skipped in favour of the plain entry. Unverified in the headset (see known-issues.md).

- Desktop YouTube sends **one eye only**, even for 3D videos, so there are no 3D formats.
- Formats: `flat` (cinema screen), `360mono`, `360eac`, `180mono`.
- "MESH" 360° videos use an **equi-angular cubemap**, 3×2: top row left | front | right,
  bottom row down | back | up; down and up rotated 270° clockwise, back 90° (the same as
  ffmpeg's `eac`). Verified against a real frame.
- VR180 vs 360° (both "MESH"): the player response has
  `playerConfig.vrConfig.partialSpherical: true` on VR180 and no `vrConfig` on 360°
  (checked on 2 of each). "180" in the title and an aspect under 1.6 are fallbacks; the
  frame shape alone is unreliable (VR180 streams are often 16:9 below 2160p).
- Card flags: YouTube's card data has its own "VR180" / "360°" badges
  (metadataBadgeRenderer.label on older cards, badgeViewModel.badgeText on lockups);
  `badgeKind()` reads them first, the title only as a fallback. Up Next's merge keeps a
  180 / 360 kind from either the page text or the data.
- VR180 test video: "how TV screens made watching movies worse" by Noodle (`wlUV6y5TUko`):
  no "180" in the title, 16:9 below 2160p.

## Ads

Test ad handling in a browser without YouTube Premium (e.g. signed out); ads are rationed,
so long non-music videos with many `adPlacements` work best.

- Detection: `#movie_player.ad-showing`. The ad plays in the SAME `<video>` (element
  time / duration = the ad's; the player API = the main video's). Pod text "1 of 2" is in
  `.ytp-ad-pod-index`.
- Skip: `button.ytp-skip-ad-button` exists from the start on skippable ads but is hidden for
  5 s (no countdown text). Unskippable ads have no button.
- **YouTube ignores script clicks on Skip** (tested: click(), synthetic pointer / mouse /
  key events, `player.onAdUxClicked(...)`); it checks the event itself (`isTrusted`), not
  user activation. A real click works and skips the rest of the pod. Real input needs the
  `debugger` permission, which can't be optional and shows the "Read and change all your
  data" warning, so it lives in the separate `skip-helper/` extension (fixed ID
  `dbfmdfbpdpphbjnjlembolnmhnicbicm` via its manifest `key`; the private key is not in the
  repo). Flow: `skipAd()` -> bridge `SKIP_AD` -> `src/sites/youtube/ui/skip-helper.js` ->
  `chrome.runtime.sendMessage(HELPER_ID)` -> the helper finds the visible Skip button itself
  (CDP Runtime.evaluate), makes anything covering it click-through (StreamXR's own popup
  once covered it), clicks (Input.dispatchMouseEvent) and detaches. Without the helper, VR
  shows "Skip on desktop". Checked by the maintainer after 0.78.3 (helper 1.2.0): both work. With
  YouTube Premium there are no ads, so the helper isn't needed. The helper is packaged and
  published separately from the main extension; once it has a Chrome Web Store ID, add that
  ID to `HELPER_IDS` in `src/sites/youtube/ui/skip-helper.js` (next to the unpacked ID).
- Format detection during an ad is unreliable (the `<video>` holds the ad's frames, and
  `youtube.info()` leaves the frame size out), so the format is re-detected after every ad
  unless one was picked by hand during it.

## Live streams

Checked on a Lofi Girl stream:

- `getVideoData().isLive`; `allowLiveDvr` (rewinding allowed). `getDuration()` is
  meaningless (~53 days on a stream rewindable for 12 h). `getProgressState()` has
  seekableStart / seekableEnd (the end is the live moment). `isAtLiveHead()` /
  `seekToLiveHead()` work.
- While paused, the player stops refreshing seekableEnd and `isAtLiveHead()` STAYS true;
  `getProgressState().ingestionTime` freezes, so "behind" also uses (now - ingestionTime)
  minus its smallest value for this video. Anything under 12 s behind (`LIVE_SLACK`) counts
  as live (the player says "not at head" 15 s behind right after joining).
- No storyboard previews on live streams.

## Live chat

Probed signed in on a members' live stream and a busy public one (2026-10-16, console
snippets); read by `youtube-chat.js` since 0.79.0:

- **The watch page** has a `liveChatRenderer` (in `conversationBar`) naming the views ("Top
  chat", "Live chat" in `sortFilterSubMenuRenderer.subMenuItems`), but **its tokens don't
  work**: `/live_chat?continuation=<one of them>` answers 200 with an empty page (~79 KB,
  `window["ytInitialData"] = <!-- …`, no chat), and `live_chat/get_live_chat` answers
  **HTTP 400** (probe 6, 2026-10-16). Use the **chat frame's** tokens (its own view selector:
  different tokens, each loading a full chat page, ~455 KB) or, with no frame on the page, the
  **pop-out page**'s (`/live_chat?is_popout=1&v=<video id>`: ~452 KB of data, but no
  `liveChatContinuation`; its view selector is read wherever it is: to confirm on a real page).
- **The chat page / chat frame** (`#chatframe`, same origin): its `ytInitialData` is shaped like
  a chat update, `continuationContents.liveChatContinuation`, with `continuations[0]`
  (`invalidationContinuationData`: the token to poll with), `header` (the view selector
  again, with its own reload tokens), `ticker`, `actionPanel` (the message box, the emoji picker,
  the reactions, the send endpoint `sendLiveChatMessageEndpoint`), `emojis` (the channel's
  custom emojis), `participantsList`, `itemList`. Its `actions` are gone once the frame has
  shown them (`undefined` when read later). The chat page's HTML writes it as
  `window["ytInitialData"] = {…};`: fetching `/live_chat?continuation=<a view's reload token>`
  and reading that (brace matching, then `JSON.parse`) works without any frame, and comes
  with the recent messages in `actions` (77 on a busy stream). That's how to open the
  **Live chat** view (every message) whatever view the page's frame shows (Top chat by default).
- **Polling:** `live_chat/get_live_chat` `{ continuation }` with the invalidation token
  answers in ~100-200 ms with `actions` and the next `invalidationContinuationData`
  (`timeoutMs: 10000`). YouTube's own frame doesn't wait that long: it is told about new
  messages by a push service (`/punctual/v1/chooseServer`, `/punctual/multi-watch/channel`).
  **Polling every 2 s works** (20 polls in a row on a busy stream: no errors, new messages
  in each, no duplicates; each poll's token is the previous answer's).
- **A message:** `addChatItemAction.item.liveChatTextMessageRenderer`: `message.runs`
  (text and emojis), `authorName.simpleText`, `authorPhoto.thumbnails` (32 and 64 px),
  `authorExternalChannelId`, `id`, `timestampUsec`, `contextMenuEndpoint` ("Chat actions").
  The action also has a `clientId`.
- **Other items seen** (in `addChatItemAction.item`): `liveChatPlaceholderItemRenderer`
  (only `id` and `timestampUsec`: a message YouTube holds back; none was filled in within
  40 s, so skip them), `liveChatViewerEngagementMessageRenderer` (YouTube's "Welcome to live
  chat! Remember to guard your privacy…" notice: `icon`, `message.runs`, a "Learn more"
  `actionButton` to support.google.com).
- **Banners:** `addBannerToLiveChatCommand.bannerRenderer.liveChatBannerRenderer` (`contents`,
  `actionId`, `bannerType`, `bannerProperties` with `isEphemeral` / `autoCollapseDelay`).
  Seen: `LIVE_CHAT_BANNER_TYPE_CHAT_SUMMARY`, an AI "Chat summary" ("Auto-generated
  experiment • Quality may vary") with thumbs up / down, gone after 12-30 s. Pinned messages
  use the same command (not seen yet).
- Not seen yet: Super Chats / Stickers, memberships, ticker items, deletions, replacements.
- **Custom emojis** (`liveChatContinuation.emojis`, 132 on that channel): `emojiId`
  (`<channel id>/<id>`), `shortcuts` (`:_C80:`, `:C80:`), `searchTerms`, `image.thumbnails`
  (24 and 48 px on yt3.ggpht.com), `isCustomEmoji`.
- **Reactions** (`reactionControlPanelViewModel.expandedButtons`): ❤ 😄 🎉, each a
  `reactionControlPanelButtonViewModel` with `emojiId`, `buttonIcon` (Noto emoji PNG on
  fonts.gstatic.com), `a11yLabel` ("Send ❤") and `onTap.innertubeCommand`: a
  `feedbackEndpoint` (`feedbackToken`) to `/youtubei/v1/feedback`. They're in the chat page's
  `actionPanel` (absent when the stream has no reactions, or signed out). Sent by
  `youtubeChat.react()` as YouTube's web client sends a feedback token: `{ feedbackTokens:
  [token], isFeedbackTokenUnencrypted: false, shouldMerge: false }`, the answer's
  `feedbackResponses[].isProcessed` saying whether it was taken (0.80.0; checked from the
  console on a live stream, 2026-10-16: taken). The set varies by stream (that one offered five,
  not ❤ 😄 🎉). `emojiId` is written without the
  emoji selector (❤ = U+2764 alone), which fonts draw as a plain glyph: add U+FE0F.

## Playlists

- The player (getPlaylist / getPlaylistIndex) and the page's sidebar hold only a WINDOW of
  ~80-200 videos around the playing one, and the player's index counts from the window's
  start (a large channel's uploads, ~1,850 videos: at #250 the window was #230-#328, index 20). The
  page data has playlist.currentIndex (whole list), localCurrentIndex (in the window) and
  totalVideos; the provider works in whole-playlist positions (offset = currentIndex -
  localCurrentIndex, else found in the playlist page's order, else remembered).
- The sidebar's cards (playlistPanelVideoRenderer) have only title, channel and length; the
  playlist's own page (browse "VL<id>", lockupViewModels, 100 a page) fills in views, age
  and badges. Mixes ("RD...") have no playlist page.
- Watch later (browse "VLWL", signed in; 0.35.3) is different: its rows are the older
  playlistVideoRenderer, after a first section of its own controls. Views and age are only
  in `videoInfo`, short and without the word "views" ("7.4K • 4d ago"); no channel badge.
  Liked videos ("VLLL") uses lockupViewModels like other playlists.
- Playing a position outside the window: `openVideo(id, list, index)` (watchEndpoint index).
  Next / Previous are the player's nextVideo / previousVideo (they switch in-page).
- A show card has no video id; opened with only `list=`, YouTube played a 1-minute "not
  available on this device" placeholder, so `openVideo` looks the first video up first
  (`next` with the playlistId -> currentVideoEndpoint.watchEndpoint.videoId).

- **Save (0.77.0, verified signed in):** `playlist/get_add_to_playlist` with `videoIds`
  answers YouTube's Save menu: `playlistAddToOptionRenderer`s (`playlistId`, `title`,
  `containsSelectedVideos` `ALL` / `NONE`), Watch later (`WL`) first; `browse/edit_playlist`
  with `ACTION_ADD_VIDEO` / `ACTION_REMOVE_VIDEO_BY_VIDEO_ID` changes it (`status`
  `STATUS_SUCCEEDED`).
- **The top bar and the logo (0.78.0):** the right-hand buttons are `ytd-masthead #end #buttons`
  (+ Create first when signed in); the logo is an SVG at `ytd-topbar-logo-renderer #logo-icon
  svg` whose colours come from the page's CSS (the wordmark follows the light / dark theme),
  so a copy needs its fills written in.
- **Captions (0.77.0):** YouTube draws them in the page (`.ytp-caption-window-container`, one
  `.caption-visual-line` per line), never into the video; StreamXR turns a track on with the
  player's `setOption('captions', 'track', ...)` and reads those lines each frame to draw them in VR.

## Comments, description, transcript

- Comments arrive as layout plus separate "entities" (`frameworkUpdates`), matched by
  `commentKey`. A replies page returns each reply as a commentThreadRenderer (with
  subThreads for replies-to-replies); one level of replies is shown.
- The toolbar STATE entity (toolbarStateKey) has heartState / likeState; the comment
  entity's toolbar has creatorThumbnailUrl + heartActiveTooltip when hearted, and
  likeCountLiked (the count including your like). The toolbar SURFACE entity carries
  like / unlike / dislike / undislike commands with performCommentActionEndpoint.action
  tokens only when signed in; `rateComment` POSTs comment/perform_comment_action
  `{ actions: [token] }` (confirmed signed in).
- The comment count comes from the comments panel header's contextualInfo
  (`commentsInfo()`); a transcript exists when the page lists an
  `engagement-panel-searchable-transcript` (`hasTranscript()`).
- `descriptionWithoutChapters()` drops lines whose leading time or timestamp LINK matches a
  chapter start (± 2 s), plus a heading right before them. Gotchas (freeCodeCamp's Python
  course): 0:00 links have NO startTimeSeconds and links to OTHER videos carry 0, so a
  timestamp link is recognised by its text; chapter lines can start with emoji or brackets
  ("⌨️ (1:45) Setup"), so the leading-time regex skips non-letters.
- Transcript: YouTube refuses direct `get_transcript` and timedtext requests (they need a
  token), so `transcript()` clicks the description's "Show transcript", reads the panel and
  closes it.
- Most Replayed (the heatmap): a fresh page load's data leaves it out, even on videos that
  have one; the `next` request (what YouTube sends switching videos in-page) has it, signed
  out too, as a `macroMarkersListEntity` of type `MARKER_TYPE_HEATMAP`: 100 markers
  (`startMillis`, `durationMillis`, `intensityScoreNormalized` 0..1, the most replayed = 1).
  So `mostReplayed()` reads the page's data and otherwise asks `next` once per video
  (checked Oct 2026 on a very popular music video). Newer or less watched videos have none.

## Audio, channels, storyboards

- Audio tracks (checked on OLEG ZAYANOV, `DbKDX-AyJIQ`: "English (US)" auto-dub = default,
  "Russian original"): the player's track id starts with the stream format ("251;..."), so
  tracks are named by their language id ("ru.4"); setAudioTrack switches live.
- Featured video: a channel's trailer is shown to NON-subscribers; subscribers only see a
  "featured video for returning subscribers" if the creator set one (so a channel that set none shows none to
  a subscriber). That's YouTube's behaviour, not a bug.
- Storyboard sheets only allow canvas use from youtube.com (a localhost page gets a CORS
  error). The player's `getStoryboardFrame()` takes a frame index, not a time, and returns
  bad sizes, so `youtube.storyboard()` works the tile out from the storyboard spec.
- Thumbnails load from `i.ytimg.com` with `crossOrigin='anonymous'` so canvases can stay
  WebGL textures.
- Channel avatars and banners (`yt3.googleusercontent.com`), post pictures
  (`yt3.ggpht.com`) and store product pictures (`encrypted-tbn*.gstatic.com`) also load
  with CORS, but only for youtube.com: a localhost test page gets errors, so test pages
  show placeholders there. Product pictures can be portrait (385 x 512), hence `fit: 'contain'`.
- Channel tabs, checked signed out (0.39, on two large channels; two channels can have very
  similar handles, so check the handle):
  - About: the header's description "more" token opens `aboutChannelViewModel`: the full
    description, country, "Joined Mar 21, 2008", exact views / videos / subscribers, the
    channel URL and the external links (title + URL).
  - Store: the tab's shelves ("Just dropped", "Featured") repeat products (one channel: 9 cards,
    7 products), so `store()` lists each once.
  - Posts: 8-10 a page; pictures (one or a multi-image set), attached videos (with views,
    age, duration), polls (`pollRenderer`: text choices and "32K votes"; signed out each
    choice has a sign-in link; signed in, each carries its vote actions and its share,
    verified in 0.40). "See results" is a real choice creators add, not a button.
