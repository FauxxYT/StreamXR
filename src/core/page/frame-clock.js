// Waits that keep time in VR. While you're in the headset Chrome can treat the page as
// hidden and hold its timers back (a 150 ms wait might take a second, or a minute), but the
// VR session's frame loop keeps running: it calls tick() every frame, and a wait ends at
// whichever comes first, its timer or the first frame after its time. Outside VR it's an
// ordinary timer. Anything that waits during a VR session (site code too) should use this.
//
//   await ns.frameClock.sleep(ms)      resolves after about `ms` milliseconds
//   ns.frameClock.after(ms, fn)        runs fn after about `ms` milliseconds
//   ns.frameClock.tick()               the VR frame loop, once per frame (xr-session.js)
(function (ns) {
  'use strict';

  const waiting = new Set();            // { at (performance.now() time), resolve }

  function end(w) {
    if (!waiting.delete(w)) return;     // already ended (the other way)
    w.resolve();
  }

  function sleep(ms) {
    return new Promise(resolve => {
      const w = { at: performance.now() + ms, resolve };
      waiting.add(w);
      setTimeout(() => end(w), ms);
    });
  }

  const after = (ms, fn) => { sleep(ms).then(fn); };

  function tick() {
    if (!waiting.size) return;
    const now = performance.now();
    for (const w of [...waiting]) if (now >= w.at) end(w);
  }

  ns.frameClock = { sleep, after, tick };
})(globalThis.__streamxr = globalThis.__streamxr || {});
