# Hardware notes

What has been learned about the headset and controllers StreamXR is built on (the Valve
Steam Frame with SteamVR, desktop Chrome). For supporting other hardware, see the README's
["Adding a headset"](../README.md#-adding-a-headset).

## Steam Frame

- **Start SteamVR before Chrome:** Chromium only looks for a headset when it launches.
- **VR on an extension page works** (`tools/xr-check/`, 0.101.17, Chrome 156, 2026-10-28):
  `chrome-extension://…` is a secure context and `requestSession('immersive-vr')` starts,
  WebGL 2, blend mode opaque. Chrome asks first ("StreamXR wants to use virtual reality
  devices and data": Allow while visiting the site / Allow this time / Never allow). The
  session's visibility went `hidden` at the start, then `visible-blurred` and `visible`;
  opening the SteamVR dashboard turns it `visible-blurred`, and frames keep coming (the
  picture kept changing), back to `visible` when it closes. Meanwhile no controller updates
  arrive: StreamXR's controllers and lasers stayed frozen in the air, so they're hidden while
  the session isn't `visible` (0.101.41); the video plays on and the panels fade as usual.
- **VR can start with no click of yours** (Test 2, `tools/xr-check/`, 0.101.18 with Skip Helper
  1.4.0, 2026-10-28): on a YouTube tab opened from the check page, the Skip Helper's debugger
  click on StreamXR's see-through target counted as real input; target clicked 0.3 s after the
  headset was found, VR started at 0.6 s (YouTube's logo on the screen). Chrome's "is debugging
  this browser" bar wasn't noticed (the helper attaches for a fraction of a second, on the
  desktop window only, as for Skip ad). Chrome's VR permission
  for YouTube had been granted weeks before, so whether a first-time prompt gets in the way
  is still to see.
- **A key press brings VR back, no Skip Helper** (Test 3, `tools/xr-check/`, 0.101.26,
  2026-10-28): after a session ended, the physical keyboard's space bar (or a click) started a
  new one; every press arrived as real input (`isTrusted`). The page kept keyboard focus when
  a session simply ended (`document.hasFocus()` true), but lost it after the session went
  `hidden` (the SteamVR dashboard, or the headset off): then a key press went nowhere until a
  click brought focus back. So StreamXR's fallback says "press any key **or click**". Mapping
  a controller button to a key (Steam Input) would work the same, but is too much setup to
  ask of users.
- **Chrome 156's WebXR flags** (`chrome://flags`, "xr", 2026-10-28): WebXR Layers
  (`#webxr-projection-layers`, Windows and Android), WebXR/WebGPU Binding (needs Layers),
  WebXR Incubations, WebXR Internals Debugging Page (`#webxr-internals`: a developer page
  for debugging WebXR), Plane Detection, Mesh Detection, Force WebXR Runtime, Hand
  Anonymization Strategy. **No in-VR navigation flag**, and `'onsessiongranted' in
  navigator.xr` is false: moving to another page still needs a fresh click or key press.
  Layers are off by default; behind the flag they could make the video sharper later
  (drawn straight by the compositor instead of resampled), but users won't turn on flags.
- **Chrome on Windows ignores WebGPU's `powerPreference`** (crbug.com/369219127; it warns in
  the console and gives the same card for "high-performance" and "low-power"), so WebGPU can't
  tell a two-GPU laptop's cards apart there. Copy details' `gpus` isn't asked on Windows
  (0.101.19); the popup guesses a built-in card from WebGL's renderer name instead.
- **SteamVR must be the OpenXR runtime:** on Windows, Chromium reaches headsets through the
  active OpenXR runtime, which other VR software (Quest Link, Virtual Desktop, ...) can take
  over; SteamVR games still work then (they use SteamVR's own API), but the browser finds no
  headset (`isSessionSupported('immersive-vr')` is false with no error). SteamVR → Settings →
  OpenXR sets it back. **Its registration can also be broken while SteamVR's settings say it's
  the current runtime** (the set button greyed out, 0 API layers, no `XR_RUNTIME_JSON`, the
  WebXR samples greyed out too): reinstalling SteamVR fixed it, and the fresh install asked to
  become the default runtime (found with [u/Timtronic125](https://www.reddit.com/user/Timtronic125) on Reddit, a Steam Frame user who once had Vive
  software, 2026-10-29).
  The README's Quick troubleshooting and the popup's check 2 say so (0.101.55). Suspected behind three "no headset" / "couldn't start" reports after
  v0.101.7 (not confirmed yet); Details now also shows the browser, the GPU, the last Enter
  VR error and the browser's device-change events (0.101.8), the graphics cards WebGPU sees,
  whether WebXR is the browser's own (not an extension's stand-in), a headset timeline and
  StreamXR's recent warnings with ids removed (0.101.14).
- **Streaming with no game:** the Frame is ready for WebXR once it streams SteamVR itself: in
  the headset, **Streaming Status** → the PC running SteamVR → **Advanced** → **Stream VR
  without game**.
- **The Frame's own browser:** its built-in Chromium browser has no WebXR yet, so StreamXR runs
  from desktop Chrome on the PC. Once it gets WebXR, StreamXR will be updated to run there
  natively (README roadmap, "as soon as it's possible").
  - **Signs it's coming (2026-11-02):** Valve appears to be working on WebXR for that browser
    ("Enable support for WebXR via flatpak overrides and launch options", spotted by a VR
    journalist on X), and SteamVR 2.19.1 lets OpenXR runtimes run inside Flatpak and other
    sandboxes: the browser is a Chromium Flatpak, so that's the plumbing it needs. Opt-in and
    experimental so far (overrides, launch options).
  - **What decides whether StreamXR can run there**, in order: (1) **extensions**: StreamXR is
    one, so the browser has to install extensions (the Web Store or unpacked); without that,
    nothing else matters; (2) **video decoding** on the headset's mobile chip in a Linux
    browser (if VP9 / AV1 decode in software, 4K and 8K 360° may stutter); (3) **GPU
    headroom** (the glass blur and the cinema glow cost the most: standalone may need lighter
    defaults or a performance setting); (4) **the controllers**, which there may report as Steam
    Frame controllers instead of `oculus-touch` (B, X, Y as separate buttons: re-check the
    mapping); (5) the PC-only parts: Copy details' and Quick troubleshooting's Windows /
    SteamVR wording. The rest is plain WebXR and should carry over; no streaming compression
    should make it sharper than through Steam Link.
  - **Checks when the flag shows up:** the WebXR samples page in that browser, then whether it
    installs an extension, then StreamXR (`whats-left.md`).
  - **Later, if that browser exposes WebXR Layers:** SteamVR 2.19.1 adds
    `XR_KHR_composition_layer_cylinder` on the Frame, so the cinema screen could be handed to
    the headset as a cylinder layer (sampled by the compositor: the sharpest a flat video can
    look). Desktop Chrome has no WebXR Layers, so it's out of reach on the PC.
- **SteamVR 2.19.1 (beta, 2026-11) on the PC path:** it raises Steam Link's default render
  resolution (render scale 1.5, about 1.4× the panels; no more GPU test) and the Frame's encoded
  video size (1152 to 1216), with sharper colors and text. StreamXR draws at the size SteamVR
  recommends (below), so it should get sharper with no change on its side, at more GPU cost;
  the drawing-size note below (2644×2644 per eye) is from 2.18 and needs a re-check (Copy
  details' framebuffer after entering VR). Also: better head-motion prediction, eye poses for
  projection layers including the eye-to-head offset (stereo depth should look the same or
  better), a fix for one cause of Error 17, and per-application refresh rate overrides (StreamXR
  doesn't depend on the refresh rate).
- The controllers reach Chrome as **`oculus-touch`** (7 buttons, 4 axes), not as a Steam
  Frame profile:
  - Right controller: A reports as **button 4** (play / pause); B, X and Y all report as
    **button 5** (the keyboard, since 0.72.0), so those three work (and light up on the controller
    models) together.
  - Left D-pad: reports as buttons 4 and 5.
  - Stick click: reports as **button 3** (verified on the right stick in 0.47.0; held 3 s
    it's the global reset).
  - Only two face buttons per hand can be told apart.
- Headset clues reported by WebXR: about 109.5° field of view per eye, 0° canting, IPD about
  69.8 mm, 2644 x 2644 per eye at SteamVR's default resolution (the popup's Details lists
  them).
- Controller profiles reported (0.49.1): `oculus-touch`, `generic-trigger-squeeze-thumbstick`
  (`xr-standard` mapping, 7 buttons, 4 axes).
- **No camera passthrough through WebXR** (checked in 0.49.1 with the Arcturus Vision color
  camera module attached): `isSessionSupported('immersive-ar')` is false and a VR session's
  `environmentBlendMode` is `opaque`. SteamVR's own Room View still works over anything.
  (Desktop Chrome doesn't enable OpenXR AR by default, and SteamVR exposes no passthrough to
  OpenXR apps.) It's a missing feature, not a hardware limit: StreamXR is ready for it since
  0.49.2 (the popup's "See your room" switch becomes available by itself once the browser offers
  `immersive-ar`; the session then clears to transparent).
- WebXR never names the headset, so nothing detects it by name. Don't detect a headset by
  its refresh rate either: it's a user setting.
- **The drawing size is SteamVR's** (checked 2026-10-28, 0.101.43): the headset's recommended
  size is 2644×2644 per eye (5288×2644 both) on the maintainer's Frame, and
  `getNativeFramebufferScaleFactor` is 1: asking for more (`framebufferScaleFactor` 1.5) drew
  exactly the same, so Chrome caps it there. More pixels only through SteamVR → Settings →
  Video → Render Resolution (the Frame's stream may still limit what shows).
- **No hand tracking through WebXR** (checked 2026-10-28): with the controllers down and the
  hands held up in VR, nothing happens. StreamXR is built for the controllers and doesn't use
  hand input; whether Chrome offers the Frame's hands to web pages at all (WebXR's
  `hand-tracking` feature) is unchecked. Hands would be a later feature, if Chrome offers them.
- **No controller vibration through WebXR** (checked in 0.73.1): Chrome gives the
  controllers' gamepads neither `hapticActuators` (WebXR's `pulse()`) nor
  `vibrationActuator` (the Gamepad API's), so the hover / click buzz can't work. The
  Vibration switch (Settings → Appearance) is greyed out with a note until a controller offers one, so it
  works by itself if a later Chrome adds it.

## Other headsets (reported by users)

- **Meta Quest 2** (reported by [u/TehSuperFruitSnack](https://www.reddit.com/user/TehSuperFruitSnack) on Reddit, after 0.88.1): works through SteamVR in desktop Chrome,
  8K videos included. Not tried by the maintainer, and not reported yet: how its buttons map
  (Copy details' `controllers` part would show it) and how it connects to the PC (Link,
  Air Link or another streaming app). Its controllers are drawn as Steam Frame models.
- **Pimax Crystal Light** (reported by [u/Livid-Escape-4820](https://www.reddit.com/user/Livid-Escape-4820) on Reddit, 2026-10-30): works
  through SteamVR in desktop Chrome. Not reported yet: which StreamXR version, how its
  controllers' buttons map (Copy details' `controllers` part), and anything that looked off.
  Its controllers are drawn as Steam Frame models.

## Controller models

- `src/core/page/controllers/models.js` is generated from Valve's Steam Frame controller CAD
  by `tools/controller-models/` (it rebuilds byte-identically); the README's "Controller
  models" section has the steps and the license. Don't edit it by hand.
- Pressed buttons light up and floating icons show what each one does (from
  `src/core/shared/controls.js`). Other controllers are drawn as Steam Frame ones for now;
  per-controller models are on hold.
- `controllers/config.js` → `fit` aligns the models with your hands, `buttonParts` maps
  button numbers to model parts.
