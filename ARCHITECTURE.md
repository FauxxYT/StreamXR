# Architecture

How StreamXR is built today, for people and AI agents changing the code. Read this before
changing structure. The *why* behind the big decisions is in
[docs/decisions/](docs/decisions/), what changed when is in [CHANGELOG.md](CHANGELOG.md),
and the code rules are in [CONTRIBUTING.md](CONTRIBUTING.md). What's been learned about
YouTube and the hardware, the interface's design choices and the open questions are in
[docs/](docs/) (youtube.md, hardware.md, design-choices.md, known-issues.md).

StreamXR is a Manifest V3 browser extension that plays a website's own `<video>` in a
SteamVR headset through WebXR: 360° and VR180 videos as a sphere around you, regular videos
on a cinema screen, with a floating control panel worked by laser pointers. It has no
build step and one vendored library (Google's Material Color Utilities, `third_party/`, for
the Material 3 palettes): the repo folder is the extension.

## Three layers

1. **Shell** (site-agnostic), in two parts. It never names a site and never reads a page;
   it only knows the provider interface.
   - **Core** (`src/core/`): the VR interface any VR browser feature could use, and the
     future core of BrowseXR ([docs/Future-Plans.md](docs/Future-Plans.md)): controllers
     and input, the lasers, the controls panel, the layout with its toolbars, and the five panel styles,
     the keyboard, the Laser / Keyboard / Language settings, translations, storage, the
     site registry.
   - **StreamXR** (`src/streamxr/`): the video player built on the core: the WebXR session
     and its frame loop, the media source, rendering (video sphere, cinema screen, pause
     overlay), the video formats, the 2D Cinema settings, the "Watch in VR" popup, and the
     page-world entry point.
2. **Provider** (`src/sites/<site>/page/provider/`, one per site): the middle layer. It
   answers the shell's questions ("what's playing?", "fill this panel", "this was clicked")
   by calling the site files, and turns site data into the shell's generic shapes (cards,
   tabs, pills, text, rows, "now playing").
3. **Site files** (`src/sites/<site>/page/`, e.g. `youtube-*.js`): the only code that reads,
   clicks or requests anything from the site. They expose what the site offers and don't
   know the shell exists.

**The rule:** features flow shell ← provider ← site. A shell file never gets a
site-specific field or check; when a site needs something new, add a generic option (a
model field, a card flag, a slot, a provider hook) and let the provider fill it.

Supported sites: **YouTube** (`src/sites/youtube/`).

## Two JavaScript worlds

A content script runs in one of two worlds on the site's page, which can only talk through
DOM events carrying JSON strings (`src/core/shared/bridge.js`):

- **Page world** (`"world": "MAIN"`; `src/core/page/`, `src/streamxr/page/`,
  `src/sites/<site>/page/`): the site's own context. WebXR sees the headset here and the
  site's player lives here. All VR rendering happens here.
- **Isolated world** (`src/streamxr/ui/`, `src/sites/<site>/ui/`): the extension's sandbox. The
  page button and the popup live here, because a site's Trusted Types policy (YouTube's)
  blocks `innerHTML` in the page world.

