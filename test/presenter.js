'use strict';

// Verifies presenter windows receive their own layout (not a blank stage).
// Run: xvfb-run -a ./node_modules/.bin/electron test/presenter.js --no-sandbox

const { app, BrowserWindow } = require('electron');
const path = require('path');

require(path.join(__dirname, '..', 'src', 'main', 'main.js'));

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
}

function getMainWindow() {
  return BrowserWindow.getAllWindows().find((w) => {
    const url = w.webContents.getURL();
    return url.includes('index.html');
  });
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

async function waitForPresenter() {
  for (let i = 0; i < 100; i++) {
    const presenter = BrowserWindow.getAllWindows().find((w) => {
      const url = w.webContents.getURL();
      return url.includes('presenter.html');
    });
    if (presenter) return presenter;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('presenter window did not open');
}

app.whenReady().then(async () => {
  try {
    let win = getMainWindow();
    for (let i = 0; i < 50 && !win; i++) {
      await new Promise((r) => setTimeout(r, 100));
      win = getMainWindow();
    }
    if (!win) throw new Error('no main window');
    if (win.webContents.isLoading()) {
      await new Promise((res) => win.webContents.once('did-finish-load', res));
    }
    await waitForBoot(win);

    const displays = await evalInPage(win, () => window.api.listDisplays());
    check('at least one display is available', displays.length >= 1);

    const startRes = await evalInPage(
      win,
      async (displayId) => {
        const ensured = await window.api.ensureDisplayLayout(displayId, 'Test Display');
        return window.api.startDisplays([
          { displayId, layoutId: ensured.layoutId }
        ]);
      },
      displays[0].id
    );
    check('presenter session starts', startRes.ok === true);
    check('assignment includes layout id', !!startRes.assignments?.[0]?.layoutId);

    const presenter = await waitForPresenter();
    if (presenter.webContents.isLoading()) {
      await new Promise((res) => presenter.webContents.once('did-finish-load', res));
    }

    let tileCount = 0;
    for (let i = 0; i < 80; i++) {
      tileCount = await evalInPage(
        presenter,
        () => document.querySelectorAll('.tile').length
      );
      if (tileCount >= 1) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    check('presenter renders at least one tile', tileCount >= 1);

    const stageSize = await evalInPage(presenter, () => {
      const stage = document.getElementById('stage');
      return stage
        ? { width: stage.offsetWidth, height: stage.offsetHeight }
        : { width: 0, height: 0 };
    });
    check('presenter stage has non-zero size', stageSize.width > 0 && stageSize.height > 0);

    await evalInPage(win, () => window.api.stopDisplays());
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
