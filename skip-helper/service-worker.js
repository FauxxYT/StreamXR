// StreamXR Skip Helper for YouTube (Chromium). Optional companion to "StreamXR".
//
// Why it exists: YouTube ignores script clicks on its Skip ad button (it checks that the
// click is real input). The only way an extension can make real input is the debugger
// API, and Chrome warns "Read and change all your data on all websites" for it (it can't
// be an optional permission). Keeping it in this tiny separate extension means the main
// extension doesn't need it; people who want to skip ads without leaving VR install this.
//
// What it can do, and nothing else: when asked by another extension's content script
// running in a YouTube tab, press the visible Skip button in THAT tab. It takes no
// coordinates or instructions; it finds the button itself. It attaches the debugger only
// for the click and detaches right away (Chrome shows its "debugging" bar for a moment).
//
// Messages (chrome.runtime.sendMessage(HELPER_ID, msg) from a content script):
//   { type: 'streamxr-helper-ping' }  -> { ok: true, version }
//   { type: 'streamxr-skip-ad' }      -> { ok: true } | { ok: false, error }
'use strict';

const PROTOCOL = '1.3';

// Runs in the YouTube page: finds the visible Skip button, scrolls it into view, makes
// anything covering it click-through (e.g. the VR extension's own panel over the player)
// and returns its centre in viewport CSS pixels. Undone by RESTORE after the click.
const FIND_BUTTON = `(() => {
  const btn = document.querySelector('#movie_player.ad-showing .ytp-skip-ad-button, #movie_player.ad-showing .ytp-ad-skip-button-modern, #movie_player.ad-showing .ytp-ad-skip-button');
  const shown = el => { if (!el || el.offsetParent === null) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0; };
  if (!shown(btn)) return null;
  let r = btn.getBoundingClientRect();
  if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) {
    btn.scrollIntoView({ block: 'center' });
    r = btn.getBoundingClientRect();
  }
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const covers = [];
  for (const el of document.elementsFromPoint(x, y)) {
    if (el === btn || btn.contains(el)) break;
    if (el.contains(btn)) continue;
    covers.push([el, el.style.pointerEvents]);
    el.style.pointerEvents = 'none';
  }
  window.__streamxrSkipCovers = covers;
  return { x, y };
})()`;
const RESTORE = `(() => {
  for (const [el, pe] of window.__streamxrSkipCovers || []) el.style.pointerEvents = pe;
  delete window.__streamxrSkipCovers;
})()`;

// Attach the debugger to the tab, find the Skip button, click it, detach. Resolves
// { ok: true } or { ok: false, error }. The `finally` blocks make sure the covered
// elements are restored and the debugger is detached even if a step fails.
async function pressSkip(tabId) {
  const target = { tabId };
  await chrome.debugger.attach(target, PROTOCOL);
  try {
    const found = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', { expression: FIND_BUTTON, returnByValue: true });
    const point = found && found.result && found.result.value;
    if (!point) return { ok: false, error: 'no visible Skip button' };
    const { x, y } = point;
    const click = { x, y, button: 'left', clickCount: 1, pointerType: 'mouse' };
    try {
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'mouse' });
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mousePressed', ...click });
      await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mouseReleased', ...click });
    } finally {
      await chrome.debugger.sendCommand(target, 'Runtime.evaluate', { expression: RESTORE }).catch(() => {});
    }
    return { ok: true };
  } finally {
    try { await chrome.debugger.detach(target); } catch (_) { /* already detached */ }
  }
}

chrome.runtime.onMessageExternal.addListener((msg, sender, reply) => {
  const type = msg && msg.type;
  if (type === 'streamxr-helper-ping') { reply({ ok: true, version: chrome.runtime.getManifest().version }); return false; }
  if (type !== 'streamxr-skip-ad') return false;
  const tab = sender.tab;
  if (!tab || tab.id == null || !/^https:\/\/www\.youtube\.com\//.test(sender.url || tab.url || '')) {
    reply({ ok: false, error: 'only from a YouTube tab' });
    return false;
  }
  pressSkip(tab.id)
    .then(reply)
    .catch(err => reply({ ok: false, error: String(err && err.message || err) }));
  return true;                                                    // reply comes later
});
