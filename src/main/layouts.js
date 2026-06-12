'use strict';

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { randomBytes } = require('crypto');

const LAYOUT_VERSION = 1;

function layoutsDir(userDataPath) {
  return path.join(userDataPath, 'layouts');
}

function layoutFilePath(userDataPath, id) {
  return path.join(layoutsDir(userDataPath), `${id}.json`);
}

function newLayoutId() {
  return randomBytes(8).toString('hex');
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function validateLayoutTree(node) {
  if (node == null) return true;
  if (!isObject(node) || !node.type) return false;
  if (node.type === 'leaf') {
    return typeof node.id === 'string' && typeof node.name === 'string';
  }
  if (node.type === 'split') {
    return (
      typeof node.id === 'string' &&
      (node.direction === 'vertical' || node.direction === 'horizontal') &&
      typeof node.ratio === 'number' &&
      Array.isArray(node.children) &&
      node.children.length === 2 &&
      validateLayoutTree(node.children[0]) &&
      validateLayoutTree(node.children[1])
    );
  }
  return false;
}

function validateLayoutFile(data) {
  if (!isObject(data)) return null;
  const layout = data.layout != null ? data.layout : data;
  if (!layout || !layout.type || !validateLayoutTree(layout)) return null;
  return {
    version: data.version || LAYOUT_VERSION,
    name: String(data.name || 'Imported layout').slice(0, 120),
    layout
  };
}

function stripFolderPaths(node) {
  if (!node) return null;
  if (node.type === 'leaf') {
    return {
      id: node.id,
      type: 'leaf',
      name: node.name || 'Untitled',
      folderPath: null,
      currentVideo: null
    };
  }
  return {
    id: node.id,
    type: 'split',
    direction: node.direction,
    ratio: node.ratio,
    children: [stripFolderPaths(node.children[0]), stripFolderPaths(node.children[1])]
  };
}

function readLayoutFile(userDataPath, id) {
  try {
    const raw = fs.readFileSync(layoutFilePath(userDataPath, id), 'utf8');
    const data = JSON.parse(raw);
    if (data.layout != null && !validateLayoutTree(data.layout)) return null;
    return {
      id: data.id || id,
      name: data.name || 'Untitled',
      updatedAt: data.updatedAt || null,
      layout: data.layout
    };
  } catch (e) {
    return null;
  }
}

function writeLayoutFile(userDataPath, entry) {
  fs.mkdirSync(layoutsDir(userDataPath), { recursive: true });
  const payload = {
    version: LAYOUT_VERSION,
    id: entry.id,
    name: entry.name,
    updatedAt: entry.updatedAt || new Date().toISOString(),
    layout: entry.layout
  };
  fs.writeFileSync(
    layoutFilePath(userDataPath, entry.id),
    JSON.stringify(payload, null, 2),
    'utf8'
  );
  return payload;
}

function listLayoutFiles(userDataPath) {
  const dir = layoutsDir(userDataPath);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const items = [];
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    const entry = readLayoutFile(userDataPath, id);
    if (entry) items.push(entry);
  }
  items.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
  return items;
}

function migrateConfig(userDataPath, cfg) {
  const next = { ...cfg };
  if (next.activeLayoutId) {
    const exists = readLayoutFile(userDataPath, next.activeLayoutId);
    if (exists) return next;
  }

  const id = newLayoutId();
  writeLayoutFile(userDataPath, {
    id,
    name: 'Default',
    updatedAt: new Date().toISOString(),
    layout: next.layout || null
  });
  next.activeLayoutId = id;
  delete next.layout;
  return next;
}

function getActiveLayout(userDataPath, cfg) {
  const migrated = migrateConfig(userDataPath, cfg);
  const entry = readLayoutFile(userDataPath, migrated.activeLayoutId);
  if (!entry) {
    const id = newLayoutId();
    writeLayoutFile(userDataPath, {
      id,
      name: 'Default',
      updatedAt: new Date().toISOString(),
      layout: null
    });
    return { cfg: { ...migrated, activeLayoutId: id }, entry: readLayoutFile(userDataPath, id) };
  }
  return { cfg: migrated, entry };
}

function saveActiveLayout(userDataPath, cfg, layout, name) {
  const { cfg: migrated, entry } = getActiveLayout(userDataPath, cfg);
  const updated = {
    id: migrated.activeLayoutId,
    name: name || entry.name,
    updatedAt: new Date().toISOString(),
    layout
  };
  writeLayoutFile(userDataPath, updated);
  return updated;
}

function createLayout(userDataPath, name) {
  const id = newLayoutId();
  const entry = {
    id,
    name: String(name || 'New layout').slice(0, 120),
    updatedAt: new Date().toISOString(),
    layout: null
  };
  writeLayoutFile(userDataPath, entry);
  return entry;
}

function setActiveLayout(userDataPath, cfg, id) {
  if (!readLayoutFile(userDataPath, id)) return null;
  return { ...cfg, activeLayoutId: id };
}

function deleteLayout(userDataPath, id) {
  const file = layoutFilePath(userDataPath, id);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

function importLayoutData(userDataPath, rawData, fallbackName) {
  const validated = validateLayoutFile(rawData);
  if (!validated) return null;
  const id = newLayoutId();
  const entry = {
    id,
    name: validated.name || fallbackName || 'Imported layout',
    updatedAt: new Date().toISOString(),
    layout: stripFolderPaths(validated.layout)
  };
  writeLayoutFile(userDataPath, entry);
  return entry;
}

module.exports = {
  LAYOUT_VERSION,
  layoutsDir,
  newLayoutId,
  validateLayoutTree,
  validateLayoutFile,
  stripFolderPaths,
  listLayoutFiles,
  readLayoutFile,
  writeLayoutFile,
  migrateConfig,
  getActiveLayout,
  saveActiveLayout,
  createLayout,
  setActiveLayout,
  deleteLayout,
  importLayoutData
};
