'use strict';

const path = require('path');
const fs = require('fs');

const MAX_DISPLAY_SLOTS = 4;
const DEFAULT_DISPLAY_SLOT = 1;

function normalizeDisplaySlot(displaySlot) {
  const slot = Number(displaySlot);
  if (!Number.isInteger(slot) || slot < 1 || slot > MAX_DISPLAY_SLOTS) return null;
  return slot;
}

function normalizeTileSlot(tileSlot) {
  const slot = Number(tileSlot);
  if (!Number.isInteger(slot) || slot < 1) return null;
  return slot;
}

function resolveDisplaySlot(displaySlot) {
  return normalizeDisplaySlot(displaySlot) ?? DEFAULT_DISPLAY_SLOT;
}

function displayFolderName(displaySlot) {
  return `display${resolveDisplaySlot(displaySlot)}`;
}

function tileFolderName(tileSlot) {
  const slot = normalizeTileSlot(tileSlot);
  return slot ? `tile${slot}` : 'tile1';
}

function resolveLibraryRoot(baseLibraryPath, displaySlot) {
  const base = String(baseLibraryPath || '').trim();
  const root = path.join(base, displayFolderName(displaySlot));
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (e) {
    /* ignore */
  }
  return root;
}

function resolveTileFolderPath(baseLibraryPath, displaySlot, tileSlot) {
  return path.join(resolveLibraryRoot(baseLibraryPath, displaySlot), tileFolderName(tileSlot));
}

function pathWithinRoot(filePath, root) {
  if (!filePath || !root) return false;
  const rel = path.relative(path.resolve(root), path.resolve(filePath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

module.exports = {
  MAX_DISPLAY_SLOTS,
  DEFAULT_DISPLAY_SLOT,
  normalizeDisplaySlot,
  normalizeTileSlot,
  resolveDisplaySlot,
  displayFolderName,
  tileFolderName,
  resolveLibraryRoot,
  resolveTileFolderPath,
  pathWithinRoot
};
