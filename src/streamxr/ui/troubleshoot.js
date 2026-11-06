// Quick troubleshooting and Copy details, shared: the "Watch in VR" popup on a site's page
// (panel.js) uses them, and StreamXR Home and its toolbar popup will too (docs/Home-Page.md).
// Plain HTML pieces and text, from the page world's diagnostics (diagnostics.js check()) and,
// on a site's page, its video info. Words from the string tables (trouble.*, popup.*).
//
//   ns.troubleshoot.likelyIssue(diag, site) -> { text, problem, gpu }
//   ns.troubleshoot.sectionHtml() -> the folded section's inside (Most likely issue, checklist)
//   ns.troubleshoot.render(root, diag, site): fills root's Most likely issue from diag
//   ns.troubleshoot.detailsText(info, diag) -> Copy details' text (JSON)
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);
  // Text going into HTML (translations are text, never markup).
  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

  // The checklist's links: the WebXR samples (a quick test of the PC's VR setup without
  // StreamXR) and the project's new-issue page (a fork changes ISSUES_URL).
  const SAMPLES_URL = 'https://immersive-web.github.io/webxr-samples/';
  const ISSUES_URL = 'https://github.com/FauxxYT/StreamXR/issues/new/choose';
  const CHECK_LINKS = { 7: [SAMPLES_URL, 'trouble.samplesLink'], 8: [ISSUES_URL, 'trouble.issueLink'] };
  const CHECKS = 8;
  // One checklist item as HTML: its text escaped, its {link} (if any) a link opening in a new
  // tab, and its {copy} (if any) a small Copy details button (.streamxr-trouble-copy: the page
  // using it wires up its click).
  function checkHtml(n) {
    const link = CHECK_LINKS[n], LINK = '\u0001', COPY = '\u0002';
    let text = esc(t(`trouble.check${n}`, { link: LINK, copy: COPY }));
    if (link) text = text.replace(LINK, `<a href="${link[0]}" target="_blank" rel="noopener noreferrer">${esc(t(link[1]))}</a>`);
    return text.replace(COPY, `<button class="streamxr-trouble-copy">${esc(t('popup.copy'))}</button>`);
  }

  // The folded section's inside (it goes in a <details class="streamxr-trouble"> after its
  // summary): the Most likely issue (filled in by render()), then the numbered checklist.
  function sectionHtml() {
    return `<div class="streamxr-help">
        <div>${esc(t('trouble.likely'))}</div>
        <p class="streamxr-likely"></p><p class="streamxr-likely-gpu" hidden></p>
        <div>${esc(t('trouble.checklist'))}</div>
        <ol>${Array.from({ length: CHECKS }, (_, i) => `<li>${checkHtml(i + 1)}</li>`).join('')}</ol>
      </div>`;
  }

  // The "Most likely issue", worked out from the diagnostics: { text, problem (something's
  // wrong), gpu (a line about the graphics card, or '') }. First match wins, from "StreamXR
  // can't run" down to "VR started, then failed". `site`: the page's site name (for "blocked").
  function likelyIssue(d, site) {
    const last = d.lastStart && typeof d.lastStart === 'object' ? d.lastStart : null;
    const failed = last && !last.ok;
    const issue = (key, vars) => ({ text: t(key, vars), problem: true });
    let out;
    if (d.timedOut) out = issue('trouble.noResponse');
    else if (!d.webxrAllowedHere) out = issue('trouble.blocked', { site });
    else if (d.xrError === 'navigator.xr missing') out = issue('trouble.noWebxr');
    else if (d.xrNative && d.xrNative.native === false) out = issue('trouble.xrReplaced');   // another extension's WebXR in its place
    else if (d.xrError) out = issue('trouble.xrError', { error: d.xrError });
    // No headset: never seen since the page loaded (no runtime at all), or seen then gone.
    else if (!d.headsetFound) out = issue((d.timeline && d.timeline.foundAfter != null) || (d.deviceChanges && d.deviceChanges.count > 0) ? 'trouble.lost' : 'trouble.noRuntime');
    // Found, but the last Enter VR failed: by the error's kind. (Chrome answers NotSupportedError
    // too while another tab is already in VR: one session at a time.)
    else if (failed && (last.name === 'InvalidStateError' || last.name === 'NotSupportedError')) out = issue('trouble.busy');
    else if (failed && /^(SecurityError|NotAllowedError)$/.test(last.name)) out = issue('trouble.blockedStart');
    else if (failed) out = issue('trouble.failed', { error: `${last.name}: ${last.message}` });
    else out = { text: t(last ? 'trouble.okStarted' : 'trouble.ok'), problem: false };
    // With a problem, a word on the graphics card the browser draws with when it's the wrong
    // one on a two-GPU computer (the headset uses the other). Known for sure when WebGPU saw
    // two cards (d.gpus.twoGpus) and the drawing one is the low-power card's maker; without
    // that answer (always on Windows), guessed from the name (Intel, or AMD's "Radeon
    // Graphics" without a model).
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

  // Fill a section's Most likely issue (inside `root`, from sectionHtml()) from the
  // diagnostics; text only changes when it differs. Returns the issue.
  function render(root, d, site) {
    const li = likelyIssue(d, site);
    const likelyEl = root.querySelector('.streamxr-likely'), gpuEl = root.querySelector('.streamxr-likely-gpu');
    if (likelyEl.textContent !== li.text) likelyEl.textContent = li.text;
    likelyEl.classList.toggle('problem', li.problem);
    gpuEl.textContent = li.gpu; gpuEl.hidden = !li.gpu;
    return li;
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

  // Copy details' text: what the page world knows (the video's info, when there's a video
  // page, and the VR / headset / controller diagnostics), as JSON: what to send when
  // something doesn't work. `info` may be {} (no video page, e.g. Home).
  function detailsText(i, d) {
    return JSON.stringify({
      version: extensionVersion(),
      browser: d.browser, gpu: d.gpu, gpus: d.gpus, xrNative: d.xrNative,
      projection: i.projection, stereo: i.stereo, spherical: i.spherical,
      video: i.video, videoAspect: aspectOf(i.video),
      webxrAllowedHere: d.webxrAllowedHere, headsetFound: d.headsetFound, xrError: d.xrError, passthrough: d.passthrough,
      vrActive: d.vrActive, lastStart: d.lastStart, lastEnd: d.lastEnd, deviceChanges: d.deviceChanges, timeline: d.timeline,
      checkedFrom: d.checkedFrom || (d.timedOut ? 'page script not responding' : '?'),
      headset: d.headset, controllerModels: d.controllerModels, controllers: d.controllers,
      warnings: d.warnings,
    }, null, 1);
  }

  ns.troubleshoot = { likelyIssue, sectionHtml, render, detailsText };
})(globalThis.__streamxr = globalThis.__streamxr || {});
