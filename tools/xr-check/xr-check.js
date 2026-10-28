// Dev-only test (xr-check.html): can a chrome-extension:// page start an immersive VR
// session? Logs what the page can see (secure context, WebXR, a headset), then on Enter VR
// starts a session that clears the headset's view to a slowly changing color, and logs how it
// went: started, its visibility changes (e.g. the SteamVR dashboard), and how it ended
// (trigger pressed, 15 s timeout, or ended by SteamVR / the browser).
(function () {
  'use strict';

  const logEl = document.getElementById('log'), statusEl = document.getElementById('status');
  const enterBtn = document.getElementById('enter');
  const t0 = performance.now();
  const lines = [];
  // One line in the results, with the seconds since the page opened.
  function log(text) {
    lines.push(`${((performance.now() - t0) / 1000).toFixed(1)}s  ${text}`);
    logEl.textContent = lines.join('\n');
  }
  // The one-line outcome above the buttons: kind 'ok' (green), 'bad' (red) or neutral.
  function status(text, kind) {
    statusEl.textContent = text;
    statusEl.className = `status${kind ? ` ${kind}` : ''}`;
  }

  // What the page is and what it can see, before any session.
  async function preflight() {
    log(`page: ${location.protocol}//… (${location.pathname})`);
    log(`isSecureContext: ${window.isSecureContext}`);
    const policy = document.featurePolicy || document.permissionsPolicy;
    try { if (policy) log(`xr-spatial-tracking allowed: ${policy.allowsFeature('xr-spatial-tracking')}`); }
    catch (err) { log(`permissions policy: ${err}`); }
    try { const p = await navigator.permissions.query({ name: 'xr-spatial-tracking' }); log(`xr permission state: ${p.state}`); }
    catch (err) { log(`xr permission state: not readable (${err.name})`); }
    if (!navigator.xr) { log('navigator.xr: MISSING'); status('This browser has no WebXR.', 'bad'); enterBtn.disabled = true; return; }
    log('navigator.xr: present');
    try {
      const vr = await navigator.xr.isSessionSupported('immersive-vr');
      log(`isSessionSupported('immersive-vr'): ${vr}`);
      if (!vr) {
        log('No headset found: start SteamVR first, then fully restart Chrome.');
        status('No headset found. Start SteamVR first, then fully restart Chrome.', 'bad');
        enterBtn.disabled = true;
      } else status('Headset found. Press Enter VR.');
    } catch (err) {
      log(`isSessionSupported failed: ${err.name}: ${err.message}`);
      status(`Couldn’t look for a headset (${err.name}).`, 'bad');
    }
  }

  // Enter VR (from the button's click): a WebGL canvas made XR-compatible, a 'local' space,
  // and a frame loop clearing to a hue that turns once every 6 s. Ends on the trigger or
  // after 15 s.
  async function enter() {
    enterBtn.disabled = true;
    let session;
    try {
      session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
      log('requestSession: OK, session started');
      status('VR started. Look in the headset.', 'ok');
    } catch (err) {
      log(`requestSession FAILED: ${err.name}: ${err.message}`);
      status(`Couldn’t start VR (${err.name}). Copy the results and send them.`, 'bad');
      enterBtn.disabled = false;
      return;
    }
    let endedBy = 'ended by SteamVR or the browser', frames = 0;
    session.addEventListener('visibilitychange', () => log(`visibility: ${session.visibilityState}`));
    session.addEventListener('select', () => { endedBy = 'trigger pressed'; session.end(); });
    session.addEventListener('end', () => {
      log(`session ended (${endedBy}); frames drawn: ${frames}`);
      if (frames > 0) status(`It works: VR ran on this page (${frames} frames). Copy the results and send them.`, 'ok');
      else status('VR started but drew nothing. Copy the results and send them.', 'bad');
      enterBtn.disabled = false;
    });
    const timer = setTimeout(() => { endedBy = '15 s timeout'; session.end().catch(() => {}); }, 15000);
    session.addEventListener('end', () => clearTimeout(timer));

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { xrCompatible: true }) || canvas.getContext('webgl', { xrCompatible: true });
      await gl.makeXRCompatible();
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
      const space = await session.requestReferenceSpace('local');
      log(`rendering: ${gl instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1'}, blend mode: ${session.environmentBlendMode || '?'}`);
      let posed = false;
      const frame = (time, xrFrame) => {
        session.requestAnimationFrame(frame);
        const pose = xrFrame.getViewerPose(space);
        if (pose && !posed) { posed = true; log(`first head pose: ${pose.views.length} views`); }
        const layer = session.renderState.baseLayer;
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        // A hue turning once every 6 s, as RGB (so it's plain the picture is live).
        const h = (time / 6000) % 1, f = k => 0.5 + 0.35 * Math.cos(2 * Math.PI * (h + k));
        gl.clearColor(f(0), f(1 / 3), f(2 / 3), 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        frames++;
      };
      session.requestAnimationFrame(frame);
    } catch (err) {
      log(`setup FAILED: ${err.name}: ${err.message}`);
      status(`VR started, then its setup failed (${err.name}). Copy the results and send them.`, 'bad');
      session.end().catch(() => {});
    }
  }

  enterBtn.addEventListener('click', enter);
  // Test 2: open YouTube's home page with the mark StreamXR looks for
  // (src/sites/youtube/ui/skip-helper.js autoEnterTest): it then asks the Skip Helper to click
  // its Enter VR target for real. No video, so VR starts on the placeholder screen.
  document.getElementById('auto').addEventListener('click', () => {
    log('Test 2: opened YouTube with #streamxr-autovr');
    window.open('https://www.youtube.com/#streamxr-autovr', '_blank');
  });
  document.getElementById('copy').addEventListener('click', async e => {
    const btn = e.currentTarget;
    try { await navigator.clipboard.writeText(`StreamXR WebXR check (${navigator.userAgent})\n${lines.join('\n')}`); btn.textContent = 'Copied ✓'; }
    catch (_) { btn.textContent = 'Copy failed'; }
    setTimeout(() => { btn.textContent = 'Copy results'; }, 1500);
  });
  preflight();
})();
