'use strict';

function displayCenter(d) {
  return {
    x: d.bounds.x + d.bounds.width / 2,
    y: d.bounds.y + d.bounds.height / 2
  };
}

/** Sort displays in row-major order (top-to-bottom, left-to-right). */
function sortDisplaysInGridOrder(displays) {
  if (displays.length <= 1) return displays.slice();

  const items = displays.map((d) => ({ d, c: displayCenter(d) }));
  const avgHeight =
    items.reduce((s, i) => s + i.d.bounds.height, 0) / items.length;
  const rowThreshold = avgHeight * 0.5;

  const rows = [];
  for (const item of items.slice().sort((a, b) => a.c.y - b.c.y)) {
    let placed = false;
    for (const row of rows) {
      if (Math.abs(item.c.y - row[0].c.y) < rowThreshold) {
        row.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([item]);
  }

  rows.sort((a, b) => a[0].c.y - b[0].c.y);
  for (const row of rows) {
    row.sort((a, b) => a.c.x - b.c.x);
  }

  return rows.flat().map((i) => i.d);
}

/** Pick a cols×rows grid that matches how many displays are connected (max 4). */
function arrangeDisplays(displays) {
  const n = displays.length;
  if (n <= 0) return { cols: 1, rows: 1 };
  if (n === 1) return { cols: 1, rows: 1 };

  if (n === 2) {
    const [a, b] = displays;
    const ca = displayCenter(a);
    const cb = displayCenter(b);
    const horizontal =
      Math.abs(ca.y - cb.y) <
      Math.min(a.bounds.height, b.bounds.height) * 0.4;
    return horizontal ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 };
  }

  if (n === 3) {
    const ys = displays.map((d) => displayCenter(d).y);
    const ySpread = Math.max(...ys) - Math.min(...ys);
    const avgH =
      displays.reduce((s, d) => s + d.bounds.height, 0) / displays.length;
    if (ySpread < avgH * 0.4) return { cols: 3, rows: 1 };
    const xs = displays.map((d) => displayCenter(d).x);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    const avgW =
      displays.reduce((s, d) => s + d.bounds.width, 0) / displays.length;
    if (xSpread < avgW * 0.4) return { cols: 1, rows: 3 };
    return { cols: 3, rows: 1 };
  }

  return { cols: 2, rows: 2 };
}

module.exports = {
  displayCenter,
  sortDisplaysInGridOrder,
  arrangeDisplays
};
