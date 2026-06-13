'use strict';

const {
  sortDisplaysInGridOrder,
  arrangeDisplays,
  assignDisplaySlots
} = require('../src/main/displays');

const results = [];
function check(name, cond) {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`);
}

function display(x, y, w, h, id) {
  return { id, bounds: { x, y, width: w, height: h } };
}

// Two monitors side by side.
const sideBySide = sortDisplaysInGridOrder([
  display(1920, 0, 1920, 1080, 'b'),
  display(0, 0, 1920, 1080, 'a')
]);
check('sorts side-by-side left to right', sideBySide[0].id === 'a' && sideBySide[1].id === 'b');

const stacked = sortDisplaysInGridOrder([
  display(0, 1080, 1920, 1080, 'bottom'),
  display(0, 0, 1920, 1080, 'top')
]);
check('sorts stacked top to bottom', stacked[0].id === 'top' && stacked[1].id === 'bottom');

const twoHorizontal = arrangeDisplays(sideBySide);
check('two horizontal monitors -> 2x1 grid', twoHorizontal.cols === 2 && twoHorizontal.rows === 1);

const twoVertical = arrangeDisplays(stacked);
check('two vertical monitors -> 1x2 grid', twoVertical.cols === 1 && twoVertical.rows === 2);

const fourGrid = arrangeDisplays([
  display(0, 0, 1920, 1080, 'tl'),
  display(1920, 0, 1920, 1080, 'tr'),
  display(0, 1080, 1920, 1080, 'bl'),
  display(1920, 1080, 1920, 1080, 'br')
]);
check('four monitors -> 2x2 grid', fourGrid.cols === 2 && fourGrid.rows === 2);

const threeRow = arrangeDisplays([
  display(0, 0, 1920, 1080, 'a'),
  display(1920, 0, 1920, 1080, 'b'),
  display(3840, 0, 1920, 1080, 'c')
]);
check('three in a row -> 3x1 grid', threeRow.cols === 3 && threeRow.rows === 1);

const slotMap = assignDisplaySlots(sideBySide);
check('assigns slot 1 to left display', slotMap.get('a') === 1);
check('assigns slot 2 to right display', slotMap.get('b') === 2);

const failed = results.filter((r) => !r.ok).length;
console.log(`\nRESULT ${results.length - failed}/${results.length} passed`);
console.log(failed === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED');
process.exit(failed === 0 ? 0 : 1);
