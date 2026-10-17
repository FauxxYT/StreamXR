// Small 3D math helpers (no library). Matrices are column-major Float32Array(16), like WebGL
// and WebXR: element [col * 4 + row], so the translation lives in elements 12, 13, 14 and
// the three axes (x, y, z) in elements 0-2, 4-6 and 8-10. Points and directions are plain
// [x, y, z] arrays. Right-handed coordinates, +Y up, the viewer looks down -Z (WebXR's).
(function (ns) {
  'use strict';

  const DEG = Math.PI / 180;               // multiply degrees by this to get radians

  // 4x4 identity matrix (does nothing when multiplied).
  const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  // a * b: the result applies b first, then a (so multiply(parent, child) puts a child's
  // local space inside its parent's).
  function multiply(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }

  // Matrix that moves things by (x, y, z).
  function translation(x, y, z) {
    const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m;
  }

  // Rotation of `angle` radians about the unit axis (x, y, z) (Rodrigues' formula).
  function axisAngle(x, y, z, angle) {
    const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    return new Float32Array([
      t * x * x + c,     t * x * y + s * z, t * x * z - s * y, 0,
      t * x * y - s * z, t * y * y + c,     t * y * z + s * x, 0,
      t * x * z + s * y, t * y * z - s * x, t * z * z + c,     0,
      0, 0, 0, 1]);
  }

  // Turn around the vertical axis (yaw): what "turn to face the front" uses.
  function rotationY(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  }

  // Rotate (around `pivot`) by `rot`: move the pivot to the origin, rotate, move it back.
  const aroundPivot = (pivot, rot) =>
    multiply(translation(pivot[0], pivot[1], pivot[2]), multiply(rot, translation(-pivot[0], -pivot[1], -pivot[2])));

  // The inverse of a pose made only of a rotation and a translation (no scaling): the rotation
  // turned back (transposed), and the translation undone in that turned-back frame.
  function invertRigid(m) {
    const o = identity(), tx = m[12], ty = m[13], tz = m[14];
    o[0] = m[0]; o[1] = m[4]; o[2] = m[8];
    o[4] = m[1]; o[5] = m[5]; o[6] = m[9];
    o[8] = m[2]; o[9] = m[6]; o[10] = m[10];
    o[12] = -(m[0] * tx + m[1] * ty + m[2] * tz);
    o[13] = -(m[4] * tx + m[5] * ty + m[6] * tz);
    o[14] = -(m[8] * tx + m[9] * ty + m[10] * tz);
    return o;
  }

  // Position p as seen after matrix m (rotation + translation).
  const transformPoint = (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

  // Direction d after matrix m (rotation only: a direction has no position to translate).
  const transformDir = (m, d) => [
    m[0] * d[0] + m[4] * d[1] + m[8] * d[2],
    m[1] * d[0] + m[5] * d[1] + m[9] * d[2],
    m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];

  // Vector basics: cross product (perpendicular to both), dot product (how aligned they
  // are), length, and scaling to length 1 (a zero vector stays zero).
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const length = a => Math.hypot(a[0], a[1], a[2]);
  const normalize = a => { const l = length(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // Yaw (radians, around +Y) of the direction a quaternion is facing; forward = q * (0, 0, -1).
  // (WebXR gives the headset's orientation as a quaternion {x, y, z, w}. This rotates the
  // forward vector by it, then reads the angle off the horizontal part, ignoring pitch/roll.)
  function yawOf(q) {
    const { x, y, z, w } = q, vx = 0, vy = 0, vz = -1;
    const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
    const fx = vx + w * tx + (y * tz - z * ty);
    const fz = vz + w * tz + (x * ty - y * tx);
    return Math.atan2(-fx, -fz);
  }

  ns.math3d = {
    DEG, identity, multiply, translation, axisAngle, rotationY, aroundPivot, invertRigid,
    transformPoint, transformDir, cross, dot, length, normalize, yawOf,
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
