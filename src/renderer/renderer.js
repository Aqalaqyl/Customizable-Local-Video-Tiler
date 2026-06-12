import {
  makeLeaf,
  splitNode,
  removeNode,
  findNode,
  forEachLeaf,
  clampRatio,
  countLeaves
} from './tree.js';

const api = window.api;

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const state = {
  root: null,
  libraryPath: '',
  editMode: false,
  shiftHeld: false,
  presenterMode: false,
  sliceIndex: 0,
  sliceCols: 1,
  sliceRows: 1,
  multiDisplayActive: false
};

const stage = document.getElementById('stage');
const editBtn = document.getElementById('edit-btn');
const editHint = document.getElementById('edit-hint');
const libraryBtn = document.getElementById('library-btn');
const libraryLabel = document.getElementById('library-label');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const fullscreenLabel = document.getElementById('fullscreen-label');
const displaysBtn = document.getElementById('displays-btn');
const displaysLabel = document.getElementById('displays-label');
const displaysDialog = document.getElementById('displays-dialog');
const displaysList = document.getElementById('displays-list');
const displaysStartBtn = document.getElementById('displays-start');
const displaysStopBtn = document.getElementById('displays-stop');
const displaysCancelBtn = document.getElementById('displays-cancel');
const toastEl = document.getElementById('toast');

const IDLE_MS = 2500;
let idleTimer = null;
let uiLocked = false;

// Tracks the overlay the cursor is currently inside so Shift can flip the
// preview orientation live without moving the mouse.
let activeOverlay = null;

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

let saveTimer = null;
function scheduleSave() {
  if (state.presenterMode) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.saveLayout(serialize(state.root));
  }, 250);
}

function serialize(node) {
  if (node.type === 'leaf') {
    return {
      id: node.id,
      type: 'leaf',
      name: node.name,
      folderPath: node.folderPath,
      currentVideo: node.currentVideo || null
    };
  }
  return {
    id: node.id,
    type: 'split',
    direction: node.direction,
    ratio: node.ratio,
    children: [serialize(node.children[0]), serialize(node.children[1])]
  };
}

function normalize(node) {
  if (!node) return makeLeaf({ name: 'Library' });
  if (node.type === 'leaf') {
    return {
      id: node.id,
      type: 'leaf',
      name: node.name || 'Untitled',
      folderPath: node.folderPath || null,
      currentVideo: node.currentVideo || null
    };
  }
  return {
    id: node.id,
    type: 'split',
    direction: node.direction === 'horizontal' ? 'horizontal' : 'vertical',
    ratio: clampRatio(node.ratio),
    children: [normalize(node.children[0]), normalize(node.children[1])]
  };
}

/* ------------------------------------------------------------------ */
/* Folder syncing                                                      */
/* ------------------------------------------------------------------ */

async function ensureLeafFolder(node) {
  const res = await api.ensureFolder(node.name, node.folderPath);
  if (res) {
    node.folderPath = res.path;
    node.name = res.name;
  }
  return node;
}

