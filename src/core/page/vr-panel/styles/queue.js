// Queue style (canvas 2D): a short paged grid of cards (or a playlist as a page) with the
// title or tabs and the page arrows in its header. What's next to watch: YouTube's "Up Next"
// (Recommended / a playlist's videos); another site's episodes or "More like this". Knows
// nothing about any site: the provider fills the model (ARCHITECTURE.md).
//
//   const style = ns.vrStyles.queue.create(onImageLoaded, W, H);   // canvas size in px
//   style.draw(model, ui)   model: { title (when there are no tabs), tabs: null | [{ id, label, icon }],
//                                    tab, items: [cards for this page] (kit.js), page, pageCount,
//                                    emptyText (shown when there are no items),
//                                    body: null | { kind: 'collection', ... } (a playlist as a page in
//                                      the cards' place: collection.js; under a back button when
//                                      it has `back`; scrolling: scroll px, null to show its
//                                      focusRow), now (seconds, the spinner's clock) }
//                           ui: { hover, pressed } (control ids)
//   Control ids: 'tab:<id>', 'page:prev', 'page:next', 'item:<index on page>'; with a
//   collection: 'back', 'action:<id>', 'row:<index>', 'text' (the page: a drag can start there).
//   Scrolling (a collection): scrollAt(u, v), maxScroll(), shownScroll(), pxPerV.
//   Also: hitTest(u, v) -> { id } | null, has(id), rectOf(id) -> { x, y, w, h } (px) | null,
//   imagesReady(), perPage, canvas, aspect.
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

    // ------------------------------------------------------------ collection page
    // A playlist as a page (collection.js) in the cards' place: a back button first when it
    // has one, then the page scrolling, with a scroll bar on the right when it's taller. The
    // last draw's scroll state is kept for the host (scrollAt, maxScroll, shownScroll).
    const collection = ns.vrStyleCollection.create(g, kit);
    let scrollable = false, maxScrollPx = 0, scrollPx = 0, view = null;
    function clipRegion(id, x, y, w, h) {
      const a = Math.max(view.y, y), b = Math.min(view.y + view.h, y + h);
      if (b > a) regions.push({ id, x, y: a, w, h: b - a });
    }
    function drawCollection(b, m, ui) {
      let y = TOP;
      if (b.back) {
        g.font = `500 22px ${FONT}`;
        const bw = g.measureText(b.back).width + 48 + 36;
        button(g, regions, 'back', PAD, y, bw, 44, { icon: 'arrow_back', label: b.back }, ui);
        y += 44 + 16;
      }
      view = { x: PAD, y, w: W - PAD * 2 - 24, h: H - y - BOTTOM };
      const lay = collection.layout(b, view.w);
      scrollable = true;
      maxScrollPx = Math.max(0, lay.height + 12 - view.h);
      scrollPx = Math.min(maxScrollPx, Math.max(0, collection.scrollFor(b, lay, view.h, m.scroll)));
      g.save(); g.beginPath(); g.rect(view.x - 8, view.y, view.w + 16, view.h); g.clip();
      collection.draw(b, lay, m, ui, view.x, view.y - scrollPx, view, clipRegion);
      g.restore();
      if (maxScrollPx > 0) {
        const barH = Math.max(40, view.h * view.h / (view.h + maxScrollPx));
        const barY = view.y + (view.h - barH) * (scrollPx / maxScrollPx);
        g.fillStyle = PA('onSurface', 0.08); roundRect(g, W - 30, view.y, 8, view.h, 4); g.fill();
        g.fillStyle = PA('onSurface', 0.45); roundRect(g, W - 30, barY, 8, barH, 4); g.fill();
      }
      regions.push({ id: 'text', x: view.x - 8, y: view.y, w: view.w + 16, h: view.h });   // (last: drags start here)
    }

    // Paint the whole panel: background, header (the title, or the tabs; page counter and
    // arrows when there is more than one page), then this page's cards (or emptyText).
    const motion = ns.vrMotion.create();                // hover / press easing (motion.js)
    function draw(m, ui) {
      ui = motion.step(ui);
      regions = [];
      scrollable = false; maxScrollPx = 0; scrollPx = 0;
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

      if (m.body && m.body.kind === 'collection') { drawCollection(m.body, m, ui); return; }
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
    // A control's place in the last draw (px; for a menu opening from it, e.g. a page's button), or null.
    const rectOf = id => { const r = regions.find(x => x.id === id); return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null; };
    // Is (u, v) on the scrolling collection page of the last draw?
    const scrollAt = (u, v) => scrollable && !!view && u * W >= view.x - 8 && u * W <= W - 16 && v * H >= view.y && v * H <= view.y + view.h;

    return { canvas, aspect: H / W, draw, hitTest, has, rectOf, scrollAt, imagesReady: kit.imagesReady, perPage: PER_PAGE, animating: motion.moving,
      maxScroll: () => maxScrollPx, shownScroll: () => scrollPx, pxPerV: H };   // (a collection page's scrolling)
  }

  ns.vrStyles = ns.vrStyles || {};
  ns.vrStyles.queue = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
