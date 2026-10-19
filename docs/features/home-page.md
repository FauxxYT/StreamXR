# Home Page Features

YouTube Home-page features that the code can already read (in `src/sites/youtube/page/youtube-home.js`,
`ns.youtubeHome`) but that the VR interface doesn't use yet. Everything is fetched from the
watch page, so the video keeps playing while you browse in VR. Sorted from easiest to
hardest to implement. Tick an item off (or delete it) when it ships in VR.

Full data inventory with live-probed notes: the maintainer's private "YouTube Home Page Data" notes (not
published; what matters from them is in this file and docs/youtube.md).

Lists are pagers (`await p.next()` loads one more page into `p.items`). Items use the same
shape as Up Next cards (Shorts add `short: true`), so opening one reuses
`youtubePage.openVideo(id, playlistId)`.

## Prerequisite: a Home panel (small to medium)

Every feature below lives in one new VR panel, so it comes first. It can reuse the Up Next
panel's card grid and paging almost as-is (the cards are the same shape). The sizes below
are the extra work for each feature once the panel exists.

- [x] ~~**Home panel with the Home feed**~~ DONE (v0.22.0: the Browse panel, second chevron)
  - Code: `home()` -> the feed's videos, page by page.
  - VR idea: a third chevron next to "Up Next" and "Format Settings" (or a "Home" tab in
    the Up Next panel) showing the feed as the familiar 3 x 2 card grid with page arrows.

## Features, easiest first

1. [x] ~~**"Immersive videos" button**~~ DONE (v0.22.0: second chip in Browse)
   - Code: `home('Immersive videos')` (YouTube's own 360°/VR filter; tested: 24 per page,
     more pages)
   - VR idea: one button that switches the Home grid to immersive videos. A perfect fit
     for this extension, and only one extra button.
2. [x] ~~**All topic chips**~~ DONE (v0.22.0; all of them since v0.74.0: the row slides when the laser nears its end)
   - Code: `home(chip)`; `p.chips` lists the chips on offer (personalised: News, Music,
     Gaming, Live, Recently uploaded, Watched ...)
   - VR idea: a scrollable row of chip buttons above the grid.
3. [x] **Explore feeds: Live, Gaming, Music, Hype, Courses, Podcasts, Memberships** (0.94.0 to 0.95.6, work in the headset: each a tab with its sections as pills, "View all" behind each pill, square podcast cards, Memberships' creators and the Membership tab; Gaming's signed-in game shelves still not read; v0.74.0: each
   is a "Coming Soon" tab of the Explore panel, with Shorts, Movies & TV and Learning, ready to fill)
   - Code: `feed(name)` -> sections [{ title, items }] ("Live Now", "Upcoming Live
     Streams", "Top 100" ...)
   - VR idea: an "Explore" menu listing the feeds; each opens as titled rows of cards (or
     one shelf per page). Podcasts and Courses are playlists; they open as playlists.
4. [ ] **News and Sports feeds** (small to medium; v0.74.0: News is an Explore tab, its sections
   run together as one list, `feedVideos('news')`; its own tabs and Sports still to come)
   - Code: `feed('news', tab)` (tabs: Top stories, Sports, Business, National, Health),
     `feed('sports')`
   - VR idea: the same as other Explore feeds plus a tab row. News also has a posts shelf
     (text posts need the post cards from the channel Posts tab).
5. [x] ~~**History, Playlists, Watch later, Liked videos**~~ DONE (v0.35.0-0.35.1: Browse
   tabs. History and Playlists use `feedVideos('history' | 'playlists')`, Watch later /
   Liked use `youtubeContent.playlistVideos('WL' | 'LL')`. The You page itself was dropped:
   its shelves are these tabs. ~~Subscriptions~~ DONE in v0.22.0)
   - Code: `feed('history' | 'library' | 'watchLater' | 'liked')`
   - Note: these only show a sign-in message while signed out, so their readers are
     unverified. Probe them signed in first (the 0.22.1 identity fix applies), fix the
     readers if needed, then each is one more source tab in the Browse panel. Probably the most useful
     items for everyday use.
6. [x] ~~**Search suggestions**~~ DONE (v0.44.0: a list dropping down under the Search
   panel's box while you type, up to 8; click one to search for it)
   - ~~Code: `suggestions(text)` -> YouTube's autocomplete~~ (verified Oct 2026: up to 12,
     about 0.2 s, works from the youtube.com page)

7. [x] **A playlist's page before playing it** (0.96.0 to 0.96.2): clicking a
   playlist card (not a mix: mixes have no page and still play at once) opens it in place of
   the list, in Explore, You, Search and the Channel panel: its picture, title, author, stats
   and description, **Play all**, **Shuffle**, **Save** (signed in, someone else's playlist),
   then its videos as rows (a row plays from that video). Back, or the tab again, returns to
   the list; leaving the panel keeps it open (0.96.0: details, rows, scrolling, Play all,
   navigation, Save (not on your own playlists, as on YouTube) and Shuffle work in the headset).
   Up Next (0.96.1, works in the headset): its playlist tab shows the
   playing playlist the same way (Shuffle toggle, Save), and its Recommended playlist cards
   open their page (untested: none showed up yet). Save shows at once on every open page
   (0.96.2).

## Deferred

Left out for now by the maintainer; each can come back if there is demand for it.

- **Learning** (the Explore tab; the maintainer, 2026-10-18)
  - What: YouTube's Learning page, an AI prompt ("What do you want to learn?") that generates
    tabs, shelves and quizzes from the topic you type.
  - Why: a different kind of page (typing a topic, AI-generated content of an unknown shape),
    and Courses already brings learning content into VR. Its tab stays "Coming soon".
- **Shelves from the Home feed** (small)
  - Why: Shorts are a poor fit for this extension, and the "Top news" shelf is rarely
    used. The shelves' items are often less related to what's recommended elsewhere, so
    there's no immediate need.
  - Code: `p.shelves` -> [{ title, items }] ("Shorts", "Top news")
  - VR idea: show them as extra pages or a row; Shorts need tall cards (see the Shorts
    tab in `channel-page.md`).
- **Left menu from YouTube** (small to medium)
  - Why: building the Explore menu from YouTube's own list adds little; that list is
    rarely used.
  - Code: `guide()` -> [{ title, section, browseId, params, url }]
  - VR idea: build the Explore menu from YouTube's live list instead of a fixed one, so
    new entries show up on their own. Skip entries VR can't play (see below).

## Not available yet (needs more work in the code first)

Also sorted easiest first.

1. **Mixes on Home**: a couple of cards without a content type; not read yet.
2. **Notifications**: signed-in only; not probed.
3. **The endless Shorts feed** (the menu's Shorts button): YouTube didn't give its video
   sequence through the API. Shorts are still reachable from the Home feed's Shorts
   shelves, channel Shorts tabs and Gaming.
4. **Movies & TV, Playables**: the lists can be read, but paid films need purchase and DRM,
   and games aren't videos, so VR can't play either. Probably never.
5. **Trending**: retired by YouTube (the request is refused). Explore feeds replace it.
