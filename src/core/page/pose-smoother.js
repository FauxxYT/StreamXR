// Smooths a controller's laser pose, so hand tremor doesn't shake the pointer, the click
// or what it holds (the controls panel by its grab bar, the cinema screen by a handle).
// A "One Euro" filter (Casiez, Roussel and Vogel, CHI 2012): when the hand is nearly still
// it smooths a lot; the faster the hand moves, the less it smooths, so a deliberate move
// follows at once. Position and orientation are filtered separately (a held panel ~1 m
// away mostly shakes from the wrist turning).
//
//   const s = ns.createPoseSmoother();
//   s.reset()              start over from the next pose (tracking lost, smoothing off)
//   s.filter(m, dt, cfg)   -> a smoothed copy of the 4x4 pose `m` (column-major, as WebXR
//                             gives it; rigid, no scale); dt = seconds since the last call.
//     cfg (may change between calls): { minCutoff, posBeta, rotBeta, dCutoff }
//       minCutoff  Hz: how much a still hand is smoothed (lower = smoother, more lag)
//       posBeta    extra Hz per m/s of hand speed;  rotBeta  extra Hz per rad/s of turning
//       dCutoff    Hz: smoothing of the speed estimate itself
(function (ns) {
  'use strict';

  const M = ns.math3d;

  // Blend factor (0..1) of a low-pass filter with cutoff `hz` over a step of `dt` seconds.
  const alphaOf = (hz, dt) => 1 / (1 + 1 / (2 * Math.PI * hz * dt));
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // Angle in radians between two unit vectors.
  const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, M.dot(a, b))));

  function createPoseSmoother() {
    let last = null;                  // { pos, y, z: the filtered position and Y / Z axes, posSpeed, rotSpeed }

    function filter(m, dt, cfg) {
      const pos = [m[12], m[13], m[14]], y = [m[4], m[5], m[6]], z = [m[8], m[9], m[10]];
      if (!last || !(dt > 0)) {
        last = { pos, y, z, posSpeed: 0, rotSpeed: 0 };
        return Float32Array.from(m);
      }
      // How fast the hand moves and turns (m/s, rad/s), itself smoothed.
      const dA = alphaOf(cfg.dCutoff, dt);
      const posSpeed = last.posSpeed + (M.length([pos[0] - last.pos[0], pos[1] - last.pos[1], pos[2] - last.pos[2]]) / dt - last.posSpeed) * dA;
      const rotSpeed = last.rotSpeed + (Math.max(angle(y, last.y), angle(z, last.z)) / dt - last.rotSpeed) * dA;
      // The faster it goes, the higher the cutoff (the less it's smoothed).
      const pA = alphaOf(cfg.minCutoff + cfg.posBeta * posSpeed, dt);
      const rA = alphaOf(cfg.minCutoff + cfg.rotBeta * rotSpeed, dt);
      const fp = lerp(last.pos, pos, pA);
      // Blend the Z and Y axes, then rebuild a right-angled frame from them (Z kept).
      const fz = M.normalize(lerp(last.z, z, rA));
      const fx = M.normalize(M.cross(M.normalize(lerp(last.y, y, rA)), fz));
      const fy = M.cross(fz, fx);
      last = { pos: fp, y: fy, z: fz, posSpeed, rotSpeed };
      return new Float32Array([fx[0], fx[1], fx[2], 0, fy[0], fy[1], fy[2], 0, fz[0], fz[1], fz[2], 0, fp[0], fp[1], fp[2], 1]);
    }

    return { filter, reset: () => { last = null; } };
  }

  ns.createPoseSmoother = createPoseSmoother;
})(globalThis.__streamxr = globalThis.__streamxr || {});
