// Turns controller state into actions, once per press (edge-triggered), or once per hold
// for bindings with `hold`, using the bindings in src/core/shared/controls.js.
(function (ns) {
  'use strict';

  const { BINDINGS } = ns.controls;

  // A controller's stick position, -1..1. WebXR gamepads put the thumbstick on axes 2 and 3
  // (axes 0 and 1 are a touchpad that these controllers lack), so fall back to 0 and 1.
  const axisValue = (gp, axis) => (axis === 'x' ? (gp.axes[2] ?? gp.axes[0] ?? 0) : (gp.axes[3] ?? gp.axes[1] ?? 0));
  // Is button number i down? (Missing buttons count as up.)
  const pressed = (gp, i) => !!(gp.buttons[i] && gp.buttons[i].pressed);

  // actions: { toggle(), recenter(), seek(delta), panel(), ... } - bindings without a
  // handler here (e.g. 'select', handled by the VR panel) are ignored.
  // onSource(src): called for every controller each poll.
  // Bindings with `hold` fire once the button has been held that long; holds() reports the
  // ones being held right now, for the countdown on the controller models.
  function createInputHandler(actions, onSource) {
    const previous = new Map();                          // handedness -> { bindingIndex: state }
    const held = new Map();                              // `${hand}|${bindingIndex}` -> { since (ms), fired, hand, binding }

    // Call once per frame with session.inputSources. A binding fires on the frame it goes
    // from "not pressed" to "pressed" (buttons) or from centred/other side to a side (sticks),
    // not every frame it's held: that's what the `previous` snapshot is for.
    function poll(inputSources) {
      for (const src of inputSources) {
        const gp = src.gamepad;
        if (!gp) continue;
        if (onSource) onSource(src);
        const prev = previous.get(src.handedness) || {};
        const now = {};
        BINDINGS.forEach((b, i) => {
          if (b.hand && b.hand !== src.handedness) return;       // binding is for the other hand
          if (b.buttons) {
            // Any of the listed buttons counts (e.g. B, X and Y all arrive as one button).
            const down = b.buttons.some(k => pressed(gp, k));
            now[i] = down;
            if (b.hold) holdStep(b, i, down, src);
            else if (down && !prev[i]) run(b, 1, src);
          } else if (b.axis) {
            // Stick: -1, 0 or 1 once past the threshold, so a push fires once per direction.
            const v = axisValue(gp, b.axis);
            const dir = v > b.threshold ? 1 : v < -b.threshold ? -1 : 0;
            now[i] = dir;
            if (dir && dir !== prev[i]) run(b, dir, src);
          }
        });
        previous.set(src.handedness, now);
      }
      // A controller that went away isn't holding anything any more.
      const present = new Set(Array.from(inputSources, s => s.handedness));
      for (const [key, h] of held) if (!present.has(h.hand)) held.delete(key);
    }

    // A hold binding, each poll: start timing on the press, run the action once when the
    // time is up (letting go first cancels it), forget it on release.
    function holdStep(b, i, down, src) {
      const key = `${src.handedness}|${i}`;
      if (!down) { held.delete(key); return; }
      const now = performance.now();
      const h = held.get(key) || { since: now, fired: false, hand: src.handedness, binding: b };
      held.set(key, h);
      if (!h.fired && now - h.since >= b.hold * 1000) { h.fired = true; run(b, 1, src); }
    }

    // The hold bindings being held now, per hand: { right?: { part, fraction (0..1),
    // secondsLeft (whole seconds, counting down), done (it has run; shown until let go) } }.
    function holds() {
      const out = {}, now = performance.now();
      for (const h of held.values()) {
        const fraction = h.fired ? 1 : Math.min(1, (now - h.since) / (h.binding.hold * 1000));
        out[h.hand] = { part: h.binding.part, fraction, done: h.fired,
          secondsLeft: Math.max(1, Math.ceil(h.binding.hold * (1 - fraction))) };
      }
      return out;
    }

    // Call the handler for a binding's action. Seek is passed signed seconds (direction *
    // step); everything else just gets the controller that triggered it.
    function run(binding, dir, src) {
      const fn = actions[binding.action];
      if (!fn) return;
      if (binding.action === 'seek') fn(dir * binding.step, src);
      else fn(src);
    }

    return { poll, holds };
  }

  ns.input = { createInputHandler, axisValue, pressed };
})(globalThis.__streamxr = globalThis.__streamxr || {});
