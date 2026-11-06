# Design choices

How the interface is meant to look and behave, as decided by the maintainer after trying it
in the headset. Keep these unless a change is agreed in an issue first; they're deliberate,
even where they look like something to "fix".

## Placement and sizes

- **The layout (0.64.0, docs/Spatial-Layout.md, YouTube's immersive layout):** everything
  is laid out around the Safe Zone, which keeps the video clear, 1.7 m away, every panel's
  text the same size it was before (26 px per degree), each piece turned to face you:
  - the controls panel in the middle, just under the zone;
  - Settings as a compact tonal pill (icon + "Settings") centred on the controls panel's
    top edge, overlapping it a little; Settings opens as a popup rising from it, in front;
  - **left of the zone:** "about this video", top to bottom: Description, Comments,
    Channel (Comments is its own panel); **right:** Up Next, Explore (was Browse; icon Material
    Symbols' "explore", 0.74.0), You ("person", 0.74.0). One panel open per side; which one is remembered (the first time:
    Description and Up Next);
  - each side's **toolbar** (an upright M3E floating toolbar of icons) stands on the Safe
    Zone's line, raised in front of the panel, and the panel's inner edge lines up with
    the middle of the toolbar. Pointing at an icon grows its name outward, over the panel.
    The open panel's icon is filled; clicking it again closes the panel. The toolbars have
    the glass look while their side has no panel open and are solid while one is (so the
    panel's edge doesn't show through them; 0.65.2), and they fade out
    after half the auto-hide time (3 s) while the video plays, their open panels with them
    (0.78.4, the maintainer), coming back as soon as the laser is on anything.
- Side panels are narrower and taller than before (900 × 1100 px: about 1.0 × 1.26 m at 1.7 m,
  about 35° × 43°; there's more room up and down than across): Browse, Search and Up Next
  show 3 × 3 cards of today's size (Channel 3 × 2); Settings is 1280 px wide (1024 until 0.101.70, when the 3D Cinema tab made ten tabs; the controls panel is 1216).
- **The Safe Zone (0.63.0):** the part of your view the video keeps, set as shares of what
  the headset shows (so it fits any headset): width 50% of the horizontal field of view,
  height 45% of the vertical one, centre 1% of it below eye level (the defaults, set by
  the maintainer in the headset in 0.65.0; Settings → Safe zone, each with a Default button;
  an outline shows it while that tab is open). It's fixed in the room from where you were
  and faced at the last recenter.
- **Search (0.66.0):** a search bar in the middle just above the Safe Zone (its field and
  Search button; it fades with the side toolbars, after 3 s: 0.66.2; like them, it has the
  glass look until its results panel is open, then turns solid: 0.66.3). Clicking it brings up
  the VR keyboard in the controls panel's place
  (searching puts it away again, unless you brought it up yourself with B); suggestions
  drop down from the bar while typing; the results open in a **middle panel** under the
  bar, inside the zone (shrunk if the zone is too short for it; set back just behind the
  Settings popup's top edge so the two never cut into each other: the maintainer, 2026-11-06),
  and go away when the bar
  is cleared (×, which also stops typing). A trigger click on nothing (no panel, button or
  handle) lets go of what was last clicked: typing stops (the keyboard goes if it came up
  by itself) and an open controls-panel menu closes (0.66.1).
- The VR keyboard swaps with the controls panel: the right controller's B button (A until
  0.72.0) brings it
  up in the controls panel's place and angle, hanging from the same top edge (the controls
  panel hides; the side panels stay); B again, its Hide key or the left D-pad brings the
  controls panel back there. They share one place, so moving either moves both. A plays /
  pauses. Keys are clicked with the laser and trigger; its bar moves it, its bottom corners
  resize it (the size is its own, remembered). Its layout and language follow the
  computer's (QWERTY English (US) when they can't be told), unless chosen in Settings →
  Keyboard (style and language, with a Default button back to the computer's). Its digits
  row stays digits whatever the style.
- Every card is the height of a card with a two-line title, so the hover highlight always
  covers the text.
- The Previous / Next hover card sits 32 dp (about 4.7 cm) in front of and 2 cm above its
  button, in the controls panel's tilt.
- **Live Chat (planned; the maintainer, 2026-10-16):** a **right-side panel**, where YouTube
  and Twitch put chat, opened from a Chat button on the right toolbar that shows **only on
  live streams** (and chat replays). Like the other side panels it shares the right zone (one
  open at a time), but it **doesn't fade**: its toolbar still fades, the chat stays up while
  you watch. Built in phases: **reading** first (messages, badges, Super Chats / Stickers,
  memberships, the pinned message, member emojis), then **reactions** (a row of reaction
  buttons on the panel), then **typing** with the existing VR keyboard (no second keyboard),
  which gains an **emoji layer** (standard emojis and the channel's member emojis).
  Paying (Super Chat, memberships) stays out of VR: a **"Support on desktop"** button opens
  YouTube's own screen in the browser window. YouTube's AI **"Chat summary"** banner is left
  out; pinned messages and the welcome notice are shown (the maintainer, 2026-10-16).
  **Reading built in 0.79.0** (working since 0.79.1): the chat **opens by itself** when a live
  stream starts, as on YouTube, the panel it replaced coming back when the stream ends
  (confirmed by the maintainer, 2026-10-16); tabs for YouTube's Top chat / Live chat views (the
  choice remembered). **Typing built in 0.81.0**: a message field and Send above the reactions;
  the keyboard's 😀 key opens its emoji pages (the channel's own emojis first). **Support on
  desktop** is a dialog (the maintainer, 2026-10-16): YouTube's "$" screen can't be opened
  from StreamXR (no button to click in its chat frame), so the button says what the stream
  offers and to use the $ button under the chat in YouTube's own window. **Top fans (0.82.0,
  as YouTube's chat does it, to check)**: your XP in a 👑 pill at the right end of the tab
  row; it opens the ranked list inside the chat panel (‹ back to the chat; your row pinned at
  the bottom); the top three's rank pills ("#1", in YouTube's colours) before their names.
  **While only the chat stays up** (everything else faded), a laser shows while it points at
  the chat and hides again when it leaves it, so you can tell exactly when you're on the chat
  (the maintainer, 2026-10-17: keep it so).
