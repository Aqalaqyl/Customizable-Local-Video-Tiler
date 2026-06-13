'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
  resolveLibraryRoot,
  resolveTileFolderPath,
  pathWithinRoot,
  DEFAULT_DISPLAY_SLOT
} = require('../src/main/library-paths.js');

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
}

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lvt-lib-'));
const root1 = resolveLibraryRoot(base, 1);
const root2 = resolveLibraryRoot(base, 2);
const rootDefault = resolveLibraryRoot(base, null);
const tile1 = resolveTileFolderPath(base, 1, 1);
const tile2 = resolveTileFolderPath(base, 2, 1);

check('default display slot is 1', DEFAULT_DISPLAY_SLOT === 1);
check('display slots 1 and 2 are distinct', root1 !== root2);
check('missing display slot uses display1 folder', rootDefault === root1);
check('invalid display slot uses display1 folder', resolveLibraryRoot(base, 9) === root1);
check('display 1 root uses display1 folder name', root1.endsWith(`${path.sep}display1`));
check('display 2 root uses display2 folder name', root2.endsWith(`${path.sep}display2`));
check('tile folder path uses tile1 name', tile1.endsWith(`${path.sep}tile1`));
check('tile folders differ across displays', tile1 !== tile2);

fs.mkdirSync(tile1, { recursive: true });
fs.mkdirSync(tile2, { recursive: true });

check('tile folders can be created on disk', fs.existsSync(tile1) && fs.existsSync(tile2));
check('tile on display1 is scoped to display1 root', pathWithinRoot(tile1, root1));
check('tile on display1 is not under display2 root', !pathWithinRoot(tile1, root2));

try {
  fs.rmSync(base, { recursive: true, force: true });
} catch (e) {
  /* ignore */
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nRESULT ${results.length - failed}/${results.length} passed`);
console.log(failed === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED');
process.exit(failed === 0 ? 0 : 1);
