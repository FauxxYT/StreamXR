# Changelog

What changed in each version of StreamXR (called "StreamVR" until 0.48, "YouTube VR for
SteamVR" until 0.34.0; older entries use the name and paths of their time). Newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/); versions are the
`manifest.json` version. All of these were developed in October 2026. Technical notes for
developers are in [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/](docs/).

## 0.98.2

### Added
- **The autoplay countdown in VR**: while YouTube counts down to the next video at a video's
  end, the next video floats above the Autoplay button ("Up next in 5", its thumbnail, title
  and channel), and hidden panels come back for it. Clicking it plays that video now;
  switching Autoplay off cancels the countdown. Read from YouTube's own player (UNVERIFIED).

## 0.98.1

### Fixed
- **The end screen didn't show with the panels hidden**: like a skippable ad, it now brings
  hidden panels back (the shell's panels get `host.reveal()`).
- **The previous video's end screen stayed on the next one**: just after a switch, the end
  screen read a moment earlier (and the player's time) could still be the previous video's,
  so the tab came straight back with the old tiles. The tiles now say which video they're
  for, and a new video's end screen can only start once it has played for a moment.

## 0.98.0

### Added
- **The end screen in Up Next**: when a video's end screen starts (its last seconds), Up Next
  gets an **End screen** tab with the creator's suggested videos and playlists, and other
  channels, as cards; it switches to the tab, and opens if it was closed. The tab stays until
  another video starts. A video plays, a playlist opens its page, a channel opens in the
  Channel panel. The video's own channel and Subscribe tiles are left out (the controls panel
  has both), as are links to other sites.

## 0.97.4

### Fixed
- **An info card's video showed first in Up Next**: reading Up next from the page also picked
  up the description panel's info cards (YouTube keeps that panel in the same side column);
  links inside YouTube's side panels are now skipped.
- **The info card teaser could come up with the panels hidden**: like Skip ad, a teaser now
  brings the controls panel back, and it stays while the teaser shows.

## 0.97.3

### Changed
- **The Cards menu shows the cards as videos**: each row has the video's thumbnail with its
  length, its title, and channel · views · age (the shell's menus can now show a picture on
  a row's left).
- **The info card teaser is clickable**: pointing at it and clicking plays the card's video.

## 0.97.2

### Fixed
- **Info cards read from where YouTube keeps them**: the video's description data (its
  "infocards" section), so the Cards menu lists the real cards (title, then channel, views
  and age), and the button is greyed only on videos without any.
- **The teaser now follows YouTube's own**: the cards' times aren't in YouTube's data, so the
  teaser floats above the Cards button while YouTube's player shows its card teaser (read
  from the player, UNVERIFIED), with the card it's about. The "View corrections" teaser every
  video has is ignored.

## 0.97.1

### Fixed
- **Every video seemed to have a "View corrections" info card** (the Cards button never
  greyed out): YouTube's card list holds that teaser on every video, with nothing behind it
  but its corrections panel. It's left out; the real cards are still to read (they weren't in
  that list on a video that has them).

## 0.97.0

### Added
- **Info cards**: a **Cards** button on the controls panel (after Captions; greyed on a
  video without cards). Its menu lists the video's cards (title, what it is, when it comes);
  a choice plays the card's video or playlist (a link to another site says it opens on
  desktop). When a card's time comes, its teaser floats above the button for 6 seconds,
  like the Previous / Next hover card, and the button's icon fills.
- **Autoplay** on the controls panel (next to Play, on the right): YouTube's own switch,
  On / Off under its icon.
- The shell: a site button can have a `teaser` (a card floating above it); the `autoplay`
  icon.

### Changed
- **The controls panel is wider** (1408 px, was 1216) so its 13 buttons keep their full size
  and the row stays even on both sides of Play.

## 0.96.6

### Fixed
- **The pill row jumped back to its start after picking a pill** (seen on Gaming's game
  shelves): a chosen section reads fewer pages, so it offered fewer pills; the pills already
  offered now stay, with new ones added after them. A sliding row also keeps its place when
  more pills arrive at its end.

## 0.96.5

### Added
- **Gaming's game shelves** (signed in): each game's row of videos on YouTube's Gaming page
  (Fortnite, Red Dead Redemption 2, Half-Life: Alyx ...) is now a pill on Explore's Gaming
  tab, with its videos; a pill's "View all" leads to the game's own page. The game cards
  themselves ("Top live games", Playables) are left out: they're games, not videos.

## 0.96.4

### Added
- **A shuffle card on Next while shuffle is on**: pointing at the controls' Next shows "A
  random video from this playlist · Shuffle is on" with the shuffle icon, instead of no card
  (the next video isn't known until it plays). With shuffle off, the next video's card as
  before. The generic card takes an `icon` drawn in place of a missing picture.

## 0.96.3

### Changed
- **No Next preview while a playlist is shuffled**: YouTube only picks the next video when it
  gets there (its own Next preview shows the in-order one too), so the controls' Next shows
  no card instead of a wrong one. Reverts 0.96.2's attempt to read it from the player's Next
  button (it showed the in-order video).

## 0.96.2

### Fixed
- **Next showed the in-order video with shuffle on**: the controls' Next (its hover card)
  now shows the video YouTube will actually play next, read from the player's own Next
  button while the playlist's shuffle is on (UNVERIFIED that its link follows the shuffle).
- **Save showed different states in two panels**: saving or removing a playlist now shows at
  once on every open page of it (Up Next's playlist tab and a page opened from a card).

## 0.96.1

### Changed
- **Up Next's playlist tab is now the playlist as a page** (as when a playlist is opened from
  its card): its picture, title and position, **Shuffle** (an on / off toggle) and **Save**,
  then all its videos as rows, the playing one marked and brought into view when it changes.
- **A playlist card in Up Next's Recommended opens its page** in Recommended's place (a back
  button returns), instead of playing at once. Mixes still play at once.
- The Queue style can show a collection page, scrolling.

### Fixed
- **Shuffle only shuffled the first video**: after YouTube's Shuffle play, StreamXR now also
  turns on the watch page's own playlist shuffle once it shows (UNVERIFIED: the toggle is
  found by its "Shuffle" label).

## 0.96.0

### Added
- **A playlist's page before playing it**: clicking a playlist card in Explore, You, Search
  or the Channel panel opens the playlist in that panel: its picture, title, author, stats
  and description, **Play all**, **Shuffle** and **Save** (to your library, signed in), then
  its videos as rows, more loading as you scroll. A row plays the playlist from that video.
  **Back** (or the tab again) returns to the list; the playlist stays open while you use
  other panels. Mixes still play at once.
- The shell's **collection page** (`styles/collection.js`), shown by the Catalog and Profile
  styles under a back button; the Catalog style can now scroll it. The `shuffle` and
  `playlist_add_check` icons.

## 0.95.9

### Added
- **"Members only" on members-only posts**: the same Members only flag as on members-only
  video cards, after the channel's name (in the Membership tab's Posts, the Posts tab and an
  opened post). The Profile style's posts take `flags` for this.

## 0.95.8

### Added
- **Your membership in the Channel panel**: on a channel you're a member of, the Membership
  tab has three pills: **Perks** (your level, how long you've been a member, and your perks
  with their custom emoji and loyalty badges), **Videos** (YouTube's highlighted
  members-only videos) and **Posts** (recent members-only posts, with likes, polls and
  comments as on the Posts tab).

## 0.95.7

### Added
- **The Channel panel's Podcasts tab**: the channel's podcasts, their square covers shown
  whole in the cards.

### Fixed
- **The Channel panel said "Subscribe" on a channel you're subscribed to** (seen on one
  you're a member of): YouTube's answer for the channel now wins over the first guess from
  the watch page, which could be the previous video's. A subscription change also drops the
  channel's saved answer, so reopening it shows the change.
- **No Membership tab on a channel you're a member of**: members get YouTube's Membership tab
  but no Join button, so the tab now shows whenever the channel has one. Without a Join offer
  it says your membership is on desktop for now.

## 0.95.6

### Removed
- The members-only dialog's console diagnostics (0.95.4): the cause is fixed (0.95.5, works
  in the headset).

## 0.95.5

