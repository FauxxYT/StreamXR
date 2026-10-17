// Info style (canvas 2D): tabs of things to read about what's playing. Each tab shows one
// registered content kind; the provider says which kind and fills it (ARCHITECTURE.md):
//   'text':    a header line, then rich text with links, wrapped and scrolling (YouTube's
//              Description). Clickable links are blue, others greyed.
//   'paged':   rows in two columns (thumbnail or number, a blue label, a title), paged with
//              arrows in the header; the current row outlined (YouTube's Chapters).
//   'rows':    a scrolling list of rows (a blue label + wrapped text), the current one
//              highlighted and, while `follow`, kept a third of the way down (Transcript).
//   'thread':  pills and a count line, then a scrolling threaded list (thread.js): rows with a picture,
//              author (optionally highlighted, with a badge) · meta, text with clickable clock
//              times, a footer (a site slot), and children (replies) opened under them;
//              more load as you scroll (YouTube's Comments).
//   'chat':    a live chat (chat.js): a pinned message in a banner, then the messages oldest
//              first, following the newest (scrolled to the bottom) while `follow`; when not,
//              a "jump to newest" button over the bottom of the list; optionally a row of
//              reaction buttons (an emoji each) along the panel's bottom, with a Support
//              button at its right end, and a message field with its Send button above it.
//   'message': a grey message in the middle (optionally under the loading spinner).
// Knows nothing about any site.
//
//   const style = ns.vrStyles.info.create(onImageLoaded, W, H, overrides);
//   overrides.slots.threadFooter(f) -> x where the footer ended: draws a thread row's footer
//     (default: nothing). f: { g, kit, comment, at ("<i>" / "<i>.<j>"), x, y, ui,
//     region(id, x, y, w, h) (adds a clickable area, clipped to the list), fill(id, base),
//     area(id, x, y, w, h, r) (a region with the M3 look: state layer and the white ring) }.
//   style.draw(model, ui)
//     model: { tabs: [{ id, label }], tab, scroll (px from the top), now (seconds, spinner),
//              content: one of
//       { kind: 'text', header, text, links: [{ start, length, clickable }], emptyText }
//       { kind: 'paged', rows: [{ thumb, number, label, title }], current, page, pageCount, emptyText }
//       { kind: 'rows', rows: [{ label, text }] (keep the same array while unchanged: its
//         layout is cached on it), current, follow }
//       { kind: 'thread', pills: [{ id, label }], pill, count, labels: { hide, more, empty },
//         threads: [{ comment: { id, author, avatar, highlight, badge, meta, text, childrenLabel },
//                     children: null | { open, items: [comments], loading, more } }],
//         loading, done, error }
//       { kind: 'chat', banner: null | { header, item }, items: [item] (chat.js; keep each
//         item object while it's shown: its layout is kept by id), follow, labels: { newest, empty,
//         send, support }, reactions: [{ id, emoji (a character), on (just sent: shown selected) }],
//         support (show the Support button), input: null | { runs (what's typed: [{ text } |
//         { image, label }]), placeholder, focused, canSend, note (a line instead of the field:
//         why you can't chat), error (shown in the field's corner) }, xp: null | { label }
//         (a 👑 pill at the right of the tab row), fans: null | { title, loading, error, empty,
//         rows: [fan], you: fan | null } (a ranked list instead of the messages, with a back
//         button; fan: { rank, name, avatar, points, badge ({ title, bg, fg } | null), note }) }
//       { kind: 'message', text, spinner } }
//   Control ids: 'tab:<id>', 'page:prev', 'page:next', 'row:<index>' (paged / rows),
//   'link:<index in links>', 'pill:<id>', 'time:<seconds>', 'children:<thread>',
//   'more:<thread>', 'newest', 'react:<id>', 'field', 'send', 'support', 'fans', 'fansBack' (chat), 'text' (anywhere else in a scrolling area: a trigger
//   drag can start there), plus the footer slot's own ids.
//   Scrolling: scrollAt(u, v), maxScroll(), shownScroll() (after clamping / following),
//   pxPerV. Also hitTest(u, v) -> { id } | null, has(id), imagesReady(), perPage.
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha;        // design tokens (tokens.js)

  const { roundRect, wrap, regionAt, buttonFill, headerTabs, FONT } = ns.vrKit;

  const PAD = 48;
  const COLS = 2, MIN_ROW_H = 86;                                        // paged columns; smallest row height
  const TOP = 92, GAP_X = 24, GAP_Y = 10;                                  // where the rows start; gaps between them
  const THUMB = { w: 128, h: 72 };
  const TEXT = { size: 22, line: 32 };                                   // rich text: font px, line height
  const LINE = { timeW: 84, size: 22, line: 30, pad: 8 };                // 'rows' rows

  // onImageLoaded(): an image arrived (redraw). W, H: canvas size in pixels; the paged list
  // fits as many rows as that height allows.
  function create(onImageLoaded, W = 1024, H = 680, overrides = {}) {
    const slots = { threadFooter: f => f.x, ...(overrides.slots || {}) };
    const ROWS = Math.max(1, Math.floor((H - TOP - 24 + GAP_Y) / (MIN_ROW_H + GAP_Y))), PER_PAGE = COLS * ROWS;
    const ROW_W = (W - PAD * 2 - GAP_X * (COLS - 1)) / COLS;
    const ROW_H = (H - TOP - 24 - GAP_Y * (ROWS - 1)) / ROWS;
    const ARROWS = { prev: { x: W - PAD - 124, y: 14, w: 56, h: 56 }, next: { x: W - PAD - 56, y: 14, w: 56, h: 56 } };   // round tonal buttons
    const VIEW = { x: PAD, y: TOP, w: W - PAD * 2, h: H - TOP - 20 };     // the scrolling area
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const kit = ns.vrKit.createCardKit(g, onImageLoaded);
    let regions = [];                                   // clickable rectangles from the last draw
    let scrollable = false, maxScrollPx = 0, scrollPx = 0;   // the last draw's scrolling area

    // Background for a hoverable control, by state.
    const fill = (id, ui, base) => buttonFill(id, ui, base);

    // A paging arrow: a round tonal button (kit button) with ‹ or ›; disabled ones are faded
    // and not clickable.
    function drawArrow(key, dir, enabled, ui) {
      const r = ARROWS[key];
      ns.vrKit.button(g, regions, `page:${key}`, r.x, r.y, r.w, r.h, { icon: dir < 0 ? 'chevron_left' : 'chevron_right', enabled }, ui);
    }

    // A grey message in the middle of the content area (optionally under the spinner).
    function message(text, spinnerAt) {
      const cy = (TOP + H) / 2;
      if (spinnerAt != null) ns.vrGlyphs.spinner(g, W / 2, cy - 40, 30, spinnerAt, false);
      g.fillStyle = P.onSurfaceVariant; g.font = `24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, W / 2, spinnerAt != null ? cy + 24 : cy);
    }

    // ------------------------------------------------------------ 'paged'
    // One row at (x, y) (an M3 list item on a surfaceContainerHigh tile): thumbnail (or its
    // number), the label in tertiary (light blue) and the title on up to two lines; the
    // current one tinted and outlined in tertiary; pointed at: a lighter tile and the ring.
    function drawPagedRow(r, index, x, y, current, ui) {
      const id = `row:${index}`, rad = T.shape.medium;
      regions.push({ id, x, y, w: ROW_W, h: ROW_H });
      g.fillStyle = ui.hover === id || ui.pressed === id ? P.surfaceContainerHighest : P.surfaceContainerHigh;
      roundRect(g, x, y, ROW_W, ROW_H, rad); g.fill();
      if (current) { g.fillStyle = PA('tertiary', 0.16); roundRect(g, x, y, ROW_W, ROW_H, rad); g.fill(); }
      if (ui.pressed === id) { g.fillStyle = PA('onSurface', 0.12); roundRect(g, x, y, ROW_W, ROW_H, rad); g.fill(); }
      if (current) { g.strokeStyle = P.tertiary; g.lineWidth = 3; roundRect(g, x + 1.5, y + 1.5, ROW_W - 3, ROW_H - 3, rad - 1.5); g.stroke(); }
      if (ui.hover === id) ns.vrKit.hoverRing(g, x, y, ROW_W, ROW_H, rad);
      const tx = x + 8, ty = y + (ROW_H - THUMB.h) / 2;
      g.save(); roundRect(g, tx, ty, THUMB.w, THUMB.h, T.shape.small); g.clip();
      const img = r.thumb && kit.image(r.thumb);
      if (img) kit.drawImageCover(img, tx, ty, THUMB.w, THUMB.h);
      else {
        g.fillStyle = P.surfaceContainerHighest; g.fillRect(tx, ty, THUMB.w, THUMB.h);
        g.fillStyle = P.outline; g.font = `500 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(r.number), tx + THUMB.w / 2, ty + THUMB.h / 2);
      }
      g.restore();
      const textX = tx + THUMB.w + 16, textW = x + ROW_W - 12 - textX;
      g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = P.tertiary; g.font = `500 19px ${FONT}`;
      g.fillText(r.label, textX, y + 8);
      g.fillStyle = P.onSurface; g.font = `500 21px ${FONT}`;
      wrap(g, r.title, textW, 2).forEach((line, i) => g.fillText(line, textX, y + 33 + i * 25));
    }

    function drawPaged(c, ui) {
      const list = c.rows || [];
      if (c.pageCount > 1) {
        g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(`${c.page + 1} / ${c.pageCount}`, ARROWS.prev.x - 16, 42);
        drawArrow('prev', -1, c.page > 0, ui);
        drawArrow('next', 1, c.page < c.pageCount - 1, ui);
      }
      if (!list.length) { message(c.emptyText || ''); return; }
      // Rows fill the left column top to bottom, then the right one (reading order).
      const first = c.page * PER_PAGE;
      list.slice(first, first + PER_PAGE).forEach((r, i) => {
        const col = Math.floor(i / ROWS), row = i % ROWS;
        drawPagedRow(r, first + i, PAD + col * (ROW_W + GAP_X), TOP + row * (ROW_H + GAP_Y), first + i === c.current, ui);
      });
    }

    // ------------------------------------------------------------ 'text'
    // The text laid out once per text: pieces [{ x, y, w, text, link }] (y = line top, from
    // the area's top) and the total height. Words wrap at the area's width; a word longer
    // than a line (a URL) breaks between letters.
    let textLayout = { key: null, pieces: [], height: 0 };
    function layoutText(c) {
      const key = `${c.header}\u0000${c.text}`;
      if (textLayout.key === key) return textLayout;
      const pieces = [];
      const maxW = VIEW.w - 8;
      let x = 0, y = 0;
      g.font = `${TEXT.size}px ${FONT}`;
      const newline = () => { x = 0; y += TEXT.line; };
      const put = (text, link) => {
        const w = g.measureText(text).width;
        if (x > 0 && x + w > maxW && text.trim()) newline();
        if (!(x === 0 && !text.trim())) pieces.push({ x, y, w, text, link });   // no spaces at a line start
        x += w;
      };
      // Split the text into runs by the links' positions, then into words (keeping spaces).
      const links = [...(c.links || [])].map((k, i) => ({ ...k, i })).sort((a, b) => a.start - b.start);
      const runs = [];
      let at = 0;
      for (const k of links) {
        if (k.start < at) continue;
        if (k.start > at) runs.push({ text: c.text.slice(at, k.start), link: null });
        runs.push({ text: c.text.slice(k.start, k.start + k.length), link: k });
        at = k.start + k.length;
      }
      if (at < c.text.length) runs.push({ text: c.text.slice(at), link: null });
      for (const run of runs) {
        run.text.split('\n').forEach((part, n) => {
          if (n > 0) newline();
          for (const word of part.match(/\S+\s*|\s+/g) || []) {
            if (g.measureText(word).width <= maxW) { put(word, run.link); continue; }
            for (const ch of word) put(ch, run.link);                      // too long for a line: by letter
          }
        });
      }
      textLayout = { key, pieces, height: y + TEXT.line };
      return textLayout;
    }

    function drawText(c, m, ui) {
      const headerH = c.header ? 46 : 0;
      const lay = layoutText(c);
      const contentH = headerH + (c.text ? lay.height : 40) + 12;
      beginScroll(m, contentH);
      const top = VIEW.y - scrollPx;
      g.save(); g.beginPath(); g.rect(VIEW.x - 8, VIEW.y, VIEW.w + 16, VIEW.h); g.clip();
      g.textAlign = 'left'; g.textBaseline = 'top';
      if (c.header) {
        g.fillStyle = P.onSurface; g.font = `500 22px ${FONT}`;
        g.fillText(c.header, VIEW.x, top + 4);
      }
      if (!c.text) { g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.fillText(c.emptyText || '', VIEW.x, top + headerH); }
      g.font = `${TEXT.size}px ${FONT}`;
      for (const p of lay.pieces) {
        const y = top + headerH + p.y;
        if (y + TEXT.line < VIEW.y || y > VIEW.y + VIEW.h) continue;     // off screen
        const click = !!(p.link && p.link.clickable), id = click ? `link:${p.link.i}` : null;
        if (id && (ui.hover === id || ui.pressed === id)) {
          g.fillStyle = fill(id, ui, ''); g.fillRect(VIEW.x + p.x, y + 1, p.w, TEXT.line - 2);   // pieces of one link join up
        }
        g.fillStyle = click ? P.tertiary : p.link ? P.onSurfaceVariant : P.onSurface;
        g.fillText(p.text, VIEW.x + p.x, y + 4);
        if (id) regions.push({ id, x: VIEW.x + p.x, y: Math.max(VIEW.y, y), w: p.w, h: Math.min(y + TEXT.line, VIEW.y + VIEW.h) - Math.max(VIEW.y, y) });
      }
      g.restore();
      endScroll();
    }

    // ------------------------------------------------------------ 'rows'
    // Rows laid out once per rows array: [{ y, h, wrapped }] and the total height.
    let rowsLayout = { rows: null, laid: [], height: 0 };
    function layoutRows(rows) {
      if (rowsLayout.rows === rows) return rowsLayout;
      g.font = `${LINE.size}px ${FONT}`;
      const textW = VIEW.w - LINE.timeW - 24;
      let y = 0;
      const laid = rows.map(r => {
        const wrapped = wrapAll(r.text, textW);
        const h = wrapped.length * LINE.line + LINE.pad * 2;
        const row = { y, h, wrapped }; y += h + 4;
        return row;
      });
      rowsLayout = { rows, laid, height: y };
      return rowsLayout;
    }
    // Every line of `text` wrapped to maxW (wrap() stops at a line count; this doesn't).
    function wrapAll(text, maxW) {
      const out = [];
      let line = '';
      for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (line && g.measureText(test).width > maxW) { out.push(line); line = word; } else line = test;
      }
      if (line) out.push(line);
      return out.length ? out : [''];
    }

    function drawRows(c, m, ui) {
      const lay = layoutRows(c.rows);
      // Following: keep the current row about a third of the way down.
      const cur = lay.laid[c.current];
      beginScroll(m, lay.height + 12, c.follow && cur ? cur.y - VIEW.h / 3 : null);
      const top = VIEW.y - scrollPx;
      g.save(); g.beginPath(); g.rect(VIEW.x - 8, VIEW.y, VIEW.w + 16, VIEW.h); g.clip();
      g.textAlign = 'left'; g.textBaseline = 'top';
      lay.laid.forEach((row, i) => {
        const y = top + row.y;
        if (y + row.h < VIEW.y || y > VIEW.y + VIEW.h) return;          // off screen
        const id = `row:${i}`, current = i === c.current;
        // The current line tinted in tertiary; pointed at: a state layer and the ring (inset so
        // the ring stays inside the scrolling area's clip).
        if (current) { g.fillStyle = PA('tertiary', 0.16); roundRect(g, VIEW.x - 2, y, VIEW.w + 4, row.h, T.shape.medium); g.fill(); }
        ns.vrKit.hoverArea(g, id, ui, VIEW.x - 2, y, VIEW.w + 4, row.h, T.shape.medium);
        regions.push({ id, x: VIEW.x - 2, y: Math.max(VIEW.y, y), w: VIEW.w + 4, h: Math.min(y + row.h, VIEW.y + VIEW.h) - Math.max(VIEW.y, y) });
        g.fillStyle = P.tertiary; g.font = `500 19px ${FONT}`;
        g.fillText(c.rows[i].label, VIEW.x + 4, y + LINE.pad + 3);
        g.fillStyle = current ? P.onSurface : P.onSurfaceVariant; g.font = `${LINE.size}px ${FONT}`;
        row.wrapped.forEach((text, k) => g.fillText(text, VIEW.x + LINE.timeW, y + LINE.pad + k * LINE.line));
      });
      g.restore();
      endScroll();
    }

    // ------------------------------------------------------------ 'thread'
    // Pills and the count above the list; then the threads (thread.js), scrolling.
    const CVIEW = { x: PAD, y: 150, w: W - PAD * 2, h: H - 150 - 20 };
    const thread = ns.vrStyleThread.create(g, kit, { slots, fill });

    function drawThread(c, m, ui) {
      thread.bar(c, ui, regions, 96, PAD, W - PAD);
      const lay = thread.layout(c, CVIEW.w);
      beginScroll(m, lay.height + 12, null, CVIEW);
      const top = CVIEW.y - scrollPx;
      g.save(); g.beginPath(); g.rect(CVIEW.x - 8, CVIEW.y, CVIEW.w + 16, CVIEW.h); g.clip();
      const clipRegion = (id, x, y0, w, h) => {                       // only the visible part is clickable
        const a = Math.max(CVIEW.y, y0), b = Math.min(CVIEW.y + CVIEW.h, y0 + h);
        if (b > a) regions.push({ id, x, y: a, w, h: b - a });
      };
      thread.draw(c, lay, m, ui, CVIEW.x, top, CVIEW, clipRegion);
      g.restore();
      endScroll();
    }

    // ------------------------------------------------------------ 'chat'
    // The banner (if any) under the tabs, then the messages scrolling below it; following the
    // newest, the list stays scrolled to its end. Its pictures (avatars, emojis: many) have
    // their own kit, with room for more of them.
    const chatKit = ns.vrKit.createCardKit(g, onImageLoaded, 400);
    const chat = ns.vrStyleChat.create(g, chatKit);
    const NEWEST = { h: 52, pad: 28 };                     // the "jump to newest" button
    const REACT = { size: 64, gap: 16, bar: 92 };          // the reaction buttons; the row's height
    const INPUT = { h: 64, gap: 12, sendW: 132, btnH: 56 };   // the message field's row

    // The bottom row: the reaction buttons (round tonal buttons, filled while `on`, the emoji
    // drawn by the font) centred in it, and the Support button at its right end.
    function drawBottomRow(list, labels, support, ui) {
      const y = H - REACT.bar + (REACT.bar - REACT.size) / 2 - 6;
      let right = W - PAD;
      if (support) {
        g.font = T.font('labelLarge', 22);
        const w = g.measureText(labels.support || '').width + 28 + 8 + 48;
        ns.vrKit.button(g, regions, 'support', right - w, y + (REACT.size - INPUT.btnH) / 2, w, INPUT.btnH, { icon: 'card_membership', label: labels.support, kind: 'tonal' }, ui);
        right -= w + REACT.gap;
      }
      const total = list.length * REACT.size + Math.max(0, list.length - 1) * REACT.gap;
      let x = Math.max(PAD, (PAD + right) / 2 - total / 2);
      for (const r of list) {
        ns.vrKit.button(g, regions, `react:${r.id}`, x, y, REACT.size, REACT.size, { kind: r.on ? 'filled' : 'tonal' }, ui);
        g.font = `34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = P.onSurface;
        g.fillText(r.emoji, x + REACT.size / 2, y + REACT.size / 2 + 2);
        x += REACT.size + REACT.gap;
      }
    }

    // The message row at y: a field (what's typed, with emoji pictures; the placeholder when
    // empty; outlined in the primary colour with a caret while typing) and the Send button; or,
    // when you can't chat, the note saying why.
    function drawInput(inp, labels, y, ui) {
      if (inp.note) {
        g.fillStyle = P.onSurfaceVariant; g.font = `20px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        ns.vrKit.wrap(g, inp.note, W - PAD * 2, 2).forEach((line, i, all) => g.fillText(line, PAD, y + INPUT.h / 2 + (i - (all.length - 1) / 2) * 26));
        return;
      }
      const fw = W - PAD * 2 - INPUT.sendW - INPUT.gap, r = INPUT.h / 2;
      regions.push({ id: 'field', x: PAD, y, w: fw, h: INPUT.h });
      g.fillStyle = P.surfaceContainerHighest; roundRect(g, PAD, y, fw, INPUT.h, r); g.fill();
      ns.vrKit.hoverArea(g, 'field', ui, PAD, y, fw, INPUT.h, r);
      if (inp.focused) { g.strokeStyle = P.primary; g.lineWidth = 3; roundRect(g, PAD + 1.5, y + 1.5, fw - 3, INPUT.h - 3, r - 1.5); g.stroke(); }
      const tx = PAD + 24, room = fw - 48 - (inp.error ? 140 : 0), mid = y + INPUT.h / 2;
      let end = tx;
      if ((inp.runs || []).length) end = tx + chat.drawInline(inp.runs, tx, mid, room, P.onSurface);
      else if (!inp.focused) {
        g.fillStyle = P.onSurfaceVariant; g.font = `21px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(inp.placeholder || '', tx, mid + 1);
      }
      if (inp.focused) { g.fillStyle = P.primary; g.fillRect(end + 2, mid - 14, 3, 28); }
      if (inp.error) {
        g.fillStyle = P.error; g.font = `18px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(inp.error, PAD + fw - 24, mid + 1);
      }
      ns.vrKit.button(g, regions, 'send', W - PAD - INPUT.sendW, y + (INPUT.h - INPUT.btnH) / 2, INPUT.sendW, INPUT.btnH,
        { label: labels.send, kind: 'filled', enabled: !!inp.canSend }, ui);
    }

    // The XP pill at the right end of the tab row (its width: xpWidth, also used to keep the
    // tabs clear of it).
    const XP = { h: 48, y: 18 };
    const xpLabel = xp => `👑 ${xp.label}`;
    function xpWidth(c) {
      if (!c || c.kind !== 'chat' || !c.xp) return 0;
      g.font = T.font('labelLarge', 22); return Math.ceil(g.measureText(xpLabel(c.xp)).width) + 40;
    }

    // Top fans: a back button and the title, the ranked rows scrolling (rank or its badge, picture,
    // name, XP), and your own row pinned under them with YouTube's line about it.
    const FAN = { h: 64, avatar: 40, rankW: 70, head: 64 };
    function drawFanRow(f, x, y, w, you) {
      const mid = y + FAN.h / 2;
      if (f.badge) chat.drawRank(f.badge, x + 4, mid);
      else { g.fillStyle = P.onSurfaceVariant; g.font = `500 20px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(f.rank || '–', x + 8, mid + 1); }
      kit.avatar(f.avatar, f.name, x + FAN.rankW, mid - FAN.avatar / 2, FAN.avatar);
      g.font = `500 21px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = you ? P.primary : P.onSurface;
      g.fillText(f.points || '', x + w - 8, mid + 1);
      const pw = g.measureText(f.points || '').width, nx = x + FAN.rankW + FAN.avatar + 14;
      g.textAlign = 'left'; g.font = `${you ? 500 : 400} 21px ${FONT}`; g.fillStyle = P.onSurface;
      const room = x + w - 8 - pw - 16 - nx;
      let name = f.name || '';
      while (name.length > 1 && g.measureText(name).width > room) name = name.slice(0, -2) + '…';
      g.fillText(name, nx, mid + 1);
    }
    function drawFans(fans, labels, m, ui) {
      const top = TOP;
      ns.vrKit.button(g, regions, 'fansBack', PAD - 6, top + 4, 52, 52, { icon: 'arrow_back' }, ui);
      g.fillStyle = P.onSurface; g.font = `500 24px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(fans.title || '', PAD + 60, top + 30);
      // Your row at the bottom: a divider, the row, then YouTube's line (up to two lines).
      let bottom = H - 20;
      if (fans.you) {
        g.font = `18px ${FONT}`;
        const note = fans.you.note ? ns.vrKit.wrap(g, fans.you.note, W - PAD * 2, 2) : [];
        const youH = FAN.h + note.length * 24 + (note.length ? 8 : 0);
        bottom = H - 20 - youH;
        g.fillStyle = P.outlineVariant; g.fillRect(PAD, bottom - 6, W - PAD * 2, 2);
        drawFanRow(fans.you, PAD, bottom, W - PAD * 2, true);
        g.fillStyle = P.onSurfaceVariant; g.font = `18px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top';
        note.forEach((line, i) => g.fillText(line, PAD, bottom + FAN.h + i * 24));
        bottom -= 14;
      }
      const view = { x: VIEW.x, y: top + FAN.head, w: VIEW.w, h: bottom - top - FAN.head };
      const rows = fans.rows || [];
      if (!rows.length) {
        const cy = view.y + view.h / 2;
        if (fans.loading) ns.vrGlyphs.spinner(g, W / 2, cy - 20, 26, m.now || 0, false);
        g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(fans.loading ? '' : fans.error || fans.empty || '', W / 2, cy + 20);
        return;
      }
      beginScroll(m, rows.length * FAN.h + 8, null, view);
      g.save(); g.beginPath(); g.rect(view.x - 8, view.y, view.w + 16, view.h); g.clip();
      rows.forEach((f, i) => {
        const y = view.y - scrollPx + i * FAN.h;
        if (y + FAN.h >= view.y && y <= view.y + view.h) drawFanRow(f, view.x, y, view.w, false);
      });
      g.restore();
      endScroll();
    }

    function drawChat(c, m, ui) {
      const reactions = c.reactions || [], labels = c.labels || {};
      if (c.xp) {                                            // your XP, opening Top fans
        const w = xpWidth(c);
        ns.vrKit.button(g, regions, 'fans', W - PAD - w, XP.y, w, XP.h, { label: xpLabel(c.xp), kind: c.fans ? 'filled' : 'tonal' }, ui);
      }
      if (c.fans) { drawFans(c.fans, labels, m, ui); return; }
      let bottom = H - 20;                                   // where the list ends: above the bottom rows
      if (reactions.length || c.support) { drawBottomRow(reactions, labels, !!c.support, ui); bottom = H - REACT.bar; }
      if (c.input) { drawInput(c.input, labels, bottom - INPUT.h - 6, ui); bottom -= INPUT.h + 18; }
      const bannerH = chat.bannerHeight(c.banner, VIEW.w);
      if (bannerH) chat.drawBanner(c.banner, VIEW.x, TOP, VIEW.w);
      const top = TOP + (bannerH ? bannerH + 10 : 0);
      const view = { x: VIEW.x, y: top, w: VIEW.w, h: bottom - top };
      if (!(c.items || []).length) { message((c.labels || {}).empty || ''); return; }
      const lay = chat.layout(c.items, view.w);
      beginScroll(m, lay.height + 8, c.follow ? lay.height : null, view);
      g.save(); g.beginPath(); g.rect(view.x - 8, view.y, view.w + 16, view.h); g.clip();
      chat.draw(lay, view.x, view.y - scrollPx, view);
      g.restore();
      if (!c.follow) {                                     // scrolled back: a way to the newest
        const label = (c.labels || {}).newest || '';
        g.font = T.font('labelLarge', 22);
        const w = g.measureText(label).width + 28 + 8 + NEWEST.pad * 2;
        ns.vrKit.button(g, regions, 'newest', W / 2 - w / 2, view.y + view.h - NEWEST.h - 16, w, NEWEST.h, { icon: 'expand_more', label, kind: 'filled' }, ui);
      }
      endScroll();
    }

    // ------------------------------------------------------------ scrolling
    // Start drawing a scrolling area (`view`, VIEW unless given) with `contentH` of content:
    // clamp the scroll (or use `want`, e.g. the rows following their current one) and
    // remember the limits and the area for the host.
    let curView = VIEW;
    function beginScroll(m, contentH, want, view = VIEW) {
      scrollable = true; curView = view;
      maxScrollPx = Math.max(0, contentH - view.h);
      scrollPx = Math.min(maxScrollPx, Math.max(0, want != null ? want : m.scroll || 0));
    }
    // After drawing it: a scroll bar on the right when there's more than fits, and the
    // 'text' region (pushed last, so links and rows win the hit test).
    function endScroll() {
      const v = curView;
      if (maxScrollPx > 0) {
        const trackH = v.h, barH = Math.max(40, trackH * v.h / (v.h + maxScrollPx));
        const barY = v.y + (trackH - barH) * (scrollPx / maxScrollPx);
        g.fillStyle = PA('onSurface', 0.08); roundRect(g, W - 30, v.y, 8, trackH, 4); g.fill();
        g.fillStyle = PA('onSurface', 0.45); roundRect(g, W - 30, barY, 8, barH, 4); g.fill();
      }
      regions.push({ id: 'text', x: v.x - 8, y: v.y, w: v.w + 16, h: v.h });
    }

    // Paint the whole panel from the model (see the top of the file).
    const motion = ns.vrMotion.create();                // hover / press easing (motion.js)
    function draw(m, ui) {
      ui = motion.step(ui);
      regions = [];
      scrollable = false; maxScrollPx = 0; scrollPx = 0;
      g.clearRect(0, 0, W, H);
      g.fillStyle = T.panelFill(); roundRect(g, 0, 0, W, H, T.shape.extraLarge); g.fill();
      // The tabs end before the page count and arrows when the content is paged.
      const pc = m.content && m.content.kind === 'paged' && m.content.pageCount > 1 ? m.content : null;
      g.font = `22px ${FONT}`;
      const xpW = xpWidth(m.content);                      // (a chat's XP pill at the right of the tabs)
      g.font = `22px ${FONT}`;
      headerTabs(g, m.tabs, m.tab, ui, regions, PAD, { maxX: pc ? ARROWS.prev.x - 32 - g.measureText(`${pc.page + 1} / ${pc.pageCount}`).width : W - PAD - (xpW ? xpW + 16 : 0) });
      const c = m.content || { kind: 'message', text: '' };
      if (c.kind === 'paged') drawPaged(c, ui);
      else if (c.kind === 'text') drawText(c, m, ui);
      else if (c.kind === 'rows') drawRows(c, m, ui);
      else if (c.kind === 'thread') drawThread(c, m, ui);
      else if (c.kind === 'chat') drawChat(c, m, ui);
      else message(c.text || '', c.spinner ? m.now || 0 : null);
    }

    const hitTest = (u, v) => { const r = regionAt(regions, u, v, W, H); return r ? { id: r.id } : null; };
    const has = id => regions.some(r => r.id === id);    // an enabled control from the last draw?
    // Is (u, v) on the scrolling area of the last draw?
    const scrollAt = (u, v) => scrollable && u * W >= curView.x - 8 && u * W <= W - 16 && v * H >= curView.y && v * H <= curView.y + curView.h;

    return {
      canvas, aspect: H / W, draw, hitTest, has, scrollAt, perPage: PER_PAGE, animating: motion.moving,
      imagesReady: () => kit.imagesReady() + chatKit.imagesReady(),
      maxScroll: () => maxScrollPx,          // how far the last drawn tab can scroll (px)
      shownScroll: () => scrollPx,           // where it actually is (after clamping / following)
      pxPerV: H,                             // canvas pixels per unit of v (for drag scrolling)
    };
  }

  ns.vrStyles = ns.vrStyles || {};
  ns.vrStyles.info = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
