'use strict';

const path = require('path');
const fs = require('fs');

const MAX_DISPLAY_SLOTS = 4;

function normalizeDisplaySlot(displaySlot) {
  const slot = Number(displaySlot);
  if (!Number.isInteger(slot) || slot < 1 || slot > MAX_DISPLAY_SLOTS) return null;
  return slot;
}

function resolveLibraryRoot(baseLibraryPath, displaySlot) {
  const base = String(baseLibraryPath || '').trim();
  const slot = normalizeDisplaySlot(displaySlot);
  if (!slot) return base;
  const root = path.join(base, 'displays', String(slot));
  try {
    fs.mkdirSync(root, { recursive: true });
  } catch (e) {
    /* ignore */
  }
  return root;
}

function pathWithinRoot(filePath, root) {
  if (!filePath || !root) return false;
  const rel = path.relative(path.resolve(root), path.resolve(filePath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

module.exports = {
  MAX_DISPLAY_SLOTS,
  normalizeDisplaySlot,
  resolveLibraryRoot,
  pathWithinRoot
};
