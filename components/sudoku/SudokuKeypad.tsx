import React, { useMemo } from 'react';
import styles from './sudoku.module.css';
import type { Grid } from '@/lib/sudoku';
import type { Locale } from './types';
import { getRemainingCounts } from './helpers';

interface SudokuKeypadProps {
  board: Grid;
  noteMode: boolean;
  disabled: boolean;
  locale: Locale;
  scrambleActive?: boolean;
  hideRemainingCounts?: boolean;
  onNumberClick: (num: number) => void;
  onClearClick: () => void;
  onToggleNoteMode: () => void;
  onUndoClick: () => void;
  canUndo: boolean;
}

export const SudokuKeypad: React.FC<SudokuKeypadProps> = ({
  board,
  noteMode,
  disabled,
  locale,
  scrambleActive = false,
  hideRemainingCounts = false,
  onNumberClick,
  onClearClick,
  onToggleNoteMode,
  onUndoClick,
  canUndo,
}) => {
  const remainingCounts = useMemo(() => getRemainingCounts(board), [board]);

  const keypadNumbers = useMemo(() => {
    if (!scrambleActive) return [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return [7, 3, 9, 2, 8, 4, 1, 6, 5];
  }, [scrambleActive]);

  return (
    <div className={`${styles.keypadWrap} ${scrambleActive ? styles.keypadScrambled : ''}`}>
      {/* Fixed Status Slot prevents keypad from jumping vertically */}
      <div className={`${styles.keypadStatusSlot} ${scrambleActive ? styles.keypadStatusSlotScrambled : ''}`}>
        {scrambleActive ? (
          <span className={styles.keypadScrambleText}>
            ⚠️ {locale === 'ko' ? '키패드 교란 디버프 발동 중!' : 'Keypad Chaos Debuff!'}
          </span>
        ) : (
          <span className={styles.keypadNormalText}>
            {locale === 'ko' ? '숫자 1~9 터치 또는 키보드 입력' : 'Tap 1-9 or press keys'}
          </span>
        )}
      </div>

      {/* Numbers 1-9 */}
      <div className={styles.keypadGrid}>
        {keypadNumbers.map((number) => {
          const remaining = remainingCounts[number] ?? 0;
          const isCompleted = !hideRemainingCounts && remaining <= 0;

          return (
            <button
              key={number}
              type="button"
              className={`${styles.keyBtn} ${isCompleted ? styles.keyBtnCompleted : ''} ${
                scrambleActive ? styles.keyBtnScrambled : ''
              }`}
              onClick={() => onNumberClick(number)}
              disabled={disabled}
            >
              <span>{number}</span>
              {!hideRemainingCounts && (
                <span className={styles.keyRemainingBadge}>
                  {isCompleted ? '✓' : remaining}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Controls: Erase, Notes Mode, Undo */}
      <div className={styles.keypadActions}>
        <button
          type="button"
          className={`${styles.keyActionBtn} ${noteMode ? styles.keyActionNotesActive : ''}`}
          onClick={onToggleNoteMode}
          disabled={disabled}
          aria-pressed={noteMode}
        >
          <span>✏️ {locale === 'ko' ? '메모 모드' : 'Notes'}</span>
          <span className={styles.notesActiveIndicator}>{noteMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          type="button"
          className={styles.keyActionBtn}
          onClick={onClearClick}
          disabled={disabled}
        >
          <span>⌫ {locale === 'ko' ? '지우기' : 'Erase'}</span>
        </button>
      </div>
    </div>
  );
};
