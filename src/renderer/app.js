const api = window.videoTiler;

const canvas = document.getElementById('tileCanvas');
const chooseWorkspaceButton = document.getElementById('chooseWorkspaceButton');
const editModeButton = document.getElementById('editModeButton');
const editHelp = document.getElementById('editHelp');
const statusText = document.getElementById('statusText');
const workspacePath = document.getElementById('workspacePath');

const selectedVideos = new Map();

let appState;
let editMode = false;
let shiftDown = false;
let renderVersion = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message) {
  statusText.textContent = message;
}

function createButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.noSplit = 'true';
  button.addEventListener('click', async (event) => {
    event.stopPropagation();

    try {
      button.disabled = true;
      await onClick();
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Something went wrong.');
    } finally {
      button.disabled = false;
    }
  });

  return button;
}

function splitPreviewLabel(direction) {
  return direction === 'horizontal'
    ? 'Horizontal split: top / bottom'
    : 'Vertical split: left / right';
}

function updatePreview(tileElement, direction) {
  const preview = tileElement.querySelector('.split-preview');
  const label = preview.querySelector('.split-preview-label');

  preview.className = `split-preview active ${direction}`;
  label.textContent = splitPreviewLabel(direction);
}

function clearPreview(tileElement) {
  const preview = tileElement.querySelector('.split-preview');
  preview.className = 'split-preview';
}

function updateHoveredPreview() {
  const hoveredTile = document.querySelector('.tile:hover');

  if (hoveredTile && editMode) {
    updatePreview(hoveredTile, shiftDown ? 'horizontal' : 'vertical');
  }
}

function createSplitPane(node, splitNode, isFirstPane) {
  const pane = document.createElement('div');
  pane.className = 'split-pane';
  pane.style.flexBasis = `${(isFirstPane ? splitNode.ratio : 1 - splitNode.ratio) * 100}%`;
  pane.style.flexGrow = '0';
  pane.style.flexShrink = '0';
  pane.append(renderNode(node));

  return pane;
}

function startResizing(event, splitNode, splitElement, firstPane, secondPane, resizer) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  resizer.classList.add('dragging');

  const updateRatio = (pointerEvent) => {
    const rect = splitElement.getBoundingClientRect();
    const rawRatio =
      splitNode.direction === 'vertical'
        ? (pointerEvent.clientX - rect.left) / rect.width
        : (pointerEvent.clientY - rect.top) / rect.height;

    splitNode.ratio = clamp(rawRatio, 0.15, 0.85);
    firstPane.style.flexBasis = `${splitNode.ratio * 100}%`;
    secondPane.style.flexBasis = `${(1 - splitNode.ratio) * 100}%`;
  };

  const stopResizing = async () => {
    document.removeEventListener('mousemove', updateRatio);
    document.removeEventListener('mouseup', stopResizing);
    resizer.classList.remove('dragging');

    try {
      appState = await api.resizeSplit(splitNode.id, splitNode.ratio);
      render();
      setStatus('Layout resized.');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Unable to resize layout.');
    }
  };

  document.addEventListener('mousemove', updateRatio);
  document.addEventListener('mouseup', stopResizing);
}

function renderSplit(node) {
  const split = document.createElement('section');
  const ratio = typeof node.ratio === 'number' ? node.ratio : 0.5;
  const normalizedNode = { ...node, ratio };

  split.className = `split split-${node.direction}`;
  split.dataset.splitId = node.id;

  const firstPane = createSplitPane(node.first, normalizedNode, true);
  const secondPane = createSplitPane(node.second, normalizedNode, false);
  const resizer = document.createElement('div');

  resizer.className = 'split-resizer';
  resizer.title = 'Drag to resize this split';
  resizer.dataset.noSplit = 'true';
  resizer.addEventListener('mousedown', (event) =>
    startResizing(event, normalizedNode, split, firstPane, secondPane, resizer)
  );

  split.append(firstPane, resizer, secondPane);

  return split;
}

