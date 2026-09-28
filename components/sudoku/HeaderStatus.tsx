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
  onToggleSound: () => void;
  onToggleLocale: () => void;
}

export const HeaderStatus: React.FC<HeaderStatusProps> = ({
  elapsedSeconds,
  timerRunning,
  noteMode,
  soundEnabled,
  locale,
  onToggleSound,
  onToggleLocale,
}) => {
  return (
    <div className={styles.hudGrid}>
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
