// The isolated world's view of the site (YouTube): its name for the popup's messages and
// its brand colour for the popup (src/streamxr/ui/panel.js), shown until the page world sends
// the full Material 3 palette. Loaded before the popup.
(function (ns) {
  'use strict';

  ns.site = {
    name: 'YouTube',
    theme: { accent: '#FF0033', onAccent: '#FFFFFF' },   // YouTube Red, white on it
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
