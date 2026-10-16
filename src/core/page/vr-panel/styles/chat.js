// A chat (canvas 2D), drawn by the Info style's 'chat' content (info.js): rows oldest first,
// each a round picture, the author's name (in a colour, or on a coloured chip, with small
// badges before it) and the message flowing after it on the same line, words and pictures
// (emojis) wrapping together; highlighted messages as coloured cards (an amount, a header
// line, a sticker); notices in grey after an info icon; and a pinned message in a banner
// above the list. Knows nothing about any site: colours come as token specs (tokens.js
// resolve), pictures as URLs.
//
//   const chat = ns.vrStyleChat.create(g, kit);   kit: a card kit (kit.js) for the pictures
//   chat.layout(items, width) -> { rows: [{ item, y, h, lay }], height }   rows laid out
//     for a list `width` px wide (each item's layout is kept, by id and width)
//   chat.draw(lay, x0, top, view)   the rows, the list's top at `top`, left edge x0; only
//     what's inside `view` ({ y, h })
//   chat.bannerHeight(banner, width), chat.drawBanner(banner, x, y, width)   the pinned
//     message's box (0 tall for none)
//   item: { id, kind ('text' | 'card' | 'notice'), author, avatar, nameColor (spec), nameFill
//     (spec: a chip behind the name), badges: [{ icon (symbols.js), color (spec) } | { image }], runs:
//     [{ text } | { image, label }], card (kind 'card'): { color, onColor (specs), title
//     (e.g. an amount), header (a line under it), sticker (a picture URL) } }
//   banner: { header, item }
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, S = ns.vrSymbols;      // design tokens (tokens.js), icons
  const { roundRect, FONT } = ns.vrKit;
  const R = { avatar: 36, gap: 14, size: 21, line: 29, pad: 7, emoji: 26, badge: 22, nameGap: 10 };
  const CARD = { pad: 14, head: 58, sticker: 76, radius: 14, margin: 6 };
  const BANNER = { pad: 14, avatar: 28, lines: 3, header: 26 };
  const spec = s => (s ? T.resolve(s) : null);

  function create(g, kit) {
    const cache = new Map();                             // `${width}:${id}` -> an item's layout

    // Lay the name, badges and message of `it` out in lines `maxW` wide: [[{ x, w, text |
    // image | badge | name }]]. The name and badges start the first line; words and
    // pictures follow, a word too long for a line broken between letters.
    function flow(it, maxW, withName) {
      const lines = [[]];
      let x = 0;
      const put = (piece, w) => {
        if (x > 0 && x + w > maxW) { lines.push([]); x = 0; }
        lines[lines.length - 1].push({ ...piece, x, w }); x += w;
      };
      if (withName) {
        for (const b of it.badges || []) put({ badge: b }, R.badge + 6);
        if (it.author) {
          g.font = `500 ${R.size}px ${FONT}`;
          const pad = it.nameFill ? 8 : 0;
          put({ name: it.author }, g.measureText(it.author).width + pad * 2 + R.nameGap);
        }
      }
      g.font = `${R.size}px ${FONT}`;
      for (const r of it.runs || []) {
        if (r.image) { put({ image: r.image, label: r.label }, R.emoji + 4); continue; }
        for (const word of String(r.text).match(/\S+\s*|\s+/g) || []) {
          if (!word.trim() && x === 0) continue;             // no spaces at a line's start
          const w = g.measureText(word).width;
          if (w <= maxW) { put({ text: word }, w); continue; }
          for (const ch of word) put({ text: ch }, g.measureText(ch).width);
        }
      }
      return lines;
    }

    // One item's layout at `width`: { h, lines, textX, kind }.
    function layoutItem(it, width) {
      const key = `${width}:${it.id}`;
      const hit = cache.get(key);
      if (hit) return hit;
      let lay;
      if (it.kind === 'card') {
        const c = it.card || {}, inner = width - CARD.pad * 2;
        const lines = (it.runs || []).length ? flow(it, inner, false) : [];
        const head = c.sticker ? CARD.sticker : CARD.head;
        lay = { kind: 'card', lines, head, h: head + (lines.length ? lines.length * R.line + CARD.pad : 0) + CARD.margin * 2 };
      } else {
        const textX = R.avatar + R.gap, lines = flow(it, width - textX - 8, it.kind !== 'notice');
        lay = { kind: it.kind, lines, textX, h: Math.max(R.avatar, lines.length * R.line) + R.pad * 2 };
      }
      if (cache.size > 800) cache.clear();               // (a long chat: start the cache over)
      cache.set(key, lay);
      return lay;
    }

    function layout(items, width) {
      let y = 0;
      const rows = (items || []).map(item => { const lay = layoutItem(item, width); const r = { item, y, h: lay.h, lay }; y += lay.h; return r; });
      return { rows, height: y };
    }

    // The pieces of one laid-out line at (x, y) (the line's top), in `color`; the name in
    // the item's colour (or on its chip).
    function drawLine(it, line, x, y, color) {
      g.textAlign = 'left'; g.textBaseline = 'middle';
      const mid = y + R.line / 2;
      for (const p of line) {
        if (p.badge) {
          const b = p.badge;
          if (b.image) { const img = kit.image(b.image); if (img) kit.drawImageContain(img, x + p.x, mid - R.badge / 2, R.badge, R.badge); }
          else if (b.icon) { g.fillStyle = spec(b.color) || P.onSurfaceVariant; S.draw(g, b.icon, x + p.x + R.badge / 2, mid, R.badge, true); }
        } else if (p.name) {
          g.font = `500 ${R.size}px ${FONT}`;
          if (it.nameFill) {
            g.fillStyle = spec(it.nameFill); roundRect(g, x + p.x, mid - 14, p.w - R.nameGap, 28, 14); g.fill();
            g.fillStyle = spec(it.nameColor) || P.onSurface; g.fillText(p.name, x + p.x + 8, mid + 1);
          } else { g.fillStyle = spec(it.nameColor) || P.onSurfaceVariant; g.fillText(p.name, x + p.x, mid + 1); }
        } else if (p.image) {
          const img = kit.image(p.image);
          if (img) kit.drawImageContain(img, x + p.x, mid - R.emoji / 2, R.emoji, R.emoji);
          else { g.fillStyle = T.m3Alpha('onSurface', 0.12); roundRect(g, x + p.x, mid - R.emoji / 2, R.emoji, R.emoji, 6); g.fill(); }
        } else {
          g.font = `${R.size}px ${FONT}`; g.fillStyle = color; g.fillText(p.text, x + p.x, mid + 1);
        }
      }
    }

    // A highlighted message: a rounded card in its colour; the header (picture, name, and the
    // title or header line under it; a sticker on the right), then the message.
    function drawCard(it, lay, x, y, w) {
      const c = it.card || {}, top = y + CARD.margin, h = lay.h - CARD.margin * 2;
      const on = spec(c.onColor) || P.onSurface;
      g.fillStyle = spec(c.color) || P.surfaceContainerHighest; roundRect(g, x, top, w, h, CARD.radius); g.fill();
      if (lay.lines.length) {                            // the message part a shade darker
        g.save(); roundRect(g, x, top, w, h, CARD.radius); g.clip();
        g.fillStyle = T.m3Alpha('shadow', 0.15); g.fillRect(x, top + lay.head, w, h - lay.head);
        g.restore();
      }
      const ay = top + (lay.head - R.avatar) / 2;
      kit.avatar(it.avatar, it.author, x + CARD.pad, ay, R.avatar);
      const tx = x + CARD.pad + R.avatar + R.gap, tw = w - (tx - x) - CARD.pad - (c.sticker ? CARD.sticker : 0);
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = on;
      g.font = `500 19px ${FONT}`; g.fillText(clip(it.author || '', tw), tx, top + lay.head / 2 - 12);
      g.font = `700 20px ${FONT}`; g.fillText(clip([c.title, c.header].filter(Boolean).join('  ·  '), tw), tx, top + lay.head / 2 + 13);
      if (c.sticker) {
        const img = kit.image(c.sticker), s = CARD.sticker - 12;
        if (img) kit.drawImageContain(img, x + w - CARD.pad - s, top + 6, s, s);
      }
      lay.lines.forEach((line, i) => drawLine(it, line, x + CARD.pad, top + lay.head + CARD.pad / 2 + i * R.line, on));
    }
    // Text cut with "…" to fit maxW (in the current font).
    function clip(t, maxW) {
      if (g.measureText(t).width <= maxW) return t;
      while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
      return t + '…';
    }

    function draw(lay, x0, top, view) {
      const width = view.w;
      for (const r of lay.rows) {
        const y = top + r.y;
        if (y + r.h < view.y || y > view.y + view.h) continue;          // off screen
        const it = r.item;
        if (r.lay.kind === 'card') { drawCard(it, r.lay, x0, y, width); continue; }
        if (r.lay.kind === 'notice') { g.fillStyle = P.onSurfaceVariant; S.draw(g, 'info', x0 + R.avatar / 2, y + R.pad + R.line / 2, 26, false); }
        else kit.avatar(it.avatar, it.author, x0, y + R.pad + (R.line - R.avatar) / 2, R.avatar);
        const color = r.lay.kind === 'notice' ? P.onSurfaceVariant : P.onSurface;
        r.lay.lines.forEach((line, i) => drawLine(it, line, x0 + r.lay.textX, y + R.pad + i * R.line, color));
      }
    }

    // The pinned message: a header line, then the message (its first BANNER.lines lines) after
    // a small picture, on a raised tile.
    // (laid out as a row whose picture is BANNER.avatar wide, inside the tile's padding)
    function bannerLayout(b, width) {
      if (!b || !b.item) return null;
      const lay = layoutItem({ ...b.item, id: `banner:${b.item.id}` }, width - BANNER.pad * 2 - (BANNER.avatar - R.avatar));
      const lines = lay.lines.slice(0, BANNER.lines);
      return { lay, lines, h: BANNER.pad * 2 + (b.header ? BANNER.header : 0) + Math.max(BANNER.avatar, lines.length * R.line) };
    }
    const bannerHeight = (b, width) => { const bl = bannerLayout(b, width); return bl ? bl.h : 0; };
    function drawBanner(b, x, y, width) {
      const bl = bannerLayout(b, width);
      if (!bl) return 0;
      g.fillStyle = P.surfaceContainerHigh; roundRect(g, x, y, width, bl.h, T.shape.medium); g.fill();
      let ty = y + BANNER.pad;
      if (b.header) {
        g.fillStyle = P.onSurfaceVariant; g.font = `18px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(clip(b.header, width - BANNER.pad * 2), x + BANNER.pad, ty + BANNER.header / 2 - 2);
        ty += BANNER.header;
      }
      kit.avatar(b.item.avatar, b.item.author, x + BANNER.pad, ty + (R.line - BANNER.avatar) / 2, BANNER.avatar);
      const tx = x + BANNER.pad + BANNER.avatar + R.gap;
      bl.lines.forEach((line, i) => drawLine(b.item, line, tx, ty + i * R.line, P.onSurface));
      return bl.h;
    }

    return { layout, draw, bannerHeight, drawBanner };
  }

  ns.vrStyleChat = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
