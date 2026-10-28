// Isolated world: talks to the optional "StreamXR Skip Helper" extension (skip-helper/),
// which presses YouTube's Skip ad button with a real click. YouTube ignores script clicks
// on it, and real input needs the debugger permission, which we keep out of this
// extension. Chromium-specific (chrome.runtime messaging to another extension); without
// the helper (or elsewhere) requests answer { ok: false }.
(function (ns) {
  'use strict';

  // The helper's extension ID: fixed by the "key" in skip-helper/manifest.json. Add the
  // Chrome Web Store ID here once it's published there.
  const HELPER_IDS = ['dbfmdfbpdpphbjnjlembolnmhnicbicm'];

  const { bridge } = ns;
  const E = bridge.EVENTS;

  // Send to the first helper ID that answers. Resolves { ok, ... } (never rejects).
  function toHelper(msg) {
    const runtime = globalThis.chrome && chrome.runtime;
    if (!runtime || !runtime.sendMessage) return Promise.resolve({ ok: false, error: 'not supported in this browser' });
    const tryId = i => new Promise(resolve => {
      if (i >= HELPER_IDS.length) { resolve({ ok: false, error: 'Skip Helper not installed' }); return; }
      try {
        runtime.sendMessage(HELPER_IDS[i], msg, res => {
          if (runtime.lastError || !res) resolve(tryId(i + 1));   // not installed / not answering
          else resolve(res);
        });
      } catch (_) { resolve(tryId(i + 1)); }
    });
    return tryId(0);
  }

  bridge.on(E.HELPER_STATUS, () => { toHelper({ type: 'streamxr-helper-ping' }).then(res => bridge.send(E.HELPER_STATUS_REPLY, res)); });
  bridge.on(E.SKIP_AD, () => { toHelper({ type: 'streamxr-skip-ad' }).then(res => bridge.send(E.SKIP_AD_DONE, res)); });

  // ---------------------------------------------------------------- auto Enter VR (test)
  // Test 2 for a StreamXR Home page (tools/xr-check/, docs/whats-left.md): can VR start on a
  // page opened from elsewhere, with no click of yours? VR only starts from real input, so
  // StreamXR puts a see-through target on the page (#streamxr-autoenter, top left) whose
  // click sends Enter VR as the popup's button does, and asks the Skip Helper to click it for
  // real (its debugger click). Only when the address ends in "#streamxr-autovr" (the test
  // page opens YouTube that way); the mark is taken off at once so a reload doesn't repeat it.
  // How it went: the console's "[streamxr] auto Enter VR" lines (this isolated world's
  // console: not in Details' warnings, which only hear the page world) and Details' lastStart.
  const AUTO_MARK = /(^|[#&])streamxr-autovr\b/;
  async function autoEnterTest() {
    if (!AUTO_MARK.test(location.hash)) return;
    history.replaceState(history.state, '', location.pathname + location.search);
    const say = text => console.warn(`[streamxr] auto Enter VR (test): ${text}`);
    const t0 = performance.now(), secs = () => ((performance.now() - t0) / 1000).toFixed(1);
    // Wait (up to 20 s) for the page script to answer with a headset found.
    let diag = null;
    while (performance.now() - t0 < 20000) {
      diag = await bridge.ask(E.DIAG_REQUEST, E.DIAG_RESPONSE, null, 1500);
      if (diag && diag.headsetFound) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!diag || !diag.headsetFound) { say(`no headset found after ${secs()} s; stopped`); return; }
    const info = await bridge.ask(E.INFO_REQUEST, E.INFO_RESPONSE, null, 2500);
    const fmt = info && info.ok && info.detected ? info.detected.fmt : null;   // (null: the default format)
    // The target: see-through, 48 px in the top-left corner, above everything; its click
    // (the helper's real one) sends Enter VR synchronously, inside the click.
    const target = document.createElement('button');
    target.id = 'streamxr-autoenter';
    target.setAttribute('aria-hidden', 'true');
    target.tabIndex = -1;
    target.style.cssText = 'position:fixed;left:0;top:0;width:48px;height:48px;margin:0;padding:0;border:0;opacity:0;z-index:2147483647;cursor:default;';
    target.addEventListener('click', () => { say(`target clicked at ${secs()} s; sending Enter VR`); bridge.send(E.ENTER, { fmt, passthrough: false }); }, { once: true });
    document.documentElement.appendChild(target);
    const off = bridge.on(E.STATE, s => {
      if (s.state === 'started') { say(`VR started at ${secs()} s`); off(); }
      else if (s.state === 'error') { say(`VR didn't start: ${s.message || '?'}`); off(); }
    });
    say(`headset found at ${secs()} s; asking the Skip Helper to click`);
    const res = await toHelper({ type: 'streamxr-enter-vr' });
    if (!res.ok) say(`Skip Helper: ${res.error || 'no answer'}`);
    setTimeout(() => { target.remove(); off(); }, 5000);
  }
  autoEnterTest();
})(globalThis.__streamxr = globalThis.__streamxr || {});
