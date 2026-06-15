import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortRecords } from '../lib/recordView.mjs';

test('filterAndSortRecords filters by difficulty and sorts by fastest time', () => {
  const records = [
    { difficulty: 'medium', elapsedSeconds: 120, clueCount: 28, completedAt: '2026-06-15T08:00:00.000Z' },
    { difficulty: 'easy', elapsedSeconds: 90, clueCount: 36, completedAt: '2026-06-15T09:00:00.000Z' },
    { difficulty: 'easy', elapsedSeconds: 75, clueCount: 34, completedAt: '2026-06-15T10:00:00.000Z' },
  ];

  const result = filterAndSortRecords(records, 'easy', 'fastest');

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((record) => record.elapsedSeconds), [75, 90]);
});

test('filterAndSortRecords sorts newest first when requested', () => {
  const records = [
    { difficulty: 'hard', elapsedSeconds: 240, clueCount: 24, completedAt: '2026-06-15T08:00:00.000Z' },
    { difficulty: 'hard', elapsedSeconds: 210, clueCount: 24, completedAt: '2026-06-15T11:00:00.000Z' },
  ];

  const result = filterAndSortRecords(records, 'all', 'newest');

  assert.deepEqual(result.map((record) => record.completedAt), [
    '2026-06-15T11:00:00.000Z',
    '2026-06-15T08:00:00.000Z',
  ]);
});
