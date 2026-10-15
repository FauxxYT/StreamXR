// A threaded list (canvas 2D), shared by the styles that show one (Info's Comments tab,
// Profile's opened post): a bar of pills and a count, then rows with a round picture,
// author (optionally highlighted, with a badge) · meta, text with clickable clock times, a
// footer (a site slot), and children (replies) opened under them, with a spinner, "show
// more" or a message where needed. Knows nothing about any site.
//
//   const t = ns.vrStyleThread.create(g, kit, { slots, fill });
//     slots.threadFooter(f) -> x where the footer ended (see info.js); fill(id, ui, base)
//     is the style's button background.
//   t.bar(c, ui, regions, y, x0, right)   pills from x0 and the count right-aligned at `right`,
//                                          on the 44 px row starting at y
//   t.layout(c, width) -> { rows, height }  the rows laid out for a list `width` px wide
//   t.draw(c, lay, m, ui, x, top, view, clipRegion)   the rows, content top at `top`, list
//                                          left edge x; only what's inside `view` ({ y, h })
//   content c: { pills: [{ id, label }], pill, count, labels: { hide, more, empty },
//     threads: [{ comment: { id, author, avatar, highlight, badge, meta, text, childrenLabel },
//                 children: null | { open, items: [comments], loading, more } }],
//     loading, done, error }
//   Control ids: 'pill:<id>', 'time:<seconds>', 'children:<thread>', 'more:<thread>', and
//   the footer slot's own.
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha;        // design tokens (tokens.js)

  const { roundRect, parseClock, drawBadge, FONT } = ns.vrKit;
  const CM = { avatar: 40, replyAvatar: 30, indent: 56, size: 21, line: 28, name: 26, foot: 34, pad: 14 };
  const TIME_RE = /^(?:\d+:)?\d{1,2}:\d{2}$/;

  function create(g, kit, { slots, fill }) {
    const rowCache = new Map();                          // row key -> { h, lines: [[{ text, x, w, time? }]] }

    // Lay a row's text out at its width: lines of word pieces, times marked.
    function layoutRow(key, c, maxW) {
      const hit = rowCache.get(key);
      if (hit) return hit;
      g.font = `${CM.size}px ${FONT}`;
      const lines = [[]];
      let x = 0;
      for (const para of String(c.text || '').split('\n')) {
        if (lines[lines.length - 1].length || lines.length > 1) { lines.push([]); x = 0; }
        for (const word of para.match(/\S+\s*/g) || []) {
          const w = g.measureText(word).width;
          if (x > 0 && x + w > maxW) { lines.push([]); x = 0; }
          const core = word.trim().replace(/[.,;:!?)]+$/, '');
          lines[lines.length - 1].push({ text: word, x, w, time: TIME_RE.test(core) ? parseClock(core) : null });
          x += w;
        }
      }
      if (lines.length > 1 && !lines[0].length) lines.shift();
      const h = CM.pad + CM.name + lines.length * CM.line + CM.foot;
      const lay = { h, lines };
      rowCache.set(key, lay);
      return lay;
    }

    // Chips (kit.js chip, as on the grids) and the count.
    function bar(c, ui, regions, y, x0, right) {
      let bx = x0;
      for (const s of c.pills || []) {
        const on = c.pill === s.id, w = ns.vrKit.chipWidth(g, s.label, on);
        ns.vrKit.chip(g, regions, `pill:${s.id}`, bx, y, w, 44, s.label, on, ui);
        bx += w + 10;
      }
      g.textBaseline = 'middle';
      if (c.count) {
        g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.textAlign = 'right';
        g.fillText(c.count, right, y + 23);
      }
    }

    // The rows: threads, their open children, and a spinner / "show more" / message where
    // needed, each with its y from the list's top.
    function layout(c, width) {
      const labels = c.labels || {};
      const rows = [];
      (c.threads || []).forEach((t, i) => {
        rows.push({ kind: 'c', c: t.comment, i, at: String(i), indent: 0, s: CM.avatar, children: t.children });
        if (t.children && t.children.open) {
          t.children.items.forEach((r, j) => rows.push({ kind: 'c', c: r, at: `${i}.${j}`, indent: CM.indent, s: CM.replyAvatar }));
          if (t.children.loading) rows.push({ kind: 'spin', h: 56, indent: CM.indent });
          else if (t.children.more) rows.push({ kind: 'more', i, h: 44, indent: CM.indent });
        }
      });
      if (c.loading) rows.push({ kind: 'spin', h: 70, indent: 0 });
      else if (c.error) rows.push({ kind: 'msg', text: c.error, h: 60 });
      else if (c.done && !(c.threads || []).length) rows.push({ kind: 'msg', text: labels.empty || '', h: 60 });
      let y = 0;
      for (const r of rows) {
        if (r.kind === 'c') {
          r.lay = layoutRow(`${width}:${c.pill}:${r.indent}:${r.c.id}`, r.c, width - r.indent - r.s - 14 - 20);
          r.h = r.lay.h;
        }
        r.y = y; y += r.h;
      }
      return { rows, height: y };
    }

    function draw(c, lay, m, ui, x0, top, view, clipRegion) {
      const labels = c.labels || {};
      g.textAlign = 'left'; g.textBaseline = 'top';
      for (const r of lay.rows) {
        const ry = top + r.y;
        if (ry + r.h < view.y || ry > view.y + view.h) continue;      // off screen
        const x = x0 + r.indent;
        if (r.kind === 'spin') { ns.vrGlyphs.spinner(g, x + 24, ry + r.h / 2, 14, m.now || 0, false); continue; }
        if (r.kind === 'msg') { g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.fillText(r.text, x, ry + 18); continue; }
        if (r.kind === 'more') {
          const id = `more:${r.i}`, label = labels.more || '';
          g.font = `500 20px ${FONT}`;
          const w = g.measureText(label).width + 24;
          clipRegion(id, x - 6, ry + 4, w, 36);
          ns.vrKit.hoverArea(g, id, ui, x - 6, ry + 4, w, 36, 18);
          g.fillStyle = P.tertiary; g.fillText(label, x + 6, ry + 12);
          continue;
        }
        // A row.
        const cm = r.c, tx = x + r.s + 14;
        kit.avatar(cm.avatar, cm.author, x, ry + CM.pad, r.s);
        g.font = `500 19px ${FONT}`;
        const nameW = g.measureText(cm.author).width;
        if (cm.highlight) { g.fillStyle = P.secondaryContainer; roundRect(g, tx - 6, ry + CM.pad - 3, nameW + 12, 26, 13); g.fill(); }   // e.g. the creator: a tonal pill
        g.fillStyle = cm.highlight ? P.onSecondaryContainer : P.onSurface; g.fillText(cm.author, tx, ry + CM.pad);
        let nx = tx + nameW + (cm.highlight ? 14 : 8);
        if (cm.badge) { g.fillStyle = P.onSurfaceVariant; drawBadge(g, cm.badge, nx + 8, ry + CM.pad + 10, 16); nx += 22; }
        g.fillStyle = P.onSurfaceVariant; g.font = `18px ${FONT}`;
        g.fillText(cm.meta || '', nx, ry + CM.pad + 1);
        // The text, with clickable times.
        g.font = `${CM.size}px ${FONT}`;
        r.lay.lines.forEach((line, k) => {
          const ly = ry + CM.pad + CM.name + k * CM.line;
          for (const p of line) {
            if (p.time != null) {
              const id = `time:${p.time}`, tw = g.measureText(p.text.trimEnd()).width;
              if (ui.hover === id || ui.pressed === id) { g.fillStyle = fill(id, ui, ''); g.fillRect(tx + p.x - 2, ly - 2, tw + 4, CM.line - 2); }
              g.fillStyle = P.tertiary;
              clipRegion(id, tx + p.x - 2, ly - 2, tw + 4, CM.line - 2);
            } else g.fillStyle = P.onSurface;
            g.fillText(p.text, tx + p.x, ly);
          }
        });
        // Footer: the site's slot, then the children button (top-level rows only).
        const fy = ry + CM.pad + CM.name + r.lay.lines.length * CM.line + 6;
        const fx = slots.threadFooter({ g, kit, comment: cm, at: r.at, x: tx - 8, y: fy, ui, region: clipRegion, fill: (id, base) => fill(id, ui, base),
          area: (id, ax, ay, aw, ah, ar) => { clipRegion(id, ax, ay, aw, ah); ns.vrKit.hoverArea(g, id, ui, ax, ay, aw, ah, ar); } });
        if (r.children !== undefined && cm.childrenLabel) {
          const open = !!(r.children && r.children.open), id = `children:${r.i}`;
          const label = open ? labels.hide || '' : cm.childrenLabel;
          g.font = `500 18px ${FONT}`;
          const bx2 = Math.max(tx + 110, fx + 8), w = g.measureText(label).width + 44;
          clipRegion(id, bx2 - 8, fy - 4, w, 30);
          ns.vrKit.hoverArea(g, id, ui, bx2 - 8, fy - 4, w, 30, 15);
          // An arrow: down to open, up to fold (Material Symbols).
          g.fillStyle = P.tertiary; ns.vrSymbols.draw(g, open ? 'expand_less' : 'expand_more', bx2 + 8, fy + 11, 24, false);
          g.fillText(label, bx2 + 22, fy + 2);
        }
      }
    }

    return { bar, layout, draw };
  }

  ns.vrStyleThread = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
