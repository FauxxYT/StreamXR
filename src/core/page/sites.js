// The site registry (page world): each supported site registers itself from its own
// folder (src/sites/<site>/), and the core picks the one for the page it's running on.
// Nothing outside src/sites/ names a site; this is how the rest finds the right one.
//
//   ns.sites.register({ id, name, hosts: ['www.example.com', ...], provider })
//       id: short name ('youtube'); hosts: the page hostnames it handles (exact matches,
//       like its manifest.json entry's `matches`); provider: its provider (the interface
//       is described in src/sites/youtube/page/provider/provider.js)
//   ns.sites.current() -> the registration for this page (location.hostname), or null
//   ns.sites.all() -> every registration, in the order they registered
(function (ns) {
  'use strict';

  const registry = [];

  function register(site) {
    if (!site || !site.id || !site.provider || !Array.isArray(site.hosts)) {
      console.warn('[streamxr] a site registration is missing id, hosts or provider:', site);
      return;
    }
    if (registry.some(s => s.id === site.id)) { console.warn(`[streamxr] site "${site.id}" registered twice`); return; }
    registry.push(site);
  }

  const current = () => registry.find(s => s.hosts.includes(location.hostname)) || null;

  ns.sites = { register, current, all: () => registry.slice() };
})(globalThis.__streamxr = globalThis.__streamxr || {});
