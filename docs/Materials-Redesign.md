# Material Design 3 redesign (done: 0.50.0 - 0.62.0)

A plan to restyle StreamXR's VR interface with **Material 3 Expressive** (M3E), plus a
frosted-glass, see-through look in the spirit of visionOS. Written in October 2026 after
0.48.1, and carried out step by step from 0.50.0 to 0.62.0 (October 2026); each step's
"Done in" note below records what was built. ("M3" below means Material 3 as
updated by Expressive.)

## Decisions already made (by the maintainer)

- **Material 3 Expressive** (decided 2026-10-13). Expressive is Google's 2025 update to
  Material 3, not a separate system: the same colour roles, palettes and tokens, plus a
  bigger shape library and shape changes on press, spring motion, emphasized type styles,
  and new / updated components (button groups, split buttons, toolbars, FAB menu, the
  morphing loading indicator, wavy progress, buttons in sizes XS-XL, the thick slider with
  a bar handle). Chosen because its bigger, bolder controls suit pointing with a laser at
  about a metre. Use its component specs wherever one fits (step 3).
- **Stock M3 first.** Use M3's system as designed (colour roles, shapes, type scale,
  elevation, components); adapt it towards YouTube's look later, through the site's theme.
- **The old look can go.** The choices in [design-choices.md](design-choices.md) about
  colours, greys and panel looks (YouTube Red / Almost Black / Almost White, the grey hover
  tints, the flag colours) may be replaced. Update that file as each part lands, so it
  stays the record of how things look *now*.
- **Brand colour from a seed, made at run time** (0.51.0; first decided as pre-computed
  tables, changed once the library proved small and fast; see "Colour").
- **Glass done cheaply**: a blurred sample of the video behind the panel, plus tint, noise
  and a rim light; no extra full-scene render passes (see "Glass").
