// StreamXR's background script (manifest.json "background"; docs/Home-Page.md):
//   - opens StreamXR Home once, right after StreamXR is installed, with its first-run welcome
//     (home.html?welcome=1). Not on updates or reloads.
//   - opens a site for Home and the toolbar popup, remembering when VR is meant to start
//     there: the site's page then asks (src/streamxr/ui/auto-enter.js) and VR starts by
//     itself (the Skip Helper) or on the next key press or click. Only StreamXR's own pages can
//     ask to open a site, and a site's page only hears "yes" for the very tab opened that way,
//     once, within a minute: no web page or link can start VR.
//   - tells StreamXR (the Dashboard, a site's "Watch in VR" popup) whether VR is running in
//     another tab, and ends it there when asked (Chrome allows one VR session at a time:
//     src/streamxr/ui/vr-elsewhere.js).
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
  // From StreamXR (the Dashboard, or a site's "Watch in VR" popup): is VR running in another
  // tab? Chrome allows one VR session at a time. Asks every site tab (those with StreamXR's
  // content scripts answer: src/streamxr/ui/vr-presence.js; the rest fail quietly) and
  // StreamXR's own pages (the Dashboard answers while its Test VR runs: home.js); the asking
  // tab doesn't count. -> { tabId, title } | { tabId: null }
  if (type === 'streamxr-vr-where') {
    if (sender.id !== chrome.runtime.id) { reply({ tabId: null }); return false; }
    const self = sender.tab ? sender.tab.id : null;
    const sites = chrome.tabs.query({}).then(tabs => Promise.all(tabs.filter(tab => tab.id !== self).map(tab =>
      chrome.tabs.sendMessage(tab.id, { type: 'streamxr-vr-ask' }).then(r => (r && r.active ? { tabId: tab.id, title: r.title || '' } : null), () => null))));
    const ours = chrome.runtime.sendMessage({ type: 'streamxr-vr-ask' })                   // (only a page in VR answers)
      .then(r => (r && r.active && typeof r.tabId === 'number' && r.tabId !== self ? { tabId: r.tabId, title: r.title || '' } : null), () => null);
    Promise.all([sites, ours]).then(([found, page]) => reply(found.find(Boolean) || page || { tabId: null }), () => reply({ tabId: null }));
    return true;                                                      // reply comes later
  }
  // From StreamXR: end VR in that tab ("Exit VR there"): a site's tab, else StreamXR's own page
  // in that tab (the Dashboard). -> { ok }
  if (type === 'streamxr-vr-exit-tab') {
    if (sender.id !== chrome.runtime.id || typeof msg.tabId !== 'number') { reply({ ok: false }); return false; }
    const page = () => chrome.runtime.sendMessage({ type: 'streamxr-vr-exit', tabId: msg.tabId }).then(r => !!(r && r.ok), () => false);
    chrome.tabs.sendMessage(msg.tabId, { type: 'streamxr-vr-exit' }).then(r => !!(r && r.ok), () => false)
      .then(ok => (ok ? true : page())).then(ok => reply({ ok }), () => reply({ ok: false }));
    return true;
  }
  return false;
});
chrome.tabs.onRemoved.addListener(id => vrIntents.delete(id));
