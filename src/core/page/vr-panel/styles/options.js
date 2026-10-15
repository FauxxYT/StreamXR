// Options style (canvas 2D): tabs of settings, in Material 3 Expressive. A tab is either up
// to three rows (M3 list items: the setting's name with a grey hint under it on the left,
// its control on the right: a switch, a slider with an optional Default button, a stepper
// or a button) or a grid of choices (e.g. audio tracks). YouTube's Settings (Playback,
// Audio, 2D Cinema, Laser, Keyboard, Language); any site's options. Knows nothing about any
// site (ARCHITECTURE.md).
//
//   const style = ns.vrStyles.options.create(onImageLoaded, W, H);   // canvas size in px (no images: unused)
//   style.draw(model, ui)
//     model: { tabs: [{ id, label, icon (Material Symbols name, optional) }], tab,
//              corner (grey text top-right; optional: it shares the row with the tabs, so
//              only for a panel with few tabs),
//              content: one of
//       { kind: 'rows', note (grey line above the rows),
//         rows: [{ label, hint, dim (drawn faded),
//                  control: { type: 'switch', id, on, enabled }
//                         | { type: 'slider', id, fraction (0..1), text, enabled,
//                             defaultButton (a "Default" button at the row's end),
//                             ends: [left, right] (small captions under the slider's ends) }
//                         | { type: 'stepper', id, text, enabled } (‹ text ›: steps a choice)
//                         | { type: 'button', id, label, icon (optional), enabled } }] }
//       { kind: 'choices', items: [{ label, sub, on }], page } (a 4 x 4 grid; with more than
//         fit, the last button is "More (2/3)", which moves on a page) }
//   Control ids: 'tab:<id>', 'switch:<id>', 'slider:<id>' (its hit test also reports the
//   fraction along it), 'default:<id>', 'prev:<id>' / 'next:<id>' (a stepper's arrows),
//   'button:<id>', 'choice:<index in items>', 'choice:more'.
//   Also: hitTest(u, v) -> { id, fraction? } | null, has(id), sliderFraction(u), imagesReady().
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha, S = ns.vrSymbols;   // design tokens (tokens.js), icons
  const { roundRect, regionAt, headerTabs, hoverRing, button, fitFont } = ns.vrKit;
  const PAD = 48;
  const TAB_Y = 12, TAB_H = 92, LINE_Y = 106;   // the tab row (icons above labels); the line under it
  const CONTENT_Y = 118;                        // where the note / rows / choices start
  const SLIDER = { x: 360, w: 300 };            // every slider's track (the value text sits to its right)
  const DEFAULT_W = [150, 216];                 // a slider's Default button: as wide as its label needs, within these
  const LABEL_W = SLIDER.x - PAD - 20;          // a row's name and hint, left of the controls
  const CHOICES = { cols: 4, rows: 4, top: 124, h: 54, gap: 10 };
  const SWITCH = { w: 72, h: 44 };
  const BTN_H = 52;                             // buttons' height (Default, steppers' arrows are round: 56)
  const MIN_ROW_H = 64;                         // the least height a row gets

  function create(onImageLoaded, W = 1024, H = 390) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    let regions = [];                                   // clickable rectangles from the last draw: [{ id, x, y, w, h }]
    let rowFaded = false;                               // drawing a `dim` row (already faded: its disabled controls aren't faded again)

    // A tonal button (kit.js button): only clickable when enabled; faded when not,
    // unless its row is already faded.
    function tonal(id, x, y, w, h, { icon, label, enabled = true }, ui) {
      button(g, regions, id, x, y, w, h, { icon, label, enabled, faded: !enabled && !rowFaded }, ui);
    }

    // A slider centred on line y (M3E, as on the controls panel): a brand-colour track up to
    // `frac` (0..1), a secondaryContainer track after it, a bar handle in the gap, and `text` to the right
    // (made smaller if it would run past `textW` px).
    // Thicker while pointed at or dragged. Only clickable (in the regions) when enabled.
    function slider(id, y, frac, text, enabled, ui, textW = W - PAD - (SLIDER.x + SLIDER.w + 18)) {
      const s = SLIDER;
      if (enabled) regions.push({ id, x: s.x - 20, y: y - 30, w: s.w + 40, h: 60 });
      const { h: hv, p: pv } = enabled ? ns.vrMotion.of(ui, id) : { h: 0, p: 0 }, hot = Math.min(1, Math.max(hv, pv));   // eased (motion.js)
      const f = Math.min(1, Math.max(0, frac)), th = 16 + 4 * hot, gap = 6, hx = s.x + s.w * f, hh = 44 + 8 * hot;
      g.fillStyle = P.brand; roundRect(g, s.x, y - th / 2, Math.max(th / 2, hx - gap - s.x), th, Math.min(th / 2, Math.max(1, (hx - gap - s.x) / 2))); g.fill();
      const rest = s.x + s.w - hx - gap;
      if (rest > 2) { g.fillStyle = P.secondaryContainer; roundRect(g, hx + gap, y - th / 2, rest, th, Math.min(th / 2, rest / 2)); g.fill(); }
      g.fillStyle = P.brand; roundRect(g, hx - 3, y - hh / 2, 6, hh, 3); g.fill();
      g.fillStyle = P.onSurface; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(fitFont(g, text, textW, 22, '500 ', 0.75), s.x + s.w + 18, y);
    }

    // An M3 switch at the row's right end, centred on line y: on = brand-colour track and a
    // white handle holding a brand-colour check; off = dark track with an outline and a small grey
    // handle. Pointed at: the white ring and a bigger handle.
    function toggle(id, y, on, enabled, ui) {
      const r = { x: W - PAD - SWITCH.w, y: y - SWITCH.h / 2, w: SWITCH.w, h: SWITCH.h };
      if (enabled) regions.push({ id, ...r });
      const { h: hv, p: pv } = enabled ? ns.vrMotion.of(ui, id) : { h: 0, p: 0 };   // eased (motion.js)
      g.globalAlpha *= enabled || rowFaded ? 1 : 0.38;
      roundRect(g, r.x, r.y, r.w, r.h, r.h / 2);
      if (on) { g.fillStyle = P.brand; g.fill(); }
      else { g.fillStyle = P.surfaceContainerHighest; g.fill(); g.lineWidth = 2.5; g.strokeStyle = P.outline; g.stroke(); }
      const rad = (on ? 16 : 11) + 2 * hv + 2 * Math.min(1, pv), cx = on ? r.x + r.w - 22 : r.x + 22;
      g.fillStyle = on ? P.onBrand : P.outline; g.beginPath(); g.arc(cx, y, rad, 0, Math.PI * 2); g.fill();
      if (on) { g.fillStyle = P.brand; S.draw(g, 'check', cx, y, 22, false); }
      g.globalAlpha /= enabled || rowFaded ? 1 : 0.38;
      hoverRing(g, r.x, r.y, r.w, r.h, r.h / 2, hv);
    }

    // A stepper from where a slider starts to the row's end: round tonal ‹ and › buttons at
    // its ends ('prev:<id>', 'next:<id>'), the current choice between them.
    function stepper(id, y, text, enabled, ui) {
      const x0 = SLIDER.x, x1 = W - PAD, d = 56;
      tonal(`prev:${id}`, x0, y - d / 2, d, d, { icon: 'chevron_left', enabled }, ui);
      tonal(`next:${id}`, x1 - d, y - d / 2, d, d, { icon: 'chevron_right', enabled }, ui);
      g.fillStyle = P.onSurface; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(fitFont(g, text, x1 - x0 - d * 2 - 24, 24, '500 '), (x0 + x1) / 2, y + 1);
    }

    // A tonal button at the row's right end ('button:<id>'), with its icon if it has one.
    function plainButton(id, y, label, icon, enabled, ui) {
      g.font = T.font('labelLarge', 22);
      const w = g.measureText(label).width + 48 + (icon ? 36 : 0);
      tonal(id, W - PAD - w, y - BTN_H / 2, w, BTN_H, { icon, label, enabled }, ui);
    }

    // Rows (M3 list items): each faded when `dim`; the name (with its hint under it) on the
    // left, the control on the right, a slider's Default button and end captions. The rows
    // share the room under the note evenly (at most 86 px each, at least MIN_ROW_H: rows that
    // wouldn't fit are left out).
    function drawRows(c, ui) {
      let top = CONTENT_Y;
      if (c.note) {
        g.fillStyle = P.onSurfaceVariant; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(fitFont(g, c.note, W - PAD * 2, 19), PAD, top + 14);
        top += 34;
      }
      const rows = (c.rows || []).slice(0, Math.max(1, Math.floor((H - top - 12) / MIN_ROW_H)));   // as many as fit
      const rowH = Math.min(86, (H - top - 12) / Math.max(1, rows.length));
      rows.forEach((row, i) => {
        const y = top + rowH * i + rowH / 2, ctl = row.control || {}, enabled = ctl.enabled !== false;
        g.globalAlpha = row.dim ? 0.38 : 1; rowFaded = !!row.dim;
        // The name, and the hint under it (switch rows have the whole width up to the switch).
        const nameW = ctl.type === 'switch' || !ctl.type ? W - PAD * 2 - SWITCH.w - 24 : LABEL_W;
        g.fillStyle = P.onSurface; g.textAlign = 'left'; g.textBaseline = 'middle';
        if (row.label) g.fillText(fitFont(g, row.label, nameW, 24, '500 '), PAD, row.hint ? y - 14 : y);
        if (row.hint) { g.fillStyle = P.onSurfaceVariant; g.fillText(fitFont(g, row.hint, nameW, 18, '', 0.85), PAD, y + 16); }
        if (ctl.type === 'switch') toggle(`switch:${ctl.id}`, y, !!ctl.on, enabled, ui);
        else if (ctl.type === 'stepper') stepper(ctl.id, y, ctl.text || '', enabled, ui);
        else if (ctl.type === 'button') plainButton(`button:${ctl.id}`, y, ctl.label || '', ctl.icon, enabled, ui);
        else if (ctl.type === 'slider') {
          // the Default button's width (measured first: the value text must stop short of it)
          const label = ns.i18n.t('style.default');
          g.font = T.font('labelLarge', 22);
          const bw = Math.min(DEFAULT_W[1], Math.max(DEFAULT_W[0], g.measureText(label).width + 32 + 36));
          const textW = W - PAD - (SLIDER.x + SLIDER.w + 18) - (ctl.defaultButton ? bw + 12 : 0);
          g.globalAlpha *= enabled || rowFaded ? 1 : 0.38;
          slider(`slider:${ctl.id}`, y, ctl.fraction || 0, ctl.text || '', enabled, ui, textW);
          if (ctl.ends) {
            g.fillStyle = P.onSurfaceVariant; g.font = T.font('labelMedium', 16); g.textBaseline = 'middle';
            g.textAlign = 'left'; g.fillText(ctl.ends[0], SLIDER.x, y + 32);
            g.textAlign = 'right'; g.fillText(ctl.ends[1], SLIDER.x + SLIDER.w, y + 32);
          }
          g.globalAlpha = row.dim ? 0.38 : 1;
          if (ctl.defaultButton) {
            tonal(`default:${ctl.id}`, W - PAD - bw, y - BTN_H / 2, bw, BTN_H, { icon: 'restart_alt', label, enabled }, ui);
          }
        }
      });
      g.globalAlpha = 1; rowFaded = false;
    }

    // Choices: a 4 x 4 grid of tonal buttons, the chosen one primary with a check
    // and squarer corners, each with an optional line under its label. With more than fit,
    // the last button is "More" (the next page, then back to the first).
    function drawChoices(c, ui) {
      const items = c.items || [], per = CHOICES.cols * CHOICES.rows;
      const paged = items.length > per, perPage = paged ? per - 1 : per;
      const pages = Math.max(1, Math.ceil(items.length / perPage));
      const first = ((c.page || 0) % pages) * perPage;
      const shown = items.slice(first, first + perPage).map((t, i) => ({ t, id: `choice:${first + i}` }));
      if (paged) shown.push({ t: null, id: 'choice:more' });
      const w = (W - PAD * 2 - CHOICES.gap * (CHOICES.cols - 1)) / CHOICES.cols, h = CHOICES.h;
      shown.forEach(({ t, id }, i) => {
        const x = PAD + (i % CHOICES.cols) * (w + CHOICES.gap), y = CHOICES.top + Math.floor(i / CHOICES.cols) * (h + CHOICES.gap);
        regions.push({ id, x, y, w, h });
        const { h: hv, p: pv } = ns.vrMotion.of(ui, id), on = t && t.on;   // eased (motion.js)
        const r = on ? T.shape.largeIncreased : Math.max(4, ns.vrMotion.lerp(h / 2, T.shape.largeIncreased, pv));
        g.fillStyle = on ? P.primary : P.secondaryContainer; roundRect(g, x, y, w, h, r); g.fill();
        const fg = on ? P.onPrimary : P.onSecondaryContainer;
        if (pv > 0.01) { g.fillStyle = fg; g.globalAlpha = 0.12 * Math.min(1, pv); roundRect(g, x, y, w, h, r); g.fill(); g.globalAlpha = 1; }
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const sub = t && t.sub;
        const name = (on ? '✓ ' : '') + (t ? t.label : ns.i18n.t('style.more', { page: (c.page || 0) % pages + 1, pages }));
        g.fillStyle = fg;
        g.fillText(fitFont(g, name, w - 24, 21, '500 '), x + w / 2, y + (sub ? 19 : h / 2 + 1));
        if (sub) { g.globalAlpha = 0.8; g.fillText(fitFont(g, sub, w - 24, 16), x + w / 2, y + 39); g.globalAlpha = 1; }
        hoverRing(g, x, y, w, h, r, hv);
      });
    }

    // Paint the whole panel from the model (see the top of the file).
    const motion = ns.vrMotion.create();                // hover / press easing (motion.js)
    function draw(m, ui) {
      ui = motion.step(ui);
      regions = [];
      g.clearRect(0, 0, W, H);
      g.globalAlpha = 1;
      g.fillStyle = T.panelFill(); roundRect(g, 0, 0, W, H, T.shape.extraLarge); g.fill();
      let tabsEnd = W - PAD;
      if (m.corner) {
        g.fillStyle = P.onSurfaceVariant; g.font = T.font('bodyMedium', 20); g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(m.corner, W - PAD, TAB_Y + TAB_H / 2);
        tabsEnd -= g.measureText(m.corner).width + 24;
      }
      headerTabs(g, m.tabs, m.tab, ui, regions, PAD, { x: PAD - 16, y: TAB_Y, h: TAB_H, maxX: tabsEnd + 16, fill: true });
      g.fillStyle = P.outlineVariant; g.fillRect(PAD - 16, LINE_Y, W - PAD * 2 + 32, 1);
      const c = m.content || { kind: 'rows', rows: [] };
      if (c.kind === 'choices') drawChoices(c, ui);
      else drawRows(c, ui);
    }

    // Fraction (0..1) along a slider for any u (also used while dragging off it).
    const sliderFraction = u => Math.min(1, Math.max(0, (u * W - SLIDER.x) / SLIDER.w));
    function hitTest(u, v) {
      const r = regionAt(regions, u, v, W, H);
      if (!r) return null;
      return r.id.startsWith('slider:') ? { id: r.id, fraction: sliderFraction(u) } : { id: r.id };
    }
    const has = id => regions.some(r => r.id === id);    // an enabled control from the last draw?

    return { canvas, aspect: H / W, draw, hitTest, has, sliderFraction, imagesReady: () => 0, perPage: 0, animating: motion.moving };
  }

  ns.vrStyles = ns.vrStyles || {};
  ns.vrStyles.options = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
