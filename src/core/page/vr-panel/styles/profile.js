// Profile style (canvas 2D): a page about one creator or show. A banner, a round picture,
// the name (with a badge) and a stats line, one action button, then tabs with pills on the
// right (the tabs shrink to fit beside them), then one of: the card grid and paging
// (grid.js), one big featured card, or a scrolling body (a text page, a feed of posts, or
// one post with its comments). YouTube's Channel panel; another site's series page ("Add
// to My List", seasons). Knows nothing about any site: the provider fills the model
// (ARCHITECTURE.md).
//
//   const style = ns.vrStyles.profile.create(onImageLoaded, W, H, overrides);   // canvas size in px
//   overrides.slots.threadFooter(f): a comment row's footer (thread.js, as in info.js)
//   style.draw(model, ui)
//     model: { header: { title, badge, stats, avatar, banner } | null, loadingTitle (shown
//                instead of the title while header is null),
//              action: { id, label, look: 'primary' | 'secondary' | 'danger' | 'busy' } | null
//                (one button on the right; 'busy' isn't clickable),
//              iconAction: { id, icon, look: 'primary' | 'secondary' | 'busy' } | null (a round
//                icon button just left of the action button, e.g. one that opens a menu),
//              tabs: [{ id, label }], tab, pills: [{ id, label }], pill,
//              search: bool (a search button at the tab row's end, 'search'),
//              field: null | a text field (grid.js: { id, text, placeholder, focused, button,
//                clearable }): searching, the tab row becomes a back button ('back') and it,
//              items: [cards for this page], page, pageCount, more, loading (with no items: the
//                loading indicator above emptyText), emptyText,
//              featured: null | { thumb, flags (dot flags: drawn big on the thumbnail), kicker,
//                title, stats, description } (shown instead of the grid),
//              body: null | one of (shown instead of the grid, scrolling; scroll: px from its top,
//                now: seconds, for the spinner)
//                { kind: 'page', text (paragraphs split by "\n"), facts: [{ label, value }]
//                  (two columns under the text), loading, emptyText }
//                { kind: 'feed', posts: [post], loading, emptyText }
//                { kind: 'tiers', image, kicker, title, intro: [lines], tiers: [{ title, price,
//                  button: { id, label, enabled } | null, note, items: [{ title, text, images:
//                  [urls] }] }], footer, loading, emptyText } (plans or levels to join, e.g. a
//                  channel's memberships: tiersPage)
//                { kind: 'post', post, back (the back button's label), thread (thread.js's
//                  content: its pills and count sit on the bar beside the back button) }
//              post: { at (the id posts' controls carry; default: the index in posts),
//                author, avatar, meta, flags: [{ text, bg, fg }] (after the author, e.g.
//                "Members only"; colour role specs as on cards), text, images: [urls],
//                card (a generic card, e.g. an attached video; clickable) | null,
//                poll: { choices: [{ text, on (your choice), percent (0-100: shown as a bar,
//                  null: no results shown) }], note, enabled (choices clickable) } | null,
//                buttons: [{ name, icon: 'like' | 'dislike' | 'comments', label, on, enabled }],
//                footer (grey text, after the buttons) }
//   Control ids: 'action:<id>', 'tab:<id>', 'pill:<id>', 'item:<index on page>', 'featured',
//   'page:prev', 'page:next', 'post:<at>' (its card), 'vote:<at>.<choice>', '<name>:<at>'
//   (its buttons), 'back' (an opened post, or searching), 'search', 'field:<id>' /
//   'clear:<id>' / 'submit:<id>' (searching), the thread's own (thread.js), 'text' (anywhere
//   else on a scrolling body: a trigger drag can start there).
//   Scrolling (a body): scrollAt(u, v), maxScroll(), shownScroll(), pxPerV.
//   Also: hitTest(u, v) -> { id } | null, has(id), rectOf(id) -> { x, y, w, h } (px) | null
//   (a control's place in the last draw, for a menu opening from it), imagesReady(),
//   perPage, canvas, aspect.
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha;        // design tokens (tokens.js)

  const { roundRect, wrap, regionAt, drawBadge, FONT } = ns.vrKit;
  const PAD = 48, BANNER_H = 120;
  const AVATAR = { cx: PAD + 56, cy: 158, r: 56 };
  const NAME_X = AVATAR.cx + AVATAR.r + 24;
  const TAB_Y = 246, TAB_H = 52;         // tab row (and pills on its right, or under it on a narrow panel)
  const NARROW = 1100;                   // under this width (px) the pills get their own row

  // The action button's kit button kind by look ('busy': tonal, faded and not clickable).
  const KIND = { primary: 'filled', secondary: 'tonal', danger: 'danger', busy: 'tonal' };
  // The grid's cards have one grey line under the title (the creator line is left out: it's
  // the same everywhere on this page).
  function create(onImageLoaded, W = 1280, H = 960, overrides = {}) {
    const ACTION = { x: W - PAD - 240, y: 132, w: 240, h: 60 };
    const ICON_ACTION = { x: ACTION.x - 60 - 16, y: ACTION.y, w: 60, h: 60 };
    // A narrow panel puts the pills on a row of their own under the tabs, so the tabs keep
    // their names; everything below moves down with it.
    const PILLS_Y = W < NARROW ? TAB_Y + TAB_H + 10 : TAB_Y;
    const DIVIDER_Y = PILLS_Y + TAB_H + 14;
    const GRID_TOP = DIVIDER_Y + 22;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const kit = ns.vrKit.createCardKit(g, onImageLoaded);
    const grid = ns.vrStyleGrid.createGrid(g, kit, W, H, GRID_TOP, 1);
    const slots = { threadFooter: f => f.x, ...(overrides.slots || {}) };
    const thread = ns.vrStyleThread.create(g, kit, { slots, fill: (id, ui, base) => ns.vrKit.buttonFill(id, ui, base) });
    let regions = [];                                     // clickable rectangles from the last draw

    // Banner across the top (or a dark strip), fading into the panel at its bottom edge.
    function drawBanner(h) {
      const img = h && kit.image(h.banner);
      if (img) kit.drawImageCover(img, 0, 0, W, BANNER_H);
      else { g.fillStyle = P.surfaceContainerLowest; g.fillRect(0, 0, W, BANNER_H); }
      const fade = g.createLinearGradient(0, BANNER_H * 0.4, 0, BANNER_H);
      fade.addColorStop(0, PA('surfaceContainer', 0)); fade.addColorStop(1, T.panelFill());
      g.fillStyle = fade; g.fillRect(0, 0, W, BANNER_H);
    }

    // Round picture overlapping the banner's bottom edge.
    function drawAvatar(h) {
      g.save();
      g.beginPath(); g.arc(AVATAR.cx, AVATAR.cy, AVATAR.r + 4, 0, Math.PI * 2); g.fillStyle = P.surfaceContainer; g.fill();
      g.beginPath(); g.arc(AVATAR.cx, AVATAR.cy, AVATAR.r, 0, Math.PI * 2); g.clip();
      const img = h && kit.image(h.avatar);
      if (img) kit.drawImageCover(img, AVATAR.cx - AVATAR.r, AVATAR.cy - AVATAR.r, AVATAR.r * 2, AVATAR.r * 2);
      else { g.fillStyle = P.surfaceContainerHighest; g.fillRect(AVATAR.cx - AVATAR.r, AVATAR.cy - AVATAR.r, AVATAR.r * 2, AVATAR.r * 2); }
      g.restore();
    }

    // Name (+ badge) and the stats line beside the picture.
    function drawTitle(m) {
      const h = m.header;
      const maxW = (m.iconAction ? ICON_ACTION.x : ACTION.x) - NAME_X - 24;
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = P.onSurface; g.font = T.font('titleLargeEmphasized', 36);
      const name = wrap(g, h ? h.title : m.loadingTitle, maxW - (h && h.badge ? 34 : 0), 1)[0] || '';
      g.fillText(name, NAME_X, 152);
      if (h && h.badge) { g.fillStyle = P.onSurfaceVariant; drawBadge(g, h.badge, NAME_X + g.measureText(name).width + 20, ns.vrGlyphs.textMiddle(g, 152), 24); }
      if (h) {
        g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`;
        g.fillText(wrap(g, h.stats, maxW, 1)[0] || '', NAME_X, 196);
      }
    }

    // The action button (an M3 button on the right of the header: Subscribe filled in the
    // brand colour, Subscribed tonal, a danger look in errorContainer).
    function drawAction(m, ui) {
      const a = m.action;
      if (!a) return;
      ns.vrKit.button(g, regions, `action:${a.id}`, ACTION.x, ACTION.y, ACTION.w, ACTION.h,
        { label: a.label, kind: KIND[a.look] || 'filled', enabled: a.look !== 'busy' }, ui);
      const i = m.iconAction;                 // the round icon button left of it
      if (i) ns.vrKit.button(g, regions, `action:${i.id}`, ICON_ACTION.x, ICON_ACTION.y, ICON_ACTION.w, ICON_ACTION.h,
        { icon: i.icon, kind: KIND[i.look] || 'tonal', enabled: i.look !== 'busy' }, ui);
    }

    // The featured card (id 'featured'): the thumbnail on the left (with its dot flags drawn
    // big), then the kicker, the title (up to 3 lines), the stats and the description (as many
    // lines as fit beside the thumbnail) on the right.
    function drawFeatured(f, ui) {
      const id = 'featured', x = PAD, y = GRID_TOP;
      const tw = Math.round((W - PAD * 2) * 0.58), th = Math.round(tw * 9 / 16);
      const tx = x + tw + 32, textW = W - PAD - tx, bottom = y + th;   // the text ends level with the thumbnail
      regions.push({ id, x: x - 10, y: y - 10, w: W - PAD * 2 + 20, h: th + 20 });
      if (ui.hover === id || ui.pressed === id) {
        // As a card: a tile (and the white ring) only while pointed at.
        g.fillStyle = P.surfaceContainerHighest; roundRect(g, x - 10, y - 10, W - PAD * 2 + 20, th + 20, T.shape.large); g.fill();
        if (ui.pressed === id) { g.fillStyle = PA('onSurface', 0.12); roundRect(g, x - 10, y - 10, W - PAD * 2 + 20, th + 20, T.shape.large); g.fill(); }
        if (ui.hover === id) ns.vrKit.hoverRing(g, x - 10, y - 10, W - PAD * 2 + 20, th + 20, T.shape.large);
      }
      g.save(); roundRect(g, x, y, tw, th, 16); g.clip();
      const img = kit.image(f.thumb);
      if (img) kit.drawImageCover(img, x, y, tw, th);
      else { g.fillStyle = P.surfaceContainerHighest; g.fillRect(x, y, tw, th); }
      g.restore();
      let fx = x + 12;
      for (const flag of (f.flags || []).filter(fl => fl.dot)) {
        g.font = `600 22px ${FONT}`; g.textBaseline = 'middle';
        const lw = g.measureText(flag.text).width + 40;
        g.fillStyle = ns.vrTokens.resolve(flag.bg); roundRect(g, fx, y + 12, lw, 34, 8); g.fill();
        g.fillStyle = ns.vrTokens.resolve(flag.fg); g.beginPath(); g.arc(fx + 16, y + 29, 6, 0, Math.PI * 2); g.fill();
        g.textAlign = 'left'; g.fillText(flag.text, fx + 28, y + 30);
        fx += lw + 8;
      }
      g.textAlign = 'left'; g.textBaseline = 'top';
      let ty = y;
      g.fillStyle = P.onSurfaceVariant; g.font = `500 20px ${FONT}`; g.fillText(f.kicker || '', tx, ty); ty += 36;
      g.fillStyle = P.onSurface; g.font = `500 30px ${FONT}`;
      for (const line of wrap(g, f.title, textW, 3)) { g.fillText(line, tx, ty); ty += 38; }
      ty += 4;
      if (f.stats) { g.fillStyle = P.onSurfaceVariant; g.font = `22px ${FONT}`; g.fillText(wrap(g, f.stats, textW, 1)[0] || '', tx, ty); ty += 40; }
      if (f.description) {
        g.fillStyle = P.onSurfaceVariant; g.font = `21px ${FONT}`;
        const fit = Math.max(0, Math.floor((bottom - ty) / 29));
        for (const line of wrap(g, f.description.replace(/\s+/g, ' '), textW, fit)) { g.fillText(line, tx, ty); ty += 29; }
      }
    }

    // ------------------------------------------------------------ scrolling body
    // The area under the tabs, less room for the scroll bar on the right; an opened post's
    // starts under its bar (back button, pills, count). The last draw's scroll state and
    // area are kept for the host (scrollAt, maxScroll, shownScroll).
    const VIEW = { x: PAD, y: GRID_TOP, w: W - PAD * 2 - 24, h: H - GRID_TOP - 20 };
    const BAR_H = 44, POST_VIEW = { ...VIEW, y: GRID_TOP + BAR_H + 14, h: H - GRID_TOP - BAR_H - 14 - 20 };
    let scrollable = false, maxScrollPx = 0, scrollPx = 0, curView = VIEW;

    // Every line of `text` wrapped to maxW in the current font: paragraphs split by "\n"
    // (an empty one keeps its blank line); a word longer than a line runs over (clipped).
    function wrapParas(text, maxW) {
      const out = [];
      for (const para of String(text || '').split('\n')) out.push(...(para.trim() ? wrap(g, para, maxW, Infinity) : ['']));
      return out;
    }

    // A region pushed only for its part inside the scrolling area (nothing if none shows).
    function clipRegion(id, x, y, w, h) {
      const a = Math.max(curView.y, y), b = Math.min(curView.y + curView.h, y + h);
      if (b > a) regions.push({ id, x, y: a, w, h: b - a });
    }

    // A grey line (or the spinner) in the middle of the scrolling area.
    function bodyMessage(text, spinnerAt) {
      const cy = VIEW.y + Math.min(VIEW.h / 2, 120);
      if (spinnerAt != null) { ns.vrGlyphs.spinner(g, W / 2, cy, 30, spinnerAt, false); return; }
      g.fillStyle = P.onSurfaceVariant; g.font = `24px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(text || '', PAD, VIEW.y + 40);
    }

    // Start / end drawing a scrolling body `contentH` tall in `view`: clamp the scroll, clip
    // to the area; then the scroll bar (when there's more than fits) and the 'text' region
    // (last, so the body's own controls win the hit test).
    function beginScroll(m, contentH, view = VIEW) {
      scrollable = true; curView = view;
      maxScrollPx = Math.max(0, contentH - view.h);
      scrollPx = Math.min(maxScrollPx, Math.max(0, m.scroll || 0));
      g.save(); g.beginPath(); g.rect(view.x - 8, view.y, view.w + 16, view.h); g.clip();
      return view.y - scrollPx;                             // where the content's top is drawn
    }
    function endScroll() {
      const v = curView;
      g.restore();
      if (maxScrollPx > 0) {
        const barH = Math.max(40, v.h * v.h / (v.h + maxScrollPx));
        const barY = v.y + (v.h - barH) * (scrollPx / maxScrollPx);
        g.fillStyle = PA('onSurface', 0.08); roundRect(g, W - 30, v.y, 8, v.h, 4); g.fill();
        g.fillStyle = PA('onSurface', 0.45); roundRect(g, W - 30, barY, 8, barH, 4); g.fill();
      }
      regions.push({ id: 'text', x: v.x - 8, y: v.y, w: v.w + 16, h: v.h });
    }

    // 'page': the text (22 px, 32 px lines), then the facts as label (grey) | value (white)
    // rows. Laid out once per content.
    const PAGE = { size: 22, line: 32, gap: 28, labelW: 220 };
    let pageLay = { key: null };
    function layoutPage(b) {
      const key = JSON.stringify([b.text, b.facts]);
      if (pageLay.key === key) return pageLay;
      g.font = `${PAGE.size}px ${FONT}`;
      const text = b.text ? wrapParas(b.text, VIEW.w) : [];
      let y = text.length ? text.length * PAGE.line + PAGE.gap : 0;
      const facts = (b.facts || []).map(f => {
        const row = { label: f.label, lines: wrapParas(f.value, VIEW.w - PAGE.labelW), y };
        y += row.lines.length * PAGE.line + 8;
        return row;
      });
      pageLay = { key, text, facts, height: y };
      return pageLay;
    }

    function drawPage(b, m) {
      if (!b.text && !(b.facts || []).length) { bodyMessage(b.emptyText, b.loading ? m.now || 0 : null); return; }
      const lay = layoutPage(b);
      const top = beginScroll(m, lay.height + 12);
      g.textAlign = 'left'; g.textBaseline = 'top'; g.font = `${PAGE.size}px ${FONT}`;
      g.fillStyle = P.onSurface;
      lay.text.forEach((line, i) => {
        const y = top + i * PAGE.line;
        if (y + PAGE.line >= VIEW.y && y <= VIEW.y + VIEW.h) g.fillText(line, VIEW.x, y + 4);
      });
      for (const f of lay.facts) {
        const y = top + f.y;
        if (y + f.lines.length * PAGE.line < VIEW.y || y > VIEW.y + VIEW.h) continue;
        g.fillStyle = P.onSurfaceVariant; g.fillText(wrap(g, f.label, PAGE.labelW - 20, 1)[0] || '', VIEW.x, y + 4);
        g.fillStyle = P.onSurface;
        f.lines.forEach((line, i) => g.fillText(line, VIEW.x + PAGE.labelW, y + 4 + i * PAGE.line));
      }
      endScroll();
    }

    // 'tiers': a page of plans or levels to join (e.g. a channel's memberships): a round
    // picture with a kicker (grey) and a title, the intro lines, then each tier: its title, its
    // price, its button (id 'action:<id>', greyed when not enabled), its items (a title, a row
    // of small pictures, a grey description), its note (grey); a grey footer at the end.
    // One function lays it out and draws it (draw false: just measure), so the two agree.
    const TIER = { avatar: 72, size: 22, small: 18, line: 30, smallLine: 26, img: 34, gap: 18, btnW: 280, btnH: 52 };
    function tiersPage(b, ui, top, draw) {
      let y = top;
      const text = (lines, font, color, x = VIEW.x, lh = TIER.line) => {
        for (const line of lines) { if (draw) { g.font = font; g.fillStyle = color; g.fillText(line, x, y + 4); } y += lh; }
      };
      const wrapped = (t, font, w = VIEW.w) => { g.font = font; return t ? wrapParas(t, w) : []; };
      g.textAlign = 'left'; g.textBaseline = 'top';
      // The heading: picture, kicker and title beside it.
      if (b.image || b.title) {
        if (draw) kit.avatar(b.image, b.title, VIEW.x, y, TIER.avatar);
        const x = VIEW.x + TIER.avatar + 20, y0 = y;
        y += 6;
        if (b.kicker) text([b.kicker], `${TIER.small}px ${FONT}`, P.onSurfaceVariant, x, TIER.smallLine);
        if (b.title) text([b.title], T.font('titleLargeEmphasized', 30), P.onSurface, x, 40);
        y = Math.max(y, y0 + TIER.avatar) + TIER.gap;
      }
      for (const line of b.intro || []) text(wrapped(line, `${TIER.size}px ${FONT}`), `${TIER.size}px ${FONT}`, P.onSurface);
      for (const t of b.tiers || []) {
        y += TIER.gap;
        if (draw) { g.fillStyle = PA('onSurface', 0.12); g.fillRect(VIEW.x, y, VIEW.w, 2); }
        y += TIER.gap;
        text([t.title || ''], T.font('titleMedium', 26), P.onSurface, VIEW.x, 36);
        if (t.price) text([t.price], `500 ${TIER.size}px ${FONT}`, P.onSurface);
        if (t.button) {
          y += 8;
          if (draw) ns.vrKit.button(g, regions, `action:${t.button.id}`, VIEW.x, y, TIER.btnW, TIER.btnH,
            { label: t.button.label, kind: 'filled', enabled: !!t.button.enabled }, ui);
          y += TIER.btnH + 8;
        }
        if (t.note) text(wrapped(t.note, `${TIER.small}px ${FONT}`), `${TIER.small}px ${FONT}`, P.onSurfaceVariant, VIEW.x, TIER.smallLine);
        for (const it of t.items || []) {
          y += 12;
          text(wrapped(it.title, `500 ${TIER.size}px ${FONT}`), `500 ${TIER.size}px ${FONT}`, P.onSurface);
          if ((it.images || []).length) {
            if (draw) it.images.forEach((url, k) => { const img = kit.image(url); if (img) g.drawImage(img, VIEW.x + k * (TIER.img + 8), y + 2, TIER.img, TIER.img); });
            y += TIER.img + 8;
          }
          if (it.text) text(wrapped(it.text, `${TIER.small}px ${FONT}`), `${TIER.small}px ${FONT}`, P.onSurfaceVariant, VIEW.x, TIER.smallLine);
        }
      }
      if (b.footer) { y += TIER.gap; text(wrapped(b.footer, `${TIER.small}px ${FONT}`), `${TIER.small}px ${FONT}`, P.onSurfaceVariant, VIEW.x, TIER.smallLine); }
      return y - top;
    }
    function drawTiers(b, m, ui) {
      if (!(b.tiers || []).length) { bodyMessage(b.emptyText, b.loading ? m.now || 0 : null); return; }
      const h = tiersPage(b, ui, 0, false);
      const top = beginScroll(m, h + 12);
      tiersPage(b, ui, top, true);
      endScroll();
    }

    // A post: round picture, author and meta, the text, its pictures (up to 3 side by side;
    // "+N" for more), its card (a standard card, 'post:<at>'), its poll ('vote:<at>.<k>':
    // a bar per choice, filled to its share once results show, yours outlined), then its
    // buttons ('<name>:<at>': 👍 / 👎 / 💬 with a count) and the footer.
    const POST = { avatar: 44, head: 72, size: 21, line: 30, imgH: 240, gap: 14, pad: 26, choiceH: 44, choiceW: 640, cardW: 360, buttonsH: 34 };
    const POST_X = POST.avatar + 16, POST_W = VIEW.w - POST_X;
    const CARD_BOX = { w: POST.cardW, thumbH: Math.round(POST.cardW * 9 / 16), h: 0 };
    CARD_BOX.h = ns.vrKit.cardHeight(CARD_BOX.thumbH, 1);
    const postLay = new WeakMap();                          // post -> { lines, h }: laid out once per post
    function layoutPost(p) {
      let lay = postLay.get(p);
      if (lay) return lay;
      g.font = `${POST.size}px ${FONT}`;
      const lines = p.text ? wrapParas(p.text, POST_W) : [];
      let h = POST.head + lines.length * POST.line;
      if ((p.images || []).length) h += POST.gap + POST.imgH;
      if (p.card) h += POST.gap + CARD_BOX.h;
      if (p.poll) h += POST.gap + p.poll.choices.length * (POST.choiceH + 8) + (p.poll.note ? 30 : 0);
      if ((p.buttons || []).length || p.footer) h += POST.gap + POST.buttonsH;
      lay = { lines, h: h + POST.pad };
      postLay.set(p, lay);
      return lay;
    }

    function drawPost(p, at, x0, y0, lay, ui) {
      const x = x0 + POST_X;
      let py = y0 + 12;
      kit.avatar(p.avatar, p.author, x0, py, POST.avatar);
      g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = P.onSurface; g.font = `500 20px ${FONT}`; g.fillText(p.author || '', x, py);
      // Its flags after the author's name: 24 px tall pills, 6 px apart.
      let fx = x + g.measureText(p.author || '').width + 12;
      g.font = `600 16px ${FONT}`;
      for (const f of p.flags || []) {
        const fw = g.measureText(f.text).width + 16;
        g.fillStyle = T.resolve(f.bg); roundRect(g, fx, py - 2, fw, 24, T.shape.small); g.fill();
        g.fillStyle = T.resolve(f.fg); g.textAlign = 'center'; g.fillText(f.text, fx + fw / 2, py + 2);
        fx += fw + 6;
      }
      g.textAlign = 'left';
      g.fillStyle = P.onSurfaceVariant; g.font = `18px ${FONT}`; g.fillText(p.meta || '', x, py + 26);
      py = y0 + POST.head;
      g.fillStyle = P.onSurface; g.font = `${POST.size}px ${FONT}`;
      lay.lines.forEach((line, k) => g.fillText(line, x, py + k * POST.line));
      py += lay.lines.length * POST.line;
      const imgs = p.images || [];
      if (imgs.length) {
        py += POST.gap;
        const n = Math.min(3, imgs.length), w = Math.min((POST_W - (n - 1) * 10) / n, POST.imgH * 16 / 9);
        for (let k = 0; k < n; k++) {
          const ix = x + k * (w + 10);
          g.save(); roundRect(g, ix, py, w, POST.imgH, 12); g.clip();
          g.fillStyle = P.surfaceContainerHighest; g.fillRect(ix, py, w, POST.imgH);
          const img = kit.image(imgs[k]);
          if (img) kit.drawImageContain(img, ix, py, w, POST.imgH);
          if (k === n - 1 && imgs.length > n) {
            g.fillStyle = PA('shadow', 0.55); g.fillRect(ix, py, w, POST.imgH);
            g.fillStyle = P.onSurface; g.font = `500 40px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(`+${imgs.length - n}`, ix + w / 2, py + POST.imgH / 2);
            g.textAlign = 'left'; g.textBaseline = 'top';
          }
          g.restore();
        }
        py += POST.imgH;
      }
      if (p.card) {
        py += POST.gap;
        const local = [];
        kit.drawCard(p.card, x, py, CARD_BOX, ui, local, `post:${at}`);
        for (const r of local) clipRegion(r.id, r.x, r.y, r.w, r.h);
        g.textAlign = 'left'; g.textBaseline = 'top';
        py += CARD_BOX.h;
      }
      if (p.poll) {
        py += POST.gap;
        const cw = Math.min(POST_W, POST.choiceW);
        p.poll.choices.forEach((choice, k) => {
          const id = `vote:${at}.${k}`, on = !!choice.on, shown = choice.percent != null;
          if (p.poll.enabled) clipRegion(id, x, py, cw, POST.choiceH);
          const hot = p.poll.enabled && (ui.hover === id || ui.pressed === id);
          g.save(); roundRect(g, x, py, cw, POST.choiceH, 10); g.clip();
          g.fillStyle = hot ? P.surfaceContainerHighest : P.surfaceContainerHigh; g.fillRect(x, py, cw, POST.choiceH);
          if (shown) { g.fillStyle = on ? PA('tertiary', 0.45) : PA('onSurface', 0.16); g.fillRect(x, py, cw * Math.min(100, choice.percent) / 100, POST.choiceH); }
          g.restore();
          if (on) { g.strokeStyle = P.tertiary; g.lineWidth = 2; roundRect(g, x + 1, py + 1, cw - 2, POST.choiceH - 2, 9); g.stroke(); }
          if (p.poll.enabled && ui.hover === id) ns.vrKit.hoverRing(g, x, py, cw, POST.choiceH, 10);
          g.fillStyle = P.onSurface; g.font = `${on ? '500 ' : ''}20px ${FONT}`; g.textBaseline = 'middle';
          const pct = shown ? `${Math.round(choice.percent)}%` : '';
          g.fillText(wrap(g, choice.text, cw - 32 - (pct ? 70 : 0), 1)[0] || '', x + 16, py + POST.choiceH / 2);
          if (pct) { g.textAlign = 'right'; g.fillText(pct, x + cw - 16, py + POST.choiceH / 2); g.textAlign = 'left'; }
          g.textBaseline = 'top';
          py += POST.choiceH + 8;
        });
        if (p.poll.note) { g.fillStyle = P.onSurfaceVariant; g.font = `18px ${FONT}`; g.fillText(p.poll.note, x, py + 4); py += 30; }
      }
      if ((p.buttons || []).length || p.footer) {
        py += POST.gap;
        let bx = x - 8;
        g.font = `18px ${FONT}`;
        for (const b of p.buttons || []) {
          const id = `${b.name}:${at}`, w = 38 + (b.label ? g.measureText(b.label).width + 8 : 0);
          if (b.enabled) {
            clipRegion(id, bx, py - 4, w, 32);
            ns.vrKit.hoverArea(g, id, ui, bx, py - 4, w, 32, 16);
          }
          const col = !b.enabled ? PA('onSurface', 0.38) : b.on ? P.onSurface : P.onSurfaceVariant;
          g.fillStyle = col; g.strokeStyle = col;
          ns.vrSymbols.draw(g, b.icon === 'comments' ? 'comment' : b.icon === 'dislike' ? 'thumb_down' : 'thumb_up', bx + 16, py + 12, 22, b.on);   // Material Symbols, filled when on
          g.fillStyle = col; g.font = `18px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top';
          if (b.label) g.fillText(b.label, bx + 30, py + 3);
          bx += w + 4;
        }
        if (p.footer) { g.fillStyle = P.onSurfaceVariant; g.font = `19px ${FONT}`; g.fillText(p.footer, bx + 8, py + 3); }
      }
    }

    // 'feed': posts one under another, a line between them.
    function drawFeed(b, m, ui) {
      const posts = b.posts || [];
      if (!posts.length) { bodyMessage(b.emptyText, b.loading ? m.now || 0 : null); return; }
      const lays = posts.map(layoutPost);
      const total = lays.reduce((s, l) => s + l.h, 0) + (b.loading ? 80 : 0);
      const top = beginScroll(m, total);
      let y = top;
      posts.forEach((p, i) => {
        const lay = lays[i], y0 = y;
        y += lay.h;
        if (y < VIEW.y || y0 > VIEW.y + VIEW.h) return;      // off screen
        if (i > 0) { g.fillStyle = PA('onSurface', 0.12); g.fillRect(VIEW.x, y0 - 2, VIEW.w, 2); }
        drawPost(p, p.at != null ? p.at : i, VIEW.x, y0, lay, ui);
      });
      if (b.loading) ns.vrGlyphs.spinner(g, W / 2, y + 40, 16, m.now || 0, false);
      endScroll();
    }

    // 'post': the bar (back button 'back', then the thread's pills and count), then the
    // post and its comments under it, scrolling together.
    function drawOpenPost(b, m, ui) {
      const by = GRID_TOP - 4;
      g.font = `500 22px ${FONT}`;
      const bw = g.measureText(b.back || '').width + 48 + 36;
      ns.vrKit.button(g, regions, 'back', PAD, by, bw, BAR_H, { icon: 'arrow_back', label: b.back || '' }, ui);
      const c = b.thread || {};
      thread.bar(c, ui, regions, by, PAD + bw + 24, W - PAD - 24);
      const p = b.post, plH = p ? layoutPost(p).h : 0;
      const lay = thread.layout(c, POST_VIEW.w);
      const top = beginScroll(m, plH + 16 + lay.height + 12, POST_VIEW);
      if (p) drawPost(p, p.at != null ? p.at : 0, POST_VIEW.x, top, layoutPost(p), ui);
      g.fillStyle = PA('onSurface', 0.12); g.fillRect(POST_VIEW.x, top + plH, POST_VIEW.w, 2);
      thread.draw(c, lay, m, ui, POST_VIEW.x, top + plH + 16, POST_VIEW, clipRegion);
      endScroll();
    }

    // The search button at the right end of the tab row ('search'): a magnifier on a round
    // button. Returns where it starts (x).
    function drawSearchButton(ui) {
      const s = TAB_H, x = W - PAD - s, y = TAB_Y;
      ns.vrKit.button(g, regions, 'search', x, y, s, s, { icon: 'search' }, ui);
      return x;
    }

    // Searching: the tab row becomes a back button ('back', round tonal with an arrow) and
    // the text field with its button (grid.js).
    function drawSearchBar(f, ui) {
      const bw = TAB_H + 12;
      ns.vrKit.button(g, regions, 'back', PAD, TAB_Y, bw, TAB_H, { icon: 'arrow_back' }, ui);
      grid.field(f, ui, regions, PAD + bw + 14, TAB_Y, W - PAD - (PAD + bw + 14), TAB_H);
    }

    // Paint the whole panel: header, then tabs on the left with pills on the right (and the
    // search button; or, searching, the search bar), the cards and the paging row (or the
    // featured card, or the scrolling body).
    const motion = ns.vrMotion.create();                // hover / press easing (motion.js)
    function draw(m, ui) {
      ui = motion.step(ui);
      regions = [];
      scrollable = false; maxScrollPx = 0; scrollPx = 0; curView = VIEW;
      g.clearRect(0, 0, W, H);
      g.save(); roundRect(g, 0, 0, W, H, T.shape.extraLarge); g.clip();
      g.fillStyle = T.panelFill(); g.fillRect(0, 0, W, H);
      drawBanner(m.header);
      g.restore();
      drawAvatar(m.header);
      drawTitle(m);
      drawAction(m, ui);
      if (m.field) drawSearchBar(m.field, ui);
      else {
        const right = m.search ? drawSearchButton(ui) - 12 : W - PAD;
        const ownRow = PILLS_Y !== TAB_Y;
        const pillsLeft = grid.pills(m.pills, m.pill, PILLS_Y, TAB_H, ui, regions, ownRow ? 'left' : 'right', PAD, ownRow ? W - PAD : right);
        grid.tabs(m.tabs, m.tab, TAB_Y, TAB_H, ui, regions, ownRow ? right : pillsLeft - 16);
      }
      grid.divider(DIVIDER_Y);
      if (m.body) {
        if (m.body.kind === 'feed') drawFeed(m.body, m, ui);
        else if (m.body.kind === 'post') drawOpenPost(m.body, m, ui);
        else if (m.body.kind === 'tiers') drawTiers(m.body, m, ui);
        else drawPage(m.body, m);
        return;
      }
      if (m.featured) { drawFeatured(m.featured, ui); return; }
      grid.grid(m.items || [], ui, regions, m.emptyText || '', m.loading ? m.now || 0 : null);
      grid.paging(m, ui, regions);
    }

    // (It also tells the sliding rows where the laser is: grid.js strips.)
    const hitTest = (u, v) => { grid.point(u * W, v * H); const r = regionAt(regions, u, v, W, H); return r ? { id: r.id } : null; };
    const has = id => regions.some(r => r.id === id);    // an enabled control from the last draw?
    const rectOf = id => { const r = regions.find(x => x.id === id); return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null; };
    // Is (u, v) on the scrolling body of the last draw?
    const scrollAt = (u, v) => scrollable && u * W >= curView.x - 8 && u * W <= W - 16 && v * H >= curView.y && v * H <= curView.y + curView.h;

    return {
      canvas, aspect: H / W, draw, hitTest, has, rectOf, scrollAt, imagesReady: kit.imagesReady, perPage: grid.PER_PAGE, animating: () => motion.moving() || grid.moving(),
      maxScroll: () => maxScrollPx,          // how far the last drawn body can scroll (px)
      shownScroll: () => scrollPx,           // where it actually is (after clamping)
      pxPerV: H,                             // canvas pixels per unit of v (for drag scrolling)
    };
  }

  ns.vrStyles = ns.vrStyles || {};
  ns.vrStyles.profile = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
