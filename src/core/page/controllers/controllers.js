// The controller layer: follows each controller's grip pose, works out which parts are
// pressed and how far the stick is tilted, and whether it has been left idle (it fades),
// then hands that to the model and icon passes.
//
//   const ctl = ns.controllers.create(gl);           // returns null if it can't run here
//   ctl.draw(frame, refSpace, viewerPose, layer, session.inputSources, iconSwaps, holds);   // after the video
//   ctl.alphas() -> { left?, right? }: how solid each controller's laser beam is drawn (it fades
//                   when the controller is left still: config.idle, Settings → Auto-hide)
//   ctl.dispose();
(function (ns) {
  'use strict';

  const { math3d: M, gl: G, input } = ns;

  // Extra offset/rotation from config.fit, mirrored for the left hand: the baked model sits
  // slightly off from where the real controller is held, so this nudges it into place.
  // (Offset x and the y/z rotations flip sign for the left hand, which is a mirror image.)
  function fitMatrix(fit, mirror) {
    const s = mirror ? -1 : 1;
    let m = M.translation(fit.offset[0] * s, fit.offset[1], fit.offset[2]);
    m = M.multiply(m, M.axisAngle(1, 0, 0, fit.rotDeg[0] * M.DEG));
    m = M.multiply(m, M.axisAngle(0, 1, 0, fit.rotDeg[1] * M.DEG * s));
    m = M.multiply(m, M.axisAngle(0, 0, 1, fit.rotDeg[2] * M.DEG * s));
    return m;
  }

  // Tilt the stick part around its pivot to match the thumbstick. Returns a matrix the vertex
  // shader applies to the stick's vertices only. `anchors.stickPivot` (from models.js) gives
  // the pivot point `c` and the stick's up direction `n`, both in grip space.
  function stickMatrix(anchors, gamepad, maxDeg) {
    if (!gamepad) return M.identity();
    const { c: pivot, n: up } = anchors.stickPivot;
    const ax = input.axisValue(gamepad, 'x'), ay = input.axisValue(gamepad, 'y');
    const forward = [0, -0.8, -0.6];                   // grip-space direction toward the menu button
    // Where the stick top moves to: sideways for x, along `forward` for y.
    const dir = [ax, -ay * forward[1], -ay * forward[2]];
    const mag = M.length(dir);
    if (mag < 0.02) return M.identity();                // dead zone: leave it upright
    // Tilt about the axis perpendicular to both "up" and the push direction, by an angle
    // proportional to how far the stick is pushed (up to maxDeg at full push).
    const axis = M.normalize(M.cross(up, dir));
    return M.aroundPivot(pivot, M.axisAngle(axis[0], axis[1], axis[2], Math.min(1, mag) * maxDeg * M.DEG));
  }

  // Set up the controller layer for this WebGL context. Returns { draw, dispose } or null
  // (VR still works without controller models; the session just doesn't draw them).
  function create(gl) {
    const models = ns.controllerModels, config = ns.controllerConfig;
    if (!models) { console.warn('[streamxr] controller models missing'); return null; }
    const vaos = G.vertexArrays(gl);
    if (!vaos) { console.warn('[streamxr] no vertex array objects; controllers off'); return null; }

    const modelPass = ns.controllerModelPass.createModelPass(gl, models, vaos, config);
    // One floating icon per binding that has a part and an icon drawer (what each button
    // does, shown next to it); placement comes from config.iconPlacement.
    const icons = ns.controls.BINDINGS
      .filter(b => b.part && b.icon && ns.controllerIcons.has(b.icon))
      .map(b => ({ part: b.part, icon: b.icon, ...(config.iconPlacement[b.part] || { lift: 0.01, size: 0.016 }) }));
    const iconPass = ns.controllerIconPass.createIconPass(gl, vaos, icons, config.iconMinAlpha);

    const partIndex = Object.fromEntries(models.parts.map((n, i) => [n, i]));   // part name -> index in the shaders' arrays
    const fit = { right: fitMatrix(config.fit, false), left: fitMatrix(config.fit, true) };
    const press = { right: new Float32Array(modelPass.MAX_PARTS), left: new Float32Array(modelPass.MAX_PARTS) };

    // Smoothed 0..1 highlight per part, so presses fade instead of flicker.
    // config.buttonParts maps a gamepad button number to the model part(s) it lights up
    // (the right face buttons B/X/Y all arrive as one button, so they light up together).
    // A fully pressed button is 0.85, a touched one a faint 0.25, analogue buttons (trigger)
    // ramp with how far they're pulled.
    function updatePress(hand, gamepad) {
      const target = new Float32Array(modelPass.MAX_PARTS);
      const buttons = (gamepad && gamepad.buttons) || [];
      for (const [bi, names] of Object.entries(config.buttonParts[hand] || {})) {
        const b = buttons[bi];
        if (!b) continue;
        const v = Math.min(0.85, b.pressed ? 0.85 : (b.touched ? 0.25 : 0) + (b.value || 0) * 0.5);
        for (const name of [].concat(names)) {
          const k = partIndex[name];
          if (k !== undefined) target[k] = Math.max(target[k], v);
        }
      }
      // Ease each value 35% of the way toward its target every frame (the smoothing).
      const p = press[hand];
      for (let i = 0; i < p.length; i++) p[i] += (target[i] - p[i]) * 0.35;
      return p;
    }

    // Idle fading (config.idle): per hand, when it last moved (faster than moveSpeed /
    // turnSpeed) or had a button, touch or stick in use, its last pose and time, how solid
    // the controller is drawn now (`alpha`) and how solid its laser beam is (`beam`). Each
    // eases towards 1 while in use, or once still towards idle.alpha (the controller) or 0
    // (the beam: it goes out), after its own wait (Settings → Auto-hide: 'controllers' and
    // 'lasers', vr-panel/fade-options.js). Returns the controller's alpha.
    const idleState = {};                  // hand -> { pos, fwd, at, active, alpha, beam }
    function stepIdle(hand, m, gamepad, now) {
      const cfg = config.idle;
      if (!cfg) return 1;
      const pos = [m[12], m[13], m[14]], fwd = [-m[8], -m[9], -m[10]];
      const s = idleState[hand] || (idleState[hand] = { pos, fwd, at: now, active: now, alpha: 1, beam: 1 });
      const dt = Math.max(1e-3, (now - s.at) / 1000);
      const speed = M.length([pos[0] - s.pos[0], pos[1] - s.pos[1], pos[2] - s.pos[2]]) / dt;
      const turn = Math.acos(Math.min(1, Math.max(-1, M.dot(fwd, s.fwd)))) / dt;
      const buttons = (gamepad && gamepad.buttons) || [], axes = (gamepad && gamepad.axes) || [];
      const using = buttons.some(b => b && (b.pressed || b.touched || b.value > 0.05)) || axes.some(a => Math.abs(a) > 0.15);
      if (speed > cfg.moveSpeed || turn > cfg.turnSpeed || using) s.active = now;
      const still = now - s.active, wait = name => (ns.vrFadeOptions ? ns.vrFadeOptions.seconds(name) : 3.5) * 1000;
      // Ease a value towards its goal: the whole way from 1 down over fadeOutMs, up over fadeInMs.
      const ease = (v, goal) => {
        const span = (goal < v ? cfg.fadeOutMs : cfg.fadeInMs) || 1, step = (now - s.at) / span;
        return goal < v ? Math.max(goal, v - step) : Math.min(goal, v + step);
      };
      s.alpha = ease(s.alpha, still > wait('controllers') ? cfg.alpha : 1);
      s.beam = ease(s.beam, still > wait('lasers') ? 0 : 1);
      s.pos = pos; s.fwd = fwd; s.at = now;
      return s.alpha;
    }
    // How solid each hand's laser beam is drawn now ({ left?, right? }, 0..1): it fades when
    // its controller is left still (its own wait).
    const alphas = () => Object.fromEntries(Object.entries(idleState).map(([hand, s]) => [hand, s.beam]));

    // Draw both controllers for this frame, once per eye. iconSwaps: { left?, right? } of
    // icon swaps for that hand (see icon-pass.js; e.g. the stick's seek icon becomes the
    // scroll icon while it scrolls a panel). holds: { left?, right? } buttons held for a hold
    // binding (input.js holds()), whose part shows a countdown. Each hand: where its grip is
    // (the pose WebXR reports), the fit nudge, which parts are lit, and the stick tilt.
    function draw(frame, refSpace, viewerPose, layer, inputSources, iconSwaps, holds) {
      const now = performance.now();
      const hands = [];
      for (const src of inputSources) {
        const hand = src.handedness;
        if (!src.gripSpace || !modelPass.has(hand)) continue;   // not a left/right controller we have a model for
        const pose = frame.getPose(src.gripSpace, refSpace);
        if (!pose) continue;                                    // tracking lost this frame
        const anchors = modelPass.anchors(hand);
        hands.push({
          handedness: hand,
          anchors,
          model: M.multiply(pose.transform.matrix, fit[hand]),
          press: updatePress(hand, src.gamepad),
          stick: stickMatrix(anchors, src.gamepad, config.stickTiltDeg),
          swap: iconSwaps && iconSwaps[hand],
          hold: holds && holds[hand],
          alpha: stepIdle(hand, pose.transform.matrix, src.gamepad, now),
        });
      }
      if (!hands.length) return;

      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      gl.disable(gl.CULL_FACE);                // CAD winding isn't guaranteed consistent
      for (const view of viewerPose.views) {
        const vp = layer.getViewport(view);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        modelPass.draw(view, hands);
        if (config.showIcons) iconPass.draw(view, hands);
      }
      gl.disable(gl.DEPTH_TEST);
    }

    // Free the GPU objects (called when the VR session ends).
    function dispose() { modelPass.dispose(); iconPass.dispose(); }

    return { draw, dispose, alphas };
  }

  ns.controllers = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