function renderTile(node) {
  const tile = appState.tiles[node.tileId];
  const tileElement = document.createElement('article');
  tileElement.className = `tile${editMode ? ' edit-mode' : ''}`;
  tileElement.dataset.tileId = tile.id;

  const hoverBadge = document.createElement('div');
  hoverBadge.className = 'tile-name-badge';
  hoverBadge.textContent = `Folder: ${tile.name}`;

  const preview = document.createElement('div');
  preview.className = 'split-preview';

  const previewLabel = document.createElement('span');
  previewLabel.className = 'split-preview-label';
  preview.append(previewLabel);

  const header = document.createElement('header');
  header.className = 'tile-header';
  header.dataset.noSplit = 'true';

  const title = document.createElement('div');
  title.className = 'tile-title';

  if (editMode) {
    const input = document.createElement('input');
    input.className = 'tile-name-input';
    input.value = tile.name;
    input.dataset.noSplit = 'true';
    input.setAttribute('aria-label', `Rename folder ${tile.name}`);

    input.addEventListener('click', (event) => event.stopPropagation());
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        input.blur();
      }

      if (event.key === 'Escape') {
        input.value = tile.name;
        input.blur();
      }
    });
    input.addEventListener('blur', () => renameTile(tile.id, input.value));

    title.append(input);
  } else {
    const heading = document.createElement('h2');
    heading.textContent = tile.name;
    title.append(heading);
  }

  const folder = document.createElement('span');
  folder.className = 'tile-folder';
  folder.textContent = tile.folderPath;
  folder.title = tile.folderPath;
  title.append(folder);

  const controls = document.createElement('div');
  controls.className = 'tile-controls';
  controls.dataset.noSplit = 'true';

  const body = document.createElement('div');
  body.className = 'tile-body';

  const picker = document.createElement('div');
  picker.className = 'video-picker';

  const pickerLabel = document.createElement('label');
  pickerLabel.textContent = 'Video';

  const select = document.createElement('select');
  select.dataset.noSplit = 'true';
  select.disabled = true;
  select.append(new Option('Loading videos...', ''));

  picker.append(pickerLabel, select);

  const playerFrame = document.createElement('div');
  playerFrame.className = 'player-frame';

  controls.append(
    createButton('Import videos', async () => {
      const videos = await api.importVideos(tile.id);

      if (videos.length > 0 && !selectedVideos.get(tile.id)) {
        selectedVideos.set(tile.id, videos[0]);
      }

      await loadVideos(tile.id, select, playerFrame, renderVersion);
      setStatus(`Imported videos into "${tile.name}".`);
    }),
    createButton('Open folder', async () => {
      await api.showFolder(tile.id);
      setStatus(`Opened "${tile.name}" folder.`);
    }),
    createButton('Refresh', async () => {
      await loadVideos(tile.id, select, playerFrame, renderVersion);
      setStatus(`Refreshed "${tile.name}".`);
    })
  );

  select.addEventListener('click', (event) => event.stopPropagation());
  select.addEventListener('change', async () => {
    const fileName = select.value;

    if (fileName) {
      selectedVideos.set(tile.id, fileName);
      await playVideo(tile.id, fileName, playerFrame);
    } else {
      selectedVideos.delete(tile.id);
      renderEmptyPlayer(playerFrame, 'Choose a video from this folder to start playback.');
    }
  });

  body.append(picker, playerFrame);
  header.append(title, controls);
  tileElement.append(hoverBadge, preview, header, body);

  tileElement.addEventListener('mousemove', (event) => {
    if (!editMode) {
      return;
    }

    updatePreview(tileElement, event.shiftKey ? 'horizontal' : 'vertical');
  });

  tileElement.addEventListener('mouseleave', () => clearPreview(tileElement));
  tileElement.addEventListener('click', async (event) => {
    if (!editMode || event.button !== 0 || event.target.closest('[data-no-split="true"]')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const direction = event.shiftKey ? 'horizontal' : 'vertical';

    try {
      setStatus(`Splitting "${tile.name}" ${direction === 'horizontal' ? 'horizontally' : 'vertically'}...`);
      appState = await api.splitTile(tile.id, direction);
      render();
      setStatus('Tile created. Rename it in edit mode to update its matching folder.');
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Unable to split tile.');
    }
  });

  queueMicrotask(() => loadVideos(tile.id, select, playerFrame, renderVersion));

  return tileElement;
}

function renderNode(node) {
  return node.kind === 'split' ? renderSplit(node) : renderTile(node);
}

function renderEmptyPlayer(playerFrame, message) {
  playerFrame.textContent = '';

  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.textContent = message;
  playerFrame.append(emptyState);
}

async function playVideo(tileId, fileName, playerFrame) {
  playerFrame.textContent = '';

  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.src = await api.videoUrl(tileId, fileName);
  video.addEventListener('error', () => {
    setStatus(`Unable to play "${fileName}". The file may use a codec this system cannot decode.`);
  });

  playerFrame.append(video);
}

async function loadVideos(tileId, select, playerFrame, version) {
  try {
    const videos = await api.listVideos(tileId);

    if (version !== renderVersion) {
      return;
    }

    select.textContent = '';

    if (videos.length === 0) {
      select.disabled = true;
      select.append(new Option('No videos in this folder', ''));
      selectedVideos.delete(tileId);
      renderEmptyPlayer(playerFrame, 'Import videos or open this tile folder and add downloaded video files.');
      return;
    }

    select.disabled = false;
    select.append(new Option('Select a video...', ''));

    for (const video of videos) {
      select.append(new Option(video, video));
    }

    const rememberedVideo = selectedVideos.get(tileId);
    const nextVideo = videos.includes(rememberedVideo) ? rememberedVideo : videos[0];

    selectedVideos.set(tileId, nextVideo);
    select.value = nextVideo;
    await playVideo(tileId, nextVideo, playerFrame);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Unable to load videos.');
    renderEmptyPlayer(playerFrame, 'Unable to load this tile folder.');
  }
}

async function renameTile(tileId, requestedName) {
  const tile = appState.tiles[tileId];

  if (!tile || requestedName.trim() === tile.name) {
    return;
  }

  try {
    setStatus(`Renaming "${tile.name}"...`);
    appState = await api.renameTile(tileId, requestedName);
    render();
    setStatus('Tile folder renamed.');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Unable to rename tile folder.');
    render();
  }
}

function render() {
  renderVersion += 1;
  workspacePath.textContent = appState.workspaceRoot;
  workspacePath.title = appState.workspaceRoot;
  editHelp.hidden = !editMode;
  editModeButton.textContent = editMode ? 'Exit edit mode' : 'Enter edit mode';
  editModeButton.setAttribute('aria-pressed', String(editMode));

  canvas.textContent = '';
  canvas.append(renderNode(appState.layout));
}

chooseWorkspaceButton.addEventListener('click', async () => {
  try {
    appState = await api.chooseWorkspace();
    selectedVideos.clear();
    render();
    setStatus('Workspace updated.');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Unable to choose workspace.');
  }
});

editModeButton.addEventListener('click', () => {
  editMode = !editMode;
  render();
  setStatus(editMode ? 'Edit mode enabled.' : 'Edit mode disabled.');
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') {
    shiftDown = true;
    updateHoveredPreview();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') {
    shiftDown = false;
    updateHoveredPreview();
  }
});

async function init() {
  try {
    appState = await api.getState();
    render();
    setStatus('Ready.');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Unable to start app.');
  }
}

init();
