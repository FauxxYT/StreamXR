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
        ${ns.vrElsewhere.noteHtml()}
        <div class="streamxr-msg" hidden></div>
        ${ui.troubleHtml()}
      </section>
      <section aria-labelledby="streamxr-sites-title">
        <h2 id="streamxr-sites-title">${esc(t('home.sites'))}</h2>
        ${ui.CROSS_PAGE_VR ? `<label class="streamxr-switch"><span>${esc(t('home.enterOnOpen'))}</span>
          <input type="checkbox" role="switch" class="streamxr-enter-box" ${ui.enterOnOpen() ? 'checked' : ''}><i></i></label>
        <div class="streamxr-switch-note streamxr-enter-note"></div>` : ''}
        ${ui.sitesHtml()}
      </section>
      ${ns.languagePicker.html()}
      <footer class="streamxr-version">${version ? esc(t('home.version', { version })) : ''}</footer>
    </div>`;
  ns.languagePicker.bind(root, () => location.reload());   // (the Dashboard again, in the new language)

  // "Got it": the welcome goes, and the address loses ?welcome so a reload doesn't bring it back.
  const done = root.querySelector('.streamxr-welcome-done');
  if (done) {
    done.addEventListener('click', () => {
      root.querySelector('.streamxr-welcome').remove();
      history.replaceState(null, '', location.pathname);
    });
  }
  ui.wireSites(root, false);
  // "Enter VR when a site opens", and its note (what opening a site will do: by itself with
  // the Skip Helper, a key press or click without it, or nothing when off), checked again
  // whenever the page comes back into view (the Skip Helper may have been installed since).
  // (hidden for now with the rest of cross-page VR: home-ui.js CROSS_PAGE_VR)
  const enterBox = root.querySelector('.streamxr-enter-box'), enterNote = root.querySelector('.streamxr-enter-note');
  if (enterBox) {
    enterBox.addEventListener('change', () => { ui.setEnterOnOpen(enterBox.checked); ui.renderEnterNote(enterNote); });
    ui.renderEnterNote(enterNote);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ui.renderEnterNote(enterNote); });
  }

  // Test VR: the real shell with Home's provider (home-provider.js: the logo on the screen,
  // the controls panel, a "Your setup" panel), started right inside the click (WebXR needs
  // the click's user activation: xr-session.js asks for the session before any wait). Usable
  // once a headset is found; "Exit VR" while a session runs; a failure shows why, opens
  // Quick troubleshooting and is noted for Copy details (diagnostics' lastStart).
  const testBtn = root.querySelector('.streamxr-test-vr'), label = testBtn.querySelector('span');
  const msg = root.querySelector('.streamxr-msg'), trouble = root.querySelector('.streamxr-trouble');
  let headsetFound = false;
  const setIdle = () => { label.textContent = t('home.testVr'); testBtn.disabled = !headsetFound || !!elsewhere; };

  // VR running in another tab (Chrome allows one VR session at a time; vr-elsewhere.js):
  // { tabId, title } or null, checked with each headset check. While it is, Test VR is greyed
  // out and a note names that tab, with "Exit VR there"; Chrome's refusal then isn't mistaken
  // for a lost headset.
  let elsewhere = null;
  const busy = root.querySelector('.streamxr-busy');
  function findElsewhere() {
    return ns.vrElsewhere.find().then(found => {
      elsewhere = ns.xrSession.isActive() ? null : found;     // (our own VR running: it's this tab's)
      if (elsewhere) msg.hidden = true;
      ns.vrElsewhere.show(busy, elsewhere);
      if (!ns.xrSession.isActive() && label.textContent === t('home.testVr')) testBtn.disabled = !headsetFound || !!elsewhere;
      return elsewhere;
    });
  }
  busy.querySelector('.streamxr-busy-exit').addEventListener('click', () => {
    if (elsewhere) ns.vrElsewhere.exit(elsewhere.tabId).then(() => setTimeout(findElsewhere, 300));
  });

  // This page's side of it: while Test VR runs, answer StreamXR's background (asked for
  // another tab: a site's popup) with this tab, and end Test VR when asked to there.
  let myTabId = null;
  try { chrome.tabs.getCurrent(tab => { myTabId = tab ? tab.id : null; }); } catch (_) { /* not in the extension */ }
  try {
    chrome.runtime.onMessage.addListener((m, sender, reply) => {
      if (sender.id !== chrome.runtime.id || !m || myTabId == null || !ns.xrSession.isActive()) return false;   // (not in VR: let another answer)
      if (m.type === 'streamxr-vr-ask') { reply({ active: true, tabId: myTabId, title: document.title }); return false; }
      if (m.type === 'streamxr-vr-exit' && m.tabId === myTabId) { ns.xrSession.end(); reply({ ok: true }); return false; }
      return false;
    });
  } catch (_) { /* not in the extension */ }
  testBtn.addEventListener('click', () => {
    if (ns.xrSession.isActive()) { ns.xrSession.end(); return; }
    startVr();
  });
  // Start Test VR (inside a click or key press: VR needs that real input).
  function startVr() {
    msg.hidden = true;
    testBtn.disabled = true;
    ns.xrSession.start(ns.homeProvider, ns.formats.DEFAULT, s => {
      if (s.state === 'ended') setIdle();
      else if (s.state === 'error') { setIdle(); msg.textContent = s.message || ''; msg.hidden = !s.message; }
    }, { passthrough: false })
      .then(() => { ns.diagnostics.noteStart(null); label.textContent = t('home.exitVr'); testBtn.disabled = false; })
      .catch(err => findElsewhere().then(found => {
        setIdle();
        if (found) return;                     // VR is in another tab: the note says so, nothing's wrong
        ns.diagnostics.noteStart(err);
        const named = err && err.name && err.name !== 'Error' ? `${err.name}: ${err.message}` : err && err.message;
        msg.textContent = t('vr.cantStart', { error: named });
        msg.hidden = false;
        trouble.open = true;
      }));
  }

  // Opened with ?vr=1 ("Enter Dashboard in VR" in the toolbar popup): a full-page layer (the
  // same as on a site opened from here: popup.css .streamxr-enter-layer) saying "Getting VR
  // ready…" until a headset is found, then "Press any key or click anywhere to enter VR": that
  // input starts VR here (Chrome needs real input in this page). Esc cancels. The address
  // loses ?vr so a reload doesn't bring it back.
  let vrLayer = null;
  if (ui.CROSS_PAGE_VR && new URLSearchParams(location.search).has('vr')) {   // (hidden for now)
    history.replaceState(null, '', location.pathname + (welcome ? '?welcome=1' : ''));
    vrLayer = document.createElement('div');
    vrLayer.className = 'streamxr-enter-layer';
    vrLayer.setAttribute('role', 'dialog');
    vrLayer.innerHTML = `<div class="streamxr-enter-card">${ns.gogglesIcon.standalone()}<b>${esc(t('auto.getting'))}</b><span>${esc(t('home.vrLayerNote'))}</span></div>`;
    document.body.appendChild(vrLayer);
    const closeLayer = () => {
      if (!vrLayer) return;
      vrLayer.remove(); vrLayer = null;
      window.removeEventListener('keydown', onLayerInput, true);
      window.removeEventListener('pointerdown', onLayerInput, true);
    };
    function onLayerInput(e) {
      if (!vrLayer) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keydown' && e.key === 'Escape') { closeLayer(); return; }
      if (!headsetFound || ns.xrSession.isActive()) return;
      closeLayer();
      startVr();
    }
    window.addEventListener('keydown', onLayerInput, true);
    window.addEventListener('pointerdown', onLayerInput, true);
  }

  ui.watch(root, ({ state, diag }) => {
    headsetFound = !!diag.headsetFound;
    if (!ns.xrSession.isActive() && label.textContent === t('home.testVr')) testBtn.disabled = !headsetFound || !!elsewhere;
    findElsewhere();
    // (the layer's line: ready once a headset is found; what's wrong once it's clear there's none)
    if (vrLayer) {
      const b = vrLayer.querySelector('b');
      const text = headsetFound ? t('auto.ready') : state === 'looking' ? t('auto.getting') : t('auto.noHeadset');
      if (b.textContent !== text) b.textContent = text;
    }
  });
})(globalThis.__streamxr = globalThis.__streamxr || {});
