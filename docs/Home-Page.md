# StreamXR Home: the plan (for 1.0)

Users see it as the **StreamXR Dashboard** (renamed in 0.101.35); in the code and these docs
it's still "Home" (`src/streamxr/home/`, `home.html`, the `home.*` strings).

A page StreamXR owns (`chrome-extension://…/home.html`) and a popup on its toolbar button, so
StreamXR is usable before any site is open: check the headset, fix the setup, test VR, pick a
site. Agreed with the maintainer on 2026-10-28; decisions in `docs/design-choices.md`. It's
also the first step toward BrowseXR (`docs/Future-Plans.md`): the shell running on a page of
its own.

## What the tests showed (`docs/hardware.md`)

- **VR works on an extension page** (`tools/xr-check/`, 0.101.17): Chrome asks once ("StreamXR
  wants to use virtual reality devices and data").
- **A site tab opened from it can start VR by itself** (0.101.18, Skip Helper 1.4.0): the Skip
  Helper's real click on StreamXR's see-through target, 0.6 s. Without the helper, the user
  clicks Enter VR on the site as today.
- **The hard limit:** a page can only draw video playing in it, and leaving a page ends its VR
  session. So video sites keep their own VR session in their own tab; Home doesn't play them.

## What gets built

1. **The toolbar popup** (`manifest.json` `action`, no permission): headset status, **Open
   StreamXR Home**, the sites (YouTube opens it; a plain greyed "More sites coming"), and the
   full **Quick troubleshooting** as a folded section.
2. **StreamXR Home** (desktop):
   - **Status**: the headset, and Quick troubleshooting (Most likely issue, the checklist,
     Copy details), opened when something's wrong.
   - **Test VR**: enters VR on Home with the real StreamXR shell: the placeholder screen and
     a panel, so it proves the whole VR interface runs there (and starts the VR side of
     Home). Where Chrome's one-time VR prompt comes up on purpose ("choose Allow while visiting
     the site"). While a site's tab is in VR (Chrome allows one session at a time), it's greyed
     out with a note naming that tab and **Exit VR there** (0.101.72); a site's popup does the same while
     Test VR runs (0.101.73).
   - **Sites**: a card per site ("Open YouTube"), with **Start VR when it opens**: Skip Helper
     users only, said in a note; enabled when the Skip Helper is installed, greyed out with
     the note when it isn't.
   - **First run**: Home opens once when StreamXR is installed (a welcome: start SteamVR, Test
     VR, pick a site). A small background script (`runtime.onInstalled`), no permission.
3. **Shared, not copied**: Quick troubleshooting (Most likely issue, the checklist) in one
   shared file used by the YouTube popup, the toolbar popup and Home. Home loads StreamXR's
   existing plain scripts with `<script>` tags (no modules, no build step); both script
   "worlds" run in its one page, so the bridge's events work as they are.
4. **Sites on Home** come from a small entry each in `src/sites/<site>/` (name, address,
   icon), so nothing outside the site folders names a site. A site's icon is loaded from the
   site itself when shown (e.g. YouTube's `favicon.ico`), never copied into StreamXR's files
   (its logo isn't ours to redistribute); a plain mark on its color stands in if it can't load.
5. **"No headset" waits a moment**: a newly opened page doesn't see the headset for a few
   seconds (Chrome answers "none", then reports its devices changed), so Home and the popup
   say "Looking for a headset…" until Chrome reports in, or for 8 s (0.101.22).

**Starting VR by itself, safely:** Home opens the site tab itself and then sends that tab a
message (`chrome.tabs.sendMessage`, no permission); StreamXR acts only on messages from its own
extension. This replaces Test 2's address mark (`#streamxr-autovr`), which any web page could
link to: the mark is removed before the release.

**Without the Skip Helper** (the maintainer, 2026-10-28; Test 3 showed a key press works): the
site's tab, when opened from Home with VR meant, shows a full-page **"Press any key or click
anywhere to enter VR"** layer: any real key press (the keyboard's space bar, found by touch
with the headset on) or a click (e.g. through SteamVR's desktop view) starts VR right inside
it. "Or click": after the SteamVR dashboard or taking the headset off, Chrome can lose keyboard
focus, and only a click brings it back. Never shown on a normal visit. Home and the toolbar
popup say which you'll get ("starts by itself" with the Skip Helper, "press any key" without).
Chrome has no way to carry VR to the next page (no `sessiongranted`, no flag: checked in
Chrome 156); mapping a controller button to a key (Steam Input) works too, but isn't asked of
users.

**Hidden for now** (the maintainer, 2026-10-28, 0.101.36): all **cross-page VR**, i.e.
entering VR on a page opened from the Dashboard without clicking its VR button: the "Enter VR
when a site opens" switch and its note (sites just open), the toolbar popup's "Enter
Dashboard in VR", and the Sites panel in the Dashboard's VR. All built and working (0.101.29
to 0.101.35), but without the Skip Helper it needs a key press or click on the new page, too
clumsy for users. One switch brings it all back: `CROSS_PAGE_VR` in
`src/streamxr/home/home-ui.js` (the background script, `auto-enter.js` and the Skip Helper's
Enter VR click stay in place; nothing asks for them meanwhile). Bring it back once VR can
carry over to the next page without the Skip Helper (watch WebXR's `sessiongranted` in
Chrome; `docs/hardware.md`).

**Look:** Material 3 Expressive like the popup (its color roles, dark or light with the
system), following Android's desktop guides: a fixed-width layout, keyboard first, hover and
focus states, lines of about 60 characters, text that follows the browser's zoom and font size.

**Not in 1.0:** choosing sites inside VR, local files, settings in one place, other sources.
`tools/xr-check/` stays as a developer tool.

## Order of work (each step checked in the headset before the next)

1. [x] Quick troubleshooting in a shared file (nothing visible changes): 0.101.20, checked
   on YouTube (`src/streamxr/ui/troubleshoot.js`).
2. [x] The toolbar popup: 0.101.21 to 0.101.22, works (`src/streamxr/home/action-popup.*`);
   its Open StreamXR Home button came with step 3.
3. [x] Home on the desktop: status, troubleshooting, sites, the first-run welcome: 0.101.23,
   (`src/streamxr/home/home.*`, `home-ui.*` shared with the popup, `background.js`),
   works.
4. [x] Test VR on Home (the shell with the placeholder screen and a panel): 0.101.24 to 0.101.25, works
   (`home-provider.js`; Home loads the shell's page scripts). Home's
   VR settings (glass, Safe Zone, theme ...) are its own: an extension page keeps its own
   storage, apart from YouTube's. 0.101.25: Settings (the shell's tabs: 2D Cinema to Language)
   added after the first headset check; the shell's tab code is now in two places (YouTube's
   settings.js and home-provider.js): to share later, a shell Settings panel that a site adds its
   own tabs to.
5. [x] Start VR when a site opens, by message: by itself with the Skip Helper, the "press any key
   or click" layer without; the address mark removed: built in 0.101.29 (`background.js`,
   `src/streamxr/ui/auto-enter.js`, Home's switch) to 0.101.32 (logo refresh, Esc countdown), works.
5b. [x] **Added after step 5 (0.101.34, works; hidden in 0.101.36 with the rest of cross-page VR):** the Sites panel in Home's VR (right side), the toolbar
   popup's "Open StreamXR Dashboard" (renamed) and "Enter Dashboard in VR" (Home with ?vr=1:
   a key press or click enters VR), to check.
6. [x] Docs (0.101.37): design-choices, Future-Plans, ARCHITECTURE, README (Get started, privacy, the
   Skip Helper, the Dashboard), CHANGELOG; the temporary "WebXR check" link removed from the
   toolbar popup (0.101.37) and Test 2's address mark (0.101.29). Left for the release: the
   README's What's new and the version.
