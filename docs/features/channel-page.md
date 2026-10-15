# Channel Page Features

YouTube channel-page features that the code can already read (in
`src/sites/youtube/page/youtube-channel.js`, `ns.youtubeChannel`) but that the VR interface doesn't use
yet. Everything is fetched from the watch page, so the video keeps playing while you browse
a channel in VR. Sorted from easiest to hardest to implement. Tick an item off (or delete
it) when it ships in VR.

Full data inventory with live-probed notes: the maintainer's private "YouTube Channel Page Data" notes (not
published; what matters from them is in this file and docs/youtube.md).

Every function takes a channel id; `currentChannelId()` gives the playing video's. Lists
are pagers (`await p.next()` loads one more page into `p.items`). Video and playlist items
use the same shape as Up Next cards, so opening one reuses `youtubePage.openVideo(id, playlistId)`.

## Prerequisite: the Channel panel (medium)

Every feature below lives in this one new VR panel, so it comes first even though it isn't
the smallest job. The sizes below are the extra work for each feature once the panel exists.

- [x] ~~**Channel panel with header**~~ DONE (v0.21.0-0.21.1: opened from the channel name or the leftmost chevron)
  - Code: `channel(id)` -> name, verified badge, handle, subscribers, video count, short
    description, avatar, banner, and which tabs this channel has.
  - VR idea: opened by clicking the channel name on the controls panel (later also from
    Up Next cards or search results). It opens above the controls like Up Next and Format
    Settings, with a banner strip, avatar, name + badge, "@handle · 21.4M subscribers ·
    1.8K videos", and a row of tabs (only the ones this channel has).

## Features, easiest first

1. [x] ~~**Featured video**~~ DONE (v0.27.0: a "Featured" tab, first when the channel has one:
   one large card with the description beside it)
   - ~~Code: `home(id).featured`~~
2. [x] ~~**Videos tab**~~ DONE (v0.21.0)
   - Code: `videos(id, sort)`, sort `'latest'` / `'popular'` / `'oldest'`
   - VR idea: the Up Next card grid with paging, plus three sort buttons.
3. [x] ~~**Live tab**~~ DONE (v0.21.0)
   - Code: `live(id, sort)` (same sorts)
   - VR idea: the same grid as Videos; only show the tab when the channel has it.
4. [x] ~~**Playlists tab**~~ DONE (v0.21.0)
   - Code: `playlists(id, sort)`, sort `'newest'` / `'lastAdded'`
   - VR idea: playlist cards ("5 episodes"); clicking plays the playlist from the start.
5. [x] ~~**Shows tab**~~ DONE (v0.25.0)
   - Code: `shows(id)`
   - VR idea: the same as Playlists (a show is a playlist of episodes).
6. [x] ~~**Store tab**~~ DONE (v0.39.0: product cards, the whole picture, name, price ·
   shop; not clickable, as buying leads off YouTube)
   - ~~Code: `store(id)` -> [{ title, price, merchant, image, url }]~~
7. [x] ~~**About**~~ DONE (v0.39.0: an "About" tab when the channel has one: the description,
   then joined / country / views / videos / subscribers / channel link and the external
   links, scrolling; links are shown, not opened)
   - ~~Code: `about(id)`~~
8. [x] ~~**Shorts tab**~~ DONE (v0.21.0: regular cards with a "Short" label; plays very tall on the cinema screen, which
   the maintainer wants kept as is)
   - Code: `shorts(id, sort)` (items have `short: true` and vertical thumbnails)
   - VR idea: a grid of tall cards. Shorts play as normal (vertical) videos on the cinema
     screen; check how a 9:16 video looks there.
9. [x] ~~**Posts tab**~~ DONE (v0.39.0: a scrolling feed: text, up to 3 pictures ("+N" for
   more), an attached video as a clickable card, a poll, likes; more load near the end.
   v0.40.0: like / dislike, poll voting and each post's comments. Checked on two large
   channels, polls included)
   - ~~Code: `posts(id)` -> { text, author, published, likes, images[], video, poll }~~
10. [x] ~~**Search inside the channel**~~ DONE (v0.46.0: a 🔍 button on the tab row turns it
    into a search box; results in the grid; ‹ back to the tab you were on. Checked on
    a large channel: 30 results a page, more pages load)
    - ~~Code: `search(id, query)`~~

## Deferred

Left out for now by the maintainer; each can come back if there is demand for it.

- **Home shelves** (medium)
  - Why: lower priority, since the tabs and their sort / filter pills already reach
    everything the shelves show.
  - Code: `home(id).shelves` -> [{ title, items, posts, channels }] ("Explained!",
    "Reviews!", featured channels ...)
  - VR idea: one row of cards per shelf, scrolling vertically. Featured-channel cards open
    that channel's panel.

## Not available yet (needs more work in the code first)

Also sorted easiest first; all need testing while signed in.

1. ~~**Subscribe / unsubscribe to the channel shown**~~ DONE (v0.21.0: the Channel panel
   uses `youtubeSubscriptions.subscribe/unsubscribe`, any channel, two-click Unsubscribe).
2. **Notification bell**: the code exists now (`youtubeSubscriptions.setNotifications`,
   see `subscriptions-page.md`), but the VR panel has no bell button yet.
   Re-check it on the right identity first (0.22.1 fix).
3. ~~**Liking posts, voting in polls, post comments**~~ DONE (v0.40.0: 👍 / 👎 / 💬 on each
   post; 💬 opens the post with its comments; liking and voting signed in. All verified).
4. **Memberships ("Join")**: no Join button seen signed out; untested.
5. **Podcasts, Courses, Releases tabs**: named in the code's tab list but no tested
   channel had them; their contents are unverified.
