/**
 * Customizable Local Video Tiler
 *
 * A dependency-free app that loads local video files and arranges them in a
 * configurable grid. All processing happens in the browser via object URLs;
 * no file ever leaves the user's machine.
 */
(function () {
  "use strict";

  // Each entry: { id, file, url, name }
  const tiles = [];
  let nextId = 1;

  const els = {
    fileInput: document.getElementById("file-input"),
    clearAll: document.getElementById("clear-all"),
    videoCount: document.getElementById("video-count"),
    columns: document.getElementById("columns"),
    gap: document.getElementById("gap"),
    gapOutput: document.getElementById("gap-output"),
    fit: document.getElementById("fit"),
    bgColor: document.getElementById("bg-color"),
    showNames: document.getElementById("show-names"),
    playAll: document.getElementById("play-all"),
    pauseAll: document.getElementById("pause-all"),
    restartAll: document.getElementById("restart-all"),
    syncAll: document.getElementById("sync-all"),
    muteAll: document.getElementById("mute-all"),
    unmuteAll: document.getElementById("unmute-all"),
    loopAll: document.getElementById("loop-all"),
    grid: document.getElementById("grid"),
    emptyState: document.getElementById("empty-state"),
  };

  const SETTINGS_KEY = "video-tiler-settings";

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.columns !== undefined) els.columns.value = s.columns;
      if (s.gap !== undefined) els.gap.value = s.gap;
      if (s.fit !== undefined) els.fit.value = s.fit;
      if (s.bgColor !== undefined) els.bgColor.value = s.bgColor;
      if (s.showNames !== undefined) els.showNames.checked = s.showNames;
      if (s.loop !== undefined) els.loopAll.checked = s.loop;
    } catch (e) {
      /* ignore corrupt settings */
    }
  }

  function saveSettings() {
    const s = {
      columns: els.columns.value,
      gap: els.gap.value,
      fit: els.fit.value,
      bgColor: els.bgColor.value,
      showNames: els.showNames.checked,
      loop: els.loopAll.checked,
    };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch (e) {
      /* storage may be unavailable; non-fatal */
    }
  }

  function addFiles(fileList) {
    const videoFiles = Array.from(fileList).filter(function (f) {
      return f.type.startsWith("video/") || /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)$/i.test(f.name);
    });
    videoFiles.forEach(function (file) {
      tiles.push({
        id: nextId++,
        file: file,
        url: URL.createObjectURL(file),
        name: file.name,
      });
    });
    render();
  }

  function removeTile(id) {
    const idx = tiles.findIndex(function (t) {
      return t.id === id;
    });
    if (idx === -1) return;
    URL.revokeObjectURL(tiles[idx].url);
    tiles.splice(idx, 1);
    render();
  }

  function clearAll() {
    tiles.forEach(function (t) {
      URL.revokeObjectURL(t.url);
    });
    tiles.length = 0;
    render();
  }

  function forEachVideo(fn) {
    els.grid.querySelectorAll("video").forEach(fn);
  }

  function applyLayout() {
    const cols = els.columns.value;
    if (cols === "auto") {
      const count = Math.max(tiles.length, 1);
      const computed = Math.ceil(Math.sqrt(count));
      els.grid.style.gridTemplateColumns = "repeat(" + computed + ", 1fr)";
    } else {
      els.grid.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    }
    els.grid.style.gap = els.gap.value + "px";
    els.grid.style.background = els.bgColor.value;
    els.gapOutput.textContent = els.gap.value;
  }

  function updateCount() {
    const n = tiles.length;
    els.videoCount.textContent =
      n === 0 ? "No videos loaded" : n + (n === 1 ? " video loaded" : " videos loaded");
  }

  function buildTile(tile) {
    const wrapper = document.createElement("div");
    wrapper.className =
      "tile fit-" + els.fit.value + (els.showNames.checked ? " show-name" : "");
    wrapper.dataset.id = String(tile.id);

    const name = document.createElement("div");
    name.className = "tile-name";
    name.textContent = tile.name;

    const video = document.createElement("video");
    video.src = tile.url;
    video.muted = true;
    video.loop = els.loopAll.checked;
    video.playsInline = true;
    video.preload = "metadata";
    video.controls = true;

    const controls = document.createElement("div");
    controls.className = "tile-controls";

    const muteBtn = document.createElement("button");
    muteBtn.type = "button";
    muteBtn.title = "Mute / unmute";
    muteBtn.textContent = "🔇";
    muteBtn.classList.add("active");
    muteBtn.addEventListener("click", function () {
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? "🔇" : "🔊";
      muteBtn.classList.toggle("active", video.muted);
    });

    const fsBtn = document.createElement("button");
    fsBtn.type = "button";
    fsBtn.title = "Fullscreen";
    fsBtn.textContent = "⛶";
    fsBtn.addEventListener("click", function () {
      if (video.requestFullscreen) video.requestFullscreen();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.title = "Remove";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", function () {
      removeTile(tile.id);
    });

    controls.appendChild(muteBtn);
    controls.appendChild(fsBtn);
    controls.appendChild(removeBtn);

    wrapper.appendChild(video);
    wrapper.appendChild(name);
    wrapper.appendChild(controls);
    return wrapper;
  }

  function render() {
    applyLayout();
    updateCount();

    // Clear existing tiles (but keep empty-state node reference).
    els.grid.querySelectorAll(".tile").forEach(function (n) {
      n.remove();
    });

    if (tiles.length === 0) {
      els.emptyState.style.display = "flex";
      return;
    }
    els.emptyState.style.display = "none";

    tiles.forEach(function (tile) {
      els.grid.appendChild(buildTile(tile));
    });
  }

  // --- Event wiring -------------------------------------------------------

  els.fileInput.addEventListener("change", function (e) {
    addFiles(e.target.files);
    els.fileInput.value = ""; // allow re-selecting same file
  });

  els.clearAll.addEventListener("click", clearAll);

  ["columns", "gap", "fit", "bgColor", "showNames"].forEach(function (key) {
    els[key].addEventListener("input", function () {
      render();
      saveSettings();
    });
  });

  els.loopAll.addEventListener("change", function () {
    forEachVideo(function (v) {
      v.loop = els.loopAll.checked;
    });
    saveSettings();
  });

  els.playAll.addEventListener("click", function () {
    forEachVideo(function (v) {
      const p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  });

  els.pauseAll.addEventListener("click", function () {
    forEachVideo(function (v) {
      v.pause();
    });
  });

  els.restartAll.addEventListener("click", function () {
    forEachVideo(function (v) {
      v.currentTime = 0;
      const p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  });

  els.syncAll.addEventListener("click", function () {
    const first = els.grid.querySelector("video");
    if (!first) return;
    const t = first.currentTime;
    forEachVideo(function (v) {
      v.currentTime = t;
    });
  });

  els.muteAll.addEventListener("click", function () {
    forEachVideo(function (v) {
      v.muted = true;
    });
    syncMuteButtons();
  });

  els.unmuteAll.addEventListener("click", function () {
    forEachVideo(function (v) {
      v.muted = false;
    });
    syncMuteButtons();
  });

  function syncMuteButtons() {
    els.grid.querySelectorAll(".tile").forEach(function (tile) {
      const v = tile.querySelector("video");
      const btn = tile.querySelector(".tile-controls button");
      if (!v || !btn) return;
      btn.textContent = v.muted ? "🔇" : "🔊";
      btn.classList.toggle("active", v.muted);
    });
  }

  // Drag & drop
  els.grid.addEventListener("dragover", function (e) {
    e.preventDefault();
    els.grid.classList.add("drag-over");
  });
  els.grid.addEventListener("dragleave", function () {
    els.grid.classList.remove("drag-over");
  });
  els.grid.addEventListener("drop", function (e) {
    e.preventDefault();
    els.grid.classList.remove("drag-over");
    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  });

  // Init
  loadSettings();
  render();
})();
