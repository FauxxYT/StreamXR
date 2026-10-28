# What's Left

One list of what's still open, gathered from the feature backlogs (`docs/features/`) and
`docs/known-issues.md`, which hold the details. Tick or remove items as they're done.
Last updated for 0.101.41.

## Top priority: before the first release

The assessment after 0.77.1 (the maintainer agreed): StreamXR is ready for an early-access GitHub
release (a versioned preview / beta) once these are done; the Chrome Web Store waits
until another headset or two has been tried and the unverified items are cleared.

1. [x] **Start VR from any page** (0.78.0; checked signed in and out): the VR button (with its popup) in YouTube's top bar next to
   **+ Create**, so VR can start with no video playing (Home, a channel...) and you pick a
   video from inside VR. (Today a newcomer on the Home page has no way in.) Goes with the
   placeholder (5).
2. [x] **Skip ad, answered** (checked by the maintainer after 0.78.3: Skip ad works with the helper;
   without it VR says "Skip on desktop"; the helper stays an optional extra): is the second extension (the Skip Helper, `skip-helper/`) still
   needed? **Yes** (from `docs/youtube.md`, "Ads"): the popup covering the Skip button was a
   side problem (the helper makes anything covering it click-through); the real reason is
   that YouTube ignores any click a script makes (it checks `isTrusted`), and a real click
   needs the `debugger` permission, which can't be optional and shows Chrome's "Read and
   change all your data" warning, so it stays in its own optional extension. Left: the
   user's check that the helper still works since the StreamXR rename (helper 1.2.0:
   Skip ad in VR skips; without the helper VR says "Skip on desktop"), then the README says
   so plainly.
3. [x] **README for release** (done after 0.78.4: the support table, quick start, features, Skip ad, troubleshooting at the top; the developer sections below): rewrite `README.md` with enticing, inviting language about the
   features and benefits (the developer details can move lower or into the other docs),
   including that StreamXR reads YouTube's own page and data, so a YouTube update can break
   a feature for a while, and how to report it. Also, in the same inviting voice, the **Skip
   ad** story: why skipping from inside VR takes the small optional Skip Helper (YouTube only
   accepts a real click, which needs a permission Chrome shows a scary warning for, so it's
   kept out of the main extension), that everything else works without it ("Skip on desktop"),
   and that **YouTube Premium** members (no ads) don't need it at all.
