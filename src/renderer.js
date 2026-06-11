const pickLibraryButton = document.getElementById("pick-library-button");
const pickTilesRootButton = document.getElementById("pick-tiles-root-button");
const editModeButton = document.getElementById("edit-mode-button");
const libraryPathLabel = document.getElementById("library-path");
const tilesRootPathLabel = document.getElementById("tiles-root-path");
const layoutRoot = document.getElementById("layout-root");

const state = {
  mediaRoot: null,
  tilesRoot: null,
  videos: [],
  layout: null,
  tiles: {},
  nextTileNumber: 1,
  editMode: false,
  shiftPressed: false
};

let saveTimeout = null;

function generateTileId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `tile-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function joinPath(basePath, childName) {
  const separator = basePath.includes("\\") ? "\\" : "/";
  const cleanBase = basePath.replace(/[\\/]+$/, "");
  return `${cleanBase}${separator}${childName}`;
}

function pathToFileUrl(localPath) {
  const normalized = localPath.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }
  return encodeURI(`file://${normalized}`);
}

function sanitizeTileName(name) {
  const cleaned = String(name ?? "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Untitled Tile";
}

function uniqueTileName(desiredName, exceptTileId = null) {
  const baseName = sanitizeTileName(desiredName);
  const taken = new Set(
    Object.values(state.tiles)
      .filter((tile) => tile.id !== exceptTileId)
      .map((tile) => tile.name.toLowerCase())
  );

  if (!taken.has(baseName.toLowerCase())) {
    return baseName;
  }

  let counter = 2;
  while (taken.has(`${baseName} ${counter}`.toLowerCase())) {
    counter += 1;
  }
  return `${baseName} ${counter}`;
}

function createNewTile(nameHint) {
  const tileId = generateTileId();
  const preferredName = nameHint || `Tile ${state.nextTileNumber++}`;
  const finalName = uniqueTileName(preferredName);
  state.tiles[tileId] = {
    id: tileId,
    name: finalName,
    videoPath: null
  };
  return tileId;
}

function createInitialLayoutState() {
  const firstTileId = createNewTile("Tile 1");
  return {
    type: "leaf",
    tileId: firstTileId
  };
}

function collectTileIds(node, output = []) {
  if (!node) {
    return output;
  }
  if (node.type === "leaf") {
    output.push(node.tileId);
    return output;
  }
  collectTileIds(node.first, output);
  collectTileIds(node.second, output);
  return output;
}

function splitLeafNode(node, targetTileId, orientation, newTileId) {
  if (node.type === "leaf") {
    if (node.tileId !== targetTileId) {
      return node;
    }
    return {
      type: "split",
      orientation,
      first: { type: "leaf", tileId: targetTileId },
      second: { type: "leaf", tileId: newTileId }
    };
  }

  return {
    ...node,
    first: splitLeafNode(node.first, targetTileId, orientation, newTileId),
    second: splitLeafNode(node.second, targetTileId, orientation, newTileId)
  };
}

function syncTileCollectionToLayout() {
  const usedIds = new Set(collectTileIds(state.layout));
  for (const tileId of Object.keys(state.tiles)) {
    if (!usedIds.has(tileId)) {
      delete state.tiles[tileId];
    }
  }
}

async function loadVideoFiles() {
  if (!state.mediaRoot) {
    state.videos = [];
    return;
  }
  state.videos = await window.desktopApi.listVideos(state.mediaRoot);
}

async function ensureTileFoldersExist() {
  if (!state.tilesRoot) {
    return;
  }
  await window.desktopApi.ensureDirectory(state.tilesRoot);

  const jobs = Object.values(state.tiles).map((tile) =>
    window.desktopApi.ensureDirectory(joinPath(state.tilesRoot, tile.name))
  );
  await Promise.all(jobs);
}

async function renameTileFolderOnDisk(oldName, newName) {
  if (!state.tilesRoot || oldName === newName) {
    return;
  }
  const fromPath = joinPath(state.tilesRoot, oldName);
  const toPath = joinPath(state.tilesRoot, newName);

  const result = await window.desktopApi.renameDirectory({
    fromPath,
    toPath,
    overwrite: false
  });

  if (!result || !result.ok) {
    await window.desktopApi.ensureDirectory(toPath);
  }
}

function persistStateSoon() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    const snapshot = {
      mediaRoot: state.mediaRoot,
      tilesRoot: state.tilesRoot,
      layout: state.layout,
      tiles: state.tiles,
      nextTileNumber: state.nextTileNumber
    };
    await window.desktopApi.saveState(snapshot);
  }, 180);
}

