// Settings for the in-VR controller models. Tune fit and looks here.
(function (ns) {
  'use strict';

  ns.controllerConfig = {
    // If the model sits off your real hand, nudge these (metres / degrees, WebXR grip space:
    // +X = out of the back of the right hand, -Z = toward the thumb, -Y = toward the trigger).
    // The left hand is mirrored automatically.
    fit: {
      offset: [0, 0, 0],
      rotDeg: [0, 0, 0],                // applied X, then Y, then Z
    },

    stickTiltDeg: 16,                   // how far the model's stick tilts at full deflection
    showIcons: true,

    // Which gamepad button lights up which model part (WebXR "xr-standard" layout).
    // Measured on the Steam Frame through SteamVR + Chrome (2026-10): 7 buttons per hand,
    // profiles 'oculus-touch' / 'generic-trigger-squeeze-thumbstick'. SteamVR's default Touch emulation merges the right controller's
    // X and Y into button 5 (same as B), so the browser can't tell them apart; all three
    // light up together. Button 6 is unidentified so far. Left 4/5 are the two primary left
    // inputs (shown on the D-pad). A value can be one part name or a list of them.
    buttonParts: {
      right: { 0: 'trigger', 1: 'grip', 3: 'stick', 4: 'btnA', 5: ['btnB', 'btnX', 'btnY'] },
      left:  { 0: 'trigger', 1: 'grip', 3: 'stick', 4: 'dpad', 5: 'dpad' },
    },

    // Placement of the action icons (which icon goes on which part comes from src/core/shared/controls.js).
    // lift: metres off the part's surface; size: icon width in metres; useTop: anchor at the
    // part's highest point instead of its centre.
    iconPlacement: {
      trigger: { lift: 0.017, size: 0.016 },   // far enough out that the button stays clear of the trigger
      grip:    { lift: 0.016, size: 0.016 },   // ... and of the grip
      stick:   { lift: 0.012, size: 0.022, useTop: true },
      btnA:    { lift: 0.012, size: 0.016, useTop: true },
      btnB:    { lift: 0.012, size: 0.016, useTop: true },
      dpad:    { lift: 0.012, size: 0.018, useTop: true },
    },
    iconMinAlpha: 0.55,                 // icons fade (down to this) when they face away from you

    // A controller left still fades (with its icons), and its laser beam goes out, each after
    // its own wait (Settings → Auto-hide, vr-panel/fade-options.js) with no movement faster
    // than moveSpeed (m/s) or turnSpeed (rad/s) and no button, touch or stick: the controller
    // eases down to `alpha` (0.2: 80% see-through), the beam to nothing, over fadeOutMs; any
    // movement or press brings them back over fadeInMs. null = never fade.
    idle: { alpha: 0.2, moveSpeed: 0.04, turnSpeed: 0.35, fadeOutMs: 500, fadeInMs: 120 },

    // Part colours (linear-ish RGB). Part names come from models.js.
    colors: {
      body:    [0.13, 0.135, 0.145],
      door:    [0.13, 0.135, 0.145],
      stick:   [0.08, 0.08, 0.085],
      btnA:    [0.20, 0.205, 0.215],
      btnB:    [0.20, 0.205, 0.215],
      btnX:    [0.20, 0.205, 0.215],
      btnY:    [0.20, 0.205, 0.215],
      dpad:    [0.20, 0.205, 0.215],
      menu:    [0.20, 0.205, 0.215],
      system:  [0.20, 0.205, 0.215],
      trigger: [0.17, 0.175, 0.185],
      grip:    [0.17, 0.175, 0.185],
    },
    accent: [0.24, 0.65, 1.0],          // pressed parts blend toward this (YouTube-ish blue)
  };
})(globalThis.__streamxr = globalThis.__streamxr || {});
