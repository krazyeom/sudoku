import React from 'react';
import styles from './sudoku.module.css';
import type { Locale } from './types';
import { formatTime } from './share';

interface HeaderStatusProps {
  elapsedSeconds: number;
  timerRunning: boolean;
  noteMode: boolean;
  soundEnabled: boolean;
  locale: Locale;
  isOnline?: boolean;
  onToggleSound: () => void;
  onToggleLocale: () => void;
}

export const HeaderStatus: React.FC<HeaderStatusProps> = ({
  elapsedSeconds,
  timerRunning,
  noteMode,
  soundEnabled,
  locale,
  isOnline = true,
  onToggleSound,
  onToggleLocale,
}) => {
  return (
    <div className={styles.hudGrid}>
      {!isOnline && (
        <div
          style={{
            gridColumn: '1 / -1',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '0.78rem',
            padding: '6px 12px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <span>✈️</span>
          <span>
            {locale === 'ko'
              ? '오프라인 (비행기 모드) — 인터넷 연결 없이도 모든 퍼즐 정상 작동'
              : 'Offline (Airplane Mode) — All puzzles playable without internet'}
          </span>
        </div>
      )}
      {/* Timer */}
      <div className={styles.hudCard}>
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '경과 시간' : 'Time'}</span>
          <span style={{ fontSize: '0.65rem', color: timerRunning ? '#38bdf8' : '#94a3b8' }}>
            {timerRunning ? '● RUNNING' : '❚❚ PAUSED'}
          </span>
        </div>
        <div className={`${styles.hudValue} ${timerRunning ? styles.timerActive : ''}`}>
          ⏱ {formatTime(elapsedSeconds)}
        </div>
      </div>

      {/* Notes State */}
      <div className={`${styles.hudCard} ${noteMode ? styles.hudCardActive : ''}`}>
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '메모 모드' : 'Notes'}</span>
          <span>{noteMode ? '✏️' : '—'}</span>
        </div>
        <div className={styles.hudValue}>{noteMode ? 'ON' : 'OFF'}</div>
      </div>

      {/* Sound Toggle */}
      <button
        type="button"
        className={`${styles.hudCard} ${styles.hudCardInteractive} ${
          soundEnabled ? styles.hudCardActive : ''
        }`}
        onClick={onToggleSound}
      >
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '효과음' : 'Sound'}</span>
          <span>{soundEnabled ? '🔊' : '🔇'}</span>
        </div>
        <div className={styles.hudValue}>{soundEnabled ? 'ON' : 'MUTED'}</div>
      </button>

      {/* Language Toggle */}
      <button
        type="button"
        className={`${styles.hudCard} ${styles.hudCardInteractive}`}
        onClick={onToggleLocale}
      >
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '언어 선택' : 'Language'}</span>
          <span>🌐</span>
        </div>
        <div className={styles.hudValue}>{locale === 'ko' ? '한국어' : 'English'}</div>
      </button>
    </div>
  );
};
