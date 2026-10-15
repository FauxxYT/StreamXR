// The small controls that float on the edge of a panel ("orbiters", in Android XR's terms):
// docs/Spatial-Layout.md. Canvas 2D; they know nothing about WebXR or any site.
//
// A side toolbar: an upright Material 3 Expressive floating toolbar (a full-round bar of
// icon buttons), one item per panel of one side. It stands on the Safe Zone's line, over the
// inner edge of its side's panel; the open panel's item is filled. The pointed-at item grows
// a pill outward (over its panel) showing its name, the icon staying at the bar; it shrinks
// back when the laser leaves it. Everything outside the bar and the grown pills is see-through
// (solidAt), so the laser reaches the panel behind.
//
//   const tb = ns.vrOrbitersUI.createToolbar(items, grows);   items: [{ id, label, icon }]
//     (the id is also the control id; label: text or a function giving it; icon: a
//     Material Symbols name, symbols.js); grows: 'left' or 'right', the side the names
//     grow towards (away from the video)
//   tb.draw({ open: { <item id>: bool }, hover, pressed, now (ms) })
//   tb.hitTest(u, v) -> { id } | null; tb.solidAt(u, v); tb.moving() (keep redrawing)
//   tb.barCentre: the bar's centre in canvas pixels { x, y }, tb.barWidth (px) (the bar isn't
//     centred in the canvas: the room for the names is on one side)
//
// The pill: one M3 tonal button (icon + name), filled while its panel is open; e.g. Settings
// on the controls panel's top edge.
//   const pill = ns.vrOrbitersUI.createPill(item);   item: { id, label, icon }
//   pill.draw({ open, hover, pressed }); pill.hitTest(u, v) -> { id } | null; pill.solidAt(u, v);
//   pill.moving(); pill.buttonHeight and pill.inset (px: the button's height, and the clear
//   margin around it in the canvas, room for the ring)
//
// The search bar: a text field with its button (grid.js), standing above the Safe Zone (glass,
// turning solid while its panel is open, as the side toolbars do), and
// the suggestions dropping from it while you type. The rest of its canvas is see-through.
//   const sb = ns.vrOrbitersUI.createSearchBar();
//   sb.draw(bar, { hover, pressed }, open, now)   bar: grid.js's field model (text, placeholder, focused,
//     button, clearable, suggestions); ids 'field:<id>', 'clear:<id>', 'submit:<id>', 'suggest:<i>'
//   sb.hitTest(u, v), sb.solidAt(u, v), sb.moving(); sb.fieldCentre (canvas px), sb.fieldHeight
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, S = ns.vrSymbols;      // design tokens (tokens.js), icons
  const { roundRect, hoverRing } = ns.vrKit;
  const EXPAND_MS = 220;                                    // how long a name takes to grow / shrink
  const MAX_STEP_MS = 50;                                   // the most time one redraw advances it
  const labelText = it => (typeof it.label === 'function' ? it.label() : it.label);
  const smooth = v => v * v * (3 - 2 * v);                  // ease in-out (smoothstep)

  // A colour between two '#rrggbb' colours (t 0..1) -> 'rgb(...)'.
  function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
  }

  function createToolbar(items, grows) {
    const BAR_W = 104, PAD = 8, GAP = 6, ITEM = BAR_W - PAD * 2;   // the bar's width; an item is ITEM px square
    const ICON = 40, LABEL_GAP = 14, END = 30;                       // a grown pill: icon, gap, room after the name
    const ROOM = 300, MARGIN = 10;                                   // the most a name can grow; room for the ring
    const BAR_H = PAD * 2 + items.length * ITEM + (items.length - 1) * GAP;
    const TW = MARGIN * 2 + BAR_W + ROOM, TH = MARGIN * 2 + BAR_H;
    const left = grows === 'left';
    const barX = left ? TW - MARGIN - BAR_W : MARGIN, barY = MARGIN;
    const canvas = document.createElement('canvas');
    canvas.width = TW; canvas.height = TH;
    const g = canvas.getContext('2d');
    // Per item, each 0..1, stepped linearly and eased when drawn: `grow`, how far its name is
    // out (towards 1 while pointed at); `sel`, how selected it is (its panel open), so a new
    // selection fades in.
    const grow = new Map(items.map(it => [it.id, 0])), growGoal = new Map(grow);
    const sel = new Map(items.map(it => [it.id, 0])), selGoal = new Map(sel);
    let lastNow = null, bodies = [];

    function draw(state) {
      const open = state.open || {}, now = state.now == null ? 0 : state.now;
      // Time counts only while something was already moving (the last redraw can be long
      // ago), at most MAX_STEP_MS a redraw; the first draw starts as things are.
      const first = lastNow == null;
      const dt = moving() && !first ? Math.min(MAX_STEP_MS, Math.max(0, now - lastNow)) : 0;
      lastNow = now;
      const step = (cur, to) => (cur < to ? Math.min(to, cur + dt / EXPAND_MS) : Math.max(to, cur - dt / EXPAND_MS));
      for (const it of items) {
        growGoal.set(it.id, state.hover === it.id ? 1 : 0);
        selGoal.set(it.id, open[it.id] ? 1 : 0);
        grow.set(it.id, step(grow.get(it.id), growGoal.get(it.id)));
        sel.set(it.id, first ? selGoal.get(it.id) : step(sel.get(it.id), selGoal.get(it.id)));
      }

      g.clearRect(0, 0, TW, TH);
      // The bar: the panels' glass tint while its side has no panel open; solid while one is
      // (it stands over that panel's edge, which mustn't show through), fading as it opens / closes.
      // (the sum, so switching panels on that side, one fading out as the other fades in, stays solid)
      const solid = Math.min(1, items.reduce((a, it) => a + sel.get(it.id), 0));
      g.fillStyle = T.panelFill();
      roundRect(g, barX, barY, BAR_W, BAR_H, BAR_W / 2); g.fill();
      if (solid > 0.01) {
        g.globalAlpha = solid; g.fillStyle = P.surfaceContainerHigh;
        roundRect(g, barX, barY, BAR_W, BAR_H, BAR_W / 2); g.fill(); g.globalAlpha = 1;
      }
      g.font = T.font('labelLarge', 26);
      bodies = items.map((it, i) => {
        const label = labelText(it), e = 1 - Math.pow(1 - grow.get(it.id), 3), s = smooth(sel.get(it.id));
        const room = Math.min(ROOM, LABEL_GAP + g.measureText(label).width + END) * e;
        const y = barY + PAD + i * (ITEM + GAP), x = barX + PAD;
        // The item's body: its square in the bar, grown outward by `room`.
        return { id: it.id, label, icon: it.icon, e, s, y, x: left ? x - room : x, w: ITEM + room, iconX: x + ITEM / 2 };
      });
      // Grown pills last, so they cover their neighbours' squares.
      for (const b of [...bodies].sort((a, c) => a.e - c.e)) {
        const hot = state.hover === b.id, down = state.pressed === b.id;
        const rad = down ? Math.min(T.shape.large, ITEM / 2) : ITEM / 2;
        // Pointed at: the tonal colour; open: the selected colour on top, as far as it's
        // selected; a grown pill that's neither still needs a background over the panel.
        if (hot || b.e > 0.01) { g.fillStyle = P.secondaryContainer; roundRect(g, b.x, b.y, b.w, ITEM, rad); g.fill(); }
        if (b.s > 0) { g.fillStyle = P.primary; g.globalAlpha = b.s; roundRect(g, b.x, b.y, b.w, ITEM, rad); g.fill(); g.globalAlpha = 1; }
        const fg = mix(hot || b.e > 0.01 ? P.onSecondaryContainer : P.onSurfaceVariant, P.onPrimary, b.s);
        if (down) { g.fillStyle = fg; g.globalAlpha = 0.12; roundRect(g, b.x, b.y, b.w, ITEM, rad); g.fill(); g.globalAlpha = 1; }
        g.fillStyle = fg;
        if (b.icon) S.draw(g, b.icon, b.iconX, b.y + ITEM / 2, ICON, b.s > 0.5);
        // The name fades in beside the icon, on the side it grows towards.
        const textA = Math.max(0, Math.min(1, (b.e - 0.4) / 0.6));
        if (textA > 0) {
          g.save(); g.beginPath(); g.rect(b.x, b.y, b.w, ITEM); g.clip();
          g.globalAlpha = textA; g.textBaseline = 'middle'; g.textAlign = left ? 'right' : 'left';
          g.fillText(b.label, left ? b.iconX - ICON / 2 - LABEL_GAP : b.iconX + ICON / 2 + LABEL_GAP, b.y + ITEM / 2 + 1);
          g.restore();
        }
        hoverRing(g, b.x, b.y, b.w, ITEM, rad, hot ? 1 : 0);
      }
    }

    // Which item is at (u, v) (0..1 from the top-left), as last drawn? Anywhere on the bar
    // counts (the nearest item, so the laser doesn't leave the toolbar between items), and
    // so does a grown pill. -> { id } or null.
    function hitTest(u, v) {
      const px = u * TW, py = v * TH;
      for (const b of bodies) if (b.e > 0.3 && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + ITEM) return { id: b.id };
      if (!bodies.length || px < barX || px > barX + BAR_W || py < barY || py > barY + BAR_H) return null;
      let best = null, bestD = Infinity;
      for (const b of bodies) { const d = Math.abs(py - (b.y + ITEM / 2)); if (d < bestD) { bestD = d; best = b; } }
      return { id: best.id };
    }
    // Is anything drawn at (u, v)? (The rest of the canvas lets the laser through.)
    const solidAt = (u, v) => !!hitTest(u, v);
    // Still animating? (A name growing or shrinking, or a selection fading.)
    const moving = () => items.some(it => grow.get(it.id) !== growGoal.get(it.id) || sel.get(it.id) !== selGoal.get(it.id));
    return { canvas, aspect: TH / TW, draw, hitTest, solidAt, moving, barCentre: { x: barX + BAR_W / 2, y: barY + BAR_H / 2 }, barWidth: BAR_W };
  }

  function createPill(item) {
    const H = 72, MARGIN = 10;
    const m = document.createElement('canvas').getContext('2d');
    m.font = T.font('labelLarge', 22);
    const W = Math.round(Math.min(320, Math.max(200, 32 + 28 + 8 + m.measureText(labelText(item)).width + 32)));
    const canvas = document.createElement('canvas');
    canvas.width = W + MARGIN * 2; canvas.height = H + MARGIN * 2;
    const g = canvas.getContext('2d');
    const motion = ns.vrMotion.create();                    // hover / press easing (motion.js)
    let region = null;

    function draw(state) {
      const ui = motion.step({ hover: state.hover === item.id ? item.id : null, pressed: state.pressed === item.id ? item.id : null });
      g.clearRect(0, 0, canvas.width, canvas.height);
      const regions = [];
      ns.vrKit.button(g, regions, item.id, MARGIN, MARGIN, W, H, { icon: item.icon, label: labelText(item), kind: state.open ? 'filled' : 'tonal' }, ui);
      region = regions[0] || null;
    }
    function hitTest(u, v) {
      const px = u * canvas.width, py = v * canvas.height, r = region;
      return r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h ? { id: item.id } : null;
    }
    return { canvas, aspect: canvas.height / canvas.width, draw, hitTest, solidAt: (u, v) => !!hitTest(u, v), moving: motion.moving,
      buttonHeight: H,
      inset: MARGIN };
  }

  function createSearchBar() {
    const W = 1000, FIELD_H = 64, TOP = 12, MENU_GAP = 8;   // the field (with its button) at the top
    const H = TOP + FIELD_H + MENU_GAP + 8 * 54 + 12 + 24;   // room for the suggestions under it
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const grid = ns.vrStyleGrid.createGrid(g, null, W, H, 0);
    const motion = ns.vrMotion.create();                    // hover / press easing (motion.js)
    const PAD = 12;
    let regions = [];

    // How solid the field is (0..1, linear, eased when drawn): heading to 1 while its panel
    // (the results) is open, 0 while not: glass like a side toolbar whose side has no panel
    // open, solid once there is one.
    let solid = null, solidGoal = 0, lastNow = null;

    // bar: the field (grid.js field: { id, text, placeholder, focused, button, clearable,
    // suggestions }); ui: { hover, pressed } (its own ids); open: its panel is open; now (ms).
    function draw(bar, ui, open, now = 0) {
      ui = motion.step(ui);
      solidGoal = open ? 1 : 0;
      const dt = solid != null && lastNow != null ? Math.min(50, Math.max(0, now - lastNow)) : 0;
      lastNow = now;
      if (solid == null) solid = solidGoal;                  // the first draw starts as things are
      else solid = solid < solidGoal ? Math.min(solidGoal, solid + dt / EXPAND_MS) : Math.max(solidGoal, solid - dt / EXPAND_MS);
      regions = [];
      g.clearRect(0, 0, W, H);
      grid.field({ ...bar, solid: smooth(solid) }, ui, regions, PAD, TOP, W - PAD * 2, FIELD_H);
      if (bar.focused) grid.suggestions(bar, ui, regions, PAD, TOP + FIELD_H + MENU_GAP, W - PAD * 2 - 150 - 12);
    }
    function hitTest(u, v) {
      const px = u * W, py = v * H;
      const r = regions.find(q => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h);
      return r ? { id: r.id } : null;
    }
    return { canvas, aspect: H / W, draw, hitTest, solidAt: (u, v) => !!hitTest(u, v), moving: () => motion.moving() || solid !== solidGoal,
      fieldCentre: { x: W / 2, y: TOP + FIELD_H / 2 }, fieldHeight: FIELD_H };
  }

  ns.vrOrbitersUI = { createToolbar, createPill, createSearchBar };
})(globalThis.__streamxr = globalThis.__streamxr || {});
