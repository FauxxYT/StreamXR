// The "Safe zone" settings tab, which belongs to the shell (the layout is the shell's,
// whatever the site): three sliders for the Safe Zone (safe-zone.js), each with a Default
// button: its width and height as shares of what the headset shows, and its centre above or
// below eye level; and a switch, "Recenter resets panels": whether recentering also puts the
// panels you moved back in their places (off: they come along, where you put them; remembered).
// While the tab is open, an outline shows the zone around you. A site's Options panel includes
// it as one of its tabs.
//
//   ns.vrSafeZoneOptions.content() -> the Options style's 'rows' content (and asks for the outline)
//   ns.vrSafeZoneOptions.event(ev) -> true if it was one of this tab's controls
//     ('slider:<width|height|shift>', 'default:<width|height|shift>', 'switch:sz-recenter')
//   ns.vrSafeZoneOptions.recenterResets() -> bool;  ns.vrSafeZoneOptions.reset()   (the switch off)
(function (ns) {
  'use strict';

  const SZ = ns.vrSafeZone;
  const IDS = ['width', 'height', 'shift'];
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)
  const RECENTER_KEY = 'recenterResets';             // storage.js name: 'on' while the switch is on
  const recenterResets = () => ns.storage.get(RECENTER_KEY) === 'on';

  // A slider's position (0..1) for a value in its range, and back.
  const fractionOf = (id, x) => { const [a, b] = SZ.RANGES[id]; return (x - a) / (b - a); };
  const valueAt = (id, f) => { const [a, b] = SZ.RANGES[id]; return a + f * (b - a); };

  // The text beside each slider: the share and the angle it comes to on this headset (the
  // position signed: minus is below eye level).
  function text(id) {
    const z = SZ.zone, deg = Math.round(z[id] * (id === 'width' ? SZ.fov.h : SZ.fov.v));
    const sign = x => (x < 0 ? '−' : id === 'shift' && x > 0 ? '+' : '');
    return `${sign(z[id])}${Math.abs(Math.round(z[id] * 100))}% · ${sign(deg)}${Math.abs(deg)}°`;
  }

  function content() {
    SZ.preview();                                   // drawn while this tab is open
    const row = (id, ends) => ({
      label: tr(`safezone.${id}`), hint: tr(`safezone.${id}Hint`),
      control: { type: 'slider', id: `sz-${id}`, fraction: fractionOf(id, SZ.zone[id]), text: text(id),
        enabled: true, defaultButton: true, ends: ends.map(k => tr(`safezone.${k}`)) },
    });
    return {
      kind: 'rows', note: tr('safezone.note', { h: SZ.fov.h, v: SZ.fov.v }),
      rows: [row('width', ['narrower', 'wider']), row('height', ['shorter', 'taller']), row('shift', ['lower', 'higher']),
        { label: tr('safezone.recenter'), hint: tr('safezone.recenterHint'), control: { type: 'switch', id: 'sz-recenter', on: recenterResets() } }],
    };
  }

  // The sliders snap to whole percents (so the remembered values stay tidy).
  function event(ev) {
    if (ev.type === 'switch' && ev.value === 'sz-recenter') {
      if (recenterResets()) ns.storage.remove(RECENTER_KEY); else ns.storage.set(RECENTER_KEY, 'on');
      return true;
    }
    const id = typeof ev.value === 'string' && ev.value.startsWith('sz-') ? ev.value.slice(3) : null;
    if (!IDS.includes(id)) return false;
    if (ev.type === 'slider') SZ.set({ [id]: Math.round(valueAt(id, ev.fraction) * 100) / 100 });
    else if (ev.type === 'default') SZ.set({ [id]: SZ.DEFAULTS[id] });
    else return false;
    return true;
  }

  ns.vrSafeZoneOptions = { content, event, recenterResets, reset: () => ns.storage.remove(RECENTER_KEY) };
})(globalThis.__streamxr = globalThis.__streamxr || {});
