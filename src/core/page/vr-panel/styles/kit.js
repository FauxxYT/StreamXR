// Drawing pieces shared by every panel style (canvas 2D), knowing nothing about any site:
// rounded rectangles, text wrapping, clock parsing, the badge registry, image loading, the
// M3 tabs, the hover ring and the generic card. A site fills cards and badges in through its
// provider (ARCHITECTURE.md).
//
// The generic card (what every card grid and the hover card draw):
//   { title, thumb (image url), corner (text in the thumbnail's bottom-right, e.g. "11:00"),
//     flags: [{ text, bg, fg (colour role specs, tokens.js resolve: e.g. 'primary',
//              'surface/0.75'), dot (a "●" before the text), matchWidth: [texts] (as wide as
//              the widest of these, so a set of flags lines up) }]  (top-left, left to right),
//     lines: [{ text, badge (a registered badge name) }]  (grey lines under the title),
//     current (outlined in blue: the item playing now),
//     progress (0-1: how much of it you've watched, a bar along the thumbnail's bottom in
//               the brand colour (the site's theme); 0 or missing: no bar),
//     fit ('contain': the whole picture, letterboxed, e.g. a product; default: cropped to fill),
//     inert (just to look at: not clickable, no hover highlight) }
// Badges: a site registers its own (registerBadge); drawBadge(name) draws one if registered.
(function (ns) {
  'use strict';

  const TC = ns.vrTokens.color, TA = ns.vrTokens.alpha;   // design tokens (tokens.js)

  const FONT = 'Roboto, Arial, sans-serif';

  // Set g.font for `text` in a space `maxW` px wide: `weight` (e.g. '500 ' or '') at `size`
  // px, or smaller (down to minScale of it) if the text is too wide, as a translation can
  // be. Returns the text to draw: as given, or cut with "…" if even the smallest size is
  // too wide.
  function fitFont(g, text, maxW, size, weight = '', minScale = 0.6) {
    const font = s => `${weight}${s}px ${FONT}`;
    let t = String(text || '');
    g.font = font(size);
    const w = g.measureText(t).width;
    if (w <= maxW) return t;
    g.font = font(Math.max(size * minScale, size * maxW / w));
    if (g.measureText(t).width <= maxW) return t;
    while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  // Rounded-rectangle path (the caller fills, strokes or clips it).
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // Wrap text into at most `maxLines` lines that fit `width`, ending with … if cut.
  function wrap(g, text, width, maxLines) {
    const words = String(text || '').split(/\s+/), lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (g.measureText(test).width <= width) { line = test; continue; }
      if (line) lines.push(line);
      line = words[i];
      if (lines.length === maxLines - 1) {
        let rest = words.slice(i).join(' ');
        if (g.measureText(rest).width > width) {
          while (rest.length > 1 && g.measureText(rest + '…').width > width) rest = rest.slice(0, -1);
          rest += '…';
        }
        lines.push(rest);
        return lines;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // "1:02:03" / "3:45" -> seconds (NaN if it isn't a clock time).
  function parseClock(text) {
    const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec((text || '').trim());
    return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) : NaN;
  }

  // Badges beside names (e.g. a verified channel): name -> { draw(g, x, y, size), extra }.
  // `extra` pixels are added to the size the caller asks for (a badge that needs to look
  // bigger than the others). Drawn centred on (x, y) in the current fill colour.
  const badges = new Map();
  const registerBadge = (name, draw, extra = 0) => { badges.set(name, { draw, extra }); };
  function drawBadge(g, name, x, y, size) {
    const b = badges.get(name);
    if (b) b.draw(g, x, y, size + b.extra);
  }

  // A card's standard height for a thumbnail `thumbH` tall and `lines` grey lines under the
  // title: the title at its full 2 lines, the lines, plus a small margin. Every card in a
  // grid is this tall, so the hover highlight covers any card's text.
  const cardHeight = (thumbH, lines = 2) => thumbH + 60 + 25 * lines;

  // Images and cards drawing on the 2D context `g`. onImageLoaded(): called when an image
  // finishes loading, so the caller redraws. Returns { image(url), imagesReady(),
  // drawImageCover(img, x, y, w, h), drawImageContain(img, x, y, w, h), avatar(url, name, x, y, s),
  // drawCard(card, x, y, box, ui, regions, id) }.
  function createCardKit(g, onImageLoaded) {
    // Images (thumbnails, avatars, banners): loaded with CORS so the canvas stays usable as
    // a WebGL texture. Returns the image once loaded, else null (and starts loading it). If
    // the image server refuses, callers draw a plain placeholder.
    const images = new Map();               // url -> { img, ok }
    function image(url) {
      if (!url) return null;
      let t = images.get(url);
      if (!t) {
        t = { img: new Image(), ok: false };
        t.img.crossOrigin = 'anonymous';
        t.img.onload = () => { t.ok = true; onImageLoaded(); };
        t.img.onerror = () => { t.ok = false; };
        t.img.src = url;
        images.set(url, t);
        if (images.size > 160) images.delete(images.keys().next().value);   // keep the cache small
      }
      return t.ok ? t.img : null;
    }
    // How many images have loaded (part of a redraw key, so new ones appear).
    const imagesReady = () => { let n = 0; for (const t of images.values()) if (t.ok) n++; return n; };

    // Draw `img` to fill the w x h box, cropping the middle of whatever doesn't fit (so a
    // vertical thumbnail or a wide banner fills the box without stretching).
    function drawImageCover(img, x, y, w, h) {
      const s = Math.max(w / img.width, h / img.height);
      const sw = w / s, sh = h / s;
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
    }

    // Draw all of `img` as large as fits in the w x h box, centred (the rest left as is).
    function drawImageContain(img, x, y, w, h) {
      const s = Math.min(w / img.width, h / img.height);
      const dw = img.width * s, dh = img.height * s;
      g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }

    // Round picture `s` px across at (x, y) (top-left), or a grey disc with the first letter
    // of `name` while there's none.
    function avatar(url, name, x, y, s) {
      g.save(); g.beginPath(); g.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); g.clip();
      const img = url && image(url);
      if (img) drawImageCover(img, x, y, s, s);
      else {
        g.fillStyle = TC.outlineVariant; g.fillRect(x, y, s, s);
        g.fillStyle = TC.onSurface; g.font = `500 ${Math.round(s * 0.5)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(name || '?').replace(/^@/, '').charAt(0).toUpperCase(), x + s / 2, y + s / 2 + 1);
      }
      g.restore();
    }

    // One card (see the top of the file) at (x, y) in a box { w, h, thumbH }: thumbnail
    // with its corner text and flags, then the title (up to 2 lines) and the grey lines.
    // No tile at rest (like YouTube); the pointed-at card gets a tile 8 px around it and the
    // white ring (pressed: a 0.12 state layer and squarer corners). The whole card is one
    // clickable region `id` pushed onto `regions`; ui: { hover, pressed }.
    function drawCard(card, x, y, box, ui, regions, id) {
      const W_ = box.w, TH = box.thumbH, T = ns.vrTokens, P = T.m3;
      if (!card.inert) regions.push({ id, x, y, w: W_, h: box.h });
      // How far it's pointed at / pressed (motion.js: eased; 0 for a card just to look at).
      const { h: hv, p: pv } = card.inert ? { h: 0, p: 0 } : ns.vrMotion.of(ui, id);
      const tileA = Math.min(1, Math.max(hv, pv));
      const tile = { x: x - 8, y: y - 8, w: W_ + 16, h: box.h + 16, r: Math.max(4, ns.vrMotion.lerp(T.shape.large, T.shape.medium, pv)) };
      if (tileA > 0.01) {
        const a0 = g.globalAlpha;
        g.globalAlpha = a0 * tileA;
        g.fillStyle = P.surfaceContainerHighest; roundRect(g, tile.x, tile.y, tile.w, tile.h, tile.r); g.fill();
        g.globalAlpha = a0;
        if (pv > 0.01) { g.fillStyle = T.m3Alpha('onSurface', 0.12 * Math.min(1, pv)); roundRect(g, tile.x, tile.y, tile.w, tile.h, tile.r); g.fill(); }
      }
      // Thumbnail (a grey box with a play triangle until it loads)
      g.save(); roundRect(g, x, y, W_, TH, T.shape.medium); g.clip();
      const img = image(card.thumb);
      if (img && card.fit === 'contain') { g.fillStyle = TC.n17; g.fillRect(x, y, W_, TH); drawImageContain(img, x, y, W_, TH); }
      else if (img) drawImageCover(img, x, y, W_, TH);
      else {
        g.fillStyle = TC.n17; g.fillRect(x, y, W_, TH);
        g.fillStyle = TC.outlineVariant; const cx = x + W_ / 2, cy = y + TH / 2;
        g.beginPath(); g.moveTo(cx - 16, cy - 22); g.lineTo(cx + 24, cy); g.lineTo(cx - 16, cy + 22); g.closePath(); g.fill();
      }
      // Watched so far: a light track along the bottom with the watched part in the brand colour
      // (inside the clip, so it follows the rounded corners).
      if (card.progress > 0) {
        const BAR = 6;
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y + TH - BAR, W_, BAR);
        g.fillStyle = P.brand; g.fillRect(x, y + TH - BAR, W_ * Math.min(1, card.progress), BAR);
      }
      g.restore();
      // Corner text (bottom right) on a dark pill (above the watched bar).
      g.font = '500 20px Roboto, Arial, sans-serif'; g.textBaseline = 'middle';
      if (card.corner) {
        const tw = g.measureText(card.corner).width + 18, cy = y + TH - (card.progress > 0 ? 28 : 22);
        g.fillStyle = 'rgba(0,0,0,0.75)'; roundRect(g, x + W_ - tw - 8, cy - 14, tw, 28, 14); g.fill();
        g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.fillText(card.corner, x + W_ - tw / 2 - 8, cy + 1);
      }
      // The item playing now: a blue outline round the thumbnail.
      if (card.current) { g.strokeStyle = TC.tertiary; g.lineWidth = 4; roundRect(g, x - 2, y - 2, W_ + 4, TH + 4, 14); g.stroke(); }
      // Flags along the top-left, 26 px tall, 6 px apart.
      g.font = '600 18px Roboto, Arial, sans-serif';
      let fx = x + 8;
      for (const f of card.flags || []) {
        const fw = f.dot ? g.measureText(f.text).width + 34
          : (f.matchWidth ? Math.max(...f.matchWidth.map(t => g.measureText(t).width)) : g.measureText(f.text).width) + 16;
        g.fillStyle = ns.vrTokens.resolve(f.bg); roundRect(g, fx, y + 8, fw, 26, T.shape.small); g.fill();
        g.fillStyle = ns.vrTokens.resolve(f.fg);
        if (f.dot) {
          g.beginPath(); g.arc(fx + 13, y + 21, 4.5, 0, Math.PI * 2); g.fill();
          g.textAlign = 'left'; g.fillText(f.text, fx + 23, y + 22);
        } else { g.textAlign = 'center'; g.fillText(f.text, fx + fw / 2, y + 22); }
        fx += fw + 6;
      }

      // Title (2 lines), then the grey lines (each with an optional badge after its text)
      g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = P.onSurface; g.font = '500 22px Roboto, Arial, sans-serif';
      const lines = wrap(g, card.title, W_, 2);
      lines.forEach((l, i) => g.fillText(l, x, y + TH + 8 + i * 26));
      let ty = y + TH + 8 + lines.length * 26 + 2;
      g.fillStyle = P.onSurfaceVariant; g.font = '19px Roboto, Arial, sans-serif';
      for (const line of card.lines || []) {
        const text = wrap(g, line.text, W_ - (line.badge ? 26 : 0), 1)[0] || '';
        g.fillText(text, x, ty);
        if (line.badge && text) {
          drawBadge(g, line.badge, x + g.measureText(text).width + 14, ns.vrGlyphs.textMiddle(g, ty), 17);
          g.fillStyle = P.onSurfaceVariant; g.textBaseline = 'top';
        }
        ty += 25;
      }
      hoverRing(g, tile.x, tile.y, tile.w, tile.h, tile.r, hv);
    }

    return { image, imagesReady, drawImageCover, drawImageContain, avatar, drawCard };
  }

  // A clickable control's background (M3 state layers): pressed (onSurface 16%), hovered
  // (onSurface 10%, or `hoverFill`), else `base`.
  const buttonFill = (id, ui, base, hoverFill = ns.vrTokens.m3Alpha('onSurface', 0.10)) =>
    ui.pressed === id ? ns.vrTokens.m3Alpha('onSurface', 0.16) : ui.hover === id ? hoverFill : base;

  // The M3 look for a plain clickable area (a list row, a link-like button): while pointed
  // at, an onSurface 8% state layer and the white ring; while pressed, 12%; both eased
  // (motion.js). Draws nothing at rest. Call it before the area's content.
  function hoverArea(g, id, ui, x, y, w, h, r) {
    const { h: hv, p: pv } = ns.vrMotion.of(ui, id);
    const a = 0.08 * hv + 0.04 * Math.min(1, pv);
    if (a < 0.002) return;
    g.fillStyle = ns.vrTokens.m3Alpha('onSurface', a); roundRect(g, x, y, w, h, r); g.fill();
    hoverRing(g, x, y, w, h, r, hv);
  }

  // An M3 filter chip: a rounded rectangle (shape.small) x, y, w, h; `on` = tonal
  // (secondaryContainer) with a check before the label, else outlined (outlineVariant);
  // pointed at: the white ring; pressed: a 0.12 state layer. Its region `id` is pushed onto
  // `regions`. chipWidth(g, label, on): the width it needs at 22 px.
  const CHIP_CHECK = 30;                                  // room for an `on` chip's check
  const chipWidth = (g, label, on) => { g.font = ns.vrTokens.font('labelLarge', 22); return g.measureText(label).width + 36 + (on ? CHIP_CHECK : 0); };
  function chip(g, regions, id, x, y, w, h, label, on, ui) {
    const T = ns.vrTokens, P = T.m3, r = T.shape.small, { h: hv, p: pv } = ns.vrMotion.of(ui, id);
    regions.push({ id, x, y, w, h });
    roundRect(g, x, y, w, h, r);
    if (on) { g.fillStyle = P.secondaryContainer; g.fill(); }
    else { g.strokeStyle = P.outlineVariant; g.lineWidth = 2; roundRect(g, x + 1, y + 1, w - 2, h - 2, r); g.stroke(); }
    const fg = on ? P.onSecondaryContainer : P.onSurfaceVariant;
    if (pv > 0.01) { g.fillStyle = fg; g.globalAlpha = 0.12 * Math.min(1, pv); roundRect(g, x, y, w, h, r); g.fill(); g.globalAlpha = 1; }
    g.fillStyle = fg; g.font = T.font('labelLarge', 22); g.textAlign = 'left'; g.textBaseline = 'middle';
    if (on) ns.vrSymbols.draw(g, 'check', x + 26, y + h / 2, 24, false);
    g.fillText(label, x + 18 + (on ? CHIP_CHECK : 0), y + h / 2 + 1);
    hoverRing(g, x, y, w, h, r, hv);
  }

  // The white ring around whatever the laser points at (Material 3 Expressive look, as on
  // the controls panel): 3 px, 5 px outside the rectangle x, y, w, h with corner radius r.
  // amount (0..1, default 1): how far it has faded in (motion.js); nothing drawn at 0.
  function hoverRing(g, x, y, w, h, r, amount = 1) {
    if (amount < 0.01) return;
    const a0 = g.globalAlpha;
    g.globalAlpha = a0 * Math.min(1, amount);
    g.strokeStyle = ns.vrTokens.m3.hoverRing; g.lineWidth = 3;
    roundRect(g, x - 5, y - 5, w + 10, h + 10, Math.max(0, r) + 5); g.stroke();
    g.globalAlpha = a0;
  }

  // An M3 button: a full-round pill x, y (top-left), w, h with an optional icon
  // (Material Symbols, 28 px) and label centred, its region `id` pushed onto `regions` when
  // enabled. opts: { icon, label, kind: 'tonal' (secondaryContainer, default) | 'filled' (the brand colour) |
  // 'danger' (errorContainer) | 'outlined', enabled (default true), faded (drawn at 38%; default: when not enabled) }.
  // Pointed at: the white ring; pressed: corners square up and a 0.12 state layer.
  function button(g, regions, id, x, y, w, h, opts, ui) {
    const T = ns.vrTokens, P = T.m3;
    const { icon, label, kind = 'tonal', enabled = true } = opts, faded = opts.faded != null ? opts.faded : !enabled;
    if (enabled) regions.push({ id, x, y, w, h });
    // Pointed at / pressed, eased (motion.js): the corners morph from full-round towards
    // shape.large as it's pressed (a little past, and back, with the spring's bounce).
    const { h: hv, p: pv } = enabled ? ns.vrMotion.of(ui, id) : { h: 0, p: 0 };
    const r = Math.max(2, ns.vrMotion.lerp(h / 2, Math.min(T.shape.large, h / 2), pv));
    const KINDS = { filled: [P.brand, P.onBrand], tonal: [P.secondaryContainer, P.onSecondaryContainer], danger: [P.errorContainer, P.onErrorContainer], outlined: [null, P.onSurface] };
    const [bg, fg] = KINDS[kind] || KINDS.tonal;
    const alpha = g.globalAlpha;
    if (faded) g.globalAlpha = alpha * 0.38;
    roundRect(g, x, y, w, h, r);
    if (bg) { g.fillStyle = bg; g.fill(); } else { g.strokeStyle = P.outline; g.lineWidth = 2; g.stroke(); }
    if (pv > 0.01) { g.fillStyle = fg; g.globalAlpha *= 0.12 * Math.min(1, pv); roundRect(g, x, y, w, h, r); g.fill(); g.globalAlpha = faded ? alpha * 0.38 : alpha; }
    g.fillStyle = fg; g.textBaseline = 'middle'; g.textAlign = 'left';
    const ICON = 28;
    const text = label ? fitFont(g, label, w - 32 - (icon ? ICON + 8 : 0), 22, '500 ') : '';
    const cw = (icon ? ICON : 0) + (icon && text ? 8 : 0) + (text ? g.measureText(text).width : 0);
    let cx = x + (w - cw) / 2;
    if (icon) { ns.vrSymbols.draw(g, icon, cx + ICON / 2, y + h / 2, ICON, false); cx += ICON + 8; }
    if (text) g.fillText(text, cx, y + h / 2 + 1);
    g.globalAlpha = alpha;
    hoverRing(g, x, y, w, h, r, hv);
  }

  // A row of M3 tabs: [{ id, label, icon (a Material Symbols name, optional) }], ids
  // 'tab:<id>', each pushed onto `regions`. The `active` one in onSurface (filled icon) with
  // a brand-colour indicator under its content, the others onSurfaceVariant; pointed
  // at: a faint tint and the white ring. opts: { x, y, h (the row, px), maxX (the row ends
  // before it), fill (equal widths across the row, up to 210 px each: M3 fixed tabs; else
  // each as wide as its content, shrinking text and padding until the row fits; if it still
  // doesn't and every tab has an icon, the tabs not chosen show their icon only) }. An icon
  // sits above the label when the row is at least 84 px tall, else beside it. Returns
  // where the row ends. opts.natural: every tab at its own full size, never shrunk (for a
  // row that slides: createStrip); opts.measure: draw nothing, just return the row's width.
  function drawTabs(g, list, active, ui, regions, opts) {
    const T = ns.vrTokens, P = T.m3;
    const { x: x0, y, h, maxX = g.canvas.width, fill = false, natural: full = false, measure = false } = opts;
    list = list || [];
    const stacked = h >= 84 && list.some(t => t.icon), ICON = stacked ? 34 : 28;
    let size = stacked ? 22 : 26, pad = 32;             // label px (stacked rows have the icon too)
    const labelW = t => { g.font = T.font('labelLarge', size); return g.measureText(t.label).width; };
    let compact = false;                                // icon only for the tabs not chosen
    const iconOnly = t => compact && t.id !== active;
    const natural = t => (iconOnly(t) ? ICON : stacked ? Math.max(labelW(t), ICON) : labelW(t) + (t.icon ? ICON + 10 : 0)) + pad;
    let widths;
    if (fill) widths = list.map(() => Math.min(210, (maxX - x0) / Math.max(1, list.length)));
    else if (full) widths = list.map(natural);
    else {
      const total = () => list.reduce((s, t) => s + natural(t), 0);
      while (total() > maxX - x0 && size > 18) { size--; pad = Math.max(18, pad - 2); }
      if (total() > maxX - x0 && !stacked && list.every(t => t.icon)) {
        compact = true; size = 26; pad = 32;             // then as big as fits again
        while (total() > maxX - x0 && size > 18) { size--; pad = Math.max(18, pad - 2); }
      }
      widths = list.map(natural);
      // Still too wide: every tab gives up the same share (their labels are cut to fit).
      const k = (maxX - x0) / widths.reduce((a, b) => a + b, 0);
      if (k < 1) widths = widths.map(w => w * k);
    }
    if (measure) return widths.reduce((a, b) => a + b, 0);
    let x = x0;
    g.textBaseline = 'middle';
    list.forEach((t, i) => {
      const id = `tab:${t.id}`, on = t.id === active, w = widths[i];
      regions.push({ id, x, y, w, h });
      hoverArea(g, id, ui, x + 4, y + 4, w - 8, h - 8, T.shape.large);   // tint and ring, eased
      // The label's size: the row's, or smaller to fit an equal-width tab.
      let s = size; g.font = T.font('labelLarge', s);
      while (s > 16 && g.measureText(t.label).width > w - 14 - (!stacked && t.icon ? ICON + 10 : 0)) g.font = T.font('labelLarge', --s);
      const room = w - 14 - (!stacked && t.icon ? ICON + 10 : 0);
      let label = t.label;
      while (label.length > 1 && g.measureText(label).width > room) label = label.slice(0, -2) + '…';
      const tw = iconOnly(t) ? 0 : g.measureText(label).width;
      g.fillStyle = on ? P.onSurface : P.onSurfaceVariant; g.textAlign = 'center';
      let contentW;
      if (stacked) {
        if (t.icon) ns.vrSymbols.draw(g, t.icon, x + w / 2, y + h / 2 - 15, ICON, on);
        g.fillText(label, x + w / 2, y + h / 2 + 22);
        contentW = Math.max(tw, ICON);
      } else {
        contentW = tw + (t.icon ? ICON + (tw ? 10 : 0) : 0);
        const cx = x + (w - contentW) / 2;
        if (t.icon) ns.vrSymbols.draw(g, t.icon, cx + ICON / 2, y + h / 2, ICON, on);
        if (tw) { g.textAlign = 'left'; g.fillText(label, cx + (t.icon ? ICON + 10 : 0), y + h / 2 + 1); }
      }
      if (on) {
        const iw = Math.min(w - 16, Math.max(48, contentW));
        g.fillStyle = P.brand; roundRect(g, x + (w - iw) / 2, y + h - 4, iw, 4, 2); g.fill();
      }
      x += w;
    });
    return x;
  }

  // A panel header's tabs (Queue, Info and Options): drawTabs from x = pad - 14, at y 16,
  // 52 tall, unless opts says otherwise (Options: taller, equal widths, with icons).
  function headerTabs(g, list, active, ui, regions, pad, opts = {}) {
    return drawTabs(g, list, active, ui, regions, { x: pad - 14, y: 16, h: 52, maxX: g.canvas.width - pad, ...opts });
  }

  // Hit test against a draw's regions ([{ id, x, y, w, h }], canvas px): the region at
  // (u, v) (0..1 from the top-left of a W x H canvas), first match wins, or null.
  // A row that can be wider than its room (tabs, chips) and slides sideways, like a
  // marquee: while the laser is near either end of it (STRIP.edge px, or past the end) and
  // there's more that way, it slides that way, faster the closer the laser is to the end.
  // Ends with more beyond them fade out. One per row, kept between draws.
  //   const strip = createStrip();
  //   strip.draw(g, regions, box, contentW, key, paint): box { x, y, w, h } is the row's room
  //     on the canvas; contentW how wide the row is; key changes when its contents do (back
  //     to the start). paint(ctx, regions, x) draws the row starting at x on ctx (canvas
  //     coordinates); a row that fits is painted straight onto g, else onto the strip's own
  //     canvas (shifted, faded, then copied in) and its regions are cut to what shows.
  //   strip.point(x, y): where the laser is on the panel (canvas px; called from hitTest).
  //   strip.moving() -> true while it's sliding (keep redrawing).
  const STRIP = { edge: 150, speed: 900, fade: 48, margin: 8, stale: 150 };   // px, px/s at the very end, px, px, ms
  function createStrip() {
    const cv = document.createElement('canvas'), sg = cv.getContext('2d');
    let offset = 0, max = 0, box = null, last = 0, lastKey = null, pointer = null;
    // How fast it should slide now (px/s; < 0: back towards the start), from the laser.
    function speed() {
      if (!box || max <= 0 || !pointer || performance.now() - pointer.at > STRIP.stale) return 0;
      const { x, y } = pointer, reach = 24;
      if (y < box.y - reach || y > box.y + box.h + reach || x < box.x - reach || x > box.x + box.w + reach) return 0;
      const toLeft = (box.x + STRIP.edge - x) / STRIP.edge, toRight = (x - (box.x + box.w - STRIP.edge)) / STRIP.edge;
      if (toLeft > 0 && offset > 0) return -STRIP.speed * Math.min(1, toLeft) ** 2;
      if (toRight > 0 && offset < max) return STRIP.speed * Math.min(1, toRight) ** 2;
      return 0;
    }
    function draw(g, regions, b, contentW, key, paint) {
      box = b; max = Math.max(0, contentW - b.w);
      if (key !== lastKey) { lastKey = key; offset = 0; }
      const now = performance.now(), dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      offset = Math.min(max, Math.max(0, offset + speed() * dt));
      if (max <= 0) { offset = 0; paint(g, regions, b.x); return; }
      const M = STRIP.margin;
      if (cv.width !== b.w || cv.height !== b.h + M * 2) { cv.width = b.w; cv.height = b.h + M * 2; }
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, cv.width, cv.height);
      sg.setTransform(1, 0, 0, 1, -b.x, -(b.y - M));
      const local = [];
      paint(sg, local, b.x - offset);
      sg.setTransform(1, 0, 0, 1, 0, 0);
      // Fade the ends that have more beyond them.
      sg.globalCompositeOperation = 'destination-in';
      const grad = sg.createLinearGradient(0, 0, b.w, 0), f = STRIP.fade / b.w;
      grad.addColorStop(0, offset > 0.5 ? 'rgba(0,0,0,0)' : '#000'); grad.addColorStop(f, '#000');
      grad.addColorStop(1 - f, '#000'); grad.addColorStop(1, offset < max - 0.5 ? 'rgba(0,0,0,0)' : '#000');
      sg.fillStyle = grad; sg.fillRect(0, 0, cv.width, cv.height);
      sg.globalCompositeOperation = 'source-over';
      g.drawImage(cv, b.x, b.y - M);
      for (const r of local) {
        const x0 = Math.max(r.x, b.x), x1 = Math.min(r.x + r.w, b.x + b.w);
        if (x1 - x0 > 12) regions.push({ ...r, x: x0, w: x1 - x0 });
      }
    }
    const point = (x, y) => { pointer = { x, y, at: performance.now() }; };
    return { draw, point, moving: () => speed() !== 0 };
  }

  // The control at (u, v) (0..1 across the canvas) in a style's `regions`, or null. A
  // control drawn smaller than TARGET px across reaches out to that size around its middle
  // (Android XR's 56 dp target, at the panels' layout density, ≈ 72 px) without changing its
  // look; where those reaches overlap or a point is near several, the nearest control wins,
  // and a point right on a control always picks it (the first one drawn, as before).
  const TARGET = 72;
  function regionAt(regions, u, v, W, H) {
    const x = u * W, y = v * H;
    for (const r of regions) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
    let best = null, bestD = Infinity;
    for (const r of regions) {
      const padX = Math.max(0, (TARGET - r.w) / 2), padY = Math.max(0, (TARGET - r.h) / 2);
      if (!padX && !padY) continue;
      if (x < r.x - padX || x > r.x + r.w + padX || y < r.y - padY || y > r.y + r.h + padY) continue;
      const dx = Math.max(r.x - x, 0, x - r.x - r.w), dy = Math.max(r.y - y, 0, y - r.y - r.h);
      const d = dx * dx + dy * dy;
      if (d < bestD) { best = r; bestD = d; }
    }
    return best;
  }

  ns.vrKit = { FONT, fitFont, roundRect, wrap, parseClock, registerBadge, drawBadge, cardHeight, createCardKit, buttonFill, hoverArea, hoverRing, button, chip, chipWidth, drawTabs, headerTabs, createStrip, regionAt, TARGET };
})(globalThis.__streamxr = globalThis.__streamxr || {});
