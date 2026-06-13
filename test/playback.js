'use strict';

// Verifies that media files placed in a tile's folder are listed in the
// playlist and loaded into the <video> element via a file:// URL.

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

require(path.join(__dirname, '..', 'src', 'main', 'main.js'));

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
}

async function evalInPage(win, fn, ...args) {
  const code = `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`;
  return win.webContents.executeJavaScript(code, true);
}

app.whenReady().then(async () => {
  try {
    let win = BrowserWindow.getAllWindows()[0];
    for (let i = 0; i < 50 && !win; i++) {
      await new Promise((r) => setTimeout(r, 100));
      win = BrowserWindow.getAllWindows()[0];
    }
    if (win.webContents.isLoading()) {
      await new Promise((res) => win.webContents.once('did-finish-load', res));
    }
    for (let i = 0; i < 100; i++) {
      const ready = await evalInPage(
        win,
        () => !!(window.__lvt && window.__lvt.state && window.__lvt.state.root)
      );
      if (ready) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const leaves = await evalInPage(win, () => window.__lvt.leaves());
    const folder = leaves[0].folderPath;

    // Drop two fake media files into the tile folder.
    fs.writeFileSync(path.join(folder, 'b-second.mp4'), 'x');
    fs.writeFileSync(path.join(folder, 'a-first.webm'), 'x');
    fs.writeFileSync(path.join(folder, 'notes.txt'), 'ignore me');

    // Re-render so the playlist reloads, then wait for the async list.
    await evalInPage(win, () => window.__lvt.rerender());
    await new Promise((r) => setTimeout(r, 500));

    const items = await evalInPage(win, () =>
      Array.from(document.querySelectorAll('.playlist-item .pi-name')).map(
        (n) => n.textContent
      )
    );
    check('playlist lists both media files', items.length === 2);
    check('non-media files are excluded', !items.includes('notes.txt'));
    check(
      'playlist is sorted alphabetically/naturally',
      items[0] === 'a-first.webm' && items[1] === 'b-second.mp4'
    );

    const videoSrc = await evalInPage(
      win,
      () => document.querySelector('.tile-video').getAttribute('src')
    );
    check('video element has a file:// source', /^file:\/\//.test(videoSrc || ''));
    check(
      'default loaded video is the first file',
      decodeURIComponent(videoSrc || '').endsWith('a-first.webm')
    );

    await evalInPage(win, () => {
      document.querySelector('.tile-video').dispatchEvent(new Event('ended'));
    });
    await new Promise((r) => setTimeout(r, 150));

    const activeAfterEnd = await evalInPage(
      win,
      () => document.querySelector('.playlist-item.active .pi-name')?.textContent || ''
    );
    check('playlist autoplays the next video when one ends', activeAfterEnd === 'b-second.mp4');

    await evalInPage(win, () => {
      const btn = [...document.querySelectorAll('.tile-controls button')].find(
        (b) => b.title === 'Loop current video'
      );
      btn.click();
    });
    const loopEnabled = await evalInPage(
      win,
      () => document.querySelector('.tile-video').loop
    );
    check('loop toggle enables video.loop', loopEnabled === true);

    await evalInPage(win, () => {
      document.querySelector('.tile-video').dispatchEvent(new Event('ended'));
    });
    await new Promise((r) => setTimeout(r, 150));

    const activeWithLoop = await evalInPage(
      win,
      () => document.querySelector('.playlist-item.active .pi-name')?.textContent || ''
    );
    check('loop mode does not advance to the next playlist item', activeWithLoop === 'b-second.mp4');

    fs.unlinkSync(path.join(folder, 'b-second.mp4'));
    fs.unlinkSync(path.join(folder, 'a-first.webm'));
    fs.writeFileSync(path.join(folder, 'only.mp4'), 'x');
    await evalInPage(win, () => window.__lvt.rerender());
    await new Promise((r) => setTimeout(r, 500));

    const singleVideoLoop = await evalInPage(
      win,
      () => document.querySelector('.tile-video').loop
    );
    check('single-video playlist loops automatically', singleVideoLoop === true);
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