### Fixed
- **The members-only dialog on a normal video opened right after a members-only one** (found
  with 0.95.4's log): the checks behind it were cached for half a second, so just after the
  switch the new video got the previous video's answers ("won't play", "members only"). Those
  checks now start over the moment the playing video changes.

## 0.95.4

### Changed
- **Diagnostics for the members-only dialog** (it still comes up on a normal video opened
  right after a members-only one): each time it comes up, the console logs what it was decided
  from ("[streamxr] members-only dialog for …": the address, the playing video, the player's
  and the watch page's data), to find the cause.

## 0.95.3

### Fixed
- **The members-only dialog on a normal video, again:** a video now counts as members only
  only when the watch page itself marks it so (the "Members only" badge under its title),
  read from the page's data for the playing video, so the player's leftover status from the
  previous video can't set it off. The dialog also asks again only after a normal video has
  played for a moment.

## 0.95.2

### Fixed
- **The members-only dialog still came up on a normal video opened right after one:** the
  player's leftover data for the members-only video doesn't name its video, so the check in
  0.95.1 couldn't tell it was stale. The data last seen with the previous video is now ignored
  until the player has the new video's.

## 0.95.1

### Fixed
- **The members-only dialog** showed only OK on a members-only video (it asked before the page
  had the offer: it now waits up to 3 s for it), and came up again on the next, normal video
  (the player still held the previous video's status for a moment: only the playing video's
  counts now). It also comes back each time you open a members-only video again.

## 0.95.0

### Added
- **Members-only videos offer their channel's membership:** opening one brings up a dialog
  ("Members only: <channel>", YouTube's line about the level it needs) with **See perks** and
  OK. See perks opens the channel's new **Membership** tab in the Channel panel.
- **The Membership tab** (signed in, channels with memberships): YouTube's "Join this channel"
  offer in VR: the channel's picture, each level with its price, its perks (with their badges
  and emoji) and its disclaimer, and the footnote. Joining stays on desktop: each level shows
  a greyed **Join on desktop** button. A creator card in Explore → Memberships opens it.
- For other sites (ARCHITECTURE.md): the Profile style's **'tiers'** page (plans or levels to
  join: each with a title, price, button, items with small pictures, a note).

## 0.94.6

### Fixed
- **Explore → Memberships** only offered "Creators for you" as a creators' pill: YouTube puts
  "Popular creators", "Trending content", "Up-and-coming" and "Loved by members" in one block
  of the page, and only its first shelf was read. Every shelf in a block is its own pill now
  (on every Explore page).
- **Creator cards** show the channel's banner behind its round picture (no more plain grey).

## 0.94.5

### Fixed
- **Memberships' creators didn't show signed in** ("Creators for you", "Popular creators",
  "Up-and-coming"): their cards carry the channel in a different encoded parameter then; the
  reader now looks in all of them.

## 0.94.4

### Changed
- **A video YouTube won't play** (e.g. members only) now shows its thumbnail on the screen,
  and the **Play** button is greyed out, besides the red line saying why.
- **The Channel panel follows the playing video:** while it shows the playing video's channel,
  it switches to the next video's channel when another video starts (unless you've gone to
  another channel, a search or a post in it).
- For other sites (ARCHITECTURE.md): a provider's `poster()` (pictures the screen shows in
  place of a video the site won't play) and the state's `playable`.

### Fixed
- The playing video's channel is read from the watch page when the player's data lacks it (a
  video YouTube won't play).

## 0.94.3

### Fixed
- **Podcasts' "All" pill** now shows square cards too: a list that's mostly podcasts uses the
  square layout, its few regular videos shown whole inside their square.
- **A video YouTube won't play** (e.g. one for channel members only) showed nothing in VR: the
  controls panel's line under the title now says why, in red ("Members only: join this
  channel on desktop to watch it." for members-only videos).

## 0.94.2

### Added
- **Square podcast cards:** a list of podcasts (Explore → Podcasts) shows square cards with
  each show's own square cover, a **Podcast** flag and its episode count (12 to a page);
  sections with regular videos (e.g. "Live now") keep the usual cards.
- **Memberships:** the creators to join ("Popular creators", "Up-and-coming") show as their own
  pills, as cards with the creator's round picture, name and monthly price; clicking one opens
  their channel. Joining stays on desktop.
- **Members only** flag (green) on videos for channel members only.
- For other sites (ARCHITECTURE.md): the card grid's **square layout** (`shape: 'square'`,
  Catalog's `perPageFor(shape)`).

### Fixed
- An Explore page whose "load more" sits at the end of its own section list stopped after its
  first page.

## 0.94.1

### Changed
- **Explore's pills show the whole shelf:** picking a section's pill (Live's "Live Now", Hype's
  "Top 100" ...) shows everything YouTube's "View all" leads to (its own page, loading more as
  you page through, or its playlist), not just the shelf's first cards.
- **More sections as pills:** a page's later sections (e.g. Gaming's game shelves, signed in)
  are read up front, so they're offered too.
- **News** shows its own tabs as pills: Top stories, Sports, Entertainment, Business,
  Technology, World, National, Health.

### Fixed
- **Mixes had no thumbnails** (Music): YouTube's mix art can't be drawn in VR (its image server
  refuses), so a mix shows its first song's thumbnail instead.
- The pointing ring round the selected tab or pill was cut at either end of a row that slides.

## 0.94.0

### Added
- **Explore's Live, Gaming, Music, Hype, Courses, Podcasts and Memberships tabs** (until now
  "Coming soon"): each shows YouTube's page of that name, with its sections as pills ("All"
  first, then e.g. Live Now, Recent Live Streams, Upcoming Live Streams on Live). Podcasts and
  Courses open as playlists. Shorts, Movies & TV and Learning are still to come.

## 0.93.4

### Fixed
- **Seams on 360° cubemap videos:** thin lines along the cube's edges on YouTube's 360° "mesh"
  videos, with the glass look on. The cubemap is now read at full resolution (the glass's
  blurred copies of the video made the edges pick up their smallest one); regular 360° videos
  never had them.

## 0.93.3

### Changed
- The cinema screen's and 3D Cinema's icons are Material Symbols' **2d_2** and **3d_2** (the
  plain "2D" / "3D" lettering).

## 0.93.2

### Changed
- **The Format button** always says **Format**; its icon shows the chosen format (the format's
  name is in the menu).
- The cinema screen's icon is Material Symbols' **2d** (3D Cinema keeps `3d`).
- The Format menu names Cinema screen 3D side by side "Cinema 3D / side by side" again.

## 0.93.1

### Changed
- **The Format menu** shows each format's icon on the left of its row (as the Quality menu
  does), the same icons as the Format button.
- Cinema screen 3D side by side is called **3D Cinema** on the Format button (the longer name
  was too tight).

## 0.93.0

