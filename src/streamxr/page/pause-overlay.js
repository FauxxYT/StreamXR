// While the video is paused: darkens the video with a black layer and shows a pause
// symbol fixed at the centre of the video. While it's buffering (and not paused): the
// loading spinner (vrGlyphs.spinner) in the same spot, without the dark layer, once the
// wait has lasted SETTINGS.bufferDelayMs. All fade in and out. Drawn right after the video,
// so the VR panel and controllers stay bright on top.
(function (ns) {
  'use strict';

  const TC = ns.vrTokens.color, TA = ns.vrTokens.alpha;   // design tokens (tokens.js)

  const { gl: G } = ns;

  const SETTINGS = {
    dim: 0.5,           // opacity of the dark layer (the surface colour, vr-panel/tokens.js; 0.5 = 50%)
    fadeMs: 180,        // fade in/out time
    distance: 2.0,      // pause symbol: metres in front of your eyes
    size: 0.45,         // pause symbol: width in metres
    spinnerScale: 0.7,  // buffering spinner: size relative to the pause symbol
    bufferDelayMs: 400, // buffering must last this long before the spinner shows (no flicker)
  };

  // Full-view dark layer (colour uColor, 0..1 RGB), drawn in clip space (covers each eye's viewport).
  const DIM_VS = `
    attribute vec2 aCorner;
    void main() { gl_Position = vec4(aCorner, 0.0, 1.0); }`;
  const DIM_FS = `
    precision mediump float; uniform float uAlpha; uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, uAlpha); }`;

  // Textured square for the pause symbol.
  const ICON_VS = `
    attribute vec3 aPos; attribute vec2 aUv;
    uniform mat4 uProj, uView; varying vec2 vUv;
    void main() { vUv = aUv; gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
  const ICON_FS = `
    precision mediump float; uniform sampler2D uTex; uniform float uAlpha; varying vec2 vUv;
    void main() { vec4 c = texture2D(uTex, vUv); gl_FragColor = vec4(c.rgb, c.a * uAlpha); }`;

  // The pause symbol, drawn once with canvas 2D: a dark disc with two rounded white bars.
  function drawPauseSymbol() {
    const S = 256, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    g.fillStyle = TA('surface', 0.55);
    g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.fill();
    g.fillStyle = TC.onSurface;
    const bw = S * 0.12, bh = S * 0.42, gap = S * 0.09;
    const r = bw * 0.25, y = S / 2 - bh / 2;
    for (const x of [S / 2 - gap / 2 - bw, S / 2 + gap / 2]) {
      g.beginPath();
      g.moveTo(x + r, y); g.arcTo(x + bw, y, x + bw, y + bh, r); g.arcTo(x + bw, y + bh, x, y + bh, r);
      g.arcTo(x, y + bh, x, y, r); g.arcTo(x, y, x + bw, y, r); g.closePath(); g.fill();
    }
    return cv;
  }

  // Returns { draw, dispose }. `vaos` is from ns.gl.vertexArrays(gl).
  function createPauseOverlay(gl, vaos) {
    const dimProg = G.createProgram(gl, DIM_VS, DIM_FS, 'pause dim');
    const iconProg = G.createProgram(gl, ICON_VS, ICON_FS, 'pause icon');
    const DU = G.uniforms(gl, dimProg, { alpha: 'uAlpha', color: 'uColor' });
    const IU = G.uniforms(gl, iconProg, { proj: 'uProj', view: 'uView', tex: 'uTex', alpha: 'uAlpha' });

    const dimVao = vaos.create(); vaos.bind(dimVao);
    const dimBuf = G.floatAttribute(gl, dimProg, 'aCorner', new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), 2);
    vaos.bind(null);

    const iconVao = vaos.create(); vaos.bind(iconVao);
    const posBuf = G.floatAttribute(gl, iconProg, 'aPos', new Float32Array(18), 3, gl.DYNAMIC_DRAW);
    const uvBuf = G.floatAttribute(gl, iconProg, 'aUv', new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]), 2);
    vaos.bind(null);
    const tex = G.texture2D(gl);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, drawPauseSymbol());
    // The spinner: a small canvas redrawn (and re-uploaded) every frame while it shows.
    const spinCanvas = document.createElement('canvas');
    spinCanvas.width = spinCanvas.height = 256;
    const spinG = spinCanvas.getContext('2d');
    const spinTex = G.texture2D(gl);

    let amount = 0, lastNow = 0;            // 0 = playing look, 1 = fully paused look
    let spin = 0, bufferingSince = 0;       // spinner fade (0..1); when the current buffering began

    // anchor: { position: [x, y, z], right, up, size } - where the symbol sits (the centre of the
    // video) and which way it faces.
    // Without one, it sits straight ahead of your head.
    // paused: is the video paused; now: a timestamp in ms (for the fades); buffering: is the
    // player waiting for data. Call every frame: it fades `amount` toward 1 (paused) or 0
    // (playing), and `spin` toward 1 while buffering (after bufferDelayMs, not while paused),
    // and draws nothing once both are 0.
    function draw(viewerPose, layer, paused, now, anchor, buffering) {
      const dt = lastNow ? Math.min(100, now - lastNow) : 0;      // capped so a stall doesn't skip the fade
      lastNow = now;
      const step = dt / SETTINGS.fadeMs;
      amount = paused ? Math.min(1, amount + step) : Math.max(0, amount - step);
      bufferingSince = buffering && !paused ? (bufferingSince || now) : 0;
      const showSpin = !!bufferingSince && now - bufferingSince >= SETTINGS.bufferDelayMs;
      spin = showSpin ? Math.min(1, spin + step) : Math.max(0, spin - step);
      if (amount <= 0 && spin <= 0) return;
      if (spin > 0) {
        spinG.clearRect(0, 0, 256, 256);
        ns.vrGlyphs.spinner(spinG, 128, 128, 72, now / 1000, true);
        gl.bindTexture(gl.TEXTURE_2D, spinTex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spinCanvas);
      }

      // The symbol stays fixed at the centre of the video, facing the way the video faces
      // (it neither follows nor turns with your head). Without an anchor: straight ahead.
      const h = viewerPose.transform.matrix;
      const fwd = [-h[8], -h[9], -h[10]];
      const c = anchor ? anchor.position
        : [h[12] + fwd[0] * SETTINGS.distance, h[13] + fwd[1] * SETTINGS.distance, h[14] + fwd[2] * SETTINGS.distance];
      const right = anchor && anchor.right || [h[0], h[1], h[2]];
      const up = anchor && anchor.up || [h[4], h[5], h[6]];
      const half = (anchor && anchor.size || SETTINGS.size) / 2;
      // A square centred on c, `s` half-wide, facing along right / up.
      const square = s => {
        const corner = (sx, sy) => [0, 1, 2].map(k => c[k] + (right[k] * sx + up[k] * sy) * s);
        return new Float32Array([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, -1), corner(1, 1), corner(-1, 1)].flat());
      };
      const pauseQuad = square(half), spinQuad = square(half * SETTINGS.spinnerScale);

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      // Darken colour only; leave the frame's alpha alone so the headset never sees it as see-through.
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      for (const view of viewerPose.views) {
        const vp = layer.getViewport(view);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);

        // 1) the black layer over the whole eye view and the pause symbol on top of it
        // (paused), 2) the spinner (buffering).
        if (amount > 0) {
          gl.useProgram(dimProg);
          gl.uniform1f(DU.alpha, SETTINGS.dim * amount);
          const n = parseInt(TC.surface.slice(1), 16);           // the surface colour (tokens.js)
          gl.uniform3f(DU.color, (n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
          vaos.bind(dimVao);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.useProgram(iconProg);
        gl.uniformMatrix4fv(IU.proj, false, view.projectionMatrix);
        gl.uniformMatrix4fv(IU.view, false, view.transform.inverse.matrix);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(IU.tex, 0);
        vaos.bind(iconVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        for (const [t, a, q] of [[tex, amount, pauseQuad], [spinTex, spin, spinQuad]]) {
          if (a <= 0) continue;
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.uniform1f(IU.alpha, a);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, q);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
      vaos.bind(null);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.BLEND);
    }

    // Free the GPU objects (called when the VR session ends).
    function dispose() {
      [dimBuf, posBuf, uvBuf].forEach(b => gl.deleteBuffer(b));
      vaos.remove(dimVao); vaos.remove(iconVao); gl.deleteTexture(tex); gl.deleteTexture(spinTex);
      gl.deleteProgram(dimProg); gl.deleteProgram(iconProg);
    }

    return { draw, dispose };
  }

  ns.pauseOverlay = { createPauseOverlay, SETTINGS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
