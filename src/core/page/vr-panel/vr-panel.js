// The floating control panel and laser pointers: where the panel sits, what each laser
// is pointing at, trigger clicks, seek-bar scrubbing and preview, the quality / speed /
// format / volume menus (and the site's own buttons' menus), the panels around the Safe Zone with their toolbars and the pill
// (built from the site's registry), moving the controls panel by its grab bar, and auto-hide.
//
//   const panel = ns.vrPanel.create(gl, actions, site);
//   site: from the site's provider session (e.g. sites/youtube/page/provider/provider.js):
//         { name, panels: [registrations] (e.g. sites/youtube/page/provider/panels.js),
//           onControl(id, panel, shell) (controls panel controls the shell doesn't handle itself:
//           'title', 'creator', 'action:<id>'; panel(id) = that panel's controller; shell:
//           { confirm(d) } (a dialog: see confirm below)) }
//   actions (the session's: the provider's plus the shell's own): { toggle(), seekBy(seconds),
//              seekTo(seconds), recenter(), exit(), setQuality(id), setFormat(fmt),
//              setSpeed(rate), setVolume(0-100), setMuted(bool),
//              storyboard(seconds) -> frame | null, skipAd(),
//              previousVideo(), nextVideo() (in a list), goLive() (live streams: jump to
//              the live moment), extra(id, itemId) (the site's own button `id` was clicked,
//              or one of its menu's items; itemId null: its menu just opened), ...and
//              whatever the site's panels use,
//              state() -> { title, time, duration, paused,
//                           nowPlaying (what the controls panel shows: see panel-ui.js),
//                           quality: { current, currentLabel, levels: [{ id, label, icons? }] },
//                           live: null | { atHead, behind (seconds), dvr } (a live stream; time
//                             and duration then cover only the rewindable part),
//                           speed, speeds: [rates], volume: { level, muted },
//                           chapters: [{ title, start }], heatmap: [{ start, duration,
//                             intensity (0..1) }] (how much each part is rewatched; optional),
//                           ad: null | { ... },
//                           format: { current, options: [{ id, label, short, disabled }] },
//                           extras: { left: [...], right: [...] } (the site's own buttons on
//                             the controls panel: panel-ui.js, plus menu: null | { items: [{ id,
//                             text, on, disabled }], note, scroll, width, stay (stays open on a
//                             choice) }: opens like Quality's),
//                           ...and what the site's panels read } }
//   The layout (docs/Spatial-Layout.md) is placed around the Safe Zone (safe-zone.js), which
//   keeps the video clear: each registered panel belongs to a zone (its registration's
//   `zone`): 'left' or 'right' (outside the Safe Zone's side edges, one open per side, each
//   side with an upright toolbar standing on the zone's line over the panel's inner edge),
//   or 'controls' (a popup rising from a pill on the controls panel's top edge, e.g.
//   Settings), or 'top' (a search bar above the zone, its suggestions dropping into it, and
//   the panel itself in the zone's middle while its controller says so, e.g. Search's
//   results). The controls panel sits under the zone, in the middle. Everything is
//   cfg.layout.distance away, sized so text looks as big as cfg.layout.pxPerDegree says.
//   Which side panels are open is remembered. Each panel is a style (styles/) filled by its
//   controller; its control ids are '<panel id>|<style id>' here, and a used control
//   reaches the controller as an event { type, value } (ARCHITECTURE.md).
//   panel.place(headPosition, yaw)        lay it out around you (on enter and recenter)
//   panel.resetSettings()                 the global reset: keyboard size back to default, panels shown
//   panel.toggleVisible()
//   panel.toggleKeyboard()                swap the in-VR keyboard (keyboard.js) and the controls panel, in the same place
//   panel.claimsGrip(hand)                true if that hand's grip is for the grab bar, not recenter
//   panel.stickScrolls(hand)              true if that hand's stick scrolls a text panel, not ±10 s
//   panel.stickPages(hand)                true if that hand's stick turns a panel's pages, not ±10 s
//   panel.stickPage(hand, dir)            stick pushed left (dir < 0) / right: turn the page; true if it was ours
//   panel.iconSwaps()                     { left?, right? } icon swaps for the controller models
//   panel.update(frame, refSpace, inputSources, nowMs, headPosition)   once per frame
//   panel.drawPanel(viewerPose, layer)    after the video
//   panel.drawLasers(viewerPose, layer, fades)   after the controllers (fades: { left?, right? },
//                                         each controller's idle fade: controllers.js alphas())
//   panel.setTargets([interaction, ...])  other things the laser can grab with grip, e.g. the
//                                         cinema screen's handles. Each target provides
//                                         hit(origin, dir) -> { t, point, id } | null,
//                                         grabStart(id, ray, origin, dir, head), grabMove(ray, origin, dir, head),
//                                         grabEnd(head), setHighlight(show, hoverIds).
(function (ns) {
  'use strict';

  const { math3d: M, input } = ns;
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)
  // A registered panel's name: its label is text, or a function giving it in the interface language.
  const labelOf = reg => (typeof reg.label === 'function' ? reg.label() : reg.label);
  const TRIGGER = 0, GRIP = 1;           // button numbers on the controller's gamepad
  const DEG = Math.PI / 180;
  const ZONES = ['left', 'right', 'controls', 'top'];

  // Build the panel system for this WebGL context (see the description at the top of the
  // file for `actions` and the returned API). Returns null if it can't run here.
  // The canvases floating in the world, all drawn by the same textured-quad pass: the
  // controls panel (`ui`), the side toolbars and the pill, each registered panel and the
  // playlist hover card.
  function create(gl, actions, site) {
    const cfg = ns.vrPanelConfig;
    const vaos = ns.gl.vertexArrays(gl);
    if (!vaos) { console.warn('[streamxr] no vertex array objects; VR panel off'); return null; }
    // Sizes: every canvas is shown at the same pixel density, MPX metres per pixel, so its
    // text looks cfg.layout.pxPerDegree pixels per degree from cfg.layout.distance away,
    // times the panel size setting (Settings → Appearance: rescale() below).
    // Depth levels (Android XR's dp, 1 dp = 0.868 mm per metre away): dp(n) in metres there.
    const D = cfg.layout.distance;
    const panelScale = () => (ns.vrAppearanceOptions ? ns.vrAppearanceOptions.scale() : 1);
    const BASE_MPX = D * Math.tan(DEG) / cfg.layout.pxPerDegree;
    let MPX = BASE_MPX * panelScale();
    const dp = n => n * 0.868e-3 * D;
    const metres = c => [c.width * MPX, c.height * MPX];    // a canvas's size in the world

    let previewLoaded = 0;            // bumps when a seek-preview image arrives (forces a redraw)
    const ui = ns.vrPanelUI.createPanelUI(() => { previewLoaded++; });
    const panelPass = ns.vrPanelPass.createPanelPass(gl, vaos, ui.canvas);
    const laserPass = ns.vrLaserPass.createLaserPass(gl, vaos);
    // The Safe Zone's outline (safe-zone.js), shown while its settings tab is open; the
    // headset's field of view is read on the first frame drawn.
    const zonePass = ns.vrSafeZone.createPass(gl, vaos);
    let fovMeasured = false;
    const size = metres(ui.canvas);

    // ------------------------------------------------------------ the site's panels
    // One entry per registration: { reg, zone ('left' | 'right' | 'controls'), style (its
    // style instance), pass, size (metres), ctrl (its controller), key (what was last
    // drawn) }. Canvas sizes (px) come from cfg.sizes; every 'wide' panel takes the height a
    // Catalog of that width trims itself to.
    const WIDE_W = cfg.sizes.wide.width;
    const WIDE_H = ns.vrStyles.catalog.heightFor(WIDE_W, cfg.sizes.wide.height);
    function canvasSize(name) {
      if (name === 'wide') return [WIDE_W, WIDE_H];
      const s = cfg.sizes[name] || cfg.sizes.standard;
      return [s.width, s.height];
    }
    const panels = new Map();         // panel id -> entry
    for (const reg of site.panels) {
      const [w, h] = canvasSize(reg.size);
      const style = ns.vrStyles[reg.style].create(() => { /* an image arrived: the key notices */ }, w, h, reg.overrides || {});
      const p = { reg, zone: ZONES.includes(reg.zone) ? reg.zone : 'right', style, key: '',
        pass: ns.vrPanelPass.createPanelPass(gl, vaos, style.canvas), size: metres(style.canvas) };
      p.ctrl = reg.create({
        actions, style, perPage: style.perPage,
        open: () => { if (!isOpen(reg.id)) toggleOpen(reg.id); },
        close: () => { if (isOpen(reg.id)) toggleOpen(reg.id); },
        isOpen: () => isOpen(reg.id),
        closeMenu: () => { menu = null; },
        confirm: d => confirm(d),
        typeInto: (on, opts) => typeInto(p, on, opts),
      });
      panels.set(reg.id, p);
    }

    // ------------------------------------------------------------ typing
    // A panel with a text field asks for the keys (host.typeInto(true)); while it's shown,
    // each key reaches its controller as { type: 'key', value } (a character, or 'Backspace',
    // 'Enter', 'Escape'). The computer's keyboard types this way, and so will an in-VR
    // keyboard. Those keys are kept from the page meanwhile (YouTube's own shortcuts: k,
    // Space ...): their keydown, keypress and keyup all stop here (window, capture phase, so
    // before the page's own listeners), keyup too so Space can't click a focused page
    // button. Typing also keeps the panels from auto-hiding.
    let typing = null;                    // the panel being typed into, or null
    const TYPING_KEYS = /^(Backspace|Enter|Escape)$/;
    // (Typing into the top panel's bar needs only the panels shown: the bar is always there.)
    const typingNow = () => !!typing && (typing.zone === 'top' ? visible : shown(typing));
    // A panel asks for the keys (on) or gives them back. Asking also brings up the in-VR
    // keyboard if it isn't up; giving them back (with no other panel typing) puts it away again
    // if it came up that way. A panel asking while another has the keys takes them over, and
    // the other is sent Escape (as for a click on nothing), so it stops typing too (its caret
    // goes). opts.emojis: the panel's own emojis for the keyboard's emoji pages (keyboard.js setEmojis).
    let kbAuto = false;                   // the keyboard came up because a panel asked for keys
    function typeInto(p, on, opts = {}) {
      const before = typing;
      typing = on ? p : (typing === p ? null : typing);
      if (on && before && before !== p) before.ctrl.event({ type: 'key', value: 'Escape' });   // (its giving back changes nothing now)
      if (on || !typing) kb.setEmojis(on ? opts.emojis || [] : []);
      if (on && !kbShown) { showKeyboard(true); kbAuto = true; }
      else if (!on && !typing && kbAuto && kbShown) { showKeyboard(false); kbAuto = false; }
    }
    const isTypingKey = e => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || TYPING_KEYS.test(e.key));
    function onKey(e) {
      if (!typingNow() || !isTypingKey(e)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.type !== 'keydown') return;
      lastActivity = performance.now();
      typing.ctrl.event({ type: 'key', value: e.key });
    }
    const KEY_EVENTS = ['keydown', 'keypress', 'keyup'];
    for (const t of KEY_EVENTS) window.addEventListener(t, onKey, true);
    const controller = id => (panels.get(id) || {}).ctrl;
    // A panel control's id here is '<panel id>|<style id>': which panel, and its own id.
    const SEP = '|';
    const panelOf = id => (id && id.includes(SEP) ? panels.get(id.slice(0, id.indexOf(SEP))) : null);
    const localOf = (id, p) => (id && id.startsWith(p.reg.id + SEP) ? id.slice(p.reg.id.length + 1) : null);
    // Tell a panel's controller one of its controls was used: '<type>:<value>' -> event.
    function sendEvent(p, local, extra) {
      const i = local.indexOf(':');
      p.ctrl.event({ type: i < 0 ? local : local.slice(0, i), value: i < 0 ? '' : local.slice(i + 1), ...extra });
    }

    // The playlist hover card: the video the Previous / Next button leads to, floating just
    // above that button while the laser points at it (see hover-card-ui.js).
    let hoverImages = 0;
    const hoverCard = ns.vrHoverCardUI.create(() => { hoverImages++; });
    const hoverPass = ns.vrPanelPass.createPanelPass(gl, vaos, hoverCard.canvas);
    let hoverShown = null;            // { rect (controls canvas px) } while a card is up
    let hoverKey = '';

    // ------------------------------------------------------------ popups and dialogs
    // The controls panel's menus float in front of it (32 dp, Android XR's popup level),
    // rising from the button that opened them (popups-ui.js createMenu); a dialog (confirm()
    // below) stands in front of everything (56 dp) over a dim layer (the scrim).
    const menuUi = ns.vrPopupsUI.createMenu();
    const menuPass = ns.vrPanelPass.createPanelPass(gl, vaos, menuUi.canvas), menuSize = metres(menuUi.canvas);
    let menuKey = '', menuShown = null;   // what was last drawn; the menu last opened (it fades out from its button)
    const dialogUi = ns.vrPopupsUI.createDialog();
    const dialogPass = ns.vrPanelPass.createPanelPass(gl, vaos, dialogUi.canvas), dialogSize = metres(dialogUi.canvas);
    let dialogKey = '';
    const scrimCanvas = document.createElement('canvas');   // the dim layer: a see-through dark sheet
    scrimCanvas.width = scrimCanvas.height = 4;
    { const sg = scrimCanvas.getContext('2d'); sg.fillStyle = 'rgba(0,0,0,0.55)'; sg.fillRect(0, 0, 4, 4); }
    const scrimPass = ns.vrPanelPass.createPanelPass(gl, vaos, scrimCanvas);
    scrimPass.upload();
    const SCRIM_SIZE = [8, 5];            // metres: wide enough to dim everything you see
    // The open dialog: { d (what it shows: title, text, cancel, confirm, danger), resolve,
    // shown (the last one, kept while it fades out) } or null.
    let dialog = null, dialogShown = null;
    // Ask a question in a dialog: d = { title, text, confirm (its button's label), cancel
    // (default "Cancel"), danger (confirming can't be undone: the error colour) }. Resolves
    // true for confirm, false for cancel or a click anywhere else (a new dialog cancels the
    // one before). The panels show (and stay) while it's up.
    function confirm(d) {
      if (dialog) dialog.resolve(false);
      return new Promise(resolve => {
        dialog = { d: { cancel: tr('dialog.cancel'), ...d }, resolve };
        dialogShown = dialog.d; visible = true; menu = null; lastActivity = performance.now();
      });
    }
    function closeDialog(answer) {
      if (!dialog) return;
      const r = dialog.resolve; dialog = null; lastActivity = performance.now();
      r(answer);
    }
    // Where the menu goes: its bottom middle just above the button that opened it (centred
    // on it, kept from reaching far past the panel's sides), in the controls panel's tilt,
    // 32 dp in front.
    function menuModel(id) {
      const rect = ui.rectOf(id);
      if (!rect) return null;
      const cx = ((rect.x + rect.w / 2) / ui.width - 0.5) * size[0];
      const half = size[0] / 2 - 0.12;
      const x = Math.max(-half, Math.min(half, cx));
      const bottom = (0.5 - rect.y / ui.height) * size[1] + 12 * MPX;
      return M.multiply(model, M.translation(x, bottom + menuSize[1] / 2, dp(32)));
    }
    // The dialog, in the Safe Zone's middle, 56 dp nearer than the panels; the scrim just behind it.
    function dialogModel(d) {
      const Z = ns.vrSafeZone, z = Z.angles();
      return facing(Z.point(0, z.mid, D - d), Z.anchor.pos);
    }
    // The orbiters (orbiters-ui.js): a toolbar for each side's panels, standing on the Safe
    // Zone's line with the names growing outward over the panel, and a pill for the
    // 'controls' panel (the first one) on the controls panel's top edge. Their items' ids
    // are 'toggle:<panel id>'.
    const itemOf = p => ({ id: `toggle:${p.reg.id}`, label: () => labelOf(p.reg), icon: p.reg.icon });
    const orbiters = {};              // 'left' / 'right' / 'pill' -> { ui, pass, size, key }
    for (const side of ['left', 'right']) {
      const list = [...panels.values()].filter(p => p.zone === side);
      if (!list.length) continue;
      const tb = ns.vrOrbitersUI.createToolbar(list.map(itemOf), side);
      orbiters[side] = { ui: tb, pass: ns.vrPanelPass.createPanelPass(gl, vaos, tb.canvas), size: metres(tb.canvas), key: '' };
    }
    const popupPanel = [...panels.values()].find(p => p.zone === 'controls') || null;
    if (popupPanel) {
      const pill = ns.vrOrbitersUI.createPill(itemOf(popupPanel));
      orbiters.pill = { ui: pill, pass: ns.vrPanelPass.createPanelPass(gl, vaos, pill.canvas), size: metres(pill.canvas), key: '' };
    }
    // The 'top' panel (the first one; e.g. Search): a search bar standing above the Safe
    // Zone, with its suggestions dropping into it, and the panel itself in the middle of the
    // zone (its results), shown while its controller says so (model(frame).open).
    const topPanel = [...panels.values()].find(p => p.zone === 'top') || null;
    if (topPanel) {
      const sb = ns.vrOrbitersUI.createSearchBar();
      orbiters.bar = { ui: sb, pass: ns.vrPanelPass.createPanelPass(gl, vaos, sb.canvas), size: metres(sb.canvas), key: '' };
      topPanel.topOpen = false; topPanel.bar = null;
    }
    // Which panel is open in each zone (a panel id, or null). The sides are remembered; the
    // popup isn't (it closes with the session). The first time, a side shows its panel
    // registered with `default`; a panel remembered from before the sides existed
    // ('abovePanel') opens on its side; one that has moved to another zone since gives way
    // to the default.
    const OPEN_KEY = { left: 'leftPanel', right: 'rightPanel' }, OLD_KEY = 'abovePanel';   // storage.js names
    const open = { left: null, right: null, controls: null };
    const oldOpen = ns.storage.get(OLD_KEY);
    for (const side of ['left', 'right']) {
      const saved = ns.storage.get(OPEN_KEY[side]);
      const old = oldOpen && panels.has(oldOpen) && panels.get(oldOpen).zone === side ? oldOpen : null;
      const first = [...panels.values()].find(p => p.zone === side && p.reg.default);
      const ok = id => panels.has(id) && panels.get(id).zone === side;   // (a remembered panel may have moved zone since)
      open[side] = saved === 'none' ? null : ok(saved) ? saved
        : old || (first ? first.reg.id : null);
    }
    function isOpen(id) { const p = panels.get(id); return !!p && (p.zone === 'top' ? !!p.topOpen : open[p.zone] === id); }
    // Open `which` in its zone (or close it if it's already open) and remember the side.
    function toggleOpen(which) {
      const z = panels.get(which).zone;
      if (z === 'top') return;                       // its controller decides (model().open)
      open[z] = open[z] === which ? null : which;
      if (OPEN_KEY[z]) ns.storage.set(OPEN_KEY[z], open[z] || 'none');
      replaced[z] = undefined;                       // (your choice now: nothing to bring back)
    }
    // Shown: open while the panels are up, or open and registered to stay while they're hidden.
    const shown = p => isOpen(p.reg.id) && (visible || !!p.reg.stays);

    // A side panel offered only some of the time (its registration's `available(st)`, asked
    // every frame; e.g. a live stream's chat): while it isn't, its toolbar item is hidden and it
    // can't be open. One registered `autoOpen` opens whenever it becomes available (not
    // remembered); the panel it replaced comes back when it goes (else the side's default).
    const replaced = { left: undefined, right: undefined };   // per side: the panel an autoOpen one replaced
    const availableNow = p => p.available !== false;
    const fallbackOf = side => { const d = [...panels.values()].find(p => p.zone === side && p.reg.default && availableNow(p)); return d ? d.reg.id : null; };
    function refreshAvailable(st) {
      let changed = false;
      for (const p of panels.values()) {
        if (!p.reg.available || (p.zone !== 'left' && p.zone !== 'right')) continue;
        let a = false;
        try { a = !!p.reg.available(st); } catch (_) { /* treated as unavailable */ }
        if (a === p.available) continue;
        p.available = a; changed = true;
        const z = p.zone, id = p.reg.id;
        if (a && p.reg.autoOpen && open[z] !== id) { replaced[z] = open[z]; open[z] = id; }
        else if (!a && open[z] === id) {
          const back = replaced[z];
          open[z] = back === null || (back && back !== id && availableNow(panels.get(back))) ? back : fallbackOf(z);
          replaced[z] = undefined;
        }
      }
      if (!changed) return;
      for (const side of ['left', 'right']) {
        const o = orbiters[side];
        if (!o) continue;
        const hidden = {};
        for (const p of panels.values()) if (p.zone === side && !availableNow(p)) hidden[`toggle:${p.reg.id}`] = true;
        if (o.ui.setHidden(hidden)) { laidOut = -1; o.key = ''; }   // the bar's length changed: lay it out again
      }
    }

    // ------------------------------------------------------------ the keyboard
    // keyboard.js's keys, standing in for the controls panel: while it's up (toggleKeyboard,
    // a controller button) it takes the controls panel's place and angle, hanging from the
    // same top edge (kbModel, from `model`: moving either moves both), and the controls panel
    // is hidden; the side panels stay. Bringing the panels up (toggleVisible) or hiding the
    // keyboard brings the controls panel back. Its keys type into the panel being typed into
    // (`typing`, see below), on the trigger's press, again and again while held (characters,
    // space, Backspace).
    const kbCfg = cfg.keyboard;
    const kb = ns.vrKeyboard.create();
    const kbPass = ns.vrPanelPass.createPanelPass(gl, vaos, kb.canvas);
    const KB_SCALE_KEY = 'keyboardScale';             // storage.js name: the size you gave it
    let kbShown = false, kbKey = '';
    // Opening and closing, eased (motion.js's springs: "panel", no bounce, for whole panels;
    // "open" for the menu; "dialog"; drawn in drawPanel): `vis` how
    // shown everything is, `kb` how far the keyboard has replaced the controls panel,
    // `open` how open each panel is (by id), `zone` how shown the Safe Zone's outline is,
    // `bars` / `search` how shown the side toolbars / the search bar are, `menu` / `dialog` how open
    // the floating menu and the dialog are.
    // The controls follow the real state at once (hit tests, input); only the look eases.
    const anim = { vis: ns.vrMotion.value('panel', cfg.showOnStart ? 1 : 0), kb: ns.vrMotion.value('panel', 0), open: new Map(), zone: ns.vrMotion.value('hover', 0), bars: ns.vrMotion.value('panel', 1), search: ns.vrMotion.value('panel', 1),
      menu: ns.vrMotion.value('open', 0), dialog: ns.vrMotion.value('dialog', 0) };
    let barsAwake = true, searchAwake = true;   // the side toolbars / the search bar shown (they auto-hide on their own: see update)
    let kbScale = (() => { const v = parseFloat(ns.storage.get(KB_SCALE_KEY)); return v >= kbCfg.minScale && v <= kbCfg.maxScale ? v : kbCfg.scale; })();
    let kbGrab = null;            // resizing by a corner: { hand, mode: 'resize-left' | 'resize-right', size, startScale, startDiag }
    let kbRepeat = null;          // { hand, id, next (ms) } while a repeating key is held
    const kbSize = () => { const w = kb.width * MPX * kbScale; return [w, w * kb.aspect]; };
    // The keyboard's pose: under the controls panel's top edge (it's taller, so it reaches lower).
    const kbModel = () => M.multiply(model, M.translation(0, size[1] / 2 - kbSize()[1] / 2, 0));
    const isKbHandle = id => !!id && /^kb:(grab|resize-left|resize-right)$/.test(id);

    // Swap the keyboard and the controls panel (both in the same place); the side panels
    // show with either.
    function showKeyboard(on) {
      kbShown = on; kbGrab = null; kbRepeat = null;
      visible = true; menu = null; grab = null;
      lastActivity = performance.now();
    }
    const toggleKeyboard = () => { kbAuto = false; showKeyboard(!kbShown); };   // by hand: it stays until put away by hand
    // One of its controls was pressed (id without 'kb:'): type its key, or hide it.
    function kbPress(id) {
      const out = kb.press(id);
      if (!out) return;
      if (out.hide) { showKeyboard(false); return; }
      if (out.key && typingNow()) { lastActivity = performance.now(); typing.ctrl.event({ type: 'key', value: out.key }); }
    }
    // Resizing: how far along a bottom corner's diagonal a point is (metres from the middle
    // of the keyboard's top edge, which stays put, in its plane; y down is negative), as a
    // multiple of that corner (as cinema-screen.js does).
    function kbDiag(id, local, sz) {
      const cw = sz[0] / 2, ch = sz[1], sx = id === 'resize-left' ? -1 : 1;
      return (local[0] * sx * cw + local[1] * -ch) / (cw * cw + ch * ch);
    }

    let model = M.identity();             // the controls panel's pose in the world (centre; +Z faces you)
    let visible = cfg.showOnStart;        // are the panels shown (toggled by the left D-pad, auto-hide)
    let lastActivity = 0;                 // when the laser last touched them (for auto-hide)
    const hands = new Map();          // handedness -> { hover, trigger, grip, beam, scrollPanel, pagePanel }
    let pressed = null;               // { hand, id } while the trigger is held on a control
    let scrub = null;                 // { hand, time } while dragging on the seek bar
    let volDrag = null;               // { hand, level } while dragging the volume slider
    let setDrag = null;               // { hand, p, local, fraction } while dragging a panel's slider
    let textDrag = null;              // { hand, p, v, scroll, moved, last, at, vel } while a trigger drags a scrolling area
    let fling = null;                 // { p, pos, vel (px/s) } while a let-go drag keeps scrolling (stepFling)
    let grab = null;                  // { hand, local } while moving the panel by its grab bar
    let menu = null;                  // null | 'quality' | 'speed' | 'format' | 'volume' | 'x:<id>' (a site button's)
    let extrasNow = null;             // the site's own buttons, from the latest state (st.extras)
    let menuDrag = null;              // { hand, v, scroll, moved } while a trigger drags a scrolling menu
    let muted = false;                // last seen mute state (for the Mute/Unmute button)
    let adSkippable = false;          // last seen: the current ad can be skipped
    let targets = [];                 // other grabbable things (see setTargets)
    let targetGrab = null;            // { hand, target } while gripping one of them
    let drawnKey = '';
    const SCROLL_SPEED = 900;         // stick fully pushed: pixels per second
    const STICK_DEADZONE = 0.15;      // stick travel (0..1) ignored for scrolling
    const DRAG_THRESHOLD = 10;        // pixels a trigger press must move to scroll instead of click

    // ------------------------------------------------------------ the layout
    // A pose at `pos` turned so its face points at `eye` (no roll).
    function facing(pos, eye) {
      const dx = eye[0] - pos[0], dy = eye[1] - pos[1], dz = eye[2] - pos[2];
      const yaw = Math.atan2(dx, dz), tilt = Math.atan2(dy, Math.hypot(dx, dz));
      return M.multiply(M.translation(pos[0], pos[1], pos[2]), M.multiply(M.rotationY(yaw), M.axisAngle(1, 0, 0, -tilt)));
    }
    // The controls panel at `pos`, facing `eye` (the pill, its popup and the keyboard follow it).
    function faceToward(pos, eye) { model = facing(pos, eye); }

    // Everything is laid out around the Safe Zone (safe-zone.js), seen from where you
    // recentered (its anchor), in degrees from straight ahead, on a sphere D metres around
    // your eyes, each piece turned to face you:
    //   the controls panel: in the middle, its top edge GAP under the zone's bottom;
    //   each side's toolbar: on the zone's side line (its bar GAP / 2 outside it), raised 16 dp;
    //   each side's panels: their inner edge under the middle of that toolbar's bar, centred
    //     on the zone's middle height.
    // Laid out again whenever the zone changes (its version: settings, recenter, the field
    // of view measured), which also brings back a controls panel you moved.
    const GAP = Math.atan(dp(20) / D) / DEG;           // 20 dp, in degrees
    const halfDeg = m => Math.atan(m / 2 / D) / DEG;    // half the angle a width of m metres spans at D
    const sides = { left: null, right: null };         // per side: { bar (the toolbar's pose), barYaw }
    let laidOut = -1;                                  // the zone version they were laid out for
    let searchBarModel = M.identity();                 // the search bar's pose (with a top panel)
    function relayout() {
      const Z = ns.vrSafeZone, z = Z.angles(), eye = Z.anchor.pos;
      faceToward(Z.point(0, z.bottom - GAP - halfDeg(size[1]), D), eye);
      for (const side of ['left', 'right']) {
        const o = orbiters[side];
        if (!o) continue;
        const sgn = side === 'left' ? -1 : 1, edge = side === 'left' ? z.left : z.right;
        const barYaw = edge + sgn * (GAP / 2 + halfDeg(o.ui.barWidth * MPX));
        // The toolbar's canvas, moved so its bar (not the canvas's centre) is at barYaw.
        const shift = M.translation(-(o.ui.barCentre.x - o.ui.canvas.width / 2) * MPX, (o.ui.barCentre.y - o.ui.canvas.height / 2) * MPX, 0);
        sides[side] = { bar: M.multiply(facing(Z.point(barYaw, z.mid, D - dp(16)), eye), shift), barYaw, pitch: z.mid };
      }
      for (const p of panels.values()) {
        const s = sides[p.zone];
        if (!s) continue;
        const sgn = p.zone === 'left' ? -1 : 1;
        p.pose = facing(Z.point(s.barYaw + sgn * halfDeg(p.size[0]), s.pitch, D), eye);
      }
      // The search bar: its field in the middle, GAP above the zone's top edge, raised 16 dp
      // (its canvas moved so the field, not the canvas's centre, is there); the top panel
      // under it, in the middle of the zone, its top edge GAP under the zone's top.
      if (topPanel) {
        const sb = orbiters.bar.ui;
        const shift = M.translation(-(sb.fieldCentre.x - sb.canvas.width / 2) * MPX, (sb.fieldCentre.y - sb.canvas.height / 2) * MPX, 0);
        searchBarModel = M.multiply(facing(Z.point(0, z.top + GAP + halfDeg(sb.fieldHeight * MPX), D - dp(16)), eye), shift);
        // Shrunk if needed so it fits the zone's height, above the Settings pill that reaches up
        // into it (and never wider than the zone either).
        const pillUp = orbiters.pill ? halfDeg(pillButtonH() - dp(12)) * 2 : 0;
        const full = metres(topPanel.style.canvas), room = z.top - z.bottom - GAP * 2 - pillUp, roomW = z.right - z.left - GAP * 2;
        const k = Math.min(1, room / (halfDeg(full[1]) * 2), roomW / (halfDeg(full[0]) * 2));
        topPanel.size = [full[0] * k, full[1] * k];
        topPanel.pose = facing(Z.point(0, z.top - GAP - halfDeg(topPanel.size[1]), D), eye);
      }
      laidOut = Z.zone.version;
    }
    // The panel size setting changed: every canvas's size in the world follows the new MPX
    // (the size arrays are updated in place, as everything holds on to them), then the
    // layout is done again around the Safe Zone.
    let scaledFor = ns.vrAppearanceOptions ? ns.vrAppearanceOptions.sizeVersion() : 0;
    function rescale() {
      scaledFor = ns.vrAppearanceOptions.sizeVersion();
      MPX = BASE_MPX * panelScale();
      const fit = (sz, c) => { sz[0] = c.width * MPX; sz[1] = c.height * MPX; };
      fit(size, ui.canvas); fit(menuSize, menuUi.canvas); fit(dialogSize, dialogUi.canvas); fit(hoverSize, hoverCard.canvas);
      for (const p of panels.values()) p.size = metres(p.style.canvas);
      for (const o of Object.values(orbiters)) fit(o.size, o.ui.canvas);
      relayout();
    }
    // The pill on the controls panel's top edge: its button overlapping the edge by 12 dp,
    // raised 16 dp; the 'controls' panel (the popup) rising from it, 8 dp above the pill,
    // raised 32 dp (Android XR's popup level).
    const pillButtonH = () => orbiters.pill.ui.buttonHeight * MPX;
    const pillModel = () => M.multiply(model, M.translation(0, size[1] / 2 - dp(12) + pillButtonH() / 2, dp(16)));
    const popupModel = p => M.multiply(model, M.translation(0, size[1] / 2 - dp(12) + pillButtonH() + dp(8) + p.size[1] / 2, dp(32)));
    // Where a panel is: on its side, or the popup.
    const panelModel = p => (p.zone === 'controls' ? popupModel(p) : p.pose);
    // Where an orbiter is: a side's toolbar, the pill or the search bar.
    const orbiterModel = name => (name === 'pill' ? pillModel() : name === 'bar' ? searchBarModel : sides[name].bar);

    // Lay everything out in front of you: on entering VR and whenever you recenter. `yaw`
    // is the direction you're facing; the Safe Zone is measured from here.
    function place(head, yaw) {
      ns.vrSafeZone.setAnchor(head, yaw);
      relayout();
      lastActivity = performance.now();                         // don't auto-hide right after placing
    }

    // The global reset: the keyboard back to its default size (forgetting yours), any move
    // or resize dropped, and the panels shown. Their place comes from the recenter that
    // follows (the controls panel has no remembered place: the layout puts it back).
    function resetSettings() {
      kbScale = kbCfg.scale; ns.storage.remove(KB_SCALE_KEY);
      kbGrab = null; grab = null; menu = null;
      visible = true;
      lastActivity = performance.now();
    }

    // Show/hide all the panels (the left D-pad). Hiding also closes any open menu and drops a grab.
    // With the keyboard up, this brings the controls panel back in its place instead.
    function toggleVisible() {
      if (kbShown) { showKeyboard(false); return; }
      visible = !visible;
      if (!visible) { menu = null; grab = null; }
      lastActivity = performance.now();
    }

    // Grip belongs to us (not recenter) while that hand points at or holds something grabbable.
    const claimsGrip = hand => {
      const h = hands.get(hand);
      return !!(grab && grab.hand === hand) || !!(targetGrab && targetGrab.hand === hand) || !!(kbGrab && kbGrab.hand === hand) ||
        !!(h && ((visible && h.hover === 'grab') || h.targetHit || (kbShown && isKbHandle(h.hover))));
    };

    // The stick belongs to us (scrolling, not ±10 s) while that hand points at a scrolling
    // area; iconSwaps() tells the controller models to show the scroll icon there.
    const stickScrolls = hand => { const h = hands.get(hand); return !!(visible && h && (h.scrollPanel || h.menuScroll)); };
    // Likewise its left / right turns pages while it points at a panel showing page arrows
    // (h.pagePanel, set in update). stickPage(hand, dir) presses that panel's previous
    // (dir < 0) / next arrow if it's enabled; true if the stick was ours.
    const stickPages = hand => { const h = hands.get(hand); return !!(visible && h && h.pagePanel); };
    function stickPage(hand, dir) {
      if (!stickPages(hand)) return false;
      const p = hands.get(hand).pagePanel, id = dir < 0 ? 'page:prev' : 'page:next';
      if (p.style.has(id)) { sendEvent(p, id); lastActivity = performance.now(); }
      return true;
    }
    function iconSwaps() {
      const out = {};
      for (const [hand] of hands) {
        if (stickScrolls(hand)) out[hand] = { seek: 'scroll' };
        else if (stickPages(hand)) out[hand] = { seek: 'page' };
        // the keyboard button shows it puts the keyboard away while it's up
        if (kbShown) out[hand] = { ...(out[hand] || {}), keyboard: 'keyboardhide' };
      }
      return out;
    }

    // Register other things the laser can grab with the grip (e.g. the cinema screen's
    // handles; see the description at the top). Replaces the previous list, ending any drag.
    function setTargets(list) {
      if (targetGrab) { try { targetGrab.target.grabEnd(lastHead); } catch (_) { /* gone */ } targetGrab = null; }
      targets = (list || []).filter(Boolean);
    }
    let lastHead = [0, 0, 0];             // where your head was at the last update

    // A short vibration in a controller (hover / click feedback), if the settings allow it
    // and the browser gives the controller a way to: WebXR's hapticActuators[0].pulse(), or
    // else the Gamepad API's vibrationActuator.playEffect() (a 'dual-rumble' effect, both
    // motors at `strength`). strength 0..1, duration in ms. What happened is noted for the
    // popup's Details (diagnostics.js noteBuzz).
    function buzz(src, strength, ms) {
      if (!cfg.haptics || (ns.vrAppearanceOptions && !ns.vrAppearanceOptions.haptics())) return;
      const gp = src.gamepad, note = how => ns.diagnostics && ns.diagnostics.noteBuzz(src.handedness, how);
      const settle = (api, out) => {
        if (out && typeof out.then === 'function') out.then(r => note(`${api}: ${r}`), e => note(`${api} failed: ${e && e.message || e}`));
        else note(`${api}: ${out}`);
      };
      try {
        const h = gp && gp.hapticActuators && gp.hapticActuators[0];
        const va = gp && gp.vibrationActuator;
        if (h && typeof h.pulse === 'function') settle('pulse', h.pulse(strength, ms));
        else if (va && typeof va.playEffect === 'function') settle('playEffect', va.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength }));
        else note('no vibration API on this controller');
      } catch (e) { note(`error: ${e && e.message || e}`); }
    }

    // Ray against a panel's plane -> { t, point, u, v } (u, v may be outside 0..1) or null.
    function intersect(origin, dir, mdl = model, sz = size) {
      const n = [mdl[8], mdl[9], mdl[10]], c = [mdl[12], mdl[13], mdl[14]];
      const denom = M.dot(dir, n);
      if (denom > -1e-4) return null;                           // pointing away or edge-on
      const t = M.dot([c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]], n) / denom;
      if (t <= 0) return null;
      const p = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
      const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
      const u = M.dot(d, [mdl[0], mdl[1], mdl[2]]) / sz[0] + 0.5;
      const v = 0.5 - M.dot(d, [mdl[4], mdl[5], mdl[6]]) / sz[1];
      return { t, point: p, u, v };
    }

    // World point -> coordinates in a rigid pose's local frame, and back.
    function toLocal(m, p) {
      const d = [p[0] - m[12], p[1] - m[13], p[2] - m[14]];
      return [M.dot(d, [m[0], m[1], m[2]]), M.dot(d, [m[4], m[5], m[6]]), M.dot(d, [m[8], m[9], m[10]])];
    }

    // A control was clicked (trigger pressed and released on the same control): do what its
    // id means. Ids come from panel-ui.js ('play', 'seek', 'q:<level>' for a quality choice,
    // 's:<rate>' speed, 'f:<format>' ...), the toolbars and the pill ('toggle:<panel id>')
    // and the panels ('<panel id>|<style id>', passed on to that panel's controller).
    function click(id) {
      const p = panelOf(id);
      if (p) { sendEvent(p, localOf(id, p)); return; }
      if (id.startsWith('toggle:')) {
        const pid = id.slice(7);
        toggleOpen(pid);
        const c = controller(pid);
        if (isOpen(pid) && c && c.opened) c.opened();
        return;
      }
      if (site.onControl && site.onControl(id, controller, { confirm })) return;   // controls that lead into a panel
      if (id === 'dialog:confirm' || id === 'dialog:cancel') { closeDialog(id === 'dialog:confirm'); return; }
      if (id === 'play') actions.toggle();
      else if (id === 'pl:prev') actions.previousVideo();
      else if (id === 'pl:next') actions.nextVideo();
      else if (id === 'back10') actions.seekBy(-10);
      else if (id === 'fwd10') actions.seekBy(10);
      else if (id === 'recenter') actions.recenter();
      else if (id === 'exit') actions.exit();
      else if (id === 'quality' || id === 'format' || id === 'speed' || id === 'volume') menu = menu === id ? null : id;
      else if (id === 'vol:mute') actions.setMuted(!muted);
      else if (id === 'skipad') actions.skipAd();
      else if (id.startsWith('q:')) { actions.setQuality(id.slice(2)); menu = null; }
      else if (id.startsWith('s:')) { actions.setSpeed(+id.slice(2)); menu = null; }
      else if (id.startsWith('f:')) { actions.setFormat(id.slice(2)); menu = null; }
      else if (id === 'live') { if (actions.goLive) actions.goLive(); }
      else if (id.startsWith('x:')) {                 // a site button: its menu, or just the click
        const x = extraOf(id.slice(2));
        if (x && x.menu) {
          menu = menu === id ? null : id;
          if (menu && actions.extra) actions.extra(x.id, null);
        } else if (actions.extra) actions.extra(id.slice(2));
      } else if (id.startsWith('xi:')) {              // an item of a site button's menu: 'xi:<button>:<item>'
        const rest = id.slice(3), i = rest.indexOf(':'), xid = rest.slice(0, i), x = extraOf(xid);
        if (actions.extra) actions.extra(xid, rest.slice(i + 1));
        if (!(x && x.menu && x.menu.stay)) menu = null;
      }
    }
    // A site button as the button row draws it (without its menu).
    const stripMenu = ({ menu: _m, ...x }) => x;
    // One of the site's own buttons (st.extras) by id, or null.
    const extraOf = xid => [...((extrasNow && extrasNow.left) || []), ...((extrasNow && extrasNow.right) || [])].find(x => x.id === xid) || null;

    // Moving the volume slider also unmutes (as video players do).
    function setVolume(level, st) {
      actions.setVolume(level);
      if (st.volume && st.volume.muted && level > 0) actions.setMuted(false);
    }

    // Scroll panel p's scrolling area by `px` (its controller clamps and keeps it).
    const scrollBy = (p, px) => p.ctrl.event({ type: 'scroll', value: p.style.shownScroll() + px });

    // Momentum: a drag let go while moving keeps scrolling at its speed, slowing down
    // (FLING.friction: the speed falls by e every 1 / friction s) until it's slow, reaches
    // either end, the panel goes away, or a trigger is pressed.
    const FLING = { minSpeed: 250, stopSpeed: 30, friction: 3.2, maxSpeed: 6000 };   // px/s, px/s, 1/s, px/s
    function startFling(d) {
      fling = Math.abs(d.vel) >= FLING.minSpeed
        ? { p: d.p, pos: d.last, vel: Math.max(-FLING.maxSpeed, Math.min(FLING.maxSpeed, d.vel)) } : null;
    }
    function stepFling(dt) {
      if (!fling) return;
      const f = fling, max = f.p.style.maxScroll ? f.p.style.maxScroll() : Infinity;
      f.pos += f.vel * dt;
      f.vel *= Math.exp(-FLING.friction * dt);
      const end = f.pos <= 0 || f.pos >= max;
      f.pos = Math.max(0, Math.min(max, f.pos));
      f.p.ctrl.event({ type: 'scroll', value: f.pos });
      lastActivity = performance.now();
      if (end || Math.abs(f.vel) < FLING.stopSpeed || !shown(f.p)) fling = null;
    }

    // Called once per frame. In order:
    //  1. read the current state (title, time, quality, ad ...) from the actions;
    //  2. for each controller: carry on any drag in progress, work out what its laser is
    //     pointing at (a panel, a handle on the cinema screen, nothing), handle the trigger
    //     (press, scrub/slide/drag while held, release = click) and the grip (grab the panel's
    //     bar or a handle), and set up the beam to draw;
    //  3. show the cinema screen's handles while the panel is up;
    //  4. ad handling (no scrubbing; pop up when Skip appears) and auto-hide;
    //  5. redraw each canvas only if something it shows has changed.
    let lastUpdate = 0;               // the previous update's time (ms), for frameDt
    let frameDt = 0;                  // seconds since the previous update (capped)
    // Step the opening / closing springs one frame (dt seconds) towards the real state.
    function stepAnims(dt) {
      anim.vis.step(visible ? 1 : 0, dt);
      anim.zone.step(ns.vrSafeZone.previewing() ? 1 : 0, dt);
      anim.bars.step(barsAwake ? 1 : 0, dt);
      anim.search.step(searchAwake ? 1 : 0, dt);
      anim.menu.step(menu && !kbShown ? 1 : 0, dt);
      anim.dialog.step(dialog ? 1 : 0, dt);
      anim.kb.step(kbShown ? 1 : 0, dt);
      for (const p of panels.values()) {
        let a = anim.open.get(p.reg.id);
        if (!a) anim.open.set(p.reg.id, a = ns.vrMotion.value('panel', 0));
        a.step(isOpen(p.reg.id) ? 1 : 0, dt);
      }
    }

    function update(frame, refSpace, inputSources, now, head) {
      frameDt = lastUpdate ? Math.min(100, now - lastUpdate) / 1000 : 0;
      lastUpdate = now;
      const st = actions.state();
      extrasNow = st.extras || null;
      const headPos = [head.x, head.y, head.z];
      const frameInfo = { st, now };
      refreshAvailable(st);                            // (before the ticks: a panel just gone is closed)
      for (const p of panels.values()) if (p.ctrl.tick) p.ctrl.tick(frameInfo);

      lastHead = headPos;
      if (ns.vrAppearanceOptions && scaledFor !== ns.vrAppearanceOptions.sizeVersion()) rescale();   // the panel size changed
      else if (laidOut !== ns.vrSafeZone.zone.version) relayout();   // the Safe Zone changed
      stepAnims(frameDt);
      stepFling(frameDt);
      const targetHovers = [];

      for (const src of inputSources) {
        const hand = src.handedness;
        const h = hands.get(hand) || { hover: null, trigger: false, grip: false, beam: null, targetHit: null,
          smoother: ns.createPoseSmoother() };
        hands.set(hand, h);
        h.beam = null;
        const rayPose = src.targetRaySpace && frame.getPose(src.targetRaySpace, refSpace);
        const gp = src.gamepad;
        const trigger = !!(gp && input.pressed(gp, TRIGGER));
        const grip = !!(gp && input.pressed(gp, GRIP));
        if (!rayPose) {
          h.hover = null; h.targetHit = null; h.trigger = trigger; h.grip = grip;
          if (pressed && pressed.hand === hand) pressed = null;
          if (scrub && scrub.hand === hand) scrub = null;
          if (volDrag && volDrag.hand === hand) volDrag = null;
          if (setDrag && setDrag.hand === hand) setDrag = null;
          h.seekFraction = null; h.scrollPanel = null; h.pagePanel = null; h.menuScroll = false;
          if (menuDrag && menuDrag.hand === hand) menuDrag = null;
          if (textDrag && textDrag.hand === hand) textDrag = null;
          if (grab && grab.hand === hand) grab = null;
          if (targetGrab && targetGrab.hand === hand) { targetGrab.target.grabEnd(headPos); targetGrab = null; }
          if (h.smoother) h.smoother.reset();        // tracking lost: start afresh, don't glide from the old pose
          continue;
        }
        // The laser works from a smoothed pose, so hand tremor doesn't shake the pointing,
        // clicks or what you hold (pose-smoother.js); fast moves pass through at once. How
        // much: the Laser settings tab (laser-options.js), which can turn it off.
        const smoothing = ns.vrLaserOptions.smoothing();
        if (!smoothing) h.smoother.reset();
        const m = smoothing ? h.smoother.filter(rayPose.transform.matrix, frameDt, smoothing) : rayPose.transform.matrix;
        const origin = [m[12], m[13], m[14]], dir = [-m[8], -m[9], -m[10]];

        // Moving the panel: it keeps its offset from the controller and turns to face you.
        if (grab && grab.hand === hand) {
          if (grip) faceToward(M.transformPoint(m, grab.local), headPos);
          else { grab = null; buzz(src, 0.3, 15); }
          lastActivity = now;
        }
        // Dragging another target (e.g. resizing or moving the cinema screen).
        if (targetGrab && targetGrab.hand === hand) {
          if (grip) targetGrab.target.grabMove(m, origin, dir, headPos);
          else { targetGrab.target.grabEnd(headPos); targetGrab = null; buzz(src, 0.3, 15); }
        }
        // Holding the keyboard by a corner: its size follows the laser along that corner's
        // diagonal (remembered), its top edge staying put. (Its
        // bar moves it like the controls panel's: `grab` above.)
        if (kbGrab && kbGrab.hand === hand) {
          if (!grip) {
            ns.storage.set(KB_SCALE_KEY, kbScale.toFixed(3));
            kbGrab = null; buzz(src, 0.3, 15);
          } else {
            const sz = kbSize(), r = intersect(origin, dir, kbModel(), sz);
            if (r) {
              const d = kbDiag(kbGrab.mode, [(r.u - 0.5) * sz[0], -r.v * sz[1]], kbGrab.size);
              kbScale = Math.min(kbCfg.maxScale, Math.max(kbCfg.minScale, kbGrab.startScale * d / kbGrab.startDiag));
            }
          }
        }

        // What is this laser on? The panel (only while shown) or another target; nearest wins.
        const inside = r => !!(r && r.u >= 0 && r.u <= 1 && r.v >= 0 && r.v <= 1);
        const mainHit = visible && !kbShown && !dialog ? intersect(origin, dir) : null;   // (the keyboard stands in for it; a dialog is modal)
        // Which surface the laser is on (nearest if several): 'main', 'orbit:<left | right |
        // pill | bar>', 'menu', 'dialog', 'keyboard' or a panel id. The orbiters, the menu and the
        // keyboard only where they're drawn (the rest of their canvas lets the laser through).
        const hits = { main: mainHit };
        if (visible) {
          for (const [name, o] of Object.entries(orbiters)) {
            if (name === 'pill' && kbShown) continue;      // the pill sits on the controls panel, not the keyboard
            const r = intersect(origin, dir, orbiterModel(name), o.size);
            if (inside(r) && o.ui.solidAt(r.u, r.v)) hits[`orbit:${name}`] = r;
          }
          if (menu && !kbShown) {                            // the floating menu (on its card only)
            const mm = menuModel(menu), r = mm && intersect(origin, dir, mm, menuSize);
            if (inside(r) && menuUi.solidAt(r.u, r.v)) hits.menu = r;
          }
        }
        for (const p of panels.values()) if (shown(p)) hits[p.reg.id] = intersect(origin, dir, panelModel(p), p.size);
        if (kbShown) {
          const r = intersect(origin, dir, kbModel(), kbSize());
          if (inside(r) && kb.solidAt(r.u, r.v)) hits.keyboard = r;
        }
        if (dialog) {                                        // a dialog is modal: only it can be pointed at
          for (const k of Object.keys(hits)) delete hits[k];
          const r = intersect(origin, dir, dialogModel(dp(56)), dialogSize);
          if (inside(r)) hits.dialog = r;
        }
        let surface = null;
        for (const [name, r] of Object.entries(hits)) {
          if (inside(r) && (!surface || r.t < hits[surface].t)) surface = name;
        }
        const hit = surface ? hits[surface] : mainHit;
        let onPanel = !!surface;
        const panelDist = onPanel ? hit.t : Infinity;
        let tHit = null;
        for (const t of dialog ? [] : targets) {             // (not while a dialog is up)
          const r = t.hit(origin, dir);
          if (r && r.t < panelDist && (!tHit || r.t < tHit.t)) tHit = { ...r, target: t };
        }
        if (tHit) onPanel = false;
        if (tHit && (!h.targetHit || h.targetHit.id !== tHit.id)) buzz(src, 0.15, 12);
        h.targetHit = tHit;
        if (tHit) targetHovers.push(tHit.id);

        const hp = onPanel ? panels.get(surface) || null : null;     // the site's panel it's on
        let target = null;
        if (onPanel && hp) {
          const r = hp.style.hitTest(hit.u, hit.v);
          target = r ? { ...r, id: `${hp.reg.id}${SEP}${r.id}` } : null;
        } else if (onPanel && surface === 'keyboard') {
          const r = kb.hitTest(hit.u, hit.v);
          target = r ? { id: `kb:${r.id}` } : null;
        } else if (onPanel && surface === 'menu') {
          target = menuUi.hitTest(hit.u, hit.v);
        } else if (onPanel && surface === 'dialog') {
          target = dialogUi.hitTest(hit.u, hit.v);
        } else if (onPanel && surface === 'orbit:bar') {
          // The search bar's controls belong to the top panel: '<its id>|field:...'.
          const r = orbiters.bar.ui.hitTest(hit.u, hit.v);
          target = r ? { id: `${topPanel.reg.id}${SEP}${r.id}` } : null;
        } else if (onPanel) target = surface.startsWith('orbit:') ? orbiters[surface.slice(6)].ui.hitTest(hit.u, hit.v) : ui.hitTest(hit.u, hit.v);
        const hover = target ? target.id : null;
        if (hover && hover !== h.hover) buzz(src, 0.15, 12);
        h.hover = hover;
        h.seekFraction = hover === 'seek' ? target.fraction : null;     // for the seek preview
        // On a panel's scrolling area: the stick scrolls it (up / down, smoothly while held)
        // instead of seeking, and its icon shows that (iconSwaps).
        h.scrollPanel = hp && hp.style.scrollAt && hp.style.scrollAt(hit.u, hit.v) ? hp : null;
        // (On a floating menu's list that scrolls, likewise: h.menuScroll.)
        h.menuScroll = surface === 'menu' && onPanel && menuUi.scrollAt(hit.u, hit.v);
        if ((h.scrollPanel || h.menuScroll) && gp) {
          const y = input.axisValue(gp, 'y');
          if (Math.abs(y) > STICK_DEADZONE) {
            fling = null;
            if (h.menuScroll) menuUi.scrollBy(y * SCROLL_SPEED * frameDt); else scrollBy(h.scrollPanel, y * SCROLL_SPEED * frameDt);
          }
        }
        // On a panel showing paging arrows (anywhere on it, outside a scrolling area): the
        // stick's left / right turns its pages instead (stickPage, called by the seek binding).
        h.pagePanel = hp && !h.scrollPanel && (hp.style.has('page:prev') || hp.style.has('page:next')) ? hp : null;
        if (onPanel) lastActivity = now;

        // Grip on a target starts dragging it; grip on the panel's grab bar picks the panel up.
        if (grip && !h.grip && tHit && !targetGrab) {
          targetGrab = { hand, target: tHit.target };
          tHit.target.grabStart(tHit.id, m, origin, dir, headPos);
          buzz(src, 0.5, 25);
        } else if (grip && !h.grip && hover === 'grab' && !grab) {
          grab = { hand, local: toLocal(m, [model[12], model[13], model[14]]) };
          buzz(src, 0.5, 25);
        } else if (grip && !h.grip && isKbHandle(hover) && !kbGrab) {
          const id = hover.slice(3);
          if (id === 'grab') grab = { hand, local: toLocal(m, [model[12], model[13], model[14]]) };   // moves the shared place
          else {
            // Resizing is relative to where you grabbed, so the keyboard doesn't jump.
            const sz = kbSize(), d = kbDiag(id, [(hit.u - 0.5) * sz[0], -hit.v * sz[1]], sz);
            kbGrab = { hand, mode: id, size: sz, startScale: kbScale, startDiag: d > 0.05 ? d : 1 };
          }
          buzz(src, 0.5, 25);
        }

        // Trigger press / drag / release. A press on nothing (no panel, no target) lets go of
        // what was last clicked: typing stops (the panel gets Escape, which puts away a
        // keyboard that came up for it), an open menu on the controls panel closes, and a
        // dialog is cancelled (anywhere off it counts, as with M3's scrim).
        // With everything hidden (auto-hide, or the left D-pad), a trigger pull brings the
        // panels back, and the lasers with them (they only show while the panels do).
        if (trigger && !h.trigger) fling = null;                      // any press stops a scroll that keeps going
        if (trigger && !h.trigger && !visible && !tHit) { visible = true; lastActivity = now; buzz(src, 0.3, 15); }
        else if (trigger && !h.trigger && !onPanel && !tHit) {
          if (typing) { lastActivity = now; typing.ctrl.event({ type: 'key', value: 'Escape' }); }
          menu = null;
          closeDialog(false);
        }
        if (trigger && !h.trigger && hover) {
          pressed = { hand, id: hover };
          if (hover === 'seek') scrub = { hand, time: target.fraction * st.duration };
          if (hover === 'vol:slider') { volDrag = { hand, level: target.fraction * 100 }; setVolume(volDrag.level, st); }
          const local = hp && localOf(hover, hp);
          if (local && local.startsWith('slider:')) {                 // a panel's slider: follows the laser
            setDrag = { hand, p: hp, local, fraction: target.fraction };
            sendEvent(hp, local, { fraction: target.fraction });
          }
          // On a scrolling area (or a scrolling menu): may become a drag (scroll) instead of a click.
          if (h.menuScroll) menuDrag = { hand, v: hit.v, scroll: menuUi.shownScroll(), moved: false };
          if (h.scrollPanel) {
            const scroll = hp.style.shownScroll();
            textDrag = { hand, p: hp, v: hit.v, scroll, moved: false, last: scroll, at: now, vel: 0 };
          }
          // A keyboard key acts at once (typing shouldn't wait for the release), and types
          // again while held.
          if (hover.startsWith('kb:')) {
            kbPress(hover.slice(3));
            if (kb.repeats(hover.slice(3))) kbRepeat = { hand, id: hover, next: now + kbCfg.repeatDelay };
          }
          buzz(src, 0.4, 20);
        } else if (trigger && kbRepeat && kbRepeat.hand === hand) {
          if (hover !== kbRepeat.id) kbRepeat = null;                  // moved off the key: no more repeats
          else if (now >= kbRepeat.next) { kbPress(hover.slice(3)); kbRepeat.next = now + kbCfg.repeatEvery; buzz(src, 0.2, 10); }
        } else if (trigger && menuDrag && menuDrag.hand === hand) {
          // Dragging a scrolling menu's list (measured on the menu's plane); a press that
          // never moved stays a click.
          const mm = menu ? menuModel(menu) : null, r = mm && intersect(origin, dir, mm, menuSize);
          if (r) {
            const dy = (r.v - menuDrag.v) * menuUi.pxPerV;
            if (!menuDrag.moved && Math.abs(dy) > DRAG_THRESHOLD) menuDrag.moved = true;
            if (menuDrag.moved) menuUi.scrollTo(menuDrag.scroll - dy);
          }
        } else if (trigger && textDrag && textDrag.hand === hand) {
          // Drag the content like a touch screen (measured on the panel's plane, so it keeps
          // following off the panel's edge); a press that never moved stays a click.
          const tp = textDrag.p;
          const r = shown(tp) ? intersect(origin, dir, panelModel(tp), tp.size) : null;
          if (r) {
            const dy = (r.v - textDrag.v) * tp.style.pxPerV;
            if (!textDrag.moved && Math.abs(dy) > DRAG_THRESHOLD) textDrag.moved = true;
            if (textDrag.moved) {
              // Its speed (px/s, eased over the last few frames) for the momentum on letting go.
              const value = textDrag.scroll - dy, dt = Math.max(1e-3, (now - textDrag.at) / 1000);
              textDrag.vel += ((value - textDrag.last) / dt - textDrag.vel) * Math.min(1, dt / 0.05);
              textDrag.last = value; textDrag.at = now;
              tp.ctrl.event({ type: 'scroll', value });
            }
          }
        } else if (trigger && setDrag && setDrag.hand === hand) {
          // Keeps following the laser off the slider (measured on its panel's plane).
          const sp = setDrag.p;
          const r = shown(sp) ? intersect(origin, dir, panelModel(sp), sp.size) : null;
          if (r) {
            const f = sp.style.sliderFraction(r.u);
            if (Math.abs(f - setDrag.fraction) > 0.002) { setDrag.fraction = f; sendEvent(sp, setDrag.local, { fraction: f }); }
          }
        } else if (trigger && scrub && scrub.hand === hand) {
          if (mainHit) scrub.time = ui.seekFraction(mainHit.u) * st.duration;   // keeps following off the bar
        } else if (trigger && volDrag && volDrag.hand === hand) {
          // Keeps following the laser off the slider (measured on the menu's plane).
          const mm = menu === 'volume' ? menuModel('volume') : null, r = mm && intersect(origin, dir, mm, menuSize);
          if (r) {
            const level = menuUi.volumeFraction(r.u) * 100;
            if (Math.round(level) !== Math.round(volDrag.level)) { volDrag.level = level; setVolume(level, st); }
          }
        } else if (!trigger && h.trigger) {
          if (volDrag && volDrag.hand === hand) volDrag = null;
          const slid = !!(setDrag && setDrag.hand === hand);          // a slider: no click on release
          if (slid) setDrag = null;
          const dragged = !!(textDrag && textDrag.hand === hand && textDrag.moved) || !!(menuDrag && menuDrag.hand === hand && menuDrag.moved);
          if (dragged && textDrag && textDrag.hand === hand) startFling(textDrag);   // it keeps going (momentum)
          if (menuDrag && menuDrag.hand === hand) menuDrag = null;
          if (textDrag && textDrag.hand === hand) textDrag = null;
          if (kbRepeat && kbRepeat.hand === hand) kbRepeat = null;
          if (scrub && scrub.hand === hand) { actions.seekTo(scrub.time); scrub = null; }
          else if (!dragged && !slid && pressed && pressed.hand === hand && pressed.id === hover && !hover.startsWith('kb:')) click(hover);
          if (pressed && pressed.hand === hand) pressed = null;
          lastActivity = now;
        }
        h.trigger = trigger;
        h.grip = grip;

        // Beam: always while the panels or the keyboard are shown; otherwise only while on or
        // holding a target.
        const len = cfg.laser.length;
        const holding = targetGrab && targetGrab.hand === hand;
        if (tHit) h.beam = { hand, from: origin, to: tHit.point, hit: tHit.point };
        else if (onPanel) h.beam = { hand, from: origin, to: hit.point, hit: hit.point };
        else if (visible || kbShown || holding) h.beam = { hand, from: origin, to: [origin[0] + dir[0] * len, origin[1] + dir[1] * len, origin[2] + dir[2] * len], hit: null };
      }

      // Targets show their handles while the panel is up, or while pointed at / held.
      for (const t of targets) t.setHighlight(visible || targetHovers.length > 0 || !!targetGrab, targetHovers);

      // Ads: no scrubbing the main video meanwhile, and the panel pops up when Skip becomes
      // available (so the button is in reach without looking for it).
      const ad = st.ad || null;
      if (ad && scrub) scrub = null;
      const canSkip = !!(ad && ad.skippable && ad.canSkipInVR);
      if (canSkip && !adSkippable) { visible = true; lastActivity = now; }
      adSkippable = canSkip;

      // Auto-hide while playing and nobody is using it (typing into a panel, or the keyboard
      // being up, counts as using it), each part after its own wait (Settings → Auto-hide,
      // fade-options.js): everything (the controls panel, the open panels, the lasers), the
      // side toolbars with their open panels, the search bar. Pointing at anything (where a
      // faded one is, too) brings them back.
      const F = ns.vrFadeOptions, unused = now - lastActivity;
      const idle = !st.paused && !scrub && !setDrag && !pressed && !grab && !menu && !dialog && !canSkip && !typingNow() && !kbShown;
      if (visible && idle && unused > F.seconds('panels') * 1000) visible = false;
      barsAwake = !(idle && unused > F.seconds('bars') * 1000);
      searchAwake = !(idle && unused > F.seconds('search') * 1000);

      // The keyboard: redrawn only when its keys (Shift, page, layout), what's pointed at or
      // pressed, or what you're typing into change.
      if (kbShown) {
        let kh = null;
        for (const h of hands.values()) if (h.hover && h.hover.startsWith('kb:')) kh = h.hover.slice(3);
        const kp = kbGrab ? kbGrab.mode : grab ? 'grab'
          : pressed && pressed.id.startsWith('kb:') ? pressed.id.slice(3) : null;
        const target = typingNow() ? labelOf(typing.reg) : null;
        const kKey = [kb.version(), ns.i18n.version(), ns.vrTokens.glass.version, kh, kp, target, kb.animating() ? now : ''].join('|');   // every frame while a key eases
        if (kKey !== kbKey) { kb.draw({ hover: kh, pressed: kp, target }); kbPass.upload(); kbKey = kKey; }
      }

      // Redraw the canvas only when something visible changed.
      let hover = null;
      for (const h of hands.values()) if (h.hover) hover = h.hover;
      let topModel = null;
      if (visible) {
        const quality = st.quality || { current: null, levels: [] };
        const format = st.format || { current: null, options: [] };
        const currentFormat = format.options.find(o => o.id === format.current);
        let menuState = null;
        if (menu === 'quality') {
          menuState = {
            items: quality.levels.map(q => ({ id: `q:${q.id}`, text: q.label, on: q.id === quality.current, icons: q.icons })),
            note: quality.levels.length ? null : tr('panel.noQualities', { site: site.name || tr('panel.theSite') }),
          };
        } else if (menu === 'format') {
          menuState = {
            items: format.options.map(o => ({ id: `f:${o.id}`, text: o.short, on: o.id === format.current, disabled: o.disabled })),
            note: null,
          };
        } else if (menu === 'speed') {
          const speed = st.speed || 1;
          menuState = { items: (st.speeds || [1]).map(r => ({ id: `s:${r}`, text: ns.vrPanelUI.speedName(r), on: r === speed })), note: null };
        } else if (menu && menu.startsWith('x:')) {      // a site button's menu (its items' ids: 'xi:<button>:<item>')
          const x = extraOf(menu.slice(2)), mm = x && x.menu;
          if (mm) menuState = { ...mm, key: menu, items: (mm.items || []).map(it => ({ ...it, id: `xi:${x.id}:${it.id}` })) };
          else menu = null;                            // the button went away
        }
        const volume = st.volume || { level: 100, muted: false };
        muted = !!volume.muted;
        const shownVolume = volDrag ? { level: volDrag.level, muted: false } : volume;
        if (menu === 'volume') menuState = { volume: shownVolume };

        // Seek preview: while scrubbing, or while a laser rests on the seek bar.
        let previewTime = scrub ? scrub.time : null;
        if (previewTime == null) for (const h of hands.values()) if (h.seekFraction != null) previewTime = h.seekFraction * st.duration;
        let preview = null;
        if (previewTime != null && st.duration) {
          let frame = null;
          try { frame = actions.storyboard ? actions.storyboard(previewTime) : null; } catch (_) { /* no storyboard */ }
          preview = { time: previewTime, frame };
        }

        const state = {
          title: st.title, time: st.time, duration: st.duration, paused: st.paused, buffered: st.buffered != null ? st.buffered : null,
          live: st.live || null, nowPlaying: st.nowPlaying || null, now,
          hover, pressed: pressed && pressed.id, scrubTime: scrub ? scrub.time : null,
          quality, format: { id: format.current, label: currentFormat ? currentFormat.short : '' },
          speed: st.speed || 1, volume: shownVolume, chapters: st.chapters || [], heatmap: st.heatmap || [], preview, ad,
          menuOpen: menu, grabbing: !!grab,
          extras: extrasNow ? { left: (extrasNow.left || []).map(stripMenu), right: (extrasNow.right || []).map(stripMenu) } : null,
        };
        const pf = preview && preview.frame;
        const key = [state.title, Math.floor(state.time), Math.floor(state.duration), state.paused, state.buffered != null ? Math.floor(state.buffered) : '',
          JSON.stringify(state.nowPlaying), JSON.stringify(state.extras), state.hover, state.pressed, scrub ? Math.round(scrub.time * 4) : '',
          quality.current, quality.levels.map(q => q.id).join(','), format.current, menu, !!grab,
          state.speed, Math.round(shownVolume.level), shownVolume.muted, state.chapters.length, state.heatmap.length,
          preview ? Math.round(preview.time) : '', pf ? `${pf.url}#${pf.col},${pf.row}` : '', previewLoaded,
          ad ? `${Math.round(ad.position * 4)}/${Math.round(ad.duration)}/${ad.pod}/${ad.skippable}/${ad.skipIn}/${ad.canSkipInVR}` : '',
          state.live ? `${state.live.atHead}/${Math.floor(state.live.behind)}/${state.live.dvr}` : '',
          ui.titleMoving() ? Math.floor(now / 33) : '', ns.i18n.version(), ns.vrTokens.glass.version, ui.animating() ? now : ''].join('|');   // a scrolling title: ~30 redraws a second; easing: every frame
        if (key !== drawnKey) { ui.draw(state); panelPass.upload(); drawnKey = key; }

        // The floating menu and the dialog (redrawn when what they show, or what's pointed
        // at on them, changes, and every frame while something on them eases).
        if (menuState) {
          menuShown = menu;
          const mKey = [JSON.stringify(menuState), hover, pressed && pressed.id, Math.round(menuUi.shownScroll()), ns.i18n.version(), ns.vrTokens.glass.version, menuUi.moving() ? now : ''].join('|');
          if (mKey !== menuKey) { menuUi.draw(menuState, { hover, pressed: pressed && pressed.id }); menuPass.upload(); menuKey = mKey; }
        }
        if (dialog) {
          const dKey = [JSON.stringify(dialog.d), hover, pressed && pressed.id, ns.i18n.version(), ns.vrTokens.glass.version, dialogUi.moving() ? now : ''].join('|');
          if (dKey !== dialogKey) { dialogUi.draw(dialog.d, { hover, pressed: pressed && pressed.id }); dialogPass.upload(); dialogKey = dKey; }
        }

        // Hover card: pointing at Previous / Next in a list shows the card it leads to
        // (nowPlaying.queue.prev / next, cards made by the provider).
        const q = state.nowPlaying && state.nowPlaying.queue;
        const cardItem = q && !ad ? (hover === 'pl:prev' ? q.prev : hover === 'pl:next' ? q.next : null) : null;
        const cardRect = cardItem && ui.rectOf(hover);
        hoverShown = cardRect ? { rect: cardRect } : null;
        if (hoverShown) {
          const label = hover === 'pl:prev' ? tr('panel.previousVideo') : tr('panel.nextVideo');
          const card = cardItem;
          const hKey = [JSON.stringify(card), label, hoverImages, ns.vrTokens.glass.version].join('|');
          if (hKey !== hoverKey) { hoverCard.draw(card, label); hoverPass.upload(); hoverKey = hKey; }
        }

        // The top panel's controller is asked every frame (its search bar is always shown):
        // { model, key } as any panel's, plus bar (the bar's field) and open (show the panel).
        if (topPanel) {
          topModel = topPanel.ctrl.model(frameInfo);
          topPanel.topOpen = !!topModel.open; topPanel.bar = topModel.bar || null;
        }

        // The toolbars, the pill and the search bar (redrawn every frame while one eases).
        const openItems = {};
        for (const id of panels.keys()) openItems[`toggle:${id}`] = isOpen(id);
        for (const [name, o] of Object.entries(orbiters)) {
          const barUi = name === 'bar' ? { hover: localOf(hover, topPanel), pressed: localOf(pressed && pressed.id, topPanel) } : null;
          const oKey = [name === 'bar' ? JSON.stringify([topPanel.bar, barUi, topPanel.topOpen]) : JSON.stringify(openItems), hover, pressed && pressed.id,
            ns.i18n.version(), ns.vrTokens.glass.version, o.ui.moving() ? now : ''].join('|');
          if (oKey === o.key) continue;
          if (name === 'pill') o.ui.draw({ open: isOpen(popupPanel.reg.id), hover, pressed: pressed && pressed.id });
          else if (name === 'bar') o.ui.draw(topPanel.bar || {}, barUi, topPanel.topOpen, now);
          else o.ui.draw({ open: openItems, hover, pressed: pressed && pressed.id, now });
          o.pass.upload();
          o.key = oKey;
        }
      }

      // The open panels (while the panels are up; one that stays, also while they're hidden):
      // each controller says what to show (and a key that changes whenever that would look
      // different); redrawn only when the key, the hover / pressed control or the loaded
      // images change.
      for (const p of panels.values()) {
        if (!shown(p)) continue;
        const { model: pm, key: ck } = p === topPanel ? topModel : p.ctrl.model(frameInfo);
        const pui = { hover: localOf(hover, p), pressed: localOf(pressed && pressed.id, p) };
        const pKey = [ck, pui.hover, pui.pressed, p.style.imagesReady(), ns.i18n.version(), ns.vrTokens.glass.version,
          p.style.animating && p.style.animating() ? now : ''].join('\u0001');   // every frame while a hover / press eases
        if (pKey !== p.key) {
          p.style.draw(pm, pui);
          if (p.ctrl.afterDraw) p.ctrl.afterDraw();
          try { p.pass.upload(); } catch (err) { console.warn(`[streamxr] ${p.reg.id} panel blocked (images):`, err); }
          p.key = pKey;
        }
      }
    }

    // Run fn(view) once per eye with the viewport set to that eye's part of the layer.
    function eachView(viewerPose, layer, fn) {
      for (const view of viewerPose.views) {
        const vp = layer.getViewport(view);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        fn(view);
      }
    }

    // Where the hover card goes: anchored just above the control (`rect`, controls canvas
    // pixels; centred on it but kept within the panel's width), in the controls panel's
    // tilt, HOVER_CARD_RAISE higher and pulled 32 dp towards you (a popup).
    const hoverSize = metres(hoverCard.canvas);
    const HOVER_CARD_RAISE = 0.02;        // metres higher (along the panel's up direction)
    function hoverCardModel(rect) {
      const [cw, ch] = hoverSize;
      const cx = ((rect.x + rect.w / 2) / ui.width - 0.5) * size[0];
      const x = Math.max(-size[0] / 2 + cw / 2, Math.min(size[0] / 2 - cw / 2, cx));
      const top = (0.5 - rect.y / ui.height) * size[1];
      return M.multiply(model, M.translation(x, top + 0.012 + ch / 2 + HOVER_CARD_RAISE, dp(32)));
    }

    // Draw the controls panel (or the keyboard in its place), the open panels, the toolbars
    // and the pill, the popup and the hover card, after the video. Depth testing is on so the
    // panels hide properly behind each other. backdrop: what's behind the panels for the
    // glass look (the video renderer's backdrop(); panel-pass.js), or null. The toolbars, the
    // search bar and the dialog get it too (glass where they're see-through, the rim's shine on
    // their edges; where they stand over a panel they're solid), and so does the menu. The hover card
    // gets none: its tinted background shows the panel behind it rather than a hole
    // through to the video.
    //
    // Opening and closing ease (anim, stepped in update): each surface is drawn faded and a
    // little smaller while it comes or goes - everything with `vis`; the controls panel and
    // the keyboard cross-fading in their shared place with `kb`; each side panel growing out
    // from its inner edge (its toolbar), the popup up from its bottom edge (the pill), each
    // with its own `open`, so switching panels shows one folding away as the other unfolds.
    // Anything still fading doesn't write depth, so it never hides what's behind it.
    const scaled = (m, pivot, s) => M.multiply(m, M.multiply(M.translation(pivot[0], pivot[1], 0),
      M.multiply(new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]), M.translation(-pivot[0], -pivot[1], 0))));
    // The point a panel grows from (its own metres from its centre).
    const pivotOf = p => (p.zone === 'left' ? [p.size[0] / 2, 0] : p.zone === 'right' ? [-p.size[0] / 2, 0]
      : p.zone === 'top' ? [0, p.size[1] / 2] : [0, -p.size[1] / 2]);   // the top panel from its top edge (the bar)
    const shrink = v => 0.92 + 0.08 * v;                  // the scale at an eased amount (overshoot allowed)
    function drawPanel(viewerPose, layer, backdrop = null) {
      if (!fovMeasured) { ns.vrSafeZone.measure(viewerPose); fovMeasured = true; }
      const V = Math.min(1, Math.max(0, anim.vis.get()));
      const staying = [...panels.values()].some(p => p.reg.stays && isOpen(p.reg.id));   // (drawn while the rest is hidden)
      if (V < 0.01 && !staying) return;
      const K = Math.min(1, Math.max(0, anim.kb.get())), vRaw = anim.vis.get(), kRaw = anim.kb.get();
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      // What to draw: [pass, model, size, backdrop, alpha], the controls panel / keyboard
      // scaled about their centre, the panels about the point they grow from; the panels
      // before the orbiters on them.
      const items = [];
      const cpA = V * (1 - K), kbA = V * K, C = [0, 0];
      if (cpA > 0.01) items.push([panelPass, scaled(model, C, shrink(vRaw) * shrink(1 - kRaw)), size, backdrop, cpA]);
      if (kbA > 0.01) items.push([kbPass, scaled(kbModel(), C, shrink(vRaw) * shrink(kRaw)), kbSize(), backdrop, kbA]);
      // (a side panel also fades with its side's toolbar: anim.bars, the side toolbars' own
      // wait; one that stays fades with neither, only opening and closing)
      const B = Math.min(1, Math.max(0, anim.bars.get()));
      for (const p of panels.values()) {
        const a = anim.open.get(p.reg.id), o = a ? a.get() : 0, stays = !!p.reg.stays;
        const oa = Math.min(1, Math.max(0, o)) * (stays ? 1 : V * (p.zone === 'left' || p.zone === 'right' ? B : 1));
        if (oa > 0.01 && (p.zone === 'controls' || p.pose)) items.push([p.pass, scaled(panelModel(p), pivotOf(p), shrink(o) * (stays ? 1 : shrink(vRaw))), p.size, backdrop, oa]);
      }
      for (const [name, o] of Object.entries(orbiters)) {
        // the pill goes with the controls panel; the side toolbars and the search bar also
        // fade on their own (barsAwake, searchAwake)
        const a = name === 'pill' ? cpA : V * Math.min(1, Math.max(0, (name === 'bar' ? anim.search : anim.bars).get()));
        if (a > 0.01 && (name === 'pill' || name === 'bar' || sides[name])) items.push([o.pass, scaled(orbiterModel(name), C, shrink(vRaw)), o.size, backdrop, a]);
      }
      if (hoverShown && !kbShown && cpA > 0.01) items.push([hoverPass, hoverCardModel(hoverShown.rect), hoverSize, null, cpA]);
      // The floating menu, growing up from its button (its canvas's bottom edge).
      const MA = Math.min(1, Math.max(0, anim.menu.get())) * cpA, mm = MA > 0.01 && menuShown ? menuModel(menuShown) : null;
      if (mm) items.push([menuPass, scaled(mm, [0, -menuSize[1] / 2], shrink(anim.menu.get())), menuSize, backdrop, MA]);
      // Settled ones first (writing depth), then the ones still fading.
      items.sort((a, b) => (b[4] > 0.99) - (a[4] > 0.99));
      eachView(viewerPose, layer, view => {
        for (const [pass, m, sz, bd, alpha] of items) {
          gl.depthMask(alpha > 0.99);
          pass.draw(view, m, sz, bd, alpha);
        }
      });
      // A dialog over everything: the scrim (no depth written, so nothing behind it is
      // hidden from what's drawn later), then the card, rising and growing in as it opens.
      const DA = Math.min(1, Math.max(0, anim.dialog.get()));
      if (DA > 0.01 && dialogShown) {
        const sm = dialogModel(dp(48)), dm = scaled(dialogModel(dp(56)), C, shrink(DA));
        eachView(viewerPose, layer, view => {
          gl.depthMask(false); scrimPass.draw(view, sm, SCRIM_SIZE, null, DA);
          gl.depthMask(DA > 0.99); dialogPass.draw(view, dm, dialogSize, backdrop, DA);
        });
        gl.depthMask(true);
      }
      // The Safe Zone's outline over everything (a guide while you adjust it).
      const Z = Math.min(1, Math.max(0, anim.zone.get())) * V;
      if (Z > 0.01) {
        gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
        eachView(viewerPose, layer, view => zonePass.draw(view, Z));
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    }

    // Draw each controller's beam (worked out in update) last, over everything else. fades:
    // { left?, right? } how solid each controller is drawn (controllers.js alphas(): a
    // controller left idle fades, and its beam with it); missing = solid.
    function drawLasers(viewerPose, layer, fades) {
      const beams = [...hands.values()].map(h => h.beam).filter(Boolean)
        .map(b => ({ ...b, alpha: fades && fades[b.hand] != null ? fades[b.hand] : 1 }));
      if (!beams.length) return;
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      eachView(viewerPose, layer, view => laserPass.draw(view, beams, cfg.laser));
      gl.disable(gl.DEPTH_TEST);
    }

    // Free the GPU objects (called when the VR session ends).
    function dispose() {
      for (const t of KEY_EVENTS) window.removeEventListener(t, onKey, true);
      panelPass.dispose(); laserPass.dispose(); hoverPass.dispose(); kbPass.dispose(); zonePass.dispose();
      menuPass.dispose(); dialogPass.dispose(); scrimPass.dispose();
      if (dialog) closeDialog(false);                       // nobody can answer it now
      for (const o of Object.values(orbiters)) o.pass.dispose();
      for (const p of panels.values()) p.pass.dispose();
    }

    return { place, resetSettings, toggleVisible, toggleKeyboard, claimsGrip, stickScrolls, stickPages, stickPage, iconSwaps, setTargets, update, drawPanel, drawLasers, dispose,
      isVisible: () => visible, isKeyboardShown: () => kbShown };
  }

  ns.vrPanel = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
