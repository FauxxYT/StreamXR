// The one place that says what each controller input does. Used by the input handler
// (page world), the in-VR icons on the controller models (page world) and the help line
// in the panel (isolated world). Loaded into both worlds.
//
// buttons: indexes into gamepad.buttons (WebXR "xr-standard": 0 trigger, 1 squeeze/grip,
//          3 thumbstick press, 4/5 the two face buttons). Any of them triggers the action.
// hand:    'left' | 'right' | undefined (either hand).
// axis:    'x' = thumbstick left/right (gamepad.axes[2], falling back to axes[0]).
// part:    which part of the controller model shows the icon (see src/core/page/controllers/).
// icon:    which drawing to show (see src/core/page/controllers/icons.js); optional.
// help:    the help line's key in the string tables (strings-en.js), e.g. "A = play/pause".
// step/threshold (stick only): seconds per push, and how far the stick must move (0..1).
// hold:    seconds the button must be held before the action runs (once per hold). While
//          it's held, the icon on `part` becomes a countdown with a ring filling around it.
//
// Bindings whose `action` has no handler in the input handler are ignored there: 'select'
// (the trigger) is handled by the VR panel's laser instead.
//
// The Steam Frame reaches Chrome as an Oculus Touch controller, so only two face buttons
// per hand arrive (4/5); on the right, A arrives as 4 and B, X and Y all as 5. The left
// D-pad also arrives as 4/5.
(function (ns) {
  'use strict';

  const BINDINGS = Object.freeze([
    { action: 'select',   buttons: [0],    part: 'trigger', icon: 'pointer',   help: 'help.select' },
    { action: 'toggle',   buttons: [4],    hand: 'right', part: 'btnA', icon: 'playpause', help: 'help.toggle' },
    { action: 'keyboard', buttons: [5],    hand: 'right', part: 'btnB', icon: 'keyboard',  help: 'help.keyboard' },
    { action: 'panel',    buttons: [4, 5], hand: 'left',  part: 'dpad', icon: 'panel',     help: 'help.panel' },
    { action: 'recenter', buttons: [1],    part: 'grip',    icon: 'recenter',  help: 'help.recenter' },
    { action: 'seek',     axis: 'x',       part: 'stick',   icon: 'seek',      help: 'help.seek',
      step: 10, threshold: 0.7 },
    { action: 'reset',    buttons: [3],    hand: 'right', part: 'stick', hold: 3, help: 'help.reset' },
  ]);

  // Things the bindings above don't describe on their own (string table keys).
  const EXTRA_HELP = Object.freeze(['help.grabPanel', 'help.grabKeyboard', 'help.scroll', 'help.pages']);

  // The help text, one line per binding plus the extras (shown as a list in the popup), or
  // all joined into one sentence; in the interface language (i18n.js).
  const helpLines = () => [...BINDINGS.map(b => b.help), ...EXTRA_HELP].map(k => ns.i18n.t(k));
  const helpText = () => `${ns.i18n.t('help.heading')} ${helpLines().join(' · ')}`;

  ns.controls = { BINDINGS, helpLines, helpText };
})(globalThis.__streamxr = globalThis.__streamxr || {});
