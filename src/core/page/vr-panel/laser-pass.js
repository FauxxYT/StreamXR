// Draws laser beams (thin strips that always face the eye) and the dot where they hit.
(function (ns) {
  'use strict';

  const { gl: G, math3d: M } = ns;

  // The vertex shader just projects world-space points (the beam strip / dot quad are built
  // in JavaScript each frame, already in world space).
  const VS = `
    attribute vec3 aPos; attribute vec2 aUv;
    uniform mat4 uProj, uView; varying vec2 vUv;
    void main() { vUv = aUv; gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
  // uMode 0 = beam (uv.x along the beam, uv.y across), 1 = dot (uv in -1..1).
  // The beam fades toward its far end and toward its edges (soft glowing line); the dot is
  // a soft round spot, lightened toward white so it stands out on the panel.
  const FS = `
    precision mediump float;
    uniform vec3 uColor; uniform float uMode; uniform float uAlpha; varying vec2 vUv;
    void main() {
      float a;
      if (uMode < 0.5) {
        float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
        a = smoothstep(0.0, 0.6, across) * mix(0.9, 0.15, vUv.x);
      } else {
        float d = length(vUv);
        if (d > 1.0) discard;
        a = 1.0 - smoothstep(0.55, 1.0, d);
      }
      gl_FragColor = vec4(mix(uColor, vec3(1.0), uMode * 0.5), a * uAlpha);
    }`;

  // Returns { draw, dispose }. One small dynamic buffer (6 vertices) is rewritten for every
  // beam and dot, so a few lasers cost almost nothing.
  function createLaserPass(gl, vaos) {
    const prog = G.createProgram(gl, VS, FS, 'laser');
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', color: 'uColor', mode: 'uMode', alpha: 'uAlpha' });
    const vao = vaos.create(); vaos.bind(vao);
    const posBuf = G.floatAttribute(gl, prog, 'aPos', new Float32Array(18), 3, gl.DYNAMIC_DRAW);   // 6 vertices x xyz
    const uvBuf = G.floatAttribute(gl, prog, 'aUv', new Float32Array(12), 2, gl.DYNAMIC_DRAW);     // 6 vertices x uv
    vaos.bind(null);

    // Draw one quad (two triangles) from its four corners and their texture coordinates.
    function quad(a, b, c, d, uv) {                    // corners in order around the quad
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]));
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([...uv[0], ...uv[1], ...uv[2], ...uv[0], ...uv[2], ...uv[3]]));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // beams: [{ from, to, hit, alpha? }]  (world-space points; hit = point on the panel or
    // null; alpha: the whole beam faded, e.g. with an idle controller)
    // cfg: ns.vrPanelConfig.laser (colour, width, dot size). Called once per eye.
    function draw(view, beams, cfg) {
      if (!beams.length) return;
      // The eye's position and its right/up axes: beams and dots are built to face the eye
      // so they look the same thickness from any angle.
      const e = view.transform.position, eye = [e.x, e.y, e.z];
      const vm = view.transform.matrix, right = [vm[0], vm[1], vm[2]], up = [vm[4], vm[5], vm[6]];

      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
      gl.uniform3fv(U.color, cfg.color);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);                 // translucent: don't hide things drawn behind it
      vaos.bind(vao);

      for (const b of beams) {
        // Beam: a strip from `from` to `to`, turned to face the eye. `side` is perpendicular
        // to both the beam and the line to the eye, scaled to half the beam width.
        // (Fainter when not hitting anything, so it doesn't look like it touches something.)
        const dir = [b.to[0] - b.from[0], b.to[1] - b.from[1], b.to[2] - b.from[2]];
        const toEye = [eye[0] - b.from[0], eye[1] - b.from[1], eye[2] - b.from[2]];
        const side = M.normalize(M.cross(dir, toEye)).map(x => x * cfg.width / 2);
        const p = (pt, s) => [pt[0] + side[0] * s, pt[1] + side[1] * s, pt[2] + side[2] * s];
        const fade = b.alpha == null ? 1 : b.alpha;             // (its controller left idle: fades with it)
        gl.uniform1f(U.mode, 0); gl.uniform1f(U.alpha, (b.hit ? 1 : 0.6) * fade);
        quad(p(b.from, -1), p(b.from, 1), p(b.to, 1), p(b.to, -1), [[0, 0], [0, 1], [1, 1], [1, 0]]);

        if (b.hit) {
          // Dot where the beam lands: a small camera-facing square, shaded round in the shader.
          const s = cfg.dotSize / 2;
          const c = (sx, sy) => [0, 1, 2].map(k => b.hit[k] + (right[k] * sx + up[k] * sy) * s);
          gl.uniform1f(U.mode, 1); gl.uniform1f(U.alpha, fade);
          quad(c(-1, -1), c(1, -1), c(1, 1), c(-1, 1), [[-1, -1], [1, -1], [1, 1], [-1, 1]]);
        }
      }

      vaos.bind(null);
      gl.disable(gl.BLEND); gl.depthMask(true);
    }

    // Free the GPU objects (called when the VR session ends).
    function dispose() { gl.deleteBuffer(posBuf); gl.deleteBuffer(uvBuf); vaos.remove(vao); gl.deleteProgram(prog); }

    return { draw, dispose };
  }

  ns.vrLaserPass = { createLaserPass };
})(globalThis.__streamxr = globalThis.__streamxr || {});
