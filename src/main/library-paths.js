'use strict';

const path = require('path');
const fs = require('fs');

function resolveLibraryRoot(baseLibraryPath, displayId) {
  const base = String(baseLibraryPath || '').trim();
  if (!displayId) return base;
  const root = path.join(base, 'displays', String(displayId));
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
  resolveLibraryRoot,
  pathWithinRoot
};
