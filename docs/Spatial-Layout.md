# Spatial layout (UX plan, in progress)

A plan to arrange StreamXR's VR interface in space the way Android XR and Material 3's XR
guidance describe: panels, orbiters (floating toolbars and rails around a panel) and
popups / dialogs raised towards you on fixed depth levels. Written 2026-10-14, after the
Material 3 Expressive redesign ([Materials-Redesign.md](Materials-Redesign.md)) finished
the look. This is about where things are and how you move between them, not how they look.
The user chose proposal C (with search in the middle; see "Decided"). Built so far: the
Safe Zone (0.63.0) and the side panels with their toolbars, the controls under the zone and
the Settings pill (0.64.0), the search bar and the middle results panel (0.66.0), the
raised menus and dialogs (0.67.0).

A mock-up (front and side views, to scale from `vr-panel/config.js`) compares today with
the three proposals below.

## Sources

Material 3 XR: [design overview](https://m3.material.io/foundations/xr/design/overview),
[interaction](https://m3.material.io/foundations/xr/design/interaction),
[layout](https://m3.material.io/foundations/xr/design/layout),
[accessibility](https://m3.material.io/foundations/xr/design/accessibility); components:
[overview](https://m3.material.io/foundations/xr/components/overview),
[app bars](https://m3.material.io/foundations/xr/components/app-bars),
[dialogs](https://m3.material.io/foundations/xr/components/dialogs),
[nav bar](https://m3.material.io/foundations/xr/components/nav-bar),
[nav rail](https://m3.material.io/foundations/xr/components/nav-rail),
[toolbars](https://m3.material.io/foundations/xr/components/toolbars).
Android XR: [get started](https://developer.android.com/design/ui/xr/guides/get-started),
[foundations](https://developer.android.com/design/ui/xr/guides/foundations),
[spatial UI](https://developer.android.com/design/ui/xr/guides/spatial-ui),
[scale, sizes and visual design](https://developer.android.com/design/ui/xr/guides/visual-design),
[XR app quality guidelines](https://developer.android.com/docs/quality-guidelines/android-xr).

Units: Android XR's dp are angular. 1 dp = 0.868 dmm (distance-independent millimetres),
so at a distance of d metres, 1 dp ≈ 0.868 × d mm (at 1 m ≈ 0.87 mm; at 1.6 m ≈ 1.39 mm).

## What the guides say (the parts that matter for StreamXR)

- **Placement.** A panel's centre 1.75 m away (0.75-5 m allowed), its vertical centre 5°
  below eye level ("people tend to look down"); primary content in the central 41° of the
  view. Default panel 1024 × 720 dp (about 1.56 × 1.09 m at 1.75 m, about 48° wide), 32 dp
  corners. Let people recenter and pull the UI closer; design for sitting, standing and
  lying back. Avoid head-locked UI (a lazy follow at most).
- **Orbiters:** floating UI that controls a panel, 20 dp outside its edge (or 12 dp
  overlapping it), raised 16 dp in front of it, never wider / taller than the panel. Use
  them sparingly: a few key navigation pieces.
  - **App bar orbiter:** one per app, "global", centred along the top of the app.
  - **Navigation rail orbiter:** app-level navigation, centred on the left (or right) edge,
    no taller than the panel, **never between two panels**; it can carry a prominent
    action button (the "spatialized FAB") just above or below it.
  - **Navigation bar orbiter:** the alternative, centred under the panel; the top is for
    the app bar.
  - **Toolbar orbiter:** actions for one panel, centred under it ("local context");
    more than five items can expand and collapse within the panel's width.
- **Depth levels** ("spatial elevation"): panel 0; orbiters 16 dp; popups (menus,
  dropdowns) 32 dp; dialogs 56 dp, the highest, with a dim layer (scrim) left on the
  panel. Dialogs fade and scale in while rising, with standard, long, non-bouncy easing.
  Don't raise large areas (sheets) or scrolling content.
- **Media apps:** playback controls in their own panel or orbiter, not over the video;
  offer a dimmed or virtual surround.
- **Targets:** 56 × 56 dp recommended (48 dp minimum), 48 dp visuals, 8 dp between
  targets, no overlapping targets. At 1 m: 56 dp ≈ 4.9 cm.
- **Text:** 14 dp or larger (≈ 1.2 cm at 1 m), normal weight or heavier, sentence case,
  short lines; let people scale text.
- **Motion:** standard easing and long durations for anything large; no continuous motion
  of the world; stable frame rate (90 Hz: under 11.1 ms a frame).
- **Feedback:** hover, focus and pressed states (or a raise in depth); spatial audio
  optional; controller haptics, with a way to turn them off.
- **Scrolling:** lists and carousels keep moving briefly after you let go (momentum).
- **Navigation:** a way back always available. **Input:** hands as the baseline, with
  controllers as an extra (Android XR); one hand is enough for everything.

## What YouTube on Android XR does (the maintainer's research, 2026-10-14)

From three recordings (two of them Google's "Simulated" demos) and the talk "Designing for
Wired XR Glasses: Key Considerations"; the full notes stay with the maintainer. In short:

- **Immersive playback (VR180, Google's demo):** the video fills the view, no frame. The
  UI is **three separate floating panels around it**, dark rounded cards angled towards
  you: **left: about this video** (title, channel + Subscribe, Like / Dislike / Save /
  more, a description card, a comments teaser); **bottom centre: slim controls** below eye
  level (back, title, exit-immersive; volume, −10 / play / +10, settings; time, the red
  progress bar); **right: recommendations** (a scrolling list, leaning to 180° / 360°
  videos while immersive). A YouTube logo orb floats top-left. Panels are
  **world-locked**, and **all of them fade out after a few seconds** of not being used.
- **Windowed playback:** the large-screen app in one floating window (system minimize /
  close pill above it), controls drawn over the video as on a TV; other apps' windows
  beside it.
- **Google's adaptive "video app" example** (a Material 3 mock modelled on YouTube, not
  YouTube): a **navigation rail floating to the left** (Home, Shorts, Subs, Library), a
  **search field in the top app bar**, the video and its details in the main panel,
  **recommendations in their own panel to the right** (filter chips on top), and on
  headsets **comments in their own column** with a reply field; on glasses, comments
  collapse to a teaser and everything draws in towards the centre.
- **The talk:** dark mode by default; no pure black surfaces (use the surface tokens);
  56 dp targets; clear hover / pressed states; **use depth for hierarchy** ("in XR there's
  no need for boundaries"); show extra UI when looked at (navigation appearing when you
  look up); world-anchor UI for a user who stays put, soft-follow for one who moves
  (glasses). Most of the glasses advice (additive displays, dimming, soft follow) doesn't
  apply to the Steam Frame (an opaque headset, used sitting or standing still).

What already matches: world-locked panels, auto-hide after a few seconds (6 s here), the
red progress bar, M3 surface tokens instead of black, controls below eye level, hover /
pressed states. What doesn't: YouTube keeps the video clear (panels at the sides, controls
low) where StreamXR stacks the panels in front of it, and splits "about this video" from
"what to watch next".

## Where StreamXR stands (0.62)

Measured from `config.js` (the mock-up prints these):

| | Today | Guide |
|---|---|---|
| Open panel (Browse) | centre −7°, 50° wide × 34° tall, 1.08 m away | centre −5°, ≈ 48° wide, 1.75 m |
| Toolbar | between the controls and the panel, −28° | navigation never between panels |
| Controls panel | centre −37°, 50° × 12° (44° until 0.97.0), 1.0 m | an orbiter under its panel |
| Whole stack | +10° to −43° tall | primary content in the central 41° |

Already as the guides ask: one panel at a time; panels fixed in the room with Recenter (no
head lock); move / resize; hover, pressed and selected states and the white ring; motion;
controls in their own panel (not over the video); a dark surround; frames within the
budget (smooth in the headset); text at or above 14 dp; **haptics on hover and click**
(`config.js haptics`, no off switch yet); a passthrough option for when browsers offer it.

Gaps:

1. **Height of the stack.** The open panel is about right; the controls panel sits 37°
   down (a long look down), so the whole thing spans about 53° vertically.
2. **Navigation between panels.** The toolbar sits between the controls and the open
   panel, where the guides say navigation is hard to find.
3. **No depth for popups and dialogs.** The controls panel's menus, the search
   suggestions and "Unsubscribe?" are flat in their panel (only the Previous / Next hover
   card is raised, 4 cm).
4. **Target sizes** at about 1 m (56 dp ≈ 4.9 cm): controls panel buttons ≈ 6.9 cm and
   toolbar items ≈ 5.6 cm pass; chips ≈ 3.4 cm, tabs ≈ 4.1 cm, Settings switches ≈ 3.4 cm
   tall and page arrows ≈ 4.4 cm are under it.
5. **Scrolling has no momentum** (a drag stops dead).
6. **No text size setting.** **No haptics off switch.**
7. **Motion:** opening a panel has a slight overshoot (`motion.js` `open` spring,
   damping 0.8); the guides want no bounce for large movements.
8. **Back** exists only inside some panels.
9. **Hands:** controller-only (Chrome on SteamVR may not expose hand tracking; future).

## The proposals

### A. Layered, in front of the video (the maintainer's idea, mapped onto the depth levels)

- **Level 0: the panel** (Browse, Description...), 1.6 m away, centre 5° below eye level,
  scaled up so it looks the same size as today (46° × 31°).
- **Level 1 (16 dp ≈ 2.2 cm in front): three orbiters**, 20 dp outside the panel's edges:
  - a **navigation rail** on the left edge, replacing the toolbar (icons with short
    labels; it can expand inward to show names, as the toolbar does now);
  - a **search app bar** along the top: the search field; typing opens the keyboard
    and its suggestions;
  - the **controls** along the bottom (centre about −27° instead of −37°).
- **Level 3 (32 dp ≈ 4.4 cm): popups**: the controls' menus (quality, speed, format,
  volume), the search suggestions, the Previous / Next card.
- **Level 5 (56 dp ≈ 7.8 cm): dialogs**: confirmations ("Unsubscribe?"), with a scrim on
  the panel.

The levels are a few centimetres apart, not tens: enough to read as layers without your
eyes refocusing, or the laser hitting the wrong layer at an angle.

### B. The video in the middle, panels beside it (Android XR's media pattern)

The cinema screen stays straight ahead; the open panel sits to its side in a curved row
(turned to face you, about 42° to the right), with the rail on its outer edge and the
search app bar on top; the controls go under the video. Nothing covers the video, but
browsing means turning your head about 40°, and a 360° video has no screen to sit beside.

### C. YouTube's immersive layout: info left, controls low, Up Next right

The arrangement of YouTube's own VR180 demo, with StreamXR's panels sorted into its zones:

- **Middle: the video, left clear.** The controls sit low in the middle (about 18° down,
  1.7 m), slimmer than today if possible (YouTube's has three rows: title and exit; the
  transport; the time and progress bar).
- **Left (about 38° out, turned to face you): "about this video"**: Description, Channel,
  comments, the things about what's playing; the **navigation rail** on its outer edge.
- **Right (about 33° out): "what to watch"**: Up Next, Browse, Search results, with the
  **search app bar** over it.
- **Settings** opens from the controls' gear as a popup (level 3), as YouTube's does.
- The same zones in a 360° / 180° video (they float in it, as in YouTube's demo).
- Auto-hide stays (all of it fades after a few seconds unused).

### Trade-offs

- **A** keeps everything in the comfortable middle and reuses today's habits (look down
  to the controls, panels above them), but the panels cover part of the video (as today;
  they hide themselves while it plays).
- **B** never covers the video and suits a cinema, but needs head turns for browsing,
  only fits the 2D screen, and changes the most.
- **C** is what YouTube does: the video stays clear, two panels can be open at once (what's
  playing and what's next), it works the same for 2D and 360° / 180°, and it follows a
  layout people will meet in YouTube's own XR app. Costs: a glance of about 35° to each
  side, the most rework (two panel zones, Settings as a popup, a slimmer controls panel),
  and each zone must fit its panels' sizes.
- Both: the search app bar makes Search a bar rather than a panel; the rail makes the
  current toolbar and the panels' own header tabs rethinkable (panel tabs stay: they're
  inside the panel).

## Steps (each released and checked in the headset)

1. **Comfort placement:** the stack 1.6 m away and scaled to match, the open panel's
   centre 5° below eye level, the controls just under it; the keyboard where the controls
   are. (Changes the maintainer's earlier placement choice: needs their OK.)
2. **Orbiters:** the navigation rail (left), the search app bar (top), the controls as the
   bottom orbiter, all raised 16 dp; the toolbar retired.
3. **Popups and dialogs raised:** menus and suggestions at 32 dp, confirmations at 56 dp
   with a scrim; fade and scale in while rising.
4. **Fixes** (built in 0.73.0, without the Back: see the end): target sizes (chips, tabs, switches, arrows to ≥ 56 dp), scroll momentum, a
   text size setting and a haptics switch (Settings → Appearance), no-bounce easing for
   whole panels, a Back on the rail.

## What it would touch

- `vr-panel.js` (placement, `restack`, hit testing across depth levels, the keyboard's
  place), `config.js` (distances, sizes), `chevrons-ui.js` (becomes the rail), the Catalog
  style (Search as a bar), `panel-ui.js` (menus drawn on their own raised canvas),
  `motion.js` (the open spring).
- The laser: hits on several layers at once must pick the nearest (already done for
  overlapping panels; check the few-centimetre gaps).
- [design-choices.md](design-choices.md): the placement (1.0 m ahead, 0.78 m down), the
  chevron row and "Search is its own panel" would change, by the maintainer's decision.

## Decided (the maintainer, 2026-10-14)

- **Proposal C**, with one change to search: the **search bar at the top** (middle); while
  you type, its **suggestions show in the middle**; the **results open in a middle panel**,
  which goes away when the search bar is cleared. So the right zone keeps Up Next / Browse,
  and Search is no longer a panel in it.
- **A toolbar per side panel, on the Safe Zone line** (upright M3E floating toolbars, just
  outside the zone's side edges, between the video and the panel; pointing at one grows its
  label outward, over its panel): left = Description, Channel, Comments (Comments becomes
  its own panel); right = Up Next, Browse. Each opens / switches / closes only its side.
  Each panel's inner edge lines up with its toolbar's middle (the toolbar straddles the edge,
  in front of it). The middle toolbar retires. (The guides put a rail on a panel's outer edge; the maintainer chose
  the zone line, so the buttons are the nearest thing to the video.)
- **Side panels narrower and taller than today's** (there's more room up and down than
  across): about 900 × 1100 px (0.70 × 0.86 m at today's text size, about 35° × 43°);
  Up Next's grid becomes 2 × 3 cards instead of 3 × 2.
- **The cinema screen keeps its own size and distance** (for now).
- **Settings: a compact tonal pill (icon + "Settings") centred on the controls panel's top
  edge** (an orbiter overlapping it 12 dp, raised 16 dp); its popup rises from it.
- **Up Next** stays Recommended, or the current playlist / mix's videos; **Browse** stays
  Browse (what they show doesn't change; only their shape, above).
- **First, the Safe Zone** (below), so the new places are measured against something the
  user can tune for their headset.

## The Safe Zone (built in 0.63.0)

The part of your view the layout is placed against, set as shares of what the headset
shows, so the same settings fit any headset (`vr-panel/safe-zone.js`; Settings → Safe zone,
`safe-zone-options.js`):

- **Width:** a share of the horizontal field of view (default 50%; 40-100%).
- **Height:** a share of the vertical field of view (default 45%; 40-100%).
- **Position:** its centre above or below eye level, a share of the vertical field of view
  (default −1%; −25% to +25%).
- The field of view is both eyes together, measured on the first frame from each eye's
  projection (canted displays included). The zone is fixed in the room from where you were
  and faced at the last recenter, like the panels. `ns.vrSafeZone.angles()` gives its edges
  in degrees (left / right / top / bottom from straight ahead). **The zone protects the
  video** (the maintainer, 2026-10-14): the left and right panels open *outside* its side edges,
  the search bar above its top, the controls below its bottom; only what you ask for comes
  inside it (search suggestions and results, the Settings popup).
- While its settings tab is open, an outline (and a small cross at its centre) shows it,
  1.7 m away, over everything.
- The defaults are the maintainer's, set in the headset once the panels were placed (0.65.0).

## The side panels (built in 0.64.0)

`vr-panel.js` ("the layout") places everything from the Safe Zone's edges
(`ns.vrSafeZone.angles()`), on a sphere `config.js` `layout.distance` (1.7 m) around where
your eyes were at the last recenter, each piece turned to face you:

- **Controls panel:** in the middle, its top edge 20 dp (about 1°) under the zone's bottom.
  The keyboard takes its place, hanging from the same top edge.
- **Settings pill** (`orbiters-ui.js` `createPill`): centred on the controls panel's top
  edge, overlapping it 12 dp, raised 16 dp; the Settings popup rises from it (8 dp above),
  raised 32 dp (the popup level). The registration's `zone: 'controls'`.
- **Side toolbars** (`orbiters-ui.js` `createToolbar`): upright M3E floating toolbars, their
  bars 10 dp outside the zone's side edges at the zone's middle height, raised 16 dp; a
  pointed-at icon grows its name outward over the panel. Everything around the bar is
  see-through to the laser (`solidAt`).
- **Side panels:** their inner edge under the middle of the toolbar's bar, centred on the
  zone's middle height, one open per side (`zone: 'left' | 'right'`; remembered).
- **Sizes:** every canvas at `layout.pxPerDegree` (26) px per degree, so text looks as big
  as before; side panels 900 × 1100 px (about 35° × 43°); the grids keep today's card size
  and fill the height (3 × 3).
- Changing the Safe Zone (or recentering) lays everything out again. What you moved by a grab
  bar (the controls panel, a side) keeps its move: a recenter turns and shifts it with the
  layout, so it stays where it was relative to you (0.84.0; it used to come back). The global
  reset puts it back.
- **0.65.0:** toolbars ordered top to bottom: Description, Comments, Channel (left);
  Search, Up Next, Browse (right); Browse's icon is Material Symbols' "browse". The
  toolbars are solid while their side has a panel open (glass when it has none, 0.65.2: the panel's edge
  doesn't show through), and fade out after half the
  auto-hide time while playing.

## The search bar (built in 0.66.0)

- A registration with `zone: 'top'` (YouTube's Search) gets a search bar
  (`orbiters-ui.js` `createSearchBar`: grid.js's field and its suggestions menu) in the
  middle, its field 20 dp above the Safe Zone's top edge, raised 16 dp (glass, turning solid
  while the results panel is open, as the side toolbars do: 0.66.3); the suggestions
  drop from it into the zone while you type.
- Its controller is asked every frame while the panels are up (the bar always shows) and
  returns, besides the panel's model, `bar` (the field) and `open`. While `open` (Search:
  once there's a search, until the bar is cleared), the panel (the results) shows in the
  zone's middle, its top edge 20 dp under the zone's top, shrunk if the zone is too short
  (or narrow) for it, leaving room for the Settings pill.
- A panel asking for keys (`host.typeInto(true)`) brings up the in-VR keyboard; giving them
  back puts it away, if it came up that way.

## Popups and dialogs raised (built in 0.67.0)

- **Menus** (`popups-ui.js` `createMenu`): the controls panel's Quality, Speed and Format
  choices and the Volume slider no longer replace its button row; they float 32 dp in front
  of it (the popup level) as an M3 menu card rising from the button that opened it (which
  shows selected meanwhile), growing in and fading (the "open" spring). They close on a
  choice, on the button again, or on a click on nothing.
- **Dialogs** (`popups-ui.js` `createDialog`, the shell's `confirm(d)`, given to panels as
  `host.confirm` and to the site's `onControl` as `shell.confirm`): an M3 dialog in the
  Safe Zone's middle, 56 dp in front of the panels (the dialog level), over a scrim (a dim
  sheet 48 dp in front) that darkens everything behind; it rises without bouncing (the
  "dialog" spring). It's modal: only it can be pointed at; a click anywhere off it cancels.
  First use: "Unsubscribe from <channel>?" (the controls panel and the Channel panel).

## The fixes (built in 0.73.0)

- **Targets** (`kit.js` `regionAt`, used by every panel style and the controls panel): a
  control drawn smaller than 56 dp (≈ 72 px at the layout's density) reaches out to that
  size around its middle, without changing its look (chips, tabs, switches, page arrows,
  the seek bar). Where reaches overlap, the nearest control wins; a point right on a
  control always picks it.
- **Momentum** (`vr-panel.js` `startFling` / `stepFling`): a trigger drag let go while
  moving keeps scrolling at its speed and slows down (about a second), stopping at either
  end, when the panel goes away, on any trigger press or on the stick.
- **Panel size** (Settings → Appearance, 80-130% in 5% steps, remembered): everything (text,
  buttons, panels, the toolbars, the keyboard) grows or shrinks together; the layout around
  the Safe Zone is done again. The user chose this over a text-only size (2026-10-14), which
  would have reflowed every style.
- **Vibration** (Settings → Appearance, on by default, remembered): the controllers' buzz on
  pointing and clicking. Greyed out, with a note, while no controller can vibrate, which is
  always the case on the Steam Frame: Chrome gives its controllers no vibration API (0.73.1).
- **No bounce for whole panels** (`motion.js` "panel" spring: the "open" spring's speed,
  damped): showing / hiding everything, a side panel opening, the toolbars and search bar,
  the keyboard swap. The floating menus keep the livelier "open" spring.
- **Back: not built** (the maintainer, 2026-10-14). There's no rail to put it on; panels open and
  close from the toolbars, and the Channel panel has its own Back. It can come back on
  demand.
