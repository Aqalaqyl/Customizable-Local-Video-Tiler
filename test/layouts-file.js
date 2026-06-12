'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  validateLayoutTree,
  validateLayoutFile,
  createLayout,
  saveActiveLayout,
  importLayoutData,
  getActiveLayout,
  stripFolderPaths
} = require('../src/main/layouts');

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
}

const sampleTree = {
  id: 'root',
  type: 'leaf',
  name: 'Library',
  folderPath: '/tmp/x',
  currentVideo: null
};

check('validates leaf tree', validateLayoutTree(sampleTree));

const splitTree = {
  id: 's1',
  type: 'split',
  direction: 'vertical',
  ratio: 0.5,
  children: [
    { id: 'a', type: 'leaf', name: 'A' },
    { id: 'b', type: 'leaf', name: 'B' }
  ]
};
check('validates split tree', validateLayoutTree(splitTree));
check('rejects invalid tree', !validateLayoutTree({ type: 'leaf' }));

const file = validateLayoutFile({ version: 1, name: 'Test', layout: splitTree });
check('validates layout file', file && file.name === 'Test');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lvt-layouts-'));
const cfg = {};
const created = createLayout(tmp, 'Workspace');
check('creates named layout file', created.id && created.name === 'Workspace');

const active = getActiveLayout(tmp, { ...cfg, activeLayoutId: created.id });
check('loads active layout', active.entry.id === created.id);

saveActiveLayout(tmp, active.cfg, splitTree);
const reloaded = getActiveLayout(tmp, active.cfg);
check('persists layout tree', validateLayoutTree(reloaded.entry.layout));

const stripped = stripFolderPaths(splitTree.children[0]);
check('stripFolderPaths clears folderPath', stripped.folderPath == null);

const imported = importLayoutData(
  tmp,
  { name: 'Imported', layout: splitTree },
  'fallback'
);
check('imports layout with new id', imported && imported.name === 'Imported');

const failed = results.filter((r) => !r.ok).length;
console.log(`\nRESULT ${results.length - failed}/${results.length} passed`);
console.log(failed === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED');
process.exit(failed === 0 ? 0 : 1);