### Added
- **Cinema screen 3D side by side** (asked for by [@damics80](https://x.com/damics80)): a new format for regular (not VR180) 3D videos that put
  both eyes in one frame: the cinema screen gives each eye its half, in 3D, with the `3d` icon
  on the Format button (180° 3D side by side keeps its own). The screen takes one eye's shape:
  a 16:9 frame with each eye squeezed into half ("half side by side", the usual upload) shows
  at 16:9, a frame of two full pictures (wider than 2.5:1) at half its width. The glow and the
  glass behind the panels show each eye its own half too. Picked by hand in the Format menu.

## 0.92.3

### Fixed
- **Jump ahead** now follows YouTube's own Jump ahead pill: the button at the seek bar's end
  shows only while YouTube offers it (so not on videos without it, live streams or their
  replays), and clicking it clicks YouTube's pill, which jumps (the keyboard shortcut it sent
  before did nothing from VR). Greyed out while paused.

## 0.92.2

### Fixed
- **Videos didn't open from the Channel panel or History** while YouTube's page was on a
  channel page (VR started there, nothing playing yet): YouTube ignored the in-page
  navigation there. It's now sent from inside the page, which works on channel pages, Home
  and the watch page alike.
- **Floating menus:** the ticked row covered the pointing ring of the row next to it; the
  rings are drawn after all the rows now.
- **You → Channels sort pills** still didn't show: the sort choices sit deeper in YouTube's
  answer than the reader looked; it searches all the way down now.

## 0.92.1

### Changed
- **Jump ahead** moved to the end of the seek bar, where Skip ad shows during ads (the
  maintainer's choice): a button with the Diamond, "Jump ahead" and fast-forward; the seek bar
  shortens for it. It's hidden on live streams and greyed out while paused. (A generic slot:
  a site's `extras.seek` button, panel-ui.js.)

## 0.92.0

### Added
- **Jump ahead** (YouTube Premium) on the controls panel, right after +10 s: fast-forward over
  the **Diamond**. It jumps to the point most viewers skip to, as YouTube's own Jump ahead
  does (it sends YouTube's desktop shortcut, Ctrl + →, to the player). Usable while a video
  plays; not on live streams or during an ad. Without Premium it's greyed out with the purple
  Diamond. On videos YouTube doesn't offer Jump ahead for (Shorts, music, movies...) it does
  nothing.

### Changed
- The controls panel's buttons narrow a little when the site adds more buttons than fit the
  row, so it keeps its margins (one more site button on the right, Jump ahead, made it so).

## 0.91.0

### Added
- **1080p Premium** in the Quality menu (YouTube Premium's enhanced-bitrate 1080p, on videos
  uploaded at 1080p): its own row just above the plain 1080p, marked with the **Diamond** in
  YouTube red. Without Premium the row shows a purple Diamond and is greyed out (as YouTube's
  own menu upsells it). While it plays, the Quality button shows Full HD with the Diamond.
- For other sites (ARCHITECTURE.md): an icon can carry its own colour (`{ name, color,
  filled }`: symbols.js `drawIcon`), in menu rows and on the Quality button; a quality level
  can be `disabled`.

## 0.90.3

### Fixed
- **You → Channels:** the sort pills (Most relevant, New activity, A-Z) and the section flags
  (e.g. **Purchased**) never showed: they're read now from where YouTube's page really keeps
  them (the sort choices as list items that reload the list, the sections as titled shelves).

## 0.90.2

### Removed
- **The Posts pill in You → Subscriptions:** desktop YouTube's Subscriptions feed doesn't mix
  community posts in (checked signed in), so it always came up empty. Posts are still on each
  channel's Posts tab.

## 0.90.1

### Added
- **Channels sort pills:** You → Channels offers YouTube's own sort choices for the list (Most
  relevant, New activity, A-Z), the one it's sorted by chosen. Channels YouTube lists in a
  section of their own (e.g. **Purchased**, a channel you're a member of) carry that
  section's name as a flag.

### Fixed
- **3D side by side:** the glass panels showed the left eye's picture behind them in both
  eyes; each eye now sees its own half behind the glass too.
- **Floating menus** (the bell's, Format, Quality...) cut off the pointing ring round their
  first and last rows.
- The Channels list could stop after its first page when YouTube splits it into sections.

## 0.90.0

### Added
- **Your channels** (You → **Channels**, signed in): the channels you subscribe to, A to Z, with
  their round pictures, handle · subscribers and their notification setting. Click one to
  open it in the Channel panel.
- **The notification bell** on the Channel panel: once you're subscribed, a round bell button
  beside Subscribed opens a small menu with YouTube's choices (All, Personalized, None), the
  current one ticked; its icon shows which is on. The tick moves only when YouTube confirms.
- **Posts from your subscriptions:** You → Subscriptions has two pills, **Videos** (the feed)
  and **Posts** (the community posts mixed into it). A post that shares a video plays it;
  any other opens its channel's Posts tab.
- For other sites' panels (ARCHITECTURE.md): side panels can open a floating menu from one of
  their controls (`host.openMenu(control)`, the controller's `menu(control)`, choices as
  `{ type: 'menu' }` events) and reach another panel's controller (`host.panel(id)`); the
  Profile style has a round icon button beside its action button (`iconAction`) and
  `rectOf(id)`; a card can show a round picture (`fit: 'round'`). New icons: `diamond`,
  `fast_forward`, `notifications_off`.

## 0.89.0

### Added
- **3D side-by-side videos** (the VR180 ones spotted by [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack)): a new format, **180° 3D side by side**, in the Format menu (and
  the video page's format picker). Some VR180 videos reach the browser with both eyes in one
  frame (left eye's picture on the left), which used to be stretched over the half sphere as
  one picture; this format gives each eye its half, in 3D. YouTube's data doesn't mark these
  videos, so pick it by hand when a VR180 video shows two pictures side by side. (Most 3D
  videos reach desktop browsers as one eye only and still play flat:
  [decisions/0002](docs/decisions/0002-site-player-only.md).)
- For other renderers: the glass backdrop's `uvX` option (the part of the frame a sphere
  backdrop covers, across), `formats.eyeSpans(fmt)`.

## 0.88.1

### Changed
- The Auto-hide tab's new switch is called **"Auto-hide while paused"** (was "Hide while paused"), so
  it says what it does.

## 0.88.0

### Added
- **Pull the trigger on empty space to hide everything at once** (suggested by [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack)): the controls panel, the side
  toolbars, the search bar and the lasers go away without waiting for auto-hide (paused too).
  A press that closes a menu, a dialog or typing still only does that; the next one hides.
  Another pull, or pointing at a panel, brings them back. Panels set to stay up (the live
  chat) stay.
- **Settings → Auto-hide → "Hide while paused"** (suggested by [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack); off by default, remembered): while on, the
  auto-hide waits also run with the video paused, so you can pause and take in a 180° / 360°
  scene with nothing in the way. The waits themselves are unchanged.

## 0.87.1

### Fixed
- Opening a video whose chat YouTube's page hasn't loaded yet (e.g. going from a stream without a
  chat replay to one with) showed "Couldn't load the chat" until you switched tabs. The chat now
  shows the loading indicator and tries again on its own (every 3 s, up to five times) before
  giving up.

## 0.87.0

### Added
- **Chat replays:** on a finished live stream that kept its chat, the Live chat panel plays the
  recorded chat along with the video (tabs: YouTube's "Top chat replay" / "Live chat replay").
  Each message appears when the video reaches the moment it was sent, so pausing stops the
  chat, and jumping back or ahead starts it again at the new place with the last minute of
  chat shown at once. It opens by itself as the live chat does. No typing, reactions or Top
  fans in replays, as on YouTube.

## 0.86.0

### Added
- **Settings → Safe zone → "Recenter resets panels"** (off by default, remembered): while on,
  recentering also puts the panels you moved back in their places, as before 0.84.0. The global
  reset turns it off.

### Changed
- The left D-pad's icon (show / hide the panels) is Material Symbols' **Bottom Panel Close**
  while the panels are up and **Bottom Panel Open** while they're hidden (was a single "call to
  action" icon).

## 0.85.0

### Changed
- **The side panels' move handle is a grab bar** beside each side's toolbar, on the video side:
  an upright pill with a drag handle, like the keyboard's and the controls panel's bars (so
  everything you can move is grabbed the same way), with a laser zone wider than it looks.
  Grip it to move the whole side. It replaces the Move button at the toolbar's end; the
  toolbars stand a little further out to make room.

## 0.84.2

### Changed
- **The grip's icon shows a hand** (Material Symbols' Back Hand) instead of recenter whenever the
  grip would grab rather than recenter: pointing at (or holding) a move bar or the side
  toolbars' Move handle, the keyboard's bar or resize corners, or the cinema screen's bar and
  corners.

## 0.84.1

### Changed
- **The side panels' move handle is on their toolbar** now: a **Move** button (four arrows) at
  the end of each side's toolbar, after a small divider; pointing at it grows its name like the
  others, and gripping it moves the whole side (the point you hold follows your hand). It
  replaces the bar under the panel, which was hard to find.

## 0.84.0

### Changed
- **Recenter keeps what you moved:** recentering turns the layout to where you're looking and
  brings your moved panels along, each where you put it relative to you: the controls panel
  (with the keyboard and Settings) and any side moved by its grab bar. It used to put them all
  back. Changing the Safe Zone or the panel size keeps them too; only the global reset (right
  stick held 3 s) puts them back in their places.

## 0.83.1

### Fixed
- Pointing at the **live chat while the other panels are hidden** (it stays up while you watch):
  the stick showed its seek icon instead of the scroll icon, and pushing it scrolled the chat
  *and* jumped the video ±10 s. The stick now belongs to a panel that stays, as to any shown
  panel: scroll icon, scrolling only.

## 0.83.0

### Added
- **Move the side panels:** a grab bar under each side's open panel (left and right). Grip it
  and move: the panel follows your hand and turns to face you, and its whole side comes along
  (the toolbar, and every other panel on that side opens there too). Recenter, a Safe Zone
  change or a new panel size puts the sides back. (`vr-panel.js` keeps a move per side;
  `orbiters-ui.js` `createGrabBar`; `math3d.js` `invertRigid`.)

## 0.82.1

### Fixed
- **Two text cursors:** clicking the search bar while typing in the live chat (or the other way
  round) left a cursor in the field you'd left, and a click on nothing then only cleared one.
  Now the field you leave stops typing as soon as another one starts (the shell sends it
  Escape), and the keyboard stays up through the switch.

## 0.82.0

### Added
- **Top fans** in the live chat: your **XP** in a 👑 pill at the right end of the chat's tabs
  (kept up to date as you chat); clicking it opens the **Top fans** list in the panel: rank,
  picture, name and XP, the top three with their badges, and your own row at the bottom with
  YouTube's line about it (refreshed every 30 seconds while open; ‹ goes back to the chat). The
  top three's **"#1" / "#2" / "#3" pills** now show before their names in the chat.

## 0.81.1

### Fixed
- The **Support on desktop** dialog cut its message off ("…") before the end: dialogs now
  show up to four lines of text, the card growing to fit (short ones, like "Unsubscribe?",
  stay as they were).

## 0.81.0

### Added
- **Typing in the live chat:** a message field with a **Send** button above the reaction
  buttons. Clicking the field brings up the VR keyboard; Enter or Send posts the message (it
  then appears in the chat), Escape or a click on nothing stops typing. YouTube's limit is kept
  (200 characters, an emoji counting as 10). Where you can't chat, YouTube's reason shows
  instead of the field.
- **Emojis on the VR keyboard:** a 😀 key opens pages of emojis (‹ › between pages), with the
  panel's own first: in the live chat, the channel's member emojis, shown as pictures in the
  field and sent as emojis.
- **Support on desktop** (live chat): a button beside the reactions opening a dialog with what
  the stream offers (Super Chat, gifts, memberships…) and where to pay for it: YouTube's own
  window, with the $ button under the chat.
- For the shell: `typeInto(on, { emojis })`, the dialog's text on two lines and `cancel: null`
  (an information dialog), the Info style's chat `input` and `support`.

## 0.80.0

### Added
- **Live chat reactions:** the stream's reaction buttons (❤ 😄 🎉) along the bottom of the Live
  chat panel; clicking one sends it to YouTube (at most one every half second) and lights the
  button a moment. Shown only when the stream offers reactions (signed in). Other viewers'
  floating reactions aren't shown yet. (Info style's `chat` content: `reactions`.)

## 0.79.1

### Fixed
- **Live chat** said "Couldn't load the chat" on both tabs: the watch page's view tokens load an
  empty chat page. The views' tokens now come from the chat frame beside the stream (the ones
  YouTube itself uses), or, when the page shows no chat, from the pop-out chat page.

## 0.79.0

### Added
- **Live chat** (reading): on a live stream, a **Live chat** panel opens on the right (its
  button, at the top of the right toolbar, shows only on live streams). It **stays up while
  you watch** when everything else fades. Tabs for YouTube's **Top chat** and **Live chat**
  views (the one you pick is remembered); new messages every 2 seconds. Messages show the
  author's picture and name (the owner on a yellow chip, moderators in blue with a wrench,
  members in green with their badge), custom and standard emojis inline, **Super Chats**,
  **Super Stickers** and **memberships** as coloured cards, YouTube's welcome notice, and the
  **pinned message** in a banner at the top. Scrolling back pauses the list ("Chat paused", as on
  YouTube) and a button shows how many new messages are waiting; it, or scrolling to the end,
  goes back to the newest. Deleted messages disappear. YouTube's AI "Chat summary" banner is
  left out. Not yet: chat replays (after a stream), reactions, typing.
- For other sites' panels (generic registry options, ARCHITECTURE.md): `available` (a side
  panel offered only some of the time: its toolbar button hides meanwhile), `autoOpen` (opens
  whenever it becomes available, the panel it replaced coming back after) and `stays` (doesn't
  fade with the rest); the Info style's `chat` content (`styles/chat.js`).

## 0.78.10

### Changed
- The **Quality menu** shows each quality's icons on the left (4K, 2K, Full HD, HD, below-HD,
  plus 60 fps where it applies), the same icons as the Quality button; the tick moves to the
  right end. (A generic menu option, `icons` on an item, popups-ui.js.)

