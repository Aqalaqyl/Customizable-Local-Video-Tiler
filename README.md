# Customizable Local Video Tiler

This repository currently stores the **project overview on `main`** and keeps the
actual Electron applications in `cursor/*` branches. This tutorial shows how to
set up and use the app end-to-end, using
`cursor/local-video-tiler-ccae` as the reference implementation.

## What you will build and run

A local desktop app that lets you:
- split one window into multiple video tiles,
- bind each tile to a real folder on disk,
- play different media in each tile,
- rename/manage tile folders from inside the app.

---

## Step 1: Clone and enter the repository

1. Clone:
   - `git clone <your-repo-url>`
2. Enter the repo:
   - `cd Customizable-Local-Video-Tiler`
3. Verify you are on `main`:
   - `git branch --show-current`

---

## Step 2: Check out the application branch

`main` does not include runnable Electron source yet, so switch to the branch
that contains the app:

- `git checkout cursor/local-video-tiler-ccae`

You can confirm expected files exist:
- `package.json`
- `src/main/main.js`
- `src/renderer/renderer.js`

Optional check:
- `ls`

---

## Step 3: Install prerequisites

### Required software

- Node.js 18+ (Node 22 is known to work well)
- npm (ships with Node)

Verify:
- `node -v`
- `npm -v`

---

## Step 4: Install dependencies

From the app branch root:

- `npm install`

This installs Electron and all project dependencies.

---

## Step 5: Run the app

### macOS / Windows / desktop Linux

- `npm start`

### Linux cloud/headless containers (no sandbox support)

Use one of these:
- `npm start -- --no-sandbox`
- `DISPLAY=:1 npm start -- --no-sandbox`
- `xvfb-run -a npm start -- --no-sandbox`

When successful, an Electron window opens with one initial tile.

---

## Step 6: First-time app setup

When the app opens:

1. (Optional) Click **Library...** in the top bar.
2. Choose a root folder for your media library.
3. The app creates per-tile folders inside that root.

If you skip this, the default library folder is used automatically.

---

## Step 7: Build your tile layout

1. Click **Edit Layout** (or press `Ctrl/Cmd + E`).
2. Move the cursor over a tile to see the split preview.
3. Split tiles:
   - **Click** for left/right split.
   - **Shift + Click** for top/bottom split.
4. Drag dividers to resize tiles.
5. Click **Done** to leave edit mode.

Tip: Split positions are based on exact click location, so you can create
precise layouts.

---

## Step 8: Name tiles and organize folders

Each tile has controls:

- **Rename button:** renames both tile label and backing folder.
- **Add videos button:** copies selected media files into that tile folder.
- **Playlist toggle button:** shows or hides the tile playlist.
- **Open folder button:** opens tile folder in the OS file manager.
- **Remove tile button:** removes the tile from layout (folder is not auto-deleted).

---

## Step 9: Play media

1. Use **Add videos** in a tile, or copy files into that tile's folder manually.
2. Open the tile playlist if hidden.
3. Click a media item to start playback in that tile.
4. Repeat in other tiles for multi-stream viewing/listening.

Supported formats depend on your OS + Chromium codecs (common formats like
`mp4`, `webm`, `mkv`, `mov`, `mp3`, `wav`, and others are typically supported).

---

## Step 10: Run tests (recommended)

From the app branch:

- Desktop environment:
  - `npm test`
- Headless Linux:
  - `xvfb-run -a npm test`

If tests fail after multiple runs because of persisted state, clear prior local
data and retry:

- `rm -rf ~/LocalVideoTiler ~/.config/local-video-tiler ~/.config/Electron`

Then run tests again.

---

## Troubleshooting quick reference

- **App does not launch in containerized Linux:** add `--no-sandbox`.
- **No visible desktop in cloud VM:** use `DISPLAY=:1` or `xvfb-run`.
- **Rename-related test flakes across reruns:** remove persisted folders/config
  shown in Step 10.

---

## Daily workflow cheat sheet

1. `git checkout cursor/local-video-tiler-ccae`
2. `npm install` (first time only, or after dependency changes)
3. `npm start -- --no-sandbox` (if sandbox is unavailable)
4. Edit, run, and validate with `npm test`

This gives you a repeatable setup for local development and regular use.
