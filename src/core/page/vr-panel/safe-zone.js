// The Safe Zone: the part of your view the VR interface is laid out in (docs/Spatial-Layout.md).
// It's set as shares of what the headset shows, so it fits any headset: a width (a share of
// the horizontal field of view), a height (a share of the vertical one) and where its centre
// sits (above or below eye level, as a share of the vertical field of view). All three are
// remembered and set in the Safe zone settings tab (safe-zone-options.js).
//
// The zone is fixed in the room like the panels: it's measured from where your eyes were and
// the way you faced at the last recenter (anchor). While its settings tab is open, an outline
// on a sphere around you shows it (createPass).
//
//   ns.vrSafeZone.zone          { width, height, shift } (shares: 0.9 = 90%), and `version`
//                               (bumps with every change)
//   ns.vrSafeZone.DEFAULTS, RANGES
//   ns.vrSafeZone.fov           the headset's field of view, both eyes together, in degrees:
//                               { h, v, measured } (a stand-in until the first VR frame)
//   ns.vrSafeZone.measure(viewerPose)   read the field of view from the eyes' projections
//   ns.vrSafeZone.angles()      the zone's edges in degrees from straight ahead:
//                               { left, right, top, bottom, mid (its middle height) }
//                               (right and up positive)
//   ns.vrSafeZone.setAnchor(head, yaw)  where you were and faced at the recenter (anchor:
//                               { pos: [x, y, z] (your eyes), yaw })
//   ns.vrSafeZone.point(yaw, pitch, r)  the world point that many degrees right / up of the
//                               recenter direction, r metres from the anchor's eyes
//   ns.vrSafeZone.set(patch), reset(), load()
//   ns.vrSafeZone.preview()     the settings tab asks for the outline (each frame it's shown)
//   ns.vrSafeZone.previewing()  true while it has been asked for lately
//   ns.vrSafeZone.createPass(gl, vaos) -> { draw(view, alpha), dispose() }: the outline
(function (ns) {
  'use strict';

  const { gl: G, math3d: M } = ns;
  const KEY = 'safeZone';                                   // remembered { width, height, shift } (storage.js name)
  const DEFAULTS = { width: 0.5, height: 0.45, shift: -0.01 };   // set by the user in the headset (0.65.0)
  const RANGES = { width: [0.4, 1], height: [0.4, 1], shift: [-0.25, 0.25] };
  const FALLBACK_FOV = { h: 100, v: 100 };                  // degrees, until a headset reports its own
  const PREVIEW_MS = 250;                                   // the outline stays this long after the tab was last drawn
  const deg = rad => rad * 180 / Math.PI;
  const clampTo = (k, x) => Math.min(RANGES[k][1], Math.max(RANGES[k][0], x));

  const zone = { ...DEFAULTS, version: 0 };
  const fov = { ...FALLBACK_FOV, measured: false };
  const anchor = { pos: [0, 1.6, 0], yaw: 0 };
  let askedAt = -Infinity;

  // Take what's remembered (or the defaults).
  function load() {
    const saved = ns.storage.getJSON(KEY) || {};
    for (const k of Object.keys(DEFAULTS)) zone[k] = typeof saved[k] === 'number' ? clampTo(k, saved[k]) : DEFAULTS[k];
    zone.version++;
  }
  load();

  // Change the zone (patch: { width?, height?, shift? }) and remember it.
  function set(patch) {
    for (const k of Object.keys(DEFAULTS)) if (typeof patch[k] === 'number') zone[k] = clampTo(k, patch[k]);
    ns.storage.setJSON(KEY, { width: round3(zone.width), height: round3(zone.height), shift: round3(zone.shift) });
    zone.version++;
  }
  const round3 = x => Math.round(x * 1000) / 1000;

  // Back to the defaults (the global reset); forget the choice.
  function reset() { Object.assign(zone, DEFAULTS); zone.version++; ns.storage.remove(KEY); }

  // The field of view of both eyes together: each eye's four frustum edges (from its
  // projection matrix: p[0] / p[5] the scale, p[8] / p[9] the off-centre shift) turned into
  // directions in the head's frame (so canted displays count), and the widest of them taken
  // left, right, up and down. Measured once per VR session (it doesn't change).
  function measure(viewerPose) {
    try {
      const head = viewerPose.transform.inverse.matrix;
      let left = 0, right = 0, up = 0, down = 0;
      for (const v of viewerPose.views) {
        const p = v.projectionMatrix, rel = M.multiply(head, v.transform.matrix);
        const tl = (p[8] - 1) / p[0], tr = (p[8] + 1) / p[0], tb = (p[9] - 1) / p[5], tt = (p[9] + 1) / p[5];
        for (const [x, y] of [[tl, 0], [tr, 0], [0, tt], [0, tb]]) {
          const d = [rel[0] * x + rel[4] * y - rel[8], rel[1] * x + rel[5] * y - rel[9], rel[2] * x + rel[6] * y - rel[10]];
          const yaw = deg(Math.atan2(d[0], -d[2])), pitch = deg(Math.atan2(d[1], Math.hypot(d[0], d[2])));
          left = Math.min(left, yaw); right = Math.max(right, yaw); down = Math.min(down, pitch); up = Math.max(up, pitch);
        }
      }
      if (right - left > 10 && up - down > 10) {
        fov.h = Math.round(right - left); fov.v = Math.round(up - down); fov.measured = true; zone.version++;
      }
    } catch (err) { console.warn('[streamxr] could not measure the field of view:', err); }
  }

  // The zone's edges and its middle height in degrees from straight ahead at eye level (right
  // and up positive).
  function angles() {
    const hw = zone.width * fov.h / 2, hh = zone.height * fov.v / 2, mid = zone.shift * fov.v;
    return { left: -hw, right: hw, top: mid + hh, bottom: mid - hh, mid };
  }

  function setAnchor(head, yaw) {
    anchor.pos = [head.x, head.y, head.z]; anchor.yaw = yaw; zone.version++;
  }

  const preview = () => { askedAt = performance.now(); };
  const previewing = () => performance.now() - askedAt < PREVIEW_MS;

  // A point `r` metres from the anchor's eyes, `yaw` degrees right and `pitch` degrees up of
  // the recenter direction (turned by the anchor's yaw, as panel placement is: its forward
  // is [-sin, 0, -cos]). The layout places everything with it (vr-panel.js).
  function point(yaw, pitch, r) {
    const a = yaw * Math.PI / 180, b = pitch * Math.PI / 180, y0 = anchor.yaw;
    const lx = Math.sin(a) * Math.cos(b), ly = Math.sin(b), lz = -Math.cos(a) * Math.cos(b);
    const c = Math.cos(y0), s = Math.sin(y0);
    return [anchor.pos[0] + r * (lx * c + lz * s), anchor.pos[1] + r * ly, anchor.pos[2] + r * (-lx * s + lz * c)];
  }

  // ------------------------------------------------------------------ the outline
  // The vertex shader projects world-space points (the outline is built in JavaScript,
  // already in the world). The fragment shader softens each strip's edges (uv.y runs 0..1
  // across it) so the line doesn't shimmer, and fades it all by uAlpha.
  const VS = `
    attribute vec3 aPos; attribute vec2 aUv;
    uniform mat4 uProj, uView; varying vec2 vUv;
    void main() { vUv = aUv; gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
  const FS = `
    precision mediump float;
    uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
    void main() {
      float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
      gl_FragColor = vec4(uColor, smoothstep(0.0, 0.5, across) * uAlpha);
    }`;
  const LINE = 0.35;                  // degrees: the outline's thickness
  const MARK = 2;                     // degrees: each arm of the cross at the zone's centre
  const STEPS = 32;                   // segments per edge (the edges are arcs)

  // Returns { draw(view, alpha), dispose() }. The outline (four arcs along the zone's edges
  // and a small cross at its centre) is rebuilt only when the zone, the field of view or
  // the anchor change.
  function createPass(gl, vaos) {
    const prog = G.createProgram(gl, VS, FS, 'safe zone');
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', color: 'uColor', alpha: 'uAlpha' });
    const vao = vaos.create(); vaos.bind(vao);
    const posBuf = G.floatAttribute(gl, prog, 'aPos', new Float32Array(3), 3, gl.DYNAMIC_DRAW);
    const uvBuf = G.floatAttribute(gl, prog, 'aUv', new Float32Array(2), 2, gl.DYNAMIC_DRAW);
    vaos.bind(null);
    let built = -1, count = 0;

    // The outline's triangles: each edge a strip LINE degrees wide lying on the sphere,
    // walked from (y0, p0) to (y1, p1) in STEPS pieces; the cross the same way.
    function build() {
      const pos = [], uv = [], z = angles(), w = LINE / 2;
      const RADIUS = ns.vrPanelConfig.layout.distance;      // where the panels are
      function strip(y0, p0, y1, p1) {
        const horizontal = p0 === p1;                         // along a line of constant pitch
        const edge = (t, side) => {
          const y = y0 + (y1 - y0) * t, p = p0 + (p1 - p0) * t;
          // widen across the line: in pitch for a horizontal edge, in yaw (corrected for
          // the narrowing towards the poles) for a vertical one
          return horizontal ? point(y, p + side * w, RADIUS) : point(y + side * w / Math.max(0.2, Math.cos(p * Math.PI / 180)), p, RADIUS);
        };
        for (let i = 0; i < STEPS; i++) {
          const t0 = i / STEPS, t1 = (i + 1) / STEPS;
          const a = edge(t0, -1), b = edge(t0, 1), c = edge(t1, 1), d = edge(t1, -1);
          pos.push(...a, ...b, ...c, ...a, ...c, ...d);
          uv.push(t0, 0, t0, 1, t1, 1, t0, 0, t1, 1, t1, 0);
        }
      }
      strip(z.left - w, z.top, z.right + w, z.top);          // top (reaching over the corners)
      strip(z.left - w, z.bottom, z.right + w, z.bottom);    // bottom
      strip(z.left, z.bottom + w, z.left, z.top - w);        // left
      strip(z.right, z.bottom + w, z.right, z.top - w);      // right
      const cy = (z.left + z.right) / 2, cp = (z.top + z.bottom) / 2;
      strip(cy - MARK, cp, cy + MARK, cp);                   // the centre cross
      strip(cy, cp - MARK, cy, cp + MARK);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
      count = pos.length / 3;
      built = zone.version;
    }

    // Draw the outline for one eye, faded by alpha (0..1), over whatever is there (it's a
    // guide while you adjust, so nothing hides it).
    function draw(view, alpha) {
      if (built !== zone.version) build();
      const col = ns.vrTokens.m3.onSurface, rgb = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16) / 255);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
      gl.uniform3fv(U.color, rgb);
      gl.uniform1f(U.alpha, alpha * 0.85);
      vaos.bind(vao);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      vaos.bind(null);
    }

    function dispose() { gl.deleteBuffer(posBuf); gl.deleteBuffer(uvBuf); vaos.remove(vao); gl.deleteProgram(prog); }

    return { draw, dispose };
  }

  ns.vrSafeZone = { zone, DEFAULTS, RANGES, fov, anchor, measure, angles, point, setAnchor, set, reset, load, preview, previewing, createPass };
})(globalThis.__streamxr = globalThis.__streamxr || {});
