// "VR is running in another tab": Chrome allows one VR session at a time, so starting VR while
// another tab (a site's, or the Dashboard's Test VR) is in VR fails with an error that looks
// like a lost headset. StreamXR's pages that start VR (a site's "Watch in VR" popup, the
// Dashboard) ask StreamXR's background (background.js) which tab is in VR, say so in a neutral
// note, and offer "Exit VR there". A tab answers for itself: a site's through vr-presence.js, the
// Dashboard through home.js. Loaded in the isolated world on sites and on the Dashboard.
//
//   ns.vrElsewhere.find() -> Promise of { tabId, title } (another tab in VR) or null
//   ns.vrElsewhere.exit(tabId) -> Promise of bool (VR asked to end there)
//   ns.vrElsewhere.noteHtml() -> the note's HTML (hidden; popup.css .streamxr-busy)
//   ns.vrElsewhere.show(note, found) -> fills and shows the note for `found`, or hides it
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);
  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const rt = () => (globalThis.chrome && chrome.runtime && chrome.runtime.sendMessage ? chrome.runtime : null);

  // Send `msg` to the background; resolves its answer, or null when it can't be reached.
  function ask(msg) {
    const r = rt();
    if (!r) return Promise.resolve(null);
    return new Promise(resolve => {
      try { r.sendMessage(msg, res => resolve(r.lastError ? null : res || null)); }
      catch (_) { resolve(null); }                       // (extension reloaded: this page's old code)
    });
  }

  const find = () => ask({ type: 'streamxr-vr-where' }).then(res => (res && typeof res.tabId === 'number' ? res : null));
  const exit = tabId => ask({ type: 'streamxr-vr-exit-tab', tabId }).then(res => !!(res && res.ok));

  const noteHtml = () => `<div class="streamxr-busy" hidden><span></span><button class="streamxr-busy-exit">${esc(t('home.exitThere'))}</button></div>`;

  // The note's text names the tab (its title, when known); hidden when nothing else is in VR.
  function show(note, found) {
    if (found) {
      const text = found.title ? t('home.vrElsewhere', { title: found.title }) : t('home.vrElsewhereTab');
      const span = note.querySelector('span');
      if (span.textContent !== text) span.textContent = text;
    }
    note.hidden = !found;
  }

  ns.vrElsewhere = { find, exit, noteHtml, show };
})(globalThis.__streamxr = globalThis.__streamxr || {});
