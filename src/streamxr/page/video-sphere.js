// Draws the video onto an inside-out sphere (360°) or half sphere (180°) around the viewer.
// The sphere is big (radius 50 m) and follows the head's rotation but not its position, so
// the video behaves like a far-away backdrop. Two projections are supported: equirectangular
// (one wrap-around picture, the sphere's own UVs) and YouTube's equi-angular cubemap, which
// the fragment shader decodes per pixel from the view direction (see eacUv below).
(function (ns) {
  'use strict';

  const { formats, gl: G } = ns;

  // Vertex shader: passes the vertex position along as the view direction (vDir) for the
  // cubemap lookup, and applies uUvXform (scale xy, offset zw) to the texture coordinates:
  // [1,1,0,0] for the whole frame, or one eye's half of a side-by-side 3D frame
  // (formats.eyeSpans).
  const VS = `
    attribute vec3 aPos; attribute vec2 aUv;
    uniform mat4 uProj, uView, uModel; uniform vec4 uUvXform;
    varying vec2 vUv; varying vec3 vDir;
    void main() {
      vUv = aUv * uUvXform.xy + uUvXform.zw;
      vDir = aPos;                                     // direction on the sphere (front = -Z, right = +X)
      gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
    }`;

  // uMode 0: equirectangular (use the sphere's UVs). uMode 1: YouTube's equi-angular cubemap.
  // Cubemap layout, confirmed against a real YouTube frame (same as ffmpeg's "eac"):
  //   top row    left | front | right
  //   bottom row down | back  | up      (down and up turned 270° clockwise, back 90°)
  const FS = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform sampler2D uTex; uniform float uMode;
    varying vec2 vUv; varying vec3 vDir;
    const float PI = 3.14159265;

    vec2 eacUv(vec3 d) {
      vec3 a = abs(d);
      vec2 st; vec2 cell; float rot = 0.0;
      if (a.z >= a.x && a.z >= a.y) {
        if (d.z < 0.0) { st = vec2(d.x, -d.y) / a.z; cell = vec2(1.0, 0.0); }             // front
        else           { st = vec2(-d.x, -d.y) / a.z; cell = vec2(1.0, 1.0); rot = 1.0; } // back
      } else if (a.x >= a.y) {
        if (d.x > 0.0) { st = vec2(d.z, -d.y) / a.x; cell = vec2(2.0, 0.0); }             // right
        else           { st = vec2(-d.z, -d.y) / a.x; cell = vec2(0.0, 0.0); }            // left
      } else {
        if (d.y > 0.0) { st = vec2(d.x, -d.z) / a.y; cell = vec2(2.0, 1.0); rot = 3.0; }  // up
        else           { st = vec2(d.x, d.z) / a.y; cell = vec2(0.0, 1.0); rot = 3.0; }   // down
      }
      st = (atan(st) * (4.0 / PI) + 1.0) * 0.5;       // equi-angular spacing, 0..1 on the face
      if (rot == 1.0) st = vec2(1.0 - st.y, st.x);     // stored turned 90° clockwise
      else if (rot == 3.0) st = vec2(st.y, 1.0 - st.x); // stored turned 270° clockwise
      st = clamp(st, 0.002, 0.998);                    // don't bleed into the neighbouring tile
      return (cell + st) / vec2(3.0, 2.0);
    }

    void main() {
      vec2 uv = uMode > 0.5 ? eacUv(normalize(vDir)) : vUv;
      gl_FragColor = texture2D(uTex, uv);
    }`;

  // Inside-facing sphere. Longitude 0 = straight ahead (-Z), positive = to the right.
  // Texture u runs 0..1 across the longitude span, v runs 0..1 top to bottom.
  // spanRad: how much of the way around it covers (2π for 360°, π for the front half of
  // VR180). cols/rows: grid resolution (a grid of quads, two triangles each).
  function buildSphere(spanRad, radius = 50, cols = 128, rows = 64) {
    const pos = [], uv = [], idx = [];
    // Vertices: `pol` is the angle down from straight up (0 = top, π = bottom).
    for (let r = 0; r <= rows; r++) {
      const v = r / rows, pol = v * Math.PI;
      for (let c = 0; c <= cols; c++) {
        const u = c / cols, lon = (u - 0.5) * spanRad;
        pos.push(radius * Math.sin(lon) * Math.sin(pol), radius * Math.cos(pol), -radius * Math.cos(lon) * Math.sin(pol));
        uv.push(u, v);
      }
    }
    // Triangles: each grid cell is split in two. (Face culling is turned off when drawing,
    // so the winding order doesn't matter: the sphere is seen from inside either way.)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = r * (cols + 1) + c, b = a + cols + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
  }

  // The renderer for one format (360° / 180° / cubemap): `fmt` is one of formats.IDS.
  // Returns { upload(video), draw(viewerPose, layer, yaw), backdrop(), dispose() }. Switching formats
  // builds a new one (the sphere's size depends on the format).
  function createVideoSphere(gl, fmt) {
    const prog = G.createProgram(gl, VS, FS, 'video sphere');
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', model: 'uModel', xf: 'uUvXform', tex: 'uTex', mode: 'uMode' });
    const vaos = G.vertexArrays(gl);          // null only on bare WebGL 1; then we use the default VAO
    const vao = vaos ? vaos.create() : null;
    if (vaos) vaos.bind(vao);
    const mesh = buildSphere(formats.longitudeSpan(fmt));
    const spans = formats.eyeSpans(fmt);      // which part of the frame each eye sees
    const buffers = [
      G.floatAttribute(gl, prog, 'aPos', mesh.pos, 3),
      G.floatAttribute(gl, prog, 'aUv', mesh.uv, 2),
      G.indexBuffer(gl, mesh.idx),
    ];
    if (vaos) vaos.bind(null);
    const tex = G.texture2D(gl);

    // Copy the current video frame into the texture. Throws if the browser refuses
    // (e.g. a cross-origin video), so the caller can end the session with a message. With
    // the glass on it also rebuilds the mipmaps (the blurred copy the panels show).
    let mipped = false, lastYaw = 0;                // mipmaps made; the yaw it was last drawn at
    function upload(video) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      mipped = G.videoMipmaps(gl, ns.vrTokens.glass.on);
    }

    // What's behind the panels, for the glass look (vr-panel/panel-pass.js): the video's
    // texture and how it's mapped ('sphere': equirectangular over `span` radians of
    // longitude, `uvX` each eye's part of the frame across: { left, right }; 'eac': the
    // cubemap), turned by `yaw`. Builds the mipmaps at once if the glass was just turned on.
    // null while the glass is off.
    function backdrop() {
      if (!ns.vrTokens.glass.on) return null;
      if (!mipped) { gl.bindTexture(gl.TEXTURE_2D, tex); mipped = G.videoMipmaps(gl, true); }
      if (!mipped) return null;
      return { kind: formats.projectionMode(fmt) > 0.5 ? 'eac' : 'sphere', tex, span: formats.longitudeSpan(fmt), uvX: spans, yaw: lastYaw };
    }

    // The video is "at infinity": only the head's rotation matters, not its position.
    // yaw: the recenter angle; the sphere is turned by it so "front" is wherever you
    // recentered. Draws once per eye into that eye's part of the layer.
    function draw(viewerPose, layer, yaw) {
      gl.useProgram(prog);
      if (vaos) vaos.bind(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U.tex, 0);
      gl.uniform1f(U.mode, formats.projectionMode(fmt));
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      lastYaw = yaw;
      gl.uniformMatrix4fv(U.model, false, ns.math3d.rotationY(yaw));
      for (const view of viewerPose.views) {
        const vp = layer.getViewport(view);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        const m = Float32Array.from(view.transform.inverse.matrix);
        m[12] = m[13] = m[14] = 0;                  // drop the head's position, keep only its rotation
        gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
        gl.uniformMatrix4fv(U.view, false, m);
        // This eye's part of the frame (side by side: its half; a headset that names no eye
        // gets the left one).
        const [sx, ox] = view.eye === 'right' ? spans.right : spans.left;
        gl.uniform4fv(U.xf, [sx, 1, ox, 0]);
        gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
      }
      if (vaos) vaos.bind(null);
    }

    // Free the GPU objects (when the session ends or the format changes).
    function dispose() {
      buffers.forEach(b => gl.deleteBuffer(b));
      gl.deleteTexture(tex);
      if (vaos) vaos.remove(vao);
      gl.deleteProgram(prog);
    }

    return { upload, draw, backdrop, dispose };
  }

  ns.videoSphere = { createVideoSphere, buildSphere };
})(globalThis.__streamxr = globalThis.__streamxr || {});
