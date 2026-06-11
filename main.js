const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const STATE_FILE_NAME = "video-tiler-state.json";

function getStateFilePath() {
  return path.join(app.getPath("userData"), STATE_FILE_NAME);
}

async function safeReadJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return fallbackValue;
  }
}

async function saveJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function listVideoFiles(rootPath) {
  const supported = new Set([
    ".mp4",
    ".mkv",
    ".webm",
    ".mov",
    ".m4v",
    ".avi",
    ".wmv",
    ".flv",
    ".ogv"
  ]);

  const output = [];

  async function walk(currentPath) {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile()) {
        const extension = path.extname(entry.name).toLowerCase();
        if (supported.has(extension)) {
          output.push(absolutePath);
        }
      }
    }
  }

  await walk(rootPath);
  output.sort((a, b) => a.localeCompare(b));
  return output;
}

async function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  await mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
}

ipcMain.handle("dialog:pick-directory", async () => {
  const result = await dialog.showOpenDialog({
    title: "Choose a folder",
    properties: ["openDirectory", "createDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle("state:load", async () => {
  return safeReadJson(getStateFilePath(), null);
});

ipcMain.handle("state:save", async (_event, state) => {
  await saveJson(getStateFilePath(), state);
  return { ok: true };
});

ipcMain.handle("fs:ensure-directory", async (_event, dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
  return { ok: true };
});

ipcMain.handle(
  "fs:rename-directory",
  async (_event, { fromPath, toPath, overwrite }) => {
    try {
      if (overwrite) {
        await fs.rm(toPath, { recursive: true, force: true });
      }
      await fs.rename(fromPath, toPath);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  }
);

ipcMain.handle("media:list-videos", async (_event, rootPath) => {
  if (!rootPath) {
    return [];
  }
  return listVideoFiles(rootPath);
});

app.whenReady().then(async () => {
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
