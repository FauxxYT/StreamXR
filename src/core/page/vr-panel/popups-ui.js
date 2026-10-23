// The things that float in front of the panels on Android XR's raised depth levels
// (docs/Spatial-Layout.md): the controls panel's menus (the popup level, 32 dp) and dialogs
// (the dialog level, 56 dp, over a dimmed scene). Material 3 Expressive, canvas 2D; they
// know nothing about WebXR or any site. vr-panel.js places them and passes the laser on.
//
// The menu: the choices of the controls panel's Quality / Speed / Format button (or a site's
// own button's: Captions, Save), or the
// Volume button's slider, rising from the button that opened it. Its canvas is fixed; the
// menu sits at the bottom middle of it (the rest is see-through: solidAt), so it can stand
// right above its button.
//   const menu = ns.vrPopupsUI.createMenu();
//   menu.draw(m, { hover, pressed })   m: { items: [{ id, text ("1080p" or "1080p\nPremium"),
//     on (the current one: ticked), disabled, icons (optional: Material Symbols names, or
//     { name, color } for one in its own colour (symbols.js drawIcon), drawn
//     on the row's left, e.g. ['4k', '60fps']; the tick then moves to the right end), image (a
//     picture's url: a 16:9 thumbnail on the row's left, the row taller, e.g. a video), corner
//     (text on the picture's bottom-right, e.g. its length) }],
//     note (a grey line above the items), scroll
//     (a long list scrolls: see drawList), key, width }
//     or { volume: { level (0-100), muted } }; ids: the items', or 'vol:mute' / 'vol:slider'
//   menu.hitTest(u, v) -> { id, fraction? } | null; menu.solidAt(u, v); menu.moving()
//   menu.volumeFraction(u)   along the volume slider for any u (dragging off it)
//   menu.scrollAt(u, v), menu.scrollBy(px), menu.scrollTo(px), menu.shownScroll(), menu.pxPerV
//                            a scrolling list (the laser's stick and trigger drags)
//   menu.bottomCentre        { x, y } canvas px: the point to stand on the button
//
// The dialog: a title, an optional line of text and two buttons (cancel, confirm) in an M3
// dialog card; the scrim (the dim layer behind it) is drawn by vr-panel.js.
//   const dlg = ns.vrPopupsUI.createDialog();
//   dlg.draw(d, { hover, pressed })   d: { title, text (up to four lines: the card grows to fit), cancel (null: no
//     cancel button, for a dialog that only informs), confirm, danger (the confirm button in
//     the error colour), field: null | { text, placeholder } (a text field under the text, typed
//     into with the keyboard: its text, a caret, a grey placeholder while empty; the confirm
//     button greyed while it's empty) }; ids 'dialog:cancel', 'dialog:confirm'
//   dlg.hitTest(u, v) -> { id } | null; dlg.solidAt(u, v) (on the card); dlg.moving()
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha, S = ns.vrSymbols;   // design tokens, icons
  const { roundRect, hoverRing, button, fitFont } = ns.vrKit;
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)
  const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  // onImageLoaded(): a row's picture arrived (the caller redraws).
  function createMenu(onImageLoaded = () => {}) {
    const W = 680, H = 760;                              // room for the widest (volume) and tallest (a long list)
    const LIST_W = 360, ROW_H = 64, MIN_ROW_H = 40, PAD = 8, NOTE_H = 48;   // rows shrink (to MIN_ROW_H) so a long list fits
    const SCROLL_ROWS = 8;                               // a scrolling list shows this many rows
    const ICON = 32, ICON_STEP = 36, ICON_LEFT = 20;     // items' leading icons: size, spacing, left margin (px)
    const THUMB = { w: 144, h: 81, rowH: 100 };          // items' pictures (16:9, e.g. a video's), and their rows' height
    const VOL = { w: 640, h: 112 };
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const motion = ns.vrMotion.create();                // hover / press easing (motion.js)
    let regions = [], card = null, slider = null;
    const kit = ns.vrKit.createCardKit(g, onImageLoaded);   // (pictures: loading and drawing)
    let list = null, scroll = 0, maxScroll = 0, listKey = null;   // a list's scrolling part, how far scrolled (px), how far it can, its m.key

    // The menu's card at r: the panels' glass (T.panelFill: the tint, drawn over the blurred
    // video), rounded; with the glass off, the panels' solid fill and a soft shadow (a
    // shadow under glass would show as a hazy ring).
    function cardAt(r) {
      g.save();
      if (!T.glass.on) { g.shadowColor = PA('shadow', 0.5); g.shadowBlur = 24; g.shadowOffsetY = 6; }
      g.fillStyle = T.panelFill(); roundRect(g, r.x, r.y, r.w, r.h, T.shape.large); g.fill();
      g.restore();
    }

    function draw(m, ui) {
      ui = motion.step(ui);
      regions = []; slider = null;
      g.clearRect(0, 0, W, H);
      if (m && m.volume) drawVolume(m.volume, ui);
      else if (m) drawList(m, ui);
    }

    // A list: one row per choice (M3 menu items; shorter when there are many), the current
    // one ticked and tinted, the
    // disabled ones dimmed; a note on top when there is one.
    // m.scroll: rows keep their full height and at most SCROLL_ROWS show; the list scrolls
    // (scrollBy, the laser's stick or a trigger drag: vr-panel.js), a thin bar on its right
    // saying where; m.key: a new one starts it at the top. m.width: the card's width (px;
    // default LIST_W).
    // Items with `icons` get them on the left, in a column as wide as the most icons in any
    // row (so the names line up); the card grows by that much, and the tick goes to the right.
    function drawList(m, ui) {
      const items = m.items || [];
      const lead = Math.max(0, ...items.map(it => (it.icons || []).length));
      const pics = items.some(it => it.image != null);              // rows with pictures (taller)
      const textX = pics ? 12 + THUMB.w + 16 : lead ? ICON_LEFT + lead * ICON_STEP + 12 : 64;    // where the names start in a row
      const listW = Math.min(W, (m.width || LIST_W) + (lead || pics ? textX - 64 + 40 : 0));
      const noteH = m.note ? NOTE_H : 0;
      const rowH = pics ? THUMB.rowH : m.scroll ? ROW_H : Math.max(MIN_ROW_H, Math.min(ROW_H, Math.floor((H - PAD * 2 - noteH) / Math.max(1, items.length))));
      const shownRows = m.scroll ? Math.min(items.length, pics ? 6 : SCROLL_ROWS) : items.length;
      const h = PAD * 2 + noteH + shownRows * rowH;
      card = { x: (W - listW) / 2, y: H - h, w: listW, h };
      cardAt(card);
      if (m.note) {
        g.fillStyle = P.onSurfaceVariant; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(fitFont(g, m.note, listW - 40, 20), card.x + 20, card.y + PAD + NOTE_H / 2);
      }
      // The scrolling part (all of the rows when the list doesn't scroll).
      if (m.key !== listKey) { listKey = m.key; scroll = 0; }
      list = { x: card.x, y: card.y + PAD + noteH, w: listW, h: shownRows * rowH };
      maxScroll = m.scroll ? Math.max(0, items.length * rowH - list.h) : 0;
      scroll = Math.min(maxScroll, Math.max(0, scroll));
      // Clipped to the rows plus the card's padding, so the pointing ring round the first and
      // last rows (drawn just outside them) isn't cut; a scrolling list's rows can show that far
      // past its ends too.
      const bleed = PAD;
      g.save(); g.beginPath(); g.rect(list.x, list.y - bleed, list.w, list.h + bleed * 2); g.clip();
      const rings = [];                                      // [row, radius, amount] to ring after the rows
      items.forEach((it, i) => {
        const r = { x: card.x + PAD, y: list.y + i * rowH - scroll, w: listW - PAD * 2 - (maxScroll ? 12 : 0), h: rowH };
        if (r.y + r.h < list.y || r.y > list.y + list.h) return;          // scrolled out of view
        // (its region cut to what shows of it)
        const ry0 = Math.max(r.y, list.y), ry1 = Math.min(r.y + r.h, list.y + list.h);
        if (!it.disabled && ry1 - ry0 > 8) regions.push({ id: it.id, x: r.x, y: ry0, w: r.w, h: ry1 - ry0 });
        const { h: hv, p: pv } = it.disabled ? { h: 0, p: 0 } : ns.vrMotion.of(ui, it.id);
        const rad = T.shape.medium;
        if (it.on) { g.fillStyle = P.secondaryContainer; roundRect(g, r.x, r.y, r.w, r.h, rad); g.fill(); }
        if (hv > 0.01 || pv > 0.01) { g.fillStyle = PA('onSurface', 0.08 * hv + 0.04 * Math.min(1, pv)); roundRect(g, r.x, r.y, r.w, r.h, rad); g.fill(); }
        g.globalAlpha = it.disabled ? 0.38 : 1;
        const fg = it.on ? P.onSecondaryContainer : P.onSurface;
        g.fillStyle = fg;
        if (it.on) S.draw(g, 'check', lead || pics ? r.x + r.w - 30 : r.x + 32, r.y + r.h / 2, 28, false);
        if (pics) {                                          // its picture (a grey box until it loads), the corner text on it
          const tx = r.x + 12, ty = r.y + (r.h - THUMB.h) / 2, img = it.image && kit.image(it.image);
          g.save(); roundRect(g, tx, ty, THUMB.w, THUMB.h, 10); g.clip();
          if (img) kit.drawImageCover(img, tx, ty, THUMB.w, THUMB.h); else { g.fillStyle = P.surfaceContainerHighest; g.fillRect(tx, ty, THUMB.w, THUMB.h); }
          g.restore();
          if (it.corner) {
            g.font = T.font('labelMedium', 15); const cw = g.measureText(it.corner).width + 10;
            g.fillStyle = 'rgba(0,0,0,0.75)'; roundRect(g, tx + THUMB.w - cw - 5, ty + THUMB.h - 25, cw, 20, 4); g.fill();
            g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.corner, tx + THUMB.w - cw / 2 - 5, ty + THUMB.h - 14);
            g.fillStyle = fg;
          }
        }
        (it.icons || []).forEach((icon, k) => S.drawIcon(g, icon, r.x + ICON_LEFT + ICON_STEP * k + ICON_STEP / 2, r.y + r.h / 2, ICON, false));
        const lines = String(it.text).split('\n'), textW = r.w - textX - (lead || pics ? 52 : 12);
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.font = T.font('labelLarge', 24);
        g.fillText(clip(lines[0], textW), r.x + textX, r.y + r.h / 2 + (lines.length > 1 ? -11 : 1));
        if (lines.length > 1) { g.font = T.font('labelMedium', 17); g.fillStyle = it.on ? fg : P.onSurfaceVariant; g.fillText(clip(lines.slice(1).join(' '), textW), r.x + textX, r.y + r.h / 2 + 15); }
        g.globalAlpha = 1;
        if (hv > 0.01) rings.push([r, rad, hv]);
      });
      // The pointing rings last, so a neighbouring row (e.g. the ticked one's fill) can't cover one.
      for (const [r, rad, hv] of rings) hoverRing(g, r.x, r.y, r.w, r.h, rad, hv);
      g.restore();
      if (maxScroll) {                                       // the scroll bar: where the view is in the list
        const th = Math.max(36, list.h * list.h / (list.h + maxScroll)), ty = list.y + (list.h - th) * scroll / maxScroll;
        g.fillStyle = PA('onSurfaceVariant', 0.5); roundRect(g, list.x + list.w - PAD - 6, ty, 6, th, 3); g.fill();
      }
    }
    // Text cut with "…" to fit maxW (in the current font).
    function clip(t, maxW) {
      if (g.measureText(t).width <= maxW) return t;
      while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
      return t + '…';
    }

    // The volume: Mute / Unmute, then the slider (an M3E slider: a brand-colour track up to
    // the handle bar, the rest secondaryContainer; thicker while pointed at) and the level.
    function drawVolume(v, ui) {
      card = { x: (W - VOL.w) / 2, y: H - VOL.h, w: VOL.w, h: VOL.h };
      cardAt(card);
      const cy = card.y + VOL.h / 2;
      button(g, regions, 'vol:mute', card.x + 16, cy - 32, 64, 64, { icon: v.muted ? 'volume_off' : 'volume_up' }, ui);
      slider = { x: card.x + 108, y: cy - 30, w: 400, h: 60 };
      regions.push({ id: 'vol:slider', ...slider });
      const hot = ui.hover === 'vol:slider' || ui.pressed === 'vol:slider';
      const f = Math.min(1, Math.max(0, v.level / 100)), th = hot ? 20 : 16, hx = slider.x + slider.w * f, gap = 6;
      const active = v.muted ? PA('onSurface', 0.38) : P.brand;
      // (per-corner radii: the canvas's own roundRect, which takes a list)
      if (hx - gap > slider.x) { g.fillStyle = active; g.beginPath(); g.roundRect(slider.x, cy - th / 2, hx - gap - slider.x, th, [th / 2, 3, 3, th / 2]); g.fill(); }
      if (hx + gap < slider.x + slider.w) { g.fillStyle = P.secondaryContainer; g.beginPath(); g.roundRect(hx + gap, cy - th / 2, slider.x + slider.w - hx - gap, th, [3, th / 2, th / 2, 3]); g.fill(); }
      const hh = hot ? 52 : 44;
      g.fillStyle = active; roundRect(g, hx - 2, cy - hh / 2, 4, hh, 2); g.fill();
      g.fillStyle = P.onSurface; g.font = T.font('labelLargeProminent'); g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(v.muted ? tr('panel.muted') : `${Math.round(v.level)}%`, slider.x + slider.w + 24, cy);
    }

    function hitTest(u, v) {
      const x = u * W, y = v * H;
      const r = regions.find(q => inside(q, x, y));
      if (!r) return null;
      return r.id === 'vol:slider' ? { id: r.id, fraction: volumeFraction(u) } : { id: r.id };
    }
    // Along the volume slider for any u (0 = silent, 1 = full), also off its ends.
    const volumeFraction = u => (slider ? Math.min(1, Math.max(0, (u * W - slider.x) / slider.w)) : 0);
    // On the card (the rest of the canvas lets the laser through).
    const solidAt = (u, v) => !!card && inside(card, u * W, v * H);
    // Scrolling a list that scrolls (m.scroll): is (u, v) on it; where it is (px); move it
    // by px (clamped at the next draw; the caller redraws).
    const scrollAt = (u, v) => maxScroll > 0 && !!list && inside(list, u * W, v * H);
    const scrollBy = px => { scroll = Math.min(maxScroll, Math.max(0, scroll + px)); };
    return { canvas, aspect: H / W, draw, hitTest, solidAt, moving: motion.moving, volumeFraction, bottomCentre: { x: W / 2, y: H },
      cardRect: () => card,                              // the last drawn card { x, y, w, h } (px), or null
      scrollAt, scrollBy, scrollTo: px => { scroll = Math.min(maxScroll, Math.max(0, px)); }, shownScroll: () => scroll, pxPerV: H };
  }

  function createDialog() {
    const W = 720, PAD = 32, BTN_H = 56, LINE = 30, MAX_LINES = 4;   // the title, up to four lines of text, the buttons
    const TEXT_TOP = PAD + 50;                               // where the text starts in the card
    const FIELD_H = 60;                                      // a text field's height (with a field, the text gets at most two lines)
    const H = TEXT_TOP + MAX_LINES * LINE + 20 + BTN_H + PAD;   // room for the tallest card
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const motion = ns.vrMotion.create();
    let regions = [];

    // An M3 dialog: the panels' glass background, extra-large corners; the title (headline), the
    // text, then the buttons at the bottom right: cancel (tonal) and confirm (filled, or
    // the error colour for something that can't be undone). The card is as tall as its text
    // needs, centred in the canvas (the rest see-through).
    function draw(d, ui) {
      ui = motion.step(ui);
      regions = [];
      g.clearRect(0, 0, W, H);
      g.font = T.font('bodyMedium', 22);
      const lines = d.text ? ns.vrKit.wrap(g, d.text, W - PAD * 2, d.field ? 2 : MAX_LINES) : [];
      const fieldRoom = d.field ? FIELD_H + 20 : 0;
      const cardH = (lines.length ? TEXT_TOP + lines.length * LINE : TEXT_TOP - 10) + fieldRoom + 20 + BTN_H + PAD;
      const y0 = Math.round((H - cardH) / 2);
      g.fillStyle = T.panelFill(); roundRect(g, 0, y0, W, cardH, T.shape.extraLarge); g.fill();   // the panels' glass (or solid)
      g.fillStyle = P.onSurface; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText(fitFont(g, d.title || '', W - PAD * 2, 32, '500 '), PAD, y0 + PAD);
      g.fillStyle = P.onSurfaceVariant; g.font = T.font('bodyMedium', 22);
      lines.forEach((line, i) => g.fillText(line, PAD, y0 + TEXT_TOP + i * LINE));
      if (d.field) {                                         // the text field: outlined in the brand colour (it has the keys)
        const fy = y0 + (lines.length ? TEXT_TOP + lines.length * LINE : TEXT_TOP - 10) + 12, fw = W - PAD * 2;
        g.fillStyle = P.surfaceContainerHighest; roundRect(g, PAD, fy, fw, FIELD_H, T.shape.small); g.fill();
        g.strokeStyle = P.brand; g.lineWidth = 2.5; roundRect(g, PAD + 1, fy + 1, fw - 2, FIELD_H - 2, T.shape.small); g.stroke();
        const t = d.field.text || '';
        g.font = T.font('bodyMedium', 24); g.textBaseline = 'middle';
        let shown = t;                                       // (the end of a long name)
        while (shown.length > 1 && g.measureText(shown).width > fw - 48) shown = shown.slice(1);
        g.fillStyle = t ? P.onSurface : P.onSurfaceVariant;
        g.fillText(t ? shown : d.field.placeholder || '', PAD + 18, fy + FIELD_H / 2 + 1);
        const cx = PAD + 18 + (t ? g.measureText(shown).width + 2 : 0);
        g.fillStyle = P.brand; g.fillRect(cx, fy + 14, 2.5, FIELD_H - 28);   // the caret
        g.textBaseline = 'top';
      }
      g.font = T.font('labelLarge', 22);
      const bw = t => Math.max(140, g.measureText(t).width + 56);
      const cw = bw(d.confirm || ''), kw = bw(d.cancel || '');
      const by = y0 + cardH - PAD - BTN_H;
      button(g, regions, 'dialog:confirm', W - PAD - cw, by, cw, BTN_H, { label: d.confirm, kind: d.danger ? 'danger' : 'filled',
        enabled: !d.field || !!(d.field.text || '').trim() }, ui);
      if (d.cancel != null) button(g, regions, 'dialog:cancel', W - PAD - cw - 16 - kw, by, kw, BTN_H, { label: d.cancel, kind: 'tonal' }, ui);
    }
    function hitTest(u, v) { const x = u * W, y = v * H; const r = regions.find(q => inside(q, x, y)); return r ? { id: r.id } : null; }
    return { canvas, aspect: H / W, draw, hitTest, solidAt: () => true, moving: motion.moving };
  }

  ns.vrPopupsUI = { createMenu, createDialog };
})(globalThis.__streamxr = globalThis.__streamxr || {});
