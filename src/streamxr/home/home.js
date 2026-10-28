// StreamXR Home (home.html; docs/Home-Page.md), on the desktop: a title, the first-run welcome
// (only when opened with ?welcome=1, i.e. by background.js right after install; "Got it" puts
// it away), the headset's status and Quick troubleshooting, the sites, and the version. The
// status, sites and troubleshooting are home-ui.js's, shared with the toolbar popup.
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);
  const ui = ns.homeUi, esc = ui.esc;
  const welcome = new URLSearchParams(location.search).has('welcome');
  let version = '';
  try { version = chrome.runtime.getManifest().version; } catch (_) { /* not in the extension */ }

  document.title = t('home.pageTitle');
  const root = document.querySelector('.streamxr-home');
  root.innerHTML = `<div class="streamxr-body">
      <header class="streamxr-title">${ns.gogglesIcon.standalone()}${esc(t('home.pageTitle'))}</header>
      <p class="streamxr-lede">${esc(t('home.lede'))}</p>
      ${welcome ? `<section class="streamxr-welcome" aria-labelledby="streamxr-welcome-title">
        <h2 id="streamxr-welcome-title">${esc(t('home.welcomeTitle'))}</h2>
        <ol>${['home.welcome1', 'home.welcome2', 'home.welcome3'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ol>
        <button class="streamxr-welcome-done">${esc(t('home.welcomeDone'))}</button>
      </section>` : ''}
      <section aria-labelledby="streamxr-headset-title">
        <h2 id="streamxr-headset-title">${esc(t('home.headset'))}</h2>
        ${ui.statusHtml()}
        ${ui.troubleHtml()}
      </section>
      <section aria-labelledby="streamxr-sites-title">
        <h2 id="streamxr-sites-title">${esc(t('home.sites'))}</h2>
        ${ui.sitesHtml()}
      </section>
      <footer class="streamxr-version">${version ? esc(t('home.version', { version })) : ''}</footer>
    </div>`;

  // "Got it": the welcome goes, and the address loses ?welcome so a reload doesn't bring it back.
  const done = root.querySelector('.streamxr-welcome-done');
  if (done) {
    done.addEventListener('click', () => {
      root.querySelector('.streamxr-welcome').remove();
      history.replaceState(null, '', location.pathname);
    });
  }
  ui.wireSites(root, false);
  ui.watch(root);
})(globalThis.__streamxr = globalThis.__streamxr || {});
