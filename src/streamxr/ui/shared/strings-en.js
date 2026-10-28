// GENERATED from src/streamxr/shared/strings-en.js by tools/sync-shared.js - edit that file, not this one.
// StreamXR's words in English (the complete table: every other language falls back to it):
// video formats, the "Watch in VR" popup, starting VR, the 2D Cinema settings tab. The
// core's words (controls panel, keyboard, settings) are in src/core/shared/strings-en.js,
// a site's in its provider folder. Loaded into both worlds (the popup uses them). To
// translate: copy this file to strings-<language>.js (e.g. strings-fr.js), translate the
// texts (never the keys), and list it in manifest.json after this one, in both
// content_scripts entries (see CONTRIBUTING.md, "Translating"). Leaving a key out shows
// the English text.
//
// {name} is filled in by the code (keep it, move it wherever your language needs it).
(function (ns) {
  'use strict';

  ns.i18n.add('en', {
    // Video formats: the full names (the popup's picker) and short ones (the VR panel's
    // Format button; \n = line break).
    'format.flat': 'Cinema screen (regular video)',
    'format.flatsbs': 'Cinema screen 3D side by side (both eyes in one frame)',
    'format.360mono': '360°',
    'format.360eac': '360° cubemap (YouTube "mesh")',
    'format.180mono': '180° (VR180)',
    'format.180sbs': '180° 3D side by side (both eyes in one frame)',
    'format.short.flat': 'Cinema\nscreen',
    'format.short.flatsbs': 'Cinema 3D\nside by side',
    'format.short.360mono': '360°',
    'format.short.360eac': '360°\ncubemap',
    'format.short.180mono': '180°',
    'format.short.180sbs': '180° 3D\nside by side',

    // The popup on the video page, and the player's VR button.
    'popup.button': 'Watch in VR (SteamVR)',
    'popup.title': 'Watch in VR',
    'popup.reading': 'Reading video info…',
    'popup.spatial': '{site} marks this as a 360°/VR video. Change the format if it looks wrong.',
    'popup.regular': 'A regular video: it plays on a cinema screen in front of you.',
    'popup.noVideo': 'No video is playing. Enter VR anyway and pick one from the panels there.',
    'popup.enter': 'Enter VR',
    'popup.exit': 'Exit VR',
    'popup.starting': 'Starting…',
    'popup.details': 'Details',
    'popup.format': 'Format',
    'popup.controls': 'Controls',
    // Quick troubleshooting: the most likely issue (from what Details shows), then a short checklist.
    'trouble.title': 'Quick troubleshooting',
    'trouble.likely': 'Most likely issue',
    'trouble.checklist': 'Things to check',
    'trouble.ok': 'Nothing wrong found: your headset is ready. Press Enter VR.',
    'trouble.okStarted': 'Nothing wrong found: VR started fine last time.',
    'trouble.noResponse': 'StreamXR isn’t answering on this page. Reload this tab.',
    'trouble.blocked': '{site} is blocking VR on this page. Reload the tab.',
    'trouble.noWebxr': 'This browser can’t do VR on websites. Use Chrome, Edge or another Chromium browser.',
    'trouble.xrReplaced': 'Another extension is standing in for the browser’s VR (for example, the WebXR API Emulator). Turn it off in chrome://extensions, then reload this tab.',
    'trouble.xrError': 'The browser couldn’t look for a headset ({error}). Restart the browser.',
    'trouble.noRuntime': 'The browser can’t see SteamVR. Most often, SteamVR isn’t set as the OpenXR runtime (other VR software, like Quest Link or Virtual Desktop, can take it over), or the browser was opened before SteamVR (checks 1 to 4).',
    'trouble.lost': 'The headset was there, then went away. Make sure SteamVR is running and the headset is streaming, then reload this tab.',
    'trouble.busy': 'The headset was found, but SteamVR wouldn’t start VR. Another tab or app may be in VR, or SteamVR is showing a message in the headset. Restart SteamVR and try again.',
    'trouble.blockedStart': 'The browser stopped VR from starting. Press Enter VR again.',
    'trouble.failed': 'VR didn’t start ({error}). Restart SteamVR, then the browser.',
    'trouble.gpu': 'Also: the browser is drawing with {gpu}. If your PC also has a gaming graphics card, see check 5.',
    'trouble.gpuTwo': 'Also: your PC has two graphics cards, and the browser is drawing with the low-power one ({gpu}). See check 5.',
    // ({link}: a link, its words from trouble.samplesLink / trouble.issueLink; {copy}: the Copy details button)
    'trouble.check1': 'Start SteamVR and get the headset streaming before opening the browser.',
    'trouble.check2': 'In SteamVR, open Settings → OpenXR and set SteamVR as the OpenXR runtime.',
    'trouble.check3': 'Have Quest Link, Virtual Desktop or other VR software installed? It can take over OpenXR, even while it’s closed: set SteamVR back as the runtime (check 2), then restart the browser.',
    'trouble.check4': 'Quit the browser fully: turn off “Continue running background apps” (Edge: also “Startup boost”), close every window, then open it again.',
    'trouble.check5': 'PC with two graphics cards (most gaming laptops)? In Windows, Settings → Display → Graphics: set the browser to High performance.',
    'trouble.check6': 'Only one tab or app in VR at a time, and turn off other VR or WebXR extensions (like the WebXR API Emulator) in chrome://extensions. Check the headset for a SteamVR message.',
    'trouble.check7': 'Try the {link}. If they don’t work either, it’s the PC’s setup, not StreamXR.',
    'trouble.check8': 'Still stuck? {copy} and {link}.',
    'trouble.samplesLink': 'WebXR samples',
    'trouble.issueLink': 'open an issue on GitHub',
    'popup.copy': 'Copy details',
    'popup.copied': 'Copied ✓',
    'popup.copyFailed': 'Copy failed',
    'popup.saveFrame': 'Save video frame',
    'popup.noFrame': 'No video frame to save yet. Start the video first.',
    'popup.frameFailed': 'Couldn’t capture the frame: {error}',
    'popup.noResponse': 'The extension’s page script didn’t respond. Reload this tab after reloading the extension.',
    'popup.blocked': '{site} is blocking WebXR on this page. Reload the tab once; if it stays, send me the Details.',
    'popup.noHeadset': 'No VR headset found. Start SteamVR and get your headset streaming (Steam Frame: Streaming Status → your PC → Advanced → Stream VR without game), then close every Chrome window and open Chrome again. Still nothing? See Quick troubleshooting below.',
    'popup.stopped': 'VR stopped.',
    'popup.thisSite': 'This site',
    'popup.passthrough': 'See your room (passthrough)',
    'popup.passthroughNotYet': 'Not offered yet: this browser and headset don’t give websites the camera view.',
    'popup.glass': 'Glass panels',
    'popup.glassNote': 'The video shows softly through the VR panels. Turn it off if VR stutters on this PC.',

    // Starting VR and reading the video.
    'vr.cantStart': 'Couldn’t start VR: {error}',
    'vr.blockedFrames': '{site} blocked reading this video’s frames (cross-origin).',
    'vr.cantRead': 'Couldn’t read the video: {error}',

    // The 2D Cinema settings tab.
    'cinema.now': 'Now: {format}',
    'cinema.nowNotFlat': 'Now: {format} · these work on the cinema screen (2D videos) only',
    'cinema.follow': 'Follow your head',
    'cinema.followHint': 'On a 2D video, the screen and panels catch up when you turn',
    'cinema.followDelay': 'Follow delay',
    'cinema.followSpeed': 'Follow speed',
    'cinema.sooner': 'Sooner',
    'cinema.later': 'Later',
    'cinema.slower': 'Slower',
    'cinema.faster': 'Faster',
    'cinema.curve': 'Curve',
    'cinema.curveAmount': 'Curve intensity',
    'cinema.distance': 'Distance',
    'cinema.closer': 'Closer',
    'cinema.farther': 'Farther',
    'cinema.glow': 'Glow',
    'cinema.glowHint': 'A soft light around the screen in the colors of its edges',
    'cinema.glowStrength': 'Glow strength',
    'cinema.glowLength': 'Glow length',
    'cinema.shorter': 'Shorter',
    'cinema.longer': 'Longer',
  });
})(globalThis.__streamxr = globalThis.__streamxr || {});
