export function filterAndSortRecords(records, difficulty = 'all', sortMode = 'fastest') {
  const filtered = difficulty === 'all' ? records : records.filter((record) => record.difficulty === difficulty);
  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'newest') {
      return b.completedAt.localeCompare(a.completedAt) || a.elapsedSeconds - b.elapsedSeconds;
    }
    if (sortMode === 'oldest') {
      return a.completedAt.localeCompare(b.completedAt) || a.elapsedSeconds - b.elapsedSeconds;
    }
    return a.elapsedSeconds - b.elapsedSeconds || b.completedAt.localeCompare(a.completedAt);
  });
  return sorted;
}
