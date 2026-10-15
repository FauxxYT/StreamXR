# Contributing

> **Pull requests are paused for now.** 🙏 StreamXR is made by one person, who's focusing on
> bug fixes and the roadmap, so pull requests aren't being accepted at the moment and will be
> closed. **Issues are very welcome**: bug reports, headset reports, feature requests and
> translations (sent as an issue: see "Translating"). The rules below are for when pull requests
> open again.

Thanks for wanting to help. This project is built to stay small, readable and easy to
extend, so contributions are welcome when they keep it that way. Please read this whole
page before opening a pull request: pull requests that skip it are closed without review.

## The short version

1. **Open an issue first** and wait for a reply before writing code. Describe what you want
   to change and why. This saves you from building something that won't be merged.
2. **One change per pull request.** A bug fix, a feature, or a headset's support; not all three.
3. **Test it on real hardware** in a real VR session, and say which headset, browser and
   VR runtime you used.
4. **Follow the code rules below.** Read the surrounding code and write like it.
5. **You must understand every line you submit.** AI tools are fine to use, but you are the
   author: be ready to explain any line in review. Code that looks generated and
   unexamined (unused code, invented APIs, comments that don't match the code, changes
   unrelated to the issue) is closed.

## Ways to help without writing code

These are often more useful than code. Every issue goes through a form (**New issue** on
GitHub), so it arrives with what's needed to act on it:

- **Headset / controller compatibility.** If the extension doesn't work right on your
  hardware, paste the **Copy details** output (the form says how). That's usually enough
  for the fix to be written here.
- **YouTube changed something.** YouTube changes its pages often. If something that used to
  work stops (Up Next is empty, a panel shows nothing), a report with the video or channel
  link is very valuable.
- **Video looks wrong in VR.** A video that shows stretched, doubled, as squares or the
  wrong way round: the video's title, its channel and Copy details help fix its format detection.
- **Bug report**, with steps to reproduce, the video's title and channel, and the Copy details output.
- **New feature request**, **Support for another site** (check the DRM note in the
  form first), **Documentation problem**, and **Question or setup help**.
- **Security problems** go privately, never in an issue: see [SECURITY.md](SECURITY.md).
- **Translations.** StreamXR's own words (buttons, panel names, messages) come from string
  tables, so adding your language needs no code: see "Translating" below.

## Translating

Everything StreamXR writes itself is in three English tables. What the site writes (video
titles, "1.2M views", comments) is not: it already arrives in your site language.

- `src/core/shared/strings-en.js`: the core (controls panel, keyboard, help, the Laser /
  Keyboard / Language settings tabs).
- `src/streamxr/shared/strings-en.js`: StreamXR (video formats, the "Watch in VR" popup,
  starting VR, the 2D Cinema settings tab).
- `src/sites/youtube/page/provider/strings-en.js`: YouTube's panels (keys start with `yt.`).

Spanish (`strings-es.js` next to each) is a finished example, and needs a native speaker's
review: corrections are welcome.

To add a language (say French, `fr`; a regional one is fine too, like `pt-BR`):

1. Copy each table next to itself as `strings-fr.js`, and change `'en'` in its
   `ns.i18n.add('en', { ... })` line to `'fr'`.
2. Translate the texts. **Never change the keys** (the left side). Keep every `{name}`
   placeholder (move it where your sentence needs it). A text like
   `{ one: '{n} reply', other: '{n} replies' }` has plural forms: give the forms your
   language uses (`zero`, `one`, `two`, `few`, `many`, `other`; `other` is required).
   A key you leave out shows in English, so a partial translation still works.
3. Keep button words and row names short: the controls panel's buttons are small. Longer
   words are drawn smaller to fit, down to 60%, and then cut with "…". Look at your
   language in VR and pick shorter words where it gets small (Spanish uses "Restablecer"
   rather than "Predeterminado" for Default).
4. List the files in `manifest.json`, each right after its English one:
   - `src/core/shared/strings-fr.js` and `src/streamxr/shared/strings-fr.js` in the first
     (page world) entry, and `src/core/ui/shared/strings-fr.js` and
     `src/streamxr/ui/shared/strings-fr.js` in the second (isolated world) entry;
   - `src/sites/youtube/page/provider/strings-fr.js` in the first entry.
5. Run `node tools/sync-shared.js` (it makes the two `ui/shared/strings-fr.js` copies).
6. Check it in VR: Settings → Language → your language. Panels switch at once; the popup
   on the video page uses it the next time it opens. Your browser set to that language
   picks it by default.

The language's name in the Language tab comes from the browser (`Intl.DisplayNames`), in
the language itself ("Español").

**Sending it in:** while pull requests are paused, open a **Translation** issue: it has a box
for each of the three word lists, so you paste your translated lines straight into it (no
files needed), and they'll be added from there. Steps 4-6 are done then.

## Code rules

Most of these come from how the project is laid out: read [ARCHITECTURE.md](ARCHITECTURE.md)
before changing structure (it has the folder map, the layers and where common changes go).

- **No libraries, no build step, no ES modules.** Every file is a plain script
  `(function (ns) { ... })(globalThis.__streamxr = globalThis.__streamxr || {});` that adds one piece
  to the shared namespace. Load order lives in `manifest.json`. The one exception is vendored
  third-party code in `third_party/` (Google's Material Color Utilities, wrapped as a plain
  script with its license and a note of the changes); adding another needs agreeing in an
  issue first.
