// WebGL helpers shared by the renderers. Works with WebGL 2 or WebGL 1.
(function (ns) {
  'use strict';

  // Compile and link a program. Logs (rather than throws) shader errors so a broken
  // optional renderer can't take down the video.
  function createProgram(gl, vsSource, fsSource, label = 'program') {
    const prog = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vsSource], [gl.FRAGMENT_SHADER, fsSource]]) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn(`[streamxr] ${label} shader:`, gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
      gl.deleteShader(sh);                     // freed once the program is deleted
    }
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.warn(`[streamxr] ${label} link:`, gl.getProgramInfoLog(prog));
    return prog;
  }

  // Look up several uniform locations: uniforms(gl, prog, { proj: 'uProj', ... }).
  function uniforms(gl, prog, names) {
    const out = {};
    for (const [key, name] of Object.entries(names)) out[key] = gl.getUniformLocation(prog, name);
    return out;
  }

  // Vertex array objects (WebGL 2 core, or the WebGL 1 extension). Each renderer keeps its
  // attribute setup in its own VAO, so renderers can't disturb each other's state.
  // Returns null if neither is available.
  function vertexArrays(gl) {
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    if (isGL2) {
      return { create: () => gl.createVertexArray(), bind: v => gl.bindVertexArray(v), remove: v => gl.deleteVertexArray(v) };
    }
    const ext = gl.getExtension('OES_vertex_array_object');
    if (!ext) return null;
    return { create: () => ext.createVertexArrayOES(), bind: v => ext.bindVertexArrayOES(v), remove: v => ext.deleteVertexArrayOES(v) };
  }

  // Upload a float attribute into a new buffer and point `name` at it (in the bound VAO).
  function floatAttribute(gl, prog, name, data, size, usage = gl.STATIC_DRAW) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const loc = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return buf;
  }

  // Upload triangle indices (which vertices form each triangle) into a new buffer.
  function indexBuffer(gl, data) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buf;
  }

  // A new empty 2D texture (left bound), with smoothing `filter` and edge behaviour `wrap`.
  // Callers fill it with texImage2D (video frames, canvases, thumbnails).
  function texture2D(gl, { filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE } = {}) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return tex;
  }

  // For the glass look (panel-pass.js): after a new frame is uploaded into the bound 2D
  // texture, rebuild its mipmaps (smaller, smoothed copies; sampling a small one gives the
  // blur) when `on`, or go back to plain filtering when not. WebGL 2 only (WebGL 1 can't
  // mipmap a video's odd sizes); returns whether the texture has mipmaps now.
  function videoMipmaps(gl, on) {
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const want = on && isGL2;
    if (want) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, want ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    return want;
  }

  ns.gl = { createProgram, uniforms, vertexArrays, floatAttribute, indexBuffer, texture2D, videoMipmaps };
})(globalThis.__streamxr = globalThis.__streamxr || {});
