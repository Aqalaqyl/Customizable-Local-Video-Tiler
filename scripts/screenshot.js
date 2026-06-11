'use strict';

// Builds a sample multi-tile layout and captures a screenshot for the README.
// Run: xvfb-run -a ./node_modules/.bin/electron scripts/screenshot.js --no-sandbox

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

require(path.join(__dirname, '..', 'src', 'main', 'main.js'));

async function evalInPage(win, fn, ...args) {
  const code = `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`;
  return win.webContents.executeJavaScript(code, true);
}

function seedFolder(folder, names) {
  try {
    fs.mkdirSync(folder, { recursive: true });
    names.forEach((n) => fs.writeFileSync(path.join(folder, n), 'x'));
  } catch (e) {
    /* ignore */
  }
}

app.whenReady().then(async () => {
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

  let leaves = await evalInPage(win, () => window.__lvt.leaves());
  const rootId = leaves[0].id;

  leaves = await evalInPage(win, (id) => window.__lvt.split(id, 'vertical', 0.58), rootId);
  const leftId = leaves[0].id;
  const rightId = leaves[1].id;

  leaves = await evalInPage(win, (id) => window.__lvt.split(id, 'horizontal', 0.55), rightId);
  await evalInPage(win, (id) => window.__lvt.split(id, 'horizontal', 0.5), leftId);

  leaves = await evalInPage(win, () => window.__lvt.leaves());
  const labels = ['Lectures', 'Music Videos', 'Highlights', 'Podcasts'];
  for (let i = 0; i < leaves.length; i++) {
    await evalInPage(win, (id, name) => window.__lvt.rename(id, name), leaves[i].id, labels[i % labels.length]);
  }

  leaves = await evalInPage(win, () => window.__lvt.leaves());
  seedFolder(leaves[0].folderPath, ['Intro to Systems.mp4', 'Networks 101.mp4', 'Databases.webm']);
  seedFolder(leaves[1] && leaves[1].folderPath, ['Live Set.mp4', 'Acoustic.webm']);
  seedFolder(leaves[2] && leaves[2].folderPath, ['Game 7.mp4', 'Top 10.mp4', 'Finals.mkv']);
  seedFolder(leaves[3] && leaves[3].folderPath, ['Episode 12.m4a', 'Episode 13.mp3']);

  await evalInPage(win, () => window.__lvt.rerender());
  await new Promise((r) => setTimeout(r, 700));

  const img = await win.webContents.capturePage();
  const out = path.join(__dirname, '..', 'docs', 'screenshot.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.toPNG());
  console.log('Saved screenshot to', out);
  app.exit(0);
});