- **The look: M3 glass** (chosen 2026-10-13 from the Settings mock-up: today / M3 solid /
  M3 glass, with a UI/UX designer's advice). Glass tint **62%** of the surface colour, kept
  as **one variable** (the `glassTint` opacity token) that everything reads, so it can be
  changed in one place.

- **Controls panel decisions** (2026-10-13, from its mock-up):
  - **Hover must be clearly visible** (not M3's faint 8% state layer, too subtle for a laser
    in VR). First decided as "the stronger accent container"; replaced by a white outline
    ring once the colours were picked (see "The colours" below).
  - **Button labels** under the icons (17 px in the mock-up): **test in the headset** before
    changing; 19-20 px if they're hard to read (in "To test in the headset" below).
  - **LIVE keeps YouTube's bright red** (the brand colour, `color.primary` /
    `theme.accent` #FF0033), not M3's darker red container.
- **The colors (decided 2026-10-13, from the controls panel mock-up, "Fidelity swapped +
  classic red"):**
  - **Scheme: Fidelity** (`SchemeFidelity` instead of `SchemeTonalSpot`: stays closer to
    the seed; M3's dark schemes always lighten `primary` to pink, #ffb3af for #FF0033).
  - **Pink and deep red swapped:** buttons and unselected items are the pink (Fidelity's
    `primary` #ffb3af, dark red icons / text `onPrimary` #68000e); where Fidelity would use
    its deep red container (#96041b), the swap puts the pink, and vice versa.
  - **Classic YouTube red** (#FF0033, white on it) for the accents: the seek bar's played
    part and handle, play / pause, Subscribe, Like when on, and LIVE.
  - **Hover: a white outline ring** around the pointed-at button (it keeps its own colour,
    and its corners square up slightly, M3E's press shape), so a hover can't be mistaken
    for a red accent. This replaces the "stronger accent container" hover decided earlier
    the same day, which turned out bright red with these colours.
  - Before: the Tonal Spot palette (0.50.1-0.51.0) had muted red-brown buttons and a
    hover too faint for VR.
- **The panel styles (decided 2026-10-13, from the Settings and Browse mock-up):**
  - **Tabs:** M3 fixed tabs, equal widths, an icon above the label; the current one in
    `onSurface` with a brand red indicator under it; pointed at: a faint tint and the
    white ring.
  - **Switches:** on = brand red (YouTube Red) track with a white handle holding a red
    check; off = dark track with an outline and a small grey handle.
  - **Setting rows** as M3 list items: the name with its hint under it on the left, the
    control on the right (sliders in the middle, Default as a tonal pill with ↺).
  - **Filter chips:** M3's rounded rectangles (`shape.small`); selected = tonal pink with a
    check, others outlined.
  - **Cards:** no tile at rest (like YouTube); the tile (`surfaceContainerHighest`) and
    the white ring appear only on the pointed-at card. Thumbnails rounded (`shape.medium`),
    the duration on a dark pill, the watched bar in brand red.
  - **Text field:** a full-round filled field with a search icon; focused = brand red
    outline and caret; its button filled brand red. Paging and steppers: round tonal icon
    buttons.

## To test in the headset

- Controls panel button labels: readable at 17 px? (else 19-20 px; `type.labelMedium` in
  tokens.js).
- Controls panel (0.52.0): the white hover ring easy to see on every button; the pink
  buttons comfortable over bright and dark videos (before the glass).
- ~~Glass (0.59.0)~~ tested 2026-10-13: the frame rate stayed smooth; default tint set to
  43% (0.60.0). (Was: the frame rate stays smooth (one mipmap rebuild per video frame, a few
  extra texture reads per panel pixel; if not: fewer taps, or tint + grain + rim only);
  text readable over moving video; the default tint (54%) to settle with the slider.)

**Tested:** the toolbar works in the headset as of 0.53.3 (2026-10-13): smooth, consistent
expansion, hand-over between items and click fades.

**Tested:** 0.52.0 works in the headset (2026-10-13). The user noted a few minor UI quirks
and will raise them in a UI/UX pass after the redesign is finished; ask for them then.

## Why it's a medium-sized job

Panels are drawn with canvas 2D in the shell (`src/core/page/vr-panel/`). The theme today
(`vr-panel/theme.js`, `ns.vrTheme`) is only `accent`, `accentPressed`, `dark` and two alpha
helpers, set from the site's provider. Everything else is hard-coded in the drawing code:
greys (`#aaa`, `#888`, `#ddd`), translucent whites (`rgba(255,255,255,0.07 / 0.1 / 0.18)`),
the blue highlight (`#3ea6ff`), corner radii (12, 18, 30, 32 px), font sizes (16-30 px,
weights 500/600), card flag colours (in the YouTube provider's `cards.js`). All of that has
to move onto named tokens before the look can change in one place.

Files that draw: `panel-ui.js` (controls panel), `chevrons-ui.js`, `hover-card-ui.js`,
`keyboard.js`, `glyphs.js`, `styles/kit.js`, `grid.js`, `thread.js`, `info.js`,
`catalog.js`, `queue.js`, `profile.js`, `options.js`; the shaders in `panel-pass.js`,
`laser-pass.js`, `pause-overlay.js`, the controllers' icons (`controllers/icons.js`); and
the popup (`src/streamxr/ui/popup.css`, `button.css`), which is HTML and can use the same
tokens as CSS variables.

## Steps

### 1. Token layer (no visible change) — colours done in 0.50.0

Replace `ns.vrTheme` with an M3 token set, `ns.vrTokens` (or extend `vrTheme`), and move
every hard-coded colour, radius, size and weight in the files above onto it. Map today's
values onto the tokens first, so this step draws **pixel-identical** canvases (check with
the usual before/after canvas hashes, as in the 0.32-0.34 and 0.48 refactors).

**Done in 0.50.0:** `vr-panel/tokens.js` (`ns.vrTokens`) replaced `theme.js`. Every colour
in the 13 canvas drawing files and the pause overlay is a role (`TC.<role>`,
`TA(role, a)`); today's in-between greys are kept as neutral tones (`n90` ... `n13`) so
nothing changed on screen; YouTube's card flags name roles, with its three flag colours as
custom colours in its theme; the glass tint (0.62) lives in `tokens.glass`. Checked: every
style drawn (controls panel, chevrons, keyboard, Options, Catalog, Queue, Profile, Info,
hover card, with hover / pressed states and every flag) hashes identical to 0.49.2.

**Left for step 3 (decided in 0.50.0):** font sizes / weights and corner radii move onto
the type-scale and shape tokens component by component as each is restyled, since their
values change then anyway (converting today's 30 sizes first would buy nothing). Not in
canvas code and also left: the WebGL colours (laser, controller models: `config.js` RGB
floats), the popup's CSS (step 3.5, CSS variables).

Tokens (M3 names, camelCase):

- **Colour roles** (dark scheme; the panels are always dark in VR): `primary`,
  `onPrimary`, `primaryContainer`, `onPrimaryContainer`, `secondary`, `onSecondary`,
  `secondaryContainer`, `onSecondaryContainer`, `tertiary`, `onTertiary`,
  `tertiaryContainer`, `onTertiaryContainer`, `error`, `onError`, `errorContainer`,
  `onErrorContainer`, `surface`, `onSurface`, `surfaceVariant`, `onSurfaceVariant`,
  `surfaceContainerLowest`, `surfaceContainerLow`, `surfaceContainer`,
  `surfaceContainerHigh`, `surfaceContainerHighest`, `surfaceBright`, `surfaceDim`,
  `inverseSurface`, `inverseOnSurface`, `inversePrimary`, `outline`, `outlineVariant`,
  `scrim`, `shadow`.
- **State layers** (M3 interaction states, an overlay of the content colour):
  `hover` 0.08, `focus` 0.10, `pressed` 0.10, `dragged` 0.16; disabled content 0.38,
  disabled container 0.12.
- **Shape** (corner radius, px at 1280 px per metre; M3E's scale): `none` 0,
  `extraSmall` 4, `small` 8, `medium` 12, `large` 16, `largeIncreased` 20, `extraLarge` 28,
  `extraLargeIncreased` 32, `extraExtraLarge` 48, `full` (pill). Panel corners:
  `extraLarge`. Pressed buttons change shape (M3E): round at rest, squarer while pressed.
- **Type scale** (M3 roles: display / headline / title / body / label, each large /
  medium / small, plus M3E's **emphasized** version of each, heavier, for the selected or
  most important text), sizes scaled for reading at ~1 m in VR (M3's sp values × about
  1.6 on our canvases; tune in the headset). Font: Roboto (already used), with Roboto
  Flex as an option if bundled.
- **Motion** (M3E springs): `fast` / `default` / `slow` spatial and effects springs
  (damping + stiffness), for hover, press and open / fold animations. Today a panel only
  redraws when something changes; animating needs a redraw while a spring settles (the
  same mechanism the scrolling title and the spinner use). A later step than the colours.
- **Elevation**: levels 0-5 as surface tint + shadow; in glass panels mostly expressed by
  the tint strength and the rim light instead of drop shadows.
- **Glass** (our own, not M3): `glassTint` (surface colour + opacity, **0.62**; the only
  place that number lives), `glassBlur` (which mip level / how wide), `glassNoise`
  (strength), `glassRim` (rim light strength).

Card flags (2D / 180° / 360°, LIVE, Mix, Playlist, Short, Now playing) become M3 roles
too (e.g. container colours), chosen by the provider by role name instead of hex values.

### 2. Colour: palettes per site — done in 0.50.1, made at run time since 0.51.0

**Changed in 0.51.0 (maintainer's decision, after the cost was measured):** the library
is bundled instead of shipping tables: `third_party/material-color-utilities/` (jsDelivr's
bundle of 0.3.0, wrapped as a plain script, `ns.materialColor`, Apache 2.0; the one
exception to "no libraries"). A provider gives `theme.seed` (YouTube: #FF0033) and
`tokens.js` makes the palette when VR starts (`scheme(seed)`: 0.43 ms each; applying
YouTube's theme 1.7 ms once per session). Checked: the palettes made in the extension equal
the 0.50.1 tables exactly. `scheme()` is there for dynamic colour later (e.g. a palette
from the video's thumbnail: the library also has `sourceColorFromImage`). The baseline
table stays in tokens.js as the default when no seed is given or the library is missing.
The "pre-computed" notes below are kept for the record.

**Done in 0.50.1:** generated with Google's **material-color-utilities** 0.3.0 (the library
Material Theme Builder runs; `SchemeTonalSpot`, dark, contrast 0), in a scratch page in
the built-in browser: YouTube's palette from #FF0033 is `theme.palette` in
`provider.js`, and the core's default (M3's baseline seed #6750A4) is `m3` in
`tokens.js`. Nothing draws from `m3` yet (step 3 switches components over). Cost, for a
future "dynamic colour" idea: the library is ~66 KB, and one palette takes ~0.4 ms
(~5 ms the first time), so generating at run time would be cheap; it would just mean
bundling that Apache-2.0 library. To regenerate: in a page, `import` it from
`https://cdn.jsdelivr.net/npm/@material/material-color-utilities@0.3.0/+esm`, then for each
role `hexFromArgb(MaterialDynamicColors[role].getArgb(new SchemeTonalSpot(
Hct.fromInt(argbFromHex(seed)), true, 0)))`.

- Each site's provider ships its palette as a plain table of the colour roles above
  (dark scheme), generated once from a seed colour with Google's **Material Theme
  Builder** (export as JSON, paste into the provider). YouTube: seed YouTube Red #FF0033.
  The shell keeps a neutral default palette (e.g. a blue seed) for sites without one.
- Why not calculate at run time: M3's palettes come from the HCT colour space (CAM16),
  a few hundred lines of maths we'd have to write ourselves (no libraries). It's only worth
  it for dynamic colour (a palette from each video's thumbnail); add it then if wanted.
- The provider interface's `theme` grows from `{ accent, dark }` to the palette table;
  `xr-session.js` applies it when VR starts, as now.

### 3. Restyle onto M3 (the visible change) — 3.1 controls panel (0.52.0), 3.2 toolbar (0.53.0), 3.3 part 1 Settings and tabs (0.54.0), part 2 chips, cards, paging, field (0.55.0), part 3 Description, Channel, thread, loading (0.56.0), 3.4 keyboard (0.57.0), 3.5 popup (0.58.0) done

**Done in 0.52.0, the controls panel** (`panel-ui.js` redrawn; every control id, hit area
and behaviour kept): tonal pink buttons with Material Symbols and a small label, the
button row as one group (play / pause bigger, brand red, squarer), the M3E slider for the
seek bar (brand red played part with chapter gaps, pink unplayed, bar handle; thicker while
pointed at, with the heatmap) and the volume slider, menus as tonal buttons with the
current one `primary` (deep red) and ticked, Subscribe in brand red, Like / Dislike as a
connected group (Like on: brand red; Dislike on: deep red), "Unsubscribe?" in
`errorContainer` (the M3 `error` is the same pink as the buttons here), LIVE as a brand red
chip (tonal and clickable when behind), Skip ad as an inverse-surface button, a white ring
on whatever is pointed at, and the grab bar as a small pill with a drag handle (brand red
while moving). The Format button shows the first line of the format's name ("Cinema",
"360°") and an icon per format (360° cubemap: a cube). The panel's background is the M3
`surfaceContainer` at 90% until the glass (step 4). Tokens gained: the scheme variant and
role swaps in a theme, `brand` / `onBrand` / `hoverRing`, and the first type roles and
corner sizes (`font()`, `shape`). Other panels unchanged (checked against 0.51).

**Done in 0.53.0, the toolbar** (`chevrons-ui.js`; chosen 2026-10-13 from a mock-up of
"icon + small label on every item" against "icons only", picked for looking clean): an M3E
floating toolbar (full-round `surfaceContainer` bar) of icon-only items. The open panel's
item is `primary` (deep red) with a filled icon and its name; the pointed-at item turns
tonal pink with the white ring and expands to show its name (220 ms, ease-out). Every item
grows around its own centre (neighbours slide outward), so the laser stays on it while it
expands. Three animations (0.53.1-0.53.3): how expanded the bar is (only while the laser is on
it) and which item has the expansion (handed over between items), so going from item to
item doesn't make the bar bulge, and which item is selected (a click fades the deep red
and the name over); time steps start fresh on a new change (at most 50 ms). Icons come
from the registration's new optional `icon` (YouTube: info,
account_circle, search, home, playlist_play, settings); an item without one always shows
its name. The canvas is taller (104 px, was 76), so the panels above sit ~2 cm higher.

**Done in 0.54.0, step 3.3 part 1: Settings and the tabs.** The kit's `drawTabs` (kit.js)
draws every tab row (Options, Info, Queue through `headerTabs`; Catalog, Profile through
`grid.tabs`): M3 tabs, the current one `onSurface` with a brand red indicator under its
content, the pointed-at one with an 8% `onSurface` tint and the white ring (`hoverRing`,
also in kit.js); a tab's optional `icon` sits above its label in a row at least 84 px tall
(Options: 92 px, equal widths), else beside it. The Options style (`options.js`) redrawn:
rows as M3 list items (name with its hint under it, the control at the right end), M3
switches (brand red), the M3E slider (300 px track at x 360), Default as a tonal pill with
`restart_alt` (150-216 px, as its label needs), steppers with round tonal arrows, buttons
(with an optional `icon` in the model) at the row's end, choices as tonal buttons (chosen:
`primary` with a check). A `dim` row is faded once (its disabled controls not again).
Settings' tab icons come from YouTube's settings.js. Still to come in 3.3: chips, cards,
paging, the text field (0.55); the thread, the Channel header, the loading indicator (0.56).
Tested in the headset 2026-10-13: works.

**Done in 0.55.0, step 3.3 part 2: chips, cards, paging, the text field.** kit.js gained
`button` (the M3 button every style now uses: tonal / filled brand red / outlined, icon and
label, white ring, pressed shape and state layer; Options' buttons go through it too).
Cards (`drawCard`): no tile at rest, `surfaceContainerHighest` tile and the white ring on
the pointed-at card, thumbnails `shape.medium`, the corner text on a dark full-round pill
(above the watched bar), the watched bar brand red, flags `shape.small`, text in
`onSurface` / `onSurfaceVariant`. grid.js: chips (`shape.small`; chosen: tonal with a
check; others outlined in `outlineVariant`), the field (full-round
`surfaceContainerHighest`, search icon, brand red outline and caret while focused, close
icon, filled brand Search button), round tonal page arrows (56 px), a 1 px
`outlineVariant` divider; `magnifier` is now the `search` symbol. Catalog: the M3
background, `titleLargeEmphasized` title, tabs kept inside the panel (a `maxX` past the
title), suggestions as an M3 menu (`surfaceContainerHigh`, tinted rows with the ring).
Queue: the M3 background, round arrows, tabs end before the page count. Profile: round
tonal search and back buttons (its header and background wait for part 3). YouTube's
Browse tabs got icons (browse.js `ICONS`). Tested in the headset 2026-10-13: works (Channel
and Description still partly old, as planned for part 3).

**Done in 0.56.0, step 3.3 part 3: Description, Channel, the thread, loading.** The Info,
Profile and thread styles moved to the M3 roles (`surfaceContainer` 90% background with
`shape.extraLarge`; links, timestamps, chapter times and "current" marks in `tertiary`, the
palette's light blue). kit.js gained `hoverArea` (an 8% / 12% state layer and the white
ring for plain clickable areas), `chip` / `chipWidth` (shared by grid.js and the thread's
bar) and a `danger` kind for `button`; `buttonFill` now gives M3 state layers (10% hover,
16% pressed), so every remaining hover lost the blue press tint. Profile: the action is a
kit button (primary → filled brand, secondary → tonal, danger → errorContainer, busy →
faded tonal), the name in `titleLargeEmphasized`, the featured card as a tile with the
ring, posts' 👍 👎 💬 and poll choices with the ring. Info: chapters on
`surfaceContainerHigh` tiles (current: tertiary tint and outline), transcript rows with
`hoverArea`, round tonal page arrows, tabs ending before the page count. Thread: creator
names on a tonal pill, `expand_more` / `expand_less` on the replies button, the footer slot
got `area(id, x, y, w, h, r)`; YouTube's comment footer uses it and Material Symbols
thumbs. Loading: `vrGlyphs.spinner` is now the M3E loading indicator (a brand-colour shape
morphing through seven soft shapes every 0.65 s while turning; `disc`: the contained
version), used by the panels and the pause overlay. The unused thumb / speaker / skip
glyphs were removed. 0.56.1: the card grids (grid.js `grid`, a `loadingAt` clock) show it
too while their first page loads (Channel, Browse, Search; their keys redraw every 33 ms
meanwhile). Tested in the headset 2026-10-13: 0.56.0 and 0.56.1 work.

**Done in 0.57.0, step 3.4: the keyboard** (`keyboard.js`; chosen 2026-10-13 from a mock-up
of "pink keys, deep-red specials" against "neutral letters, pink specials", picked as
calmer under the video, like Gboard): character keys and the space bar on
`surfaceContainerHighest` (`onSurface` text), Backspace / Shift / ?123 / ABC / Hide tonal
(`secondaryContainer`), Enter and an active Shift filled `brand`; `shape.large` keys,
`shape.small` and a 0.12 state layer while pressed, the white ring while pointed at.
Material Symbols `backspace`, `shift` (filled while on; a bar under it for caps lock),
`keyboard_hide`, `keyboard_return` before "Enter", `keyboard` before "Typing into …". The
body on `surfaceContainer` 90%; the grab bar a 240 × 30 pill with a 64 × 5 handle (`brand`
while moving), its clickable zone kept 500 px wide. Tested in the headset 2026-10-13: works,
letters easy to read, the ring easy to see.

**Done in 0.58.0, step 3.5: the popup** (`popup.css`, `panel.js`; decided 2026-10-13 from
its mock-up): the M3 roles as CSS variables `--m3-<role>`, filled in from the page world's
palette (new bridge pair `THEME_REQUEST` / `THEME_RESPONSE`: `main.js` applies the
provider's theme to tokens.js and sends `m3`; the popup takes only plain role names and
`#rrggbb` values), with neutral fallbacks and the site's accent (`ui/site.js`) as the brand
until it arrives. `surfaceContainer` panel with 28 px corners, the goggles in `brand` by
the title, the format picker as a full-round filled select with a "Format" label,
passthrough as an M3 switch (a real checkbox underneath), **Enter VR and Exit VR both filled
`brand`** (the maintainer's choice: the popup's most important button), errors on
`errorContainer`, the help folded into a **Controls** `<details>` (the maintainer's choice) and
Details' tools as outlined pills. **The popup closes once VR has started** (the maintainer's
request); an error keeps it open with the message; reopened during VR it offers Exit VR.
Tested 2026-10-13: works.

With tokens in place, switch the values and the shapes to M3, one area per release, each
checked in the headset:

1. Controls panel: the button row as an M3E **button group** (tonal icon buttons in a
   size that suits the laser, the play / pause button larger and filled, shape change on
   press); the seek bar as the M3E **slider** (thick track, bar handle, chapter gaps);
   menus (quality, speed, format, volume) as M3 menus; Subscribe as a filled button and
   Like / Dislike as a connected button group with counts.
2. Chevron row: an M3E **floating toolbar** (or a connected button group): one item per
   panel, the open one selected.
3. Styles: tabs (M3 primary tabs, icon + label), pills (M3 filter / assist chips), cards
   (M3 filled cards), switches and sliders (M3 switch, M3E slider), steppers (tonal icon
   buttons), the Default buttons (tonal, with an icon), the text field (M3 filled text
   field), the comment thread, the Profile header. Loading: the M3E **loading indicator**
   (morphing shapes) instead of today's spinner; buffering / long loads: M3E wavy progress.
4. Keyboard: M3E buttons as keys (tonal for letters, secondary for Shift / Backspace /
   Symbols / Hide, filled primary for Enter), with the shape change on press.
5. Popup: the same tokens as CSS variables.
6. Icons: **Material Symbols** (Apache 2.0), decided and started in 0.49.1:
   `src/core/page/vr-panel/symbols.js` holds 81 icons (Rounded style, outlined and filled)
   as path outlines copied from Google's SVGs, drawn with `ns.vrSymbols.draw(g, name, cx,
   cy, size, filled)`; license in `third_party/material-symbols/`. Chosen over the icon
   font: no font loading from the page world, no CSP or `web_accessible_resources`, any
   size and colour. To add one: copy the `d` of
   `symbols/web/<name>/materialsymbolsrounded/<name>_24px.svg` and `<name>_fill1_24px.svg`
   from github.com/google/material-design-icons. Not used by the panels yet (step 3
   replaces the hand-drawn glyphs in `glyphs.js`, `panel-ui.js`, `keyboard.js`,
   `controllers/icons.js`). YouTube's own marks (verified ✓, artist ♪) stay. Don't use
   Apple's SF Symbols or other Apple assets: the look is only *inspired by* visionOS.

### 4. Glass — done in 0.59.0, tint settled at 43% in 0.60.0

**Camera passthrough** (seeing your room through the glass) isn't available: confirmed in
0.49.1 on the Steam Frame with the Arcturus Vision module (`immersive-ar` not supported,
blend mode `opaque`; docs/hardware.md). Desktop Chrome doesn't enable WebXR's
`immersive-ar` for OpenXR headsets by default, and SteamVR offers apps no passthrough
through OpenXR. So the glass blurs the video, not the room. StreamXR is ready for it
(0.49.2: the popup's "See your room" checkbox, an `immersive-ar` session that clears to
transparent); once that works, the glass over the room can only be tinted, not blurred
(the camera image never reaches the page), so the glass needs a "no video behind" case:
tint + noise + rim only.

The cheap version (one change to the panel shader in `panel-pass.js`, no extra passes):

- **Blur from mipmaps.** The video's texture is already uploaded whenever the video has a
  new frame (`video-sphere.js`, `cinema-screen.js`). After each upload, rebuild its
  mipmaps (one `generateMipmap`; WebGL 2 allows non-power-of-two sizes). Sampling a small
  mip level gives a blurred copy; 4-8 taps around the point smooth the blockiness.
- **What's behind each panel pixel:**
  - 360° / 180° sphere: the direction from the eye through the pixel, turned into the
    video's map position (the same maths as the sphere's own shader, with its yaw).
  - Cinema screen: where the ray from the eye through the pixel hits the screen's plane
    (or its curve); outside the screen, the dark void colour.
  - The renderer gives the panel pass what it needs: the video texture, the format, the
    sphere's yaw or the screen's pose and size.
- **On top:** the tint (`glassTint`, the M3 surface colour at an opacity), a small baked
  noise texture for the frosted grain (`glassNoise`), and a rim light: a thin gradient
  along the edges, brighter on top (`glassRim`), for the visionOS sheen.
- **Limits:** other panels behind a panel aren't blurred (only the video is), which you
  rarely see. Content (text, cards) is drawn on the canvas over the glass as now.
- **Readability:** text over moving video is the real risk. visionOS darkens its glass and
  makes text adapt; we tune `glassTint` opacity for comfort first. Keep a "glass off"
  fallback (tint only, or solid) as a setting if it tires the eyes.
- **Cost:** one mipmap rebuild per new video frame, and a few texture taps per panel pixel.
  If it's too slow at headset resolution: fewer taps, or tint + noise + rim without the
  blur.

**Done in 0.59.0** (decided 2026-10-13: a 54% tint, between the 62% first chosen and a
lighter 45% compared in a mock-up; a switch and a live tint slider in a new **Appearance**
settings tab with the `palette` icon; **on by default**, the maintainer to settle the default
tint after looking in the headset). As planned above, with these specifics:

- **Tokens:** `ns.vrTokens.glass = { on, tint, DEFAULT_TINT: 0.54, version }` and
  `panelFill()` (the surface at the tint with the glass on, at 0.9 off), used by every
  panel's background (controls, toolbar, the five styles, the keyboard, the hover card).
  `version` is in every panel's redraw key. `appearance-options.js` remembers
  `{ on, tint }` (storage `glass`), the slider spanning 20-90%; the global reset restores
  the defaults.
- **Renderers:** `upload()` rebuilds the video texture's mipmaps while the glass is on
  (`gl-utils.js videoMipmaps`, WebGL 2 only); `backdrop()` gives the panel pass the
  texture and the mapping: `sphere` (span, yaw), `eac`, or `screen` (centre, axes, size,
  bend), building the mipmaps at once if the glass was just turned on.
- **Shader (`panel-pass.js`):** the panel's mask is the canvas alpha over the tint; the
  ray from the eye through each pixel goes into the sphere (equirectangular or cubemap) or
  the screen (a plane, or the far side of the bend's circle); five taps with a mipmap bias
  of 5 make the blur; outside the screen, a dark void colour; then the canvas over it, a
  hashed grain (±1.5%) and a rim (0.32 along the top edge, 0.08 elsewhere). The hover card
  has no backdrop (it sits in front of the controls panel); passthrough sessions get none
  (the room can't be blurred), so the tint alone shows there.
- **Checked:** the real renderers and shader in a WebGL 2 canvas (a video frame as the
  video, a fake eye): no GL errors for 360°, cubemap, flat and curved screens; the panel
  takes on the video's colour behind it.

**0.60.0:** tested in the headset (smooth); the maintainer set the default tint to **43%**
(`DEFAULT_TINT`). The popup got a **"Glass panels" switch** above Enter VR (the maintainer's
request: turn the glass off before VR on a weaker PC): it reads and writes the same
remembered `{ on, tint }` (`streamxr.glass` in the page's localStorage), and
`appearance-options.js load()` runs again at each VR start (`xr-session.js`), so a change
made in the popup applies from the next Enter VR. Tested 2026-10-13: works.

### 5. Motion — done: part 1 (press and hover) 0.61.0, part 2 (open / fold) 0.62.0

**Done in 0.61.0, part 1: press and hover** (the maintainer chose to judge it in the headset
rather than tune it in a browser demo). `motion.js`: one tracker per panel canvas
(controls panel, keyboard, each style) steps two springs per control at the start of each
draw: hover with M3E's fast effects spring (damping 1.0, stiffness 3800: about 0.1 s, no
bounce) and press with the fast spatial spring (damping 0.6, stiffness 800: a little bounce),
and attaches `ui.anim(id) -> { h, p }`; `ns.vrMotion.of(ui, id)` reads it (or 1 / 0 without
a tracker). The kit's button, chip, hoverArea, hoverRing (now with an amount), tabs and
cards, Options' switch, slider and choices, the controls panel's buttons and the keyboard's
keys draw from the amounts (corners lerped from rest to pressed, state layers and the ring
scaled). Each canvas reports `animating()`, and vr-panel.js adds the clock to its redraw key
meanwhile (every frame, only while easing). Time steps start from zero after a pause and are
capped at 50 ms. Measured at 90 Hz: the ring fades in in ~0.1 s; a 100 ms click squares the
corners almost fully and springs back within ~0.3 s. **Still to do (part 2, 0.62):** open /
fold of panels, menus and the keyboard swap. Tested 2026-10-13: works; 0.61.1 draws the
controls panel's rings after all its buttons (Dislike covered part of Like's ring); tested, works.

**Done in 0.62.0, part 2: open / fold.** motion.js gained an `open` spring (M3E default
spatial: damping 0.8, stiffness 380) and `value(spring, x)`: one eased value stepped by its
owner. vr-panel.js keeps `anim = { vis, kb, open: Map }`, stepped each frame in `update`
(`stepAnims`) towards `visible`, `kbShown` and the open panel; `drawPanel` draws every
surface with an alpha (new `alpha` argument to the panel pass, `uAlpha` in the shader)
and a scale of 0.92-1: the stack with `vis`, the controls panel and keyboard cross-fading
with `kb` (the stack's hinge follows the eased height, `restack` each frame it moves), each
panel above scaled about its bottom edge with its own `open`. Settled surfaces are drawn
first with depth writes; fading ones after, without. panel-ui.js eases its bottom row (the
transport buttons or a menu) whenever it changes (`stepRow`: faded in, risen 14 px; ~0.4 s),
and the rings it collects keep the row's fade and shift. Hit tests and input follow the
real state at once. Checked with the real vr-panel.js in WebGL 2 at 90 Hz: no GL errors;
the swap and hide / show mid-way show the cross-fade and fade. Tested 2026-10-13: works ("looks
beautiful"). **The redesign is complete.** Next: the minor UI quirks the maintainer noted along
the way (see "Tested" under "To test in the headset").

Today every state change is instant except the toolbar's expansion (0.53): a press squares
a button's or key's corners and adds its state layer at once, and the ring appears at once.
This step animates them all the same way, with the M3E springs (see "Motion" in step 1),
so it's done once for every component rather than one by one:

- **Press:** the corners morph from round to square and back, and the state layer fades
  (buttons, keys of the VR keyboard (asked for after 0.57.0), chips, tabs, cards, the
  toolbar).
- **Hover:** the white ring and tints fade in and out.
- **Open / fold:** panels, menus and the keyboard swap ease in and out.
- **Mechanism:** a shared per-control animation clock (as `chevrons-ui.js` does), with a
  style redrawing while any spring is still settling.

## How to check each step

- Step 1: canvas hashes identical to before (scratchpad copy of the old files, the same
  mock models), as in every earlier drawing refactor.
- Steps 2-4: renders of every panel with mock data for review, then the maintainer tests in the
  headset; record the new look in design-choices.md as it lands.

## Related plans

- **StreamXR / BrowseXR prep** ([Future-Plans.md](Future-Plans.md)): the rename, the site
  registry, the folder split and the media source were done in 0.49.0, so the token layer
  goes straight into `src/core/` (`vr-panel/`), and the glass shader into
  `src/core/page/vr-panel/panel-pass.js` with what it needs from the video coming from
  `src/streamxr/` (the renderers). The message-shaped provider boundary is still to do and
  independent of the redesign.
