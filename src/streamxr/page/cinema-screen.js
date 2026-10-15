// Shows a regular (flat) video on a big screen in front of you, like a cinema. Same
// interface as the video sphere: upload(video), draw(viewerPose, layer), backdrop() (for the
// panels' glass), place(head, yaw),
// dispose(); plus reset() (the global reset: default size, curve and glow). Unlike the sphere, the screen stays put in the room, so you can lean and
// look around it.
//
// It can also be resized (rounded handles around the bottom corners) and moved (bar under
// the screen) with the laser + grip; `interaction` is the object the laser system uses
// (see src/core/page/vr-panel/vr-panel.js, setTargets). It can be curved (part of a cylinder
// around you), its distance set and a glow around it in its edges' colours turned on or off
// from the Settings panel. Size, placement, curve and glow are remembered.
(function (ns) {
  'use strict';

  const { gl: G, math3d: M } = ns;

  const SETTINGS = {
    distance: 3.0,      // metres in front of you (default; your last choice is remembered)
    minDistance: 1.0,   // limits for the Distance slider (the nearest is also kept behind the panels: minDistance())
    behindPanels: 0.3,  // metres the screen stays behind the VR panels at the least (their distance: vr-panel/config.js layout)
    maxDistance: 12.0,
    width: 3.2,         // metres (height follows the video's shape)
    raise: 0.05,        // metres above eye level for the screen's centre
    minWidth: 1.0,      // limits for resizing with the corner handles
    maxWidth: 12.0,
    curve: false,       // curved screen on/off (default)
    curveAmount: 0.5,   // 0..1; 1 = curved so every column is equally far from you
    columns: 64,        // vertical strips the screen is built from (smoothness of the curve)
    cornerRadius: 0.025, // the picture's rounded corners: radius as a share of the screen's width
    glow: true,          // the glow around the screen in the colours of its edges on/off (default)
    glowStrength: 1,     // 0..1 (default)
    glowReach: 0.8,      // how far out it reaches, as a share of the screen's height (default)
    minGlowReach: 0.1,   // limits for the Glow length slider
    maxGlowReach: 0.8,
    glowDetail: 32,      // how blurred its colours are: read from the mipmap level about this many texels wide
    storageKey: 'cinemaScreen',   // storage.js name for the remembered size/placement/curve
  };

  // Remembered size/placement/curve (storage.js: the page's localStorage, this browser only).
  // savePrefs merges `patch` into what's stored, so each caller only writes its own keys.
  const loadPrefs = () => ns.storage.getJSON(SETTINGS.storageKey) || {};
  const savePrefs = patch => ns.storage.setJSON(SETTINGS.storageKey, { ...loadPrefs(), ...patch });

  // The nearest the screen may come (metres): never in front of the VR panels (it would
  // cut through them), so behindPanels behind their distance, and at least minDistance.
  const minDistance = () => Math.max(SETTINGS.minDistance,
    (ns.vrPanelConfig ? ns.vrPanelConfig.layout.distance : 0) + SETTINGS.behindPanels);

  // The remembered curve settings: { on, amount (0..1) }. Readable while the screen isn't
  // shown, so the Settings panel can show them for any format.
  function curvePrefs() {
    const p = loadPrefs();
    return { on: p.curve != null ? !!p.curve : SETTINGS.curve, amount: p.curveAmount != null ? p.curveAmount : SETTINGS.curveAmount };
  }
  // Store new curve settings (`patch`: { on?, amount? }); returns the full result.
  function saveCurve(patch) {
    const c = { ...curvePrefs(), ...patch };
    c.amount = Math.min(1, Math.max(0, c.amount));
    savePrefs({ curve: c.on, curveAmount: c.amount });
    return c;
  }

  // The remembered glow settings: { on, strength (0..1), reach (share of the screen's height,
  // minGlowReach..maxGlowReach) }, and storing new ones (as the curve's).
  function glowPrefs() {
    const p = loadPrefs();
    return { on: p.glow != null ? !!p.glow : SETTINGS.glow, strength: p.glowStrength != null ? p.glowStrength : SETTINGS.glowStrength,
      reach: p.glowReach != null ? p.glowReach : SETTINGS.glowReach };
  }
  function saveGlow(patch) {
    const g = { ...glowPrefs(), ...patch };
    g.strength = Math.min(1, Math.max(0, g.strength));
    g.reach = Math.min(SETTINGS.maxGlowReach, Math.max(SETTINGS.minGlowReach, g.reach));
    savePrefs({ glow: g.on, glowStrength: g.strength, glowReach: g.reach });
    return g;
  }

  // The screen is a strip of columns spanning -0.5..0.5, scaled to width x height (uSize)
  // and placed by uModel. uBend is the angle (radians) the whole width wraps around: 0 is
  // flat; otherwise each column sits on a circle of radius width / uBend whose centre is in
  // front of the screen (toward you), so the sides come forward. The width is kept as the
  // length along the curve, so curving doesn't shrink the picture. The handles reuse this
  // vertex shader with uBend = 0. The fragment shader shows the video with rounded corners:
  // p is the point in metres from the screen's centre (along the curve; uScreen: its size,
  // as uSize), d its distance
  // outside a rounded rectangle of corner radius uRadius (Inigo Quilez's sdRoundBox); the
  // last 4 mm inside the edge fade out (alpha, blended over what's behind without touching
  // the frame's alpha: see draw), and outside it's discarded.
  const VS = `
    attribute vec2 aCorner;                 // -0.5..0.5
    uniform mat4 uProj, uView, uModel; uniform vec2 uSize; uniform float uBend;
    varying vec2 vUv;
    void main() {
      vUv = vec2(aCorner.x + 0.5, 0.5 - aCorner.y);
      vec3 p = vec3(aCorner * uSize, 0.0);
      if (uBend > 0.0001) {
        float r = uSize.x / uBend, a = aCorner.x * uBend;
        p.x = r * sin(a);
        p.z = r * (1.0 - cos(a));
      }
      gl_Position = uProj * uView * uModel * vec4(p, 1.0);
    }`;
  const FS = `
    precision mediump float; uniform sampler2D uTex; uniform vec2 uScreen; uniform float uRadius; varying vec2 vUv;
    void main() {
      vec2 p = (vUv - 0.5) * uScreen;
      vec2 q = abs(p) - uScreen * 0.5 + uRadius;
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
      float a = 1.0 - smoothstep(-0.004, 0.0, d);
      if (a <= 0.0) discard;
      gl_FragColor = vec4(texture2D(uTex, vUv).rgb, a);
    }`;

  // The glow (WebGL 2 shaders, GLSL ES 3.00, for textureLod): the same strip, bigger (uSize,
  // metres; on the same circle when curved: its vertex shader is VS's), drawn behind the
  // screen. p is the point in metres from the screen's centre, d its distance outside the
  // screen's rounded rectangle (uScreen, uRadius; as FS). Inside the screen (past its soft
  // edge) it's discarded;
  // outside, it takes the video's colour at the nearest point of the picture's edge (the
  // texture coordinate clamped to the picture) from the mipmap level about uDetail texels
  // wide (blurred; a level further up further out: chosen here rather than by the GPU, which
  // would pick the sharpest level where the clamped coordinate doesn't change), fading out to
  // nothing at uReach metres. Added to what's behind (light), at uStrength.
  const GLOW_VS = `#version 300 es
    in vec2 aCorner;
    uniform mat4 uProj, uView, uModel; uniform vec2 uSize; uniform float uBend;
    out vec2 vUv;
    void main() {
      vUv = vec2(aCorner.x + 0.5, 0.5 - aCorner.y);
      vec3 p = vec3(aCorner * uSize, 0.0);
      if (uBend > 0.0001) {
        float r = uSize.x / uBend, a = aCorner.x * uBend;
        p.x = r * sin(a);
        p.z = r * (1.0 - cos(a));
      }
      gl_Position = uProj * uView * uModel * vec4(p, 1.0);
    }`;
  const GLOW_FS = `#version 300 es
    precision mediump float;
    uniform sampler2D uTex; uniform vec2 uGlow, uScreen; uniform float uRadius, uReach, uDetail, uStrength;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      vec2 p = (vUv - 0.5) * uGlow;
      vec2 q = abs(p) - uScreen * 0.5 + uRadius;
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
      if (d <= -0.004) discard;                  // (under the screen's soft edge too, so no dark seam)
      float t = clamp(d / uReach, 0.0, 1.0);
      float a = uStrength * (1.0 - t) * (1.0 - t);
      if (a <= 0.002) discard;
      vec2 uv = clamp(p / uScreen + 0.5, 0.0, 1.0);
      float lod = log2(max(1.0, float(textureSize(uTex, 0).x) / uDetail)) + t * 1.5;
      outColor = vec4(textureLod(uTex, uv, lod).rgb, a);
    }`;

  // Handles, drawn with distance functions so they're smooth at any size. p is the point in
  // metres from the quad's centre (y up). uArc.z == 0: a capsule (rounded bar) of size
  // uShape. Otherwise a rounded arc around the quad's centre: uArc = (direction of the arc's
  // middle, half its angle (radians), radius, half its thickness (m)). The arc is turned so
  // its middle points up, then measured with the standard arc distance (Inigo Quilez's sdArc).
  const HANDLE_FS = `
    precision mediump float;
    uniform vec2 uShape; uniform vec4 uArc; uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv;
    void main() {
      vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uShape;
      float d;
      if (uArc.z > 0.0) {
        float c = cos(1.5707963 - uArc.x), s = sin(1.5707963 - uArc.x);
        vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
        q.x = abs(q.x);
        vec2 sc = vec2(sin(uArc.y), cos(uArc.y));
        d = (sc.y * q.x > sc.x * q.y ? length(q - sc * uArc.z) : abs(length(q) - uArc.z)) - uArc.w;
      } else {
        float r = uShape.y * 0.5;
        vec2 q = abs(p) - vec2(uShape.x * 0.5 - r, 0.0);
        d = length(max(q, 0.0)) - r;
      }
      float a = 1.0 - smoothstep(-0.004, 0.0, d);
      if (a <= 0.0) discard;
      gl_FragColor = vec4(uColor, a * uAlpha);
    }`;

  // Handle geometry (metres). Corner handles: a quarter-circle arc (a bit more, `halfSpan`
  // each side of the diagonal) around each bottom corner of the screen, `radius` out from it.
  // Move bar: a capsule `below` the bottom edge.
  const HANDLE = {
    corner: { radius: 0.13, halfSpan: 57 * Math.PI / 180, thick: 0.045, hitRadius: 0.22 },
    move: { below: 0.16, width: 0.90, thick: 0.045, hitW: 1.10, hitH: 0.20 },
  };
  // Handle colours: white normally (faint) and when pointed at (bright), blue while dragged.
  const IDLE = [1, 1, 1], HOT = [1, 1, 1], ACTIVE = [0.24, 0.65, 1.0];

  // The screen's mesh: `cols` side-by-side quads (two triangles each) covering -0.5..0.5,
  // so the vertex shader can bend it.
  function buildStrip(cols) {
    const out = [];
    for (let i = 0; i < cols; i++) {
      const x0 = -0.5 + i / cols, x1 = -0.5 + (i + 1) / cols;
      out.push(x0, -0.5, x1, -0.5, x1, 0.5, x0, -0.5, x1, 0.5, x0, 0.5);
    }
    return new Float32Array(out);
  }

  // Build the cinema screen renderer. Returns { upload, draw, place, dispose, interaction,
  // pauseAnchor, distance, setDistance, setCurve }: the same drawing interface as the video
  // sphere, plus `interaction` (the laser-grabbable handles), `pauseAnchor` (where the pause
  // symbol goes) and the Settings controls.
  function createCinemaScreen(gl) {
    const prog = G.createProgram(gl, VS, FS, 'cinema screen');
    const hprog = G.createProgram(gl, VS, HANDLE_FS, 'cinema handles');
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    const gprog = isGL2 ? G.createProgram(gl, GLOW_VS, GLOW_FS, 'cinema glow') : null;   // (no glow on WebGL 1)
    const U = G.uniforms(gl, prog, { proj: 'uProj', view: 'uView', model: 'uModel', size: 'uSize', bend: 'uBend', tex: 'uTex', screen: 'uScreen', radius: 'uRadius' });
    const GU = gprog && G.uniforms(gl, gprog, { proj: 'uProj', view: 'uView', model: 'uModel', size: 'uSize', bend: 'uBend', tex: 'uTex', glow: 'uGlow',
      screen: 'uScreen', radius: 'uRadius', reach: 'uReach', detail: 'uDetail', strength: 'uStrength' });
    const HU = G.uniforms(gl, hprog, { proj: 'uProj', view: 'uView', model: 'uModel', size: 'uSize', bend: 'uBend', shape: 'uShape', arc: 'uArc', color: 'uColor', alpha: 'uAlpha' });
    const vaos = G.vertexArrays(gl);
    const corners = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    const strip = buildStrip(SETTINGS.columns);
    const vao = vaos ? vaos.create() : null;
    if (vaos) vaos.bind(vao);
    const buf = G.floatAttribute(gl, prog, 'aCorner', strip, 2);
    if (vaos) vaos.bind(null);
    const hvao = vaos ? vaos.create() : null;
    if (vaos) vaos.bind(hvao);
    const hbuf = G.floatAttribute(gl, hprog, 'aCorner', corners, 2);
    if (vaos) vaos.bind(null);
    const gvao = vaos ? vaos.create() : null;           // the glow's strip (its own program's attribute)
    if (vaos) vaos.bind(gvao);
    const gbuf = gprog && G.floatAttribute(gl, gprog, 'aCorner', strip, 2);
    if (vaos) vaos.bind(null);
    const tex = G.texture2D(gl);

    // State: width in metres (remembered), the video's shape (updated from each frame), the
    // screen's pose, its distance from you (for the curve and the Distance slider), the
    // curve, which handles to show/highlight, and the current drag (if any).
    const prefs = loadPrefs();
    let width = clampWidth(prefs.width || SETTINGS.width);
    let aspect = 16 / 9;
    let model = M.translation(0, 0, -SETTINGS.distance);   // centre + orientation (+Z faces you)
    let dist = clampDistance(prefs.distance || SETTINGS.distance);
    let curve = curvePrefs();                               // { on, amount }
    let glow = glowPrefs();                                 // { on, strength, reach }
    const highlight = { show: false, hover: new Set(), active: null };
    let grab = null;                                        // what's being dragged, see grabStart

    function clampWidth(w) { return Math.min(SETTINGS.maxWidth, Math.max(SETTINGS.minWidth, w)); }
    function clampDistance(d) { return Math.min(SETTINGS.maxDistance, Math.max(minDistance(), d)); }
    const height = () => width / aspect;                    // the screen takes the video's shape
    const centre = () => [model[12], model[13], model[14]];
    const axis = k => [model[k * 4], model[k * 4 + 1], model[k * 4 + 2]];   // 0 right, 1 up, 2 normal

    // How far the screen wraps around (radians across its whole width; 0 = flat). At full
    // intensity the circle's radius equals your distance, so the whole screen is equally far
    // from you; lower intensities use a bigger circle. Capped at half a circle.
    const bend = () => (curve.on && curve.amount > 0 ? Math.min(Math.PI, width * curve.amount / dist) : 0);

    // A frame (matrix, in screen-local space) sitting on the screen's horizontal centre line
    // at `s` metres along its width (measured along the curve), turned to match the curve
    // there: x along the surface, z out of it. On a flat screen it's just a shift by s.
    function edgeFrame(s) {
      const b = bend();
      if (!b) return M.translation(s, 0, 0);
      const r = width / b, a = s / r;
      return M.multiply(M.translation(r * Math.sin(a), 0, r * (1 - Math.cos(a))), M.rotationY(-a));
    }

    // Screen at `pos`, turned to face `head` (upright, no roll).
    function faceToward(pos, head) {
      const dx = head[0] - pos[0], dy = head[1] - pos[1], dz = head[2] - pos[2];
      const yaw = Math.atan2(dx, dz), tilt = Math.atan2(dy, Math.hypot(dx, dz));
      model = M.multiply(M.translation(pos[0], pos[1], pos[2]), M.multiply(M.rotationY(yaw), M.axisAngle(1, 0, 0, -tilt)));
    }

    // Put the screen straight ahead of where you're looking (on enter, recenter, or switching to it),
    // at your remembered distance and height.
    function place(head, yaw) {
      const p = loadPrefs();
      const raise = p.raise != null ? p.raise : SETTINGS.raise;
      dist = clampDistance(p.distance || SETTINGS.distance);
      const c = Math.cos(yaw), s = Math.sin(yaw);
      faceToward([head.x - s * dist, head.y + raise, head.z - c * dist], [head.x, head.y, head.z]);
    }

    // Settings: the current distance, the slider's limits and the default, in metres.
    const distance = () => ({ value: dist, min: minDistance(), max: SETTINGS.maxDistance, default: SETTINGS.distance });

    // Move the screen to `metres` from `head` ([x, y, z]) along the line it's on now (same
    // direction and height), facing you, and remember it.
    function setDistance(metres, head) {
      dist = clampDistance(metres);
      const c = centre();
      let dx = c[0] - head[0], dz = c[2] - head[2];
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      faceToward([head[0] + dx * dist, c[1], head[2] + dz * dist], head);
      savePrefs({ distance: dist, raise: c[1] - head[1] });
    }

    // Settings: curve on/off and intensity (0..1). The caller stores them (saveCurve).
    function setCurve(c) { curve = { on: !!c.on, amount: c.amount }; }
    // Settings: the glow on/off, its strength (0..1) and length (reach). The caller stores them (saveGlow).
    function setGlow(g) { glow = { on: !!g.on, strength: g.strength, reach: g.reach }; }

    // The global reset: the default size and curve now (the caller forgets the stored ones
    // with resetPrefs, then places the screen again, which takes the default distance).
    function reset() {
      grab = null; highlight.active = null;
      width = SETTINGS.width;
      dist = SETTINGS.distance;
      curve = curvePrefs();
      glow = glowPrefs();
    }

    // Copy the current video frame into the texture and follow its shape (an ad or a new
    // video with a different aspect ratio resizes the screen). Throws if the browser
    // refuses the frame; the session turns that into a message. With the glass on it also
    // or the glow on it also rebuilds the mipmaps (the blurred copies the panels and the glow
    // show; see backdrop, drawGlow).
    let mipped = false;                                     // does the texture have mipmaps now
    function upload(video) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      mipped = G.videoMipmaps(gl, ns.vrTokens.glass.on || glow.on);
      if (video.videoWidth && video.videoHeight) aspect = video.videoWidth / video.videoHeight;
    }

    // What's behind the panels, for the glass look (vr-panel/panel-pass.js): the video's
    // texture and where the screen is (centre, axes, size in metres, curve), and its glow
    // ({ strength, reach, radius } in metres, or null: the glass shows it past the edge). Builds the
    // mipmaps at once if the glass was just turned on (a paused video sends no new frames).
    // null while the glass is off.
    function backdrop() {
      if (!ns.vrTokens.glass.on) return null;
      if (!mipped) { gl.bindTexture(gl.TEXTURE_2D, tex); mipped = G.videoMipmaps(gl, true); }
      if (!mipped) return null;
      const g = gprog && glow.on && glow.strength > 0
        ? { strength: glow.strength, reach: height() * glow.reach, radius: width * SETTINGS.cornerRadius } : null;
      return { kind: 'screen', tex, centre: centre(), right: axis(0), up: axis(1), normal: axis(2), size: [width, height()], bend: bend(), glow: g };
    }

    // The handles: { id, frame (a point on the screen's centre line, see edgeFrame), x, y
    // (metres from that frame), arc (direction of the arc's middle, corner handles only) or
    // w, h (capsule size, move bar) }. Corner arcs are centred on the screen's corners and
    // bow out from them (down-left / down-right).
    function handles() {
      const hh = height() / 2, m = HANDLE.move;
      return [
        { id: 'resize-left',  frame: edgeFrame(-width / 2), x: 0, y: -hh, arc: -3 * Math.PI / 4 },
        { id: 'resize-right', frame: edgeFrame(width / 2),  x: 0, y: -hh, arc: -Math.PI / 4 },
        { id: 'move',         frame: edgeFrame(0),          x: 0, y: -hh - m.below, w: m.width, h: m.thick },
      ];
    }
    // A handle's pose in the world (just in front of the screen's surface).
    const handleModel = h => M.multiply(model, M.multiply(h.frame, M.translation(h.x, h.y, 0.01)));

    // Draw the three handles as translucent shapes just in front of the screen: faint
    // normally, bright under a laser, blue while dragged. Only while the panel is up or a
    // handle is pointed at/held (set through interaction.setHighlight).
    function drawHandles(view) {
      if (!highlight.show && !highlight.active) return;
      gl.useProgram(hprog);
      if (vaos) vaos.bind(hvao);
      gl.uniformMatrix4fv(HU.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(HU.view, false, view.transform.inverse.matrix);
      gl.uniform1f(HU.bend, 0);
      const c = HANDLE.corner;
      for (const h of handles()) {
        const active = highlight.active === h.id, hot = highlight.hover.has(h.id);
        gl.uniformMatrix4fv(HU.model, false, handleModel(h));
        if (h.arc != null) {
          const q = 2 * (c.radius + c.thick / 2 + 0.01);     // square quad that holds the whole arc
          gl.uniform2f(HU.size, q, q);
          gl.uniform2f(HU.shape, q, q);
          gl.uniform4f(HU.arc, h.arc, c.halfSpan, c.radius, c.thick / 2);
        } else {
          gl.uniform2f(HU.size, h.w, h.h);
          gl.uniform2f(HU.shape, h.w, h.h);
          gl.uniform4f(HU.arc, 0, 0, 0, 0);
        }
        gl.uniform3fv(HU.color, active ? ACTIVE : hot ? HOT : IDLE);
        gl.uniform1f(HU.alpha, active || hot ? 0.95 : 0.45);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (vaos) vaos.bind(null);
    }

    // The glow behind the screen for one eye (see GLOW_FS): the strip grown by the reach on
    // every side, bent on the screen's own circle (its angle grows with its width), added
    // over what's behind (light) without changing the frame's alpha. Only with mipmaps (the
    // blurred colours; WebGL 2).
    function drawGlow(view, b) {
      if (!gprog || !glow.on || glow.strength <= 0) return;
      if (!mipped) { gl.bindTexture(gl.TEXTURE_2D, tex); mipped = G.videoMipmaps(gl, true); }   // just turned on (a paused video sends no new frames)
      if (!mipped) return;
      const h = height(), reach = h * glow.reach, gw = width + reach * 2, gh = h + reach * 2;
      gl.useProgram(gprog);
      if (vaos) vaos.bind(gvao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(GU.tex, 0);
      gl.uniformMatrix4fv(GU.model, false, model);
      gl.uniform2f(GU.size, gw, gh);
      gl.uniform1f(GU.bend, b ? Math.min(Math.PI * 1.5, b * gw / width) : 0);
      gl.uniformMatrix4fv(GU.proj, false, view.projectionMatrix);
      gl.uniformMatrix4fv(GU.view, false, view.transform.inverse.matrix);
      gl.uniform2f(GU.glow, gw, gh);
      gl.uniform2f(GU.screen, width, h);
      gl.uniform1f(GU.radius, width * SETTINGS.cornerRadius);
      gl.uniform1f(GU.reach, reach);
      gl.uniform1f(GU.detail, SETTINGS.glowDetail);
      gl.uniform1f(GU.strength, glow.strength);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
      gl.drawArrays(gl.TRIANGLES, 0, SETTINGS.columns * 6);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.BLEND);
    }

    // Draw the glow, the video (bent by uBend when curved, its corners rounded), then the
    // handles, once per eye. All are blended over what's behind without changing the frame's
    // alpha (blendFuncSeparate), so the headset never treats the image as see-through.
    function draw(viewerPose, layer) {
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      const b = bend();
      for (const view of viewerPose.views) {
        const vp = layer.getViewport(view);
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        drawGlow(view, b);
        gl.useProgram(prog);
        if (vaos) vaos.bind(vao);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(U.tex, 0);
        gl.uniformMatrix4fv(U.model, false, model);
        gl.uniform2f(U.size, width, height());
        gl.uniform2f(U.screen, width, height());
        gl.uniform1f(U.radius, width * SETTINGS.cornerRadius);
        gl.uniform1f(U.bend, b);
        gl.uniformMatrix4fv(U.proj, false, view.projectionMatrix);
        gl.uniformMatrix4fv(U.view, false, view.transform.inverse.matrix);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
        gl.drawArrays(gl.TRIANGLES, 0, SETTINGS.columns * 6);   // (its rounded corners' soft edge blends in)
        drawHandles(view);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.BLEND);
      }
      if (vaos) vaos.bind(null);
    }

    // ---------------------------------------------------------------- laser interaction
    // Ray against the plane of pose `m` (the screen by default, or a handle) ->
    // { t, point, local: [x, y] } (metres in that plane) or null (front side only).
    function planeHit(origin, dir, m = model) {
      const n = [m[8], m[9], m[10]], c = [m[12], m[13], m[14]];
      const denom = M.dot(dir, n);
      if (denom > -1e-4) return null;
      const t = M.dot([c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]], n) / denom;
      if (t <= 0) return null;
      const point = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
      const d = [point[0] - c[0], point[1] - c[1], point[2] - c[2]];
      return { t, point, local: [M.dot(d, [m[0], m[1], m[2]]), M.dot(d, [m[4], m[5], m[6]])] };
    }

    // Position along a bottom corner's diagonal, as a multiple of that corner (1 = on the corner).
    // (Projects the laser's point on the screen plane onto the line from the centre to the
    // corner; resizing scales the width by the change in this number.)
    function diagonalScale(id, local, w) {
      const cw = w / 2, ch = w / aspect / 2, sx = id === 'resize-left' ? -1 : 1;
      return (local[0] * sx * cw + local[1] * -ch) / (cw * cw + ch * ch);
    }

    // The laser system's view of the screen (see vr-panel.js setTargets): hit-test the
    // handles, start/continue/end a grip drag, and show/hide the highlight.
    const interaction = {
      // Which handle (if any) the ray points at: { t, point, id }. Each handle is tested in
      // its own plane (on a curved screen the corners face a different way than the centre).
      // Corner arcs count as hit within hitRadius of the arc's middle.
      hit(origin, dir) {
        const c = HANDLE.corner, m = HANDLE.move;
        for (const h of handles()) {
          const p = planeHit(origin, dir, handleModel(h));
          if (!p) continue;
          const [x, y] = p.local;
          const inside = h.arc == null
            ? Math.abs(x) <= m.hitW / 2 && Math.abs(y) <= m.hitH / 2
            : Math.hypot(x - c.radius * Math.cos(h.arc), y - c.radius * Math.sin(h.arc)) <= c.hitRadius;
          if (inside) return { t: p.t, point: p.point, id: h.id };
        }
        return null;
      },

      // ray: the controller's target-ray pose matrix. head: [x, y, z].
      grabStart(id, ray, origin, dir, head) {
        if (id === 'move') {
          // Keep the screen's centre at a fixed offset from the controller while moving.
          const m = ray, c = centre();
          const d = [c[0] - m[12], c[1] - m[13], c[2] - m[14]];
          grab = { id, local: [M.dot(d, [m[0], m[1], m[2]]), M.dot(d, [m[4], m[5], m[6]]), M.dot(d, [m[8], m[9], m[10]])] };
        } else {
          // Resizing is relative to where you grabbed, so the screen doesn't jump.
          const p = planeHit(origin, dir);
          grab = { id, startWidth: width, startScale: p ? diagonalScale(id, p.local, width) : 1 };
          if (!(grab.startScale > 0.05)) grab.startScale = 1;
        }
        highlight.active = id;
      },

      // Called every frame while gripping: the screen follows the controller (move), or its
      // width follows the laser along the corner's diagonal (resize, clamped).
      grabMove(ray, origin, dir, head) {
        if (!grab) return;
        if (grab.id === 'move') {
          faceToward(M.transformPoint(ray, grab.local), head);
          return;
        }
        // Resize around the centre by how far along the corner's diagonal the laser points.
        const p = planeHit(origin, dir);
        if (!p) return;
        width = clampWidth(grab.startWidth * diagonalScale(grab.id, p.local, grab.startWidth) / grab.startScale);
      },

      grabEnd(head) {
        if (!grab) return;
        grab = null;
        highlight.active = null;
        // Remember size, plus distance and height relative to you, for next time.
        const c = centre();
        dist = clampDistance(Math.hypot(c[0] - head[0], c[2] - head[2]));
        savePrefs({ width, distance: dist, raise: c[1] - head[1] });
      },

      // show: draw the handles at all; hover: ids under a laser right now.
      setHighlight(show, hoverIds) {
        highlight.show = show;
        highlight.hover = new Set(hoverIds);
      },
    };

    // Where the pause symbol goes: the middle of the screen, just in front of it, lying flat
    // on the screen (it doesn't turn with your head).
    function pauseAnchor() {
      const c = centre(), n = axis(2);
      return {
        position: [c[0] + n[0] * 0.02, c[1] + n[1] * 0.02, c[2] + n[2] * 0.02],
        right: axis(0), up: axis(1),
        size: Math.min(0.6, Math.max(0.2, height() * 0.22)),
      };
    }

    // Where captions go (captions-overlay.js): standing a little above the screen's bottom
    // edge, in the middle, just in front of it, sized to the screen (one line 5.5% of its
    // height).
    function captionAnchor() {
      const c = centre(), u = axis(1), n = axis(2), h = height(), lift = -h / 2 + h * 0.06;
      return { position: [0, 1, 2].map(k => c[k] + u[k] * lift + n[k] * 0.01), right: axis(0), up: u, lineHeight: h * 0.055 };
    }

    // Free the GPU objects (when the session ends or the format changes).
    function dispose() {
      gl.deleteBuffer(buf); gl.deleteBuffer(hbuf); gl.deleteTexture(tex); if (gbuf) gl.deleteBuffer(gbuf);
      if (vaos) { vaos.remove(vao); vaos.remove(hvao); vaos.remove(gvao); }
      gl.deleteProgram(prog); gl.deleteProgram(hprog); if (gprog) gl.deleteProgram(gprog);
    }

    return { upload, draw, backdrop, place, dispose, interaction, pauseAnchor, captionAnchor, distance, setDistance, setCurve, setGlow, reset };
  }

  // The right renderer for a format: cinema screen for flat videos, sphere for the rest.
  function createVideoView(gl, fmt) {
    return ns.formats.isFlat(fmt) ? createCinemaScreen(gl) : ns.videoSphere.createVideoSphere(gl, fmt);
  }

  // The global reset: forget the remembered size, placement and curve.
  const resetPrefs = () => ns.storage.remove(SETTINGS.storageKey);

  ns.cinemaScreen = { createCinemaScreen, SETTINGS, curvePrefs, saveCurve, glowPrefs, saveGlow, resetPrefs };
  ns.videoView = { create: createVideoView };
})(globalThis.__streamxr = globalThis.__streamxr || {});
