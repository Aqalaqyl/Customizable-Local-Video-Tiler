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

async function waitForTileFolder(win) {
  for (let i = 0; i < 100; i++) {
    const leaves = await evalInPage(win, () => window.__lvt.leaves());
    if (leaves[0] && leaves[0].folderPath) return leaves[0].folderPath;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('tile folder not ready');
}

async function waitForPlaylistItems(win, count, tileId) {
  for (let i = 0; i < 50; i++) {
    const n = await evalInPage(
      win,
      (id) =>
        document.querySelectorAll(`.tile[data-id="${id}"] .playlist-item`).length,
      tileId
    );
    if (n >= count) return;
    await new Promise((r) => setTimeout(r, 100));
  }
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

    const folder = await waitForTileFolder(win);
    const tileId = await evalInPage(win, () => window.__lvt.leaves()[0].id);

    // Drop two fake media files into the tile folder.
    fs.writeFileSync(path.join(folder, 'b-second.mp4'), 'x');
    fs.writeFileSync(path.join(folder, 'a-first.webm'), 'x');
    fs.writeFileSync(path.join(folder, 'notes.txt'), 'ignore me');

    // Re-render so the playlist reloads, then wait for the async list.
    await evalInPage(win, () => window.__lvt.rerender());
    await waitForPlaylistItems(win, 2, tileId);

    const items = await evalInPage(
      win,
      (id) =>
        Array.from(
          document.querySelector(`.tile[data-id="${id}"]`).querySelectorAll(
            '.playlist-item .pi-name'
          )
        ).map((n) => n.textContent),
      tileId
    );
    check('playlist lists both media files', items.length === 2);
    check('non-media files are excluded', !items.includes('notes.txt'));
    check(
      'playlist is sorted alphabetically/naturally',
      items[0] === 'a-first.webm' && items[1] === 'b-second.mp4'
    );

    const videoSrc = await evalInPage(
      win,
      (id) =>
        document
          .querySelector(`.tile[data-id="${id}"] .tile-video`)
          .getAttribute('src'),
      tileId
    );
    check('video element has a file:// source', /^file:\/\//.test(videoSrc || ''));
    check(
      'default loaded video is the first file',
      decodeURIComponent(videoSrc || '').endsWith('a-first.webm')
    );

    await evalInPage(
      win,
      (id) => {
        document
          .querySelector(`.tile[data-id="${id}"] .tile-video`)
          .dispatchEvent(new Event('ended'));
      },
      tileId
    );
    await new Promise((r) => setTimeout(r, 150));

    const activeAfterEnd = await evalInPage(
      win,
      (id) =>
        document.querySelector(
          `.tile[data-id="${id}"] .playlist-item.active .pi-name`
        )?.textContent || '',
      tileId
    );
    check('playlist autoplays the next video when one ends', activeAfterEnd === 'b-second.mp4');

    await evalInPage(
      win,
      (id) => {
        const btn = [
          ...document.querySelectorAll(`.tile[data-id="${id}"] .tile-controls button`)
        ].find((b) => b.title === 'Loop current video');
        btn.click();
      },
      tileId
    );
    const loopEnabled = await evalInPage(
      win,
      (id) => document.querySelector(`.tile[data-id="${id}"] .tile-video`).loop,
      tileId
    );
    check('loop toggle enables video.loop', loopEnabled === true);

    await evalInPage(
      win,
      (id) => {
        document
          .querySelector(`.tile[data-id="${id}"] .tile-video`)
          .dispatchEvent(new Event('ended'));
      },
      tileId
    );
    await new Promise((r) => setTimeout(r, 150));

    const activeWithLoop = await evalInPage(
      win,
      (id) =>
        document.querySelector(
          `.tile[data-id="${id}"] .playlist-item.active .pi-name`
        )?.textContent || '',
      tileId
    );
    check('loop mode does not advance to the next playlist item', activeWithLoop === 'b-second.mp4');

    fs.unlinkSync(path.join(folder, 'b-second.mp4'));
    fs.unlinkSync(path.join(folder, 'a-first.webm'));
    fs.writeFileSync(path.join(folder, 'only.mp4'), 'x');
    await evalInPage(win, () => window.__lvt.rerender());
    await waitForPlaylistItems(win, 1, tileId);

    const singleVideoLoop = await evalInPage(
      win,
      (id) => document.querySelector(`.tile[data-id="${id}"] .tile-video`).loop,
      tileId
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