async function ensureAllFolders() {
  const leaves = [];
  forEachLeaf(state.root, (l) => leaves.push(l));
  for (const leaf of leaves) {
    await ensureLeafFolder(leaf);
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  stage.innerHTML = '';
  stage.appendChild(renderNode(state.root));
  applyViewportSlice();
}

function applyViewportSlice() {
  if (!state.presenterMode) return;
  const viewport = document.getElementById('stage-viewport');
  if (!viewport) return;

  const cols = state.sliceCols;
  const rows = state.sliceRows;
  const col = state.sliceIndex % cols;
  const row = Math.floor(state.sliceIndex / cols);
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  stage.style.width = `${cols * vw}px`;
  stage.style.height = `${rows * vh}px`;
  stage.style.transform = `translate(${-col * vw}px, ${-row * vh}px)`;
  viewport.style.width = `${vw}px`;
  viewport.style.height = `${vh}px`;
}

function renderNode(node) {
  if (node.type === 'leaf') return renderLeaf(node);

  const el = document.createElement('div');
  el.className = 'split ' + node.direction;
  el.dataset.id = node.id;

  const paneA = document.createElement('div');
  paneA.className = 'pane';
  paneA.style.flex = `${node.ratio} 1 0`;

  const paneB = document.createElement('div');
  paneB.className = 'pane';
  paneB.style.flex = `${1 - node.ratio} 1 0`;

  paneA.appendChild(renderNode(node.children[0]));
  paneB.appendChild(renderNode(node.children[1]));

  const divider = document.createElement('div');
  divider.className = 'divider';
  attachDividerDrag(divider, node, el, paneA, paneB);

  el.append(paneA, divider, paneB);
  return el;
}

function renderLeaf(node) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.dataset.id = node.id;

  // --- media / player ---
  const media = document.createElement('div');
  media.className = 'tile-media';

  const video = document.createElement('video');
  video.className = 'tile-video';
  video.controls = true;
  video.preload = 'metadata';
  media.appendChild(video);

  const empty = document.createElement('div');
  empty.className = 'tile-empty';
  empty.innerHTML =
    '<div class="big">🎬</div>' +
    '<div>No videos in this tile yet</div>';
  if (!state.presenterMode) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.textContent = '＋ Add videos';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addVideos(node, tile);
    });
    empty.appendChild(addBtn);
  }
  media.appendChild(empty);

  tile.appendChild(media);

  if (state.presenterMode) {
    loadPlaylist(node, tile, null, video, empty);
    return tile;
  }

  // --- playlist ---
  const playlist = document.createElement('div');
  playlist.className = 'tile-playlist';
  const plHead = document.createElement('div');
  plHead.className = 'playlist-head';
  plHead.textContent = 'Playlist';
  playlist.appendChild(plHead);
  const plBody = document.createElement('div');
  plBody.className = 'playlist-body';
  playlist.appendChild(plBody);
  tile.appendChild(playlist);

  // --- name badge (shown on hover; matches folder name) ---
  const badge = document.createElement('div');
  badge.className = 'tile-name-badge';
  badge.innerHTML = '<span class="folder-ico">📁</span><span class="badge-text"></span>';
  badge.querySelector('.badge-text').textContent = node.name;
  tile.appendChild(badge);

  // --- controls ---
  const controls = document.createElement('div');
  controls.className = 'tile-controls';

  const renameCtl = controlButton('✎', 'Rename tile & folder', (e) => {
    e.stopPropagation();
    startRename(node, tile, badge);
  });
  const addCtl = controlButton('＋', 'Add videos', (e) => {
    e.stopPropagation();
    addVideos(node, tile);
  });
  const listCtl = controlButton('☰', 'Toggle playlist', (e) => {
    e.stopPropagation();
    tile.classList.toggle('show-playlist');
  });
  const openCtl = controlButton('⮳', 'Open folder', (e) => {
    e.stopPropagation();
    api.openFolder(node.folderPath);
  });
  const delCtl = controlButton('✕', 'Remove tile', (e) => {
    e.stopPropagation();
    removeTile(node);
  });
  delCtl.classList.add('danger');

  controls.append(renameCtl, addCtl, listCtl, openCtl, delCtl);
  tile.appendChild(controls);

  // --- edit-mode split overlay ---
  const overlay = buildSplitOverlay(node, tile);
  tile.appendChild(overlay);

  // populate asynchronously
  loadPlaylist(node, tile, plBody, video, empty);

  return tile;
}

function controlButton(label, title, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.title = title;
  b.addEventListener('click', onClick);
  // Prevent the split overlay underneath from also handling the press.
  b.addEventListener('mousedown', (e) => e.stopPropagation());
  return b;
}

async function loadPlaylist(node, tile, plBody, video, empty) {
  if (!node.folderPath) await ensureLeafFolder(node);
  const files = await api.listVideos(node.folderPath);
  node._files = files;

  if (plBody) plBody.innerHTML = '';
  if (!files.length) {
    empty.style.display = 'flex';
    video.style.display = 'none';
    if (plBody) {
      const e = document.createElement('div');
      e.className = 'playlist-empty';
      e.textContent = 'This folder has no media files.';
      plBody.appendChild(e);
    }
    return;
  }

  empty.style.display = 'none';
  video.style.display = 'block';

  if (plBody) {
    files.forEach((file) => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      item.dataset.path = file.path;
      item.innerHTML = '<span class="pi-ico">▸</span>';
      const label = document.createElement('span');
      label.className = 'pi-name';
      label.textContent = file.name;
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        playFile(node, tile, video, file.path);
      });
      plBody.appendChild(item);
    });
  }

  // Restore previously selected video, or default to the first one.
  const restore =
    node.currentVideo && files.some((f) => f.path === node.currentVideo)
      ? node.currentVideo
      : files[0].path;
  setActive(node, tile, video, restore, state.presenterMode);
}

