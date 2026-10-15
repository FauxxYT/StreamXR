<!--
Pull requests are paused for now: they aren't being accepted and will be closed. Please
open an issue instead (see CONTRIBUTING.md). The rest of this template is for when they open
again.

Read CONTRIBUTING.md first. Pull requests without an agreed issue, or that don't follow
it, are closed without review.

Fill in the sections above "Automatic summary". The summary at the bottom (linked issue,
commits, changed files, version / CHANGELOG / manifest checks) is filled in for you on
every push; leave its markers in place. The "Checks" status below the description runs
node --check and tools/sync-shared.js --check on your code.
-->

## What and why

Closes #<!-- issue number (required: the issue must have a reply agreeing to the change) -->

<!-- One or two sentences: what this changes, from the viewer's side, and why. -->

## How

<!-- The approach, and anything a reviewer should look at closely. -->

## Tested on

- Headset and controllers:
- VR runtime / connection:
- Browser and version:
- Signed in to YouTube: yes / no
- What I tried in VR:

## Checklist

What the automatic summary and the Checks can't see:

- [ ] There's an agreed issue for this, and this PR does only that one thing.
- [ ] I understand every line of this change and can explain it in review.
- [ ] I tested it in a real VR session on the hardware listed above.
- [ ] YouTube access stays in `src/sites/youtube/page/youtube-*.js`; tunables are in the config files.
- [ ] Every new file and function has its comment, and comments I touched match the code.
- [ ] New files are in `manifest.json` in the right **order** (the summary only checks they're listed).
- [ ] No new permissions, or they were agreed in the issue.

<!-- pr-summary:start -->
## Automatic summary

_Filled in automatically a few seconds after the pull request is opened, and on every push._
<!-- pr-summary:end -->
