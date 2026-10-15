// Draws the controller meshes: decodes models.js, uploads one mesh per hand, and shades
// each part with its colour, blended toward the accent while pressed. The stick part is
// tilted in the vertex shader.
(function (ns) {
  'use strict';

  const { gl: G } = ns;
  const MAX_PARTS = 12;                     // must match the arrays in the shaders

  // Each vertex carries a position, a normal and a "part" number (body, stick, trigger, each
  // button ...). The vertex shader moves the stick part by uStick (the thumbstick tilt) and
  // places everything with uModel (the controller's pose).
  // The fragment shader picks the part's base colour from uColors, mixes toward the accent
  // colour by uPress (how pressed it is), then lights it: two fixed lights, a highlight
  // (spec) and a faint rim glow. Normals facing away from the eye are flipped, because the
  // CAD-derived faces aren't guaranteed to point outward. uAlpha fades the whole controller
  // (an idle one is drawn see-through: see draw()).
  const VS = `
    attribute vec3 aPos; attribute vec3 aNrm; attribute float aPart;
    uniform mat4 uProj, uView, uModel, uStick;
    varying vec3 vN; varying vec3 vW; varying float vPart;
    void main() {
      vec4 p = vec4(aPos, 1.0); vec3 n = aNrm;
      if (abs(aPart - 1.0) < 0.5) { p = uStick * p; n = mat3(uStick) * n; }   // part 1 = stick
      vec4 w = uModel * p;
      vW = w.xyz; vN = mat3(uModel) * n; vPart = aPart;
      gl_Position = uProj * uView * w;
    }`;
  const FS = `
    precision mediump float;
    uniform vec3 uColors[${MAX_PARTS}]; uniform float uPress[${MAX_PARTS}]; uniform vec3 uAccent; uniform vec3 uEye; uniform float uAlpha;
    varying vec3 vN; varying vec3 vW; varying float vPart;
    void main() {
      int k = int(vPart + 0.5);
      vec3 base = vec3(0.0); float pr = 0.0;
      for (int i = 0; i < ${MAX_PARTS}; i++) { if (i == k) { base = uColors[i]; pr = uPress[i]; } }
      base = mix(base, uAccent, pr);
      vec3 n = normalize(vN);
      vec3 v = normalize(uEye - vW);
      if (dot(n, v) < 0.0) n = -n;                       // tolerate flipped CAD faces
      vec3 l1 = normalize(vec3(0.3, 1.0, 0.4)), l2 = normalize(vec3(-0.5, 0.2, -0.6));
      float d = 0.55 * max(dot(n, l1), 0.0) + 0.25 * max(dot(n, l2), 0.0);
      float spec = pow(max(dot(n, normalize(l1 + v)), 0.0), 40.0) * 0.25;
      float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.18;
      gl_FragColor = vec4(base * (0.55 + d * 1.6) + spec + rim * vec3(0.7, 0.8, 1.0), uAlpha);
    }`;

  // Unpack one hand from models.js. Layout: Int16 pos[v*3] | Int8 normal[v*3] | Uint8 part[v] | pad | Uint16 index[t*3]
  // (the base64 blob holds those arrays back to back; positions are fixed-point, divided by
  // m.scale to get metres, normals are -127..127 for -1..1; `pad` keeps the indices aligned).
  // Returns plain float arrays ready for WebGL, plus the hand's anchor points.
  function decodeHand(m) {
    const buf = Uint8Array.from(atob(m.data), ch => ch.charCodeAt(0)).buffer;
    const nv = m.verts;
    const pos = new Int16Array(buf, 0, nv * 3), nrm = new Int8Array(buf, nv * 6, nv * 3);
    const part = new Uint8Array(buf, nv * 9, nv), index = new Uint16Array(buf, nv * 10 + m.pad, m.tris * 3);
    const positions = new Float32Array(nv * 3), normals = new Float32Array(nv * 3);
    for (let i = 0; i < positions.length; i++) { positions[i] = pos[i] / m.scale; normals[i] = nrm[i] / 127; }
    return { positions, normals, parts: Float32Array.from(part), index, anchors: m.anchors };
  }

  // models: the data from models.js. vaos: from ns.gl.vertexArrays(gl).
  // config: ns.controllerConfig (part colours, accent). Returns the pass's API; `anchors`
  // gives a hand's special points (e.g. the stick pivot), `has` says if a hand has a model.
  function createModelPass(gl, models, vaos, config) {
    if (models.parts.length > MAX_PARTS) throw new Error('models.js has more parts than the shader supports');
    const prog = G.createProgram(gl, VS, FS, 'controller');
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', model: 'uModel', stick: 'uStick',
      colors: 'uColors', press: 'uPress', accent: 'uAccent', eye: 'uEye', alpha: 'uAlpha' });
    const buffers = [], vaoList = [];

    // One colour per part (parts missing from config.colors fall back to the body colour).
    const colors = new Float32Array(MAX_PARTS * 3);
    models.parts.forEach((n, i) => colors.set(config.colors[n] || config.colors.body, i * 3));

    // Upload each hand's mesh once, each in its own VAO (models.R = right, models.L = left).
    const meshes = {};
    for (const [hand, key] of [['right', 'R'], ['left', 'L']]) {
      const d = decodeHand(models[key]);
      const vao = vaos.create(); vaos.bind(vao); vaoList.push(vao);
      buffers.push(G.floatAttribute(gl, prog, 'aPos', d.positions, 3),
                   G.floatAttribute(gl, prog, 'aNrm', d.normals, 3),
                   G.floatAttribute(gl, prog, 'aPart', d.parts, 1),
                   G.indexBuffer(gl, d.index));
      vaos.bind(null);
      meshes[hand] = { vao, count: d.index.length, anchors: d.anchors };
    }

    // hands: [{ handedness, model, press: Float32Array(MAX_PARTS), stick: mat4, alpha (0..1,
    // optional: how solid it's drawn) }]. `view` is one eye's XRView. Called once per eye by
    // controllers.js. A see-through controller (alpha < 1) is drawn twice: first depth only,
    // so only its nearest surface is left to colour, then blended on top of it with depth
    // test 'equal' (so you see a faded controller, not its insides overlapping each other).
    function draw(view, hands) {
      const eye = view.transform.position;
      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
      gl.uniform3fv(U.colors, colors);
      gl.uniform3fv(U.accent, config.accent);
      gl.uniform3f(U.eye, eye.x, eye.y, eye.z);
      for (const h of hands) {
        const mesh = meshes[h.handedness], alpha = h.alpha == null ? 1 : h.alpha;
        if (alpha < 0.01) continue;
        gl.uniformMatrix4fv(U.model, false, h.model);
        gl.uniformMatrix4fv(U.stick, false, h.stick);
        gl.uniform1fv(U.press, h.press);
        gl.uniform1f(U.alpha, alpha);
        vaos.bind(mesh.vao);
        if (alpha > 0.99) { gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0); continue; }
        gl.colorMask(false, false, false, false);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
        gl.colorMask(true, true, true, true);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthFunc(gl.EQUAL); gl.depthMask(false);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
        gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND);
      }
      vaos.bind(null);
    }

    // Free the GPU objects (called when the VR session ends).
    function dispose() {
      buffers.forEach(b => gl.deleteBuffer(b));
      vaoList.forEach(v => vaos.remove(v));
      gl.deleteProgram(prog);
    }

    return { MAX_PARTS, anchors: hand => meshes[hand].anchors, has: hand => !!meshes[hand], draw, dispose };
  }

  ns.controllerModelPass = { createModelPass, decodeHand, MAX_PARTS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
