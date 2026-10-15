// Diagnostics shown in the panel's "Details": can this page use WebXR, is a headset
// visible, and what the headset and controllers reported during the last VR session.
(function (ns) {
  'use strict';

  const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;     // round to d decimals
  const deg = rad => round(rad * 180 / Math.PI);                     // radians -> degrees, 1 decimal

  // Per hand: profiles, button/axis counts, and every button index pressed at least once.
  const controllers = {};

  // Called for every controller on every poll (by input.js). Remembers its profile names,
  // button/axis counts and which buttons have ever been pressed - how we learned that the
  // Steam Frame's controllers arrive as "oculus-touch" with B, X and Y on one button.
  function noteController(src) {
    const gp = src.gamepad;
    if (!gp) return;
    const c = controllers[src.handedness] || (controllers[src.handedness] = {
      profiles: src.profiles, mapping: gp.mapping, buttons: gp.buttons.length, axes: gp.axes.length, seenPressed: [],
    });
    if (src.profiles && src.profiles.length) c.profiles = [...src.profiles];   // filled in after the first frames
    gp.buttons.forEach((b, i) => { if (b.pressed && !c.seenPressed.includes(i)) c.seenPressed.push(i); });
    // Which vibration APIs the browser gives this controller (WebXR's hapticActuators, the
    // Gamepad API's vibrationActuator), and how the last buzz went (noteBuzz).
    const ha = gp.hapticActuators, va = gp.vibrationActuator;
    c.haptics = {
      hapticActuators: ha ? ha.length : 'missing',
      pulse: !!(ha && ha[0] && typeof ha[0].pulse === 'function'),
      vibrationActuator: va ? { type: va.type, effects: va.effects ? [...va.effects] : undefined, playEffect: typeof va.playEffect === 'function' } : 'missing',
      lastBuzz: c.haptics ? c.haptics.lastBuzz : 'none yet',
    };
  }
  // How the last buzz on a hand went: which API it used and what came back (or the error).
  function noteBuzz(hand, how) { const c = controllers[hand]; if (c && c.haptics) c.haptics.lastBuzz = how; }
  // Can any controller seen so far vibrate (one of the two APIs above)? (Chrome on SteamVR
  // gives the Steam Frame's controllers neither, docs/hardware.md.)
  const canVibrate = () => Object.values(controllers).some(c => c.haptics &&
    (c.haptics.pulse || (c.haptics.vibrationActuator && c.haptics.vibrationActuator.playEffect)));

  // ---------------------------------------------------------------- headset clues
  // WebXR never names the headset, but its optics show through. Field of view, its
  // asymmetry and eye canting come from the lenses/displays, so they're the best clues.
  // IPD and render size are reported too, but both are user settings (IPD dial,
  // SteamVR resolution slider), so treat them as context only. Refresh rate is left out
  // on purpose: it's a user setting on most headsets.
  let headset = null;

  // Field of view of one eye from its projection matrix, in degrees from the eye's forward axis.
  // (p[0] and p[5] are the horizontal/vertical scale, p[8] and p[9] the off-centre shift of
  // the view; together they give the four edge angles.)
  function fovOf(p) {
    return {
      left: deg(Math.atan((1 - p[8]) / p[0])),
      right: deg(Math.atan((1 + p[8]) / p[0])),
      up: deg(Math.atan((1 + p[9]) / p[5])),
      down: deg(Math.atan((1 - p[9]) / p[5])),
    };
  }

  // Call once per session, on the first frame with a viewer pose.
  function noteHeadset(session, layer, viewerPose) {
    try {
      const views = viewerPose.views;
      const eyes = {};
      for (const v of views) {
        const vp = layer.getViewport(v);
        const fov = fovOf(v.projectionMatrix);
        eyes[v.eye] = {
          fov,
          fovTotal: { horizontal: round(fov.left + fov.right), vertical: round(fov.up + fov.down) },
          renderSize: `${vp.width}x${vp.height}`,
        };
      }
      const out = { views: views.length, eyes };
      const L = views.find(v => v.eye === 'left'), R = views.find(v => v.eye === 'right');
      if (L && R) {
        const a = L.transform.position, b = R.transform.position;
        out.ipdMm = round(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) * 1000);   // user setting
        const fwd = m => [-m[8], -m[9], -m[10]];                                  // eye's -Z axis
        const fl = fwd(L.transform.matrix), fr = fwd(R.transform.matrix);
        out.eyeCantDeg = deg(Math.acos(Math.min(1, ns.math3d.dot(fl, fr))));      // 0 = parallel displays
        const hl = fovOf(L.projectionMatrix), hr = fovOf(R.projectionMatrix);
        out.binocularOverlapDegApprox = round(Math.min(hl.right, hr.right) + Math.min(hl.left, hr.left) - out.eyeCantDeg);
      }
      if (layer.framebufferWidth) out.framebuffer = `${layer.framebufferWidth}x${layer.framebufferHeight}`;  // follows SteamVR's resolution setting
      if (typeof XRWebGLLayer !== 'undefined' && XRWebGLLayer.getNativeFramebufferScaleFactor) {
        out.nativeScale = round(XRWebGLLayer.getNativeFramebufferScaleFactor(session), 3);
      }
      if (session.environmentBlendMode) out.blendMode = session.environmentBlendMode;
      if (session.enabledFeatures) out.enabledFeatures = [...session.enabledFeatures];
      headset = out;
    } catch (err) {
      headset = { error: String(err) };
    }
  }

  // Everything the panel's Details shows: can this page use WebXR (YouTube's permissions
  // policy might block it), does the browser see a headset, what we noted about the
  // headset and controllers in the last session.
  async function check() {
    const policy = document.featurePolicy || document.permissionsPolicy;
    let webxrAllowedHere = true;
    try { if (policy) webxrAllowedHere = policy.allowsFeature('xr-spatial-tracking'); } catch (_) { /* unknown */ }
    let headsetFound = false, xrError = null, passthrough = null;
    if (!navigator.xr) xrError = 'navigator.xr missing';
    else {
      try { headsetFound = await navigator.xr.isSessionSupported('immersive-vr'); }
      catch (err) { xrError = `${err.name}: ${err.message}`; }
      // Would the browser offer camera passthrough? That's WebXR's 'immersive-ar' mode (a
      // see-through session). An answer for the future glass look (docs/Materials-Redesign.md);
      // the headset's own blend mode in a VR session is `headset.blendMode`.
      try { passthrough = { immersiveAr: await navigator.xr.isSessionSupported('immersive-ar') }; }
      catch (err) { passthrough = { immersiveAr: `${err.name}: ${err.message}` }; }
    }
    const notYet = 'none seen yet (enter VR first)';
    return {
      webxrAllowedHere, headsetFound, xrError, passthrough, checkedFrom: 'page',
      headset: headset || notYet,
      controllers: Object.keys(controllers).length ? controllers : notYet,
      controllerModels: !!ns.controllerModels,
    };
  }

  ns.diagnostics = { noteController, noteBuzz, canVibrate, noteHeadset, check };
})(globalThis.__streamxr = globalThis.__streamxr || {});