function setActive(node, tile, video, filePath, autoplay) {
  node.currentVideo = filePath;
  video.src = api.toFileURL(filePath);
  if (autoplay) {
    video.play().catch(() => {});
  }
  tile.querySelectorAll('.playlist-item').forEach((it) => {
    it.classList.toggle('active', it.dataset.path === filePath);
  });
  scheduleSave();
}

function playFile(node, tile, video, filePath) {
  setActive(node, tile, video, filePath, true);
}

/* ------------------------------------------------------------------ */
/* Edit mode: split overlay + preview                                  */
/* ------------------------------------------------------------------ */

function buildSplitOverlay(node, tile) {
  const overlay = document.createElement('div');
  overlay.className = 'split-overlay vertical';

  const shade = document.createElement('div');
  shade.className = 'preview-shade';
  const line = document.createElement('div');
  line.className = 'preview-line';
  const tag = document.createElement('div');
  tag.className = 'overlay-tag';
  overlay.append(shade, line, tag);

  const ctx = { overlay, shade, line, tag, x: 0, y: 0, rect: null };

  overlay.addEventListener('mouseenter', () => {
    activeOverlay = ctx;
  });
  overlay.addEventListener('mousemove', (e) => {
    ctx.rect = overlay.getBoundingClientRect();
    ctx.x = e.clientX - ctx.rect.left;
    ctx.y = e.clientY - ctx.rect.top;
    updatePreview(ctx);
  });
  overlay.addEventListener('mouseleave', () => {
    if (activeOverlay === ctx) activeOverlay = null;
    hidePreview(ctx);
  });
  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = overlay.getBoundingClientRect();
    const horizontal = e.shiftKey;
    if (horizontal) {
      const ratio = (e.clientY - rect.top) / rect.height;
      doSplit(node, 'horizontal', ratio);
    } else {
      const ratio = (e.clientX - rect.left) / rect.width;
      doSplit(node, 'vertical', ratio);
    }
  });

  return overlay;
}

function updatePreview(ctx) {
  const { overlay, shade, line, tag, rect, x, y } = ctx;
  if (!rect) return;
  const horizontal = state.shiftHeld;
  overlay.classList.toggle('horizontal', horizontal);
  overlay.classList.toggle('vertical', !horizontal);

  line.style.display = 'block';
  shade.style.display = 'block';
  tag.style.display = 'block';

  if (horizontal) {
    // top/bottom; new tile takes the bottom region.
    line.style.top = `${y}px`;
    line.style.left = '';
    shade.style.left = '0';
    shade.style.right = '0';
    shade.style.top = `${y}px`;
    shade.style.bottom = '0';
    shade.style.width = '';
    shade.style.height = '';
    tag.textContent = '⬍ Horizontal split';
    tag.style.left = `${rect.width / 2}px`;
    tag.style.top = `${y}px`;
  } else {
    // left/right; new tile takes the right region.
    line.style.left = `${x}px`;
    line.style.top = '';
    shade.style.top = '0';
    shade.style.bottom = '0';
    shade.style.left = `${x}px`;
    shade.style.right = '0';
    shade.style.width = '';
    shade.style.height = '';
    tag.textContent = '⬌ Vertical split';
    tag.style.top = `${rect.height / 2}px`;
    tag.style.left = `${x}px`;
  }
}

function hidePreview(ctx) {
  ctx.line.style.display = 'none';
  ctx.shade.style.display = 'none';
  ctx.tag.style.display = 'none';
}

async function doSplit(node, direction, ratio) {
  state.root = splitNode(state.root, node.id, direction, clampRatio(ratio));
  // The original node keeps its folder; ensure the new sibling gets one.
  await ensureAllFolders();
  render();
  scheduleSave();
}

/* ------------------------------------------------------------------ */
/* Divider drag-to-resize                                              */
/* ------------------------------------------------------------------ */

