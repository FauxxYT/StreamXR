// Copies each shared folder's *.js to its isolated-world copy (src/core/shared/ ->
// src/core/ui/shared/, src/streamxr/shared/ -> src/streamxr/ui/shared/) and checks
// manifest.json.
//
//   node tools/sync-shared.js          copy, then check
//   node tools/sync-shared.js --check  only check (exit code 1 if anything is out of date)
//
// Why the copies exist: Chrome injects a given script file at most once per page, even when
// two content_scripts entries list it. So a file listed for both the page world and the
// isolated world only runs in whichever entry comes first. Each world therefore needs its
// own file. Edit the shared/ folders and run this; never edit the ui/shared/ copies by hand.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const PAIRS = [['src/core/shared', 'src/core/ui/shared'], ['src/streamxr/shared', 'src/streamxr/ui/shared']];
const checkOnly = process.argv.includes('--check');
const header = (from, name) => `// GENERATED from ${from}/${name} by tools/sync-shared.js - edit that file, not this one.\n`;

let problems = 0;
const fail = msg => { console.error('✗ ' + msg); problems++; };

// 1. Copies are up to date.
for (const [from, to] of PAIRS) {
  const srcDir = path.join(root, from), outDir = path.join(root, to);
  fs.mkdirSync(outDir, { recursive: true });
  const shared = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));
  for (const name of shared) {
    const want = header(from, name) + fs.readFileSync(path.join(srcDir, name), 'utf8');
    const target = path.join(outDir, name);
    const have = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (have === want) continue;
    if (checkOnly) fail(`${to}/${name} is out of date (run node tools/sync-shared.js)`);
    else { fs.writeFileSync(target, want); console.log(`updated ${to}/${name}`); }
  }
  for (const name of fs.readdirSync(outDir)) {
    if (!shared.includes(name)) fail(`${to}/${name} has no source in ${from}/ (delete it)`);
  }
}

// 2. Manifest: every file exists, and no script file is listed in two content_scripts entries.
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const seen = new Map();
(manifest.content_scripts || []).forEach((entry, i) => {
  for (const f of [...(entry.js || []), ...(entry.css || [])]) {
    if (!fs.existsSync(path.join(root, f))) fail(`manifest lists ${f}, which doesn't exist`);
    if (seen.has(f) && seen.get(f) !== i) fail(`manifest lists ${f} in two content_scripts entries; Chrome will only run it in the first`);
    seen.set(f, i);
  }
});

if (problems) process.exit(1);
console.log('✓ shared copies and manifest OK');
