# Customizable Local Video Tiler — Step‑by‑Step Tutorial

This tutorial walks you through everything: getting the app, opening it,
loading your videos, customizing the grid, controlling playback, and fixing
common problems. No programming knowledge is required.

> **What is this?** A web page that shows several of your own video files at the
> same time, arranged in a grid (sometimes called a "video wall" or "multiview").
> It is useful for comparing takes side by side, watching multiple camera angles,
> building a contact sheet of clips, or running a looping video wall on a screen.
>
> **Privacy:** All videos are read directly from your computer and played in your
> browser. Nothing is uploaded to any server.

---

## Table of contents

1. [Requirements](#1-requirements)
2. [Get the program](#2-get-the-program)
3. [Open the app](#3-open-the-app)
4. [Add your videos](#4-add-your-videos-step-1-in-the-panel)
5. [Customize the layout](#5-customize-the-layout-step-2-in-the-panel)
6. [Control playback](#6-control-playback-step-3-in-the-panel)
7. [Per‑video controls](#7-pervideo-controls)
8. [Saved settings](#8-saved-settings)
9. [Recipes](#9-recipes)
10. [Supported video formats](#10-supported-video-formats)
11. [Troubleshooting](#11-troubleshooting)
12. [Frequently asked questions](#12-frequently-asked-questions)

---

## 1. Requirements

- A modern web browser (Chrome, Edge, Firefox, or Safari — recent versions).
- Some local video files (`.mp4`, `.webm`, or `.ogg`/`.ogv` work best).
- **Optional:** Python 3 (only if you want to serve the app over `http://`,
  which is recommended — see [Step 3](#3-open-the-app)).

There is **nothing to install and no build step**. The app is plain
HTML/CSS/JavaScript.

---

## 2. Get the program

### Option A — Clone with git

```bash
git clone https://github.com/<your-account>/Customizable-Local-Video-Tiler.git
cd Customizable-Local-Video-Tiler
```

### Option B — Download the ZIP

1. On the GitHub page click the green **Code** button → **Download ZIP**.
2. Unzip it anywhere on your computer.
3. Open the unzipped folder.

After this you should have a folder containing at least these files:

```
Customizable-Local-Video-Tiler/
├── index.html
├── styles.css
├── app.js
├── README.md
└── TUTORIAL.md
```

---

## 3. Open the app

You have two ways to run it. **Serving over HTTP (Option 2) is recommended**
because some browsers restrict features for pages opened directly from disk.

### Option 1 — Just open the file (quickest)

Double‑click `index.html`, or drag it into a browser window. That's it.

### Option 2 — Serve it locally (recommended)

From inside the project folder, run a tiny local web server:

```bash
# Python 3 (built in on macOS/Linux, easy to install on Windows)
python3 -m http.server 8000
```

Then open your browser at:

```
http://localhost:8000
```

> Any static file server works. If you have Node.js installed you can instead
> run `npx serve` and open the URL it prints.

When the page loads you'll see a control panel on the left and an empty grid on
the right that says **"Your grid is empty."**

---

## 4. Add your videos (Step 1 in the panel)

You can add videos in two ways:

1. **File picker:** Click **"Choose video files"** in the panel, then select one
   or more video files. Hold <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> or
   <kbd>Shift</kbd> to select multiple files at once.
2. **Drag & drop:** Drag video files from your file explorer and drop them
   anywhere on the grid area. The grid highlights with a dashed border while
   you're dragging.

Each video appears as a tile in the grid. The panel shows a running count
(e.g. *"3 videos loaded"*).

- To remove **one** video, hover over its tile and click the **✕** button in
  the top‑right corner.
- To remove **all** videos, click **"Remove all videos"**.

> You can keep adding more videos at any time; new tiles are appended to the grid.

---

## 5. Customize the layout (Step 2 in the panel)

This is where the "customizable" part lives. Each control updates the grid
instantly.

| Control            | What it does                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Columns**        | Number of columns in the grid. Choose a fixed number (1–6) or **Auto** to pick a near‑square layout based on how many videos you've loaded. |
| **Gap**            | Spacing (in pixels) between tiles. Drag the slider from 0 (tiles touching) up to 40. |
| **Fit**            | How each video fills its tile: **Contain** shows the whole frame (may add black bars); **Cover** fills the tile and crops the edges. |
| **Background**     | The color shown behind/around the tiles. Click the swatch to pick any color. |
| **Show file names**| Toggles a filename label in the top‑left of each tile. |

Tips:

- For a clean, edge‑to‑edge **video wall**, set **Gap** to `0`, **Fit** to
  **Cover**, and **Background** to black.
- For **comparing clips** without losing any pixels, use **Contain**.

---

## 6. Control playback (Step 3 in the panel)

These buttons act on **every** video at once:

| Button          | Action                                                                |
| --------------- | --------------------------------------------------------------------- |
| **▶ Play all**  | Starts playback of every video.                                       |
| **❚❚ Pause all**| Pauses every video.                                                   |
| **↺ Restart all** | Seeks every video back to the start and plays.                      |
| **⇆ Sync time** | Sets every video to the **current time of the first tile**, so they line up. |
| **🔇 Mute all** | Mutes every video.                                                    |
| **🔊 Unmute all** | Unmutes every video.                                                |
| **Loop videos** | When checked, each video restarts automatically when it finishes.     |

> **Why are videos muted by default?** Browsers block auto‑playing audio from
> many videos at once. New tiles start muted so **Play all** works reliably; use
> **Unmute all** (or a tile's speaker button) when you want sound.

Each tile also has the browser's native video controls (play/scrub bar) so you
can control a single video on its own.

---

## 7. Per‑video controls

Hover over any tile to reveal three buttons in the top‑right:

- **🔇 / 🔊** — Mute or unmute just this video.
- **⛶** — Play this video in fullscreen.
- **✕** — Remove this video from the grid.

---

## 8. Saved settings

Your layout preferences — **Columns, Gap, Fit, Background, Show file names, and
Loop** — are saved in your browser's local storage. The next time you open the
app on the same browser, your preferred look is restored automatically.

> Note: the **video files themselves are not saved** (browsers can't re‑open
> files from disk for security reasons). You'll re‑add your videos each session,
> but the grid styling is remembered.

---

## 9. Recipes

**A 2×2 multiview of four camera angles**

1. Load your four clips.
2. Set **Columns** to `2`.
3. Set **Fit** to **Cover** and **Gap** to `4`.
4. Click **▶ Play all**, then **⇆ Sync time** to line them up.

**A looping video wall for a display**

1. Load your clips.
2. Set **Columns** to **Auto**, **Gap** to `0`, **Background** to black.
3. Make sure **Loop videos** is checked.
4. Click **▶ Play all**, then put the browser in fullscreen (<kbd>F11</kbd> on Windows/Linux).

**Compare two takes frame‑accurately**

1. Load both takes.
2. **Columns** = `2`, **Fit** = **Contain**.
3. Scrub the first tile to the moment you care about, then click **⇆ Sync time**.

---

## 10. Supported video formats

The app can play any format your browser supports. In practice the most
reliable, cross‑browser choices are:

- **MP4** (H.264/AAC) — best overall support.
- **WebM** (VP8/VP9) — well supported in Chrome/Edge/Firefox.
- **Ogg/OGV** (Theora) — supported in Firefox/Chrome.

Formats like `.mov`, `.mkv`, or `.avi` may or may not play depending on the
browser and the codecs inside them. If a tile stays black, see Troubleshooting.

---

## 11. Troubleshooting

**A tile is black / "video not supported."**
The browser can't decode that file's codec. Convert it to MP4 (H.264). With
[FFmpeg](https://ffmpeg.org/):

```bash
ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
```

**Videos won't start when I click "Play all."**
Browsers block autoplay with sound. The app starts videos muted to avoid this.
If they still don't start, click a single tile's play button once (a one‑time
user interaction), then try **Play all** again.

**I opened `index.html` directly and something feels limited.**
Serve it over HTTP instead (see [Step 3, Option 2](#3-open-the-app)).

**Drag & drop does nothing.**
Make sure you're dropping actual video files onto the grid area (the right side),
not onto the control panel. Non‑video files are ignored.

**My settings didn't persist.**
Local storage may be disabled (e.g. private/incognito mode or strict privacy
settings). The app still works; it just won't remember your layout.

---

## 12. Frequently asked questions

**Does this upload my videos anywhere?**
No. Files are read locally via object URLs and played in your browser. There is
no server component and no network upload.

**Is there a limit to how many videos I can tile?**
There's no hard limit, but playing many large videos at once is demanding on
your CPU/GPU and memory. If playback stutters, reduce the number of tiles or use
smaller/lower‑resolution files.

**Can I export the grid as a single combined video?**
Not from this app — it's a live viewer/player, not an encoder. To render a
tiled video to a file, use a tool like FFmpeg's `xstack`/`hstack`/`vstack`
filters.

**Can I rearrange tiles?**
Tiles appear in the order you add them. To change the order, remove and re‑add
in the order you want, or adjust the **Columns** to change the wrapping.

---

That's it — you now know how to set up and use the Customizable Local Video
Tiler. Enjoy your video wall!
