// The controls panel's look and layout, drawn with canvas 2D in Material 3 Expressive
// (docs/Materials-Redesign.md, step 3.1). Knows nothing about WebXR or the site (the
// provider describes what's playing): draw(state) paints the canvas and remembers where
// each control ended up; hitTest(u, v) says which control is at a point (using the last
// drawn layout).
//
// Colours come from the M3 palette (tokens.js m3): buttons are tonal (secondaryContainer),
// the site's signature accents (seek bar, play / pause, the primary action, Like when on,
// LIVE) use its exact brand colour (m3.brand), a selected choice is `primary`, and whatever
// a laser points at gets a white ring (m3.hoverRing) and squarer corners while pressed.
// Icons are Material Symbols (symbols.js).
//
// state: { title, time, duration, paused, hover, pressed, scrubTime, grabbing,
//          buffered (seconds: how far the video is loaded ahead, shown on the seek bar; or null),
//          now (ms; a long title scrolls with it),
//          nowPlaying: { info: [{ text, color }] (the line under the title, pieces in a row;
//                                color: an M3 role name, e.g. 'onSurfaceVariant'),
//                        creator: { name, badge, stats } (a button: id 'creator'),
//                        actions: [{ id, kind: 'pill' | 'icon', width, hidden (keeps its
//                                    place, not drawn), pill: look ('primary' | 'secondary' |
//                                    'danger' | 'busy') + label; icon: icon ('thumbUp' |
//                                    'thumbDown'), on, count }] (right-aligned on the creator
//                                    row, ids 'action:<id>'; neighbouring icon buttons are
//                                    drawn as one connected group),
//                        queue: null | { hasPrev, hasNext } (in a list: Previous / Next at
//                                    the seek bar's ends, ids pl:prev / pl:next) },
//          quality: { current, currentLabel, levels, icons (optional: Material Symbols names
//                     shown on its button instead of icon + name: one, or two stacked; each
//                     level can have its own, shown in the Quality menu: popups-ui.js) },
//          format: { id, label }, speed,
//          volume: { level, muted }, chapters: [{ title, start }],
//          heatmap: [{ start, duration, intensity (0..1) }] (how much each part is rewatched:
//                   a graph over the seek bar while it's pointed at or dragged),
//          preview: null | { time, frame: null | { url, col, row, tileWidth, tileHeight } },
//          live: null | { atHead, behind, dvr } (a live stream: time / duration cover the
//                rewindable part; the time is replaced by the LIVE label, id 'live', and
//                without dvr the seek bar can't be used),
//          ad: null | { position, duration, remaining, pod, skippable, skipIn, canSkipInVR }
//              (while an ad plays: ad progress instead of the seek bar, plus Skip ad - or
//              "Skip on desktop" without the Skip Helper extension),
//          extras: { left: [...], right: [...] } (the site's own buttons, at the inner ends
//                  of the outer parts of the button row: { id, icon, label (under the
//                  icon), on (icon filled), disabled, icons (optional: one or two icons, e.g.
//                  { name, color } ones, stacked in place of icon + label, like Quality's) },
//                  and seek: null | { id, label, icon, mark (an icon spec on its left, e.g.
//                  a coloured one), disabled } (one button at the seek bar's right end, where
//                  Skip ad goes during ads; the bar shortens for it); ids 'x:<id>'),
//          menuOpen: null | 'quality' | 'speed' | 'format' | 'volume' | 'x:<id>' (that button
//                    is shown selected: its menu floats in front of the panel, popups-ui.js) }
//   hover/pressed: a control id or null. Fixed ids: seek, exit, quality, speed, back10,
//   play, fwd10, volume, format, recenter, grab, creator, action:<id>, x:<id>, skipad, live (the
//   LIVE label, when behind), title (the video title).
//   preview: the seek-bar thumbnail (storyboard tile) shown while pointing at the bar.
(function (ns) {
  'use strict';

  const T = ns.vrTokens, P = T.m3, PA = T.m3Alpha, S = ns.vrSymbols;   // design tokens, icons
  const TC = T.color;                                // (today's colours: the ad colour)
  const F = role => T.font(role);

  // The panel is one 1216-pixel-wide canvas, laid out in fixed pixel positions (the world
  // size follows the panels' pixel density: vr-panel.js). From the top: title row, info line, creator
  // row (with the action buttons on its right), seek bar, button row, then the grab bar
  // below the body.
  const W = 1216, H = 422;            // panel body is 0..374; the grab bar sits below it
  const BODY_H = 374;
  const ROW_Y = 250;                  // top of the button row
  const ACTIONS = { y: 74, h: 58, gap: 12, joined: 3 };   // right to left; `joined`: inside a connected group

  // Fixed controls (pixel rectangles). The seek hit area is taller than the bar looks.
  const FIXED = {
    seek:   { x: 48,  y: 150, w: W - 96, h: 64 },
    grab:   { x: W / 2 - 160, y: 380, w: 320, h: 42 },
    skipad: { x: W - 268, y: 152, w: 220, h: 60 },   // during ads, at the end of the ad progress bar
  };
  // The button row: one M3E button group, in three parts ([Exit, Quality, Speed, the site's
  // left extras] [-10 s, play / pause, +10 s] [the site's right extras, Volume, Format,
  // Recenter]), centred (room for one extra a side at full width; with more, the buttons
  // narrow to stay inside ROW_MARGIN). Buttons are BTN.w x BTN.h, play / pause is bigger;
  // GAP between buttons, SEP between the parts.
  const BTN = { w: 88, h: 88, y: ROW_Y + 2 }, PLAY = { w: 132, h: 104, y: ROW_Y - 6 }, GAP = 8, SEP = 20;
  const ROW_MARGIN = 48;              // the button row keeps this far from the panel's sides
  // In a playlist: Previous / Next video buttons at the two ends of the seek row, and the
  // seek bar shortened between them.
  const PLAYLIST = {
    prev: { x: 48,  y: 154, w: 60, h: 56 },
    next: { x: W - 108, y: 154, w: 60, h: 56 },
    seek: { x: 124, y: 150, w: W - 248, h: 64 },
  };
  const TRACK = 16, TRACK_HOT = 20;   // slider track thickness (px), resting / pointed at
  const HANDLE_GAP = 6;               // gap between a slider's handle bar and its tracks
  const BUFFER_FADE = 0.4;            // the seek bar's not-yet-loaded part: this much of the track's opacity

  const bodyFill = () => T.panelFill();                 // the glass tint, or solid (tokens.js)
  const PREVIEW_W = 224;             // seek-bar thumbnail size on the canvas (16:9)
  const speedName = r => `${+(+r).toFixed(2)}×`;   // 1.5 -> "1.5×", 1 -> "1×"
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)

  // Which icon a format gets on the Format button.
  const FORMAT_ICONS = { flat: '2d_2', flatsbs: '3d_2', '360mono': '360', '360eac': 'view_in_ar', '180mono': 'panorama_photosphere', '180sbs': '3d_rotation' };
  // The speaker for a volume (0-100) / muted.
  const volumeIcon = v => (v.muted ? 'volume_off' : v.level <= 0 ? 'volume_mute' : v.level < 50 ? 'volume_down' : 'volume_up');

  // Seconds -> "m:ss" (or "h:mm:ss" from one hour up). Bad or negative input shows as 0:00.
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    const s = Math.floor(t % 60), m = Math.floor(t / 60) % 60, h = Math.floor(t / 3600);
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  }

  // Rounded-rectangle path (the caller fills, strokes or clips it); r: one radius or
  // [top-left, top-right, bottom-right, bottom-left].
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

  // onImageLoaded(): called when a storyboard sheet finishes loading (so the caller redraws).
  // Returns { canvas, aspect, width, height, draw(state), hitTest(u, v), rectOf(id),
  // seekFraction(u),
  // previewReady(url), titleMoving() (the title is scrolling: redraw every frame), animating()
  // (a hover / press is still easing: redraw every
  // frame) }.
  function createPanelUI(onImageLoaded) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    let regions = [];                                        // [{ id, x, y, w, h }] from the last draw

    // A title too long for its space scrolls: how far (px) at time `now` (ms). It stays still
    // for TITLE.holdMs, slides to its end at TITLE.speed px/s, rests TITLE.endMs, then jumps
    // back and repeats; the cycle restarts whenever the title changes. titleMoving: whether
    // the last drawn title scrolls (so the caller keeps redrawing).
    const TITLE = { holdMs: 2000, endMs: 1500, speed: 60 };
    const titleCanvas = document.createElement('canvas');   // the title is drawn here, then copied
    let titleSeen = '', titleSince = 0, titleMoving = false;
    function titleOffset(title, overflow, now) {
      now = now != null ? now : performance.now();
      if (title !== titleSeen) { titleSeen = title; titleSince = now; }
      titleMoving = overflow > 0;
      if (overflow <= 0) return 0;
      const slide = overflow / TITLE.speed * 1000, cycle = TITLE.holdMs + slide + TITLE.endMs;
      const t = (now - titleSince) % cycle;
      return t < TITLE.holdMs ? 0 : Math.min(overflow, (t - TITLE.holdMs) / 1000 * TITLE.speed);
    }

    // Storyboard sheets (i.ytimg.com, CORS-enabled so the canvas stays usable in WebGL).
    // Get a sheet's image, starting its download the first time it's asked for (the caller
    // checks .ok; the image appears on a later redraw). The cache is kept small.
    const sheets = new Map();                                // url -> { img, ok }
    function sheet(url) {
      let s = sheets.get(url);
      if (!s) {
        s = { img: new Image(), ok: false };
        s.img.crossOrigin = 'anonymous';
        s.img.onload = () => { s.ok = true; if (onImageLoaded) onImageLoaded(); };
        s.img.src = url;
        sheets.set(url, s);
        if (sheets.size > 12) sheets.delete(sheets.keys().next().value);
      }
      return s;
    }
    const previewReady = url => { const s = url && sheets.get(url); return !!(s && s.ok); };

    // The colours of a button kind: [container, content].
    const LOOKS = {
      tonal: () => [P.secondaryContainer, P.onSecondaryContainer],
      brand: () => [P.brand, P.onBrand],                 // the site's signature accent
      selected: () => [P.primary, P.onPrimary],          // a button whose menu is open
      inverse: () => [P.inverseSurface, P.inverseOnSurface],
      danger: () => [P.errorContainer, P.onErrorContainer],   // a site's action that warns (stands out from the tonal pink)
      text: () => [null, P.onSurface],                   // no container (the title, the creator)
      disabled: () => [PA('onSurface', 0.12), PA('onSurface', 0.38)],
    };

    // The pointed-at ring: a white outline just outside rectangle r (corner radius `radius`),
    // faded in by `amount` (0..1, motion.js; nothing at 0). During a draw the rings are
    // collected and stroked after everything else (drawRings), so a neighbour drawn later
    // (Dislike right beside Like) can't paint over part of one.
    let rings = null;                                      // the rings waiting for this draw
    function hoverRing(r, radius, amount = 1) {
      if (amount < 0.01) return;
      if (rings) { rings.push([r, radius, amount * g.globalAlpha, g.getTransform()]); return; }   // with the fade and shift it was drawn in
      const pad = 5;
      g.globalAlpha = Math.min(1, amount);
      g.strokeStyle = P.hoverRing; g.lineWidth = 3;
      roundRect(g, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, Array.isArray(radius) ? radius.map(x => x + pad) : radius + pad);
      g.stroke();
      g.globalAlpha = 1;
    }
    // Stroke the rings collected during this draw, on top of the buttons.
    function drawRings() {
      const list = rings || [];
      rings = null;
      for (const [r, radius, amount, tf] of list) { g.save(); g.setTransform(tf); hoverRing(r, radius, amount); g.restore(); }
    }

    // A pressable button (M3E): registers rectangle `r` as clickable (id; not when
    // disabled), paints its container in `kind`'s colours (fully round by default; its
    // corners square up while pressed, with a state layer), a white ring while pointed at,
    // then calls drawContent() with the origin at the button's centre and the content
    // colour as fill and stroke. opts: { kind, radius (number or 4 corners), disabled }.
    function button(r, id, state, drawContent, opts = {}) {
      const disabled = !!opts.disabled, kind = disabled ? 'disabled' : opts.kind || 'tonal';
      if (!disabled) regions.push({ id, ...r });
      // Pointed at / pressed, eased (motion.js): the corners morph towards shape.large as
      // it's pressed (a little past and back, with the spring's bounce).
      const { h: hv, p: pv } = disabled ? { h: 0, p: 0 } : ns.vrMotion.of(state, id);
      const rest = opts.radius != null ? opts.radius : Math.min(r.w, r.h) / 2;
      const morph = x => Math.max(2, ns.vrMotion.lerp(x, Math.min(x, T.shape.large), pv));
      const radius = Array.isArray(rest) ? rest.map(morph) : morph(rest);
      const [bg, fg] = LOOKS[kind]();
      if (bg) { g.fillStyle = bg; roundRect(g, r.x, r.y, r.w, r.h, radius); g.fill(); }
      if (pv > 0.01) { g.fillStyle = hexA(fg, 0.12 * Math.min(1, pv)); roundRect(g, r.x, r.y, r.w, r.h, radius); g.fill(); }   // M3 pressed state layer
      hoverRing(r, radius, hv);
      g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2);
      g.fillStyle = fg; g.strokeStyle = fg;
      labelRoom = r.w - 8;
      drawContent(fg);
      labelRoom = Infinity;
      g.restore();
    }
    // '#rrggbb' at opacity a.
    const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

    // Centred text at (0, y), for use inside a button's drawContent (origin = button centre).
    // Text wider than the button (a longer word in another language) is drawn smaller to
    // fit, down to 60% of the role's size.
    let labelRoom = Infinity;             // the current button's width for text, in px
    function label(text, role = 'labelLarge', y = 1) {
      const px = parseFloat(T.type[role].split(' ')[1]);
      g.font = F(role); g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = g.measureText(text).width;
      if (w > labelRoom) g.font = T.font(role, Math.max(px * 0.6, px * labelRoom / w));
      g.fillText(text, 0, y);
    }
    // An icon over a small label (the button row's buttons), or the icon alone, centred.
    // One icon big, or two stacked (the first smaller and higher, e.g. 4K over 60 fps).
    function iconStack(icons) {
      if (icons.length < 2) { S.drawIcon(g, icons[0], 0, 0, 48, false); return; }
      S.drawIcon(g, icons[0], 0, -14, 38, false); S.drawIcon(g, icons[1], 0, 20, 30, false);
    }
    function iconLabel(icon, text, filled = false) {
      if (text) { S.draw(g, icon, 0, -13, 36, filled); label(text, 'labelMedium', 23); }
      else S.draw(g, icon, 0, 0, 44, filled);
    }

    // Under the title (state.nowPlaying): the info line, the creator (name + badge, a button:
    // id 'creator', then its stats) and the action buttons on the right of the creator row.
    // The actions are laid out right to left from the right margin; a hidden one keeps its
    // place (so the others don't move when it comes and goes), and the text on the left
    // stops short of the leftmost. Neighbouring icon buttons (Like / Dislike) form one
    // connected group: a small gap, and only the group's outer corners fully round.
    function drawNowPlaying(state) {
      const np = state.nowPlaying || {};
      const acts = np.actions || [];
      const placed = [];
      let rx = W - 48;
      for (let i = acts.length - 1; i >= 0; i--) {
        const a = acts[i];
        rx -= a.width;
        placed.unshift({ a, r: { x: rx, y: ACTIONS.y, w: a.width, h: ACTIONS.h } });
        const joined = a.kind === 'icon' && acts[i - 1] && acts[i - 1].kind === 'icon';
        rx -= joined ? ACTIONS.joined : ACTIONS.gap;
      }
      const left = 48, maxW = (placed.length ? placed[0].r.x : W - 48) - left - 20;
      const clip = (text, w) => {
        let t = text || '';
        if (g.measureText(t).width > w) {
          while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1);
          t += '…';
        }
        return t;
      };
      g.textAlign = 'left'; g.textBaseline = 'middle';
      // Line 1: the info pieces in a row (a piece after the first only when there's room).
      g.font = F('bodyMedium');
      let sx = left;
      (np.info || []).forEach((p, i) => {
        if (!p.text || (i > 0 && sx >= left + maxW - 80)) return;
        const t = clip(p.text, left + maxW - sx);
        g.fillStyle = P[p.color] || P.onSurfaceVariant; g.fillText(t, sx, 82); sx += g.measureText(t).width;
      });
      // Line 2: creator  [badge]  stats
      const CY = 116, c = np.creator || {};
      let x = left;
      if (c.name) {
        g.font = F('titleMedium');
        const name = clip(c.name, maxW * 0.6);
        const nw = g.measureText(name).width;
        const r = { x: x - 10, y: CY - 21, w: nw + (c.badge ? 38 : 8) + 20, h: 42 };
        button(r, 'creator', state, () => {}, { kind: 'text', radius: T.shape.medium });
        g.font = F('titleMedium'); g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillStyle = P.onSurface; g.fillText(name, x, CY); x += nw + 8;
        if (c.badge) { g.fillStyle = P.onSurfaceVariant; ns.vrKit.drawBadge(g, c.badge, x + 11, ns.vrGlyphs.textMiddle(g, CY), 20); x += 30; }
        x += 10;
      }
      if (c.stats) {
        g.font = F('bodyMedium'); g.fillStyle = P.onSurfaceVariant; g.textAlign = 'left';
        g.fillText(clip(c.stats, Math.max(40, left + maxW - x - 6)), x + 6, CY + 1);
      }
      // The actions: a pill (text, coloured by its look; 'busy' isn't clickable) or an icon
      // button (thumbs up / down, filled when on, with an optional count).
      const PILL_KINDS = { primary: 'brand', secondary: 'tonal', danger: 'danger', busy: 'disabled' };
      placed.forEach(({ a, r }, i) => {
        if (a.hidden) return;
        const id = `action:${a.id}`;
        if (a.kind === 'pill') {
          button(r, id, state, () => label(a.label, 'labelLarge', 1),
            { kind: PILL_KINDS[a.look] || 'brand', disabled: a.look === 'busy' });
          return;
        }
        // Inside a connected group, the inner corners are small.
        const h2 = r.h / 2, inner = T.shape.small;
        const prevJoined = placed[i - 1] && placed[i - 1].a.kind === 'icon';
        const nextJoined = placed[i + 1] && placed[i + 1].a.kind === 'icon';
        const radius = [prevJoined ? inner : h2, nextJoined ? inner : h2, nextJoined ? inner : h2, prevJoined ? inner : h2];
        const down = a.icon === 'thumbDown';
        button(r, id, state, () => {
          S.draw(g, down ? 'thumb_down' : 'thumb_up', a.count ? -28 : 0, 0, 30, !!a.on);
          if (a.count) { g.font = F('labelLarge'); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(a.count, -6, 1); }
        }, { kind: a.on && !down ? 'brand' : a.on ? 'selected' : 'tonal', radius });
      });
    }

    // The button row (see BTN): each shows its icon and, under it, its current value.
    function drawTransport(state) {
      const v = state.volume || { level: 100, muted: false };
      // The site's own buttons (state.extras): [id, icon, label, extra].
      const extras = side => ((state.extras && state.extras[side]) || []).map(x => [`x:${x.id}`, x.icon, x.label || '', x]);
      const items = [
        ['exit', 'exit_to_app', tr('panel.exit')],
        ['quality', 'high_quality', (state.quality && state.quality.currentLabel) || tr('panel.auto')],
        ['speed', 'speed', speedName(state.speed || 1)], ...extras('left'), null,
        ['back10', 'replay_10', ''], ['play', state.paused ? 'play_arrow' : 'pause', ''], ['fwd10', 'forward_10', ''], null,
        ...extras('right'),
        ['volume', volumeIcon(v), v.muted ? tr('panel.muted') : `${Math.round(v.level)}%`],
        ['format', formatIcon(state.format && state.format.id), tr('panel.format')],   // (the icon tells the formats apart)
        ['recenter', 'recenter', tr('panel.recenter')],
      ];
      // Buttons narrow (from BTN.w) when a site's extra buttons would push the row past the
      // panel's side margins; heights stay.
      const n = items.filter(it => it && it[0] !== 'play').length, seps = items.filter(it => !it).length;
      const gaps = (items.length - seps - 1) * GAP + seps * (SEP - GAP);
      const bw = Math.min(BTN.w, Math.floor((W - ROW_MARGIN * 2 - PLAY.w - gaps) / Math.max(1, n)));
      const width = it => (it[0] === 'play' ? PLAY.w : bw);
      const total = items.reduce((s, it) => s + (it ? width(it) + GAP : SEP - GAP), -GAP);
      let x = (W - total) / 2;
      for (const it of items) {
        if (!it) { x += SEP - GAP; continue; }
        const [id, icon, text, extra] = it;
        if (id === 'play') {
          button({ x, y: PLAY.y, w: PLAY.w, h: PLAY.h }, id, state, () => S.draw(g, icon, 0, 0, 56, true),
            { kind: 'brand', radius: T.shape.extraLargeIncreased });
        } else {
          // the button whose menu is open shows selected (its menu floats in front: popups-ui.js);
          // an extra that's `on` (e.g. captions showing) has its icon filled
          // the quality as icons (its full name is in its menu), or a site button's own icons
          const qi = id === 'quality' ? state.quality && state.quality.icons : extra && extra.icons;
          button({ x, y: BTN.y, w: bw, h: BTN.h }, id, state, () => (qi && qi.length ? iconStack(qi) : iconLabel(icon, text, !!(extra && extra.on))),
            { kind: state.menuOpen === id ? 'selected' : 'tonal', disabled: !!(extra && extra.disabled) });
        }
        x += width(it) + GAP;
      }
    }

    // An M3E slider along y from x to x + w at fraction f: the active track up to a bar-shaped
    // handle (`active` colour), a gap, then the inactive track (secondaryContainer); thicker
    // while `hot`. cuts: x positions where the track has a small gap (chapters). buf (0..1,
    // optional): how far the video is loaded; the inactive track up to there is solid, past it
    // faded (BUFFER_FADE).
    function drawSlider(x, w, y, f, hot, active, cuts, buf = 1) {
      const th = hot ? TRACK_HOT : TRACK, hx = x + w * f;
      const seg = (a, b, colour, outer) => {
        const pts = [a, ...cuts.filter(c => c > a + 2 && c < b - 2), b];
        for (let i = 0; i < pts.length - 1; i++) {
          const x0 = pts[i] + (i ? 2 : 0), x1 = pts[i + 1] - (i < pts.length - 2 ? 2 : 0);
          if (x1 - x0 < 1) continue;
          const first = i === 0, last = i === pts.length - 2;
          const rL = outer === 'left' && first ? th / 2 : 3, rR = outer === 'right' && last ? th / 2 : 3;
          g.fillStyle = colour; roundRect(g, x0, y - th / 2, x1 - x0, th, [rL, rR, rR, rL]); g.fill();
        }
      };
      if (hx - HANDLE_GAP > x) seg(x, hx - HANDLE_GAP, active, 'left');
      if (hx + HANDLE_GAP < x + w) {
        // Loaded and not yet loaded: the same track, faded past the loaded part (clipped, so
        // the chapter gaps and rounded ends stay as they are).
        const bx = Math.max(hx + HANDLE_GAP, Math.min(x + w, x + w * buf)), pad = TRACK_HOT;
        g.save(); g.beginPath(); g.rect(x - pad, y - pad, bx - x + pad, pad * 2); g.clip();
        seg(hx + HANDLE_GAP, x + w, P.secondaryContainer, 'right');
        g.restore();
        if (bx < x + w) {
          g.save(); g.beginPath(); g.rect(bx, y - pad, x + w - bx + pad, pad * 2); g.clip();
          g.globalAlpha *= BUFFER_FADE; seg(hx + HANDLE_GAP, x + w, P.secondaryContainer, 'right');
          g.restore();
        }
      }
      const hh = hot ? 52 : 44;
      g.fillStyle = active; roundRect(g, hx - 2, y - hh / 2, 4, hh, 2); g.fill();
    }

    // Where the seek bar is in the last drawing (shorter in a playlist; see PLAYLIST).
    let seekRect = FIXED.seek;

    // Previous / Next buttons in a list (queue: { hasPrev, hasNext }; disabled at the ends).
    function drawPlaylistButtons(queue, state) {
      for (const [key, enabled, icon] of [['prev', !!queue.hasPrev, 'skip_previous'], ['next', !!queue.hasNext, 'skip_next']]) {
        button(PLAYLIST[key], `pl:${key}`, state, () => S.draw(g, icon, 0, 0, 32, true),
          { disabled: !enabled, radius: T.shape.largeIncreased });
      }
    }

    // Paint the whole panel for `state` (see the description at the top of this file) and
    // remember where each control ended up, for hitTest. Called only when something changed.
    const motion = ns.vrMotion.create();                  // hover / press easing (motion.js)
    function draw(state) {
      state = motion.step(state);
      rings = [];                                          // collect the rings (drawn last: drawRings)
      regions = [];
      const queue = state.nowPlaying && state.nowPlaying.queue;
      seekRect = queue && !state.ad ? PLAYLIST.seek : FIXED.seek;
      // The site's seek-row button (state.extras.seek, e.g. Jump ahead), where Skip ad goes
      // during ads: at the seek bar's right end (before a playlist's next button), the bar
      // shortened to make room.
      const sa = !state.ad && state.extras && state.extras.seek;
      let saRect = null;
      if (sa) {
        const right = queue ? PLAYLIST.next.x - 16 : seekRect.x + seekRect.w;
        saRect = { x: right - FIXED.skipad.w, y: FIXED.skipad.y, w: FIXED.skipad.w, h: FIXED.skipad.h };
        seekRect = { ...seekRect, w: saRect.x - 24 - seekRect.x };
      }
      g.clearRect(0, 0, W, H);
      g.fillStyle = bodyFill();
      roundRect(g, 0, 0, W, BODY_H, T.shape.extraLarge); g.fill();

      // Title and time (a live stream: the LIVE label; during an ad: "Ad 1 of 2 · 0:12").
      const ad = state.ad;
      const shown = state.scrubTime != null ? state.scrubTime : state.time;
      g.textBaseline = 'middle';
      let timeW;
      if (state.live && !ad) timeW = drawLiveLabel(state, shown);
      else {
        const timeText = ad ? `${tr('panel.ad')}${ad.pod ? ` ${ad.pod}` : ''} · ${fmt(Math.ceil(ad.remaining))}` : `${fmt(shown)} / ${fmt(state.duration)}`;
        g.font = F('labelLargeProminent');
        g.fillStyle = ad ? TC.ad : P.onSurfaceVariant;
        g.textAlign = 'right'; g.fillText(timeText, W - 48, 44);
        timeW = g.measureText(timeText).width;
      }
      g.font = F('titleLargeEmphasized'); g.textBaseline = 'middle';
      const maxText = W - 96 - timeW - 40;
      // The title is a button (id 'title'): it opens the Description panel's Description tab.
      // One too long for its space scrolls (titleOffset), clipped, with faded edges.
      const title = state.title || '';
      if (title) {
        const textW = g.measureText(title).width, boxW = Math.min(textW, maxText);
        const off = titleOffset(title, textW - maxText, state.now);
        button({ x: 48 - 10, y: 44 - 24, w: boxW + 20, h: 48 }, 'title', state, () => {}, { kind: 'text', radius: T.shape.medium });
        // Drawn on its own small canvas, so the faded edges fade the text only (where more
        // continues: the right while there's more, the left once it has scrolled).
        const tc = titleCanvas, tg = tc.getContext('2d');
        tc.width = Math.ceil(boxW); tc.height = 48;
        tg.font = F('titleLargeEmphasized'); tg.textBaseline = 'middle'; tg.textAlign = 'left';
        tg.fillStyle = P.onSurface;
        tg.fillText(title, -off, 24);
        if (textW > maxText) {
          tg.globalCompositeOperation = 'destination-out';
          const fade = (x, solidAt) => {
            const grad = tg.createLinearGradient(x, 0, x + 36, 0);
            // (An alpha mask for 'destination-out', not a colour: only its opacity counts.)
            grad.addColorStop(solidAt, 'rgba(0,0,0,1)'); grad.addColorStop(1 - solidAt, 'rgba(0,0,0,0)');
            tg.fillStyle = grad; tg.fillRect(x, 0, 36, 48);
          };
          if (off < textW - maxText - 1) fade(tc.width - 36, 1);
          if (off > 1) fade(0, 0);
          tg.globalCompositeOperation = 'source-over';
        }
        g.drawImage(tc, 48, 44 - 24);
      }
      drawNowPlaying(state);

      if (ad) drawAdBar(state, ad);
      else {
        drawSeekBar(state, shown);
        if (queue) drawPlaylistButtons(queue, state);
        if (sa) drawSeekAction(sa, saRect, state);
      }

      drawTransport(state);                                // the button row

      // Grab bar under the panel: a small pill with a drag handle (the handle in the brand
      // colour while you're moving the panel).
      const gb = FIXED.grab, pill = { x: W / 2 - 120, y: gb.y + 6, w: 240, h: 30 };
      regions.push({ id: 'grab', ...gb });
      g.fillStyle = bodyFill(); roundRect(g, pill.x, pill.y, pill.w, pill.h, pill.h / 2); g.fill();
      if (state.hover === 'grab' && !state.grabbing) hoverRing(pill, pill.h / 2);
      g.fillStyle = state.grabbing ? P.brand : P.onSurfaceVariant;
      roundRect(g, W / 2 - 32, pill.y + pill.h / 2 - 2.5, 64, 5, 2.5); g.fill();

      drawRings();                                         // the pointed-at ring, over its neighbours
      if (state.preview && state.duration && !ad) drawPreview(state);
    }

    // During an ad: progress in the ad colour (not seekable) and, at its end, YouTube's skip
    // state: "Skip ad" once allowed, "Skip in 5" while counting down, nothing for unskippable ads.
    function drawAdBar(state, ad) {
      const s = FIXED.seek, barY = s.y + s.h / 2, k = FIXED.skipad;
      const showSkip = ad.skippable || ad.skipIn != null;
      const barW = (showSkip ? k.x - 24 : s.x + s.w) - s.x;
      const frac = ad.duration ? Math.min(1, Math.max(0, ad.position / ad.duration)) : 0;
      const px = s.x + barW * frac;
      g.fillStyle = TC.ad; roundRect(g, s.x, barY - TRACK / 2, Math.max(TRACK, px - s.x), TRACK, TRACK / 2); g.fill();
      if (px + HANDLE_GAP < s.x + barW) { g.fillStyle = PA('onSurface', 0.16); roundRect(g, px + HANDLE_GAP, barY - TRACK / 2, s.x + barW - px - HANDLE_GAP, TRACK, TRACK / 2); g.fill(); }
      if (ad.skippable && ad.canSkipInVR) {
        button(k, 'skipad', state, () => {
          const t = ns.vrKit.fitFont(g, tr('panel.skipAd'), k.w - 84, 26, '500 ');
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, -20, 1);
          S.draw(g, 'skip_next', k.w / 2 - 34, 0, 30, true);
        }, { kind: 'inverse' });
      } else if (ad.skippable || ad.skipIn != null) {
        const text = ad.skippable ? tr('panel.skipOnDesktop') : tr('panel.skipIn', { n: ad.skipIn });
        button(k, 'skipad-info', state, () => {
          const t = ns.vrKit.fitFont(g, text, k.w - 24, 22, '500 ');
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 1);
        }, { disabled: true });
      }
    }

    // The site's seek-row button (id 'x:<id>', like its other extras), shaped like Skip ad:
    // its mark (an icon, e.g. the Diamond in its own colour) on the left, the label, its icon
    // on the right. Greyed out when disabled.
    function drawSeekAction(x, r, state) {
      button(r, `x:${x.id}`, state, () => {
        const left = x.mark ? 36 : 0;
        if (x.mark) S.drawIcon(g, x.mark, -r.w / 2 + 30, 0, 26, true);
        const t = ns.vrKit.fitFont(g, x.label || '', r.w - 84 - left, 24, '500 ');
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, -20 + left / 2, 1);
        if (x.icon) S.draw(g, x.icon, r.w / 2 - 34, 0, 30, true);
      }, { disabled: !!x.disabled });
    }

    // A live stream, in place of the time (top right): a "● LIVE" chip in the brand colour at
    // the live moment. Behind it (rewound, paused, or while scrubbing) the chip turns tonal,
    // with how far behind in front ("−0:45"), and clicking it (id 'live') jumps back to the
    // live moment. Returns the width it took from the right margin.
    function drawLiveLabel(state, shown) {
      const l = state.live, scrubbing = state.scrubTime != null;
      const behind = scrubbing ? Math.max(0, state.duration - shown) : l.behind;
      const atHead = !scrubbing && l.atHead;
      const right = W - 48, y = 44, pad = 16, dot = 7;
      g.font = T.font('labelLarge', 24);
      const w = pad + dot * 2 + 10 + g.measureText(tr('panel.live')).width + pad;
      const r = { x: right - w, y: y - 22, w, h: 44 };
      const content = () => {
        g.beginPath(); g.arc(-w / 2 + pad + dot, 0, dot, 0, Math.PI * 2); g.fill();
        g.font = T.font('labelLarge', 24); g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(tr('panel.live'), w / 2 - pad, 1);
      };
      if (atHead) {
        g.fillStyle = P.brand; roundRect(g, r.x, r.y, r.w, r.h, r.h / 2); g.fill();
        g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.fillStyle = P.onBrand; content(); g.restore();
      } else button(r, 'live', state, content, { kind: 'tonal' });
      if (atHead || behind < 1) return w;
      const t = `−${fmt(behind)}`;
      g.font = F('labelLargeProminent'); g.fillStyle = P.onSurfaceVariant; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(t, r.x - 16, y);
      return w + 16 + g.measureText(t).width;
    }

    // The seek bar: an M3E slider, the played part in the brand colour, the rest faded past
    // what's loaded (state.buffered), gaps where chapters
    // start. `shown` is the time to display (the scrub position while dragging, else the
    // playback time). A live stream without rewinding gets a full bar that can't be used.
    function drawSeekBar(state, shown) {
      const s = seekRect, barY = s.y + s.h / 2;
      if (state.live && !state.live.dvr) {
        g.fillStyle = P.brand; roundRect(g, s.x, barY - TRACK / 2, s.w, TRACK, TRACK / 2); g.fill();
        return;
      }
      regions.push({ id: 'seek', ...s });
      const hot = state.hover === 'seek' || state.scrubTime != null;
      if (hot) drawHeatmap(state, barY - TRACK_HOT / 2 - 6);
      const frac = state.duration ? Math.min(1, Math.max(0, shown / state.duration)) : 0;
      const cuts = (state.chapters || []).filter(c => c.start > 0 && c.start < state.duration).map(c => s.x + s.w * c.start / state.duration);
      const buf = state.buffered != null && state.duration ? Math.min(1, Math.max(0, state.buffered / state.duration)) : 1;
      drawSlider(s.x, s.w, barY, frac, hot, P.brand, cuts, buf);
    }

    // The heatmap over the seek bar: a soft filled curve standing on `base` (px), as tall as
    // HEATMAP_H where the video is rewatched most, through each marker's middle (smoothed
    // with midpoint curves).
    const HEATMAP_H = 34;
    function drawHeatmap(state, base) {
      const list = state.heatmap || [], s = seekRect;
      if (!list.length || !(state.duration > 0)) return;
      const pts = list.map(h => [s.x + s.w * Math.min(1, (h.start + h.duration / 2) / state.duration),
        base - 2 - HEATMAP_H * Math.min(1, Math.max(0, h.intensity))]);
      g.beginPath(); g.moveTo(s.x, base); g.lineTo(s.x, pts[0][1]);
      for (let i = 0; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      g.lineTo(last[0], last[1]); g.lineTo(s.x + s.w, last[1]); g.lineTo(s.x + s.w, base); g.closePath();
      g.fillStyle = PA('onSurface', 0.22); g.fill();
    }

    // Seek-bar preview above the pointed-at spot: the storyboard frame (when the site has
    // one), the chapter name at the top and the time at the bottom.
    function drawPreview(state) {
      const p = state.preview, s = seekRect;
      const px = s.x + s.w * Math.min(1, Math.max(0, p.time / state.duration));
      let chapter = '';
      for (const c of state.chapters || []) if (c.start <= p.time) chapter = c.title;
      const f = p.frame, img = f && sheet(f.url);
      const w = PREVIEW_W, h = img ? Math.round(w * 9 / 16) : (chapter ? 64 : 40);
      const x = Math.min(s.x + s.w - w, Math.max(s.x, px - w / 2)), y = s.y - 4 - h;
      const radius = T.shape.medium;
      g.save();
      roundRect(g, x, y, w, h, radius); g.fillStyle = P.surfaceContainerHighest; g.fill();
      g.clip();
      if (img && img.ok) g.drawImage(img.img, f.col * f.tileWidth, f.row * f.tileHeight, f.tileWidth, f.tileHeight, x, y, w, h);
      const clipText = (t, maxW) => {
        if (g.measureText(t).width <= maxW) return t;
        while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
        return t + '…';
      };
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (chapter) {
        g.fillStyle = PA('scrim', 0.6); g.fillRect(x, y, w, 28);
        g.fillStyle = P.onSurface; g.font = T.font('labelMedium', 18);
        g.fillText(clipText(chapter, w - 16), x + w / 2, y + 15);
      }
      g.fillStyle = PA('scrim', 0.6); g.fillRect(x, y + h - 32, w, 32);
      g.fillStyle = P.onSurface; g.font = F('labelLarge');
      // Live streams: how far behind the live moment that spot is ("−0:45").
      g.fillText(state.live ? `−${fmt(Math.max(0, state.duration - p.time))}` : fmt(p.time), x + w / 2, y + h - 15);
      g.restore();
      g.strokeStyle = P.hoverRing; g.lineWidth = 2;
      roundRect(g, x, y, w, h, radius); g.stroke();
    }

    // (u, v) in 0..1 from the top-left -> { id, fraction } or null. Small controls (the seek
    // bar) reach out to the 56 dp target size (kit.js regionAt).
    function hitTest(u, v) {
      const r = ns.vrKit.regionAt(regions, u, v, W, H);
      if (!r) return null;
      const slider = r.id === 'seek';
      return { id: r.id, fraction: slider ? Math.min(1, Math.max(0, (u * W - r.x) / r.w)) : null };
    }

    // Where control `id` was in the last drawing ({ x, y, w, h } canvas pixels), or null:
    // lets floating extras (the playlist hover card) sit next to it.
    const rectOf = id => { const r = regions.find(x => x.id === id); return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null; };

    // Fraction along the seek bar for any u (used while dragging off it).
    const seekFraction = u => Math.min(1, Math.max(0, (u * W - seekRect.x) / seekRect.w));

    return { canvas, aspect: H / W, width: W, height: H, draw, hitTest, rectOf, seekFraction, previewReady,
      titleMoving: () => titleMoving, animating: motion.moving };
  }

  // The Format button's icon for a format id (also each row's icon in the Format menu: vr-panel.js).
  const formatIcon = id => FORMAT_ICONS[id] || '2d_2';

  ns.vrPanelUI = { createPanelUI, formatTime: fmt, speedName, formatIcon };
})(globalThis.__streamxr = globalThis.__streamxr || {});
