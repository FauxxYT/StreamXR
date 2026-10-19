// Catalog style (canvas 2D): a big browsable grid. A title with source tabs beside it, a
// row of filter pills (or a grey note, or a text field with its button), then the card grid
// and the paging row (grid.js). YouTube's Browse (Home / Subscriptions, topic chips) and
// Search; another site's catalogue. Knows nothing about any site: the provider fills the
// model (ARCHITECTURE.md).
//
//   const style = ns.vrStyles.catalog.create(onImageLoaded, W, Hmax);   // px; the canvas is
//                 trimmed so the paging row sits right under the cards that fit (heightFor)
//   style.draw(model, ui)   model: { title, tabs: [{ id, label, icon }], tab, pills: [{ id, label }],
//                                    pill, note (shown when there are no pills),
//                                    field: null | { id, text, placeholder, focused (outlined,
//                                      with a caret), button (its button's label), clearable
//                                      (show its ×; default: when it has text), suggestions:
//                                      [text] (a list dropping down over the cards, up to 8;
//                                      the part after what's typed in bold) } (shown instead
//                                      of pills and note),
//                                    items: [cards for this page], page, pageCount, more,
//                                    loading (with no items: the loading indicator above
//                                      emptyText), now (seconds, its clock), emptyText,
//                                    shape: 'square' (square cards, e.g. podcasts' covers:
//                                      grid.js) | null (the standard 16:9 ones),
//                                    body: null | { kind: 'collection', ... } (a playlist or
//                                      other list opened from a card: collection.js, under a
//                                      back button in the pills' place, scrolling: scroll px),
//                                    emptyIcon (with no items: emptyText larger in the
//                                      middle with this icon after it: a placeholder) }
//   Control ids: 'tab:<id>', 'pill:<id>', 'item:<index on page>', 'page:prev', 'page:next',
//   'field:<id>' (the field), 'clear:<id>' (its ×), 'submit:<id>' (its button),
//   'suggest:<index>' (a suggestion); with a collection: 'back', 'action:<id>', 'row:<index>',
//   'text' (the page itself: a drag can start there).
//   Scrolling (a collection): scrollAt(u, v), maxScroll(), shownScroll(), pxPerV.
//   Also: hitTest(u, v) -> { id } | null, has(id), imagesReady(), perPage, perPageFor(shape),
//   canvas, aspect.
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha;        // design tokens (tokens.js)

  const { roundRect, regionAt, FONT } = ns.vrKit;
  const PAD = 48;
  const HEAD_Y = 30, HEAD_H = 56;        // title + source tabs
  const PILL_Y = 104, PILL_H = 52;       // filter pills
  const DIVIDER_Y = PILL_Y + PILL_H + 14;
  const GRID_TOP = DIVIDER_Y + 22;

  // The canvas height a Catalog W px wide and at most Hmax tall trims itself to (other
  // panels use it to match its size).
  const heightFor = (W, Hmax) => ns.vrStyleGrid.createGrid(null, null, W, Hmax, GRID_TOP, 2, true).height;

  function create(onImageLoaded, W = 1280, Hmax = 960) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    const g = canvas.getContext('2d');
    const kit = ns.vrKit.createCardKit(g, onImageLoaded);
    const grid = ns.vrStyleGrid.createGrid(g, kit, W, Hmax, GRID_TOP, 2, true);
    const H = canvas.height = grid.height;
    let regions = [];

    const motion = ns.vrMotion.create();                // hover / press easing (motion.js)
    function draw(m, ui) {
      ui = motion.step(ui);
      regions = [];
      scrollable = false; maxScrollPx = 0; scrollPx = 0;
      g.clearRect(0, 0, W, H);
      g.fillStyle = T.panelFill(); roundRect(g, 0, 0, W, H, T.shape.extraLarge); g.fill();

      // The title, then the source tabs to its right (the shared tab row; it slides when
      // they don't all fit: grid.js strips).
      g.fillStyle = P.onSurface; g.font = T.font('titleLargeEmphasized', 34); g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(m.title || '', PAD, HEAD_Y + HEAD_H / 2);
      const titleW = g.measureText(m.title || '').width + 28;
      grid.tabs(m.tabs, m.tab, HEAD_Y, HEAD_H, ui, regions, W - PAD, PAD + titleW);
      // A collection opened from a card (collection.js) takes the pills row (its back button)
      // and the grid's place, scrolling.
      if (m.body && m.body.kind === 'collection') { drawCollection(m.body, m, ui); return; }

      // A text field, or filter pills (left-aligned; ones that don't fit are left out), or a note.
      if (m.field) drawField(m.field, ui);
      else if (m.pills && m.pills.length) grid.pills(m.pills, m.pill, PILL_Y, PILL_H, ui, regions, 'left');
      else if (m.note) { g.fillStyle = P.onSurfaceVariant; g.font = T.font('bodyMedium', 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(m.note, PAD, PILL_Y + PILL_H / 2); }
      grid.divider(DIVIDER_Y);

      grid.grid(m.items || [], ui, regions, m.emptyText || '', m.loading ? m.now || 0 : null, m.emptyIcon || null, m.shape || null);
      grid.paging(m, ui, regions);
      if (m.field && (m.field.suggestions || []).length) drawSuggestions(m.field, ui);   // over the cards
    }

    // The text field on the pills row: a rounded box (outlined in the brand colour while focused), its
    // text (the end of it when it's too long) or a grey placeholder, a caret while focused,
    // an × to clear it when it has text, and its button on the right.
    const drawField = (f, ui) => grid.field(f, ui, regions, PAD, PILL_Y, W - PAD * 2, PILL_H);

    // The suggestions dropping down from the field, over the cards (grid.js), as wide as the
    // field without its button.
    const drawSuggestions = (f, ui) => grid.suggestions(f, ui, regions, PAD, PILL_Y + PILL_H + 6, W - PAD * 2 - 150 - 12);

    // ------------------------------------------------------------ collection page
    // The back button ('back') on the pills row, then the page scrolling in the grid's area,
    // with a scroll bar on the right when it's taller. The last draw's scroll state is kept
    // for the host (scrollAt, maxScroll, shownScroll).
    const collection = ns.vrStyleCollection.create(g, kit);
    const VIEW = { x: PAD, y: GRID_TOP - 8, w: W - PAD * 2 - 24, h: H - (GRID_TOP - 8) - 20 };
    let scrollable = false, maxScrollPx = 0, scrollPx = 0;
    // A region pushed only for its part inside the scrolling area (nothing if none shows).
    function clipRegion(id, x, y, w, h) {
      const a = Math.max(VIEW.y, y), b = Math.min(VIEW.y + VIEW.h, y + h);
      if (b > a) regions.push({ id, x, y: a, w, h: b - a });
    }
    function drawCollection(b, m, ui) {
      g.font = `500 22px ${FONT}`;
      const bw = g.measureText(b.back || '').width + 48 + 36;
      ns.vrKit.button(g, regions, 'back', PAD, PILL_Y + 4, bw, 44, { icon: 'arrow_back', label: b.back || '' }, ui);
      grid.divider(DIVIDER_Y);
      const lay = collection.layout(b, VIEW.w);
      scrollable = true;
      maxScrollPx = Math.max(0, lay.height + 12 - VIEW.h);
      scrollPx = Math.min(maxScrollPx, Math.max(0, collection.scrollFor(b, lay, VIEW.h, m.scroll)));
      g.save(); g.beginPath(); g.rect(VIEW.x - 8, VIEW.y, VIEW.w + 16, VIEW.h); g.clip();
      collection.draw(b, lay, m, ui, VIEW.x, VIEW.y - scrollPx, VIEW, clipRegion);
      g.restore();
      if (maxScrollPx > 0) {
        const barH = Math.max(40, VIEW.h * VIEW.h / (VIEW.h + maxScrollPx));
        const barY = VIEW.y + (VIEW.h - barH) * (scrollPx / maxScrollPx);
        g.fillStyle = PA('onSurface', 0.08); roundRect(g, W - 30, VIEW.y, 8, VIEW.h, 4); g.fill();
        g.fillStyle = PA('onSurface', 0.45); roundRect(g, W - 30, barY, 8, barH, 4); g.fill();
      }
      regions.push({ id: 'text', x: VIEW.x - 8, y: VIEW.y, w: VIEW.w + 16, h: VIEW.h });   // (last: drags start here)
    }

    // (It also tells the sliding rows where the laser is: grid.js strips.)
    const hitTest = (u, v) => { grid.point(u * W, v * H); const r = regionAt(regions, u, v, W, H); return r ? { id: r.id } : null; };
    const has = id => regions.some(r => r.id === id);    // an enabled control from the last draw?
    // Is (u, v) on the scrolling collection page of the last draw?
    const scrollAt = (u, v) => scrollable && u * W >= VIEW.x - 8 && u * W <= W - 16 && v * H >= VIEW.y && v * H <= VIEW.y + VIEW.h;

    return { canvas, aspect: H / W, draw, hitTest, has, scrollAt, imagesReady: kit.imagesReady, perPage: grid.PER_PAGE,
      maxScroll: () => maxScrollPx, shownScroll: () => scrollPx, pxPerV: H,   // (a collection page's scrolling)
      perPageFor: shape => (shape === 'square' ? grid.PER_PAGE_SQUARE : grid.PER_PAGE),   // cards per page in a layout
      animating: () => motion.moving() || grid.moving() };
  }

  ns.vrStyles = ns.vrStyles || {};
  ns.vrStyles.catalog = { create, heightFor };
})(globalThis.__streamxr = globalThis.__streamxr || {});
