# Future plans: StreamXR inside a BrowseXR

**BrowseXR** is a possible future browser extension for using the whole browser in VR, with
**StreamXR** (this project) as a component plugged into it for video. It's on hold: the
hard parts are in "Before building BrowseXR" below. Meanwhile StreamXR is being shaped so
that it could fit in later without a rewrite. Keep this page up to date as StreamXR
changes: tick off what's done, and add anything new that BrowseXR would need or break.

## Done

- **0.49.0: rename to StreamXR** (from StreamVR): namespace `__streamxr`, logs `[streamxr]`,
  events and CSS classes `streamxr-*`, storage `streamxr.*` (old `streamvr.*` / `ytvr.*`
  values move over when first read; the language choice too), the Skip Helper's messages.
- **0.49.0: folder split**: `src/core/` (the VR interface, BrowseXR's future core),
  `src/streamxr/` (the video player on it), `src/sites/` (site code). See ARCHITECTURE.md.
- **0.49.0: site registry** (`src/core/page/sites.js`): sites register their provider;
  StreamXR's generic `main.js` picks the page's site. Nothing outside `src/sites/` names a
  site.
- **0.49.0: media source** (`src/streamxr/page/media-source.js`): the session gets its
  frames from a source (today the site's `<video>`) instead of the provider's element
  directly. A captured tab's stream can play in a `<video>` too, so the renderers would
  work with it unchanged. Since 0.78.0 a source can have no video yet (VR starts without one;
  the screen shows the site's logo, `provider.logo()`), which a BrowseXR session would need too.

## Still to do for BrowseXR (not started)

### 1. A message-shaped provider boundary (the big one)

BrowseXR would host the VR session in its own page and show tabs from there, so the shell
(core + StreamXR) and a site's code would run in **different pages**. Today they share one
page and call each other directly. Everything that crosses between them would have to
become plain messages (JSON), sent and answered.

**Already fine:** panel models (what a controller gives a style to draw) and events (what
a style reports back) are plain data.

**What has to change, and what it would break while being converted** (nothing visible
if done right; the risk is regressions in these places):

- **`actions` become named commands**, e.g. `run('seekBy', 10)` instead of
  `actions.seekBy(10)`. Every caller changes: `vr-panel.js` (controls panel buttons, seek
  bar, menus, volume), `xr-session.js` (controller buttons, ads, format), the panel
  controllers.
- **`state()` must be pure JSON.** It's polled every frame; across pages it would arrive a
  frame late (fine for display).
- **Calls that return live objects or answers later** become a request and a reply:
  - pagers (`channelList`, `browseHome`, `browseSubscriptions`, `browseFeed`, `browsePlaylist`, `search`,
    `comments`, `replies`, `postComments`: objects with `items` and `next()`). The
    controllers that use them run with the site, so they'd stay on the site's side;
    only their models cross.
  - promises: `setSubscribed`, `rateComment`, `ratePost`, `votePoll`, `channelHeader`,
    `channelAbout`, `channelFeatured`, `suggest`.
  - `storyboard(seconds)` returns the preview frame at once (would become a reply, or the
    storyboard sheet's details sent once).
- **Controllers ask the style directly** how far it scrolls: `host.style.maxScroll()` and
  `host.style.shownScroll()` in `description.js` (loading more comments as you scroll,
  remembering each tab's position) and `channel.js` (loading more posts, the About page's
  scroll). These would have to arrive as data with each frame (`frame.scroll`). Risk:
  endless comments / posts stop loading, or scroll positions are lost between tabs.
- **Site code drawing on the shell's canvas:** the `threadFooter` slot (`comments.footer`
  in `provider/comments.js`) draws a comment's 👍 count, 👎 and ❤ straight onto the
  style's canvas. It would become data the style draws (a list of footer buttons, as post
  buttons already are). Risk: the comment footer's look or its like / dislike clicks.
- **Other functions in the registry:** `label` (functions for translation; could become
  keys), `create(host)` (stays on the site's side), `site.onControl(id, panel)` (becomes a
  message).

Watching 2D / 180° / 360° wouldn't change: the video still plays from the site's own
`<video>` in its own tab when StreamXR runs there.

### 2. Split the session loop

`src/streamxr/page/xr-session.js` mixes what any VR page needs (WebXR setup, the frame loop,
controllers and input, the VR panel, the global reset, recentering) with what video needs
(the media source, the video view, formats, ads, the pause overlay). For BrowseXR the
first part moves to the core (a "scene" the video is one layer of).

### 3. The controls panel belongs to StreamXR

The controls panel (`src/core/page/vr-panel/panel-ui.js`: play, seek bar, quality, speed,
volume, format) is a video player's panel, but it lives in the core because `vr-panel.js`
drives it (laser hits, scrubbing, menus). In BrowseXR it would become a panel StreamXR
adds, and `vr-panel.js` would host any number of panels.

### 4. The isolated world

The registry is page-world only. The isolated world still has one set of files per site
in the manifest (`site.js`, the page button, `main.js`). BrowseXR would need its own
launcher instead of the "Watch in VR" popup (`src/streamxr/ui/panel.js`).

### 5. Other media sources

A source for a captured tab (`chrome.tabCapture` stream in a `<video>`), next to the
site-`<video>` one.

## Before building BrowseXR: four experiments

Each is a small throwaway prototype with a yes / no answer (October 2026 analysis):

1. Can a WebXR session run from an extension page (`chrome-extension://`)?
2. How sharp and smooth is a background tab through `chrome.tabCapture` (resolution,
   frame rate, delay)?
3. Do clicks and typing sent through `chrome.debugger` (`Input.dispatchMouseEvent` /
   `dispatchKeyEvent`) feel usable? (It shows a "being debugged" bar.)
4. Can you switch from browsing to a site's own immersive session (StreamXR's native
   video) and back without taking the headset off, or does it need a click on the desktop?

Known costs whatever the answers: permissions (`tabCapture`, `debugger`, likely all sites:
a big install warning, against the "youtube.com only" rule today), DRM video shows black
when captured, captured text is only as sharp as the tab's window. SteamVR's own desktop
view already shows Chrome in the headset; BrowseXR's case is a VR-native interface and
StreamXR's native video quality.
