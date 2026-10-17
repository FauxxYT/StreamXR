// The core's words in English (the complete table: every other language falls back to it):
// controls panel, keyboard, help, the Laser / Keyboard / Language settings tabs. StreamXR's
// own words (formats, popup) are in src/streamxr/shared/strings-en.js.
// Loaded into both worlds (the popup uses some too). To translate: copy this file to
// strings-<language>.js (e.g. strings-es.js), translate the texts (never the keys), and
// list it in manifest.json after this one, in both content_scripts entries (see
// CONTRIBUTING.md, "Translating"). Leaving a key out shows the English text.
//
// {name} is filled in by the code (keep it, move it wherever your language needs it).
// A text written as { one: '...', other: '...' } has plural forms, chosen by {n} with
// your language's rules (use its forms: zero, one, two, few, many, other).
(function (ns) {
  'use strict';

  ns.i18n.add('en', {
    // What each controller input does (the popup's help list).
    'help.heading': 'In the headset:',
    'help.select': 'trigger = click the VR panels (brings them back when hidden)',
    'help.toggle': 'A = play/pause',
    'help.keyboard': 'B = keyboard / controls panel',
    'help.panel': 'left D-pad = show/hide panel',
    'help.recenter': 'grip = recenter',
    'help.seek': 'stick left/right = ±10 s',
    'help.reset': 'right stick click (hold 3 s) = reset all settings',
    'help.grabPanel': 'grip on the bar under the VR panel = move the panel',
    'help.grabKeyboard': 'grip on the bar under the keyboard = move it; on its bottom corners = resize it',
    'help.scroll': 'stick up/down while pointing at a scrolling text panel = scroll (its icon changes)',
    'help.pages': 'stick left/right while pointing at a panel with pages = previous/next page (its icon changes)',

    // The controls panel.
    'panel.exit': 'Exit VR',
    'panel.quality': 'Quality',
    'panel.auto': 'Auto',
    'panel.speed': 'Speed',
    'panel.muted': 'Muted',
    'dialog.cancel': 'Cancel',
    'panel.format': 'Format',
    'panel.recenter': 'Recenter',
    'panel.live': 'LIVE',
    'panel.ad': 'Ad',
    'panel.skipAd': 'Skip ad',
    'panel.skipIn': 'Skip in {n}',
    'panel.skipOnDesktop': 'Skip on desktop',
    'panel.noQualities': '{site} hasn’t listed qualities for this video yet.',
    'panel.theSite': 'The site',
    'panel.previousVideo': 'Previous video',
    'panel.nextVideo': 'Next video',

    // Words the panel styles draw themselves.
    'style.loadingMore': 'Loading more…',
    'style.default': 'Default',
    'style.more': 'More ({page}/{pages})',

    // The VR keyboard.
    'kb.enter': 'Enter',
    'kb.hide': 'Hide',
    'kb.typingInto': 'Typing into {target}',
    'kb.noTarget': 'Click a text box to type into it',

    // Settings tabs that belong to the core: Laser, Keyboard, Language.
    'laser.note': 'Smooths out hand tremor in the lasers. Steadier follows a little more slowly.',
    'laser.steadiness': 'Steadiness',
    'laser.off': 'Off',
    'laser.steadiest': 'Steadiest',
    'appearance.note': 'How the panels look and feel: their colors, glass showing the video softly through them, their size, and vibration.',
    'appearance.theme': 'Colors',
    'appearance.themeHint': 'The panels’ color theme',
    'appearance.glass': 'Glass',
    'appearance.glassHint': 'Panels show the video behind them, blurred',
    'appearance.tint': 'Tint',
    'appearance.clearer': 'Clearer',
    'appearance.darker': 'Darker',
    'appearance.size': 'Panel size',
    'appearance.sizeHint': 'Text, buttons and panels together',
    'appearance.haptics': 'Vibration',
    'appearance.hapticsHint': 'The controllers buzz softly when you point at or click something',
    'appearance.hapticsMissing': 'Haptics are not supported on these controllers yet',
    'fade.note': 'How long each part waits, unused, before it hides or fades (while a video plays).',
    'fade.panels': 'Control panel',
    'fade.panelsHint': 'With the lasers and the Settings popup',
    'fade.bars': 'Side toolbars',
    'fade.barsHint': 'Beside the video, with their open panels',
    'fade.search': 'Search bar',
    'fade.searchHint': 'Above the video',
    'fade.controllers': 'Controllers',
    'fade.controllersHint': 'When held still',
    'fade.lasers': 'Lasers',
    'fade.lasersHint': 'When the controller is held still',
    'fade.seconds': '{n} s',
    'fade.never': 'Never',
    'fade.paused': 'Auto-hide while paused',
    'fade.pausedHint': 'The waits above run with the video paused too',
    'safezone.note': 'Where the panels go: a share of what your headset shows ({h}° × {v}°). The outline shows it.',
    'safezone.width': 'Width',
    'safezone.widthHint': 'Of your view, left to right',
    'safezone.height': 'Height',
    'safezone.heightHint': 'Of your view, top to bottom',
    'safezone.shift': 'Position',
    'safezone.shiftHint': 'Its center, above or below eye level',
    'safezone.narrower': 'Narrower',
    'safezone.wider': 'Wider',
    'safezone.shorter': 'Shorter',
    'safezone.taller': 'Taller',
    'safezone.lower': 'Lower',
    'safezone.higher': 'Higher',
    'safezone.recenter': 'Recenter resets panels',
    'safezone.recenterHint': 'Recentering also puts the panels you moved back in their places',
    'keyboard.note': 'The VR keyboard (A button). Default: your computer’s keyboard and language.',
    'keyboard.style': 'Style',
    'keyboard.language': 'Language',
    'keyboard.default': 'Default',
    'keyboard.yourLayout': 'Your layout',
    'keyboard.yourKeyboard': '{name} (your keyboard)',
    'keyboard.yourBrowser': '{name} (your browser)',
    'language.note': 'StreamXR’s own words. Titles, descriptions and comments come from the site.',
    'language.language': 'Language',
    'language.yourBrowser': '{name} (your browser)',
    'language.default': 'Default',
  });
})(globalThis.__streamxr = globalThis.__streamxr || {});