- **Every side panel can be moved (the maintainer, 2026-10-16; built in 0.83.0):** the left and
  right panels all can, not only the chat. Moving a panel moves its **whole side**: the toolbar
  and every panel on that side follow (they open where you put them). Moving only; no
  resizing (the Panel size setting scales everything). **The handle is a grab bar beside the
  side's toolbar, on its video side** (the maintainer, 2026-10-16; 0.85.0): an upright pill
  with a drag handle, the same as the keyboard's and the controls panel's bars, so everything
  movable is grabbed the same way (a button there, tried in 0.84.1, invited a trigger click
  though it only works with the grip; a bar under the panel, 0.83.0, was hard to find). Its
  laser zone is wider than the pill. It works with the grip (whose icon turns into a hand
  there): the point you hold follows your hand and the side turns to face you; the toolbar
  stands a little further out to make room for it.
- **Recenter keeps what you moved (the maintainer, 2026-10-16; 0.84.0; replaces "Recenter or a
  Safe Zone change puts it back"):** recentering turns the layout to where you're looking and
  brings your moved panels along, each where you put it relative to you (the controls panel,
  with the keyboard and Settings; each moved side). A Safe Zone or panel size change keeps them
  too. Only the global reset (the right stick held for 3 s) puts them back in their places.
  **A setting for the other way (the maintainer, 2026-10-16; 0.86.0):** Settings → Safe zone →
  "Recenter resets panels" (off by default, remembered; the global reset turns it off):
  while on, recentering also puts the moved panels back.
- **Recentering fades** (the maintainer, 2026-10-28; 0.101.42; Android XR's motion guide:
  whole-world movement fades, it doesn't jump): the Recenter button and Grip dim the view to
  black over 0.12 s, recenter while dark, and bring it back over 0.18 s. The recenter as VR
  starts stays instant.
- **No Sharpness setting** (the maintainer, 2026-10-28; added in 0.101.42, removed in 0.101.44):
  Chrome caps the drawing size at the headset's recommended size (`nativeScale` 1 on the Steam
  Frame), so Sharper and Sharpest drew exactly as Standard. Sharpness is SteamVR's render
  resolution instead; the README's Quick troubleshooting says where ("Want it sharper?").

## Look

- **Color themes (0.68.0):** Settings → Appearance → Colors, remembered (the popup
  follows it too): **YouTube** (the default since 0.68.1) or **Material 3** (the palette made from YouTube Red, pink
  buttons; the default in 0.68.0). YouTube is YouTube's own dark look: the same YouTube Red accents, white
  buttons with Almost Black text, Almost Black panels (#282828), white text, YouTube's
  blue links; whatever is selected, e.g. an open panel's toolbar item, in YouTube Red.
  A site offers its themes (`provider.themes`); the shell lists them.
- The Settings panel is 600 px tall (390 until 0.68.0, 520 until 0.76.1), so six rows fit (the 2D Cinema tab).
- **Panel size (0.73.0):** Settings → Appearance → Panel size, 80-130%, remembered; it scales
  everything together (the maintainer's choice over a text-only size).
- **Vibration switch (0.73.0):** Settings → Appearance → Vibration, on by default; greyed out with
  "Haptics are not supported on these controllers yet" while no controller can vibrate (the
  user, 0.73.3; Chrome gives the Steam Frame's none).
- **No global Back (0.73.0):** set aside by the maintainer; panels open and close from the
  toolbars, and Channel keeps its own Back. Deferred again (the maintainer, 2026-10-30): every controller
  button already has a use, so none is free for a Back.
- **Explore and You (0.74.0, the maintainer):** Browse became **Explore**: Home (with all of
  YouTube's topic chips) first, then the Explore list from YouTube's left menu in its order:
  Shorts, Music, Movies & TV, Hype, Live, Gaming, News, Learning, Courses, Podcasts,
  Memberships. A new **You** panel (right toolbar, after Explore) holds the personal feeds:
  Subscriptions (first), Your channel (your videos inside the You panel, with Videos / Shorts / Live / Playlists
  chips; 0.74.1: the left side stays about the playing video), History,
  Playlists, Watch later, Liked videos, Movies & TV. Pages not built yet show "Coming Soon"
  with the Construction icon (Home, News and the You feeds work). Shorts uses
  "smart_display" (Material Symbols has no Shorts icon). **Movies & TV says why instead** (the
  maintainer, 2026-10-28; 0.101.45): every YouTube film is copy-protected, so it won't be built;
  its tabs show "YouTube's movies and shows are copy-protected, so they can't play in VR yet.
  Watch them on the desktop." under the Movie icon (a sentence wraps, centred, icon above).
- **Sliding rows (0.74.0, the maintainer):** a tab or chip row too long for its panel slides like
  a marquee while the laser is near either end (faster nearer the end), its hidden ends
  faded; tabs keep their full size instead of shrinking.
- **Material 3 Expressive with glass** replaced the look below, one component at a time (done in 0.62.0)
  ([Materials-Redesign.md](Materials-Redesign.md) has the decisions). Restyled so far: the
  **controls panel** (0.52.0): YouTube's M3 palette (Fidelity, pink and deep red swapped),
  pink tonal buttons, YouTube Red #FF0033 for the signature accents (seek bar, play / pause,
  Subscribe, Like, LIVE), a white ring on whatever the laser points at, Material Symbols
  icons. The **toolbar** above it (0.53.0): an M3E floating toolbar of icons (Description ⓘ,
  Channel, Search, Browse ⌂, Up Next, Settings); the open panel's item is deep red with its
  name, and the pointed-at item expands to show its name (growing around its own centre, so
  it stays under the laser; moving between icons hands the expansion over, so the bar
  stays wide until the laser leaves it). **Settings** (0.54.0): tabs with icons, the
  current one underlined in YouTube red; each setting's hint under its name, the control on
  the right; YouTube-red switches, the red and pink sliders, pink Default pills with ↺.
  **Every tab row** has the red underline and the white ring. **Browse, Search, Up Next,
  Channel grids** (0.55.0): cards with no tile until pointed at (then a tile and the ring),
  rounded thumbnails, the duration on a dark pill, the watched bar YouTube red; chips as
  rounded rectangles (chosen: pink with ✓, others outlined); the search field a rounded
  pill outlined in YouTube red while typing, its button YouTube red; round pink page
  arrows; icons on Browse's tabs. **Description and Channel** (0.56.0): links, timestamps
  and the current chapter / transcript line in light blue (M3 tertiary); Subscribe YouTube
  red, Subscribed pink, the dialog's Unsubscribe button dark red; comment chips, Material Symbols 👍 👎 💬;
  the morphing loading indicator. **Keyboard** (0.57.0): letters on calm dark-grey keys,
  Backspace / Shift / ?123 / Hide pink, Enter (and Shift while on) YouTube red. **Popup**
  (0.58.0): the panels' colours, a YouTube-red Enter / Exit VR button. **Motion**
  (0.61.0): presses square a control's corners and spring back with a little bounce; the
  ring and tints fade (Material 3 Expressive's standard springs, to judge in the headset);
  (0.62.0) panels, menus and the keyboard swap ease open and closed. The rest
  still looks as described below until restyled.
- YouTube's brand colours for every red, black and white: YouTube Red #FF0033, Almost Black
  #212121, Almost White #FFFFFF. Greys, hover tints, shadows and the VR void stay as they
  are. (In code these come from the provider's theme.)
- Card flags, all 26 px tall: 2D / 180° / 360° share one snug width; Mix is orange
  (#ff8a00), Playlist emerald green (#2ecc71), LIVE and Short red, "Now playing" blue.
- The panel style names: Info, Catalog, Queue, Profile, Options. The product name: StreamXR.
- **Cinema screen corners (0.75.0, the maintainer):** a 2D video is a rounded rectangle (corner
  radius 2.5% of the screen's width: `SETTINGS.cornerRadius`, cinema-screen.js).
- **Cinema screen size is a 16:9 frame (0.101.46, after the maintainer's Shorts report):** the
  remembered size is a 16:9 frame and each video fits inside it, as on a TV: 16:9 and wider fill
  its width, taller ones (Shorts 9:16, 4:3) fill its height and come out narrower. A Short after a
  regular video is as tall as it, and resizing one resizes the frame for all.
- **Cinema screen distance (0.78.5, the maintainer):** never in front of the VR panels: the Distance
  slider's nearest is 30 cm behind them (2.0 m with the panels at 1.7 m; `cinema-screen.js`
  `behindPanels`), up to 12 m.
- **Seek bar buffer (0.75.0, the maintainer):** past the playback position, the track is solid as
  far as the video is loaded and faded (40%) beyond.
- **Captions and Save on the controls panel (0.77.0, the maintainer):** the panel is wider (1216 px,
  was 1024) for two more buttons: **Captions** at the inner end of the left part (Closed
  Caption icon, Closed Captions Disabled and greyed out with no tracks; a menu: Off and the
  tracks; the chosen one drawn in VR over the bottom of the 2D screen, or on 180°/360° 22° below
  the horizon in front of you, gliding after your view once you look 25° aside (0.77.1),
  TV style: white on dark boxes) and **Save** at the inner end of the right part
  (Bookmark icon, filled when the video is saved anywhere; a scrolling menu like YouTube's Save:
  Watch later and your playlists, ticked where the video is; a tap adds or removes it and the
  menu stays open).
- **Cinema screen glow (0.76.0, the maintainer: option A, on by default):** a soft halo outside
  each edge in the colors of the picture there (the video's blurred mipmaps), fading out over
  80% of the screen's height by default; Settings → 2D Cinema → Glow (on), Glow strength (100%) and Glow length
  (10-80% of the height, 0.76.1; defaults raised by the maintainer in 0.76.3). The panels' glass shows it where they stand past the screen's
  edge (0.76.2: the search bar above the screen looked solid over the dark room).
- **VR from any page (0.78.0, the maintainer):** a VR button in YouTube's top bar next to + Create on
  every page; with no video, the screen shows YouTube's logo (from its own top bar) until you
  pick a video in VR. The VR buttons and popup use Material Symbols' Head Mounted Device icon.

## Behavior

- **Shorts** play on the cinema screen in their own shape, fitted to its 16:9 frame (0.101.46: see
  "Cinema screen size" above). **The Shorts tab (the maintainer, 2026-10-28):** Explore → Shorts
  is YouTube's endless Shorts feed on **tall 9:16 cards** (0.101.48); **when a Short ends, the next
  one plays if Autoplay is on** (else it stays paused); and **while a Short plays, Up Next shows
  the next Shorts from the feed**. Built in that order, tested between.
- The video title opens the Description tab (and folds it again); the channel name opens
  the Channel panel (and folds it again).
- A title too long for the controls panel scrolls like a marquee: still for 2 s, slides at
  60 px/s, rests 1.5 s at the end, then starts over.
- Settings opens on Playback first.
- The pause overlay dims the video by 50% and shows a pause symbol pinned to the video (on
  the cinema screen, or upright at the recentered front, 2 m away, for spheres). While the
  video buffers for more than 0.4 s, the loading indicator (a red
  morphing shape on a dark disc, Material 3 Expressive; 0.56.0) shows in the same spot.
- **Controller icons (0.69.0):** Material 3 Expressive round tonal icon buttons (the colour
  theme's button colour: white in YouTube, pink in Material 3) with Material Symbols:
  play_pause (A), keyboard (B; keyboard_hide while the keyboard is up), ads_click (trigger),
  bottom_panel_close / bottom_panel_open (left D-pad: hide the panels while they're up, show them
  while they're hidden; call_to_action until 0.86.0), recenter (grip; back_hand while it would
  grab a move bar or handle, 0.84.2), replay_10 + forward_10 (stick; swap_vert while it scrolls,
  menu_book while it turns pages). A held button's countdown: an M3E circular progress
  ring in the theme's red round the same button, the seconds left, then a tick.
- **The trigger wakes everything (0.69.0):** with the panels hidden (auto-hide or the left
  D-pad), a trigger pull brings them back, and the lasers with them.
- **Idle controllers fade (0.70.0):** a controller left still for 3.5 s (no movement, no
  button, touch or stick) fades to 80% see-through (65% in 0.70, 45% in 0.71.1, 15% in 0.72.0), with its icons, and its laser beam goes out (0.71.1; on
  top of the beam's own hiding with the panels); any movement or press brings it back at
  once. It's drawn so you see a faded controller, not its insides (`controllers/config.js`
  `idle`).
- The trigger's and the grip's icons sit a little further out (0.70.0), clear of the parts.
- **Auto-hide waits are the user's (0.71.0):** Settings → Auto-hide (a timer icon) sets how
  long each part waits, unused, before it hides or fades: the controls panel (with the
  lasers; default 6 s, while a video plays), the side toolbars with their open panels (3 s; the
  panels since 0.78.4), the search
  bar (3 s), the controllers and the lasers (3.5 s each, when held still). Each from 1 s to
  30 s or Never, with a Default button; remembered; the global reset puts them back.
- **A trigger pull on empty space hides everything (0.88.0, the maintainer, 2026-10-17, from a
  user's request):** the controls panel, the side toolbars, the search bar and the lasers go at
  once, paused or not (a press that lets go of a menu, a dialog or typing does only that).
  Panels that stay up (the live chat) stay. A pull or pointing at a panel brings them back.
- **"Auto-hide while paused" is a switch (0.88.0, the maintainer, 2026-10-17):** Settings → Auto-hide,
  off by default (paused, everything stays up, as before); on, the auto-hide waits run while
  paused too, to take in a scene. The default waits stay as they are.
- Live streams count as "live" until you're 12 s behind, so a short pause stays red.
- Unsubscribing asks first, in a dialog (0.67.0): "Unsubscribe from <channel>?" with Cancel
  and Unsubscribe (dark red), on the panels' glass (0.67.1); it floats in front of everything (56 dp) with the rest dimmed
  behind it, and a click anywhere off it cancels. (Before 0.67: two clicks, "Unsubscribe?"
  waiting 4 s for the second.)
- **The Quality button shows icons, not the name** (0.67.2; the full name, e.g. "1080p60",
  is in its menu): 8K, 4K, 2K (1440p), Full HD (1080p), HD (720p), "high quality off" below
  720p; on a 50 / 60 fps video the resolution icon is smaller and higher, with the 60 fps
  icon under it (Material Symbols).
- **Only glass shines** (0.67.2): the bright rim along a glass surface's edges isn't drawn
  along solid things on it (buttons, a toolbar's grown name pill, a solid toolbar), so they
  don't look like glass.
- The controls panel's Quality, Speed and Format menus and the Volume slider float in front
  of it (32 dp; 48 dp since 0.101.71, in front of the Settings popup they overlapped) on the panels' glass (0.67.2), rising from their button (which shows selected while its menu is open), as
  M3 menus: one row per choice (shorter rows when there are many, e.g. Premium's speeds up
  to 4×), the current one ticked; they close on a choice, on their
  button again, or on a click on nothing (0.67.0).
- **Interface language:** StreamXR's own words follow the browser's language by default
  (English when there's no table for it); Settings → Language (the last tab) chooses
  another one, remembered, with a Default button back to the browser's. Untranslated words
  show in English. Separate from the keyboard's language (Settings → Keyboard).
- The Settings panel's tab row has no format text in its corner: the current format shows as
  the 2D Cinema tab's note ("Now: 360°"), and on the controls panel's Format button.
- **Passthrough** (seeing your room around the video; the maintainer, 2026-11-06): off by
  default and remembered, switched in the popup ("See your room", before VR) or in VR with
  Settings → Appearance → **Passthrough** (after Panel size; any format), one setting for both.
  Wherever the browser offers a see-through session (the Steam Frame's own browser), StreamXR
  always starts one, so the switch works at any time; switched off, the frame is drawn opaque,
  just like VR. Where it isn't offered (desktop Chrome with SteamVR), the popup's checkbox is
  greyed out with the reason and the rows don't show in VR.
- **Text sharpness** (the maintainer, 2026-11-06): Settings → Appearance, after Panel size, a
  slider from 0% (smooth: plain mipmaps) to 100% (one mipmap level sharper plus an equal
  edge sharpening), default 50% (also the best at the Frame's 3408, 2026-11-06), in 10% steps. It's for the panels' text where the headset
  shows them with fewer pixels than they have (the Steam Frame's own browser); too high can
  shimmer. (The earlier Sharpness, the drawing size, was dropped: browsers cap it.)
- **Passthrough strength** (the maintainer, 2026-11-06; "Your room" in 2D Cinema in 0.102.4):
  under the switch, a slider sets how much of the room shows, from 0% (hidden) to 100%
  (fully, the default), in 5% steps, dimmed while the switch is off. Remembered; the global
  reset turns passthrough off and the strength back to 100%.
- **Through the video** (the maintainer, 2026-11-06): under Strength, how much of the room shows
  through the video itself, from 0% (**solid**, the default: a clear picture) to 100% (as much
  as around it), in 5% steps, dimmed while passthrough is off. The cinema screen only: 360° and
  VR180 videos are always solid. Remembered; the global reset puts it back to solid.
- **The popup** closes itself once VR has started (opened again during VR, its button is
  Exit VR); if VR can't start it stays open and says why. Enter VR and Exit VR are both
  YouTube red (the popup's most important button). The controller help is folded into a
  Controls section, like Details.
- **Quick troubleshooting** (0.101.9, the maintainer, 2026-10-28): a folded section between
  Controls and Details, opened by itself when something's wrong. First the **Most likely
  issue**, worked out from what Details shows (no headset ever seen → SteamVR not the OpenXR
  runtime or the browser opened first; seen then gone; the last Enter VR's error kind; a
  built-in graphics card as an extra line), in the error colors when something's wrong; then
  a short numbered checklist in plain words, its WebXR samples and new-issue page as links
  (opening in a new tab), and a Copy details button in its last check. Details stays its own
  section (the maintainer, 2026-10-28: it also has Save video frame and the live readout,
  and its JSON would bury the simple steps). The popup is 344 px wide and keeps Chrome's own thin scrollbar
  (a custom one looked worse on YouTube, 0.101.12); the popup itself doesn't scroll, its
  body does, inside room left above and below, so the scrollbar's ends stay clear of the
  rounded corners (0.101.13).
- **StreamXR Home** (the maintainer, 2026-10-28; the plan: `docs/Home-Page.md`): a 1.0
  item, to show from the start that more sites are coming. Named **StreamXR Dashboard** for
  users (renamed from "StreamXR Home", 0.101.35, the maintainer, 2026-10-28; the code and the
  docs still call it Home: `src/streamxr/home/`, `docs/Home-Page.md`). Opens
  once when StreamXR is installed (a first-run welcome). Its **Test VR** runs the real
  StreamXR shell (the placeholder screen and a panel), not a simple test scene: more work,
  but it proves what works on Home and what doesn't. The **toolbar popup** has the full
  Quick troubleshooting as a folded section (besides status, Open Home and the sites).
  **Enter VR when a site opens** (a switch on Home, on by default; replaces "Skip Helper users
  only, greyed out without it", the maintainer, 2026-10-28, after Test 3): with the Skip
  Helper, VR starts by itself on the site; without it, the site's tab shows "Press any key or
  click anywhere to enter VR" (any real key press or click starts VR; Esc cancels). Home and
  the toolbar popup say which you'll get. Only for tabs StreamXR itself opened (its background
  remembers them): no link can start VR. Controller buttons mapped to keys (Steam Input) would
  work too, but aren't asked of users (too much setup). The developer test page
  `tools/xr-check/` stays.
  **All cross-page VR is hidden for now** (the switch above, Enter Dashboard in VR, the Sites
  panel; the maintainer, 2026-10-28, 0.101.36): too clumsy without the Skip Helper; back once
  VR carries over without it (`docs/Home-Page.md`, "Hidden for now"). **In VR on Home: a Sites panel** (the right side; 2026-10-28): each site, "Opens in VR";
  picking one leaves Home's VR and enters VR on the site (as above). **The toolbar popup's
  buttons**: **Open StreamXR Dashboard** (renamed from "Open StreamXR Home") and **Enter
  Dashboard in VR** (opens Home asking for a key press or click to enter VR: a click in the
  popup can't start VR in another tab, and the Skip Helper can't click on StreamXR's pages).
- **Glass** (0.59.0): the panels show the video behind them, blurred, under a tint of the
  surface colour. On by default at 43% (settled in the headset, 0.60.0); Settings → Appearance
  (the tab after 2D Cinema, palette icon) has the switch and a live Tint slider (20-90%).
  The popup has a "Glass panels" switch above Enter VR too (the same setting), so it can be
  turned off before entering VR on a weaker PC.
- **Global reset:** holding the right stick down for 3 s resets every adjustable setting
  (cinema screen size / distance / height / curve, laser steadiness, glass on / tint, Safe Zone, keyboard style /
  language / size, interface language, passthrough checkbox) and recenters. The stick's icon turns into a 3-2-1
  countdown with a ring filling around it, then a ✓ and a buzz. The controls panel's default place is where
  the layout puts it (under the Safe Zone; a place you moved it to isn't remembered between
  sessions). Open panel and chosen tabs are kept. If the stick click ever can't be read, the
  binding moves to another button (only `controls.js` changes).
- The lasers are smoothed against hand tremor (pointing, clicks and grabbing alike), with
  fast moves passing through at once. The user sets how much in Settings → Laser
  (Steadiness, Off to Steadiest; the middle is the default, which felt right in testing).
- **Subscriptions (the maintainer, 2026-10-17):** your subscribed channels are a **Channels** tab
  in the You panel, right after Subscriptions (round channel pictures, a click opens the
  channel in the Channel panel). A channel's **notification bell** (All / Personalized / None)
  is a bell button beside Subscribe on the Channel panel, opening a small floating menu like
  the controls panel's menus. The Subscriptions feed was to show **community posts** (desktop's
  feed has none: 0.90.2), but not its
  shelves (the Shorts row, "Most relevant"), as on Home.
- **Premium (the maintainer, 2026-10-17):** from the audit in `features/video-page.md`: 1080p
  Premium in the Quality menu and Jump ahead, with the Diamond; queueing isn't Premium on
  desktop and is its own item.
- **Jump ahead sits at the seek bar's end** (the maintainer, 2026-10-17, 0.92.1), where Skip ad
  shows during ads, not in the button row: the Diamond, "Jump ahead", fast-forward.
- **3D side by side on the cinema screen** (the maintainer, 2026-10-17, 0.93.0): its own
  format with Material Symbols' `3d_2` icon (0.93.3); 180° 3D side by side keeps `3d_rotation`.
- **3D Top & Bottom on the cinema screen** (the maintainer, 2026-10-30; built in 0.101.68): a
  format of its own named **"3D Top & Bottom"**, listed right after 3D side by side, for 3D videos
  with both eyes stacked in one frame (`features/video-page.md`). Picked by hand, as SBS is. Its
  icon is 3D side by side's `3d_2` (the maintainer, 2026-11-05).
- **3D depth and Swap eyes** (the maintainer, 2026-11-05, 0.101.69; some top & bottom videos felt
  harsh): their own Settings tab, **3D Cinema** (after 2D Cinema, icon `3d_2`; the maintainer, 0.101.70; two rows at the end of 2D Cinema in 0.101.69), active for the cinema screen's 3D formats
  (side by side, top & bottom). **3D depth** is a slider from Closer to Farther, the middle (0%) as
  the video was made (the default), moving each eye's picture up to 5% of its width apart or
  together; **Swap eyes** is a switch, off by default. Both remembered, one setting for every 3D
  video (not per video).
- **The Format button says "Format"** (the maintainer, 2026-10-17, 0.93.2), whatever's chosen;
  its icon shows the format, and the Format menu shows every format's icon and name. The
  cinema screen's icon is `2d_2`, 3D Cinema's `3d_2` (0.93.3).
- **Explore's pages (the maintainer, 2026-10-18, after 0.94.0):** each page's sections are its
  pills, and a pill shows the whole section (YouTube's "View all"). **News** stays an Explore
  tab, its own tabs (Top stories, Sports ...) as its pills. **Learning** is deferred (an AI
  prompt with generated lessons; Courses covers learning). **Podcasts** get **square cards**
  for their square cover art. **Memberships** stays in Explore: its channel cards show the
  channel's picture, name and price and open the channel; members-only videos are flagged;
  joining stays on desktop. Viewing a playlist before playing it comes after Explore.
- **Members-only videos and memberships (the maintainer, 2026-10-18):** opening a members-only
  video brings up a short dialog (Members only, the channel, YouTube's "choose a level that's
  at least …" line and the cheapest level) with **See perks** (opens the channel's
  **Membership** page in the Channel panel: each level with its price, perks and disclaimer)
  and OK. A creator card in Explore → Memberships opens that Membership page. Joining stays
  on desktop: each level shows a greyed **Join on desktop** button.
- **Info cards and Autoplay on the controls panel (the maintainer, 2026-10-19, 0.97.0):** the
  panel is wider (1408 px, was 1216) so two more buttons keep full size and the row stays
  even on both sides of Play: **Cards** at the inner end of the left part (after Captions;
  always there, greyed on a video without cards, so the row never shifts; a menu of the
  video's cards; as a card's time comes, its teaser floats above the button like the
  Previous / Next hover card, nothing drawn over the video) and **Autoplay** at the inner end
  of the right part (before Save; YouTube's own switch, On / Off under its icon). The teaser
  is clickable (plays its card) and, like Skip ad, brings hidden panels back while it shows; the
  Cards menu shows each card as a video row (thumbnail, length, title, channel · views · age).
- **The end screen goes in Up Next (the maintainer, 2026-10-19, 0.98.0):** not a raised row
  over the controls (a large raised area, reaching into the video) nor on the video (YouTube's
  way: over the picture, and no screen for 360° / 180°). When it starts, an **End screen** tab
  appears in Up Next with its videos, playlists and other channels as cards; Up Next switches
  to it and opens if it was closed; it stays until another video starts. The video's own
  channel and Subscribe tiles are left out: the controls panel already has both.
  With Autoplay on, YouTube's countdown to the next video shows as a card above the Autoplay
  button ("Up next in 5": the next video, clickable to play it now; switching Autoplay off
  cancels it), bringing hidden panels back like a teaser.
- **Follow your head on 2D videos (the maintainer, 2026-10-19, 0.99.0; asked for by [u/boatOV](https://www.reddit.com/user/boatOV)):**
  a lazy follow, not a head lock (XR guidelines advise against content locked to the head):
  once you've faced more than 35° sideways or 25° up / down away for the Delay, the screen and the panels ease round to
  where you face at the Speed (both sliders, 0.99.2); glances don't move anything, and nothing
  moves while you're using or looking at a panel.
  A switch in Settings → 2D Cinema, off by default; 2D videos only (not 3D, 180° or 360°).
- **Add to queue (the maintainer, 2026-10-19, 0.100.0):** a round **Add to queue** button on a
  video card's thumbnail, bottom-left (the flags take the top), shown while the card is pointed
  at; one click queues (a check once queued), the rest of the card still plays. The queue has
  its own **Queue** tab in Up Next, which appears without Up Next switching to it (YouTube's queue takes the playing playlist's place, so
  it's that tab, named Queue). It drives YouTube's own queue, the command its card menu sends.
  The Queue tab has **Clear** (a dialog asks first, as YouTube's Undo can't be reached) and
  **Save** (a menu: New playlist… named on the VR keyboard, then Watch later and your playlists;
  the maintainer, 2026-10-20). While its menu or dialogs are up, the button is filled in
  YouTube's red; the Save menu drops down under its button (Material menus open below their control), kept clear of the side toolbar.
- **The Membership tab for a member (the maintainer, 2026-10-18):** on a channel you're a
  member of, the Membership tab has three pills: **Perks** (your level, "Member · 3 months" and
  your perks with their emoji and loyalty badges, on the same page as the Join offer), **Videos**
  (the "Highlighted content for members", as the usual card grid) and **Posts** (the recent
  members-only posts, as the usual feed).
- **A playlist's page (the maintainer, 2026-10-18):** clicking a playlist card opens the
  playlist **inside the panel it's in** (not a hover popup: hover stays feedback only, and
  large scrolling areas aren't raised, docs/Spatial-Layout.md): a back button, its picture,
  title, author, stats and description, **Play all · Shuffle · Save**, then its videos as
  compact rows (number, thumbnail, title, a grey line) rather than full cards, so more fit.
  The panel keeps it open while you use other panels (like an opened post); Back, or its
  tab again, returns to the list. A mix still plays at once (it has no page).
  Up Next shows the same page for the playing playlist (its tab: Shuffle as an on / off toggle,
  Save, every video as a row, the playing one brought into view), and opens a Recommended
  playlist card the same way (the maintainer, 2026-10-18).
  While a playlist is shuffled, the controls' Next shows a shuffle card ("A random video from
  this playlist", the shuffle icon) instead of a video: the next one isn't known until it plays
  (the maintainer, 2026-10-18).
- **Commenting in VR (the maintainer, 2026-10-30):** the "Add a comment..." field sits **at the
  bottom of the Comments panel** (live chat's field and its Comment button), in reach while you
  scroll; the VR keyboard types into it. **No confirm**: Enter or Comment posts at once, as chat
  does. **Your comment shows at the top right away** (a reply: under its comment). Replies come
  from **a Reply button on each comment**, which switches the same field to "Replying to @name"
  (an x cancels) rather than opening a field under the comment.
  **Your own comments: a "⋮" menu** with Edit and Delete (as YouTube); **Edit uses the bottom
  field** ("Editing your comment", an x, Save; the comment updates in place); **Delete asks first**,
  with YouTube's own question (the maintainer, 2026-10-30; 0.101.63).
  Nested replies show to any depth, each level a step further in (the indent stops at 3 levels),
  with **thread lines** from each comment's picture curving into its replies, as on YouTube's
  desktop (the maintainer, 2026-10-30; 0.101.60 to 0.101.61). **Clicking a thread line folds** the replies under
  it (a comment's: as Hide; a reply's: its own replies, then "⌄ N replies" opens them again); the
  lines light up while pointed at (the maintainer, 2026-10-30; 0.101.62).