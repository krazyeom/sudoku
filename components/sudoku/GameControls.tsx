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
import { triggerHaptic } from '@/lib/haptics';

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
  const handleDiff = (d: Difficulty) => {
    triggerHaptic('selection');
    onDifficultyChange(d);
  };

  const handleNew = () => {
    triggerHaptic('selection');
    onNewGame();
  };

  const handleHint = () => {
    triggerHaptic('note');
    onHint();
  };

  const handleAutoFill = () => {
    triggerHaptic('success');
    onAutoFill();
  };

  const handleCheck = () => {
    triggerHaptic('input');
    onCheck();
  };

  const handleUndo = () => {
    triggerHaptic('selection');
    onUndo();
  };
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
              onClick={() => handleDiff(diff.id)}
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
        onClick={handleNew}
      >
        <PlayIcon size={16} color="currentColor" />
        <span>{locale === 'ko' ? '새 게임 시작' : 'Start New Game'}</span>
      </button>

      {/* Auxiliary Action Buttons */}
      <div className={styles.actionToolbar}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleHint}
          disabled={sharedRoomActive || items.hint <= 0}
        >
          <LightbulbIcon size={16} color="currentColor" />
          <span>{locale === 'ko' ? '힌트' : 'Hint'}</span>
          <span className={styles.countBadge}>{items.hint}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleAutoFill}
          disabled={sharedRoomActive || items.autoFill <= 0}
        >
          <SparklesIcon size={16} color="currentColor" />
          <span>{locale === 'ko' ? '자동완성' : 'Auto-fill'}</span>
          <span className={styles.countBadge}>{items.autoFill}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleCheck}
          disabled={sharedRoomActive}
        >
          <CheckSearchIcon size={16} color="currentColor" />
          <span>{locale === 'ko' ? '검사' : 'Check'}</span>
        </button>

        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleUndo}
          disabled={sharedRoomActive || !canUndo}
        >
          <UndoIcon size={16} color="currentColor" />
          <span>{locale === 'ko' ? '되돌리기' : 'Undo'}</span>
        </button>
      </div>
    </div>
  );
};
