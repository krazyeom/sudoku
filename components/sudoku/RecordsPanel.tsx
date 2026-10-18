import React, { useMemo } from 'react';
import styles from './sudoku.module.css';
import type { Difficulty } from '@/lib/sudoku';
import type { Locale, RecordEntry } from './types';
import { formatTime } from './share';
import { filterAndSortRecords } from '@/lib/recordView';
import { triggerHaptic } from '@/lib/haptics';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className={styles.cardHeader}>
        <div className={styles.headerText}>
          <span className={styles.subtitle}>{locale === 'ko' ? '기록실' : 'Records'}</span>
          <h2 className={styles.title}>{locale === 'ko' ? '나의 통계 & 랭킹' : 'Stats & Rankings'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button type="button" className={styles.btnSecondary} onClick={onExportJson} title="JSON Export" style={{ padding: '0 8px', height: '32px', minHeight: '32px', fontSize: '0.72rem' }}>
            JSON
          </button>
          <button type="button" className={styles.btnSecondary} onClick={onExportCsv} title="CSV Export" style={{ padding: '0 8px', height: '32px', minHeight: '32px', fontSize: '0.72rem' }}>
            CSV
          </button>
          <button type="button" className={styles.btnSecondary} onClick={onImportJson} title="Import" style={{ padding: '0 8px', height: '32px', minHeight: '32px', fontSize: '0.72rem' }}>
            {locale === 'ko' ? '가져오기' : 'Import'}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onClearRecords}
            title={locale === 'ko' ? '기록 초기화' : 'Reset All'}
            style={{ padding: '0 8px', height: '32px', minHeight: '32px', fontSize: '0.72rem', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}
          >
            {locale === 'ko' ? '초기화' : 'Reset'}
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
          <span className={styles.statCardValue} style={{ color: 'var(--accent-primary, #ffffff)' }}>
            {stats.best ? formatTime(stats.best.elapsedSeconds) : '—'}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statCardLabel}>{locale === 'ko' ? '어려움 클리어' : 'Hard Clears'}</span>
          <span className={styles.statCardValue} style={{ color: '#f43f5e' }}>
            {stats.hardCount}
          </span>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div className={styles.filterPillsRow}>
          {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
            <button
              key={diff}
              type="button"
              className={`${styles.filterPill} ${
                difficultyFilter === diff ? styles.filterPillActive : ''
              }`}
              onClick={() => {
                triggerHaptic('selection');
                onFilterChange(diff);
              }}
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
              onClick={() => {
                triggerHaptic('selection');
                onSortChange(sort);
              }}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {visibleRecords.length > 0 ? (
          visibleRecords.map((record, index) => (
            <div key={`${record.completedAt}-${index}`} className={styles.recordItemRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    border: '1px solid var(--border-subtle, #242429)',
                    background: 'var(--bg-primary, #09090b)',
                    color:
                      record.difficulty === 'easy'
                        ? '#38bdf8'
                        : record.difficulty === 'medium'
                          ? '#f59e0b'
                          : '#ef4444',
                  }}
                >
                  {record.difficulty.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #71717c)' }}>
                  {record.clueCount} {locale === 'ko' ? '단서' : 'clues'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary, #ffffff)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(record.elapsedSeconds)}
                </strong>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #71717c)' }}>
                  {new Date(record.completedAt).toLocaleDateString(
                    locale === 'ko' ? 'ko-KR' : 'en-US'
                  )}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted, #71717c)', padding: '24px 0', fontSize: '0.84rem' }}>
            {locale === 'ko'
              ? '아직 기록이 없습니다. 첫 게임을 클리어해 보세요!'
              : 'No records found. Complete your first puzzle to set a time!'}
          </p>
        )}
      </div>
    </div>
  );
};
