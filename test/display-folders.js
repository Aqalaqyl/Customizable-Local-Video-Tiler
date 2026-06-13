'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
  resolveLibraryRoot,
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

check('default display slot is 1', DEFAULT_DISPLAY_SLOT === 1);
check('display slots 1 and 2 are distinct', root1 !== root2);
check('missing display slot uses display 1 folder', rootDefault === root1);
check('invalid display slot uses display 1 folder', resolveLibraryRoot(base, 9) === root1);
check('display 1 root is under base', pathWithinRoot(root1, base));
check(
  'display 2 root uses numbered folder',
  root2.includes(`${path.sep}displays${path.sep}2`)
);

const tileA = path.join(root1, 'News');
const tileB = path.join(root2, 'News');
fs.mkdirSync(tileA, { recursive: true });
fs.mkdirSync(tileB, { recursive: true });

check('same tile name can exist on two display slots', fs.existsSync(tileA) && fs.existsSync(tileB));
check('tile on display 1 is scoped to slot 1 root', pathWithinRoot(tileA, root1));
check('tile on display 1 is not under slot 2 root', !pathWithinRoot(tileA, root2));

try {
  fs.rmSync(base, { recursive: true, force: true });
} catch (e) {
  /* ignore */
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nRESULT ${results.length - failed}/${results.length} passed`);
console.log(failed === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED');
process.exit(failed === 0 ? 0 : 1);
