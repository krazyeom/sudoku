export type RecordDifficulty = 'easy' | 'medium' | 'hard';

export type RecordEntry = {
  difficulty: RecordDifficulty;
  elapsedSeconds: number;
  clueCount: number;
  completedAt: string;
};

export function filterAndSortRecords(
  records: RecordEntry[],
  difficulty: RecordDifficulty | 'all' = 'all',
  sortMode: 'fastest' | 'newest' | 'oldest' = 'fastest',
): RecordEntry[] {
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