## 0.78.9

### Changed
- The popup's "No VR headset found" message includes the Steam Frame's step: Streaming Status →
  your PC → Advanced → **Stream VR without game** (English and Spanish; the Frame's menu names are
  left in English).

### Documentation
- The README's **Get started** says how to get the Steam Frame ready: with SteamVR running,
  **Streaming Status** → your PC → **Advanced** → **Stream VR without game**, then open Chrome.
  Also in the troubleshooting table, the "What you need" table, the question issue form and
  `docs/hardware.md`.
- The README's "as soon as it's possible" roadmap and "What you need" table: **native Steam
  Frame support**, StreamXR running in the Frame's own Chromium browser (no PC) once that
  browser supports WebXR. Also in `docs/hardware.md` and `docs/whats-left.md`.
- The README's links to "What about Netflix, MAX and the others?" work again.

## 0.78.8

### Fixed
- When reading something from YouTube's page fails (e.g. after a YouTube update), the controls
  panel's chapters, "Most replayed" graph, audio tracks, ad, description, playlist and live state
  fall back to "none" as intended, instead of a missing value that could break the seek bar or
  Settings. (`youtubeData.cached(fn, ms, fallback)` now takes the fallback as an argument; the
  provider was setting it where `cached()` never looked.)

## 0.78.7

### Fixed
- The icons show when the extensions are **pinned** to the toolbar: both manifests now have an
  `action` with the icons (Chrome draws a pinned extension from it). StreamXR's tooltip says to
  open YouTube and click the VR button; clicking it does nothing else (Skip Helper 1.3.1).

## 0.78.6

### Added
- **Extension icons** for StreamXR (Material Symbols' Head Mounted Device) and the Skip Helper
  (Skip Next), in white on a YouTube Red rounded square, at 16, 32, 48 and 128 px (`icons/`,
  `skip-helper/icons/`; Skip Helper 1.3.0). `tools/icons/make-icons.html` draws them again.

## 0.78.5

### Changed
- The 2D Cinema **Distance** slider stops at 2.0 m (was 1.0 m): the screen always stays at least
  30 cm behind the VR panels (1.7 m away) instead of coming through them. A closer distance
  remembered from before moves back to it.

### Fixed
- The extension's description in `chrome://extensions` showed "360Â°" (a garbled character); it
  says "360°" again.

## 0.78.4

### Changed
- **Side panels fade with their toolbars**: an open left or right panel now fades out together
  with its side's toolbar, after the side toolbars' wait (Settings → Auto-hide → Side toolbars),
  instead of staying until the control panel hides. Pointing where they were brings both back.
  The Auto-hide hints say so.

## 0.78.3

### Fixed
- The Quality button's **60 fps** icon on 360° / VR180 videos: YouTube names their qualities
  with an "s" (for spherical) instead of a "p", e.g. "2160s60", which wasn't recognized.

## 0.78.2

### Changed
- The popup's "No VR headset found" message says what enables Enter VR: Chrome only looks for a
  headset when it starts, so connect the headset and start SteamVR, then close every Chrome
  window and open Chrome again (it said to start SteamVR and reload the page).

## 0.78.1

### Fixed
- The VR button in the player always looks enabled: it's now a copy of YouTube's Settings button
  (it was a copy of CC, which YouTube dims on videos without captions), keeps none of the copied
  icon's fill or opacity, and stays fully lit. It still sits where CC is.

## 0.78.0

### Added
- **Start VR from any page**: a VR button in YouTube's top bar, next to **+ Create**, on every
  page (Home, a channel, search results...). With no video playing the popup says so and VR
  starts anyway: pick a video from Explore, You or Search inside VR. The controls panel then
  says "No video playing", and Play, ±10 s, Captions and Save rest until a video opens.
- **YouTube's logo on the screen while no video plays**: the logo from YouTube's own top bar
  (red play button, white wordmark) on a dark 16:9 screen, with its glow; the video replaces
  it as soon as one opens.

### Changed
- The VR buttons and the popup use Material Symbols' **Head Mounted Device** icon (was a
  drawn goggles icon).

## 0.77.1

### Fixed
- **Captions on 180°/360° videos** sit lower (22° below the horizon, was 14° below where you
  looked) and stay put while you look around; once you look more than 25° to the side they
  glide smoothly back in front of you (about half a second) and settle, instead of
  jittering after every small head movement. They no longer follow your head up and down,
  and keep their place between caption lines.

## 0.77.0

### Added
- **Captions button** (left part of the button row): a menu of Off and the video's caption
  tracks. The chosen captions show in VR, TV style (white text on dark boxes): over the bottom
  of the 2D screen, or a little below your view on 180°/360° videos (following it lazily).
  With no tracks the button shows Closed Captions Disabled and is greyed out.
- **Save button** (right part): a scrolling menu of Watch later and your playlists, each
  ticked when the video is in it; a tap adds the video or takes it out (once YouTube
  confirms; the menu stays open). The bookmark is filled when the video is saved anywhere.
- Floating menus can scroll (the stick, or a trigger drag), with a scroll bar.

### Changed
- The controls panel is wider (1216 px, was 1024) for the two new buttons.

## 0.76.3

### Changed
- The glow's defaults: on, **Glow strength 100%** (was 60%) and **Glow length 80%** (was
  35%). Settings you changed yourself stay; Default buttons and the global reset give the
  new values.

## 0.76.2

### Changed
- **Glass shows the cinema screen's glow**: where a panel's glass is past the screen's edge
  (the search bar above it, a toolbar beyond its side), it shows the glow there, blurred,
  instead of only the dark room, so the search bar reads as glass like the side toolbars.

## 0.76.1

### Added
- **Glow length** (Settings → 2D Cinema): how far the glow reaches out from the screen, 10-80%
  of its height (default 35%), with a Default button; remembered.

### Changed
- The Settings panel is taller (600 px, was 520) so the 2D Cinema tab's six rows fit.

## 0.76.0

### Added
- **Glow around the cinema screen** (on by default): a soft light just outside each edge in
  the colors of the picture at that edge, following the rounded corners and the curve, and
  changing with the video. Settings → 2D Cinema → **Glow** (on / off) and **Glow strength**
  (default 60%), remembered. One extra quad behind the screen, reading the blurred copies
  of the video the glass look already makes (WebGL 2).

## 0.75.0

### Added
- **Buffer on the seek bar**: the track past the playback position is solid as far as the
  video is loaded and faded beyond it (not on live streams or ads).
- **Rounded corners on the cinema screen**: 2D videos show as a rounded rectangle (radius
  2.5% of the screen's width, curved or flat).

## 0.74.2

### Fixed
- **Your channel** only offers the chips your channel has (from its tabs): with no live
  streams there's no Live chip, instead of one showing your videos.

## 0.74.1

### Changed
- **Your channel** shows your channel inside the You panel (right), instead of opening the
  left Channel panel (the left side stays about the playing video): its videos, newest
  first, with chips for Videos, Shorts, Live and Playlists.

## 0.74.0

### Added
- **You** panel (right toolbar, the Person icon): Subscriptions, Your channel (opens the
  Channel panel on your own channel), History, Playlists, Watch later and Liked videos,
  moved here from Browse, and Movies & TV (Coming Soon).
- **Sliding rows**: a row of tabs or chips too long for its panel slides along while you
  point near either end (faster nearer the end); its hidden ends fade out. Tabs keep their
  full size instead of shrinking. Home shows **all** of YouTube's topic chips this way.
- "Coming Soon" pages: the text with the Construction icon, in the middle of the panel.
- Icons: Construction, Music note, Fire (Hype), Newspaper, Lightbulb, School, Podcasts,
  Membership card, Smart display (Shorts).

### Changed
- **Browse is now Explore** (the Explore icon): Home (with its chips) first, then YouTube's
  Explore list: Shorts, Music, Movies & TV, Hype, Live, Gaming, **News** (works), Learning,
  Courses, Podcasts, Memberships (the others: Coming Soon).

## 0.73.3

### Changed
- The **Vibration** switch is back in Settings → Appearance. While no controller can
  vibrate (the Steam Frame's in Chrome), it's greyed out and off, with the note "Haptics are
  not supported on these controllers yet".

## 0.73.2

### Changed
- The **Vibration** switch only shows when a controller can vibrate. Chrome gives the Steam
  Frame's controllers no vibration API (seen in 0.73.1's Details), so it stays hidden there;
  it turns up by itself if a later Chrome adds one.

## 0.73.1

### Fixed
- **Vibration**: when the browser doesn't give a controller WebXR's `pulse()`, the buzz
  tries the Gamepad API's `vibrationActuator` instead. The popup's Details shows, per
  controller, which vibration APIs it has and how the last buzz went (`haptics`).

## 0.73.0

### Added
- **Panel size** (Settings → Appearance): 80-130%, remembered. Text, buttons and panels
  grow or shrink together, and the layout around the Safe Zone follows.
- **Vibration** switch (Settings → Appearance): turns off the controllers' buzz on pointing
  and clicking. On by default.
- **Momentum scrolling**: let go of a trigger drag while it's moving and the text keeps
  scrolling, slowing down; any trigger press or the stick stops it.

### Changed
- **Bigger targets**: small controls (chips, tabs, switches, page arrows, the seek bar)
  can be hit from a little way off, up to Android XR's 56 dp; the nearest one wins. They
  look the same.
- **Whole panels move without bouncing**: showing / hiding the panels, opening a side
  panel, the toolbars, the search bar and the keyboard swap ease in without overshooting.
  The floating menus keep their small bounce.

## 0.72.2

### Changed
- The left toolbar's **Channel** button uses the Material Symbols **Account Box** icon.

## 0.72.1

### Changed
- **Idle controllers are fairly see-through**: they fade to 20% opacity (80% see-through),
  instead of 85%.

## 0.72.0

### Changed
- **Right controller buttons swapped**: **A** plays / pauses, **B** brings up the keyboard
  (and puts it away). (B, X and Y arrive as one button on the Steam Frame, so X and Y open
  the keyboard too.) The help lines say so.
- While the keyboard is up, the keyboard button's icon is **Keyboard Hide** (it puts it away).
- **Idle controllers stay almost solid**: they fade to 85% opacity (15% see-through), up
  from 55%.

## 0.71.1

### Changed
- **A still controller's laser goes out** once its wait (Settings → Auto-hide → Lasers) is
  up, instead of only going see-through; moving the controller or pressing anything brings
  it back.
- **Idle controllers stay more visible**: they fade to 55% opacity (45% see-through), up
  from 35%.

## 0.71.0

### Added
- **Settings → Auto-hide** (new tab): how long each part waits, unused, before it hides or
  fades, each a slider from 1 s to 30 s or **Never**, with a Default button: the **control
  panel** (with the side panels and the lasers; 6 s, while a video plays), the **side
  toolbars** (3 s), the **search bar** (3 s, now on its own timer), the **controllers** and
  the **lasers** (3.5 s each, when the controller is held still; the laser now has its own
  wait). Remembered; the global reset puts them back.

### Changed
- Settings tabs show every row that fits (they showed at most three).

## 0.70.0

### Added
- **Idle controllers fade**: a controller left still for 3.5 seconds (no movement, no
  button, touch or stick) fades to 65% see-through, its icons and its laser beam with it;
  moving it or pressing anything brings it back at once. You see a faded controller, not
  its insides.

### Fixed
- The trigger's and the grip's icons sit a little further out, so they no longer cut into
  the trigger and the grip.

## 0.69.0

### Changed
- **Controller icons in Material 3 Expressive**: each button's icon is now a Material
  Symbols icon on a round tonal button in the colour theme's button color (white with the
  YouTube theme, pink with Material 3), instead of the hand-drawn white shapes on dark
  discs: play / pause, keyboard, the laser (trigger), the panels (left D-pad), recenter
  (grip), −10 s / +10 s (stick; ↕ while it scrolls, a book while it turns pages). The
  hold-to-reset countdown is an M3 Expressive progress ring in the theme's red. They
  follow a change of colour theme at once.

