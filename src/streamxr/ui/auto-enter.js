// Entering VR on a site's page opened from StreamXR Home or its toolbar popup with VR meant
// (docs/Home-Page.md, step 5). Isolated world. On load it asks StreamXR's background
// (src/streamxr/home/background.js) whether this very tab was opened that way: only StreamXR's
// own pages can ask for that, so no web page or link can start VR. If so:
//   - while the headset is being found: a full-page layer, "Getting VR ready…";
//   - then, with the site's helper (ns.siteHelper.enterVr: YouTube's Skip Helper), "Starting VR
//     in 3…2…1" (Esc cancels; any other key or a click starts at once), then "Starting
//     VR…" and the helper clicks StreamXR's see-through target (#streamxr-autoenter) for real;
//   - without it (or if it fails): "Press any key or click anywhere to enter VR". Chrome only
//     starts VR from real input in this page, and any key press or click counts (tools/xr-check/
//     Test 3; a click when Chrome lost keyboard focus, e.g. after the SteamVR dashboard).
// Either way Enter VR is sent inside that input (bridge ENTER, as the popup's button does).
// Esc cancels. Knows nothing about any site (the helper comes from the site's ui/ files).
(function (ns) {
  'use strict';

  const { bridge } = ns;
  const E = bridge.EVENTS;
  const t = (key, vars) => ns.i18n.t(key, vars);
  const READY_WAIT_MS = 20000;               // how long to wait for a headset
  const COUNTDOWN = 3;                       // seconds counted down before the helper's click (Esc cancels)
  const GRACE_MS = 3000;                     // how long after VR started Esc still leaves it again

  function ask() {
    const rt = globalThis.chrome && chrome.runtime;
    if (!rt || !rt.sendMessage) return;
    try {
      rt.sendMessage({ type: 'streamxr-vr-intent' }, res => {
        if (rt.lastError || !res || !res.vr) return;
        run();
      });
    } catch (_) { /* extension reloaded: nothing to do */ }
  }

  async function run() {
    ns.i18n.refresh();
    let entered = false, done = false;
    // The layer: over the whole page, a card in the middle (popup.css .streamxr-enter-layer).
    const layer = document.createElement('div');
    layer.className = 'streamxr-enter-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-live', 'polite');
    layer.innerHTML = `<div class="streamxr-enter-card">${ns.gogglesIcon.standalone()}<b></b><span></span></div>`;
    const title = layer.querySelector('b'), note = layer.querySelector('span');
    const show = (text, sub) => { title.textContent = text; note.textContent = sub || ''; };
    show(t('auto.getting'), t('auto.note'));
    document.documentElement.appendChild(layer);

    let target = null, ready = false, offState = null;
    function finish() {
      done = true;
      layer.remove();
      if (target) target.remove();
      window.removeEventListener('keydown', onInput, true);
      window.removeEventListener('pointerdown', onInput, true);
      if (offState) offState();
    }
    // Esc: the layer goes; and if Enter VR already went out (the Skip Helper clicks within a
    // second or so, before VR has started), VR is left again as soon as it starts.
    function cancel() {
      const wasEntered = entered;
      finish();
      if (!wasEntered) return;
      const off = bridge.on(E.STATE, s => {
        if (s.state === 'started') bridge.send(E.EXIT);
        if (s.state !== 'format') off();
      });
      setTimeout(off, 10000);                            // (never mind if it never starts)
    }
    // Enter VR, inside the real input that called this (once).
    let fmt = null;
    function enter() {
      if (entered || done) return;
      entered = true;
      bridge.send(E.ENTER, { fmt, passthrough: false });
    }
    // Any key or click: Esc cancels; anything else enters VR once the headset is found.
    function onInput(e) {
      if (done) return;
      if (e.type === 'keydown' && e.key === 'Escape') { e.preventDefault(); cancel(); return; }
      if (!ready) return;
      e.preventDefault(); e.stopPropagation();
      enter();
    }
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('pointerdown', onInput, true);
    // VR started: the layer goes. For GRACE_MS more, Esc still leaves VR again (it can arrive
    // just after VR started, the layer already gone).
    offState = bridge.on(E.STATE, s => {
      if (s.state === 'started') {
        finish();
        const late = e => { if (e.key === 'Escape') { e.preventDefault(); bridge.send(E.EXIT); stop(); } };
        const stop = () => window.removeEventListener('keydown', late, true);
        window.addEventListener('keydown', late, true);
        setTimeout(stop, GRACE_MS);
      }
      else if (s.state === 'error' && !done) { entered = false; show(t('auto.ready'), s.message || ''); }   // (try again)
    });

    // Wait for a headset (the page world's diagnostics).
    const t0 = performance.now();
    let diag = null;
    while (!done && performance.now() - t0 < READY_WAIT_MS) {
      diag = await bridge.ask(E.DIAG_REQUEST, E.DIAG_RESPONSE, null, 1500);
      if (diag && diag.headsetFound) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (done) return;
    if (!diag || !diag.headsetFound) { show(t('auto.noHeadset'), t('auto.cancelNote')); return; }
    const info = await bridge.ask(E.INFO_REQUEST, E.INFO_RESPONSE, null, 2500);
    fmt = info && info.ok && info.detected ? info.detected.fmt : null;   // (null: the default format)
    ready = true;

    // The site's helper, if any: its real click on the see-through target (48 px, top left,
    // above the layer) enters VR. Without one, or if it fails, the layer asks for a key or click.
    const helper = ns.siteHelper && ns.siteHelper.enterVr &&
      (!ns.siteHelper.available || await ns.siteHelper.available());   // (installed and answering)
    if (done || entered) return;
    if (helper) {
      // First a short countdown ("Starting VR in 3…"), so Esc has a real chance to cancel
      // before the helper clicks (any other key or a click starts VR at once).
      for (let n = COUNTDOWN; n > 0; n--) {
        show(t('auto.startingIn', { n }), t('auto.note'));
        await new Promise(r => setTimeout(r, 1000));
        if (done || entered) return;
      }
      show(t('auto.starting'), t('auto.note'));
      target = document.createElement('button');
      target.id = 'streamxr-autoenter';
      target.setAttribute('aria-hidden', 'true');
      target.tabIndex = -1;
      target.style.cssText = 'position:fixed;left:0;top:0;width:48px;height:48px;margin:0;padding:0;border:0;opacity:0;z-index:2147483647;cursor:default;';
      target.addEventListener('click', enter);
      document.documentElement.appendChild(target);
      const res = await ns.siteHelper.enterVr();
      if (done) return;
      if (target) { target.remove(); target = null; }
      // (the click is in: 'started' closes the layer; if nothing came of it in 3 s, ask for a key)
      if (res && res.ok) await new Promise(r => setTimeout(r, 3000));
      if (done || entered) return;
    }
    show(t('auto.ready'), t('auto.note'));
  }

  ask();
})(globalThis.__streamxr = globalThis.__streamxr || {});
