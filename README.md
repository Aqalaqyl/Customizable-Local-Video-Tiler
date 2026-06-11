# Customizable-Local-Video-Tiler

A tiny, dependency-free web app that loads **local** video files and arranges
them in a fully customizable grid (a "video wall"). You control the number of
columns, the spacing, how each video is fit, the background color, and you can
play, pause, restart, sync, and mute every video at once.

Everything runs **entirely in your browser**. Your video files are never
uploaded anywhere — they are read directly from disk using object URLs.

## Features

- Load multiple local videos at once (file picker or drag & drop).
- Customizable layout: fixed or automatic columns, adjustable gap, background color.
- Per-video fit: **contain** (show the whole frame) or **cover** (fill & crop).
- Global playback controls: Play all, Pause all, Restart all, Sync time, Mute/Unmute all, Loop.
- Per-tile controls: mute, fullscreen, remove.
- Settings (layout, fit, colors, loop) are remembered between sessions.
- No build step, no dependencies, no server required — just open `index.html`.

## Quick start

```bash
git clone https://github.com/<your-account>/Customizable-Local-Video-Tiler.git
cd Customizable-Local-Video-Tiler
# Open the app — either double-click index.html, or serve it locally:
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Full tutorial

See **[TUTORIAL.md](TUTORIAL.md)** for a complete, step-by-step guide covering
setup, every control, recipes, and troubleshooting.

## Project structure

| File          | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `index.html`  | Page layout and controls.                          |
| `styles.css`  | Visual styling and the responsive grid.            |
| `app.js`      | All app logic (loading, layout, playback, drag/drop). |
| `TUTORIAL.md` | Detailed step-by-step usage guide.                 |

## License

MIT
