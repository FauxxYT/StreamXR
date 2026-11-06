// A black veil over the whole headset view, at a given opacity: drawn last, over everything,
// for the recenter's short fade (xr-session.js: the world fades out, moves, fades back in,
// so it never leaps: Android XR's motion guide, "whole-world movement"). WebGL 2 or 1.
//
//   const fade = ns.fadePass.create(gl);
//   fade.draw(alpha, layer)   alpha 0..1 (0 draws nothing), over both eyes of the XR layer
//   fade.dispose()
(function (ns) {
  'use strict';

  // One triangle that covers the whole viewport (clip space -1..1, overshooting off-screen),
  // painted black with alpha uAlpha, blended over what's there.
  const VS = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const FS = `precision mediump float; uniform float uAlpha; void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha); }`;

  function create(gl) {
    const prog = ns.gl.createProgram(gl, VS, FS, 'fade');
    const u = ns.gl.uniforms(gl, prog, { alpha: 'uAlpha' });
    const vaos = ns.gl.vertexArrays(gl);
    const vao = vaos ? vaos.create() : null;
    if (vao) vaos.bind(vao);
    const buf = ns.gl.floatAttribute(gl, prog, 'aPos', new Float32Array([-1, -1, 3, -1, -1, 3]), 2);
    if (vao) vaos.bind(null);

    function draw(alpha, layer) {
      if (!(alpha > 0.001) || !layer) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
      gl.viewport(0, 0, layer.framebufferWidth, layer.framebufferHeight);   // (both eyes at once)
      const depth = gl.isEnabled(gl.DEPTH_TEST), blend = gl.isEnabled(gl.BLEND);
      const was = [gl.BLEND_SRC_RGB, gl.BLEND_DST_RGB, gl.BLEND_SRC_ALPHA, gl.BLEND_DST_ALPHA].map(p => gl.getParameter(p));   // (put back after)
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);   // (darkens the color only; the alpha stays as drawn)
      gl.useProgram(prog);
      gl.uniform1f(u.alpha, Math.min(1, alpha));
      if (vao) vaos.bind(vao);
      else {                                   // (no VAOs: set the attribute up each time)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        const loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (vao) vaos.bind(null);
      if (depth) gl.enable(gl.DEPTH_TEST);
      gl.blendFuncSeparate(was[0], was[1], was[2], was[3]);
      if (!blend) gl.disable(gl.BLEND);
    }

    function dispose() {
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      if (vao) vaos.remove(vao);
    }
    return { draw, dispose };
  }

  ns.fadePass = { create };
})(globalThis.__streamxr = globalThis.__streamxr || {});
