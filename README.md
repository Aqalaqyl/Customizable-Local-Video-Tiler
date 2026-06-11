# Customizable Local Video Tiler

A local desktop app (Electron) for viewing and listening to downloaded video files in a
customizable tiling layout.

## Features

- Plays local video files with audio in each tile.
- Tiling window manager style layout with recursive splits.
- **Edit Mode lock** for layout changes:
  - Hovering over a tile shows a split preview.
  - Left click splits vertically.
  - **Shift + Left click** splits horizontally.
- Each tile has a user-editable name.
- A matching folder is created for every tile name under a configurable tile-folder root.
- Hovering a tile shows the folder name, which always matches the tile name.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the desktop app:

   ```bash
   npm start
   ```

## How to use

1. Click **Select Video Library** and choose the directory that contains your downloaded
   videos.
2. Click **Select Tile Folder Root** to choose where tile folders should be created.
3. Toggle **Enter Edit Mode** to unlock layout editing.
4. Hover over a tile to see the split preview:
   - Click to split vertically.
   - Hold **Shift** while clicking to split horizontally.
5. Rename tiles in the tile name field. A folder with the same name is created/renamed
   in the tile-folder root.
6. Hover over any tile to see the tile/folder name.
