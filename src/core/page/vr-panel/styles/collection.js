// A collection page (canvas 2D), shared by the styles that open one in place of their list
// (Catalog, Profile): a picture with the title, grey lines and a description beside it, a
// row of buttons, then the collection's items as rows (number, thumbnail with its corner
// text, title, a grey line), scrolling together. A playlist, an album, a season. Knows
// nothing about any site. The style draws the bar with the back button above it.
//
//   const c = ns.vrStyleCollection.create(g, kit);
//   c.layout(b, width) -> { head, listTop, rowH, height }   laid out for a page `width` px wide
//                                          (row i's top: listTop + i * rowH)
//   c.scrollFor(b, lay, viewH, scroll) -> px    the scroll to show (focusRow when scroll is null)
//   c.draw(b, lay, m, ui, x, top, view, clipRegion)   the page, content top at
//                                          `top`, left edge x; only what's inside `view`
//                                          ({ y, h }); m.now (seconds) turns the spinner
//   body b: { kind: 'collection', back (the back button's label), image, title,
//     lines: [grey lines] (e.g. its author, "24 videos · 1.2K views"), text (a description),
//     buttons: [{ id, label, icon, kind: 'filled' | 'tonal', enabled }],
//     rows: [{ thumb, corner (e.g. a duration), title, line (grey), current (playing now) }],
//     loading (more rows coming: a spinner after them, or alone), emptyText, focusRow (a row
//     to bring into view: a style given no scroll puts it a third of the way down) }
//   Control ids: 'action:<id>' (its buttons), 'row:<index>' (a row).
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha;        // design tokens (tokens.js)

  const { roundRect, wrap, FONT } = ns.vrKit;
  const CL = { imgMax: 360, gap: 24, title: 28, titleLine: 36, line: 28, text: 19, textLine: 26,
    btnH: 52, btnGap: 12, rowH: 100, num: 40, thumbW: 152, thumbH: 86, rowTitle: 21, rowLine: 27, more: 64 };

  function create(g, kit) {
    // The heading's size at `width`: the picture (16:9) and the text column beside it; the
    // description gets the lines left beside the picture (at least 2).
    function layout(b, width) {
      const imgW = Math.min(CL.imgMax, Math.round(width * 0.42)), imgH = Math.round(imgW * 9 / 16);
      const textW = width - imgW - CL.gap;
      g.font = T.font('titleLargeEmphasized', CL.title);
      const title = wrap(g, b.title || '', textW, 2);
      g.font = `${CL.text + 1}px ${FONT}`;
      const lines = (b.lines || []).filter(Boolean).map(l => wrap(g, l, textW, 1)[0] || '');
      const used = title.length * CL.titleLine + 8 + lines.length * CL.line + 8;
      g.font = `${CL.text}px ${FONT}`;
      const fit = Math.max(2, Math.floor((imgH - used) / CL.textLine));
      const text = b.text ? wrap(g, b.text.replace(/\s+/g, ' '), textW, fit) : [];
      const headH = Math.max(imgH, used + text.length * CL.textLine);
      const rows = (b.rows || []).length;
      const listTop = headH + CL.gap + ((b.buttons || []).length ? CL.btnH + CL.gap : 0) + 2 + 12;
      const height = listTop + rows * CL.rowH + (b.loading || !rows ? CL.more : 0);
      return { head: { imgW, imgH, textW, title, lines, text, headH }, listTop, rowH: CL.rowH, height };
    }

    function draw(b, lay, m, ui, x, top, view, clipRegion) {
      const { imgW, imgH, textW, title, lines, text, headH } = lay.head;
      const width = imgW + CL.gap + textW;
      const shows = (y, h) => y + h >= view.y && y <= view.y + view.h;
      g.textAlign = 'left'; g.textBaseline = 'top';

      // The heading: the picture, then the title, grey lines and description beside it.
      if (shows(top, headH)) {
        g.save(); roundRect(g, x, top, imgW, imgH, 16); g.clip();
        const img = kit.image(b.image);
        if (img) kit.drawImageCover(img, x, top, imgW, imgH);
        else { g.fillStyle = P.surfaceContainerHighest; g.fillRect(x, top, imgW, imgH); }
        g.restore();
        const tx = x + imgW + CL.gap;
        let ty = top;
        g.fillStyle = P.onSurface; g.font = T.font('titleLargeEmphasized', CL.title);
        for (const l of title) { g.fillText(l, tx, ty); ty += CL.titleLine; }
        ty += 8;
        g.fillStyle = P.onSurfaceVariant; g.font = `${CL.text + 1}px ${FONT}`;
        for (const l of lines) { g.fillText(l, tx, ty); ty += CL.line; }
        ty += 8;
        g.font = `${CL.text}px ${FONT}`;
        for (const l of text) { g.fillText(l, tx, ty); ty += CL.textLine; }
      }

      // The buttons, left to right, each as wide as its icon and label.
      let y = top + headH + CL.gap;
      if ((b.buttons || []).length) {
        let bx = x;
        g.font = `500 22px ${FONT}`;
        for (const bt of b.buttons) {
          const w = Math.round(g.measureText(bt.label || '').width) + (bt.icon ? 36 : 0) + 56;
          if (shows(y, CL.btnH)) {
            const own = [];                      // (kept to the part inside the view)
            ns.vrKit.button(g, own, `action:${bt.id}`, bx, y, w, CL.btnH,
              { icon: bt.icon, label: bt.label, kind: bt.kind || 'tonal', enabled: bt.enabled !== false }, ui);
            for (const r of own) clipRegion(r.id, r.x, r.y, r.w, r.h);
            g.font = `500 22px ${FONT}`;
          }
          bx += w + CL.btnGap;
        }
        y += CL.btnH + CL.gap;
      }
      g.fillStyle = PA('onSurface', 0.12); g.fillRect(x, y, width, 2);
      y += 2 + 12;

      // The rows: number, thumbnail (its corner text on it), title (2 lines) and grey line.
      const rows = b.rows || [];
      rows.forEach((r, i) => {
        const ry = y + i * CL.rowH;
        if (!shows(ry, CL.rowH)) return;
        const id = `row:${i}`;
        clipRegion(id, x - 2, ry, width + 4, CL.rowH - 8);
        if (r.current) { g.fillStyle = PA('onSurface', 0.08); roundRect(g, x - 2, ry, width + 4, CL.rowH - 8, 14); g.fill(); }
        ns.vrKit.hoverArea(g, id, ui, x - 2, ry, width + 4, CL.rowH - 8, 14);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = P.onSurfaceVariant; g.font = `18px ${FONT}`;
        if (r.current) { g.fillStyle = P.onSurface; ns.vrSymbols.draw(g, 'play_arrow', x + CL.num / 2 - 4, ry + (CL.rowH - 8) / 2, 24, true); }
        else g.fillText(String(i + 1), x + CL.num / 2 - 4, ry + (CL.rowH - 8) / 2);
        const tx = x + CL.num, ty = ry + (CL.rowH - 8 - CL.thumbH) / 2;
        g.save(); roundRect(g, tx, ty, CL.thumbW, CL.thumbH, 10); g.clip();
        const img = kit.image(r.thumb);
        if (img) kit.drawImageCover(img, tx, ty, CL.thumbW, CL.thumbH);
        else { g.fillStyle = P.surfaceContainerHighest; g.fillRect(tx, ty, CL.thumbW, CL.thumbH); }
        g.restore();
        if (r.corner) {
          g.font = `500 15px ${FONT}`;
          const cw = g.measureText(r.corner).width + 10;
          g.fillStyle = 'rgba(0,0,0,0.75)'; roundRect(g, tx + CL.thumbW - cw - 5, ty + CL.thumbH - 25, cw, 20, 4); g.fill();
          g.fillStyle = '#FFFFFF'; g.fillText(r.corner, tx + CL.thumbW - cw / 2 - 5, ty + CL.thumbH - 14);
        }
        const lx = tx + CL.thumbW + 18, lw = x + width - lx;
        g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillStyle = P.onSurface; g.font = `500 ${CL.rowTitle}px ${FONT}`;
        const tl = wrap(g, r.title || '', lw, 2);
        let ly = ry + 8;
        for (const l of tl) { g.fillText(l, lx, ly); ly += CL.rowLine; }
        if (r.line) { g.fillStyle = P.onSurfaceVariant; g.font = `18px ${FONT}`; g.fillText(wrap(g, r.line, lw, 1)[0] || '', lx, ly + 2); }
      });

      // After the rows: the spinner while more load, or the empty text.
      const endY = y + rows.length * CL.rowH;
      if (b.loading) { if (shows(endY, CL.more)) ns.vrGlyphs.spinner(g, x + width / 2, endY + CL.more / 2, 18, m.now || 0, false); }
      else if (!rows.length && b.emptyText) {
        g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(b.emptyText, x, endY + CL.more / 2);
      }
    }

    // Where to scroll to (px, before the style clamps it): `scroll`, or when that's null (not
    // scrolled yet) the focus row a third of the way down a view `viewH` tall.
    const scrollFor = (b, lay, viewH, scroll) => (scroll == null && b.focusRow != null
      ? lay.listTop + b.focusRow * lay.rowH - viewH / 3 : scroll || 0);

    return { layout, draw, scrollFor };
  }

  ns.vrStyleCollection = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
