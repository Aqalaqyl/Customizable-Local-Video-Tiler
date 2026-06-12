// Binary-tree model for the tiling layout.
//
// A node is either:
//   - a "leaf": a single tile bound to a folder of videos.
//   - a "split": two children laid out side by side (vertical) or
//     stacked (horizontal), divided at `ratio` (fraction for the first child).

export function uid() {
  return (
    Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
  );
}

export function makeLeaf(props = {}) {
  return {
    id: uid(),
    type: 'leaf',
    name: props.name || 'Untitled',
    folderPath: props.folderPath || null
  };
}

export function makeSplit(direction, ratio, first, second) {
  return {
    id: uid(),
    type: 'split',
    direction, // 'vertical' (left/right) | 'horizontal' (top/bottom)
    ratio: clampRatio(ratio),
    children: [first, second]
  };
}

export function clampRatio(r) {
  if (Number.isNaN(r) || r == null) return 0.5;
  return Math.min(0.9, Math.max(0.1, r));
}

// Split the target leaf into two. The original leaf keeps the first slot,
// a fresh empty leaf takes the second. Returns the (possibly new) root.
export function splitNode(root, targetId, direction, ratio) {
  function rec(node) {
    if (node.id === targetId && node.type === 'leaf') {
      return makeSplit(direction, ratio, node, makeLeaf());
    }
    if (node.type === 'split') {
      node.children = [rec(node.children[0]), rec(node.children[1])];
    }
    return node;
  }
  return rec(root);
}

// Remove a leaf; its sibling collapses into the parent's place.
// Removing the root resets to a single empty leaf.
export function removeNode(root, targetId) {
  if (root.id === targetId) return makeLeaf();
  function rec(node) {
    if (node.type !== 'split') return node;
    const [a, b] = node.children;
    if (a.id === targetId) return rec(b);
    if (b.id === targetId) return rec(a);
    node.children = [rec(a), rec(b)];
    return node;
  }
  return rec(root);
}

export function findNode(root, id) {
  let found = null;
  (function rec(node) {
    if (found) return;
    if (node.id === id) {
      found = node;
      return;
    }
    if (node.type === 'split') node.children.forEach(rec);
  })(root);
  return found;
}

export function forEachLeaf(root, cb) {
  (function rec(node) {
    if (node.type === 'leaf') cb(node);
    else node.children.forEach(rec);
  })(root);
}

export function countLeaves(root) {
  let n = 0;
  forEachLeaf(root, () => (n += 1));
  return n;
}