function attachDividerDrag(divider, node, splitEl, paneA, paneB) {
  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    lockUi();
    divider.classList.add('dragging');
    document.body.classList.add('dragging-divider');
    const horizontal = node.direction === 'horizontal';

    function onMove(ev) {
      const rect = splitEl.getBoundingClientRect();
      let ratio = horizontal
        ? (ev.clientY - rect.top) / rect.height
        : (ev.clientX - rect.left) / rect.width;
      ratio = clampRatio(ratio);
      node.ratio = ratio;
      paneA.style.flex = `${ratio} 1 0`;
      paneB.style.flex = `${1 - ratio} 1 0`;
    }

    function onUp() {
      divider.classList.remove('dragging');
      document.body.classList.remove('dragging-divider');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      unlockUi();
      scheduleSave();
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

/* ------------------------------------------------------------------ */
/* Tile actions: rename / add / remove                                 */
/* ------------------------------------------------------------------ */

function startRename(node, tile, badge) {
  if (tile.querySelector('.tile-rename')) return;
  lockUi();
  const input = document.createElement('input');
  input.className = 'tile-rename';
  input.value = node.name;
  input.spellcheck = false;
  tile.appendChild(input);
  input.focus();
  input.select();

  let done = false;
  const commit = async (save) => {
    if (done) return;
    done = true;
    const newName = input.value.trim();
    input.remove();
    unlockUi();
    if (save && newName && newName !== node.name) {
      const res = await api.ensureFolder(newName, node.folderPath);
      if (res) {
        node.name = res.name;
        node.folderPath = res.path;
      }
      badge.querySelector('.badge-text').textContent = node.name;
      // Folder changed -> reload its contents.
      const plBody = tile.querySelector('.playlist-body');
      const video = tile.querySelector('.tile-video');
      const empty = tile.querySelector('.tile-empty');
      await loadPlaylist(node, tile, plBody, video, empty);
      scheduleSave();
      toast(`Renamed to “${node.name}”`);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit(true);
    else if (e.key === 'Escape') commit(false);
    e.stopPropagation();
  });
  input.addEventListener('blur', () => commit(true));
  input.addEventListener('mousedown', (e) => e.stopPropagation());
}

async function addVideos(node, tile) {
  if (!node.folderPath) await ensureLeafFolder(node);
  const res = await api.addVideos(node.folderPath);
  if (res && res.added > 0) {
    const plBody = tile.querySelector('.playlist-body');
    const video = tile.querySelector('.tile-video');
    const empty = tile.querySelector('.tile-empty');
    await loadPlaylist(node, tile, plBody, video, empty);
    toast(`Added ${res.added} file${res.added === 1 ? '' : 's'}`);
  }
}

async function removeTile(node) {
  if (countLeaves(state.root) <= 1) {
    toast('Cannot remove the last tile');
    return;
  }
  state.root = removeNode(state.root, node.id);
  render();
  scheduleSave();
}

/* ------------------------------------------------------------------ */
/* Edit mode toggle + global keys                                      */
/* ------------------------------------------------------------------ */

function setEditMode(on) {
  state.editMode = on;
  document.body.classList.toggle('edit-mode', on);
  editBtn.classList.toggle('active', on);
  editBtn.innerHTML = on
    ? '<span class="ico">✓</span> Done'
    : '<span class="ico">✎</span> Edit Layout';
  editHint.classList.toggle('hidden', !on);
  if (on) wakeUi();
  else scheduleIdle();
}

editBtn.addEventListener('click', () => setEditMode(!state.editMode));

libraryBtn.addEventListener('click', async () => {
  const chosen = await api.chooseLibrary();
  if (chosen) {
    state.libraryPath = chosen;
    updateLibraryLabel();
    // Re-bind every tile to a folder under the new library root.
    forEachLeaf(state.root, (l) => {
      l.folderPath = null;
    });
    await ensureAllFolders();
    render();
    scheduleSave();
    toast('Library folder changed');
  }
});

window.addEventListener('keydown', (e) => {
  wakeUi();
  if (e.key === 'Shift' && !state.shiftHeld) {
    state.shiftHeld = true;
    if (activeOverlay) updatePreview(activeOverlay);
  }
  if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    setEditMode(!state.editMode);
  }
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  }
  if (e.key === 'Escape' && state.multiDisplayActive) {
    e.preventDefault();
    stopMultiDisplay();
  }
});

window.addEventListener('keyup', (e) => {
  wakeUi();
  if (e.key === 'Shift') {
    state.shiftHeld = false;
    if (activeOverlay) updatePreview(activeOverlay);
  }
});

/* ------------------------------------------------------------------ */
/* Focus mode: auto-hide UI when idle                                  */
/* ------------------------------------------------------------------ */

function wakeUi() {
  document.body.classList.remove('ui-idle');
  document.body.classList.add('ui-active');
  scheduleIdle();
}

