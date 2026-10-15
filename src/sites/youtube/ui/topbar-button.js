// The VR button in YouTube's top bar, just left of "+ Create" (or the other buttons on the
// right of the bar when signed out), on every page: VR can start without a video (Home, a
// channel, search results...), and you pick one from inside VR. A round icon button in the
// size of the bar's own (button.css).
(function (ns) {
  'use strict';

  const CLASS = 'streamxr-top-btn';

  // Add the button if the top bar is there and it's missing. onClick(button) runs when it's
  // pressed (the popup opens under it). Safe to call repeatedly (src/sites/youtube/ui/main.js
  // does: YouTube can rebuild its top bar).
  function ensure(onClick) {
    if (document.querySelector(`.${CLASS}`)) return;
    const buttons = document.querySelector('ytd-masthead #end #buttons');
    if (!buttons) return;
    const btn = document.createElement('button');
    btn.className = CLASS;
    btn.title = ns.i18n.t('popup.button');                 // the interface language (i18n.js)
    btn.setAttribute('aria-label', ns.i18n.t('popup.title'));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
    svg.innerHTML = ns.gogglesIcon.markup(24);
    btn.appendChild(svg);
    btn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); onClick(btn); }, true);
    buttons.insertBefore(btn, buttons.firstChild);
  }

  ns.topbarButton = { ensure, CLASS };
})(globalThis.__streamxr = globalThis.__streamxr || {});
