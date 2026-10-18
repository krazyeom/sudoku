import React from 'react';
import styles from './sudoku.module.css';
import type { Locale } from './types';
import { formatTime } from './share';
import { getThemeConfig, type ThemeId } from './theme';
import {
  TimerIcon,
  NotesIcon,
  SoundOnIcon,
  SoundOffIcon,
  LangIcon,
  PaletteIcon,
  PlaneIcon,
} from './Icons';
import { triggerHaptic } from '@/lib/haptics';

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
  const handleSound = () => {
    triggerHaptic('selection');
    onToggleSound();
  };

  const handleLocale = () => {
    triggerHaptic('selection');
    onToggleLocale();
  };

  const handleTheme = () => {
    triggerHaptic('selection');
    onOpenThemeSelector();
  };

  const themeConfig = getThemeConfig(currentTheme);
  return (
    <div className={styles.hudGrid}>
      {!isOnline && (
        <div
          style={{
            gridColumn: '1 / -1',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#fbbf24',
            fontSize: '0.76rem',
            padding: '6px 12px',
            borderRadius: 'var(--radius-btn, 6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <PlaneIcon size={14} color="#fbbf24" />
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
        onClick={handleTheme}
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          height: '50px',
          minHeight: '50px',
          overflow: 'hidden',
        }}
        aria-label="Color theme studio"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, overflow: 'hidden' }}>
          <PaletteIcon size={16} color={themeConfig.accentColor} />
          <div style={{ textAlign: 'left', minWidth: 0, overflow: 'hidden' }}>
            <div className={styles.hudLabel} style={{ marginBottom: '1px', whiteSpace: 'nowrap' }}>
              {locale === 'ko' ? '테마 스튜디오' : 'Theme Studio'}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.82rem',
                color: themeConfig.accentColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {locale === 'ko' ? themeConfig.nameKo : themeConfig.nameEn}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: themeConfig.accentColor,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: themeConfig.secondaryColor,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #71717c)', marginLeft: '4px', whiteSpace: 'nowrap' }}>
            {locale === 'ko' ? '변경' : 'Change'} ❯
          </span>
        </div>
      </button>

      {/* Timer */}
      <div className={styles.hudCard}>
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '경과 시간' : 'Time'}</span>
          <span style={{ fontSize: '0.62rem', color: timerRunning ? 'var(--text-secondary, #a1a1ab)' : 'var(--text-muted, #71717c)' }}>
            {timerRunning ? '● RUNNING' : '❚❚ PAUSED'}
          </span>
        </div>
        <div className={`${styles.hudValue} ${timerRunning ? styles.timerActive : ''}`}>
          <TimerIcon size={14} color="var(--text-muted, #71717c)" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Notes State */}
      <div className={`${styles.hudCard} ${noteMode ? styles.hudCardActive : ''}`}>
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '메모 모드' : 'Notes'}</span>
          <NotesIcon size={12} color="var(--text-muted, #71717c)" />
        </div>
        <div className={styles.hudValue}>{noteMode ? 'ON' : 'OFF'}</div>
      </div>

      {/* Sound Toggle */}
      <button
        type="button"
        className={`${styles.hudCard} ${styles.hudCardInteractive} ${
          soundEnabled ? styles.hudCardActive : ''
        }`}
        onClick={handleSound}
      >
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '효과음' : 'Sound'}</span>
          {soundEnabled ? (
            <SoundOnIcon size={13} color="var(--accent-primary, #ffffff)" />
          ) : (
            <SoundOffIcon size={13} color="var(--text-muted, #71717c)" />
          )}
        </div>
        <div className={styles.hudValue}>{soundEnabled ? 'ON' : 'MUTED'}</div>
      </button>

      {/* Language Toggle */}
      <button
        type="button"
        className={`${styles.hudCard} ${styles.hudCardInteractive}`}
        onClick={handleLocale}
      >
        <div className={styles.hudLabel}>
          <span>{locale === 'ko' ? '언어 선택' : 'Language'}</span>
          <LangIcon size={13} color="var(--text-muted, #71717c)" />
        </div>
        <div className={styles.hudValue}>{locale === 'ko' ? '한국어' : 'English'}</div>
      </button>
    </div>
  );
};
