// StreamXR's page-world entry point: answers the popup's requests over the bridge. Loaded
// last, after the sites' files. The "Watch in VR" popup (isolated world,
// src/streamxr/ui/panel.js) can't touch WebXR or the player, so it asks this world to do
// it, with DOM events carrying JSON (see src/core/shared/bridge.js). Everything about the
// site goes through the provider of the site this page belongs to (core/page/sites.js).
(function (ns) {
  'use strict';

  const { bridge, diagnostics, xrSession, formats } = ns;
  const site = ns.sites.current();
  if (!site) { console.warn(`[streamxr] no site registered for ${location.hostname}`); return; }
  const provider = site.provider;
  const E = bridge.EVENTS;

  // "What kind of video is this?" -> what the site says about it (for Details), plus the
  // format the provider picks for it ({ fmt, isSpatial }) to preselect in the panel, and
  // whether a video is playing at all (hasVideo: VR can start without one).
  bridge.on(E.INFO_REQUEST, () => {
    const info = provider.info();
    let detected = { fmt: formats.DEFAULT, isSpatial: false };
    try { if (info.ok) detected = provider.detectFormat(info); } catch (_) { /* no player data yet */ }
    bridge.send(E.INFO_RESPONSE, { ...info, detected, hasVideo: !!provider.video() });
  });

  // "Which colours?" -> the site's Material 3 palette (tokens.js, made from its theme; the
  // same colours as the VR panels), so the popup matches them.
  bridge.on(E.THEME_REQUEST, () => {
    if (ns.vrAppearanceOptions) ns.vrAppearanceOptions.useSite(provider);   // the chosen theme
    else ns.vrTokens.apply(provider.theme);
    bridge.send(E.THEME_RESPONSE, { palette: { ...ns.vrTokens.m3 } });
  });

  // "Can VR work here?" -> WebXR availability, headset clues, controller reports.
  bridge.on(E.DIAG_REQUEST, async () => bridge.send(E.DIAG_RESPONSE, await diagnostics.check()));

  // Simple remote controls (play/pause, seek), usable from either world.
  bridge.on(E.CMD, cmd => {
    try {
      if (cmd.action === 'toggle') provider.toggle();
      else if (cmd.action === 'seek') provider.seek(cmd.delta);
    } catch (_) { /* player not ready */ }
  });

  // Called synchronously from the panel's click, so WebXR's user-gesture requirement is met.
  // `passthrough`: the popup's "See your room" checkbox (used only if the browser offers it).
  bridge.on(E.ENTER, ({ fmt, passthrough }) => {
    xrSession.start(provider, fmt || formats.DEFAULT, state => bridge.send(E.STATE, state), { passthrough: !!passthrough })
      .then(() => bridge.send(E.STATE, { state: 'started' }))
      .catch(err => bridge.send(E.STATE, { state: 'error', message: ns.i18n.t('vr.cantStart', { error: err && err.message }) }));
  });

  // Leave VR (the panel's button turns into "Exit VR" while a session runs).
  bridge.on(E.EXIT, () => xrSession.end());
})(globalThis.__streamxr = globalThis.__streamxr || {});
