// Queue style (canvas 2D): a short paged grid of cards with the title or tabs and the page
// arrows in its header. What's next to watch: YouTube's "Up Next" (Recommended / a
// playlist's videos); another site's episodes or "More like this". Knows nothing about any
// site: the provider fills the model (ARCHITECTURE.md).
//
//   const style = ns.vrStyles.queue.create(onImageLoaded, W, H);   // canvas size in px
//   style.draw(model, ui)   model: { title (when there are no tabs), tabs: null | [{ id, label, icon }],
//                                    tab, items: [cards for this page] (kit.js), page, pageCount,
//                                    emptyText (shown when there are no items) }
//                           ui: { hover, pressed } (control ids)
//   Control ids: 'tab:<id>', 'page:prev', 'page:next', 'item:<index on page>'.
//   Also: hitTest(u, v) -> { id } | null, has(id), imagesReady(), perPage, canvas, aspect.
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha;        // design tokens (tokens.js)

  const { roundRect, cardHeight, createCardKit, headerTabs, button, regionAt, FONT } = ns.vrKit;

  // A grid of cards fills the area under the header (title + page arrows): 3 across, as
  // many rows as fit (a tall panel shows more); each card is a
  // 16:9 thumbnail with text below it. The cards are as wide as the panel allows; height
  // left over is shared out above, between and below the rows.
  const PAD = 48, GAP = 22, TOP = 84, BOTTOM = 28;          // outer margin, gap between cards, header height, bottom margin

  function create(onImageLoaded, W = 1024, H = 680) {
    const COLS = 3;
    const CARD_W = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
    const THUMB_H = Math.round(CARD_W * 9 / 16);
    const CARD_H = cardHeight(THUMB_H);
    const ROWS = Math.max(1, Math.floor((H - TOP - BOTTOM + GAP) / (CARD_H + GAP))), PER_PAGE = COLS * ROWS;
    const spare = Math.max(0, (H - TOP - BOTTOM - ROWS * CARD_H - GAP * (ROWS - 1)) / (ROWS + 1));
    const ROW_GAP = GAP + spare, GRID_Y = TOP + spare;
    const ARROWS = { prev: { x: W - PAD - 124, y: 14, w: 56, h: 56 }, next: { x: W - PAD - 56, y: 14, w: 56, h: 56 } };   // round tonal buttons
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    let regions = [];                                       // clickable rectangles from the last draw: [{ id, x, y, w, h }]
    const kit = createCardKit(g, onImageLoaded);
    const BOX = { w: CARD_W, h: CARD_H, thumbH: THUMB_H };

    // A paging arrow: a round tonal button (kit button) with ‹ or ›. Disabled arrows are
    // faded and aren't added to the clickable regions.
    function drawArrow(key, dir, enabled, ui) {
      const r = ARROWS[key];
      button(g, regions, `page:${key}`, r.x, r.y, r.w, r.h, { icon: dir < 0 ? 'chevron_left' : 'chevron_right', enabled }, ui);
    }

    // Paint the whole panel: background, header (the title, or the tabs; page counter and
    // arrows when there is more than one page), then this page's cards (or emptyText).
    const motion = ns.vrMotion.create();                // hover / press easing (motion.js)
    function draw(m, ui) {
      ui = motion.step(ui);
      regions = [];
      g.clearRect(0, 0, W, H);
      g.fillStyle = T.panelFill(); roundRect(g, 0, 0, W, H, T.shape.extraLarge); g.fill();

      g.fillStyle = P.onSurface; g.font = T.font('titleLargeEmphasized', 30); g.textAlign = 'left'; g.textBaseline = 'middle';
      const paged = m.pageCount > 1;
      g.font = `22px ${FONT}`;
      const countLeft = ARROWS.prev.x - 16 - (paged ? g.measureText(`${m.page + 1} / ${m.pageCount}`).width + 16 : 0);
      g.font = T.font('titleLargeEmphasized', 30);
      if (m.tabs && m.tabs.length) headerTabs(g, m.tabs, m.tab, ui, regions, PAD, { maxX: paged ? countLeft : W - PAD });
      else g.fillText(m.title || '', PAD, 42);
      if (paged) {
        g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(`${m.page + 1} / ${m.pageCount}`, ARROWS.prev.x - 16, 42);
        drawArrow('prev', -1, m.page > 0, ui);
        drawArrow('next', 1, m.page < m.pageCount - 1, ui);
      }

      const items = m.items || [];
      if (!items.length) {
        g.fillStyle = P.onSurfaceVariant; g.font = `24px ${FONT}`; g.textAlign = 'left';
        g.fillText(m.emptyText || '', PAD, TOP + 30);
        return;
      }
      items.forEach((card, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        kit.drawCard(card, PAD + col * (CARD_W + GAP), GRID_Y + row * (CARD_H + ROW_GAP), BOX, ui, regions, `item:${i}`);
      });
    }

    const hitTest = (u, v) => { const r = regionAt(regions, u, v, W, H); return r ? { id: r.id } : null; };
    const has = id => regions.some(r => r.id === id);    // an enabled control from the last draw?

    return { canvas, aspect: H / W, draw, hitTest, has, imagesReady: kit.imagesReady, perPage: PER_PAGE, animating: motion.moving };
  }

  ns.vrStyles = ns.vrStyles || {};
  ns.vrStyles.queue = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
