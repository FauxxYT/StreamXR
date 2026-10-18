# What's Left

One list of what's still open, gathered from the feature backlogs (`docs/features/`) and
`docs/known-issues.md`, which hold the details. Tick or remove items as they're done.
Last updated for 0.93.4.

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
2. Add to queue (free on desktop, not Premium; how the page's queue can be driven is to probe
   first: `features/video-page.md`).
3. Explore page tabs (the "Coming Soon" ones).
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

1. [x] **Cubemap seams** (0.93.4, works in the headset): the glass look's mipmaps (confirmed: gone with the glass off);
   the cubemap is now read at full resolution (see "Next" below).
2. [ ] **Explore's "Coming Soon" tabs, the ready ones** (small to medium): Live, Gaming, Music,
   Hype, Courses, Podcasts, Memberships; their readers exist, they need wiring into the tabs
   (`features/home-page.md`).
3. [ ] **Info cards** (medium): YouTube's cards as they come up during a video
   (`features/video-page.md`).
4. [ ] **End screen** (medium): the suggested videos and channel links when a video ends
   (`features/video-page.md`).
5. [ ] **News tabs** (medium): Top stories, Sports ... and the Sports feed.
6. [ ] **Add to queue** (medium to large): probe how desktop YouTube's queue can be driven, then
   a way to add from cards, the queue in Up Next, and what plays when a video ends
   (`features/video-page.md`).
7. [ ] **Explore's other tabs** (large): Shorts, Movies & TV, Learning need new readers first
   (`features/home-page.md`).
8. [ ] **Commenting in VR** (large): writing comments and replies with the VR keyboard (posting,
   threads, typing into the Comments panel).
9. [ ] **Chrome Web Store release, StreamXR 1.0** (last: it waits on the rest): the store
    listing, the privacy questions (the README's "Your privacy" covers them), review.

Set aside: the Back button (0.73.0; comes back on demand). Deferred: Movies in Up Next (YouTube's
movies are copy-protected, so they can't play in VR yet: `features/video-page.md`, "Deferred").

## Next: from u/TehSuperFruitSnack's Reddit feedback (after 0.88.1)

1. [x] **Cubemap seams** (0.93.4, works in the headset; the cause: the glass look's mipmaps): thin lines along the cube's edges on 360° cubemap ("MESH")
   videos; regular (equirectangular) 360° videos don't have them. Likely cause: the glass look
   (on by default) builds mipmaps of the video (`gl-utils.js` `videoMipmaps`), and the
   sphere's cubemap lookup (`video-sphere.js` `eacUv`) jumps across the texture where two faces
   meet, so the GPU picks the smallest mipmap along those lines. Check first: the seams should
   go away with the glass off (Settings → Appearance). Fix: in cubemap mode, sample the video
   at full resolution (an explicit level of detail, or gradients from the smooth view direction).
   - Test: [SheiKra 8K 360° roller coaster](https://www.youtube.com/watch?v=tR8ZtyhSDYw)
     (cubemap, 8K); for comparison, with no seams:
     [a regular 360° video](https://www.youtube.com/watch?v=Q7UwGaom0XA).
2. [x] **3D side-by-side videos** (0.89.0, works in the headset; the glass per eye fixed in 0.90.1): some VR180 videos reach desktop with both eyes in
   one frame (LEFT | RIGHT), and StreamXR stretches the whole frame over the half sphere. Add a
   side-by-side format to the Format menu that gives each eye its half (`video-sphere.js`
   `uUvXform`, the per-eye hook); picked by hand, since YouTube's data doesn't mark these
   videos (auto-detecting by comparing the frame's halves could come later).
   - Test: [VR180 Left/Right](https://www.youtube.com/watch?v=ccU0imlNp5Q) (side by side:
     LEFT in the left eye, RIGHT in the right). For comparison, one eye only, which stays flat:
     [Left Right Test in VR 180](https://youtu.be/kle719aQvsc?t=8).
   - Not planned: 3D for videos that reach desktop as one eye, and more than 4K where desktop
     YouTube caps it (e.g. [this VR180 tour](https://www.youtube.com/watch?v=KJ-_LUrGhYE)):
     desktop YouTube limits ([decisions/0002](decisions/0002-site-player-only.md)).
3. [x] **3D side by side on the cinema screen** (0.93.0, works in the headset): the same for
   regular (not VR180) 3D videos, each eye its half on the cinema screen.
   - Test: [Demo 3D[SBS] (HD : 1080P)](https://www.youtube.com/watch?v=u0hmMt5znX0) (half side
     by side: a 16:9 frame, each eye squeezed into half).

## Features to build (easiest first)

- [x] **Premium features** (audited 2026-10-17, `features/video-page.md`): **1080p Premium** in the
  Quality menu and **Jump ahead**, marked with the Diamond (purple without Premium, YouTube Red
  with it). 1080p Premium (0.91.0) and Jump ahead (0.92.3) work in the headset. **Add to queue** is its own item
  (not Premium on desktop).
- [ ] **Explore's "Coming Soon" tabs**: Live, Gaming, Music, Hype, Courses, Podcasts,
  Memberships (readers exist); Shorts, Movies & TV, Learning need more first
  (`features/home-page.md`).
- [ ] **News**: its own tabs (Top stories, Sports ...) and the Sports feed.
- [x] **Subscriptions** (0.90.0 to 0.92.2, work in the headset): the Channels tab with its sort pills, the bell on the Channel
  panel; posts in the feed (desktop has none) and its shelves deferred (`features/subscriptions-page.md`).
- [ ] **Live chat**: reading (0.79.1) and reactions (0.80.0) work in the headset; typing, the
  keyboard's emoji pages and Support on desktop built in 0.81.0, Top fans (XP, the list, rank
  pills) in 0.82.0 and chat replays in 0.87.0 (all work in the headset). Other viewers' floating
  reactions are deferred (`features/video-page.md`, "Deferred"). Left: the unverified items in `known-issues.md`, which the
  README's "How you can help" asks users to check (`features/video-page.md`).
- [ ] **End screen**, **Info cards** (`features/video-page.md`).
- [ ] **Back button**: set aside (0.73.0); comes back on demand.

## Known quirks (`known-issues.md`)

- Captions on 180°/360° need improvement (0.77.1: "good enough for now").
- Glass popups blur only the video, not the panels behind them.
- One level of comment replies (not YouTube's nested replies-to-replies).
- Some readers expect YouTube in English.
- Limits on YouTube's or Chrome's side: no controller vibration, a channel's Featured tab
  can be missing, a channel's subscribed state can be wrong.

## Still to check in the headset

- Signed-in Home feeds other than the main one.
- The Captions button greyed out on a video with no captions.
