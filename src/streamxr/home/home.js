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
        <div class="streamxr-test">
          <button class="streamxr-test-vr" disabled>${ns.gogglesIcon.standalone()}<span>${esc(t('home.testVr'))}</span></button>
          <p>${esc(t('home.testVrNote'))}</p>
        </div>
        <div class="streamxr-msg" hidden></div>
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

  // Test VR: the real shell with Home's provider (home-provider.js: the logo on the screen,
  // the controls panel, a "Your setup" panel), started right inside the click (WebXR needs
  // the click's user activation: xr-session.js asks for the session before any wait). Usable
  // once a headset is found; "Exit VR" while a session runs; a failure shows why, opens
  // Quick troubleshooting and is noted for Copy details (diagnostics' lastStart).
  const testBtn = root.querySelector('.streamxr-test-vr'), label = testBtn.querySelector('span');
  const msg = root.querySelector('.streamxr-msg'), trouble = root.querySelector('.streamxr-trouble');
  let headsetFound = false;
  const setIdle = () => { label.textContent = t('home.testVr'); testBtn.disabled = !headsetFound; };
  testBtn.addEventListener('click', () => {
    if (ns.xrSession.isActive()) { ns.xrSession.end(); return; }
    msg.hidden = true;
    testBtn.disabled = true;
    ns.xrSession.start(ns.homeProvider, ns.formats.DEFAULT, s => {
      if (s.state === 'ended') setIdle();
      else if (s.state === 'error') { setIdle(); msg.textContent = s.message || ''; msg.hidden = !s.message; }
    }, { passthrough: false })
      .then(() => { ns.diagnostics.noteStart(null); label.textContent = t('home.exitVr'); testBtn.disabled = false; })
      .catch(err => {
        ns.diagnostics.noteStart(err);
        const named = err && err.name && err.name !== 'Error' ? `${err.name}: ${err.message}` : err && err.message;
        msg.textContent = t('vr.cantStart', { error: named });
        msg.hidden = false;
        trouble.open = true;
        setIdle();
      });
  });
  ui.watch(root, ({ diag }) => {
    headsetFound = !!diag.headsetFound;
    if (!ns.xrSession.isActive() && label.textContent === t('home.testVr')) testBtn.disabled = !headsetFound;
  });
})(globalThis.__streamxr = globalThis.__streamxr || {});
