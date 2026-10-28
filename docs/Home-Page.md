# StreamXR Home: the plan (for 1.0)

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
     the site").
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
   icon), so nothing outside the site folders names a site.

**Starting VR by itself, safely:** Home opens the site tab itself and then sends that tab a
message (`chrome.tabs.sendMessage`, no permission); StreamXR acts only on messages from its own
extension. This replaces Test 2's address mark (`#streamxr-autovr`), which any web page could
link to: the mark is removed before the release.

**Look:** Material 3 Expressive like the popup (its color roles, dark or light with the
system), following Android's desktop guides: a fixed-width layout, keyboard first, hover and
focus states, lines of about 60 characters, text that follows the browser's zoom and font size.

**Not in 1.0:** choosing sites inside VR, local files, settings in one place, other sources.
`tools/xr-check/` stays as a developer tool.

## Order of work (each step checked in the headset before the next)

1. [ ] Quick troubleshooting in a shared file (nothing visible changes): built in 0.101.20
   (`src/streamxr/ui/troubleshoot.js`), to check in the headset.
2. [ ] The toolbar popup.
3. [ ] Home on the desktop: status, troubleshooting, sites, the first-run welcome.
4. [ ] Test VR on Home (the shell with the placeholder screen and a panel).
5. [ ] Start VR when a site opens (Skip Helper users), by message; the address mark removed.
6. [ ] Docs: design-choices, Future-Plans, ARCHITECTURE, README (Get started, privacy, the
   Skip Helper), CHANGELOG.