function relativeVideoLabel(videoPath) {
  if (!state.mediaRoot || !videoPath) {
    return videoPath;
  }
  const escaped = state.mediaRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`^${escaped}[\\\\/]?`);
  return videoPath.replace(expression, "");
}

function updateTopBar() {
  libraryPathLabel.textContent = state.mediaRoot || "No library selected";
  tilesRootPathLabel.textContent = state.tilesRoot || "No tile-folder root selected";
  editModeButton.textContent = state.editMode ? "Exit Edit Mode" : "Enter Edit Mode";
  editModeButton.classList.toggle("active", state.editMode);
  editModeButton.classList.toggle("inactive", !state.editMode);
}

function updateSplitPreviewOrientation() {
  const overlays = layoutRoot.querySelectorAll(".split-preview-overlay");
  const notes = layoutRoot.querySelectorAll(".split-preview-note");
  const orientation = state.shiftPressed ? "horizontal" : "vertical";
  const note = state.shiftPressed
    ? "Shift held: click for horizontal split"
    : "Click for vertical split (hold Shift for horizontal)";

  overlays.forEach((overlay) => {
    overlay.classList.remove("vertical", "horizontal");
    overlay.classList.add(orientation);
  });
  notes.forEach((current) => {
    current.textContent = note;
  });
}

async function splitTile(tileId, orientation) {
  const newTileId = createNewTile();
  state.layout = splitLeafNode(state.layout, tileId, orientation, newTileId);
  await ensureTileFoldersExist();
  renderLayout();
  persistStateSoon();
}

async function renameTile(tileId, nextName) {
  const tile = state.tiles[tileId];
  if (!tile) {
    return;
  }

  const oldName = tile.name;
  const normalized = uniqueTileName(nextName, tileId);
  tile.name = normalized;
  await renameTileFolderOnDisk(oldName, normalized);
  await ensureTileFoldersExist();
  renderLayout();
  persistStateSoon();
}

function buildTileNode(tile) {
  const tileElement = document.createElement("section");
  tileElement.className = "tile";
  tileElement.dataset.tileId = tile.id;
  if (state.editMode) {
    tileElement.classList.add("editable");
  }

  const header = document.createElement("div");
  header.className = "tile-header";

  const nameInput = document.createElement("input");
  nameInput.className = "tile-name-input";
  nameInput.type = "text";
  nameInput.value = tile.name;
  nameInput.title = "Tile name (also used as matching folder name)";
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      nameInput.blur();
    }
  });
  nameInput.addEventListener("blur", async () => {
    await renameTile(tile.id, nameInput.value);
  });

  const videoSelect = document.createElement("select");
  videoSelect.className = "video-select";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Choose a video file";
  videoSelect.appendChild(emptyOption);

  for (const videoPath of state.videos) {
    const option = document.createElement("option");
    option.value = videoPath;
    option.textContent = relativeVideoLabel(videoPath);
    if (videoPath === tile.videoPath) {
      option.selected = true;
    }
    videoSelect.appendChild(option);
  }

  videoSelect.addEventListener("change", () => {
    tile.videoPath = videoSelect.value || null;
    persistStateSoon();
    renderLayout();
  });

  header.append(nameInput, videoSelect);
  tileElement.appendChild(header);

  const videoWrap = document.createElement("div");
  videoWrap.className = "tile-video-wrap";

  if (tile.videoPath) {
    const video = document.createElement("video");
    video.className = "tile-video";
    video.controls = true;
    video.src = pathToFileUrl(tile.videoPath);
    videoWrap.appendChild(video);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "tile-placeholder";
    placeholder.textContent =
      "No video selected. Choose a local downloaded video from the dropdown.";
    videoWrap.appendChild(placeholder);
  }

  const hoverLabel = document.createElement("div");
  hoverLabel.className = "tile-hover-name";
  hoverLabel.textContent = `Folder: ${tile.name}`;
  videoWrap.appendChild(hoverLabel);

  if (state.editMode) {
    const previewOverlay = document.createElement("div");
    previewOverlay.className = `split-preview-overlay ${
      state.shiftPressed ? "horizontal" : "vertical"
    }`;

    const splitNote = document.createElement("div");
    splitNote.className = "split-preview-note";
    splitNote.textContent = state.shiftPressed
      ? "Shift held: click for horizontal split"
      : "Click for vertical split (hold Shift for horizontal)";

    videoWrap.append(previewOverlay, splitNote);
  }

  tileElement.addEventListener("click", async (event) => {
    if (!state.editMode) {
      return;
    }
    if (event.target.closest(".tile-name-input") || event.target.closest(".video-select")) {
      return;
    }
    event.preventDefault();
    const orientation = state.shiftPressed ? "horizontal" : "vertical";
    await splitTile(tile.id, orientation);
  });

  tileElement.appendChild(videoWrap);
  return tileElement;
}

