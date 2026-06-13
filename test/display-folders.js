'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
  resolveLibraryRoot,
  pathWithinRoot
} = require('../src/main/library-paths.js');

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
}

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lvt-lib-'));
const displayA = 'display-111';
const displayB = 'display-222';

const rootA = resolveLibraryRoot(base, displayA);
const rootB = resolveLibraryRoot(base, displayB);

check('display roots are distinct', rootA !== rootB);
check('display A root is under base', pathWithinRoot(rootA, base));
check('display B root is under displays', rootB.includes(`${path.sep}displays${path.sep}${displayB}`));

const tileA = path.join(rootA, 'News');
const tileB = path.join(rootB, 'News');
fs.mkdirSync(tileA, { recursive: true });
fs.mkdirSync(tileB, { recursive: true });

check('same tile name can exist on two displays', fs.existsSync(tileA) && fs.existsSync(tileB));
check('tile A is scoped to display A root', pathWithinRoot(tileA, rootA));
check('tile A is not under display B root', !pathWithinRoot(tileA, rootB));
check('global root without display id is the base path', resolveLibraryRoot(base, null) === base);

try {
  fs.rmSync(base, { recursive: true, force: true });
} catch (e) {
  /* ignore */
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nRESULT ${results.length - failed}/${results.length} passed`);
console.log(failed === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED');
process.exit(failed === 0 ? 0 : 1);