### Added
- **The trigger brings the lasers back**: with the panels hidden (auto-hide or the left
  D-pad), pulling a trigger shows them again, and the lasers with them.

## 0.68.2

### Fixed
- **American English** in the interface: Settings → Appearance → **Colors** (was
  "Colours"), "The panels' color theme", the note above it, and the Safe zone's "Its
  center, above or below eye level". The README and CONTRIBUTING follow suit, and
  CONTRIBUTING now says the English tables are in American English.

## 0.68.1

### Changed
- The **YouTube** colour theme is the default (and what the global reset goes back to);
  Material 3 stays a choice in Settings → Appearance → Colours. A theme you chose stays
  as it is.

## 0.68.0

### Added
- **Colour themes**: Settings → Appearance → **Colours** chooses between **Material 3**
  (today's look, the default) and **YouTube** (YouTube's own dark look: YouTube Red
  accents as now, white buttons with Almost Black text, Almost Black panels, white text,
  blue links). It changes at once, is remembered, and the popup follows it too. The global
  reset goes back to Material 3. (A site offers its themes; the shell lists them.)

### Changed
- The Settings panel is taller (520 px, was 390), giving its rows more room.

## 0.67.2

### Changed
- **The Quality button shows icons** instead of the name (which was cramped): 8K, 4K, 2K
  (1440p), Full HD (1080p), HD (720p), or "high quality off" below 720p; on a 60 fps video
  the resolution icon sits smaller and higher with the 60 fps icon under it. The full name
  ("1080p60") is in its menu.
- **The controls panel's menus have the glass look** (the volume slider's card too); with
  the glass off they keep their solid look and soft shadow.
- **Only glass shines**: the bright rim along glass edges is no longer drawn along solid
  things on a surface, so a toolbar's grown name pill (and a solid toolbar) doesn't get a
  glass shine.

## 0.67.1

### Fixed
- **Quality names show the frame rate**: "1080p60" on a 60 fps video (YouTube's own names
  from the player, where it gives them), on the Quality button and in its menu.
- **Long menus fit**: rows get shorter when there are many choices (Premium's speeds up to
  4× overflowed the Speed menu).

### Changed
- **More glass**: the dialog has the panels' glass look, and the side toolbars and the
  search bar get the glass treatment too (the blurred video where they're see-through, and
  the shine along their edges).

## 0.67.0