function buildLayoutNode(node) {
  if (node.type === "leaf") {
    let tile = state.tiles[node.tileId];
    if (!tile) {
      const repairedName = uniqueTileName(`Tile ${state.nextTileNumber++}`);
      tile = {
        id: node.tileId,
        name: repairedName,
        videoPath: null
      };
      state.tiles[node.tileId] = tile;
    }
    return buildTileNode(tile);
  }

  const split = document.createElement("div");
  split.className = `split-node ${node.orientation}`;
  split.appendChild(buildLayoutNode(node.first));
  split.appendChild(buildLayoutNode(node.second));
  return split;
}

function renderLayout() {
  updateTopBar();
  layoutRoot.replaceChildren(buildLayoutNode(state.layout));
  updateSplitPreviewOrientation();
}

function initializeFromSavedState(savedState) {
  if (!savedState || typeof savedState !== "object") {
    state.layout = createInitialLayoutState();
    return;
  }

  state.mediaRoot = typeof savedState.mediaRoot === "string" ? savedState.mediaRoot : null;
  state.tilesRoot = typeof savedState.tilesRoot === "string" ? savedState.tilesRoot : null;
  state.nextTileNumber =
    typeof savedState.nextTileNumber === "number" ? savedState.nextTileNumber : 1;

  if (savedState.tiles && typeof savedState.tiles === "object") {
    state.tiles = savedState.tiles;
  }

  if (savedState.layout && typeof savedState.layout === "object") {
    state.layout = savedState.layout;
  } else {
    state.layout = createInitialLayoutState();
  }

  syncTileCollectionToLayout();

  if (Object.keys(state.tiles).length === 0) {
    state.layout = createInitialLayoutState();
  }

  for (const tile of Object.values(state.tiles)) {
    tile.name = uniqueTileName(tile.name, tile.id);
  }

  const maxNumber = Object.values(state.tiles).reduce((currentMax, tile) => {
    const matched = /^Tile (\d+)$/i.exec(tile.name);
    if (!matched) {
      return currentMax;
    }
    return Math.max(currentMax, Number(matched[1]));
  }, 0);
  state.nextTileNumber = Math.max(state.nextTileNumber, maxNumber + 1);
}

async function selectVideoLibrary() {
  const picked = await window.desktopApi.pickDirectory();
  if (!picked) {
    return;
  }
  state.mediaRoot = picked;

  if (!state.tilesRoot) {
    state.tilesRoot = joinPath(picked, "tile-folders");
  }

  await loadVideoFiles();
  await ensureTileFoldersExist();
  renderLayout();
  persistStateSoon();
}

async function selectTilesRoot() {
  const picked = await window.desktopApi.pickDirectory();
  if (!picked) {
    return;
  }

  state.tilesRoot = picked;
  await ensureTileFoldersExist();
  renderLayout();
  persistStateSoon();
}

function onShiftKeyChange(nextValue) {
  if (state.shiftPressed === nextValue) {
    return;
  }
  state.shiftPressed = nextValue;
  updateSplitPreviewOrientation();
}

async function bootstrap() {
  const savedState = await window.desktopApi.loadState();
  initializeFromSavedState(savedState);
  await loadVideoFiles();
  await ensureTileFoldersExist();
  renderLayout();
}

pickLibraryButton.addEventListener("click", async () => {
  await selectVideoLibrary();
});

pickTilesRootButton.addEventListener("click", async () => {
  await selectTilesRoot();
});

editModeButton.addEventListener("click", () => {
  state.editMode = !state.editMode;
  renderLayout();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Shift") {
    onShiftKeyChange(true);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") {
    onShiftKeyChange(false);
  }
});

window.addEventListener("blur", () => {
  onShiftKeyChange(false);
});

bootstrap();
