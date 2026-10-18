import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTodayDateString, dateStringToSeed, getDailyDifficulty, generateDailyPuzzle } from '../lib/dailySudoku.js';

test('dailySudoku: getTodayDateString returns YYYY-MM-DD format', () => {
  const today = getTodayDateString();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('dailySudoku: dateStringToSeed produces deterministic positive hash', () => {
  const seed1 = dateStringToSeed('2026-10-18');
  const seed2 = dateStringToSeed('2026-10-18');
  const seedDiff = dateStringToSeed('2026-10-19');

  assert.equal(seed1, seed2);
  assert.notEqual(seed1, seedDiff);
  assert.ok(seed1 > 0);
});

test('dailySudoku: getDailyDifficulty returns valid difficulty based on day', () => {
  // Test known day of week
  const sunday = '2026-10-18'; // Oct 18, 2026 is Sunday
  assert.equal(getDailyDifficulty(sunday), 'hard');

  const tuesday = '2026-10-20'; // Oct 20, 2026 is Tuesday
  assert.equal(getDailyDifficulty(tuesday), 'easy');

  const wednesday = '2026-10-21'; // Oct 21, 2026 is Wednesday
  assert.equal(getDailyDifficulty(wednesday), 'medium');
});

test('dailySudoku: generateDailyPuzzle creates valid 9x9 puzzle and solution deterministically', () => {
  const testDate = '2026-10-18';
  const puzzleA = generateDailyPuzzle(testDate);
  const puzzleB = generateDailyPuzzle(testDate);

  assert.equal(puzzleA.date, testDate);
  assert.equal(puzzleA.puzzle.length, 9);
  assert.equal(puzzleA.solution.length, 9);

  // Both should be identical for the same date
  assert.deepEqual(puzzleA.puzzle, puzzleB.puzzle);
  assert.deepEqual(puzzleA.solution, puzzleB.solution);
});