function scheduleIdle() {
  clearTimeout(idleTimer);
  if (uiLocked || state.editMode) return;
  idleTimer = setTimeout(() => {
    if (!uiLocked && !state.editMode) {
      document.body.classList.remove('ui-active');
      document.body.classList.add('ui-idle');
    }
  }, IDLE_MS);
}

function lockUi() {
  uiLocked = true;
  wakeUi();
}

function unlockUi() {
  uiLocked = false;
  scheduleIdle();
}

['mousemove', 'mousedown', 'wheel', 'touchstart', 'touchmove'].forEach((evt) => {
  document.addEventListener(
    evt,
    () => {
      if (!uiLocked) wakeUi();
    },
    { passive: true }
  );
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(idleTimer);
  else scheduleIdle();
});

/* ------------------------------------------------------------------ */
/* Fullscreen                                                          */
/* ------------------------------------------------------------------ */

function updateFullscreenLabel(isFullscreen) {
  fullscreenLabel.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
  fullscreenBtn.title = isFullscreen
    ? 'Exit fullscreen (F11)'
    : 'Enter fullscreen (F11)';
  fullscreenBtn.querySelector('.ico').textContent = isFullscreen ? '⛶' : '⛶';
}

async function toggleFullscreen() {
  if (state.multiDisplayActive) {
    toast('Stop multi-display mode first (Displays → Stop)');
    return;
  }
  const next = await api.toggleFullscreen();
  updateFullscreenLabel(next);
  wakeUi();
}

fullscreenBtn.addEventListener('click', () => toggleFullscreen());

/* ------------------------------------------------------------------ */
/* Multi-display (up to 4 monitors)                                    */
/* ------------------------------------------------------------------ */

let availableDisplays = [];
let selectedDisplayIds = new Set();

function formatDisplaySize(bounds) {
  return `${bounds.width}×${bounds.height}`;
}

function renderDisplaysList() {
  displaysList.innerHTML = '';
  if (!availableDisplays.length) {
    displaysList.innerHTML =
      '<p class="displays-empty">No displays detected.</p>';
    displaysStartBtn.disabled = true;
    return;
  }

  displaysStartBtn.disabled = selectedDisplayIds.size === 0;

  availableDisplays.forEach((d) => {
    const row = document.createElement('label');
    row.className = 'display-row';
    const checked = selectedDisplayIds.has(d.id);
    if (checked) row.classList.add('selected');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = d.id;
    input.checked = checked;
    input.addEventListener('change', () => {
      if (input.checked) {
        if (selectedDisplayIds.size >= 4) {
          input.checked = false;
          toast('You can use at most 4 displays at once');
          return;
        }
        selectedDisplayIds.add(d.id);
      } else {
        selectedDisplayIds.delete(d.id);
      }
      row.classList.toggle('selected', input.checked);
      displaysStartBtn.disabled = selectedDisplayIds.size === 0;
    });

    const meta = document.createElement('div');
    meta.className = 'display-meta';
    const title = document.createElement('div');
    title.className = 'display-title';
    title.textContent = d.label;
    const detail = document.createElement('div');
    detail.className = 'display-detail';
    detail.textContent = `${formatDisplaySize(d.bounds)}${d.primary ? ' · Primary' : ''}`;
    meta.append(title, detail);

    row.append(input, meta);
    displaysList.appendChild(row);
  });
}

async function refreshDisplaysList() {
  availableDisplays = await api.listDisplays();
  const status = await api.getDisplayStatus();
  if (status.active && status.displayIds.length) {
    selectedDisplayIds = new Set(status.displayIds);
  } else if (selectedDisplayIds.size === 0) {
    selectedDisplayIds = new Set(
      availableDisplays.slice(0, Math.min(4, availableDisplays.length)).map((d) => d.id)
    );
  } else {
    selectedDisplayIds = new Set(
      [...selectedDisplayIds].filter((id) => availableDisplays.some((d) => d.id === id))
    );
  }
  renderDisplaysList();
  updateDisplaysLabel(status);
}

function updateDisplaysLabel(status) {
  state.multiDisplayActive = !!status.active;
  displaysBtn.classList.toggle('active', status.active);
  if (status.active) {
    displaysLabel.textContent = `${status.count} Display${status.count === 1 ? '' : 's'}`;
    displaysBtn.title = 'Multi-display presentation active — click to manage';
    displaysStartBtn.classList.add('hidden');
    displaysStopBtn.classList.remove('hidden');
  } else {
    displaysLabel.textContent = 'Displays';
    displaysBtn.title = 'Present on up to 4 displays';
    displaysStartBtn.classList.remove('hidden');
    displaysStopBtn.classList.add('hidden');
  }
}