There are no ES modules (content scripts can't be modules). Every file is
`(function (ns) { ... })(globalThis.__streamxr = globalThis.__streamxr || {});` and adds
one piece to that namespace (each world has its own copy); `manifest.json` loads the files
in dependency order. The manifest has **one pair of `content_scripts` entries per site**
(page world + isolated world), matched to the site's host, listing the core's files first,
then StreamXR's, then the site's (and StreamXR's `main.js` last). Chrome keeps sites apart
by page, so supporting another site needs no build step.

**Shared files:** Chrome runs a given script file at most once per page even when two
entries list it, so the isolated world can't load the `shared/` folders (`src/core/shared/`,
`src/streamxr/shared/`). It loads generated copies in each one's `ui/shared/`; after
editing a `shared/` folder, run `node tools/sync-shared.js` (it also checks the manifest for
that mistake).

## Folder map

```
manifest.json                  load order for both worlds, one pair of entries per site; the icons (icons/), also
                               as the toolbar `action` (no popup: it only gives a pinned icon and its tooltip)
src/core/                      THE CORE (shell, part 1): the VR interface, site-agnostic
  shared/                      used by BOTH worlds (page loads these; ui loads copies)
    bridge.js                  event names + send/on/ask helpers (JSON-string payloads)
    i18n.js                    translations: t(key) in the interface language (or the browser's)
    strings-en.js              the core's words in English (strings-<lang>.js: other languages)
    controls.js                what each controller input does (single source of truth)
  ui/shared/                   GENERATED copies of core/shared/ (tools/sync-shared.js)
  page/                        page world
    math3d.js                  mat4 / vector helpers, head yaw
    pose-smoother.js           steadies the laser's pose against hand tremor (One Euro filter)
    gl-utils.js                shader programs, VAOs, buffers, textures
    storage.js                 remembered settings (streamxr.* in localStorage)
    sites.js                   the site registry: each site registers its provider; current()
    frame-clock.js             waits that keep time in VR (ticked by the frame loop)
    diagnostics.js             WebXR checks + headset clues + controller reports (Details)
    input.js                   controller state -> actions, via controls.js
    controllers/
      config.js                fit offsets, colours, button->part map, icon placement  <- tune here
      icons.js                 icon artwork: Material Symbols on M3E tonal buttons, in the colour theme (canvas 2D)
      models.js                GENERATED controller meshes (tools/controller-models/)
      model-pass.js            draws the meshes
      icon-pass.js             draws the floating icons
      controllers.js           per-hand pose, press highlights, stick tilt; runs both passes
    vr-panel/
      config.js                layout distance and text size, panel sizes, auto-hide, laser look  <- tune here
      tokens.js                design tokens: colours by Material 3 role, the site's theme, glass
      glyphs.js                the M3E loading indicator (`spinner`), textMiddle
      symbols.js               Material Symbols icons (Rounded; outlined + filled) as Path2D outlines
      panel-ui.js              the controls panel: layout, drawing, hit testing
      styles/                  the chevron panels' five styles + shared pieces
        kit.js                 generic card, images, badge registry, the M3 tabs (drawTabs, headerTabs), the M3 button, the hover ring, regionAt (hit tests; small controls reach out to 56 dp), createStrip (a row that slides sideways when the laser nears its end)
        grid.js                tabs, pills, text field, card grid, paging (Catalog + Profile)
        thread.js              a threaded comment list (Info's Comments, Profile's opened post)
        chat.js                a live chat list (Info's 'chat' content): rows with inline pictures, cards, a pinned banner
        info.js / catalog.js / queue.js / profile.js / options.js
      orbiters-ui.js           the side toolbars (upright M3E floating toolbars on the Safe Zone line), the pill (Settings) and the search bar; a side toolbar has a grab bar on its video side (moves its whole side)
      popups-ui.js             the controls panel's floating menus and the dialog (raised in front: Android XR's popup and dialog levels)
      motion.js                hover / press easing (M3E springs): one tracker per panel canvas; the opening springs (panels without bounce)
      laser-options.js         the Laser settings tab: steadiness (the shell's own)
      appearance-options.js    the Appearance settings tab: the colour theme, the glass look on / off and its tint, the panel size, vibration on / off (the shell's own)
      fade-options.js          the Auto-hide settings tab: how long the controls panel, toolbars, search bar, controllers and lasers wait before hiding / fading, and the "Auto-hide while paused" switch
      safe-zone.js             the Safe Zone: where the layout goes, as shares of the headset's field of view (measured from the eyes' projections); its outline
      safe-zone-options.js     the Safe zone settings tab: width, height, centre (the shell's own)
      keyboard-options.js      the Keyboard settings tab: style and language (or yours), and the layout keyboard.js draws
      language-options.js      the Language settings tab: the interface language (or the browser's)
      hover-card-ui.js         floating card (Previous / Next hover in a list)
      keyboard.js              the in-VR keyboard: keys (layout from keyboard-options.js), Shift, symbols, grab bar
      panel-pass.js            draws a panel in the world; the glass: the video behind it, blurred (from the renderer's backdrop())
      laser-pass.js            draws laser beams + hit dot
      vr-panel.js              the layout around the Safe Zone, laser hits, clicks, scrubbing, auto-hide; builds the
                               panels, toolbars and pill from the site's registry
src/streamxr/                  STREAMXR (shell, part 2): the video player on the core
  shared/                      used by BOTH worlds
    strings-en.js              StreamXR's words in English: formats, popup, starting VR, 2D Cinema
    formats.js                 the video formats (names, projection); detection is the provider's
  ui/shared/                   GENERATED copies of streamxr/shared/ (tools/sync-shared.js)
  page/                        page world
    media-source.js            where the frames come from: the site's <video>, followed when swapped
    video-sphere.js            the video sphere renderer (360°, 180°, cubemap)
    cinema-screen.js           flat/curved screen for regular videos (rounded corners, the edge-colour glow); picks sphere vs screen per format
    cinema-options.js          the 2D Cinema settings tab
    pause-overlay.js           dims the video, pause symbol, buffering loading indicator
    captions-overlay.js        the site's caption lines drawn in VR (over the 2D screen's bottom, or below your view)
    xr-session.js              one VR session: setup + per-frame loop (takes a provider)
    main.js                    page-world entry: picks the site's provider (sites.js), answers the popup
  ui/                          isolated world
    goggles-icon.js            the VR headset icon (Material Symbols' Head Mounted Device) for the VR buttons and popup
    panel.js                   "Watch in VR" popup (format picker, Enter VR, help, Details)
    popup.css                  its styles (Material 3; colours from the site's palette, asked of the page world)
src/sites/youtube/             YOUTUBE
  page/
    youtube-data.js            plumbing: text helpers, watch-page data, /youtubei/v1 requests,
                               video/playlist item readers
    youtube-player.js          the #movie_player API: playback, quality, speed, volume, captions,
                               audio tracks, loop/autoplay, playlist, live, storyboards, ads
    youtube-page.js            the watch page: Up Next, details, Subscribe/Like/Dislike, navigation
    youtube-content.js         metadata, description, chapters, heatmap, end screen, cards,
                               playlist, comments, transcript, search
    youtube-channel.js         any channel by id: header, tabs (sortable), playlists, shows ...
    youtube-home.js            Home feed + topic chips, Explore feeds, menu, search suggestions
    youtube-subscriptions.js   Subscriptions feed, Manage list, Subscribe/Unsubscribe, the bell
    youtube-chat.js            a live stream's chat: its views, the chat page, polling, items -> plain messages
    provider/
      provider.js              the provider (interface at its top); registers YouTube in sites.js
      panels.js                the panel registry (each panel's zone, style, size, controller)
      extras.js                the controls panel's Captions and Save buttons and Jump ahead at the seek bar's end (the shell's "extras": left, right, seek), premiumMark() (the Diamond)
      strings-en.js            the YouTube panels' words in English (strings-<lang>.js: other languages)
      cards.js, badges.js      YouTube items -> generic cards; the ✓ / ♪ badges
      upnext.js, browse.js (Explore and You), search.js, channel.js, description.js, comments-panel.js, settings.js, live-chat.js
                               one controller per panel (comments.js: the comment threads, used by
                               the Comments panel and a Channel post)
  ui/
    site.js                    the site's name and brand colour for the popup (until the palette arrives)
    player-button.js, button.css   the VR button in YouTube's player controls
    topbar-button.js           the VR button in YouTube's top bar (next to "+ Create"), on every page
    skip-helper.js             talks to the optional Skip Helper extension
    main.js                    isolated-world entry: keeps the button in the page
icons/                         the extension's icons, 16-128 px (tools/icons/make-icons.html)
skip-helper/                   SEPARATE optional extension: presses YouTube's Skip ad button
third_party/material-symbols/  the Material Symbols license (Apache 2.0), for symbols.js
third_party/material-color-utilities/   Google's Material Color Utilities (Apache 2.0), wrapped as a plain
                               script (ns.materialColor): makes the Material 3 palettes (tokens.js)
tools/sync-shared.js           shared/ -> ui/shared/ copies (core and streamxr), manifest checks
tools/icons/make-icons.html    draws the extension icons (icons/, skip-helper/icons/) from Material Symbols
tools/controller-models/       dev-only: rebuilds models.js from Valve's CAD (see README)
docs/
  youtube.md                   the YouTube modules + what's been learned about YouTube
  hardware.md                  the Steam Frame and its controllers in Chrome
  design-choices.md            how the interface is meant to look and behave
  known-issues.md              unverified, quirky, tried and dropped
  Future-Plans.md              BrowseXR prep: what's done, what's left, what it would break
  Materials-Redesign.md        the planned Material Design 3 + glass redesign
  features/                    backlogs: what YouTube offers that VR doesn't use yet
  decisions/                   why the big decisions were made
```

## A VR session

1. The site's page button (isolated world) opens the popup (`src/streamxr/ui/panel.js`). It asks
   the page world over the bridge for the video info, the provider's detected format, the
   site's Material 3 palette (its colours) and
   the WebXR diagnostics, and shows a format picker, the passthrough switch (greyed out
   unless the browser offers `immersive-ar`) and **Enter VR**.
2. **Enter VR** sends `ENTER` inside the click (WebXR needs the user gesture). StreamXR's
   `main.js` takes the provider of the site this page belongs to (`ns.sites.current()`,
   registered by the site's `provider.js`) and calls `xrSession.start(provider, fmt, listener)`.
3. `xr-session.js` asks for an `immersive-ar` session if passthrough was chosen and is
   offered (else `immersive-vr`; a see-through session clears to transparent), applies the
   provider's theme, opens `provider.session()`, builds the
   video view (`video-sphere.js` or `cinema-screen.js` by format), the pause overlay, the
   controller models and the VR panel, then runs the frame loop:
   - follow the media source (`media-source.js`: the site's `<video>`, which can be swapped
     when another video opens) and upload a frame only when there is a new one;
   - poll the controllers (`input.js` with the bindings in `controls.js`);
   - ads (if the provider has `ad()`): show them on the cinema screen, then switch back and
     re-detect the format;
   - recenter when asked; re-detect the format after `provider.onNavigate`;
   - `panel.update(...)`, then draw: video, pause overlay (paused / `provider.buffering()`),
     panels, controller models, lasers.
4. The panel's `actions` are the provider session's plus the shell's own (recenter, exit,
   setFormat, setDistance, setCurve); its `state()` is the session's plus the format and the
   cinema screen settings (`viewSettings`).

The stick: left/right is ±10 s, but while the laser is on a panel with page arrows it turns
pages (`panel.stickPage`), and on a scrolling area up/down scrolls (`panel.stickScrolls`);
the controller icon changes to match (`panel.iconSwaps`).

## The provider

The interface is written at the top of `src/sites/youtube/page/provider/provider.js`, which
is the source of truth. In short:

- **Site level:** `name`, `theme` (`{ accent, accentPressed, dark }`), `themes` (optional:
  `[{ id, label, theme }]`, the colour themes offered in Settings → Appearance, the first the
  default; `appearance-options.js` applies the chosen one), `video()`, `info()`,
  `detectFormat(info?)` -> `{ fmt, isSpatial }`, `isPaused()`, `toggle()`, `seek(s)`,
  `buffering()`, `onNavigate(fn)` -> `stop()`, `session()`.
- **A session:**
  - `actions`: those the shell calls (`toggle`, `seekBy`, `seekTo`, `goLive`, `setQuality`,
    `setSpeed`, `setVolume`, `setMuted`, `storyboard`, `skipAd`, `previousVideo`,
    `nextVideo`), plus whatever the site's own panel controllers use.
  - `state()`, polled every frame: `title`, `nowPlaying`, `time`, `duration`, `live`,
    `paused`, `quality` (`{ current, currentLabel, levels: [{ id, label }] }`), `speed`,
    `speeds`, `volume`, `chapters`, `ad`, plus what the site's panels read.
  - `ad()` (optional): the ad playing now, or null.
  - `site`: `{ name, panels (the registry), onControl(id, panel) }`.
- Optional features simply aren't provided: ads, live streams, the storyboard preview,
  chapters, a queue, action buttons. Quality, speed and volume are not optional yet (the
  controls panel always shows those buttons).

**`nowPlaying`** is what the controls panel draws under the title (`panel-ui.js` documents
it): `info` (coloured pieces on one line, e.g. views · date, then the playlist),
`creator` (`{ name, badge, stats }`, a button with id `creator`), `actions` (right-aligned
buttons: `pill`s with a look and label, or thumbs `icon`s with a count; ids `action:<id>`;
a `hidden` one keeps its place), and `queue` (Previous / Next with their hover cards).
Controls the shell doesn't handle itself (`title`, `creator`, `action:<id>`) go to
`site.onControl(id, panel)`, where `panel(id)` gives a chevron panel's controller.

## Cardinal Direction panels

The site's panels are laid out around the **Safe Zone** (`safe-zone.js`; the part of your
view the video keeps; docs/Spatial-Layout.md), each in a **zone** its registration names:
`left` and `right` (outside the zone's side edges, one open per side, remembered; each side
has an upright toolbar, `orbiters-ui.js`, standing on the zone's line over the panel's
inner edge, its names growing outward), or `controls` (a popup rising from a pill on the
controls panel's top edge, e.g. Settings), or `top` (a search bar above the zone, its
suggestions dropping into it, and the panel in the zone's middle while its controller's
`model()` says `open`; it also returns the bar's field as `bar`). The controls panel sits
under the zone; a panel asking for keys (`typeInto`) brings up the in-VR keyboard. Each
panel is a **style** (how it looks) filled by a site's **controller** (what it shows).

### The registry

A site lists its panels (YouTube: `provider/panels.js`, which documents the interfaces):

```js
{ id, zone: 'left' | 'right' | 'controls' | 'top',
  label, icon,                            // icon: a Material Symbols name (symbols.js)
  style: 'info' | 'catalog' | 'queue' | 'profile' | 'options',
  size: 'wide' | 'tall' | 'standard',     // vr-panel/config.js `sizes`
  overrides: { slots: { ... } },          // optional: the style's slots
  default: true,                          // optional: open the first time (on its side)
  available: st => bool,                  // optional (side panels): offered only while true
                                          //   (asked every frame; its toolbar button hides meanwhile)
  autoOpen: true,                         // optional: opens whenever it becomes available (not
                                          //   remembered); the panel it replaced comes back after
  stays: true,                            // optional: doesn't fade with the rest while you watch
  create(host) -> controller }
```

YouTube's Live chat uses all three (`available` while a live stream with a chat plays):
`vr-panel.js` `refreshAvailable` hides its toolbar button (`orbiters-ui.js` `setHidden`, the
bar shrinking and laid out again) and keeps a `stays` panel drawn and updated while the panels
are hidden.

- `host`: `{ actions, style, perPage, open(), close(), isOpen(), closeMenu(), openMenu(control), panel(id), confirm(d), typeInto(on, opts) }`
  (`opts.emojis`: the panel's own emojis, `[{ text, image, label }]`, first on the keyboard's emoji pages);
  `confirm(d)` asks in the shell's dialog (`{ title, text (up to four lines), confirm, cancel
  (null: no cancel button, a dialog that only informs), danger }` -> a Promise
  of true / false); the site's `onControl(id, panel, shell)` gets the same as `shell.confirm`.
- Menus on side panels: `host.openMenu(control)` (e.g. `'action:bell'`) opens a floating menu
  above that control, 32 dp in front, like the controls panel's (the style needs `rectOf(id)`;
  Profile has it). While it's up, `vr-panel.js` asks the controller's `menu(control)` each frame
  (`{ items: [{ id, text, on, disabled, icons }], note, stay }`, `null` closes it); a choice
  arrives as `{ type: 'menu', value: item id, menu: control }`. The menu's id is
  `'p:<panel>|<control>'` and its items `'pi:<index>'` (`panelMenu`). `host.panel(id)` is another
  panel's controller (the You panel opens a channel in the Channel panel with it).
- Typing: a panel with a text field calls `host.typeInto(true)` to get the keys (and
  `false` to give them back). One panel types at a time: when another asks, the one that had
  the keys is sent `Escape` (as for a click on nothing) and should stop typing. While it's shown, each key reaches its controller as
  `{ type: 'key', value }`: a character (or an emoji, or a panel emoji's `text`, from the
  keyboard's 😀 pages), `Backspace`, `Enter` or `Escape`. The keys come
  from the in-VR keyboard (`vr-panel/keyboard.js`; the `keyboard` binding swaps it with
  the controls panel in `vr-panel.js`: it hangs from the controls panel's top edge, sharing
  its pose) and from the computer's
  keyboard (kept from the page meanwhile, so YouTube's shortcuts don't fire).
- `controller`: `model(frame)` -> `{ model, key }` (while shown; redrawn only when `key`,
  the hover or the loaded images change), `event(ev)`, and optionally `tick(frame)` (every
  frame), `afterDraw()`, `opened()`, plus anything the site's `onControl` calls.
- Sizes (canvas px, `config.js` `sizes`): `wide` panels all take the height a Catalog trims
  itself to (900 px wide), `tall` is 900 x 1100, `standard` is the controls panel's width
  (1024). Every canvas is shown at the same density (`config.js` `layout.pxPerDegree`, at
  `layout.distance`).

`vr-panel.js` builds everything from the registry: the layout, the toolbars and the pill, hit testing, events,
stick paging and scrolling, slider dragging, redraw keys and image loading. A panel
control's id there is `<panel id>|<style id>`.

### The five styles

| Style | YouTube panel | Draws |
|---|---|---|
| **Info** (`info.js`) | Description, Comments, Live chat | header tabs; each tab one content kind: `text` (rich text, links), `paged` (rows in two columns: chapters), `rows` (scrolling, current row followed: transcript), `thread` (pills, count, rows with children and "show more": comments), `chat` (chat.js: a pinned banner, messages with inline pictures and coloured cards, following the newest or paused with a "jump to newest" button; optionally a message field with Send, reaction buttons and a Support button, an XP pill and a ranked Top fans list: live chat), `message` (optional loading indicator) |
| **Catalog** (`catalog.js`) | Explore, You, Search | title, source tabs, filter pills (tabs and left-aligned pills slide when they don't fit: kit.js createStrip) or a note or a text field with its button (and a suggestions list dropping down from it), card grid, paging; trims its height to its cards |
| **Queue** (`queue.js`) | Up Next | title or tabs, paging in the header, 3 x 2 cards, a "current" card |
| **Profile** (`profile.js`) | Channel | banner, picture, name + badge, stats line, one action button (looks: primary / secondary / danger / busy) and an optional round icon button beside it (the bell), tabs (shrinking to fit beside the pills), pills, a search button (searching: a back button and a text field in place of the tabs), card grid, paging, or one featured card, or a scrolling body: a text `page` (paragraphs, then label / value facts), a `feed` of posts (picture, author, text, pictures, a card, a poll with result bars, buttons with icons and counts), or one opened `post` with a back button and its comments (thread.js) |
| **Options** (`options.js`) | Settings | tabs (with icons); up to 3 rows (name with its hint under it; at the right: a switch, a slider with a Default button and end captions, a ‹ value › stepper, or a button; faded) or a 4 x 4 choice grid with "More" paging |

Each style file's header lists its model and control ids. Every style returns
`{ canvas, aspect, draw(model, ui), hitTest(u, v), has(id), imagesReady(), perPage }`;
Info and Profile add `scrollAt`, `maxScroll`, `shownScroll`, `pxPerV`, Options adds `sliderFraction`.

**Standard events:** a style's control ids are `<type>:<value>` and reach the controller
as `{ type, value, fraction? }`. Types: `tab`, `pill`, `item`, `page`, `action`,
`featured`, `post`, `vote`, `back`, `link`, `row`, `time`, `children`, `more`, `newest`, `react`, `send`, `support`, `fans`, `fansBack`, `switch`, `slider`, `default`,
`choice`, `prev`, `next`, `button`, `field`, `clear`, `submit`, `suggest`, plus `scroll` (from dragging or the stick), `key` (typing), a slot's own ids, and the names a provider gives a post's buttons (YouTube: `postlike`, `postdislike`, `postcomments`).

**The generic card** (`kit.js`), used by every card grid and the hover card:
`{ title, thumb, corner, flags: [{ text, bg, fg, dot, matchWidth }], lines: [{ text, badge }], current, progress, fit, inert }`.
The provider turns site items into cards (YouTube: `provider/cards.js`, with its 2D / 180° /
360°, LIVE, Mix, Playlist, Short and "Now playing" flags).

**Badges** are a registry: `kit.registerBadge(name, draw, extra)`; YouTube registers ✓
(verified) and ♪ (artist).

### Extending a style

A site changes a style only through **slots** the style declares, passed as
`overrides.slots` in the registration; the style keeps control of layout, hit testing,
scrolling and redraws. Today there is one slot: Info's `threadFooter` (YouTube draws its
comment rows' 👍 / 👎 / ❤ footer with it, `provider/comments.js`). Two guardrails:

1. **Data before overrides.** Anything that can be said as data (a line, a flag, a label, a
   colour) is a model field the provider fills; a slot is only for genuinely different
   drawing.
2. **One level only.** A site customises the shell's style, never another site's. If two
   sites want the same thing, it becomes an option of the style.

When a site needs a new slot, add it to the style (with a default that draws today's look)
and document it in the style's header.

## Theme, storage, the popup

- **Design tokens** (`vr-panel/tokens.js`, `ns.vrTokens`): every colour the panels draw is a
  Material 3 colour role, `color.<role>` (`primary`, `surface`, `onSurface`,
  `onSurfaceVariant`, `outline`, `tertiary` ...; today's in-between greys as neutral tones
  `n90` ... `n13`), or `alpha(role, a)` for translucent layers. Drawing files import them as
  `TC` / `TA` and read them while drawing (never at load), and never write a colour
  themselves. A provider's `theme` (`{ accent, accentPressed, dark, custom }`) is applied
  when VR starts (`apply`); `custom` adds the site's own roles (YouTube's card flags).
  Card flags give colours as role specs (`'surface/0.75'`), drawn through `resolve`.
  `m3` is the Material 3 palette (every M3 role, dark scheme), made when VR starts from the
  provider's `theme.seed` by Material Color Utilities (`scheme(seed, variant)`, ~0.4 ms;
  the theme also picks the variant, `scheme`, and role pairs to `swap`), else M3's
  baseline, plus our roles `brand` / `onBrand` (the site's exact accent) and `hoverRing`.
  Restyled components (so far the controls panel, `panel-ui.js`) draw from `m3` (`P`,
  `PA(role, a)`), with M3 type roles (`font(role)`) and corner sizes (`shape`); `glass`
  holds the planned glass look's settings (tint 0.62). See
  [docs/Materials-Redesign.md](docs/Materials-Redesign.md).
- **Storage** (`storage.js`, `ns.storage`): remembered settings in the site's localStorage
  under `streamxr.*` (values saved under the older names, `streamvr.*` and `ytvr.*`, move
  over when first read).
- **Site registry** (`core/page/sites.js`, `ns.sites`): each site's `provider.js` calls
  `ns.sites.register({ id, name, hosts, provider })`; StreamXR's `main.js` asks
  `ns.sites.current()` for the page it runs on. Page world only (the isolated world's site
  files are listed per site in the manifest).
- **The popup** (`src/streamxr/ui/panel.js`) gets the site's name and dark colour from
  `src/sites/<site>/ui/site.js` (`ns.site`).
- **Words** (`core/shared/i18n.js`, `ns.i18n`): nothing shown to the user is written in the
  code; it's `ns.i18n.t('key', { vars })`, looked up in string tables, one per part: the
  core's (`src/core/shared/strings-<lang>.js`), StreamXR's (`src/streamxr/shared/
  strings-<lang>.js`; both in both worlds: the popup uses them), and each site's
  (`src/sites/<site>/page/provider/strings-<lang>.js`, keys starting with the site, e.g.
  `yt.`). English (`-en`) is complete; another language may leave keys out (they show in
  English: language, then its base, then English). A text can have plural forms
  (`{ one, other, ... }`, picked by `vars.n`). The language is the browser's unless one is
  chosen in Settings → Language (`localStorage` `streamxr.language`, read by both worlds;
  the global reset clears it). Text is asked for at draw time, never kept in constants built
  at load, so a language change shows at once; `ns.i18n.version()` is in every redraw key.
  A registry `label` can be a function for the same reason. What the site writes itself
  (titles, view counts, its filter chips) isn't translated, and readers that match the
  site's own words (e.g. YouTube's "All" chip, "Joined") keep matching them as they are.
  Adding a language: CONTRIBUTING.md, "Translating".

## Where to make common changes

- **YouTube changed its page or data:** the `youtube-*.js` file that reads it.
- **A new YouTube feature in a panel:** the panel's controller in `provider/`; if the style
  can't show it yet, add a generic option to the style first.
- **A new chevron panel:** a controller + a registry entry in `provider/panels.js`, built on
  one of the five styles.
- **New controller action:** a binding in `src/core/shared/controls.js`, its handler in
  `xr-session.js` (the input handler), optionally an icon (Material Symbols names) in `controllers/icons.js`
  and a placement in `controllers/config.js`. The help line updates itself. A binding with
  `hold: seconds` fires once after that long held (input.js `holds()` feeds the countdown
  ring drawn over its part's icon).
- **A new adjustable setting:** give its module a `reset()` and call it from `resetAll` in
  `xr-session.js` (the global reset), and forget its stored value with `ns.storage.remove`.
- **A colour on a panel:** a role from `vr-panel/tokens.js` (`TC.<role>`, `TA(role, a)`),
  never a literal; a missing role goes into tokens.js under its M3 name.
- **New words on screen:** a key in the English table of the part that draws it
  (`src/core/shared/strings-en.js`, `src/streamxr/shared/strings-en.js`, or the site's
  `provider/strings-en.js`) and `ns.i18n.t(key)` where it's drawn. Never a literal in the code.
- **New video format:** `src/streamxr/shared/formats.js` (label, projection), the renderer in
  `video-sphere.js` or `cinema-screen.js`, detection in each provider's `detectFormat`.
- **Tuning numbers:** `vr-panel/config.js`, `controllers/config.js`, `SETTINGS` in
  `cinema-screen.js` and `pause-overlay.js`.
- **Another headset:** see the README's "Adding a headset".

## Adding a site

1. Check the site's video can be drawn at all (see "Known limits": DRM).
2. `src/sites/<site>/page/`: the site files, and a `provider/` with `provider.js` (the
   interface above, ending with `ns.sites.register({ id, name, hosts, provider })`), its
   panels (`panels.js` + one controller each, on the five styles) and its string tables.
3. `src/sites/<site>/ui/`: `site.js` (name, colours), the page button and its CSS, and
   `main.js` (keeps the button in the page).
4. `manifest.json`: the host in `host_permissions`, and a pair of `content_scripts` entries
   for it (copy YouTube's pair: core files, then StreamXR's, then the site's, then
   `src/streamxr/page/main.js` last).
5. Never change the shell for one site: add a generic option, slot or provider hook.

## Gotchas

- In VR, don't wait with `setTimeout`: while you're in the headset Chrome can treat the
  page as hidden and run its timers late (about once a second, after five minutes once a
  minute). Search suggestions waited on a 150 ms timer and never showed in the headset
  (0.44.0). Use `ns.frameClock.sleep(ms)` / `after(ms, fn)` (`frame-clock.js`, ticked by
  the VR frame loop; also what `youtubeData.sleep` uses), or a controller's `tick(frame)`.
- Chrome injects a given script file only once per page across `content_scripts` entries:
  hence the generated `ui/shared/` copies (core's and StreamXR's) for the isolated world.
- Shader uniforms shared between a vertex and a fragment shader must use the same precision,
  or the program fails to link.
- When blending overlays, keep the destination alpha intact:
  `blendFuncSeparate(..., ZERO, ONE)`.
- Images drawn on panel canvases must load with `crossOrigin='anonymous'` (and the server
  must allow it), or the canvas can no longer be uploaded as a WebGL texture.
- WebXR's `requestSession` must be called inside the user's click (the popup sends `ENTER`
  synchronously from its click handler).
- Each panel is redrawn only when its controller's key, the hover or the loaded images
  change: anything a panel shows must be in its key, or the panel won't update.
- Site-specific gotchas (YouTube's data, player and ads) are in [docs/youtube.md](docs/youtube.md).

## Known limits

- **DRM.** Netflix, HBO Max, Disney+ and most paid services protect video with Widevine.
  Chrome won't copy protected frames into WebGL (black or an error), and every video is
  drawn through WebGL, so those services can't be supported unless that changes.
- WebXR needs the page's permissions policy to allow `xr-spatial-tracking`; a site can
  block it (`diagnostics.js` reports it).
- Sites' player APIs are private and change; a provider may have to click the site's own
  buttons (as `youtube-page.js` does). YouTube's text matching assumes English.
- Desktop Firefox has no WebXR, so the VR part can't run there yet; browser-specific code
  is kept to `src/sites/youtube/ui/skip-helper.js` and `skip-helper/`.
- There are no automated tests in the repo. The maintainer tests in a headset; refactors of
  drawing code are checked by rendering the canvases from mock data before and after and
  comparing them pixel for pixel.
