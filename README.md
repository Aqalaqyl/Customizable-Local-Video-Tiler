# Video Tiler

A desktop app for viewing and listening to downloaded video files with a fully customizable tiling layout — like a tiling window manager, but for video.

## Features

- **Tiling layout** — Split the screen into as many panes as you need
- **Edit mode** — Layout editing is locked behind a toggle so you never accidentally resize things
- **Visual split preview** — In edit mode, hover over any tile to see exactly where the split will land before you click
  - Left-click → vertical split (left/right)
  - Shift + left-click → horizontal split (top/bottom)
- **Named tiles & folders** — Each tile corresponds to a folder on disk; drop videos into the folder and they appear in the tile automatically
- **Hover name display** — Hovering a tile shows its name so you always know which folder it's connected to
- **Double-click to rename** — Rename tiles from within the app; the folder on disk is renamed to match
- **Drag-to-resize** — Drag the dividers between panes to adjust proportions at any time
- **Persistent layout** — Your tile arrangement is saved and restored between sessions
- **Auto-playlist** — Videos in a tile play one after another automatically

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev        # launch in development mode (hot-reload)
```

### Build for Production

```bash
npm run build      # compiles to out/
npm start          # runs the compiled build
```

## Usage

1. **Launch the app.** A single tile called "My Videos" is created, backed by `~/Videos/VideoTiler/My Videos/`.
2. **Add videos.** Drop `.mp4`, `.mkv`, `.webm`, `.avi`, `.mov` (and more) into the tile's folder. The tile refreshes every 5 seconds automatically, or click the refresh icon inside the file list.
3. **Change the base folder.** Click **Folder** in the header to point the app at a different directory.
4. **Split the layout.** Click **Edit Layout** in the top-right corner to enter edit mode.
   - Hover over any tile — a blue line shows the split preview.
   - **Left-click** to split vertically at that position.
   - **Shift + left-click** to split horizontally.
   - A new tile is created automatically (named "Tile ###"); double-click its name in the header to rename it.
5. **Resize panes.** Drag the thin handle between any two panes.
6. **Remove a tile.** In edit mode, click the **✕** button in a tile's header (not available when only one tile remains).
7. **Exit edit mode.** Click **Done** or press the button again.

## Supported Video Formats

`.mp4` · `.mkv` · `.avi` · `.mov` · `.webm` · `.m4v` · `.wmv` · `.flv` · `.ts` · `.m2ts` · `.ogv`

## Project Structure

```
electron/
  main/index.ts      — Main process: window, IPC, file system
  preload/index.ts   — Context bridge exposing safe API to renderer
src/
  App.tsx            — Root component, global state, edit mode
  components/
    TileContainer.tsx — Recursive split/leaf renderer + drag handles
    TileLeaf.tsx      — Individual tile: video player + edit overlay
    VideoPlayer.tsx   — HTML5 video player with file browser
  hooks/
    useTileTree.ts    — Pure tile tree operations (split, rename, remove, resize)
  types/tile.ts       — TypeScript types for the tile data structure
  styles/globals.css  — Dark theme CSS
```
