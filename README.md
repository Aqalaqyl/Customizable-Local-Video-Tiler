# Video Tiler

A local desktop app for viewing and listening to downloaded video files, with a customizable tiling layout inspired by tiling window managers.

## Features

- **Tiling layout** — Split the screen into nested vertical and horizontal panes
- **Edit mode** — Tile creation is locked behind edit mode so the layout stays stable while watching
- **Split preview** — Hover over a tile in edit mode to see exactly where it will split
- **Click to split vertically** — Left-click splits the tile at the cursor position
- **Shift + click for horizontal** — Hold Shift while clicking to split horizontally instead
- **Named tile folders** — Each tile gets its own folder; rename tiles in edit mode to organize
- **Hover labels** — Tile name and matching folder name appear when you hover a tile
- **Video playback** — Play videos from each tile's folder with built-in controls

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later

### Install

```bash
npm install
```

### Run in development

```bash
npm run electron:dev
```

### Build for production

```bash
npm run electron:build
```

Installers are written to the `release/` directory.

## Usage

1. Launch the app — you start with a single **Main** tile.
2. Click **Edit Layout** in the toolbar to enter edit mode.
3. Hover over a tile to preview a split line (vertical by default).
4. Hold **Shift** while hovering to preview a horizontal split.
5. **Click** to split at the preview position.
6. Click a tile's name in edit mode to rename it — the folder is renamed to match.
7. Click **Done Editing** when finished.
8. Open a tile's folder (📁 button) and add video files (`mp4`, `webm`, `mkv`, `avi`, `mov`, and more).
9. Hover over any tile to see its name and folder.

### Data location

Tile layouts and folders are stored under your app user data directory:

- **Linux:** `~/.config/video-tiler/tiles-data/`
- **macOS:** `~/Library/Application Support/video-tiler/tiles-data/`
- **Windows:** `%APPDATA%/video-tiler/tiles-data/`

Each tile folder is named `{TileName}__{id}` so names stay unique and traceable.

## Tech Stack

- [Electron](https://www.electronjs.org/) — Desktop shell
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — UI
- [Vite](https://vitejs.dev/) — Build tooling

## License

MIT
