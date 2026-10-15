"""Which CAD face of the Steam Frame controller belongs to which part (button, trigger...).

Valve's STEP files are one fused solid per controller with no colours, so parts are found
from the geometry of each CAD face. Coordinates are Valve's CAD frame in millimetres:
the faceplate faces +Z, the handle runs toward -Y/-Z, the trigger sits at +Y under the
faceplate. The rules are written for the right controller; the left is mirrored in X.

The trigger and grip button were picked by hand as CAD face ids on the right controller
(they share their outline with the body, so simple rules didn't separate them cleanly);
the left controller's faces are found by mirroring those and matching the nearest face.
If Valve publishes a new CAD revision, re-check these with a render before trusting them.
"""
import json

import numpy as np

# Order matters: the index is what models.js stores per vertex, and the stick must be 1
# (the shader tilts part 1). Keep in sync with src/core/page/controllers/config.js colours.
PARTS = ['body', 'stick', 'btnA', 'btnB', 'btnX', 'btnY', 'dpad', 'menu', 'system', 'trigger', 'grip', 'door']
P = {name: i for i, name in enumerate(PARTS)}

# Right controller CAD face ids (from the 2026-09-26 STEP release).
GRIP_FACES_R = [25, 26, 29, 30, 31, 32, 464, 466, 467, 468, 469, 474, 482, 483]
TRIGGER_FACES_R = [392, 393, 394, 395, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410,
                   411, 412, 413, 414, 415, 416, 417, 418, 423, 424, 425, 426, 427, 429, 430, 431, 433, 434,
                   435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450]


def load_mesh(path):
    """occt-import-js JSON -> (vertices, normals, triangles, CAD face id per triangle)."""
    m = json.load(open(path))['meshes'][0]
    v = np.array(m['attributes']['position']['array'], float).reshape(-1, 3)
    n = np.array(m['attributes']['normal']['array'], float).reshape(-1, 3)
    tris = np.array(m['index']['array'], int).reshape(-1, 3)
    face = np.full(len(tris), -1)
    for k, bf in enumerate(m['brep_faces']):
        face[bf['first']:bf['last'] + 1] = k
    return v, n, tris, face


def face_stats(v, tris, face):
    """Area-weighted centroid, average normal and area of every CAD face."""
    t = v[tris]
    c = t.mean(1)
    cr = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
    area = np.linalg.norm(cr, axis=1) / 2
    F = face.max() + 1
    fc, fn, fa = np.zeros((F, 3)), np.zeros((F, 3)), np.zeros(F)
    np.add.at(fc, face, c * area[:, None])
    np.add.at(fn, face, cr)
    np.add.at(fa, face, area)
    fc /= np.maximum(fa, 1e-9)[:, None]
    fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-9
    return fc, fn, fa


def _faceplate_parts(fc, fa, side):
    """Rule-based parts on the faceplate (everything except trigger and grip)."""
    s = 1 if side == 'R' else -1
    x, y, z = fc[:, 0] * s, fc[:, 1], fc[:, 2]          # mirrored into the right-hand frame
    out = np.zeros(len(fc), int)                         # everything starts as 'body' (index 0)
    near = lambda cx, cy: np.hypot(x - cx, y - cy)       # distance from a point on the faceplate
    # Each rule: faces whose centre is within a radius of a spot (or inside a box) on the
    # faceplate, and high enough in z to be on the surface rather than inside the shell.
    out[(near(-13.1, -10.2) < 6.5) & (z > -1.0)] = P['stick']
    if side == 'R':                                      # diamond of four face buttons
        for name, (cx, cy) in {'btnA': (14.9, -12.1), 'btnB': (24.0, -3.2),
                               'btnX': (6.0, -3.2), 'btnY': (14.9, 5.7)}.items():
            out[(near(cx, cy) < 4.3) & (z > -1.7)] = P[name]
    else:                                                # D-pad
        out[(np.abs(x - 14.9) < 12.5) & (np.abs(y + 3.2) < 12.5) & (z > -1.0) & (fa < 500)] = P['dpad']
    out[(np.abs(x + 0.6) < 5.6) & (np.abs(y - 9.4) < 3.0) & (z > -1.0)] = P['menu']
    out[(near(3.8, -23.7) < 4.7) & (z > -3.0) & (fa < 100)] = P['system']
    return out


def _mirror_match(ids, fc, fa, ref):
    """Right-controller face ids -> matching face ids on the left controller."""
    rc, ra = ref
    mirrored = fc * np.array([-1, 1, 1])
    out = []
    for k in ids:
        d = np.linalg.norm(mirrored - rc[k], axis=1) + 0.02 * np.abs(fa - ra[k])
        j = int(np.argmin(d))
        if d[j] < 1.5:
            out.append(j)
    return out


def classify(fine_mesh_path, side, right_fine_mesh_path):
    """Part index for every CAD face of one controller. side: 'R' or 'L'."""
    v, _, tris, face = load_mesh(fine_mesh_path)
    fc, _, fa = face_stats(v, tris, face)
    parts = _faceplate_parts(fc, fa, side)
    if side == 'R':
        grip, trigger = GRIP_FACES_R, TRIGGER_FACES_R
    else:
        rv, _, rt, rf = load_mesh(right_fine_mesh_path)
        rc, _, ra = face_stats(rv, rt, rf)
        grip, trigger = _mirror_match(GRIP_FACES_R, fc, fa, (rc, ra)), _mirror_match(TRIGGER_FACES_R, fc, fa, (rc, ra))
    parts[trigger] = P['trigger']
    parts[grip] = P['grip']
    return parts
