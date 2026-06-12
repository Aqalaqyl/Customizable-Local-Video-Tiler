# Customizable Local Video Tiler

A local **Electron** desktop app for viewing/organizing downloaded video files in a
customizable, tiling-window-manager-style layout (split the window into panes,
each backed by a folder of media).

## Repository layout / important context

- The default branch (`main`) currently contains **only this file and `README.md`** — there is no
  application code on `main` yet.
- The actual application lives in several competing feature branches (`cursor/*`), each a
  self-contained Electron app with its own `package.json` + `package-lock.json`. They use
  different stacks:
  - `cursor/desktop-video-tiler-3226`, `cursor/local-video-tiler-ccae`,
    `cursor/local-video-tiling-app-0b48` — plain JavaScript Electron (`electron .`).
  - `cursor/video-tiler-app-ff01` — React + TypeScript via `electron-vite`.
  - `cursor/video-tiler-desktop-d7da` — React + TypeScript via Vite + `electron-builder`.
- To work on the app, check out one of those branches; run commands below from that branch's
  `package.json`.

## Cursor Cloud specific instructions

These notes apply to ALL of the Electron feature branches. Standard build/test/run commands
are defined in each branch's `package.json` and `README.md` — refer to those; the notes below
are the non-obvious caveats for running in this headless cloud VM.

### Running Electron here
- Node.js 22 and the system libraries Electron needs are already present. After `npm install`,
  Electron runs fine — no extra `apt` packages are required.
- Electron MUST be launched with `--no-sandbox` in this container (the sandbox cannot
  initialize). Example: `./node_modules/.bin/electron . --no-sandbox`.
- There is a live desktop on `DISPLAY=:1` (viewable in the Desktop pane). To run the GUI app
  there: `DISPLAY=:1 npm start -- --no-sandbox` (or invoke the electron binary directly with
  `--no-sandbox`). For purely headless runs/tests use `xvfb-run -a <cmd> --no-sandbox`.
- Benign noise in logs (safe to ignore): `Failed to connect to the bus`,
  `Exiting GPU process due to errors during initialization`,
  `ContextResult::kTransientFailure` — these are expected in a headless container.

### Headless tests (the plain-JS branches, e.g. `cursor/local-video-tiler-ccae`)
- Run with a virtual display: `xvfb-run -a npm test` (the test script already passes
  `--no-sandbox` internally where needed; if running a script directly, add `--no-sandbox`).
- IMPORTANT — tests are NOT self-cleaning. The app persists tile state/config and creates real
  folders on disk; in this environment `app.getName()` resolves to `Electron` and
  `app.getPath('documents')` resolves to `$HOME`, so data is written to:
  - library folders: `~/LocalVideoTiler/` (when launched as `electron .`, this may instead be
    under the app name, e.g. `~/<App>/...`)
  - Electron config/userData: `~/.config/<app-name>` and/or `~/.config/Electron`
  Re-running the suite without clearing these causes folder-name collisions (e.g. a rename to
  `My Movies` becomes `My Movies (2)`), which makes the rename assertions FAIL. Before a clean
  test run, remove the leftover state, e.g.:
  `rm -rf ~/LocalVideoTiler ~/.config/local-video-tiler ~/.config/Electron`

### UI/demo notes
- These branches are works in progress: toggling edit mode and performing splits can briefly
  flash the Electron loading splash (a spinning cube) while the renderer re-renders — this is
  app behavior, not an environment failure.
- No lint tooling is configured on the plain-JS branches; the TS branches rely on `tsc` via
  their `build` scripts.
