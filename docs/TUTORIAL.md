# Local Video Tiler — Step-by-Step Tutorial

This guide walks you through installing **Local Video Tiler**, setting it up on your
machine, and using every major feature. No prior experience with Electron or tiling
window managers is required.

---

## Table of contents

1. [What is Local Video Tiler?](#1-what-is-local-video-tiler)
2. [What you need before you start](#2-what-you-need-before-you-start)
3. [Download and install](#3-download-and-install)
4. [First launch](#4-first-launch)
5. [Choose your library folder](#5-choose-your-library-folder)
6. [Build a custom layout](#6-build-a-custom-layout)
7. [Name tiles and organize folders](#7-name-tiles-and-organize-folders)
8. [Add videos and audio](#8-add-videos-and-audio)
9. [Play and manage media](#9-play-and-manage-media)
10. [Focus mode — minimalist auto-hiding interface](#10-focus-mode--minimalist-auto-hiding-interface)
11. [Fullscreen mode](#11-fullscreen-mode)
12. [Multi-display mode (up to 4 monitors)](#12-multi-display-mode-up-to-4-monitors)
13. [Saved layouts — create, import, and export](#13-saved-layouts--create-import-and-export)
14. [Keyboard shortcuts and tips](#14-keyboard-shortcuts-and-tips)
15. [Where your data is stored](#15-where-your-data-is-stored)
16. [Example workflow: four-tile monitoring setup](#16-example-workflow-four-tile-monitoring-setup)
17. [Troubleshooting](#17-troubleshooting)
18. [For developers: tests and screenshots](#18-for-developers-tests-and-screenshots)

---

## 1. What is Local Video Tiler?

Local Video Tiler is a **desktop application** that lets you watch and listen to your
own downloaded video and audio files in a layout you design yourself — similar to a
**tiling window manager** on Linux, but purpose-built for local media.

Key ideas:

- The window is divided into **tiles** (panes).
- Each tile is backed by a **real folder on your computer**.
- You can **split**, **resize**, and **remove** tiles to create any layout.
- Every tile has its own **video player** and **playlist**.
- Multiple tiles can play at the same time.

Everything runs locally. The app does not upload your files or connect to the internet.

---

## 2. What you need before you start

| Requirement | Details |
| ----------- | ------- |
| **Operating system** | Windows, macOS, or Linux |
| **Node.js** | Version **18 or newer** (version 22 is tested) — [download from nodejs.org](https://nodejs.org/) |
| **Disk space** | Enough room for your video library plus ~200 MB for dependencies |
| **Media files** | Any common video/audio format your system can decode (`.mp4`, `.mkv`, `.webm`, `.mov`, `.mp3`, `.m4a`, `.flac`, etc.) |

To confirm Node.js is installed, open a terminal and run:

```bash
node --version
```

You should see something like `v22.x.x` or `v18.x.x`.

---

## 3. Download and install

### Step 3.1 — Get the source code

Clone the repository (or download and extract the ZIP):

```bash
git clone https://github.com/Aqalaqyl/Customizable-Local-Video-Tiler.git
cd Customizable-Local-Video-Tiler
```

### Step 3.2 — Install dependencies

From the project folder, run:

```bash
npm install
```

This downloads Electron and other packages into `node_modules/`. It usually takes
less than a minute on a typical connection.

### Step 3.3 — Start the app

```bash
npm start
```

The **Local Video Tiler** window opens with a single dark tile labeled **Library**.

#### Linux sandbox note

On some Linux setups (including certain containers or CI environments), Electron may
refuse to start unless you disable its sandbox:

```bash
npm start -- --no-sandbox
```

Or, for a fully headless test run:

```bash
xvfb-run -a npm start -- --no-sandbox
```

---

## 4. First launch

When the app opens for the first time, you will see:

```
┌─────────────────────────────────────────────────────────────┐
│ ▦ Local Video Tiler          [📁 Library…]  [✎ Edit Layout] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     🎬                                      │
│              No videos in this tile yet                       │
│                 [＋ Add videos]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

What happens automatically on first launch:

1. A **library root folder** is created (by default `Documents/LocalVideoTiler` on
   most systems).
2. A subfolder for your first tile is created inside that library.
3. An empty layout with **one tile** is shown.

You are ready to add media or customize the layout.

---

## 5. Choose your library folder

The **library** is the root directory where every tile's folder lives. Each tile
gets its own subfolder inside the library.

### Step 5.1 — Open the library picker

Click **📁 Library…** in the top-right corner of the toolbar.

### Step 5.2 — Select or create a folder

A system folder dialog appears. Pick an existing folder or create a new one, for
example:

- `~/Videos/TilerLibrary`
- `D:\Media\Tiler`
- `/home/you/media/tiler`

Click **Open** (or the equivalent on your OS).

### Step 5.3 — Understand what changes

When you change the library:

- Every tile is **re-bound** to a fresh subfolder under the new root.
- Tile **names** are preserved, but the on-disk paths change.
- Your **layout** (splits and sizes) is kept.

The short path shown on the library button (e.g. `Videos/TilerLibrary`) is the last
two segments of the full path. Hover the button to see the complete path.

---

## 6. Build a custom layout

Layout editing is intentionally locked behind **Edit Layout** mode so you do not
accidentally split a pane while clicking on videos.

### Step 6.1 — Enter Edit Layout mode

Click **✎ Edit Layout** in the toolbar, or press **`Ctrl+E`** (Windows/Linux) /
**`Cmd+E`** (macOS).

The button changes to **✓ Done**, and a hint bar appears:

> **Click** to split vertically • **Shift + Click** to split horizontally •
> Drag dividers to resize • **×** to remove a tile

### Step 6.2 — Split a tile vertically (left / right)

1. Move your mouse over the tile you want to split.
2. A **glowing preview line** follows your cursor. The shaded region shows where the
   **new** tile will appear (on the right).
3. **Left-click** at the position where you want the divider.

The tile is now two side-by-side panes. The original tile keeps its folder on the
**left**; a new empty tile appears on the **right**.

### Step 6.3 — Split a tile horizontally (top / bottom)

1. Hold **`Shift`**.
2. Move the mouse over a tile — the preview switches to a horizontal line. The
   shaded region is the **bottom** half (the new tile).
3. **Shift + Left-click** where you want the horizontal divider.

### Step 6.4 — Resize panes with dividers

While still in Edit Layout mode:

1. Move the cursor over the thin **divider** between two panes.
2. **Click and drag** left/right (vertical dividers) or up/down (horizontal dividers).
3. Release the mouse to set the new size.

Sizes are saved automatically.

### Step 6.5 — Remove a tile

1. Hover the tile you want to remove.
2. Click the red **✕** button in the tile's top-right control strip.
3. The remaining sibling pane **expands** to fill the space.

> **Important:** Removing a tile does **not** delete its folder on disk. Your files
> stay safe unless you delete the folder yourself in your file manager.

> You cannot remove the **last** remaining tile — the app always keeps at least one.

### Step 6.6 — Exit Edit Layout mode

Click **✓ Done** (or press **`Ctrl/Cmd + E`** again).

Split overlays and remove buttons are hidden. You can now interact with players and
playlists normally.

### Layout mental model

Internally, the layout is a **binary tree**:

- A **split** node divides space either vertically (columns) or horizontally (rows).
- A **leaf** node is a tile tied to one folder.

You can subdivide any leaf as many times as you like, creating complex grids from
simple repeated splits.

---

## 7. Name tiles and organize folders

Each tile name **matches** the folder on disk. Renaming a tile renames its folder.

### Step 7.1 — See the current name

Hover over any tile. A badge in the corner shows **📁** plus the tile name (e.g.
`Lectures`).

### Step 7.2 — Rename a tile

1. Hover the tile to reveal the control buttons (top-right).
2. Click **✎** (Rename tile & folder).
3. Type the new name in the inline text field.
4. Press **Enter** or click outside the field to save. Press **Escape** to cancel.

The folder on disk is renamed to match. If a folder with that name already exists,
the app appends a number (e.g. `Movies (2)`).

### Step 7.3 — Open a tile's folder in your file manager

Click **⮳** (Open folder) on the tile controls. Your system's file explorer opens
directly to that tile's directory — useful for drag-and-drop from other apps.

### Suggested naming scheme

| Tile name | Good for |
| --------- | -------- |
| `Lectures` | Course videos |
| `Music` | Concert recordings, music videos |
| `Podcasts` | Audio episodes |
| `Highlights` | Short clips, sports moments |
| `Inbox` | New downloads to sort later |

Because folders are real directories, you can also rename or move them outside the
app (when the app is closed) and then point tiles at the results on next launch.

---

## 8. Add videos and audio

There are two ways to populate a tile: through the app, or directly on disk.

### Method A — Add through the app (recommended for beginners)

1. Hover the target tile.
2. Click **＋** (Add videos) in the tile controls, **or** click **＋ Add videos**
   in the empty-state message.
3. In the file picker, select one or more media files (multi-select is supported).
4. Click **Open**.

Files are **copied** into the tile's folder. A toast message confirms how many files
were added (e.g. `Added 3 files`).

### Method B — Add through your file manager

1. Click **⮳** to open the tile's folder.
2. Copy or move video/audio files into that folder with Finder, Explorer, or your
   file manager of choice.
3. Return to the app. Restart the tile's playlist by toggling **☰** or restart the
   app to refresh the file list.

### Supported formats

The app uses Chromium's media engine. Common formats include:

| Video | Audio |
| ----- | ----- |
| `.mp4`, `.m4v`, `.webm`, `.mkv`, `.mov`, `.ogv`, `.avi`, `.wmv`, `.mpeg`, `.ts` | `.mp3`, `.m4a`, `.flac`, `.wav`, `.aac`, `.opus`, `.ogg` |

If a file does not appear in the playlist, check that the extension is recognized and
that the codec is supported by your OS.

---

## 9. Play and manage media

### Step 9.1 — Open the playlist

Click **☰** on a tile to show or hide its playlist panel. When a tile has media,
the playlist opens automatically.

### Step 9.2 — Play a file

Click any item in the playlist. The video (or audio) loads in that tile's player.
The active item is highlighted.

### Step 9.3 — Use the built-in player controls

Each tile has standard HTML5 controls (visible when you move the mouse over the
tile):

- Play / pause
- Seek bar
- Volume

> **Tip:** When you stop using the mouse and keyboard, the controls fade away
> automatically so only the video picture remains. See
> [section 10](#10-focus-mode--minimalist-auto-hiding-interface).

### Step 9.4 — Play multiple tiles at once

Click play on different tiles independently. This is useful for:

- Monitoring several camera angles or streams you have downloaded
- Keeping audio in one pane while watching video in another
- Comparing edits or versions side by side

> Playing many HD videos simultaneously can be demanding. If playback stutters, reduce
> the number of active players or use smaller files.

### Step 9.5 — Resume where you left off

The app remembers which file was selected in each tile. The next time you open the
app, that selection is restored (playback does not auto-start until you press play).

---

## 10. Focus mode — minimalist auto-hiding interface

Local Video Tiler is designed so you can **focus on your videos** without menus,
borders, or buttons getting in the way. This is called **focus mode** and it works
automatically.

### How it works

1. When you **move the mouse** or **press a key**, the interface appears:
   - The top toolbar (Library, Fullscreen, Edit Layout)
   - Tile control buttons (rename, add, playlist, etc.)
   - Tile name badges
   - Playlists (if you have them open)
   - Video player controls (play, seek, volume)

2. After **2.5 seconds** of no mouse or keyboard activity, the interface **fades
   away**:
   - The toolbar slides off the top of the screen
   - Tile borders become invisible
   - Dividers between panes shrink to hairline gaps
   - Only your videos remain on a black background

3. A small hint at the bottom of the screen reminds you:
   *"Move mouse or press a key to show controls"*

### When focus mode is paused

The interface **stays visible** while you are:

- In **Edit Layout** mode (splitting or resizing tiles)
- **Renaming** a tile
- **Dragging** a divider to resize panes

### Tips for a clean viewing experience

| Goal | What to do |
| ---- | ---------- |
| **Cinema-style wall** | Enter fullscreen ([section 11](#11-fullscreen-mode)), load your videos, then let the UI auto-hide |
| **Hide playlists** | Click **☰** on a tile to toggle its playlist off before going idle |
| **Wake controls quickly** | Wiggle the mouse or press any key — the toolbar and tile controls return instantly |
| **Compare clips** | Hover a tile to reveal its controls, then click items in the playlist |

### Playlists are hidden by default

When you add videos to a tile, the playlist does **not** open automatically. This
keeps the screen uncluttered. Click **☰** on a tile whenever you want to browse
or switch files.

---

## 11. Fullscreen mode

Fullscreen removes the operating-system window frame and uses your entire display
for the video grid.

### Step 11.1 — Enter fullscreen

Choose any of these methods:

1. Click **⛶ Fullscreen** in the top toolbar.
2. Press **`F11`** on your keyboard.

The window expands to fill the monitor. Focus mode still works in fullscreen — move
your mouse to reveal the toolbar, then let it hide again when you are done.

### Step 11.2 — Exit fullscreen

1. Click **⛶ Exit Fullscreen** in the toolbar (move the mouse to reveal it), **or**
2. Press **`F11`** again.

You return to the normal windowed view. Your layout and playback positions are
unchanged.

### Recommended fullscreen workflow

```
1. npm start
2. Build your layout and add videos (see sections 6–8)
3. Press F11 (or click Fullscreen)
4. Click play on the videos you want
5. Stop touching the mouse — the UI disappears
6. Enjoy an edge-to-edge video wall
7. Move the mouse when you need controls; press F11 to exit
```

---

## 12. Multi-display mode (up to 4 monitors)

Use multi-display mode when you want **each physical monitor to run its own
independent tile layout** — for example one screen for sports, another for news,
and a third for security cameras.

The main window is your **control panel**. External displays do **not** mirror or
slice the main window; each gets its own saved layout profile.

### Step 12.1 — Connect your displays

Plug in the monitors you want to use (up to **four**). Your operating system
should detect them before you start the app. You can hot-plug displays while the
app is running; click **🖥 Displays** again to refresh the list.

### Step 12.2 — Open the display picker

Click **🖥 Displays** in the top toolbar. For each monitor you will see:

- A **checkbox** to include it in the presentation
- A **layout dropdown** (when checked) to pick which saved layout runs on that display
- An **Edit** button to load that display’s layout into the main window for editing

When you enable a display for the first time, the app creates a dedicated layout
profile named after that monitor (e.g. `Built-in Display`). You can rename layouts
in **▤ Layouts**.

### Step 12.3 — Assign layouts

1. Check the displays you want (maximum **four**).
2. Use each display’s **layout dropdown** to choose a different saved profile, or
   keep the auto-created one.
3. Click **Edit** next to a display to design its layout in the main window —
   split tiles, add videos, rename folders, then **Save** in **▤ Layouts** (or let
   auto-save run). Changes sync to that display if it is already presenting.

### Step 12.4 — Start presenting

Click **Present**. The app opens a **borderless fullscreen window** on each
selected monitor, each running **its own layout** at full size.

### Step 12.5 — Edit directly on each display

While presenting, move the mouse on any display to reveal its toolbar, then:

- Click **✎ Edit Layout** (or press **`Ctrl/Cmd + E`**) to split, resize, and
  remove tiles on **that display only**
- Hover tiles for **add videos**, **playlist**, **rename**, and other controls
- Changes save automatically to that display’s layout profile

The UI auto-hides after a few seconds of inactivity so you can keep watching.
Press **`Ctrl/Cmd + E`** anytime to edit that screen’s layout again.

### Step 12.6 — Stop presenting or quit

From any **presenter** window (fullscreen on a monitor):

- Click **Stop** in the toolbar (or press **`Escape`** — exits Edit Layout first if active)
- Click **Quit** to close the entire app (or press **`Ctrl+Q`** / **`Cmd+Q`**)

From the **main** window:

- Click **🖥 Displays** → **Stop**, or press **`Escape`**
- While presenting, a **Quit** button appears in the toolbar (`Ctrl+Q` / `Cmd+Q` works anytime)

### Multi-display vs. single-monitor fullscreen

| Mode | Best for |
| ---- | -------- |
| **F11 fullscreen** | Maximize the main control window on one monitor |
| **Multi-display** | Independent video walls on 2–4 monitors at once |

> **Tip:** You can use **both at once** — press **F11** on the main window while
> presenter windows run on other displays.

### Recommended multi-display workflow

```
1. Click 🖥 Displays → check your monitors
2. Click Edit on each display and build its unique layout
3. Save each layout (▤ Layouts → Save)
4. Click Present
5. Each monitor shows its own tile grid fullscreen
6. Press **Escape** or click **Stop** on any presenter when finished
```

---

## 13. Saved layouts — create, import, and export

A **layout profile** stores your tile splits, sizes, tile names, folder bindings,
and last-selected video per tile. You can maintain several profiles and switch
between them.

### Step 13.1 — Open the layouts manager

Click **▤ Layouts** in the toolbar. The button label shows the **active layout
name**. The dialog lists every saved profile; the active one is highlighted.

### Step 13.2 — Save your current work

After editing a layout, click **Save** in the layouts dialog (or just keep
working — changes auto-save to the active profile after a short delay).

### Step 13.3 — Create a new layout

1. Type a name in **New layout name** (e.g. `Sports wall` or `Podcast grid`).
2. Click **New layout**.

A fresh single-tile layout is created and activated. Build it independently from
your other profiles.

### Step 13.4 — Switch layouts

Click any layout in the list to load it. The app saves your current layout first,
then restores the selected profile.

### Step 13.5 — Export a layout

1. Load the layout you want to share or back up.
2. Open **▤ Layouts** → **Export**.
3. Choose where to save the `.json` file.

Exported files include tile structure and names. Folder paths are omitted so the
file is portable across computers.

### Step 13.6 — Import a layout

1. Open **▤ Layouts** → **Import**.
2. Select a `.json` layout file (exported from this app or compatible format).
3. The imported profile is added and activated. Tile folders are created under
   your current library.

### Rename or delete

Use **✎** or **✕** on each row in the layouts list. You cannot delete the only
remaining profile or delete the layout that is currently active (switch first).

---

## 14. Keyboard shortcuts and tips

| Action | Shortcut |
| ------ | -------- |
| Toggle Edit Layout mode | `Ctrl+E` / `Cmd+E` |
| Toggle fullscreen | `F11` |
| Stop multi-display presentation | `Escape` (presenter or main window) |
| Quit application | `Ctrl+Q` / `Cmd+Q` |
| Horizontal split preview (in Edit mode) | Hold `Shift` while hovering a tile |
| Confirm rename | `Enter` |
| Cancel rename | `Escape` |
| Wake hidden interface | Move mouse or press any key |

**Tips:**

- **Precise splits:** Click exactly where you want the divider — the split ratio
  follows your cursor position, not a fixed 50/50.
- **Shift preview without clicking:** Hold `Shift` over a tile to see how a
  horizontal split would look before committing.
- **Hover for controls:** Tile buttons (rename, add, playlist, open folder, remove)
  appear when you move the mouse over the tile while the interface is active.
- **Remove vs. delete:** Removing a tile is a layout action only; files on disk are
  kept by default.
- **Distraction-free viewing:** Combine fullscreen (`F11`) with focus mode (auto-hide)
  for a true video-wall experience.

---

## 15. Where your data is stored

Local Video Tiler keeps two kinds of data on your machine:

### Library folders (your media)

Default location:

| OS | Typical path |
| -- | ------------ |
| Windows | `C:\Users\<You>\Documents\LocalVideoTiler\` |
| macOS | `/Users/<You>/Documents/LocalVideoTiler/` |
| Linux | `/home/<you>/Documents/LocalVideoTiler/` |

Each tile is a subfolder inside this directory, named after the tile.

### App configuration (settings + active layout id)

Electron stores a `config.json` file in the app's user-data directory:

| OS | Typical path |
| -- | ------------ |
| Windows | `%APPDATA%\local-video-tiler\config.json` |
| macOS | `~/Library/Application Support/local-video-tiler/config.json` |
| Linux | `~/.config/local-video-tiler/config.json` |

This file contains your `libraryPath` and which saved layout is active.

### Saved layout profiles

Individual layout files live in a `layouts/` folder next to `config.json`:

| OS | Typical path |
| -- | ------------ |
| Windows | `%APPDATA%\local-video-tiler\layouts\` |
| macOS | `~/Library/Application Support/local-video-tiler/layouts/` |
| Linux | `~/.config/local-video-tiler/layouts/` |

Each file is a `.json` profile with the layout tree, tile names, folder paths,
and video selections. Use **Export** in the app to copy a profile anywhere, or
back up the whole `layouts/` folder.

---

## 16. Example workflow: four-tile monitoring setup

This walkthrough builds a practical layout for watching four categories of media at
once.

### Goal

```
┌──────────────────┬──────────────────┐
│    Lectures      │  Music Videos    │
│                  ├──────────────────┤
│                  │    Highlights    │
├──────────────────┼──────────────────┤
│    Podcasts      │   (spare)        │
└──────────────────┴──────────────────┘
```

### Steps

1. **Start the app** — `npm start`
2. **Set library** — Click **📁 Library…** and choose `~/Videos/MyTiler`
3. **Enter Edit Layout** — Click **✎ Edit Layout**
4. **First split** — Click near the middle of the tile to split vertically (50/50)
5. **Split the right column** — Shift+click on the right pane at about 55% height to
   create top (Music Videos) and bottom (Highlights) sections
6. **Split the left column** — Shift+click on the left pane at about 50% height
7. **Remove the spare tile** (bottom-right) if you only want four panes — click **✕**
   on that tile
8. **Exit Edit Layout** — Click **✓ Done**
9. **Rename tiles** — Use **✎** on each tile: `Lectures`, `Music Videos`,
   `Highlights`, `Podcasts`
10. **Add media** — Use **＋** on each tile to copy in your files
11. **Watch** — Click playlist items in each pane; play several at once if needed

Your layout and folder names are saved automatically for the next session.

---

## 17. Troubleshooting

### The app window does not open

- Confirm Node.js 18+: `node --version`
- Re-run `npm install` in the project folder
- On Linux, try: `npm start -- --no-sandbox`

### "No videos in this tile yet" after adding files

- Check that files are in the **correct tile folder** (click **⮳** to verify)
- Confirm the file extension is supported (see [section 8](#8-add-videos-and-audio))
- Toggle the playlist with **☰** or restart the app to refresh the listing

### Video plays but has no picture / no sound

- The codec may not be supported by Chromium on your system. Try converting the file
  to H.264/AAC in `.mp4` with a tool like [FFmpeg](https://ffmpeg.org/).
- On Linux, install proprietary codec packages if your distribution provides them.

### Rename created `Name (2)` instead of `Name`

Another folder with that name already exists in your library. Delete or rename the
existing folder, then rename the tile again.

### Layout reset or duplicate folders after testing

If you run the automated test suite, it creates real folders and config files. Clean
up before manual use:

```bash
rm -rf ~/LocalVideoTiler ~/.config/local-video-tiler ~/.config/Electron
```

(Adjust paths for your OS.)

### High CPU usage

Each playing tile decodes video independently. Pause players you are not watching, or
use fewer simultaneous tiles.

---

### Controls disappeared and I cannot find the toolbar

This is focus mode working as intended. **Move your mouse** or **press any key**
(e.g. `F11` or `Ctrl/Cmd+E`) to bring the interface back. The toolbar slides down
from the top.

### Fullscreen does not cover my whole screen

- On macOS, the app may share the screen with the menu bar depending on your
  display settings. Press `F11` again to toggle, or use the green window button
  if your OS provides native fullscreen.
- On Linux with multiple monitors, fullscreen applies to the monitor where the
  window is currently located. Drag the window to the desired display first.

---

### Multi-display windows do not appear on the right monitors

- Confirm each monitor is enabled in your OS display settings.
- Open **🖥 Displays** and verify the correct monitors are checked.
- Drag the main window to the primary display before clicking **Present** if
  windows open on the wrong screen.

### Each display shows the wrong layout

Open **🖥 Displays**, verify the **layout dropdown** for each monitor, and click
**Present** again. Layout assignments are remembered per display.

---

## 18. For developers: tests and screenshots

### Run automated tests

```bash
npm test
```

On Linux without a display:

```bash
xvfb-run -a npm test
```

Tests drive a real Electron window and verify tiling logic, folder syncing, and
playlist behavior through the `window.__lvt` debug API.

### Capture a README screenshot

```bash
xvfb-run -a ./node_modules/.bin/electron scripts/screenshot.js --no-sandbox
```

This writes `docs/screenshot.png` with a sample four-tile layout.

### Project structure

| File | Purpose |
| ---- | ------- |
| `src/main/main.js` | Electron main process, filesystem, IPC |
| `src/main/preload.js` | Secure bridge (`window.api`) |
| `src/renderer/renderer.js` | UI, players, edit mode |
| `src/renderer/tree.js` | Tiling binary-tree model |
| `src/renderer/index.html` | App shell |
| `src/renderer/styles.css` | Visual styling |

### Development mode (verbose logging)

```bash
npm run dev
```

---

## Quick reference card

```
INSTALL     npm install && npm start
LIBRARY     📁 Library…  →  pick root folder for all tile directories
FULLSCREEN  ⛶ Fullscreen  (F11) — works with multi-display
MULTI-DISPLAY 🖥 Displays → assign a layout per monitor → Present (Escape to stop)
LAYOUTS     ▤ Layouts → create / switch / import / export profiles
FOCUS MODE  Auto-hides UI after 2.5s idle — move mouse to wake
EDIT        ✎ Edit Layout  (Ctrl/Cmd+E)
SPLIT       Click = vertical (left|right)   Shift+Click = horizontal (top|bottom)
RESIZE      Drag dividers (in Edit mode)
RENAME      ✎ on tile  →  renames folder too
ADD MEDIA    on tile  →  copy files into tile folder
PLAYLIST    ☰ on tile  →  show/hide file list
OPEN FOLDER ⮳ on tile  →  open in OS file manager
REMOVE TILE ✕ on tile  (Edit mode; keeps files on disk)
```

---

You now have everything you need to install Local Video Tiler, organize your media
into folder-backed tiles, design custom layouts, and watch multiple videos from one
screen. For a shorter overview, see the [README](../README.md).