4. [x] **Supported hardware, stated clearly** (in the README's "What you need" table): tested on the Valve Steam Frame with SteamVR and
   desktop Chrome only; other headsets may lack controller models or have their buttons
   mapped differently (say "others welcome", and point to the README's "Adding a headset").
5. [x] **A placeholder while no video plays** (0.78.0, checked): show the site's logo (YouTube's) where the
   video would be (goes with "Start VR from any page").
6. [x] **The player button's icon** (0.78.0; always lit since 0.78.1): replace the VR headset icon on the "Watch in VR" button
   in YouTube's player (and its popup) with Material Symbols' **Head Mounted Device**
   (`head_mounted_device`).

## The maintainer's other checks and questions (added after 0.77.1)

- [x] ~~**Release assessment**~~ done after 0.77.1: early access on GitHub once the items
  above are done (see "Top priority").

## The public roadmap (README, after release, in this order)

1. Immediate bug fixes (what the first users run into).
2. Done: Add to queue (0.100.0 to 0.101.7; free on desktop, not Premium; how the page's queue is driven:
   `features/video-page.md`).
3. Explore page tabs: Live, Gaming, Music, Hype, Courses, Podcasts and Memberships done (0.94.0 to
   0.96.6); Shorts and Movies & TV are next.
4. Done: Live chat (0.79.0 to 0.88.1), YouTube Premium (1080p Premium 0.91.0, Jump ahead 0.92.3).
5. Commenting in-headset (writing comments and replies with the VR keyboard).
6. Chrome Web Store release as **1.0** (the maintainer, 2026-10-17: once the YouTube features are
   all in; one-click install, automatic updates, still free; needs the store's privacy
   questions answered: the README's "Your privacy" section covers them).
7. Twitch.tv support (the first site after YouTube: a new provider, `src/sites/twitch/`; reuses
   the live chat panel).
8. Jellyfin and Plex support (new providers, `src/sites/jellyfin/`, `src/sites/plex/`: no DRM on
   your own media). Self-hosted servers live at any address, so each needs host access to the
   user's server: an optional permission asked when it's turned on (the maintainer agrees on
   any permission first: AGENTS.md).
9. Music streaming, Spotify first (its audio is DRM-protected, but sound plays as on the page;
   VR shows the player's controls, art and queue, no video to draw). Needs open.spotify.com's
   host permission (to agree on first).
10. Barebones mode, **experimental** (the maintainer, 2026-10-17: kept out of 1.0 and after the
    full providers, since how well it works depends on each site and first impressions
    matter): any `<video>` on any site on the cinema screen with basic controls (play, seek,
    volume, format), a generic provider for sites without one. Likely shape: `activeTab` +
    `scripting` (it runs only on a page where you click StreamXR's button; nothing added to
    the install warning), to agree on first. Unprotected video only (DRM: see 11), and videos
    served cross-origin without CORS can't be drawn in WebGL, so many sites will refuse.
11. Groundwork for DRM-protected videos (YouTube Movies, HBO Max and Netflix first, then Disney+, Prime Video): providers and
    player ready for when browsers and the services allow protected video in WebXR (e.g. media
    layers); the README asks users to tell the services they want desktop XR support.
12. Whatever else comes up.

**As soon as it's possible** (README's second roadmap, ahead of everything above once the support exists):
YouTube Movies (copy-protected, the free ones too: once YouTube allows protected video in desktop XR;
their Up Next cards (price / rating, the Movie tag) come with them: `features/video-page.md`, "Deferred"),
Firefox (desktop WebXR), full Steam Frame controller support (Chrome recognizing the
controllers instead of "Oculus Touch"), native Steam Frame support (StreamXR in the Frame's own
Chromium browser, no PC, once that browser supports WebXR), streaming services (HBO Max and
Netflix first) once they allow protected video in desktop XR.

## Road to 1.0 (easiest first)

The roadmap's items before the Chrome Web Store release and the smaller open items, in one
list (the maintainer, 2026-10-17): the working plan. The README's roadmap keeps its own order
(what users see). Details in the sections below and `features/`.

1. [x] **Cubemap seams** (0.93.4, works in the headset; reported by [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack) on Reddit and [@MinuteHistoryX](https://x.com/MinuteHistoryX) on X): the glass look's mipmaps (confirmed: gone with the glass off);
   the cubemap is now read at full resolution (see "Next" below).
2. [x] **Explore's "Coming Soon" tabs, the ready ones** (0.94.0 to 0.95.6, work in the headset): Live, Gaming, Music,
   Hype, Courses, Podcasts, Memberships, each with its sections as pills
   (`features/home-page.md`).
3. [x] **A playlist's page before playing it** (0.96.0 to 0.96.4, works in the headset;
   Recommended playlist cards untested): clicking a
   playlist card opens it in its panel (Explore, You, Search, Channel, Up Next): details, Play all,
   Shuffle, Save, and its videos (`features/home-page.md`).
4. [x] **Info cards** (0.97.0 to 0.97.4, work in the headset; with an Autoplay button): YouTube's cards as they come up during a video
   (`features/video-page.md`).
5. [x] **End screen** (0.98.0 to 0.98.2, works in the headset; with the autoplay countdown): the suggested videos and channel links when a video ends
   (`features/video-page.md`).
6. [x] **News tabs** (0.94.x, work in the headset): Top stories, Sports ... as pills on Explore's
   News tab. Also done along the way: Gaming's game shelves as pills (0.96.5 to 0.96.6).
7. [x] **Follow your head on a 2D video** (0.99.0 to 0.99.2, works in the headset, with Delay / Speed sliders and scrolling Settings tabs; requested by [u/boatOV](https://www.reddit.com/user/boatOV) on Reddit, 2026-10-19):
   a setting (on / off) that keeps the cinema screen, and the panels with it, in front of you
   as you turn your head, so it never needs recentering. Decided: a lazy follow (35° away for
   1 s, then easing round; not while using a panel), the panels coming along, a switch in
   Settings → 2D Cinema (off by default), 2D videos only.
8. [x] **Add to queue** (0.100.0 to 0.101.7, works in the headset; Clear and Save 0.101.1 to 0.101.7:
   **Clear the queue** and **Save the queue as a playlist**, as YouTube's own Queue box offers,
   the maintainer, 2026-10-19): probe how desktop YouTube's queue can be driven, then
   a way to add from cards, the queue in Up Next, and what plays when a video ends
   (`features/video-page.md`).
9. [ ] **Explore's other tabs** (large): Shorts and Movies & TV need new readers first (Learning deferred)
   (`features/home-page.md`).
10. [ ] **Commenting in VR** (large): writing comments and replies with the VR keyboard (posting,
    threads, typing into the Comments panel).
11. [x] **StreamXR Dashboard** ("Home" in the code; 0.101.20 to 0.101.37, works in the headset): a toolbar popup and a page of
    StreamXR's own (status, Quick troubleshooting, Test VR in the shell, the sites, a
    first-run welcome), so StreamXR shows from day one that more sites are coming
    ([Home-Page.md](Home-Page.md)). Cross-page VR (entering VR on a page opened from it) is
    built but hidden until it works without the Skip Helper.
12. [ ] **Chrome Web Store release, StreamXR 1.0** (last: it waits on the rest): the store
    listing, the privacy questions (the README's "Your privacy" covers them), review.

Set aside: the Back button (0.73.0; comes back on demand). Deferred: Movies in Up Next (YouTube's
movies are copy-protected, so they can't play in VR yet: `features/video-page.md`, "Deferred").

## Next: from u/TehSuperFruitSnack's Reddit feedback (after 0.88.1)

1. [x] **Cubemap seams** (0.93.4, works in the headset; also reported by [@MinuteHistoryX](https://x.com/MinuteHistoryX) on X; the cause: the glass look's mipmaps): thin lines along the cube's edges on 360° cubemap ("MESH")
   videos; regular (equirectangular) 360° videos don't have them. Likely cause: the glass look
   (on by default) builds mipmaps of the video (`gl-utils.js` `videoMipmaps`), and the
   sphere's cubemap lookup (`video-sphere.js` `eacUv`) jumps across the texture where two faces
   meet, so the GPU picks the smallest mipmap along those lines. Check first: the seams should
   go away with the glass off (Settings → Appearance). Fix: in cubemap mode, sample the video
   at full resolution (an explicit level of detail, or gradients from the smooth view direction).
   - Test: "SheiKra 8K 360° roller coaster"
     (cubemap, 8K); for comparison, with no seams:
     a regular 360° video.
2. [x] **3D side-by-side videos** (0.89.0, works in the headset; the glass per eye fixed in 0.90.1): some VR180 videos reach desktop with both eyes in
   one frame (LEFT | RIGHT), and StreamXR stretches the whole frame over the half sphere. Add a
   side-by-side format to the Format menu that gives each eye its half (`video-sphere.js`
   `uUvXform`, the per-eye hook); picked by hand, since YouTube's data doesn't mark these
   videos (auto-detecting by comparing the frame's halves could come later).
   - Test: "VR180 Left/Right" (side by side:
     LEFT in the left eye, RIGHT in the right). For comparison, one eye only, which stays flat:
     "Left Right Test in VR 180".
   - Not planned: 3D for videos that reach desktop as one eye, and more than 4K where desktop
     YouTube caps it (e.g. a 3D VR180 tour):
     desktop YouTube limits ([decisions/0002](decisions/0002-site-player-only.md)).
3. [x] **3D side by side on the cinema screen** (0.93.0, works in the headset): the same for
   regular (not VR180) 3D videos, each eye its half on the cinema screen.
   - Test: "Demo 3D[SBS] (HD : 1080P)" (half side
     by side: a 16:9 frame, each eye squeezed into half).

## Features to build (easiest first)

- [x] **Premium features** (audited 2026-10-17, `features/video-page.md`): **1080p Premium** in the
  Quality menu and **Jump ahead**, marked with the Diamond (purple without Premium, YouTube Red
  with it). 1080p Premium (0.91.0) and Jump ahead (0.92.3) work in the headset. **Add to queue** is its own item
  (not Premium on desktop).
- [x] **Explore's "Coming Soon" tabs**: Live, Gaming, Music, Hype, Courses, Podcasts,
  Memberships (0.94.0 to 0.96.6, work in the headset, released in v0.101.7); Shorts, Movies &
  TV, Learning need more first (Road to 1.0, item 9; `features/home-page.md`).
- [x] **News** (0.94.1, works in the headset): its own tabs as pills (Top stories, Sports,
  Entertainment, Business ...) on Explore's News tab (Road to 1.0, item 6).
- [x] **Subscriptions** (0.90.0 to 0.92.2, work in the headset): the Channels tab with its sort pills, the bell on the Channel
  panel; posts in the feed (desktop has none) and its shelves deferred (`features/subscriptions-page.md`).
- [x] **Live chat**: reading (0.79.1) and reactions (0.80.0) work in the headset; typing, the
  keyboard's emoji pages and Support on desktop built in 0.81.0, Top fans (XP, the list, rank
  pills) in 0.82.0 and chat replays in 0.87.0 (all work in the headset). Other viewers' floating
  reactions are deferred (`features/video-page.md`, "Deferred"). Left: the unverified items in `known-issues.md`, which the
  README's "How you can help" asks users to check (`features/video-page.md`).
- [x] **End screen** (0.98.0 to 0.98.2) and **Info cards** (0.97.0 to 0.97.4) done (`features/video-page.md`).
- [ ] **Back button**: set aside (0.73.0); now "A Back for VR" under "From Android's XR and
  desktop design guides" below (one item, not two).
- [ ] **One shared Settings panel** (cleanup): the shell's Settings tabs (2D Cinema to
  Language) are built twice, in YouTube's `settings.js` and the Dashboard's
  `home-provider.js`; a shell Settings panel that a site adds its own tabs to (YouTube's
  Playback, Audio) would keep them in one place.

## Diagnostics: more for Copy details (later)

Copy details covers "VR won't start" (0.101.8 to 0.101.14; `src/core/page/diagnostics.js`,
shown by `src/streamxr/ui/panel.js`). Left for later, most useful first:

- [ ] **Last VR session's stats**, for "it stutters" and "it kicks me out" reports: how long
  it ran, frames drawn, average and worst frame time, and how it ended (Exit pressed, or the
  session ended by SteamVR / the browser). Kept by `xr-session.js` (counted in its frame loop,
  noted on the session's `end` event), reported like `lastStart`. Quick troubleshooting could
  then name a likely issue (slow frames: turn Glass panels off; ended by SteamVR: check
  SteamVR).
- [ ] **Check the graphics card can draw for the headset** (`gl.makeXRCompatible()` on a
  throwaway canvas): would confirm a two-GPU mismatch directly instead of inferring it from
  `gpus`. Held back: it can briefly reset the page's graphics on some PCs. Only worth it if
  `gpus` proves not enough; run it only when asked (a button in Details), never on its own.
- [ ] **Screen size, language, signed-in state**: not needed for VR problems; add only if a
  report needs them.
- [ ] **A logger instead of wrapping the console** (optional cleanup): `diagnostics.js` wraps
  the page's `console.warn` / `console.error` to keep StreamXR's warnings, so DevTools links
  every warning (YouTube's too) to `diagnostics.js`. An `ns.log.warn()` that keeps the copy
  and then calls the real console would keep the links right; it means switching the 67
  `console.warn` / `console.error` calls in 21 files over to it.

## From the WebXR capabilities review (2026-10-28)

What desktop Chrome's WebXR allows, checked against StreamXR (the maintainer, 2026-10-28).
Already how StreamXR works, nothing to do: one VR session per site tab (moving between pages
uses the site's in-page navigation), Enter VR only from a real click, everything in VR drawn
on canvases, no copy-protected (DRM) video, no passthrough, eye tracking or WebXR Layers on
desktop Chrome. To do:

- [ ] **A sharpness setting** (render scale): `framebufferScaleFactor` above the headset's
  default sharpens the video and panels on fast PCs, at a cost in frame rate. A setting
  (e.g. Settings → Appearance), its value in Copy details next to `nativeScale`.
- [x] **Upload video frames only when a new one arrives** (`requestVideoFrameCallback`): already
  done: `media-source.js` uploads only on a new frame where the browser has it (audit, 2026-10-28).
- [ ] **A second site: Twitch** (needs the maintainer's OK for its host permission): an
  ordinary `<video>` with no DRM, chat on the page, mostly flat streams (the cinema screen),
  ads inside the stream (detect the ad overlay to show it in VR). The best test of the
  shell / provider split (`docs/Future-Plans.md`).
- [ ] **Jellyfin / Plex** (later; each needs a host permission for the user's own server):
  test first on a real server. WebXR needs HTTPS or localhost (a plain `http://192.168…`
  address blocks VR); Plex's video comes from the server's own address and needs CORS; Plex's
  free movies and live TV may be DRM.
- [x] **StreamXR Dashboard** (Road to 1.0, item 11; done, its cross-page VR hidden): the plan and its steps are
  in [Home-Page.md](Home-Page.md). Both checks passed (`tools/xr-check/`): VR works on an
  extension page (0.101.17), and a site tab opened from it can start VR by itself through the
  Skip Helper (0.101.18).
- [ ] **On hold, with BrowseXR** (`docs/Future-Plans.md`): Home holding the VR session for
  local video files (a folder granted once with `showDirectoryPicker()`, formats from
  file-name tags like `_180`, `_360`, `_sbs`). Not decided; new permissions.

Not for StreamXR: libraries (three.js, mp4box.js), a helper app, Electron / Tauri / CEF, a
native rewrite, a bundled Chromium (a build step or a second product), and recommending
unofficial browser builds to users.

## From Android's XR and desktop design guides (2026-10-28)

Read in full: the XR guides' sidebar (get started, foundations, spatial UI, environments,
anchors, 3D models, OpenXR / Unity / WebXR and its "Considerations", visual design, Glimmer,
motion) and the desktop guides (get started, across form factors, pointer, cursors,
keyboard, system bars, multitasking). Most XR pages are for native Android XR apps (Home
Space, environments, anchors, 3D models, Glimmer for glasses) and don't apply to a WebXR
page. What does:

- [x] **Either hand** ("Considerations": usable with either hand, essential actions with one):
  the left controller works with everything (the maintainer, 2026-10-28). The few one-hand
  buttons (A / B on the right, the panel button on the left, the stick reset) are in
  `shared/controls.js` and the README's Controls.
- [ ] **A Back for VR** ("Considerations": WebXR apps don't get the system's back, so build
  one): bring the set-aside Back button back (0.73.0) as one consistent way back, e.g. a
  controller button that steps back (a page's back button, then closing a menu or dialog),
  before 1.0.
- [ ] **Recenter without a jump** (Motion: whole-world movement should fade, not jump):
  check how recentering looks; if everything leaps, a short fade out and in around it.
- [ ] **Small targets easier to hit** (anchors: a target catcher behind small targets; about
  7° targets): give small buttons (close, chevrons, the queue's quick button) a hit area a
  little bigger than they look, so the laser doesn't slip off them.

Already in line, nothing to do: 72 fps (the headset's rate; the session stats under
"Diagnostics" would show it), seated use without locomotion, panels sized in dp at a set distance,
Follow your head off by default (motion the user controls), captions. Not for StreamXR:
hand-tracking sizes (controllers only), button remapping (later, if asked), SDF fonts (the
panels draw text into canvases at full size). For the Home page and popup (desktop guides):
content and buttons at a max width, short lines (about 60 characters), text sizes that
follow the browser's zoom and font size, hover and focus states, keyboard first.

## Known quirks (`known-issues.md`)

- Captions on 180°/360° need improvement (0.77.1: "good enough for now").
- Glass popups blur only the video, not the panels behind them.
- One level of comment replies (not YouTube's nested replies-to-replies).
- Some readers expect YouTube in English.
- Limits on YouTube's or Chrome's side: no controller vibration, a channel's Featured tab
  can be missing, a channel's subscribed state can be wrong.

## Still to check in the headset

- Signed-in Home feeds other than the main one (History, Playlists, Watch later, Liked).
  The main feed's chips work (2026-10-28); they re-shuffled once a chip's videos loaded,
  fixed in 0.101.39.
- ~~The Captions button greyed out on a video with no captions~~: works (2026-10-28).
- ~~The SteamVR dashboard while in VR~~: the video plays on and the panels fade as usual; the
  controllers and lasers stayed frozen in the air (no controller updates while the session is
  `visible-blurred`): hidden while it's open since 0.101.41, works. (2026-10-28)
- ~~Switching tabs or minimizing Chrome while in VR~~: nothing happens, VR goes on as it was
  (2026-10-28).
- ~~WebXR hand input on the Frame~~: nothing happens with the controllers down and the hands
  up (2026-10-28): a known limit, in `docs/hardware.md`.
- ~~Chrome's VR prompt~~ done: Chrome asks before VR starts ("… wants to use virtual reality
  devices and data": Allow
  while visiting the site / Allow this time / Never allow; seen on the extension page,
  2026-10-28); the README's Get started now says to choose "Allow while visiting the site"
  (0.101.37). Its exact wording on YouTube on a fresh profile is unseen but the same choices.
