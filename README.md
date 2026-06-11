# Customizable Local Video Tiler

A local Electron desktop app for organizing downloaded video files into a customizable tiling layout.

## Features

- Plays local video files with native browser video controls.
- Organizes each tile as a real folder inside a chosen workspace directory.
- Keeps the displayed tile name matched to its corresponding folder name.
- Shows the folder/tile name when hovering over a tile.
- Provides an edit mode for layout changes:
  - Hover a tile to preview how it will split.
  - Left click a tile to create a vertical left/right split.
  - Hold `Shift` and left click to create a horizontal top/bottom split.
  - Drag split dividers to resize panes.
- Imports selected downloaded videos by copying them into the active tile folder.
- Opens tile folders in the OS file manager for manual organization.

## Run locally

```bash
npm install
npm start
```

## Development checks

```bash
npm run check
```

## How tile folders work

On first launch, the app creates a workspace under your system Videos folder. Each tile in the layout has one matching folder in that workspace. Rename a tile while edit mode is enabled to rename the folder too. If a folder name is already taken, the app appends a number so every tile stays mapped to a unique folder.
