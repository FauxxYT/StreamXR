// Drawing pieces shared by the card-grid styles (Catalog, Profile) and the search bar
// (orbiters-ui.js): a row of tabs (selected one with a brand-colour indicator, kit.js), a
// row of filter chips (sorts, filters), a text field with its button and the suggestions
// dropping from it, a magnifier, the card grid (laid out to fit the panel), and the paging
// row ("2 / 9+" and arrows). Canvas 2D; cards come from the kit (kit.js). Control ids are
// the standard ones: 'tab:<id>', 'pill:<id>', 'field:<id>' / 'clear:<id>' / 'submit:<id>',
// 'suggest:<index>', 'item:<index on page>', 'page:prev', 'page:next'.
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3;                         // design tokens (tokens.js)

  const { roundRect, cardHeight, FONT } = ns.vrKit;
  const PAD = 48, GAP = 24;
  const MIN_CARD_W = 250, MAX_THUMB_H = 220;
  const SUGGEST = { rowH: 54, max: 8 };   // a text field's suggestions: row height, how many at most

  // g: the panel's 2D context; kit: its card kit; W, H: canvas size; gridTop: where the
  // cards start (below the panel's own header); lines: how many grey lines the cards have
  // under their title (it sets the cards' standard height, kit.cardHeight). The grid fits as
  // many columns (cards at least MIN_CARD_W px wide; their thumbnails 16:9, at most
  // MAX_THUMB_H tall) and rows as the space above the paging row allows.
  // fit: move the paging row up to just under the last row of cards (no empty band between);
  // the panel then trims its canvas to the returned `height`.
  // Returns { PER_PAGE, height, tabs(...), pills(...), divider(y), grid(...), paging(...),
  // point(x, y), moving() } (the sliding rows: see `strips`);
  // each drawing call pushes its clickable rectangles onto the `regions` array it is given.
  function createGrid(g, kit, W, H, gridTop, lines = 2, fit = false) {
    const COLS = Math.max(1, Math.floor((W - PAD * 2 + GAP) / (MIN_CARD_W + GAP)));
    const CARD_W = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
    const THUMB_H = Math.min(MAX_THUMB_H, Math.round(CARD_W * 9 / 16));
    const CARD_H = cardHeight(THUMB_H, lines);
    const ROWS = Math.max(1, Math.floor((H - 82 - 20 - gridTop + GAP) / (CARD_H + GAP)));
    const BOTTOM_Y = fit ? gridTop + ROWS * (CARD_H + GAP) - GAP + 28 : H - 82;   // paging row
    const PER_PAGE = COLS * ROWS;
    const BOX = { w: CARD_W, h: CARD_H, thumbH: THUMB_H };
    const ARROWS = { prev: { x: W - PAD - 124, y: BOTTOM_Y - 2, w: 56, h: 56 }, next: { x: W - PAD - 56, y: BOTTOM_Y - 2, w: 56, h: 56 } };   // round tonal buttons

    // The tab row and the left-aligned chip row slide sideways when they're wider than their
    // room (kit.js createStrip: while the laser is near an end). point(x, y) passes the
    // laser's place on the canvas on to them (the style's hitTest); moving() is true while
    // one slides.
    const strips = { tabs: ns.vrKit.createStrip(), pills: ns.vrKit.createStrip() };
    const point = (x, y) => { strips.tabs.point(x, y); strips.pills.point(x, y); };
    const moving = () => strips.tabs.moving() || strips.pills.moving();

    // Tabs from x0 (default the left padding) at row y (height h): [{ id, label, icon }],
    // `active` is the selected id; ids 'tab:<id>'. Drawn by the kit's M3 tabs (kit.js
    // drawTabs), each at its full size; maxX: the row must end before it (e.g. where
    // right-hand pills start); a row that doesn't fit slides (strips). Returns where it ends.
    function tabs(list, active, y, h, ui, regions, maxX = W - PAD, x0 = PAD) {
      const contentW = ns.vrKit.drawTabs(g, list, active, ui, [], { x: 0, y, h, natural: true, measure: true });
      const key = (list || []).map(t => t.id).join(',');
      strips.tabs.draw(g, regions, { x: x0, y, w: maxX - x0, h }, contentW, key,
        (ctx, reg, x) => ns.vrKit.drawTabs(ctx, list, active, ui, reg, { x, y, h, natural: true, maxX: Infinity }));
      return Math.min(maxX, x0 + contentW);
    }

    // M3 filter chips (kit.js chip) in a row of height h at y: [{ id, label }], ids
    // 'pill:<id>'; the `active` one tonal with a check, the others outlined.
    // align 'right': packed against `rightEdge` (sorts); returns where the leftmost one
    // starts (rightEdge with none). align 'left': from x = `left` rightwards, all of them,
    // sliding when they pass `rightEdge` (filters: strips).
    function pills(list, active, y, h, ui, regions, align = 'right', left = PAD, rightEdge = W - PAD) {
      const py = y + 4, ph = h - 8;
      const chipW = (p, on) => ns.vrKit.chipWidth(g, p.label, on);
      const one = (ctx, reg, p, x, w) => ns.vrKit.chip(ctx, reg, `pill:${p.id}`, x, py, w, ph, p.label, p.id === active, ui);
      g.textBaseline = 'middle';
      if (align === 'right') {
        let right = rightEdge;
        for (const p of [...(list || [])].reverse()) {
          const w = chipW(p, p.id === active);
          right -= w;
          one(g, regions, p, right, w);
          right -= 10;
        }
        return list && list.length ? right + 10 : rightEdge;
      }
      const ws = (list || []).map(p => chipW(p, p.id === active));
      const contentW = ws.reduce((s, w) => s + w + 10, 0) - (ws.length ? 10 : 0);
      const key = (list || []).map(p => p.label).join('\u0001');
      strips.pills.draw(g, regions, { x: left, y, w: rightEdge - left, h }, contentW, key, (ctx, reg, x) => {
        ctx.textBaseline = 'middle';
        (list || []).forEach((p, i) => { one(ctx, reg, p, x, ws[i]); x += ws[i] + 10; });
      });
    }

    // A thin line across the panel.
    const divider = y => { g.fillStyle = P.outlineVariant; g.fillRect(PAD, y, W - PAD * 2, 1); };

    // A text field with its button, in the box (x, y, w, h) (the button, 150 px, at its right
    // end): f = { id, text, placeholder, focused (outlined, with a caret), button (label),
    // clearable (an ×; default: when there's text) }. The text keeps its end (and the caret)
    // in view. Ids 'field:<id>', 'clear:<id>' (wins over the field), 'submit:<id>'. Optional
    // f.solid (0..1): the field glass (the panels' tint) at 0, solid at 1 (the search bar).
    // M3 look: a full-round filled field (surfaceContainerHighest) with a search icon, the
    // text (onSurface) or the placeholder (onSurfaceVariant); focused: a brand-colour outline
    // and caret; pointed at: the white ring. Its button is filled in the brand colour (kit button).
    function field(f, ui, regions, x0, y, wAll, h) {
      const bw = 150, x = x0, w = wAll - bw - 12;
      const fid = `field:${f.id}`, cid = `clear:${f.id}`, sid = `submit:${f.id}`;
      regions.push({ id: fid, x, y, w, h });
      // Its fill: solid, or (f.solid given, 0..1) the panels' glass tint turning solid as f.solid rises.
      if (f.solid == null) { g.fillStyle = P.surfaceContainerHighest; roundRect(g, x, y, w, h, h / 2); g.fill(); }
      else {
        g.fillStyle = T.panelFill(); roundRect(g, x, y, w, h, h / 2); g.fill();
        if (f.solid > 0.01) { g.globalAlpha = f.solid; g.fillStyle = P.surfaceContainerHighest; roundRect(g, x, y, w, h, h / 2); g.fill(); g.globalAlpha = 1; }
      }
      if (f.focused) { g.strokeStyle = P.brand; g.lineWidth = 3; roundRect(g, x + 1.5, y + 1.5, w - 3, h - 3, h / 2 - 1.5); g.stroke(); }
      const text = f.text || '', clearable = f.clearable != null ? !!f.clearable : !!text;
      g.fillStyle = P.onSurfaceVariant; ns.vrSymbols.draw(g, 'search', x + 30, y + h / 2, 28, false);
      const clearW = clearable ? 44 : 0, tx = x + 56, maxW = w - 56 - 24 - clearW;
      g.font = `24px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.save(); g.beginPath(); g.rect(tx - 2, y, maxW + 6, h); g.clip();
      const tw = g.measureText(text).width, shift = Math.max(0, tw - maxW);
      g.fillStyle = text ? P.onSurface : P.onSurfaceVariant;
      g.fillText(text || f.placeholder || '', tx - shift, y + h / 2 + 1);
      if (f.focused) { g.fillStyle = P.brand; g.fillRect(tx - shift + tw + 2, y + 11, 3, h - 22); }
      g.restore();
      if (clearable) {
        const cx = x + w - 30, cy = y + h / 2, hot = ui.hover === cid, down = ui.pressed === cid;
        regions.unshift({ id: cid, x: cx - 20, y, w: 40, h });
        if (hot || down) { g.fillStyle = T.m3Alpha('onSurface', down ? 0.12 : 0.08); g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = P.onSurfaceVariant; ns.vrSymbols.draw(g, 'close', cx, cy, 26, false);
        if (hot) ns.vrKit.hoverRing(g, cx - 20, cy - 20, 40, 40, 20);
      }
      if (ui.hover === fid) ns.vrKit.hoverRing(g, x, y, w, h, h / 2);
      ns.vrKit.button(g, regions, sid, x + w + 12, y, bw, h, { label: f.button || '', kind: 'filled' }, ui);
    }

    // A search icon (Material Symbols) centred on (cx, cy) in `color`, 26 px × scale.
    function magnifier(cx, cy, color, scale = 1) {
      g.fillStyle = color; ns.vrSymbols.draw(g, 'search', cx, cy, 26 * scale, false);
    }

    // Suggestions dropping down from a text field (f.suggestions, at most SUGGEST.max), x,
    // y0 (their top), w wide, over whatever is below (their regions go first, so they win the
    // hit test over it): an M3 menu, each row a magnifier and the text, the part after what's
    // typed (f.text) in bold. Ids 'suggest:<index>'. Returns the menu's height.
    function suggestions(f, ui, regions, x, y0, w) {
      const list = (f.suggestions || []).slice(0, SUGGEST.max);
      if (!list.length) return 0;
      const h = list.length * SUGGEST.rowH + 12;
      g.save();
      if (!T.glass.on) { g.shadowColor = T.m3Alpha('shadow', 0.5); g.shadowBlur = 24; }   // (under glass a shadow shows as a hazy ring)
      g.fillStyle = P.surfaceContainerHigh; roundRect(g, x, y0, w, h, T.shape.large); g.fill();   // an M3 menu
      g.restore();
      const typed = (f.text || '').toLowerCase();
      list.forEach((s, i) => {
        const id = `suggest:${i}`, y = y0 + 6 + i * SUGGEST.rowH;
        regions.unshift({ id, x, y, w, h: SUGGEST.rowH });
        const hot = ui.hover === id, down = ui.pressed === id;
        if (hot || down) { g.fillStyle = T.m3Alpha('onSurface', down ? 0.12 : 0.08); roundRect(g, x + 6, y, w - 12, SUGGEST.rowH, T.shape.medium); g.fill(); }
        if (hot) ns.vrKit.hoverRing(g, x + 6, y, w - 12, SUGGEST.rowH, T.shape.medium);
        const my = y + SUGGEST.rowH / 2;
        magnifier(x + 34, my, P.onSurfaceVariant);
        // The text: what's typed as is, the rest in bold.
        const lead = typed && s.toLowerCase().startsWith(typed) ? s.slice(0, typed.length) : '';
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.font = `24px ${FONT}`; g.fillStyle = P.onSurfaceVariant; g.fillText(lead, x + 64, my + 1);
        const lw = g.measureText(lead).width;
        g.font = `600 24px ${FONT}`; g.fillStyle = P.onSurface; g.fillText(s.slice(lead.length), x + 64 + lw, my + 1);
      });
      return h;
    }

    // This page's cards (ids 'item:<index on page>'), or `emptyText` when there are none:
    // while loading (`loadingAt`: the clock in seconds, else null), under the loading
    // indicator in the middle of the grid; with `emptyIcon` (a Material Symbols name), larger
    // in the middle of the grid with the icon after it (a placeholder, e.g. "Coming soon").
    function grid(cards, ui, regions, emptyText, loadingAt = null, emptyIcon = null) {
      if (!cards.length && emptyIcon) {
        const cy = gridTop + (BOTTOM_Y - gridTop) / 2, ICON = 44;
        g.font = T.font('titleMedium', 32); g.textAlign = 'left'; g.textBaseline = 'middle';
        const tw = g.measureText(emptyText).width, x = (W - tw - 14 - ICON) / 2;
        g.fillStyle = P.onSurfaceVariant;
        g.fillText(emptyText, x, cy + 1);
        ns.vrSymbols.draw(g, emptyIcon, x + tw + 14 + ICON / 2, cy, ICON, false);
      } else if (!cards.length && loadingAt != null) {
        const cy = gridTop + Math.min(160, (BOTTOM_Y - gridTop) / 2);
        ns.vrGlyphs.spinner(g, W / 2, cy - 24, 32, loadingAt, false);
        g.fillStyle = P.onSurfaceVariant; g.font = `24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(emptyText, W / 2, cy + 44);
      } else if (!cards.length) {
        g.fillStyle = P.onSurfaceVariant; g.font = `24px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(emptyText, PAD, gridTop + 40);
      }
      cards.forEach((card, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        kit.drawCard(card, PAD + col * (BOX.w + GAP), gridTop + row * (BOX.h + GAP), BOX, ui, regions, `item:${i}`);
      });
    }

    // A paging arrow: a round tonal button (kit button) with ‹ or ›; disabled ones are faded
    // and not clickable.
    function arrow(key, dir, enabled, ui, regions) {
      const r = ARROWS[key];
      ns.vrKit.button(g, regions, `page:${key}`, r.x, r.y, r.w, r.h, { icon: dir < 0 ? 'chevron_left' : 'chevron_right', enabled }, ui);
    }

    // Paging row: "2 / 9" (with "+" while more can still load), "Loading more…", arrows.
    // m: { items, page, pageCount, more, loading }.
    function paging(m, ui, regions) {
      const items = m.items || [];
      const pages = Math.max(1, m.pageCount || 1);
      g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle';
      if (items.length) g.fillText(`${m.page + 1} / ${pages}${m.more ? '+' : ''}`, ARROWS.prev.x - 16, BOTTOM_Y + 26);
      if (m.loading && items.length) { g.textAlign = 'left'; g.fillText(ns.i18n.t('style.loadingMore'), PAD, BOTTOM_Y + 26); }
      arrow('prev', -1, m.page > 0, ui, regions);
      arrow('next', 1, m.page < pages - 1, ui, regions);
    }

    return { PER_PAGE, height: BOTTOM_Y + 82, tabs, pills, field, suggestions, magnifier, divider, grid, paging, point, moving };
  }

  ns.vrStyleGrid = { createGrid, PAD };
})(globalThis.__streamxr = globalThis.__streamxr || {});
