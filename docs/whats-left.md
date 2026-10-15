# What's Left

One list of what's still open, gathered from the feature backlogs (`docs/features/`) and
`docs/known-issues.md`, which hold the details. Tick or remove items as they're done.
Last updated for 0.78.9.

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
2. Chrome Web Store release (one-click install, automatic updates, still free; needs the
   store's privacy questions answered: the README's "Your privacy" section covers them).
3. YouTube Premium features (below: the Diamond icon, Premium qualities, Add to queue ...).
4. Explore page tabs (the "Coming Soon" ones).
5. Commenting in-headset (writing comments and replies with the VR keyboard).
6. Twitch.tv support (the first site after YouTube: a new provider, `src/sites/twitch/`).
7. Groundwork for DRM-protected videos (YouTube Movies, HBO Max and Netflix first, then Disney+, Prime Video): providers and
   player ready for when browsers and the services allow protected video in WebXR (e.g. media
   layers); the README asks users to tell the services they want desktop XR support.
8. Whatever else comes up.

**As soon as it's possible** (README's second roadmap, ahead of everything above once the support exists):
YouTube Movies (copy-protected: once YouTube allows protected video in desktop XR; showing
them in Up Next with price / rating can come before),
Firefox (desktop WebXR), full Steam Frame controller support (Chrome recognizing the
controllers instead of "Oculus Touch"), streaming services (HBO Max and Netflix first) once they
allow protected video in desktop XR.

## Features to build (easiest first)

- [ ] **Movies in Up Next**: the price / rating in place of views and date, a yellow Movie tag
  (`features/video-page.md`).
- [ ] **Premium features**: the Premium quality levels, Add to queue and the rest, marked with the
  Diamond icon (purple without Premium, YouTube Red with it) (`features/video-page.md`).
- [ ] **Explore's "Coming Soon" tabs**: Live, Gaming, Music, Hype, Courses, Podcasts,
  Memberships (readers exist); Shorts, Movies & TV, Learning need more first
  (`features/home-page.md`).
- [ ] **News**: its own tabs (Top stories, Sports ...) and the Sports feed.
- [ ] **Subscriptions**: shelves and posts in the feed, the list of your channels, the bell per
  channel (`features/subscriptions-page.md`).
- [ ] **End screen**, **Info cards**, **Live chat** (read-only first) (`features/video-page.md`).
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
