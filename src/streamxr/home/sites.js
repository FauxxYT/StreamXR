// The sites StreamXR Home and its toolbar popup list (docs/Home-Page.md). Each site adds its
// own entry from its folder (src/sites/<site>/home/site.js), so nothing here names a site;
// this is the extension pages' counterpart of the page world's registry (src/core/page/sites.js).
//
//   ns.homeSites.register({ id, name, url, icon, color })
//       id: short name ('youtube'); name: shown as is (a brand name); url: where "Open" goes;
//       icon: the site's own icon, an https address on the site itself (loaded from there
//       when shown, never copied into StreamXR; optional); color: the site's brand color, for
//       the plain mark shown instead when there's no icon or it can't load (#rrggbb)
//   ns.homeSites.all() -> every entry, in the order they registered
(function (ns) {
  'use strict';

  const entries = [];

  function register(site) {
    if (!site || !site.id || !site.name || !/^https:\/\//.test(site.url || '')) {
      console.warn('[streamxr] a Home site entry is missing id, name or an https url:', site);
      return;
    }
    if (entries.some(s => s.id === site.id)) return;
    entries.push(site);
  }

  ns.homeSites = { register, all: () => entries.slice() };
})(globalThis.__streamxr = globalThis.__streamxr || {});
