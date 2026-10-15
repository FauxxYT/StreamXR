// The "2D Cinema" settings tab, which belongs to the shell (the cinema screen is the
// shell's, whatever the site): Curve on/off, Curve intensity, Distance, Glow on/off, Glow
// strength and Glow length, all dimmed and inactive unless the cinema screen is showing
// (intensity also needs Curve on, the glow's sliders Glow on). Each slider has a Default
// button. A site's Options panel includes it as one of its tabs.
//
//   ns.vrCinemaOptions.content(viewSettings) -> the Options style's 'rows' content
//   ns.vrCinemaOptions.event(ev, viewSettings, actions) -> true if it was one of this tab's
//     controls ('switch:curve', 'slider:curveAmount' / 'slider:distance', 'switch:glow',
//     'slider:glowStrength', 'slider:glowReach', 'default:...')
//   viewSettings: { distance: { value, min, max, default } (metres) | null (not on the
//                   cinema screen), cinema: { active, on, amount, defaultAmount, format (the
//                   current format's name, shown as the tab's note), glow, glowStrength,
//                   defaultGlowStrength, glowReach: { value, min, max, default } (a share
//                   of the screen's height) } }
//   actions used: setCurve({ on?, amount? }), setGlow({ on?, strength?, reach? }), setDistance(metres).
(function (ns) {
  'use strict';

  // The Distance slider is logarithmic (equal steps feel equal near and far):
  // fraction 0..1 <-> metres between d.min and d.max.
  const distToFraction = d => Math.log(d.value / d.min) / Math.log(d.max / d.min);
  const fractionToDist = (d, f) => d.min * Math.pow(d.max / d.min, f);
  // The Glow length slider: fraction 0..1 <-> its reach (a share of the screen's height), straight.
  const reachToFraction = r => (r.value - r.min) / (r.max - r.min);
  const fractionToReach = (r, f) => r.min + f * (r.max - r.min);
  const tr = (key, vars) => ns.i18n.t(key, vars);   // words in the interface language (i18n.js)

  function content(vs) {
    const c = (vs && vs.cinema) || { active: false, on: false, amount: 0 };
    const d = vs && vs.distance;
    return {
      kind: 'rows', note: tr(c.active ? 'cinema.now' : 'cinema.nowNotFlat', { format: c.format || '' }),
      rows: [
        { label: tr('cinema.curve'), dim: !c.active, control: { type: 'switch', id: 'curve', on: c.on, enabled: c.active } },
        { label: tr('cinema.curveAmount'), dim: !(c.active && c.on),
          control: { type: 'slider', id: 'curveAmount', fraction: c.amount, text: `${Math.round(c.amount * 100)}%`,
            enabled: c.active && c.on, defaultButton: true } },
        { label: tr('cinema.distance'), dim: !(c.active && d),
          control: { type: 'slider', id: 'distance', fraction: d ? distToFraction(d) : 0,
            text: d ? `${d.value.toFixed(d.value < 10 ? 1 : 0)} m` : '', enabled: c.active && !!d,
            defaultButton: true, ends: [tr('cinema.closer'), tr('cinema.farther')] } },
        { label: tr('cinema.glow'), hint: tr('cinema.glowHint'), dim: !c.active, control: { type: 'switch', id: 'glow', on: !!c.glow, enabled: c.active } },
        { label: tr('cinema.glowStrength'), dim: !(c.active && c.glow),
          control: { type: 'slider', id: 'glowStrength', fraction: c.glowStrength || 0, text: `${Math.round((c.glowStrength || 0) * 100)}%`,
            enabled: c.active && !!c.glow, defaultButton: true } },
        { label: tr('cinema.glowLength'), dim: !(c.active && c.glow && c.glowReach),
          control: { type: 'slider', id: 'glowReach', fraction: c.glowReach ? reachToFraction(c.glowReach) : 0,
            text: c.glowReach ? `${Math.round(c.glowReach.value * 100)}%` : '', enabled: c.active && !!c.glow && !!c.glowReach,
            defaultButton: true, ends: [tr('cinema.shorter'), tr('cinema.longer')] } },
      ],
    };
  }

  function event(ev, vs, actions) {
    const c = (vs && vs.cinema) || null, d = vs && vs.distance;
    if (ev.type === 'switch' && ev.value === 'curve') actions.setCurve({ on: !(c && c.on) });
    else if (ev.type === 'default' && ev.value === 'distance') { if (d) actions.setDistance(d.default); }
    else if (ev.type === 'default' && ev.value === 'curveAmount') { if (c) actions.setCurve({ amount: c.defaultAmount }); }
    else if (ev.type === 'slider' && ev.value === 'distance') { if (d) actions.setDistance(fractionToDist(d, ev.fraction)); }
    else if (ev.type === 'slider' && ev.value === 'curveAmount') actions.setCurve({ amount: ev.fraction });
    else if (ev.type === 'switch' && ev.value === 'glow') actions.setGlow({ on: !(c && c.glow) });
    else if (ev.type === 'slider' && ev.value === 'glowStrength') actions.setGlow({ strength: ev.fraction });
    else if (ev.type === 'default' && ev.value === 'glowStrength') { if (c) actions.setGlow({ strength: c.defaultGlowStrength }); }
    else if (ev.type === 'slider' && ev.value === 'glowReach') { if (c && c.glowReach) actions.setGlow({ reach: fractionToReach(c.glowReach, ev.fraction) }); }
    else if (ev.type === 'default' && ev.value === 'glowReach') { if (c && c.glowReach) actions.setGlow({ reach: c.glowReach.default }); }
    else return false;
    return true;
  }

  ns.vrCinemaOptions = { content, event };
})(globalThis.__streamxr = globalThis.__streamxr || {});
