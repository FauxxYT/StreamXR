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

  // Quick troubleshooting's checklist links: the WebXR samples (a quick test of the PC's VR
  // setup without StreamXR) and the project's new-issue page (a fork changes ISSUES_URL).
  const SAMPLES_URL = 'https://immersive-web.github.io/webxr-samples/';
  const ISSUES_URL = 'https://github.com/FauxxYT/StreamXR/issues/new/choose';
  const CHECK_LINKS = { 7: [SAMPLES_URL, 'trouble.samplesLink'], 8: [ISSUES_URL, 'trouble.issueLink'] };
  // One checklist item as HTML: its text escaped, its {link} (if any) a link opening in a new
  // tab, and its {copy} (if any) a small Copy details button (wired up in open()).
  function checkHtml(n) {
    const link = CHECK_LINKS[n], LINK = '\u0001', COPY = '\u0002';
    let text = esc(t(`trouble.check${n}`, { link: LINK, copy: COPY }));
    if (link) text = text.replace(LINK, `<a href="${link[0]}" target="_blank" rel="noopener noreferrer">${esc(t(link[1]))}</a>`);
    return text.replace(COPY, `<button class="streamxr-trouble-copy">${esc(t('popup.copy'))}</button>`);
  }

  // Quick troubleshooting's "Most likely issue", worked out from what Details shows (the
  // page world's diagnostics, diagnostics.js): { text, problem (something's wrong), gpu (a
  // line about the graphics card, or '') }. First match wins, from "StreamXR can't run" down
  // to "VR started, then failed".
  function likelyIssue(d) {
    const last = d.lastStart && typeof d.lastStart === 'object' ? d.lastStart : null;
    const failed = last && !last.ok;
    const issue = (key, vars) => ({ text: t(key, vars), problem: true });
    let out;
    if (d.timedOut) out = issue('trouble.noResponse');
    else if (!d.webxrAllowedHere) out = issue('trouble.blocked', { site: siteName() });
    else if (d.xrError === 'navigator.xr missing') out = issue('trouble.noWebxr');
    else if (d.xrNative && d.xrNative.native === false) out = issue('trouble.xrReplaced');   // another extension's WebXR in its place
    else if (d.xrError) out = issue('trouble.xrError', { error: d.xrError });
    // No headset: never seen since the page loaded (no runtime at all), or seen then gone.
    else if (!d.headsetFound) out = issue((d.timeline && d.timeline.foundAfter != null) || (d.deviceChanges && d.deviceChanges.count > 0) ? 'trouble.lost' : 'trouble.noRuntime');
    // Found, but the last Enter VR failed: by the error's kind.
    else if (failed && last.name === 'InvalidStateError') out = issue('trouble.busy');
    else if (failed && last.name === 'NotSupportedError') out = issue('trouble.lost');
    else if (failed && /^(SecurityError|NotAllowedError)$/.test(last.name)) out = issue('trouble.blockedStart');
    else if (failed) out = issue('trouble.failed', { error: `${last.name}: ${last.message}` });
    else out = { text: t(last ? 'trouble.okStarted' : 'trouble.ok'), problem: false };
    // With a problem, a word on the graphics card the browser draws with when it's the wrong
    // one on a two-GPU computer (the headset uses the other). Known for sure when WebGPU saw
    // two cards (d.gpus.twoGpus) and the drawing one is the low-power card's maker; without
    // that answer, guessed from the name (Intel, or AMD's "Radeon Graphics" without a model).
    const r = d.gpu && typeof d.gpu === 'object' ? String(d.gpu.renderer || '') : '';
    const g = d.gpus && typeof d.gpus === 'object' ? d.gpus : null;
    const maker = c => (c && c.vendor ? String(c.vendor).toLowerCase() : '');
    const onLow = g && g.twoGpus && maker(g.lowPower) && maker(g.lowPower) !== maker(g.highPerformance) &&
      r.toLowerCase().includes(maker(g.lowPower));
    const builtIn = /Intel|Radeon\(TM\) Graphics|Radeon Graphics/i.test(r) && !/NVIDIA|Radeon RX|Arc\b/i.test(r);
    // (its model from "ANGLE (Intel, Intel(R) UHD Graphics 620 (0x…) Direct3D11 …)")
    const name = r.replace(/^ANGLE \([^,]*,\s*/, '').replace(/\s*(\(0x|Direct3D|OpenGL|Vulkan|,).*$/, '') || r;
    out.gpu = !out.problem ? '' : onLow ? t('trouble.gpuTwo', { gpu: name })
      : builtIn && !(g && g.twoGpus === false) ? t('trouble.gpu', { gpu: name }) : '';
    return out;
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
    pop.innerHTML = `<div class="streamxr-body">${title()}<div class="streamxr-src">${esc(t('popup.reading'))}</div></div>`;
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
    pop.innerHTML = `<div class="streamxr-body">
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
      <details class="streamxr-trouble"><summary>${esc(t('trouble.title'))}</summary>
        <div class="streamxr-help">
          <div>${esc(t('trouble.likely'))}</div>
          <p class="streamxr-likely"></p><p class="streamxr-likely-gpu" hidden></p>
          <div>${esc(t('trouble.checklist'))}</div>
          <ol>${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<li>${checkHtml(n)}</li>`).join('')}</ol>
        </div>
      </details>
      <details class="streamxr-details"><summary>${esc(t('popup.details'))}</summary>
        <div class="streamxr-tools">
          <button class="streamxr-copy">${esc(t('popup.copy'))}</button>
          <button class="streamxr-frame">${esc(t('popup.saveFrame'))}</button>
        </div>
        <pre></pre>
      </details></div>`;
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
        browser: d.browser, gpu: d.gpu, gpus: d.gpus, xrNative: d.xrNative,
        projection: i.projection, stereo: i.stereo, spherical: i.spherical,
        video: i.video, videoAspect: aspectOf(i.video),
        webxrAllowedHere: d.webxrAllowedHere, headsetFound: d.headsetFound, xrError: d.xrError, passthrough: d.passthrough,
        vrActive: d.vrActive, lastStart: d.lastStart, deviceChanges: d.deviceChanges, timeline: d.timeline,
        checkedFrom: d.checkedFrom || (d.timedOut ? 'page script not responding' : '?'),
        headset: d.headset, controllerModels: d.controllerModels, controllers: d.controllers,
        warnings: d.warnings,
      }, null, 1);
      if (pre.textContent !== text) pre.textContent = text;        // keeps scroll position when unchanged
      renderTrouble(d);
    };
    // Quick troubleshooting's "Most likely issue", from the same diagnostics (opened at once
    // when something's wrong).
    const trouble = pop.querySelector('.streamxr-trouble');
    const likelyEl = pop.querySelector('.streamxr-likely'), gpuEl = pop.querySelector('.streamxr-likely-gpu');
    const renderTrouble = d => {
      const li = likelyIssue(d);
      if (likelyEl.textContent !== li.text) likelyEl.textContent = li.text;
      likelyEl.classList.toggle('problem', li.problem);
      gpuEl.textContent = li.gpu; gpuEl.hidden = !li.gpu;
    };
    renderDetails(info, diag);
    if (likelyIssue(diag).problem) trouble.open = true;

    // While Details or Quick troubleshooting is expanded, refresh them about once a second
    // (e.g. to watch button presses arrive while you're in VR, or the headset turn up once
    // SteamVR starts).
    const details = pop.querySelector('.streamxr-details');
    let refreshing = false;
    refreshTimer = setInterval(async () => {
      if (!pop || (!details.open && !trouble.open) || refreshing) return;
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
      else if (s.state === 'error') { setIdle(); showMsg(s.message || t('popup.stopped')); trouble.open = true; }   // (its likely issue follows at the next refresh)
      else if (s.state === 'format' && s.fmt) pop.querySelector('.streamxr-fmt').value = s.fmt;   // changed in VR
    };
    if (vrState === 'active') setActive();

    // Copy details: the Details text to the clipboard, the button saying how it went for a
    // moment. Two buttons do it: Details' own and Quick troubleshooting's (its last check),
    // so a report needs no look inside Details.
    const copyOn = btn => {
      btn.onclick = async () => {
        try { await navigator.clipboard.writeText(pre.textContent); btn.textContent = t('popup.copied'); }
        catch (_) { btn.textContent = t('popup.copyFailed'); }
        setTimeout(() => { btn.textContent = t('popup.copy'); }, 1500);
      };
    };
    copyOn(pop.querySelector('.streamxr-copy'));
    copyOn(pop.querySelector('.streamxr-trouble-copy'));
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
