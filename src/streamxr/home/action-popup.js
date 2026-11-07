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
      ${ui.CROSS_PAGE_VR ? `<button class="streamxr-home-vr">${ns.gogglesIcon.standalone()}<span>${esc(t('home.enterHomeVr'))}</span></button>` : ''}
      <div class="streamxr-sites-label">${esc(t('home.sites'))}</div>
      ${ui.sitesHtml()}
      <div class="streamxr-switch-note streamxr-enter-note"></div>
      ${ui.troubleHtml()}
      ${ns.languagePicker.html()}
    </div>`;
  ns.languagePicker.bind(pop, () => location.reload());    // (the popup again, in the new language)

  // Open StreamXR Home (the Dashboard) in a new tab, then close the popup; "Enter Dashboard in
  // VR" opens it with ?vr=1: Home then asks for any key press or click to enter VR (a click
  // here can't start VR in another tab, and the Skip Helper can't click on StreamXR's pages).
  const openHome = query => () => {
    const url = chrome.runtime.getURL(`src/streamxr/home/home.html${query}`);
    try { chrome.tabs.create({ url }); } catch (_) { window.open(url, '_blank'); }
    window.close();
  };
  pop.querySelector('.streamxr-open-home').addEventListener('click', openHome(''));
  const homeVr = pop.querySelector('.streamxr-home-vr');               // (hidden for now: home-ui.js CROSS_PAGE_VR)
  if (homeVr) homeVr.addEventListener('click', openHome('?vr=1'));
  ui.wireSites(pop, true);
  ui.renderEnterNote(pop.querySelector('.streamxr-enter-note'));   // (what opening a site will do; the switch is on Home)
  ui.watch(pop);
})(globalThis.__streamxr = globalThis.__streamxr || {});
