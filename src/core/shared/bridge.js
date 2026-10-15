// Messaging between the two halves of the extension.
//
// The extension runs in two JavaScript "worlds" on each supported site (e.g. youtube.com):
//   - page world (src/core/page/, src/sites/<site>/page/): the site's own context. WebXR
//     sees the headset here and the site's player lives here.
//   - isolated world (src/core/ui/, src/sites/<site>/ui/): the extension's sandbox. The
//     button and popup live here, because a site's Trusted Types policy (YouTube's) can
//     block innerHTML in the page world.
// The only channel between them is DOM events on `document`. Payloads are always JSON
// strings, never objects: strings cross between worlds unchanged in both Chromium and
// Firefox (objects would need cloneInto() in Firefox).
//
// This file is loaded into both worlds.
(function (ns) {
  'use strict';

  const EVENTS = Object.freeze({
    INFO_REQUEST: 'streamxr-request',       // ui -> page: what kind of video is this?
    INFO_RESPONSE: 'streamxr-response',     // page -> ui: { ok, title, keywords, projection, stereo, spherical, video }
    DIAG_REQUEST: 'streamxr-diag',          // ui -> page: is WebXR usable here?
    DIAG_RESPONSE: 'streamxr-diag-result',  // page -> ui: { webxrAllowedHere, headsetFound, xrError, controllers, ... }
    THEME_REQUEST: 'streamxr-theme',        // ui -> page: the site's Material 3 colours, for the popup
    THEME_RESPONSE: 'streamxr-theme-result',// page -> ui: { palette: { <M3 role>: '#rrggbb', brand, onBrand, ... } }
    ENTER: 'streamxr-enter',                // ui -> page: { fmt }  (must be sent inside the click handler)
    EXIT: 'streamxr-exit',                  // ui -> page
    STATE: 'streamxr-state',                // page -> ui: { state: 'started' | 'ended' | 'error', message? }
    CMD: 'streamxr-cmd',                    // any -> page: { action: 'toggle' } | { action: 'seek', delta }
    // (YouTube) Skip ad needs a real click, which only the optional "StreamXR Skip Helper"
    // extension can make (skip-helper/). The isolated world talks to it.
    HELPER_STATUS: 'streamxr-helper-status',            // page -> ui: is the Skip Helper installed?
    HELPER_STATUS_REPLY: 'streamxr-helper-status-reply',// ui -> page: { ok, version? }
    SKIP_AD: 'streamxr-skip-ad',                        // page -> ui: press the site's Skip ad button
    SKIP_AD_DONE: 'streamxr-skip-ad-done',              // ui -> page: { ok, error? }
  });

  // Send an event to the other world (and any listener in this one). `data` becomes JSON.
  function send(name, data) {
    document.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(data || {}) }));
  }

  // The JSON payload of an event as an object ({} if it's missing or broken).
  function parse(e) {
    try { return JSON.parse(e.detail || '{}'); } catch (_) { return {}; }
  }

  // Listen for an event; the handler gets the parsed payload. Returns an unsubscribe function.
  function on(name, handler) {
    const fn = e => handler(parse(e), e);
    document.addEventListener(name, fn);
    return () => document.removeEventListener(name, fn);
  }

  // Send a request and wait for its reply event. Resolves { ok: false, timedOut: true } on timeout.
  function ask(name, reply, data, timeout = 2500) {
    return new Promise(resolve => {
      let off = null;
      const timer = setTimeout(() => { off(); resolve({ ok: false, timedOut: true }); }, timeout);
      off = on(reply, payload => { clearTimeout(timer); off(); resolve(payload); });
      send(name, data);
    });
  }

  ns.bridge = { EVENTS, send, on, ask };
})(globalThis.__streamxr = globalThis.__streamxr || {});
