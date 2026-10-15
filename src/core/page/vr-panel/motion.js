// Motion for the VR panels (Material 3 Expressive springs; docs/Materials-Redesign.md, step
// 5): how far each control is pointed at (hover, 0..1) and pressed (press, 0..1), easing
// towards the laser's state instead of switching at once. Each panel canvas keeps one
// tracker; its drawing code reads the amounts instead of "is it hovered / pressed".
//
//   const motion = ns.vrMotion.create();
//   ui = motion.step(ui)      at the start of a draw: steps every control's springs towards
//                             ui.hover / ui.pressed, and returns ui with ui.anim attached
//   motion.moving()           true while a spring hasn't settled (keep redrawing)
//   ns.vrMotion.of(ui, id)    -> { h, p }: the control's hover and press amounts (0..1;
//                             with no tracker attached, 1 or 0 from ui.hover / ui.pressed)
//   ns.vrMotion.lerp(a, b, t) a straight blend
//   ns.vrMotion.value(spring, x) one eased value stepped by the caller (panels opening; see below)
//
// The springs (M3 Expressive's motion tokens, as damping ratio and stiffness):
//   press: the "fast spatial" spring, a little bouncy (shapes squaring up and back),
//   hover: the "fast effects" spring, no bounce (the ring and tints fading),
//   open:  the "default spatial" spring, calmer (the floating menus).
//   panel: the same speed with no bounce, for whole panels (showing / hiding them, a side
//          panel opening, the toolbars and search bar, the keyboard swap): Android XR asks
//          large things to move without overshooting.
//   dialog: no bounce and slower, for a dialog rising towards you (Android XR's guidance).
// Time steps start from zero after a pause (a panel redraws only when something changes,
// so the last draw can be long ago) and are capped, so a dropped frame doesn't skip.
(function (ns) {
  'use strict';

  const SPRINGS = {
    press: { damping: 0.6, stiffness: 800 },     // M3E fast spatial
    hover: { damping: 1.0, stiffness: 3800 },    // M3E fast effects
    open: { damping: 0.8, stiffness: 380 },      // M3E default spatial (menus)
    panel: { damping: 1.0, stiffness: 380 },     // no bounce (whole panels)
    dialog: { damping: 1.0, stiffness: 220 },    // no bounce, a little slower (Android XR: dialogs rise without bouncing)
  };
  const MAX_DT = 0.05, SUBSTEP = 0.004;          // seconds
  const REST = 0.002;                            // settled: within this of the goal, nearly still

  // One spring value (x, velocity v) one step dt towards `goal` (semi-implicit Euler in
  // small sub-steps, stable for the stiff hover spring). Returns true while still moving.
  function spring(s, goal, cfg, dt) {
    const k = cfg.stiffness, c = 2 * cfg.damping * Math.sqrt(k);
    for (let t = 0; t < dt; t += SUBSTEP) {
      const h = Math.min(SUBSTEP, dt - t);
      s.v += (-k * (s.x - goal) - c * s.v) * h;
      s.x += s.v * h;
    }
    if (Math.abs(s.x - goal) < REST && Math.abs(s.v) < 0.05) { s.x = goal; s.v = 0; return false; }
    return true;
  }

  function create() {
    const items = new Map();                     // control id -> { h: spring, p: spring }
    let last = null, moving = false;

    function step(ui) {
      ui = ui || {};
      const now = performance.now();
      const dt = moving && last != null ? Math.min(MAX_DT, Math.max(0, (now - last) / 1000)) : 0;
      last = now;
      for (const id of [ui.hover, ui.pressed]) if (id != null && !items.has(id)) items.set(id, { h: { x: 0, v: 0 }, p: { x: 0, v: 0 } });
      moving = false;
      for (const [id, it] of items) {
        const hGoal = ui.hover === id ? 1 : 0, pGoal = ui.pressed === id ? 1 : 0;
        const a = spring(it.h, hGoal, SPRINGS.hover, dt), b = spring(it.p, pGoal, SPRINGS.press, dt);
        // Not moving yet but not at the goal: the first step of a change (dt 0) - it moves next.
        if (a || b || it.h.x !== hGoal || it.p.x !== pGoal) moving = true;
        else if (!hGoal && !pGoal) items.delete(id);   // back at rest: forget it
      }
      const anim = id => { const it = items.get(id); return it ? { h: clamp01(it.h.x), p: Math.max(0, it.p.x) } : { h: 0, p: 0 }; };
      return { ...ui, anim };
    }

    return { step, moving: () => moving };
  }

  const clamp01 = x => Math.min(1, Math.max(0, x));
  // A control's amounts from a ui (with or without a tracker).
  const of = (ui, id) => (ui && ui.anim ? ui.anim(id) : { h: ui && ui.hover === id ? 1 : 0, p: ui && ui.pressed === id ? 1 : 0 });
  const lerp = (a, b, t) => a + (b - a) * t;

  // One eased value (e.g. how open a panel is, 0..1) on a named spring, stepped by the
  // caller each frame: v.step(goal, dt seconds) -> still moving; v.get() -> the value (it
  // may pass the goal a little and come back); v.set(x) jumps there.
  function value(springName, x = 0) {
    const s = { x, v: 0 }, cfg = SPRINGS[springName];
    return {
      get: () => s.x,
      set: nx => { s.x = nx; s.v = 0; },
      step: (goal, dt) => (s.x === goal && s.v === 0 ? false : spring(s, goal, cfg, Math.min(MAX_DT, Math.max(0, dt)))),
    };
  }

  ns.vrMotion = { create, of, lerp, value, SPRINGS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
