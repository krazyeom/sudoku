import React from 'react';
import styles from './sudoku.module.css';
import type { Locale } from './types';
import { formatTime } from './share';
import { getThemeConfig, type ThemeId } from './theme';

interface HeaderStatusProps {
  elapsedSeconds: number;
  timerRunning: boolean;
  noteMode: boolean;
  soundEnabled: boolean;
  locale: Locale;
  isOnline?: boolean;
  currentTheme: ThemeId;
  onToggleSound: () => void;
  onToggleLocale: () => void;
  onOpenThemeSelector: () => void;
}

export const HeaderStatus: React.FC<HeaderStatusProps> = ({
  elapsedSeconds,
  timerRunning,
  noteMode,
  soundEnabled,
  locale,
  isOnline = true,
  currentTheme,
  onToggleSound,
  onToggleLocale,
  onOpenThemeSelector,
}) => {
  const themeConfig = getThemeConfig(currentTheme);
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
      {/* Theme Selector Trigger */}
      <button
        type="button"
        className={`${styles.hudCard} ${styles.hudCardInteractive}`}
        onClick={onOpenThemeSelector}
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
        }}
        aria-label="Color theme studio"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.15rem' }}>{themeConfig.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div className={styles.hudLabel} style={{ marginBottom: '1px' }}>
              {locale === 'ko' ? '테마 스튜디오' : 'Theme Studio'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: themeConfig.accentColor }}>
              {locale === 'ko' ? themeConfig.nameKo : themeConfig.nameEn}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: themeConfig.accentColor,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: themeConfig.secondaryColor,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: '4px' }}>
            {locale === 'ko' ? '변경' : 'Change'} ❯
          </span>
        </div>
      </button>

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
