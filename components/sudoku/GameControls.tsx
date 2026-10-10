import React from 'react';
import styles from './sudoku.module.css';
import type { Difficulty } from '@/lib/sudoku';
import type { ItemCounts, Locale } from './types';
import { DIFFICULTIES } from './helpers';
import {
  PlayIcon,
  LightbulbIcon,
  SparklesIcon,
  CheckSearchIcon,
  UndoIcon,
} from './Icons';

interface GameControlsProps {
  difficulty: Difficulty;
  items: ItemCounts;
  locale: Locale;
  sharedRoomActive: boolean;
  canUndo: boolean;
  onDifficultyChange: (diff: Difficulty) => void;
  onNewGame: () => void;
  onHint: () => void;
  onAutoFill: () => void;
  onCheck: () => void;
  onUndo: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  difficulty,
  items,
  locale,
  sharedRoomActive,
  canUndo,
  onDifficultyChange,
  onNewGame,
  onHint,
  onAutoFill,
  onCheck,
  onUndo,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Difficulty Selection */}
      <div className={styles.difficultyGroup}>
        {DIFFICULTIES.map((diff) => {
          const isActive = difficulty === diff.id;
          const dotClass =
            diff.id === 'easy'
              ? styles.diffDotEasy
              : diff.id === 'medium'
                ? styles.diffDotMedium
                : styles.diffDotHard;

          return (
            <button
              key={diff.id}
              type="button"
              className={`${styles.diffPill} ${isActive ? styles.diffPillActive : ''}`}
              onClick={() => onDifficultyChange(diff.id)}
              disabled={sharedRoomActive}
            >
              <i className={`${styles.diffDot} ${dotClass}`} />
              <span>{diff.label[locale]}</span>
            </button>
          );
        })}
      </div>

      {/* Primary Action: New Game */}
      <button
        type="button"
        className={styles.btnPrimary}
        onClick={onNewGame}
      >
        <PlayIcon size={14} color="currentColor" />
        <span>{locale === 'ko' ? '새 게임 시작' : 'Start New Game'}</span>
      </button>

      {/* Auxiliary Action Buttons */}
      <div className={styles.actionToolbar}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onHint}
          disabled={sharedRoomActive || items.hint <= 0}
        >
          <LightbulbIcon size={14} color="currentColor" />
          <span>{locale === 'ko' ? '힌트' : 'Hint'}</span>
          <span className={styles.countBadge}>{items.hint}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onAutoFill}
          disabled={sharedRoomActive || items.autoFill <= 0}
        >
          <SparklesIcon size={14} color="currentColor" />
          <span>{locale === 'ko' ? '자동완성' : 'Auto-fill'}</span>
          <span className={styles.countBadge}>{items.autoFill}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onCheck}
          disabled={sharedRoomActive}
        >
          <CheckSearchIcon size={14} color="currentColor" />
          <span>{locale === 'ko' ? '검사' : 'Check'}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onUndo}
          disabled={sharedRoomActive || !canUndo}
        >
          <UndoIcon size={14} color="currentColor" />
          <span>{locale === 'ko' ? '되돌리기' : 'Undo'}</span>
        </button>
      </div>
    </div>
  );
};
