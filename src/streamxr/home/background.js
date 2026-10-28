// StreamXR's background script (manifest.json "background"; docs/Home-Page.md):
//   - opens StreamXR Home once, right after StreamXR is installed, with its first-run welcome
//     (home.html?welcome=1). Not on updates or reloads.
//   - opens a site for Home and the toolbar popup, remembering when VR is meant to start
//     there: the site's page then asks (src/streamxr/ui/auto-enter.js) and VR starts by
//     itself (the Skip Helper) or on the next key press or click. Only StreamXR's own pages can
//     ask to open a site, and a site's page only hears "yes" for the very tab opened that way,
//     once, within a minute: no web page or link can start VR.
// Opening a tab needs no permission.
'use strict';

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason !== 'install') return;
  chrome.tabs.create({ url: chrome.runtime.getURL('src/streamxr/home/home.html?welcome=1') });
});

const INTENT_MS = 60000;                     // how long a tab's "enter VR" waits to be asked for
const vrIntents = new Map();                 // tab id -> when it was opened with VR meant

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const type = msg && msg.type;
  // From StreamXR's own pages (Home, the toolbar popup): open `url` in a new tab, VR meant if
  // `vr`. -> { ok, tabId }
  if (type === 'streamxr-open-site') {
    // (a page of this extension's own, in a tab like Home or not like the toolbar popup:
    // content scripts on sites share the id but their url is the site's)
    const fromUs = sender.id === chrome.runtime.id && String(sender.url || '').startsWith(chrome.runtime.getURL(''));
    if (!fromUs || !/^https:\/\//.test(msg.url || '')) { reply({ ok: false }); return false; }
    chrome.tabs.create({ url: msg.url }).then(tab => {
      if (msg.vr) vrIntents.set(tab.id, Date.now());
      reply({ ok: true, tabId: tab.id });
    }, () => reply({ ok: false }));
    return true;                                                      // reply comes later
  }
  // From a site's page (StreamXR's content script): was this tab opened to enter VR? Answered
  // yes once (the intent is used up). -> { vr }
  if (type === 'streamxr-vr-intent') {
    const id = sender.tab && sender.tab.id, at = id != null ? vrIntents.get(id) : null;
    if (id != null) vrIntents.delete(id);
    reply({ vr: sender.id === chrome.runtime.id && at != null && Date.now() - at < INTENT_MS });
    return false;
  }
  return false;
});
chrome.tabs.onRemoved.addListener(id => vrIntents.delete(id));
