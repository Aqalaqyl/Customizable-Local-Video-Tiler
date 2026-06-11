# Video Tiler

A desktop application for watching multiple local video files simultaneously in a fully customizable tiling layout — like a tiling window manager, but for video.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Running the App](#4-running-the-app)
5. [First Launch](#5-first-launch)
6. [Core Concepts](#6-core-concepts)
7. [Step-by-Step Usage Guide](#7-step-by-step-usage-guide)
   - [Step 1 — Add Videos to a Tile](#step-1--add-videos-to-a-tile)
   - [Step 2 — Play a Video](#step-2--play-a-video)
   - [Step 3 — Change the Base Folder](#step-3--change-the-base-folder)
   - [Step 4 — Enter Edit Mode](#step-4--enter-edit-mode)
   - [Step 5 — Split a Tile Vertically](#step-5--split-a-tile-vertically)
   - [Step 6 — Split a Tile Horizontally](#step-6--split-a-tile-horizontally)
   - [Step 7 — Resize a Pane](#step-7--resize-a-pane)
   - [Step 8 — Rename a Tile](#step-8--rename-a-tile)
   - [Step 9 — Remove a Tile](#step-9--remove-a-tile)
   - [Step 10 — Exit Edit Mode](#step-10--exit-edit-mode)
   - [Step 11 — Use the Auto-Playlist](#step-11--use-the-auto-playlist)
8. [Keyboard Shortcuts & Mouse Reference](#8-keyboard-shortcuts--mouse-reference)
9. [Supported Video Formats](#9-supported-video-formats)
10. [Persistent Layout](#10-persistent-layout)
11. [Building for Production](#11-building-for-production)
12. [Project Structure](#12-project-structure)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

**Video Tiler** lets you split your screen into any number of independently-controlled video panes. Each pane (called a *tile*) is linked to a folder on disk: every video file inside that folder is available to play inside the tile. You can split, resize, and rearrange tiles freely without touching your file system, and the entire layout is automatically saved between sessions.

**Key features at a glance:**

| Feature | Description |
|---|---|
| Tiling layout | Split the screen into as many panes as you need |
| Edit mode | Layout editing is locked behind a toggle — no accidental resizes |
| Visual split preview | See the exact split position as a blue line before you click |
| Folder-backed tiles | Each tile watches a real folder; drop videos in and they appear automatically |
| Drag-to-resize | Drag the handle between any two panes to adjust proportions |
| Persistent layout | Your entire tile arrangement is saved and restored between sessions |
| Auto-playlist | Videos play one after another automatically |

---

## 2. Prerequisites

Before you start, make sure the following are installed on your system:

| Requirement | Version | How to check |
|---|---|---|
| **Node.js** | 18 or newer | `node --version` |
| **npm** | 9 or newer | `npm --version` |

Download Node.js (which includes npm) from [nodejs.org](https://nodejs.org/). The LTS release is recommended.

> **Note for Linux users:** Some distributions require additional system libraries for Electron to launch. If you encounter a missing library error, install `libglib2.0-0`, `libnss3`, `libatk1.0-0`, `libatk-bridge2.0-0`, `libgdk-pixbuf2.0-0`, `libgtk-3-0`, and `libgbm1` through your package manager (e.g. `sudo apt install` on Debian/Ubuntu).

---

## 3. Installation

### 3.1 Clone the repository

```bash
git clone https://github.com/Aqalaqyl/Customizable-Local-Video-Tiler.git
cd Customizable-Local-Video-Tiler
```

### 3.2 Install dependencies

Inside the project directory, run:

```bash
npm install
```

This downloads all required packages (Electron, React, TypeScript, electron-vite, and their type definitions) into a local `node_modules` folder. This step typically takes 30–60 seconds on the first run.

You should see output ending with something like:

```
added 423 packages in 45s
```

No global package installs are required.

---

## 4. Running the App

### Development mode (recommended for first use)

```bash
npm run dev
```

This compiles the TypeScript source and launches the Electron window with hot-reload enabled. Any change you save to the source files will be reflected in the running app automatically.

### Production build

```bash
npm run build     # compile everything into the out/ directory
npm start         # launch the compiled build (no hot-reload)
```

Use the production build when you want the fastest startup time and do not plan to change source files.

> **What you should see:** An Electron window (1400 × 900 px, dark background) titled **Video Tiler** appears after a brief loading spinner.

---

## 5. First Launch

When the app opens for the first time you will see:

1. **A loading spinner** with the text *"Loading Video Tiler…"* while the app initialises its state and ensures the default folder structure exists on disk.
2. **A single full-screen tile** labelled **My Videos**, which occupies the entire window.
3. **A header bar** at the top with:
   - The **Video Tiler** logo and title on the left
   - A **Folder** button and an **Edit Layout** button on the right

The tile is backed by the folder `~/Videos/VideoTiler/My Videos/` on your machine (this directory is created automatically). You can change this root location at any time (see [Step 3](#step-3--change-the-base-folder)).

---

## 6. Core Concepts

Understanding two concepts will make everything else click:

### The tile tree

The layout is stored as a binary tree. Each node in the tree is either:

- A **leaf** — a visible tile that plays video from a linked folder.
- A **split** — an invisible container that divides space between two child nodes (either horizontally or vertically) at a given ratio.

Splitting a leaf replaces it with a split node that contains the original leaf and a new leaf. Removing a leaf collapses the parent split, and the sibling tile expands to fill the space.

### The base folder

All tile folders live inside a single **base folder** (default: `~/Videos/VideoTiler/`). Each tile's name matches the name of a subfolder inside the base folder. For example, a tile named *My Videos* reads videos from `<base>/My Videos/`.

Renaming a tile inside the app also renames the corresponding subfolder on disk.

---

## 7. Step-by-Step Usage Guide

### Step 1 — Add Videos to a Tile

Tiles do not record or download video — they read from a folder on your computer. To get video into a tile:

1. Identify the tile's folder. The default tile uses `~/Videos/VideoTiler/My Videos/`. You can open the folder directly from the app:
   - Click **Folder** in the header to display the current base path.
   - In the empty tile, click the **Open Folder** button to open the tile's directory in your file manager.
2. Copy, move, or download video files into that folder.
3. The tile scans its folder automatically every **5 seconds**. You can also force a refresh:
   - Click the **list icon** (three horizontal lines) in the video controls bar to open the file list panel.
   - Click the **refresh icon** (circular arrow) in the file list panel header.

The tile will pick up newly added files without any restart.

---

### Step 2 — Play a Video

Once a tile has video files:

1. If no video is currently playing, the tile shows an empty state with a **Browse N files** button. Click it to open the **File List** panel.
2. In the file list panel, click on any file name to start playback.
3. The panel closes and the selected video starts playing with the native HTML5 player controls (play/pause, seek bar, volume, full-screen).
4. To switch videos while one is already playing, click the **list icon** in the controls bar to reopen the file list, then click a different file.

> **Tip:** While the file list is open, clicking outside the panel (on the dimmed overlay) closes it without changing the current video.

---

### Step 3 — Change the Base Folder

By default all tile folders are stored under `~/Videos/VideoTiler/`. To point the app at a different location:

1. Click the **Folder** button in the top-right header. A bar appears showing the current base path.
2. Click **Change…** inside that bar.
3. A system folder picker opens. Navigate to and select the new folder, then click **Open** (or the equivalent button in your OS).
4. The app immediately switches to the new base. All existing tile subfolder names are recreated inside the new base folder if they do not already exist.
5. Click the **✕** button next to the path bar to hide it again.

> **Note:** Changing the base folder does **not** move video files from the old location. If you want your existing videos to be available, copy or move the relevant subfolders into the new base manually.

---

### Step 4 — Enter Edit Mode

All layout operations (splitting, renaming, removing tiles) are gated behind **Edit Mode** to prevent accidental changes during normal playback.

1. Click the **Edit Layout** button in the top-right of the header. The button turns active (highlighted) and its label changes to **Done**.
2. A blue badge reading **EDIT MODE — Click tile to split · Shift+Click for horizontal** appears in the center of the header.
3. Video playback in all tiles is paused and replaced by an edit overlay showing the tile name and a split hint.
4. Cursor changes to a resize cursor (`↔` or `↕`) when hovering over a tile to indicate where the split will land.

---

### Step 5 — Split a Tile Vertically

A vertical split divides a tile into a **left** pane and a **right** pane.

1. Enter edit mode (see [Step 4](#step-4--enter-edit-mode)).
2. Move your mouse over the tile you want to split. A **blue vertical line** tracks your cursor, showing exactly where the split will be created.
3. Position the preview line where you want the boundary.
4. **Left-click** (without Shift) to create the split.

The tile is replaced with two new tiles side by side. The left tile keeps the original tile's name and folder; a new tile named **Tile ###** (with a random three-digit number) is created on the right with its own new subfolder inside the base folder.

---

### Step 6 — Split a Tile Horizontally

A horizontal split divides a tile into a **top** pane and a **bottom** pane.

1. Enter edit mode (see [Step 4](#step-4--enter-edit-mode)).
2. Move your mouse over the tile you want to split. By default you will see the vertical preview line.
3. **Hold Shift** — the preview line switches to a **blue horizontal line**, and the hint text updates to *"Click to split horizontally"*.
4. Position the preview line where you want the boundary.
5. **Shift + left-click** to create the horizontal split.

The tile is replaced with two new tiles stacked vertically.

---

### Step 7 — Resize a Pane

You can adjust the proportions of any split at any time — edit mode is **not** required for resizing.

1. Hover over the thin **divider handle** between any two panes. The cursor changes to a resize cursor.
2. Click and drag the handle toward either pane.
3. Release the mouse button when you are happy with the new proportions.

Proportions are clamped between 10% and 90% to ensure neither pane becomes invisible.

---

### Step 8 — Rename a Tile

Renaming a tile also renames the corresponding folder on disk.

**While in edit mode:**

1. In the tile's header bar, find the tile name text.
2. Double-click the name to activate the inline text input.
3. Type the new name and press **Enter** to confirm, or press **Escape** to cancel.

**While NOT in edit mode (hover rename):**

1. Hover over any tile. The tile's name appears in a floating overlay at the bottom of the tile.
2. Double-click the name in the overlay to activate the inline text input.
3. Type the new name and press **Enter** to confirm, or press **Escape** to cancel.

> **Important:** Tile names must be valid folder names on your operating system. Avoid characters like `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, and `|`.

---

### Step 9 — Remove a Tile

Removing a tile collapses its parent split, and the sibling tile expands to fill the space. The tile's folder on disk is **not** deleted.

1. Enter edit mode (see [Step 4](#step-4--enter-edit-mode)).
2. Locate the tile you want to remove. Each tile in edit mode has a **✕** button in its top-right header area.
3. Click **✕** to remove the tile.

> **Note:** The **✕** button is hidden when only one tile remains — you cannot remove the last tile.

---

### Step 10 — Exit Edit Mode

1. Click the **Done** button in the top-right of the header (the same button used to enter edit mode).
2. The blue edit mode badge disappears from the header.
3. All tiles return to normal video playback mode.

The layout is automatically saved at this point (and any time the layout changes), so your arrangement will be restored the next time you open the app.

---

### Step 11 — Use the Auto-Playlist

Each tile automatically plays videos in sequence from its linked folder:

- When a video finishes, the next file in the list starts playing immediately.
- Files are listed in the order returned by the file system (typically alphabetical).
- When the last video in the list ends, playback stops on that tile (no loop).

To control playback within a tile:

| Action | How |
|---|---|
| Play a specific file | Open the file list (list icon in the controls bar) → click the file |
| Pause / resume | Use the native video controls at the bottom of the video |
| Seek | Drag the progress bar in the native video controls |
| Adjust volume | Use the volume control in the native video controls |
| Refresh the file list | Open the file list panel → click the refresh icon |

---

## 8. Keyboard Shortcuts & Mouse Reference

| Action | Input |
|---|---|
| Split tile vertically | Left-click a tile (in edit mode) |
| Split tile horizontally | Shift + left-click a tile (in edit mode) |
| Confirm rename | Enter |
| Cancel rename | Escape |
| Resize pane | Drag the divider handle between two panes |

---

## 9. Supported Video Formats

Video Tiler uses the HTML5 `<video>` element backed by Electron/Chromium. The following file extensions are recognised:

`.mp4` · `.mkv` · `.avi` · `.mov` · `.webm` · `.m4v` · `.wmv` · `.flv` · `.ts` · `.m2ts` · `.ogv`

> **Codec support:** Chromium supports H.264, H.265 (HEVC, on some platforms), VP8, VP9, and AV1 inside the container formats listed above. If a file has an unsupported codec, the browser video element will show an error. In that case, re-encode the file with `ffmpeg` (e.g. `ffmpeg -i input.mkv -c:v libx264 output.mp4`).

---

## 10. Persistent Layout

The app saves its complete state (the full tile tree structure and the base folder path) to a `state.json` file inside Electron's user-data directory:

| OS | Location |
|---|---|
| **macOS** | `~/Library/Application Support/video-tiler/state.json` |
| **Windows** | `%APPDATA%\video-tiler\state.json` |
| **Linux** | `~/.config/video-tiler/state.json` |

State is saved automatically **500 ms** after any change. You do not need to manually save.

To **reset to the default layout**, simply delete `state.json` and restart the app.

---

## 11. Building for Production

To compile the app without the development server:

```bash
npm run build
```

This runs `electron-vite build`, which:

1. Compiles the TypeScript main process (`electron/main/index.ts`) and preload script (`electron/preload/index.ts`) with Rollup.
2. Builds the React renderer (`src/`) with Vite.
3. Outputs everything to the `out/` directory.

After building, launch the compiled output with:

```bash
npm start
```

> **Packaging as an installer:** The build step above produces raw compiled JS but does not create a platform-specific installer (`.dmg`, `.exe`, `.AppImage`). To package the app for distribution, add `electron-builder` or `electron-forge` to your `package.json` and follow their documentation.

---

## 12. Project Structure

```
.
├── electron/
│   ├── main/
│   │   └── index.ts          Main process: window creation, IPC handlers, file system operations
│   └── preload/
│       └── index.ts          Context bridge — safely exposes the Node.js/Electron API to the renderer
├── src/
│   ├── App.tsx               Root React component; owns global state (tree, basePath, editMode)
│   ├── components/
│   │   ├── TileContainer.tsx Recursive renderer for the tile tree; renders split nodes and drag handles
│   │   ├── TileLeaf.tsx      Individual tile component; manages split preview, hover name, rename UI
│   │   └── VideoPlayer.tsx   HTML5 video player with file list overlay and 5-second auto-refresh
│   ├── hooks/
│   │   └── useTileTree.ts    Pure tree operations: split, rename, remove, resize; exposed as a React hook
│   ├── types/
│   │   └── tile.ts           TypeScript type definitions for TileNode, SplitNode, LeafNode, AppState
│   ├── styles/
│   │   └── globals.css       Dark theme CSS for the entire application
│   ├── index.html            HTML entry point for the renderer
│   └── main.tsx              React entry point; mounts <App /> into the DOM
├── electron.vite.config.ts   electron-vite build configuration (main, preload, renderer targets)
├── package.json              npm scripts and dependency list
├── tsconfig.json             Root TypeScript configuration
├── tsconfig.node.json        TypeScript config for the main/preload processes
└── tsconfig.web.json         TypeScript config for the renderer (React)
```

### Data flow summary

```
[Disk: video files]
        │
        ▼  (IPC: fs:listVideos)
[Main process (Node.js)]
        │
        ▼  (Context bridge: window.electronAPI)
[Renderer (React)]
  App.tsx  ──►  TileContainer  ──►  TileLeaf  ──►  VideoPlayer
    │                                               │
    ▼  (IPC: state:save)                            ▼  (file:// URL)
[Disk: state.json]                          [HTML5 <video> element]
```

---

## 13. Troubleshooting

### The app window does not open

- Check that your Node.js version is 18 or newer: `node --version`.
- Re-run `npm install` to ensure all packages are present.
- On Linux, install the missing shared libraries listed in the [Prerequisites](#2-prerequisites) section.

### Videos do not appear in a tile

- Make sure the video files are **directly inside** the tile's subfolder (not in a nested subfolder).
- Check that the file extension is in the [Supported Video Formats](#9-supported-video-formats) list.
- Click the **refresh icon** inside the file list panel to force a re-scan.

### A video plays with no picture or audio

- The file extension may be supported but the codec is not. Try re-encoding with `ffmpeg`:
  ```bash
  ffmpeg -i input.mkv -c:v libx264 -c:a aac output.mp4
  ```

### The app always starts with the default layout instead of my saved layout

- Check that `state.json` exists in the [user-data directory](#10-persistent-layout) and is valid JSON.
- Make sure the app is not running as root, which can cause permission errors when writing the state file.

### Renaming a tile fails or the folder is not renamed

- Verify you have write permission to the base folder directory.
- Make sure the new name does not contain characters that are illegal in folder names on your OS.

### `npm run dev` hangs or crashes immediately

- Delete `node_modules/` and the `out/` directory, then re-run `npm install`.
- If the error mentions a port conflict, another Electron/Vite process may already be running.
  Find its PID with `lsof -i :5173` (default Vite port) and stop it.

### The tile layout was accidentally changed

- Because state is auto-saved, an accidental tile removal cannot be undone with a normal undo shortcut.
- To restore a previous layout, replace the `state.json` file in the [user-data directory](#10-persistent-layout) with a backup copy (if you have one).
- To reset completely, delete `state.json` and restart the app to get the single default tile back.
