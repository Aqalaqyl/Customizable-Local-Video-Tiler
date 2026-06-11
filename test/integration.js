'use strict';

// End-to-end integration test driven through a real Electron renderer.
// Run with:  xvfb-run -a ./node_modules/.bin/electron test/integration.js --no-sandbox
//
// It reuses the production main process (IPC handlers + window) and exercises
// the tiling/folder logic via the window.__lvt debug API, asserting that the
// on-disk folders stay in sync with the tiles.

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

require(path.join(__dirname, '..', 'src', 'main', 'main.js'));

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
}

function getWindow() {
  return BrowserWindow.getAllWindows()[0];
}

async function evalInPage(win, fn, ...args) {
  const code = `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`;
  return win.webContents.executeJavaScript(code, true);
}

async function waitForBoot(win) {
  for (let i = 0; i < 100; i++) {
    const ready = await evalInPage(
      win,
      () => !!(window.__lvt && window.__lvt.state && window.__lvt.state.root)
    );
    if (ready) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('renderer did not boot');
}

app.whenReady().then(async () => {
  try {
    let win = getWindow();
    for (let i = 0; i < 50 && !win; i++) {
      await new Promise((r) => setTimeout(r, 100));
      win = getWindow();
    }
    if (!win) throw new Error('no window created');
    if (win.webContents.isLoading()) {
      await new Promise((res) =>
        win.webContents.once('did-finish-load', res)
      );
    }
    await waitForBoot(win);

    // 1. Starts with a single tile.
    let leaves = await evalInPage(win, () => window.__lvt.leaves());
    check('starts with exactly one tile', leaves.length === 1);
    const rootId = leaves[0].id;
    check('initial tile has a folder on disk', fs.existsSync(leaves[0].folderPath));

    // 2. Vertical split -> two tiles, two folders.
    leaves = await evalInPage(
      win,
      (id) => window.__lvt.split(id, 'vertical', 0.5),
      rootId
    );
    check('vertical split yields two tiles', leaves.length === 2);
    check(
      'both tiles have distinct existing folders',
      leaves[0].folderPath !== leaves[1].folderPath &&
        fs.existsSync(leaves[0].folderPath) &&
        fs.existsSync(leaves[1].folderPath)
    );

    // 3. Horizontal split of the second tile -> three tiles.
    const secondId = leaves[1].id;
    leaves = await evalInPage(
      win,
      (id) => window.__lvt.split(id, 'horizontal', 0.4),
      secondId
    );
    check('horizontal split yields three tiles', leaves.length === 3);

    // 4. Rename a tile -> folder on disk is renamed to match.
    const target = leaves[0];
    const renamed = await evalInPage(
      win,
      (id) => window.__lvt.rename(id, 'My Movies'),
      target.id
    );
    const renamedLeaf = renamed.find((l) => l.id === target.id);
    check('rename updates tile name', renamedLeaf.name === 'My Movies');
    check(
      'renamed folder basename matches tile name',
      path.basename(renamedLeaf.folderPath) === 'My Movies'
    );
    check('renamed folder exists on disk', fs.existsSync(renamedLeaf.folderPath));
    check('old folder no longer exists', !fs.existsSync(target.folderPath));

    // 5. Remove a tile -> sibling collapses, count drops.
    leaves = await evalInPage(
      win,
      (id) => window.__lvt.remove(id),
      renamedLeaf.id
    );
    check('removing a tile drops the count', leaves.length === 2);

    // 6. Cannot remove below one tile.
    await evalInPage(win, (id) => window.__lvt.remove(id), leaves[0].id);
    leaves = await evalInPage(win, () => window.__lvt.remove(window.__lvt.leaves()[0].id));
    check('cannot remove the last remaining tile', leaves.length === 1);
  } catch (err) {
    console.log('FAIL - exception:', err && err.stack ? err.stack : String(err));
    results.push({ name: 'no exception', ok: false });
  } finally {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\nRESULT ${results.length - failed}/${results.length} passed`);
    console.log(failed === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED');
    app.exit(failed === 0 ? 0 : 1);
  }
});
