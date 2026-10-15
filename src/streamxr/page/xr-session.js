// One immersive VR session: sets up WebXR and WebGL, then each frame reads the controllers,
// uploads new video frames, and draws the video (sphere or cinema screen) followed by the
// pause overlay, captions, VR panel, controllers and lasers. Site-agnostic: everything about the site
// comes from its provider (e.g. sites/youtube/page/provider/provider.js; the interface is described
// there), handed in by main.js; the frames come through a media source (media-source.js).
(function (ns) {
  'use strict';

  const { math3d: M } = ns;

  let active = null;                        // { session } while a session is running (one at a time)

  // The picture the screen shows while no video plays: the site's logo (provider.logo():
  // Promise of an image or canvas; optional) centred on a dark 16:9 frame (the panels'
  // darkest surface colour). Returns a Promise of the canvas (just the frame without a logo).
  async function placeholderCanvas(provider) {
    const W = 1920, H = 1080, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = (ns.vrTokens && ns.vrTokens.m3.surfaceContainerLowest) || '#0f0f0f';
    g.fillRect(0, 0, W, H);
    const logo = provider.logo ? await Promise.resolve(provider.logo()).catch(() => null) : null;
    const lw = logo && (logo.naturalWidth || logo.width), lh = logo && (logo.naturalHeight || logo.height);
    if (lw && lh) {
      const k = Math.min(W * 0.42 / lw, H * 0.3 / lh), w = lw * k, h = lh * k;
      g.drawImage(logo, (W - w) / 2, (H - h) / 2, w, h);
    }
    return cv;
  }

  // Start VR showing the provider's video in `fmt`. listener(state) gets
  // { state: 'format', fmt } when the format is changed from inside VR,
  // { state: 'ended' } or { state: 'error', message } later on. Must be called from a user gesture.
  // opts.passthrough: you'd like to see your room around the video (the popup's checkbox).
  // Used only when the browser offers a see-through session ('immersive-ar'); today desktop
  // Chrome with SteamVR doesn't (docs/hardware.md), so this asks for a normal VR session.
  async function start(provider, fmt, listener, opts = {}) {
    if (active) return;
    // The video to show (media-source.js). With none on the page yet (VR started from the
    // site's home page...), the cinema screen shows a placeholder until you pick one in VR.
    const source = ns.mediaSource.fromProvider(provider);
    if (!source.element()) fmt = ns.formats.DEFAULT;
    let session;
    try {
      const ar = !!opts.passthrough && await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
      session = await navigator.xr.requestSession(ar ? 'immersive-ar' : 'immersive-vr', { optionalFeatures: ['local-floor'] });
    } catch (err) { source.stop(); throw err; }
    // See-through (passthrough): where nothing is drawn, the room shows instead of black.
    const seeThrough = !!session.environmentBlendMode && session.environmentBlendMode !== 'opaque';
    active = { session };
    // The glass setting as remembered now (the popup may have switched it since the page
    // loaded; appearance-options.js).
    if (ns.vrAppearanceOptions) ns.vrAppearanceOptions.load();
    try {
      // A private WebGL canvas the headset displays (not shown on the page). Prefers
      // WebGL 2; antialiasing is off (the headset's own resampling is enough and it costs
      // speed); no alpha so the picture is never see-through.
      const canvas = document.createElement('canvas');
      const opts = { xrCompatible: true, antialias: false, alpha: false };
      const gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
      await gl.makeXRCompatible();
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
      // 'local' space: positions are measured from where you were when the session began.
      const refSpace = await session.requestReferenceSpace('local');

      if (ns.vrAppearanceOptions) ns.vrAppearanceOptions.useSite(provider);   // the site's colours (the chosen theme) for the panels
      // The site's side of this session: its actions and state for the panels, its ads,
      // its chevron panels.
      const siteSide = provider.session();

      let view = ns.videoView.create(gl, fmt);   // sphere, or cinema screen for flat videos
      // While no video plays: the placeholder picture (the site's logo, centred on a dark
      // 16:9 frame: placeholderCanvas) on the screen, uploaded once per view.
      let placeholder = null, placeholderFor = null;
      placeholderCanvas(provider).then(c => { placeholder = c; }, () => {});
      let lastHead = null;                    // where you were (and faced) at the last recenter: { position, yaw }

      // Formats offered in the VR panel, named in the interface language (asked each frame,
      // so a language change shows at once).
      const formatOptions = () => ns.formats.IDS.map(id => ({
        id, label: ns.formats.label(id), short: ns.formats.shortLabel(id),
      }));
      // Switch format without leaving VR: build the new view, place it, re-upload the frame.
      // `forAd`: a temporary switch to the cinema screen (or back) around an ad - the page's
      // format picker isn't told.
      const switchView = (next, forAd) => {
        if (!ns.formats.isFormat(next) || next === fmt) return;
        const old = view;
        view = ns.videoView.create(gl, next);
        if (view.place && lastHead) view.place(lastHead.position, lastHead.yaw);
        old.dispose();
        panelSafely('targets', () => panel.setTargets([view.interaction]));
        fmt = next;
        source.invalidate();                  // the new view needs the current frame
        if (!forAd) listener({ state: 'format', fmt });
      };

      // Ads (when the site has them) always play on the cinema screen (they're regular 2D
      // videos), then the video's own format comes back. adFmt = the format to return to,
      // null when no ad is on. After the ad, the format is checked again from the real
      // video (a check made during the ad can't see it) - unless you picked one by hand
      // during the ad.
      let adFmt = null, adPicked = false;
      const adNow = () => (siteSide.ad ? siteSide.ad() : null);
      // Called every frame: when an ad starts, remember the format and switch to the cinema
      // screen; when it ends, switch back (and re-check the format unless one was picked).
      const followAds = () => {
        const ad = adNow();
        if (ad && adFmt === null) { adFmt = fmt; adPicked = false; switchView('flat', true); }
        else if (!ad && adFmt !== null) {
          const back = adFmt; adFmt = null;
          switchView(back, true);
          if (!adPicked) recheckFormat();
        }
      };
      // A format chosen (or detected) during an ad is used once the ad is over.
      const setFormat = (next, picked) => {
        if (adFmt !== null) {
          if (ns.formats.isFormat(next)) { adFmt = next; if (picked) adPicked = true; listener({ state: 'format', fmt: next }); }
          return;
        }
        switchView(next);
      };
      // Detect the format again once the site has the video's details (twice: some details
      // arrive a little later). Used for a new video and after an ad. (frame-clock.js: the
      // page's own timers can be held back in VR.)
      const recheckFormat = () => {
        for (const ms of [1200, 3500]) {
          ns.frameClock.after(ms, () => {
            if (!active || active.session !== session || adNow()) return;
            const det = provider.detectFormat();
            if (det.fmt !== fmt) setFormat(det.fmt);
          });
        }
      };

      // Darkened video + pause symbol while paused. Optional.
      let pauseOverlay = null;
      try {
        const vaos = ns.gl.vertexArrays(gl);
        if (vaos && ns.pauseOverlay) pauseOverlay = ns.pauseOverlay.createPauseOverlay(gl, vaos);
      } catch (err) { console.warn('[streamxr] pause overlay disabled:', err); }

      // Captions over the video (the site's caption lines: siteSide.captions()). Optional.
      let captionsOverlay = null;
      try {
        const vaos = ns.gl.vertexArrays(gl);
        if (vaos && ns.captionsOverlay && siteSide.captions) captionsOverlay = ns.captionsOverlay.create(gl, vaos);
      } catch (err) { console.warn('[streamxr] captions disabled:', err); }

      // Controller models are optional: VR still works without them.
      let controllers = null;
      try { controllers = ns.controllers ? ns.controllers.create(gl) : null; }
      catch (err) { console.warn('[streamxr] controllers disabled:', err); }

      // yaw: the direction you faced at the last recenter (the sphere is turned by it);
      // wantRecenter: set by the grip / Recenter button, handled at the next frame;
      // headsetNoted: the headset's optics are recorded once, for the Details panel.
      let yaw = 0, wantRecenter = true, headsetNoted = false;
      let headNow = [0, 0, 0];                // head position at the latest frame (for the Distance slider)

      // The shell's own settings: the cinema screen's distance (null on 180°/360°) and its
      // curve and glow (stored even while another format is showing, used when the screen is
      // next on).
      // The glow's, as the 2D Cinema tab wants them (cinema-options.js).
      const glowSettings = () => {
        const g = ns.cinemaScreen.glowPrefs(), S = ns.cinemaScreen.SETTINGS;
        return { glow: g.on, glowStrength: g.strength, defaultGlowStrength: S.glowStrength,
          glowReach: { value: g.reach, min: S.minGlowReach, max: S.maxGlowReach, default: S.glowReach } };
      };
      const viewSettings = () => ({
        distance: view.distance ? view.distance() : null,
        cinema: { active: ns.formats.isFlat(fmt), ...ns.cinemaScreen.curvePrefs(), defaultAmount: ns.cinemaScreen.SETTINGS.curveAmount,
          ...glowSettings(),
          format: ns.formats.label(fmt) },
      });
      const setGlow = patch => {
        const g = ns.cinemaScreen.saveGlow(patch);
        if (view.setGlow) view.setGlow(g);
      };
      const setCurve = patch => {
        const c = ns.cinemaScreen.saveCurve(patch);
        if (view.setCurve) view.setCurve(c);
      };

      // Floating control panel + laser pointers. Optional too. Its actions are the site's
      // plus the shell's own (recenter, exit, formats, the cinema screen), and its state the
      // site's plus the format and the shell's settings.
      let panel = null;
      try {
        panel = ns.vrPanel ? ns.vrPanel.create(gl, {
          ...siteSide.actions,
          recenter: () => { wantRecenter = true; },
          exit: () => session.end(),
          setFormat: next => setFormat(next, true),
          setDistance: metres => { if (view.setDistance) view.setDistance(metres, headNow); },
          setCurve, setGlow,
          state: () => ({ ...siteSide.state(), viewSettings: viewSettings(),
            format: { current: fmt, options: formatOptions() } }),            // what's on screen (cinema during ads)
        }, siteSide.site) : null;
      } catch (err) { console.warn('[streamxr] VR panel disabled:', err); }
      // Run a panel call; if it throws, log it and switch the panel off for the rest of the
      // session instead of breaking the video (the panel is optional).
      const panelSafely = (what, fn) => {
        if (!panel) return;
        try { fn(); } catch (err) { console.warn(`[streamxr] VR panel ${what} failed, turning it off:`, err); panel = null; }
      };

      panelSafely('targets', () => panel.setTargets([view.interaction]));   // cinema screen handles

      // Controller buttons -> actions (what each button does is listed in src/core/shared/controls.js).
      const input = ns.input.createInputHandler({
        toggle: () => provider.toggle(),
        // The stick turns the pages of a panel it points at, or scrolls a text panel (vr-panel),
        // instead of seeking.
        seek: (delta, src) => {
          const hand = src && src.handedness;
          if (panel && hand && (panel.stickPage(hand, Math.sign(delta)) || panel.stickScrolls(hand))) return;
          provider.seek(delta);
        },
        // Grip on the panel's grab bar moves the panel instead of recentering.
        recenter: src => { if (!(panel && src && panel.claimsGrip(src.handedness))) wantRecenter = true; },
        panel: () => panelSafely('toggle', () => panel.toggleVisible()),
        keyboard: () => panelSafely('keyboard', () => panel.toggleKeyboard()),
        reset: src => resetAll(src),
      }, ns.diagnostics.noteController);

      // The global reset (a hold binding in controls.js): every adjustable setting back to
      // its default - the cinema screen's size, distance, height and curve, the laser
      // steadiness, the glass look (on, at the default tint), the colour theme, the Safe Zone,
      // the auto-hide waits, the keyboard's style, language
      // and size, the interface language (back
      // to the browser's), the popup's passthrough checkbox - then a recenter, which puts
      // the video and the panels back in front of you at their default places. Which panel
      // is open and the tabs you were on are kept (they aren't settings). A long buzz says
      // it's done.
      const resetAll = src => {
        ns.cinemaScreen.resetPrefs();
        if (view.reset) view.reset();
        ns.vrLaserOptions.reset();
        ns.vrKeyboardOptions.reset();
        ns.vrAppearanceOptions.reset();
        ns.vrSafeZone.reset();
        ns.vrFadeOptions.reset();
        ns.i18n.setChoice('auto');
        ns.storage.remove('passthrough');                  // the popup's checkbox (next session)
        panelSafely('reset', () => panel.resetSettings());
        wantRecenter = true;
        try {
          const h = src && src.gamepad && src.gamepad.hapticActuators && src.gamepad.hapticActuators[0];
          if (h && h.pulse) h.pulse(0.8, 150);
        } catch (_) { /* no haptics */ }
      };

      // Opening another video (from a panel, or the site's autoplay) happens inside the page,
      // so the session keeps running. Re-check the format for the new video. (If an ad plays
      // first, the check runs again when it ends.)
      const stopNavigate = provider.onNavigate(() => recheckFormat());

      // The render loop, once per headset frame. In order: follow the video element, read
      // the controllers, handle ads, recenter if asked, update the panel, upload a new video
      // frame if there is one, then draw: video, pause overlay, captions, panel, controllers, lasers.
      const onFrame = (_, frame) => {
        session.requestAnimationFrame(onFrame);
        ns.frameClock.tick();                                // waits end on time even if the page's timers are held back
        const pose = frame.getViewerPose(refSpace);
        if (!pose) return;                                   // headset tracking lost this frame
        const hp = pose.transform.position;
        headNow = [hp.x, hp.y, hp.z];
        if (source.follow()) placeholderFor = null;          // the site swapped its <video> (or a video opened / went away)
        input.poll(session.inputSources);
        try { followAds(); } catch (err) { console.warn('[streamxr] ad handling failed:', err); }
        // Recenter: take the direction you're facing now as "front", and put the video and
        // panel there.
        if (wantRecenter) {
          yaw = M.yawOf(pose.transform.orientation);
          wantRecenter = false;
          lastHead = { position: pose.transform.position, yaw };
          try { if (view.place) view.place(lastHead.position, yaw); } catch (err) { console.warn('[streamxr] placing the video failed:', err); }
          panelSafely('placement', () => panel.place(pose.transform.position, yaw));
        }
        panelSafely('update', () => panel.update(frame, refSpace, session.inputSources, performance.now(), pose.transform.position));

        // Copy the video's newest frame to the GPU (only when there is one, and the video
        // has data). A refused frame (cross-origin) ends the session with a message.
        if (source.hasNewFrame()) {
          try {
            view.upload(source.element());
            source.uploaded();
          } catch (err) {
            listener({ state: 'error', message: err && err.name === 'SecurityError'
              ? ns.i18n.t('vr.blockedFrames', { site: provider.name })
              : ns.i18n.t('vr.cantRead', { error: err && err.message }) });
            session.end();
            return;
          }
        } else if (!source.element() && placeholder && placeholderFor !== view) {
          view.upload(placeholder);                           // no video: the placeholder, once per view
          placeholderFor = view;
        }

        const layer = session.renderState.baseLayer;
        if (!headsetNoted) { ns.diagnostics.noteHeadset(session, layer, pose); headsetNoted = true; }
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        gl.clearColor(0, 0, 0, seeThrough ? 0 : 1);           // transparent: the room shows (passthrough)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        view.draw(pose, layer, yaw);
        if (pauseOverlay) {
          // Pin the pause symbol (and buffering spinner) to the video: the cinema screen's centre, or the front of the
          // 180°/360° video (where you recentered), 2 m away at eye height.
          let anchor = view.pauseAnchor ? view.pauseAnchor() : null;
          if (!anchor && lastHead) {
            const p = lastHead.position, d = ns.pauseOverlay.SETTINGS.distance;
            const yaw = lastHead.yaw;
            anchor = {
              position: [p.x - Math.sin(yaw) * d, p.y, p.z - Math.cos(yaw) * d],
              right: [Math.cos(yaw), 0, -Math.sin(yaw)], up: [0, 1, 0],   // upright, facing the recenter spot
            };
          }
          // Buffering shows the loading spinner in the same spot.
          // (with no video, nothing to pause or wait for)
          const playing = !!source.element();
          try { pauseOverlay.draw(pose, layer, playing && provider.isPaused(), performance.now(), anchor, playing && provider.buffering()); }
          catch (err) { console.warn('[streamxr] pause overlay failed, turning it off:', err); pauseOverlay = null; }
        }
        // Captions over the bottom of the video (the cinema screen's captionAnchor; on
        // 180°/360° below your view).
        if (captionsOverlay) {
          try { captionsOverlay.draw(pose, layer, siteSide.captions(), view.captionAnchor ? view.captionAnchor() : null); }
          catch (err) { console.warn('[streamxr] captions failed, turning them off:', err); captionsOverlay = null; }
        }
        // The panels, with the video behind them for the glass look (none over the room: the
        // camera image never reaches the page, so passthrough gets the tint alone).
        panelSafely('drawing', () => panel.drawPanel(pose, layer, !seeThrough && view.backdrop ? view.backdrop() : null));

        if (controllers) {
          try { controllers.draw(frame, refSpace, pose, layer, session.inputSources, panel ? panel.iconSwaps() : null, input.holds()); }
          catch (err) { console.warn('[streamxr] controller drawing failed, turning it off:', err); controllers = null; }
        }
        panelSafely('laser drawing', () => panel.drawLasers(pose, layer, controllers ? controllers.alphas() : null));
      };

      // Session over (you took the headset off, pressed Exit VR, or an error ended it):
      // stop listening, free everything on the GPU, and tell the panel.
      session.addEventListener('end', () => {
        active = null;
        source.stop();
        stopNavigate();
        try { if (pauseOverlay) pauseOverlay.dispose(); if (captionsOverlay) captionsOverlay.dispose(); if (controllers) controllers.dispose(); if (panel) panel.dispose(); view.dispose(); } catch (_) { /* context going away anyway */ }
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        listener({ state: 'ended' });
      });
      session.requestAnimationFrame(onFrame);
      if (source.element() && provider.isPaused()) provider.toggle();   // start playing if it was paused on the desktop
    } catch (err) {
      active = null;
      source.stop();
      session.end().catch(() => {});
      throw err;
    }
  }

  // Leave VR (no-op if no session is running).
  function end() { if (active) active.session.end(); }

  ns.xrSession = { start, end, isActive: () => !!active };
})(globalThis.__streamxr = globalThis.__streamxr || {});
