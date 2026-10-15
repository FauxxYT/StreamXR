# Hardware notes

What has been learned about the headset and controllers StreamXR is built on (the Valve
Steam Frame with SteamVR, desktop Chrome). For supporting other hardware, see the README's
["Adding a headset"](../README.md#-adding-a-headset).

## Steam Frame

- **Start SteamVR before Chrome:** Chromium only looks for a headset when it launches.
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
- **No controller vibration through WebXR** (checked in 0.73.1): Chrome gives the
  controllers' gamepads neither `hapticActuators` (WebXR's `pulse()`) nor
  `vibrationActuator` (the Gamepad API's), so the hover / click buzz can't work. The
  Vibration switch (Settings → Appearance) is greyed out with a note until a controller offers one, so it
  works by itself if a later Chrome adds it.

## Controller models

- `src/core/page/controllers/models.js` is generated from Valve's Steam Frame controller CAD
  by `tools/controller-models/` (it rebuilds byte-identically); the README's "Controller
  models" section has the steps and the license. Don't edit it by hand.
- Pressed buttons light up and floating icons show what each one does (from
  `src/core/shared/controls.js`). Other controllers are drawn as Steam Frame ones for now;
  per-controller models are on hold.
- `controllers/config.js` → `fit` aligns the models with your hands, `buttonParts` maps
  button numbers to model parts.
