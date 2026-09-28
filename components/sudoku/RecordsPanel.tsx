import React, { useMemo } from 'react';
import styles from './sudoku.module.css';
import type { Difficulty } from '@/lib/sudoku';
import type { Locale, RecordEntry } from './types';
import { formatTime } from './share';
import { filterAndSortRecords } from '@/lib/recordView';

interface RecordsPanelProps {
  records: RecordEntry[];
  difficultyFilter: 'all' | Difficulty;
  sortMode: 'fastest' | 'newest' | 'oldest';
  locale: Locale;
  onFilterChange: (diff: 'all' | Difficulty) => void;
  onSortChange: (sort: 'fastest' | 'newest' | 'oldest') => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImportJson: () => void;
  onClearRecords: () => void;
}

export const RecordsPanel: React.FC<RecordsPanelProps> = ({
  records,
  difficultyFilter,
  sortMode,
  locale,
  onFilterChange,
  onSortChange,
  onExportJson,
  onExportCsv,
  onImportJson,
  onClearRecords,
}) => {
  const visibleRecords = useMemo(
    () => filterAndSortRecords(records, difficultyFilter, sortMode).slice(0, 10),
    [records, difficultyFilter, sortMode]
  );

  const stats = useMemo(() => {
    const total = records.length;
    const average =
      total > 0 ? Math.round(records.reduce((sum, r) => sum + r.elapsedSeconds, 0) / total) : 0;
    const best = total > 0 ? [...records].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)[0] : null;
    const hardCount = records.filter((r) => r.difficulty === 'hard').length;
    return { total, average, best, hardCount };
  }, [records]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className={styles.cardHeader}>
        <div className={styles.headerText}>
          <span className={styles.subtitle}>{locale === 'ko' ? '기록실' : 'Records'}</span>
          <h2 className={styles.title}>{locale === 'ko' ? '나의 통계 & 랭킹' : 'Stats & Rankings'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className={styles.btnSecondary} onClick={onExportJson} title="JSON Export">
            JSON
          </button>
          <button type="button" className={styles.btnSecondary} onClick={onExportCsv} title="CSV Export">
            CSV
          </button>
          <button type="button" className={styles.btnSecondary} onClick={onImportJson} title="Import">
            📥
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onClearRecords}
            title={locale === 'ko' ? '기록 초기화' : 'Reset All'}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className={styles.statsSummaryGrid}>
        <div className={styles.statCard}>
          <span className={styles.statCardLabel}>{locale === 'ko' ? '총 완료 퍼즐' : 'Total Clears'}</span>
          <span className={styles.statCardValue}>{stats.total}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statCardLabel}>{locale === 'ko' ? '평균 소요 시간' : 'Average Time'}</span>
          <span className={styles.statCardValue}>{stats.total > 0 ? formatTime(stats.average) : '—'}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statCardLabel}>{locale === 'ko' ? '최고 기록' : 'Personal Best'}</span>
          <span className={styles.statCardValue} style={{ color: '#38bdf8' }}>
            {stats.best ? formatTime(stats.best.elapsedSeconds) : '—'}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statCardLabel}>{locale === 'ko' ? '어려움 클리어' : 'Hard Clears'}</span>
          <span className={styles.statCardValue} style={{ color: '#fb7185' }}>
            {stats.hardCount}
          </span>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div className={styles.filterPillsRow}>
          {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
            <button
              key={diff}
              type="button"
              className={`${styles.filterPill} ${
                difficultyFilter === diff ? styles.filterPillActive : ''
              }`}
              onClick={() => onFilterChange(diff)}
            >
              {diff === 'all'
                ? locale === 'ko'
                  ? '전체'
                  : 'All'
                : diff === 'easy'
                  ? locale === 'ko'
                    ? '쉬움'
                    : 'Easy'
                  : diff === 'medium'
                    ? locale === 'ko'
                      ? '보통'
                      : 'Medium'
                    : locale === 'ko'
                      ? '어려움'
                      : 'Hard'}
            </button>
          ))}
        </div>

        <div className={styles.filterPillsRow}>
          {(['fastest', 'newest', 'oldest'] as const).map((sort) => (
            <button
              key={sort}
              type="button"
              className={`${styles.filterPill} ${sortMode === sort ? styles.filterPillActive : ''}`}
              onClick={() => onSortChange(sort)}
            >
              {sort === 'fastest'
                ? locale === 'ko'
                  ? '최단 시간순'
                  : 'Fastest'
                : sort === 'newest'
                  ? locale === 'ko'
                    ? '최신순'
                    : 'Newest'
                  : locale === 'ko'
                    ? '오래된순'
                    : 'Oldest'}
            </button>
          ))}
        </div>
      </div>

      {/* Record List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visibleRecords.length > 0 ? (
          visibleRecords.map((record, index) => (
            <div key={`${record.completedAt}-${index}`} className={styles.recordItemRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background:
                      record.difficulty === 'easy'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : record.difficulty === 'medium'
                          ? 'rgba(99, 102, 241, 0.15)'
                          : 'rgba(244, 63, 94, 0.15)',
                    color:
                      record.difficulty === 'easy'
                        ? '#10b981'
                        : record.difficulty === 'medium'
                          ? '#818cf8'
                          : '#fb7185',
                  }}
                >
                  {record.difficulty.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
                  {record.clueCount} {locale === 'ko' ? '단서' : 'clues'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>
                  {formatTime(record.elapsedSeconds)}
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {new Date(record.completedAt).toLocaleDateString(
                    locale === 'ko' ? 'ko-KR' : 'en-US'
                  )}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '32px 0', fontSize: '0.9rem' }}>
            {locale === 'ko'
              ? '아직 기록이 없습니다. 첫 게임을 클리어해 보세요!'
              : 'No records found. Complete your first puzzle to set a time!'}
          </p>
        )}
      </div>
    </div>
  );
};
