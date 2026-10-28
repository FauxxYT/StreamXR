// YouTube's entry on StreamXR Home and its toolbar popup (src/streamxr/home/sites.js): its
// name, where "Open YouTube" goes, its own icon (loaded from YouTube, not copied into
// StreamXR), and its brand color for the plain mark shown if the icon can't load.
(function (ns) {
  'use strict';

  ns.homeSites.register({
    id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/',
    icon: 'https://www.youtube.com/favicon.ico', color: '#FF0033',
  });
})(globalThis.__streamxr = globalThis.__streamxr || {});
