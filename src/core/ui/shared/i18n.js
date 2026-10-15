// GENERATED from src/core/shared/i18n.js by tools/sync-shared.js - edit that file, not this one.
// Translations: every word StreamXR shows comes from a string table, looked up by key in
// the interface language. Loaded into both worlds (before the string tables and everything
// that shows text). How to add a language: CONTRIBUTING.md, "Translating".
//
//   ns.i18n.add(lang, strings)   a string table: { key: text }; called by each strings-<lang>.js
//                                file (the shell's and each site's add to the same language)
//   ns.i18n.t(key, vars)         the text for `key` in the interface language, with {name}
//                                placeholders filled from `vars`. A text can also be a set of
//                                plural forms ({ one, other, few, many, ... }), picked by
//                                vars.n with the language's plural rules.
//   ns.i18n.languages()          [{ id, name }]: the languages with a table, named in themselves
//   ns.i18n.choice()             'auto' (the browser's language) or a language id
//   ns.i18n.setChoice(id)        remembered (localStorage 'streamxr.language', shared by both worlds)
//   ns.i18n.current()            the language in use (a choice, or the browser's best match)
//   ns.i18n.browserLanguage()    what 'auto' gives
//   ns.i18n.refresh()            re-read the choice (the other world may have changed it)
//   ns.i18n.version()            changes whenever the language or the tables do (for redraw keys)
//
// Lookup order: the language (e.g. 'pt-BR'), its base ('pt'), then English, so a partial
// translation still shows everything. A key missing from English too shows as the key
// itself (and is logged once), so it's easy to spot.
(function (ns) {
  'use strict';

  const BASE = 'en';                          // the complete table every other one falls back to
  const STORE = 'streamxr.language';          // localStorage name (storage.js's 'language')
  const OLD_STORE = 'streamvr.language';      // its name before the rename to StreamXR (0.49)
  const tables = {};                          // language id -> { key: text | plural forms }
  const warned = new Set();
  let chosen = 'auto', resolved = null, ver = 0;

  // The stored choice (moved over from its old name the first time).
  function read() {
    try {
      const v = localStorage.getItem(STORE);
      if (v != null) return v;
      const old = localStorage.getItem(OLD_STORE);
      if (old != null) { localStorage.setItem(STORE, old); localStorage.removeItem(OLD_STORE); }
      return old;
    } catch (_) { return null; }
  }
  const baseOf = id => String(id).split('-')[0].toLowerCase();

  function add(lang, strings) {
    tables[lang] = Object.assign(tables[lang] || {}, strings);
    resolved = null; ver++;
  }

  // The table id that best matches a language tag ('es-MX' -> 'es-MX', else 'es', else any
  // 'es-*'), or null.
  function match(tag) {
    if (!tag) return null;
    const ids = Object.keys(tables), lower = String(tag).toLowerCase();
    return ids.find(id => id.toLowerCase() === lower)
      || ids.find(id => id.toLowerCase() === baseOf(tag))
      || ids.find(id => baseOf(id) === baseOf(tag)) || null;
  }

  function browserLanguage() {
    const tags = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    for (const tag of tags) { const id = match(tag); if (id) return id; }
    return BASE;
  }

  // (The stored choice is kept even before its table has loaded: tables are added after
  // this file runs. current() falls back to the browser's language if it never arrives.)
  function refresh() {
    const next = read() || 'auto';
    if (next !== chosen) { chosen = next; resolved = null; ver++; }
  }

  function current() {
    if (!resolved) resolved = (chosen !== 'auto' && tables[chosen] && chosen) || browserLanguage();
    return resolved;
  }

  function setChoice(id) {
    chosen = id || 'auto';
    try { localStorage.setItem(STORE, chosen); } catch (_) { /* storage blocked */ }
    resolved = null; ver++;
  }

  // Which plural form a count takes in `lang` ('one', 'other', ...). Counts can arrive as
  // display text ("1,234"); anything that isn't a plain number takes 'other'.
  function pluralOf(lang, n) {
    const x = typeof n === 'number' ? n : /^\d+$/.test(String(n)) ? +n : NaN;
    if (!isFinite(x)) return 'other';
    try { return new Intl.PluralRules(lang).select(x); } catch (_) { return x === 1 ? 'one' : 'other'; }
  }

  function t(key, vars) {
    const lang = current();
    const order = [lang, baseOf(lang), BASE];
    let text, from = BASE;
    for (const id of order) {
      const tb = tables[id];
      if (tb && tb[key] != null) { text = tb[key]; from = id; break; }
    }
    if (text == null) {
      if (!warned.has(key)) { warned.add(key); console.warn(`[streamxr] no text for "${key}"`); }
      return key;
    }
    if (typeof text === 'object') text = text[pluralOf(from, vars && vars.n)] ?? text.other ?? '';
    return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : text;
  }

  // A language's name in itself ("Español"), first letter capitalised.
  function nameOf(id) {
    let n = id;
    try { n = new Intl.DisplayNames([id], { type: 'language' }).of(id) || id; } catch (_) { /* no Intl names */ }
    return n.charAt(0).toLocaleUpperCase(id) + n.slice(1);
  }
  const languages = () => Object.keys(tables).sort().map(id => ({ id, name: nameOf(id) }));

  refresh();

  ns.i18n = { add, t, languages, nameOf, choice: () => chosen, setChoice, current, browserLanguage, refresh, version: () => ver };
})(globalThis.__streamxr = globalThis.__streamxr || {});
