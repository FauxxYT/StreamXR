# Known issues and open questions

Things that are known not to work, haven't been verified, or were tried and dropped.
Planned features are in the [features/](features/) folder; limits of the approach (DRM, WebXR
permissions, Firefox) are in [ARCHITECTURE.md](../ARCHITECTURE.md#known-limits).

## Not verified yet

- **Signed-in Home feeds** other than the main one, History, Playlists, Watch later and
  Liked videos (those were verified in 0.35) (`youtube-home.js`).
- **Live chat (0.79.0)**: written from probes of real chats (text messages, the welcome notice,
  emojis, banners) and, for what didn't show up during the probes, from the shapes YouTube
  is known to send: **Super Chats, Super Stickers, memberships and gifted memberships, the
  owner / moderator / member badges, deletions, pinned messages** (`youtube-chat.js`). Check
  them on a busy stream. While everything else is hidden, the chat stays up but the lasers are
  hidden with the rest. Chat replays (after a stream) aren't read yet.

## Known quirks

- **Captions on 180°/360° need improvement** (the maintainer, 0.77.1: "good enough for now"): they
  sit 22° below the horizon and glide after your view once you look 25° aside
  (`captions-overlay.js` `headAnchor`, `SETTINGS`). Ideas to try: a placement setting (height,
  distance, size), following on a slower curve or only after a pause, pinning them to the
  video's front like the pause symbol, a fade while they move.
- **No controller vibration** (0.73.1): Chrome gives the Steam Frame's controllers no
  vibration API (docs/hardware.md), so the Vibration switch is greyed out with a note.
- **Glass popups blur only the video** (seen by the maintainer in 0.67.2): the glass reads the
  video's own picture (the renderer's `backdrop()`, `panel-pass.js`), so a floating menu,
  the dialog or the search suggestions show the blurred video even where they stand in
  front of the controls panel or a side panel, not the buttons and panels behind them.
  Possible fix, put off by the maintainer: while a popup or dialog is open, copy the finished
  view (each eye, after everything else is drawn) into a texture with mipmaps and let the
  popup's glass blur that instead (`blitFramebuffer` from the layer's framebuffer, which
  may be multisampled; check the browser allows it). Costs a full-view copy and blur each
  frame, only while a popup is open.

- A channel's **Featured** tab is missing for channels you subscribe to unless the creator
  set a "featured video for returning subscribers". That's YouTube's behaviour.
- The Channel header's subscribed state can be wrong for a channel whose Home tab features
  other channels; it's only used when the watch page doesn't say.
- Text matching assumes **English** YouTube: some readers recognise YouTube's own words
  (the "All" chip, "Joined", an ad's "1 of 2"). This is about what YouTube writes;
  StreamXR's own words follow the interface language (Settings → Language).
- Replies to replies (YouTube's newer nested comment threads) aren't shown; one level is.

## Tried and dropped

- **A sphere distance for 180° / 360°** (like the cinema screen's Distance slider): spheres
  are drawn "at infinity" (rotation only), and in 180° it glitched instead of moving.
- **Detecting VR180 by the frame's shape**: VR180 streams are often 16:9 below 2160p; the
  player's VR180 flag is used instead.
- **Clicking YouTube's Skip ad button from a script**: YouTube ignores anything but a real
  click, hence the separate Skip Helper extension.
