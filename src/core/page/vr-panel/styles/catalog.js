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
//                                    emptyIcon (with no items: emptyText larger in the
//                                      middle with this icon after it: a placeholder) }
//   Control ids: 'tab:<id>', 'pill:<id>', 'item:<index on page>', 'page:prev', 'page:next',
//   'field:<id>' (the field), 'clear:<id>' (its ×), 'submit:<id>' (its button),
//   'suggest:<index>' (a suggestion).
//   Also: hitTest(u, v) -> { id } | null, has(id), imagesReady(), perPage, canvas, aspect.
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
      g.clearRect(0, 0, W, H);
      g.fillStyle = T.panelFill(); roundRect(g, 0, 0, W, H, T.shape.extraLarge); g.fill();

      // The title, then the source tabs to its right (the shared tab row; it slides when
      // they don't all fit: grid.js strips).
      g.fillStyle = P.onSurface; g.font = T.font('titleLargeEmphasized', 34); g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(m.title || '', PAD, HEAD_Y + HEAD_H / 2);
      const titleW = g.measureText(m.title || '').width + 28;
      grid.tabs(m.tabs, m.tab, HEAD_Y, HEAD_H, ui, regions, W - PAD, PAD + titleW);

      // A text field, or filter pills (left-aligned; ones that don't fit are left out), or a note.
      if (m.field) drawField(m.field, ui);
      else if (m.pills && m.pills.length) grid.pills(m.pills, m.pill, PILL_Y, PILL_H, ui, regions, 'left');
      else if (m.note) { g.fillStyle = P.onSurfaceVariant; g.font = T.font('bodyMedium', 22); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(m.note, PAD, PILL_Y + PILL_H / 2); }
      grid.divider(DIVIDER_Y);

      grid.grid(m.items || [], ui, regions, m.emptyText || '', m.loading ? m.now || 0 : null, m.emptyIcon || null);
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

    // (It also tells the sliding rows where the laser is: grid.js strips.)
    const hitTest = (u, v) => { grid.point(u * W, v * H); const r = regionAt(regions, u, v, W, H); return r ? { id: r.id } : null; };
    const has = id => regions.some(r => r.id === id);    // an enabled control from the last draw?

    return { canvas, aspect: H / W, draw, hitTest, has, imagesReady: kit.imagesReady, perPage: grid.PER_PAGE, animating: () => motion.moving() || grid.moving() };
  }

  ns.vrStyles = ns.vrStyles || {};
  ns.vrStyles.catalog = { create, heightFor };
})(globalThis.__streamxr = globalThis.__streamxr || {});