- **Keep things where they belong:**
  - Only `src/sites/youtube/page/youtube-*.js` read, click or request anything from YouTube. When
    YouTube's page or data changes, the fix goes there.
  - The shell (the core `src/core/` and StreamXR `src/streamxr/`: everything not under
    `src/sites/`) never names a site: site code lives in `src/sites/<site>/` (YouTube's:
    `src/sites/youtube/`), and each site registers its provider in the site registry
    (`src/core/page/sites.js`).
  - The VR interface (`src/core/page/vr-panel/`) knows nothing about YouTube: it is a shell
    meant to drive other sites too (see ARCHITECTURE.md). The chevron panels are built
    from five styles (`vr-panel/styles/`: Info, Catalog, Queue, Profile, Options) that
    draw a plain model and report standard events. YouTube fills them from
    `src/sites/youtube/page/provider/` (one controller per panel, registered in `panels.js`).
    A new panel feature goes into a style as a generic option (or a slot), and YouTube's
    side goes into its controller; a style never gets a YouTube-specific field.
  - The shell reaches YouTube only through its provider
    (`src/sites/youtube/page/provider/provider.js`, interface at its top): the VR session,
    the controls panel and format detection ask it, and `src/streamxr/page/main.js` picks
    the page's site from the registry.
  - Tunable numbers go in the config files (`vr-panel/config.js`, `controllers/config.js`,
    `SETTINGS` in `cinema-screen.js` / `pause-overlay.js`), not scattered through code.
  - What each controller input does lives in one place: `src/core/shared/controls.js`.
  - Words shown to the user are never written in the code: add a key to the English table
    of the part that draws it (`src/core/shared/strings-en.js`,
    `src/streamxr/shared/strings-en.js`, or the site's `provider/strings-en.js`)
    and draw `ns.i18n.t('key')` (see "Translating" and ARCHITECTURE.md, "Words"). The English
    tables are in **American English** (color, center, gray), as are the README and the docs
    users read.
  - Colors on the panels are never written in the code either: use a Material 3 color
    role from `src/core/page/vr-panel/tokens.js` (`TC.<role>`, or `TA(role, alpha)` for a
    translucent layer). A site's own colors go in its provider's `theme`.
  - Browser-specific code (`chrome.*`) stays isolated (today: `src/sites/youtube/ui/skip-helper.js`), so a
    Firefox port stays possible.
- **Comment as you go.** Every file starts with what it's for. Every function says what it
  does, and what it returns or which units/pixels it uses when that isn't obvious.
  Non-obvious steps get a line. Comments describe what the code does *now*, not its
  history (that's what git is for). GLSL shaders are explained in a comment *above* the
  shader string.
- **Don't edit generated files:** `src/core/page/controllers/models.js` (made by
  `tools/controller-models/`), `src/core/ui/shared/` and `src/streamxr/ui/shared/` (made by
  `tools/sync-shared.js`). After changing anything in `src/core/shared/` or
  `src/streamxr/shared/`, run `node tools/sync-shared.js`.
- **Record user-visible changes** in `CHANGELOG.md` (under the new version), and update
  `ARCHITECTURE.md` when you change how things are structured.
- **Bump `version` in `manifest.json`** in every pull request that changes the extension,
  so testers can confirm the reload picked it up.
- **Keep permissions minimal.** The extension asks only for youtube.com. A change that needs
  more permissions needs a very good reason, discussed in its issue first.
- **Don't detect headsets by refresh rate** (it's a user setting). See the README's
  "Adding a headset" section for what to use instead.
- **Match the existing style:** 2-space indentation, single quotes, semicolons, `const` by
  default, small functions. No reformatting of code you didn't otherwise change.

## Before you open the pull request

Two things run on every pull request and push, so you see problems early:

- **Automatic summary** (`.github/workflows/pr-summary.yml`): fills the bottom of your PR
  description with the linked issue, the commit history and the changed files, and flags a
  missing version bump or CHANGELOG entry, new files not in `manifest.json`, shared files
  without their regenerated copies, edited generated files, permission changes, and shell
  code that names a site.
- **Checks** (`.github/workflows/pr-checks.yml`): `node --check` on every script, the
  manifests parse, and `node tools/sync-shared.js --check`.

Fix what they flag before asking for review. The rest is up to you:

- [ ] There's an issue for it, and it got a reply agreeing to the change.
- [ ] It does one thing, and the description says what and why.
- [ ] Every file you load is listed in `manifest.json` in the right order.
- [ ] `node --check` passes on the files you changed, and `node tools/sync-shared.js` runs
      clean if you touched a `shared/` folder (`src/core/shared/`, `src/streamxr/shared/`).
- [ ] You tested it in a real VR session (headset, browser, runtime listed in the PR).
- [ ] Comments are updated for everything you changed.
- [ ] `manifest.json` version bumped, and `CHANGELOG.md` updated.

## Forks

The code is MIT, so you're free to fork it and change it for your own use. A few things
come with every fork:

- **Keep the license notices**, including the attribution header in
  `src/core/page/controllers/models.js`. Those controller models are adapted from Valve's CAD
  under **CC BY-NC-SA 4.0**: any fork that keeps them can't be used commercially (see the
  README's License section).
- **Please use a different name** if your fork changes things substantially, so its bugs
  aren't reported here.
- If your fork adds support for a headset, consider opening an issue here: good,
  well-structured support can be brought back for everyone.

## License of contributions

By contributing, you agree that your contribution is released under this project's MIT
license (and, for anything derived from the controller models, CC BY-NC-SA 4.0).
