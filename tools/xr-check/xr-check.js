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

  // Test 3 (a key press brings VR back): while `rearm`, each session's end arms the page to
  // enter VR again on the next real key press or click (any, anywhere), e.g. a controller
  // button mapped to a keyboard key in Steam Input. `waiting`: armed, nothing pressed yet.
  let rearm = false, waiting = false, round = 0, endedAt = 0, inVr = false;   // (inVr: a session is running)

  // Enter VR (from a click or, in Test 3, a key press): a WebGL canvas made XR-compatible, a
  // 'local' space, and a frame loop clearing to a hue that turns once every 6 s. Ends on the
  // trigger or after 15 s.
  async function enter() {
    enterBtn.disabled = true;
    let session;
    try {
      session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
      inVr = true;
      log('requestSession: OK, session started');
      status('VR started. Look in the headset.', 'ok');
    } catch (err) {
      log(`requestSession FAILED: ${err.name}: ${err.message}`);
      status(`Couldn’t start VR (${err.name}). Copy the results and send them.`, 'bad');
      enterBtn.disabled = false;
      // (re-armed only when no session runs: a press while in VR isn't a new try)
      if (rearm && !inVr) { waiting = true; endedAt = performance.now(); log('Test 3: armed again (try another press)'); }
      return;
    }
    let endedBy = 'ended by SteamVR or the browser', frames = 0;
    session.addEventListener('visibilitychange', () => log(`visibility: ${session.visibilityState}`));
    session.addEventListener('select', () => { endedBy = 'trigger pressed'; session.end(); });
    session.addEventListener('end', () => {
      inVr = false;
      log(`session ended (${endedBy}); frames drawn: ${frames}`);
      enterBtn.disabled = false;
      if (rearm) {
        waiting = true; endedAt = performance.now();
        log(`Test 3: armed; page focused: ${document.hasFocus()}; waiting for a key press or click`);
        status('Test 3: out of VR. Press any key (e.g. the space bar) or click to go back in.', '');
        return;
      }
      if (frames > 0) status(`It works: VR ran on this page (${frames} frames). Copy the results and send them.`, 'ok');
      else status('VR started but drew nothing. Copy the results and send them.', 'bad');
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

  // Test 3: start (the first session from this click), then every real key press or click
  // while armed re-enters VR right inside its event (that input is what lets VR start). Logs
  // what arrived (which key, from what), keys pressed while in VR, and the page's focus.
  const t3Btn = document.getElementById('t3'), t3Stop = document.getElementById('t3stop');
  t3Btn.addEventListener('click', () => {
    // (once running, Start does nothing: a Space or Enter on it while it had focus restarted
    // the test before; and it gives up focus so later key presses go to the test itself)
    t3Btn.blur();
    if (rearm) return;
    rearm = true; round = 0; t3Stop.disabled = false;
    log('Test 3: started');
    enter();
  });
  t3Stop.addEventListener('click', () => {
    rearm = false; waiting = false; t3Stop.disabled = true;
    log('Test 3: stopped');
    status('Test 3 stopped. Copy the results and send them.', '');
  });
  function onInput(e) {
    if (!rearm) return;
    if (e.target === t3Btn || e.target === t3Stop || (e.target.closest && e.target.closest('#t3, #t3stop'))) return;
    const what = e.type === 'keydown' ? `key "${e.key}" (code ${e.code})` : `${e.type} (${e.pointerType || 'mouse'})`;
    if (!waiting) { log(`Test 3: ${what} while not armed (in VR or starting): ignored`); return; }
    // (a Space or Enter would also press the focused button, starting VR twice: not this time)
    if (e.type === 'keydown') e.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    waiting = false; round++;
    log(`Test 3, round ${round}: ${what}, trusted: ${e.isTrusted}, ${((performance.now() - endedAt) / 1000).toFixed(1)} s after VR ended; entering VR`);
    enter();
  }
  window.addEventListener('keydown', onInput, true);
  window.addEventListener('pointerdown', onInput, true);
  window.addEventListener('focus', () => { if (rearm) log('Test 3: page got focus'); });
  window.addEventListener('blur', () => { if (rearm) log('Test 3: page lost focus'); });
  // Test 2: open YouTube's home page the way StreamXR Home does with "Enter VR when a site
  // opens" on (through StreamXR's background, src/streamxr/home/background.js): StreamXR's
  // page there (src/streamxr/ui/auto-enter.js) asks the Skip Helper to click its Enter VR
  // target for real, or asks for a key press or click without it. No video, so VR starts on
  // the placeholder screen.
  document.getElementById('auto').addEventListener('click', () => {
    try {
      chrome.runtime.sendMessage({ type: 'streamxr-open-site', url: 'https://www.youtube.com/', vr: true }, res => {
        log(`Test 2: ${!chrome.runtime.lastError && res && res.ok ? `opened YouTube (tab ${res.tabId}) with VR meant` : 'couldn’t ask StreamXR to open YouTube'}`);
      });
    } catch (err) { log(`Test 2: couldn’t ask StreamXR (${err.message})`); }
  });
  document.getElementById('copy').addEventListener('click', async e => {
    const btn = e.currentTarget;
    try { await navigator.clipboard.writeText(`StreamXR WebXR check (${navigator.userAgent})\n${lines.join('\n')}`); btn.textContent = 'Copied ✓'; }
    catch (_) { btn.textContent = 'Copy failed'; }
    setTimeout(() => { btn.textContent = 'Copy results'; }, 1500);
  });
  preflight();
})();
