// Draws the action icons as small billboards (always facing the eye) floating next to the
// controller parts they belong to.
(function (ns) {
  'use strict';

  const { gl: G, math3d: M, controllerIcons: Icons } = ns;

  // Both shaders are minimal: the quads are built in world space on the CPU each frame
  // (billboards), the vertex shader only projects them, and the fragment shader samples the
  // icon atlas and applies a per-icon fade (uAlpha), discarding the transparent corners.
  const VS = `
    attribute vec3 aPos; attribute vec2 aUv;
    uniform mat4 uProj, uView; varying vec2 vUv;
    void main() { vUv = aUv; gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
  const FS = `
    precision mediump float; uniform sampler2D uTex; uniform float uAlpha; varying vec2 vUv;
    void main() { vec4 c = texture2D(uTex, vUv); if (c.a < 0.02) discard; gl_FragColor = vec4(c.rgb, c.a * uAlpha); }`;

  // icons: [{ part, icon, lift, size, useTop }] (built in controllers.js from the bindings
  // and config.iconPlacement). minAlpha: how faint an icon gets when it faces away.
  // Returns { draw, dispose }.
  function createIconPass(gl, vaos, icons, minAlpha) {
    const prog = G.createProgram(gl, VS, FS, 'controller icons');
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', tex: 'uTex', alpha: 'uAlpha' });

    const vao = vaos.create(); vaos.bind(vao);
    const posBuf = G.floatAttribute(gl, prog, 'aPos', new Float32Array(18), 3, gl.DYNAMIC_DRAW);   // rewritten for every icon
    const uvBuf = G.floatAttribute(gl, prog, 'aUv', new Float32Array(12), 2, gl.DYNAMIC_DRAW);
    vaos.bind(null);

    // All icons live in one texture (a horizontal strip), uploaded at the start and again
    // whenever the colours change (a colour theme or the glass setting: tokens.js glass.version).
    const atlas = G.texture2D(gl);
    let atlasVersion = null;
    function refreshAtlas() {
      const v = ns.vrTokens ? ns.vrTokens.glass.version : 0;
      if (v === atlasVersion) return;
      atlasVersion = v;
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, Icons.drawAtlas());
      holdKey = '';                                         // the countdown too
    }

    // A held button's countdown (icons.js drawHold) has its own small texture, redrawn and
    // uploaded only when what it shows changes (so once per frame at most, not per eye).
    const holdCanvas = document.createElement('canvas');
    const holdTex = G.texture2D(gl);
    let holdKey = '';
    function holdTexture(hold) {
      const key = `${hold.fraction.toFixed(3)}|${hold.secondsLeft}|${hold.done}`;
      if (key !== holdKey) {
        holdKey = key;
        gl.bindTexture(gl.TEXTURE_2D, holdTex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, Icons.drawHold(holdCanvas, hold));
      }
      return holdTex;
    }

    // hands: [{ model, anchors, swap?, hold?, alpha? }]  (the same list the model pass draws). swap:
    // icon name -> another icon to show instead on that hand (e.g. { seek: 'scroll' } while
    // its stick scrolls a panel). hold: a button held for a hold binding ({ part, fraction,
    // secondsLeft, done }, input.js holds()): that part's icon shows the countdown instead.
    // Called once per eye.
    function draw(view, hands) {
      refreshAtlas();
      const eye = view.transform.position;
      const vm = view.transform.matrix;                        // camera axes in world space
      const right = [vm[0], vm[1], vm[2]], up = [vm[4], vm[5], vm[6]];

      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform1i(U.tex, 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      vaos.bind(vao);

      for (const h of hands) {
        for (const ic of icons) {
          // anchors[part]: { c: centre, top: highest point, n: outward normal } in grip space.
          const a = h.anchors[ic.part];
          if (!a) continue;
          // Icon position: the part's centre (or top), pushed out along its normal by `lift`,
          // then moved into the world with the controller's pose.
          const base = ic.useTop ? a.top : a.c;
          const p = M.transformPoint(h.model, base.map((x, i) => x + a.n[i] * ic.lift));
          // Fade icons that point away from you (e.g. the trigger while you look at the faceplate).
          const toEye = [eye.x - p[0], eye.y - p[1], eye.z - p[2]];
          const facing = M.dot(M.transformDir(h.model, a.n), toEye) / (M.length(toEye) || 1);
          const alpha = Math.max(minAlpha, Math.min(1, 0.75 + facing));

          // Billboard: a square spanned by the eye's right/up axes, so it always faces you.
          const s = ic.size / 2;
          const corner = (sx, sy) => [0, 1, 2].map(k => p[k] + (right[k] * sx + up[k] * sy) * s);
          const quad = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, -1), corner(1, 1), corner(-1, 1)].flat();
          // Texture coordinates: this icon's slice of the atlas, full height; or all of the
          // countdown texture while this part is being held.
          const counting = h.hold && h.hold.part === ic.part;
          const [u0, u1] = counting ? [0, 1] : Icons.uRange((h.swap && h.swap[ic.icon]) || ic.icon);
          const uv = [u0, 1, u1, 1, u1, 0, u0, 1, u1, 0, u0, 0];
          gl.bindTexture(gl.TEXTURE_2D, counting ? holdTexture(h.hold) : atlas);
          gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(quad));
          gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(uv));
          gl.uniform1f(U.alpha, alpha * (h.alpha == null ? 1 : h.alpha));   // (a controller left idle fades, icons too)
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }

      vaos.bind(null);
      gl.disable(gl.BLEND); gl.depthMask(true);
    }

    // Free the GPU objects (called when the VR session ends).
    function dispose() {
      gl.deleteBuffer(posBuf); gl.deleteBuffer(uvBuf);
      gl.deleteTexture(atlas); gl.deleteTexture(holdTex); vaos.remove(vao); gl.deleteProgram(prog);
    }

    return { draw, dispose };
  }

  ns.controllerIconPass = { createIconPass };
})(globalThis.__streamxr = globalThis.__streamxr || {});