async function openDisplaysDialog() {
  await refreshDisplaysList();
  displaysDialog.showModal();
  wakeUi();
}

async function startMultiDisplay() {
  const ids = [...selectedDisplayIds];
  if (!ids.length) {
    toast('Select at least one display');
    return;
  }
  const res = await api.startDisplays(ids);
  if (!res.ok) {
    toast(res.error || 'Could not start multi-display mode');
    return;
  }
  updateDisplaysLabel(res);
  displaysDialog.close();
  toast(`Presenting on ${res.count} display${res.count === 1 ? '' : 's'}`);
}

async function stopMultiDisplay() {
  const res = await api.stopDisplays();
  updateDisplaysLabel(res);
  displaysDialog.close();
  toast('Multi-display presentation stopped');
}

displaysBtn.addEventListener('click', () => openDisplaysDialog());
displaysCancelBtn.addEventListener('click', () => displaysDialog.close());
displaysStartBtn.addEventListener('click', () => startMultiDisplay());
displaysStopBtn.addEventListener('click', () => stopMultiDisplay());

displaysDialog.addEventListener('click', (e) => {
  if (e.target === displaysDialog) displaysDialog.close();
});

/* ------------------------------------------------------------------ */
/* Misc UI                                                             */
/* ------------------------------------------------------------------ */

function updateLibraryLabel() {
  const parts = state.libraryPath.split(/[\\/]/);
  const short = parts.slice(-2).join('/') || state.libraryPath;
  libraryLabel.textContent = short;
  libraryBtn.title = `Library: ${state.libraryPath}`;
}

let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2200);
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function applySyncPayload(payload) {
  state.libraryPath = payload.libraryPath;
  state.root = normalize(payload.layout);
  state.sliceIndex = payload.sliceIndex;
  state.sliceCols = payload.cols;
  state.sliceRows = payload.rows;
  await ensureAllFolders();
  render();
}

async function bootPresenter() {
  state.presenterMode = true;
  const params = new URLSearchParams(window.location.search);
  state.sliceIndex = parseInt(params.get('slice') || '0', 10);
  state.sliceCols = parseInt(params.get('cols') || '1', 10);
  state.sliceRows = parseInt(params.get('rows') || '1', 10);

  api.onPresenterSync(applySyncPayload);
  window.addEventListener('resize', applyViewportSlice);
  await api.presenterReady();
}

async function boot() {
  document.body.classList.add('ui-active');
  state.libraryPath = await api.getLibrary();
  updateLibraryLabel();

  const saved = await api.loadLayout();
  state.root = normalize(saved);

  await ensureAllFolders();
  render();
  // Persist the (possibly default) layout so folder bindings are stable
  // across launches instead of creating new folders each time.
  scheduleSave();

  const isFs = await api.isFullscreen();
  updateFullscreenLabel(isFs);
  api.onFullscreenChanged(updateFullscreenLabel);

  const displayStatus = await api.getDisplayStatus();
  updateDisplaysLabel(displayStatus);
  api.onDisplaySessionChanged(updateDisplaysLabel);
  api.onDisplaysChanged(refreshDisplaysList);

  scheduleIdle();
}

// Lightweight debug surface (useful for automated tests and a local-only app).
window.__lvt = {
  get state() {
    return state;
  },
  leaves() {
    const arr = [];
    forEachLeaf(state.root, (l) =>
      arr.push({ id: l.id, name: l.name, folderPath: l.folderPath })
    );
    return arr;
  },
  count() {
    return countLeaves(state.root);
  },
  rerender() {
    render();
  },
  async split(id, direction, ratio) {
    await doSplit(findNode(state.root, id), direction, ratio);
    return this.leaves();
  },
  async remove(id) {
    await removeTile(findNode(state.root, id));
    return this.leaves();
  },
  async rename(id, name) {
    const node = findNode(state.root, id);
    const res = await api.ensureFolder(name, node.folderPath);
    if (res) {
      node.name = res.name;
      node.folderPath = res.path;
    }
    render();
    scheduleSave();
    return this.leaves();
  }
};

if (document.body.classList.contains('presenter-mode')) {
  bootPresenter();
} else {
  boot();
}
