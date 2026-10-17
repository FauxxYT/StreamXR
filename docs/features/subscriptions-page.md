# Subscriptions Page Features

YouTube Subscriptions-page features that the code can reach (in
`src/sites/youtube/page/youtube-subscriptions.js`, `ns.youtubeSubscriptions`) but that the VR interface
doesn't use yet. Everything is fetched from the watch page, so the video keeps playing.
Sorted from easiest to hardest to implement. Tick an item off (or delete it) when it ships
in VR.

Reference: the maintainer's private "YouTube Subscriptions Page Data" notes (not published;
what matters from them is in this file and docs/youtube.md).

## Verified signed in (console, v0.20.0 - 0.20.5) - partly on the wrong identity

These checks ran before 0.22.1, when requests were answered as the account's default
identity instead of the channel the user browses as. Since 0.22.1 `checkAccount()` returns
sameAccount: true and the feed matches the desktop feed. STILL TO RE-CHECK on the right
identity: Subscribe / Unsubscribe and the bell (deferred by the maintainer).

- [x] **YouTube sees our requests as signed in**: `checkSignIn()` returned `true`.
- [x] **Subscriptions feed** (re-checked on the right identity, 0.22.1): `feed()` returned 100 videos on the first page, every card
  field filled in (title, channel, views, age, duration, thumbnail).
- [x] **Manage list**: `channels()` returns your channels with handle, subscribers, badge
  and bell options. Some channels carry only a stub button and no bell menu.
- [x] **Filter chips**: none on desktop for this account (`p.chips` was `[]`); see "Not
  available" below.

## Prerequisite: a Subscriptions view (small)

Lives in the Home panel from `home-page.md` (a "Subscriptions" button or tab
next to Home) or its own chevron. It reuses the Up Next card grid, since the items have
the same shape.

- [x] ~~**Subscriptions feed in VR**~~ DONE (v0.22.0: Subscriptions tab of the Browse panel)
  - Code: `feed()` -> new videos from your channels, newest first, page by page.

## Features, easiest first

1. [x] ~~**Subscribe / Unsubscribe any channel**~~ DONE (v0.21.0: in the Channel panel; v0.27.0: the controls panel's button too, two-click Unsubscribe)
   - Code: `subscribe(id)`, `unsubscribe(id)` -> { ok, error }
   - VR idea: a Subscribe button on the Channel panel (`channel-page.md`) and on
     Up Next cards. Also lets the controls panel's Subscribe button unsubscribe, which it
     can't do today (YouTube's confirm menu blocks it).
2. [ ] **Posts in the feed**: deferred (0.90.2, see "Deferred"). The shelves (a Shorts row,
   "Most relevant") are deferred too, as on Home.
   - Code: `p.shelves` (Shorts row, "Most relevant"), `p.posts`
   - VR idea: as on Home. Posts need the post cards from the channel Posts tab.
3. [x] ~~**Manage list: your subscribed channels**~~ BUILT (v0.90.0, to check signed in: You →
   Channels, round pictures, a click opens the Channel panel)
   - Code: `channels()` -> [{ id, title, handle, subscribers, thumb, subscribed,
     notifications }]
   - VR idea: a list of channel rows (avatar, name, counts); clicking one opens its Channel
     panel. Needs a scrolling list rather than the card grid.
4. [x] ~~**Notification bell per channel**~~ BUILT (v0.90.0, to check signed in: the bell button
   beside Subscribed on the Channel panel, a floating menu of YouTube's choices; the Channels
   list shows each setting)
   - Code: `setNotifications(option)` with one of a channel's `notifications.options`
     (All / Personalized / None); `[]` means YouTube offers no bell for that channel.
   - VR idea: a bell button on each Manage row and on the Channel panel, opening a small
     three-choice menu.

## Deferred

Set aside by the maintainer (after 0.78.4): re-checking these on the user's own channel identity isn't
needed for now (Subscribe from the controls panel and the Channel panel works in use).

- [ ] **Notification bell** (re-check on the right identity): `setNotifications()` confirmed on a test channel (0.20.5:
  `confirmed: true`, Personalized = state `OCCASIONAL`, All = `ALL`).
- [ ] **Subscribe / Unsubscribe** (re-check on the right identity): a direct subscribe to a test channel returned a real confirmation
  ("Subscription added", `subscribed: true`). Since 0.20.5 `subscribe()` / `unsubscribe()`
  only return `ok` when YouTube's answer shows the new state. Unsubscribe + subscribe
  again both confirmed on 0.20.5.

## Not available yet (needs more work in the code first)

1. **Filter chips** (Today, Videos, Shorts, Live, Unwatched ...): documented for YouTube's
   phone apps, but desktop gives none for this account. `feed(filter)` and `p.chips` stay
   in the code in case they appear. A VR-only filter (e.g. Videos vs Shorts, from the
   `short` flag) could be done locally instead.
2. **Notifications inbox** (the bell in YouTube's top bar): YouTube.js documents
   `notification/get_notification_menu` and `notification/get_unseen_count`; not in the
   code yet.
3. **Watch later / Liked videos / your playlists**: their browse ids are in
   `youtube-home.js` (`feed('watchLater')`, `feed('liked')`) but untested signed in;
   saving a video to a playlist needs another request.

## Deferred (the maintainer, 2026-10-17)

- **Shelves in the Subscriptions feed** (a Shorts row, YouTube's "Most relevant"): for the same
  reason as Home's shelves (`home-page.md`, "Deferred"): Shorts fit VR poorly. `p.shelves` is
  still read.
- **Posts in the Subscriptions feed** (0.90.2): desktop's feed doesn't mix community posts in
  (a probe signed in found no post data in `FEsubscriptions`), so the Posts pill built in
  0.90.0 was always empty and was taken out. Posts stay on each channel's Posts tab.
