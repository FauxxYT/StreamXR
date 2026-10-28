// StreamXR's toolbar popup (action-popup.html; docs/Home-Page.md): the headset's status, the
// sites (each opens in a new tab; nothing here names one: they come from ns.homeSites), a
// plain "More sites coming", and Quick troubleshooting folded (troubleshoot.js), opened by
// itself when something's wrong, with its Copy details. The diagnostics run right here
// (diagnostics.js check(): this page can ask WebXR itself), again every 2 s while it's open.
// Opening a tab needs no permission (chrome.tabs.create), so StreamXR keeps none.
(function (ns) {
  'use strict';

  const t = (key, vars) => ns.i18n.t(key, vars);
  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  // Material Symbols (Rounded; Apache 2.0, third_party/material-symbols/LICENSE): Play Arrow
  // for a site's mark, Chevron Right for its row's arrow (24 px grid, viewBox 0 -960 960 960).
  const PLAY = 'M320-273v-414q0-17 12-28.5t28-11.5q5 0 10.5 1.5T381-721l326 207q9 6 13.5 15t4.5 19q0 10-4.5 19T707-446L381-239q-5 3-10.5 4.5T360-233q-16 0-28-11.5T320-273Z';
  const CHEVRON = 'M504-480 348-636q-11-11-11-28t11-28q11-11 28-11t28 11l184 184q6 6 8.5 13t2.5 15q0 8-2.5 15t-8.5 13L404-268q-11 11-28 11t-28-11q-11-11-11-28t11-28l156-156Z';
  const svg = (d, cls) => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 -960 960 960" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;

  const pop = document.querySelector('.streamxr-pop');
  const sites = ns.homeSites.all();
  pop.innerHTML = `<div class="streamxr-body">
      <div class="streamxr-title">${ns.gogglesIcon.standalone()}${esc(t('home.name'))}</div>
      <div class="streamxr-status" role="status">${esc(t('home.statusChecking'))}</div>
      <div class="streamxr-sites-label">${esc(t('home.sites'))}</div>
      ${sites.map(s => `<button class="streamxr-site" data-site="${esc(s.id)}">
        <i class="streamxr-site-mark" data-color="${/^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#5f5f5f'}">${
          /^https:\/\//.test(s.icon || '') ? `<img alt="" src="${esc(s.icon)}">` : svg(PLAY)}</i>
        <span>${esc(t('home.openSite', { site: s.name }))}</span>${svg(CHEVRON, 'streamxr-site-arrow')}</button>`).join('')}
      <div class="streamxr-more">${esc(t('home.moreSites'))}</div>
      <details class="streamxr-trouble"><summary>${esc(t('trouble.title'))}</summary>
        ${ns.troubleshoot.sectionHtml()}
      </details>
    </div>`;

  // Each site's mark: its own icon on a plain tile, or (no icon, or it can't load: offline,
  // moved) the play mark on the site's color.
  pop.querySelectorAll('.streamxr-site-mark').forEach(mark => {
    const plain = () => { mark.classList.add('plain'); mark.style.background = mark.dataset.color; mark.innerHTML = svg(PLAY); };
    const img = mark.querySelector('img');
    if (!img) { plain(); return; }
    img.addEventListener('error', plain, { once: true });
  });

  // A site's row: open it in a new tab, then close the popup (Chrome closes it anyway once
  // the new tab takes focus).
  pop.querySelectorAll('.streamxr-site').forEach(btn => {
    btn.addEventListener('click', () => {
      const site = sites.find(s => s.id === btn.dataset.site);
      if (!site) return;
      try { chrome.tabs.create({ url: site.url }); } catch (_) { window.open(site.url, '_blank', 'noopener'); }
      window.close();
    });
  });

  // The status line and Quick troubleshooting from the diagnostics; the section opens by
  // itself the first time something's wrong (after that it stays as you leave it).
  // A newly opened page doesn't see the headset at once: Chrome answers "none" for a few
  // seconds, then reports its VR devices changed (seen 2026-10-28). So "no headset" only
  // counts once that report came or after GRACE_MS; until then the status says it's still
  // looking (neutral, troubleshooting left folded), checked every 0.5 s instead of 2 s.
  const GRACE_MS = 8000;
  const statusEl = pop.querySelector('.streamxr-status');
  const trouble = pop.querySelector('.streamxr-trouble');
  const shownAt = performance.now();
  let lastDiag = null, opened = false;
  async function refresh() {
    const d = await ns.diagnostics.check();
    lastDiag = d;
    const looking = !d.headsetFound && !(d.deviceChanges && d.deviceChanges.count > 0) &&
      performance.now() - shownAt < GRACE_MS && !d.xrError && d.webxrAllowedHere !== false;
    const li = ns.troubleshoot.render(trouble, d, '');
    const text = looking ? t('home.statusChecking') : !li.problem ? t('home.statusReady')
      : d.headsetFound ? t('home.statusProblem') : t('home.statusNone');
    if (statusEl.textContent !== text) statusEl.textContent = text;
    statusEl.className = `streamxr-status${looking ? '' : li.problem ? ' bad' : ' ok'}`;
    if (li.problem && !looking && !opened) { opened = true; trouble.open = true; }
    setTimeout(refresh, looking ? 500 : 2000);
  }
  refresh();

  // Quick troubleshooting's Copy details: the same text as the site popup's (no video here).
  const copyBtn = pop.querySelector('.streamxr-trouble-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(ns.troubleshoot.detailsText({}, lastDiag || {})); copyBtn.textContent = t('popup.copied'); }
      catch (_) { copyBtn.textContent = t('popup.copyFailed'); }
      setTimeout(() => { copyBtn.textContent = t('popup.copy'); }, 1500);
    });
  }
})(globalThis.__streamxr = globalThis.__streamxr || {});
