// The pieces StreamXR Home and its toolbar popup share (docs/Home-Page.md), so both look and
// behave the same: the headset's status line, the sites list (from ns.homeSites; nothing here
// names a site), and Quick troubleshooting (troubleshoot.js) kept up to date from the
// diagnostics, which run right on these pages (diagnostics.js check(): an extension page can
// ask WebXR itself). Opening a site's tab needs no permission (chrome.tabs.create).
//
//   ns.homeUi.statusHtml()          the status line (filled in by watch())
//   ns.homeUi.sitesHtml()           the sites' rows, then a plain "More sites coming"
//   ns.homeUi.troubleHtml()         Quick troubleshooting, folded (<details>)
//   ns.homeUi.wireSites(root, close) makes the rows open their site (then close this page if `close`)
//   ns.homeUi.watch(root, onState)  checks the headset again and again and fills root's status
//                                   and troubleshooting; onState({ state, diag }) on each check,
//                                   state 'looking' | 'ready' | 'problem' | 'none'
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);
  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  // Material Symbols (Rounded; Apache 2.0, third_party/material-symbols/LICENSE): Play Arrow
  // for a site's plain mark, Chevron Right for its row's arrow (viewBox 0 -960 960 960).
  const PLAY = 'M320-273v-414q0-17 12-28.5t28-11.5q5 0 10.5 1.5T381-721l326 207q9 6 13.5 15t4.5 19q0 10-4.5 19T707-446L381-239q-5 3-10.5 4.5T360-233q-16 0-28-11.5T320-273Z';
  const CHEVRON = 'M504-480 348-636q-11-11-11-28t11-28q11-11 28-11t28 11l184 184q6 6 8.5 13t2.5 15q0 8-2.5 15t-8.5 13L404-268q-11 11-28 11t-28-11q-11-11-11-28t11-28l156-156Z';
  const svg = (d, cls) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 -960 960 960" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;

  const statusHtml = () => `<div class="streamxr-status" role="status">${esc(t('home.statusChecking'))}</div>`;

  // One row per site: its mark (its own icon, from the site, or a plain play mark on its
  // color: wireSites() swaps it in if the icon can't load), "Open <site>", an arrow.
  function sitesHtml() {
    return ns.homeSites.all().map(s => `<button class="streamxr-site" data-site="${esc(s.id)}">
        <i class="streamxr-site-mark" data-color="${/^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#5f5f5f'}">${
          /^https:\/\//.test(s.icon || '') ? `<img alt="" src="${esc(s.icon)}">` : svg(PLAY)}</i>
        <span>${esc(t('home.openSite', { site: s.name }))}</span>${svg(CHEVRON, 'streamxr-site-arrow')}</button>`).join('')
      + `<div class="streamxr-more">${esc(t('home.moreSites'))}</div>`;
  }

  const troubleHtml = () => `<details class="streamxr-trouble"><summary>${esc(t('trouble.title'))}</summary>
      ${ns.troubleshoot.sectionHtml()}
    </details>`;

  // The rows' marks (the plain one when there's no icon or it can't load: offline, moved)
  // and their clicks: a new tab with the site, then, with `close` (the toolbar popup),
  // close this page (not Home: a tab a script opened would really close).
  function wireSites(root, close) {
    root.querySelectorAll('.streamxr-site-mark').forEach(mark => {
      const plain = () => { mark.classList.add('plain'); mark.style.background = mark.dataset.color; mark.innerHTML = svg(PLAY); };
      const img = mark.querySelector('img');
      if (!img) plain();
      else img.addEventListener('error', plain, { once: true });
    });
    root.querySelectorAll('.streamxr-site').forEach(btn => {
      btn.addEventListener('click', () => {
        const site = ns.homeSites.all().find(s => s.id === btn.dataset.site);
        if (!site) return;
        try { chrome.tabs.create({ url: site.url }); } catch (_) { window.open(site.url, '_blank', 'noopener'); }
        if (close) window.close();
      });
    });
  }

  // Check the headset now and again, filling root's status line and Quick troubleshooting
  // (opened by itself the first time something's wrong; after that it stays as you leave it),
  // and wire troubleshooting's Copy details. A newly opened page doesn't see the headset at
  // once: Chrome answers "none" for a few seconds, then reports its VR devices changed (seen
  // 2026-10-28). So "no headset" only counts once that report came or after GRACE_MS; until
  // then the status says it's still looking (neutral, troubleshooting folded), checked every
  // 0.5 s instead of 2 s.
  const GRACE_MS = 8000;
  function watch(root, onState) {
    const statusEl = root.querySelector('.streamxr-status');
    const trouble = root.querySelector('.streamxr-trouble');
    const shownAt = performance.now();
    let lastDiag = null, opened = false;
    async function refresh() {
      const d = await ns.diagnostics.check();
      lastDiag = d;
      const looking = !d.headsetFound && !(d.deviceChanges && d.deviceChanges.count > 0) &&
        performance.now() - shownAt < GRACE_MS && !d.xrError && d.webxrAllowedHere !== false;
      const li = ns.troubleshoot.render(trouble, d, '');
      const state = looking ? 'looking' : !li.problem ? 'ready' : d.headsetFound ? 'problem' : 'none';
      const text = t({ looking: 'home.statusChecking', ready: 'home.statusReady', problem: 'home.statusProblem', none: 'home.statusNone' }[state]);
      if (statusEl.textContent !== text) statusEl.textContent = text;
      statusEl.className = `streamxr-status${looking ? '' : li.problem ? ' bad' : ' ok'}`;
      if (li.problem && !looking && !opened) { opened = true; trouble.open = true; }
      if (onState) onState({ state, diag: d });
      setTimeout(refresh, looking ? 500 : 2000);
    }
    refresh();
    // Copy details (in the last check): the same text as the site popup's (no video here).
    const copyBtn = trouble.querySelector('.streamxr-trouble-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(ns.troubleshoot.detailsText({}, lastDiag || {})); copyBtn.textContent = t('popup.copied'); }
        catch (_) { copyBtn.textContent = t('popup.copyFailed'); }
        setTimeout(() => { copyBtn.textContent = t('popup.copy'); }, 1500);
      });
    }
  }

  ns.homeUi = { statusHtml, sitesHtml, troubleHtml, wireSites, watch, esc };
})(globalThis.__streamxr = globalThis.__streamxr || {});
