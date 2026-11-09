// The interface language, settable outside VR too (not only in VR's Settings → Language), so a
// language you can't read is never a dead end: a picker for the site's "Watch in VR" popup
// (panel.js), the toolbar popup and the StreamXR Dashboard. 'auto' (the browser's) first, then
// each language with a table, every one named in itself ("English", "Español"), under a 🌐 that
// reads in any language. It's the same remembered choice as VR's (i18n.js,
// 'streamxr.language' in that page's storage: a site's tabs share one, StreamXR's own pages
// another).
//
//   ns.languagePicker.html()             the field (a label and a <select class="streamxr-lang">)
//   ns.languagePicker.bind(root, done)   remember a new pick and call done() (to redraw in it)
(function (ns) {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function html() {
    const now = ns.i18n.choice();
    const auto = ns.i18n.t('language.yourBrowser', { name: ns.i18n.nameOf(ns.i18n.browserLanguage()) });
    const options = [['auto', auto], ...ns.i18n.languages().map(l => [l.id, l.name])];
    const chosen = options.some(o => o[0] === now) ? now : 'auto';
    return `<div class="streamxr-field streamxr-lang-field"><label>🌐 ${esc(ns.i18n.t('language.language'))}</label>
      <select class="streamxr-lang">${options.map(([id, name]) =>
        `<option value="${esc(id)}" ${id === chosen ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div>`;
  }

  function bind(root, done) {
    const sel = root && root.querySelector('.streamxr-lang');
    if (sel) sel.onchange = () => { ns.i18n.setChoice(sel.value); if (done) done(); };
  }

  ns.languagePicker = { html, bind };
})(globalThis.__streamxr = globalThis.__streamxr || {});
