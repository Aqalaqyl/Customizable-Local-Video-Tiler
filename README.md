# Customizable Local Video Tiler

Customizable Local Video Tiler is a local-first video tiling tool for arranging
multiple videos into a single configurable grid. Use it when you want to compare
clips, review camera angles, build reference boards, or present several local
videos at the same time without uploading them to a remote service.

> **Repository status:** this repository currently contains documentation only.
> No runnable source code, installer, sample videos, or release artifact is
> tracked yet. The tutorial below explains the intended setup and workflow for
> the program and calls out the places where a future release should provide the
> exact command or file.

## Table of contents

1. [What the program does](#what-the-program-does)
2. [Before you begin](#before-you-begin)
3. [Step 1: Get the project](#step-1-get-the-project)
4. [Step 2: Install or open the program](#step-2-install-or-open-the-program)
5. [Step 3: Prepare your video files](#step-3-prepare-your-video-files)
6. [Step 4: Create your first tiled workspace](#step-4-create-your-first-tiled-workspace)
7. [Step 5: Customize the layout](#step-5-customize-the-layout)
8. [Step 6: Control playback](#step-6-control-playback)
9. [Step 7: Save and reuse a layout](#step-7-save-and-reuse-a-layout)
10. [Step 8: Export or share your result](#step-8-export-or-share-your-result)
11. [Troubleshooting](#troubleshooting)
12. [Suggested project structure](#suggested-project-structure)

## What the program does

The program is designed around a simple workflow:

1. Select local video files from your computer.
2. Add each video to a tile.
3. Pick a grid layout such as `1x2`, `2x2`, `3x3`, or a custom arrangement.
4. Resize, reorder, mute, loop, or remove individual tiles.
5. Play all videos together, compare them side by side, and optionally save the
   workspace for later.

Because the tool is local-first, videos should stay on your computer. A browser
or desktop implementation can read files locally for preview without requiring a
cloud upload.

## Before you begin

You need:

- A computer running macOS, Windows, or Linux.
- A modern browser or desktop runtime supplied by the eventual release.
- Local video files such as `.mp4`, `.mov`, `.webm`, or `.mkv`.
- Enough memory and CPU/GPU capacity to play several videos at once.
- Optional: FFmpeg, if the implementation adds export, transcoding, thumbnails,
  or metadata analysis.

Recommended video preparation:

- Use videos with the same resolution and frame rate when you want synchronized
  playback.
- Keep file names descriptive, for example `camera-left.mp4`,
  `camera-center.mp4`, and `camera-right.mp4`.
- Store all videos for one project in a single folder.
- Avoid editing original files directly; keep a backup copy if you plan to trim,
  transcode, or export.

## Step 1: Get the project

Clone the repository to your computer:

```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>
```

If you downloaded a ZIP file instead, extract it and open the extracted folder in
your terminal or file manager.

Confirm that the project files are present:

```bash
ls
```

At minimum, you should see this README. In a complete release, you should also
see the application source, a packaged app, or launch instructions.

## Step 2: Install or open the program

Use the launch method that matches the release you have.

### Option A: Packaged desktop app

1. Download the release for your operating system.
2. Install or extract the app.
3. Start **Customizable Local Video Tiler** from your applications folder,
   start menu, or extracted directory.
4. If your operating system warns that the app came from the internet, confirm
   that you downloaded it from the official project release page before opening
   it.

### Option B: Browser-based local app

1. Open the project folder.
2. Locate the app entry file, usually named `index.html`.
3. Open that file in a modern browser.
4. If the browser blocks local file access, run the app through a local
   development server instead of opening the file directly.

Example local server command:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Option C: Source-code development build

If the project later includes a package manifest such as `package.json`,
`pyproject.toml`, `Cargo.toml`, or `go.mod`, follow the commands in that release.
A typical development flow looks like this:

```bash
# Install dependencies.
<package-manager> install

# Start the local app.
<package-manager> run dev
```

Keep the terminal running while you use the app, then open the local URL printed
by the command.

## Step 3: Prepare your video files

1. Create a folder for your tiling session, for example:

   ```text
   video-tiler-demo/
   ```

2. Copy the videos you want to compare into that folder.
3. Rename the files so their order is clear:

   ```text
   01-wide-shot.mp4
   02-close-up.mp4
   03-overhead.mp4
   04-reference.mp4
   ```

4. Play each video once in your normal media player to confirm the files work.
5. If one file is much larger or higher resolution than the others, consider
   making a lower-resolution copy for smoother tiled playback.

## Step 4: Create your first tiled workspace

1. Open Customizable Local Video Tiler.
2. Choose **New Workspace** or the equivalent start action.
3. Select **Add Videos**, **Open Folder**, or drag videos into the app.
4. Select the prepared video files.
5. Confirm the import.
6. Choose a starting layout:
   - Use `1x2` for two videos.
   - Use `2x2` for three or four videos.
   - Use `3x3` for five to nine videos.
   - Use a custom layout when tile sizes should differ.
7. Verify that every selected video appears in a tile.
8. Press **Play All** to confirm that the tiled workspace plays.

If a tile is empty, remove it or assign a video to it before continuing.

## Step 5: Customize the layout

After the videos appear, adjust the workspace.

### Reorder tiles

1. Drag a tile to a new position.
2. Drop it where you want it in the grid.
3. Repeat until the visual order matches your comparison workflow.

Suggested ordering:

- Put the main reference video in the top-left tile.
- Place alternate angles from left to right.
- Put supporting or secondary clips in the bottom row.

### Resize tiles

1. Select a tile.
2. Use the resize handle or layout settings.
3. Increase the size of the most important video.
4. Decrease supporting videos to make room.
5. Check that labels, controls, and captions still remain readable.

### Adjust fit mode

Use the tile fit setting that matches your goal:

- **Contain:** shows the whole video, possibly with letterboxing.
- **Cover:** fills the tile, possibly cropping edges.
- **Stretch:** fills the tile by changing the aspect ratio.

Use **Contain** for technical comparison and **Cover** for presentation layouts.

### Rename tiles

1. Select a tile label.
2. Replace the default file name with a readable name such as `Left Camera`,
   `Screen Capture`, or `Reference`.
3. Keep labels short so they do not cover too much of the video.

### Mute or solo audio

When several videos include audio:

1. Mute every tile except the primary clip.
2. Use **Solo** when you need to hear one clip temporarily.
3. Return to the main audio source before presenting or recording.

## Step 6: Control playback

Use synchronized controls when comparing videos:

1. Press **Play All** to start every tile.
2. Press **Pause All** to stop every tile.
3. Use the shared timeline to seek to a specific moment.
4. Enable **Loop** if you want the workspace to repeat.
5. Use per-tile controls only when one video needs an offset or separate review.

Tips for smoother playback:

- Close other high-CPU apps.
- Use lower-resolution proxy files for large grids.
- Keep browser tabs or desktop windows to a minimum.
- Prefer files encoded with common codecs such as H.264 for broad compatibility.

## Step 7: Save and reuse a layout

If the implementation supports saved workspaces:

1. Choose **Save Workspace**.
2. Name the workspace after the project or session.
3. Store the workspace file next to the source videos.
4. Reopen it later with **Open Workspace**.

A saved workspace should preserve:

- Video file references.
- Tile order.
- Grid size.
- Tile names.
- Fit mode.
- Mute and loop settings.
- Playback offsets, if supported.

If videos are moved after saving, reopen the workspace and relink any missing
files.

## Step 8: Export or share your result

If the program includes export support:

1. Confirm that FFmpeg or the required encoder is installed.
2. Choose **Export**, **Render**, or **Record Layout**.
3. Pick an output resolution such as `1920x1080` or `3840x2160`.
4. Choose a frame rate that matches the source videos.
5. Select the audio source:
   - Primary tile audio.
   - Mixed audio.
   - Muted output.
6. Start the export.
7. Review the exported file from beginning to end.

If export is not available, use your operating system's screen recorder as a
temporary workaround while the tiled workspace is playing.

## Troubleshooting

### The app does not start

- Confirm that you are using a complete release, not a documentation-only
  checkout.
- Re-run the documented install command.
- Check the terminal for errors.
- Confirm that your browser or desktop runtime is supported.

### Videos do not load

- Confirm that each video opens in a normal media player.
- Try a common format such as `.mp4` encoded with H.264 video and AAC audio.
- Move the videos to a simple path without special characters.
- If using a browser app, use the file picker instead of pasting file paths.

### Playback is choppy

- Reduce the number of simultaneous videos.
- Use smaller proxy files.
- Close other applications.
- Disable effects such as shadows, overlays, or live thumbnails if supported.
- Prefer a `2x2` layout before trying larger grids.

### Audio is noisy or confusing

- Mute all secondary tiles.
- Solo one tile at a time during review.
- Pick one primary audio source before exporting or presenting.

### A saved workspace cannot find videos

- Move the workspace file back next to the original videos.
- Restore the previous folder names.
- Use the relink or replace-file action for each missing tile.

## Suggested project structure

When the runnable program is added, keep the repository easy to navigate:

```text
.
├── README.md              # Setup and usage tutorial
├── docs/                  # Additional guides and screenshots
├── src/                   # Application source code
├── public/                # Static browser assets, if applicable
├── examples/              # Sample workspace files, not large videos
├── tests/                 # Automated tests
└── package files          # package.json, pyproject.toml, Cargo.toml, etc.
```

Avoid committing large video files to the repository. Store sample media in a
release asset, object storage bucket, or separate test-fixtures download.

## Quick-start checklist

Use this checklist once a runnable release exists:

- [ ] Install or open the app.
- [ ] Put local videos in one folder.
- [ ] Add the videos to a new workspace.
- [ ] Choose the best grid size.
- [ ] Rename and reorder tiles.
- [ ] Mute secondary audio.
- [ ] Test synchronized playback.
- [ ] Save the workspace.
- [ ] Export or screen-record the result, if needed.
