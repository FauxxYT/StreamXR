// Design tokens: the one place the VR interface's colours (and the glass settings) live,
// named by Material 3 colour role (docs/Materials-Redesign.md, step 1). Drawing code never
// writes a colour itself: it uses `color.<role>` or `alpha(role, a)`, read at draw time.
//
// Today these hold the interface's current look, so moving the code onto them changed no
// pixel. Step 2 swaps in a site's M3 palette (the same role names), step 3 restyles.
//
//   ns.vrTokens.color.<role>      '#rrggbb' (e.g. color.onSurface)
//   ns.vrTokens.alpha(role, a)    that role's colour at opacity a: 'rgba(r,g,b,a)'
//                                 (M3's state layers and scrims are this)
//   ns.vrTokens.resolve(spec)     a colour from a spec a provider can give instead of a
//                                 value: 'role' or 'role/alpha' (e.g. 'surface/0.75'); a
//                                 '#rrggbb' or 'rgba(...)' value is returned as it is
//   ns.vrTokens.apply(theme)      a site's colours (provider.theme, applied by
//                                 xr-session.js when VR starts): { accent, accentPressed,
//                                 dark, custom: { name: '#rrggbb' }, seed: '#rrggbb' (its
//                                 M3 palette is made from it), scheme: a variant name
//                                 ('tonalSpot' default, 'fidelity' ...), swap: [[roleA,
//                                 roleB], ...] (roles that trade colours), palette: { M3
//                                 role: '#rrggbb' } (optional: roles set by hand, last),
//                                 onAccent: the colour on `accent` (default white) }
//   ns.vrTokens.m3.<role>         the Material 3 palette (see below), plus brand / onBrand
//                                 (the site's exact accent) and hoverRing; m3Alpha(role, a)
//   ns.vrTokens.scheme(seed, variant)  a whole M3 dark palette from one colour (e.g. for
//                                 dynamic colour from a thumbnail later)
//   ns.vrTokens.font(role[, px]), .type, .shape   M3 type roles and corner sizes
//   ns.vrTokens.glass             the glass look's settings: { on, tint, DEFAULT_TINT, version }
//   ns.vrTokens.panelFill()       a panel's background colour (the glass tint, or solid)
(function (ns) {
  'use strict';

  // Role -> colour. The object is changed in place by apply(), so code may keep a reference
  // to it (but not to its values: read them when drawing).
  const color = {
    // Set by the site (provider.theme): its brand colour and its dark.
    primary: '#FF0033',            // theme.accent: seek bar progress, LIVE, "danger" buttons
    primaryPressed: '#ff4d70',     // theme.accentPressed: a pressed "danger" button
    surface: '#212121',            // theme.dark: panel backgrounds, dark text on light buttons

    // Text and lines on the panels.
    onSurface: '#FFFFFF',          // text, icons, light buttons
    onSurfaceVariant: '#aaaaaa',   // secondary text (stats, hints, inactive tabs)
    outline: '#888888',            // faint text, notes
    outlineVariant: '#555555',     // dividers, disabled outlines

    // The highlight: selection, links, pressed controls (today's blue).
    tertiary: '#3ea6ff',
    tertiaryBright: '#7cc4ff',     // a pressed switch
    onTertiaryContainer: '#8fcbff',// the grey line under a chosen choice
    tertiaryMuted: '#8a9bb0',      // a link that can't be clicked

    shadow: '#000000',             // shadows and scrims (with alpha)

    // Neutral tones: the in-between greys of today's look, named by brightness (%). M3
    // builds its surface and text roles from a neutral palette like this; step 3 replaces
    // these uses with roles.
    n90: '#e6e6e6', n87: '#dddddd', n80: '#cccccc', n73: '#bbbbbb', n60a: '#9a9a9a',
    n60: '#999999', n47: '#777777', n40: '#666666', n24: '#3c3c3c', n20: '#333333',
    n17: '#2a2a2a', n13: '#222222',

    // Custom colours (M3's extended colours): defaults, which a site's theme.custom can
    // replace or add to (e.g. its card flags).
    ad: '#ffcc00',                 // an ad playing (time, progress)
  };

  // The Material 3 palette: every M3 colour role, dark scheme (the panels are always dark in
  // VR). While the redesign is in progress (step 3), restyled components draw from `m3`
  // and the others from `color` (today's look); when all are done, `color` goes.
  // A site's theme.seed replaces it with the scheme made from that colour (apply, scheme()).
  // Default: M3's own baseline scheme (seed #6750A4), what scheme('#6750A4') gives, written
  // out so the panels have colours even without the library; regenerate rather than edit.
  const m3 = {
    primary: '#cfbdfe', onPrimary: '#36275d', primaryContainer: '#4d3d75', onPrimaryContainer: '#e9ddff',
    secondary: '#cbc2db', onSecondary: '#332d41', secondaryContainer: '#4a4458', onSecondaryContainer: '#e8def8',
    tertiary: '#efb8c8', onTertiary: '#4a2532', tertiaryContainer: '#633b48', onTertiaryContainer: '#ffd9e3',
    error: '#ffb4ab', onError: '#690005', errorContainer: '#93000a', onErrorContainer: '#ffdad6',
    surface: '#141218', onSurface: '#e6e0e9', surfaceVariant: '#49454e', onSurfaceVariant: '#cac4cf',
    surfaceContainerLowest: '#0f0d13', surfaceContainerLow: '#1d1b20', surfaceContainer: '#211f24',
    surfaceContainerHigh: '#2b292f', surfaceContainerHighest: '#36343a', surfaceBright: '#3b383e',
    surfaceDim: '#141218', inverseSurface: '#e6e0e9', inverseOnSurface: '#322f35', inversePrimary: '#65558f',
    outline: '#948f99', outlineVariant: '#49454e', scrim: '#000000', shadow: '#000000', surfaceTint: '#cfbdfe',
  };
  const M3_ROLES = Object.keys(m3);            // the roles a scheme fills (the rest below are ours)
  // Our own roles beside M3's: `brand` / `onBrand`, the site's exact brand colour (theme.accent)
  // and the colour on it, for its signature components (e.g. YouTube's red seek bar);
  // `hoverRing`, the outline round whatever a laser points at (it must never look like an
  // accent).
  Object.assign(m3, { brand: '#cfbdfe', onBrand: '#36275d', hoverRing: '#FFFFFF' });

  // The scheme variants a theme can ask for (theme.scheme; M3's names). Tonal Spot is M3's
  // default; Fidelity keeps containers closer to the seed colour.
  const VARIANTS = { tonalSpot: 'SchemeTonalSpot', fidelity: 'SchemeFidelity', content: 'SchemeContent',
    vibrant: 'SchemeVibrant', expressive: 'SchemeExpressive', neutral: 'SchemeNeutral' };

  // A Material 3 dark scheme from one seed colour ('#rrggbb'), made by Google's Material
  // Color Utilities (third_party/material-color-utilities; contrast 0, as Material Theme
  // Builder does), in `variant` (a VARIANTS key, default 'tonalSpot'): { role: '#rrggbb' }
  // for every M3 role, or null if the library isn't loaded. About 0.4 ms each.
  function scheme(seed, variant = 'tonalSpot') {
    const mc = ns.materialColor;
    if (!mc) { console.warn('[streamxr] Material Color Utilities missing: keeping the default palette'); return null; }
    const Cls = mc[VARIANTS[variant] || VARIANTS.tonalSpot];
    const s = new Cls(mc.Hct.fromInt(mc.argbFromHex(seed)), true, 0);
    const out = {};
    for (const role of M3_ROLES) out[role] = mc.hexFromArgb(mc.MaterialDynamicColors[role].getArgb(s));
    return out;
  }

  // Type and shape tokens (M3 type roles and corner sizes, in canvas px at 1280 px per metre),
  // added component by component as each is restyled (docs/Materials-Redesign.md, step 3).
  //   font(role) -> a canvas font string, e.g. font('titleLargeEmphasized')
  const FAMILY = 'Roboto, Arial, sans-serif';
  const type = {
    titleLargeEmphasized: '600 30px',          // the video title
    titleMedium: '500 24px',                   // the channel name
    bodyMedium: '400 20px',                    // info lines, stats
    labelLarge: '500 22px',                    // button text
    labelLargeProminent: '500 26px',           // the time, Skip ad
    labelMedium: '500 17px',                   // labels under icons (17 px: to test in the headset)
  };
  const font = (role, px) => (px ? `${type[role].split(' ')[0]} ${px}px ${FAMILY}` : `${type[role]} ${FAMILY}`);
  const shape = { extraSmall: 4, small: 8, medium: 12, large: 16, largeIncreased: 20, extraLarge: 28,
    extraLargeIncreased: 32, extraExtraLarge: 48 };

  // m3 role at opacity a (state layers, scrims, the glass tint).
  function m3Alpha(role, a) {
    const c = m3[role];
    if (!c) throw new Error(`[streamxr] no M3 colour role "${role}"`);
    return `rgba(${rgb(c)},${a})`;
  }

  // The glass look (step 4): `on`, and `tint`: how much of the surface colour covers the
  // blurred video behind a panel (0..1). Set by the Appearance settings tab
  // (appearance-options.js, which remembers them); `version` changes with them, so every
  // panel redraws. DEFAULT_TINT is the one place the default lives.
  const glass = { on: true, tint: 0.43, DEFAULT_TINT: 0.43, version: 0 };
  const SOLID = 0.9;                       // a panel's background opacity with the glass off
  // A panel's background colour: the surface at the glass tint (the panel shader puts the
  // blurred video under it), or nearly opaque with the glass off.
  const panelFill = () => m3Alpha('surfaceContainer', glass.on ? glass.tint : SOLID);

  // '#rgb' / '#rrggbb' -> 'r,g,b'
  function rgb(hex) {
    let h = hex.slice(1);
    if (h.length === 3) h = h.replace(/./g, ch => ch + ch);
    const n = parseInt(h, 16);
    return `${n >> 16},${(n >> 8) & 255},${n & 255}`;
  }

  function alpha(role, a) {
    const c = color[role];
    if (!c) throw new Error(`[streamxr] no colour role "${role}"`);
    return `rgba(${rgb(c)},${a})`;
  }

  // (An unknown role, e.g. a site's custom colour before its theme is applied, is logged once
  // and drawn as onSurfaceVariant, so a card never breaks a panel.)
  const warned = new Set();
  function resolve(spec) {
    if (!spec || spec[0] === '#' || spec.startsWith('rgb')) return spec;
    let [role, a] = spec.split('/');
    if (!color[role]) {
      if (!warned.has(role)) { warned.add(role); console.warn(`[streamxr] no colour role "${role}"`); }
      role = 'onSurfaceVariant';
    }
    return a != null ? alpha(role, a) : color[role];
  }

  // A site's colours. Unknown keys and values that aren't '#rrggbb' are ignored, and a custom
  // colour can't take a core role's name (only the custom ones, like `ad`, can be replaced).
  const HEX = /^#[0-9a-f]{6}$/i;
  const CUSTOM = new Set(['ad']);
  function apply(t) {
    if (!t) return;
    if (HEX.test(t.accent || '')) color.primary = t.accent;
    if (HEX.test(t.accentPressed || '')) color.primaryPressed = t.accentPressed;
    if (HEX.test(t.dark || '')) color.surface = t.dark;
    for (const [name, value] of Object.entries(t.custom || {})) {
      if (!HEX.test(value) || (name in color && !CUSTOM.has(name))) continue;
      color[name] = value; CUSTOM.add(name);
    }
    // The site's M3 palette: made from its seed colour in its scheme variant, then its role
    // swaps (pairs of roles that trade colours), then any roles it gives by hand (only known
    // roles, each a '#rrggbb'); and its brand colour.
    if (HEX.test(t.seed || '')) Object.assign(m3, scheme(t.seed, t.scheme) || {});
    for (const [a, b] of t.swap || []) {
      if (a in m3 && b in m3 && M3_ROLES.includes(a) && M3_ROLES.includes(b)) [m3[a], m3[b]] = [m3[b], m3[a]];
    }
    for (const [role, value] of Object.entries(t.palette || {})) if (M3_ROLES.includes(role) && HEX.test(value)) m3[role] = value;
    m3.brand = HEX.test(t.accent || '') ? t.accent : m3.primary;
    m3.onBrand = HEX.test(t.onAccent || '') ? t.onAccent : HEX.test(t.accent || '') ? '#FFFFFF' : m3.onPrimary;
  }

  ns.vrTokens = { color, alpha, resolve, apply, glass, panelFill, m3, m3Alpha, scheme, type, font, shape };
})(globalThis.__streamxr = globalThis.__streamxr || {});
