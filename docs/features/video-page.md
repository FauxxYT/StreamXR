# Video Page Features

YouTube watch-page features that the code can already read or control (in the
`src/sites/youtube/page/youtube-*.js` modules) but that the VR interface doesn't use yet. Ordered from
least to most work. Tick an item off (or delete it) when it ships in VR.

Full data inventory with live-probed notes: the maintainer's private "YouTube Watch Page Data" notes (not
published; what matters from them is in this file and docs/youtube.md).

## Small: a button or switch on something that already exists

- [x] ~~**Loop on/off**~~ DONE (v0.25.0: Playback group in Format Settings)
  - ~~Code: `youtube.loop()`, `youtube.setLoop(on)`~~
- [x] ~~**Autoplay on/off**~~ DONE (v0.25.0: next to Loop)
  - ~~Code: `youtube.autoplay()`, `youtube.setAutoplay(on)`~~
- [x] ~~**Audio track menu**~~ DONE (v0.27.0: an "Audio" tab in Settings, only on videos with
  more than one track; a grid of tracks marked auto-dubbed / original)
  - ~~Code: `youtube.audioTracks()`, `youtube.setAudioTrack(id)`~~
- [x] ~~**Live streams**~~ DONE (v0.26.0: red "● LIVE" label in place of the time; grey
  with "−0:45" when behind, click it to jump back to live; seek bar = the rewindable part)
  - ~~Code: `youtube.live()`, `youtube.goLive()`~~
- [x] ~~**Playlist controls**~~ DONE (v0.23.0-0.24.0: Previous/Next buttons with hover
  cards, "Playlist 3 / 25 · name", Playlist tab in Up Next)
  - ~~Code: `youtube.playlistPosition()`, `youtube.nextVideo()`, `youtube.previousVideo()`,
    `youtube.playAt(index)`, `youtubeContent.playlist()`~~

## Small to medium: additions to existing panels

- [x] ~~**Endless Up Next**~~ DONE (v0.20.1: loads the next batch near the last page)
  - ~~Code: `youtubePage.loadMoreRecommendations()`~~
- [x] ~~**Playlists and mixes in Up Next**~~ DONE (v0.27.0: merged into Recommended where
  YouTube puts them, labelled "Mix" / "Playlist"; they open as playlists. Signed out,
  YouTube suggested none on the videos checked, so this is unverified until seen signed in)
- [x] ~~**Chapter list**~~ DONE (v0.28.0: "Chapters" tab of the new Description panel; the
  Description panel is where the description text (below) will go as a second tab)
  - ~~Code: `youtubeContent.chapters()`~~
