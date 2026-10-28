// Diagnostics shown in the panel's "Details": can this page use WebXR, is a headset
// visible, clues about the browser, graphics cards and setup, StreamXR's recent warnings,
// and what the headset and controllers reported during the last VR session.
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

  // ---------------------------------------------------------------- setup clues
  // What helps tell why a browser sees no headset: which browser and OS (the brands the
  // browser reports, e.g. Chrome, Edge, Vivaldi's Chromium), which graphics card draws the
  // page (two-GPU laptops can put the browser on the built-in one, away from the headset's),
  // how the last Enter VR went, and whether the browser ever said its VR devices changed.

  // The browser and OS, asked once: { brands: ["Google Chrome 156.0.8078.74", ...], platform,
  // platformVersion, architecture, bitness }, or the user agent string where the browser
  // doesn't say more.
  let browserInfo = null;
  function browser() {
    if (!browserInfo) {
      const ua = navigator.userAgentData;
      browserInfo = !ua || !ua.getHighEntropyValues ? Promise.resolve({ userAgent: navigator.userAgent })
        : ua.getHighEntropyValues(['fullVersionList', 'platformVersion', 'architecture', 'bitness']).then(v => ({
          brands: (v.fullVersionList || ua.brands || []).filter(b => !/not.?a.?brand/i.test(b.brand)).map(b => `${b.brand} ${b.version}`),
          platform: v.platform || ua.platform, platformVersion: v.platformVersion, architecture: v.architecture, bitness: v.bitness,
        }), err => ({ userAgent: navigator.userAgent, error: String(err) }));
    }
    return browserInfo;
  }

  // The graphics card WebGL draws with (its renderer string, e.g. "ANGLE (NVIDIA, NVIDIA
  // GeForce RTX 4080 ...)"), read once from a throwaway canvas; or why it can't be read.
  let gpuInfo = null;
  function gpu() {
    if (gpuInfo) return gpuInfo;
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return (gpuInfo = 'no WebGL');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpuInfo = {
        vendor: gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR),
        renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
      };
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();                     // (frees the context at once)
    } catch (err) { gpuInfo = String(err); }
    return gpuInfo;
  }

  // How the last Enter VR went: { ok: true, at } or { ok: false, name (e.g. InvalidStateError),
  // message, step (where it failed, when known), at }; 'not tried yet' before the first.
  let lastStart = 'not tried yet';
  function noteStart(err) {
    const at = new Date().toISOString();
    lastStart = err ? { ok: false, name: err.name || 'Error', message: err.message || String(err), step: err.streamxrStep || 'setup', at } : { ok: true, at };
  }

  // The browser's "VR devices changed" event (a headset or runtime appearing or going): how
  // many times it came since the page loaded, and when last.
  const deviceChanges = { count: 0, last: null };
  if (navigator.xr && navigator.xr.addEventListener) {
    navigator.xr.addEventListener('devicechange', () => { deviceChanges.count++; deviceChanges.last = new Date().toISOString(); });
  }

  // The computer's graphics cards as WebGPU sees them, asked once: the "high-performance" and
  // the "low-power" one, each { vendor, architecture, description } (what the browser shares;
  // description is often blank), and twoGpus: true when they're different cards (a two-GPU
  // laptop: the browser may draw on the low-power one, away from the headset's), false when
  // they're the same; or a string saying why it can't be told (no WebGPU...). Asked once in
  // the background (it can take a while, and Details doesn't wait): 'checking…' until the
  // answer is in, then the answer.
  let gpusInfo = null, gpusAsked = false;
  function gpus() {
    if (!gpusAsked) {
      gpusAsked = true;
      gpusInfo = 'checking…';
      gpusLookup().then(v => { gpusInfo = v; }, err => { gpusInfo = String(err); });
    }
    return gpusInfo;
  }
  function gpusLookup() {
    if (!navigator.gpu || !navigator.gpu.requestAdapter) return Promise.resolve('no WebGPU');
    const one = async powerPreference => {
      const a = await navigator.gpu.requestAdapter({ powerPreference });
      if (!a) return null;
      const i = a.info || (a.requestAdapterInfo ? await a.requestAdapterInfo() : {});
      return { vendor: i.vendor || '', architecture: i.architecture || '', description: i.description || '' };
    };
    return Promise.all([one('high-performance'), one('low-power')]).then(([high, low]) => {
      if (!high && !low) return 'no WebGPU adapter';
      const same = high && low && high.vendor === low.vendor && high.architecture === low.architecture && high.description === low.description;
      return { highPerformance: high, lowPower: low, twoGpus: !!(high && low) && !same };
    });
  }

  // Is the browser's own WebXR the one on the page? Some extensions (e.g. the WebXR API
  // Emulator) put their own navigator.xr in its place, which answers the headset check
  // themselves. -> { native: true | false, kind (what navigator.xr is) }, or null without one.
  function xrNative() {
    const xr = navigator.xr;
    if (!xr) return null;
    const nativeFn = f => typeof f === 'function' && /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(f));
    let native = false;
    try {
      native = typeof XRSystem === 'function' && xr instanceof XRSystem &&
        nativeFn(xr.isSessionSupported) && nativeFn(xr.requestSession);
    } catch (_) { /* unreadable: not the browser's own */ }
    let kind = '';
    try { kind = Object.prototype.toString.call(xr); } catch (_) { /* unknown */ }
    return { native, kind };
  }

  // The headset over time, from the checks so far: the first check (seconds after the page
  // loaded, which says how long the tab had been open, and whether a headset was there), when
  // one was first found and last lost (seconds after load). Tells "the browser was opened before SteamVR" (missing,
  // then found) from "the browser never sees one" (missing every time).
  const sinceLoad = () => Math.round(performance.now() / 100) / 10;   // seconds, 1 decimal
  const timeline = { firstCheck: null, foundAfter: null, lostAfter: null, wasFound: null };
  function noteFound(found) {
    if (!timeline.firstCheck) timeline.firstCheck = { after: sinceLoad(), found };
    if (found && timeline.foundAfter == null) timeline.foundAfter = sinceLoad();
    if (!found && timeline.wasFound) timeline.lostAfter = sinceLoad();
    timeline.wasFound = found;
  }

  // StreamXR's own recent warnings and errors (its console.warn / console.error lines starting
  // with "[streamxr]", and uncaught errors from the extension's scripts): the last 10, each
  // { after (seconds after load), level, text (cut to 240 characters) }, so a report can show
  // what went wrong without the console. Ids that could name what was watched (video,
  // playlist and channel ids) and every URL's query are replaced with "…" (scrub).
  const WARN_MAX = 10, warnings = [];
  // Does a run of letters, digits, - and _ look like an id rather than a word or a code name?
  // 11 characters (a video id's length) with a digit, - or _, or 3+ capitals ("aB3cD4eF5gH",
  // "dQwAbCdEfGh"; not "playVideoAt"); 12 or more with a digit, - or _ (playlist, channel and
  // other long ids; not "isSessionSupported").
  const idLike = s => s.length === 11 ? /[0-9_-]/.test(s) || (s.match(/[A-Z]/g) || []).length >= 3
    : s.length > 11 && /[0-9_-]/.test(s) && /[A-Za-z]/.test(s);
  function scrub(text) {
    return String(text)
      .replace(/(https?:\/\/[^\s?#"']*)[?#][^\s"']*/g, '$1?…')    // a URL's query and fragment
      .replace(/\b(v|list|video_?id|playlist_?id|channel_?id|browse_?id)([=:"'\s]+)[A-Za-z0-9_-]+/gi, '$1$2…')
      .replace(/[A-Za-z0-9_-]{11,}/g, s => (idLike(s) ? '…' : s));
  }
  function remember(level, args) {
    try {
      const text = [...args].map(a => a instanceof Error ? `${a.name}: ${a.message}` : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch (_) { return String(a); } })()).join(' ');
      warnings.push({ after: sinceLoad(), level, text: scrub(text).slice(0, 240) });
      if (warnings.length > WARN_MAX) warnings.shift();
    } catch (_) { /* never let the log itself fail */ }
  }
  for (const level of ['warn', 'error']) {
    const orig = console[level];
    if (typeof orig !== 'function') continue;
    console[level] = function (...args) {
      if (typeof args[0] === 'string' && args[0].startsWith('[streamxr]')) remember(level, args);
      return orig.apply(this, args);
    };
  }
  // (uncaught errors from the extension's own files: their file name, not the page's address)
  const ownFile = f => /^(chrome|moz)-extension:\/\//.test(f || '');
  window.addEventListener('error', e => { if (ownFile(e.filename)) remember('uncaught', [`${e.message} (${String(e.filename).split('/').pop()}:${e.lineno})`]); });
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason, stack = r && r.stack ? String(r.stack) : '';
    if (/(chrome|moz)-extension:\/\//.test(stack)) remember('unhandled', [r instanceof Error ? r : String(r)]);
  });

  // Everything the panel's Details shows: can this page use WebXR (YouTube's permissions
  // policy might block it), does the browser see a headset (asked again at every check:
  // Details re-checks once a second while it's open), the setup clues above, what we noted
  // about the headset and controllers in the last session.
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
      if (!xrError) noteFound(!!headsetFound);
    }
    const notYet = 'none seen yet (enter VR first)';
    // With no headset found, the likely fix instead of "enter VR first" (which can't work).
    const noRuntime = 'no VR runtime found: set SteamVR as the OpenXR runtime (SteamVR → Settings → OpenXR), then fully quit and reopen the browser';
    return {
      webxrAllowedHere, headsetFound, xrError, passthrough, checkedFrom: 'page',
      browser: await browser(), gpu: gpu(), gpus: gpus(), xrNative: xrNative(),
      lastStart, deviceChanges: { ...deviceChanges },
      timeline: { firstCheck: timeline.firstCheck, foundAfter: timeline.foundAfter, lostAfter: timeline.lostAfter },
      warnings: warnings.slice(),
      headset: headset || (headsetFound ? notYet : noRuntime),
      controllers: Object.keys(controllers).length ? controllers : notYet,
      controllerModels: !!ns.controllerModels,
    };
  }

  ns.diagnostics = { noteController, noteBuzz, canVibrate, noteHeadset, noteStart, check };
})(globalThis.__streamxr = globalThis.__streamxr || {});
