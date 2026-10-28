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
  OpenXR sets it back. Suspected behind three "no headset" / "couldn't start" reports after
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

## Controller models

- `src/core/page/controllers/models.js` is generated from Valve's Steam Frame controller CAD
  by `tools/controller-models/` (it rebuilds byte-identically); the README's "Controller
  models" section has the steps and the license. Don't edit it by hand.
- Pressed buttons light up and floating icons show what each one does (from
  `src/core/shared/controls.js`). Other controllers are drawn as Steam Frame ones for now;
  per-controller models are on hold.
- `controllers/config.js` → `fit` aligns the models with your hands, `buttonParts` maps
  button numbers to model parts.
