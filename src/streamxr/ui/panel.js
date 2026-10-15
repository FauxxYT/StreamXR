// The "Watch in VR" panel: format picker, Enter/Exit VR, Controls (the help) and Details. It lives in the
// isolated world (it builds HTML, which a site's Trusted Types (YouTube's) can block in the page
// world) and asks the page world for everything about the video and VR over the bridge.
// Its words come from the string tables in the interface language (i18n.js, strings-*.js), its
// colours from the site's Material 3 palette (asked of the page world; popup.css).
(function (ns) {
  'use strict';

  const { bridge, formats, controls } = ns;
  const t = (key, vars) => ns.i18n.t(key, vars);
  const site = ns.site || { theme: {} };                      // the site's name and colours (sites/<site>/ui/site.js)
  const siteName = () => site.name || t('popup.thisSite');
  const E = bridge.EVENTS;
  // Text going into HTML (translations are text, never markup).
  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  let pop = null;                           // the panel's element while it's open
  let vrState = 'idle';                     // idle | starting | active
  let onStateUI = null;                     // updates the open panel when VR starts/ends/changes format

  // The page world reports VR session changes here (started, ended, error, format changed).
  bridge.on(E.STATE, s => {
    if (s.state === 'started') vrState = 'active';
    if (s.state === 'ended' || s.state === 'error') vrState = 'idle';
    if (onStateUI) onStateUI(s);
  });

  const isOpen = () => !!pop;

  let refreshTimer = null;                  // keeps the Details text live while it's expanded

  // The title row: the headset icon (in the brand colour, popup.css), then "Watch in VR".
  const title = () => `<div class="streamxr-title">${ns.gogglesIcon.standalone()}${esc(t('popup.title'))}</div>`;

  // The site's Material 3 palette (from the page world: { role: '#rrggbb' }) as the popup's
  // CSS variables --m3-<role> (popup.css). Anything that isn't a plain role name and colour
  // is skipped; with no palette, popup.css's fallbacks stay.
  function applyPalette(palette) {
    if (!pop || !palette) return;
    for (const [role, hex] of Object.entries(palette)) {
      if (/^[a-zA-Z]+$/.test(role) && /^#[0-9a-fA-F]{6}$/.test(hex)) pop.style.setProperty(`--m3-${role}`, hex);
    }
  }

  // Close the panel and stop its timers. (Entering VR closes it once VR has started; opened
  // again during VR, its button is "Exit VR".)
  function close() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    if (pop) { pop.remove(); pop = null; onStateUI = null; }
  }

  // The "See your room (passthrough)" checkbox, remembered in the page's localStorage under
  // the page world's storage.js name 'streamxr.passthrough' (so the global reset in VR can
  // clear it). Off unless chosen.
  const PASS_KEY = 'streamxr.passthrough';
  const readPassthrough = () => { try { return localStorage.getItem(PASS_KEY) === '1'; } catch (_) { return false; } };
  const writePassthrough = on => { try { localStorage.setItem(PASS_KEY, on ? '1' : '0'); } catch (_) { /* storage blocked */ } };

  // The "Glass panels" switch: the VR panels' glass look (Settings → Appearance in VR), the
  // same remembered setting, { on, tint } as JSON under the page world's storage.js name
  // 'streamxr.glass' (appearance-options.js reads it again when VR starts). On unless
  // switched off; the tint is kept as it is.
  const GLASS_KEY = 'streamxr.glass';
  function readGlass() {
    try { const g = JSON.parse(localStorage.getItem(GLASS_KEY)); return g && typeof g === 'object' ? { on: g.on !== false, tint: g.tint } : { on: true }; }
    catch (_) { return { on: true }; }
  }
  function writeGlass(on) {
    const g = readGlass();
    try { localStorage.setItem(GLASS_KEY, JSON.stringify(g.tint != null ? { on, tint: g.tint } : { on })); } catch (_) { /* storage blocked */ }
  }

  // Problems that mean Enter VR can't work, as a message for the user (or null).
  function blockingProblem(diag) {
    if (diag.timedOut) return t('popup.noResponse');
    if (!diag.webxrAllowedHere) return t('popup.blocked', { site: siteName() });
    if (!diag.headsetFound) return t('popup.noHeadset');
    return null;
  }

  // "3840x2160" -> "1.78:1" (helps tell mono 360 = 2:1, top/bottom 360 = 1:1, side-by-side 360 = 4:1 apart).
  function aspectOf(size) {
    const m = /^(\d+)x(\d+)$/.exec(size || '');
    return m && +m[2] ? `${(+m[1] / +m[2]).toFixed(2)}:1` : null;
  }

  // Extension version from the manifest, if the runtime API is reachable (it is in Chromium and Firefox).
  function extensionVersion() {
    try {
      const rt = (globalThis.browser && globalThis.browser.runtime) || (globalThis.chrome && globalThis.chrome.runtime);
      return rt.getManifest().version;
    } catch (_) { return null; }
  }

  // Download the raw video frame as the site delivers it, at full size, so the actual
  // layout (one image, top/bottom or side-by-side; equirectangular or cubemap) can be seen.
  // Returns an error message, or null on success.
  function saveVideoFrame(playerEl) {
    const video = playerEl.querySelector('video.html5-main-video') || playerEl.querySelector('video');
    if (!video || !video.videoWidth) return t('popup.noFrame');
    try {
      const cv = document.createElement('canvas');
      cv.width = video.videoWidth; cv.height = video.videoHeight;
      cv.getContext('2d').drawImage(video, 0, 0);
      cv.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `streamxr-frame-${cv.width}x${cv.height}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      }, 'image/png');
      return null;
    } catch (err) {
      return t('popup.frameFailed', { error: err && err.message });
    }
  }

  // Open (or, if already open, close) the panel: inside the player element (its button in
  // the player, player-button.js), or with opts.fixed under the button `anchor` outside it
  // (the top bar's, topbar-button.js). Shows "Reading video info..." at once, asks the page
  // world about the video and VR, then fills in the format picker (preselected from format
  // detection; with no video playing, a line saying VR opens without one instead), the Enter
  // VR button, the help list and Details.
  async function open(anchor, opts = {}) {
    if (pop) { close(); return; }
    const playerEl = opts.fixed ? null : anchor;
    ns.i18n.refresh();                        // the language may have been changed in VR (the page world)
    pop = document.createElement('div');
    pop.className = 'streamxr-pop';
    // The brand colour at once (the site's accent); the rest of the palette when the page
    // world answers (popup.css has neutral fallbacks until then).
    if (site.theme && site.theme.accent) pop.style.setProperty('--m3-brand', site.theme.accent);
    if (site.theme && site.theme.onAccent) pop.style.setProperty('--m3-onBrand', site.theme.onAccent);
    pop.addEventListener('click', e => e.stopPropagation());
    pop.innerHTML = `${title()}<div class="streamxr-src">${esc(t('popup.reading'))}</div>`;
    if (playerEl) playerEl.appendChild(pop);
    else {
      const r = anchor.getBoundingClientRect();
      pop.classList.add('streamxr-pop-fixed');
      pop.style.top = `${Math.round(r.bottom + 8)}px`;
      pop.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
      document.body.appendChild(pop);
    }

    const [info, diag, theme] = await Promise.all([
      bridge.ask(E.INFO_REQUEST, E.INFO_RESPONSE),
      bridge.ask(E.DIAG_REQUEST, E.DIAG_RESPONSE),
      bridge.ask(E.THEME_REQUEST, E.THEME_RESPONSE),
    ]);
    if (!pop) return;
    applyPalette(theme && theme.palette);
    const det = info.ok && info.detected ? info.detected : { fmt: formats.DEFAULT, isSpatial: false };   // the page world's provider picked it
    // No video playing (e.g. the Home page, opened from the top bar): VR starts anyway (the
    // site's logo on the screen until you pick a video in VR); the format picker isn't needed.
    const noVideo = info.hasVideo === false;
    const srcText = noVideo ? t('popup.noVideo', { site: siteName() })
      : det.isSpatial ? t('popup.spatial', { site: siteName() }) : t('popup.regular');
    // Passthrough: offered only when the browser has a see-through session for this headset
    // (diagnostics: passthrough.immersiveAr); otherwise greyed out, saying why.
    const arOffered = !!(diag.passthrough && diag.passthrough.immersiveAr === true);
    const arWanted = readPassthrough();
    pop.innerHTML = `
      ${title()}
      <div class="streamxr-field"${noVideo ? ' hidden' : ''}><label>${esc(t('popup.format'))}</label>
        <select class="streamxr-fmt">${formats.IDS.map(k =>
          `<option value="${k}" ${k === det.fmt ? 'selected' : ''}>${esc(formats.label(k))}</option>`).join('')}</select></div>
      <div class="streamxr-src">${esc(srcText)}</div>
      <label class="streamxr-switch${arOffered ? '' : ' off'}"${arOffered ? '' : ` title="${esc(t('popup.passthroughNotYet'))}"`}>
        <span>${esc(t('popup.passthrough'))}</span>
        <input type="checkbox" role="switch" class="streamxr-pass-box" ${arOffered && arWanted ? 'checked' : ''} ${arOffered ? '' : 'disabled'}><i></i></label>
      ${arOffered ? '' : `<div class="streamxr-switch-note">${esc(t('popup.passthroughNotYet'))}</div>`}
      <label class="streamxr-switch"><span>${esc(t('popup.glass'))}</span>
        <input type="checkbox" role="switch" class="streamxr-glass-box" ${readGlass().on ? 'checked' : ''}><i></i></label>
      <div class="streamxr-switch-note">${esc(t('popup.glassNote'))}</div>
      <button class="streamxr-go">${ns.gogglesIcon.standalone()}<span>${esc(t('popup.enter'))}</span></button>
      <div class="streamxr-msg" hidden></div>
      <details class="streamxr-controls"><summary>${esc(t('popup.controls'))}</summary><div class="streamxr-help"></div></details>
      <details class="streamxr-details"><summary>${esc(t('popup.details'))}</summary>
        <div class="streamxr-tools">
          <button class="streamxr-copy">${esc(t('popup.copy'))}</button>
          <button class="streamxr-frame">${esc(t('popup.saveFrame'))}</button>
        </div>
        <pre></pre>
      </details>`;
    // Help list built with createElement/textContent (not innerHTML) from the shared bindings.
    const help = pop.querySelector('.streamxr-help');
    const heading = document.createElement('div');
    heading.textContent = t('help.heading');
    help.appendChild(heading);
    const list = document.createElement('ul');
    for (const line of controls.helpLines()) {
      const li = document.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    }
    help.appendChild(list);
    // Details = what the page world knows (video info + VR/headset/controller diagnostics),
    // as JSON for "Copy details" - what to send when something doesn't work.
    const pre = pop.querySelector('pre');
    const renderDetails = (i, d) => {
      const text = JSON.stringify({
        version: extensionVersion(),
        projection: i.projection, stereo: i.stereo, spherical: i.spherical,
        video: i.video, videoAspect: aspectOf(i.video),
        webxrAllowedHere: d.webxrAllowedHere, headsetFound: d.headsetFound, xrError: d.xrError, passthrough: d.passthrough,
        checkedFrom: d.checkedFrom || (d.timedOut ? 'page script not responding' : '?'),
        headset: d.headset, controllerModels: d.controllerModels, controllers: d.controllers,
      }, null, 1);
      if (pre.textContent !== text) pre.textContent = text;        // keeps scroll position when unchanged
    };
    renderDetails(info, diag);

    // While Details is expanded, refresh it about once a second (e.g. to watch button
    // presses arrive while you're in VR).
    const details = pop.querySelector('.streamxr-details');
    let refreshing = false;
    refreshTimer = setInterval(async () => {
      if (!pop || !details.open || refreshing) return;
      refreshing = true;
      try {
        const [i, d] = await Promise.all([
          bridge.ask(E.INFO_REQUEST, E.INFO_RESPONSE, null, 900),
          bridge.ask(E.DIAG_REQUEST, E.DIAG_RESPONSE, null, 900),
        ]);
        if (pop && !d.timedOut) renderDetails(i.ok ? i : info, d);
      } finally { refreshing = false; }
    }, 1000);

    // The main button: "Enter VR" -> "Starting..." -> (VR started: the panel closes) and, opened
    // during VR, "Exit VR"; following the page world's reports. An error keeps it open, saying why.
    const go = pop.querySelector('.streamxr-go');
    const msg = pop.querySelector('.streamxr-msg');
    const showMsg = t => { msg.textContent = t; msg.hidden = false; };
    const label = go.querySelector('span');                       // the text beside the headset icon
    const setIdle = () => { go.disabled = false; label.textContent = t('popup.enter'); };
    const setActive = () => { go.disabled = false; label.textContent = t('popup.exit'); };

    onStateUI = s => {
      if (s.state === 'started') { setActive(); close(); }           // in VR: out of the way (reopen it for Exit VR)
      else if (s.state === 'ended') setIdle();
      else if (s.state === 'error') { setIdle(); showMsg(s.message || t('popup.stopped')); }
      else if (s.state === 'format' && s.fmt) pop.querySelector('.streamxr-fmt').value = s.fmt;   // changed in VR
    };
    if (vrState === 'active') setActive();

    const copyBtn = pop.querySelector('.streamxr-copy');
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(pre.textContent); copyBtn.textContent = t('popup.copied'); }
      catch (_) { copyBtn.textContent = t('popup.copyFailed'); }
      setTimeout(() => { copyBtn.textContent = t('popup.copy'); }, 1500);
    };
    const frameBtn = pop.querySelector('.streamxr-frame');
    frameBtn.onclick = () => {
      const msgText = saveVideoFrame(playerEl || document.getElementById('movie_player') || document.body);
      if (msgText) showMsg(msgText);
    };

    // If VR can't work at all (no headset, WebXR blocked...), say why and disable the button.
    const problem = blockingProblem(diag);
    if (problem) { go.disabled = true; showMsg(problem); }

    const passBox = pop.querySelector('.streamxr-pass-box');
    passBox.onchange = () => writePassthrough(passBox.checked);
    const glassBox = pop.querySelector('.streamxr-glass-box');
    glassBox.onchange = () => writeGlass(glassBox.checked);       // used from the next Enter VR

    go.onclick = () => {
      if (vrState === 'active') { bridge.send(E.EXIT); return; }
      msg.hidden = true;
      go.disabled = true;
      label.textContent = t('popup.starting');
      vrState = 'starting';
      // Sent synchronously inside the click, so the page script still has the user gesture.
      bridge.send(E.ENTER, { fmt: pop.querySelector('.streamxr-fmt').value, passthrough: arOffered && passBox.checked });
    };
  }

  ns.panel = { open, close, isOpen };
})(globalThis.__streamxr = globalThis.__streamxr || {});
