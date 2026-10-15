// YouTube's channel badges, registered with the shell's badge registry (styles/kit.js):
// 'verified' (a check mark in a circle) and 'artist' (a music note in a star, drawn 4 px
// bigger than asked so it reads as large as the check). Each draws centred on (x, y) at
// roughly `size` pixels tall, in the current fill colour.
(function (ns) {
  'use strict';

  // Check mark inside a circle (verified channel).
  function verified(g, x, y, size) {
    const r = size / 2;
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#212121'; g.lineWidth = size * 0.14; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x - r * 0.45, y + r * 0.02); g.lineTo(x - r * 0.1, y + r * 0.36); g.lineTo(x + r * 0.5, y - r * 0.32); g.stroke();
    g.restore();
  }

  // Music note inside a star (official artist / verified music channel).
  function artist(g, x, y, size) {
    const R = size / 2, r = R * 0.5;
    g.save();
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill();
    g.fillStyle = '#212121'; g.strokeStyle = '#212121'; g.lineWidth = size * 0.07;
    g.beginPath(); g.arc(x - R * 0.1, y + R * 0.2, R * 0.16, 0, Math.PI * 2); g.fill();     // note head
    g.beginPath(); g.moveTo(x + R * 0.04, y + R * 0.2); g.lineTo(x + R * 0.04, y - R * 0.3); g.lineTo(x + R * 0.24, y - R * 0.18); g.stroke();
    g.restore();
  }

  ns.vrKit.registerBadge('verified', verified);
  ns.vrKit.registerBadge('artist', artist, 4);
})(globalThis.__streamxr = globalThis.__streamxr || {});
