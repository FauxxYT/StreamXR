# AGENTS.md: StreamXR

Guidance for AI coding agents working on StreamXR (and on forks of it). It's the project's
goals, rules and map; what has been learned lives in `docs/` (see the end).

**StreamXR** is a browser extension (Manifest V3) that plays streaming video in a VR headset
through **SteamVR + WebXR** from desktop Chrome, built and tested on the **Valve Steam
Frame**. Supported site: **YouTube**. It draws the site's own `<video>` element: 360° / VR180
around you, regular videos on a cinema screen. No libraries (one vendored exception:
Google's Material Color Utilities in `third_party/`), no build step: load the folder
unpacked. The version is in `manifest.json`.

**Read first:** [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is built (layers, folder
map, panel styles, provider interface, where changes go). [CHANGELOG.md](CHANGELOG.md) for
what changed when; [docs/decisions/](docs/decisions/) for why. [CONTRIBUTING.md](CONTRIBUTING.md)
for the code rules.

## Never
- Add a library, a package manager, a build step or ES modules (plain scripts only).
- Add a permission or a host to `manifest.json` without the maintainer agreeing to it first.
- Name a site (YouTube or any other) in `src/core/` or `src/streamxr/`: site code goes behind
  its provider in `src/sites/<site>/`.
- Write on-screen words in the code: they go in the string tables (see "Where things go").
- Edit generated files by hand: `src/core/page/controllers/models.js`, `src/core/ui/shared/`,
  `src/streamxr/ui/shared/`.
- Change a decision in `docs/design-choices.md` without asking.
- Commit to `main`: work on `develop`; `main` only takes merges from it by pull request.

## Before you finish (every change)
1. Quick checks: every edited JS file parses; canvas UIs render with mock data in a browser.
2. New or removed script files are listed (or removed) in `manifest.json`, in load order.
3. Edited `src/*/shared/`? Regenerate the `ui/shared/` copies (`node tools/sync-shared.js`).
4. New on-screen words: added to the English string table (other languages fall back to it).
5. Bump `version` in `manifest.json` and add a `CHANGELOG.md` entry.
6. Update the docs the change touches (ARCHITECTURE.md for structure, `docs/features/` and
   `docs/whats-left.md` for items done, `docs/youtube.md` for YouTube findings,
   `docs/Future-Plans.md` for the shell / site split).
7. Hand over for headset testing (you can't test in VR): say what changed and what to test,
   and remind the tester to reload the extension **and** the YouTube tab.

## Goals
- A comfortable, fully in-headset viewing experience: watch, browse, subscribe and like
  without taking the headset off. YouTube first.
- **A reusable shell:** the VR interface drives other streaming sites too. Site code stays
  in `src/sites/<site>/`, behind the site's provider; its panels are built from the five
  standard styles. Features flow shell ← provider ← site (ARCHITECTURE.md).
- **BrowseXR later (on hold):** a possible extension for using the whole browser in VR, with
  StreamXR plugged into it. StreamXR is kept ready for it (the core / streamxr split, the
  site registry, the media source). [docs/Future-Plans.md](docs/Future-Plans.md) lists what's
  done, what's left and what it would break: **keep it up to date** whenever a change
  touches those areas.
- Code kept **modular** so it can target both **Chromium and Firefox**. Desktop Firefox has
  no WebXR today, so Firefox support is future work; keep browser-specific code isolated
  (today: `src/sites/youtube/ui/skip-helper.js` and the `skip-helper/` extension).
- **Free and open source, forever.** Keep permissions minimal (today: only the youtube.com
  host permission, no `permissions` at all). Forking is fine (MIT). Contributions go
  through `CONTRIBUTING.md` and the issue forms in `.github/`; **pull requests are paused
  for now** (issues only). The README's "Adding a headset" section is the map for other
  hardware. Keep CONTRIBUTING.md, ARCHITECTURE.md, this file and the README in sync when the
  working rules or layout change.
- **Licensing:** the code is MIT (`LICENSE`). `src/core/page/controllers/models.js` is adapted
  from Valve's Steam Frame controller CAD and stays CC BY-NC-SA 4.0: no commercial use
  (selling, paid features, ads) without Valve's permission or replacement models. Keep the
  attribution header that `bake.py` writes into `models.js` (credit, source link, list of
  changes, license link, no warranty, not affiliated) and the README "License" section.
  Don't use Valve/Steam logos or imply endorsement. Icons come from Material Symbols
  (Apache 2.0, `third_party/material-symbols/LICENSE`).

## How to work
- **Changes are tested on real hardware** in a real VR session, by a person in a headset;
  an agent does the quick checks first: syntax, and small renders of canvas UIs with mock
  data in a browser. For
  refactors of drawing code, compare canvas hashes before and after from the same mock data
  (a copy of the old code next to the new); this caught every regression in the 0.32–0.34
  restructuring.
- **Bump the `manifest.json` version on every change** handed over for testing (so a reload
  in Chrome visibly picked up the new code), and add the change to `CHANGELOG.md`. After
  reloading the extension, **reload the YouTube tab too**: an open tab keeps the old code.
- After editing `src/core/shared/` or `src/streamxr/shared/`, run `node tools/sync-shared.js`.
  Without Node, regenerate the `ui/shared/` copies exactly as the script does: its header
  line, then the source.
- **Comment as you go.** Every file starts with what it's for, every function says what it
  does (and what it returns / which pixels or units it uses when that isn't obvious), and
  non-obvious steps get a line. Put explanations of GLSL shaders in a comment *above* the
  shader string, not inside it. Comments say what the code does *now*, not its history
  (that belongs in CHANGELOG.md or git). `manifest.json` can't hold comments;
  ARCHITECTURE.md explains it. Generated files (`src/core/page/controllers/models.js`,
  `src/core/ui/shared/`, `src/streamxr/ui/shared/`) are not edited by hand.
- Write **American English** in everything users see (on-screen words, docs).
- Don't rely on **refresh rate** (or any single number) for headset detection: it's a user
  setting.
- **On hold:** per-controller models (generic two-button, Vive). Steam Frame models only,
  until pull requests open: the README invites people to share licensed models of their
  controllers in a Headset / controller compatibility issue (per-controller model selection
  still has to be built).
- Feature backlogs live in `docs/features/` (`video-page.md`, `home-page.md`,
  `subscriptions-page.md`, `channel-page.md`), ordered from least to most work. Tick items
  off there when they ship in VR. Items set aside move to the page's "Deferred" section with
  the reason (they come back on demand). The overall list of what's open is
  [docs/whats-left.md](docs/whats-left.md).

## Where things go (details in ARCHITECTURE.md)
- The shell, in two parts: the core `src/core/` (the VR interface: panels, styles, lasers,
  controllers, keyboard, i18n, storage, the site registry `sites.js`) and StreamXR
  `src/streamxr/` (the video player: session, media source, renderers, formats, captions,
  popup, `main.js`). The shell never names a site. YouTube: `src/sites/youtube/` (page/ with
  the youtube-*.js files and provider/, which registers it in `sites.js`; ui/ with the VR
  buttons). Namespace `globalThis.__streamxr`, logs `[streamxr]`, events and CSS classes
  `streamxr-*`, storage `streamxr.*` (storage.js moves old `streamvr.*` / `ytvr.*` values over).
- No ES modules: each file is a plain script that adds to `globalThis.__streamxr`, and
  `manifest.json` holds the load order.
- YouTube's panels' ids are `desc`, `comments`, `channel` (left of the Safe Zone), `chat`
  (live streams only), `recs`, `browse` (Explore), `you` (right), `search` (the search bar over
  the zone, its results in the middle) and `settings` (the pill's popup); the open side panels
  are remembered as `streamxr.leftPanel` / `streamxr.rightPanel`. Their controllers are in
  `src/sites/youtube/page/provider/` (`description.js`, `comments-panel.js` (+ `comments.js`),
  `channel.js`, `search.js`, `browse.js` (Explore and You), `upnext.js`, `settings.js`, `live-chat.js`),
  registered in `panels.js`; the controls panel's Captions and Save buttons are `extras.js`.
- New YouTube behavior goes in the provider or a panel controller; a style or the shell
  never gets a YouTube field (add a generic option or slot instead).
- Tunables: `vr-panel/config.js`, `controllers/config.js`, `SETTINGS` in `cinema-screen.js`,
  `captions-overlay.js` and `pause-overlay.js`, `shared/controls.js` (input bindings).
- Words on screen: the string tables (`src/core/shared/strings-en.js` for the core,
  `src/streamxr/shared/strings-en.js` for StreamXR and its popup,
  `src/sites/youtube/page/provider/strings-en.js` for YouTube's panels), drawn with
  `ns.i18n.t(key)`; never a literal in the code. Other languages are `strings-<lang>.js`
  next to them (CONTRIBUTING.md, "Translating").

## What's been learned (read before working in these areas)
- [docs/youtube.md](docs/youtube.md): the YouTube modules, and YouTube's data, requests and
  identities, Subscribe / Like, formats and VR180 detection, ads and the Skip Helper, live
  streams, long playlists, comments / description / transcript, captions, audio tracks.
  Add new YouTube findings there.
- [docs/hardware.md](docs/hardware.md): the Steam Frame and its controllers in Chrome.
- [docs/design-choices.md](docs/design-choices.md): the decisions about placement, sizes,
  colors and behavior. Don't change these without asking; add new ones when they're made.
- [docs/known-issues.md](docs/known-issues.md): unverified features, quirks, things tried
  and dropped. Move items out when they're verified or fixed.
- [ARCHITECTURE.md](ARCHITECTURE.md) "Gotchas" and "Known limits".
- [docs/Materials-Redesign.md](docs/Materials-Redesign.md): the Material 3 Expressive + glass
  redesign and why it looks as it does; read it before touching the look of the panels.
- [docs/Spatial-Layout.md](docs/Spatial-Layout.md): the spatial layout (the Safe Zone, the side
  panels, the search bar, raised menus and dialogs; Android XR / Material 3 XR placement,
  orbiters and depth levels); read it before moving panels in space.
- [docs/whats-left.md](docs/whats-left.md): one list of what's still open (features, quirks,
  checks); keep it up to date as items are done.
- [docs/Future-Plans.md](docs/Future-Plans.md): BrowseXR prep (see "Goals"); keep it up to date.
- Controls: the README's "Controls" table.

## Gotchas
- Without Node or Python, check syntax and render canvases in a browser instead (and
  regenerate the shared copies by hand, as above).
- Shell `sed` replacements containing `\n` or `&` can mangle lines, and heredocs with quotes
  can fail; prefer an editor tool, or write the text to a file first.
