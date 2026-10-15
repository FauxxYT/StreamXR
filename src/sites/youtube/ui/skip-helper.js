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
})(globalThis.__streamxr = globalThis.__streamxr || {});
