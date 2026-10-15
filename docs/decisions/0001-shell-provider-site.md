# 0001: A reusable shell, a provider per site, and the StreamVR name

- **Status:** accepted, done (v0.31.0 – v0.34.0, October 2026)
- **Replaces:** the working plan `Separation.md` (removed; its lasting content is in
  [ARCHITECTURE.md](../../ARCHITECTURE.md))
- **Later:** renamed to StreamXR in 0.49.0, and `src/shell/` split into `src/core/` and
  `src/streamxr/` (see [Future-Plans.md](../Future-Plans.md)); the names and paths below
  are as they were when this was decided.

## Context

The extension began as "YouTube VR for SteamVR" (YTVR): a YouTube-only extension. By
v0.31.0 its VR interface (controls panel, chevrons, five chevron panels, controller wiring,
cinema screen and spheres) worked well and the maintainer wanted to reuse it for other
streaming services later. But YouTube was woven through it: the session code held ~60 calls
into YouTube modules, the panels' drawing code read YouTube's fields (views, verified
badges, 2D/180/360), the controls panel was laid out as YouTube's watch page, and format
detection, storage keys, event names and colours were YouTube's.

## Decision

1. **Three layers.** A site-agnostic **shell**, a **provider** per site (the middle layer
   that turns site data into the shell's generic shapes and site actions into calls), and
   the **site files** (the only code that touches the site). Features flow shell ←
   provider ← site; the shell never gets a site-specific field.
2. **Five standard panel styles** (names chosen by the maintainer): **Info**, **Catalog**,
   **Queue**, **Profile**, **Options**. Each draws a plain model and reports standard
   events (`<type>:<value>`); a site registers its panels (style, size, controller) and the
   host builds everything from that list.
3. **Extend styles through declared slots, not inheritance.** A site version of a style
   passes slot overrides; the style keeps layout, hit testing, scrolling and redraws. One
   level only, and data before overrides (most site differences are model fields).
4. **The provider interface** covers the player, format detection, theme, ads (optional),
   live streams (optional), "now playing" for the controls panel, and the site's panels.
5. **Packaging without a build step.** One manifest with a pair of `content_scripts`
   entries (page world + isolated world) per site, matched to its host, instead of one
   extension per site assembled by a script. Chrome keeps sites apart by page, so the
   shell's files can be listed again per site; the folder still loads unpacked.
6. **Rename to StreamVR** (maintainer's choice): namespace `__streamvr`, `streamvr-*`
   events and classes, `streamvr.*` storage with old `ytvr.*` values moved over on first
   read, so nobody loses their settings.
7. **Theme from the provider** (accent, dark): YouTube's brand red and Almost Black became
   YouTube's theme instead of being written into the shell.

## Alternatives considered

- **Class inheritance for site versions of styles** (`class YouTubeProfile extends
  Profile`). Rejected: a subclass can override anything, including the hit testing,
  scrolling and redraw logic other features rely on, and two sites could drift apart
  silently. Slots keep every customisation named and visible.
- **One extension per site built by a script.** Rejected for now: it adds a build step to a
  project whose rule is "load the folder unpacked", for a second site that doesn't exist
  yet. Still possible later if a site has to ship as its own extension.
- **Keeping `ytvr` and a per-site prefix in config.** Rejected: each site runs on its own
  page with its own storage, so one name for all sites is enough.

## Consequences

- The work was done in three steps, each released on its own version and tested in the
  headset: 0.32.0 (panel styles), 0.33.0 (the provider), 0.34.0 (packaging and the
  rename). Each step was checked by rendering every panel from the same mock data before
  and after and comparing the canvases pixel for pixel (11, then 15 scenarios, all
  identical), plus simulated laser clicks (35, then 44) reaching the right actions.
- Adding a site is a folder plus a manifest entry pair (see ARCHITECTURE.md, "Adding a
  site"); the shell shouldn't need changes.
- **Known blocker:** most paid services use DRM (Widevine), whose frames Chrome won't let a
  page draw into WebGL, and every video here is drawn through WebGL. Check this first for
  any new site.
- Not done yet, by choice: the controls panel's quality / speed / volume buttons are not
  optional; only one slot exists so far (Info's `threadFooter`); fonts are the shell's
  (Roboto). Add these when a site needs them.