- [x] ~~**Most Replayed graph on the seek bar**~~ DONE (v0.41.0: a soft curve over the seek
  bar while it's pointed at or dragged, as on YouTube)
  - ~~Code: `youtubeContent.mostReplayed()`~~
- [ ] **Movies in Up Next** (seen by the maintainer in 0.66.1, signed in: a free movie rated
  PG-13 in Recommended). Two parts:
  - **Fix:** its card's grey line shows the movie's price ("Free") and rating ("PG-13")
    where a video shows its views and upload date: YouTube's movie items put those in the
    fields our parser reads as views / age. Read movies as their own kind and show what
    fits (e.g. the year, the rating, the price or "Free"), never price / rating in the
    views slot.
  - **Add:** a **Movie tag** on the card, beside the 2D / 180° / 360° tag (`cards.js`
    kinds): the Material Symbols **`movie`** icon (already in `symbols.js`) instead of
    text, in **yellow** (the maintainer's choice), so movies stand out from regular videos.
  - Code: the Up Next items (`youtubePage` recommendations, the card fields in
    `provider/cards.js`); check Browse and Search results show movies the same way.
- [ ] **Premium features** (the maintainer, after 0.78.4): YouTube Premium's extras in VR, marked with
  Material Symbols' **Diamond** icon: **purple** when you don't have Premium (an upsell, like
  YouTube's own), **YouTube Red** when you do. To include: the Premium quality levels
  ("1080p Premium" in the Quality menu: check they show and work), **Add to queue**, and
  Premium's other features (to list from the watch page: e.g. Jump ahead, downloads where
  they make sense in VR). Find out first how the page says whether you have Premium.

## Medium: new panels with scrolling or long text

- [x] ~~**Captions**~~ DONE (v0.77.0: a Captions button and menu (Off + tracks) on the controls
  panel; the lines YouTube shows on the page are read from its DOM and drawn in VR)
  - ~~Code: `youtube.captions()`, `youtube.setCaptions(track)`, `youtube.captionLines()`~~
  - Note: YouTube draws captions on the page, not into the video picture, so VR never sees
    them; StreamXR reads the lines as they appear (captions-overlay.js draws them).
- [ ] **End screen**
  - Code: `youtubeContent.endScreen()`
  - VR idea: show the suggested videos and channel links when a video ends.
- [x] ~~**Description panel**~~ DONE (v0.29.0: "Description" tab: views · date, the text
  without its chapter list, scrolling; timestamps seek, YouTube video links open)
  - ~~Code: `youtubeContent.descriptionWithoutChapters()`, `youtubeContent.metadata()`~~
- [x] ~~**Transcript panel**~~ DONE (v0.29.0: "Transcript" tab when the video has one;
  loading spinner, current line highlighted and followed, click a line to seek)
  - ~~Code: `youtubeContent.transcript()`, `youtubeContent.hasTranscript()`~~
- [ ] **Info cards**
  - Code: `youtubeContent.cards()`
  - VR idea: show the "i" cards (linked videos/playlists) at their times.

## Large

- [x] ~~**Comments**~~ DONE (v0.30.0: "Comments" tab of the Description panel: Top / Newest,
  scrolling with more loading near the end, replies opened under a comment, clickable times)
  - ~~Code: `youtubeContent.comments(sort)`, `replies(comment)`, `commentsInfo()`~~
  - v0.30.1: the creator's ❤ shows; like / dislike buttons (confirmed signed in).
  - Not yet: replies to replies (YouTube's newer nested threads), writing comments
    (writing needs the VR keyboard).
- [ ] **Live chat** (medium to large, read-only first): **phase 1 (reading) built in 0.79.0**,
  working in the headset since 0.79.1 (checked by the maintainer).
  - Code: `youtube-chat.js` (the views, the chat page, polling every 2 s; docs/youtube.md,
    "Live chat") and `provider/live-chat.js` (the panel; Info style's `chat` content). A
    finished stream's **chat replay** plays along with the video since 0.87.0 (to check):
    fetched ahead with `live_chat/get_live_chat_replay`, each message shown at its time in the
    video, following pauses and seeks.
  - Messages: text with emoji images, author with badges (moderator, member, verified),
    Super Chats / Stickers (coloured, with the amount), membership messages.
  - Decided (design-choices.md, 2026-10-16): a **right-side panel** from a Chat button on the
    right toolbar, shown only on live streams and chat replays; it **doesn't fade** with its
    toolbar (a generic registry option, no chat field in the shell). Newest at the bottom,
    auto-scrolling, with "jump to newest" after scrolling back; a replay follows the video
    time and seeks.
  - Phases: 1. **reading** (messages, badges, Super Chats / Stickers, memberships, the pinned
    message as a banner, member emojis inline: 0.79.0); 2. **reactions** (a row of reaction
    buttons along the panel's bottom, sent with `youtubeChat.react()`: 0.80.0, working in the
    headset; other viewers' floating reactions deferred, see "Deferred"); 3. **typing** with the existing VR keyboard, which
    gains an **emoji layer** (standard emojis plus the set the panel hands it: the channel's
    member emojis), and a **"Support on desktop"** button (paying stays out of VR): built in
    0.81.0, to check (a message field with Send; the keyboard's 😀 pages; Support opens a dialog
    pointing to YouTube's own window). Then **Top fans** (0.82.0, to check): your XP in a 👑
    pill at the right of the chat's tabs, opening the ranked list in the panel (your row at
    the bottom), and the top three's "#1" / "#2" / "#3" pills in the chat.
  - Then **every side panel movable** (left and right): a grab bar beside each side's toolbar,
    on the video side (0.85.0; a bar under the panel in 0.83.0, a toolbar button in 0.84.1). Moving one moves its whole side (toolbar and panels);
    No resizing. Built in 0.83.0 (works in the headset); since 0.84.0 a recenter keeps the moves
    (only the global reset puts them back).
- [x] ~~**Search**~~ DONE (v0.42.0: a "Search" chevron between Channel and Browse, Catalog
  style with a search field; v0.43.0: the in-VR keyboard, right controller's A)
  - ~~Code: `youtubeContent.search(query)`~~ (ads and the Shorts shelf are skipped)

## Also available (no plan yet)

- **Channel/owner details**: `youtubeContent.owner()`
- **Technical info**: `youtube.statsForNerds()` (codecs, resolution, bandwidth, buffer),
  `youtube.videoData()`, `youtube.loadedFraction()`. These could go in the VR Details panel.
- **YouTube's own 360° view angle**: `youtube.sphericalView()`, `youtube.setSphericalView()`

## Deferred

Left out for now by the maintainer; each can come back if there is demand for it.

- **Other viewers' floating reactions in the live chat** (medium; the maintainer, 2026-10-17)
  - What: the emojis that float up over YouTube's chat when viewers press the reaction
    buttons.
  - Why: they arrive as `emojiFountainDataEntity` entity updates (seen once, in probe 9)
    whose shape is unknown, and there's no stream known to send many of them to build
    and test against. Sending your own reactions works (0.80.0).
