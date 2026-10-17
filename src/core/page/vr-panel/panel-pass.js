// Draws a 2D canvas (the control panel, the Up Next panel, the toolbar...) as a textured
// rectangle floating in the world. The UI itself is drawn with canvas 2D elsewhere; this
// turns that canvas into a WebGL texture, places it in 3D and, with the glass look on,
// shows the video behind it blurred under the canvas (Materials-Redesign.md, step 4).
//
// The glass: the video renderer describes what's behind the panels (a "backdrop": the video
// texture with mipmaps, and either a sphere around you or the cinema screen; see backdrop()
// in streamxr/page/video-sphere.js and cinema-screen.js). For each panel pixel the shader
// follows the ray from the eye through it to that sphere or screen, and samples a small
// (blurry) mipmap there; the canvas, whose background is the surface colour at the glass
// tint (tokens.js panelFill), is laid over it. Then a fine grain and a rim light, brighter
// along the top edge. Only the video is blurred, not other panels behind a panel.
(function (ns) {
  'use strict';

  const { gl: G } = ns;

  // Vertex shader: a unit square (corners -0.5..0.5) scaled to the panel's size in metres,
  // moved by the panel's pose (uModel) and the eye's view/projection. vUv flips y because
  // canvas row 0 is the top while the square's +y is up; vWorld is the point in the world
  // (for the glass's ray from the eye).
  const VS = `
    attribute vec2 aCorner;                 // -0.5..0.5
    uniform mat4 uProj, uView, uModel; uniform vec2 uSize;
    varying vec2 vUv; varying vec3 vWorld;
    void main() {
      vUv = vec2(aCorner.x + 0.5, 0.5 - aCorner.y);
      vec4 w = uModel * vec4(aCorner * uSize, 0.0, 1.0);
      vWorld = w.xyz;
      gl_Position = uProj * uView * w;
    }`;

  // Fragment shader. Without the glass (uGlass 0): the canvas pixel; fully transparent
  // pixels are discarded so they don't write depth (rounded corners stay see-through).
  // Either way, uAlpha fades the result (a panel opening or closing).
  // With the glass:
  //   - mask: how much of the panel is here, from the canvas's alpha (its background is
  //     drawn at the tint, so alpha / tint is 1 anywhere on the panel, less on its
  //     antialiased edge, 0 outside it);
  //   - behind(): the ray from the eye (uEye) through this point, into the backdrop:
  //       uKind 1 'sphere' (equirectangular, uSpan radians of longitude, turned by uYaw;
  //       its across coordinate then scaled and shifted by uUvX: (1, 0) for the whole
  //       frame, (0.5, 0) / (0.5, 0.5) for the left / right eye's half of a side-by-side 3D
  //       frame, set per eye),
  //       uKind 2 'eac' (YouTube's cubemap, the same layout as video-sphere.js),
  //       uKind 3 'screen' (the cinema screen: centre uScrC, axes uScrR / uScrU / uScrN
  //       (toward you), size uScrSize, bent by uBend radians around a vertical circle);
  //     its texture coordinates, or "outside" (the dark void colour, uVoid);
  //   - the blur: the backdrop texture with a mipmap bias (texture2D's third argument, so
  //     a much smaller mipmap is read), at the centre and four points around it (uBlur
  //     apart, in texture coordinates);
  //   - the canvas over that, a faint grain (a hash of the pixel position), and the rim:
  //     where the mask ends a few pixels up (the top edge) a brighter line, and a faint one
  //     on the other edges (uTexel: one canvas pixel in texture coordinates); only where the
  //     canvas is glass (drawn at the tint), not along solid things drawn on it.
  const FS = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform sampler2D uTex, uBack;
    uniform float uGlass, uTint, uKind, uSpan, uYaw, uBend, uBlur, uAlpha;
    uniform vec3 uEye, uScrC, uScrR, uScrU, uScrN, uVoid;
    uniform vec2 uScrSize, uTexel, uUvX;
    uniform vec3 uGlow;                     // the cinema screen's glow: strength (0: none), reach (m), corner radius (m)
    varying vec2 vUv; varying vec3 vWorld;
    const float PI = 3.14159265;

    vec2 eacUv(vec3 d) {
      vec3 a = abs(d);
      vec2 st; vec2 cell; float rot = 0.0;
      if (a.z >= a.x && a.z >= a.y) {
        if (d.z < 0.0) { st = vec2(d.x, -d.y) / a.z; cell = vec2(1.0, 0.0); }
        else           { st = vec2(-d.x, -d.y) / a.z; cell = vec2(1.0, 1.0); rot = 1.0; }
      } else if (a.x >= a.y) {
        if (d.x > 0.0) { st = vec2(d.z, -d.y) / a.x; cell = vec2(2.0, 0.0); }
        else           { st = vec2(-d.z, -d.y) / a.x; cell = vec2(0.0, 0.0); }
      } else {
        if (d.y > 0.0) { st = vec2(d.x, -d.z) / a.y; cell = vec2(2.0, 1.0); rot = 3.0; }
        else           { st = vec2(d.x, d.z) / a.y; cell = vec2(0.0, 1.0); rot = 3.0; }
      }
      st = (atan(st) * (4.0 / PI) + 1.0) * 0.5;
      if (rot == 1.0) st = vec2(1.0 - st.y, st.x);
      else if (rot == 3.0) st = vec2(st.y, 1.0 - st.x);
      st = clamp(st, 0.002, 0.998);
      return (cell + st) / vec2(3.0, 2.0);
    }

    // xy: the backdrop's texture coordinates for the ray; z: 1 if it hits the video, 0.5 if
    // it hits the cinema screen's plane (or cylinder) outside the picture (where its glow is).
    vec3 behind(vec3 eye, vec3 d) {
      if (uKind < 2.5) {
        // Into the sphere's own frame (it's turned by uYaw around the vertical).
        float c = cos(uYaw), s = sin(uYaw);
        vec3 l = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
        if (uKind > 1.5) return vec3(eacUv(l), 1.0);
        float lon = atan(l.x, -l.z), pol = acos(clamp(l.y, -1.0, 1.0));
        return vec3((lon / uSpan + 0.5) * uUvX.x + uUvX.y, pol / PI, step(abs(lon), uSpan * 0.5));
      }
      // The cinema screen, in its own axes.
      vec3 e = eye - uScrC;
      float x, y, t;
      if (uBend < 0.0001) {
        float dn = dot(d, uScrN);
        if (abs(dn) < 1e-5) return vec3(0.0);
        t = -dot(e, uScrN) / dn;
        vec3 p = e + t * d;
        x = dot(p, uScrR); y = dot(p, uScrU);
      } else {
        // A vertical circle of radius r whose centre is r in front of the screen's centre;
        // you're inside it, so the far crossing is the screen.
        float r = uScrSize.x / uBend;
        vec2 e2 = vec2(dot(e, uScrR), dot(e, uScrN) - r), d2 = vec2(dot(d, uScrR), dot(d, uScrN));
        float A = dot(d2, d2), B = 2.0 * dot(e2, d2), C = dot(e2, e2) - r * r;
        float disc = B * B - 4.0 * A * C;
        if (A < 1e-6 || disc < 0.0) return vec3(0.0);
        t = (-B + sqrt(disc)) / (2.0 * A);
        vec2 q = e2 + t * d2;
        x = atan(q.x, -q.y) * r;                       // the arc length along the screen
        y = dot(e + t * d, uScrU);
      }
      vec2 uv = vec2(x / uScrSize.x + 0.5, 0.5 - y / uScrSize.y);
      float inside = step(abs(uv.x - 0.5), 0.5) * step(abs(uv.y - 0.5), 0.5);
      return vec3(uv, step(0.0, t) * (0.5 + 0.5 * inside));
    }

    float maskAt(vec2 uv) { return clamp(texture2D(uTex, uv).a / max(uTint, 0.05), 0.0, 1.0); }

    void main() {
      vec4 c = texture2D(uTex, vUv);
      if (uGlass < 0.5) { if (c.a < 0.01) discard; gl_FragColor = vec4(c.rgb, c.a * uAlpha); return; }
      float m = clamp(c.a / max(uTint, 0.05), 0.0, 1.0);
      if (m < 0.01) discard;
      vec3 back = uVoid;
      if (uKind > 0.5) {
        vec3 b = behind(uEye, normalize(vWorld - uEye));
        if (b.z > 0.75) {
          const float BIAS = 5.0;
          vec3 s = texture2D(uBack, b.xy, BIAS).rgb * 0.4;
          s += texture2D(uBack, b.xy + vec2(uBlur, uBlur), BIAS).rgb * 0.15;
          s += texture2D(uBack, b.xy + vec2(-uBlur, uBlur), BIAS).rgb * 0.15;
          s += texture2D(uBack, b.xy + vec2(uBlur, -uBlur), BIAS).rgb * 0.15;
          s += texture2D(uBack, b.xy + vec2(-uBlur, -uBlur), BIAS).rgb * 0.15;
          back = s;
        } else if (b.z > 0.25 && uGlow.x > 0.0) {
          // Past the screen's edge: its glow (cinema-screen.js GLOW_FS) added to the dark, the
          // colour of the nearest edge (texture coordinates past the picture read its edge:
          // the texture clamps) from a blurrier mipmap, fading out over uGlow.y metres from the
          // rounded rectangle (corner radius uGlow.z).
          vec2 p = (b.xy - 0.5) * uScrSize;
          vec2 q = abs(p) - uScrSize * 0.5 + uGlow.z;
          float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uGlow.z;
          float k = clamp(dist / uGlow.y, 0.0, 1.0), a = uGlow.x * (1.0 - k) * (1.0 - k);
          if (a > 0.002) back += texture2D(uBack, b.xy, 6.0).rgb * a;
        }
      }
      float grain = fract(sin(dot(floor(vUv / uTexel), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      back += grain * 0.03;
      vec3 rgb = mix(back, c.rgb, c.a);
      float up = maskAt(vUv - vec2(0.0, uTexel.y * 3.0)), dn = maskAt(vUv + vec2(0.0, uTexel.y * 2.0));
      float lf = maskAt(vUv - vec2(uTexel.x * 2.0, 0.0)), rt = maskAt(vUv + vec2(uTexel.x * 2.0, 0.0));
      float edge = 1.0 - min(min(up, dn), min(lf, rt));
      // Only glass shines: next to something solid drawn on the canvas (a button, an opaque
      // pill: alpha above the tint), no rim, so solid things don't look like glass.
      float solid = max(max(max(texture2D(uTex, vUv - vec2(0.0, uTexel.y * 3.0)).a, texture2D(uTex, vUv + vec2(0.0, uTexel.y * 2.0)).a),
                            max(texture2D(uTex, vUv - vec2(uTexel.x * 2.0, 0.0)).a, texture2D(uTex, vUv + vec2(uTexel.x * 2.0, 0.0)).a)), c.a);
      float glassy = 1.0 - smoothstep(uTint + 0.02, min(uTint + 0.1, 1.0), solid);
      rgb += vec3(0.32 * (1.0 - up) + 0.08 * edge) * m * glassy;
      gl_FragColor = vec4(rgb, m * uAlpha);
    }`;

  const KINDS = { sphere: 1, eac: 2, screen: 3 };
  // The blur's spread (texture coordinates between the taps), per kind: the sphere's
  // texture spans all the way around, the screen's only the screen.
  const BLUR = { sphere: 0.006, eac: 0.008, screen: 0.02 };
  const VOID = [0.02, 0.02, 0.025];                         // the dark around a cinema screen

  // One pass per canvas: `canvas` is the UI's drawing surface, `vaos` comes from
  // ns.gl.vertexArrays(gl). Returns { upload, draw, dispose }.
  function createPanelPass(gl, vaos, canvas) {
    const prog = G.createProgram(gl, VS, FS, 'vr panel');
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', model: 'uModel', size: 'uSize', tex: 'uTex', back: 'uBack',
      alpha: 'uAlpha', glass: 'uGlass', tint: 'uTint', kind: 'uKind', span: 'uSpan', yaw: 'uYaw', bend: 'uBend', blur: 'uBlur', eye: 'uEye',
      scrC: 'uScrC', scrR: 'uScrR', scrU: 'uScrU', scrN: 'uScrN', voidC: 'uVoid', scrSize: 'uScrSize', texel: 'uTexel', glow: 'uGlow', uvX: 'uUvX' });
    const vao = vaos.create(); vaos.bind(vao);
    // Two triangles making the square (6 corners, x/y pairs).
    const buf = G.floatAttribute(gl, prog, 'aCorner', new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5]), 2);
    vaos.bind(null);
    const tex = G.texture2D(gl);

    // Re-upload the canvas after the UI redrew it. (Not premultiplied: the shader outputs
    // straight alpha and the caller blends with SRC_ALPHA.)
    function upload() {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    }

    // model: the panel's pose (centre, +Z facing you); size: [width, height] in metres.
    // backdrop: what's behind it for the glass (see the top of the file), or null: no
    // video to blur (the panel is then drawn as its canvas, tinted background and all).
    // alpha (0..1): the whole panel faded, while it opens or closes (vr-panel.js).
    function draw(view, model, size, backdrop, alpha = 1) {
      const glass = ns.vrTokens.glass;
      gl.useProgram(prog);
      gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
      gl.uniformMatrix4fv(U.model, false, model);
      gl.uniform2f(U.size, size[0], size[1]);
      gl.uniform1f(U.alpha, alpha);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U.tex, 0);
      const on = !!(glass.on && backdrop);
      gl.uniform1f(U.glass, on ? 1 : 0);
      if (on) {
        const p = view.transform.position;
        gl.uniform1f(U.tint, glass.tint);
        gl.uniform3f(U.eye, p.x, p.y, p.z);
        gl.uniform2f(U.texel, 1 / canvas.width, 1 / canvas.height);
        gl.uniform3fv(U.voidC, VOID);
        gl.uniform1f(U.kind, KINDS[backdrop.kind] || 0);
        gl.uniform1f(U.blur, BLUR[backdrop.kind] || 0.01);
        gl.uniform1f(U.span, backdrop.span || Math.PI * 2);
        gl.uniform1f(U.yaw, backdrop.yaw || 0);
        // (uvX: one [scale, offset] for both eyes, or { left, right }: each eye its own part)
        const ux = backdrop.uvX, eyeX = !ux ? [1, 0] : Array.isArray(ux) ? ux : view.eye === 'right' ? ux.right : ux.left;
        gl.uniform2fv(U.uvX, eyeX);
        if (backdrop.kind === 'screen') {
          gl.uniform3fv(U.scrC, backdrop.centre); gl.uniform3fv(U.scrR, backdrop.right);
          gl.uniform3fv(U.scrU, backdrop.up); gl.uniform3fv(U.scrN, backdrop.normal);
          gl.uniform2f(U.scrSize, backdrop.size[0], backdrop.size[1]);
          gl.uniform1f(U.bend, backdrop.bend || 0);
          const gw = backdrop.glow;                      // (null: no glow)
          gl.uniform3f(U.glow, gw ? gw.strength : 0, gw ? gw.reach : 1, gw ? gw.radius : 0);
        }
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, backdrop.tex);
        gl.uniform1i(U.back, 1);
        gl.activeTexture(gl.TEXTURE0);
      }
      vaos.bind(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      vaos.bind(null);
    }

    // Free the GPU objects (called when the VR session ends).
    function dispose() { gl.deleteBuffer(buf); gl.deleteTexture(tex); vaos.remove(vao); gl.deleteProgram(prog); }

    return { upload, draw, dispose };
  }

  ns.vrPanelPass = { createPanelPass };
})(globalThis.__streamxr = globalThis.__streamxr || {});
