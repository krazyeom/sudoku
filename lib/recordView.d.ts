export type RecordDifficulty = 'easy' | 'medium' | 'hard';

export type RecordEntry = {
  difficulty: RecordDifficulty;
  elapsedSeconds: number;
  clueCount: number;
  completedAt: string;
};

export declare function filterAndSortRecords(
  records: RecordEntry[],
  difficulty?: RecordDifficulty | 'all',
  sortMode?: 'fastest' | 'newest' | 'oldest',
): RecordEntry[];
