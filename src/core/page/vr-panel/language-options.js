// The "Language" settings tab, which belongs to the shell: the interface language (the
// words on the panels, buttons and popup; i18n.js), stepped with ◀ ▶ through "your
// browser's" and every language that has a string table, remembered, with a Default button
// back to the browser's. A site's Options panel includes it as one of its tabs.
//
//   ns.vrLanguageOptions.content() -> the Options style's 'rows' content
//   ns.vrLanguageOptions.event(ev) -> true if it was one of this tab's controls
//     ('prev:uiLang' / 'next:uiLang', 'button:uiLangDefault')
(function (ns) {
  'use strict';

  const tr = (key, vars) => ns.i18n.t(key, vars);

  // The choices in order: 'auto' (the browser's), then each language with a table.
  const choices = () => ['auto', ...ns.i18n.languages().map(l => l.id)];
  // What's chosen now ('auto' also when the stored language has no table any more).
  const chosen = () => (choices().includes(ns.i18n.choice()) ? ns.i18n.choice() : 'auto');

  const labelOf = id => (id === 'auto'
    ? tr('language.yourBrowser', { name: ns.i18n.nameOf(ns.i18n.browserLanguage()) })
    : ns.i18n.nameOf(id));

  function content() {
    return {
      kind: 'rows', note: tr('language.note'),
      rows: [
        { label: tr('language.language'), control: { type: 'stepper', id: 'uiLang', text: labelOf(chosen()) } },
        { label: '', control: { type: 'button', id: 'uiLangDefault', label: tr('language.default'), icon: 'restart_alt', enabled: chosen() !== 'auto' } },
      ],
    };
  }

  function event(ev) {
    const dir = ev.type === 'prev' ? -1 : ev.type === 'next' ? 1 : 0;
    if (dir && ev.value === 'uiLang') {
      const list = choices();
      ns.i18n.setChoice(list[(list.indexOf(chosen()) + dir + list.length) % list.length]);
    } else if (ev.type === 'button' && ev.value === 'uiLangDefault') ns.i18n.setChoice('auto');
    else return false;
    return true;
  }

  ns.vrLanguageOptions = { content, event };
})(globalThis.__streamxr = globalThis.__streamxr || {});
