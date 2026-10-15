// The VR button in YouTube's player controls. Built as a copy of one of YouTube's own
// buttons (Settings, which is always enabled; CC can be dimmed) so it inherits the current
// player design's structure, size and alignment. It always looks enabled (button.css).
(function (ns) {
  'use strict';

  const { gogglesIcon } = ns;
  const CLASS = 'streamxr-btn';

  // Make our button from a copy of YouTube's own button `ref`: copy it, strip everything
  // except the icon's skeleton, then swap in the headset icon.
  function cloneFrom(ref) {
    const btn = ref.cloneNode(true);
    for (const a of [...btn.attributes]) btn.removeAttribute(a.name);    // no YouTube ids/handlers/state
    btn.className = `ytp-button ${CLASS}`;
    btn.title = ns.i18n.t('popup.button');                 // the interface language (i18n.js)
    btn.setAttribute('aria-label', ns.i18n.t('popup.title'));
    const svg = btn.querySelector('svg');
    if (!svg) { btn.innerHTML = gogglesIcon.standalone(); return btn; }
    // Drop anything that isn't on the path to the icon (badges like "HD", tooltips, labels).
    for (const el of [...btn.querySelectorAll('*')]) {
      if (el !== svg && !el.contains(svg) && !svg.contains(el)) el.remove();
    }
    // Keep only the class names on the wrapper elements around the icon (they carry the layout).
    for (const el of btn.querySelectorAll('*')) {
      if (el !== svg && !svg.contains(el)) {
        for (const a of [...el.attributes]) if (a.name !== 'class') el.removeAttribute(a.name);
      }
    }
    // Draw the headset on the same grid size as YouTube's icon so it comes out the same size.
    const vb = (svg.getAttribute('viewBox') || '0 0 24 24').trim().split(/\s+/).map(Number);
    // (only its size: none of YouTube's fill, opacity or state on the copy)
    for (const a of [...svg.attributes]) if (!/^(viewBox|width|height|xmlns)$/i.test(a.name)) svg.removeAttribute(a.name);
    svg.innerHTML = gogglesIcon.markup(vb[2] || 24);
    return btn;
  }

  // Add the button if the player is there and it's missing; show it only on /watch pages.
  // onClick(playerEl) runs when it's pressed. Safe to call repeatedly (src/sites/youtube/ui/main.js does,
  // because YouTube rebuilds its controls and drops our button). The click handler is added
  // in the capture phase and stops the event so YouTube's own player doesn't also react.
  function ensure(onClick) {
    const playerEl = document.getElementById('movie_player');
    const controls = playerEl && playerEl.querySelector('.ytp-right-controls');
    let btn = document.querySelector(`.${CLASS}`);
    if (controls && !btn) {
      // A copy of Settings (CC carries a dimmed look on videos without captions), placed
      // where CC is (else before Settings).
      const ref = controls.querySelector('.ytp-settings-button') || controls.querySelector('.ytp-subtitles-button');
      const spot = controls.querySelector('.ytp-subtitles-button') || ref;
      if (ref) {
        btn = cloneFrom(ref);
        spot.parentNode.insertBefore(btn, spot);
      } else {
        btn = document.createElement('button');
        btn.className = `ytp-button ${CLASS}`;
        btn.innerHTML = gogglesIcon.standalone();
        controls.insertBefore(btn, controls.firstChild);
      }
      btn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); onClick(playerEl); }, true);
    }
    if (btn) btn.classList.toggle('streamxr-hidden', location.pathname !== '/watch');
  }

  ns.playerButton = { ensure, CLASS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
