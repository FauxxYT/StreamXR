// Captions in VR: the site's caption lines (the ones it shows on the page right now; the
// site reads them, e.g. youtube-player.js captionLines()), drawn as TV-style text, white on
// a dark see-through box per line, over the bottom of the video: near the bottom edge of the
// cinema screen (its captionAnchor), or for 180°/360° videos low in front of you, turning
// after your view only when you look well to the side, and gliding (no up and down). Drawn after the video and the pause overlay, before
// the panels.
//
//   const cap = ns.captionsOverlay.create(gl, vaos);
//   cap.draw(viewerPose, layer, lines, anchor)   lines: [text] (none: nothing drawn);
//     anchor: { position (the bottom middle of the text block), right, up, lineHeight (m) }
//     or null (180°/360°: placed from your head, see SETTINGS)
//   cap.dispose()
(function (ns) {
  'use strict';

  const { gl: G, math3d: M } = ns;

  const SETTINGS = {
    distance: 2.0,      // 180°/360°: metres in front of you
    below: 22,          // 180°/360°: degrees below the horizon (it turns with you, not up and down)
    lineHeight: 0.075,  // 180°/360°: one line's height (m) at that distance
    followTime: 0.45,   // 180°/360°: seconds its catching up with your view takes (most of the way)
    startDeg: 25,       // 180°/360°: degrees you can look sideways before it starts following
    stopDeg: 1,         // 180°/360°: ...and how close in front of you it settles
    canvasW: 1600,      // the text canvas (px): wide enough for two long lines
    linePx: 64,         // one line's height on the canvas (px)
  };

  // A textured quad (two triangles) placed in the world by its corners.
  const VS = `
    attribute vec3 aPos; attribute vec2 aUv;
    uniform mat4 uProj, uView; varying vec2 vUv;
    void main() { vUv = aUv; gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
  const FS = `
    precision mediump float; uniform sampler2D uTex; varying vec2 vUv;
    void main() { vec4 c = texture2D(uTex, vUv); if (c.a < 0.01) discard; gl_FragColor = c; }`;

  function create(gl, vaos) {
    const prog = G.createProgram(gl, VS, FS, 'captions');
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', tex: 'uTex' });
    const vao = vaos.create(); vaos.bind(vao);
    const posBuf = G.floatAttribute(gl, prog, 'aPos', new Float32Array(18), 3, gl.DYNAMIC_DRAW);
    const uvBuf = G.floatAttribute(gl, prog, 'aUv', new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]), 2);
    vaos.bind(null);
    const tex = G.texture2D(gl);
    const canvas = document.createElement('canvas');
    canvas.width = SETTINGS.canvasW; canvas.height = SETTINGS.linePx;
    const g = canvas.getContext('2d');
    let drawnKey = '', used = { w: 1, h: 1 };          // what the texture shows; how much of the canvas the text uses (px)
    let lookYaw = null, following = false, lastNow = null;   // 180°/360°: which way the captions face (follows your view lazily)

    // Draw the lines onto the canvas (only when they change) and upload it. Each line gets
    // its own rounded dark box, centred; the canvas grows to hold them.
    function paint(lines) {
      const key = lines.join('\n');
      if (key === drawnKey) return;
      drawnKey = key;
      const LH = SETTINGS.linePx, padX = 18, font = `500 ${Math.round(LH * 0.66)}px Roboto, Arial, sans-serif`;
      g.font = font;
      const widths = lines.map(l => Math.min(SETTINGS.canvasW - padX * 2, g.measureText(l).width));
      const h = LH * lines.length;
      if (canvas.height !== h) canvas.height = h;       // (resizing clears it and resets the font)
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      lines.forEach((l, i) => {
        const w = widths[i] + padX * 2, x = (canvas.width - w) / 2, y = i * LH;
        g.fillStyle = 'rgba(8, 8, 8, 0.72)';
        g.beginPath(); g.roundRect(x, y + 2, w, LH - 4, 8); g.fill();
        g.fillStyle = '#ffffff';
        g.fillText(l, canvas.width / 2, y + LH / 2 + 1, SETTINGS.canvasW - padX * 2);
      });
      used = { w: canvas.width, h };
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    }

    // 180°/360°: the anchor `below` degrees under the horizon, in the direction it faces: that
    // turns after your view only once you've looked well away (so reading doesn't make it swim).
    function headAnchor(viewerPose, now) {
      const h = viewerPose.transform.matrix, p = viewerPose.transform.position;
      const fwd = [-h[8], -h[9], -h[10]];
      const yaw = Math.atan2(-fwd[0], -fwd[2]);
      const dt = lastNow == null ? 0 : Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      if (lookYaw == null) lookYaw = yaw;
      let dy = yaw - lookYaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));       // the short way round
      // Start following once you've looked startDeg away, then glide all the way back in
      // front of you (eased: a share of the gap each moment, the same at any frame rate) and
      // rest there until you look away again.
      const deg = Math.abs(dy) * 180 / Math.PI;
      if (!following && deg > SETTINGS.startDeg) following = true;
      if (following) {
        lookYaw += dy * (1 - Math.exp(-dt / SETTINGS.followTime));
        if (deg < SETTINGS.stopDeg) following = false;
      }
      const pitchC = -SETTINGS.below * Math.PI / 180, d = SETTINGS.distance;
      const dir = [-Math.sin(lookYaw) * Math.cos(pitchC), Math.sin(pitchC), -Math.cos(lookYaw) * Math.cos(pitchC)];
      const right = [Math.cos(lookYaw), 0, -Math.sin(lookYaw)];
      const up = M.normalize(M.cross(dir.map(v => -v), right));   // facing you, upright
      return { position: [p.x + dir[0] * d, p.y + dir[1] * d, p.z + dir[2] * d], right, up, lineHeight: SETTINGS.lineHeight };
    }

    function draw(viewerPose, layer, lines, anchor) {
      if (!lines || !lines.length) return;           // (where it faces is kept between lines)
      paint(lines);
      const a = anchor || headAnchor(viewerPose, performance.now());
      // The quad: the text block's width and height in metres, standing on a.position (its
      // bottom middle).
      const hM = a.lineHeight * lines.length, wM = hM * used.w / used.h;
      const c = a.position, r = a.right, u = a.up;
      const corner = (sx, sy) => [0, 1, 2].map(k => c[k] + r[k] * sx * wM / 2 + u[k] * sy * hM);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([corner(-1, 0), corner(1, 0), corner(1, 1), corner(-1, 0), corner(1, 1), corner(-1, 1)].flat()));
      gl.useProgram(prog);
      vaos.bind(vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U.tex, 0);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);   // (the frame's alpha stays as it is)
      for (const view of viewerPose.views) {
        const vp = layer.getViewport(view);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
        gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.BLEND);
      vaos.bind(null);
    }

    function dispose() { gl.deleteBuffer(posBuf); gl.deleteBuffer(uvBuf); gl.deleteTexture(tex); vaos.remove(vao); gl.deleteProgram(prog); }

    return { draw, dispose };
  }

  ns.captionsOverlay = { create, SETTINGS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
