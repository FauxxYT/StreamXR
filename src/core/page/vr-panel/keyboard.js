// The in-VR keyboard's look and keys (canvas 2D), knowing nothing about WebXR or any site:
// vr-panel.js places it, points lasers at it and passes what it types to the text field
// being typed into. A header line (what you're typing into), five rows of keys, and a grab
// bar under them with a resize handle at each bottom corner.
//
// The layout comes from keyboard-options.js (the Keyboard settings tab): a chosen style and
// language, or by default the computer's keyboard layout and the browser's language. The
// space bar names the language, and the symbols page has a row of its accented letters.
// Shift (tap: the next letter; tap twice: caps lock), "?123" for a page of symbols, and a
// key that hides the keyboard.
//
//   const kb = ns.vrKeyboard.create();
//   kb.canvas, kb.aspect (height / width), kb.version() (changes when its look changes),
//   kb.animating() (a key's hover / press is still easing: redraw)
//   kb.draw({ hover, pressed, target })   hover / pressed: its own control ids; target: what
//                                          you're typing into ("Search"), or null
//   kb.hitTest(u, v) -> { id } | null      ids: 'key:<n>', 'grab', 'resize-left', 'resize-right'
//   kb.solidAt(u, v) -> bool               on the keyboard or its handles (not a see-through margin)
//   kb.press(id) -> { key } (a character, 'Backspace' or 'Enter') | { hide: true } | null
//   kb.repeats(id) -> bool                 held down, does it type again (characters, space, Backspace)
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha;        // design tokens (tokens.js)

  const { roundRect, FONT } = ns.vrKit;

  // Canvas layout (px): a side margin for the resize handles, the body (header + key rows),
  // then the grab bar's strip.
  const SIDE = 56, BODY_W = 1280, HEADER_H = 54, ROW_H = 92, ROWS = 5, PAD = 18, GAP = 8;
  const BODY_H = HEADER_H + ROWS * ROW_H + PAD;
  const BAR_ZONE = 76, W = BODY_W + SIDE * 2, H = BODY_H + BAR_ZONE;
  const UNITS = 15;                          // every row is 15 key widths across
  const BAR = { w: 240, h: 30, zone: 500 }, CORNER = { r: 34, hit: 52 };   // the grab bar's pill (zone: its clickable width)

  // Physical keys by row (KeyboardEvent.code), with their widths in key units; null = a gap.
  // Specials: 'Backspace', 'Enter', 'Shift', 'Space', 'Symbols' (?123 / ABC), 'Hide'.
  const LETTERS = [
    [['Backquote', 1], ...'1234567890'.split('').map(d => [`Digit${d}`, 1]), ['Minus', 1], ['Equal', 1], ['Backspace', 2]],
    [[null, 0.75], ...'QWERTYUIOP'.split('').map(c => [`Key${c}`, 1]), ['BracketLeft', 1], ['BracketRight', 1], ['Backslash', 1], [null, 1.25]],
    [[null, 1], ...'ASDFGHJKL'.split('').map(c => [`Key${c}`, 1]), ['Semicolon', 1], ['Quote', 1], ['Enter', 3]],
    [['Shift', 2.25], ['IntlBackslash', 1], ...'ZXCVBNM'.split('').map(c => [`Key${c}`, 1]), ['Comma', 1], ['Period', 1], ['Slash', 1], ['Shift', 1.75]],
    [['Symbols', 2.5], ['Space', 10], ['Hide', 2.5]],
  ];
  // The symbols page ('sym:<char>' keys): the digits row stays; then symbols, with the
  // language's currency in the currency spot; and a last row of up to 13: the language's
  // accented letters and the other currencies (keyboard-options.js).
  const sym = chars => chars.map(c => [`sym:${c}`, 1]);
  const symbols = (currency, last) => [
    LETTERS[0],
    [[null, 0.75], ...sym(['!', '@', '#', currency, '%', '^', '&', '*', '(', ')', '_', '+', '|']), [null, 1.25]],
    [[null, 1], ...sym('~ { } < > : ; " \' ? /'.split(' ')), ['Enter', 3]],
    [[null, (UNITS - Math.min(13, last.length)) / 2], ...sym(last.slice(0, 13)), [null, (UNITS - Math.min(13, last.length)) / 2]],
    [['Symbols', 2.5], ['Space', 10], ['Hide', 2.5]],
  ];

  function create() {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    let layout = ns.vrKeyboardOptions.layout();       // { chars, shifted, currency, accents, locale, styleName, languageName, version }
    let page = 'letters', shift = 'off', lastShiftAt = 0;   // shift: 'off' | 'once' | 'caps'
    let ver = 0, regions = [], keys = [];             // keys: this page's [{ n, code, x, y, w, h }]
    const bump = () => { ver++; };

    // What a key types now (Shift applied), or '' for a key this layout doesn't have.
    function charOf(code) {
      if (code.startsWith('sym:')) return code.slice(4);
      const c = layout.chars[code];
      if (!c) return '';
      if (shift === 'off') return c;
      if (layout.shifted[code]) return layout.shifted[code];                    // the layout's own (ß -> ?, 2 -> é ...)
      const up = c.toLocaleUpperCase(layout.locale);
      return up.length === 1 ? up : c;                                          // a letter, capitalised
    }
    // A key's label.
    function labelOf(code) {
      if (code === 'Backspace') return '⌫';
      if (code === 'Enter') return ns.i18n.t('kb.enter');
      if (code === 'Shift') return '⇧';
      if (code === 'Space') return layout.languageName;
      if (code === 'Symbols') return page === 'letters' ? '?123' : 'ABC';
      if (code === 'Hide') return ns.i18n.t('kb.hide');
      return charOf(code);
    }

    // A row as this layout has it: the key left of Z (European keyboards) gives its width to
    // the Shift before it when the layout has none.
    function fitRow(row) {
      const out = [];
      for (const [code, w] of row) {
        if (code === 'IntlBackslash' && !layout.chars.IntlBackslash && out.length) out[out.length - 1] = [out[out.length - 1][0], out[out.length - 1][1] + w];
        else out.push([code, w]);
      }
      return out;
    }

    // Lay this page's keys out (canvas px) and draw everything.
    const motion = ns.vrMotion.create();                  // key hover / press easing (motion.js)
    function draw(state) {
      state = motion.step(state);
      regions = []; keys = [];
      layout = ns.vrKeyboardOptions.layout();
      g.clearRect(0, 0, W, H);
      // Body (the panels' M3 background)
      g.fillStyle = T.panelFill(); roundRect(g, SIDE, 0, BODY_W, BODY_H, T.shape.extraLarge); g.fill();
      // Header: what you're typing into (after a keyboard icon), and the layout's names.
      g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = T.font('bodyMedium', 22);
      g.fillStyle = state.target ? P.onSurface : P.onSurfaceVariant;
      if (state.target) ns.vrSymbols.draw(g, 'keyboard', SIDE + 44, HEADER_H / 2 + 4, 28, false);
      g.fillText(state.target ? ns.i18n.t('kb.typingInto', { target: state.target }) : ns.i18n.t('kb.noTarget'), SIDE + (state.target ? 68 : 28), HEADER_H / 2 + 4);
      g.textAlign = 'right'; g.fillStyle = P.onSurfaceVariant;
      g.fillText(`${layout.styleName} · ${layout.languageName}`, SIDE + BODY_W - 28, HEADER_H / 2 + 4);
      // Keys
      const unit = (BODY_W - PAD * 2) / UNITS;
      (page === 'letters' ? LETTERS : symbols(layout.currency, layout.accents)).forEach((row, r) => {
        let x = SIDE + PAD;
        const y = HEADER_H + r * ROW_H;
        for (const [code, w] of fitRow(row)) {
          const kw = unit * w;
          const label = code ? labelOf(code) : '';
          if (code && label) {
            const n = keys.length, id = `key:${n}`;
            keys.push({ n, code, x: x + GAP / 2, y: y + GAP / 2, w: kw - GAP, h: ROW_H - GAP });
            regions.push({ id, x: x + GAP / 2, y: y + GAP / 2, w: kw - GAP, h: ROW_H - GAP });
            drawKey(keys[n], label, state, id);
          }
          x += kw;
        }
      });
      // Grab bar and the resize handles at the body's bottom corners.
      // The grab bar as on the controls panel: a small pill with a drag handle (brand colour
      // while moving the keyboard), the white ring while pointed at.
      const bx = W / 2 - BAR.w / 2, by = BODY_H + (BAR_ZONE - BAR.h) / 2;
      regions.push({ id: 'grab', x: W / 2 - BAR.zone / 2, y: BODY_H + 6, w: BAR.zone, h: BAR_ZONE - 10 });
      g.fillStyle = T.panelFill(); roundRect(g, bx, by, BAR.w, BAR.h, BAR.h / 2); g.fill();
      g.fillStyle = state.pressed === 'grab' ? P.brand : P.onSurfaceVariant; roundRect(g, W / 2 - 32, by + BAR.h / 2 - 2.5, 64, 5, 2.5); g.fill();
      if (state.hover === 'grab') ns.vrKit.hoverRing(g, bx, by, BAR.w, BAR.h, BAR.h / 2);
      for (const [id, cx, a0] of [['resize-left', SIDE, Math.PI / 2], ['resize-right', SIDE + BODY_W, 0]]) {
        const cy = BODY_H, hot = state.hover === id || state.pressed === id;
        g.strokeStyle = hot ? P.onSurface : P.onSurfaceVariant; g.lineWidth = 12; g.lineCap = 'round';
        g.beginPath(); g.arc(cx, cy - CORNER.r * 0.35, CORNER.r, a0 + 0.12, a0 + Math.PI / 2 - 0.12); g.stroke();
        const mx = cx + (id === 'resize-left' ? -1 : 1) * CORNER.r * 0.5;
        regions.push({ id, x: mx - CORNER.hit, y: cy - CORNER.hit, w: CORNER.hit * 2, h: CORNER.hit * 2 });
      }
    }

    // One key (M3 Expressive, Gboard-like): letters, digits, symbols and the space bar on a
    // neutral surfaceContainerHighest; Backspace, Shift, ?123 / ABC and Hide tonal
    // (secondaryContainer); Enter, and Shift while it's on, filled in the brand colour.
    // Backspace, Shift and Hide are Material Symbols (Shift filled while on, with a bar under
    // it for caps lock); Enter is ↵ and its name. Pointed at: the white ring; pressed:
    // squarer corners and a 0.12 state layer.
    const ICONS = { Backspace: 'backspace', Shift: 'shift', Hide: 'keyboard_hide' };
    function drawKey(k, label, state, id) {
      const { h: hv, p: pv } = ns.vrMotion.of(state, id);           // pointed at / pressed, eased (motion.js)
      const special = !/^(Key|Digit|sym:|Backquote|Minus|Equal|Bracket|Backslash|Semicolon|Quote|Comma|Period|Slash|IntlBackslash|Space)/.test(k.code);
      const lit = k.code === 'Enter' || (k.code === 'Shift' && shift !== 'off');
      const [bg, fg] = lit ? [P.brand, P.onBrand] : special ? [P.secondaryContainer, P.onSecondaryContainer] : [P.surfaceContainerHighest, P.onSurface];
      const rad = Math.max(3, ns.vrMotion.lerp(T.shape.large, T.shape.small, pv));   // squares up as it's pressed, springs back
      g.fillStyle = bg; roundRect(g, k.x, k.y, k.w, k.h, rad); g.fill();
      if (pv > 0.01) { g.fillStyle = fg; g.globalAlpha = 0.12 * Math.min(1, pv); roundRect(g, k.x, k.y, k.w, k.h, rad); g.fill(); g.globalAlpha = 1; }
      const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (ICONS[k.code]) {
        ns.vrSymbols.draw(g, ICONS[k.code], cx, cy, 38, k.code === 'Shift' && shift !== 'off');
        if (k.code === 'Shift' && shift === 'caps') g.fillRect(cx - 14, cy + 24, 28, 4);
      } else if (k.code === 'Enter') {
        g.font = T.font('labelLarge', 26);
        const tw = g.measureText(label).width, x0 = cx - (34 + 10 + tw) / 2;
        ns.vrSymbols.draw(g, 'keyboard_return', x0 + 17, cy, 34, false);
        g.textAlign = 'left'; g.fillText(label, x0 + 44, cy + 2);
      } else {
        g.font = k.code === 'Space' ? T.font('labelLarge', 22) : special ? T.font('labelLarge', 26) : `36px ${FONT}`;
        g.fillText(label, cx, cy + 2);
      }
      ns.vrKit.hoverRing(g, k.x, k.y, k.w, k.h, rad, hv);
    }

    const keyOf = id => (id && id.startsWith('key:') ? keys[+id.slice(4)] : null);

    // A key pressed: what it types (or does).
    function press(id) {
      const k = keyOf(id);
      if (!k) return null;
      if (k.code === 'Hide') return { hide: true };
      if (k.code === 'Symbols') { page = page === 'letters' ? 'symbols' : 'letters'; shift = 'off'; bump(); return null; }
      if (k.code === 'Shift') {
        const now = performance.now();
        shift = shift === 'off' ? (now - lastShiftAt < 400 ? 'caps' : 'once') : shift === 'once' && now - lastShiftAt < 400 ? 'caps' : 'off';
        lastShiftAt = now; bump();
        return null;
      }
      if (k.code === 'Backspace' || k.code === 'Enter') return { key: k.code };
      const c = k.code === 'Space' ? ' ' : charOf(k.code);
      if (shift === 'once' && k.code !== 'Space') { shift = 'off'; bump(); }
      return c ? { key: c } : null;
    }

    const repeats = id => { const k = keyOf(id); return !!k && !/^(Shift|Symbols|Hide|Enter)$/.test(k.code); };
    const hitTest = (u, v) => {
      const x = u * W, y = v * H;
      for (const r of regions) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { id: r.id };
      return null;
    };
    const solidAt = (u, v) => {
      const x = u * W, y = v * H;
      return (x >= SIDE && x <= SIDE + BODY_W && y <= BODY_H) || !!hitTest(u, v);
    };

    return { canvas, aspect: H / W, width: W, height: H, draw, hitTest, solidAt, press, repeats, animating: motion.moving, version: () => `${ver}.${ns.vrKeyboardOptions.layout().version}` };   // its own changes, and the layout's
  }

  ns.vrKeyboard = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
