// Step 1 of the controller-model pipeline: turn Valve's STEP files into triangle meshes.
//
//   node tessellate.js <occt-import-js dist folder> <folder with the .stp files> <work folder>
//
// occt-import-js: https://github.com/kovacsv/occt-import-js (clone it; use its dist/ folder).
// Writes, per hand (R/L):
//   fine_<H>.json    ~0.15 mm detail, used only to classify parts accurately
//   coarse_<H>.json  ~0.8 mm detail, what ships in models.js (~9k triangles)
//   door_<H>.json    battery door (plain, no strap), coarse
'use strict';
const fs = require('fs');
const path = require('path');

const [occtDir, stepDir, workDir] = process.argv.slice(2);
if (!occtDir || !stepDir || !workDir) {
  console.error('usage: node tessellate.js <occt-import-js dist> <step folder> <work folder>');
  process.exit(1);
}
const occtImport = require(path.resolve(occtDir, 'occt-import-js.js'));

// File names in Valve's Valve_Steam_Frame_Controller_*.zip (dates may change between releases).
const find = re => {
  const hit = fs.readdirSync(stepDir).find(f => re.test(f));
  if (!hit) throw new Error(`no file matching ${re} in ${stepDir}`);
  return path.join(stepDir, hit);
};
// One job per output file: [STEP file, output name, linear deflection (mm), angular deflection].
// Smaller deflection = more triangles. The fine mesh is only for deciding which CAD face is
// which part; the coarse mesh is what the extension draws.
const JOBS = [];
for (const H of ['R', 'L']) {
  const body = find(new RegExp(`^Valve_Steam_Frame_Controller_${H}_.*\\.stp$`, 'i'));
  const door = find(new RegExp(`^Valve_Steam_Frame_Cntrl_Batt_Door_${H}_.*\\.stp$`, 'i'));
  JOBS.push([body, `fine_${H}.json`, 0.15, 0.3], [body, `coarse_${H}.json`, 0.8, 0.7], [door, `door_${H}.json`, 0.8, 0.7]);
}

// Load the OpenCascade WebAssembly build, then tessellate each job's STEP file into
// triangles with the requested detail and save the result as JSON.
occtImport().then(occt => {
  fs.mkdirSync(workDir, { recursive: true });
  for (const [src, out, linear, angular] of JOBS) {
    const r = occt.ReadStepFile(new Uint8Array(fs.readFileSync(src)), {
      linearUnit: 'millimeter', linearDeflectionType: 'absolute_value',
      linearDeflection: linear, angularDeflection: angular,
    });
    if (!r.success || r.meshes.length !== 1) throw new Error(`${src}: expected one solid`);
    const m = r.meshes[0];
    fs.writeFileSync(path.join(workDir, out), JSON.stringify(r));
    console.log(`${out}: ${m.index.array.length / 3} triangles, ${m.brep_faces.length} CAD faces`);
  }
});
