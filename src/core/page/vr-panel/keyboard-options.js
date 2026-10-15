// The in-VR keyboard's layout (the shell's own "Keyboard" settings tab): a style (where the
// letters are: QWERTY, AZERTY, QWERTZ, Dvorak, Colemak) and a language (its extra letters,
// e.g. ñ or ü, a row of its accented letters on the symbols page, its name on the space
// bar, and how letters are capitalised). Each is either chosen or "yours": the style the
// computer's keyboard has (navigator.keyboard.getLayoutMap(), read here once) and the
// browser's language. Remembered; Default goes back to yours. A site's Options panel
// includes the tab (like the Laser tab); keyboard.js asks layout() for what to show.
//
//   ns.vrKeyboardOptions.content() -> the Options style's 'rows' content
//   ns.vrKeyboardOptions.event(ev) -> true if it was one of this tab's controls
//     ('prev:kbStyle' / 'next:kbStyle', 'prev:kbLang' / 'next:kbLang', 'button:kbDefault')
//   ns.vrKeyboardOptions.layout() -> { chars: { code: character }, shifted: { code: character
//     with Shift } (letters without one are capitalised), currency (the symbols page's
//     currency key), accents: [characters] (the symbols page's last row: the language's
//     accented letters, then the other currencies), locale, styleName, languageName,
//     version (changes whenever any of it does) }
//   ns.vrKeyboardOptions.reset() -> back to yours (the global reset)
(function (ns) {
  'use strict';

  const STYLE_KEY = 'keyboardStyle', LANG_KEY = 'keyboardLanguage';   // storage.js names
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)

  // QWERTY English (US): every key the keyboard has, unshifted.
  const US = { Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/' };
  for (const d of '1234567890') US[`Digit${d}`] = d;
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') US[`Key${c}`] = c.toLowerCase();

  // Styles: the keys whose characters differ from QWERTY (letters, and what they push aside),
  // and (`shifted`) Shift on the punctuation they move.
  const rows = (codes, chars) => Object.fromEntries(codes.map((c, i) => [c, chars[i]]));
  const TOP = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
  const HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'];
  const LOW = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'];
  const STYLES = [
    { id: 'qwerty', label: 'QWERTY', keys: {} },
    { id: 'azerty', label: 'AZERTY', keys: { ...rows(TOP, 'azertyuiop'), ...rows(HOME, 'qsdfghjklm'), ...rows(LOW, 'wxcvbn,;:!') },
      shifted: { KeyM: '?', Comma: '.', Period: '/', Slash: '§' } },
    { id: 'qwertz', label: 'QWERTZ', keys: { KeyY: 'z', KeyZ: 'y' } },
    { id: 'dvorak', label: 'Dvorak', keys: { ...rows(TOP, '\',.pyfgcrl'), ...rows(HOME, 'aoeuidhtns'), ...rows(LOW, ';qjkxbmwvz') },
      shifted: { KeyQ: '"', KeyW: '<', KeyE: '>', KeyZ: ':' } },
    { id: 'colemak', label: 'Colemak', keys: { ...rows(TOP, 'qwfpgjluy;'), ...rows(HOME, 'arstdhneio'), KeyN: 'k' },
      shifted: { KeyP: ':' } },
  ];

  // With Shift, a key in its QWERTY (US) place types its US shifted symbol (unless the
  // language says otherwise).
  const US_SHIFT = { Backquote: '~', Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}', Backslash: '|',
    Semicolon: ':', Quote: '"', Comma: '<', Period: '>', Slash: '?' };
  '!@#$%^&*()'.split('').forEach((s, i) => { US_SHIFT[`Digit${(i + 1) % 10}`] = s; });

  // Languages, as their own keyboards have them (dead keys type their mark): `keys` = what a
  // punctuation key types (only where the style has no letter there), `shifted` = with
  // Shift (French: Shift on the digits gives & é " ' ( - è _ ç à, as unshifted on AZERTY),
  // `currency` = the symbols page's currency key, `accents` = the symbols page's last row
  // (up to 11; then the other two of $ € £).
  const LANGUAGES = [
    { id: 'en-US', keys: {}, shifted: {}, currency: '$', accents: [] },
    { id: 'en-GB', currency: '£', accents: [],
      keys: { Backslash: '#', IntlBackslash: '\\' },
      shifted: { Backquote: '¬', Digit2: '"', Digit3: '£', Quote: '@', Backslash: '~', IntlBackslash: '|' } },
    { id: 'es-ES', currency: '€', accents: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡', 'º', 'ª'],
      keys: { Backquote: 'º', Minus: "'", Equal: '¡', BracketLeft: '`', BracketRight: '+', Semicolon: 'ñ', Quote: '´', Backslash: 'ç', IntlBackslash: '<', Slash: '-' },
      shifted: { Backquote: 'ª', Digit2: '"', Digit3: '·', Digit6: '&', Digit7: '/', Digit8: '(', Digit9: ')', Digit0: '=', Minus: '?', Equal: '¿',
        BracketLeft: '^', BracketRight: '*', Quote: '¨', IntlBackslash: '>', Comma: ';', Period: ':', Slash: '_' } },
    { id: 'fr-FR', currency: '€', accents: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'ù', 'û', 'ô', 'î'],
      keys: { Backquote: '²', Minus: ')', Equal: '=', BracketLeft: '^', BracketRight: '$', Quote: 'ù', Backslash: '*', IntlBackslash: '<' },
      shifted: { Digit1: '&', Digit2: 'é', Digit3: '"', Digit4: "'", Digit5: '(', Digit6: '-', Digit7: 'è', Digit8: '_', Digit9: 'ç', Digit0: 'à',
        Minus: '°', Equal: '+', BracketLeft: '¨', BracketRight: '£', Quote: '%', Backslash: 'µ', IntlBackslash: '>' } },
    { id: 'de-DE', currency: '€', accents: ['ä', 'ö', 'ü', 'ß', 'é', 'è', 'à', '§', '°', 'µ', '²'],
      keys: { Backquote: '^', Minus: 'ß', Equal: '´', BracketLeft: 'ü', BracketRight: '+', Semicolon: 'ö', Quote: 'ä', Backslash: '#', IntlBackslash: '<', Slash: '-' },
      shifted: { Backquote: '°', Digit2: '"', Digit3: '§', Digit6: '&', Digit7: '/', Digit8: '(', Digit9: ')', Digit0: '=', Minus: '?', Equal: '`',
        BracketRight: '*', Backslash: "'", IntlBackslash: '>', Comma: ';', Period: ':', Slash: '_' } },
    { id: 'it-IT', currency: '€', accents: ['à', 'è', 'é', 'ì', 'ò', 'ù', 'ç', '°', '§', '«', '»'],
      keys: { Backquote: '\\', Minus: "'", Equal: 'ì', BracketLeft: 'è', BracketRight: '+', Semicolon: 'ò', Quote: 'à', Backslash: 'ù', IntlBackslash: '<', Slash: '-' },
      shifted: { Backquote: '|', Digit2: '"', Digit3: '£', Digit6: '&', Digit7: '/', Digit8: '(', Digit9: ')', Digit0: '=', Minus: '?', Equal: '^',
        BracketLeft: 'é', BracketRight: '*', Semicolon: 'ç', Quote: '°', Backslash: '§', IntlBackslash: '>', Comma: ';', Period: ':', Slash: '_' } },
    { id: 'pt-BR', currency: '$', accents: ['á', 'â', 'ã', 'à', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'],
      keys: { Backquote: "'", BracketLeft: '´', BracketRight: '[', Semicolon: 'ç', Quote: '~', Backslash: ']', IntlBackslash: '\\', Slash: ';' },
      shifted: { Backquote: '"', Digit6: '¨', BracketLeft: '`', BracketRight: '{', Quote: '^', Backslash: '}', IntlBackslash: '|', Slash: ':' } },
  ];
  // When a language has no accents of its own, the symbols page's last row has these.
  const DEFAULT_ACCENTS = ['°', '•', '…', '¿', '¡', '«', '»', '©', '®', '™', '¢'];
  const CURRENCIES = ['$', '€', '£'];

  // A language's name in itself ("Deutsch (Deutschland)").
  function nameOf(lang) {
    try { return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) || lang; } catch (_) { return lang; }
  }
  const isLetter = c => !!c && c.toLocaleUpperCase() !== c.toLocaleLowerCase();

  // What the computer's keyboard has (null until Chrome tells, or if it can't).
  let detected = null;                    // { chars, style: id | null }
  let style = 'auto', language = 'auto', ver = 0;
  { const s = ns.storage.get(STYLE_KEY), l = ns.storage.get(LANG_KEY);
    if (STYLES.some(x => x.id === s)) style = s;
    if (LANGUAGES.some(x => x.id === l)) language = l; }

  // Which style a layout map is (by a few telling letters), or null.
  function styleOf(m) {
    if (m.KeyQ === 'a' && m.KeyW === 'z') return 'azerty';
    if (m.KeyQ === '\'' && m.KeyW === ',') return 'dvorak';
    if (m.KeyE === 'f' && m.KeyR === 'p') return 'colemak';
    if (m.KeyY === 'z' && m.KeyZ === 'y') return 'qwertz';
    if (m.KeyQ === 'q' && m.KeyY === 'y') return 'qwerty';
    return null;
  }
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
      navigator.keyboard.getLayoutMap().then(map => {
        const chars = {};
        for (const code of [...Object.keys(US), 'IntlBackslash']) if (map.get(code)) chars[code] = map.get(code);
        if (chars.IntlBackslash && chars.IntlBackslash === chars.Backslash) delete chars.IntlBackslash;
        detected = { chars, style: styleOf(chars) }; ver++;
      }, err => console.info('[streamxr] keyboard layout unknown; using QWERTY (US):', err && err.message || err));
    }
  } catch (_) { /* not available: QWERTY (US) */ }

  // The browser's language, as one of ours (by its first part: "de-AT" -> German), or US English.
  function browserLanguage() {
    const want = (navigator.language || 'en-US').toLowerCase();
    return LANGUAGES.find(l => l.id.toLowerCase() === want) || LANGUAGES.find(l => l.id.slice(0, 2) === want.slice(0, 2)) || LANGUAGES[0];
  }

  function layout() {
    const lang = language === 'auto' ? browserLanguage() : LANGUAGES.find(l => l.id === language);
    let chars, st = null;
    if (style === 'auto' && detected) chars = { ...US, ...detected.chars };    // the computer's own layout, key by key
    else { st = STYLES.find(s => s.id === (style === 'auto' ? 'qwerty' : style)) || STYLES[0]; chars = { ...US, ...st.keys }; }
    // The language's keys, where the style left punctuation; then Shift: the US symbol on a
    // US-placed key, the style's own, or the language's own (where its key is, or punctuation is).
    for (const [code, c] of Object.entries(lang.keys)) if (!isLetter(chars[code])) chars[code] = c;
    const shifted = {};
    for (const [code, c] of Object.entries(chars)) if (c === US[code] && US_SHIFT[code]) shifted[code] = US_SHIFT[code];
    if (st && st.shifted) Object.assign(shifted, st.shifted);
    for (const [code, c] of Object.entries(lang.shifted)) if (!isLetter(chars[code]) || lang.keys[code] === chars[code]) shifted[code] = c;
    const locale = language === 'auto' ? (navigator.language || 'en-US') : lang.id;
    const accents = [...(lang.accents.length ? lang.accents : DEFAULT_ACCENTS).slice(0, 11), ...CURRENCIES.filter(c => c !== lang.currency).slice(0, 2)];
    return { chars, shifted, currency: lang.currency, accents, locale, styleName: styleLabel(), languageName: nameOf(locale), version: ver };
  }

  // The rows' texts: a choice's name, or what "yours" turned out to be.
  function styleLabel() {
    if (style !== 'auto') return STYLES.find(s => s.id === style).label;
    const d = detected && detected.style && STYLES.find(s => s.id === detected.style);
    return tr('keyboard.yourKeyboard', { name: d ? d.label : detected ? tr('keyboard.yourLayout') : 'QWERTY' });
  }
  const languageLabel = () => (language === 'auto' ? tr('keyboard.yourBrowser', { name: nameOf(navigator.language || 'en-US') }) : nameOf(language));

  function content() {
    return {
      kind: 'rows', note: tr('keyboard.note'),
      rows: [
        { label: tr('keyboard.style'), control: { type: 'stepper', id: 'kbStyle', text: styleLabel() } },
        { label: tr('keyboard.language'), control: { type: 'stepper', id: 'kbLang', text: languageLabel() } },
        { label: '', control: { type: 'button', id: 'kbDefault', label: tr('keyboard.default'), icon: 'restart_alt', enabled: style !== 'auto' || language !== 'auto' } },
      ],
    };
  }

  // Step a choice through "yours" and then each option, round and round.
  function step(list, current, dir) {
    const ids = ['auto', ...list.map(x => x.id)];
    return ids[(ids.indexOf(current) + dir + ids.length) % ids.length];
  }

  function event(ev) {
    const dir = ev.type === 'prev' ? -1 : ev.type === 'next' ? 1 : 0;
    if (dir && ev.value === 'kbStyle') { style = step(STYLES, style, dir); ns.storage.set(STYLE_KEY, style); }
    else if (dir && ev.value === 'kbLang') { language = step(LANGUAGES, language, dir); ns.storage.set(LANG_KEY, language); }
    else if (ev.type === 'button' && ev.value === 'kbDefault') { style = language = 'auto'; ns.storage.set(STYLE_KEY, 'auto'); ns.storage.set(LANG_KEY, 'auto'); }
    else return false;
    ver++;
    return true;
  }

  // Back to the keyboard you have (the global reset): forget the chosen style and language.
  function reset() {
    style = language = 'auto';
    ns.storage.remove(STYLE_KEY); ns.storage.remove(LANG_KEY);
    ver++;
  }

  ns.vrKeyboardOptions = { content, event, layout, reset, STYLES, LANGUAGES };
})(globalThis.__streamxr = globalThis.__streamxr || {});
