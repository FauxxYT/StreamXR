// Whether VR is running in this tab, for StreamXR's own pages (the Dashboard): Chrome allows
// one VR session at a time, so the Dashboard's Test VR can't start while a site's tab is in VR,
// and Chrome's refusal looks like a lost headset. The Dashboard asks through StreamXR's
// background (background.js, 'streamxr-vr-where'), which asks every tab; this answers for this
// one (isolated world: it follows the page world's session reports over the bridge) and can
// end its VR when asked ('streamxr-vr-exit'). Only messages from StreamXR itself are answered.
(function (ns) {
  'use strict';

  const { bridge } = ns;
  const E = bridge.EVENTS;
  let active = false;                       // VR running in this tab now

  bridge.on(E.STATE, s => {
    if (s.state === 'started') active = true;
    else if (s.state === 'ended' || s.state === 'error') active = false;
  });

  const rt = globalThis.chrome && chrome.runtime;
  if (!rt || !rt.onMessage) return;
  rt.onMessage.addListener((msg, sender, reply) => {
    if (sender.id !== rt.id || !msg) return false;
    // -> { active, title (the tab's, to name it) }
    if (msg.type === 'streamxr-vr-ask') { reply({ active, title: document.title }); return false; }
    // -> { ok } (VR asked to end here)
    if (msg.type === 'streamxr-vr-exit') { if (active) bridge.send(E.EXIT); reply({ ok: active }); return false; }
    return false;
  });
})(globalThis.__streamxr = globalThis.__streamxr || {});
