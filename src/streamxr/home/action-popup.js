// StreamXR's toolbar popup (action-popup.html; docs/Home-Page.md): the headset's status,
// Open StreamXR Home, the sites (each opens in a new tab), a plain "More sites coming", and
// Quick troubleshooting folded, opened by itself when something's wrong. The pieces are
// home-ui.js's, shared with Home, so both behave the same.
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);
  const ui = ns.homeUi, esc = ui.esc;

  const pop = document.querySelector('.streamxr-pop');
  pop.innerHTML = `<div class="streamxr-body">
      <div class="streamxr-title">${ns.gogglesIcon.standalone()}${esc(t('home.name'))}</div>
      ${ui.statusHtml()}
      <button class="streamxr-go streamxr-open-home"><span>${esc(t('home.openHome'))}</span></button>
      <div class="streamxr-sites-label">${esc(t('home.sites'))}</div>
      ${ui.sitesHtml()}
      ${ui.troubleHtml()}
    </div>`;

  // Open StreamXR Home in a new tab (its page in this extension), then close the popup.
  pop.querySelector('.streamxr-open-home').addEventListener('click', () => {
    const url = chrome.runtime.getURL('src/streamxr/home/home.html');
    try { chrome.tabs.create({ url }); } catch (_) { window.open(url, '_blank'); }
    window.close();
  });
  ui.wireSites(pop, true);
  ui.watch(pop);
})(globalThis.__streamxr = globalThis.__streamxr || {});
