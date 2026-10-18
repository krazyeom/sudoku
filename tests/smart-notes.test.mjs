import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupNotesAfterNumber, computeAllCandidates, createEmptyNotesGrid } from '../lib/smartNotes.js';

test('helpers: cleanupNotesAfterNumber removes placed number from related row, col, and 3x3 box', () => {
  const initialNotes = createEmptyNotesGrid();
  // Put candidate 5 in (0, 0), (0, 4) [same row], (4, 0) [same col], (1, 1) [same box], and (8, 8) [unrelated]
  initialNotes[0][0] = [1, 5, 9];
  initialNotes[0][4] = [3, 5];
  initialNotes[4][0] = [5, 7];
  initialNotes[1][1] = [2, 5, 8];
  initialNotes[8][8] = [5, 6];

  // User places 5 at (0, 0)
  const cleaned = cleanupNotesAfterNumber(initialNotes, 0, 0, 5);

  assert.deepEqual(cleaned[0][0], [], 'Target cell notes should be cleared');
  assert.deepEqual(cleaned[0][4], [3], 'Same row should remove 5');
  assert.deepEqual(cleaned[4][0], [7], 'Same col should remove 5');
  assert.deepEqual(cleaned[1][1], [2, 8], 'Same 3x3 box should remove 5');
  assert.deepEqual(cleaned[8][8], [5, 6], 'Unrelated cell should keep 5');
});

test('helpers: computeAllCandidates calculates valid candidates for empty cells', () => {
  const simpleBoard = Array.from({ length: 9 }, () => Array(9).fill(null));
  // Place 1~8 in row 0 except cell (0, 8)
  for (let c = 0; c < 8; c++) {
    simpleBoard[0][c] = c + 1;
  }
  const candidates = computeAllCandidates(simpleBoard);
  // Cell (0, 8) can only be 9
  assert.deepEqual(candidates[0][8], [9]);
  // Filled cells should have no candidates (empty array)
  assert.deepEqual(candidates[0][0], []);
});
