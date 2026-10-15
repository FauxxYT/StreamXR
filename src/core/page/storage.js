// Remembered settings (the panel open above the controls, the chosen tabs, the cinema
// screen's size and curve ...), in the page's localStorage (this browser and site only),
// under the prefix 'streamxr.'. Settings saved under the project's earlier names
// ('streamvr.' as StreamVR until 0.48, 'ytvr.' before that) are picked up the first time
// they're read and moved over. Storage can be blocked: then reads give null and writes do
// nothing.
//
//   ns.storage.get(name) -> string | null      ns.storage.set(name, value)
//   ns.storage.getJSON(name) -> value | null   ns.storage.setJSON(name, value)
//   ns.storage.remove(name)                    (back to the default: reads give null)
(function (ns) {
  'use strict';

  const PREFIX = 'streamxr.', OLD_PREFIXES = ['streamvr.', 'ytvr.'];   // newest first

  function get(name) {
    try {
      const v = localStorage.getItem(PREFIX + name);
      if (v != null) return v;
      for (const old of OLD_PREFIXES) {                             // from before a rename
        const ov = localStorage.getItem(old + name);
        if (ov == null) continue;
        localStorage.setItem(PREFIX + name, ov);
        for (const o of OLD_PREFIXES) localStorage.removeItem(o + name);
        return ov;
      }
      return null;
    } catch (_) { return null; }                                    // storage blocked
  }

  function set(name, value) {
    try { localStorage.setItem(PREFIX + name, String(value)); } catch (_) { /* storage blocked */ }
  }

  function getJSON(name) {
    try { return JSON.parse(get(name) || 'null'); } catch (_) { return null; }
  }
  const setJSON = (name, value) => set(name, JSON.stringify(value));

  // Forget a setting (and its pre-rename copies, if any are left).
  function remove(name) {
    try { for (const p of [PREFIX, ...OLD_PREFIXES]) localStorage.removeItem(p + name); } catch (_) { /* storage blocked */ }
  }

  ns.storage = { get, set, getJSON, setJSON, remove };
})(globalThis.__streamxr = globalThis.__streamxr || {});
