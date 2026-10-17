# 0002: Play only what the site's own player plays

- **Status:** accepted (the maintainer, 2026-10-17)
- **Prompted by:** a tester's report (u/TehSuperFruitSnack on Reddit) that the Meta Quest app
  shows VR180 videos in 3D and up to 8K, while StreamXR shows one eye and 4K at most.

## Context

StreamXR draws the `<video>` element that the site's own player is already playing; it never
fetches a video stream itself. On desktop that has limits (checked in the browser, see
[youtube.md](../youtube.md) "Formats and VR180"):

- **Most 3D VR180 videos reach desktop as one eye only.** YouTube removes the right eye
  before the stream reaches the browser (a "LEFT / RIGHT" test video shows LEFT in both
  eyes). Some videos reach desktop with both eyes side by side; those StreamXR can show in
  3D (a format to pick by hand).
- **Some VR180 videos top out at 4K on desktop** (the player offers 2160s at most), while
  others reach 8K.

The Quest app most likely identifies itself to YouTube as a VR client and gets the full
stereo, higher-resolution versions. Matching it would mean **bypassing YouTube's player**:
asking YouTube for the streams as if StreamXR were that app, and playing them in a player of
our own.

## Decision

**StreamXR doesn't bypass the site's player.** It shows what the site's own player plays.
If a site starts sending stereo or higher resolutions to browsers, StreamXR shows them. This
holds for every site, not just YouTube. Suggestions to bypass the player (from users,
contributors or forks) get pointed here.

## Why: the risks of bypassing the player

1. **Rules and distribution.**
   - YouTube's Terms of Service don't allow accessing videos other than through YouTube's
     own player and interfaces, or getting around its ads.
   - The Chrome Web Store rejects extensions that break a site's terms or enable
     unauthorized downloading or streaming; that would block the planned store release.
   - It invites legal trouble: in 2020 the RIAA had youtube-dl taken down from GitHub,
     arguing that working around YouTube's scrambled stream addresses ("rolling cipher") was
     circumvention. GitHub reinstated it, but the claim was made.
2. **It breaks constantly.**
   - Posing as another app means copying its client name, version and request format,
     which YouTube changes often and blocks when they're not genuine.
   - Stream addresses are scrambled by code that changes with player updates, and YouTube
     increasingly requires proof-of-origin tokens (BotGuard) that are hard to produce
     outside its own player.
   - Tools like yt-dlp need fixes every few weeks for this; StreamXR would join that race.
3. **Rebuilding the site's player.**
   - StreamXR would need its own player feeding the video and audio streams to the browser
     (Media Source Extensions) and choosing qualities.
   - Captions, audio tracks, quality switching, live streams, chat replays tied to the video
     time, ads and Skip ad, and the resume position all come from YouTube's player today;
     each would need rebuilding or would break.
4. **Ads and creators.** Playing the streams directly skips YouTube's ads: the thing YouTube
   fights hardest, and revenue the creators people are watching depend on.
5. **Users' accounts and privacy.**
   - Requests sent with the user's signed-in session while posing as another app are the
     kind of traffic YouTube flags; at worst, an account gets warnings, extra verification
     or restrictions.
   - It needs a host permission for YouTube's video servers, against the project's
     "minimal permissions" goal, with a broader warning for users.

## Consequences

- 3D on one-eye VR180 videos, and more than 4K on those YouTube caps on desktop, are
  documented as desktop YouTube limits (the README's "Known issues"), not open work.
- What desktop YouTube does send is used fully: 8K where offered, and (planned) a side-by-side 3D
  format for videos that arrive with both eyes.
- A fork may decide otherwise; it then takes on the risks above itself.