### Changed
- **Floating menus** (docs/Spatial-Layout.md, Android XR's popup level): the controls
  panel's Quality, Speed and Format menus and the Volume slider no longer replace its
  button row. They open as a Material 3 menu card floating just in front of the panel,
  rising from the button you pressed (which stays highlighted while it's open): one row per
  choice, the current one ticked. Choosing, pressing the button again, or clicking on
  nothing closes it. (Their Back button is gone.)
- **Unsubscribing asks in a dialog**: "Unsubscribe from <channel>?" with Cancel and
  Unsubscribe, floating in front of everything with the rest dimmed behind it (Android XR's
  dialog level), rising in without bouncing. A click anywhere off it cancels. This replaces
  the two-click "Unsubscribe?" button, on the controls panel and in the Channel panel.

## 0.66.3

### Changed
- The search bar has the glass look of a side toolbar: see-through while there are no
  results, turning solid (fading) once the results panel opens, and back when it's
  cleared.

## 0.66.2

### Changed
- The search bar fades out with the side toolbars (after half the auto-hide time, 3 s,
  while the video plays) instead of with the controls panel; pointing at anything brings
  it back. A search's results panel stays until everything hides.

## 0.66.1

### Fixed
- Clearing the search bar (×) stops typing too, instead of leaving the caret in front of
  the "Search YouTube" placeholder (the keyboard goes away if it came up by itself). The
  same for a channel's search.

### Added
- **Clicking on nothing lets go:** a trigger click where there's no panel, button or
  handle stops typing (as Escape does; the keyboard goes away if it came up by itself) and
  closes an open menu on the controls panel.

## 0.66.0

### Changed
- **Search moved to the top** (docs/Spatial-Layout.md): a search bar in the middle, just
  above the Safe Zone, always there while the panels are up. While you type, YouTube's
  suggestions drop down from it; the results open in a **panel in the middle** of the
  Safe Zone (made a little smaller if the zone is too short for it), and go away when you
  clear the search bar (×). Search is no longer on the right toolbar (Up Next and Browse
  remain).
- **The VR keyboard comes up by itself** when you click a text field (the search bar, or
  a channel's search), in the controls panel's place, and goes away again when you search
  or press Escape. If you brought it up yourself (A), it stays until you put it away.

## 0.65.2

### Fixed
- A side toolbar's look now follows its side's panel, not the laser: solid while a panel
  is open on that side (it stands over that panel's edge), the glass look while none is;
  it fades between the two as the panel opens or closes, and stays solid while switching
  panels on that side.

## 0.65.1

### Changed
- The side toolbars have the glass look again while collapsed; they turn solid only while
  a name grows out over the panel (fading between the two), so the panel's edge still
  doesn't show through then.

## 0.65.0

### Changed
- **Safe Zone defaults** are now the ones set in the headset: width 50%, height 45%,
  position 1% below eye level.
- **Toolbar order**, top to bottom: Description, Comments, Channel (left); Search, Up Next,
  Browse (right).
- **Browse** has its own icon (Material Symbols' "browse") instead of the house.
- **The side toolbars are solid**, so the edge of the panel behind them no longer shows
  through, and they **fade out after half the auto-hide time** (3 s instead of 6 s) while
  the video plays; pointing at anything (where they are, too) brings them back.

## 0.64.0

### Changed
- **A new layout around the video** (docs/Spatial-Layout.md, YouTube's own XR layout),
  placed against the Safe Zone, which keeps the video clear. Everything sits 1.7 m away
  (was 1.0 m), sized so text looks as big as before, each piece turned to face you:
  - **The controls panel** in the middle, just under the Safe Zone (the keyboard takes
    its place, hanging from the same top edge).
  - **Left of the zone:** Description, Channel and **Comments**; **right:** Up Next,
    Browse and Search. One panel open on each side at once (which one is remembered; the
    first time, Description and Up Next).
  - **Each side has its own toolbar** (an upright Material 3 floating toolbar) standing on
    the Safe Zone's edge, over its panel's inner edge. Pointing at an icon grows its name
    out over the panel; clicking opens that panel, or closes it if it's open. The toolbar
    between the controls and the panel is gone.
  - **Settings** opens from a **pill** on top of the controls panel, rising above it as a
    popup in front of everything.
  - Changing the Safe Zone moves everything with it at once.
- **Comments are their own panel** (left toolbar), no longer a tab of Description.
- The side panels are **narrower and taller** (about 35° × 43°): Up Next, Browse and
  Search show 3 × 3 cards of the same size as before; Channel's sort chips move under its
  tabs so the tabs keep their names.
- Tabs that can't fit their names show icons for the ones not chosen (Browse in the
  narrower panel); text-only tabs that still don't fit are shortened with "…".

## 0.63.0

### Added
- **The Safe Zone** (docs/Spatial-Layout.md): the part of your view the coming spatial
  layout will be placed against. Settings → **Safe zone** (new tab) sets it as shares of
  what your headset shows: **Width** (of the horizontal field of view, default 90%),
  **Height** (of the vertical one, default 75%) and **Position** (its centre above or below
  eye level, default 5% below), each with a Default button. Beside each slider: the share
  and the angle it comes to on your headset; the tab's note gives the headset's field of
  view (both eyes together, read from WebXR). While the tab is open, an outline (with a
  small cross at its centre) shows the zone around you, fixed where you last recentered.
  Remembered; the global reset puts it back. Nothing is placed by it yet.

### Changed
- Settings sliders: a value too long for the space before the Default button is drawn a
  little smaller instead of running under it.

## 0.62.0

### Added
- **Motion, part 2: opening and closing ease** (docs/Materials-Redesign.md, step 5),
  with Material 3 Expressive's calmer "default spatial" spring:
  - A panel above the toolbar grows up from it and fades in; closing it folds it back down;
    switching panels folds one away while the other unfolds. (On entering VR the open panel
    grows in too.)
  - The keyboard and the controls panel cross-fade in their shared place when you press A,
    and the panels above rise with the taller keyboard instead of jumping.
  - Hiding and showing all the panels (left D-pad, or auto-hide while the video plays)
    fades and slightly shrinks them instead of popping.
  - The controls panel's menus (quality, speed, format, volume) and the button row coming
    back ease in: they fade in and rise into place.
  - What the laser can click follows the real state at once; only the look eases.

## 0.61.1

### Fixed
- On the controls panel, the white ring around Like is whole again where it meets Dislike:
  the rings are now drawn after all the buttons, so a neighbour drawn later can't cover
  part of one.

## 0.61.0

### Added
- **Motion, part 1: press and hover animate** (docs/Materials-Redesign.md, step 5), with
  Material 3 Expressive's springs. Pressing a button, a keyboard key, a chip, a card, a
  Settings choice or the controls panel's buttons squares its corners and springs back with
  a little bounce, the pressed tint fading in and out; the white ring and the hover tints
  fade in (about 0.1 s) and out instead of switching. Switches' handles and sliders grow
  smoothly while pointed at. Panels redraw every frame only while something is easing.

## 0.60.0

### Added
- **A "Glass panels" switch in the popup**, above Enter VR, so the glass can be turned off
  before entering VR (e.g. on a PC where VR stutters). It's the same setting as Settings →
  Appearance in VR: VR reads it again each time it starts, and the popup shows what was
  chosen in VR.

### Changed
- The glass's default tint is now **43%** (was 54%), settled in the headset. A tint you
  set yourself is kept; Default (or the global reset) gives 43%.

## 0.59.0

### Added
- **The glass look** (docs/Materials-Redesign.md, step 4): the panels, the toolbar and the
  keyboard show the video behind them, blurred, under their tinted background, with a
  fine frosted grain and a light rim along their top edge. It works for every format: the
  360° / 180° sphere, YouTube's cubemap and the cinema screen (flat or curved; around the
  screen the panels show the dark void). On by default.
- **Settings → Appearance** (a new tab, palette icon): **Glass** on / off, and a **Tint**
  slider (Clearer to Darker, 20-90%, default 54%) with a Default button, so you can tune it
  live. Both remembered; the global reset (hold the right stick) puts them back.

### Changed
- The Previous / Next hover card uses the panels' background (no glass: it floats in front
  of the controls panel, so it shows the panel through its tint instead).

## 0.58.0

### Changed
- **The "Watch in VR" popup in Material 3 Expressive** (docs/Materials-Redesign.md, step
  3.5), in the same colours as the VR panels: a rounded dark panel with the red goggles by
  its title; the format picker as a rounded field with a "Format" label; "See your room" as
  a switch; **Enter VR and Exit VR as a big YouTube-red button** with the goggles; errors in
  a dark-red box; the controller help folded into a **Controls** section (like Details), so
  the popup is about half as tall; Details' buttons as outlined pills.
- **The popup closes itself once VR has started** (open it again for Exit VR). If VR can't
  start, it stays open and says why.
- The popup asks the page for the site's Material 3 palette (a new bridge message), so its
  colours always match the panels.

## 0.57.0

### Changed
- **The VR keyboard in Material 3 Expressive** (docs/Materials-Redesign.md, step 3.4), as
  chosen from the mock-up ("neutral letters"): letters, digits, symbols and the space bar
  on calm dark-grey keys; Backspace, Shift, ?123 / ABC and Hide pink; Enter YouTube red
  with ↵ before its name; Shift YouTube red while on (a bar under it for caps lock).
  Backspace, Shift and Hide are Material Symbols. Keys square up while pressed and get the
  white ring when pointed at. The header has a keyboard icon before "Typing into …", the
  background matches the panels, and the grab bar is the controls panel's small pill with
  a handle (red while moving the keyboard).

## 0.56.1

### Fixed
- The Channel panel's videos (and Browse and Search) now show the loading indicator, with
  "Loading…" / "Searching…" under it, while their first page loads, instead of the text
  alone. The indicator redraws about 30 times a second while it shows (the Channel panel's
  did 10), so it turns smoothly.

## 0.56.0

### Changed
- **Description and Channel in Material 3 Expressive** (docs/Materials-Redesign.md,
  step 3.3, last part), finishing the panel restyle:
  - Both have the new dark panel background.
  - **Channel's header:** Subscribe is YouTube red like on the controls panel, Subscribed
    pink, "Unsubscribe?" dark red; the name in the bolder title style. The featured video
    gets a tile and the white ring when pointed at.
  - **Description:** links, timestamps and chapter times in light blue; chapters as tiles,
    the current one tinted and outlined in blue; the current transcript line tinted;
    round pink page arrows; the white ring on whatever you point at.
  - **Comments and posts:** Top / Newest as chips; the creator's name on a pink pill;
    👍 👎 💬 as Material Symbols (filled when on); "Show more replies" and the replies
    button (now with an arrow icon) get the white ring; poll choices too.
  - **Loading:** the Material 3 Expressive loading indicator, a red shape that turns and
    morphs, replaces the spinner everywhere (panels and over the video while it buffers).
  - Every remaining hover and press uses the M3 state layers (no more blue press tint).

### Removed
- The old hand-drawn thumb, speaker and skip glyphs (unused since the controls panel moved
  to Material Symbols in 0.52).

## 0.55.0

### Changed
- **Browse, Search, Up Next and the Channel grids in Material 3 Expressive**
  (docs/Materials-Redesign.md, step 3.3, second part):
  - Video cards have no tile at rest (like YouTube); the one you point at gets a tile and
    the white ring. Thumbnails have rounder corners, the duration sits on a dark pill, and
    the watched bar is YouTube red.
  - Filter and sort chips are rounded rectangles: the chosen one pink with a ✓, the others
    outlined.
  - Browse's tabs have icons (Home, Subscriptions, History, Playlists, Watch later, Liked
    videos), and stay inside the panel when space is short.
  - The search field is a rounded pill with 🔍, outlined in YouTube red with a red cursor
    while typing; its Search button is YouTube red; the suggestions drop down as a menu.
  - Page arrows, the Channel's search button and back buttons are round pink buttons.
  - Browse, Search and Up Next have the new dark panel background.

## 0.54.0

### Changed
- **Settings in Material 3 Expressive** (docs/Materials-Redesign.md, step 3.3, first part):
  tabs with icons (Playback, Audio, 2D Cinema, Laser, Keyboard, Language) spread across the
  panel, the current one underlined in YouTube red; each setting's explanation under its
  name, its control on the right; YouTube-red switches with a ✓; the red and pink sliders
  of the controls panel; Default buttons as pink pills with ↺ (wider when a language needs
  it); round pink ‹ › arrows; audio tracks as pink buttons, the playing one deep red with a
  ✓. The white ring shows what the laser points at.
- **Every panel's tabs** (Description, Up Next, Browse, Search, Channel) in the same style:
  the current tab underlined in YouTube red, the pointed-at one with a faint tint and the
  white ring.

### Removed
- The "On" / "Off" words next to the old switches (and their strings).

## 0.53.3

### Fixed
- Clicking another toolbar icon now animates like pointing at one (about 0.2 s): the deep
  red and the name fade and fold away from the panel that closes while they come in on
  the one that opens, instead of switching at once.

## 0.53.2

### Fixed
- Moving the laser from one toolbar icon to the next no longer makes the whole bar widen
  and shrink back: the expansion is handed from one icon to the next, so the bar stays
  wide (its width only eases between the two names' widths), and it shrinks back only
  when the laser leaves the toolbar. The gaps and rounded ends of the bar count as the
  nearest icon, so crossing them doesn't collapse it.

## 0.53.1

### Fixed
- The toolbar's icons now always expand at the same speed (about 0.2 s). The row only
  redraws when something changes, so the first step of an expansion counted all the time
  since the last redraw and could finish at once; now an expansion starts from zero and
  one redraw advances it by at most 50 ms.

## 0.53.0

### Changed
- **The chevron row is now a Material 3 Expressive toolbar** (docs/Materials-Redesign.md,
  step 3.2): a rounded bar of icons (Description, Channel, Search, Browse, Up Next,
  Settings). The open panel's icon is deep red with its name beside it; the one you point
  at turns pink with the white ring and smoothly expands to show its name, staying under
  the laser while it grows. Sites give each panel an icon in their registration.

## 0.52.0

### Changed
- **The controls panel in Material 3 Expressive**, the first restyled part of the redesign
  (docs/Materials-Redesign.md): pink buttons with Material Symbols icons and small labels
  (value under each: 1080p, 1×, 80%, Cinema ...); a bigger, YouTube-red play / pause; the
  seek bar and volume as thick sliders (red played part, gaps at chapters); Subscribe and
  Like in YouTube red, Like / Dislike joined; menus as buttons with the current one ticked;
  LIVE as a red chip; a white ring around whatever the laser points at, and buttons square
  up while pressed. Colours: YouTube's Material 3 palette in the "Fidelity" variant with
  the pink and the deep red swapped, plus YouTube's exact red for the accents. The other
  panels don't change yet.

## 0.51.0

### Changed
- Material 3 palettes are now made when VR starts from one seed colour (YouTube: YouTube
  Red), by **Google's Material Color Utilities**, bundled in `third_party/` (Apache 2.0; the
  project's one library). About 0.4 ms per palette; the result equals 0.50.1's tables, so
  nothing looks different. It also makes dynamic colour possible later (e.g. a palette from
  the video's thumbnail).

## 0.50.1

### Added
- Under the hood, step 2 of the redesign: YouTube's **Material 3 palette** (the dark scheme
  from YouTube Red, generated with Google's own colour library) ships in its provider, and
  the core has Material 3's default palette for other sites. Not drawn yet: nothing looks
  different.

## 0.50.0

### Changed
- Under the hood, the first step of the Material 3 Expressive redesign
  ([docs/Materials-Redesign.md](docs/Materials-Redesign.md)): every colour the panels draw
  now comes from design tokens named by Material 3 colour role (`vr-panel/tokens.js`,
  replacing `theme.js`), including YouTube's card flag colours. Nothing looks different
  (checked pixel for pixel against 0.49.2). The glass tint for later (62%) is one setting
  there.

## 0.49.2

### Added
- **Passthrough, ready for when browsers offer it:** a "See your room (passthrough)"
  checkbox in the popup (remembered; off by default; the global reset turns it off). When
  the browser offers a see-through session, StreamXR asks for one and your room shows around
  the video and the panels instead of black. Today desktop Chrome with SteamVR doesn't
  (checked on the Steam Frame), so it's greyed out with a note saying why, and VR works as
  before.

## 0.49.1

### Added
- The popup's **Details** report whether the browser offers camera passthrough
  (`passthrough.immersiveAr`), for the planned glass look.
- **Material Symbols icons** (`src/core/page/vr-panel/symbols.js`): 81 icons from Google's
  Material Symbols (Rounded, outlined and filled), ready for the Material Design 3 redesign;
  nothing uses them yet. Apache 2.0 license in `third_party/material-symbols/`.

## 0.49.0

### Changed
- **Renamed to StreamXR** (from StreamVR). Your settings move over by themselves the first
  time they're read (cinema screen, laser, keyboard, language, the open panel and tabs).
- The **Skip Helper** is now "StreamXR Skip Helper for YouTube" (1.2.0): reload it together
  with StreamXR, or Skip ad in VR stops working (their messages were renamed too).
- Under the hood, getting StreamXR ready to fit into a bigger "BrowseXR" one day
  ([docs/Future-Plans.md](docs/Future-Plans.md)); watching works exactly as before:
  - the code is split into `src/core/` (the VR interface) and `src/streamxr/` (the video
    player), next to `src/sites/`;
  - a **site registry**: each site registers its provider, and one generic entry point
    picks the page's site (YouTube's own `main.js` is gone);
  - a **media source** gives the session its frames (today the site's `<video>`);
  - StreamXR's words (formats, popup, 2D Cinema) have their own string tables, so a
    translation is now three files (CONTRIBUTING.md, "Translating").

## 0.48.1

### Added
- **Spanish (Español)** for testing the translation system: all of StreamVR's own words.
  Not yet reviewed by a native speaker.

### Changed
- The Settings panel no longer shows the current format in its top-right corner (the tabs
  reached it). The 2D Cinema tab says it instead ("Now: 360°"); the controls panel's
  Format button shows it as always.
- Words too wide for their space (row names and Default buttons in Settings, the skip-ad
  button) are drawn smaller to fit, and cut with "…" as a last resort.

## 0.48.0

### Added
- **Ready for translation:** every word StreamVR writes itself (the controls panel, the
  keyboard, every chevron panel, the popup and the player's VR button) now comes from
  string tables, in English for now. Contributors add a language by copying two files and
  translating them (CONTRIBUTING.md, "Translating"); words left out show in English.
- **Settings → Language:** the language of those words, ◀ ▶ through your browser's and every
  language that has a table, with a Default button back to your browser's. Remembered; the
  global reset sets it back. By default it follows the browser.

### Changed
- Button words too long for a controls panel button (in other languages) are drawn smaller
  to fit.
- "1 videos" on a one-video playlist card now reads "1 video".

## 0.47.0

### Added
- **Global reset:** hold the right stick down (click it) for 3 seconds to put every
  adjustable setting back to its default: the cinema screen's size, distance, height and
  curve, the laser steadiness, and the keyboard's style, language and size. The video and
  the panels are then recentered in front of you at their default places. While you hold,
  the stick's icon becomes a 3-2-1 countdown with a blue ring filling around it; a ✓ and a
  buzz say it's done. Letting go early cancels it. Which panel is open and the tabs you
  were on are kept.

## 0.46.0

### Added
- **Search inside a channel:** a 🔍 button at the end of the Channel panel's tabs (on
  channels YouTube lets you search). It turns the tab row into a search box: type with the
  VR keyboard, Search, and the channel's matching videos fill the grid; × clears, ‹ goes
  back to the tab you were on.

## 0.45.0 – 0.45.1

### Added
- Settings: a **Keyboard** tab for the VR keyboard's **style** (QWERTY, AZERTY, QWERTZ,
  Dvorak, Colemak) and **language** (English (US / UK), Español, Français, Deutsch,
  Italiano, Português (Brasil)), each stepped with ◀ ▶; **Default** goes back to your
  computer's keyboard and your browser's language. Remembered.
- A language's keys are those of its own keyboards (0.45.1): its punctuation keys and what
  Shift gives (Spanish º ' ¡ ç ñ, Shift ¿ ª and !"·$%&/()=; UK £ on Shift+3; French
  AZERTY ² ) ù $ *, Shift on the digits & é " ' ( - è _ ç à; German, Italian and
  Portuguese likewise). The symbols page shows its currency (€, £ or $) and ends with its
  accented letters and the other currencies.

### Fixed
- Changing the language lost € and £ from the symbols page, and Spanish ¡ and French ç
  were only on the symbols page. (0.45.1)

## 0.44.0 – 0.44.2

### Added
- **Search suggestions:** while you type in the Search box, YouTube's suggestions drop down
  under it (the part you haven't typed in bold); click one to search for it.

### Fixed
- Suggestions didn't show in the headset: they waited on a page timer, which Chrome can
  hold back while you're in VR. They're now timed by the VR frame loop. (0.44.1)
- The same could slow the Transcript tab's loading and the format re-check after a new
  video or an ad; their waits now keep time in VR too. (0.44.2)

## 0.43.0 – 0.43.1

### Added
- **VR keyboard.** Press **A** on the right controller to bring it up: it takes the
  controls panel's place and angle, and the controls panel is hidden; the chevron panels
  stay up above it. A again, Hide, or the left D-pad brings the controls panel back in the
  same place. The two share one place: moving either one by its bar moves both. (0.43.1;
  in 0.43.0 it was a separate panel.) Click its keys with the laser and trigger to type
  into the text box you clicked (Search); holding a key repeats it. Shift (tap twice for
  caps), "?123" for symbols, Hide. It follows the computer's keyboard layout when Chrome
  can tell it (else QWERTY English (US)), and names the language on the space bar. Grip a
  bottom corner to resize it (the size is remembered).

### Changed
- **B** on the right controller is play / pause (A was too); its icon moved to B.

## 0.42.0 – 0.42.1

### Added
- **Search panel**, a new chevron between Channel and Browse: a search box on top and the
  results below (paging, more loading as you go). Click the box and type, then Enter or
  Search; × clears the search (text and results, 0.42.1), Escape stops typing. For now
  you type on the computer's keyboard (YouTube's own keyboard shortcuts are held back
  while you type); the in-VR keyboard comes next.

### Fixed
- Typing into Search could pause the video (k, Space): the panels auto-hid while you typed,
  letting the keys through to YouTube. Typing now keeps them up, and each key's release
  is held back too. (0.42.1)

## 0.41.0

### Added
- **Most replayed:** while you point at or drag the seek bar, a soft graph above it shows
  which parts of the video people rewatch most, as on YouTube (on videos that have one).

## 0.40.0 – 0.40.1

### Added
- **Posts: comments, likes and polls.**
  - Each post has 👍 (with its likes), 👎 and 💬 (with its comment count).
  - 💬 opens the post with its comments under it: Top / Newest, replies, 👍 / 👎 on
    comments and the creator's ❤, more loading as you scroll. "‹ Posts" goes back to the
    feed where you left it.
  - Signed in: like / dislike a post and vote in its poll (click your choice again to take
    the vote back); after voting, each choice shows its share as a bar.

### Changed
- Internal: the comment list is shared by the Description panel's Comments tab and the
  Channel panel (`styles/thread.js`). No visible change in Comments.

## 0.39.0 – 0.39.1

### Added
- **Channel panel: Posts, Store and About tabs** (when the channel has them).
  - Posts: a scrolling feed of the channel's posts with their pictures, polls and attached
    videos (click one to play it); more load as you scroll.
  - Store: the channel's products, to look at (buying leads off YouTube), each listed
    once even when the store's shelves repeat it. (0.39.1)
  - About: the full description and details (joined, country, views, videos, subscribers,
    links), scrolling.

### Changed
- When a channel has many tabs, they shrink to fit beside the sort buttons.

## 0.38.0

### Added
- Settings: a **Laser** tab with a Steadiness slider (Off to Steadiest, with a Default
  button) for the laser smoothing; your choice is remembered.

## 0.37.0

### Added
- **Steadier lasers:** hand tremor is smoothed out of the pointing, clicks and anything
  you hold (moving the controls panel, moving or resizing the cinema screen). Fast moves
  still follow at once. Tunable as `laserSmoothing` in `vr-panel/config.js`.

## 0.36.0

### Added
- Video cards show how much of a video you've watched: a red bar along the bottom of the
  thumbnail, as on YouTube (signed in).

## 0.35.0 – 0.35.3

### Added
- **Browse panel: History, Playlists, Watch later and Liked videos** tabs (signed in),
  after Subscriptions. Videos opened from Watch later or Liked videos play in that list
  (Previous / Next work); playlists play from the start. (A You tab in 0.35.0 was removed
  in 0.35.1: its shelves all have their own tabs.)
- **Documentation for developers and AI agents:** [ARCHITECTURE.md](ARCHITECTURE.md) (how
  the code is built), a decision record ([docs/decisions/](docs/decisions/)),
  [AGENTS.md](AGENTS.md), this changelog, and notes in [docs/](docs/): what's been learned
  about YouTube and the hardware, the interface's design choices, and known issues.
- **Issue forms** for bug reports, "YouTube changed something", videos that look wrong in
  VR, headset / controller compatibility, feature proposals, support for another site,
  documentation problems, and questions.
- [SECURITY.md](SECURITY.md): how to report a security problem privately.
- **Pull request automation:** an automatic summary in each pull request (linked issue,
  commit history, changed files, and checks of the project's rules), and checks that every
  script parses and the shared copies and manifest are in order.

### Changed
- The README starts with Getting started, a Controls table and what's in VR.
- The feature backlogs moved to [docs/features/](docs/features/).
- `Separation.md` was replaced by ARCHITECTURE.md and the decision record.

### Fixed
- Watch later showed "Nothing here yet" (0.35.1), then cards without views or age: YouTube
  writes them short there ("7.4K • 4d ago"). (0.35.3)

## 0.34.0

### Changed
- **Renamed to StreamVR.** The VR interface is now a reusable shell with one folder per
  supported site (YouTube today); see [ARCHITECTURE.md](ARCHITECTURE.md) and
  [decision 0001](docs/decisions/0001-shell-provider-site.md).
- Remembered settings (open panel, tabs, cinema screen size and curve) moved to new names;
  your old ones carry over automatically.
- The Skip Helper is now "StreamVR Skip Helper for YouTube" (1.1.0). Reload it together
  with StreamVR.
- The panels' red and dark colours come from the site (YouTube's brand colours), and the
  popup's messages name the site.

## 0.33.0

### Changed
- Internal: a middle layer (the YouTube "provider") between the VR interface and YouTube.
  The controls panel, format detection, ads, live streams and playlists go through it. No
  visible change.

## 0.32.0

### Changed
- Internal: the five chevron panels are built on standard styles (Info, Catalog, Queue,
  Profile, Options). No visible change, except: choosing the Comments sort that's already
  selected no longer jumps to the top, and folding the Description panel no longer
  re-centres Chapters.

## 0.31.0

### Added
- Stick paging: while the laser is on a panel with page arrows (Up Next, Browse, Channel,
  Chapters), the stick's left / right turns the page; its icon changes to ◀▯▶.

### Changed
- Up Next and Description are the same size as Browse.

## 0.30.1

### Added
- Comments: 👍 / 👎 buttons (signed in) and the creator's ❤ on comments they liked.

## 0.30.0

### Added
- Comments tab in the Description panel: Top / Newest, replies, clickable times, more
  comments as you scroll.

## 0.29.0 – 0.29.3

### Added
- Description tab (views · date and the description without its chapter list; timestamps
  seek, links to YouTube videos open them) and Transcript tab (follows the video, click a
  line to seek).
- Scrolling by dragging with the trigger or with the stick (its icon changes to ▲≡▼).
- A loading spinner, also shown over the video while it buffers.
- Clicking the video title opens the Description tab (again to fold it). (0.29.2)
- Long titles scroll like a marquee. (0.29.3)

### Changed
- The Chapters tab only shows on videos with chapters. (0.29.1)

## 0.28.0 – 0.28.1

### Added
- Description panel with a Chapters tab (two columns, the playing chapter marked; click to
  jump). Its chevron is the leftmost. (0.28.1)

## 0.27.0 – 0.27.4

### Added
- Channel panel: a Featured tab when the channel has a featured video.
- Settings: an Audio tab on videos with several audio tracks (e.g. auto-dubbed).
- Unsubscribe from the controls panel (two clicks).
- Playlists and mixes in Up Next, where YouTube places them.

### Changed
- Mix flag orange (0.27.1), Playlist flag emerald green (0.27.2).
- YouTube's brand colours (YouTube Red, Almost Black, Almost White) everywhere. (0.27.3)

### Fixed
- VR180 videos without "180" in the title showed a 2D flag. (0.27.4)

## 0.26.0 – 0.26.3

### Added
- Live streams: a red ● LIVE label in place of the time, grey with "−0:45" when behind
  (click it to go back live); the seek bar covers the rewindable part.
- A red LIVE flag on cards of streams that are live now. (0.26.1)

### Fixed
- After pausing and playing a live stream, the label stayed red. (0.26.1)

### Changed
- 2D / 180° / 360° flags share one snug width. (0.26.3)

## 0.25.0 – 0.25.8

### Added
- Loop and Autoplay switches.
- Channel panel: a Shows tab.

### Changed
- "Format Settings" is now "Settings", with tabs (Playback first). (0.25.1)
- Every card is the height of a two-line title; badges line up with the text. (0.25.6)
- The Browse panel trims its height to its cards. (0.25.7)

### Fixed
- Live / Playlists / Shows tabs showed "Nothing here yet" when signed in. (0.25.2)
- A show's first video played a 1-minute "not available on this device" placeholder. (0.25.3)
- Playlist cards lacked views, age and badges (0.25.4), stopped at 200 videos (0.25.5),
  and long playlists started at the wrong place (0.25.8).
- "Subscribed" showed for every channel. (0.25.7)

## 0.23.0 – 0.24.0

### Added
- Playlists: Previous / Next buttons and "Playlist 3 / 25 · name" on the controls panel.
- Pointing at Previous / Next shows a card of that video. (0.23.1 – 0.23.3)
- Up Next gets a Playlist tab with all of the playlist's videos. (0.24.0)

## 0.22.0 – 0.22.1

### Added
- Browse panel: YouTube's Home feed with its topic chips (incl. "Immersive videos") and,
  signed in, your Subscriptions.

### Fixed
- Signed-in requests now act as the channel identity you browse YouTube as, not the
  account's default one. (0.22.1)

## 0.21.0 – 0.21.1

### Added
- Channel panel: click the channel name to see its videos, shorts, live streams and
  playlists (sortable), and subscribe without leaving VR.

## 0.18 – 0.20

### Added
- Code for YouTube's channel pages, Home page and subscriptions (signed-in requests,
  subscribe / unsubscribe, the notification bell), used by the VR panels from 0.21 on.
- Endless Up Next: the next batch loads as you near the last page. (0.20.1)

## 0.17.0 – 0.17.4

### Added
- A Format Settings panel: curve the cinema screen (on/off, intensity), move it closer or
  farther (Distance slider), each with a Default button.

### Changed
- The cinema screen's corner handles are rounded arcs.
- The panels above the controls tilt toward you on their own. (0.17.4)

## 0.16.0 – 0.16.1

### Changed
- Skip ad moved into a separate, optional extension (the Skip Helper), so the main
  extension needs no extra permissions: only access to youtube.com. (0.16.1)

## 0.15.0 – 0.15.3

### Added
- Ads in VR: shown on the cinema screen with their progress, then the video's own format
  comes back; Skip ad when YouTube allows it.

### Fixed
- The format is checked again after an ad (a VR180 video came back as a 360° cubemap). (0.15.1)
- VR180 detection uses YouTube's own VR180 flag. (0.15.2)
- Skip ad only worked sometimes: the popup covered YouTube's button. (0.15.3)

## 0.14.0 – 0.14.1

### Added
- New button row: Exit, Quality, Speed | −10, Play, +10 | Volume, Format, Recenter.
- Speed and Volume menus; chapter gaps in the seek bar; a preview frame while pointing at
  or scrubbing the seek bar.

### Fixed
- The seek preview showed a dark box. (0.14.1)

## 0.13.0

### Added
- Code that reads everything YouTube offers on a watch page (no visible change).

## 0.10.0 – 0.12

### Added
- First versions: 360° (equirectangular and YouTube's cubemap) and VR180 videos around you,
  regular videos on a cinema screen (resizable, movable, remembered), automatic format
  detection with switching inside VR.
- The laser-pointer controls panel (seek bar with scrubbing, quality and format menus,
  ±10 s, recenter, grab bar, auto-hide), the Up Next panel, and a pause overlay.
- Steam Frame controller models (from Valve's CAD) that light up as you press, with icons
  showing what each button does.
- The "Watch in VR" popup with a Details report (headset and controller diagnostics).
